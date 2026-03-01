// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/kubegraf/kubegraf/internal/database"
	"github.com/kubegraf/kubegraf/pkg/graph"
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
// Specific routes are registered before the wildcard so Go's ServeMux longest-match
// ensures /api/orka/incident/* handlers always take priority over the proxy.
func (ws *WebServer) RegisterOrkaRoutes() {
	// Specific handlers — graph-grounded, AI-powered, production-grade
	http.HandleFunc("/api/orka/incident/fix", ws.handleIncidentFix)
	http.HandleFunc("/api/orka/incident/brief", ws.handleIncidentBrief)
	// Wildcard proxy for all other /api/orka/* paths (ask, etc.)
	http.HandleFunc("/api/orka/", ws.handleOrkaProxy)
	http.HandleFunc("/api/graph/remediation/decision", ws.handleRemediationDecision)
	http.HandleFunc("/api/graph/remediation/decisions", ws.handleListRemediationDecisions)
}

// ─────────────────────────────────────────────────────────────────────────────
// Incident AI handlers — graph-grounded, production-grade
//
// These handlers build rich context from the live topology graph and K8s event
// stream before calling the local AI, ensuring responses are grounded in real
// cluster state rather than bare metadata.
// ─────────────────────────────────────────────────────────────────────────────

// incidentFixRequest is the payload sent by the frontend.
type incidentFixRequest struct {
	Pattern          string `json:"pattern"`
	ResourceKind     string `json:"resource_kind"`
	ResourceName     string `json:"resource_name"`
	Namespace        string `json:"namespace"`
	Severity         string `json:"severity"`
	Description      string `json:"description"`
	// Optional enrichment fields sent by the frontend
	Symptoms         []any  `json:"symptoms,omitempty"`
	Timeline         []any  `json:"timeline,omitempty"`
	RelatedResources []any  `json:"related_resources,omitempty"`
}

// aiFix is a single remediation action returned to the frontend.
type aiFix struct {
	Title           string   `json:"title"`
	Explanation     string   `json:"explanation"`
	Risk            string   `json:"risk"`
	Priority        int      `json:"priority"`
	KubectlCommands []string `json:"kubectl_commands"`
}

// incidentBriefRequest is the payload sent by the frontend.
type incidentBriefRequest struct {
	Name             string `json:"name"`
	Namespace        string `json:"namespace"`
	Kind             string `json:"kind"`
	Pattern          string `json:"pattern"`
	Severity         string `json:"severity"`
	Description      string `json:"description"`
	Symptoms         []any  `json:"symptoms,omitempty"`
	Timeline         []any  `json:"timeline,omitempty"`
	RelatedResources []any  `json:"related_resources,omitempty"`
}

// briefRemediationStep is one step in the incident brief's remediation plan.
type briefRemediationStep struct {
	Action    string `json:"action"`
	Command   string `json:"command,omitempty"`
	RiskLevel string `json:"risk_level"`
}

// incidentBriefResponse matches the IncidentBrief interface on the frontend exactly.
type incidentBriefResponse struct {
	Brief            string `json:"brief"`
	Confidence       float64 `json:"confidence"`
	PatternMatched   string  `json:"pattern_matched,omitempty"`
	BlastRadiusCount int     `json:"blast_radius_count"`
	RemediationPlan  *struct {
		Steps []briefRemediationStep `json:"steps"`
	} `json:"remediation_plan,omitempty"`
	ModelUsed string `json:"model_used,omitempty"`
	LatencyMs int64  `json:"latency_ms,omitempty"`
}

