// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"

	"github.com/kubegraf/kubegraf/pkg/graph"
)

// ─────────────────────────────────────────────────────────────────────────────
// Graph API HTTP Handlers
//
// These endpoints expose the live Kubegraf topology graph to Orkas AI and
// other consumers. They are the primary API surface for causal reasoning.
//
// Routes registered in RegisterGraphRoutes():
//   GET  /api/graph/status          — graph engine health + stats
//   GET  /api/graph/topology        — full or filtered topology snapshot
//   POST /api/graph/analyze         — causal chain inference from a fault node
//   GET  /api/graph/blast-radius    — downstream impact from a node
//   GET  /api/graph/node            — single node details + recent events
//   POST /api/graph/remediation     — graph-validated remediation plan
// ─────────────────────────────────────────────────────────────────────────────

// RegisterGraphRoutes registers all /api/graph/* routes.
func (ws *WebServer) RegisterGraphRoutes() {
	http.HandleFunc("/api/graph/status", ws.handleGraphStatus)
	http.HandleFunc("/api/graph/topology", ws.handleGraphTopology)
	http.HandleFunc("/api/graph/analyze", ws.handleGraphAnalyze)
	http.HandleFunc("/api/graph/blast-radius", ws.handleGraphBlastRadius)
	http.HandleFunc("/api/graph/node", ws.handleGraphNode)
	http.HandleFunc("/api/graph/remediation", ws.handleGraphRemediation)
}

// handleGraphStatus returns the graph engine health and statistics.
func (ws *WebServer) handleGraphStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]interface{}{
			"status":  "unavailable",
			"message": "graph engine not initialised",
		})
		return
	}
	graphJSON(w, http.StatusOK, map[string]interface{}{
		"status":     "running",
		"node_count": ws.graphEngine.NodeCount(),
		"edge_count": ws.graphEngine.EdgeCount(),
		"summary":    ws.graphEngine.Summary(),
	})
}

// handleGraphTopology returns a snapshot of the topology graph, optionally filtered.
//
// Query params:
//   namespace  — filter to namespace
//   kinds      — comma-separated NodeKinds (e.g. "Pod,Service")
//   focus      — NodeID to center a neighbourhood subgraph on
//   depth      — neighbourhood depth (default 2, max 5)
func (ws *WebServer) handleGraphTopology(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "graph engine not ready"})
		return
	}

	q := r.URL.Query()

	var nodeKinds []graph.NodeKind
	if kindsParam := q.Get("kinds"); kindsParam != "" {
		for _, k := range strings.Split(kindsParam, ",") {
			nodeKinds = append(nodeKinds, graph.NodeKind(strings.TrimSpace(k)))
		}
	}

	depth := 2
	if d := q.Get("depth"); d != "" {
		if v, err := strconv.Atoi(d); err == nil && v > 0 && v <= 5 {
			depth = v
		}
	}

	subq := graph.SubgraphQuery{
		NodeKinds:   nodeKinds,
		Namespace:   q.Get("namespace"),
		FocusNodeID: q.Get("focus"),
		Depth:       depth,
	}

	var snapshot *graph.GraphSnapshot
	if subq.FocusNodeID != "" || subq.Namespace != "" || len(subq.NodeKinds) > 0 {
		snapshot = ws.graphEngine.QuerySubgraph(subq)
	} else {
		snapshot = ws.graphEngine.Snapshot()
	}

	graphJSON(w, http.StatusOK, snapshot)
}

// handleGraphAnalyze performs causal chain analysis starting from the specified node.
//
// POST /api/graph/analyze
// Body: {"node_id":"Pod/default/my-pod"} OR {"kind":"Pod","namespace":"default","name":"my-pod","window_minutes":30}
func (ws *WebServer) handleGraphAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "graph engine not ready"})
		return
	}

	var req graph.AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request: " + err.Error()})
		return
	}

	if req.NodeID == "" && (req.Kind == "" || req.Name == "") {
		graphJSON(w, http.StatusBadRequest, map[string]string{
			"error": "provide node_id or (kind + name)",
		})
		return
	}

	chain := ws.graphEngine.Analyze(req)
	graphJSON(w, http.StatusOK, chain)
}

