// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	cli "github.com/kubegraf/kubegraf/cli/internal"
	cliinternal "github.com/kubegraf/kubegraf/cli/internal"
	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/spf13/cobra"
)

func init() {
	// Check if colors should be disabled (NO_COLOR environment variable)
	if os.Getenv("NO_COLOR") != "" {
		color.NoColor = true
		return
	}

	// Force enable colors if FORCE_COLOR is set
	if os.Getenv("FORCE_COLOR") != "" {
		color.NoColor = false
		return
	}

	// Default: Always enable colors unless explicitly disabled
	// The fatih/color library will handle disabling if truly not supported
	// This matches the behavior of other commands (version, doctor) which show colors
	color.NoColor = false
}

var (
	incidentsSince     string
	incidentsSeverity  string
	incidentsNamespace string
	incidentsContext   string
	incidentsOutput    string
	incidentsScan      bool
)

var incidentsCmd = &cobra.Command{
	Use:   "incidents",
	Short: "Manage incidents",
	Long: `Manage and view Kubernetes incidents.

Examples:
  kubegraf incidents list
  kubegraf incidents list --since 24h --severity high
  kubegraf incidents show INC-abc123`,
}

var incidentsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List incidents",
	Long: `List incidents from the local incident store.

Examples:
  kubegraf incidents list
  kubegraf incidents list --since 24h
  kubegraf incidents list --severity high --namespace production`,
	RunE: runIncidentsList,
}

var incidentsShowCmd = &cobra.Command{
	Use:   "show <incident-id>",
	Short: "Show incident details",
	Long: `Show full details for a specific incident.

Examples:
  kubegraf incidents show INC-abc123`,
	Args: cobra.ExactArgs(1),
	RunE: runIncidentsShow,
}

func init() {
	incidentsCmd.AddCommand(incidentsListCmd)
	incidentsCmd.AddCommand(incidentsShowCmd)

	incidentsListCmd.Flags().StringVar(&incidentsSince, "since", "24h", "Show incidents since duration (e.g., 24h, 7d)")
	incidentsListCmd.Flags().StringVar(&incidentsSeverity, "severity", "", "Filter by severity (low|medium|high|critical)")
	incidentsListCmd.Flags().StringVarP(&incidentsNamespace, "namespace", "n", "", "Filter by namespace")
	incidentsListCmd.Flags().StringVarP(&incidentsContext, "context", "c", "", "Filter by cluster context")
	incidentsListCmd.Flags().StringVarP(&incidentsOutput, "output", "o", "text", "Output format (text|json)")
	incidentsListCmd.Flags().BoolVar(&incidentsScan, "scan", true, "Scan cluster for real incidents (default: true)")

	incidentsShowCmd.Flags().StringVarP(&incidentsOutput, "output", "o", "text", "Output format (text|json)")
}

