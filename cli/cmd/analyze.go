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
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/internal/analyze"
	"github.com/kubegraf/kubegraf/cli/internal"
	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

var (
	analyzeSince      string
	analyzeTail       int64
	analyzeOutput     string
	analyzeContext    string
	analyzeKubeconfig string
	analyzeNamespace  string
)

var analyzeCmd = &cobra.Command{
	Use:   "analyze <incident-id>",
	Short: "Analyze an incident to determine root cause",
	Long: `Analyze an incident to determine root cause by collecting evidence
from the cluster and running deterministic diagnosis rules.

Examples:
  kubegraf analyze INC-abc123
  kubegraf analyze INC-abc123 --since 30m --tail 500
  kubegraf analyze INC-abc123 --output json`,
	Args: cobra.ExactArgs(1),
	RunE: runAnalyze,
}

func init() {
	analyzeCmd.Flags().StringVar(&analyzeSince, "since", "15m", "Collect evidence since duration (e.g., 15m, 1h)")
	analyzeCmd.Flags().Int64Var(&analyzeTail, "tail", 200, "Number of log lines to collect per container")
	analyzeCmd.Flags().StringVarP(&analyzeOutput, "output", "o", "text", "Output format (text|json)")
	analyzeCmd.Flags().StringVarP(&analyzeContext, "context", "c", "", "Kubernetes context")
	analyzeCmd.Flags().StringVar(&analyzeKubeconfig, "kubeconfig", "", "Path to kubeconfig file")
	analyzeCmd.Flags().StringVarP(&analyzeNamespace, "namespace", "n", "", "Namespace (for resolving ambiguous objects)")
}

func runAnalyze(cmd *cobra.Command, args []string) error {
	incidentID := args[0]

	// Load incident from store (read-only, safe alongside web UI)
	store, err := cli.NewIncidentStore()
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			return fmt.Errorf("database is locked by web UI. Wait a moment and retry")
		}
		return fmt.Errorf("initialize incident store: %w", err)
	}

	incidentRecord, err := store.Get(incidentID)
	if err != nil {
		if strings.Contains(err.Error(), "locked") {
			return fmt.Errorf("database is locked by web UI. Wait a moment and retry")
		}
		return fmt.Errorf("get incident: %w", err)
	}

	inc := incidentRecord.FullIncident

	// Load kubeconfig
	if analyzeKubeconfig != "" {
		os.Setenv("KUBECONFIG", analyzeKubeconfig)
	}
	namespace := analyzeNamespace
	if namespace == "" {
		namespace = inc.Resource.Namespace
	}
	if namespace == "" {
		namespace = "default"
	}

	kubeConfig, err := cli.LoadKubeConfig(analyzeContext, namespace)
	if err != nil {
		return fmt.Errorf("load kubeconfig: %w", err)
	}

	clientset := kubeConfig.GetClientset()
	restConfig := kubeConfig.GetRESTConfig()

	// Try to create metrics client (optional)
	var metricsClient metricsclientset.Interface
	mc, err := metricsclientset.NewForConfig(restConfig)
	if err == nil {
		metricsClient = mc
	}

	// Resolve target pods from incident
	pods, err := resolveTargetPods(context.Background(), clientset, inc, namespace)
	if err != nil {
		return fmt.Errorf("resolve target pods: %w", err)
	}

	if len(pods) == 0 {
		return fmt.Errorf("no target pods found for incident %s", incidentID)
	}

	// Parse since duration
	since, err := time.ParseDuration(analyzeSince)
	if err != nil {
		return fmt.Errorf("invalid --since duration: %w", err)
	}

	// Collect evidence from first pod (for v1, we analyze one pod)
	// In future, we could analyze multiple pods
	pod := pods[0]
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	evidence, err := analyze.CollectEvidence(ctx, clientset, metricsClient, namespace, pod.Name, since, analyzeTail)
	if err != nil {
		return fmt.Errorf("collect evidence: %w", err)
	}

	// Run diagnosis
	diagnosis := analyze.Analyze(evidence)

	// Build result
	result := &analyze.AnalysisResult{
		IncidentID: incidentID,
		Targets:    len(pods),
		Evidence:   evidence,
		Diagnosis:  diagnosis,
		Skipped:    evidence.Skipped,
	}

	// Output result
	if analyzeOutput == "json" {
		return analyze.OutputJSON(result)
	}

	analyze.OutputText(result, inc.Title)
	return nil
}

// resolveTargetPods resolves pods from an incident
func resolveTargetPods(ctx context.Context, clientset *kubernetes.Clientset, inc *incidents.IncidentRecord, defaultNamespace string) ([]corev1.Pod, error) {
	namespace := inc.Resource.Namespace
	if namespace == "" {
		namespace = defaultNamespace
	}

	// If incident directly references a pod, get it
	if inc.Resource.Kind == "Pod" {
		pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, inc.Resource.Name, metav1.GetOptions{})
		if err != nil {
			return nil, fmt.Errorf("get pod %s/%s: %w", namespace, inc.Resource.Name, err)
		}
		return []corev1.Pod{*pod}, nil
	}

	// If incident references a controller, resolve to pods
	// Try to find pods by labels or owner references
	labelSelector := ""
	if inc.Resource.Kind == "Deployment" || inc.Resource.Kind == "ReplicaSet" || inc.Resource.Kind == "StatefulSet" || inc.Resource.Kind == "DaemonSet" {
		// For now, we'll try to find pods by name prefix or owner
		// This is a simplified approach - in production, we'd use proper label selectors
		pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
		if err != nil {
			return nil, fmt.Errorf("list pods: %w", err)
		}

		var matchingPods []corev1.Pod
		for _, pod := range pods.Items {
			// Check if pod is owned by the resource
			for _, owner := range pod.OwnerReferences {
				if owner.Name == inc.Resource.Name && owner.Kind == inc.Resource.Kind {
					matchingPods = append(matchingPods, pod)
					break
				}
			}
			// Also check if pod name starts with resource name (common pattern)
			if len(matchingPods) == 0 && len(pod.Name) >= len(inc.Resource.Name) {
				if pod.Name[:len(inc.Resource.Name)] == inc.Resource.Name {
					matchingPods = append(matchingPods, pod)
				}
			}
		}

		if len(matchingPods) > 0 {
			return matchingPods, nil
		}
	}

	// Fallback: try to get pod by name directly
	if labelSelector == "" {
		pod, err := clientset.CoreV1().Pods(namespace).Get(ctx, inc.Resource.Name, metav1.GetOptions{})
		if err == nil {
			return []corev1.Pod{*pod}, nil
		}
	}

	return nil, fmt.Errorf("could not resolve pods for resource %s/%s/%s", namespace, inc.Resource.Kind, inc.Resource.Name)
}
