// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

// Package graph provides a live, continuously-updated causal model of a
// Kubernetes system. It builds a typed topology graph from the Kubernetes
// API (using SharedInformerFactory) and runs graph-traversal-based causal
// inference to identify root causes and blast radii during incidents.
//
// This is the core differentiator of the Kubegraf platform:
//   - Signal-correlation tools (Deductive.ai, etc.) correlate data.
//   - Kubegraf models the system. Causal reasoning requires a model.
package graph

import "time"

// NodeKind is the Kubernetes resource kind for a graph node.
type NodeKind string

const (
	KindCluster            NodeKind = "Cluster"
	KindNamespace          NodeKind = "Namespace"
	KindNode               NodeKind = "Node"
	KindPod                NodeKind = "Pod"
	KindContainer          NodeKind = "Container"
	KindDeployment         NodeKind = "Deployment"
	KindReplicaSet         NodeKind = "ReplicaSet"
	KindStatefulSet        NodeKind = "StatefulSet"
	KindDaemonSet          NodeKind = "DaemonSet"
	KindJob                NodeKind = "Job"
	KindService            NodeKind = "Service"
	KindEndpoints          NodeKind = "Endpoints"
	KindIngress            NodeKind = "Ingress"
	KindPersistentVolume   NodeKind = "PersistentVolume"
	KindPVC                NodeKind = "PersistentVolumeClaim"
	KindConfigMap          NodeKind = "ConfigMap"
	KindSecret             NodeKind = "Secret"
	KindHPA                NodeKind = "HorizontalPodAutoscaler"
	KindPDB                NodeKind = "PodDisruptionBudget"
	KindNetworkPolicy      NodeKind = "NetworkPolicy"
	KindServiceAccount     NodeKind = "ServiceAccount"
)

// EdgeKind is the relationship type between two graph nodes.
type EdgeKind string

const (
	// SCHEDULES_ON: Pod → Node (which machine the pod runs on)
	EdgeSchedulesOn EdgeKind = "SCHEDULES_ON"
	// OWNS: Deployment → ReplicaSet, ReplicaSet → Pod, Job → Pod
	EdgeOwns EdgeKind = "OWNS"
	// EXPOSES: Service → Pod (via label selector match)
	EdgeExposes EdgeKind = "EXPOSES"
	// ROUTES_TO: Ingress → Service
	EdgeRoutesTo EdgeKind = "ROUTES_TO"
	// CLAIMS: PVC → PV
	EdgeClaims EdgeKind = "CLAIMS"
	// MOUNTS: Pod → PVC
	EdgeMounts EdgeKind = "MOUNTS"
	// MOUNTS_CONFIG: Pod → ConfigMap
	EdgeMountsConfig EdgeKind = "MOUNTS_CONFIG"
	// MOUNTS_SECRET: Pod → Secret
	EdgeMountsSecret EdgeKind = "MOUNTS_SECRET"
	// SCALES: HPA → Deployment/StatefulSet
	EdgeScales EdgeKind = "SCALES"
	// PROTECTS: PDB → set of pods (via selector)
	EdgeProtects EdgeKind = "PROTECTS"
	// BOUND_TO: ServiceAccount → Pod
	EdgeBoundTo EdgeKind = "BOUND_TO"
	// IN_NAMESPACE: namespaced resource → Namespace
	EdgeInNamespace EdgeKind = "IN_NAMESPACE"
	// COMPETES_WITH: Pod ↔ Pod on same node (shared resource contention)
	EdgeCompetesWith EdgeKind = "COMPETES_WITH"
	// DEPENDS_ON: inferred service-to-service dependency (env var DNS refs)
	EdgeDependsOn EdgeKind = "DEPENDS_ON"
	// NETWORK_ALLOWS: NetworkPolicy → Pod (egress/ingress permission)
	EdgeNetworkAllows EdgeKind = "NETWORK_ALLOWS"
)

// NodeStatus is the health status of a graph node.
type NodeStatus string

const (
	StatusHealthy  NodeStatus = "Healthy"
	StatusDegraded NodeStatus = "Degraded"
	StatusFailed   NodeStatus = "Failed"
	StatusPending  NodeStatus = "Pending"
	StatusEvicted  NodeStatus = "Evicted"
	StatusUnknown  NodeStatus = "Unknown"
)

// GraphNode is a single resource in the Kubegraf topology graph.
type GraphNode struct {
	// ID is the unique identifier: "Kind/namespace/name" or "Kind/name" for cluster-scoped.
	ID        string            `json:"id"`
	Kind      NodeKind          `json:"kind"`
	Name      string            `json:"name"`
	Namespace string            `json:"namespace,omitempty"`
	Labels    map[string]string `json:"labels,omitempty"`
	Status    NodeStatus        `json:"status"`
	// Phase is the lifecycle phase (for Pods: Running/Pending/Failed/Succeeded)
	Phase string `json:"phase,omitempty"`
	// Conditions holds named condition states (e.g., Ready=true, DiskPressure=false)
	Conditions map[string]bool `json:"conditions,omitempty"`
	// Metadata holds kind-specific data (restart count, replicas, resource requests, etc.)
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt  time.Time              `json:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at"`
	// ResourceVersion is the K8s resourceVersion used to detect changes
	ResourceVersion string `json:"-"`
}

