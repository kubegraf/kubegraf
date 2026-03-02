# AI Agent Integration Guide

## Overview

KubeGraf has two distinct AI integration surfaces:

1. **Built-in Incident AI** — used by the Incident Intelligence workspace for "Analyze & Fix" recommendations. Configured via environment variables; auto-selects the best available provider with no manual setup required.
2. **MCP Server** — exposes KubeGraf cluster tools to external AI agents (Claude Desktop, Cursor, etc.) via the Model Context Protocol.

---

## Built-in Incident AI — Provider Architecture

### Provider Priority Chain

KubeGraf evaluates providers in order and uses the **first available** one automatically. No manual selection required.

```
1. Orkas AI Cloud    (ORKAS_API_KEY set)     → future primary, zero setup
2. Anthropic Claude  (ANTHROPIC_API_KEY set) → cloud, requires API key
3. OpenAI            (OPENAI_API_KEY set)    → cloud, requires API key
4. Ollama local      (running on localhost)  → optional, for power users
5. None              (nothing configured)   → pattern-based fallbacks
```

On every startup, KubeGraf logs which provider is active:

```
[AI] Provider: Orkas AI Cloud (https://api.orkas.ai)
[AI] Provider: Anthropic Claude (model: claude-3-haiku-20240307)
[AI] Provider: OpenAI (model: gpt-4o-mini)
[AI] Provider: Ollama local (model: llama3.2:3b @ http://127.0.0.1:11434)
[AI] No AI provider active — AI features will use pattern-based fallbacks.
```

### Configuration

All configuration is via environment variables. No config files, no model names baked into code.

| Variable | Description | Priority |
|---|---|---|
| `ORKAS_API_KEY` | Orkas AI Cloud API key | Highest |
| `ORKAS_API_URL` | Override Orkas endpoint (default: `https://api.orkas.ai`) | — |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | 2nd |
| `KUBEGRAF_CLAUDE_MODEL` | Override Claude model (default: auto) | — |
| `OPENAI_API_KEY` | OpenAI API key | 3rd |
| `KUBEGRAF_OPENAI_MODEL` | Override OpenAI model (default: auto) | — |
| `KUBEGRAF_OLLAMA_URL` | Ollama server URL (default: `http://127.0.0.1:11434`) | 4th |
| `KUBEGRAF_OLLAMA_MODEL` | Pin a specific Ollama model (omit to auto-detect) | — |
| `KUBEGRAF_AI_KEEP_ALIVE` | Keep model in memory after last request (default: `5m`) | — |

**No model name is hardcoded.** KubeGraf queries Ollama's `/api/tags` to find whatever model you have installed, automatically filtering out embedding-only models.

### Pattern-Based Fallbacks (No AI Required)

When no AI provider is configured, KubeGraf generates fix recommendations deterministically from the incident pattern:

| Pattern | Fallback recommendations |
|---|---|
| `IMAGE_PULL_FAILURE` | Verify image tag in registry, check pull secret, rollout restart |
| `CRASH_LOOP_BACKOFF` | Inspect previous logs, describe pod events, rollback deployment |
| `OOM_KILLED` | Check memory consumption with `kubectl top`, increase memory limit |
| `NO_READY_ENDPOINTS` | Check backing pods, inspect readiness probe config |
| Any other pattern | Describe resource, check logs, restart workload |

These are always accurate because they're based on known failure signatures. The UI shows a `⚙ Pattern-based` badge when a fallback was used.

### Roadmap

| Timeline | Change |
|---|---|
| **Now** | Ollama (optional), OpenAI, Claude — user-configured |
| **3–6 months** | Orkas AI Cloud launches — set `ORKAS_API_KEY`, done |
| **Future** | `ORKAS_API_KEY` becomes the default recommended path for all users |

---

## MCP Server — External AI Agent Integration

KubeGraf supports AI agent integration via **Model Context Protocol (MCP)** for intelligent cluster management, anomaly detection, and automated recommendations.

