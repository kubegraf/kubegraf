# MCP Integration Guide for KubeGraf

## Overview

KubeGraf implements the **Model Context Protocol (MCP)** to enable AI assistants like Claude Desktop, Cursor, and other MCP-compatible tools to interact with your Kubernetes clusters through natural language commands.

## What is MCP?

The Model Context Protocol (MCP) is an open standard developed by Anthropic that allows AI assistants to:
- Connect to external tools and data sources
- Perform actions on your behalf
- Access real-time information
- Execute complex multi-step workflows

## Use Cases

### 1. **Natural Language Kubernetes Operations**
Instead of remembering kubectl commands, ask your AI assistant:
- "Scale the web-app deployment to 5 replicas"
- "Show me all pods with high CPU usage in production"
- "What's causing pod my-app-123 to crash?"

### 2. **Intelligent Cluster Management**
- "Analyze cluster health and fix any issues"
- "Optimize resource requests for all deployments in the production namespace"
- "Predict capacity needs for the next 7 days"

### 3. **Automated Remediation**
- "Auto-fix all crash loops in the default namespace"
- "Scale up deployments that are hitting CPU limits"
- "Restart pods that have been running for more than 7 days"

### 4. **Cost Optimization**
- "Find idle resources and suggest cost savings"
- "Estimate monthly cost for the production namespace"
- "Show me the most expensive pods"

## Integration Methods

### Method 1: Claude Desktop

Claude Desktop is the official desktop application from Anthropic that supports MCP servers.

#### Step 1: Install Claude Desktop
Download from: https://claude.ai/download

#### Step 2: Configure MCP Server

Edit Claude Desktop's configuration file:

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

#### Step 3: Add KubeGraf MCP Server

Add this configuration to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kubegraf": {
      "command": "kubegraf",
      "args": ["mcp", "serve", "--port", "3000"],
      "env": {
        "KUBECONFIG": "/path/to/your/kubeconfig"
      }
    }
  }
}
```

**Alternative: HTTP-based connection (recommended for production):**

```json
{
  "mcpServers": {
    "kubegraf": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}
```

#### Step 4: Restart Claude Desktop

Restart Claude Desktop to load the new configuration.

#### Step 5: Test the Connection

In Claude Desktop, ask:
- "What Kubernetes clusters can you access?"
- "List all pods in the default namespace"
- "Show me cluster health status"

### Method 2: Cursor IDE

Cursor is a code editor with built-in AI that supports MCP.

#### Step 1: Install Cursor
Download from: https://cursor.sh

#### Step 2: Configure MCP

1. Open Cursor Settings
2. Navigate to "Features" → "AI" → "MCP Servers"
3. Click "Add MCP Server"
4. Enter:
   - **Name**: `kubegraf`
   - **Command**: `kubegraf mcp serve`
   - **Environment Variables**: 
     ```
     KUBECONFIG=/path/to/your/kubeconfig
     ```

#### Step 3: Test in Cursor Chat

Open Cursor's AI chat and try:
- "Use kubegraf to list all deployments"
- "Check cluster health using kubegraf tools"

### Method 3: Custom MCP Client

You can build your own MCP client using the KubeGraf MCP server.

#### HTTP Endpoint

KubeGraf exposes MCP over HTTP at:
```
POST http://localhost:3000/api/mcp
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "kubectl_get",
        "description": "Get Kubernetes resources",
        "inputSchema": {
          "type": "object",
          "properties": {
            "kind": {"type": "string"},
            "name": {"type": "string"},
            "namespace": {"type": "string"}
          }
        }
      }
    ]
  }
}
```

## Available MCP Tools

### Basic Kubernetes Operations

1. **`kubectl_get`** - Get Kubernetes resources (pods, deployments, services, etc.)
2. **`kubectl_describe`** - Get detailed information about a resource
3. **`kubectl_scale`** - Scale deployments or statefulsets
4. **`kubectl_logs`** - Get logs from pods
5. **`analyze_pod`** - AI-powered pod analysis

### Cluster Analysis

6. **`get_metrics`** - Get CPU/memory metrics for pods or nodes
7. **`detect_anomalies`** - Run anomaly detection
8. **`get_recommendations`** - Get ML-powered optimization recommendations
9. **`estimate_cost`** - Estimate resource costs
10. **`security_scan`** - Run security analysis

### Production-Grade Intelligent Tools

11. **`analyze_cluster_health`** - Comprehensive cluster health analysis
12. **`auto_remediate_issues`** - Automatically detect and fix common issues
13. **`smart_scale`** - ML-powered predictive scaling
14. **`optimize_resources`** - AI-powered resource optimization
15. **`correlate_events`** - Find root causes by correlating events
16. **`predict_capacity`** - Forecast future capacity needs

## Example Conversations

### Example 1: Cluster Health Check

**You:** "Check the health of my cluster"

**AI (using MCP):**
- Calls `analyze_cluster_health`
- Returns: "Cluster health analysis complete. Found 2 nodes ready, 15 pods running, 1 failed pod. 3 critical anomalies detected. 5 high-impact ML recommendations available."

**You:** "Fix the failed pod"

**AI (using MCP):**
- Calls `auto_remediate_issues` with `dry_run=false`
- Returns: "Remediated 1 issue: Restarted pod my-app-123 which was in CrashLoopBackOff state."

### Example 2: Cost Optimization

**You:** "What's the monthly cost of the production namespace?"

**AI (using MCP):**
- Calls `estimate_cost` with namespace="production"
- Returns: "Estimated monthly cost: $1,234.56. Breakdown: CPU: $800, Memory: $400, Storage: $34.56"

**You:** "Find ways to reduce costs"

**AI (using MCP):**
- Calls `optimize_resources` with namespace="production"
- Returns: "Found 12 optimization opportunities. Estimated savings: $200/month. Top recommendations: Reduce CPU requests for web-app (currently 2 cores, recommended: 1.5 cores)."

### Example 3: Predictive Scaling

**You:** "Scale the api-server deployment based on predicted load for the next 2 hours"

**AI (using MCP):**
- Calls `smart_scale` with deployment="api-server", hours_ahead=2
- Returns: "ML prediction shows 80% CPU usage in 2 hours. Scaled api-server from 3 to 5 replicas proactively."

## Security Considerations

### Authentication

KubeGraf MCP server respects your Kubernetes RBAC permissions. The AI assistant can only perform actions that your kubeconfig allows.

### Namespace Isolation

You can restrict MCP tools to specific namespaces:
```json
{
  "mcpServers": {
    "kubegraf": {
      "command": "kubegraf",
      "args": ["mcp", "serve", "--namespace", "production"],
      "env": {
        "KUBECONFIG": "/path/to/kubeconfig"
      }
    }
  }
}
```

### Audit Logging

All MCP tool executions are logged in KubeGraf. Check the logs to see what actions were performed:
```bash
kubegraf logs | grep mcp
```

## Troubleshooting

### Issue: MCP server not connecting

**Solution:**
1. Verify KubeGraf is running: `curl http://localhost:3000/api/status`
2. Check MCP endpoint: `curl -X POST http://localhost:3000/api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`
3. Verify kubeconfig path is correct
4. Check Claude Desktop/Cursor logs for connection errors

