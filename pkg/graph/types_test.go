// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import (
	"strings"
	"testing"
)

// ─────────────────────────────────────────────────────────────────────────────
// NodeID
// ─────────────────────────────────────────────────────────────────────────────

func TestNodeID_WithNamespace(t *testing.T) {
	got := NodeID(KindPod, "production", "api-pod-0")
	want := "Pod/production/api-pod-0"
	if got != want {
		t.Errorf("NodeID() = %q, want %q", got, want)
	}
}

func TestNodeID_ClusterScoped(t *testing.T) {
	got := NodeID(KindNode, "", "worker-1")
	want := "Node/worker-1"
	if got != want {
		t.Errorf("NodeID() = %q, want %q", got, want)
	}
}

func TestNodeID_AllKinds(t *testing.T) {
	kinds := []NodeKind{
		KindCluster, KindNamespace, KindNode, KindPod, KindContainer,
		KindDeployment, KindReplicaSet, KindStatefulSet, KindDaemonSet,
		KindJob, KindService, KindEndpoints, KindIngress,
		KindPersistentVolume, KindPVC, KindConfigMap, KindSecret,
		KindHPA, KindPDB, KindNetworkPolicy, KindServiceAccount,
	}
	for _, kind := range kinds {
		id := NodeID(kind, "ns", "name")
		if !strings.Contains(id, string(kind)) {
			t.Errorf("NodeID(%q) = %q does not contain kind", kind, id)
		}
		if !strings.HasSuffix(id, "/name") {
			t.Errorf("NodeID(%q) = %q should end with /name", kind, id)
		}
	}
}

func TestNodeID_EmptyNamespace_NoDoubleSlash(t *testing.T) {
	id := NodeID(KindNode, "", "my-node")
	if strings.Contains(id, "//") {
		t.Errorf("NodeID with empty namespace should not have double slash: %q", id)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// EdgeID
// ─────────────────────────────────────────────────────────────────────────────

func TestEdgeID_Format(t *testing.T) {
	from := NodeID(KindDeployment, "prod", "api")
	to := NodeID(KindReplicaSet, "prod", "api-rs")
	got := EdgeID(from, EdgeOwns, to)

	if !strings.Contains(got, string(EdgeOwns)) {
		t.Errorf("EdgeID() = %q does not contain edge kind", got)
	}
	if !strings.HasPrefix(got, from) {
		t.Errorf("EdgeID() = %q should start with from node", got)
	}
	if !strings.HasSuffix(got, to) {
		t.Errorf("EdgeID() = %q should end with to node", got)
	}
}

func TestEdgeID_AllKinds(t *testing.T) {
	edgeKinds := []EdgeKind{
		EdgeSchedulesOn, EdgeOwns, EdgeExposes, EdgeRoutesTo,
		EdgeClaims, EdgeMounts, EdgeMountsConfig, EdgeMountsSecret,
		EdgeScales, EdgeProtects, EdgeBoundTo, EdgeInNamespace,
		EdgeCompetesWith, EdgeDependsOn, EdgeNetworkAllows,
	}
	from := NodeID(KindPod, "default", "pod-a")
	to := NodeID(KindNode, "", "node-1")
	for _, kind := range edgeKinds {
		id := EdgeID(from, kind, to)
		if !strings.Contains(id, string(kind)) {
			t.Errorf("EdgeID(%q) = %q does not contain edge kind", kind, id)
		}
	}
}

func TestEdgeID_Unique(t *testing.T) {
	from := NodeID(KindPod, "default", "pod")
	to1 := NodeID(KindNode, "", "node-a")
	to2 := NodeID(KindNode, "", "node-b")

	id1 := EdgeID(from, EdgeSchedulesOn, to1)
	id2 := EdgeID(from, EdgeSchedulesOn, to2)

	if id1 == id2 {
		t.Error("different 'to' nodes should produce different EdgeIDs")
	}
}

func TestEdgeID_DifferentKinds(t *testing.T) {
	from := NodeID(KindService, "default", "svc")
	to := NodeID(KindPod, "default", "pod")

	id1 := EdgeID(from, EdgeExposes, to)
	id2 := EdgeID(from, EdgeOwns, to)

	if id1 == id2 {
		t.Error("different edge kinds should produce different EdgeIDs")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeStatus constants — smoke test that they are defined and non-empty
// ─────────────────────────────────────────────────────────────────────────────

func TestNodeStatusConstants(t *testing.T) {
	statuses := []NodeStatus{
		StatusHealthy, StatusDegraded, StatusFailed,
		StatusPending, StatusEvicted, StatusUnknown,
	}
	seen := map[NodeStatus]bool{}
	for _, s := range statuses {
		if s == "" {
			t.Error("NodeStatus constant is empty string")
		}
		if seen[s] {
			t.Errorf("duplicate NodeStatus value: %q", s)
		}
		seen[s] = true
	}
}
