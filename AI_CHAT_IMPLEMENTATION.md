# CPU-Safe, Local-First AI Architecture for Healidar/KubeGraf

## Executive Summary

This document defines a **production-grade, CPU-safe AI execution architecture** for Healidar/KubeGraf - a local-first Kubernetes assistant that runs entirely on a developer's laptop.

**Core Principle**: AI inference runs **only on demand**, using **zero CPU when idle**, with **immediate process termination** after use.

---

## 1. Technical Diagnosis: Why Ollama Consumes CPU Idle

### The Problem with Persistent LLM Daemons

Ollama and similar LLM servers consume CPU even when idle because:

1. **Model Memory Mapping**: LLMs keep model weights memory-mapped. The OS periodically accesses these pages for cache management, causing background CPU activity.

2. **HTTP Server Overhead**: The REST API server maintains connection pools, performs health checks, and handles keep-alive connections.

3. **GPU Context Maintenance**: When using GPU acceleration, the CUDA/Metal context remains active, consuming both CPU and GPU resources.

4. **Model Warm-up State**: Ollama pre-loads models to reduce first-inference latency, trading idle CPU for response speed.

### When Ollama IS Appropriate
- Cloud servers with dedicated resources
- Development machines during active AI experimentation
- Batch processing pipelines
- Systems where latency matters more than battery/CPU

### When Ollama is NOT Appropriate
- Local DevOps tools running in background
- Battery-powered laptops
- Tools that run idle most of the time
- Developer productivity tools where CPU spikes are disruptive

**Healidar falls firmly in the "NOT appropriate" category.**

---

## 2. Recommended Architecture: On-Demand Process Spawning

### Architecture Comparison

| Approach | Idle CPU | Startup Latency | Memory | Battery | Recommendation |
|----------|----------|-----------------|--------|---------|----------------|
| Ollama Daemon | 5-15% | 0ms (hot) | 2-8GB constant | Poor | **Not recommended** |
| llama.cpp subprocess | 0% | 500-2000ms | 0 when idle | Excellent | **Recommended** |
| Hybrid (deterministic + AI) | 0% | 50ms (tier 1) | 0 when idle | Excellent | **Strongly recommended** |

### Recommended: Hybrid Deterministic + On-Demand AI

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER QUERY                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: Deterministic Router (0ms, 0 CPU when idle)            │
│  ───────────────────────────────────────────────────────────    │
│  • Regex-based intent matching                                  │
│  • Kubernetes API queries (kubectl-equivalent)                  │
│  • Cached metric lookups                                        │
│  • Pattern-matched troubleshooting rules                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │ Needs AI?         │
                    └─────────┬─────────┘
                              │ Yes
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2: Lightweight Intent Parser (200ms, spawned on demand)   │
│  ───────────────────────────────────────────────────────────    │
│  • Phi-3 Mini / Qwen2-0.5B (Q4 quantized)                       │
│  • Single inference, then process KILLED                        │
│  • Intent classification only                                   │
│  • Resource: 512MB RAM, 2 CPU cores max                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │ Needs deep        │
                    │ reasoning?        │
                    └─────────┬─────────┘
                              │ Yes (rare)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 3: Deep Reasoning Engine (2-10s, explicit user trigger)   │
│  ───────────────────────────────────────────────────────────    │
│  • Llama 3.2 3B / Mistral 7B (Q4 quantized)                     │
│  • Multi-step reasoning with CoT                                │
│  • Process spawned → inference → KILLED                         │
│  • Resource: 4GB RAM, 4 CPU cores max                           │
│  • REQUIRES user confirmation before spawn                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tiered Intelligence Model

### Tier 1: Deterministic Kubernetes Logic (No AI)

**CPU Usage**: 0% when idle, <1% during query
**Latency**: <50ms
**Reliability**: 100% deterministic

**Handles:**
- "Show pods in namespace X" → `kubectl get pods -n X`
- "What's the status of deployment Y" → Direct API query
- "List failing pods" → Status field filtering
- "Show OOMKilled containers" → Event pattern match
- "Get node memory usage" → Metrics API query
- "Restart deployment Z" → Pre-defined action

**Implementation:**
```go
type DeterministicRouter struct {
    patterns []IntentPattern
    k8sClient kubernetes.Interface
}

type IntentPattern struct {
    Regex    *regexp.Regexp
    Handler  func(ctx context.Context, matches []string) (*Response, error)
    Category string
}

var defaultPatterns = []IntentPattern{
    {
        Regex:    regexp.MustCompile(`(?i)^(show|list|get)\s+pods?\s+in\s+(\S+)$`),
        Handler:  handleListPods,
        Category: "pod_list",
    },
    {
        Regex:    regexp.MustCompile(`(?i)^(show|get)\s+oom(killed)?\s+(containers?|pods?)$`),
        Handler:  handleOOMKilled,
        Category: "incident_query",
    },
    // 50+ patterns covering 90% of queries
}
```

