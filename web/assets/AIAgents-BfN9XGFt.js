import { j as createResource, c as createSignal, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, e as setAttribute, v as delegateEvents } from './index-B8I71-mz.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class=text-lg style=color:var(--text-muted)>Loading MCP server status...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="text-lg font-medium mb-2"style=color:var(--text-primary)>MCP Server Not Available</div><p class=text-sm style=color:var(--text-muted)>The MCP server is not running or not accessible. Make sure KubēGraf is running and the MCP endpoint is enabled.`), _tmpl$3 = /* @__PURE__ */ template(`<div class=text-sm style=color:var(--text-secondary)> v`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-6"><div class="flex items-center gap-3 mb-4"><div class="w-3 h-3 rounded-full bg-green-500"></div><div><div class=font-semibold style=color:var(--text-primary)>MCP Server Connected</div></div></div><div class=mb-4><h3 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>Available Tools (<!>)</h3><p class=text-sm style=color:var(--text-secondary)>These tools are available for AI agents to interact with your Kubernetes cluster.</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-3 mb-4"><div class="text-sm font-medium"style=color:var(--text-primary)>Parameters:`), _tmpl$6 = /* @__PURE__ */ template(`<div class="mt-4 p-4 rounded border"style=background:var(--bg-secondary);borderColor:var(--border-color)><div class="text-sm font-medium mb-2"style=color:var(--text-primary)>Result:</div><pre class="text-xs whitespace-pre-wrap"style=color:var(--text-secondary)>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="card p-6"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold"style=color:var(--text-primary)></h3><button class="px-3 py-1 rounded text-sm"style=background:var(--bg-secondary);color:var(--text-primary)>Close</button></div><p class="text-sm mb-4"style=color:var(--text-secondary)></p><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:white>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"style=minHeight:100vh;background:var(--bg-primary)><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>AI Agents</h1><p class="text-sm mt-2"style=color:var(--text-secondary)>AI agents powered by Model Context Protocol (MCP) to interact with your Kubernetes cluster</p></div><button class="px-4 py-2 rounded-lg font-medium transition-colors"style=background:var(--accent-primary);color:white>Refresh</button></div><div class="card p-6"><h3 class="text-lg font-semibold mb-3"style=color:var(--text-primary)>Setup Instructions</h3><div class="space-y-3 text-sm"style=color:var(--text-secondary)><div><strong>For Claude Desktop:</strong><pre class="mt-2 p-3 rounded bg-gray-900 text-white text-xs overflow-x-auto">{
  "mcpServers": {
    "kubegraf": {
      "command": "kubegraf",
      "args": ["mcp", "serve"],
      "env": {
        "KUBECONFIG": "/path/to/kubeconfig"
      }
    }
  }
}</pre></div><div class=mt-4><strong>Endpoint:</strong> <code class="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">/api/mcp</code></div><div><strong>Protocol:</strong> MCP (Model Context Protocol) - JSON-RPC 2.0`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"style=borderColor:var(--border-color)><div class="font-semibold mb-1"style=color:var(--text-primary)></div><div class=text-sm style=color:var(--text-secondary)>`), _tmpl$0 = /* @__PURE__ */ template(`<span class="ml-2 text-xs"style=color:var(--text-muted)>- `), _tmpl$1 = /* @__PURE__ */ template(`<div><label class="block text-sm mb-1"style=color:var(--text-secondary)></label><input class="w-full px-3 py-2 rounded border"style=background:var(--bg-primary);borderColor:var(--border-color);color:var(--text-primary)>`);
const AIAgents = () => {
  const [mcpStatus, {
    refetch
  }] = createResource(async () => {
    try {
      const initResponse = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {}
        })
      });
      if (!initResponse.ok) {
        return {
          available: false,
          tools: []
        };
      }
      const initData = await initResponse.json();
      const toolsResponse = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
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
      console.error("MCP connection error:", error);
      return {
        available: false,
        tools: []
      };
    }
  });
  const [selectedTool, setSelectedTool] = createSignal(null);
  const [toolResult, setToolResult] = createSignal("");
  const [toolLoading, setToolLoading] = createSignal(false);
  const [toolInputs, setToolInputs] = createSignal({});
  const handleToolCall = async (tool) => {
    setSelectedTool(tool);
    setToolResult("");
    setToolLoading(true);
    try {
      const properties = tool.inputSchema?.properties || {};
      const args = {};
      const inputs = toolInputs();
      for (const [key, prop] of Object.entries(properties)) {
        if (inputs[key] !== void 0) {
          args[key] = inputs[key];
        }
      }
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
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
        const text = content.map((c) => c.text || "").join("\n");
        setToolResult(text || JSON.stringify(data.result, null, 2));
      }
    } catch (error) {
      setToolResult(`Error: ${error.message}`);
    } finally {
      setToolLoading(false);
    }
  };
  const updateInput = (key, value) => {
    setToolInputs((prev) => ({
      ...prev,
      [key]: value
    }));
  };
  return (() => {
    var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$35 = _el$2.nextSibling, _el$36 = _el$35.firstChild; _el$36.nextSibling;
    _el$6.$$click = () => refetch();
    insert(_el$, createComponent(Show, {
      get when() {
        return mcpStatus.loading;
      },
      get children() {
        var _el$7 = _tmpl$(); _el$7.firstChild;
        return _el$7;
      }
    }), _el$35);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!mcpStatus.loading)() && !mcpStatus()?.available;
      },
      get children() {
        var _el$9 = _tmpl$2(), _el$0 = _el$9.firstChild; _el$0.nextSibling;
        return _el$9;
      }
    }), _el$35);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!mcpStatus.loading)() && mcpStatus()?.available;
      },
      get children() {
        return [(() => {
          var _el$10 = _tmpl$4(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling; _el$13.firstChild; var _el$17 = _el$11.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$21 = _el$19.nextSibling; _el$21.nextSibling; _el$18.nextSibling; var _el$23 = _el$17.nextSibling;
          insert(_el$13, createComponent(Show, {
            get when() {
              return mcpStatus()?.serverInfo;
            },
            get children() {
              var _el$15 = _tmpl$3(), _el$16 = _el$15.firstChild;
              insert(_el$15, () => mcpStatus()?.serverInfo?.name, _el$16);
              insert(_el$15, () => mcpStatus()?.serverInfo?.version, null);
              return _el$15;
            }
          }), null);
          insert(_el$18, () => mcpStatus()?.tools.length || 0, _el$21);
          insert(_el$23, createComponent(For, {
            get each() {
              return mcpStatus()?.tools || [];
            },
            children: (tool) => (() => {
              var _el$38 = _tmpl$9(), _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling;
              _el$38.$$click = () => setSelectedTool(tool);
              insert(_el$39, () => tool.name);
              insert(_el$40, () => tool.description);
              createRenderEffect((_$p) => setStyleProperty(_el$38, "background", selectedTool()?.name === tool.name ? "var(--bg-secondary)" : "var(--bg-tertiary)"));
              return _el$38;
            })()
          }));
          return _el$10;
        })(), createComponent(Show, {
          get when() {
            return selectedTool();
          },
          get children() {
            var _el$24 = _tmpl$7(), _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$25.nextSibling, _el$31 = _el$28.nextSibling;
            insert(_el$26, () => selectedTool()?.name);
            _el$27.$$click = () => setSelectedTool(null);
            insert(_el$28, () => selectedTool()?.description);
            insert(_el$24, createComponent(Show, {
              get when() {
                return selectedTool()?.inputSchema?.properties;
              },
              get children() {
                var _el$29 = _tmpl$5(); _el$29.firstChild;
                insert(_el$29, createComponent(For, {
                  get each() {
                    return Object.entries(selectedTool()?.inputSchema?.properties || {});
                  },
                  children: ([key, prop]) => (() => {
                    var _el$41 = _tmpl$1(), _el$42 = _el$41.firstChild, _el$45 = _el$42.nextSibling;
                    insert(_el$42, key, null);
                    insert(_el$42, createComponent(Show, {
                      get when() {
                        return prop.description;
                      },
                      get children() {
                        var _el$43 = _tmpl$0(); _el$43.firstChild;
                        insert(_el$43, () => prop.description, null);
                        return _el$43;
                      }
                    }), null);
                    _el$45.$$input = (e) => {
                      const value = prop.type === "integer" ? parseInt(e.currentTarget.value) || 0 : e.currentTarget.value;
                      updateInput(key, value);
                    };
                    createRenderEffect((_p$) => {
                      var _v$ = prop.type === "integer" ? "number" : "text", _v$2 = prop.type === "integer" ? "0" : "Enter value...";
                      _v$ !== _p$.e && setAttribute(_el$45, "type", _p$.e = _v$);
                      _v$2 !== _p$.t && setAttribute(_el$45, "placeholder", _p$.t = _v$2);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    createRenderEffect(() => _el$45.value = toolInputs()[key] || "");
                    return _el$41;
                  })()
                }), null);
                return _el$29;
              }
            }), _el$31);
            _el$31.$$click = () => handleToolCall(selectedTool());
            insert(_el$31, () => toolLoading() ? "Executing..." : "Execute Tool");
            insert(_el$24, createComponent(Show, {
              get when() {
                return toolResult();
              },
              get children() {
                var _el$32 = _tmpl$6(), _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling;
                insert(_el$34, toolResult);
                return _el$32;
              }
            }), null);
            createRenderEffect(() => _el$31.disabled = toolLoading());
            return _el$24;
          }
        })];
      }
    }), _el$35);
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { AIAgents as default };
//# sourceMappingURL=AIAgents-BfN9XGFt.js.map
