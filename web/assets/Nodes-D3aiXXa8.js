import { c as createSignal, a as createMemo, p as nodesResource, Q as searchQuery, o as onMount, n as createEffect, A as refetchNodes, E as onCleanup, t as template, i as insert, d as createComponent, f as createRenderEffect, g as className, e as setAttribute, F as For, R as Switch, T as Match, S as Show, h as setStyleProperty, q as style, v as delegateEvents } from './index-Bh-O-sIc.js';
import { D as DescribeModal } from './DescribeModal-6Ip9Wbf-.js';

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">`), _tmpl$2 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 6h16M4 10h16M4 14h16M4 18h16">`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z">`), _tmpl$4 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="border rounded-xl p-6 card-hover"style=background:var(--bg-card)><div class="flex items-start justify-between mb-4"><div class="flex items-center gap-3"><div><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg></div><div><button class="font-semibold hover:underline text-left"style=color:var(--text-primary)></button><p class=text-sm style=color:var(--text-secondary)></p></div></div><span></span></div><div class="grid grid-cols-2 gap-4 mb-4"><div class="rounded-lg p-3"style=background:var(--bg-secondary)><div class="flex items-center justify-between mb-2"><span class=text-sm style=color:var(--text-secondary)>CPU</span><span class=font-medium style=color:var(--text-primary)></span></div><div class="h-2 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=width:45%;background:var(--accent-primary)></div></div></div><div class="rounded-lg p-3"style=background:var(--bg-secondary)><div class="flex items-center justify-between mb-2"><span class=text-sm style=color:var(--text-secondary)>Memory</span><span class=font-medium style=color:var(--text-primary)></span></div><div class="h-2 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full"style=width:60%;background:var(--accent-secondary)></div></div></div></div><div class="flex items-center justify-between text-sm pt-4 border-t"style=color:var(--text-secondary);border-color:var(--border-color)><span>Version: </span><span>Age: `), _tmpl$6 = /* @__PURE__ */ template(`<div class="overflow-hidden rounded-lg"style=background:#000000><div class=overflow-x-auto><table class="data-table terminal-table"style=color:#0ea5e9;font-weight:900><style>
            table { width: 100%; border-collapse: collapse; }
            thead { background: #000000; position: sticky; top: 0; z-index: 10; }
            tbody tr:hover { background: rgba(14, 165, 233, 0.1); }
          </style><thead><tr><th class=whitespace-nowrap>Name</th><th class=whitespace-nowrap>Status</th><th class=whitespace-nowrap>Roles</th><th class=whitespace-nowrap>CPU</th><th class=whitespace-nowrap>Memory</th><th class=whitespace-nowrap>Version</th><th class=whitespace-nowrap>Age</th></tr></thead><tbody>`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td colspan=7 class="text-center py-8"style=color:var(--text-muted)>No nodes found`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><div class="flex items-center gap-2"><div><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg></div><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></div></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td class="font-mono text-sm"style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td class="font-mono text-sm"style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td class="font-mono text-sm"style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">`), _tmpl$0 = /* @__PURE__ */ template(`<button class="border rounded-lg p-4 text-left transition-colors hover:opacity-80"style=background:var(--bg-card)><div class="flex items-center gap-2 mb-2"><div><svg fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg></div><span></span></div><h4 class="font-medium text-sm truncate mb-1"style=color:var(--text-primary)></h4><p class="text-xs truncate"style=color:var(--text-secondary)></p><div class="mt-2 pt-2 border-t"style=border-color:var(--border-color)><div class="flex justify-between text-xs"><span style=color:var(--text-secondary)>CPU</span><span style=color:var(--text-primary)></span></div><div class="flex justify-between text-xs mt-1"><span style=color:var(--text-secondary)>Mem</span><span style=color:var(--text-primary)>`), _tmpl$1 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold text-white">Nodes</h1><p class="text-gray-400 mt-1">Cluster node management</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><div class="flex items-center rounded-lg overflow-hidden"style="background:var(--bg-secondary);border:1px solid var(--border-color)"></div><div class="flex items-center gap-2"><label class="flex items-center gap-2 text-sm"style=color:var(--text-secondary)><input type=checkbox class=rounded><span>Auto-refresh (<!>s)</span></label><button class=icon-btn style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div></div><div class="grid grid-cols-2 md:grid-cols-5 gap-4"><div class="bg-k8s-card border border-k8s-border rounded-lg p-4"><div class="text-gray-400 text-sm">Total Nodes</div><div class="text-2xl font-bold text-white"></div></div><div class="bg-k8s-card border border-green-500/30 rounded-lg p-4"><div class="text-gray-400 text-sm">Ready</div><div class="text-2xl font-bold text-green-400"></div></div><div class="bg-k8s-card border border-green-500/30 rounded-lg p-4"><div class="text-gray-400 text-sm">Schedulable</div><div class="text-2xl font-bold text-green-400"></div><div class="text-xs text-gray-500 mt-1">Can schedule pods</div></div><div class="bg-k8s-card border border-yellow-500/30 rounded-lg p-4"><div class="text-gray-400 text-sm">Cordoned/Drained</div><div class="text-2xl font-bold text-yellow-400"></div><div class="text-xs text-gray-500 mt-1">SchedulingDisabled</div></div><div class="bg-k8s-card border border-red-500/30 rounded-lg p-4"><div class="text-gray-400 text-sm">Not Ready</div><div class="text-2xl font-bold text-red-400"></div></div><div class="bg-k8s-card border border-cyan-500/30 rounded-lg p-4"><div class="text-gray-400 text-sm">Control Plane</div><div class="text-2xl font-bold text-cyan-400">`), _tmpl$10 = /* @__PURE__ */ template(`<button><span class="hidden sm:inline capitalize">`), _tmpl$11 = /* @__PURE__ */ template(`<div class="p-8 text-center text-gray-500"><svg class="w-8 h-8 animate-spin mx-auto mb-2"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading nodes...`);
const Nodes = () => {
  const [selected, setSelected] = createSignal(null);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [viewMode, setViewMode] = createSignal("card");
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("nodes-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("nodes-font-family") || "Monaco");
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [refreshInterval] = createSignal(30);
  const getFontFamilyCSS = (family) => {
    switch (family) {
      case "Monospace":
        return "monospace";
      case "System-ui":
        return "system-ui";
      case "Monaco":
        return "Monaco, monospace";
      case "Consolas":
        return "Consolas, monospace";
      case "Courier":
        return '"Courier New", monospace';
      default:
        return "Monaco, monospace";
    }
  };
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("nodes-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("nodes-font-family", family);
  };
  const nodes = createMemo(() => {
    const all = nodesResource() || [];
    const query = searchQuery().toLowerCase();
    if (!query) return all;
    return all.filter((n) => n.name.toLowerCase().includes(query) || n.roles.toLowerCase().includes(query) || n.status.toLowerCase().includes(query));
  });
  const nodeSummary = createMemo(() => {
    const all = nodesResource() || [];
    const readyNodes = all.filter((n) => {
      const status = n.status || "";
      return status.includes("Ready") && !status.includes("NotReady");
    });
    const schedulableNodes = all.filter((n) => {
      if (n.isSchedulable !== void 0) {
        return n.isSchedulable && (n.readyStatus === "Ready" || (n.status || "").includes("Ready"));
      }
      const status = n.status || "";
      return status.includes("Ready") && !status.includes("SchedulingDisabled") && !status.includes("NotReady");
    });
    return {
      total: all.length,
      ready: readyNodes.length,
      notReady: all.length - readyNodes.length,
      schedulable: schedulableNodes.length,
      unschedulable: all.length - schedulableNodes.length,
      controlPlane: all.filter((n) => n.roles.includes("control-plane") || n.roles.includes("master")).length
    };
  });
  let refreshTimer = null;
  onMount(() => {
    const startRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      if (autoRefresh()) {
        refreshTimer = setInterval(() => {
          refetchNodes();
        }, refreshInterval() * 1e3);
      }
    };
    startRefresh();
    createEffect(() => {
      const enabled = autoRefresh();
      const interval = refreshInterval();
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (enabled) {
        refreshTimer = setInterval(() => {
          refetchNodes();
        }, interval * 1e3);
      }
    });
  });
  onCleanup(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  });
  const ViewIcon = (props) => createComponent(Switch, {
    get children() {
      return [createComponent(Match, {
        get when() {
          return props.mode === "card";
        },
        get children() {
          return _tmpl$();
        }
      }), createComponent(Match, {
        get when() {
          return props.mode === "list";
        },
        get children() {
          return _tmpl$2();
        }
      }), createComponent(Match, {
        get when() {
          return props.mode === "grid";
        },
        get children() {
          return _tmpl$3();
        }
      })];
    }
  });
  const CardView = () => (() => {
    var _el$4 = _tmpl$4();
    insert(_el$4, createComponent(For, {
      get each() {
        return nodes();
      },
      children: (node) => {
        const status = node.status || "";
        const isReady = status.includes("Ready") && !status.includes("NotReady");
        const isSchedulable = node.isSchedulable !== void 0 ? node.isSchedulable : !status.includes("SchedulingDisabled");
        const isControlPlane = node.roles.includes("control-plane") || node.roles.includes("master");
        let statusColor = "bg-red-500/20 text-red-400";
        if (isReady && isSchedulable) {
          statusColor = "bg-green-500/20 text-green-400";
        } else if (isReady && !isSchedulable) {
          statusColor = "bg-yellow-500/20 text-yellow-400";
        }
        return (() => {
          var _el$5 = _tmpl$5(), _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$8.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$7.nextSibling, _el$12 = _el$6.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$14.nextSibling; _el$17.firstChild; var _el$19 = _el$13.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$20.nextSibling; _el$23.firstChild; var _el$25 = _el$12.nextSibling, _el$26 = _el$25.firstChild; _el$26.firstChild; var _el$28 = _el$26.nextSibling; _el$28.firstChild;
          setStyleProperty(_el$5, "border-color", isReady ? isSchedulable ? "var(--border-color)" : "rgba(234, 179, 8, 0.3)" : "rgba(239, 68, 68, 0.3)");
          className(_el$8, `p-2 rounded-lg ${isControlPlane ? "bg-cyan-500/20" : ""}`);
          setAttribute(_el$9, "class", `w-6 h-6 ${isControlPlane ? "text-cyan-400" : ""}`);
          _el$1.$$click = () => {
            setSelected(node);
            setShowDescribe(true);
          };
          insert(_el$1, () => node.name);
          insert(_el$10, () => node.roles || "worker");
          className(_el$11, `px-2 py-1 rounded text-xs font-medium ${statusColor}`);
          insert(_el$11, () => node.status);
          insert(_el$16, () => node.cpu || "N/A");
          insert(_el$22, () => node.memory || "N/A");
          insert(_el$26, () => node.version, null);
          insert(_el$28, () => node.age, null);
          createRenderEffect((_p$) => {
            var _v$ = !isControlPlane ? {
              background: "var(--bg-secondary)"
            } : {}, _v$2 = !isControlPlane ? {
              color: "var(--text-secondary)"
            } : {};
            _p$.e = style(_el$8, _v$, _p$.e);
            _p$.t = style(_el$9, _v$2, _p$.t);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$5;
        })();
      }
    }));
    return _el$4;
  })();
  const ListView = () => (() => {
    var _el$30 = _tmpl$6(), _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.nextSibling, _el$35 = _el$34.nextSibling;
    insert(_el$35, createComponent(For, {
      get each() {
        return nodes();
      },
      get fallback() {
        return (() => {
          var _el$36 = _tmpl$7(); _el$36.firstChild;
          return _el$36;
        })();
      },
      children: (node) => {
        const status = node.status || "";
        const isReady = status.includes("Ready") && !status.includes("NotReady");
        const isSchedulable = node.isSchedulable !== void 0 ? node.isSchedulable : !status.includes("SchedulingDisabled");
        const isControlPlane = node.roles.includes("control-plane") || node.roles.includes("master");
        let badgeClass = "badge-error";
        if (isReady && isSchedulable) {
          badgeClass = "badge-success";
        } else if (isReady && !isSchedulable) {
          badgeClass = "badge-warning";
        }
        return (() => {
          var _el$38 = _tmpl$8(), _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild, _el$43 = _el$41.nextSibling, _el$44 = _el$39.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$44.nextSibling, _el$47 = _el$46.firstChild, _el$48 = _el$46.nextSibling, _el$49 = _el$48.nextSibling, _el$50 = _el$49.nextSibling, _el$51 = _el$50.nextSibling;
          className(_el$41, `p-1 rounded ${isControlPlane ? "bg-cyan-500/20" : "bg-k8s-dark"}`);
          setAttribute(_el$42, "class", `w-4 h-4 ${isControlPlane ? "text-cyan-400" : "text-gray-400"}`);
          _el$43.$$click = () => {
            setSelected(node);
            setShowDescribe(true);
          };
          insert(_el$43, () => node.name);
          className(_el$45, `badge ${badgeClass}`);
          insert(_el$45, () => node.status);
          className(_el$47, `text-sm ${isControlPlane ? "text-cyan-400" : "text-gray-400"}`);
          insert(_el$47, () => node.roles || "worker");
          insert(_el$48, () => node.cpu || "N/A");
          insert(_el$49, () => node.memory || "N/A");
          insert(_el$50, () => node.version);
          insert(_el$51, () => node.age);
          createRenderEffect((_p$) => {
            var _v$5 = `${fontSize()}px`, _v$6 = `${Math.max(24, fontSize() * 1.7)}px`, _v$7 = `${Math.max(24, fontSize() * 1.7)}px`, _v$8 = `${fontSize()}px`, _v$9 = `${Math.max(24, fontSize() * 1.7)}px`, _v$0 = `${Math.max(24, fontSize() * 1.7)}px`, _v$1 = `${fontSize()}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`;
            _v$5 !== _p$.e && setStyleProperty(_el$39, "font-size", _p$.e = _v$5);
            _v$6 !== _p$.t && setStyleProperty(_el$39, "height", _p$.t = _v$6);
            _v$7 !== _p$.a && setStyleProperty(_el$39, "line-height", _p$.a = _v$7);
            _v$8 !== _p$.o && setStyleProperty(_el$44, "font-size", _p$.o = _v$8);
            _v$9 !== _p$.i && setStyleProperty(_el$44, "height", _p$.i = _v$9);
            _v$0 !== _p$.n && setStyleProperty(_el$44, "line-height", _p$.n = _v$0);
            _v$1 !== _p$.s && setStyleProperty(_el$46, "font-size", _p$.s = _v$1);
            _v$10 !== _p$.h && setStyleProperty(_el$46, "height", _p$.h = _v$10);
            _v$11 !== _p$.r && setStyleProperty(_el$46, "line-height", _p$.r = _v$11);
            _v$12 !== _p$.d && setStyleProperty(_el$48, "font-size", _p$.d = _v$12);
            _v$13 !== _p$.l && setStyleProperty(_el$48, "height", _p$.l = _v$13);
            _v$14 !== _p$.u && setStyleProperty(_el$48, "line-height", _p$.u = _v$14);
            _v$15 !== _p$.c && setStyleProperty(_el$49, "font-size", _p$.c = _v$15);
            _v$16 !== _p$.w && setStyleProperty(_el$49, "height", _p$.w = _v$16);
            _v$17 !== _p$.m && setStyleProperty(_el$49, "line-height", _p$.m = _v$17);
            _v$18 !== _p$.f && setStyleProperty(_el$50, "font-size", _p$.f = _v$18);
            _v$19 !== _p$.y && setStyleProperty(_el$50, "height", _p$.y = _v$19);
            _v$20 !== _p$.g && setStyleProperty(_el$50, "line-height", _p$.g = _v$20);
            _v$21 !== _p$.p && setStyleProperty(_el$51, "font-size", _p$.p = _v$21);
            _v$22 !== _p$.b && setStyleProperty(_el$51, "height", _p$.b = _v$22);
            _v$23 !== _p$.T && setStyleProperty(_el$51, "line-height", _p$.T = _v$23);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0,
            n: void 0,
            s: void 0,
            h: void 0,
            r: void 0,
            d: void 0,
            l: void 0,
            u: void 0,
            c: void 0,
            w: void 0,
            m: void 0,
            f: void 0,
            y: void 0,
            g: void 0,
            p: void 0,
            b: void 0,
            T: void 0
          });
          return _el$38;
        })();
      }
    }));
    createRenderEffect((_p$) => {
      var _v$3 = `${fontSize()}px`, _v$4 = getFontFamilyCSS(fontFamily());
      _v$3 !== _p$.e && setStyleProperty(_el$32, "font-size", _p$.e = _v$3);
      _v$4 !== _p$.t && setStyleProperty(_el$32, "font-family", _p$.t = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$30;
  })();
  const GridView = () => (() => {
    var _el$52 = _tmpl$9();
    insert(_el$52, createComponent(For, {
      get each() {
        return nodes();
      },
      children: (node) => {
        const isReady = node.status === "Ready";
        const isControlPlane = node.roles.includes("control-plane") || node.roles.includes("master");
        return (() => {
          var _el$53 = _tmpl$0(), _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$56 = _el$55.firstChild, _el$57 = _el$55.nextSibling, _el$58 = _el$54.nextSibling, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$61.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling;
          _el$53.$$click = () => {
            setSelected(node);
            setShowDescribe(true);
          };
          setStyleProperty(_el$53, "border-color", isReady ? "var(--border-color)" : "rgba(239, 68, 68, 0.3)");
          className(_el$55, `p-1.5 rounded ${isControlPlane ? "bg-cyan-500/20" : ""}`);
          setAttribute(_el$56, "class", `w-4 h-4 ${isControlPlane ? "text-cyan-400" : ""}`);
          className(_el$57, `px-1.5 py-0.5 rounded text-xs font-medium ${isReady ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`);
          insert(_el$57, () => node.status);
          insert(_el$58, () => node.name);
          insert(_el$59, () => node.roles || "worker");
          insert(_el$63, () => node.cpu || "N/A");
          insert(_el$66, () => node.memory || "N/A");
          createRenderEffect((_p$) => {
            var _v$24 = !isControlPlane ? {
              background: "var(--bg-secondary)"
            } : {}, _v$25 = !isControlPlane ? {
              color: "var(--text-secondary)"
            } : {}, _v$26 = node.name;
            _p$.e = style(_el$55, _v$24, _p$.e);
            _p$.t = style(_el$56, _v$25, _p$.t);
            _v$26 !== _p$.a && setAttribute(_el$58, "title", _p$.a = _v$26);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0
          });
          return _el$53;
        })();
      }
    }));
    return _el$52;
  })();
  return (() => {
    var _el$67 = _tmpl$1(), _el$68 = _el$67.firstChild, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, _el$71 = _el$70.firstChild, _el$72 = _el$71.nextSibling, _el$73 = _el$72.nextSibling, _el$74 = _el$73.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$77.firstChild, _el$80 = _el$78.nextSibling; _el$80.nextSibling; var _el$81 = _el$75.nextSibling, _el$82 = _el$68.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$86 = _el$83.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$87.nextSibling, _el$89 = _el$86.nextSibling, _el$90 = _el$89.firstChild, _el$91 = _el$90.nextSibling, _el$92 = _el$89.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$93.nextSibling, _el$95 = _el$92.nextSibling, _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling, _el$98 = _el$95.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling;
    _el$71.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$72.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    insert(_el$73, createComponent(For, {
      each: ["card", "list", "grid"],
      children: (mode) => (() => {
        var _el$101 = _tmpl$10(), _el$102 = _el$101.firstChild;
        _el$101.$$click = () => setViewMode(mode);
        insert(_el$101, createComponent(ViewIcon, {
          mode
        }), _el$102);
        insert(_el$102, mode);
        createRenderEffect((_p$) => {
          var _v$27 = `px-3 py-2 flex items-center gap-2 text-sm transition-colors ${viewMode() === mode ? "bg-k8s-blue text-white" : "text-gray-400 hover:text-white hover:bg-k8s-dark"}`, _v$28 = `${mode.charAt(0).toUpperCase() + mode.slice(1)} View`;
          _v$27 !== _p$.e && className(_el$101, _p$.e = _v$27);
          _v$28 !== _p$.t && setAttribute(_el$101, "title", _p$.t = _v$28);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$101;
      })()
    }));
    _el$76.addEventListener("change", (e) => setAutoRefresh(e.currentTarget.checked));
    insert(_el$77, refreshInterval, _el$80);
    _el$81.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetchNodes();
    };
    insert(_el$85, () => nodeSummary().total);
    insert(_el$88, () => nodeSummary().ready);
    insert(_el$91, () => nodeSummary().schedulable);
    insert(_el$94, () => nodeSummary().unschedulable);
    insert(_el$97, () => nodeSummary().notReady);
    insert(_el$100, () => nodeSummary().controlPlane);
    insert(_el$67, createComponent(Show, {
      get when() {
        return !nodesResource.loading;
      },
      get fallback() {
        return _tmpl$11();
      },
      get children() {
        return createComponent(Switch, {
          get children() {
            return [createComponent(Match, {
              get when() {
                return viewMode() === "card";
              },
              get children() {
                return createComponent(CardView, {});
              }
            }), createComponent(Match, {
              get when() {
                return viewMode() === "list";
              },
              get children() {
                return createComponent(ListView, {});
              }
            }), createComponent(Match, {
              get when() {
                return viewMode() === "grid";
              },
              get children() {
                return createComponent(GridView, {});
              }
            })];
          }
        });
      }
    }), null);
    insert(_el$67, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "node",
      get name() {
        return selected()?.name || "";
      }
    }), null);
    createRenderEffect(() => setAttribute(_el$81, "title", `Refresh Nodes${autoRefresh() ? ` (Auto-refresh: ${refreshInterval()}s)` : ""}`));
    createRenderEffect(() => _el$71.value = fontSize());
    createRenderEffect(() => _el$72.value = fontFamily());
    createRenderEffect(() => _el$76.checked = autoRefresh());
    return _el$67;
  })();
};
delegateEvents(["click"]);

export { Nodes as default };
//# sourceMappingURL=Nodes-D3aiXXa8.js.map