### Tier 2: Lightweight Intent Parser (On-Demand Small LLM)

**CPU Usage**: 0% when idle, 100% for 200-500ms during inference
**Latency**: 200-500ms
**Reliability**: 95%+ for intent classification

**Handles:**
- Ambiguous queries: "Something's wrong with my app"
- Complex filtering: "Find pods that restarted more than 3 times in the last hour"
- Natural phrasing: "Why is my service slow?"

**Model Selection:**
- **Primary**: Phi-3 Mini 3.8B (Q4_K_M) - 2.2GB, excellent instruction following
- **Fallback**: Qwen2-0.5B (Q4) - 400MB, ultra-fast for simple classification

**Process Lifecycle:**
```
User Query → Spawn llama.cpp → Load Model → Single Inference → SIGKILL → Return Result
            └──────── 200-500ms total ────────┘
```

### Tier 3: Deep Reasoning Engine (Rare, Expensive)

**CPU Usage**: 0% when idle, 100% for 2-10s during inference
**Latency**: 2-10 seconds
**Reliability**: 85%+ (requires validation)

**Handles:**
- Root cause analysis: "Why did this deployment fail?"
- Multi-resource correlation: "What caused the cascade failure?"
- Explanation generation: "Explain this error in detail"
- Healing plan generation: "How do I fix this?"

**Requires User Confirmation:**
```
┌────────────────────────────────────────────────────────────┐
│  This query requires deep AI analysis.                     │
│                                                            │
│  Estimated time: 5-10 seconds                              │
│  Resource usage: 4GB RAM, high CPU                         │
│                                                            │
│  [Run Analysis]  [Try Simpler Query]  [Cancel]             │
└────────────────────────────────────────────────────────────┘
```

---

## 4. Runtime Execution Flow

### Complete Request Flow

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│   User   │────▶│    UI    │────▶│   Backend    │────▶│   Decision   │
│  Query   │     │  (Web)   │     │   (Go API)   │     │    Engine    │
└──────────┘     └──────────┘     └──────────────┘     └──────────────┘
                                                              │
                        ┌─────────────────────────────────────┼─────────────────┐
                        │                                     │                 │
                        ▼                                     ▼                 ▼
               ┌────────────────┐                   ┌────────────────┐  ┌────────────────┐
               │    TIER 1      │                   │    TIER 2      │  │    TIER 3      │
               │  Deterministic │                   │  Light LLM     │  │  Deep LLM      │
               │  (instant)     │                   │  (200-500ms)   │  │  (2-10s)       │
               └────────────────┘                   └────────────────┘  └────────────────┘
                        │                                     │                 │
                        │                           ┌─────────┴─────────┐       │
                        │                           │   Spawn Process   │       │
                        │                           │   ┌───────────┐   │       │
                        │                           │   │ llama.cpp │   │       │
                        │                           │   └───────────┘   │       │
                        │                           │   Set Limits:     │       │
                        │                           │   - 30s timeout   │       │
                        │                           │   - 2GB RAM max   │       │
                        │                           │   - 2 CPU cores   │       │
                        │                           └─────────┬─────────┘       │
                        │                                     │                 │
                        │                           ┌─────────┴─────────┐       │
                        │                           │   Read stdout     │       │
                        │                           │   Parse JSON      │       │
                        │                           │   SIGKILL process │       │
                        │                           └─────────┬─────────┘       │
                        │                                     │                 │
                        └─────────────────┬───────────────────┴─────────────────┘
                                          │
                                          ▼
                               ┌────────────────────┐
                               │   Format Response  │
                               │   + Safety Check   │
                               └────────────────────┘
                                          │
                               ┌──────────┴──────────┐
                               │  Action Required?   │
                               └──────────┬──────────┘
                                          │ Yes
                                          ▼
                               ┌────────────────────┐
                               │  USER CONFIRMATION │
                               │  GATE (required)   │
                               └────────────────────┘
                                          │
                                          ▼
                               ┌────────────────────┐
                               │  Execute Action    │
                               │  Return Result     │
                               └────────────────────┘
