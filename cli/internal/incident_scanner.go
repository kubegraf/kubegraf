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
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ScannedIncident represents an incident found by scanning the cluster
type ScannedIncident struct {
	ID            string
	Severity      string
	Started       time.Time
	Namespace     string
	PrimaryObject string
	Summary       string
	Type          string
	Message       string
	Count         int
}

// ScanClusterForIncidents scans the Kubernetes cluster for incidents
// This is a read-only operation that creates its own Kubernetes client connection.
// It does not interfere with the web UI's cluster connections or state.
func ScanClusterForIncidents(ctx context.Context, clientset *kubernetes.Clientset, namespace string) ([]*ScannedIncident, error) {
	var incidents []*ScannedIncident

	// Scan pods for incidents (read-only Kubernetes API calls)
	podIncidents, err := scanPodsForIncidents(ctx, clientset, namespace)
	if err != nil {
		return nil, fmt.Errorf("scan pods: %w", err)
	}
	incidents = append(incidents, podIncidents...)

	// Scan nodes for incidents (read-only Kubernetes API calls)
	nodeIncidents, err := scanNodesForIncidents(ctx, clientset)
	if err != nil {
		// Node scanning errors are non-fatal - don't fail the entire command
		// This is safe as it's just a read operation
		if os.Getenv("KUBEGRAF_DEBUG") != "" {
			fmt.Fprintf(os.Stderr, "Warning: failed to scan nodes: %v\n", err)
		}
	}
	incidents = append(incidents, nodeIncidents...)

	return incidents, nil
}

func scanPodsForIncidents(ctx context.Context, clientset *kubernetes.Clientset, namespace string) ([]*ScannedIncident, error) {
	var incidents []*ScannedIncident

	opts := metav1.ListOptions{Limit: 2000}
	var pods *corev1.PodList
	var err error

	if namespace == "" {
		// Scan all namespaces (skip system namespaces)
		namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
		if err != nil {
			return incidents, err
		}

		for _, ns := range namespaces.Items {
			// Skip system namespaces
			if ns.Name == "kube-system" || ns.Name == "kube-public" || ns.Name == "kube-node-lease" {
				continue
			}

			nsPods, err := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{Limit: 500})
			if err != nil {
				continue // Skip namespace on error
			}

			for i := range nsPods.Items {
				podIncidents := scanPodForIncidents(&nsPods.Items[i])
				incidents = append(incidents, podIncidents...)
			}
		}
	} else {
		pods, err = clientset.CoreV1().Pods(namespace).List(ctx, opts)
		if err != nil {
			return incidents, err
		}

		for i := range pods.Items {
			podIncidents := scanPodForIncidents(&pods.Items[i])
			incidents = append(incidents, podIncidents...)
		}
	}

	return incidents, nil
}