func runIncidentsList(cmd *cobra.Command, args []string) error {
	since, err := time.ParseDuration(incidentsSince)
	if err != nil {
		return fmt.Errorf("invalid --since duration: %w", err)
	}

	var allIncidents []*cliinternal.IncidentRecord

	// Scan cluster for real incidents if --scan is true (default)
	if incidentsScan {
		// Load kubeconfig
		kubeConfig, err := cli.LoadKubeConfig(incidentsContext, incidentsNamespace)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Warning: failed to load kubeconfig for scanning: %v\n", err)
			fmt.Fprintf(os.Stderr, "Falling back to database-only mode. Use --scan=false to disable scanning.\n")
		} else {
			if incidentsOutput == "text" {
				fmt.Fprintf(os.Stderr, "Scanning cluster for incidents...\n")
			}
			ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
			defer cancel()

			clientset := kubeConfig.GetClientset()
			scanned, err := cliinternal.ScanClusterForIncidents(ctx, clientset, incidentsNamespace)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to scan cluster: %v\n", err)
			} else {
				if incidentsOutput == "text" && len(scanned) > 0 {
					fmt.Fprintf(os.Stderr, "Found %d incident(s) from cluster scan\n", len(scanned))
				}
				// Convert scanned incidents to IncidentRecord format
				cutoffTime := time.Now().Add(-since)
				for _, scannedInc := range scanned {
					// Apply filters
					if incidentsNamespace != "" && scannedInc.Namespace != incidentsNamespace {
						continue
					}
					if incidentsSeverity != "" && scannedInc.Severity != incidentsSeverity {
						continue
					}
					// Time filter: include if incident started within the time window
					// For scanned incidents, they are current/active, so we include them
					// regardless of when they started (they're happening now)
					// Only filter by time if explicitly requested with a very short window
					if since < time.Hour && scannedInc.Started.Before(cutoffTime) {
						continue
					}

					// Convert to IncidentRecord
					// Parse PrimaryObject to extract Kind and Name
					parts := strings.Split(scannedInc.PrimaryObject, "/")
					kind := "Pod"
					name := scannedInc.PrimaryObject
					if len(parts) == 2 {
						kind = parts[0]
						name = parts[1]
					}

					record := &cli.IncidentRecord{
						ID:            scannedInc.ID,
						Severity:      scannedInc.Severity,
						Started:       scannedInc.Started,
						Namespace:     scannedInc.Namespace,
						PrimaryObject: scannedInc.PrimaryObject,
						Summary:       scannedInc.Summary,
						FullIncident: &incidents.IncidentRecord{
							ID:          scannedInc.ID,
							Severity:    incidents.Severity(scannedInc.Severity),
							FirstSeen:   scannedInc.Started,
							LastSeen:    scannedInc.Started,
							Title:       scannedInc.Summary,
							Description: scannedInc.Message,
							Occurrences: scannedInc.Count,
							Resource: incidents.KubeResourceRef{
								Kind:      kind,
								Name:      name,
								Namespace: scannedInc.Namespace,
							},
						},
					}
					allIncidents = append(allIncidents, record)
				}
			}
		}
	}

	// Also get incidents from database (read-only, safe to run alongside web UI)
	store, err := cli.NewIncidentStore()
	if err != nil {
		// Non-fatal: if scanning worked, we can still show those
		if len(allIncidents) == 0 {
			// Check if it's a database lock error
			if strings.Contains(err.Error(), "locked") {
				return fmt.Errorf("database is locked by web UI. Wait a moment and retry, or use --scan=false to skip database")
			}
			return fmt.Errorf("initialize incident store: %w", err)
		}
		// If we have scanned incidents, continue with just those
		if strings.Contains(err.Error(), "locked") {
			fmt.Fprintf(os.Stderr, "Warning: database locked by web UI, showing only scanned incidents. Use --scan=false to skip scanning.\n")
		} else {
			fmt.Fprintf(os.Stderr, "Warning: failed to load incident store: %v\n", err)
		}
	} else {
		filter := cli.IncidentFilter{
			Since:     since,
			Severity:  incidentsSeverity,
			Namespace: incidentsNamespace,
			Context:   incidentsContext,
		}

		dbIncidents, err := store.List(filter)
		if err != nil {
			// Non-fatal if we have scanned incidents
			if len(allIncidents) == 0 {
				if strings.Contains(err.Error(), "locked") {
					return fmt.Errorf("database is locked by web UI. Wait a moment and retry, or use --scan=false to skip database")
				}
				return fmt.Errorf("list incidents from store: %w", err)
			}
			// If we have scanned incidents, continue with just those
			if strings.Contains(err.Error(), "locked") {
				fmt.Fprintf(os.Stderr, "Warning: database locked by web UI, showing only scanned incidents\n")
			} else {
				fmt.Fprintf(os.Stderr, "Warning: failed to list incidents from store: %v\n", err)
			}
		} else {
			// Merge with scanned incidents (avoid duplicates by ID)
			existingIDs := make(map[string]bool)
			for _, inc := range allIncidents {
				existingIDs[inc.ID] = true
			}
			for _, inc := range dbIncidents {
				if !existingIDs[inc.ID] {
					allIncidents = append(allIncidents, inc)
				}
			}
		}
	}

	if incidentsOutput == "json" {
		return outputIncidentsJSON(allIncidents)
	}

	return outputIncidentsText(allIncidents)
}

