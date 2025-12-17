package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	autoscalingv1 "k8s.io/api/autoscaling/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	networkingv1 "k8s.io/api/networking/v1"
	policyv1 "k8s.io/api/policy/v1"
	policyv1beta1 "k8s.io/api/policy/v1beta1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	"github.com/gorilla/websocket"
)

// ExecutionStatus represents the lifecycle status of a streamed command execution.
type ExecutionStatus string

const (
	ExecutionStatusPlanned   ExecutionStatus = "planned"
	ExecutionStatusRunning   ExecutionStatus = "running"
	ExecutionStatusSucceeded ExecutionStatus = "succeeded"
	ExecutionStatusFailed    ExecutionStatus = "failed"
)

// ExecutionMode represents whether this is a dry-run or a real apply.
type ExecutionMode string

const (
	ExecutionModeDryRun ExecutionMode = "dry-run"
	ExecutionModeApply  ExecutionMode = "apply"
)

// ExecutionStartRequest is sent by the client as the first WebSocket message to initiate an execution.
// The panel is generic and can run any command; callers should ensure commands are safe.
type ExecutionStartRequest struct {
	Type                 string   `json:"type"`                 // should be "start"
	ExecutionID          string   `json:"executionId,omitempty"`// optional client-provided identifier
	Command              string   `json:"command"`              // binary to execute, e.g. "kubectl" or "sh"
	Args                 []string `json:"args,omitempty"`       // arguments for the command
	Mode                 string   `json:"mode"`                 // "dry-run" | "apply"
	KubernetesEquivalent bool     `json:"kubernetesEquivalent,omitempty"` // if true, label output as "kubectl-equivalent"
	WorkingDir           string   `json:"workingDir,omitempty"` // optional working directory
	Label                string   `json:"label,omitempty"`      // optional human-readable label for the UI
	// Optional security and metadata fields - primarily used when the execution
	// is representing Kubernetes API / kubectl-equivalent operations.
	Namespace       string `json:"namespace,omitempty"`       // K8s namespace, when applicable
	Context         string `json:"context,omitempty"`         // K8s context / cluster identifier
	UserAction      string `json:"userAction,omitempty"`      // High-level UI trigger (e.g. "deploy-app-button")
	DryRun          bool   `json:"dryRun,omitempty"`          // Indicates dry-run semantics at the intent level
	AllowClusterWide bool  `json:"allowClusterWide,omitempty"`// Explicit opt-in for cluster-wide operations
	Resource        string `json:"resource,omitempty"`        // Logical resource type (deployments, pods, etc.)
	Action          string `json:"action,omitempty"`          // Logical action (create, update, delete, scale, etc.)
	Intent          string `json:"intent,omitempty"`          // High-level intent (e.g. "apply-yaml")
	YAML            string `json:"yaml,omitempty"`            // Raw YAML manifest for K8s API operations
}

// ExecutionStateMessage describes high-level execution state transitions.
type ExecutionStateMessage struct {
	Type        string          `json:"type"` // "state"
	ExecutionID string          `json:"executionId"`
	Timestamp   time.Time       `json:"timestamp"`
	Status      ExecutionStatus `json:"status"`
	Mode        ExecutionMode   `json:"mode"`
	SourceLabel string          `json:"sourceLabel"` // "shell" or "kubectl-equivalent"
	Label       string          `json:"label,omitempty"`
}

// ExecutionLineMessage represents a single line of stdout/stderr from the running process.
type ExecutionLineMessage struct {
	Type        string        `json:"type"` // "line"
	ExecutionID string        `json:"executionId"`
	Timestamp   time.Time     `json:"timestamp"`
	Stream      string        `json:"stream"` // "stdout" | "stderr"
	Text        string        `json:"text"`   // already passed through secret masking
	Mode        ExecutionMode `json:"mode"`
	SourceLabel string        `json:"sourceLabel"` // "shell" or "kubectl-equivalent"
}

// ExecutionResourcesChanged provides a coarse summary of what changed, inferred from output.
type ExecutionResourcesChanged struct {
	Created    int `json:"created"`
	Configured int `json:"configured"`
	Unchanged  int `json:"unchanged"`
	Deleted    int `json:"deleted"`
}

// ExecutionSummary describes the final outcome and basic metrics for an execution.
type ExecutionSummary struct {
	StartedAt   time.Time                  `json:"startedAt"`
	CompletedAt time.Time                  `json:"completedAt"`
	DurationMs  int64                      `json:"durationMs"`
	ExitCode    int                        `json:"exitCode"`
	Resources   *ExecutionResourcesChanged `json:"resourcesChanged,omitempty"`
}

// ExecutionRecord stores minimal, durable state about an execution so the UI
// can re-attach or show recent history even after refresh. This is intentionally
// small to avoid retaining large log buffers in memory.
type ExecutionRecord struct {
	ExecutionID string            `json:"executionId"`
	Status      ExecutionStatus   `json:"status"`
	StartedAt   time.Time         `json:"startedAt"`
	LastLineAt  time.Time         `json:"lastLineAt"`
	Summary     *ExecutionSummary `json:"summary,omitempty"`
}