func scanPodForIncidents(pod *corev1.Pod) []*ScannedIncident {
	var incidents []*ScannedIncident

	checkContainer := func(cs corev1.ContainerStatus, containerName string) {
		// Check for OOMKilled
		if cs.LastTerminationState.Terminated != nil {
			term := cs.LastTerminationState.Terminated
			if term.Reason == "OOMKilled" {
				incidents = append(incidents, &ScannedIncident{
					ID:            fmt.Sprintf("oom-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Severity:      "critical",
					Started:       term.FinishedAt.Time,
					Namespace:     pod.Namespace,
					PrimaryObject: fmt.Sprintf("Pod/%s", pod.Name),
					Summary:       fmt.Sprintf("Container %s was OOMKilled", containerName),
					Type:          "oom",
					Message:       fmt.Sprintf("Container %s was OOMKilled", containerName),
					Count:         1,
				})
			}
		}

		// Check for CrashLoopBackOff and other error states
		if cs.State.Waiting != nil {
			waiting := cs.State.Waiting
			if waiting.Reason == "CrashLoopBackOff" || waiting.Reason == "ImagePullBackOff" || waiting.Reason == "ErrImagePull" {
				severity := "warning"
				if waiting.Reason == "CrashLoopBackOff" {
					severity = "critical"
				}
				incidents = append(incidents, &ScannedIncident{
					ID:            fmt.Sprintf("crashloop-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Severity:      severity,
					Started:       pod.CreationTimestamp.Time,
					Namespace:     pod.Namespace,
					PrimaryObject: fmt.Sprintf("Pod/%s", pod.Name),
					Summary:       fmt.Sprintf("Container %s: %s", containerName, waiting.Reason),
					Type:          "crashloop",
					Message:       fmt.Sprintf("Container %s: %s", containerName, waiting.Message),
					Count:         int(cs.RestartCount),
				})
			}
		}

		// Check for high restart counts
		if cs.RestartCount > 5 {
			// Only report if not already reported
			alreadyReported := false
			for _, inc := range incidents {
				if inc.PrimaryObject == fmt.Sprintf("Pod/%s", pod.Name) {
					alreadyReported = true
					break
				}
			}
			if !alreadyReported {
				incidents = append(incidents, &ScannedIncident{
					ID:            fmt.Sprintf("restarts-%s-%s-%s", pod.Namespace, pod.Name, containerName),
					Severity:      "warning",
					Started:       pod.CreationTimestamp.Time,
					Namespace:     pod.Namespace,
					PrimaryObject: fmt.Sprintf("Pod/%s", pod.Name),
					Summary:       fmt.Sprintf("Container %s has restarted %d times", containerName, cs.RestartCount),
					Type:          "high_restarts",
					Message:       fmt.Sprintf("Container %s has restarted %d times", containerName, cs.RestartCount),
					Count:         int(cs.RestartCount),
				})
			}
		}
	}

	// Check regular containers
	for _, cs := range pod.Status.ContainerStatuses {
		checkContainer(cs, cs.Name)
	}

	// Check init containers
	for _, cs := range pod.Status.InitContainerStatuses {
		checkContainer(cs, cs.Name)
	}

	return incidents
}

func scanNodesForIncidents(ctx context.Context, clientset *kubernetes.Clientset) ([]*ScannedIncident, error) {
	var incidents []*ScannedIncident

	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{Limit: 1000})
	if err != nil {
		return incidents, err
	}

	for _, node := range nodes.Items {
		// Check for node pressure conditions
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeDiskPressure || condition.Type == corev1.NodeMemoryPressure || condition.Type == corev1.NodePIDPressure {
				if condition.Status == corev1.ConditionTrue {
					severity := "warning"
					incidentType := "node_pressure"
					if condition.Type == corev1.NodeMemoryPressure || condition.Type == corev1.NodeDiskPressure {
						severity = "critical"
					}
					if condition.Type == corev1.NodeMemoryPressure {
						incidentType = "node_memory_pressure"
					} else if condition.Type == corev1.NodeDiskPressure {
						incidentType = "node_disk_pressure"
					}

					incidents = append(incidents, &ScannedIncident{
						ID:            fmt.Sprintf("node-pressure-%s-%s", node.Name, string(condition.Type)),
						Severity:      severity,
						Started:       condition.LastTransitionTime.Time,
						Namespace:     "", // Nodes are cluster-scoped
						PrimaryObject: fmt.Sprintf("Node/%s", node.Name),
						Summary:       fmt.Sprintf("Node %s: %s", node.Name, condition.Message),
						Type:          incidentType,
						Message:       condition.Message,
						Count:         1,
					})
				}
			}
		}

		// Check for NotReady nodes
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady && condition.Status != corev1.ConditionTrue {
				incidents = append(incidents, &ScannedIncident{
					ID:            fmt.Sprintf("node-notready-%s", node.Name),
					Severity:      "critical",
					Started:       condition.LastTransitionTime.Time,
					Namespace:     "",
					PrimaryObject: fmt.Sprintf("Node/%s", node.Name),
					Summary:       fmt.Sprintf("Node %s is not ready", node.Name),
					Type:          "node_not_ready",
					Message:       fmt.Sprintf("Node %s is not ready: %s", node.Name, condition.Message),
					Count:         1,
				})
				break
			}
		}
	}

	return incidents, nil
}