// handleIncidentFix generates graph-grounded AI fix recommendations.
// POST /api/orka/incident/fix
func (ws *WebServer) handleIncidentFix(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req incidentFixRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body: " + err.Error()})
		return
	}
	if req.ResourceName == "" || req.Namespace == "" {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "resource_name and namespace are required"})
		return
	}

	t0 := time.Now()

	// Build rich context from live cluster data
	graphCtx, blastCount, confidence := ws.buildGraphContextStr(req.ResourceKind, req.Namespace, req.ResourceName)
	events := ws.fetchK8sEventsStr(req.Namespace, req.ResourceName, req.ResourceKind)
	symptomsJSON := marshalCompact(req.Symptoms)

	// Build the prompt — grounded in real cluster state
	prompt := fmt.Sprintf(`You are an expert Site Reliability Engineer with deep Kubernetes experience.
Analyze this production incident and generate precise, actionable remediation fixes.

INCIDENT:
- Resource: %s/%s in namespace %s
- Failure Pattern: %s
- Severity: %s
- Description: %s

GRAPH CAUSAL ANALYSIS (live topology, confidence %.0f%%):
%s

KUBERNETES EVENTS (recent):
%s

SYMPTOMS:
%s

INSTRUCTIONS:
- Generate 2-4 actionable fixes ordered by priority (most impactful first).
- Commands MUST use exact resource name "%s" and namespace "%s".
- Risk: "low" = reversible/no downtime, "medium" = brief impact, "high" = potential downtime.
- Focus on the ROOT CAUSE shown in the graph analysis, not just surface symptoms.
- Blast radius is %d resources — factor this into priority.

Respond with ONLY valid JSON, no markdown, no explanation text outside the JSON:
{
  "fixes": [
    {
      "title": "concise action title (max 8 words)",
      "explanation": "why this fixes the root cause (2-3 sentences)",
      "risk": "low|medium|high",
      "priority": 1,
      "kubectl_commands": ["exact kubectl command with real names/namespaces"]
    }
  ]
}`,
		req.ResourceKind, req.ResourceName, req.Namespace,
		req.Pattern, req.Severity, req.Description,
		confidence*100, graphCtx,
		events, symptomsJSON,
		req.ResourceName, req.Namespace,
		blastCount,
	)

	assistant := newIncidentAIAssistant()
	if !assistant.IsAvailable() {
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "No AI provider available. Configure Ollama, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	raw, err := assistant.Query(ctx, prompt)
	if err != nil {
		log.Printf("[incident/fix] AI query failed: %v", err)
		graphJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI query failed: " + err.Error()})
		return
	}

	// Extract and parse JSON from LLM response
	jsonStr := extractJSONFromLLM(raw)
	var result struct {
		Fixes []aiFix `json:"fixes"`
	}
	usedFallback := false
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		log.Printf("[incident/fix] JSON parse failed, using pattern fallback (raw: %.200s): %v", raw, err)
		result.Fixes = generateFallbackFixes(req)
		usedFallback = true
	}
	if len(result.Fixes) == 0 {
		result.Fixes = generateFallbackFixes(req)
		usedFallback = true
	}

	// Sanitize: ensure required fields, cap at 4 fixes
	for i := range result.Fixes {
		if result.Fixes[i].Risk == "" {
			result.Fixes[i].Risk = "medium"
		}
		if result.Fixes[i].Priority == 0 {
			result.Fixes[i].Priority = i + 1
		}
		if result.Fixes[i].KubectlCommands == nil {
			result.Fixes[i].KubectlCommands = []string{}
		}
	}
	if len(result.Fixes) > 4 {
		result.Fixes = result.Fixes[:4]
	}

	graphJSON(w, http.StatusOK, map[string]interface{}{
		"fixes":      result.Fixes,
		"model_used": assistant.ProviderName(),
		"latency_ms": time.Since(t0).Milliseconds(),
		"fallback":   usedFallback,
	})
}

