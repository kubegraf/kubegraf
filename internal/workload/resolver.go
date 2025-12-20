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

package workload

import (
	"context"
	"fmt"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// WorkloadRef represents a reference to a top-level workload
type WorkloadRef struct {
	Kind      string   `json:"kind"`      // deployment, statefulset, daemonset, job, cronjob, replicaset
	Name      string   `json:"name"`
	Namespace string   `json:"namespace"`
	Via       []ViaRef `json:"via"` // Chain of ownership (e.g., Pod -> ReplicaSet -> Deployment)
}

// ViaRef represents an intermediate owner in the ownership chain
type ViaRef struct {
	Kind string `json:"kind"` // replicaset, job
	Name string `json:"name"`
}

// ResolveWorkloadOwner resolves the top-level workload owner for a pod
// It follows ownerReferences to find the ultimate owner (Deployment, StatefulSet, DaemonSet, Job, CronJob)
// Returns nil if no workload owner is found
func ResolveWorkloadOwner(ctx context.Context, clientset kubernetes.Interface, pod *corev1.Pod) (*WorkloadRef, error) {
	if pod == nil {
		return nil, nil
	}

	// Track the ownership chain
	var via []ViaRef
	current := pod
	visited := make(map[string]bool) // Prevent infinite loops

	for depth := 0; depth < 10; depth++ { // Max depth to prevent infinite loops
		if current == nil || len(current.OwnerReferences) == 0 {
			break
		}

		// Find the first controller owner
		var ownerRef *metav1.OwnerReference
		for i := range current.OwnerReferences {
			ref := &current.OwnerReferences[i]
			if ref.Controller != nil && *ref.Controller {
				ownerRef = ref
				break
			}
		}

		if ownerRef == nil {
			break
		}

		// Check for cycles
		key := fmt.Sprintf("%s/%s/%s", ownerRef.Kind, current.Namespace, ownerRef.Name)
		if visited[key] {
			break
		}
		visited[key] = true

		// Check if this is a top-level workload
		switch ownerRef.Kind {
		case "Deployment":
			return &WorkloadRef{
				Kind:      "deployment",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "StatefulSet":
			return &WorkloadRef{
				Kind:      "statefulset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "DaemonSet":
			return &WorkloadRef{
				Kind:      "daemonset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "Job":
			// Check if Job is owned by CronJob
			job, err := clientset.BatchV1().Jobs(current.Namespace).Get(ctx, ownerRef.Name, metav1.GetOptions{})
			if err == nil && job != nil {
				// Check Job's ownerReferences for CronJob
				for _, jobOwnerRef := range job.OwnerReferences {
					if jobOwnerRef.Controller != nil && *jobOwnerRef.Controller && jobOwnerRef.Kind == "CronJob" {
						return &WorkloadRef{
							Kind:      "cronjob",
							Name:      jobOwnerRef.Name,
							Namespace: current.Namespace,
							Via: append(via, ViaRef{
								Kind: "job",
								Name: ownerRef.Name,
							}),
						}, nil
					}
				}
			}
			// Job is not owned by CronJob, so Job is the top-level workload
			return &WorkloadRef{
				Kind:      "job",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "ReplicaSet":
			// ReplicaSet might be owned by Deployment
			rs, err := clientset.AppsV1().ReplicaSets(current.Namespace).Get(ctx, ownerRef.Name, metav1.GetOptions{})
			if err == nil && rs != nil {
				// Track ReplicaSet in the chain
				via = append(via, ViaRef{
					Kind: "replicaset",
					Name: ownerRef.Name,
				})

				// Check ReplicaSet's ownerReferences for Deployment
				for _, rsOwnerRef := range rs.OwnerReferences {
					if rsOwnerRef.Controller != nil && *rsOwnerRef.Controller && rsOwnerRef.Kind == "Deployment" {
						return &WorkloadRef{
							Kind:      "deployment",
							Name:      rsOwnerRef.Name,
							Namespace: current.Namespace,
							Via:       via,
						}, nil
					}
				}
			}
			// ReplicaSet is not owned by Deployment, return ReplicaSet as workload
			return &WorkloadRef{
				Kind:      "replicaset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		}

		// If not a top-level workload, continue following the chain
		// For now, we only support the above types, so break
		break
	}

	// No workload owner found
	return nil, nil
}

// FormatWorkloadChain formats the ownership chain for display in tooltips
func FormatWorkloadChain(ref *WorkloadRef) string {
	if ref == nil {
		return "Unowned"
	}

	chain := "Pod"
	for _, via := range ref.Via {
		chain += fmt.Sprintf(" -> %s %s", via.Kind, via.Name)
	}
	chain += fmt.Sprintf(" -> %s %s", ref.Kind, ref.Name)
	return chain
}

// GetWorkloadAbbreviation returns the abbreviation for a workload kind
func GetWorkloadAbbreviation(kind string) string {
	switch kind {
	case "deployment":
		return "DEP"
	case "statefulset":
		return "STS"
	case "daemonset":
		return "DS"
	case "job":
		return "JOB"
	case "cronjob":
		return "CJ"
	case "replicaset":
		return "RS"
	default:
		return strings.ToUpper(kind[:3])
	}
}

// ResolveWorkloadOwnerWithCache resolves the top-level workload owner using cached resources
// This avoids N+1 queries by using pre-fetched ReplicaSets and Jobs
func ResolveWorkloadOwnerWithCache(ctx context.Context, clientset kubernetes.Interface, pod *corev1.Pod, replicaSetMap map[string]*appsv1.ReplicaSet, jobMap map[string]*batchv1.Job) (*WorkloadRef, error) {
	if pod == nil {
		return nil, nil
	}

	// Track the ownership chain
	var via []ViaRef
	current := pod
	visited := make(map[string]bool) // Prevent infinite loops

	for depth := 0; depth < 10; depth++ { // Max depth to prevent infinite loops
		if current == nil || len(current.OwnerReferences) == 0 {
			break
		}

		// Find the first controller owner
		var ownerRef *metav1.OwnerReference
		for i := range current.OwnerReferences {
			ref := &current.OwnerReferences[i]
			if ref.Controller != nil && *ref.Controller {
				ownerRef = ref
				break
			}
		}

		if ownerRef == nil {
			break
		}

		// Check for cycles
		key := fmt.Sprintf("%s/%s/%s", ownerRef.Kind, current.Namespace, ownerRef.Name)
		if visited[key] {
			break
		}
		visited[key] = true

		// Check if this is a top-level workload
		switch ownerRef.Kind {
		case "Deployment":
			return &WorkloadRef{
				Kind:      "deployment",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "StatefulSet":
			return &WorkloadRef{
				Kind:      "statefulset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "DaemonSet":
			return &WorkloadRef{
				Kind:      "daemonset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "Job":
			// Check if Job is owned by CronJob using cache
			jobKey := current.Namespace + "/" + ownerRef.Name
			if job, ok := jobMap[jobKey]; ok && job != nil {
				// Check Job's ownerReferences for CronJob
				for _, jobOwnerRef := range job.OwnerReferences {
					if jobOwnerRef.Controller != nil && *jobOwnerRef.Controller && jobOwnerRef.Kind == "CronJob" {
						return &WorkloadRef{
							Kind:      "cronjob",
							Name:      jobOwnerRef.Name,
							Namespace: current.Namespace,
							Via: append(via, ViaRef{
								Kind: "job",
								Name: ownerRef.Name,
							}),
						}, nil
					}
				}
			}
			// Job is not owned by CronJob, so Job is the top-level workload
			return &WorkloadRef{
				Kind:      "job",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		case "ReplicaSet":
			// ReplicaSet might be owned by Deployment - use cache
			rsKey := current.Namespace + "/" + ownerRef.Name
			if rs, ok := replicaSetMap[rsKey]; ok && rs != nil {
				// Track ReplicaSet in the chain
				via = append(via, ViaRef{
					Kind: "replicaset",
					Name: ownerRef.Name,
				})

				// Check ReplicaSet's ownerReferences for Deployment
				for _, rsOwnerRef := range rs.OwnerReferences {
					if rsOwnerRef.Controller != nil && *rsOwnerRef.Controller && rsOwnerRef.Kind == "Deployment" {
						return &WorkloadRef{
							Kind:      "deployment",
							Name:      rsOwnerRef.Name,
							Namespace: current.Namespace,
							Via:       via,
						}, nil
					}
				}
			}
			// ReplicaSet is not owned by Deployment, return ReplicaSet as workload
			return &WorkloadRef{
				Kind:      "replicaset",
				Name:      ownerRef.Name,
				Namespace: current.Namespace,
				Via:       via,
			}, nil
		}

		// If not a top-level workload, continue following the chain
		// For now, we only support the above types, so break
		break
	}

	// No workload owner found
	return nil, nil
}

