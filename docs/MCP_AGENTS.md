# MCP (Model Context Protocol) Agents for KubeGraf

## Overview

KubeGraf now supports AI agents using the **Model Context Protocol (MCP)**, an open standard developed by Anthropic. This allows AI assistants to connect to external tools and data sources, enabling them to perform actions and access real-time Kubernetes cluster data.

## Architecture

### Components

1. **MCP Server** - Exposes Kubernetes operations as tools
2. **MCP Client** - Connects to MCP servers and formats requests
3. **MCP Host** - Orchestrates multiple clients and servers
4. **Agent Manager** - Manages AI agent lifecycle and configurations

### Benefits

- **Standardized Protocol** - Industry-standard way to connect AI to tools
- **Extensibility** - Easy to add new tools and capabilities
- **Security** - Fine-grained permissions and access control
- **Interoperability** - Works with any MCP-compatible AI assistant
- **Real-time Actions** - Agents can perform actual Kubernetes operations

## Available MCP Tools

### Kubernetes Operations
- `kubectl_get` - Get Kubernetes resources
- `kubectl_describe` - Describe resources
- `kubectl_apply` - Apply YAML configurations
- `kubectl_delete` - Delete resources
- `kubectl_scale` - Scale deployments
- `kubectl_logs` - Get pod logs
- `kubectl_exec` - Execute commands in pods

### Cluster Analysis
- `analyze_pod` - Analyze pod status and issues
- `check_health` - Check cluster health
- `get_metrics` - Get resource metrics
- `detect_anomalies` - Run anomaly detection
- `get_recommendations` - Get ML recommendations

### Cost & Security
- `estimate_cost` - Estimate resource costs
- `security_scan` - Run security analysis
- `check_compliance` - Check compliance status

## Installation

### Prerequisites

1. AI Provider (Ollama, OpenAI, or Claude)
2. MCP-compatible AI assistant (Claude Desktop, Cursor, etc.)

### Setup

1. **Enable MCP Server** in KubeGraf settings
2. **Configure MCP Client** with your AI assistant
3. **Install MCP Tools** you want to expose
4. **Test Connection** to verify setup

## Usage

### With Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kubegraf": {
      "command": "kubegraf",
      "args": ["mcp", "serve"],
      "env": {
        "KUBECONFIG": "/path/to/kubeconfig"
      }
    }
  }
}
```

### With Cursor

Configure in Cursor settings to use KubeGraf MCP server.

### Example Agent Queries

- "Scale the web-app deployment to 5 replicas"
- "Show me all pods with high CPU usage"
- "Analyze why pod my-app-123 is crashing"
- "What's the cost of the production namespace?"
- "Fix the security issues in the default namespace"

## Security

- **RBAC Integration** - Respects Kubernetes RBAC permissions
- **Namespace Isolation** - Agents can only access allowed namespaces
- **Action Confirmation** - Destructive actions require confirmation
- **Audit Logging** - All agent actions are logged

## Extending MCP

You can create custom MCP tools by:

1. Implementing the `MCPTool` interface
2. Registering the tool with the MCP server
3. Defining tool schema (parameters, description)
4. Implementing tool execution logic

See `mcp_tools.go` for examples.

