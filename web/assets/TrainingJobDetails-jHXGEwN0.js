import { a2 as fetchAPI, c as createSignal, j as createResource, k as api, o as onMount, E as onCleanup, t as template, i as insert, d as createComponent, S as Show, m as memo, f as createRenderEffect, g as className, q as style, v as delegateEvents } from './index-Bh-O-sIc.js';

const mlJobsService = {
  create: async (request) => {
    return fetchAPI("/ml/jobs/create", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  list: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" ? `/ml/jobs/list?namespace=${namespace}` : "/ml/jobs/list";
    return fetchAPI(endpoint);
  },
  get: async (name, namespace) => {
    return fetchAPI(`/ml/jobs/get?name=${name}&namespace=${namespace}`);
  },
  delete: async (name, namespace) => {
    return fetchAPI("/ml/jobs/delete", {
      method: "POST",
      body: JSON.stringify({ name, namespace })
    });
  },
  getLogs: async (name, namespace, follow = false) => {
    const endpoint = `/ml/jobs/logs?name=${name}&namespace=${namespace}&follow=${follow}`;
    const response = await fetch(`/api${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }
    return response.text();
  },
  streamLogs: (name, namespace, onMessage, onError) => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ml/jobs/logs/ws?name=${name}&namespace=${namespace}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      onMessage(event.data);
    };
    ws.onerror = (error) => {
      onError(new Error("WebSocket error"));
    };
    ws.onclose = () => {
    };
    return ws;
  }
};

var _tmpl$ = /* @__PURE__ */ template(`<div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Completed</div><div class=text-lg style=color:var(--text-primary)>`), _tmpl$2 = /* @__PURE__ */ template(`<div class=space-y-4><div class="grid grid-cols-2 gap-4"><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Status</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Image</div><div class="text-lg font-mono text-sm"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Created</div><div class=text-lg style=color:var(--text-primary)></div></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Resources</div><div class="grid grid-cols-3 gap-4">`), _tmpl$3 = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-white transition-colors"style="background:rgba(34, 197, 94, 0.8);color:#fff">Start Streaming`), _tmpl$4 = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-white transition-colors"style="background:rgba(239, 68, 68, 0.8);color:#fff">Stop Streaming`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex gap-2"><button class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>Refresh Logs</button></div><div class="font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto border"style=background:#000;borderColor:var(--border-color);color:#22c55e><pre class=whitespace-pre-wrap>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="font-mono text-sm p-4 rounded-lg overflow-x-auto border"style=background:#1a1a1a;borderColor:var(--border-color);color:#e5e5e5><pre class=whitespace-pre>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)></h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Namespace: </p></div><button class="px-4 py-2 rounded-lg text-white text-sm transition-colors"style=background:var(--accent-primary);color:#000>Refresh</button></div><div class=border-b style=borderColor:var(--border-color)><div class="flex gap-4"><button>Overview</button><button>Logs</button><button>YAML`), _tmpl$8 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>CPU</div><div class=font-medium style=color:var(--text-primary)>`), _tmpl$9 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>Memory</div><div class=font-medium style=color:var(--text-primary)>`), _tmpl$0 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>GPU</div><div class=font-medium style=color:var(--text-primary)>`);
const TrainingJobDetails = (props) => {
  const [activeTab, setActiveTab] = createSignal("overview");
  const [logs, setLogs] = createSignal("");
  const [streaming, setStreaming] = createSignal(false);
  const [ws, setWs] = createSignal(null);
  const [job, {
    refetch
  }] = createResource(() => ({
    name: props.jobName,
    namespace: props.jobNamespace
  }), async (params) => {
    return await mlJobsService.get(params.name, params.namespace);
  });
  const [yaml] = createResource(() => job() ? {
    name: props.jobName,
    namespace: props.jobNamespace
  } : null, async (params) => {
    if (!params) return "";
    const data = await api.getJobYAML(params.name, params.namespace);
    return data.yaml || "";
  });
  const fetchLogs = async () => {
    try {
      const logText = await mlJobsService.getLogs(props.jobName, props.jobNamespace, false);
      setLogs(logText);
    } catch (error) {
      setLogs(`Error fetching logs: ${error.message}`);
    }
  };
  const startStreaming = () => {
    if (streaming()) return;
    setStreaming(true);
    setLogs("");
    const websocket = mlJobsService.streamLogs(props.jobName, props.jobNamespace, (message) => {
      setLogs((prev) => prev + message);
    }, (error) => {
      setLogs((prev) => prev + `
Error: ${error.message}
`);
      setStreaming(false);
    });
    setWs(websocket);
  };
  const stopStreaming = () => {
    if (ws()) {
      ws().close();
      setWs(null);
    }
    setStreaming(false);
  };
  onMount(() => {
    if (activeTab() === "logs") {
      fetchLogs();
    }
  });
  onCleanup(() => {
    stopStreaming();
  });
  return (() => {
    var _el$ = _tmpl$7(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling; _el$5.firstChild; var _el$7 = _el$3.nextSibling, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling;
    insert(_el$4, () => props.jobName);
    insert(_el$5, () => props.jobNamespace, null);
    _el$7.$$click = () => refetch();
    _el$0.$$click = () => setActiveTab("overview");
    _el$1.$$click = () => {
      setActiveTab("logs");
      if (!streaming()) {
        fetchLogs();
      }
    };
    _el$10.$$click = () => setActiveTab("yaml");
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "overview")() && job();
      },
      get children() {
        var _el$11 = _tmpl$2(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$25 = _el$12.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling;
        insert(_el$15, () => job()?.status);
        insert(_el$18, () => job()?.image);
        insert(_el$21, () => new Date(job()?.createdAt || "").toLocaleString());
        insert(_el$12, createComponent(Show, {
          get when() {
            return job()?.completedAt;
          },
          get children() {
            var _el$22 = _tmpl$(), _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling;
            insert(_el$24, () => new Date(job()?.completedAt || "").toLocaleString());
            return _el$22;
          }
        }), null);
        insert(_el$27, (() => {
          var _c$ = memo(() => !!job()?.resources.cpu);
          return () => _c$() && (() => {
            var _el$37 = _tmpl$8(), _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling;
            insert(_el$39, () => job()?.resources.cpu);
            return _el$37;
          })();
        })(), null);
        insert(_el$27, (() => {
          var _c$2 = memo(() => !!job()?.resources.memory);
          return () => _c$2() && (() => {
            var _el$40 = _tmpl$9(), _el$41 = _el$40.firstChild, _el$42 = _el$41.nextSibling;
            insert(_el$42, () => job()?.resources.memory);
            return _el$40;
          })();
        })(), null);
        insert(_el$27, (() => {
          var _c$3 = memo(() => !!job()?.resources.gpu);
          return () => _c$3() && (() => {
            var _el$43 = _tmpl$0(), _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling;
            insert(_el$45, () => job()?.resources.gpu);
            return _el$43;
          })();
        })(), null);
        return _el$11;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "logs";
      },
      get children() {
        var _el$28 = _tmpl$5(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$33 = _el$29.nextSibling, _el$34 = _el$33.firstChild;
        _el$30.$$click = fetchLogs;
        insert(_el$29, createComponent(Show, {
          get when() {
            return !streaming();
          },
          get children() {
            var _el$31 = _tmpl$3();
            _el$31.$$click = startStreaming;
            return _el$31;
          }
        }), null);
        insert(_el$29, createComponent(Show, {
          get when() {
            return streaming();
          },
          get children() {
            var _el$32 = _tmpl$4();
            _el$32.$$click = stopStreaming;
            return _el$32;
          }
        }), null);
        insert(_el$34, () => logs() || "No logs available");
        createRenderEffect(() => _el$30.disabled = streaming());
        return _el$28;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "yaml";
      },
      get children() {
        var _el$35 = _tmpl$6(), _el$36 = _el$35.firstChild;
        insert(_el$36, () => yaml() || "Loading YAML...");
        return _el$35;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "overview" ? "" : "border-transparent"}`, _v$2 = activeTab() === "overview" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      }, _v$3 = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "logs" ? "" : "border-transparent"}`, _v$4 = activeTab() === "logs" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      }, _v$5 = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "yaml" ? "" : "border-transparent"}`, _v$6 = activeTab() === "yaml" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      };
      _v$ !== _p$.e && className(_el$0, _p$.e = _v$);
      _p$.t = style(_el$0, _v$2, _p$.t);
      _v$3 !== _p$.a && className(_el$1, _p$.a = _v$3);
      _p$.o = style(_el$1, _v$4, _p$.o);
      _v$5 !== _p$.i && className(_el$10, _p$.i = _v$5);
      _p$.n = style(_el$10, _v$6, _p$.n);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

const TrainingJobDetails$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: TrainingJobDetails
}, Symbol.toStringTag, { value: 'Module' }));

export { TrainingJobDetails as T, TrainingJobDetails$1 as a, mlJobsService as m };
//# sourceMappingURL=TrainingJobDetails-jHXGEwN0.js.map