// ExecutionLogLine represents a single stored log line for an execution,
// used by the lightweight history endpoint to show recent output. The live
// WebSocket path still uses ExecutionLineMessage for streaming.
type ExecutionLogLine struct {
	Timestamp time.Time `json:"timestamp"`
	Stream    string    `json:"stream"`
	Text      string    `json:"text"`
}

// ExecutionPhaseMessage represents a high-level phase in a long running operation.
// This is especially useful for K8s API / Helm flows where structured phases
// are clearer than raw logs alone.
type ExecutionPhaseMessage struct {
	Type        string        `json:"type"` // "phase"
	ExecutionID string        `json:"executionId"`
	Timestamp   time.Time     `json:"timestamp"`
	Name        string        `json:"name"`
	Detail      string        `json:"detail,omitempty"`
	Progress    int           `json:"progress,omitempty"`
	Total       int           `json:"total,omitempty"`
	Mode        ExecutionMode `json:"mode"`
	SourceLabel string        `json:"sourceLabel"`
}

// ExecutionCompleteMessage is sent once per execution when the command finishes or fails to start.
type ExecutionCompleteMessage struct {
	Type        string           `json:"type"` // "complete" | "error"
	ExecutionID string           `json:"executionId"`
	Timestamp   time.Time        `json:"timestamp"`
	Status      ExecutionStatus  `json:"status"`
	Mode        ExecutionMode    `json:"mode"`
	SourceLabel string           `json:"sourceLabel"`
	Summary     *ExecutionSummary `json:"summary,omitempty"`
	Error       string           `json:"error,omitempty"`    // human-readable error
	RawError    string           `json:"rawError,omitempty"` // raw error detail for advanced debugging
}

// resourceChangeAccumulator tracks inferred resource changes based on command output lines.
type resourceChangeAccumulator struct {
	mu        sync.Mutex
	resources ExecutionResourcesChanged
}

func newResourceChangeAccumulator() *resourceChangeAccumulator {
	return &resourceChangeAccumulator{
		resources: ExecutionResourcesChanged{},
	}
}

// noteLine inspects a line of output and heuristically increments resource change counters.
// This is intentionally conservative and only increments when patterns clearly match
// kubectl-style apply output (e.g. "created", "configured", "unchanged", "deleted").
func (a *resourceChangeAccumulator) noteLine(line string) {
	lower := strings.ToLower(line)

	a.mu.Lock()
	defer a.mu.Unlock()

	if strings.Contains(lower, " created") || strings.HasPrefix(lower, "created ") {
		a.resources.Created++
	}
	if strings.Contains(lower, " configured") || strings.HasPrefix(lower, "configured ") {
		a.resources.Configured++
	}
	if strings.Contains(lower, " unchanged") || strings.Contains(lower, "no changes") {
		a.resources.Unchanged++
	}
	if strings.Contains(lower, " deleted") || strings.HasPrefix(lower, "deleted ") {
		a.resources.Deleted++
	}
}

func (a *resourceChangeAccumulator) snapshot() *ExecutionResourcesChanged {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Avoid sending an empty summary if nothing matched
	if a.resources.Created == 0 &&
		a.resources.Configured == 0 &&
		a.resources.Unchanged == 0 &&
		a.resources.Deleted == 0 {
		return nil
	}

	copy := a.resources
	return &copy
}

// Secret masking

type redactionPattern struct {
	re      *regexp.Regexp
	replace string
}

var secretRedactionPatterns = []redactionPattern{
	// Matches "token: ABC123" / "password=foo" / "secret: value" / "authorization: Bearer abc"
	{
		re:      regexp.MustCompile(`(?i)\b(token|password|secret|apikey|api_key|authorization)\b\s*[:=]\s*([^\s'"]+)`),
		replace: `$1=[REDACTED]`,
	},
	// Matches kubernetes-style base64 fields
	{
		re:      regexp.MustCompile(`(?i)\b(client-certificate-data|client-key-data|id-token)\b\s*[:=]\s*([^\s'"]+)`),
		replace: `$1=[REDACTED]`,
	},
	// Matches JSON-style secrets: "access_token": "value"
	{
		re:      regexp.MustCompile(`(?i)("(access_token|refresh_token|password|client_secret)")\s*:\s*"([^"]+)"`),
		replace: `$1:"[REDACTED]"`,
	},
}

// maskSecrets applies best-effort masking to hide tokens, passwords, and secrets from output.
// It runs purely on the server side so that sensitive values are never sent to the client.
func maskSecrets(line string) string {
	masked := line
	for _, p := range secretRedactionPatterns {
		masked = p.re.ReplaceAllString(masked, p.replace)
	}
	return masked
}

// extractExitCode attempts to derive the numeric exit code from an error, if available.
func extractExitCode(err error) int {
	if err == nil {
		return 0
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		if status, ok := exitErr.Sys().(syscall.WaitStatus); ok {
			return status.ExitStatus()
		}
	}
	// Unknown / unavailable
	return -1
}

