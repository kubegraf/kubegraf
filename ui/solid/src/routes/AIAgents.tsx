import { Component, For, Show, createResource, createSignal } from 'solid-js';
import { api } from '../services/api';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPStatus {
  available: boolean;
  tools: MCPTool[];
  serverInfo?: {
    name: string;
    version: string;
  };
}

const AIAgents: Component = () => {
  const [mcpStatus, { refetch }] = createResource(async () => {
    try {
      // Try to initialize MCP connection
      const initResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {}
        })
      });
      
      if (!initResponse.ok) {
        return { available: false, tools: [] };
      }

      const initData = await initResponse.json();
      
      // Get list of tools
      const toolsResponse = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {}
        })
      });

      if (!toolsResponse.ok) {
        return { 
          available: true, 
          tools: [],
          serverInfo: initData.result?.serverInfo 
        };
      }

      const toolsData = await toolsResponse.json();
      
      return {
        available: true,
        tools: toolsData.result?.tools || [],
        serverInfo: initData.result?.serverInfo
      };
    } catch (error) {
      console.error('MCP connection error:', error);
      return { available: false, tools: [] };
    }
  });

  const [selectedTool, setSelectedTool] = createSignal<MCPTool | null>(null);
  const [toolResult, setToolResult] = createSignal<string>('');
  const [toolLoading, setToolLoading] = createSignal(false);
  const [toolInputs, setToolInputs] = createSignal<Record<string, any>>({});

  const handleToolCall = async (tool: MCPTool) => {
    setSelectedTool(tool);
    setToolResult('');
    setToolLoading(true);

    try {
      // Build arguments from input schema
      const properties = tool.inputSchema?.properties || {};
      const args: Record<string, any> = {};
      
      // Use stored inputs or defaults
      const inputs = toolInputs();
      for (const [key, prop] of Object.entries(properties)) {
        if (inputs[key] !== undefined) {
          args[key] = inputs[key];
        }
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: args
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        setToolResult(`Error: ${data.error.message}`);
      } else {
        const content = data.result?.content || [];
        const text = content.map((c: any) => c.text || '').join('\n');
        setToolResult(text || JSON.stringify(data.result, null, 2));
      }
    } catch (error: any) {
      setToolResult(`Error: ${error.message}`);
    } finally {
      setToolLoading(false);
    }
  };

  const updateInput = (key: string, value: any) => {
    setToolInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Agents
          </h1>
          <p class="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            AI agents powered by Model Context Protocol (MCP) to interact with your Kubernetes cluster
          </p>
        </div>
        <button
          onClick={() => refetch()}
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ background: 'var(--accent-primary)', color: 'white' }}
        >
          Refresh
        </button>
      </div>

      <Show when={mcpStatus.loading}>
        <div class="card p-8 text-center">
          <div class="text-lg" style={{ color: 'var(--text-muted)' }}>Loading MCP server status...</div>
        </div>
      </Show>

      <Show when={!mcpStatus.loading && !mcpStatus()?.available}>
        <div class="card p-8 text-center">
          <div class="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            MCP Server Not Available
          </div>
          <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
            The MCP server is not running or not accessible. Make sure KubeGraf is running and the MCP endpoint is enabled.
          </p>
        </div>
      </Show>

      <Show when={!mcpStatus.loading && mcpStatus()?.available}>
        <div class="card p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <div>
              <div class="font-semibold" style={{ color: 'var(--text-primary)' }}>
                MCP Server Connected
              </div>
              <Show when={mcpStatus()?.serverInfo}>
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {mcpStatus()?.serverInfo?.name} v{mcpStatus()?.serverInfo?.version}
                </div>
              </Show>
            </div>
          </div>

          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Available Tools ({mcpStatus()?.tools.length || 0})
            </h3>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              These tools are available for AI agents to interact with your Kubernetes cluster.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={mcpStatus()?.tools || []}>
              {(tool) => (
                <div 
                  class="p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ 
                    background: selectedTool()?.name === tool.name ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)'
                  }}
                  onClick={() => setSelectedTool(tool)}
                >
                  <div class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {tool.name}
                  </div>
                  <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {tool.description}
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <Show when={selectedTool()}>
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedTool()?.name}
              </h3>
              <button
                onClick={() => setSelectedTool(null)}
                class="px-3 py-1 rounded text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>

            <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {selectedTool()?.description}
            </p>

            <Show when={selectedTool()?.inputSchema?.properties}>
              <div class="space-y-3 mb-4">
                <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Parameters:
                </div>
                <For each={Object.entries(selectedTool()?.inputSchema?.properties || {})}>
                  {([key, prop]: [string, any]) => (
                    <div>
                      <label class="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        {key}
                        <Show when={prop.description}>
                          <span class="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            - {prop.description}
                          </span>
                        </Show>
                      </label>
                      <input
                        type={prop.type === 'integer' ? 'number' : 'text'}
                        value={toolInputs()[key] || ''}
                        onInput={(e) => {
                          const value = prop.type === 'integer' 
                            ? parseInt(e.currentTarget.value) || 0
                            : e.currentTarget.value;
                          updateInput(key, value);
                        }}
                        placeholder={prop.type === 'integer' ? '0' : 'Enter value...'}
                        class="w-full px-3 py-2 rounded border"
                        style={{ 
                          background: 'var(--bg-primary)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <button
              onClick={() => handleToolCall(selectedTool()!)}
              disabled={toolLoading()}
              class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              {toolLoading() ? 'Executing...' : 'Execute Tool'}
            </button>

            <Show when={toolResult()}>
              <div class="mt-4 p-4 rounded border" style={{ 
                background: 'var(--bg-secondary)', 
                borderColor: 'var(--border-color)'
              }}>
                <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Result:
                </div>
                <pre class="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {toolResult()}
                </pre>
              </div>
            </Show>
          </div>
        </Show>
      </Show>

      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Setup Instructions
        </h3>
        <div class="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <strong>For Claude Desktop:</strong>
            <pre class="mt-2 p-3 rounded bg-gray-900 text-white text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "kubegraf": {
      "command": "kubegraf",
      "args": ["mcp", "serve"],
      "env": {
        "KUBECONFIG": "/path/to/kubeconfig"
      }
    }
  }
}`}
            </pre>
          </div>
          <div class="mt-4">
            <strong>Endpoint:</strong> <code class="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">/api/mcp</code>
          </div>
          <div>
            <strong>Protocol:</strong> MCP (Model Context Protocol) - JSON-RPC 2.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgents;

