package workload

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

// WorkloadRef represents a reference to a workload owner
type WorkloadRef struct {
	Kind      string   `json:"kind"`
	Name      string   `json:"name"`
	Namespace string   `json:"namespace"`
	Via       []string `json:"via"` // Ownership chain, e.g., ["ReplicaSet", "Deployment"]
}

// ResolveWorkloadOwnerWithCache resolves the top-level workload owner for a pod using cached resources
func ResolveWorkloadOwnerWithCache(
	ctx context.Context,
	clientset kubernetes.Interface,
	pod *corev1.Pod,
	replicaSetMap map[string]*appsv1.ReplicaSet,
	jobMap map[string]*batchv1.Job,
) (*WorkloadRef, error) {
	if pod == nil {
		return nil, fmt.Errorf("pod is nil")
	}

	var via []string
	currentKind := ""
	currentName := ""
	currentNamespace := pod.Namespace

	// Start with pod's owner references
	ownerRefs := pod.OwnerReferences
	if len(ownerRefs) == 0 {
		return nil, nil // No owner
	}

	// Get first owner (typically the controller)
	owner := ownerRefs[0]
	currentKind = owner.Kind
	currentName = owner.Name

	// Follow the ownership chain
	for {
		// Check if we've reached a top-level workload
		switch currentKind {
		case "Deployment", "StatefulSet", "DaemonSet":
			return &WorkloadRef{
				Kind:      currentKind,
				Name:      currentName,
				Namespace: currentNamespace,
				Via:       via,
			}, nil
		case "CronJob":
			return &WorkloadRef{
				Kind:      currentKind,
				Name:      currentName,
				Namespace: currentNamespace,
				Via:       via,
			}, nil
		case "Job":
			// Check if this Job is owned by a CronJob
			key := currentNamespace + "/" + currentName
			job, found := jobMap[key]
			if found && len(job.OwnerReferences) > 0 {
				jobOwner := job.OwnerReferences[0]
				via = append(via, currentKind)
				currentKind = jobOwner.Kind
				currentName = jobOwner.Name
				continue
			}
			// Job is top-level
			return &WorkloadRef{
				Kind:      currentKind,
				Name:      currentName,
				Namespace: currentNamespace,
				Via:       via,
			}, nil
		case "ReplicaSet":
			// Check if this ReplicaSet is owned by a Deployment
			key := currentNamespace + "/" + currentName
			rs, found := replicaSetMap[key]
			if found && len(rs.OwnerReferences) > 0 {
				rsOwner := rs.OwnerReferences[0]
				via = append(via, currentKind)
				currentKind = rsOwner.Kind
				currentName = rsOwner.Name
				continue
			}
			// ReplicaSet is top-level (uncommon but possible)
			return &WorkloadRef{
				Kind:      currentKind,
				Name:      currentName,
				Namespace: currentNamespace,
				Via:       via,
			}, nil
		default:
			// Unknown or unhandled owner type
			return &WorkloadRef{
				Kind:      currentKind,
				Name:      currentName,
				Namespace: currentNamespace,
				Via:       via,
			}, nil
		}
	}
}