```

### Timeout and Resource Enforcement

```go
const (
    Tier2Timeout    = 30 * time.Second
    Tier2MemoryMax  = 2 * 1024 * 1024 * 1024  // 2GB
    Tier2CPUCores   = 2

    Tier3Timeout    = 120 * time.Second
    Tier3MemoryMax  = 6 * 1024 * 1024 * 1024  // 6GB
    Tier3CPUCores   = 4
)
```

### Failure Handling

| Failure Type | Action |
|--------------|--------|
| Process timeout | SIGKILL, return fallback response |
| OOM killed | Return "Query too complex, try simpler" |
| Model not found | Fall back to Tier 1 deterministic |
| Parse error | Return raw output with warning |
| Network error | Cache last known state |

---

## 5. Go-Based Implementation Strategy

### Core Process Manager

```go
package ai

import (
    "context"
    "encoding/json"
    "os/exec"
    "syscall"
    "time"
)

type ProcessManager struct {
    modelPath    string
    maxProcesses int
    semaphore    chan struct{}
}

type InferenceRequest struct {
    Prompt      string
    MaxTokens   int
    Temperature float64
    Tier        int
}

type InferenceResult struct {
    Response string
    Latency  time.Duration
    Tier     int
    Error    error
}

func (pm *ProcessManager) RunInference(ctx context.Context, req InferenceRequest) (*InferenceResult, error) {
    // Acquire semaphore (limit concurrent processes)
    select {
    case pm.semaphore <- struct{}{}:
        defer func() { <-pm.semaphore }()
    case <-ctx.Done():
        return nil, ctx.Err()
    }

    start := time.Now()

    // Build command with resource limits
    cmd := exec.CommandContext(ctx, "llama-cli",
        "-m", pm.modelPath,
        "-p", req.Prompt,
        "-n", fmt.Sprint(req.MaxTokens),
        "--temp", fmt.Sprint(req.Temperature),
        "-f", "json",
    )

    // Set process group for clean termination
    cmd.SysProcAttr = &syscall.SysProcAttr{
        Setpgid: true,
    }

    // Capture output
    output, err := cmd.Output()

    // ALWAYS kill process group (even on success)
    if cmd.Process != nil {
        syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
    }

    if err != nil {
        return &InferenceResult{Error: err, Tier: req.Tier}, err
    }

    var response struct {
        Content string `json:"content"`
    }
    json.Unmarshal(output, &response)

    return &InferenceResult{
        Response: response.Content,
        Latency:  time.Since(start),
        Tier:     req.Tier,
    }, nil
}
```

### Resource Limiter (Linux cgroups / macOS sandbox)

```go
func (pm *ProcessManager) setResourceLimits(cmd *exec.Cmd, tier int) {
    var memLimit, cpuLimit int64

    switch tier {
    case 2:
        memLimit = 2 * 1024 * 1024 * 1024  // 2GB
        cpuLimit = 200000                   // 2 cores (cgroup v2)
    case 3:
        memLimit = 6 * 1024 * 1024 * 1024  // 6GB
        cpuLimit = 400000                   // 4 cores
    }

    // On Linux, use cgroups v2
    if runtime.GOOS == "linux" {
        cgroupPath := fmt.Sprintf("/sys/fs/cgroup/healidar-%d", cmd.Process.Pid)
        os.WriteFile(cgroupPath+"/memory.max", []byte(fmt.Sprint(memLimit)), 0644)
        os.WriteFile(cgroupPath+"/cpu.max", []byte(fmt.Sprintf("%d 100000", cpuLimit)), 0644)
    }

    // On macOS, use sandbox-exec (limited) or rely on process timeout
    if runtime.GOOS == "darwin" {
        // macOS doesn't have good cgroup equivalents
        // Use timeout + SIGKILL as primary control
    }
}
```

### Deterministic Router

```go
type QueryRouter struct {
    patterns   []IntentPattern
    k8sClient  kubernetes.Interface
    aiManager  *ProcessManager
}

