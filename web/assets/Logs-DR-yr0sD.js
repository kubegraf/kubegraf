import { c as createSignal, j as createResource, k as api, P as namespace, a as createMemo, o as onMount, E as onCleanup, t as template, i as insert, m as memo, d as createComponent, S as Show, F as For, f as createRenderEffect, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<option disabled>Loading pods...`), _tmpl$2 = /* @__PURE__ */ template(`<option disabled>Loading containers...`), _tmpl$3 = /* @__PURE__ */ template(`<option disabled>No containers found`), _tmpl$4 = /* @__PURE__ */ template(`<div class="p-4 bg-red-500/10 border-l-4 border-red-500"><p style=color:var(--error-color)>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading logs...`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4 opacity-50"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><p>Select a pod and container, then click "Fetch Logs"`), _tmpl$7 = /* @__PURE__ */ template(`<div id=logs-container class="p-4 font-mono text-sm overflow-auto"style="background:#0d1117;color:#c9d1d9;max-height:calc(100vh - 400px);white-space:pre-wrap;word-break:break-word">`), _tmpl$8 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Logs</h1><p style=color:var(--text-secondary)>View and stream pod container logs</p></div><div class="flex items-center gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--accent-primary);color:white></button><button class="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-tertiary);color:var(--text-primary)>Download</button></div></div><div class="card p-4"><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Namespace</label><select class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option></option></select></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Pod</label><select class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value>Select a pod</option></select></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Container</label><select class="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value>Select a container</option></select></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Tail Lines</label><input type=number min=10 max=10000 class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div class="flex items-center gap-4 mt-4"><label class="flex items-center gap-2 cursor-pointer"><input type=checkbox class="w-4 h-4 rounded"><span class=text-sm style=color:var(--text-secondary)>Follow logs (stream)</span></label></div></div><div class="card p-4"><input type=text placeholder="Search logs..."class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class="card overflow-hidden">`), _tmpl$9 = /* @__PURE__ */ template(`<option> (<!>)`), _tmpl$0 = /* @__PURE__ */ template(`<option>`);
const Logs = () => {
  console.log("[Logs] Component rendering");
  const [selectedPod, setSelectedPod] = createSignal("");
  const [selectedContainer, setSelectedContainer] = createSignal("");
  const [selectedNamespace, setSelectedNamespace] = createSignal("");
  const [tailLines, setTailLines] = createSignal(100);
  const [follow, setFollow] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [logsContent, setLogsContent] = createSignal("");
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [logsError, setLogsError] = createSignal(null);
  let logsEventSource = null;
  const [pods] = createResource(() => namespace(), async (ns) => {
    try {
      console.log("[Logs] Fetching pods for namespace:", ns);
      const nsParam = ns === "_all" ? void 0 : ns;
      const podList = await api.getPods(nsParam);
      console.log("[Logs] Fetched pods:", podList?.length || 0);
      return Array.isArray(podList) ? podList : [];
    } catch (err) {
      console.error("[Logs] Failed to fetch pods:", err);
      return [];
    }
  });
  const [podDetails] = createResource(() => {
    const podName = selectedPod();
    const ns = selectedNamespace() || namespace();
    if (!podName) return null;
    const nsParam = ns === "_all" ? void 0 : ns;
    const actualNs = nsParam || "default";
    return {
      pod: podName,
      namespace: actualNs
    };
  }, async (params) => {
    if (!params) return null;
    try {
      console.log("[Logs] Fetching pod details:", params);
      const details = await api.getPodDetails(params.pod, params.namespace);
      console.log("[Logs] Pod details:", details);
      return details;
    } catch (err) {
      console.error("[Logs] Failed to fetch pod details:", err);
      return null;
    }
  });
  const containers = createMemo(() => {
    try {
      const details = podDetails();
      if (!details || !details.containers) {
        return [];
      }
      if (!Array.isArray(details.containers)) {
        console.warn("[Logs] podDetails.containers is not an array:", typeof details.containers, details.containers);
        return [];
      }
      const conts = details.containers.map((c) => c.name || c).filter(Boolean);
      console.log("[Logs] Containers:", conts);
      return conts;
    } catch (err) {
      console.error("[Logs] Error in containers memo:", err);
      return [];
    }
  });
  const stopLogStream = () => {
    if (logsEventSource) {
      logsEventSource.close();
      logsEventSource = null;
    }
  };
  const fetchLogs = async () => {
    const pod = selectedPod();
    const container = selectedContainer();
    const ns = selectedNamespace() || namespace();
    if (!pod || !container) {
      setLogsError("Please select a pod and container");
      return;
    }
    stopLogStream();
    setLogsLoading(true);
    setLogsError(null);
    const nsParam = ns === "_all" ? void 0 : ns;
    const actualNs = nsParam || "default";
    const url = `/api/pod/logs?name=${pod}&namespace=${actualNs}&container=${container}&tail=${tailLines()}${follow() ? "&follow=true" : ""}`;
    if (follow()) {
      setLogsContent("");
      logsEventSource = new EventSource(url);
      logsEventSource.onmessage = (event) => {
        setLogsContent((prev) => prev + event.data + "\n");
        setLogsLoading(false);
        setTimeout(() => {
          const logContainer = document.getElementById("logs-container");
          if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
          }
        }, 50);
      };
      logsEventSource.onerror = () => {
        setLogsError("Stream connection lost");
        setLogsLoading(false);
        stopLogStream();
      };
      logsEventSource.onopen = () => {
        setLogsLoading(false);
      };
    } else {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setLogsContent(data.logs || "No logs available");
      } catch (e) {
        setLogsError(e.message || "Failed to fetch logs");
        setLogsContent("");
      } finally {
        setLogsLoading(false);
      }
    }
  };
  const filteredLogs = createMemo(() => {
    const logs = logsContent();
    const query = search().toLowerCase();
    if (!query) return logs;
    return logs.split("\n").filter((line) => line.toLowerCase().includes(query)).join("\n");
  });
  const downloadLogs = () => {
    const blob = new Blob([logsContent()], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPod()}-${selectedContainer() || "logs"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  createMemo(() => {
    const conts = containers();
    if (conts.length > 0 && !selectedContainer()) {
      setSelectedContainer(conts[0]);
    }
  });
  onMount(() => {
    console.log("[Logs] Component mounted successfully");
  });
  onCleanup(() => {
    stopLogStream();
  });
  const podsList = createMemo(() => {
    try {
      if (pods.loading) return [];
      if (pods.error) {
        console.error("[Logs] pods resource error:", pods.error);
        return [];
      }
      const p = pods();
      if (p === void 0 || p === null) return [];
      if (!Array.isArray(p)) {
        console.warn("[Logs] pods() returned non-array:", typeof p, p);
        return [];
      }
      return p;
    } catch (err) {
      console.error("[Logs] Error in podsList memo:", err);
      return [];
    }
  });
  console.log("[Logs] Component rendering - RETURNING JSX");
  return (() => {
    var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$1.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling; _el$15.firstChild; var _el$18 = _el$13.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling; _el$20.firstChild; var _el$24 = _el$18.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$0.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild; _el$29.nextSibling; var _el$31 = _el$9.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$31.nextSibling;
    _el$7.$$click = fetchLogs;
    insert(_el$7, () => logsLoading() ? "Loading..." : "Fetch Logs");
    _el$8.$$click = downloadLogs;
    _el$11.addEventListener("change", (e) => {
      setSelectedNamespace(e.currentTarget.value);
      setSelectedPod("");
      setSelectedContainer("");
    });
    insert(_el$12, (() => {
      var _c$ = memo(() => namespace() === "_all");
      return () => _c$() ? "All Namespaces" : namespace();
    })());
    _el$15.addEventListener("change", (e) => {
      setSelectedPod(e.currentTarget.value);
      setSelectedContainer("");
    });
    insert(_el$15, createComponent(Show, {
      get when() {
        return pods.loading;
      },
      get children() {
        return _tmpl$();
      }
    }), null);
    insert(_el$15, createComponent(Show, {
      get when() {
        return memo(() => !!(!pods.loading && Array.isArray(podsList())))() && podsList().length > 0;
      },
      get children() {
        return createComponent(For, {
          get each() {
            return podsList();
          },
          children: (pod) => (() => {
            var _el$41 = _tmpl$9(), _el$42 = _el$41.firstChild, _el$44 = _el$42.nextSibling; _el$44.nextSibling;
            insert(_el$41, () => pod.name, _el$42);
            insert(_el$41, () => pod.namespace || "default", _el$44);
            createRenderEffect(() => _el$41.value = pod.name);
            return _el$41;
          })()
        });
      }
    }), null);
    _el$20.addEventListener("change", (e) => setSelectedContainer(e.currentTarget.value));
    insert(_el$20, createComponent(Show, {
      get when() {
        return podDetails.loading;
      },
      get children() {
        return _tmpl$2();
      }
    }), null);
    insert(_el$20, createComponent(Show, {
      get when() {
        return memo(() => !!!podDetails.loading)() && containers().length > 0;
      },
      get children() {
        return createComponent(For, {
          get each() {
            return containers();
          },
          children: (container) => (() => {
            var _el$45 = _tmpl$0();
            _el$45.value = container;
            insert(_el$45, container);
            return _el$45;
          })()
        });
      }
    }), null);
    insert(_el$20, createComponent(Show, {
      get when() {
        return memo(() => !!(!podDetails.loading && selectedPod()))() && containers().length === 0;
      },
      get children() {
        return _tmpl$3();
      }
    }), null);
    _el$26.addEventListener("change", (e) => setTailLines(parseInt(e.currentTarget.value) || 100));
    _el$29.addEventListener("change", (e) => {
      setFollow(e.currentTarget.checked);
      if (e.currentTarget.checked && selectedPod() && selectedContainer()) {
        fetchLogs();
      } else {
        stopLogStream();
      }
    });
    _el$32.$$input = (e) => setSearch(e.currentTarget.value);
    insert(_el$33, createComponent(Show, {
      get when() {
        return logsError();
      },
      get children() {
        var _el$34 = _tmpl$4(), _el$35 = _el$34.firstChild;
        insert(_el$35, logsError);
        return _el$34;
      }
    }), null);
    insert(_el$33, createComponent(Show, {
      get when() {
        return memo(() => !!logsLoading())() && !logsContent();
      },
      get children() {
        var _el$36 = _tmpl$5(), _el$37 = _el$36.firstChild; _el$37.nextSibling;
        return _el$36;
      }
    }), null);
    insert(_el$33, createComponent(Show, {
      get when() {
        return memo(() => !!(!logsContent() && !logsLoading()))() && !logsError();
      },
      get children() {
        return _tmpl$6();
      }
    }), null);
    insert(_el$33, createComponent(Show, {
      get when() {
        return logsContent();
      },
      get children() {
        var _el$40 = _tmpl$7();
        insert(_el$40, () => filteredLogs() || "No logs available");
        return _el$40;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = !selectedPod() || !selectedContainer() || logsLoading(), _v$2 = !logsContent(), _v$3 = !selectedPod(), _v$4 = !selectedPod() || !selectedContainer();
      _v$ !== _p$.e && (_el$7.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$8.disabled = _p$.t = _v$2);
      _v$3 !== _p$.a && (_el$20.disabled = _p$.a = _v$3);
      _v$4 !== _p$.o && (_el$29.disabled = _p$.o = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    createRenderEffect(() => _el$12.value = namespace());
    createRenderEffect(() => _el$11.value = selectedNamespace() || namespace());
    createRenderEffect(() => _el$15.value = selectedPod());
    createRenderEffect(() => _el$20.value = selectedContainer());
    createRenderEffect(() => _el$26.value = tailLines());
    createRenderEffect(() => _el$29.checked = follow());
    createRenderEffect(() => _el$32.value = search());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { Logs as default };
//# sourceMappingURL=Logs-DR-yr0sD.js.map