## Supported AI Agents (MCP)

### 1. Claude Desktop (Anthropic)
- Full MCP support via native integration
- Real-time cluster analysis
- Natural language queries

### 2. Cursor IDE
- Code-level cluster management
- Resource YAML generation
- Deployment automation

### 3. Local AI Agent (Ollama)
- Privacy-first, runs entirely on your machine
- CPU/GPU accelerated inference
- No external API calls

## Quick Start

### Enable MCP Server

1. Open **Settings** → **AI Agents**
2. Toggle **Enable AI Agents**
3. Configure MCP server port (default: `3002`)
4. Click **Start Server**

### Connect Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "kubegraf": {
      "command": "node",
      "args": ["/path/to/kubegraf/mcp_server.js"],
      "env": {
        "KUBECONFIG": "~/.kube/config"
      }
    }
  }
}
```

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Connect Cursor

1. Install Cursor extension: **KubeGraf MCP Client**
2. Set MCP endpoint: `http://localhost:3002`
3. Authorize with API key from Settings

## Available MCP Tools

KubeGraf exposes 16 production-ready MCP tools:

| Tool | Description |
|------|-------------|
| `list_pods` | List all pods with filtering by namespace, status |
| `get_pod_logs` | Stream pod logs in real-time |
| `describe_resource` | Get detailed YAML/JSON for any resource |
| `apply_yaml` | Apply Kubernetes manifests |
| `delete_resource` | Delete resources (pods, services, deployments) |
| `scale_deployment` | Scale deployments up/down |
| `restart_deployment` | Rolling restart of deployments |
| `port_forward` | Create port-forward tunnels |
| `exec_command` | Execute commands inside pods |
| `get_events` | Fetch cluster events with filtering |
| `get_metrics` | CPU/memory metrics for nodes/pods |
| `list_helm_releases` | List Helm releases |
| `install_helm_chart` | Install Helm charts from marketplace |
| `upgrade_helm_release` | Upgrade existing Helm releases |
| `rollback_helm_release` | Rollback to previous Helm revision |
| `analyze_cluster_health` | AI-powered cluster health analysis |

## Local AI Agent Setup (Ollama)

### Prerequisites

**Ollama** (optional — for users who want local, offline AI):
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
winget install Ollama.Ollama
```

### Model Selection

KubeGraf **auto-detects** whatever model you have installed via Ollama's `/api/tags` endpoint — no model name needs to be configured.

If you have multiple models installed, KubeGraf logs the selection and lets you pin one:

```
[AI] Multiple Ollama models found: [mistral-nemo:latest llama3.2:3b]
[AI] Auto-selected: mistral-nemo:latest — set KUBEGRAF_OLLAMA_MODEL=<name> to override
```

To pin a specific model (e.g., if the auto-selected one is too large for your RAM):

```bash
export KUBEGRAF_OLLAMA_MODEL=llama3.2:3b
./kubegraf web --port=3003
```

**Embedding-only models** (`nomic-embed-text`, `bge-*`, `e5-*`, `minilm`) are automatically skipped — they cannot generate text.

### Features

- **Anomaly Detection**: Scans pods for unusual resource usage, crash loops, OOMKills
- **Auto-remediation**: Suggests HPA/VPA settings, resource adjustments
- **Cost Optimization**: Identifies over-provisioned resources
- **Security Scanning**: Detects misconfigurations, exposed secrets
- **Predictive Scaling**: ML-based workload forecasting

## Example Queries

### Using Claude Desktop

```
Human: Show me all pods in production namespace that are using more than 80% memory

Claude: [Calls kubegraf list_pods tool with filters]
Found 3 pods exceeding 80% memory:
- api-server-7d8f9: 2.1GB / 2.5GB (84%)
- worker-queue-3: 1.9GB / 2GB (95%)
- cache-redis-0: 7.2GB / 8GB (90%)

