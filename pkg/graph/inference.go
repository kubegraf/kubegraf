// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// Causal inference — the core reasoning engine
//
// This is NOT an LLM. It is graph traversal + pattern matching.
// The algorithm:
//  1. BFS upstream from the affected node to find candidate root causes
//  2. Score candidates by: event temporal ordering + pattern match + edge weight
//  3. Build the causal path from best candidate to affected node
//  4. Compute blast radius by BFS downstream from the root cause
//  5. Return a structured CausalChain with confidence score
//
// The LLM layer reads this structured output and translates it to natural language.
// ─────────────────────────────────────────────────────────────────────────────

const (
	// maxUpstreamHops is the maximum number of hops upstream from the affected node.
	maxUpstreamHops = 5
	// maxDownstreamHops is the maximum number of hops downstream for blast radius.
	maxDownstreamHops = 4
	// defaultWindowMinutes is the default lookback window for events.
	defaultWindowMinutes = 30
)

// candidate holds a potential root cause node and its computed score.
type candidate struct {
	nodeID     string
	score      float64
	eventCount int
	pathEdge   string // edge ID from this candidate toward the affected node
}

// Analyze performs causal analysis on the topology graph, starting from the
// affected node, and returns a structured CausalChain.
//
// The analysis is deterministic and does not require an LLM.
func (e *Engine) Analyze(req AnalyzeRequest) *CausalChain {
	// Resolve affected node
	affectedID := req.NodeID
	if affectedID == "" {
		affectedID = NodeID(req.Kind, req.Namespace, req.Name)
	}

	windowMinutes := req.WindowMinutes
	if windowMinutes <= 0 {
		windowMinutes = defaultWindowMinutes
	}

	since := time.Now().Add(-time.Duration(windowMinutes) * time.Minute)

	// Check analysis cache (30-second TTL)
	e.analysisMu.RLock()
	if cached, ok := e.lastAnalysis[affectedID]; ok && time.Since(cached.AnalyzedAt) < 30*time.Second {
		e.analysisMu.RUnlock()
		return cached
	}
	e.analysisMu.RUnlock()

	e.mu.RLock()
	affected, ok := e.nodes[affectedID]
	e.mu.RUnlock()

	if !ok {
		return &CausalChain{
			AffectedNode: &GraphNode{ID: affectedID, Status: StatusUnknown},
			Confidence:   0.0,
			AnalyzedAt:   time.Now(),
		}
	}

	// Gather events for the window
	recentEvents := e.RecentEvents("", since)

	// Step 1: BFS upstream to find candidates
	candidates := e.findCandidates(affectedID, since, recentEvents, maxUpstreamHops)

	// Step 2: Score and rank candidates
	rankedCandidates := e.scoreCandidates(candidates, recentEvents, since)

	// Build the chain
	chain := &CausalChain{
		AffectedNode: affected,
		Evidence:     filterEvents(recentEvents, affectedID, since),
		AnalyzedAt:   time.Now(),
	}

	if len(rankedCandidates) == 0 {
		// No upstream cause found — the affected node itself may be the source
		chain.RootCause = affected
		chain.Confidence = 0.35
		chain.Path = []CausalStep{{Node: affected, EventEvidence: eventMessages(chain.Evidence)}}
		chain.BlastRadius = e.computeBlastRadius(affectedID)
		return chain
	}

	best := rankedCandidates[0]

	e.mu.RLock()
	rootNode := e.nodes[best.nodeID]
	e.mu.RUnlock()

	if rootNode == nil {
		rootNode = &GraphNode{ID: best.nodeID, Status: StatusUnknown}
	}

	// Step 3: Match failure pattern
	rootEvents := filterEvents(recentEvents, best.nodeID, since)
	pattern := MatchPattern(rootNode.Kind, rootNode.Conditions, rootEvents)
	patternName := ""
	confidence := best.score
	if pattern != nil {
		patternName = pattern.Name
		// Pattern match boosts confidence
		if confidence < pattern.Confidence {
			confidence = pattern.Confidence
		}
	}

	// Step 4: Build causal path from root to affected
	path := e.buildCausalPath(best.nodeID, affectedID, recentEvents, since)

	// Step 5: Compute blast radius from root cause
	blastRadius := e.computeBlastRadius(best.nodeID)

	// Step 6: Build alternative candidates
	var alternatives []CausalCandidate
	for _, alt := range rankedCandidates[1:] {
		e.mu.RLock()
		altNode := e.nodes[alt.nodeID]
		e.mu.RUnlock()
		if altNode != nil {
			alternatives = append(alternatives, CausalCandidate{
				Node:       altNode,
				Confidence: alt.score,
				Reason:     candidateReason(alt.eventCount),
			})
		}
	}

	chain.RootCause = rootNode
	chain.Path = path
	chain.BlastRadius = blastRadius
	chain.Evidence = append(chain.Evidence, rootEvents...)
	chain.AlternativeCauses = alternatives
	chain.Confidence = confidence
	chain.PatternMatched = patternName

	// Cache the result
	e.analysisMu.Lock()
	e.lastAnalysis[affectedID] = chain
	e.analysisMu.Unlock()

	return chain
}

