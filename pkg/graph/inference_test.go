// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers — build a pre-populated Engine without starting informers.
// All helpers operate on exported public API (NodeID, EdgeID, GraphNode, etc.)
// since tests are in the same package and can touch internal state directly.
// ─────────────────────────────────────────────────────────────────────────────

// newTestEngine returns an Engine with empty maps and no K8s client.
// Safe to call in unit tests — does not start any goroutines.
func newTestEngine() *Engine {
	return NewEngine(nil)
}

func addNode(e *Engine, n *GraphNode) {
	e.mu.Lock()
	e.nodes[n.ID] = n
	e.mu.Unlock()
}

func addEdgeT(e *Engine, edge *GraphEdge) {
	e.mu.Lock()
	e.addEdge(edge)
	e.mu.Unlock()
}

func addEvent(e *Engine, ev GraphEvent) {
	e.evMu.Lock()
	if len(e.events) >= maxEvents {
		e.events = e.events[1:]
	}
	e.events = append(e.events, ev)
	e.evMu.Unlock()
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Unknown node returns zero-confidence chain, never panics.
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_UnknownNode(t *testing.T) {
	e := newTestEngine()
	chain := e.Analyze(AnalyzeRequest{Kind: KindPod, Namespace: "default", Name: "ghost-pod"})
	if chain == nil {
		t.Fatal("Analyze must never return nil")
	}
	if chain.Confidence != 0.0 {
		t.Errorf("expected confidence 0.0 for unknown node, got %.2f", chain.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Isolated failed pod with no upstream edges is its own root cause.
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_IsolatedFailedPod(t *testing.T) {
	e := newTestEngine()
	podID := NodeID(KindPod, "default", "orphan-pod")
	addNode(e, &GraphNode{
		ID:        podID,
		Kind:      KindPod,
		Name:      "orphan-pod",
		Namespace: "default",
		Status:    StatusFailed,
		UpdatedAt: time.Now(),
	})

	chain := e.Analyze(AnalyzeRequest{Kind: KindPod, Namespace: "default", Name: "orphan-pod"})
	if chain == nil {
		t.Fatal("expected non-nil chain")
	}
	if chain.RootCause == nil {
		t.Fatal("expected RootCause to be set")
	}
	// No upstream candidates — the pod itself is returned as root.
	if chain.RootCause.ID != podID {
		t.Errorf("expected self-cause %s, got %s", podID, chain.RootCause.ID)
	}
	// Confidence is low (0.35) because we have no corroborating evidence.
	if chain.Confidence > 0.5 {
		t.Errorf("expected low confidence for isolated pod (<=0.5), got %.2f", chain.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — BFS upstream via OWNS edges.
//
// Topology: ReplicaSet (Failed) --OWNS--> Pod (Failed)
// inEdges[Pod] = {RS → Pod}  →  RS is the upstream candidate.
// RS has more events and precedes pod events temporally.
// ─────────────────────────────────────────────────────────────────────────────

func TestBFSUpstream_OWNSChain(t *testing.T) {
	e := newTestEngine()
	now := time.Now()

	rsID := NodeID(KindReplicaSet, "production", "api-rs")
	podID := NodeID(KindPod, "production", "api-pod-0")

	addNode(e, &GraphNode{
		ID:        rsID,
		Kind:      KindReplicaSet,
		Name:      "api-rs",
		Namespace: "production",
		Status:    StatusFailed,
		UpdatedAt: now.Add(-6 * time.Minute),
	})
	addNode(e, &GraphNode{
		ID:        podID,
		Kind:      KindPod,
		Name:      "api-pod-0",
		Namespace: "production",
		Status:    StatusFailed,
		UpdatedAt: now,
	})

	// RS → Pod OWNS edge: RS is From (owner), Pod is To (owned)
	// This puts the edge in inEdges[pod] — BFS upstream from pod will find RS.
	addEdgeT(e, &GraphEdge{
		ID:     EdgeID(rsID, EdgeOwns, podID),
		From:   rsID,
		To:     podID,
		Kind:   EdgeOwns,
		Weight: 1.0,
	})

	// RS events precede pod events — temporal ordering boosts RS as root cause.
	addEvent(e, GraphEvent{
		NodeID:    rsID,
		Reason:    "FailedCreate",
		Message:   "pods could not be created",
		Timestamp: now.Add(-6 * time.Minute),
		EventType: "Warning",
	})
	addEvent(e, GraphEvent{
		NodeID:    rsID,
		Reason:    "BackOff",
		Message:   "back-off restarting",
		Timestamp: now.Add(-5 * time.Minute),
		EventType: "Warning",
	})
	addEvent(e, GraphEvent{
		NodeID:    podID,
		Reason:    "BackOff",
		Message:   "CrashLoopBackOff",
		Timestamp: now.Add(-2 * time.Minute),
		EventType: "Warning",
	})

	chain := e.Analyze(AnalyzeRequest{Kind: KindPod, Namespace: "production", Name: "api-pod-0"})
	if chain == nil || chain.RootCause == nil {
		t.Fatal("expected non-nil chain and root cause")
	}
	if chain.RootCause.ID != rsID {
		t.Errorf("expected root cause %s (RS), got %s", rsID, chain.RootCause.ID)
	}
	if chain.Confidence < 0.5 {
		t.Errorf("expected confidence >= 0.5, got %.2f", chain.Confidence)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — Pattern matching: DiskPressure node + Evicted event → pattern match.
// ─────────────────────────────────────────────────────────────────────────────

func TestPatternMatching_DiskPressure(t *testing.T) {
	conditions := map[string]bool{
		"DiskPressure": true,
		"Ready":        true,
	}
	events := []GraphEvent{
		{
			NodeID:    "Node//worker-1",
			Reason:    "Evicted",
			Message:   "pod evicted due to disk pressure",
			EventType: "Warning",
			Timestamp: time.Now().Add(-3 * time.Minute),
		},
	}

	pattern := MatchPattern(KindNode, conditions, events)
	if pattern == nil {
		t.Fatal("expected pattern to match for DiskPressure + Evicted event")
	}
	if pattern.Name != "node_disk_pressure_eviction_cascade" {
		t.Errorf("expected node_disk_pressure_eviction_cascade, got %s", pattern.Name)
	}
	if pattern.Confidence < 0.9 {
		t.Errorf("expected confidence >= 0.9, got %.2f", pattern.Confidence)
	}
}

func TestPatternMatching_OOMKill(t *testing.T) {
	events := []GraphEvent{
		{Reason: "OOMKilling", EventType: "Warning", Timestamp: time.Now().Add(-1 * time.Minute)},
	}
	pattern := MatchPattern(KindNode, map[string]bool{"MemoryPressure": true}, events)
	if pattern == nil {
		t.Fatal("expected pattern match for MemoryPressure + OOMKilling")
	}
	if pattern.Name != "node_memory_pressure_oom_cascade" {
		t.Errorf("unexpected pattern: %s", pattern.Name)
	}
}

func TestPatternMatching_NoMatch(t *testing.T) {
	// Healthy node with no relevant events should not match any pattern.
	pattern := MatchPattern(KindPod, nil, nil)
	if pattern != nil {
		t.Errorf("expected no pattern match for healthy pod with no events, got %s", pattern.Name)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — Blast radius: BFS downstream via OWNS chain.
//
// Topology:  Deployment --OWNS--> RS --OWNS--> Pod
//             (From)         (From)         (leaf)
//
// outEdges[Deployment] = {OWNS → RS}
// outEdges[RS]         = {OWNS → Pod}
// bfsCollect from Deployment should yield {RS, Pod}.
// ─────────────────────────────────────────────────────────────────────────────

func TestBlastRadius_OWNSChain(t *testing.T) {
	e := newTestEngine()

	deployID := NodeID(KindDeployment, "prod", "api")
	rsID := NodeID(KindReplicaSet, "prod", "api-rs-abc")
	podID := NodeID(KindPod, "prod", "api-pod-0")

	addNode(e, &GraphNode{ID: deployID, Kind: KindDeployment, Name: "api", Namespace: "prod", Status: StatusFailed})
	addNode(e, &GraphNode{ID: rsID, Kind: KindReplicaSet, Name: "api-rs-abc", Namespace: "prod", Status: StatusFailed})
	addNode(e, &GraphNode{ID: podID, Kind: KindPod, Name: "api-pod-0", Namespace: "prod", Status: StatusFailed})

	// OWNS edges go Deployment → RS → Pod (parent is From, child is To).
	addEdgeT(e, &GraphEdge{ID: EdgeID(deployID, EdgeOwns, rsID), From: deployID, To: rsID, Kind: EdgeOwns, Weight: 1.0})
	addEdgeT(e, &GraphEdge{ID: EdgeID(rsID, EdgeOwns, podID), From: rsID, To: podID, Kind: EdgeOwns, Weight: 1.0})

	blast := e.computeBlastRadius(deployID)

	blastIDs := make(map[string]bool)
	for _, n := range blast {
		blastIDs[n.ID] = true
	}

	if !blastIDs[rsID] {
		t.Errorf("expected RS %s in blast radius", rsID)
	}
	if !blastIDs[podID] {
		t.Errorf("expected Pod %s in blast radius", podID)
	}
	// Root itself must be excluded.
	if blastIDs[deployID] {
		t.Errorf("root Deployment should be excluded from its own blast radius")
	}
	if len(blast) != 2 {
		t.Errorf("expected blast radius of 2, got %d", len(blast))
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — Scoring: StatusFailed candidate scores higher than StatusDegraded.
// ─────────────────────────────────────────────────────────────────────────────

func TestScoring_StatusSeverityRanking(t *testing.T) {
	e := newTestEngine()
	now := time.Now()

	failedID := NodeID(KindNode, "", "node-failed")
	degradedID := NodeID(KindNode, "", "node-degraded")

	addNode(e, &GraphNode{ID: failedID, Kind: KindNode, Name: "node-failed", Status: StatusFailed})
	addNode(e, &GraphNode{ID: degradedID, Kind: KindNode, Name: "node-degraded", Status: StatusDegraded})

	// Same event count for both — score difference comes only from status.
	candidates := []candidate{
		{nodeID: failedID, eventCount: 1},
		{nodeID: degradedID, eventCount: 1},
	}
	events := []GraphEvent{
		{NodeID: failedID, Reason: "BackOff", EventType: "Warning", Timestamp: now.Add(-5 * time.Minute)},
		{NodeID: degradedID, Reason: "BackOff", EventType: "Warning", Timestamp: now.Add(-3 * time.Minute)},
	}

	ranked := e.scoreCandidates(candidates, events, now.Add(-30*time.Minute))
	if len(ranked) < 2 {
		t.Fatalf("expected 2 ranked candidates, got %d", len(ranked))
	}
	if ranked[0].nodeID != failedID {
		t.Errorf("expected Failed node to rank first, got %s", ranked[0].nodeID)
	}
	if ranked[0].score <= ranked[1].score {
		t.Errorf("Failed (%.3f) should score higher than Degraded (%.3f)", ranked[0].score, ranked[1].score)
	}
}

func TestScoring_PressureConditionBonus(t *testing.T) {
	e := newTestEngine()
	now := time.Now()

	pressureID := NodeID(KindNode, "", "node-pressure")
	normalID := NodeID(KindNode, "", "node-normal")

	addNode(e, &GraphNode{
		ID:     pressureID,
		Kind:   KindNode,
		Name:   "node-pressure",
		Status: StatusDegraded,
		Conditions: map[string]bool{
			"DiskPressure": true,
		},
	})
	addNode(e, &GraphNode{
		ID:     normalID,
		Kind:   KindNode,
		Name:   "node-normal",
		Status: StatusDegraded,
	})

	candidates := []candidate{
		{nodeID: pressureID, eventCount: 0},
		{nodeID: normalID, eventCount: 0},
	}
	ranked := e.scoreCandidates(candidates, nil, now.Add(-30*time.Minute))
	if ranked[0].nodeID != pressureID {
		t.Errorf("node with DiskPressure should rank first, got %s", ranked[0].nodeID)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — Analysis cache: second call within TTL returns the same pointer.
// ─────────────────────────────────────────────────────────────────────────────

func TestAnalyze_CacheHitWithinTTL(t *testing.T) {
	e := newTestEngine()
	podID := NodeID(KindPod, "default", "cached-pod")
	addNode(e, &GraphNode{
		ID:        podID,
		Kind:      KindPod,
		Name:      "cached-pod",
		Namespace: "default",
		Status:    StatusFailed,
	})

	req := AnalyzeRequest{Kind: KindPod, Namespace: "default", Name: "cached-pod"}
	chain1 := e.Analyze(req)
	chain2 := e.Analyze(req)

	if chain1 == nil || chain2 == nil {
		t.Fatal("expected non-nil chains")
	}
	// Both calls within the 30s TTL must return the same cached pointer.
	if chain1 != chain2 {
		t.Error("expected cache hit on second call within TTL (same pointer)")
	}
}

func TestAnalyze_CacheInvalidatedOnStatusChange(t *testing.T) {
	e := newTestEngine()
	podID := NodeID(KindPod, "default", "mutating-pod")
	addNode(e, &GraphNode{
		ID:        podID,
		Kind:      KindPod,
		Name:      "mutating-pod",
		Namespace: "default",
		Status:    StatusFailed,
	})

	req := AnalyzeRequest{Kind: KindPod, Namespace: "default", Name: "mutating-pod"}
	chain1 := e.Analyze(req)

	// Simulate a status change — should invalidate the cache.
	e.upsertNode(&GraphNode{
		ID:        podID,
		Kind:      KindPod,
		Name:      "mutating-pod",
		Namespace: "default",
		Status:    StatusHealthy, // status changed
		UpdatedAt: time.Now(),
	})

	chain2 := e.Analyze(req)
	if chain1 == nil || chain2 == nil {
		t.Fatal("expected non-nil chains")
	}
	// After invalidation the cache must be recomputed (different pointer).
	if chain1 == chain2 {
		t.Error("expected cache miss after status change (different pointer)")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — Confidence is capped at 0.99, never 1.0.
// ─────────────────────────────────────────────────────────────────────────────

func TestScoring_ConfidenceCap(t *testing.T) {
	e := newTestEngine()
	now := time.Now()

	nodeID := NodeID(KindNode, "", "overloaded")
	addNode(e, &GraphNode{
		ID:     nodeID,
		Kind:   KindNode,
		Name:   "overloaded",
		Status: StatusFailed,
		Conditions: map[string]bool{
			"DiskPressure":   true,
			"MemoryPressure": true,
		},
	})

	// Manufacture many events to drive the score above 1.0 before capping.
	events := make([]GraphEvent, 20)
	for i := range events {
		events[i] = GraphEvent{
			NodeID:    nodeID,
			Reason:    "Evicted",
			EventType: "Warning",
			Timestamp: now.Add(-time.Duration(i) * time.Minute),
		}
	}

	candidates := []candidate{{nodeID: nodeID, eventCount: 20}}
	ranked := e.scoreCandidates(candidates, events, now.Add(-30*time.Minute))
	if len(ranked) == 0 {
		t.Fatal("expected at least one ranked candidate")
	}
	if ranked[0].score > 0.99 {
		t.Errorf("confidence must be capped at 0.99, got %.4f", ranked[0].score)
	}
}