// NodeID constructs the canonical graph node ID.
func NodeID(kind NodeKind, namespace, name string) string {
	if namespace == "" {
		return string(kind) + "/" + name
	}
	return string(kind) + "/" + namespace + "/" + name
}

// GraphEdge is a directed relationship between two graph nodes.
type GraphEdge struct {
	// ID is "From:EdgeKind:To"
	ID       string            `json:"id"`
	From     string            `json:"from"` // source NodeID
	To       string            `json:"to"`   // target NodeID
	Kind     EdgeKind          `json:"kind"`
	Weight   float64           `json:"weight,omitempty"` // 1.0 = strong, 0.5 = inferred
	Metadata map[string]string `json:"metadata,omitempty"`
}

// EdgeID constructs the canonical edge ID.
func EdgeID(from string, kind EdgeKind, to string) string {
	return from + ":" + string(kind) + ":" + to
}

// GraphEvent captures a Kubernetes event correlated to a graph node.
type GraphEvent struct {
	NodeID    string    `json:"node_id"`
	Reason    string    `json:"reason"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
	Count     int32     `json:"count"`
	EventType string    `json:"event_type"` // "Warning" or "Normal"
}

// CausalStep is one hop in a causal chain path (root → affected node).
type CausalStep struct {
	Node          *GraphNode  `json:"node"`
	Edge          *GraphEdge  `json:"edge,omitempty"`
	EventEvidence []string    `json:"event_evidence,omitempty"`
	Timestamp     time.Time   `json:"timestamp"`
}

// CausalChain is the result of causal inference for an incident.
// It contains the root cause, the path to the affected node, blast radius,
// and supporting evidence — all derived from graph traversal (deterministic).
type CausalChain struct {
	// RootCause is the graph node most likely responsible for the incident.
	RootCause *GraphNode `json:"root_cause"`
	// AffectedNode is the node where the incident was first observed.
	AffectedNode *GraphNode `json:"affected_node"`
	// Path is the ordered sequence of nodes/edges from root cause to affected node.
	Path []CausalStep `json:"path"`
	// BlastRadius is all nodes reachable downstream from the root cause via failure edges.
	BlastRadius []*GraphNode `json:"blast_radius"`
	// Evidence is the set of K8s events supporting the causal chain.
	Evidence []GraphEvent `json:"evidence"`
	// AlternativeCauses are other plausible root candidates (lower confidence).
	AlternativeCauses []CausalCandidate `json:"alternative_causes,omitempty"`
	// Confidence is 0.0–1.0. < 0.5 means inconclusive.
	Confidence float64 `json:"confidence"`
	// PatternMatched is the name of the failure pattern that matched (if any).
	PatternMatched string `json:"pattern_matched,omitempty"`
	// AnalyzedAt is when this chain was computed.
	AnalyzedAt time.Time `json:"analyzed_at"`
}

// CausalCandidate is a root cause hypothesis with a confidence score.
type CausalCandidate struct {
	Node       *GraphNode `json:"node"`
	Confidence float64    `json:"confidence"`
	Reason     string     `json:"reason"`
}

// GraphSnapshot is a point-in-time serializable snapshot of the topology graph.
type GraphSnapshot struct {
	Nodes      []*GraphNode `json:"nodes"`
	Edges      []*GraphEdge `json:"edges"`
	SnapshotAt time.Time    `json:"snapshot_at"`
	NodeCount  int          `json:"node_count"`
	EdgeCount  int          `json:"edge_count"`
}

// SubgraphQuery is a request to filter the topology graph.
type SubgraphQuery struct {
	// NodeKinds filters to only these kinds (empty = all)
	NodeKinds []NodeKind `json:"node_kinds,omitempty"`
	// Namespace filters to a single namespace (empty = all)
	Namespace string `json:"namespace,omitempty"`
	// FocusNodeID returns the subgraph centered on this node (depth hops out)
	FocusNodeID string `json:"focus_node_id,omitempty"`
	// Depth is the number of hops from FocusNodeID (default 2)
	Depth int `json:"depth,omitempty"`
}

// AnalyzeRequest is the request payload for causal analysis.
type AnalyzeRequest struct {
	// NodeID of the affected/observed-faulty node
	NodeID string `json:"node_id,omitempty"`
	// Kind + Namespace + Name as alternative to NodeID
	Kind      NodeKind `json:"kind,omitempty"`
	Namespace string   `json:"namespace,omitempty"`
	Name      string   `json:"name,omitempty"`
	// WindowMinutes is how far back to look for events (default 30)
	WindowMinutes int `json:"window_minutes,omitempty"`
}

// RemediationPlan is a set of validated remediation steps for a causal chain.
type RemediationPlan struct {
	CausalChain  *CausalChain      `json:"causal_chain"`
	Steps        []RemediationStep `json:"steps"`
	EstimatedRisk string           `json:"estimated_risk"` // "low" | "medium" | "high"
	PDBChecked   bool              `json:"pdb_checked"`
	CapacityChecked bool           `json:"capacity_checked"`
	GeneratedAt  time.Time         `json:"generated_at"`
}

// RemediationStep is a single validated action in a remediation plan.
type RemediationStep struct {
	Order          int      `json:"order"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	KubectlCommand string   `json:"kubectl_command,omitempty"`
	Risk           string   `json:"risk"` // "low" | "medium" | "high"
	Reversible     bool     `json:"reversible"`
	Constraints    []string `json:"constraints,omitempty"` // why certain actions were ruled out
}
