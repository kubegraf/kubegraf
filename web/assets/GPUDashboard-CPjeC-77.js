import { a2 as fetchAPI, t as template, i as insert, d as createComponent, S as Show, F as For, m as memo, f as createRenderEffect, h as setStyleProperty, c as createSignal, j as createResource, k as api, u as addEventListener, v as delegateEvents, o as onMount } from './index-Bh-O-sIc.js';

const gpuService = {
  getStatus: async () => {
    return fetchAPI("/gpu/status");
  },
  getNodes: async () => {
    return fetchAPI("/gpu/nodes");
  },
  getMetrics: async () => {
    return fetchAPI("/gpu/metrics");
  },
  install: async (request) => {
    return fetchAPI("/gpu/install", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
};

var _tmpl$$2 = /* @__PURE__ */ template(`<div class=space-y-6>`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class=mt-6><div class="text-sm font-medium mb-3"style=color:var(--text-secondary)>Running Processes</div><div class=space-y-2>`), _tmpl$3$2 = /* @__PURE__ */ template(`<div class="card rounded-lg p-6 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="flex items-center justify-between mb-4"><div><h3 class="text-lg font-semibold"style=color:var(--text-primary)> - GPU </h3><p class=text-sm style=color:var(--text-secondary)>Last updated: </p></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-4"><div><div class="text-sm mb-2"style=color:var(--text-secondary)>Utilization</div><div class="text-2xl font-bold"style=color:var(--accent-primary)>%</div><div class="w-full h-2 rounded-full mt-2"style=background:var(--bg-secondary)><div class="h-2 rounded-full transition-all"style=background:var(--accent-primary)></div></div></div><div><div class="text-sm mb-2"style=color:var(--text-secondary)>Memory</div><div class="text-2xl font-bold"style=color:var(--text-primary)></div><div class="text-sm mt-1"style=color:var(--text-muted)>/ </div><div class="w-full h-2 rounded-full mt-2"style=background:var(--bg-secondary)><div class="h-2 rounded-full transition-all"></div></div></div><div><div class="text-sm mb-2"style=color:var(--text-secondary)>Temperature</div><div class="text-2xl font-bold">°C</div></div><div><div class="text-sm mb-2"style=color:var(--text-secondary)>Power Draw</div><div class="text-2xl font-bold"style=color:var(--text-primary)>W`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded border"style=background:var(--bg-secondary);borderColor:var(--border-color)><div><div class=font-medium style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)>PID: </div></div><div class=text-right><div class="text-sm font-medium"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)>% GPU`);
const GPUCharts = (props) => {
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };
  return (() => {
    var _el$ = _tmpl$$2();
    insert(_el$, createComponent(For, {
      get each() {
        return props.metrics;
      },
      children: (metric) => (() => {
        var _el$2 = _tmpl$3$2(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$5.nextSibling; _el$7.firstChild; var _el$9 = _el$3.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$10.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$0.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.nextSibling; _el$17.firstChild; var _el$19 = _el$17.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$14.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$21.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$27.firstChild;
        insert(_el$5, () => metric.nodeName, _el$6);
        insert(_el$5, () => metric.gpuId, null);
        insert(_el$7, () => new Date(metric.timestamp).toLocaleString(), null);
        insert(_el$10, () => metric.utilization.toFixed(1), _el$11);
        insert(_el$16, () => formatBytes(metric.memoryUsed));
        insert(_el$17, () => formatBytes(metric.memoryTotal), null);
        insert(_el$23, () => metric.temperature.toFixed(1), _el$24);
        insert(_el$27, () => metric.powerDraw.toFixed(1), _el$28);
        insert(_el$2, createComponent(Show, {
          get when() {
            return memo(() => !!metric.processes)() && metric.processes.length > 0;
          },
          get children() {
            var _el$29 = _tmpl$2$2(), _el$30 = _el$29.firstChild, _el$31 = _el$30.nextSibling;
            insert(_el$31, createComponent(For, {
              get each() {
                return metric.processes;
              },
              children: (process) => (() => {
                var _el$32 = _tmpl$4$1(), _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling; _el$35.firstChild; var _el$37 = _el$33.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$39.firstChild;
                insert(_el$34, () => process.name);
                insert(_el$35, () => process.pid, null);
                insert(_el$38, () => formatBytes(process.memory));
                insert(_el$39, () => process.utilization.toFixed(1), _el$40);
                return _el$32;
              })()
            }));
            return _el$29;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$ = `${Math.min(metric.utilization, 100)}%`, _v$2 = metric.memoryUsed / metric.memoryTotal > 0.8 ? "var(--error-color)" : "var(--accent-primary)", _v$3 = `${Math.min(metric.memoryUsed / metric.memoryTotal * 100, 100)}%`, _v$4 = metric.temperature > 80 ? "var(--error-color)" : metric.temperature > 60 ? "#f59e0b" : "var(--text-primary)";
          _v$ !== _p$.e && setStyleProperty(_el$13, "width", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$20, "background", _p$.t = _v$2);
          _v$3 !== _p$.a && setStyleProperty(_el$20, "width", _p$.a = _v$3);
          _v$4 !== _p$.o && setStyleProperty(_el$23, "color", _p$.o = _v$4);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        });
        return _el$2;
      })()
    }));
    return _el$;
  })();
};

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="rounded-lg p-3 text-sm border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">`), _tmpl$2$1 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="rounded-lg shadow-xl max-w-2xl w-full m-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class=p-6><div class="flex items-center justify-between mb-6"><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Install DCGM Exporter</h2><button class="text-2xl transition-colors hover:opacity-70"style=color:var(--text-secondary)>×</button></div><div class=space-y-6><div class="rounded-lg p-4 border"style="background:rgba(6, 182, 212, 0.1);borderColor:var(--accent-primary)"><p class=text-sm style=color:var(--text-primary)>DCGM (Data Center GPU Manager) Exporter provides GPU metrics including utilization, memory usage, temperature, and power consumption.</p></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Namespace</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=gpu-operator>gpu-operator</option></select></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Version</label><input type=text placeholder=latest class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div></div><div class="flex gap-3 justify-end pt-4 border-t"style=borderColor:var(--border-color)><button class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-secondary)>Cancel</button><button class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$3$1 = /* @__PURE__ */ template(`<option>`);
const GPUInstallWizard = (props) => {
  const [namespace, setNamespace] = createSignal("gpu-operator");
  const [version, setVersion] = createSignal("latest");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [namespaces] = createResource(api.getNamespaces);
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const request = {
        namespace: namespace(),
        version: version() || void 0
      };
      const result = await gpuService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || "Failed to install DCGM exporter");
      }
    } catch (err) {
      setError(err.message || "Failed to install DCGM exporter");
    } finally {
      setSubmitting(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$2$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild; _el$8.firstChild; var _el$0 = _el$8.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling; _el$11.firstChild; var _el$13 = _el$1.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$17 = _el$0.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
    addEventListener(_el$6, "click", props.onClose, true);
    _el$11.addEventListener("change", (e) => setNamespace(e.currentTarget.value));
    insert(_el$11, createComponent(For, {
      get each() {
        return namespaces() || [];
      },
      children: (ns) => (() => {
        var _el$20 = _tmpl$3$1();
        _el$20.value = ns;
        insert(_el$20, ns);
        return _el$20;
      })()
    }), null);
    _el$15.$$input = (e) => setVersion(e.currentTarget.value);
    insert(_el$7, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$16 = _tmpl$$1();
        insert(_el$16, error);
        return _el$16;
      }
    }), _el$17);
    addEventListener(_el$18, "click", props.onClose, true);
    _el$19.$$click = handleSubmit;
    insert(_el$19, () => submitting() ? "Installing..." : "Install DCGM Exporter");
    createRenderEffect((_p$) => {
      var _v$ = submitting(), _v$2 = submitting();
      _v$ !== _p$.e && (_el$18.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$19.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$11.value = namespace());
    createRenderEffect(() => _el$15.value = version());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Install DCGM Exporter`), _tmpl$2 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading...`), _tmpl$3 = /* @__PURE__ */ template(`<div class=mb-6><h3 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>GPU Nodes Detected</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`), _tmpl$4 = /* @__PURE__ */ template(`<p class="text-xs mb-4 p-2 rounded"style="background:rgba(6, 182, 212, 0.1);color:var(--accent-primary)">✓ <!> GPU node(s) detected automatically`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p class=mb-4 style=color:var(--text-secondary)></p><p class="text-sm mb-6"style=color:var(--text-muted)>DCGM Exporter provides detailed GPU metrics: utilization, memory usage, temperature, and power consumption.</p><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Install DCGM Exporter`), _tmpl$6 = /* @__PURE__ */ template(`<div class="grid grid-cols-4 gap-4 mb-6"><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Status</div><div class="text-lg font-semibold text-green-500">Active</div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Namespace</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Service URL</div><div class="text-lg font-mono text-xs break-all"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>GPUs Monitored</div><div class="text-lg font-semibold"style=color:var(--text-primary)>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading GPU metrics...`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p style=color:var(--text-secondary)>No GPU metrics available</p><p class="text-sm mt-2"style=color:var(--text-muted)>Make sure GPU nodes are available and DCGM exporter is running`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>GPU Dashboard</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Monitor GPU utilization, memory, temperature, and power consumption</p></div><div class="flex gap-2"><label class="flex items-center gap-2"><input type=checkbox class="w-4 h-4"><span class=text-sm style=color:var(--text-secondary)>Auto-refresh</span></label><button class="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-primary)>Refresh`), _tmpl$0 = /* @__PURE__ */ template(`<div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="font-medium mb-2"style=color:var(--text-primary)></div><div class="text-sm space-y-1"><div style=color:var(--text-secondary)><span class=font-medium>GPUs:</span> `), _tmpl$1 = /* @__PURE__ */ template(`<div style=color:var(--text-secondary)><span class=font-medium>Type:</span> `);
const GPUDashboard = () => {
  const [showWizard, setShowWizard] = createSignal(false);
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  let refreshInterval;
  const [status, {
    refetch: refetchStatus
  }] = createResource(() => refetchTrigger(), async () => {
    return await gpuService.getStatus();
  });
  const [metrics, {
    refetch: refetchMetrics
  }] = createResource(() => [refetchTrigger(), autoRefresh()], async () => {
    if (!status()?.dcgmInstalled) {
      return {
        metrics: []
      };
    }
    return await gpuService.getMetrics();
  });
  onMount(() => {
    refreshInterval = setInterval(() => {
      if (autoRefresh()) {
        refetchMetrics();
      }
    }, 5e3);
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });
  const handleInstallSuccess = () => {
    setRefetchTrigger((prev) => prev + 1);
    setShowWizard(false);
  };
  return (() => {
    var _el$ = _tmpl$9(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild; _el$8.nextSibling; var _el$0 = _el$7.nextSibling;
    _el$8.addEventListener("change", (e) => setAutoRefresh(e.currentTarget.checked));
    _el$0.$$click = () => refetchMetrics();
    insert(_el$6, createComponent(Show, {
      get when() {
        return !status()?.dcgmInstalled;
      },
      get children() {
        var _el$1 = _tmpl$();
        _el$1.$$click = () => setShowWizard(true);
        return _el$1;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return showWizard();
      },
      get children() {
        return createComponent(GPUInstallWizard, {
          onClose: () => setShowWizard(false),
          onSuccess: handleInstallSuccess
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return status.loading;
      },
      get children() {
        return _tmpl$2();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!status.loading)() && status();
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return memo(() => !!(status().gpuNodesFound && status().gpuNodes))() && status().gpuNodes.length > 0;
          },
          get children() {
            var _el$11 = _tmpl$3(), _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
            insert(_el$13, createComponent(For, {
              get each() {
                return status().gpuNodes;
              },
              children: (node) => (() => {
                var _el$38 = _tmpl$0(), _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild; _el$42.nextSibling;
                insert(_el$39, () => node.nodeName);
                insert(_el$41, () => node.totalGPUs, null);
                insert(_el$40, (() => {
                  var _c$ = memo(() => !!node.gpuType);
                  return () => _c$() && (() => {
                    var _el$44 = _tmpl$1(), _el$45 = _el$44.firstChild; _el$45.nextSibling;
                    insert(_el$44, () => node.gpuType, null);
                    return _el$44;
                  })();
                })(), null);
                return _el$38;
              })()
            }));
            return _el$11;
          }
        }), createComponent(Show, {
          get when() {
            return !status().dcgmInstalled;
          },
          get children() {
            var _el$14 = _tmpl$5(), _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$21 = _el$16.nextSibling;
            insert(_el$15, () => status().gpuNodesFound ? "DCGM Exporter is not installed. Install it to view detailed GPU metrics." : "No GPU nodes detected. DCGM Exporter can be installed to monitor GPU metrics when available.");
            insert(_el$14, createComponent(Show, {
              get when() {
                return status().gpuNodesFound;
              },
              get children() {
                var _el$17 = _tmpl$4(), _el$18 = _el$17.firstChild, _el$20 = _el$18.nextSibling; _el$20.nextSibling;
                insert(_el$17, () => status().gpuNodes.length, _el$20);
                return _el$17;
              }
            }), _el$21);
            _el$21.$$click = () => setShowWizard(true);
            return _el$14;
          }
        }), createComponent(Show, {
          get when() {
            return status().dcgmInstalled;
          },
          get children() {
            return [(() => {
              var _el$22 = _tmpl$6(), _el$23 = _el$22.firstChild; _el$23.firstChild; var _el$25 = _el$23.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$25.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$28.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling;
              insert(_el$27, () => status().namespace || "N/A");
              insert(_el$30, () => status().serviceURL || "N/A");
              insert(_el$33, () => metrics()?.metrics.length || 0);
              return _el$22;
            })(), createComponent(Show, {
              get when() {
                return metrics.loading;
              },
              get children() {
                return _tmpl$7();
              }
            }), createComponent(Show, {
              get when() {
                return memo(() => !!(!metrics.loading && metrics()?.metrics))() && metrics().metrics.length > 0;
              },
              get children() {
                return createComponent(GPUCharts, {
                  get metrics() {
                    return metrics().metrics;
                  }
                });
              }
            }), createComponent(Show, {
              get when() {
                return memo(() => !!!metrics.loading)() && (!metrics()?.metrics || metrics().metrics.length === 0);
              },
              get children() {
                var _el$35 = _tmpl$8(), _el$36 = _el$35.firstChild; _el$36.nextSibling;
                return _el$35;
              }
            })];
          }
        })];
      }
    }), null);
    createRenderEffect(() => _el$8.checked = autoRefresh());
    return _el$;
  })();
};
delegateEvents(["click"]);

const GPUDashboardRoute = () => {
  return createComponent(GPUDashboard, {});
};

export { GPUDashboardRoute as default };
//# sourceMappingURL=GPUDashboard-CPjeC-77.js.map