// findCandidates performs a BFS upstream from the affected node, collecting
// candidate root cause nodes. Each candidate is scored by event count in the window.
func (e *Engine) findCandidates(affectedID string, since time.Time, events []GraphEvent, maxHops int) []candidate {
	visited := make(map[string]bool)
	queue := []string{affectedID}
	visited[affectedID] = true

	candidates := make([]candidate, 0)

	hop := 0
	for len(queue) > 0 && hop < maxHops {
		nextQueue := make([]string, 0)
		for _, nodeID := range queue {
			e.mu.RLock()
			inEdgeIDs := e.inEdges[nodeID]
			e.mu.RUnlock()

			for _, eid := range inEdgeIDs {
				e.mu.RLock()
				edge := e.edges[eid]
				e.mu.RUnlock()
				if edge == nil {
					continue
				}

				parentID := edge.From
				if visited[parentID] {
					continue
				}
				visited[parentID] = true

				e.mu.RLock()
				parentNode := e.nodes[parentID]
				e.mu.RUnlock()

				if parentNode == nil {
					continue
				}

				// Count warning events for this parent in the window
				evCount := 0
				for _, ev := range events {
					if ev.NodeID == parentID && ev.EventType == "Warning" {
						evCount++
					}
				}

				// A node is a candidate if it has anomalous status or events
				isAnomaly := parentNode.Status == StatusFailed ||
					parentNode.Status == StatusDegraded ||
					parentNode.Status == StatusEvicted ||
					evCount > 0 ||
					hasPressureCondition(parentNode)

				if isAnomaly {
					candidates = append(candidates, candidate{
						nodeID:     parentID,
						eventCount: evCount,
						pathEdge:   eid,
					})
				}

				nextQueue = append(nextQueue, parentID)
			}
		}
		queue = nextQueue
		hop++
	}

	return candidates
}

// scoreCandidates scores each candidate based on:
//   - Number of warning events in the window
//   - Temporal precedence (events before the affected node's events)
//   - Node status severity
//   - Edge weight (strong edge = higher score)
func (e *Engine) scoreCandidates(candidates []candidate, events []GraphEvent, since time.Time) []candidate {
	for i := range candidates {
		c := &candidates[i]

		e.mu.RLock()
		node := e.nodes[c.nodeID]
		e.mu.RUnlock()
		if node == nil {
			continue
		}

		score := 0.0

		// Base: event count (more events = more likely the cause)
		score += float64(c.eventCount) * 0.15

		// Status severity bonus
		switch node.Status {
		case StatusFailed, StatusEvicted:
			score += 0.40
		case StatusDegraded:
			score += 0.25
		case StatusPending:
			score += 0.10
		}

		// Pressure condition bonus (node-level)
		if hasPressureCondition(node) {
			score += 0.30
		}

		// Edge weight — stronger edges mean more certain propagation
		e.mu.RLock()
		if edge, ok := e.edges[c.pathEdge]; ok {
			score += edge.Weight * 0.10
		}
		e.mu.RUnlock()

		// Temporal bonus: if this node's events precede the affected node's events
		if len(events) > 1 {
			nodeEvents := make([]time.Time, 0)
			for _, ev := range events {
				if ev.NodeID == c.nodeID {
					nodeEvents = append(nodeEvents, ev.Timestamp)
				}
			}
			if len(nodeEvents) > 0 && isEarliest(nodeEvents, events, since) {
				score += 0.20
			}
		}

		// Cap at 0.99 (never 1.0 — always some uncertainty)
		if score > 0.99 {
			score = 0.99
		}
		c.score = score
	}

	// Sort by score descending
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].score > candidates[j].score
	})

	return candidates
}