Recommendation: Increase memory limits or enable VPA for auto-scaling.
```

### Using Local AI Agent

Navigate to **AI Assistant (Local)** tab:

```
> Analyze my cluster for cost optimization opportunities

🤖 Analysis complete. Found 12 optimization opportunities:

1. **Over-provisioned Deployments** (5 found)
   - nginx-ingress: Requesting 1CPU but using 0.12CPU avg
   - Savings: $45/month

2. **Idle PVCs** (3 found)
   - old-data-pvc (200GB, unused for 90 days)
   - Savings: $20/month

3. **Underutilized Nodes** (2 nodes)
   - node-pool-worker-3: 15% utilization
   - Recommend: Scale down or consolidate workloads

Total Potential Savings: $127/month
```

## Security & Privacy

### Data Handling

- **MCP Server**: Only sends cluster metadata (no secrets, no pod logs by default)
- **Local AI**: All data stays on your machine, never sent to external APIs
- **Encryption**: MCP connections secured via TLS (enable in Settings)

### Access Control

Enable **Local IAM** in Settings to restrict AI agent access:

- **Admin**: Full access to all MCP tools
- **Developer**: Read-only + apply/delete in dev namespaces
- **Viewer**: Read-only access

### Audit Logging

All AI agent actions logged to `~/.kubegraf/ai_agent_audit.log`:

```
2025-12-03 10:15:23 | AI_AGENT_LOCAL | ACTION=scale_deployment | RESOURCE=api-server | NAMESPACE=prod | REPLICAS=3->5 | USER=admin
```

## Troubleshooting

### MCP Server Not Starting

```bash
# Check if port 3002 is in use
lsof -i :3002

# View MCP server logs
tail -f ~/.kubegraf/mcp_server.log
```

### Ollama Connection Failed

```bash
# Verify Ollama running
curl http://localhost:11434/api/tags

# Restart Ollama service
sudo systemctl restart ollama  # Linux
brew services restart ollama    # macOS
```

### Claude Desktop Not Detecting MCP Server

1. Restart Claude Desktop completely
2. Check config file syntax (valid JSON)
3. Ensure `mcp_server.js` path is absolute

## Advanced Configuration

### Custom AI Prompts

Edit `~/.kubegraf/ai_prompts.yaml`:

```yaml
anomaly_detection:
  system_prompt: |
    You are a Kubernetes SRE expert. Analyze the cluster metrics and identify:
    1. Resource bottlenecks
    2. Performance degradation
    3. Security vulnerabilities
  temperature: 0.3
  max_tokens: 2000

cost_optimization:
  system_prompt: |
    Analyze cloud costs and provide actionable savings recommendations.
  temperature: 0.5
```

### GPU Acceleration (Local AI)

```yaml
# ~/.kubegraf/config.yaml
ai_agent:
  local:
    gpu_enabled: true
    gpu_layers: 35  # Offload layers to GPU
    gpu_memory: 8192  # MB
    compute: "cuda"  # cuda, metal, rocm
```

## API Reference

### HTTP API

When MCP server is running, REST API available at `http://localhost:3002/api/v1`:

**GET /api/v1/tools** - List available MCP tools

**POST /api/v1/execute** - Execute MCP tool
```json
{
  "tool": "list_pods",
  "arguments": {
    "namespace": "production",
    "status": "Running"
  }
}
```

**GET /api/v1/health** - Health check

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop Guide](https://claude.ai/desktop)
- [Ollama Models](https://ollama.ai/library)
- [KubeGraf AI Examples](https://kubegraf.io/docs/ai-examples)

## Support

- **Documentation**: https://kubegraf.io/docs/ai-agent
- **Discord**: https://discord.gg/kubegraf
- **Issues**: https://github.com/kubegraf/kubegraf/issues

---

**Pro Tip**: Combine local AI agent with Claude Desktop for best results - use local AI for fast anomaly detection, Claude for complex troubleshooting.