// handleExecutionStream upgrades to WebSocket, starts the requested command, and streams
// stdout/stderr line-by-line to the client until completion. All output is passed through
// secret masking. If Kubernetes API is used by the caller, they must set KubernetesEquivalent=true
// so the UI can clearly label the output as "kubectl-equivalent".
func (ws *WebServer) handleExecutionStream(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("execution stream WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Read initial start request
	_, data, err := conn.ReadMessage()
	if err != nil {
		log.Printf("execution stream read error (start message): %v", err)
		return
	}

	var req ExecutionStartRequest
	if err := json.Unmarshal(data, &req); err != nil {
		log.Printf("invalid execution start payload: %v", err)
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: "",
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        ExecutionModeApply,
			SourceLabel: "shell",
			Error:       "Invalid execution request payload",
			RawError:    err.Error(),
		}
		_ = conn.WriteJSON(msg)
		return
	}

	if req.Type != "" && req.Type != "start" {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: req.ExecutionID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        ExecutionModeApply,
			SourceLabel: "shell",
			Error:       fmt.Sprintf("Unsupported execution message type: %s", req.Type),
		}
		_ = conn.WriteJSON(msg)
		return
	}

	if strings.TrimSpace(req.Command) == "" {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: req.ExecutionID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        ExecutionModeApply,
			SourceLabel: "shell",
			Error:       "Command is required for execution",
		}
		_ = conn.WriteJSON(msg)
		return
	}

	execID := req.ExecutionID
	if execID == "" {
		execID = fmt.Sprintf("exec-%d", time.Now().UnixNano())
	}

	mode := ExecutionMode(req.Mode)
	if mode != ExecutionModeDryRun && mode != ExecutionModeApply {
		// Default to "apply" to be explicit in the UI; callers should always set this.
		mode = ExecutionModeApply
	}

	sourceLabel := "shell"
	if req.KubernetesEquivalent {
		sourceLabel = "kubectl-equivalent"
	}

	// Basic authorization & guardrails when this execution represents a
	// Kubernetes-equivalent operation. For pure shell commands (the current
	// demo usage), this is intentionally permissive to avoid breaking flows.
	if err := ws.authorizeExecution(r, &req, execID); err != nil {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Error:       err.Error(),
		}
		_ = conn.WriteJSON(msg)
		return
	}

	// One writer at a time; gorilla/websocket requires serialized writes.
	var writeMu sync.Mutex
	writeJSON := func(v interface{}) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		return conn.WriteJSON(v)
	}

	// Branch: Kubernetes API-based Apply YAML execution. This uses the Kubernetes
	// client directly instead of spawning a kubectl process, and streams
	// structured phase + line events.
	if strings.EqualFold(req.Intent, "apply-yaml") && strings.TrimSpace(req.YAML) != "" {
		ws.runApplyYAMLExecution(r, execID, &req, mode, sourceLabel, writeJSON)
		return
	}

	// Notify client that execution is starting / running.
	stateMsg := ExecutionStateMessage{
		Type:        "state",
		ExecutionID: execID,
		Timestamp:   time.Now(),
		Status:      ExecutionStatusRunning,
		Mode:        mode,
		SourceLabel: sourceLabel,
		Label:       req.Label,
	}
	if err := writeJSON(stateMsg); err != nil {
		log.Printf("failed to send execution state: %v", err)
		return
	}

	// Register execution in memory so we can list/re-attach later.
	startedAt := time.Now()
	ws.registerExecutionRecord(execID, startedAt)

	// Emit an initial high-level phase so the UI can show a friendly message
	// even before raw logs arrive. For pure shell executions this is generic,
	// but K8s/Helm callers can build richer phases on top of this type.
	initialPhase := ExecutionPhaseMessage{
		Type:        "phase",
		ExecutionID: execID,
		Timestamp:   startedAt,
		Name:        "Running command",
		Detail:      strings.TrimSpace(strings.Join(append([]string{req.Command}, req.Args...), " ")),
		Mode:        mode,
		SourceLabel: sourceLabel,
	}
	if err := writeJSON(initialPhase); err != nil {
		log.Printf("failed to send initial execution phase: %v", err)
	}

	// Build the command
	cmd := exec.Command(req.Command, req.Args...)
	if strings.TrimSpace(req.WorkingDir) != "" {
		cmd.Dir = req.WorkingDir
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Error:       "Failed to attach to stdout",
			RawError:    err.Error(),
		}
		_ = writeJSON(msg)
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Error:       "Failed to attach to stderr",
			RawError:    err.Error(),
		}
		_ = writeJSON(msg)
		return
	}

	if err := cmd.Start(); err != nil {
		now := time.Now()
		msg := ExecutionCompleteMessage{
			Type:        "error",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Error:       "Failed to start command",
			RawError:    err.Error(),
		}
		_ = writeJSON(msg)
		return
	}

	acc := newResourceChangeAccumulator()
	var wg sync.WaitGroup
	wg.Add(2)

	streamLines := func(reader io.Reader, streamName string) {
		defer wg.Done()

		scanner := bufio.NewScanner(reader)
		// Increase the maximum token size to handle long lines
		buf := make([]byte, 0, 64*1024)
		scanner.Buffer(buf, 1024*1024)

		for scanner.Scan() {
			rawLine := scanner.Text()
			masked := maskSecrets(rawLine)
			acc.noteLine(masked)

			lineTimestamp := time.Now()
			// Store in the in-memory execution log buffer for history / re-attachment.
			ws.appendExecutionLogLine(execID, ExecutionLogLine{
				Timestamp: lineTimestamp,
				Stream:    streamName,
				Text:      masked,
			})

			msg := ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   lineTimestamp,
				Stream:      streamName,
				Text:        masked,
				Mode:        mode,
				SourceLabel: sourceLabel,
			}
			if err := writeJSON(msg); err != nil {
				log.Printf("execution stream write error (%s): %v", streamName, err)
				return
			}
		}

		if err := scanner.Err(); err != nil && !errors.Is(err, io.EOF) {
			log.Printf("execution stream scanner error (%s): %v", streamName, err)
		}
	}

	go streamLines(stdout, "stdout")
	go streamLines(stderr, "stderr")

	// Wait for all output to be consumed, then wait for the command to exit.
	go func() {
		wg.Wait()
		err := cmd.Wait()
		completedAt := time.Now()

		status := ExecutionStatusSucceeded
		exitCode := extractExitCode(err)
		var errorText string
		if err != nil {
			status = ExecutionStatusFailed
			errorText = fmt.Sprintf("Command exited with error (code %d)", exitCode)
		}

		summary := &ExecutionSummary{
			StartedAt:   startedAt,
			CompletedAt: completedAt,
			DurationMs:  completedAt.Sub(startedAt).Milliseconds(),
			ExitCode:    exitCode,
			Resources:   acc.snapshot(),
		}

		msg := ExecutionCompleteMessage{
			Type:        "complete",
			ExecutionID: execID,
			Timestamp:   completedAt,
			Status:      status,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Summary:     summary,
			Error:       errorText,
			RawError:    "",
		}
		if err != nil {
			msg.RawError = err.Error()
		}

		if err := writeJSON(msg); err != nil {
			log.Printf("execution completion write error: %v", err)
		}

		// Persist minimal execution record for history / re-attachment.
		ws.finalizeExecutionRecord(execID, status, summary)
	}()

	// Control loop: handle client messages like "cancel" without tying process
	// lifetime directly to the WebSocket connection. If the socket disconnects,
	// the process is allowed to complete normally unless explicitly cancelled.
	for {
		_, controlData, err := conn.ReadMessage()
		if err != nil {
			// Client disconnected - we deliberately DO NOT kill the underlying
			// process here to allow for re-attachment. It will exit on its own.
			break
		}

		var ctrl struct {
			Type        string `json:"type"`
			ExecutionID string `json:"executionId"`
		}
		if err := json.Unmarshal(controlData, &ctrl); err != nil {
			continue
		}
		if ctrl.ExecutionID != "" && ctrl.ExecutionID != execID {
			// Ignore messages for other executions on this socket
			continue
		}

		switch ctrl.Type {
		case "cancel":
			if cmd.Process != nil {
				if err := cmd.Process.Kill(); err != nil {
					log.Printf("failed to cancel execution %s: %v", execID, err)
				} else {
					log.Printf("execution %s cancelled by client", execID)
				}
			}
		default:
			// Unknown control message type - ignore for now
		}
	}
}