func runIncidentsShow(cmd *cobra.Command, args []string) error {
	incidentID := args[0]

	// First, try to get from database
	store, err := cli.NewIncidentStore()
	var incident *cli.IncidentRecord
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			fmt.Fprintf(os.Stderr, "Warning: database locked, scanning cluster instead...\n")
		} else {
			fmt.Fprintf(os.Stderr, "Warning: failed to load incident store: %v\n", err)
			fmt.Fprintf(os.Stderr, "Scanning cluster instead...\n")
		}
	} else {
		incident, err = store.Get(incidentID)
		if err != nil {
			if strings.Contains(err.Error(), "locked") {
				fmt.Fprintf(os.Stderr, "Warning: database locked, scanning cluster instead...\n")
			} else if strings.Contains(err.Error(), "not found") {
				fmt.Fprintf(os.Stderr, "Incident not found in database, scanning cluster...\n")
			} else {
				fmt.Fprintf(os.Stderr, "Warning: failed to get incident from store: %v\n", err)
				fmt.Fprintf(os.Stderr, "Scanning cluster instead...\n")
			}
		}
	}

	// If not found in database, scan cluster
	if incident == nil {
		// Load kubeconfig for scanning
		kubeConfig, err := cli.LoadKubeConfig(incidentsContext, incidentsNamespace)
		if err != nil {
			return fmt.Errorf("failed to load kubeconfig for scanning: %w\nNote: Use 'kubegraf analyze %s' to get detailed analysis", incidentID, incidentID)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		clientset := kubeConfig.GetClientset()
		scanned, err := cli.ScanClusterForIncidents(ctx, clientset, incidentsNamespace)
		if err != nil {
			return fmt.Errorf("failed to scan cluster: %w", err)
		}

		// Find the incident by ID
		var scannedIncident *cli.ScannedIncident
		for _, inc := range scanned {
			if inc.ID == incidentID {
				scannedIncident = inc
				break
			}
		}

		if scannedIncident == nil {
			return fmt.Errorf("incident %s not found in database or cluster", incidentID)
		}

		// Convert ScannedIncident to IncidentRecord for display
		incident = &cli.IncidentRecord{
			ID:            scannedIncident.ID,
			Severity:      scannedIncident.Severity,
			Started:       scannedIncident.Started,
			Namespace:     scannedIncident.Namespace,
			PrimaryObject: scannedIncident.PrimaryObject,
			Summary:       scannedIncident.Summary,
			FullIncident:  nil, // Scanned incidents don't have full incident data
		}

		if incidentsOutput == "json" {
			// Output scanned incident as JSON
			output := map[string]interface{}{
				"id":            scannedIncident.ID,
				"severity":      scannedIncident.Severity,
				"started":       scannedIncident.Started.Format(time.RFC3339),
				"namespace":     scannedIncident.Namespace,
				"primaryObject": scannedIncident.PrimaryObject,
				"summary":       scannedIncident.Summary,
				"type":          scannedIncident.Type,
				"message":       scannedIncident.Message,
				"count":         scannedIncident.Count,
				"source":        "cluster_scan",
			}
			encoder := json.NewEncoder(os.Stdout)
			encoder.SetIndent("", "  ")
			return encoder.Encode(output)
		}

		// Output scanned incident as text
		return outputScannedIncidentText(scannedIncident)
	}

	// Found in database - output normally
	if incidentsOutput == "json" {
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(incident.FullIncident)
	}

	return outputIncidentText(incident)
}

func outputIncidentsJSON(incidents []*cliinternal.IncidentRecord) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(incidents)
}

