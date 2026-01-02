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
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	cliinternal "github.com/kubegraf/kubegraf/cli/internal"
	"github.com/spf13/cobra"
)

var (
	exportFormat string
	exportOut    string
)

var exportCmd = &cobra.Command{
	Use:   "export incident <incident-id>",
	Short: "Export incident and analysis summary",
	Long: `Export incident and analysis summary to a file or stdout.

Examples:
  kubegraf export incident INC-abc123
  kubegraf export incident INC-abc123 --format json --out incident.json
  kubegraf export incident INC-abc123 --format md`,
	Args: cobra.ExactArgs(2),
	RunE: runExport,
}

func init() {
	exportCmd.Flags().StringVar(&exportFormat, "format", "json", "Export format (json|md)")
	exportCmd.Flags().StringVar(&exportOut, "out", "", "Output file (default: stdout)")
}

func runExport(cmd *cobra.Command, args []string) error {
	if args[0] != "incident" {
		return fmt.Errorf("only 'incident' export is supported")
	}

	incidentID := args[1]

	store, err := cliinternal.NewIncidentStore()
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			return fmt.Errorf("database is locked by web UI. Wait a moment and retry")
		}
		return fmt.Errorf("initialize incident store: %w", err)
	}

	incident, err := store.Get(incidentID)
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			return fmt.Errorf("database is locked by web UI. Wait a moment and retry")
		}
		return fmt.Errorf("get incident: %w", err)
	}

	var output []byte
	if exportFormat == "json" {
		output, err = json.MarshalIndent(incident.FullIncident, "", "  ")
		if err != nil {
			return fmt.Errorf("marshal JSON: %w", err)
		}
	} else if exportFormat == "md" {
		output = formatIncidentMarkdown(incident)
	} else {
		return fmt.Errorf("unsupported format: %s (supported: json, md)", exportFormat)
	}

	if exportOut != "" {
		err = os.WriteFile(exportOut, output, 0644)
		if err != nil {
			return fmt.Errorf("write file: %w", err)
		}
		fmt.Printf("Exported to %s\n", exportOut)
	} else {
		fmt.Print(string(output))
	}

	return nil
}

func formatIncidentMarkdown(incident *cliinternal.IncidentRecord) []byte {
	inc := incident.FullIncident
	var buf []byte

	buf = append(buf, fmt.Sprintf("# Incident: %s\n\n", incident.ID)...)
	buf = append(buf, fmt.Sprintf("**Severity:** %s\n\n", incident.Severity)...)
	buf = append(buf, fmt.Sprintf("**Started:** %s\n\n", incident.Started.Format(time.RFC3339))...)
	if inc.LastSeen.After(inc.FirstSeen) {
		buf = append(buf, fmt.Sprintf("**Last Seen:** %s\n\n", inc.LastSeen.Format(time.RFC3339))...)
	}
	if inc.ResolvedAt != nil {
		buf = append(buf, fmt.Sprintf("**Resolved:** %s\n\n", inc.ResolvedAt.Format(time.RFC3339))...)
	}
	buf = append(buf, fmt.Sprintf("**Namespace:** %s\n\n", incident.Namespace)...)
	buf = append(buf, fmt.Sprintf("**Resource:** %s\n\n", incident.PrimaryObject)...)
	buf = append(buf, fmt.Sprintf("## Title\n\n%s\n\n", inc.Title)...)
	if inc.Description != "" {
		buf = append(buf, fmt.Sprintf("## Description\n\n%s\n\n", inc.Description)...)
	}
	buf = append(buf, fmt.Sprintf("**Pattern:** %s\n\n", inc.Pattern)...)
	buf = append(buf, fmt.Sprintf("**Occurrences:** %d\n\n", inc.Occurrences)...)
	if inc.ClusterContext != "" {
		buf = append(buf, fmt.Sprintf("**Cluster Context:** %s\n\n", inc.ClusterContext)...)
	}
	if inc.Diagnosis != nil {
		buf = append(buf, "## Diagnosis\n\n"...)
		buf = append(buf, fmt.Sprintf("%s\n\n", inc.Diagnosis.Summary)...)
		buf = append(buf, fmt.Sprintf("**Confidence:** %.2f\n\n", inc.Diagnosis.Confidence)...)
		if len(inc.Diagnosis.ProbableCauses) > 0 {
			buf = append(buf, "### Probable Causes\n\n"...)
			for _, cause := range inc.Diagnosis.ProbableCauses {
				buf = append(buf, fmt.Sprintf("- %s\n", cause)...)
			}
			buf = append(buf, "\n"...)
		}
		if len(inc.Diagnosis.Evidence) > 0 {
			buf = append(buf, "### Evidence\n\n"...)
			for _, ev := range inc.Diagnosis.Evidence {
				buf = append(buf, fmt.Sprintf("- %s\n", ev)...)
			}
			buf = append(buf, "\n"...)
		}
	}
	if inc.Resolution != "" {
		buf = append(buf, fmt.Sprintf("## Resolution\n\n%s\n\n", inc.Resolution)...)
	}

	return buf
}
