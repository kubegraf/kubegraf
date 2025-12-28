import { k as api, c as createSignal, o as onMount, G as addNotification, t as template, i as insert, d as createComponent, S as Show, f as createRenderEffect, e as setAttribute, m as memo, v as delegateEvents, j as createResource, g as className } from './index-NnaOo1cf.js';

async function fetchAPI(endpoint, options) {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }
  return response.json();
}
const kialiService = {
  async getStatus() {
    return fetchAPI("/integrations/kiali/status");
  },
  async getTrafficData(namespace) {
    const services = await api.getServices(namespace);
    const pods = await api.getPods(namespace);
    return {
      services: services || [],
      pods: pods || [],
      connections: []
      // Will be built from service selectors
    };
  },
  async proxy(path, options) {
    const url = `/api/kiali/proxy${path}`;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
};

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><div class=text-center><div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p style=color:var(--text-muted)>Connecting to Kiali...`), _tmpl$2$1 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-64"><div class=text-center><p class="text-red-500 mb-4"></p><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Open in New Tab`), _tmpl$3$1 = /* @__PURE__ */ template(`<iframe class="w-full h-full border-0"title="Kiali Dashboard"sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"style=minHeight:600px>`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="w-full h-full flex flex-col">`);
const KialiDashboard = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [iframeUrl, setIframeUrl] = createSignal(null);
  onMount(async () => {
    try {
      const proxyUrl = "/api/kiali/proxy/";
      setIframeUrl(proxyUrl);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to open Kiali dashboard");
      setLoading(false);
      addNotification("Failed to open Kiali dashboard", "error");
    }
  });
  return (() => {
    var _el$ = _tmpl$4$1();
    insert(_el$, createComponent(Show, {
      get when() {
        return loading();
      },
      get children() {
        var _el$2 = _tmpl$$1(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling;
        return _el$2;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$6 = _tmpl$2$1(), _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.nextSibling;
        insert(_el$8, error);
        _el$9.$$click = () => window.open(`http://localhost:20001`, "_blank");
        return _el$6;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!loading() && !error()))() && iframeUrl();
      },
      get children() {
        var _el$0 = _tmpl$3$1();
        createRenderEffect(() => setAttribute(_el$0, "src", iframeUrl()));
        return _el$0;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class=space-y-3><div class="grid grid-cols-2 gap-4"><div><p class="text-xs mb-1"style=color:var(--text-muted)>Version</p><p class="text-sm font-medium"style=color:var(--text-primary)></p></div><div><p class="text-xs mb-1"style=color:var(--text-muted)>Namespace</p><p class="text-sm font-medium"style=color:var(--text-primary)></p></div><div><p class="text-xs mb-1"style=color:var(--text-muted)>Service</p><p class="text-sm font-medium"style=color:var(--text-primary)></p></div><div><p class="text-xs mb-1"style=color:var(--text-muted)>Istio Detected</p><p class="text-sm font-medium"style=color:var(--text-primary)></p></div></div><div class="flex items-center gap-2 pt-4 border-t"style=border-color:var(--border-color)><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"style=background:var(--accent-primary);color:#000>Open Kiali Dashboard`), _tmpl$2 = /* @__PURE__ */ template(`<div class=space-y-4><p class=text-sm style=color:var(--text-secondary)>Kiali is not detected. Use the Traffic Map in Resource Map to visualize service mesh traffic.</p><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"style=background:var(--accent-primary);color:#000>Open Traffic Map`), _tmpl$3 = /* @__PURE__ */ template(`<div class="rounded-lg p-6 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="flex items-center justify-between mb-4"><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Installation Status</h2><div>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="rounded-lg border overflow-hidden"style=background:var(--bg-card);borderColor:var(--border-color);minHeight:600px><div class="flex items-center justify-between p-4 border-b"style=border-color:var(--border-color)><h2 class="text-lg font-semibold"style=color:var(--text-primary)>Kiali Dashboard</h2><button class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"style="background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid var(--border-color)">Close</button></div><div class=h-[600px]>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold mb-2"style=color:var(--text-primary)>Kiali Service Mesh</h1><p class=text-sm style=color:var(--text-secondary)>Service mesh observability and management for Istio</p></div><div class="flex items-center gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><svg class="w-4 h-4 inline mr-2"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Refresh`);
const KialiPanel = () => {
  const [showDashboard, setShowDashboard] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);
  const [status, {
    refetch
  }] = createResource(async () => {
    try {
      return await kialiService.getStatus();
    } catch (err) {
      console.error("Failed to fetch Kiali status:", err);
      return {
        installed: false,
        istioDetected: false
      };
    }
  });
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      addNotification("Status refreshed", "success");
    } catch (err) {
      addNotification("Failed to refresh status", "error");
    } finally {
      setRefreshing(false);
    }
  };
  const handleOpenDashboard = () => {
    if (status()?.installed) {
      setShowDashboard(true);
    } else {
      addNotification("Kiali is not installed", "error");
    }
  };
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild;
    _el$7.$$click = handleRefresh;
    insert(_el$, createComponent(Show, {
      get when() {
        return !status.loading;
      },
      get children() {
        var _el$8 = _tmpl$3(), _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling;
        insert(_el$1, () => status()?.installed ? "Installed" : "Not Installed");
        insert(_el$8, createComponent(Show, {
          get when() {
            return status()?.installed;
          },
          get children() {
            var _el$10 = _tmpl$(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$11.nextSibling, _el$25 = _el$24.firstChild;
            insert(_el$14, () => status()?.version || "Unknown");
            insert(_el$17, () => status()?.namespace || "Unknown");
            insert(_el$20, () => status()?.serviceName || "Unknown");
            insert(_el$23, () => status()?.istioDetected ? "Yes" : "No");
            _el$25.$$click = handleOpenDashboard;
            return _el$10;
          }
        }), null);
        insert(_el$8, createComponent(Show, {
          get when() {
            return !status()?.installed;
          },
          get children() {
            var _el$26 = _tmpl$2(), _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling;
            _el$28.$$click = () => {
              window.location.href = "#/resourcemap";
            };
            return _el$26;
          }
        }), null);
        createRenderEffect(() => className(_el$1, `px-3 py-1 rounded-full text-xs font-medium ${status()?.installed ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500"}`));
        return _el$8;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!showDashboard())() && status()?.installed;
      },
      get children() {
        var _el$29 = _tmpl$4(), _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$30.nextSibling;
        _el$32.$$click = () => setShowDashboard(false);
        insert(_el$33, createComponent(KialiDashboard, {
          get status() {
            return status();
          }
        }));
        return _el$29;
      }
    }), null);
    createRenderEffect(() => _el$7.disabled = refreshing());
    return _el$;
  })();
};
delegateEvents(["click"]);

const Kiali = () => {
  return createComponent(KialiPanel, {});
};

export { Kiali as default };
//# sourceMappingURL=Kiali-BQqJ1wwJ.js.map