func outputIncidentsText(incidents []*cliinternal.IncidentRecord) error {
	// Ensure colors are enabled (respect NO_COLOR, but default to enabled)
	if os.Getenv("NO_COLOR") == "" {
		// Default to enabling colors - let fatih/color handle detection
		// This ensures colors work even if terminal detection fails
		color.NoColor = false
	}

	if len(incidents) == 0 {
		color.New(color.FgYellow).Println("No incidents found.")
		return nil
	}

	// Severity color function - create color objects fresh each time
	getSeverityColor := func(severity string) *color.Color {
		switch strings.ToUpper(severity) {
		case "CRITICAL":
			return color.New(color.FgRed, color.Bold)
		case "HIGH":
			return color.New(color.FgRed)
		case "WARNING", "MEDIUM":
			return color.New(color.FgYellow, color.Bold)
		case "LOW":
			return color.New(color.FgBlue)
		default:
			return color.New(color.FgWhite)
		}
	}

	// Color definitions - create after ensuring color.NoColor is set
	headerColor := color.New(color.Bold, color.FgCyan)
	valueColor := color.New(color.FgWhite)

	// Print table header
	headerColor.Printf("%-20s ", "ID")
	headerColor.Printf("%-10s ", "Severity")
	headerColor.Printf("%-20s ", "Started")
	headerColor.Printf("%-20s ", "Namespace")
	headerColor.Printf("%-30s ", "PrimaryObject")
	headerColor.Println("Summary")
	headerColor.Println(strings.Repeat("─", 120))

	for _, inc := range incidents {
		started := inc.Started.Format("2006-01-02 15:04:05")
		summary := inc.Summary
		if len(summary) > 40 {
			summary = summary[:37] + "..."
		}

		// Print with colors
		valueColor.Printf("%-20s ", inc.ID)
		getSeverityColor(inc.Severity).Printf("%-10s ", strings.ToUpper(inc.Severity))
		valueColor.Printf("%-20s ", started)
		valueColor.Printf("%-20s ", inc.Namespace)
		valueColor.Printf("%-30s ", inc.PrimaryObject)
		valueColor.Println(summary)
	}

	return nil
}

func outputIncidentText(incident *cliinternal.IncidentRecord) error {
	inc := incident.FullIncident

	// Color definitions
	headerColor := color.New(color.Bold, color.FgCyan)
	sectionColor := color.New(color.Bold, color.FgWhite)
	labelColor := color.New(color.Bold, color.FgCyan)
	valueColor := color.New(color.FgWhite)

	// Severity color
	var severityColor *color.Color
	switch strings.ToUpper(incident.Severity) {
	case "CRITICAL":
		severityColor = color.New(color.FgRed, color.Bold)
	case "HIGH":
		severityColor = color.New(color.FgRed)
	case "WARNING", "MEDIUM":
		severityColor = color.New(color.FgYellow, color.Bold)
	case "LOW":
		severityColor = color.New(color.FgBlue)
	default:
		severityColor = color.New(color.FgWhite)
	}

	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	headerColor.Println("INCIDENT DETAILS")
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	fmt.Println()

	labelColor.Print("ID:              ")
	valueColor.Println(incident.ID)
	labelColor.Print("Severity:        ")
	severityColor.Println(strings.ToUpper(incident.Severity))
	labelColor.Print("Started:         ")
	valueColor.Println(incident.Started.Format("2006-01-02 15:04:05 MST"))
	if inc.LastSeen.After(inc.FirstSeen) {
		labelColor.Print("Last Seen:       ")
		valueColor.Println(inc.LastSeen.Format("2006-01-02 15:04:05 MST"))
	}
	if inc.ResolvedAt != nil {
		labelColor.Print("Resolved:       ")
		color.New(color.FgGreen).Println(inc.ResolvedAt.Format("2006-01-02 15:04:05 MST"))
	}
	labelColor.Print("Namespace:       ")
	valueColor.Println(incident.Namespace)
	labelColor.Print("Resource:        ")
	valueColor.Println(incident.PrimaryObject)
	if inc.ClusterContext != "" {
		labelColor.Print("Cluster Context: ")
		valueColor.Println(inc.ClusterContext)
	}
	fmt.Println()

	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	sectionColor.Println("INCIDENT SUMMARY")
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	fmt.Println()
	labelColor.Print("Title:       ")
	valueColor.Println(inc.Title)
	if inc.Description != "" {
		labelColor.Print("Description: ")
		valueColor.Println(inc.Description)
	}
	labelColor.Print("Pattern:     ")
	valueColor.Println(inc.Pattern)
	labelColor.Print("Occurrences: ")
	valueColor.Printf("%d\n", inc.Occurrences)
	fmt.Println()

	if inc.Diagnosis != nil {
		fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n")
		fmt.Printf("ROOT CAUSE ANALYSIS\n")
		fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n\n")
		fmt.Printf("Summary:     %s\n", inc.Diagnosis.Summary)
		fmt.Printf("Confidence:  %.0f%%\n", inc.Diagnosis.Confidence*100)
		if len(inc.Diagnosis.ProbableCauses) > 0 {
			fmt.Println()
			fmt.Println("Probable Causes:")
			for i, cause := range inc.Diagnosis.ProbableCauses {
				fmt.Printf("  %d. %s\n", i+1, cause)
			}
		}
		if len(inc.Diagnosis.Evidence) > 0 {
			fmt.Println()
			fmt.Println("Evidence:")
			for _, ev := range inc.Diagnosis.Evidence {
				fmt.Printf("  • %s\n", ev)
			}
		}
		fmt.Println()
	}

	// Recommendations are on the Incident, not Diagnosis
	// Note: IncidentRecord doesn't have Recommendations field directly
	// They would need to be loaded from the full Incident if available

	if inc.Resolution != "" {
		fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n")
		fmt.Printf("RESOLUTION\n")
		fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n\n")
		fmt.Printf("%s\n", inc.Resolution)
		fmt.Println()
	}

	fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n")
	fmt.Printf("DETAILED ANALYSIS\n")
	fmt.Printf("───────────────────────────────────────────────────────────────────────────────\n\n")
	fmt.Printf("For live evidence collection and updated analysis, run:\n")
	fmt.Printf("  kubegraf analyze %s\n", incident.ID)
	fmt.Println()

	return nil
}

