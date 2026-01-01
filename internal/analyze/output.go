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

package analyze

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
)

// AnalysisResult contains the complete analysis output
type AnalysisResult struct {
	IncidentID string     `json:"incidentId,omitempty"`
	Targets    int        `json:"targets"`
	Evidence   *Evidence  `json:"evidence"`
	Diagnosis  *Diagnosis `json:"diagnosis"`
	Skipped    []string   `json:"skipped,omitempty"`
}

// OutputText prints analysis result in text format
func OutputText(result *AnalysisResult, incidentSummary string) {
	// Color definitions
	headerColor := color.New(color.Bold, color.FgCyan)
	infoColor := color.New(color.FgBlue)
	labelColor := color.New(color.Bold, color.FgCyan)
	valueColor := color.New(color.FgWhite)
	successColor := color.New(color.FgGreen, color.Bold)
	warningColor := color.New(color.FgYellow)

	infoColor.Print("⚡ Collecting evidence...\n")
	fmt.Print("├─ ")
	labelColor.Print("Incident: ")
	valueColor.Printf("%s (%s)\n", result.IncidentID, incidentSummary)
	fmt.Print("├─ ")
	labelColor.Print("Targets: ")
	valueColor.Printf("%d pod(s)\n", result.Targets)

	// Pod status
	if result.Evidence.PodStatus != nil {
		ps := result.Evidence.PodStatus
		fmt.Print("├─ ")
		labelColor.Print("Pod status: ")
		valueColor.Print(ps.Phase)
		if ps.Reason != "" {
			fmt.Print(" (")
			warningColor.Print(ps.Reason)
			fmt.Print(")")
		}
		if ps.Restarts > 0 {
			fmt.Print(" - ")
			warningColor.Printf("%d restart(s)", ps.Restarts)
		}
		fmt.Println()
	}

	// Pod logs
	if len(result.Evidence.Logs) > 0 {
		totalLines := 0
		for _, log := range result.Evidence.Logs {
			totalLines += len(log.Lines)
		}
		fmt.Print("├─ ")
		labelColor.Print("Pod logs: ")
		valueColor.Printf("%d container(s), %d line(s) collected\n", len(result.Evidence.Logs), totalLines)
	} else {
		fmt.Print("├─ ")
		labelColor.Print("Pod logs: ")
		warningColor.Println("(none collected)")
	}

	// Events
	if len(result.Evidence.Events) > 0 {
		fmt.Print("├─ ")
		labelColor.Print("Events: ")
		valueColor.Printf("%d event(s)\n", len(result.Evidence.Events))
	} else {
		fmt.Print("├─ ")
		labelColor.Print("Events: ")
		warningColor.Println("(none collected)")
	}

	// Metrics
	if result.Evidence.Metrics != nil {
		fmt.Print("├─ ")
		labelColor.Print("Resource metrics: ")
		if result.Evidence.Metrics.Available {
			valueColor.Printf("%d container(s)\n", len(result.Evidence.Metrics.Containers))
		} else {
			warningColor.Printf("%s\n", result.Evidence.Metrics.Error)
		}
	} else {
		fmt.Print("├─ ")
		labelColor.Print("Resource metrics: ")
		warningColor.Println("(unavailable → skipped)")
	}

	// Skipped items
	if len(result.Skipped) > 0 {
		for _, skip := range result.Skipped {
			fmt.Print("├─ ")
			warningColor.Println(skip)
		}
	}

	fmt.Println()
	successColor.Println("✓ Root cause identified:")
	fmt.Println()

	// Diagnosis title
	headerColor.Println(result.Diagnosis.Title)

	// Confidence with color
	fmt.Print("Confidence: ")
	var confColor *color.Color
	switch result.Diagnosis.Confidence {
	case "High":
		confColor = color.New(color.FgGreen, color.Bold)
	case "Medium":
		confColor = color.New(color.FgYellow, color.Bold)
	case "Low":
		confColor = color.New(color.FgRed)
	default:
		confColor = color.New(color.FgWhite)
	}
	confColor.Println(result.Diagnosis.Confidence)

	// Evidence
	if len(result.Diagnosis.Evidence) > 0 {
		labelColor.Println("Evidence:")
		for _, ev := range result.Diagnosis.Evidence {
			fmt.Print("  ")
			valueColor.Printf("• %s\n", ev)
		}
	}

	fmt.Println()
	labelColor.Println("Recommendations (preview-only):")
	for _, rec := range result.Diagnosis.Recommendations {
		fmt.Print("  ")
		valueColor.Printf("• %s\n", rec)
	}
}

// OutputJSON prints analysis result in JSON format
func OutputJSON(result *AnalysisResult) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(result)
}

// FormatDuration formats a duration for display
func FormatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%.0fs", d.Seconds())
	} else if d < time.Hour {
		return fmt.Sprintf("%.0fm", d.Minutes())
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%.1fh", d.Hours())
	}
	return fmt.Sprintf("%.1fd", d.Hours()/24)
}

// TruncateString truncates a string to max length
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// JoinStrings joins strings with separator, handling empty slices
func JoinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	return strings.Join(strs, sep)
}
