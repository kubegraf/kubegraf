# AI Provider Architecture — Warm-On-Demand & Cloud-Ready

## Overview

KubeGraf's AI system is designed around a single principle: **no user should be blocked from using the tool because they don't have a local AI model installed.**

AI features degrade gracefully:
- With a provider configured → AI-generated analysis and fix recommendations
- Without any provider → deterministic pattern-based fallbacks (always accurate, always available)

---

## Provider Priority Chain

Providers are evaluated in this order. The first available provider is used automatically — no manual selection required.

```
1. Orkas AI Cloud    (ORKAS_API_KEY set)     → future primary, zero setup
2. Anthropic Claude  (ANTHROPIC_API_KEY set) → cloud, requires API key
3. OpenAI            (OPENAI_API_KEY set)    → cloud, requires API key
4. Ollama local      (running on localhost)  → optional, for power users
5. None              (nothing configured)    → pattern-based fallbacks
```

### Startup log

On every startup, KubeGraf logs which provider is active:

```
[AI] Provider: Orkas AI Cloud (https://api.orkas.ai)
[AI] Provider: Anthropic Claude (model: claude-3-haiku-20240307)
[AI] Provider: OpenAI (model: gpt-4o-mini)
[AI] Provider: Ollama local (model: llama3.2:3b @ http://127.0.0.1:11434)
[AI] No AI provider active — AI features will use pattern-based fallbacks.
```

---

## Configuration Reference

All configuration is via environment variables. No config files, no model names baked into code.

### Orkas AI Cloud (future primary)

| Variable | Description |
|---|---|
| `ORKAS_API_KEY` | Your Orkas API key — activates cloud AI, highest priority |
| `ORKAS_API_URL` | Override endpoint (default: `https://api.orkas.ai`) |

When set, all AI analysis is handled by the Orkas cloud service. No local resources consumed. No model selection needed — the cloud picks the best available model automatically.

### Anthropic Claude

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `KUBEGRAF_CLAUDE_MODEL` | Override model (default: `claude-3-haiku-20240307`) |

### OpenAI

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `KUBEGRAF_OPENAI_MODEL` | Override model (default: `gpt-4o-mini`) |

### Ollama (local, optional)

| Variable | Default | Description |
|---|---|---|
| `KUBEGRAF_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server URL |
| `KUBEGRAF_OLLAMA_MODEL` | auto-detected | Pin a specific model; omit to use first installed |
| `KUBEGRAF_AI_KEEP_ALIVE` | `5m` | How long to keep model in memory after last request |
| `KUBEGRAF_AI_AUTOSTART` | `false` | Load model on startup (not recommended — uses memory) |
| `KUBEGRAF_AI_MAX_IDLE_CONNS` | `2` | HTTP connection pool size |
| `KUBEGRAF_AI_IDLE_CONN_TIMEOUT` | `30s` | Idle connection timeout |

**No model name is hardcoded.** KubeGraf queries `/api/tags` to find whatever model you have installed, skipping embedding-only models (`nomic-embed-text`, `bge-*`, `e5-*`, etc.) that cannot generate text.

If multiple models are installed, the first text-generation model is used and a log message lists all candidates:

```
[AI] Multiple Ollama models found: [mistral-nemo:latest llama3.2:3b]
[AI] Auto-selected: mistral-nemo:latest — set KUBEGRAF_OLLAMA_MODEL=<name> to override
```

If the auto-selected model is too large for your machine, pin the smaller one:

```bash
export KUBEGRAF_OLLAMA_MODEL=llama3.2:3b
./kubegraf web --port=3003
```

---

## Why Ollama Is Optional (Not the Default)

Ollama runs models locally, which means:
- **Memory overhead**: even a 3B model requires ~2 GB RAM; 7B+ models need 4–8 GB
- **Not practical for all users**: engineers on constrained laptops should not be penalised
- **Resource competition**: running a model alongside a Kubernetes control plane can cause OOM pressure

For teams, the recommended path is a shared cloud provider (Orkas AI, OpenAI, or Claude) so individual engineers don't need any local setup.

---

## Warm-On-Demand Behaviour (Ollama)

When Ollama is configured, models are loaded lazily — **never on startup**.

| Event | What happens |
|---|---|
| KubeGraf starts | No Ollama call made |
| User clicks "Analyze & Fix" | Model loads on first request |
| Follow-up questions within keep-alive window | Model stays loaded (fast) |
| No requests for `KUBEGRAF_AI_KEEP_ALIVE` duration | Model unloads automatically |

Keep-alive values:
- `5m` (default) — unload after 5 minutes idle
- `0` — unload immediately after every request
- `-1` — never unload

---

## Pattern-Based Fallbacks (No AI Required)

When no AI provider is available, KubeGraf generates fix recommendations deterministically from the incident pattern. These are always accurate because they're based on the known failure signatures.

| Pattern | Fallback recommendations |
|---|---|
| `IMAGE_PULL_FAILURE` | Verify image tag in registry, check pull secret, rollout restart |
| `CRASH_LOOP_BACKOFF` | Inspect previous logs, describe pod events, rollback deployment |
| `OOM_KILLED` | Check memory consumption with `kubectl top`, increase memory limit |
| `NO_READY_ENDPOINTS` | Check backing pods, inspect readiness probe config |
| Any other pattern | Describe resource, check logs, restart workload |

---

## Roadmap

| Timeline | Change |
|---|---|
| **Now** | Ollama local (optional), OpenAI, Claude — user-configured |
| **3–6 months** | Orkas AI Cloud launches — set `ORKAS_API_KEY`, done |
| **Future** | `ORKAS_API_KEY` becomes the default recommended path for all users |

The provider abstraction is already in place (`orderedProviders()` in `ai.go`). When the Orkas cloud service goes live, no KubeGraf code changes are needed — users just set the API key.