func outputScannedIncidentText(scanned *cliinternal.ScannedIncident) error {
	// Color definitions
	headerColor := color.New(color.Bold, color.FgCyan)
	sectionColor := color.New(color.Bold, color.FgWhite)
	labelColor := color.New(color.Bold, color.FgCyan)
	valueColor := color.New(color.FgWhite)
	warningColor := color.New(color.FgYellow, color.Bold)
	infoColor := color.New(color.FgBlue)
	commandColor := color.New(color.FgGreen)
	tipColor := color.New(color.FgYellow)

	// Severity color
	var severityColor *color.Color
	switch strings.ToUpper(scanned.Severity) {
	case "CRITICAL":
		severityColor = color.New(color.FgRed, color.Bold)
	case "HIGH":
		severityColor = color.New(color.FgRed)
	case "WARNING", "MEDIUM":
		severityColor = color.New(color.FgYellow, color.Bold)
	case "LOW":
		severityColor = color.New(color.FgBlue)
	default:
		severityColor = color.New(color.FgWhite)
	}

	// Header
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	headerColor.Println("INCIDENT DETAILS")
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	fmt.Println()

	labelColor.Print("ID:          ")
	valueColor.Println(scanned.ID)
	labelColor.Print("Source:      ")
	infoColor.Println("Cluster Scan (not yet stored in database)")
	labelColor.Print("Severity:    ")
	severityColor.Println(strings.ToUpper(scanned.Severity))
	labelColor.Print("Started:      ")
	valueColor.Println(scanned.Started.Format("2006-01-02 15:04:05 MST"))
	labelColor.Print("Namespace:   ")
	valueColor.Println(scanned.Namespace)
	labelColor.Print("Resource:    ")
	valueColor.Println(scanned.PrimaryObject)
	fmt.Println()

	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	sectionColor.Println("INCIDENT SUMMARY")
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	fmt.Println()
	labelColor.Print("Type:        ")
	valueColor.Println(scanned.Type)
	labelColor.Print("Summary:     ")
	valueColor.Println(scanned.Summary)
	if scanned.Message != "" {
		labelColor.Print("Message:     ")
		valueColor.Println(scanned.Message)
	}
	labelColor.Print("Count:       ")
	warningColor.Printf("%d\n", scanned.Count)
	fmt.Println()

	// Parse pod name from PrimaryObject (format: Pod/name)
	var podName string
	if strings.HasPrefix(scanned.PrimaryObject, "Pod/") {
		podName = strings.TrimPrefix(scanned.PrimaryObject, "Pod/")
	}

	// Show actionable recommendations based on incident type
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	sectionColor.Println("RECOMMENDED ACTIONS")
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	fmt.Println()

	switch scanned.Type {
	case "high_restarts":
		infoColor.Print("🔍 Investigation Steps:\n")
		fmt.Print("   1. Check container logs for error patterns:\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl logs %s -n %s\n", podName, scanned.Namespace)
		} else {
			fmt.Print("      ")
			commandColor.Printf("kubectl logs <pod-name> -n %s\n", scanned.Namespace)
		}
		fmt.Print("   2. Review recent pod events:\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl describe pod %s -n %s\n", podName, scanned.Namespace)
		} else {
			fmt.Print("      ")
			commandColor.Printf("kubectl describe pod <pod-name> -n %s\n", scanned.Namespace)
		}
		fmt.Print("   3. Check previous container logs (if crashed):\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl logs %s -n %s --previous\n", podName, scanned.Namespace)
		} else {
			fmt.Print("      ")
			commandColor.Printf("kubectl logs <pod-name> -n %s --previous\n", scanned.Namespace)
		}
		fmt.Println()
		tipColor.Print("💡 Common Causes:\n")
		valueColor.Println("   • Application crashes (check exit codes in logs)")
		valueColor.Println("   • Out-of-memory (OOMKilled) - check memory limits")
		valueColor.Println("   • Health probe failures - verify readiness/liveness probes")
		valueColor.Println("   • Configuration errors - check env vars, secrets, configmaps")
		valueColor.Println("   • Resource constraints - CPU/memory limits too restrictive")
		fmt.Println()
		warningColor.Print("🔧 Potential Fixes:\n")
		valueColor.Println("   • Increase memory limits if OOMKilled (exit code 137)")
		valueColor.Println("   • Fix application errors causing crashes")
		valueColor.Println("   • Adjust health probe timeouts/periods")
		valueColor.Println("   • Review and fix configuration issues")
		valueColor.Println("   • Scale up resources if under-provisioned")

	case "oom":
		infoColor.Print("🔍 Investigation Steps:\n")
		fmt.Print("   1. Check memory usage metrics:\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl top pod %s -n %s\n", podName, scanned.Namespace)
		}
		fmt.Print("   2. Review memory limits in deployment:\n")
		fmt.Print("      ")
		commandColor.Printf("kubectl get deployment -n %s -o yaml | grep -A 5 limits\n", scanned.Namespace)
		fmt.Println()
		tipColor.Print("💡 Common Causes:\n")
		valueColor.Println("   • Memory limits set too low")
		valueColor.Println("   • Memory leaks in application")
		valueColor.Println("   • Sudden traffic spikes")
		fmt.Println()
		warningColor.Print("🔧 Potential Fixes:\n")
		valueColor.Println("   • Increase memory limits in deployment spec")
		valueColor.Println("   • Add memory requests for proper scheduling")
		valueColor.Println("   • Optimize application memory usage")
		valueColor.Println("   • Enable horizontal pod autoscaling")

	case "crashloop":
		infoColor.Print("🔍 Investigation Steps:\n")
		fmt.Print("   1. Check container logs:\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl logs %s -n %s --previous\n", podName, scanned.Namespace)
		}
		fmt.Print("   2. Review container exit codes:\n")
		if podName != "" {
			fmt.Print("      ")
			commandColor.Printf("kubectl describe pod %s -n %s | grep -A 10 'Last State'\n", podName, scanned.Namespace)
		}
		fmt.Println()
		tipColor.Print("💡 Common Causes:\n")
		valueColor.Println("   • Application startup failures")
		valueColor.Println("   • Missing environment variables or secrets")
		valueColor.Println("   • Configuration errors")
		valueColor.Println("   • Dependency failures")
		fmt.Println()
		warningColor.Print("🔧 Potential Fixes:\n")
		valueColor.Println("   • Fix application startup code")
		valueColor.Println("   • Verify all required secrets/configmaps exist")
		valueColor.Println("   • Check environment variable configuration")
		valueColor.Println("   • Review application dependencies")

	default:
		tipColor.Printf("💡 Use 'kubegraf analyze %s' for detailed root cause analysis\n", scanned.ID)
	}

	fmt.Println()
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	sectionColor.Println("DETAILED ANALYSIS")
	sectionColor.Println("───────────────────────────────────────────────────────────────────────────────")
	fmt.Println()
	fmt.Print("For comprehensive root cause analysis with evidence collection, run:\n")
	fmt.Print("  ")
	commandColor.Printf("kubegraf analyze %s\n", scanned.ID)
	fmt.Println()
	infoColor.Println("This will:")
	valueColor.Println("  • Collect pod status, events, and logs")
	valueColor.Println("  • Run deterministic diagnosis rules")
	valueColor.Println("  • Provide evidence-backed root cause analysis")
	valueColor.Println("  • Show specific recommendations with confidence levels")

	return nil
}