### Issue: Tools not appearing

**Solution:**
1. Restart KubeGraf server
2. Restart Claude Desktop/Cursor
3. Check that MCP server is registered in configuration
4. Verify network connectivity between client and server

### Issue: Permission denied errors

**Solution:**
1. Verify kubeconfig has correct permissions
2. Check Kubernetes RBAC rules
3. Test with `kubectl` directly to verify access
4. Review KubeGraf logs for detailed error messages

## Advanced Configuration

### Custom Tool Registration

You can extend KubeGraf with custom MCP tools by modifying `mcp_server.go`:

```go
mcp.RegisterTool("my_custom_tool", MCPTool{
    Name:        "my_custom_tool",
    Description: "My custom tool description",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "param1": map[string]interface{}{
                "type": "string",
                "description": "Parameter description",
            },
        },
    },
}, mcp.handleMyCustomTool)
```

### Multiple Cluster Support

KubeGraf can manage multiple clusters. The MCP server uses the currently active cluster context. Switch contexts using:
```bash
kubectl config use-context <context-name>
```

Or use KubeGraf's UI to switch clusters, then the MCP server will automatically use the new context.

## Best Practices

1. **Use dry-run mode first**: Always test with `dry_run=true` before applying changes
2. **Review recommendations**: Don't auto-apply all ML recommendations blindly
3. **Monitor audit logs**: Regularly check what actions were performed
4. **Limit permissions**: Use service accounts with minimal required permissions
5. **Namespace isolation**: Restrict MCP access to specific namespaces when possible
6. **Version control**: Keep your MCP configuration in version control

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [KubeGraf GitHub](https://github.com/kubegraf/kubegraf)
- [Claude Desktop Documentation](https://claude.ai/docs)
- [Cursor Documentation](https://cursor.sh/docs)

## Support

For issues or questions:
- GitHub Issues: https://github.com/kubegraf/kubegraf/issues
- Documentation: https://kubegraf.io/docs
- Community: https://github.com/kubegraf/kubegraf/discussions

