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
	"fmt"
	"strings"
)

// Confidence represents the confidence level of a diagnosis
type Confidence string

const (
	ConfidenceHigh   Confidence = "High"
	ConfidenceMedium Confidence = "Medium"
	ConfidenceLow    Confidence = "Low"
)

// Diagnosis contains the root cause analysis result
type Diagnosis struct {
	Title           string     `json:"title"`
	Confidence      Confidence `json:"confidence"`
	Evidence        []string   `json:"evidence"`
	Recommendations []string   `json:"recommendations"`
}

// Analyze runs deterministic rules to diagnose root cause
func Analyze(evidence *Evidence) *Diagnosis {
	// Rule 1: OOMKilled
	if diag := checkOOMKilled(evidence); diag != nil {
		return diag
	}

	// Rule 2: ImagePullBackOff / ErrImagePull
	if diag := checkImagePullError(evidence); diag != nil {
		return diag
	}

	// Rule 3: CrashLoopBackOff
	if diag := checkCrashLoopBackOff(evidence); diag != nil {
		return diag
	}

	// Rule 4: Pending + Unschedulable
	if diag := checkUnschedulable(evidence); diag != nil {
		return diag
	}

	// Rule 5: CreateContainerConfigError
	if diag := checkContainerConfigError(evidence); diag != nil {
		return diag
	}

	// Rule 6: Probe failures
	if diag := checkProbeFailures(evidence); diag != nil {
		return diag
	}

	// Rule 7: High restart counts
	if diag := checkHighRestarts(evidence); diag != nil {
		return diag
	}

	// Default: Unknown issue
	return &Diagnosis{
		Title:      "Unknown issue - requires manual investigation",
		Confidence: ConfidenceLow,
		Evidence: []string{
			fmt.Sprintf("Pod phase: %s", evidence.PodStatus.Phase),
			fmt.Sprintf("Pod reason: %s", evidence.PodStatus.Reason),
		},
		Recommendations: []string{
			"Review pod events for more details",
			"Check pod logs for application errors",
			"Verify resource limits and requests",
		},
	}
}

func checkOOMKilled(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	// Check last termination state
	if evidence.PodStatus.LastTermination != nil {
		if evidence.PodStatus.LastTermination.Reason == "OOMKilled" {
			return &Diagnosis{
				Title:      "Container was killed due to out-of-memory (OOMKilled)",
				Confidence: ConfidenceHigh,
				Evidence: []string{
					fmt.Sprintf("Last termination reason: %s", evidence.PodStatus.LastTermination.Reason),
					fmt.Sprintf("Exit code: %d", evidence.PodStatus.LastTermination.ExitCode),
				},
				Recommendations: []string{
					"Increase memory limits for the container",
					"Review application memory usage patterns",
					"Consider adding memory requests to ensure proper scheduling",
				},
			}
		}
	}

	// Check exit code 137 (OOM kill signal)
	if evidence.PodStatus.LastTermination != nil && evidence.PodStatus.LastTermination.ExitCode == 137 {
		// Also check for OOM-related events or messages
		oomIndicators := false
		for _, ev := range evidence.Events {
			if strings.Contains(strings.ToLower(ev.Message), "oom") || strings.Contains(strings.ToLower(ev.Reason), "oom") {
				oomIndicators = true
				break
			}
		}
		if oomIndicators {
			return &Diagnosis{
				Title:      "Container was killed due to out-of-memory (OOMKilled)",
				Confidence: ConfidenceHigh,
				Evidence: []string{
					fmt.Sprintf("Exit code: %d (OOM kill signal)", evidence.PodStatus.LastTermination.ExitCode),
					"OOM-related events detected",
				},
				Recommendations: []string{
					"Increase memory limits for the container",
					"Review application memory usage patterns",
					"Check if memory metrics show usage near limits",
				},
			}
		}
	}

	// Check memory metrics
	if evidence.Metrics != nil && evidence.Metrics.Available {
		for _, cm := range evidence.Metrics.Containers {
			if cm.NearLimit {
				return &Diagnosis{
					Title:      "Container memory usage near limit (potential OOM risk)",
					Confidence: ConfidenceMedium,
					Evidence: []string{
						fmt.Sprintf("Container %s memory usage: %.1f%% of limit", cm.Name, cm.MemPercent),
						fmt.Sprintf("Memory usage: %s / %s", cm.MemUsage, cm.MemLimit),
					},
					Recommendations: []string{
						"Increase memory limits for the container",
						"Monitor memory usage trends",
						"Review application memory allocation",
					},
				}
			}
		}
	}

	return nil
}