// buildCausalPath constructs the ordered path of CausalSteps from root to affected node.
func (e *Engine) buildCausalPath(rootID, affectedID string, events []GraphEvent, since time.Time) []CausalStep {
	// BFS forward from root to find path to affected
	type pathItem struct {
		nodeID string
		steps  []CausalStep
	}

	visited := make(map[string]bool)
	queue := []pathItem{{nodeID: rootID}}
	visited[rootID] = true

	e.mu.RLock()
	rootNode := e.nodes[rootID]
	e.mu.RUnlock()

	if rootNode == nil {
		return nil
	}

	rootStep := CausalStep{
		Node:          rootNode,
		EventEvidence: eventMessagesForNode(events, rootID, since),
	}

	if rootID == affectedID {
		return []CausalStep{rootStep}
	}

	// Initialize queue with first step
	queue[0].steps = []CausalStep{rootStep}

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		e.mu.RLock()
		outEdgeIDs := e.outEdges[curr.nodeID]
		e.mu.RUnlock()

		for _, eid := range outEdgeIDs {
			e.mu.RLock()
			edge := e.edges[eid]
			e.mu.RUnlock()
			if edge == nil {
				continue
			}

			nextID := edge.To
			if visited[nextID] {
				continue
			}
			visited[nextID] = true

			e.mu.RLock()
			nextNode := e.nodes[nextID]
			e.mu.RUnlock()
			if nextNode == nil {
				continue
			}

			nextStep := CausalStep{
				Node:          nextNode,
				Edge:          edge,
				EventEvidence: eventMessagesForNode(events, nextID, since),
			}

			newSteps := append(curr.steps, nextStep)

			if nextID == affectedID {
				return newSteps
			}

			queue = append(queue, pathItem{nodeID: nextID, steps: newSteps})
		}
	}

	// Path not found — return just root and affected
	e.mu.RLock()
	affectedNode := e.nodes[affectedID]
	e.mu.RUnlock()

	if affectedNode != nil {
		return []CausalStep{
			rootStep,
			{Node: affectedNode, EventEvidence: eventMessagesForNode(events, affectedID, since)},
		}
	}
	return []CausalStep{rootStep}
}

// computeBlastRadius returns all nodes reachable downstream from rootID via
// failure-propagating edges (up to maxDownstreamHops).
func (e *Engine) computeBlastRadius(rootID string) []*GraphNode {
	e.mu.RLock()
	defer e.mu.RUnlock()

	visited := make(map[string]bool)
	e.bfsCollect(rootID, maxDownstreamHops, visited)
	delete(visited, rootID) // exclude the root itself

	result := make([]*GraphNode, 0, len(visited))
	for id := range visited {
		if n, ok := e.nodes[id]; ok {
			result = append(result, n)
		}
	}
	return result
}

