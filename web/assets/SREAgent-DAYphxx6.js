import { j as createResource, k as api, a as createMemo, c as createSignal, t as template, i as insert, d as createComponent, f as createRenderEffect, g as className, S as Show, m as memo, u as addEventListener, F as For, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-secondary)><div class="text-6xl mb-4">🎉</div><div class="text-xl font-medium">No active incidents</div><div class="text-sm mt-2">Your cluster is running smoothly!`), _tmpl$2 = /* @__PURE__ */ template(`<div class=divide-y style=border-color:var(--border-color)>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="rounded-lg border"style=background:var(--bg-card);border-color:var(--border-color)><div class="p-4 border-b flex justify-between items-center"style=border-color:var(--border-color)><h2 class="text-xl font-bold"style=color:var(--text-primary)>Active Incidents</h2><button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">Refresh`), _tmpl$4 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-secondary)><div class="text-6xl mb-4">📋</div><div class="text-xl font-medium">No actions recorded</div><div class="text-sm mt-2">Actions will appear here when incidents are remediated`), _tmpl$5 = /* @__PURE__ */ template(`<div class="rounded-lg border"style=background:var(--bg-card);border-color:var(--border-color)><div class="p-4 border-b flex justify-between items-center"style=border-color:var(--border-color)><h2 class="text-xl font-bold"style=color:var(--text-primary)>Remediation Actions</h2><button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">Refresh`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-3xl font-bold text-white mb-2">SRE Agent</h1><p class=text-gray-400>Intelligent incident detection and automated remediation</p></div></div><div class="flex space-x-2 border-b border-gray-700"><button>Overview</button><button>Incidents</button><button>Actions</button><button>Configuration`), _tmpl$7 = /* @__PURE__ */ template(`<button>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Incidents Detected</div><div class="text-3xl font-bold"style=color:var(--text-primary)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Auto Remediations</div><div class="text-3xl font-bold"style=color:var(--success-color)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Success Rate</div><div class="text-3xl font-bold"style=color:var(--accent-primary)>%</div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Escalations</div><div class="text-3xl font-bold"style=color:var(--warning-color)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Incidents Resolved</div><div class="text-3xl font-bold"style=color:var(--text-primary)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Avg Resolution Time</div><div class="text-2xl font-bold"style=color:var(--text-primary)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Batch SLO Met</div><div class="text-3xl font-bold"style=color:var(--success-color)></div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Actions This Hour</div><div class="text-3xl font-bold"style=color:var(--accent-secondary)></div><div class="text-xs mt-1"style=color:var(--text-muted)>/ <!> max</div></div><div class="rounded-lg p-6 border"style=background:var(--bg-card);border-color:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Open Incidents</div><div class="text-3xl font-bold"style=color:var(--error-color)></div><div class="text-xs mt-1"style=color:var(--text-muted)>From cluster resources`), _tmpl$9 = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)">Auto-remediated`), _tmpl$0 = /* @__PURE__ */ template(`<div class="p-4 transition-colors hover:opacity-80"style=background:var(--bg-card)><div class="flex items-start justify-between mb-2"><div class=flex-1><div class="flex items-center space-x-2 mb-1"><span></span><span></span></div><h3 class="text-lg font-medium"style=color:var(--text-primary)></h3><p class="text-sm mt-1"style=color:var(--text-secondary)></p></div></div><div class="flex items-center space-x-4 text-sm mt-2"style=color:var(--text-muted)><span>Resource: </span><span>Namespace: </span><span>Detected: `), _tmpl$1 = /* @__PURE__ */ template(`<span style=color:var(--success-color)>✓`), _tmpl$10 = /* @__PURE__ */ template(`<span style=color:var(--error-color)>✗`), _tmpl$11 = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs"style="background:rgba(139, 92, 246, 0.2);color:var(--accent-secondary)">Automated`), _tmpl$12 = /* @__PURE__ */ template(`<div class="p-4 transition-colors hover:opacity-80"style=background:var(--bg-card)><div class="flex items-start justify-between"><div class=flex-1><div class="flex items-center space-x-2 mb-1"><span class=font-medium style=color:var(--text-primary)></span></div><p class=text-sm style=color:var(--text-secondary)></p></div><span class=text-sm style=color:var(--text-muted)>`), _tmpl$13 = /* @__PURE__ */ template(`<button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Edit Configuration`), _tmpl$14 = /* @__PURE__ */ template(`<div class=space-x-2><button class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Cancel</button><button class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white">Save`), _tmpl$15 = /* @__PURE__ */ template(`<input type=checkbox class="w-5 h-5">`), _tmpl$16 = /* @__PURE__ */ template(`<span style=color:var(--text-primary)>`), _tmpl$17 = /* @__PURE__ */ template(`<input type=number class="w-full rounded px-3 py-2 border"style=background:var(--bg-input);color:var(--text-primary);border-color:var(--border-color)>`), _tmpl$18 = /* @__PURE__ */ template(`<div class="rounded-lg border p-6"style=background:var(--bg-card);border-color:var(--border-color)><div class="flex justify-between items-center mb-6"><h2 class="text-xl font-bold"style=color:var(--text-primary)>Agent Configuration</h2></div><div class=space-y-4><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Auto Remediation</label></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Learning Mode</label></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Notifications</label></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Batch Monitoring</label></div><div class=col-span-2><label class="block text-sm mb-2"style=color:var(--text-secondary)>Max Actions Per Hour</label></div></div><div class="mt-6 pt-6 border-t"style=border-color:var(--border-color)><h3 class="text-lg font-medium mb-4"style=color:var(--text-primary)>Auto-Remediate Types</h3><div class="flex flex-wrap gap-2"></div></div><div class="mt-6 pt-6 border-t"style=border-color:var(--border-color)><h3 class="text-lg font-medium mb-2"style=color:var(--text-primary)>Batch SLO</h3><p style=color:var(--text-secondary)>`), _tmpl$19 = /* @__PURE__ */ template(`<span class="px-3 py-1 rounded-full text-sm"style="background:rgba(59, 130, 246, 0.2);color:var(--accent-secondary)">`);
const SREAgent = () => {
  const [sreStatus, {
    refetch: refetchStatus
  }] = createResource(async () => {
    try {
      console.log("[SRE Agent] Fetching SRE status...");
      const response = await fetch("/api/sre/status");
      if (!response.ok) {
        console.error("[SRE Agent] Failed to fetch SRE status:", response.status, response.statusText);
        return {
          enabled: false,
          autoRemediate: false,
          autoRemediateTypes: [],
          notificationEnabled: false,
          batchMonitoring: false,
          batchSLO: "",
          maxAutoActionsPerHour: 10,
          learningEnabled: false,
          metrics: {
            incidentsDetected: 0,
            incidentsResolved: 0,
            autoRemediations: 0,
            notificationsSent: 0,
            escalations: 0,
            avgResolutionTime: 0,
            successRate: 0,
            batchSLOMet: 0,
            actionsThisHour: 0,
            lastHourReset: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
      const data = await response.json();
      console.log("[SRE Agent] Received SRE status:", data);
      return data;
    } catch (error) {
      console.error("[SRE Agent] Error fetching SRE status:", error);
      return {
        enabled: false,
        autoRemediate: false,
        autoRemediateTypes: [],
        notificationEnabled: false,
        batchMonitoring: false,
        batchSLO: "",
        maxAutoActionsPerHour: 10,
        learningEnabled: false,
        metrics: {
          incidentsDetected: 0,
          incidentsResolved: 0,
          autoRemediations: 0,
          notificationsSent: 0,
          escalations: 0,
          avgResolutionTime: 0,
          successRate: 0,
          batchSLOMet: 0,
          actionsThisHour: 0,
          lastHourReset: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
  });
  const [incidents, {
    refetch: refetchIncidents
  }] = createResource(async () => {
    try {
      console.log("[SRE Agent] Fetching SRE incidents...");
      const response = await fetch("/api/sre/incidents");
      if (!response.ok) {
        console.error("[SRE Agent] Failed to fetch incidents:", response.status);
        return {
          incidents: [],
          total: 0
        };
      }
      const data = await response.json();
      console.log("[SRE Agent] Received incidents:", data);
      return data;
    } catch (error) {
      console.error("[SRE Agent] Error fetching incidents:", error);
      return {
        incidents: [],
        total: 0
      };
    }
  });
  const [actions, {
    refetch: refetchActions
  }] = createResource(async () => {
    try {
      console.log("[SRE Agent] Fetching SRE actions...");
      const response = await fetch("/api/sre/actions");
      if (!response.ok) {
        console.error("[SRE Agent] Failed to fetch actions:", response.status);
        return {
          actions: [],
          total: 0
        };
      }
      const data = await response.json();
      console.log("[SRE Agent] Received actions:", data);
      return data;
    } catch (error) {
      console.error("[SRE Agent] Error fetching actions:", error);
      return {
        actions: [],
        total: 0
      };
    }
  });
  const [kubernetesIncidents] = createResource(async () => {
    try {
      return await api.getIncidents();
    } catch (err) {
      console.error("Failed to fetch Kubernetes incidents:", err);
      return [];
    }
  });
  const openIncidentsCount = createMemo(() => {
    const incidents2 = kubernetesIncidents();
    if (!incidents2) return 0;
    return incidents2.length;
  });
  const [activeTab, setActiveTab] = createSignal("overview");
  const [configEditing, setConfigEditing] = createSignal(false);
  const [configForm, setConfigForm] = createSignal({});
  const toggleAgent = async () => {
    const status = sreStatus();
    if (!status) return;
    const response = await fetch("/api/sre/enable", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        enabled: !status.enabled
      })
    });
    if (response.ok) {
      refetchStatus();
    }
  };
  const saveConfig = async () => {
    const response = await fetch("/api/sre/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(configForm())
    });
    if (response.ok) {
      setConfigEditing(false);
      refetchStatus();
    }
  };
  const startEditing = () => {
    const status = sreStatus();
    if (status) {
      setConfigForm({
        autoRemediate: status.autoRemediate,
        notificationEnabled: status.notificationEnabled,
        batchMonitoring: status.batchMonitoring,
        maxAutoActionsPerHour: status.maxAutoActionsPerHour,
        learningEnabled: status.learningEnabled
      });
      setConfigEditing(true);
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "text-red-400 bg-red-900/20 border-red-700";
      case "high":
        return "text-orange-400 bg-orange-900/20 border-orange-700";
      case "medium":
        return "text-yellow-400 bg-yellow-900/20 border-yellow-700";
      case "low":
        return "text-blue-400 bg-blue-900/20 border-blue-700";
      default:
        return "text-gray-400 bg-gray-900/20 border-gray-700";
    }
  };
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "resolved":
        return "text-green-400";
      case "active":
        return "text-red-400";
      case "investigating":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };
  return (() => {
    var _el$ = _tmpl$6(), _el$2 = _el$.firstChild; _el$2.firstChild; var _el$4 = _el$2.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling;
    insert(_el$2, createComponent(Show, {
      get when() {
        return sreStatus();
      },
      children: (status) => (() => {
        var _el$19 = _tmpl$7();
        _el$19.$$click = toggleAgent;
        insert(_el$19, () => status().enabled ? "✓ Enabled" : "Disabled");
        createRenderEffect(() => className(_el$19, `px-6 py-2 rounded-lg font-medium transition-colors ${status().enabled ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-600 hover:bg-gray-700 text-white"}`));
        return _el$19;
      })()
    }), null);
    _el$5.$$click = () => setActiveTab("overview");
    _el$6.$$click = () => setActiveTab("incidents");
    _el$7.$$click = () => setActiveTab("actions");
    _el$8.$$click = () => setActiveTab("config");
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "overview")() && sreStatus();
      },
      children: (status) => (() => {
        var _el$20 = _tmpl$8(), _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$24.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$29.firstChild, _el$31 = _el$27.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$31.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$34.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$37.nextSibling, _el$41 = _el$40.firstChild, _el$42 = _el$41.nextSibling, _el$43 = _el$40.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild, _el$49 = _el$47.nextSibling; _el$49.nextSibling; var _el$50 = _el$43.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling; _el$52.nextSibling;
        insert(_el$23, () => status().metrics.incidentsDetected);
        insert(_el$26, () => status().metrics.autoRemediations);
        insert(_el$29, () => status().metrics.successRate.toFixed(1), _el$30);
        insert(_el$33, () => status().metrics.escalations);
        insert(_el$36, () => status().metrics.incidentsResolved);
        insert(_el$39, () => {
          const timeStr = status().metrics.avgResolutionTime;
          if (typeof timeStr === "string") {
            const match = timeStr.match(/(\d+)([smh])/);
            if (match) {
              const val = parseInt(match[1]);
              const unit = match[2];
              if (unit === "s") return `${val}s`;
              if (unit === "m") return `${val}m`;
              if (unit === "h") return `${val}h`;
            }
            return timeStr;
          }
          return `${Math.round(timeStr / 1e3)}s`;
        });
        insert(_el$42, () => status().metrics.batchSLOMet);
        insert(_el$45, () => status().metrics.actionsThisHour);
        insert(_el$46, () => status().maxAutoActionsPerHour, _el$49);
        insert(_el$52, openIncidentsCount);
        return _el$20;
      })()
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "incidents";
      },
      get children() {
        var _el$9 = _tmpl$3(), _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling;
        addEventListener(_el$10, "click", refetchIncidents, true);
        insert(_el$9, createComponent(Show, {
          get when() {
            return incidents()?.incidents.length === 0;
          },
          get children() {
            return _tmpl$();
          }
        }), null);
        insert(_el$9, createComponent(Show, {
          get when() {
            return memo(() => !!incidents())() && incidents().incidents.length > 0;
          },
          get children() {
            var _el$12 = _tmpl$2();
            insert(_el$12, createComponent(For, {
              get each() {
                return incidents().incidents;
              },
              children: (incident) => (() => {
                var _el$54 = _tmpl$0(), _el$55 = _el$54.firstChild, _el$56 = _el$55.firstChild, _el$57 = _el$56.firstChild, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$61 = _el$57.nextSibling, _el$62 = _el$61.nextSibling, _el$63 = _el$55.nextSibling, _el$64 = _el$63.firstChild; _el$64.firstChild; var _el$66 = _el$64.nextSibling; _el$66.firstChild; var _el$68 = _el$66.nextSibling; _el$68.firstChild;
                insert(_el$58, () => incident.severity);
                insert(_el$59, () => incident.status);
                insert(_el$57, createComponent(Show, {
                  get when() {
                    return incident.autoRemediated;
                  },
                  get children() {
                    return _tmpl$9();
                  }
                }), null);
                insert(_el$61, () => incident.title);
                insert(_el$62, () => incident.description);
                insert(_el$64, () => incident.resource, null);
                insert(_el$66, () => incident.namespace, null);
                insert(_el$68, () => new Date(incident.detectedAt).toLocaleString(), null);
                createRenderEffect((_p$) => {
                  var _v$5 = `px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`, _v$6 = `font-medium ${getStatusColor(incident.status)}`;
                  _v$5 !== _p$.e && className(_el$58, _p$.e = _v$5);
                  _v$6 !== _p$.t && className(_el$59, _p$.t = _v$6);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0
                });
                return _el$54;
              })()
            }));
            return _el$12;
          }
        }), null);
        return _el$9;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "actions";
      },
      get children() {
        var _el$13 = _tmpl$5(), _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling;
        addEventListener(_el$16, "click", refetchActions, true);
        insert(_el$13, createComponent(Show, {
          get when() {
            return actions()?.actions.length === 0;
          },
          get children() {
            return _tmpl$4();
          }
        }), null);
        insert(_el$13, createComponent(Show, {
          get when() {
            return memo(() => !!actions())() && actions().actions.length > 0;
          },
          get children() {
            var _el$18 = _tmpl$2();
            insert(_el$18, createComponent(For, {
              get each() {
                return actions().actions;
              },
              children: (action) => (() => {
                var _el$70 = _tmpl$12(), _el$71 = _el$70.firstChild, _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$76 = _el$73.firstChild, _el$78 = _el$73.nextSibling, _el$79 = _el$72.nextSibling;
                insert(_el$73, createComponent(Show, {
                  get when() {
                    return action.success;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), _el$76);
                insert(_el$73, createComponent(Show, {
                  get when() {
                    return !action.success;
                  },
                  get children() {
                    return _tmpl$10();
                  }
                }), _el$76);
                insert(_el$76, () => action.action);
                insert(_el$73, createComponent(Show, {
                  get when() {
                    return action.automated;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$78, () => action.details);
                insert(_el$79, () => new Date(action.timestamp).toLocaleString());
                return _el$70;
              })()
            }));
            return _el$18;
          }
        }), null);
        return _el$13;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "config")() && sreStatus();
      },
      children: (status) => (() => {
        var _el$80 = _tmpl$18(), _el$81 = _el$80.firstChild; _el$81.firstChild; var _el$87 = _el$81.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild; _el$89.firstChild; var _el$93 = _el$89.nextSibling; _el$93.firstChild; var _el$97 = _el$93.nextSibling; _el$97.firstChild; var _el$101 = _el$97.nextSibling; _el$101.firstChild; var _el$105 = _el$101.nextSibling; _el$105.firstChild; var _el$109 = _el$88.nextSibling, _el$110 = _el$109.firstChild, _el$111 = _el$110.nextSibling, _el$112 = _el$109.nextSibling, _el$113 = _el$112.firstChild, _el$114 = _el$113.nextSibling;
        insert(_el$81, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$83 = _tmpl$13();
            _el$83.$$click = startEditing;
            return _el$83;
          }
        }), null);
        insert(_el$81, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$84 = _tmpl$14(), _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling;
            _el$85.$$click = () => setConfigEditing(false);
            _el$86.$$click = saveConfig;
            return _el$84;
          }
        }), null);
        insert(_el$89, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$91 = _tmpl$15();
            _el$91.addEventListener("change", (e) => setConfigForm({
              ...configForm(),
              autoRemediate: e.target.checked
            }));
            createRenderEffect(() => _el$91.checked = configForm().autoRemediate);
            return _el$91;
          }
        }), null);
        insert(_el$89, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$92 = _tmpl$16();
            insert(_el$92, () => status().autoRemediate ? "Enabled" : "Disabled");
            return _el$92;
          }
        }), null);
        insert(_el$93, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$95 = _tmpl$15();
            _el$95.addEventListener("change", (e) => setConfigForm({
              ...configForm(),
              learningEnabled: e.target.checked
            }));
            createRenderEffect(() => _el$95.checked = configForm().learningEnabled);
            return _el$95;
          }
        }), null);
        insert(_el$93, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$96 = _tmpl$16();
            insert(_el$96, () => status().learningEnabled ? "Enabled" : "Disabled");
            return _el$96;
          }
        }), null);
        insert(_el$97, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$99 = _tmpl$15();
            _el$99.addEventListener("change", (e) => setConfigForm({
              ...configForm(),
              notificationEnabled: e.target.checked
            }));
            createRenderEffect(() => _el$99.checked = configForm().notificationEnabled);
            return _el$99;
          }
        }), null);
        insert(_el$97, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$100 = _tmpl$16();
            insert(_el$100, () => status().notificationEnabled ? "Enabled" : "Disabled");
            return _el$100;
          }
        }), null);
        insert(_el$101, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$103 = _tmpl$15();
            _el$103.addEventListener("change", (e) => setConfigForm({
              ...configForm(),
              batchMonitoring: e.target.checked
            }));
            createRenderEffect(() => _el$103.checked = configForm().batchMonitoring);
            return _el$103;
          }
        }), null);
        insert(_el$101, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$104 = _tmpl$16();
            insert(_el$104, () => status().batchMonitoring ? "Enabled" : "Disabled");
            return _el$104;
          }
        }), null);
        insert(_el$105, createComponent(Show, {
          get when() {
            return configEditing();
          },
          get children() {
            var _el$107 = _tmpl$17();
            _el$107.addEventListener("change", (e) => setConfigForm({
              ...configForm(),
              maxAutoActionsPerHour: parseInt(e.target.value)
            }));
            createRenderEffect(() => _el$107.value = configForm().maxAutoActionsPerHour);
            return _el$107;
          }
        }), null);
        insert(_el$105, createComponent(Show, {
          get when() {
            return !configEditing();
          },
          get children() {
            var _el$108 = _tmpl$16();
            insert(_el$108, () => status().maxAutoActionsPerHour);
            return _el$108;
          }
        }), null);
        insert(_el$111, createComponent(For, {
          get each() {
            return status().autoRemediateTypes;
          },
          children: (type) => (() => {
            var _el$115 = _tmpl$19();
            insert(_el$115, type);
            return _el$115;
          })()
        }));
        insert(_el$114, () => status().batchSLO);
        return _el$80;
      })()
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = `px-4 py-2 font-medium transition-colors ${activeTab() === "overview" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"}`, _v$2 = `px-4 py-2 font-medium transition-colors ${activeTab() === "incidents" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"}`, _v$3 = `px-4 py-2 font-medium transition-colors ${activeTab() === "actions" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"}`, _v$4 = `px-4 py-2 font-medium transition-colors ${activeTab() === "config" ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-gray-300"}`;
      _v$ !== _p$.e && className(_el$5, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$6, _p$.t = _v$2);
      _v$3 !== _p$.a && className(_el$7, _p$.a = _v$3);
      _v$4 !== _p$.o && className(_el$8, _p$.o = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { SREAgent as default };
//# sourceMappingURL=SREAgent-DAYphxx6.js.map