func (r *QueryRouter) Route(ctx context.Context, query string) (*Response, error) {
    // TIER 1: Try deterministic patterns first
    for _, pattern := range r.patterns {
        if matches := pattern.Regex.FindStringSubmatch(query); matches != nil {
            return pattern.Handler(ctx, matches)
        }
    }

    // TIER 2: Fall back to lightweight LLM for intent parsing
    intent, err := r.classifyIntent(ctx, query)
    if err != nil {
        return r.fallbackResponse(query), nil
    }

    // Execute based on classified intent
    switch intent.Category {
    case "pod_query":
        return r.handlePodQuery(ctx, intent)
    case "troubleshoot":
        // TIER 3: Needs deep reasoning - require confirmation
        return r.requestDeepAnalysis(ctx, query, intent)
    default:
        return r.handleGenericQuery(ctx, intent)
    }
}
```

---

## 6. Model Selection & Optimization

### Recommended Models by Tier

| Tier | Model | Size | Quantization | RAM Usage | Use Case |
|------|-------|------|--------------|-----------|----------|
| 2 | Phi-3 Mini 3.8B | 2.2GB | Q4_K_M | 2.5GB | Intent classification, simple queries |
| 2 | Qwen2-0.5B | 400MB | Q4_0 | 600MB | Ultra-fast fallback |
| 3 | Llama 3.2 3B | 2.0GB | Q4_K_M | 3GB | Balanced reasoning |
| 3 | Mistral 7B | 4.1GB | Q4_K_M | 5GB | Complex analysis |
| 3 | CodeLlama 7B | 4.1GB | Q4_K_M | 5GB | YAML/config generation |

### Quantization Strategy

```
Production Recommendation:
- Always use Q4_K_M (4-bit quantization with K-quants)
- Provides 90%+ accuracy retention
- 4x smaller than FP16
- 2x faster inference on CPU

Avoid:
- FP16/FP32 (too slow, too large)
- Q2 (too much accuracy loss)
```

### Model Loading Optimization

```go
// DO NOT pre-load models
// Load on-demand, then discard

func (pm *ProcessManager) getModelPath(tier int) string {
    switch tier {
    case 2:
        return "/models/phi-3-mini-q4.gguf"
    case 3:
        return "/models/llama-3.2-3b-q4.gguf"
    }
    return ""
}

// Models are memory-mapped by llama.cpp
// OS will cache hot pages automatically
// No explicit pre-loading needed
```

---

## 7. Product Principles (Non-Negotiable)

### Principle 1: AI Never Runs Idle

```
WRONG:  ollama serve &  (daemon always running)
RIGHT:  spawn → inference → kill → return
```

**Why**: A local DevOps tool should consume zero resources when not actively used. Developers will disable or uninstall tools that drain battery.

### Principle 2: Deterministic Before Probabilistic

```
Query Flow:
1. Try regex pattern match (deterministic)
2. Try cached response (deterministic)
3. Try Kubernetes API (deterministic)
4. ONLY THEN try AI (probabilistic)
```

**Why**: Deterministic responses are faster, more reliable, and don't require user trust calibration. AI should be a last resort, not default.

### Principle 3: Explain Every Action

```go
type HealingAction struct {
    Name        string
    Command     string
    Explanation string   // Required: why this action
    Impact      string   // Required: what will change
    Rollback    string   // Required: how to undo
    Confidence  float64  // Required: AI confidence score
}
```

**Why**: Enterprise users need to understand and justify every automated action. "The AI said so" is not acceptable for production changes.

### Principle 4: User Confirmation for Mutations

```
READ operations:   Execute immediately
WRITE operations:  Require confirmation
DELETE operations: Require confirmation + reason
SCALE operations:  Require confirmation + impact preview
```

**Why**: AI hallucinations happen. A wrong `kubectl delete` can cause outages. Confirmation gates are the last line of defense.

### Principle 5: Fail Safe, Not Fail Open

```go
func (r *QueryRouter) handleError(err error) *Response {
    // NEVER guess or make up information
    return &Response{
        Status:  "error",
        Message: "Unable to determine answer with confidence",
        Suggestion: "Try a more specific query or check cluster status manually",
        FallbackCommands: []string{
            "kubectl get pods -A",
            "kubectl describe pod <name>",
        },
    }
}
```

**Why**: An AI that says "I don't know" is trustworthy. An AI that makes up answers destroys user trust permanently.

---

## 8. Future Evolution

### Phase 1: Current (Local-First)
```
Single Cluster ← Healidar ← Single User
```

### Phase 2: Multi-Cluster Correlation
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Cluster A  │     │  Cluster B  │     │  Cluster C  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Healidar  │
                    │  Correlator │
                    └─────────────┘
                           │
           Uses same on-demand AI architecture
           Aggregates deterministic signals first
           AI only for cross-cluster correlation
```

### Phase 3: AGI-Style Planning Agents
```
User Goal: "Make my application handle 10x traffic"

┌─────────────────────────────────────────────────────────────┐
│  PLANNER AGENT (Tier 3, spawned for planning only)          │
│  ──────────────────────────────────────────────────────     │
│  1. Analyze current resource usage (deterministic)          │
│  2. Identify bottlenecks (AI-assisted)                      │
│  3. Generate scaling plan (AI)                              │
│  4. Validate plan safety (deterministic rules)              │
│  5. Present plan to user for approval                       │
│  6. Execute approved steps (deterministic)                  │
│  7. Monitor results (deterministic)                         │
└─────────────────────────────────────────────────────────────┘

Key: Planner is spawned → runs → killed
     Execution is deterministic
     No persistent agent processes
```