// handleIncidentBrief generates a graph-grounded incident brief with remediation plan.
// POST /api/orka/incident/brief
func (ws *WebServer) handleIncidentBrief(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		graphJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	var req incidentBriefRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body: " + err.Error()})
		return
	}
	if req.Name == "" || req.Namespace == "" {
		graphJSON(w, http.StatusBadRequest, map[string]string{"error": "name and namespace are required"})
		return
	}

	t0 := time.Now()

	// Build rich context
	graphCtx, blastCount, graphConfidence := ws.buildGraphContextStr(req.Kind, req.Namespace, req.Name)
	events := ws.fetchK8sEventsStr(req.Namespace, req.Name, req.Kind)
	symptomsJSON := marshalCompact(req.Symptoms)

	// Try to get the graph remediation plan as a baseline (deterministic, not AI)
	var graphPlanSteps string
	if ws.graphEngine != nil {
		chain := ws.graphEngine.Analyze(graph.AnalyzeRequest{
			Kind:          graph.NodeKind(req.Kind),
			Namespace:     req.Namespace,
			Name:          req.Name,
			WindowMinutes: 30,
		})
		if chain != nil {
			plan := ws.graphEngine.BuildRemediationPlan(chain)
			if plan != nil && len(plan.Steps) > 0 {
				var sb strings.Builder
				for _, s := range plan.Steps {
					sb.WriteString(fmt.Sprintf("- [%s risk] %s", s.Risk, s.Description))
					if s.KubectlCommand != "" {
						sb.WriteString(fmt.Sprintf(" | cmd: %s", s.KubectlCommand))
					}
					sb.WriteString("\n")
				}
				graphPlanSteps = sb.String()
			}
		}
	}
	if graphPlanSteps == "" {
		graphPlanSteps = "No deterministic plan available — AI will derive steps from context."
	}

	prompt := fmt.Sprintf(`You are an expert Site Reliability Engineer. Generate a precise incident brief.

INCIDENT:
- Resource: %s/%s in namespace %s
- Pattern: %s
- Severity: %s
- Description: %s

GRAPH CAUSAL ANALYSIS (deterministic topology inference):
%s

GRAPH-DERIVED REMEDIATION BASELINE:
%s

KUBERNETES EVENTS (last 10):
%s

SYMPTOMS:
%s

Generate a brief that:
1. Summarizes what happened, root cause, and blast radius in 2-3 sentences (be specific to this incident).
2. Sets confidence 0.75-0.95 for strong graph evidence, 0.45-0.74 for partial evidence.
3. Lists 3-5 concrete remediation steps ordered by priority.
4. Commands MUST use exact name "%s" and namespace "%s".

Respond with ONLY valid JSON, no markdown, no explanation outside the JSON:
{
  "brief": "2-3 sentence executive summary specific to this incident",
  "confidence": 0.xx,
  "pattern_matched": "%s",
  "blast_radius_count": %d,
  "remediation_plan": {
    "steps": [
      {
        "action": "clear description of what to do",
        "command": "kubectl command or empty string",
        "risk_level": "low|medium|high"
      }
    ]
  }
}`,
		req.Kind, req.Name, req.Namespace,
		req.Pattern, req.Severity, req.Description,
		graphCtx, graphPlanSteps,
		events, symptomsJSON,
		req.Name, req.Namespace,
		req.Pattern, blastCount,
	)

	assistant := newIncidentAIAssistant()
	if !assistant.IsAvailable() {
		// Fallback: if graph engine has a plan, return a graph-only brief without AI narrative
		if ws.graphEngine != nil {
			brief := ws.buildGraphOnlyBrief(req, blastCount, graphConfidence, graphPlanSteps)
			graphJSON(w, http.StatusOK, brief)
			return
		}
		graphJSON(w, http.StatusServiceUnavailable, map[string]string{
			"error": "No AI provider available. Configure Ollama, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
	defer cancel()

	raw, err := assistant.Query(ctx, prompt)
	if err != nil {
		log.Printf("[incident/brief] AI query failed: %v", err)
		// Fallback to graph-only brief
		if ws.graphEngine != nil {
			brief := ws.buildGraphOnlyBrief(req, blastCount, graphConfidence, graphPlanSteps)
			graphJSON(w, http.StatusOK, brief)
			return
		}
		graphJSON(w, http.StatusInternalServerError, map[string]string{"error": "AI query failed: " + err.Error()})
		return
	}

	jsonStr := extractJSONFromLLM(raw)
	var result incidentBriefResponse
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		log.Printf("[incident/brief] JSON parse failed (raw: %.200s): %v", raw, err)
		graphJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "AI returned malformed response. Try again.",
		})
		return
	}
	if result.Brief == "" {
		graphJSON(w, http.StatusUnprocessableEntity, map[string]string{
			"error": "AI returned empty brief. Try again.",
		})
		return
	}

	// Ensure required fields
	if result.Confidence == 0 {
		result.Confidence = graphConfidence
	}
	if result.BlastRadiusCount == 0 {
		result.BlastRadiusCount = blastCount
	}
	if result.PatternMatched == "" {
		result.PatternMatched = req.Pattern
	}
	result.ModelUsed = assistant.ProviderName()
	result.LatencyMs = time.Since(t0).Milliseconds()

	graphJSON(w, http.StatusOK, result)
}