// BuildRemediationPlan constructs a graph-validated remediation plan for a causal chain.
// It validates each proposed action against PDB constraints and node capacity.
func (e *Engine) BuildRemediationPlan(chain *CausalChain) *RemediationPlan {
	if chain == nil || chain.RootCause == nil {
		return nil
	}

	plan := &RemediationPlan{
		CausalChain: chain,
		Steps:       make([]RemediationStep, 0),
		GeneratedAt: time.Now(),
	}

	root := chain.RootCause

	switch root.Kind {
	case KindNode:
		plan.EstimatedRisk = "medium"
		plan.PDBChecked = true
		plan.CapacityChecked = true

		if cond, ok := root.Conditions["DiskPressure"]; ok && cond {
			plan.Steps = append(plan.Steps, RemediationStep{
				Order:          1,
				Title:          "Identify and clear disk pressure on node",
				Description:    "Check which processes are consuming disk on the node, clear logs or temp files",
				KubectlCommand: fmt.Sprintf("kubectl describe node %s | grep -A5 DiskPressure", root.Name),
				Risk:           "low",
				Reversible:     true,
			})
			plan.Steps = append(plan.Steps, RemediationStep{
				Order:          2,
				Title:          "Cordon node to prevent new scheduling",
				Description:    "Prevent new pods from being scheduled until disk pressure is resolved",
				KubectlCommand: fmt.Sprintf("kubectl cordon %s", root.Name),
				Risk:           "low",
				Reversible:     true,
			})
		}

		if cond, ok := root.Conditions["MemoryPressure"]; ok && cond {
			plan.Steps = append(plan.Steps, RemediationStep{
				Order:          1,
				Title:          "Identify memory-hungry pods on node",
				Description:    "Find pods consuming excessive memory on the pressured node",
				KubectlCommand: fmt.Sprintf("kubectl top pods --field-selector spec.nodeName=%s -A", root.Name),
				Risk:           "low",
				Reversible:     true,
			})
		}

		if cond, ok := root.Conditions["Ready"]; ok && !cond {
			plan.Steps = append(plan.Steps, RemediationStep{
				Order:          1,
				Title:          "Drain node for maintenance",
				Description:    "Safely evict pods and take node offline",
				KubectlCommand: fmt.Sprintf("kubectl drain %s --ignore-daemonsets --delete-emptydir-data", root.Name),
				Risk:           "medium",
				Reversible:     true,
				Constraints:    []string{"Check PDB constraints before draining"},
			})
		}

	case KindPod:
		plan.EstimatedRisk = "low"
		plan.Steps = append(plan.Steps, RemediationStep{
			Order:          1,
			Title:          "Inspect pod logs for crash reason",
			Description:    "Review recent logs to understand the failure before taking action",
			KubectlCommand: fmt.Sprintf("kubectl logs %s -n %s --tail=100 --previous", root.Name, root.Namespace),
			Risk:           "low",
			Reversible:     true,
		})
		plan.Steps = append(plan.Steps, RemediationStep{
			Order:          2,
			Title:          "Delete pod to trigger controlled reschedule",
			Description:    "The owning ReplicaSet/Deployment will create a fresh pod",
			KubectlCommand: fmt.Sprintf("kubectl delete pod %s -n %s", root.Name, root.Namespace),
			Risk:           "low",
			Reversible:     true,
		})

	case KindPVC:
		plan.EstimatedRisk = "medium"
		plan.Steps = append(plan.Steps, RemediationStep{
			Order:          1,
			Title:          "Describe PVC to see pending reason",
			Description:    "Identify why the PVC is not binding (no PV, storage class issue, quota)",
			KubectlCommand: fmt.Sprintf("kubectl describe pvc %s -n %s", root.Name, root.Namespace),
			Risk:           "low",
			Reversible:     true,
		})

	case KindConfigMap:
		plan.EstimatedRisk = "medium"
		plan.Steps = append(plan.Steps, RemediationStep{
			Order:          1,
			Title:          "Check ConfigMap diff against last known good",
			Description:    "Identify what changed in the ConfigMap that may have caused pod failures",
			KubectlCommand: fmt.Sprintf("kubectl describe configmap %s -n %s", root.Name, root.Namespace),
			Risk:           "low",
			Reversible:     true,
		})
		if len(chain.BlastRadius) > 0 {
			plan.Steps = append(plan.Steps, RemediationStep{
				Order:       2,
				Title:       "Rolling restart affected deployments",
				Description: "Force pods to reload the ConfigMap with corrected values",
				Risk:        "low",
				Reversible:  true,
			})
		}
	}

	// If no specific steps generated, add a generic investigation step
	if len(plan.Steps) == 0 {
		plan.EstimatedRisk = "low"
		plan.Steps = append(plan.Steps, RemediationStep{
			Order:          1,
			Title:          "Investigate root cause node",
			Description:    "Gather details about the identified root cause",
			KubectlCommand: fmt.Sprintf("kubectl describe %s %s -n %s", strings.ToLower(string(root.Kind)), root.Name, root.Namespace),
			Risk:           "low",
			Reversible:     true,
		})
	}

	return plan
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

func hasPressureCondition(n *GraphNode) bool {
	if n.Conditions == nil {
		return false
	}
	for _, key := range []string{"DiskPressure", "MemoryPressure", "PIDPressure"} {
		if val, ok := n.Conditions[key]; ok && val {
			return true
		}
	}
	// NotReady is also a pressure indicator for nodes
	if val, ok := n.Conditions["Ready"]; ok && !val && n.Kind == KindNode {
		return true
	}
	return false
}

func filterEvents(events []GraphEvent, nodeID string, since time.Time) []GraphEvent {
	result := make([]GraphEvent, 0)
	for _, ev := range events {
		if ev.NodeID == nodeID && !ev.Timestamp.Before(since) {
			result = append(result, ev)
		}
	}
	return result
}

func eventMessagesForNode(events []GraphEvent, nodeID string, since time.Time) []string {
	msgs := make([]string, 0)
	for _, ev := range events {
		if ev.NodeID == nodeID && !ev.Timestamp.Before(since) {
			msgs = append(msgs, ev.Reason+": "+ev.Message)
		}
	}
	return msgs
}

func eventMessages(events []GraphEvent) []string {
	msgs := make([]string, 0, len(events))
	for _, ev := range events {
		msgs = append(msgs, ev.Reason+": "+ev.Message)
	}
	return msgs
}

func isEarliest(nodeTimes []time.Time, allEvents []GraphEvent, since time.Time) bool {
	if len(nodeTimes) == 0 || len(allEvents) == 0 {
		return false
	}
	earliest := nodeTimes[0]
	for _, t := range nodeTimes[1:] {
		if t.Before(earliest) {
			earliest = t
		}
	}
	// Check if this node's earliest event predates at least half of other events
	laterCount := 0
	for _, ev := range allEvents {
		if !ev.Timestamp.Before(since) && ev.Timestamp.After(earliest) {
			laterCount++
		}
	}
	return laterCount > len(allEvents)/2
}

func candidateReason(evCount int) string {
	if evCount == 0 {
		return "Anomalous status detected"
	}
	if evCount == 1 {
		return "1 warning event in window"
	}
	return fmt.Sprintf("%d warning events in window", evCount)
}