// registerExecutionRecord creates a new in-memory execution record so recent
// executions can be listed even if the UI refreshes.
func (ws *WebServer) registerExecutionRecord(execID string, startedAt time.Time) {
	ws.execMu.Lock()
	defer ws.execMu.Unlock()

	if ws.executions == nil {
		ws.executions = make(map[string]*ExecutionRecord)
	}

	ws.executions[execID] = &ExecutionRecord{
		ExecutionID: execID,
		Status:      ExecutionStatusRunning,
		StartedAt:   startedAt,
		LastLineAt:  startedAt,
	}
}

// finalizeExecutionRecord updates the execution record with its final status
// and summary once the underlying command has completed.
func (ws *WebServer) finalizeExecutionRecord(execID string, status ExecutionStatus, summary *ExecutionSummary) {
	ws.execMu.Lock()
	defer ws.execMu.Unlock()

	rec, ok := ws.executions[execID]
	if !ok {
		return
	}

	rec.Status = status
	rec.Summary = summary
	if summary != nil {
		rec.LastLineAt = summary.CompletedAt
	}
}

// appendExecutionLogLine appends a log line to the in-memory buffer for an
// execution, trimming to a fixed limit to avoid unbounded growth. It also
// updates the LastLineAt timestamp on the corresponding ExecutionRecord.
func (ws *WebServer) appendExecutionLogLine(execID string, line ExecutionLogLine) {
	ws.execMu.Lock()
	defer ws.execMu.Unlock()

	if ws.execLogs == nil {
		ws.execLogs = make(map[string][]ExecutionLogLine)
	}

	buf := ws.execLogs[execID]
	buf = append(buf, line)
	limit := ws.execLogLimit
	if limit <= 0 {
		limit = 500
	}
	if len(buf) > limit {
		buf = buf[len(buf)-limit:]
	}
	ws.execLogs[execID] = buf

	if rec, ok := ws.executions[execID]; ok {
		rec.LastLineAt = line.Timestamp
	}
}