// buildGraphOnlyBrief constructs a brief from graph data alone (no AI required).
// Used as fallback when AI providers are unavailable.
func (ws *WebServer) buildGraphOnlyBrief(req incidentBriefRequest, blastCount int, confidence float64, graphPlanStr string) incidentBriefResponse {
	pat := strings.ReplaceAll(req.Pattern, "_", " ")
	brief := fmt.Sprintf(
		"%s detected on %s/%s in namespace %s. Graph analysis identified %d downstream resources in the blast radius. Deterministic remediation steps are available below.",
		pat, req.Kind, req.Name, req.Namespace, blastCount,
	)

	// Parse the graph plan string into steps
	var steps []briefRemediationStep
	for _, line := range strings.Split(graphPlanStr, "\n") {
		line = strings.TrimPrefix(strings.TrimSpace(line), "- ")
		if line == "" {
			continue
		}
		riskLevel := "medium"
		if strings.Contains(line, "[low risk]") {
			riskLevel = "low"
		} else if strings.Contains(line, "[high risk]") {
			riskLevel = "high"
		}
		cmd := ""
		action := line
		if idx := strings.Index(line, "| cmd: "); idx >= 0 {
			cmd = strings.TrimSpace(line[idx+7:])
			action = strings.TrimSpace(line[:idx])
		}
		// Strip the risk tag from action text
		action = strings.TrimPrefix(action, "[low risk] ")
		action = strings.TrimPrefix(action, "[medium risk] ")
		action = strings.TrimPrefix(action, "[high risk] ")
		steps = append(steps, briefRemediationStep{Action: action, Command: cmd, RiskLevel: riskLevel})
		if len(steps) >= 5 {
			break
		}
	}

	resp := incidentBriefResponse{
		Brief:            brief,
		Confidence:       confidence,
		PatternMatched:   req.Pattern,
		BlastRadiusCount: blastCount,
		ModelUsed:        "graph-engine (no AI)",
	}
	if len(steps) > 0 {
		resp.RemediationPlan = &struct {
			Steps []briefRemediationStep `json:"steps"`
		}{Steps: steps}
	}
	return resp
}