func checkImagePullError(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	for _, cs := range evidence.PodStatus.ContainerStatuses {
		if cs.State.Waiting != nil {
			reason := cs.State.Waiting.Reason
			if reason == "ImagePullBackOff" || reason == "ErrImagePull" {
				return &Diagnosis{
					Title:      fmt.Sprintf("Container image pull failed: %s", reason),
					Confidence: ConfidenceHigh,
					Evidence: []string{
						fmt.Sprintf("Container %s waiting reason: %s", cs.Name, reason),
						fmt.Sprintf("Message: %s", cs.State.Waiting.Message),
					},
					Recommendations: []string{
						"Verify image name and tag are correct",
						"Check image registry accessibility",
						"Verify image pull secrets are configured correctly",
						"Ensure image exists in the registry",
					},
				}
			}
		}
	}

	return nil
}

func checkCrashLoopBackOff(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	for _, cs := range evidence.PodStatus.ContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason == "CrashLoopBackOff" {
			diag := &Diagnosis{
				Title:      "Container is in CrashLoopBackOff state",
				Confidence: ConfidenceMedium,
				Evidence: []string{
					fmt.Sprintf("Container %s waiting reason: CrashLoopBackOff", cs.Name),
					fmt.Sprintf("Restart count: %d", cs.RestartCount),
				},
				Recommendations: []string{
					"Check container logs for error messages",
					"Review application startup configuration",
					"Verify environment variables and secrets",
					"Check if the application is crashing on startup",
				},
			}

			// If we have termination info, increase confidence
			if cs.LastState != nil && cs.LastState.Terminated != nil {
				diag.Confidence = ConfidenceHigh
				diag.Evidence = append(diag.Evidence,
					fmt.Sprintf("Last termination reason: %s", cs.LastState.Terminated.Reason),
					fmt.Sprintf("Last exit code: %d", cs.LastState.Terminated.ExitCode),
				)
				if cs.LastState.Terminated.Message != "" {
					diag.Evidence = append(diag.Evidence, fmt.Sprintf("Termination message: %s", cs.LastState.Terminated.Message))
				}
			}

			return diag
		}
	}

	return nil
}

func checkUnschedulable(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	if evidence.PodStatus.Phase == "Pending" {
		// Check events for Unschedulable reason
		for _, ev := range evidence.Events {
			if ev.Reason == "FailedScheduling" || strings.Contains(ev.Message, "Unschedulable") {
				return &Diagnosis{
					Title:      "Pod is unschedulable",
					Confidence: ConfidenceHigh,
					Evidence: []string{
						fmt.Sprintf("Pod phase: %s", evidence.PodStatus.Phase),
						fmt.Sprintf("Event reason: %s", ev.Reason),
						fmt.Sprintf("Event message: %s", ev.Message),
					},
					Recommendations: []string{
						"Check node resources (CPU, memory, disk)",
						"Verify node selectors and affinity rules",
						"Check for taints and tolerations",
						"Review resource requests and limits",
					},
				}
			}
		}
	}

	return nil
}

func checkContainerConfigError(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	for _, cs := range evidence.PodStatus.ContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason == "CreateContainerConfigError" {
			return &Diagnosis{
				Title:      "Container configuration error",
				Confidence: ConfidenceHigh,
				Evidence: []string{
					fmt.Sprintf("Container %s waiting reason: CreateContainerConfigError", cs.Name),
					fmt.Sprintf("Message: %s", cs.State.Waiting.Message),
				},
				Recommendations: []string{
					"Check if required secrets or config maps exist",
					"Verify secret/config map keys are correct",
					"Review volume mount configurations",
					"Check environment variable references",
				},
			}
		}
	}

	return nil
}