// handleGraphBlastRadius returns all nodes reachable downstream from a given node.
//
// GET /api/graph/blast-radius?node_id=Pod/default/my-pod
// OR  GET /api/graph/blast-radius?kind=Pod&namespace=default&name=my-pod
func (ws *WebServer) handleGraphBlastRadius(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "graph engine not ready"})
		return
	}

	q := r.URL.Query()
	nodeID := q.Get("node_id")
	if nodeID == "" {
		kind := graph.NodeKind(q.Get("kind"))
		ns := q.Get("namespace")
		name := q.Get("name")
		if kind == "" || name == "" {
			graphJSON(w, http.StatusBadRequest, map[string]string{"error": "provide node_id or (kind + name)"})
			return
		}
		nodeID = graph.NodeID(kind, ns, name)
	}

	node, ok := ws.graphEngine.GetNode(nodeID)
	if !ok {
		graphJSON(w, http.StatusNotFound, map[string]string{"error": "node not found: " + nodeID})
		return
	}

	chain := ws.graphEngine.Analyze(graph.AnalyzeRequest{NodeID: nodeID, WindowMinutes: 30})
	graphJSON(w, http.StatusOK, map[string]interface{}{
		"node":         node,
		"blast_radius": chain.BlastRadius,
		"count":        len(chain.BlastRadius),
	})
}

// handleGraphNode returns a single graph node by ID with its recent events.
//
// GET /api/graph/node?node_id=Pod/default/my-pod
// OR  GET /api/graph/node?kind=Pod&namespace=default&name=my-pod&window_minutes=30
func (ws *WebServer) handleGraphNode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "graph engine not ready"})
		return
	}

	q := r.URL.Query()
	nodeID := q.Get("node_id")
	if nodeID == "" {
		kind := graph.NodeKind(q.Get("kind"))
		ns := q.Get("namespace")
		name := q.Get("name")
		if kind == "" || name == "" {
			graphJSON(w, http.StatusBadRequest, map[string]string{"error": "provide node_id or (kind + name)"})
			return
		}
		nodeID = graph.NodeID(kind, ns, name)
	}

	node, ok := ws.graphEngine.GetNode(nodeID)
	if !ok {
		graphJSON(w, http.StatusNotFound, map[string]string{"error": "node not found: " + nodeID})
		return
	}

	windowMinutes := 30
	if wm := q.Get("window_minutes"); wm != "" {
		if v, err := strconv.Atoi(wm); err == nil && v > 0 {
			windowMinutes = v
		}
	}

	since := time.Now().Add(-time.Duration(windowMinutes) * time.Minute)
	events := ws.graphEngine.RecentEvents(nodeID, since)

	graphJSON(w, http.StatusOK, map[string]interface{}{
		"node":          node,
		"recent_events": events,
	})
}

// handleGraphRemediation generates a validated remediation plan for a given fault node.
//
// POST /api/graph/remediation
// Body: same as /api/graph/analyze — graph.AnalyzeRequest JSON
func (ws *WebServer) handleGraphRemediation(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if ws.graphEngine == nil {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "graph engine not ready"})
		return
	}

	var req graph.AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request: " + err.Error()})
		return
	}

	chain := ws.graphEngine.Analyze(req)
	plan := ws.graphEngine.BuildRemediationPlan(chain)
	if plan == nil {
		graphJSON(w, http.StatusUnprocessableEntity, map[string]string{
			"error": "could not build remediation plan: insufficient graph data",
		})
		return
	}

	graphJSON(w, http.StatusOK, plan)
}

// graphJSON writes a JSON response with the given HTTP status code.
func graphJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// probeGraphNamespaces detects whether the kubeconfig context permits cluster-
// scoped LIST/WATCH operations. If the probe fails (e.g. GKE Connect Gateway
// with namespace-scoped IAM), it returns the list of accessible namespaces so
// the graph engine can be started in namespace-scoped mode.
//
// Returns nil (zero-length) when cluster-scoped access works — the caller
// should use cluster-scoped mode in that case.
func probeGraphNamespaces(client kubernetes.Interface) []string {
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	// Try a cluster-scoped Deployment LIST (limit=1, very cheap).
	_, err := client.AppsV1().Deployments("").List(ctx, metav1.ListOptions{Limit: 1})
	if err == nil {
		// Cluster access works — no namespace restriction needed.
		return nil
	}

	log.Printf("[graph] cluster-scoped probe failed (%v); switching to namespace-scoped mode", err)

	// Fall back: list all namespaces the credential can see.
	nsList, nsErr := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if nsErr != nil {
		log.Printf("[graph] namespace list also failed (%v); informers will start cluster-scoped and may see permission errors", nsErr)
		return nil
	}

	var names []string
	for _, ns := range nsList.Items {
		names = append(names, ns.Name)
	}
	if len(names) == 0 {
		log.Printf("[graph] namespace list returned 0 namespaces; falling back to cluster-scoped mode")
		return nil
	}
	return names
}
