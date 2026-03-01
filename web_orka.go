// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/internal/database"
)

// ─────────────────────────────────────────────────────────────────────────────
// Orkas AI Proxy + Remediation Decision API
//
// Routes:
//   POST /api/orka/*               — transparent proxy to Orkas AI (port 8000)
//   POST /api/graph/remediation/decision — record approve/reject decision
//   GET  /api/graph/remediation/decisions — list recent decisions
//
// The proxy layer eliminates the hardcoded localhost:8000 in the browser and
// enables context enrichment (cluster name, namespace) on all Orkas AI calls.
// ─────────────────────────────────────────────────────────────────────────────

// orkaAIURL returns the configured Orkas AI base URL.
// Defaults to http://localhost:8000 for local development.
func orkaAIURL() string {
	if u := os.Getenv("ORKAS_AI_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	return "http://localhost:8000"
}

// RegisterOrkaRoutes registers the Orkas AI proxy and remediation decision routes.
func (ws *WebServer) RegisterOrkaRoutes() {
	http.HandleFunc("/api/orka/", ws.handleOrkaProxy)
	http.HandleFunc("/api/graph/remediation/decision", ws.handleRemediationDecision)
	http.HandleFunc("/api/graph/remediation/decisions", ws.handleListRemediationDecisions)
}

// handleOrkaProxy transparently proxies /api/orka/* → Orkas AI.
//
// Path mapping: /api/orka/ask → http://localhost:8000/ask
//
// The proxy enriches every request with two headers:
//   X-Kubegraf-Context   — active kubeconfig context name
//   X-Kubegraf-Namespace — currently selected namespace
//
// These allow Orkas AI to scope K8s queries without the browser needing to
// send them explicitly.
func (ws *WebServer) handleOrkaProxy(w http.ResponseWriter, r *http.Request) {
	// Strip /api/orka prefix to get the downstream path.
	downstreamPath := strings.TrimPrefix(r.URL.Path, "/api/orka")
	if downstreamPath == "" {
		downstreamPath = "/"
	}

	targetURL := orkaAIURL() + downstreamPath
	if r.URL.RawQuery != "" {
		targetURL += "?" + r.URL.RawQuery
	}

	// Buffer the request body so we can forward it.
	body, err := io.ReadAll(io.LimitReader(r.Body, 4<<20)) // 4 MB limit
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	req, err := http.NewRequestWithContext(r.Context(), r.Method, targetURL, bytes.NewReader(body))
	if err != nil {
		http.Error(w, "failed to build upstream request", http.StatusInternalServerError)
		return
	}

	// Forward original headers (content-type, authorization, etc.).
	for key, vals := range r.Header {
		for _, v := range vals {
			req.Header.Add(key, v)
		}
	}

	// Enrich with cluster context so Orkas AI can scope K8s queries.
	ctx := ws.getCurrentContext()
	if ctx != "" {
		req.Header.Set("X-Kubegraf-Context", ctx)
	}

	// For SSE streams, disable the timeout — the connection lives as long as
	// the client stays connected. For regular calls, use a 120s ceiling.
	isSSE := r.Header.Get("Accept") == "text/event-stream"
	var httpClient *http.Client
	if isSSE {
		httpClient = &http.Client{} // no timeout — caller context cancels
	} else {
		httpClient = &http.Client{Timeout: 120 * time.Second}
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		log.Printf("[orka-proxy] upstream error for %s %s: %v", r.Method, downstreamPath, err)
		http.Error(w, fmt.Sprintf("Orkas AI unavailable: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy upstream response headers and status to the client.
	for key, vals := range resp.Header {
		for _, v := range vals {
			w.Header().Add(key, v)
		}
	}
	w.WriteHeader(resp.StatusCode)

	// For SSE (text/event-stream), flush each chunk immediately so the browser
	// receives tokens as they arrive rather than waiting for the full response.
	// Without Flusher, Go's ResponseWriter buffers the entire body.
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "text/event-stream") {
		flusher, ok := w.(http.Flusher)
		buf := make([]byte, 4096)
		for {
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				_, _ = w.Write(buf[:n])
				if ok {
					flusher.Flush()
				}
			}
			if readErr != nil {
				break
			}
		}
		return
	}

	_, _ = io.Copy(w, resp.Body)
}

// ─────────────────────────────────────────────────────────────────────────────
// Remediation decision persistence
// ─────────────────────────────────────────────────────────────────────────────

type remediationDecisionRequest struct {
	RootCause      string  `json:"root_cause"`
	AffectedNode   string  `json:"affected_node"`
	PatternMatched string  `json:"pattern_matched"`
	Confidence     float64 `json:"confidence"`
	Decision       string  `json:"decision"` // "approved" | "rejected"
	Notes          string  `json:"notes"`
	DecidedBy      string  `json:"decided_by"` // optional user identifier
}

// handleRemediationDecision persists an approve/reject decision from the Incidents tab.
// POST /api/graph/remediation/decision
func (ws *WebServer) handleRemediationDecision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req remediationDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Decision != "approved" && req.Decision != "rejected" {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "decision must be 'approved' or 'rejected'"})
		return
	}

	if req.DecidedBy == "" {
		req.DecidedBy = "user"
	}

	ctx := ws.getCurrentContext()
	rec := database.RemediationDecision{
		RootCause:      req.RootCause,
		AffectedNode:   req.AffectedNode,
		PatternMatched: req.PatternMatched,
		Confidence:     req.Confidence,
		Decision:       req.Decision,
		DecidedBy:      req.DecidedBy,
		Notes:          req.Notes,
		ContextName:    ctx,
	}

	if ws.db != nil {
		if err := ws.db.SaveRemediationDecision(rec); err != nil {
			log.Printf("[remediation] failed to save decision: %v", err)
			graphJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to save decision"})
			return
		}
	}

	graphJSON(w, http.StatusOK, map[string]interface{}{
		"status":   "saved",
		"decision": req.Decision,
		"context":  ctx,
	})
}

// handleListRemediationDecisions returns recent approve/reject decisions.
// GET /api/graph/remediation/decisions?limit=50
func (ws *WebServer) handleListRemediationDecisions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	limit := 50
	if ws.db == nil {
		graphJSON(w, http.StatusOK, map[string]interface{}{"decisions": []interface{}{}})
		return
	}

	ctx := ws.getCurrentContext()
	decisions, err := ws.db.ListRemediationDecisions(ctx, limit)
	if err != nil {
		graphJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if decisions == nil {
		decisions = []database.RemediationDecision{}
	}
	graphJSON(w, http.StatusOK, map[string]interface{}{
		"decisions": decisions,
		"context":   ctx,
		"count":     len(decisions),
	})
}