func checkProbeFailures(evidence *Evidence) *Diagnosis {
	probeFailureFound := false
	var probeMessages []string

	for _, ev := range evidence.Events {
		msg := strings.ToLower(ev.Message)
		if strings.Contains(msg, "readiness probe failed") || strings.Contains(msg, "liveness probe failed") {
			probeFailureFound = true
			probeMessages = append(probeMessages, ev.Message)
		}
	}

	if probeFailureFound {
		return &Diagnosis{
			Title:      "Health probe failures detected",
			Confidence: ConfidenceMedium,
			Evidence:   probeMessages,
			Recommendations: []string{
				"Verify probe endpoints are responding correctly",
				"Check probe timeout and period settings",
				"Review application health check implementation",
				"Ensure probe paths are accessible",
			},
		}
	}

	return nil
}

func checkHighRestarts(evidence *Evidence) *Diagnosis {
	if evidence.PodStatus == nil {
		return nil
	}

	// Check for high restart counts (>5 restarts)
	highRestartFound := false
	var maxRestarts int32
	var containerWithRestarts string

	for _, cs := range evidence.PodStatus.ContainerStatuses {
		if cs.RestartCount > 5 {
			highRestartFound = true
			if cs.RestartCount > maxRestarts {
				maxRestarts = cs.RestartCount
				containerWithRestarts = cs.Name
			}
		}
	}

	if !highRestartFound {
		return nil
	}

	// Build evidence list
	evidenceList := []string{
		fmt.Sprintf("Container %s has restarted %d times", containerWithRestarts, maxRestarts),
		fmt.Sprintf("Total pod restarts: %d", evidence.PodStatus.Restarts),
	}

	// Check for termination reasons in events
	terminationReasons := make(map[string]int)
	for _, ev := range evidence.Events {
		if strings.Contains(ev.Reason, "Killing") || strings.Contains(ev.Reason, "Failed") {
			terminationReasons[ev.Reason]++
		}
	}
	if len(terminationReasons) > 0 {
		for reason, count := range terminationReasons {
			evidenceList = append(evidenceList, fmt.Sprintf("Event: %s (seen %d times)", reason, count))
		}
	}

	// Check last termination state for clues
	if evidence.PodStatus.LastTermination != nil {
		if evidence.PodStatus.LastTermination.Reason != "" {
			evidenceList = append(evidenceList, fmt.Sprintf("Last termination reason: %s", evidence.PodStatus.LastTermination.Reason))
		}
		if evidence.PodStatus.LastTermination.ExitCode != 0 {
			evidenceList = append(evidenceList, fmt.Sprintf("Last exit code: %d", evidence.PodStatus.LastTermination.ExitCode))
		}
	}

	// Determine confidence based on available evidence
	confidence := ConfidenceMedium
	if evidence.PodStatus.LastTermination != nil && evidence.PodStatus.LastTermination.Reason != "" {
		confidence = ConfidenceHigh
	}

	// Build recommendations
	recommendations := []string{
		"Check container logs for error patterns: kubectl logs <pod-name> -c <container-name>",
		"Review recent pod events: kubectl describe pod <pod-name>",
		"Check if container is being OOMKilled (exit code 137)",
		"Verify application health checks and readiness probes",
		"Review resource limits (CPU/memory) - may be too restrictive",
		"Check for application startup failures or configuration errors",
		"Review environment variables and secrets for misconfigurations",
	}

	// Add specific recommendations based on termination reason
	if evidence.PodStatus.LastTermination != nil {
		if evidence.PodStatus.LastTermination.Reason == "OOMKilled" || evidence.PodStatus.LastTermination.ExitCode == 137 {
			recommendations = append([]string{
				"⚠️  Container is being OOMKilled - increase memory limits",
				"Review memory usage patterns and optimize application",
			}, recommendations...)
		}
		if evidence.PodStatus.LastTermination.ExitCode != 0 && evidence.PodStatus.LastTermination.ExitCode != 137 {
			recommendations = append([]string{
				fmt.Sprintf("Container exiting with code %d - check application logs for errors", evidence.PodStatus.LastTermination.ExitCode),
			}, recommendations...)
		}
	}

	return &Diagnosis{
		Title:           fmt.Sprintf("Container has high restart count (%d restarts)", maxRestarts),
		Confidence:      confidence,
		Evidence:        evidenceList,
		Recommendations: recommendations,
	}
}
