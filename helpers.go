// Copyright 2025 KubeGraf Contributors
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

package main

import (
	"fmt"
	"time"
)

// getStatusIcon returns the appropriate icon and color for a resource status
func getStatusIcon(status string, ready bool) (string, string) {
	switch status {
	case "Running":
		if ready {
			return IconOK, "green"
		}
		return IconProgressing, "yellow"
	case "Pending":
		return IconPending, "yellow"
	case "Succeeded", "Completed":
		return IconOK, "green"
	case "Failed":
		return IconBad, "red"
	case "CrashLoopBackOff":
		return IconBad, "red"
	default:
		return IconUnknown, "gray"
	}
}

// getEventIcon returns the appropriate icon and color for an event type
func getEventIcon(eventType string) (string, string) {
	switch eventType {
	case "Normal":
		return IconOK, "green"
	case "Warning":
		return IconWarning, "yellow"
	case "Error":
		return IconBad, "red"
	default:
		return IconUnknown, "gray"
	}
}

// formatDuration formats a duration into a human-readable string
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	} else if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	} else if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	} else {
		return fmt.Sprintf("%dd", int(d.Hours()/24))
	}
}