// buildGraphContextStr produces a human-readable string of the causal chain for the AI prompt.
// Returns: context string, blast radius count, confidence (0–1).
func (ws *WebServer) buildGraphContextStr(kind, namespace, name string) (string, int, float64) {
	if ws.graphEngine == nil {
		return "Graph engine not available — working from incident metadata only.", 0, 0.5
	}

	chain := ws.graphEngine.Analyze(graph.AnalyzeRequest{
		Kind:          graph.NodeKind(kind),
		Namespace:     namespace,
		Name:          name,
		WindowMinutes: 30,
	})
	if chain == nil || chain.RootCause == nil {
		return "No causal chain established for this resource.", 0, 0.5
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Root Cause: %s/%s in %s (confidence: %.0f%%)\n",
		chain.RootCause.Kind, chain.RootCause.Name, chain.RootCause.Namespace, chain.Confidence*100))
	sb.WriteString(fmt.Sprintf("Root Cause Status: %s\n", chain.RootCause.Status))
	if chain.PatternMatched != "" {
		sb.WriteString(fmt.Sprintf("Pattern: %s\n", chain.PatternMatched))
	}
	if len(chain.BlastRadius) > 0 {
		sb.WriteString(fmt.Sprintf("Blast Radius: %d downstream resources affected\n", len(chain.BlastRadius)))
		for i, node := range chain.BlastRadius {
			if i >= 6 {
				sb.WriteString(fmt.Sprintf("  ... and %d more\n", len(chain.BlastRadius)-6))
				break
			}
			sb.WriteString(fmt.Sprintf("  - %s/%s (%s)\n", node.Kind, node.Name, node.Status))
		}
	}
	if len(chain.Path) > 1 {
		sb.WriteString("Causal Path: ")
		for i, step := range chain.Path {
			if i > 0 {
				sb.WriteString(" → ")
			}
			if step.Node != nil {
				sb.WriteString(fmt.Sprintf("%s/%s", step.Node.Kind, step.Node.Name))
			}
		}
		sb.WriteString("\n")
	}
	if len(chain.Evidence) > 0 {
		sb.WriteString("Supporting Evidence:\n")
		for i, ev := range chain.Evidence {
			if i >= 4 {
				break
			}
			sb.WriteString(fmt.Sprintf("  - [%s] %s: %s\n", ev.EventType, ev.Reason, ev.Message))
		}
	}
	return sb.String(), len(chain.BlastRadius), chain.Confidence
}

// fetchK8sEventsStr fetches recent Kubernetes events for a resource as a formatted string.
func (ws *WebServer) fetchK8sEventsStr(namespace, name, kind string) string {
	if ws.app == nil || ws.app.clientset == nil {
		return "K8s client unavailable — no live events."
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fieldSelector := fmt.Sprintf("involvedObject.name=%s,involvedObject.namespace=%s", name, namespace)
	evList, err := ws.app.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		log.Printf("[incident] event fetch failed for %s/%s/%s: %v", kind, namespace, name, err)
		return "Could not fetch K8s events."
	}
	if len(evList.Items) == 0 {
		return "No recent Kubernetes events found for this resource."
	}

	var sb strings.Builder
	// Show last 10 events, most recent first
	items := evList.Items
	if len(items) > 10 {
		items = items[len(items)-10:]
	}
	for _, ev := range items {
		ts := ev.LastTimestamp.Format("15:04:05")
		sb.WriteString(fmt.Sprintf("  [%s] %s %s: %s (×%d)\n",
			ts, ev.Type, ev.Reason, ev.Message, ev.Count))
	}
	return sb.String()
}

// extractJSONFromLLM extracts the first valid JSON object from an LLM response.
// LLMs (especially small models like llama3.2:3b) often wrap JSON in markdown
// code fences or add explanatory text. This function tries multiple strategies.
func extractJSONFromLLM(raw string) string {
	raw = strings.TrimSpace(raw)

	// Strategy 1: ```json ... ``` code fence
	if idx := strings.Index(raw, "```json"); idx >= 0 {
		start := idx + 7
		if end := strings.Index(raw[start:], "```"); end >= 0 {
			candidate := strings.TrimSpace(raw[start : start+end])
			if json.Valid([]byte(candidate)) {
				return candidate
			}
		}
	}

	// Strategy 2: plain ``` ... ``` code fence
	if idx := strings.Index(raw, "```"); idx >= 0 {
		start := idx + 3
		if end := strings.Index(raw[start:], "```"); end >= 0 {
			candidate := strings.TrimSpace(raw[start : start+end])
			if strings.HasPrefix(candidate, "{") && json.Valid([]byte(candidate)) {
				return candidate
			}
		}
	}

	// Strategy 3: bracket-counting to find the first complete JSON object.
	// This correctly handles nested objects and ignores trailing text.
	depth := 0
	startIdx := -1
	inStr := false
	escaped := false
	for i := 0; i < len(raw); i++ {
		ch := raw[i]
		if escaped {
			escaped = false
			continue
		}
		if ch == '\\' && inStr {
			escaped = true
			continue
		}
		if ch == '"' {
			inStr = !inStr
			continue
		}
		if inStr {
			continue
		}
		if ch == '{' {
			if depth == 0 {
				startIdx = i
			}
			depth++
		} else if ch == '}' {
			depth--
			if depth == 0 && startIdx >= 0 {
				candidate := raw[startIdx : i+1]
				if json.Valid([]byte(candidate)) {
					return candidate
				}
				// Not valid JSON — reset and try to find the next object
				startIdx = -1
			}
		}
	}

	// Strategy 4: fallback — first { to last }
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		return raw[start : end+1]
	}

	return raw
}

