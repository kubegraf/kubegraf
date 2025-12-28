import { c as createSignal, j as createResource, k as api, l as currentContext, r as refreshTrigger, t as template, i as insert, m as memo, d as createComponent, S as Show, f as createRenderEffect, h as setStyleProperty, F as For, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-8 h-8"viewBox="0 0 48 48"><path fill=#4285F4 d="M24 4L6 14v20l18 10 18-10V14L24 4z"></path><path fill=#EA4335 d="M24 4L6 14l18 10 18-10L24 4z"></path><path fill=#34A853 d="M6 34l18 10V24L6 14v20z"></path><path fill=#FBBC05 d="M42 34V14L24 24v20l18-10z"></path><path fill=#fff d="M24 17l-7 4v8l7 4 7-4v-8l-7-4z"opacity=.3>`), _tmpl$2 = /* @__PURE__ */ template(`<svg class="w-8 h-8"viewBox="0 0 48 48"><path fill=#FF9900 d="M8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16S8 32.8 8 24z"></path><path fill=#252F3E d="M16 22c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z">`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-8 h-8"viewBox="0 0 48 48"><path fill=#0089D6 d="M24 4L8 24l8 16h16l8-16L24 4z">`), _tmpl$4 = /* @__PURE__ */ template(`<svg class="w-8 h-8"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)>No namespace cost data available`), _tmpl$6 = /* @__PURE__ */ template(`<span class="text-xs px-1.5 py-0.5 rounded"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)">~70% savings`), _tmpl$7 = /* @__PURE__ */ template(`<div class="mt-4 pt-3 border-t"style=border-color:var(--border-color)><div class="flex justify-between text-sm"><span style=color:var(--text-secondary)>On-Demand Nodes</span><span style=color:var(--text-primary)></span></div><div class="flex justify-between text-sm mt-1"><span style=color:var(--text-secondary)>Spot/Preemptible Nodes</span><span class="flex items-center gap-1"><span style=color:var(--success-color)>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-6 col-span-full"><h3 class="font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>Cost Optimization Recommendations</h3><div class=space-y-4>`), _tmpl$9 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6"><h3 class="font-semibold mb-4"style=color:var(--text-primary)>Cost by Namespace</h3><div class=space-y-3></div></div><div class="card p-6"><h3 class="font-semibold mb-4"style=color:var(--text-primary)>Resource Allocation</h3><div class=space-y-4><div><div class="flex justify-between text-sm mb-2"><span style=color:var(--text-secondary)>CPU (<!>)</span><span style=color:var(--text-muted)>Cluster Total</span></div><div class="h-3 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=width:100%;background:var(--accent-primary)></div></div></div><div><div class="flex justify-between text-sm mb-2"><span style=color:var(--text-secondary)>Memory (<!>)</span><span style=color:var(--text-muted)>Cluster Total</span></div><div class="h-3 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=width:100%;background:var(--accent-secondary)></div></div></div><div><div class="flex justify-between text-sm mb-2"><span style=color:var(--text-secondary)>Nodes</span><span style=color:var(--text-muted)></span></div></div></div><div class="mt-6 pt-4 border-t"style=border-color:var(--border-color)><h4 class="text-sm font-medium mb-3"style=color:var(--text-primary)>Pricing Rates (<!>)</h4><div class="space-y-2 text-sm"><div class="flex justify-between"><span style=color:var(--text-secondary)>CPU (per core/hour)</span><span style=color:var(--text-primary)>$</span></div><div class="flex justify-between"><span style=color:var(--text-secondary)>Memory (per GB/hour)</span><span style=color:var(--text-primary)>$</span></div><div class="flex justify-between"><span style=color:var(--text-secondary)>Storage (per GB/month)</span><span style=color:var(--text-primary)>$</span></div></div><p class="text-xs mt-3"style=color:var(--text-muted)>`), _tmpl$0 = /* @__PURE__ */ template(`<div class="card overflow-hidden"><table class=data-table><thead><tr><th>Namespace</th><th>Pods</th><th>CPU</th><th>Memory</th><th>Hourly</th><th>Daily</th><th>Monthly</th></tr></thead><tbody>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="card p-6 mb-6"><div class="flex items-center gap-3"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--success-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div><h3 class=font-semibold style=color:var(--text-primary)>Optimization Opportunities</h3><p class=text-sm style=color:var(--text-secondary)>Resources using less than 10% of their requests could be scaled down to save costs`), _tmpl$10 = /* @__PURE__ */ template(`<div class="card overflow-hidden"><table class=data-table><thead><tr><th>Resource</th><th>Namespace</th><th>Kind</th><th>CPU Usage</th><th>Memory Usage</th><th>Wasted Cost/hr</th></tr></thead><tbody>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Cost Analysis</h1><p style=color:var(--text-secondary)></p></div><div class="flex items-center gap-3 px-4 py-2 rounded-lg"style=background:var(--bg-tertiary)><div><div class=font-medium style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)></div></div></div></div><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Hourly Cost</div><div class="text-3xl font-bold mt-2"style=color:var(--accent-primary)></div><div class="text-xs mt-1"style=color:var(--text-secondary)> nodes</div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Daily Cost</div><div class="text-3xl font-bold mt-2"style=color:var(--accent-secondary)></div><div class="text-xs mt-1"style=color:var(--text-secondary)> CPU</div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Monthly Estimate</div><div class="text-3xl font-bold mt-2"style=color:#f59e0b></div><div class="text-xs mt-1"style=color:var(--text-secondary)> Memory</div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Potential Savings</div><div class="text-3xl font-bold mt-2"style=color:var(--success-color)></div><div class="text-xs mt-1"style=color:var(--text-secondary)> idle resources</div></div></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)>`), _tmpl$12 = /* @__PURE__ */ template(`<button class="px-4 py-2 -mb-px transition-colors">`), _tmpl$13 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-3 rounded-lg"style=background:var(--bg-tertiary)><div><div class=font-medium style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)> pods • <!> CPU • <!> mem</div></div><div class=text-right><div class=font-bold style=color:var(--warning-color)>/mo</div><div class=text-xs style=color:var(--text-muted)>/day`), _tmpl$14 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"><div class="flex items-start justify-between mb-2"><div class=flex-1><div class="flex items-center gap-2 mb-1"><h4 class=font-semibold style=color:var(--text-primary)></h4><span class="px-2 py-0.5 rounded text-xs font-medium"style=color:#fff></span></div><p class="text-sm mb-2"style=color:var(--text-secondary)></p><p class="text-sm font-medium"style=color:var(--accent-primary)></p></div><div class="text-right ml-4"><div class="text-2xl font-bold"style=color:var(--success-color)></div><div class=text-xs style=color:var(--text-muted)>monthly savings`), _tmpl$15 = /* @__PURE__ */ template(`<tr><td colspan=7 class="text-center py-8"style=color:var(--text-muted)>No namespace cost data available`), _tmpl$16 = /* @__PURE__ */ template(`<tr class=hover:bg-[var(--bg-tertiary)]><td class=font-medium style=color:var(--accent-primary)></td><td></td><td></td><td></td><td></td><td></td><td class=font-bold style=color:var(--warning-color)>`), _tmpl$17 = /* @__PURE__ */ template(`<tr><td colspan=6 class="text-center py-8"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4 text-green-500"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p>No idle resources found</p><p class=text-sm>All resources are being utilized efficiently`), _tmpl$18 = /* @__PURE__ */ template(`<tr class=hover:bg-[var(--bg-tertiary)]><td class=font-medium style=color:var(--accent-primary)></td><td></td><td><span class="badge badge-info"></span></td><td><div class="flex items-center gap-2"><div class="w-16 h-2 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=background:var(--warning-color)></div></div><span class=text-xs style=color:var(--text-muted)>%</span></div></td><td><div class="flex items-center gap-2"><div class="w-16 h-2 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=background:var(--accent-secondary)></div></div><span class=text-xs style=color:var(--text-muted)>%</span></div></td><td class=font-bold style=color:var(--success-color)>`);
const Cost = () => {
  const [activeTab, setActiveTab] = createSignal("overview");
  createSignal(null);
  const [clusterCost, {
    refetch: refetchCost
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => {
    try {
      const result = await api.getClusterCost();
      console.log("Cost API response:", result);
      return result;
    } catch (e) {
      console.error("Cost API error:", e);
      return null;
    }
  });
  const [clusterStatus, {
    refetch: refetchStatus
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getStatus());
  const [idleResources, {
    refetch: refetchIdle
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getIdleResources());
  const [namespaces, {
    refetch: refetchNamespaces
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getNamespaceNames());
  const formatCurrency = (value) => {
    if (value === void 0 || value === null) return "--";
    return `$${value.toFixed(2)}`;
  };
  const formatCPU = (value) => {
    if (value === void 0 || value === null) return "--";
    if (value < 1) return `${(value * 1e3).toFixed(0)}m`;
    return `${value.toFixed(2)} cores`;
  };
  const formatMemory = (value) => {
    if (value === void 0 || value === null) return "--";
    if (value < 1) return `${(value * 1024).toFixed(0)} Mi`;
    return `${value.toFixed(2)} Gi`;
  };
  const tabs = [{
    id: "overview",
    label: "Overview"
  }, {
    id: "namespaces",
    label: "By Namespace"
  }, {
    id: "idle",
    label: "Idle Resources"
  }];
  return (() => {
    var _el$ = _tmpl$11(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$3.nextSibling, _el$1 = _el$6.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$2.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$13.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$18.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$23.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$12.nextSibling;
    insert(_el$5, (() => {
      var _c$ = memo(() => !!clusterStatus()?.cluster);
      return () => _c$() ? `Cluster: ${clusterStatus()?.cluster}` : "Cluster cost estimation and optimization opportunities";
    })());
    insert(_el$6, createComponent(Show, {
      get when() {
        return clusterCost()?.cloud?.provider === "gcp";
      },
      get children() {
        return _tmpl$();
      }
    }), _el$1);
    insert(_el$6, createComponent(Show, {
      get when() {
        return clusterCost()?.cloud?.provider === "aws";
      },
      get children() {
        return _tmpl$2();
      }
    }), _el$1);
    insert(_el$6, createComponent(Show, {
      get when() {
        return clusterCost()?.cloud?.provider === "azure";
      },
      get children() {
        return _tmpl$3();
      }
    }), _el$1);
    insert(_el$6, createComponent(Show, {
      get when() {
        return !clusterCost()?.cloud?.provider || clusterCost()?.cloud?.provider === "unknown";
      },
      get children() {
        return _tmpl$4();
      }
    }), _el$1);
    insert(_el$10, (() => {
      var _c$2 = memo(() => !!clusterCost.loading);
      return () => _c$2() ? "Loading..." : clusterCost()?.cloud?.displayName || "Unknown Cloud";
    })());
    insert(_el$11, (() => {
      var _c$3 = memo(() => !!clusterCost.loading);
      return () => _c$3() ? "..." : clusterCost()?.cloud?.region || "Unknown region";
    })());
    insert(_el$15, () => formatCurrency(clusterCost()?.hourlyCost));
    insert(_el$16, () => clusterCost()?.nodeCount || 0, _el$17);
    insert(_el$20, () => formatCurrency(clusterCost()?.dailyCost));
    insert(_el$21, () => formatCPU(clusterCost()?.totalCpu), _el$22);
    insert(_el$25, () => formatCurrency(clusterCost()?.monthlyCost));
    insert(_el$26, () => formatMemory(clusterCost()?.totalMemory), _el$27);
    insert(_el$30, () => formatCurrency((idleResources()?.idleResources || []).reduce((acc, r) => acc + (r.wastedCost || 0), 0) * 720));
    insert(_el$31, () => (idleResources()?.idleResources || []).length, _el$32);
    insert(_el$33, createComponent(For, {
      each: tabs,
      children: (tab) => (() => {
        var _el$110 = _tmpl$12();
        _el$110.$$click = () => setActiveTab(tab.id);
        insert(_el$110, () => tab.label);
        createRenderEffect((_p$) => {
          var _v$ = activeTab() === tab.id ? "var(--accent-primary)" : "var(--text-secondary)", _v$2 = activeTab() === tab.id ? "2px solid var(--accent-primary)" : "2px solid transparent";
          _v$ !== _p$.e && setStyleProperty(_el$110, "color", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$110, "border-bottom", _p$.t = _v$2);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$110;
      })()
    }));
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "overview";
      },
      get children() {
        var _el$34 = _tmpl$9(), _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$39 = _el$35.nextSibling, _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild, _el$47 = _el$45.nextSibling; _el$47.nextSibling; _el$44.nextSibling; var _el$49 = _el$43.nextSibling; _el$49.firstChild; var _el$51 = _el$42.nextSibling, _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild, _el$56 = _el$54.nextSibling; _el$56.nextSibling; _el$53.nextSibling; var _el$58 = _el$52.nextSibling; _el$58.firstChild; var _el$60 = _el$51.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$41.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$68 = _el$66.nextSibling; _el$68.nextSibling; var _el$69 = _el$65.nextSibling, _el$70 = _el$69.firstChild, _el$71 = _el$70.firstChild, _el$72 = _el$71.nextSibling; _el$72.firstChild; var _el$74 = _el$70.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$75.nextSibling; _el$76.firstChild; var _el$78 = _el$74.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling; _el$80.firstChild; var _el$91 = _el$69.nextSibling;
        insert(_el$37, createComponent(For, {
          get each() {
            return (clusterCost()?.namespaceCosts || []).slice(0, 8);
          },
          children: (ns) => (() => {
            var _el$111 = _tmpl$13(), _el$112 = _el$111.firstChild, _el$113 = _el$112.firstChild, _el$114 = _el$113.nextSibling, _el$115 = _el$114.firstChild, _el$118 = _el$115.nextSibling, _el$116 = _el$118.nextSibling, _el$119 = _el$116.nextSibling; _el$119.nextSibling; var _el$120 = _el$112.nextSibling, _el$121 = _el$120.firstChild, _el$122 = _el$121.firstChild, _el$123 = _el$121.nextSibling, _el$124 = _el$123.firstChild;
            insert(_el$113, () => ns.namespace);
            insert(_el$114, () => ns.podCount, _el$115);
            insert(_el$114, () => formatCPU(ns.totalCpu), _el$118);
            insert(_el$114, () => formatMemory(ns.totalMemory), _el$119);
            insert(_el$121, () => formatCurrency(ns.monthlyCost), _el$122);
            insert(_el$123, () => formatCurrency(ns.dailyCost), _el$124);
            return _el$111;
          })()
        }), null);
        insert(_el$37, createComponent(Show, {
          get when() {
            return (clusterCost()?.namespaceCosts || []).length === 0;
          },
          get children() {
            return _tmpl$5();
          }
        }), null);
        insert(_el$44, () => formatCPU(clusterCost()?.totalCpu), _el$47);
        insert(_el$53, () => formatMemory(clusterCost()?.totalMemory), _el$56);
        insert(_el$63, () => clusterCost()?.nodeCount || 0);
        insert(_el$65, () => clusterCost()?.pricing?.provider || "Generic", _el$68);
        insert(_el$65, (() => {
          var _c$4 = memo(() => !!clusterCost()?.pricing?.region);
          return () => _c$4() ? ` - ${clusterCost()?.pricing?.region}` : "";
        })(), _el$68);
        insert(_el$72, () => (clusterCost()?.pricing?.cpuPerCoreHour || 0.0336).toFixed(4), null);
        insert(_el$76, () => (clusterCost()?.pricing?.memoryPerGBHour || 45e-4).toFixed(4), null);
        insert(_el$80, () => (clusterCost()?.pricing?.storagePerGBMonth || 0.1).toFixed(2), null);
        insert(_el$64, createComponent(Show, {
          get when() {
            return clusterCost()?.pricing?.spotNodesCount !== void 0;
          },
          get children() {
            var _el$82 = _tmpl$7(), _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$86 = _el$83.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$87.nextSibling, _el$89 = _el$88.firstChild;
            insert(_el$85, () => clusterCost()?.pricing?.onDemandNodesCount || 0);
            insert(_el$89, () => clusterCost()?.pricing?.spotNodesCount || 0);
            insert(_el$88, createComponent(Show, {
              get when() {
                return (clusterCost()?.pricing?.spotNodesCount || 0) > 0;
              },
              get children() {
                return _tmpl$6();
              }
            }), null);
            return _el$82;
          }
        }), _el$91);
        insert(_el$91, createComponent(Show, {
          get when() {
            return clusterCost()?.cloud?.provider === "gcp";
          },
          fallback: "Rates auto-detected from cluster. Actual costs may vary.",
          get children() {
            return ["GCP ", memo(() => clusterCost()?.cloud?.region), " region pricing applied automatically."];
          }
        }));
        insert(_el$34, createComponent(Show, {
          get when() {
            return (clusterCost()?.recommendations || []).length > 0;
          },
          get children() {
            var _el$92 = _tmpl$8(), _el$93 = _el$92.firstChild; _el$93.firstChild; var _el$95 = _el$93.nextSibling;
            insert(_el$95, createComponent(For, {
              get each() {
                return clusterCost()?.recommendations || [];
              },
              children: (rec) => (() => {
                var _el$125 = _tmpl$14(), _el$126 = _el$125.firstChild, _el$127 = _el$126.firstChild, _el$128 = _el$127.firstChild, _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$131 = _el$128.nextSibling, _el$132 = _el$131.nextSibling, _el$133 = _el$127.nextSibling, _el$134 = _el$133.firstChild; _el$134.nextSibling;
                insert(_el$129, () => rec.title);
                insert(_el$130, () => rec.impact.toUpperCase());
                insert(_el$131, () => rec.description);
                insert(_el$132, () => rec.action);
                insert(_el$134, () => formatCurrency(rec.savings));
                createRenderEffect((_p$) => {
                  var _v$3 = rec.impact === "high" ? "var(--warning-color)" : rec.impact === "medium" ? "var(--accent-primary)" : "var(--border-color)", _v$4 = rec.impact === "high" ? "rgba(245, 158, 11, 0.1)" : rec.impact === "medium" ? "rgba(6, 182, 212, 0.1)" : "var(--bg-tertiary)", _v$5 = rec.impact === "high" ? "var(--warning-color)" : rec.impact === "medium" ? "var(--accent-primary)" : "var(--text-muted)";
                  _v$3 !== _p$.e && setStyleProperty(_el$125, "border-color", _p$.e = _v$3);
                  _v$4 !== _p$.t && setStyleProperty(_el$125, "background", _p$.t = _v$4);
                  _v$5 !== _p$.a && setStyleProperty(_el$130, "background", _p$.a = _v$5);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$125;
              })()
            }));
            return _el$92;
          }
        }), null);
        return _el$34;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "namespaces";
      },
      get children() {
        var _el$96 = _tmpl$0(), _el$97 = _el$96.firstChild, _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling;
        insert(_el$99, createComponent(For, {
          get each() {
            return clusterCost()?.namespaceCosts || [];
          },
          get fallback() {
            return (() => {
              var _el$136 = _tmpl$15(); _el$136.firstChild;
              return _el$136;
            })();
          },
          children: (ns) => (() => {
            var _el$138 = _tmpl$16(), _el$139 = _el$138.firstChild, _el$140 = _el$139.nextSibling, _el$141 = _el$140.nextSibling, _el$142 = _el$141.nextSibling, _el$143 = _el$142.nextSibling, _el$144 = _el$143.nextSibling, _el$145 = _el$144.nextSibling;
            insert(_el$139, () => ns.namespace);
            insert(_el$140, () => ns.podCount);
            insert(_el$141, () => formatCPU(ns.totalCpu));
            insert(_el$142, () => formatMemory(ns.totalMemory));
            insert(_el$143, () => formatCurrency(ns.hourlyCost));
            insert(_el$144, () => formatCurrency(ns.dailyCost));
            insert(_el$145, () => formatCurrency(ns.monthlyCost));
            return _el$138;
          })()
        }));
        return _el$96;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "idle";
      },
      get children() {
        return [(() => {
          var _el$100 = _tmpl$1(), _el$101 = _el$100.firstChild, _el$102 = _el$101.firstChild, _el$103 = _el$102.nextSibling, _el$104 = _el$103.firstChild; _el$104.nextSibling;
          return _el$100;
        })(), (() => {
          var _el$106 = _tmpl$10(), _el$107 = _el$106.firstChild, _el$108 = _el$107.firstChild, _el$109 = _el$108.nextSibling;
          insert(_el$109, createComponent(For, {
            get each() {
              return idleResources()?.idleResources || [];
            },
            get fallback() {
              return (() => {
                var _el$146 = _tmpl$17(); _el$146.firstChild;
                return _el$146;
              })();
            },
            children: (resource) => (() => {
              var _el$148 = _tmpl$18(), _el$149 = _el$148.firstChild, _el$150 = _el$149.nextSibling, _el$151 = _el$150.nextSibling, _el$152 = _el$151.firstChild, _el$153 = _el$151.nextSibling, _el$154 = _el$153.firstChild, _el$155 = _el$154.firstChild, _el$156 = _el$155.firstChild, _el$157 = _el$155.nextSibling, _el$158 = _el$157.firstChild, _el$159 = _el$153.nextSibling, _el$160 = _el$159.firstChild, _el$161 = _el$160.firstChild, _el$162 = _el$161.firstChild, _el$163 = _el$161.nextSibling, _el$164 = _el$163.firstChild, _el$165 = _el$159.nextSibling;
              insert(_el$149, () => resource.name);
              insert(_el$150, () => resource.namespace);
              insert(_el$152, () => resource.kind);
              insert(_el$157, () => (resource.cpuUsage / resource.cpuRequest * 100).toFixed(1), _el$158);
              insert(_el$163, () => (resource.memoryUsage / resource.memoryRequest * 100).toFixed(1), _el$164);
              insert(_el$165, () => formatCurrency(resource.wastedCost));
              createRenderEffect((_p$) => {
                var _v$6 = `${Math.min(100, resource.cpuUsage / resource.cpuRequest * 100)}%`, _v$7 = `${Math.min(100, resource.memoryUsage / resource.memoryRequest * 100)}%`;
                _v$6 !== _p$.e && setStyleProperty(_el$156, "width", _p$.e = _v$6);
                _v$7 !== _p$.t && setStyleProperty(_el$162, "width", _p$.t = _v$7);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$148;
            })()
          }));
          return _el$106;
        })()];
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Cost as default };
//# sourceMappingURL=Cost-DUJaSckQ.js.map