// handleExecutionList returns a list of recent executions for the current
// process lifetime. This is intentionally lightweight and only uses the
// in-memory store; a future enhancement could back this with a disk store.
func (ws *WebServer) handleExecutionList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	ws.execMu.RLock()
	records := make([]*ExecutionRecord, 0, len(ws.executions))
	for _, rec := range ws.executions {
		records = append(records, rec)
	}
	ws.execMu.RUnlock()

	sort.Slice(records, func(i, j int) bool {
		return records[i].StartedAt.After(records[j].StartedAt)
	})
	if len(records) > limit {
		records = records[:limit]
	}

	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"executions": records,
	}); err != nil {
		log.Printf("failed to encode execution list: %v", err)
	}
}

// handleExecutionLogs returns the stored log lines for a specific execution.
// This is useful when the UI refreshes and wants to show recent output without
// re-running the underlying command.
func (ws *WebServer) handleExecutionLogs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	execID := r.URL.Query().Get("executionId")
	if strings.TrimSpace(execID) == "" {
		http.Error(w, "executionId is required", http.StatusBadRequest)
		return
	}

	ws.execMu.RLock()
	lines, ok := ws.execLogs[execID]
	ws.execMu.RUnlock()

	if !ok {
		lines = []ExecutionLogLine{}
	}

	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"executionId": execID,
		"logs":        lines,
	}); err != nil {
		log.Printf("failed to encode execution logs: %v", err)
	}
}

