# AI Agent Integration Guide

## Overview

KubeGraf supports AI agent integration via **Model Context Protocol (MCP)** for intelligent cluster management, anomaly detection, and automated recommendations.

## Supported AI Agents

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

## Local AI Agent Setup

### Prerequisites

**Ollama** (recommended):
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
winget install Ollama.Ollama
```

### Enable Local AI

1. **Settings** → **AI Agents** → **Local AI Agent**
2. Select model:
   - `llama3.2:3b` (lightweight, 2GB RAM, fast)
   - `mistral:7b` (balanced, 4GB RAM)
   - `mixtral:8x7b` (powerful, 32GB RAM, GPU recommended)
3. Click **Download & Start**

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
