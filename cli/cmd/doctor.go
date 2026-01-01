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
	cliinternal "github.com/kubegraf/kubegraf/cli/internal"
	"github.com/spf13/cobra"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

var (
	doctorOutput     string
	doctorContext    string
	doctorKubeconfig string
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Validate environment and connectivity",
	Long: `Validate environment and connectivity for incident collection.

Checks:
  - kubeconfig loading
  - cluster API reachability
  - RBAC permissions (pods, events, logs)
  - Metrics API availability (optional)

Examples:
  kubegraf doctor
  kubegraf doctor --context prod-cluster
  kubegraf doctor --output json`,
	RunE: runDoctor,
}

func init() {
	doctorCmd.Flags().StringVarP(&doctorOutput, "output", "o", "text", "Output format (text|json)")
	doctorCmd.Flags().StringVarP(&doctorContext, "context", "c", "", "Kubernetes context")
	doctorCmd.Flags().StringVar(&doctorKubeconfig, "kubeconfig", "", "Path to kubeconfig file")
}

type DoctorResult struct {
	Kubeconfig      CheckResult `json:"kubeconfig"`
	APIConnectivity CheckResult `json:"apiConnectivity"`
	RBAC            RBACChecks  `json:"rbac"`
	MetricsAPI      CheckResult `json:"metricsAPI"`
	Overall         string      `json:"overall"` // "pass", "partial", "fail"
}

type CheckResult struct {
	Status  string `json:"status"` // "pass", "fail", "skip"
	Message string `json:"message"`
}

type RBACChecks struct {
	ListPods   CheckResult `json:"listPods"`
	ListEvents CheckResult `json:"listEvents"`
	ReadLogs   CheckResult `json:"readLogs"`
}

func runDoctor(cmd *cobra.Command, args []string) error {
	result := &DoctorResult{}

	// Check kubeconfig loading
	if doctorKubeconfig != "" {
		os.Setenv("KUBECONFIG", doctorKubeconfig)
	}
	kubeConfig, err := cliinternal.LoadKubeConfig(doctorContext, "")
	if err != nil {
		result.Kubeconfig = CheckResult{
			Status:  "fail",
			Message: fmt.Sprintf("Failed to load kubeconfig: %v", err),
		}
		result.Overall = "fail"
		return outputDoctorResult(result, doctorOutput)
	}
	result.Kubeconfig = CheckResult{
		Status:  "pass",
		Message: fmt.Sprintf("Kubeconfig loaded successfully (context: %s)", kubeConfig.GetContext()),
	}

	// Check API connectivity
	clientset := kubeConfig.GetClientset()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = clientset.Discovery().ServerVersion()
	if err != nil {
		result.APIConnectivity = CheckResult{
			Status:  "fail",
			Message: fmt.Sprintf("Failed to connect to cluster API: %v", err),
		}
		result.Overall = "fail"
		return outputDoctorResult(result, doctorOutput)
	}
	result.APIConnectivity = CheckResult{
		Status:  "pass",
		Message: "Cluster API is reachable",
	}

	// RBAC checks
	namespace := kubeConfig.GetNamespace()
	result.RBAC = checkRBAC(ctx, clientset, namespace)

	// Metrics API check (optional)
	result.MetricsAPI = checkMetricsAPI(ctx, kubeConfig)

	// Determine overall status
	if result.Kubeconfig.Status == "fail" || result.APIConnectivity.Status == "fail" {
		result.Overall = "fail"
	} else if result.RBAC.ListPods.Status == "fail" || result.RBAC.ListEvents.Status == "fail" {
		result.Overall = "partial"
	} else {
		result.Overall = "pass"
	}

	return outputDoctorResult(result, doctorOutput)
}

func checkRBAC(ctx context.Context, clientset *kubernetes.Clientset, namespace string) RBACChecks {
	checks := RBACChecks{}

	// Check list pods
	_, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil {
		checks.ListPods = CheckResult{
			Status:  "fail",
			Message: fmt.Sprintf("Cannot list pods: %v", err),
		}
	} else {
		checks.ListPods = CheckResult{
			Status:  "pass",
			Message: "Can list pods",
		}
	}

	// Check list events
	_, err = clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil {
		checks.ListEvents = CheckResult{
			Status:  "fail",
			Message: fmt.Sprintf("Cannot list events: %v", err),
		}
	} else {
		checks.ListEvents = CheckResult{
			Status:  "pass",
			Message: "Can list events",
		}
	}

	// Check read logs (try to get logs from a pod if available)
	pods, err := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil || len(pods.Items) == 0 {
		checks.ReadLogs = CheckResult{
			Status:  "skip",
			Message: "Cannot test log access (no pods found)",
		}
	} else {
		pod := pods.Items[0]
		containerName := ""
		if len(pod.Spec.Containers) > 0 {
			containerName = pod.Spec.Containers[0].Name
		}
		_, err = clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, &corev1.PodLogOptions{
			Container: containerName,
			TailLines: int64Ptr(1),
		}).Stream(ctx)
		if err != nil {
			checks.ReadLogs = CheckResult{
				Status:  "fail",
				Message: fmt.Sprintf("Cannot read pod logs: %v", err),
			}
		} else {
			checks.ReadLogs = CheckResult{
				Status:  "pass",
				Message: "Can read pod logs",
			}
		}
	}

	return checks
}