// runApplyYAMLExecution handles "apply-yaml" executions using the Kubernetes
// client directly (no kubectl binary). It streams high-level phase and line
// events and produces a structured summary on completion.
func (ws *WebServer) runApplyYAMLExecution(
	r *http.Request,
	execID string,
	req *ExecutionStartRequest,
	mode ExecutionMode,
	sourceLabel string,
	writeJSON func(v interface{}) error,
) {
	startedAt := time.Now()
	ws.registerExecutionRecord(execID, startedAt)

	// Initial state event
	stateMsg := ExecutionStateMessage{
		Type:        "state",
		ExecutionID: execID,
		Timestamp:   startedAt,
		Status:      ExecutionStatusRunning,
		Mode:        mode,
		SourceLabel: sourceLabel,
		Label:       req.Label,
	}
	if err := writeJSON(stateMsg); err != nil {
		log.Printf("failed to send apply-yaml state: %v", err)
		return
	}

	// Phase: validating manifest
	phaseValidate := ExecutionPhaseMessage{
		Type:        "phase",
		ExecutionID: execID,
		Timestamp:   startedAt,
		Name:        "Validating manifest…",
		Detail:      "Parsing YAML and validating resource schema",
		Mode:        mode,
		SourceLabel: sourceLabel,
	}
	_ = writeJSON(phaseValidate)

	ns := strings.TrimSpace(req.Namespace)
	if ns == "" || ns == "All Namespaces" {
		ns = ws.app.namespace
	}

	yamlBody := strings.TrimSpace(req.YAML)
	if yamlBody == "" {
		now := time.Now()
		errMsg := "YAML manifest is empty"
		_ = writeJSON(ExecutionLineMessage{
			Type:        "line",
			ExecutionID: execID,
			Timestamp:   now,
			Stream:      "stderr",
			Text:        errMsg,
			Mode:        mode,
			SourceLabel: sourceLabel,
		})
		summary := &ExecutionSummary{
			StartedAt:   startedAt,
			CompletedAt: now,
			DurationMs:  now.Sub(startedAt).Milliseconds(),
			ExitCode:    1,
			Resources:   nil,
		}
		_ = writeJSON(ExecutionCompleteMessage{
			Type:        "complete",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Summary:     summary,
			Error:       errMsg,
		})
		ws.finalizeExecutionRecord(execID, ExecutionStatusFailed, summary)
		return
	}

	if ws.app.clientset == nil {
		now := time.Now()
		errMsg := "Kubernetes client is not initialized (not connected to a cluster)"
		_ = writeJSON(ExecutionLineMessage{
			Type:        "line",
			ExecutionID: execID,
			Timestamp:   now,
			Stream:      "stderr",
			Text:        errMsg,
			Mode:        mode,
			SourceLabel: sourceLabel,
		})
		summary := &ExecutionSummary{
			StartedAt:   startedAt,
			CompletedAt: now,
			DurationMs:  now.Sub(startedAt).Milliseconds(),
			ExitCode:    1,
		}
		_ = writeJSON(ExecutionCompleteMessage{
			Type:        "complete",
			ExecutionID: execID,
			Timestamp:   now,
			Status:      ExecutionStatusFailed,
			Mode:        mode,
			SourceLabel: sourceLabel,
			Summary:     summary,
			Error:       errMsg,
		})
		ws.finalizeExecutionRecord(execID, ExecutionStatusFailed, summary)
		return
	}

	// For now, support a set of core resource types. Additional resource types
	// can re-use this pattern with appropriate client calls.
	resource := strings.ToLower(strings.TrimSpace(req.Resource))

	ctx, cancel := context.WithCancel(ws.app.ctx)
	defer cancel()

	// Allow cancellation via WebSocket "cancel" message in a best-effort way
	// by watching for context cancellation in the main apply path.

	var (
		exitCode int
		status   = ExecutionStatusSucceeded
		errText  string
		changed  ExecutionResourcesChanged
	)

	// Phase: applying resources
	phaseApply := ExecutionPhaseMessage{
		Type:        "phase",
		ExecutionID: execID,
		Timestamp:   time.Now(),
		Name:        "Applying resources…",
		Detail:      "",
		Mode:        mode,
		SourceLabel: sourceLabel,
	}
	_ = writeJSON(phaseApply)

	switch resource {
	case "deployments", "deployment":
		var dep appsv1.Deployment
		if err := yaml.Unmarshal([]byte(yamlBody), &dep); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Deployment YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if dep.Namespace == "" {
				dep.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}

			applied, err := ws.app.clientset.AppsV1().Deployments(dep.Namespace).Update(ctx, &dep, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("deployment.apps/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "services", "service":
		var svc corev1.Service
		if err := yaml.Unmarshal([]byte(yamlBody), &svc); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Service YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if svc.Namespace == "" {
				svc.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}

			applied, err := ws.app.clientset.CoreV1().Services(svc.Namespace).Update(ctx, &svc, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("service/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "configmaps", "configmap":
		var cm corev1.ConfigMap
		if err := yaml.Unmarshal([]byte(yamlBody), &cm); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse ConfigMap YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if cm.Namespace == "" {
				cm.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}

			applied, err := ws.app.clientset.CoreV1().ConfigMaps(cm.Namespace).Update(ctx, &cm, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("configmap/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "secrets", "secret":
		var sec corev1.Secret
		if err := yaml.Unmarshal([]byte(yamlBody), &sec); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Secret YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if sec.Namespace == "" {
				sec.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}

			applied, err := ws.app.clientset.CoreV1().Secrets(sec.Namespace).Update(ctx, &sec, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("secret/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "pods", "pod":
		var pod corev1.Pod
		if err := yaml.Unmarshal([]byte(yamlBody), &pod); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Pod YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if pod.Namespace == "" {
				pod.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}

			applied, err := ws.app.clientset.CoreV1().Pods(pod.Namespace).Update(ctx, &pod, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("pod/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "pdb", "poddisruptionbudget", "poddisruptionbudgets":
		var pdb policyv1.PodDisruptionBudget
		if err := yaml.Unmarshal([]byte(yamlBody), &pdb); err != nil {
			// Try v1beta1 if v1 fails
			var pdbV1Beta1 policyv1beta1.PodDisruptionBudget
			if errV1Beta1 := yaml.Unmarshal([]byte(yamlBody), &pdbV1Beta1); errV1Beta1 != nil {
				now := time.Now()
				text := fmt.Sprintf("Failed to parse PodDisruptionBudget YAML: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				if pdbV1Beta1.Namespace == "" {
					pdbV1Beta1.Namespace = ns
				}
				opts := metav1.UpdateOptions{}
				if mode == ExecutionModeDryRun || req.DryRun {
					opts.DryRun = []string{metav1.DryRunAll}
				}
				applied, err := ws.app.clientset.PolicyV1beta1().PodDisruptionBudgets(pdbV1Beta1.Namespace).Update(ctx, &pdbV1Beta1, opts)
				now := time.Now()
				if err != nil {
					text := fmt.Sprintf("Apply failed: %v", err)
					_ = writeJSON(ExecutionLineMessage{
						Type:        "line",
						ExecutionID: execID,
						Timestamp:   now,
						Stream:      "stderr",
						Text:        maskSecrets(text),
						Mode:        mode,
						SourceLabel: sourceLabel,
					})
					exitCode = 1
					status = ExecutionStatusFailed
					errText = text
				} else {
					lineText := fmt.Sprintf("poddisruptionbudget.policy/%s %s",
						applied.Name,
						func() string {
							if mode == ExecutionModeDryRun || req.DryRun {
								return "validated (dry-run, no changes persisted)"
							}
							return "updated"
						}(),
					)
					_ = writeJSON(ExecutionLineMessage{
						Type:        "line",
						ExecutionID: execID,
						Timestamp:   now,
						Stream:      "stdout",
						Text:        lineText,
						Mode:        mode,
						SourceLabel: sourceLabel,
					})
					if mode == ExecutionModeDryRun || req.DryRun {
						changed.Unchanged++
					} else {
						changed.Configured++
					}
				}
			}
		} else {
			if pdb.Namespace == "" {
				pdb.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.PolicyV1().PodDisruptionBudgets(pdb.Namespace).Update(ctx, &pdb, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("poddisruptionbudget.policy/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "hpa", "horizontalpodautoscaler", "horizontalpodautoscalers":
		var hpa autoscalingv2.HorizontalPodAutoscaler
		if err := yaml.Unmarshal([]byte(yamlBody), &hpa); err != nil {
			// Try v1 if v2 fails
			var hpaV1 autoscalingv1.HorizontalPodAutoscaler
			if errV1 := yaml.Unmarshal([]byte(yamlBody), &hpaV1); errV1 != nil {
				now := time.Now()
				text := fmt.Sprintf("Failed to parse HPA YAML: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				if hpaV1.Namespace == "" {
					hpaV1.Namespace = ns
				}
				opts := metav1.UpdateOptions{}
				if mode == ExecutionModeDryRun || req.DryRun {
					opts.DryRun = []string{metav1.DryRunAll}
				}
				applied, err := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(hpaV1.Namespace).Update(ctx, &hpaV1, opts)
				now := time.Now()
				if err != nil {
					text := fmt.Sprintf("Apply failed: %v", err)
					_ = writeJSON(ExecutionLineMessage{
						Type:        "line",
						ExecutionID: execID,
						Timestamp:   now,
						Stream:      "stderr",
						Text:        maskSecrets(text),
						Mode:        mode,
						SourceLabel: sourceLabel,
					})
					exitCode = 1
					status = ExecutionStatusFailed
					errText = text
				} else {
					lineText := fmt.Sprintf("horizontalpodautoscaler.autoscaling/%s %s",
						applied.Name,
						func() string {
							if mode == ExecutionModeDryRun || req.DryRun {
								return "validated (dry-run, no changes persisted)"
							}
							return "updated"
						}(),
					)
					_ = writeJSON(ExecutionLineMessage{
						Type:        "line",
						ExecutionID: execID,
						Timestamp:   now,
						Stream:      "stdout",
						Text:        lineText,
						Mode:        mode,
						SourceLabel: sourceLabel,
					})
					if mode == ExecutionModeDryRun || req.DryRun {
						changed.Unchanged++
					} else {
						changed.Configured++
					}
				}
			}
		} else {
			if hpa.Namespace == "" {
				hpa.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.AutoscalingV2().HorizontalPodAutoscalers(hpa.Namespace).Update(ctx, &hpa, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("horizontalpodautoscaler.autoscaling/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "ingress", "ingresses":
		var ing networkingv1.Ingress
		if err := yaml.Unmarshal([]byte(yamlBody), &ing); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Ingress YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if ing.Namespace == "" {
				ing.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.NetworkingV1().Ingresses(ing.Namespace).Update(ctx, &ing, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("ingress.networking.k8s.io/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "networkpolicy", "networkpolicies":
		var np networkingv1.NetworkPolicy
		if err := yaml.Unmarshal([]byte(yamlBody), &np); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse NetworkPolicy YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if np.Namespace == "" {
				np.Namespace = ns
			}
		}
	case "namespaces", "namespace":
		var nsObj corev1.Namespace
		if err := yaml.Unmarshal([]byte(yamlBody), &nsObj); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Namespace YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.CoreV1().Namespaces().Update(ctx, &nsObj, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("namespace/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "jobs", "job":
		var job batchv1.Job
		if err := yaml.Unmarshal([]byte(yamlBody), &job); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse Job YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if job.Namespace == "" {
				job.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.BatchV1().Jobs(job.Namespace).Update(ctx, &job, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("job.batch/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "statefulsets", "statefulset":
		var ss appsv1.StatefulSet
		if err := yaml.Unmarshal([]byte(yamlBody), &ss); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse StatefulSet YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if ss.Namespace == "" {
				ss.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.AppsV1().StatefulSets(ss.Namespace).Update(ctx, &ss, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("statefulset.apps/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "daemonsets", "daemonset":
		var ds appsv1.DaemonSet
		if err := yaml.Unmarshal([]byte(yamlBody), &ds); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse DaemonSet YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if ds.Namespace == "" {
				ds.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.AppsV1().DaemonSets(ds.Namespace).Update(ctx, &ds, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("daemonset.apps/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "pv", "pvs", "persistentvolume", "persistentvolumes":
		var pv corev1.PersistentVolume
		if err := yaml.Unmarshal([]byte(yamlBody), &pv); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse PersistentVolume YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.CoreV1().PersistentVolumes().Update(ctx, &pv, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("persistentvolume/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "pvc", "pvcs", "persistentvolumeclaim", "persistentvolumeclaims":
		var pvc corev1.PersistentVolumeClaim
		if err := yaml.Unmarshal([]byte(yamlBody), &pvc); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse PersistentVolumeClaim YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if pvc.Namespace == "" {
				pvc.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.CoreV1().PersistentVolumeClaims(pvc.Namespace).Update(ctx, &pvc, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("persistentvolumeclaim/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "storageclasses", "storageclass":
		var sc storagev1.StorageClass
		if err := yaml.Unmarshal([]byte(yamlBody), &sc); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse StorageClass YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.StorageV1().StorageClasses().Update(ctx, &sc, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("storageclass.storage.k8s.io/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "serviceaccounts", "serviceaccount":
		var sa corev1.ServiceAccount
		if err := yaml.Unmarshal([]byte(yamlBody), &sa); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse ServiceAccount YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if sa.Namespace == "" {
				sa.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.CoreV1().ServiceAccounts(sa.Namespace).Update(ctx, &sa, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("serviceaccount/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	case "cronjobs", "cronjob":
		var cj batchv1.CronJob
		if err := yaml.Unmarshal([]byte(yamlBody), &cj); err != nil {
			now := time.Now()
			text := fmt.Sprintf("Failed to parse CronJob YAML: %v", err)
			_ = writeJSON(ExecutionLineMessage{
				Type:        "line",
				ExecutionID: execID,
				Timestamp:   now,
				Stream:      "stderr",
				Text:        maskSecrets(text),
				Mode:        mode,
				SourceLabel: sourceLabel,
			})
			exitCode = 1
			status = ExecutionStatusFailed
			errText = text
		} else {
			if cj.Namespace == "" {
				cj.Namespace = ns
			}
			opts := metav1.UpdateOptions{}
			if mode == ExecutionModeDryRun || req.DryRun {
				opts.DryRun = []string{metav1.DryRunAll}
			}
			applied, err := ws.app.clientset.BatchV1().CronJobs(cj.Namespace).Update(ctx, &cj, opts)
			now := time.Now()
			if err != nil {
				text := fmt.Sprintf("Apply failed: %v", err)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stderr",
					Text:        maskSecrets(text),
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				exitCode = 1
				status = ExecutionStatusFailed
				errText = text
			} else {
				lineText := fmt.Sprintf("cronjob.batch/%s %s",
					applied.Name,
					func() string {
						if mode == ExecutionModeDryRun || req.DryRun {
							return "validated (dry-run, no changes persisted)"
						}
						return "updated"
					}(),
				)
				_ = writeJSON(ExecutionLineMessage{
					Type:        "line",
					ExecutionID: execID,
					Timestamp:   now,
					Stream:      "stdout",
					Text:        lineText,
					Mode:        mode,
					SourceLabel: sourceLabel,
				})
				if mode == ExecutionModeDryRun || req.DryRun {
					changed.Unchanged++
				} else {
					changed.Configured++
				}
			}
		}
	}

	finalizeApplyYAMLExecution(startedAt, exitCode, changed, status, execID, mode, sourceLabel, errText, writeJSON, ws)
}

func finalizeApplyYAMLExecution(
	startedAt time.Time,
	exitCode int,
	changed ExecutionResourcesChanged,
	status ExecutionStatus,
	execID string,
	mode ExecutionMode,
	sourceLabel string,
	errText string,
	writeJSON func(v interface{}) error,
	ws *WebServer,
) {
	completedAt := time.Now()
	summary := &ExecutionSummary{
		StartedAt:   startedAt,
		CompletedAt: completedAt,
		DurationMs:  completedAt.Sub(startedAt).Milliseconds(),
		ExitCode:    exitCode,
	}
	if changed.Created != 0 || changed.Configured != 0 || changed.Unchanged != 0 || changed.Deleted != 0 {
		summary.Resources = &changed
	}

	completeMsg := ExecutionCompleteMessage{
		Type:        "complete",
		ExecutionID: execID,
		Timestamp:   completedAt,
		Status:      status,
		Mode:        mode,
		SourceLabel: sourceLabel,
		Summary:     summary,
	}
	if errText != "" {
		completeMsg.Error = errText
	}

	if err := writeJSON(completeMsg); err != nil {
		log.Printf("apply-yaml completion write error: %v", err)
	}
	ws.finalizeExecutionRecord(execID, status, summary)
}

// authorizeExecution applies lightweight namespace and RBAC checks for
// executions that represent Kubernetes-equivalent operations (kubectl, Helm,
// or direct API calls). For pure shell executions, this is intentionally
// permissive to avoid breaking local workflows.
func (ws *WebServer) authorizeExecution(r *http.Request, req *ExecutionStartRequest, execID string) error {
	// Only apply extra checks when the caller has indicated that this
	// execution is Kubernetes-equivalent. The ExecutionPanel demo uses
	// generic shell commands with KubernetesEquivalent=false.
	if !req.KubernetesEquivalent {
		return nil
	}

	// Enforce namespace scoping by default for K8s-equivalent operations.
	ns := strings.TrimSpace(req.Namespace)
	if ns == "" && !req.AllowClusterWide {
		return fmt.Errorf("namespace is required for Kubernetes-equivalent executions unless allowClusterWide is explicitly enabled")
	}

	// If allowClusterWide is true, only permit when IAM is enabled and the
	// user has an admin-style role. This guards against accidental
	// cluster-wide changes from lower-privileged users.
	if ns == "" && req.AllowClusterWide {
		if ws.iam != nil && ws.iam.enabled {
			role := r.Header.Get("X-User-Role")
			if role == "" || Role(role) != RoleAdmin {
				return fmt.Errorf("cluster-wide Kubernetes-equivalent executions are not allowed for this user")
			}
		}
	}

	// If IAM is not configured, we cannot enforce RBAC beyond the above
	// namespace/cluster-wide checks.
	if ws.iam == nil {
		return nil
	}

	// If we have a role header, we can derive permissions. This header is
	// set by IAM's AuthMiddleware when it is in use.
	role := r.Header.Get("X-User-Role")
	if role == "" {
		// When IAM is enabled but AuthMiddleware is not in front of this
		// handler, we skip RBAC enforcement to avoid false negatives and
		// rely on the above namespace/cluster checks.
		return nil
	}

	// Only enforce RBAC when the logical resource/action pair is provided.
	resource := strings.TrimSpace(req.Resource)
	action := strings.TrimSpace(req.Action)
	if resource == "" || action == "" || ns == "" {
		return nil
	}

	// Construct a minimal user with the role so CheckPermission can apply
	// the role-based permission matrix.
	user := &User{
		Role: role,
	}
	if !ws.iam.CheckPermission(user, resource, action, ns) {
		return fmt.Errorf("RBAC: user is not allowed to %s %s in namespace %s", action, resource, ns)
	}

	return nil
}