// generateFallbackFixes returns deterministic fix recommendations based on the
// incident pattern when AI parsing fails. This ensures users always receive
// actionable suggestions even if the LLM produces malformed output.
func generateFallbackFixes(req incidentFixRequest) []aiFix {
	name := req.ResourceName
	ns := req.Namespace
	kind := req.ResourceKind
	if kind == "" {
		kind = "deployment"
	}
	kindLower := strings.ToLower(kind)

	switch strings.ToUpper(req.Pattern) {
	case "IMAGE_PULL_FAILURE", "IMAGE_PULL_BACKOFF", "IMAGEPULLBACKOFF", "ERRIMAGEPULL":
		return []aiFix{
			{
				Title:           "Verify Image Exists in Registry",
				Explanation:     "The image tag may not exist or was deleted. Confirm the image is present in the container registry before proceeding.",
				Risk:            "low",
				Priority:        1,
				KubectlCommands: []string{fmt.Sprintf("kubectl describe %s/%s -n %s | grep -A5 Image", kindLower, name, ns)},
			},
			{
				Title:           "Check Image Pull Secret",
				Explanation:     "Missing or expired pull secrets will cause all pods to fail pulling from private registries. Verify the secret exists and is correctly referenced.",
				Risk:            "low",
				Priority:        2,
				KubectlCommands: []string{fmt.Sprintf("kubectl get secret -n %s", ns), fmt.Sprintf("kubectl get %s/%s -n %s -o jsonpath='{.spec.template.spec.imagePullSecrets}'", kindLower, name, ns)},
			},
			{
				Title:           "Restart to Force Re-pull",
				Explanation:     "Rolling restart forces new pod creation which will attempt a fresh image pull with current credentials.",
				Risk:            "low",
				Priority:        3,
				KubectlCommands: []string{fmt.Sprintf("kubectl rollout restart %s/%s -n %s", kindLower, name, ns), fmt.Sprintf("kubectl rollout status %s/%s -n %s", kindLower, name, ns)},
			},
		}

	case "CRASH_LOOP_BACKOFF", "CRASH_LOOP", "CRASHLOOPBACKOFF":
		return []aiFix{
			{
				Title:           "Inspect Crash Logs",
				Explanation:     "Check previous container logs to identify the root cause of the crash. The --previous flag shows logs from the last terminated container.",
				Risk:            "low",
				Priority:        1,
				KubectlCommands: []string{fmt.Sprintf("kubectl logs %s/%s -n %s --previous --tail=100", kindLower, name, ns)},
			},
			{
				Title:           "Describe Pod Events",
				Explanation:     "Pod events reveal OOMKill, startup probe failures, and init container issues not visible in logs.",
				Risk:            "low",
				Priority:        2,
				KubectlCommands: []string{fmt.Sprintf("kubectl describe %s/%s -n %s", kindLower, name, ns)},
			},
			{
				Title:           "Rollback to Previous Version",
				Explanation:     "If this started after a recent deployment, rolling back to the prior revision may restore stability while you investigate.",
				Risk:            "medium",
				Priority:        3,
				KubectlCommands: []string{fmt.Sprintf("kubectl rollout undo deployment/%s -n %s", name, ns), fmt.Sprintf("kubectl rollout status deployment/%s -n %s", name, ns)},
			},
		}

	case "OOM_KILLED", "OOM", "OUT_OF_MEMORY":
		return []aiFix{
			{
				Title:           "Check Memory Consumption",
				Explanation:     "Identify which containers are consuming the most memory to right-size limits.",
				Risk:            "low",
				Priority:        1,
				KubectlCommands: []string{fmt.Sprintf("kubectl top pods -n %s --sort-by=memory | grep %s", ns, name)},
			},
			{
				Title:           "Increase Memory Limit",
				Explanation:     "The container is being OOM-killed due to exceeding its memory limit. Increase the limit to 2x current usage as a starting point.",
				Risk:            "medium",
				Priority:        2,
				KubectlCommands: []string{fmt.Sprintf("kubectl set resources deployment/%s -n %s --limits=memory=1Gi --requests=memory=512Mi", name, ns)},
			},
			{
				Title:           "Check for Memory Leaks",
				Explanation:     "If memory grows unbounded over time, the application may have a memory leak. Consider enabling heap profiling.",
				Risk:            "low",
				Priority:        3,
				KubectlCommands: []string{fmt.Sprintf("kubectl describe pod -l app=%s -n %s | grep -A10 'Last State'", name, ns)},
			},
		}

	case "NO_READY_ENDPOINTS", "NO_ENDPOINTS":
		return []aiFix{
			{
				Title:           "Check Backing Pods",
				Explanation:     "A Service with no ready endpoints means all its selector-matched pods are down or failing readiness probes.",
				Risk:            "low",
				Priority:        1,
				KubectlCommands: []string{fmt.Sprintf("kubectl get pods -n %s -l app=%s", ns, name), fmt.Sprintf("kubectl describe endpoints %s -n %s", name, ns)},
			},
			{
				Title:           "Check Readiness Probe",
				Explanation:     "Misconfigured readiness probes prevent pods from entering ready state. Verify probe endpoints are correct.",
				Risk:            "low",
				Priority:        2,
				KubectlCommands: []string{fmt.Sprintf("kubectl get deployment -n %s -o jsonpath='{.items[*].spec.template.spec.containers[*].readinessProbe}' | python3 -m json.tool", ns)},
			},
		}

	default:
		return []aiFix{
			{
				Title:           "Describe Resource",
				Explanation:     "Get full resource state, conditions, and recent events to identify the failure cause.",
				Risk:            "low",
				Priority:        1,
				KubectlCommands: []string{fmt.Sprintf("kubectl describe %s/%s -n %s", kindLower, name, ns)},
			},
			{
				Title:           "Check Recent Logs",
				Explanation:     "Inspect application logs for error messages and stack traces.",
				Risk:            "low",
				Priority:        2,
				KubectlCommands: []string{fmt.Sprintf("kubectl logs %s/%s -n %s --tail=100", kindLower, name, ns)},
			},
			{
				Title:           "Restart Workload",
				Explanation:     "Force a rolling restart to clear transient state. Monitor rollout status to confirm recovery.",
				Risk:            "medium",
				Priority:        3,
				KubectlCommands: []string{fmt.Sprintf("kubectl rollout restart deployment/%s -n %s", name, ns), fmt.Sprintf("kubectl rollout status deployment/%s -n %s", name, ns)},
			},
		}
	}
}

// newIncidentAIAssistant creates an AI assistant with auto-detected Ollama model.
// Unlike NewAIAssistant(nil), this always tries to detect the installed Ollama
// model so incident handlers don't fail with "model not found" when the user
// hasn't explicitly set KUBEGRAF_AI_MODEL.
func newIncidentAIAssistant() *AIAssistant {
	cfg := DefaultAIConfig()
	if detected := detectOllamaModel(cfg.OllamaURL); detected != "" {
		cfg.OllamaModel = detected
	}
	return NewAIAssistant(cfg)
}

// marshalCompact serialises v to a compact JSON string for embedding in a prompt.
// Returns "(none)" if v is nil/empty.
func marshalCompact(v any) string {
	if v == nil {
		return "(none)"
	}
	b, err := json.Marshal(v)
	if err != nil || string(b) == "null" || string(b) == "[]" {
		return "(none)"
	}
	return string(b)
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