func checkMetricsAPI(ctx context.Context, kubeConfig *cliinternal.KubeConfig) CheckResult {
	restConfig := kubeConfig.GetRESTConfig()
	metricsClient, err := metricsclientset.NewForConfig(restConfig)
	if err != nil {
		return CheckResult{
			Status:  "skip",
			Message: "Metrics client creation failed (optional)",
		}
	}

	// Try to list pod metrics
	_, err = metricsClient.MetricsV1beta1().PodMetricses("").List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil {
		// Metrics API is optional - any error means it's not available or not accessible
		return CheckResult{
			Status:  "skip",
			Message: fmt.Sprintf("Metrics API not available: %v (optional)", err),
		}
	}

	return CheckResult{
		Status:  "pass",
		Message: "Metrics API is available",
	}
}

func outputDoctorResult(result *DoctorResult, format string) error {
	if format == "json" {
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		return encoder.Encode(result)
	}

	// Color definitions
	headerColor := color.New(color.Bold, color.FgCyan)
	labelColor := color.New(color.Bold, color.FgCyan)
	passColor := color.New(color.FgGreen, color.Bold)
	failColor := color.New(color.FgRed, color.Bold)
	skipColor := color.New(color.FgYellow)
	valueColor := color.New(color.FgWhite)

	// Text output
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	headerColor.Println("KUBEGRAF DOCTOR")
	headerColor.Println("═══════════════════════════════════════════════════════════════════════════════")
	fmt.Println()

	labelColor.Print("Kubeconfig:     ")
	printStatus(result.Kubeconfig.Status, result.Kubeconfig.Message, passColor, failColor, skipColor, valueColor)

	labelColor.Print("API Connect:    ")
	printStatus(result.APIConnectivity.Status, result.APIConnectivity.Message, passColor, failColor, skipColor, valueColor)

	fmt.Println()
	labelColor.Println("RBAC Checks:")
	labelColor.Print("  List Pods:    ")
	printStatus(result.RBAC.ListPods.Status, result.RBAC.ListPods.Message, passColor, failColor, skipColor, valueColor)

	labelColor.Print("  List Events:  ")
	printStatus(result.RBAC.ListEvents.Status, result.RBAC.ListEvents.Message, passColor, failColor, skipColor, valueColor)

	labelColor.Print("  Read Logs:    ")
	printStatus(result.RBAC.ReadLogs.Status, result.RBAC.ReadLogs.Message, passColor, failColor, skipColor, valueColor)

	fmt.Println()
	labelColor.Print("Metrics API:    ")
	printStatus(result.MetricsAPI.Status, result.MetricsAPI.Message, passColor, failColor, skipColor, valueColor)

	fmt.Println()
	labelColor.Print("Overall:        ")

	// Overall status with color
	var overallColor *color.Color
	switch result.Overall {
	case "pass":
		overallColor = passColor
	case "fail":
		overallColor = failColor
	case "partial":
		overallColor = skipColor
	default:
		overallColor = valueColor
	}
	overallColor.Println(strings.ToUpper(result.Overall))

	// Exit codes
	if result.Overall == "fail" {
		os.Exit(3)
	} else if result.Overall == "partial" {
		os.Exit(4)
	}
	return nil
}

func printStatus(status, message string, passColor, failColor, skipColor, valueColor *color.Color) {
	var statusColor *color.Color
	var icon string

	switch status {
	case "pass":
		statusColor = passColor
		icon = "✓"
	case "fail":
		statusColor = failColor
		icon = "✗"
	case "skip":
		statusColor = skipColor
		icon = "-"
	default:
		statusColor = valueColor
		icon = "-"
	}

	statusColor.Print(icon)
	fmt.Print(" - ")
	valueColor.Println(message)
}

func statusIcon(status string) string {
	switch status {
	case "pass":
		return "✓"
	case "fail":
		return "✗"
	default:
		return "-"
	}
}

func int64Ptr(i int64) *int64 {
	return &i
}
