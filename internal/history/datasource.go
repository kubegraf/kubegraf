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

package history

import (
	"context"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ClusterDataSource defines the interface for fetching historical cluster data
type ClusterDataSource interface {
	FetchEvents(ctx context.Context, since, until time.Time) ([]K8sEvent, error)
	FetchDeployments(ctx context.Context, since, until time.Time) ([]DeploymentChange, error)
	FetchNodeStatusChanges(ctx context.Context, since, until time.Time) ([]NodeChange, error)
}

// KubernetesDataSource implements ClusterDataSource using client-go
type KubernetesDataSource struct {
	clientset kubernetes.Interface
}

// NewKubernetesDataSource creates a new Kubernetes data source
func NewKubernetesDataSource(clientset kubernetes.Interface) *KubernetesDataSource {
	return &KubernetesDataSource{
		clientset: clientset,
	}
}

// FetchEvents fetches Kubernetes events within the specified time window
func (ds *KubernetesDataSource) FetchEvents(ctx context.Context, since, until time.Time) ([]K8sEvent, error) {
	var allEvents []K8sEvent

	// List all namespaces
	namespaces, err := ds.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	// Limit namespace queries for performance
	maxNamespaces := 50
	namespaceCount := 0
	limit := int64(500) // Limit events per namespace

	for _, ns := range namespaces.Items {
		if namespaceCount >= maxNamespaces {
			break
		}
		namespaceCount++

		// Fetch events from namespace
		events, err := ds.clientset.CoreV1().Events(ns.Name).List(ctx, metav1.ListOptions{
			Limit: limit,
		})
		if err != nil {
			// Continue with other namespaces on error
			continue
		}

		// Filter events by time window
		for _, event := range events.Items {
			eventTime := event.LastTimestamp.Time
			if eventTime.IsZero() {
				eventTime = event.FirstTimestamp.Time
			}

			// Only include events within the time window
			if (eventTime.After(since) || eventTime.Equal(since)) && eventTime.Before(until) {
				// Only process Warning events for incidents
				if event.Type == corev1.EventTypeWarning {
					k8sEvent := K8sEvent{
						Namespace:      event.Namespace,
						Name:           event.Name,
						Type:           string(event.Type),
						Reason:         event.Reason,
						Message:        event.Message,
						InvolvedKind:   event.InvolvedObject.Kind,
						InvolvedName:   event.InvolvedObject.Name,
						FirstTimestamp: event.FirstTimestamp.Time,
						LastTimestamp:  event.LastTimestamp.Time,
					}
					allEvents = append(allEvents, k8sEvent)
				}
			}
		}

		// Early termination if we have enough events
		if len(allEvents) > 1000 {
			break
		}
	}

	return allEvents, nil
}

// FetchDeployments fetches deployment changes within the specified time window
func (ds *KubernetesDataSource) FetchDeployments(ctx context.Context, since, until time.Time) ([]DeploymentChange, error) {
	var changes []DeploymentChange

	// List all namespaces
	namespaces, err := ds.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %w", err)
	}

	maxNamespaces := 50
	namespaceCount := 0

	for _, ns := range namespaces.Items {
		if namespaceCount >= maxNamespaces {
			break
		}
		namespaceCount++

		// Fetch deployments
		deployments, err := ds.clientset.AppsV1().Deployments(ns.Name).List(ctx, metav1.ListOptions{})
		if err != nil {
			continue
		}

		for _, deployment := range deployments.Items {
			// Check deployment conditions for failures
			for _, condition := range deployment.Status.Conditions {
				// Check if condition changed within our time window
				conditionTime := condition.LastTransitionTime.Time
				if conditionTime.IsZero() {
					conditionTime = condition.LastUpdateTime.Time
				}

				if (conditionTime.After(since) || conditionTime.Equal(since)) && conditionTime.Before(until) {
					changeType := "info"
					if condition.Type == appsv1.DeploymentReplicaFailure && condition.Status == corev1.ConditionTrue {
						changeType = "failure"
					} else if condition.Type == appsv1.DeploymentProgressing && condition.Status == corev1.ConditionFalse {
						changeType = "rollout"
					}

					change := DeploymentChange{
						Namespace:   deployment.Namespace,
						Name:        deployment.Name,
						ChangeType:  changeType,
						OldReplicas: deployment.Status.Replicas,
						NewReplicas: deployment.Status.Replicas,
						OldReady:    deployment.Status.ReadyReplicas,
						NewReady:    deployment.Status.ReadyReplicas,
						Timestamp:   conditionTime,
						Reason:      condition.Reason,
						Message:     condition.Message,
					}

					// Detect rollouts by comparing desired vs ready replicas
					if deployment.Spec.Replicas != nil && *deployment.Spec.Replicas > deployment.Status.ReadyReplicas {
						change.ChangeType = "rollout"
					}

					changes = append(changes, change)
				}
			}
		}
	}

	return changes, nil
}

// FetchNodeStatusChanges fetches node condition changes within the specified time window
func (ds *KubernetesDataSource) FetchNodeStatusChanges(ctx context.Context, since, until time.Time) ([]NodeChange, error) {
	var changes []NodeChange

	// Fetch all nodes
	nodes, err := ds.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes: %w", err)
	}

	for _, node := range nodes.Items {
		// Check node conditions
		for _, condition := range node.Status.Conditions {
			conditionTime := condition.LastTransitionTime.Time
			if conditionTime.IsZero() {
				continue
			}

			// Only process changes within our time window
			if (conditionTime.After(since) || conditionTime.Equal(since)) && conditionTime.Before(until) {
				changeType := ""
				oldCondition := ""
				newCondition := ""

				switch condition.Type {
				case corev1.NodeReady:
					if condition.Status != corev1.ConditionTrue {
						changeType = "notready"
						newCondition = "NotReady"
					} else {
						changeType = "ready"
						newCondition = "Ready"
					}
				case corev1.NodeMemoryPressure:
					if condition.Status == corev1.ConditionTrue {
						changeType = "memory_pressure"
						newCondition = "MemoryPressure"
					}
				case corev1.NodeDiskPressure:
					if condition.Status == corev1.ConditionTrue {
						changeType = "disk_pressure"
						newCondition = "DiskPressure"
					}
				case corev1.NodePIDPressure:
					if condition.Status == corev1.ConditionTrue {
						changeType = "pid_pressure"
						newCondition = "PIDPressure"
					}
				}

				if changeType != "" {
					change := NodeChange{
						NodeName:     node.Name,
						ChangeType:   changeType,
						OldCondition: oldCondition,
						NewCondition: newCondition,
						Timestamp:    conditionTime,
						Reason:       condition.Reason,
						Message:      condition.Message,
					}
					changes = append(changes, change)
				}
			}
		}
	}

	return changes, nil
}

