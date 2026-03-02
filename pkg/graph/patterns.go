// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import "strings"

// FailurePattern is a pre-encoded causal pattern describing how a specific
// Kubernetes failure type propagates through the topology graph.
// The pattern library covers the most common production K8s failures (80%+ of incidents).
type FailurePattern struct {
	Name        string
	Description string
	// TriggerKind is the kind of node where the failure originates.
	TriggerKind NodeKind
	// TriggerCondition is the condition that must be true on the trigger node.
	TriggerCondition string
	// EventReasons are K8s event reasons that indicate this pattern.
	EventReasons []string
	// CascadeEdges are the edge types through which failure propagates.
	CascadeEdges []EdgeKind
	// Confidence is the base confidence score when this pattern is matched.
	Confidence float64
}

// DefaultPatterns is the built-in failure pattern library.
// These are encoded from SRE playbooks and cover the most common K8s incidents.
var DefaultPatterns = []FailurePattern{
	{
		Name:             "node_disk_pressure_eviction_cascade",
		Description:      "Node disk pressure causes pod eviction, degrading services that depend on evicted pods",
		TriggerKind:      KindNode,
		TriggerCondition: "DiskPressure",
		EventReasons:     []string{"Evicted", "FreeDiskSpaceFailed", "NodeHasDiskPressure"},
		CascadeEdges:     []EdgeKind{EdgeSchedulesOn, EdgeExposes, EdgeRoutesTo},
		Confidence:       0.92,
	},
	{
		Name:             "node_memory_pressure_oom_cascade",
		Description:      "Node memory pressure triggers OOM kills, leading to crash loops and service degradation",
		TriggerKind:      KindNode,
		TriggerCondition: "MemoryPressure",
		EventReasons:     []string{"OOMKilling", "NodeHasMemoryPressure"},
		CascadeEdges:     []EdgeKind{EdgeSchedulesOn, EdgeExposes},
		Confidence:       0.89,
	},
	{
		Name:        "oom_kill_crash_loop",
		Description: "Container OOM kills causing pod CrashLoopBackOff, reducing deployment availability",
		TriggerKind: KindContainer,
		EventReasons: []string{"OOMKilling", "BackOff", "CrashLoopBackOff"},
		CascadeEdges: []EdgeKind{EdgeOwns, EdgeExposes},
		Confidence:  0.87,
	},
	{
		Name:        "image_pull_scheduling_block",
		Description: "Image pull failures blocking pod scheduling, causing deployment unavailability",
		TriggerKind: KindPod,
		EventReasons: []string{"Failed", "BackOff", "ErrImagePull", "ImagePullBackOff"},
		CascadeEdges: []EdgeKind{EdgeOwns, EdgeExposes},
		Confidence:  0.91,
	},
	{
		Name:        "config_change_induced_crash",
		Description: "ConfigMap or Secret change inducing pod restarts or crashes after mount reload",
		TriggerKind: KindConfigMap,
		EventReasons: []string{"FailedMount", "Failed"},
		CascadeEdges: []EdgeKind{EdgeMountsConfig, EdgeMountsSecret, EdgeOwns},
		Confidence:  0.78,
	},
	{
		Name:             "node_not_ready_pod_eviction",
		Description:      "Node condition NotReady causing mass pod eviction and rescheduling storm",
		TriggerKind:      KindNode,
		TriggerCondition: "Ready",
		EventReasons:     []string{"NodeNotReady", "Evicted", "FailedScheduling"},
		CascadeEdges:     []EdgeKind{EdgeSchedulesOn, EdgeExposes, EdgeRoutesTo},
		Confidence:       0.95,
	},
	{
		Name:        "pvc_pending_pod_block",
		Description: "PVC in Pending state blocking pod scheduling, causing deployment stall",
		TriggerKind: KindPVC,
		EventReasons: []string{"FailedMount", "ProvisioningFailed", "WaitForFirstConsumer"},
		CascadeEdges: []EdgeKind{EdgeMounts, EdgeOwns},
		Confidence:  0.88,
	},
	{
		Name:        "hpa_thrashing",
		Description: "HPA oscillating replica counts due to metric instability or short cooldown",
		TriggerKind: KindHPA,
		EventReasons: []string{"SuccessfulRescale", "DesiredReplicasComputed"},
		CascadeEdges: []EdgeKind{EdgeScales, EdgeOwns},
		Confidence:  0.72,
	},
	{
		Name:        "resource_quota_exhaustion",
		Description: "Namespace resource quota exhausted, blocking pod creation and scaling",
		TriggerKind: KindNamespace,
		EventReasons: []string{"ExceededQuota", "FailedCreate"},
		CascadeEdges: []EdgeKind{EdgeInNamespace, EdgeOwns},
		Confidence:  0.85,
	},
	{
		Name:        "upstream_service_dependency_failure",
		Description: "Upstream service failure propagating to downstream consumers via DEPENDS_ON edges",
		TriggerKind: KindService,
		EventReasons: []string{"BackOff", "Unhealthy"},
		CascadeEdges: []EdgeKind{EdgeDependsOn, EdgeExposes},
		Confidence:  0.75,
	},
}

// MatchPattern checks whether the events associated with a node match a failure pattern.
// Returns the best matching pattern and its name, or nil if no match.
func MatchPattern(nodeKind NodeKind, nodeConditions map[string]bool, events []GraphEvent) *FailurePattern {
	bestMatch := (*FailurePattern)(nil)
	bestScore := 0

	for i := range DefaultPatterns {
		p := &DefaultPatterns[i]
		if p.TriggerKind != "" && p.TriggerKind != nodeKind {
			continue
		}

		// Check trigger condition
		if p.TriggerCondition != "" {
			if val, ok := nodeConditions[p.TriggerCondition]; !ok || !val {
				continue
			}
		}

		// Count matching event reasons
		matchedReasons := 0
		for _, ev := range events {
			for _, reason := range p.EventReasons {
				if strings.EqualFold(ev.Reason, reason) {
					matchedReasons++
					break
				}
			}
		}

		score := matchedReasons
		if p.TriggerCondition != "" {
			score++ // bonus for condition match
		}

		if score > bestScore {
			bestScore = score
			bestMatch = p
		}
	}

	if bestScore == 0 {
		return nil
	}
	return bestMatch
}