### Architecture Guarantees for Future

| Guarantee | How Maintained |
|-----------|----------------|
| Zero idle CPU | All AI remains process-spawned |
| User control | All mutations require confirmation |
| Explainability | Every AI decision logged with reasoning |
| Reliability | Deterministic always tried first |
| Scalability | Stateless processes, can run N clusters |

---

## 9. API Endpoints

### Updated AI API Design

```
GET  /api/ai/status              # Returns AI capability status (no AI invocation)
POST /api/ai/query               # Smart query - routes to appropriate tier
POST /api/ai/classify            # Tier 2 only - intent classification
POST /api/ai/reason              # Tier 3 only - deep analysis (requires confirmation)
POST /api/ai/execute             # Execute approved action
GET  /api/ai/models              # List available models
POST /api/ai/models/download     # Download a model (background)
```

### Query Request/Response

```json
// Request
{
  "query": "Why are my pods crashing?",
  "context": {
    "namespace": "production",
    "timeRange": "1h"
  },
  "allowTier3": false  // User must explicitly opt-in
}

// Response (Tier 1 - Deterministic)
{
  "tier": 1,
  "latency": "23ms",
  "response": {
    "type": "incident_list",
    "incidents": [
      {
        "pod": "api-server-abc123",
        "reason": "OOMKilled",
        "count": 5,
        "lastSeen": "2025-01-16T10:30:00Z"
      }
    ]
  },
  "actions": [
    {
      "name": "Increase memory limit",
      "command": "kubectl set resources deployment/api-server --limits=memory=2Gi",
      "requiresConfirmation": true
    }
  ]
}

// Response (Tier 3 - Deep Analysis)
{
  "tier": 3,
  "latency": "4.2s",
  "response": {
    "type": "analysis",
    "summary": "Root cause: Memory leak in connection pool",
    "confidence": 0.82,
    "reasoning": [
      "Memory usage grows linearly with request count",
      "No memory release after connection close",
      "Pattern matches known connection pool leak"
    ],
    "evidence": [
      {"type": "metric", "data": "memory growth rate: 50MB/hour"},
      {"type": "log", "data": "connection not returned to pool"}
    ]
  },
  "actions": [
    {
      "name": "Restart with fixed connection pool",
      "command": "kubectl rollout restart deployment/api-server",
      "explanation": "Clears leaked connections, temporary fix",
      "requiresConfirmation": true
    }
  ]
}
```

---

## 10. Implementation Checklist

### Phase 1: Foundation
- [ ] Implement deterministic router with 50+ patterns
- [ ] Create ProcessManager with timeout/kill logic
- [ ] Add resource limiting (timeout-based for macOS, cgroups for Linux)
- [ ] Implement Tier 1 Kubernetes query handlers

### Phase 2: Lightweight AI
- [ ] Integrate llama.cpp as subprocess
- [ ] Add Phi-3 Mini for intent classification
- [ ] Implement Tier 2 routing logic
- [ ] Add model download/management

### Phase 3: Deep Reasoning
- [ ] Add confirmation gate UI
- [ ] Implement Tier 3 with Llama 3.2
- [ ] Add reasoning chain logging
- [ ] Implement action execution with rollback

### Phase 4: Production Hardening
- [ ] Add telemetry for tier usage
- [ ] Implement model caching strategy
- [ ] Add rate limiting per tier
- [ ] Security audit for action execution

---

## Files to Implement/Modify

| File | Purpose |
|------|---------|
| `pkg/ai/router.go` | Deterministic query router |
| `pkg/ai/process_manager.go` | LLM subprocess management |
| `pkg/ai/tier1_handlers.go` | Deterministic Kubernetes handlers |
| `pkg/ai/tier2_classifier.go` | Lightweight intent classification |
| `pkg/ai/tier3_reasoner.go` | Deep analysis engine |
| `pkg/ai/models.go` | Model management and download |
| `web_ai.go` | HTTP API handlers |
| `ui/solid/src/components/AIChat.tsx` | Chat interface |
| `ui/solid/src/components/ConfirmationGate.tsx` | Action confirmation UI |

---

**Status**: Architecture Defined
**Next Step**: Implement Phase 1 (Deterministic Router)
**Priority**: High - Core architecture must be CPU-safe from the start

This architecture ensures Healidar/KubeGraf remains a **developer-friendly tool** that respects system resources while providing powerful AI-assisted Kubernetes management.
