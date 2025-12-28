import { t as template, i as insert, f as createRenderEffect, g as className, d as createComponent, F as For, m as memo, h as setStyleProperty, S as Show, v as delegateEvents, c as createSignal, j as createResource, k as api, o as onMount, a as createMemo, E as onCleanup, n as createEffect, G as addNotification, H as selectedNamespaces, I as setNamespaces, J as searchQuery, K as setSearchQuery, e as setAttribute, L as use, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, s as setCurrentView } from './index-NnaOo1cf.js';
import { c as createCachedResource } from './resourceCache-DgXvRxiF.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { C as CommandPreview } from './CommandPreview-DsvfJhKB.js';
import { D as DescribeModal } from './DescribeModal-CnmW-EF9.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-yjZBpTKC.js';
import { n as navigateToWorkloadWithFocus, k as kindAbbrev, f as formatWorkloadChain } from './workload-navigation-Cle66AyL.js';

function getHighlightedPod() {
  const podName = sessionStorage.getItem("kubegraf-highlight-pod");
  const namespace = sessionStorage.getItem("kubegraf-pod-namespace");
  if (podName && namespace) {
    return { podName, namespace };
  }
  return null;
}
function clearHighlightedPod() {
  sessionStorage.removeItem("kubegraf-highlight-pod");
  sessionStorage.removeItem("kubegraf-pod-namespace");
}
function getPodForLogs() {
  const podName = sessionStorage.getItem("kubegraf-open-logs-pod");
  const namespace = sessionStorage.getItem("kubegraf-open-logs-namespace");
  if (podName && namespace) {
    return { podName, namespace };
  }
  return null;
}
function clearPodLogs() {
  sessionStorage.removeItem("kubegraf-open-logs-pod");
  sessionStorage.removeItem("kubegraf-open-logs-namespace");
}

function getRowHoverBackground(isSelected = false, isFailed = false, isPending = false) {
  if (isSelected) {
    return "var(--bg-secondary)";
  }
  if (isFailed) {
    return "rgba(239, 68, 68, 0.08)";
  }
  if (isPending) {
    return "rgba(251, 191, 36, 0.08)";
  }
  return "var(--bg-secondary)";
}

function calculateContainerStatus(containers) {
  const summary = {
    total: containers.length,
    ready: 0,
    main: { total: 0, ready: 0 },
    init: { total: 0, ready: 0 },
    sidecar: { total: 0, ready: 0 }
  };
  containers.forEach((container) => {
    summary[container.type].total++;
    if (container.ready) {
      summary.ready++;
      summary[container.type].ready++;
    }
  });
  return summary;
}
function formatContainerStatus$1(summary) {
  return `${summary.ready}/${summary.total}`;
}
function getContainerStatusColor(summary) {
  if (summary.ready === summary.total && summary.total > 0) {
    return "text-green-400";
  }
  if (summary.ready === 0) {
    return "text-red-400";
  }
  return "text-yellow-400";
}

var _tmpl$$2 = /* @__PURE__ */ template(`<span>`);
const ContainerStatusBadge = (props) => {
  const statusText = () => formatContainerStatus$1(props.summary);
  const colorClass = () => getContainerStatusColor(props.summary);
  const sizeClass = () => {
    switch (props.size) {
      case "sm":
        return "text-xs";
      case "lg":
        return "text-base";
      default:
        return "text-sm";
    }
  };
  return (() => {
    var _el$ = _tmpl$$2();
    insert(_el$, statusText);
    createRenderEffect(() => className(_el$, `font-mono font-medium ${colorClass()} ${sizeClass()}`));
    return _el$;
  })();
};

function generateContainerIdx(type, index) {
  const prefix = type === "init" ? "I" : "M";
  return `${prefix}${index + 1}`;
}
function formatContainerStatus(container) {
  if (container.ready) {
    return container.state || "Running";
  }
  if (container.state) {
    return container.state;
  }
  return "Pending";
}
function getStatusColorClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower === "running") {
    return "text-green-400";
  }
  if (statusLower === "waiting" || statusLower === "pending") {
    return "text-yellow-400";
  }
  if (statusLower === "terminated" || statusLower === "failed" || statusLower === "error") {
    return "text-red-400";
  }
  return "text-gray-400";
}
function formatPorts(ports) {
  if (!ports || ports.length === 0) return "-";
  return ports.join(", ");
}
function calculateContainerAge(startedAt) {
  if (!startedAt) return "-";
  try {
    const started = new Date(startedAt);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - started.getTime();
    if (diffMs < 0) return "0s";
    const seconds = Math.floor(diffMs / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    if (hours < 24) {
      return `${hours}h`;
    }
    return `${days}d`;
  } catch {
    return "-";
  }
}
function containersToTableRows(containers, containerMetrics, containerPorts) {
  const initContainers = [];
  const mainContainers = [];
  containers.forEach((container) => {
    if (container.type === "init") {
      initContainers.push(container);
    } else {
      mainContainers.push(container);
    }
  });
  const rows = [];
  initContainers.forEach((container, index) => {
    const idx = generateContainerIdx("init", index);
    const metrics = containerMetrics?.[container.name];
    const ports = containerPorts?.[container.name];
    rows.push({
      idx,
      name: container.name,
      type: container.type,
      status: formatContainerStatus(container),
      restarts: container.restartCount || 0,
      cpu: metrics?.cpu || "-",
      memory: metrics?.memory || "-",
      age: calculateContainerAge(container.startedAt),
      ports: formatPorts(ports),
      container
    });
  });
  mainContainers.forEach((container, index) => {
    const idx = generateContainerIdx("main", index);
    const metrics = containerMetrics?.[container.name];
    const ports = containerPorts?.[container.name];
    rows.push({
      idx,
      name: container.name,
      type: container.type,
      status: formatContainerStatus(container),
      restarts: container.restartCount || 0,
      cpu: metrics?.cpu || "-",
      memory: metrics?.memory || "-",
      age: calculateContainerAge(container.startedAt),
      ports: formatPorts(ports),
      container
    });
  });
  return rows;
}

var _tmpl$$1 = /* @__PURE__ */ template(`<div class=overflow-x-auto><table class="w-full border-collapse"><thead><tr class=border-b style=border-color:var(--border-color)><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>IDX</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Name</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Status</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Restarts</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>CPU</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Memory</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Age</th><th class="text-left py-2 px-3 text-xs font-semibold"style=color:var(--text-muted)>Ports</th></tr></thead><tbody>`), _tmpl$2$1 = /* @__PURE__ */ template(`<tr><td colspan=8 class="py-4 text-center text-sm"style=color:var(--text-muted)>No containers found`), _tmpl$3$1 = /* @__PURE__ */ template(`<tr class="border-b hover:opacity-80 transition-opacity cursor-pointer"style=border-color:var(--border-color)><td class="py-2 px-3 text-sm font-mono font-bold"style=color:var(--text-primary)></td><td class="py-2 px-3 text-sm"style=color:var(--text-primary)><div class="flex items-center gap-2"><span></span></div></td><td class="py-2 px-3 text-sm"><span></span></td><td class="py-2 px-3 text-sm"style=color:var(--text-primary)></td><td class="py-2 px-3 text-sm"style=color:#ec4899;font-weight:600></td><td class="py-2 px-3 text-sm"style=color:#f59e0b;font-weight:600></td><td class="py-2 px-3 text-sm"style=color:var(--text-secondary)></td><td class="py-2 px-3 text-sm font-mono"style=color:var(--text-secondary)>`), _tmpl$4$1 = /* @__PURE__ */ template(`<span class="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">INIT`), _tmpl$5$1 = /* @__PURE__ */ template(`<span style=color:var(--warning-color)>`);
const ContainerTable = (props) => {
  return (() => {
    var _el$ = _tmpl$$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling, _el$0 = _el$9.nextSibling, _el$1 = _el$0.nextSibling; _el$1.nextSibling; var _el$11 = _el$3.nextSibling;
    insert(_el$11, createComponent(Show, {
      get when() {
        return props.containers.length > 0;
      },
      get fallback() {
        return (() => {
          var _el$12 = _tmpl$2$1(); _el$12.firstChild;
          return _el$12;
        })();
      },
      get children() {
        return createComponent(For, {
          get each() {
            return props.containers;
          },
          children: (row) => (() => {
            var _el$14 = _tmpl$3$1(), _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$19.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling;
            _el$14.$$click = () => props.onContainerClick?.(row);
            insert(_el$15, () => row.idx);
            insert(_el$18, () => row.name);
            insert(_el$17, (() => {
              var _c$ = memo(() => row.type === "init");
              return () => _c$() && _tmpl$4$1();
            })(), null);
            insert(_el$20, () => row.status);
            insert(_el$21, (() => {
              var _c$2 = memo(() => row.restarts > 0);
              return () => _c$2() ? (() => {
                var _el$27 = _tmpl$5$1();
                insert(_el$27, () => row.restarts);
                return _el$27;
              })() : row.restarts;
            })());
            insert(_el$22, () => row.cpu);
            insert(_el$23, () => row.memory);
            insert(_el$24, () => row.age);
            insert(_el$25, () => row.ports);
            createRenderEffect((_p$) => {
              var _v$ = row.type === "init" ? "var(--bg-secondary)" : "transparent", _v$2 = getStatusColorClass(row.status);
              _v$ !== _p$.e && setStyleProperty(_el$14, "background", _p$.e = _v$);
              _v$2 !== _p$.t && className(_el$20, _p$.t = _v$2);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$14;
          })()
        });
      }
    }));
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4"><h3 class="font-semibold mb-3 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>Active Port Forwards</h3><div class="flex flex-wrap gap-2">`), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Status </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Ready</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">IP</th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">CPU </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Mem </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Restarts </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Node</th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style=background:var(--bg-secondary)><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> pods</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div class="text-red-400 mb-2">Error: `), _tmpl$6 = /* @__PURE__ */ template(`<pre class=whitespace-pre-wrap>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="flex flex-col h-[60vh]"><div class="flex flex-wrap items-center gap-3 mb-3"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=50>Last 50 lines</option><option value=100>Last 100 lines</option><option value=500>Last 500 lines</option><option value=1000>Last 1000 lines</option></select><label class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"><input type=checkbox class=hidden><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg><span class="text-sm font-medium"></span></label><input type=text placeholder="Search logs..."class="px-3 py-2 rounded-lg text-sm flex-1 min-w-[150px]"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><button class="p-2 rounded-lg hover:bg-[var(--bg-secondary)]"title="Refresh Logs"style=background:var(--bg-tertiary);color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><button class="px-3 py-2 rounded-lg text-sm flex items-center gap-1"style=background:var(--bg-tertiary);color:var(--text-secondary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>Download</button></div><div class="flex-1 font-mono text-xs p-4 rounded-lg overflow-auto"style="background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color)">`), _tmpl$8 = /* @__PURE__ */ template(`<div class=space-y-3><div class="flex items-end gap-3"><div class=flex-1><label class="block text-sm mb-1.5"style=color:var(--text-secondary)>Local Port</label><input type=number min=1024 max=65535 class="w-full px-3 py-2 rounded text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class="pb-3 text-gray-400 text-lg">→</div><div class=flex-1><label class="block text-sm mb-1.5"style=color:var(--text-secondary)>Remote Port</label><input type=number min=1 max=65535 class="w-full px-3 py-2 rounded text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div class="text-sm px-3 py-2 rounded text-center"style=background:var(--bg-tertiary);color:var(--text-muted)><span class="font-mono text-blue-400">localhost:</span> → <span class="font-mono text-green-400">:</span></div><div class="flex gap-3 pt-1"><button class="btn-secondary flex-1 px-4 py-2 text-sm">Cancel</button><button class="btn-primary flex-1 px-4 py-2 text-sm">Start`), _tmpl$9 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-start gap-3"><div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"style="background:rgba(239, 68, 68, 0.15)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><div class=flex-1><p class="text-sm mb-2"style=color:var(--text-primary)>Are you sure you want to delete this pod?</p><div class="p-3 rounded-lg mb-4"style=background:var(--bg-tertiary)><div class="text-sm font-medium mb-1"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)>Namespace: </div></div><p class="text-xs mb-4"style=color:var(--text-muted)>This action cannot be undone. The pod will be permanently deleted from the cluster.</p></div></div><div class="flex items-center justify-end gap-3 pt-4 border-t"style=border-color:var(--border-color)><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)">Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-2"style=background:var(--error-color);color:white><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>Delete Pod`), _tmpl$0 = /* @__PURE__ */ template(`<div class=space-y-2>`), _tmpl$1 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$10 = /* @__PURE__ */ template(`<div style=display:flex;align-items:center;justify-content:center;padding:40px;color:var(--text-secondary)><div class=spinner style=margin-right:12px></div>Analyzing pod...`), _tmpl$11 = /* @__PURE__ */ template(`<div style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:8px;padding:16px;color:var(--error-color)"><strong>Error:</strong> `), _tmpl$12 = /* @__PURE__ */ template(`<div style=background:var(--bg-secondary);border-radius:8px;padding:16px;margin-bottom:16px><h4 style="margin:0 0 8px;color:var(--accent-primary);font-size:14px">📋 Summary</h4><p style=margin:0;color:var(--text-primary);font-size:13px;line-height:1.5>`), _tmpl$13 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:16px;margin-bottom:16px"><h4 style="margin:0 0 12px;color:var(--text-primary);font-size:14px">🔍 Key Findings</h4><ul style=margin:0;padding-left:20px>`), _tmpl$14 = /* @__PURE__ */ template(`<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;padding:16px"><h4 style="margin:0 0 12px;color:var(--text-primary);font-size:14px">🕐 Timeline</h4><div style=max-height:300px;overflow-y:auto;background:var(--bg-secondary);border-radius:6px;padding:12px;font-family:monospace;font-size:11px;line-height:1.6>`), _tmpl$15 = /* @__PURE__ */ template(`<div style=max-height:70vh;overflow-y:auto>`), _tmpl$16 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Pods</h1><p class=text-xs style=color:var(--text-secondary)>Manage and monitor your Kubernetes pods</p></div><div class="flex items-center gap-3"><button class=icon-btn title="Open in New Tab"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></button><button class=icon-btn title="Maximize to Fullscreen"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg></button><button class=icon-btn><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></button><button class=icon-btn title="Refresh Pods (Auto-refresh: 2s)"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-2"><div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5"style="border-left:2px solid var(--accent-primary)"><span class=text-xs style=color:var(--text-secondary)>Total</span><span class="text-sm font-semibold"style=color:var(--text-primary)></span></div><div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5"style="border-left:2px solid var(--success-color)"><span class=text-xs style=color:var(--text-secondary)>Running</span><span class="text-sm font-semibold"style=color:var(--success-color)></span></div><div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5"style="border-left:2px solid var(--warning-color)"><span class=text-xs style=color:var(--text-secondary)>Pending</span><span class="text-sm font-semibold"style=color:var(--warning-color)></span></div><div class="card px-3 py-1.5 cursor-pointer hover:opacity-80 flex items-center gap-1.5"style="border-left:2px solid var(--error-color)"><span class=text-xs style=color:var(--text-secondary)>Failed</span><span class="text-sm font-semibold"style=color:var(--error-color)></span></div><div class=flex-1></div><select class="px-3 py-2 rounded-lg text-sm font-bold"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm font-bold"title="Font Style"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=all>All Status</option><option value=running>Running</option><option value=pending>Pending</option><option value=failed>Failed/Error</option><option value=succeeded>Succeeded</option></select><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px">`), _tmpl$17 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 px-3 py-2 rounded-lg"style=background:var(--bg-tertiary)><span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span><span style=color:var(--text-primary)></span><span style=color:var(--text-muted)>localhost:<!> → </span><a target=_blank class="text-xs px-2 py-1 rounded"style=background:var(--accent-primary);color:white>Open</a><button class="text-red-400 hover:text-red-300"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$18 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading pods...`), _tmpl$19 = /* @__PURE__ */ template(`<tr><td colspan=11 class="text-center py-8"style=color:var(--text-muted)>No pods found`), _tmpl$20 = /* @__PURE__ */ template(`<tr style="cursor:pointer;font-weight:900;padding:0;margin:0;transition:background-color 0.15s ease"><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"><div class="flex items-center gap-2 flex-wrap"><span></span></div></td><td style="padding:0 8px;text-align:left;border:none"><span style=font-weight:900> </span></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none"><span class="flex items-center"style=font-weight:900></span></td><td style="padding:0 8px;text-align:left;border:none"><span class="flex items-center"style=font-weight:900></span></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$21 = /* @__PURE__ */ template(`<button class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1"style="background:var(--accent-primary)35;color:var(--accent-primary);border:1.5px solid var(--accent-primary);line-height:1.3;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0, 0, 0, 0.1)"><svg width=10 height=10 viewBox="0 0 12 12"fill=none style=flex-shrink:0><path d="M2 2h8v8H2z"stroke=currentColor stroke-width=1.5 fill=none></path><path d="M4 6h4M6 4v4"stroke=currentColor stroke-width=1.5></path></svg> `), _tmpl$22 = /* @__PURE__ */ template(`<span>`), _tmpl$23 = /* @__PURE__ */ template(`<span style=color:#ef4444;margin-left:2px>▲`), _tmpl$24 = /* @__PURE__ */ template(`<span style=color:#22c55e;margin-left:2px>▼`), _tmpl$25 = /* @__PURE__ */ template(`<div class="spinner mx-auto">`), _tmpl$26 = /* @__PURE__ */ template(`<span class="w-2 h-2 rounded-full bg-green-400 animate-pulse">`), _tmpl$27 = /* @__PURE__ */ template(`<div class="flex items-center justify-center h-full"><div class=spinner>`), _tmpl$28 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div><span></span></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Ready</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>CPU</div><div style=color:#ec4899;font-weight:600></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Memory</div><div style=color:#f59e0b;font-weight:600></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Restarts</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>IP</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div><div class="mt-3 p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Node</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div></div><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Containers</h3></div><div class="grid grid-cols-5 gap-2 pt-3"><button class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Shell><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span>Shell</span></button><button class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title="Port Forward"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span class="text-center leading-tight">Port<br>Forward</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Logs><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Logs</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe`), _tmpl$29 = /* @__PURE__ */ template(`<div class="p-4 text-center"><div class="spinner mx-auto">`), _tmpl$30 = /* @__PURE__ */ template(`<div class="rounded-lg border"style=border-color:var(--border-color);background:var(--bg-secondary)>`), _tmpl$31 = /* @__PURE__ */ template(`<div>No pod selected`), _tmpl$32 = /* @__PURE__ */ template(`<div>No containers found`), _tmpl$33 = /* @__PURE__ */ template(`<button class="w-full p-3 rounded-lg text-left transition-colors"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color);hover-background:var(--bg-tertiary)"><div class="flex items-center gap-2"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg><div class=flex-1><div class=font-medium></div><div class="text-xs flex items-center gap-2"style=color:var(--text-muted)><span></span><span>• `), _tmpl$34 = /* @__PURE__ */ template(`<span class="text-green-400 text-xs">✓`), _tmpl$35 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8">Loading...`), _tmpl$36 = /* @__PURE__ */ template(`<li style=font-size:13px;color:var(--text-secondary);margin-bottom:6px;line-height:1.4>`), _tmpl$37 = /* @__PURE__ */ template(`<div style=padding-bottom:4px;margin-bottom:4px>`);
const Pods = () => {
  const [statusFilter, setStatusFilter] = createSignal("all");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selectedPod, setSelectedPod] = createSignal(null);
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showLogs, setShowLogs] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showShell, setShowShell] = createSignal(false);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [podToDelete, setPodToDelete] = createSignal(null);
  const [showContainerSelect, setShowContainerSelect] = createSignal(false);
  const [containerSelectPod, setContainerSelectPod] = createSignal(null);
  const [showExplain, setShowExplain] = createSignal(false);
  const [explainData, setExplainData] = createSignal(null);
  const [explainLoading, setExplainLoading] = createSignal(false);
  const [explainError, setExplainError] = createSignal(null);
  const [actionMenuOpen, setActionMenuOpen] = createSignal(false);
  const [localPort, setLocalPort] = createSignal(8080);
  const [remotePort, setRemotePort] = createSignal(80);
  const [portForwards, {
    refetch: refetchPF
  }] = createResource(api.listPortForwards);
  const [logsContent, setLogsContent] = createSignal("");
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [logsError, setLogsError] = createSignal(null);
  const [logsTail, setLogsTail] = createSignal(100);
  const [logsSearch, setLogsSearch] = createSignal("");
  const [logsFollow, setLogsFollow] = createSignal(false);
  let logsEventSource = null;
  const [podMetrics, setPodMetrics] = createSignal({});
  const [prevMetrics, setPrevMetrics] = createSignal({});
  let metricsTimer = null;
  const [terminalView, setTerminalView] = createSignal(false);
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("pods-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("pods-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("pods-font-family");
    return saved || "Monospace";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("pods-font-family", family);
  };
  const getFontFamilyCSS = () => {
    const family = fontFamily();
    switch (family) {
      case "Monospace":
        return '"Courier New", Monaco, monospace';
      case "System-ui":
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case "Monaco":
        return 'Monaco, "Lucida Console", monospace';
      case "Consolas":
        return 'Consolas, "Courier New", monospace';
      case "Courier":
        return 'Courier, "Courier New", monospace';
      default:
        return '"Courier New", Monaco, monospace';
    }
  };
  const [selectedIndex, setSelectedIndex] = createSignal(null);
  const [selectedPodIndex, setSelectedPodIndex] = createSignal(null);
  const [hoveredRowIndex, setHoveredRowIndex] = createSignal(null);
  let tableRef;
  const parseMetricValue = (val) => {
    if (!val || val === "-") return 0;
    const match = val.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  const getChangeIndicator = (key, type) => {
    const current = podMetrics()[key]?.[type];
    const prev = prevMetrics()[key]?.[type];
    if (!current || !prev) return null;
    const currentVal = parseMetricValue(current);
    const prevVal = parseMetricValue(prev);
    if (currentVal > prevVal) return "up";
    if (currentVal < prevVal) return "down";
    return null;
  };
  const fetchMetrics = async () => {
    try {
      const currentMetrics = podMetrics();
      const namespaceParam = getNamespaceParam();
      const metrics = await api.getPodMetrics(namespaceParam);
      if (Object.keys(currentMetrics).length > 0) {
        setPrevMetrics(currentMetrics);
      }
      setPodMetrics(metrics);
    } catch (e) {
      console.error("Failed to fetch metrics:", e);
    }
  };
  const [ageTicker, setAgeTicker] = createSignal(0);
  let ageTimer = null;
  const formatAgeFromTimestamp = (createdAt, _tick) => {
    if (!createdAt) return "-";
    const created = new Date(createdAt);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs < 0) return "0s";
    const seconds = Math.floor(diffMs / 1e3);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 120) {
      return `${seconds}s`;
    }
    if (minutes < 60) {
      const secs = seconds % 60;
      return `${minutes}m${secs}s`;
    }
    if (hours < 24) {
      const mins = minutes % 60;
      return `${hours}h${mins}m`;
    }
    const hrs = hours % 24;
    return `${days}d${hrs}h`;
  };
  let podsRefreshTimer = null;
  let keyboardHandler = null;
  onMount(() => {
    fetchMetrics();
    metricsTimer = setInterval(fetchMetrics, 1e4);
    ageTimer = setInterval(() => setAgeTicker((t) => t + 1), 5e3);
    podsRefreshTimer = setInterval(() => {
      if (!actionMenuOpen()) {
        podsCache.refetch().catch((err) => console.error("Background refresh error:", err));
        fetchMetrics();
      }
    }, 2e3);
    keyboardHandler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }
      const allPods = filteredAndSortedPods();
      if (allPods.length === 0) return;
      const currentPodIndex = selectedPodIndex();
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedPodIndex((prev) => {
            if (prev === null) {
              const firstIndex = 0;
              updatePageForIndex(firstIndex, allPods.length);
              return firstIndex;
            }
            const nextIndex = Math.min(prev + 1, allPods.length - 1);
            updatePageForIndex(nextIndex, allPods.length);
            return nextIndex;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedPodIndex((prev) => {
            if (prev === null || prev === 0) {
              setSelectedIndex(null);
              return null;
            }
            const prevIndex = prev - 1;
            updatePageForIndex(prevIndex, allPods.length);
            return prevIndex;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (currentPodIndex !== null && allPods[currentPodIndex]) {
            openModal(allPods[currentPodIndex], "details");
          }
          break;
        case "Escape":
          setSelectedPodIndex(null);
          setSelectedIndex(null);
          break;
      }
    };
    const updatePageForIndex = (podIndex, totalPods) => {
      const size = pageSize();
      const targetPage = Math.floor(podIndex / size) + 1;
      const totalPages2 = Math.ceil(totalPods / size);
      if (targetPage !== currentPage() && targetPage >= 1 && targetPage <= totalPages2) {
        setCurrentPage(targetPage);
      }
    };
    document.addEventListener("keydown", keyboardHandler);
  });
  onCleanup(() => {
    if (metricsTimer) clearInterval(metricsTimer);
    if (ageTimer) clearInterval(ageTimer);
    if (podsRefreshTimer) clearInterval(podsRefreshTimer);
    if (keyboardHandler) document.removeEventListener("keydown", keyboardHandler);
  });
  createEffect(() => {
    filteredAndSortedPods();
    setSelectedPodIndex(null);
    setSelectedIndex(null);
  });
  createEffect(() => {
    const podIndex = selectedPodIndex();
    const allPods = filteredAndSortedPods();
    if (podIndex !== null && allPods.length > 0 && podIndex < allPods.length) {
      const size = pageSize();
      const start = (currentPage() - 1) * size;
      const end = start + size;
      if (podIndex >= start && podIndex < end) {
        const localIndex = podIndex - start;
        setSelectedIndex(localIndex);
      } else {
        setSelectedIndex(null);
      }
    } else if (podIndex !== null && allPods.length > 0 && podIndex >= allPods.length) {
      setSelectedPodIndex(null);
      setSelectedIndex(null);
    } else {
      setSelectedIndex(null);
    }
  });
  createEffect(() => {
    const index = selectedIndex();
    if (index !== null && tableRef) {
      setTimeout(() => {
        const rows = tableRef?.querySelectorAll("tbody tr");
        if (rows && rows[index]) {
          rows[index].scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }
      }, 50);
    }
  });
  createEffect(() => {
    const highlighted = getHighlightedPod();
    if (highlighted) {
      const pods2 = podsCache();
      if (pods2 && pods2.length > 0) {
        const pod = pods2.find((p) => p.name === highlighted.podName && p.namespace === highlighted.namespace);
        if (pod) {
          const filtered = filteredAndSortedPods();
          const index = filtered.findIndex((p) => p.name === highlighted.podName && p.namespace === highlighted.namespace);
          if (index !== -1) {
            const size = pageSize();
            const targetPage = Math.floor(index / size) + 1;
            if (targetPage !== currentPage()) {
              setCurrentPage(targetPage);
            }
            setSelectedPodIndex(index);
            setTimeout(() => {
              const rows = tableRef?.querySelectorAll("tbody tr");
              const localIndex = index - (targetPage - 1) * size;
              if (rows && rows[localIndex]) {
                rows[localIndex].scrollIntoView({
                  behavior: "smooth",
                  block: "center"
                });
                rows[localIndex].style.background = "var(--accent-primary)20";
                setTimeout(() => {
                  rows[localIndex].style.background = "";
                }, 2e3);
              }
            }, 500);
          }
          clearHighlightedPod();
        } else {
          setTimeout(() => {
            const podsRetry = podsCache();
            if (podsRetry && podsRetry.length > 0) {
              const podRetry = podsRetry.find((p) => p.name === highlighted.podName && p.namespace === highlighted.namespace);
              if (podRetry) {
                const filtered = filteredAndSortedPods();
                const index = filtered.findIndex((p) => p.name === highlighted.podName && p.namespace === highlighted.namespace);
                if (index !== -1) {
                  const size = pageSize();
                  const targetPage = Math.floor(index / size) + 1;
                  if (targetPage !== currentPage()) {
                    setCurrentPage(targetPage);
                  }
                  setSelectedPodIndex(index);
                  setTimeout(() => {
                    const rows = tableRef?.querySelectorAll("tbody tr");
                    const localIndex = index - (targetPage - 1) * size;
                    if (rows && rows[localIndex]) {
                      rows[localIndex].scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                      });
                      rows[localIndex].style.background = "var(--accent-primary)20";
                      setTimeout(() => {
                        rows[localIndex].style.background = "";
                      }, 2e3);
                    }
                  }, 500);
                }
                clearHighlightedPod();
              }
            }
          }, 1e3);
        }
      }
    }
  });
  createEffect(() => {
    const podForLogs = getPodForLogs();
    const flag = sessionStorage.getItem("kubegraf-open-logs-flag");
    const pods2 = podsCache.data();
    if (podForLogs && flag === "true" && pods2 && pods2.length > 0) {
      const pod = pods2.find((p) => p.name === podForLogs.podName && p.namespace === podForLogs.namespace);
      if (pod) {
        sessionStorage.removeItem("kubegraf-open-logs-flag");
        clearPodLogs();
        setSelectedPod(pod);
        fetchLogs(pod, logsFollow());
        setShowLogs(true);
        addNotification(`Opening logs for ${pod.name}`, "info");
      }
    }
  });
  createEffect(() => {
    const podForLogs = getPodForLogs();
    const flag = sessionStorage.getItem("kubegraf-open-logs-flag");
    if (podForLogs && flag === "true") {
      const timeoutId = setTimeout(() => {
        const currentFlag = sessionStorage.getItem("kubegraf-open-logs-flag");
        if (currentFlag === "true") {
          sessionStorage.removeItem("kubegraf-open-logs-flag");
          clearPodLogs();
          addNotification(`Opening logs for ${podForLogs.podName} (pod may not be in current view)`, "info");
          const tempPod = {
            name: podForLogs.podName,
            namespace: podForLogs.namespace,
            status: "Unknown",
            ready: "0/0",
            restarts: 0,
            age: "Unknown",
            node: "Unknown"
          };
          setSelectedPod(tempPod);
          fetchLogs(tempPod, logsFollow());
          setShowLogs(true);
        }
      }, 3e3);
      return () => clearTimeout(timeoutId);
    }
  });
  createResource(api.getNamespaces);
  const getNamespaceParam = () => {
    const namespaces2 = selectedNamespaces();
    if (namespaces2.length === 0) return void 0;
    if (namespaces2.length === 1) return namespaces2[0];
    return namespaces2[0];
  };
  const podsCache = createCachedResource("pods", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const pods2 = await api.getPods(namespaceParam);
      return pods2;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const pods = createMemo(() => podsCache.data() || []);
  const [ownerFilter, setOwnerFilter] = createSignal(null);
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const ownerKind = params.get("ownerKind");
    const ownerName = params.get("ownerName");
    const ownerNamespace = params.get("namespace");
    if (ownerKind && ownerName) {
      setOwnerFilter({
        kind: ownerKind,
        name: ownerName,
        namespace: ownerNamespace || void 0
      });
    }
    const wasSetProgrammatically = sessionStorage.getItem("kubegraf:namespaceSetProgrammatically") === "true";
    const currentNamespaces = selectedNamespaces();
    if (wasSetProgrammatically) {
      if (ownerNamespace && currentNamespaces.length === 1 && currentNamespaces[0] === ownerNamespace) {
        setNamespaces([]);
      } else if (currentNamespaces.length === 1 && !ownerNamespace) {
        setNamespaces([]);
      }
      sessionStorage.removeItem("kubegraf:namespaceSetProgrammatically");
    } else if (ownerNamespace && currentNamespaces.length === 1 && currentNamespaces[0] === ownerNamespace) {
      setNamespaces([]);
    }
  });
  const [initialLoad, setInitialLoad] = createSignal(true);
  createEffect(() => {
    if (pods() !== void 0 && initialLoad()) {
      setInitialLoad(false);
    }
  });
  const [yamlContent] = createResource(() => (showYaml() || showEdit()) && selectedPod() ? {
    name: selectedPod().name,
    ns: selectedPod().namespace
  } : null, async (params) => {
    if (!params) return "";
    const data = await api.getPodYAML(params.name, params.ns);
    return data.yaml || "";
  });
  const handleSaveYAML = async (yaml) => {
    const pod = selectedPod();
    if (!pod) return;
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = "YAML cannot be empty";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    const status = clusterStatus();
    if (!status?.connected) {
      const msg = "Cluster is not connected. Connect to a cluster before applying YAML.";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    startExecution({
      label: `Apply Pod YAML: ${pod.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: pod.namespace,
      context: status.context,
      userAction: "pods-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "pods",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => podsCache.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const pod = selectedPod();
    if (!pod) return;
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = "YAML cannot be empty";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    const status = clusterStatus();
    if (!status?.connected) {
      const msg = "Cluster is not connected. Connect to a cluster before running a dry run.";
      addNotification(msg, "error");
      throw new Error(msg);
    }
    startExecution({
      label: `Dry run Pod YAML: ${pod.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: pod.namespace,
      context: status.context,
      userAction: "pods-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "pods",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  const parseCpu = (cpu) => {
    if (!cpu) return 0;
    const match = cpu.match(/^(\d+)m?$/);
    return match ? parseInt(match[1]) : 0;
  };
  const parseMemory = (mem) => {
    if (!mem) return 0;
    const match = mem.match(/^(\d+)(Ki|Mi|Gi)?$/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "Gi") return value * 1024;
    if (unit === "Ki") return value / 1024;
    return value;
  };
  const parseAge = (age) => {
    if (!age) return 0;
    let total = 0;
    const days = age.match(/(\d+)d/);
    const hours = age.match(/(\d+)h/);
    const mins = age.match(/(\d+)m/);
    if (days) total += parseInt(days[1]) * 24 * 60;
    if (hours) total += parseInt(hours[1]) * 60;
    if (mins) total += parseInt(mins[1]);
    return total;
  };
  const filteredAndSortedPods = createMemo(() => {
    let allPods = pods() || [];
    const query = searchQuery().toLowerCase();
    const status = statusFilter();
    if (query) {
      allPods = allPods.filter((p) => p.name.toLowerCase().includes(query) || p.namespace.toLowerCase().includes(query) || p.node?.toLowerCase().includes(query) || p.ip?.toLowerCase().includes(query));
    }
    if (status !== "all") {
      if (status === "running") {
        allPods = allPods.filter((p) => p.status === "Running");
      } else if (status === "pending") {
        allPods = allPods.filter((p) => p.status === "Pending" || p.status === "Initializing" || p.status?.includes("ContainerCreating") || p.status?.includes("PodInitializing") || p.status?.includes("Init:") || p.status?.toLowerCase().includes("initializing"));
      } else if (status === "failed") {
        allPods = allPods.filter((p) => ["Failed", "Error", "CrashLoopBackOff"].includes(p.status));
      } else if (status === "succeeded") {
        allPods = allPods.filter((p) => p.status === "Succeeded");
      }
    }
    const owner = ownerFilter();
    if (owner && owner.kind && owner.name) {
      allPods = allPods.filter((p) => {
        if (!p.workloadRef) return false;
        const ref = p.workloadRef;
        const kindMatch = ref.kind.toLowerCase() === owner.kind.toLowerCase();
        const nameMatch = ref.name === owner.name;
        const namespaceMatch = !owner.namespace || ref.namespace === owner.namespace;
        return kindMatch && nameMatch && namespaceMatch;
      });
    }
    const field = sortField();
    const direction = sortDirection();
    allPods = [...allPods].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "namespace":
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "cpu":
          comparison = parseCpu(a.cpu) - parseCpu(b.cpu);
          break;
        case "memory":
          comparison = parseMemory(a.memory) - parseMemory(b.memory);
          break;
        case "restarts":
          comparison = a.restarts - b.restarts;
          break;
        case "age":
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return allPods;
  });
  const selectedItemsForModal = createMemo(() => {
    return bulk.getSelectedItems(filteredAndSortedPods());
  });
  const totalPages = createMemo(() => Math.ceil(filteredAndSortedPods().length / pageSize()));
  const paginatedPods = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSortedPods().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = pods() || [];
    return {
      running: all.filter((p) => p.status === "Running").length,
      pending: all.filter((p) => p.status === "Pending" || p.status === "Initializing" || p.status?.includes("ContainerCreating") || p.status?.includes("PodInitializing") || p.status?.includes("Init:") || p.status?.toLowerCase().includes("initializing")).length,
      failed: all.filter((p) => ["Failed", "Error", "CrashLoopBackOff"].includes(p.status)).length,
      total: all.length
    };
  });
  const handleSort = (field) => {
    if (sortField() === field) {
      setSortDirection((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };
  const SortIcon = (props) => (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
    createRenderEffect((_p$) => {
      var _v$ = sortField() === props.field && sortDirection() === "asc" ? "var(--accent-primary)" : "var(--text-muted)", _v$2 = sortField() === props.field && sortDirection() === "desc" ? "var(--accent-primary)" : "var(--text-muted)";
      _v$ !== _p$.e && setStyleProperty(_el$2, "color", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$3, "color", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
  const openModal = (pod, modal) => {
    setSelectedPod(pod);
    switch (modal) {
      case "yaml":
        setShowYaml(true);
        break;
      case "describe":
        setShowDescribe(true);
        break;
      case "logs":
        fetchLogs(pod, logsFollow());
        setShowLogs(true);
        break;
      case "details":
        setShowDetails(true);
        break;
      case "shell":
        setShowShell(true);
        break;
      case "portforward":
        setShowPortForward(true);
        break;
    }
  };
  const startPortForward = async () => {
    const pod = selectedPod();
    if (!pod) return;
    try {
      await api.startPortForward("pod", pod.name, pod.namespace, localPort(), remotePort());
      setShowPortForward(false);
      refetchPF();
    } catch (error) {
      console.error("Failed to start port forward:", error);
    }
  };
  const stopPortForward = async (id) => {
    try {
      await api.stopPortForward(id);
      refetchPF();
    } catch (error) {
      console.error("Failed to stop port forward:", error);
    }
  };
  const getContainerInfos = (pod) => {
    if (!pod.containers || pod.containers.length === 0) return [];
    if (typeof pod.containers[0] === "object") {
      return pod.containers;
    }
    const containerNames = pod.containers;
    return containerNames.map((name) => ({
      name,
      type: "main",
      image: ""
    }));
  };
  const getMainContainerName = (pod) => {
    const infos = getContainerInfos(pod);
    const mainContainer = infos.find((c) => c.type === "main");
    return mainContainer?.name || infos[0]?.name || "";
  };
  const openShellInNewTab = (pod) => {
    const containerInfos = getContainerInfos(pod);
    if (containerInfos.length > 1) {
      setContainerSelectPod(pod);
      setShowContainerSelect(true);
    } else {
      const container = getMainContainerName(pod);
      window.open(`/api/pod/exec?name=${pod.name}&namespace=${pod.namespace}&container=${container}`, "_blank");
    }
  };
  const connectToContainer = (pod, container) => {
    setShowContainerSelect(false);
    window.open(`/api/pod/exec?name=${pod.name}&namespace=${pod.namespace}&container=${container}`, "_blank");
  };
  const stopLogStream = () => {
    if (logsEventSource) {
      logsEventSource.close();
      logsEventSource = null;
    }
  };
  const fetchLogs = async (pod, follow = false) => {
    stopLogStream();
    setLogsLoading(true);
    setLogsError(null);
    const container = getMainContainerName(pod);
    const url = `/api/pod/logs?name=${pod.name}&namespace=${pod.namespace}&container=${container}&tail=${logsTail()}${follow ? "&follow=true" : ""}`;
    if (follow) {
      setLogsContent("");
      logsEventSource = new EventSource(url);
      logsEventSource.onmessage = (event) => {
        setLogsContent((prev) => prev + event.data + "\n");
        setLogsLoading(false);
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
    const query = logsSearch().toLowerCase();
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
    a.download = `${selectedPod()?.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const openDeleteConfirm = (pod) => {
    setPodToDelete(pod);
    setShowDeleteConfirm(true);
  };
  const openExplain = async (pod) => {
    setSelectedPod(pod);
    setShowExplain(true);
    setExplainLoading(true);
    setExplainError(null);
    setExplainData(null);
    try {
      const response = await fetch(`/api/explain/pod?namespace=${encodeURIComponent(pod.namespace)}&pod=${encodeURIComponent(pod.name)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to explain pod: ${response.statusText}`);
      }
      const data = await response.json();
      setExplainData(data);
    } catch (err) {
      setExplainError(err.message || "Failed to explain pod");
      console.error("Explain error:", err);
    } finally {
      setExplainLoading(false);
    }
  };
  const deletePod = async () => {
    const pod = podToDelete();
    if (!pod) return;
    setShowDeleteConfirm(false);
    try {
      await api.deletePod(pod.name, pod.namespace);
      addNotification(`Pod ${pod.name} deleted successfully`, "success");
      setTimeout(() => podsCache.refetch(), 500);
    } catch (error) {
      console.error("Failed to delete pod:", error);
      addNotification(`Failed to delete pod: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setPodToDelete(null);
    }
  };
  return (() => {
    var _el$4 = _tmpl$16(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$5.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$22.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$26.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.nextSibling, _el$33 = _el$12.nextSibling;
    _el$0.$$click = () => {
      window.open(window.location.href, "_blank");
    };
    _el$1.$$click = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };
    _el$10.$$click = () => setTerminalView(!terminalView());
    _el$11.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      podsCache.refetch();
      fetchMetrics();
    };
    _el$13.$$click = () => setStatusFilter("all");
    insert(_el$15, () => statusCounts().total);
    _el$16.$$click = () => setStatusFilter("running");
    insert(_el$18, () => statusCounts().running);
    _el$19.$$click = () => setStatusFilter("pending");
    insert(_el$21, () => statusCounts().pending);
    _el$22.$$click = () => setStatusFilter("failed");
    insert(_el$24, () => statusCounts().failed);
    insert(_el$12, createComponent(BulkActions, {
      get selectedCount() {
        return bulk.selectedCount();
      },
      get totalCount() {
        return filteredAndSortedPods().length;
      },
      onSelectAll: () => bulk.selectAll(filteredAndSortedPods()),
      onDeselectAll: () => bulk.deselectAll(),
      onDelete: () => setShowBulkDeleteModal(true),
      resourceType: "pods"
    }), _el$25);
    _el$26.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$27.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$28.addEventListener("change", (e) => {
      setStatusFilter(e.currentTarget.value);
      setCurrentPage(1);
    });
    _el$29.$$input = (e) => {
      setSearchQuery(e.currentTarget.value);
      setCurrentPage(1);
    };
    insert(_el$4, createComponent(Show, {
      get when() {
        return (portForwards() || []).length > 0;
      },
      get children() {
        var _el$30 = _tmpl$2(), _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling;
        insert(_el$32, createComponent(For, {
          get each() {
            return portForwards() || [];
          },
          children: (pf) => (() => {
            var _el$145 = _tmpl$17(), _el$146 = _el$145.firstChild, _el$147 = _el$146.nextSibling, _el$148 = _el$147.nextSibling, _el$149 = _el$148.firstChild, _el$151 = _el$149.nextSibling; _el$151.nextSibling; var _el$152 = _el$148.nextSibling, _el$153 = _el$152.nextSibling;
            insert(_el$147, () => pf.name);
            insert(_el$148, () => pf.localPort, _el$151);
            insert(_el$148, () => pf.remotePort, null);
            _el$153.$$click = () => stopPortForward(pf.id);
            createRenderEffect(() => setAttribute(_el$152, "href", `http://localhost:${pf.localPort}`));
            return _el$145;
          })()
        }));
        return _el$30;
      }
    }), _el$33);
    insert(_el$33, createComponent(Show, {
      get when() {
        return podsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$154 = _tmpl$18(), _el$155 = _el$154.firstChild; _el$155.nextSibling;
          return _el$154;
        })();
      },
      get children() {
        return [(() => {
          var _el$34 = _tmpl$3(), _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$39.firstChild; _el$40.firstChild; var _el$42 = _el$39.nextSibling, _el$43 = _el$42.firstChild; _el$43.firstChild; var _el$45 = _el$42.nextSibling, _el$46 = _el$45.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.firstChild; _el$48.firstChild; var _el$50 = _el$47.nextSibling, _el$51 = _el$50.firstChild; _el$51.firstChild; var _el$53 = _el$50.nextSibling, _el$54 = _el$53.firstChild; _el$54.firstChild; var _el$56 = _el$53.nextSibling, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild; _el$58.firstChild; var _el$60 = _el$57.nextSibling, _el$61 = _el$36.nextSibling;
          var _ref$ = tableRef;
          typeof _ref$ === "function" ? use(_ref$, _el$35) : tableRef = _el$35;
          insert(_el$38, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === filteredAndSortedPods().length)() && filteredAndSortedPods().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < filteredAndSortedPods().length;
            },
            onChange: (checked) => {
              if (checked) {
                bulk.selectAll(filteredAndSortedPods());
              } else {
                bulk.deselectAll();
              }
            }
          }));
          _el$39.$$click = () => handleSort("name");
          insert(_el$40, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$42.$$click = () => handleSort("status");
          insert(_el$43, createComponent(SortIcon, {
            field: "status"
          }), null);
          _el$47.$$click = () => handleSort("cpu");
          insert(_el$48, createComponent(SortIcon, {
            field: "cpu"
          }), null);
          _el$50.$$click = () => handleSort("memory");
          insert(_el$51, createComponent(SortIcon, {
            field: "memory"
          }), null);
          _el$53.$$click = () => handleSort("restarts");
          insert(_el$54, createComponent(SortIcon, {
            field: "restarts"
          }), null);
          _el$57.$$click = () => handleSort("age");
          insert(_el$58, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$61, createComponent(For, {
            get each() {
              return paginatedPods();
            },
            get fallback() {
              return (() => {
                var _el$157 = _tmpl$19(); _el$157.firstChild;
                return _el$157;
              })();
            },
            children: (pod, index) => {
              const isSelected = () => selectedIndex() === index();
              const isHovered = () => hoveredRowIndex() === index();
              const isFailed = pod.status === "Failed" || pod.status === "CrashLoopBackOff" || pod.status === "Error";
              const isTerminating = pod.status === "Terminating";
              const isPending = pod.status === "Pending" || pod.status === "Initializing" || pod.status?.includes("ContainerCreating") || pod.status?.includes("PodInitializing") || pod.status?.includes("Init:") || pod.status?.toLowerCase().includes("initializing");
              const textColor = isTerminating ? "#a855f7" : (
                // Purple/violet for terminating
                isFailed ? "#ef4444" : (
                  // Red text for failed
                  isPending ? "#fbbf24" : (
                    // Yellow for pending/initializing
                    "#0ea5e9"
                  )
                )
              );
              const getRowBackground = () => {
                if (isTerminating) return "rgba(168, 85, 247, 0.15)";
                if (!isHovered()) return "transparent";
                return getRowHoverBackground(isSelected(), isFailed, isPending);
              };
              return (() => {
                var _el$159 = _tmpl$20(), _el$160 = _el$159.firstChild, _el$161 = _el$160.nextSibling, _el$162 = _el$161.firstChild, _el$163 = _el$162.firstChild, _el$164 = _el$161.nextSibling, _el$165 = _el$164.firstChild, _el$166 = _el$165.firstChild, _el$167 = _el$164.nextSibling, _el$168 = _el$167.nextSibling, _el$169 = _el$168.nextSibling, _el$170 = _el$169.firstChild, _el$171 = _el$169.nextSibling, _el$172 = _el$171.firstChild, _el$173 = _el$171.nextSibling, _el$174 = _el$173.nextSibling, _el$175 = _el$174.nextSibling, _el$176 = _el$175.nextSibling;
                _el$159.addEventListener("mouseleave", () => setHoveredRowIndex(null));
                _el$159.addEventListener("mouseenter", () => {
                  setHoveredRowIndex(index());
                  filteredAndSortedPods();
                  const start = (currentPage() - 1) * pageSize();
                  const globalIndex = start + index();
                  if (selectedPodIndex() !== globalIndex) {
                    setSelectedPodIndex(globalIndex);
                    setSelectedIndex(index());
                  }
                });
                _el$159.$$click = () => {
                  filteredAndSortedPods();
                  const start = (currentPage() - 1) * pageSize();
                  const globalIndex = start + index();
                  setSelectedPodIndex(globalIndex);
                  setSelectedIndex(index());
                  openModal(pod, "details");
                };
                setStyleProperty(_el$159, "color", textColor);
                setStyleProperty(_el$159, "border", isTerminating ? "1px solid rgba(168, 85, 247, 0.3)" : "none");
                insert(_el$160, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(pod);
                  },
                  onChange: () => bulk.toggleSelection(pod)
                }));
                setStyleProperty(_el$161, "color", textColor);
                insert(_el$163, (() => {
                  var _c$2 = memo(() => pod.name.length > 40);
                  return () => _c$2() ? pod.name.slice(0, 37) + "..." : pod.name;
                })());
                insert(_el$162, createComponent(Show, {
                  get when() {
                    return pod.workloadRef;
                  },
                  children: (ref) => (() => {
                    var _el$177 = _tmpl$21(), _el$178 = _el$177.firstChild, _el$179 = _el$178.nextSibling;
                    _el$177.$$keydown = (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        navigateToWorkloadWithFocus(ref(), setCurrentView, "pods");
                      }
                    };
                    _el$177.$$click = (e) => {
                      e.stopPropagation();
                      navigateToWorkloadWithFocus(ref(), setCurrentView, "pods");
                    };
                    insert(_el$177, () => kindAbbrev(ref().kind), _el$179);
                    insert(_el$177, (() => {
                      var _c$7 = memo(() => ref().name.length > 12);
                      return () => _c$7() ? ref().name.slice(0, 10) + "..." : ref().name;
                    })(), null);
                    createRenderEffect((_p$) => {
                      var _v$61 = formatWorkloadChain(ref()), _v$62 = `${Math.max(10, fontSize() - 2)}px`;
                      _v$61 !== _p$.e && setAttribute(_el$177, "title", _p$.e = _v$61);
                      _v$62 !== _p$.t && setStyleProperty(_el$177, "font-size", _p$.t = _v$62);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    return _el$177;
                  })()
                }), null);
                insert(_el$165, () => isTerminating ? "◐" : pod.status === "Running" ? "●" : isPending ? "○" : isFailed ? "✗" : "○", _el$166);
                insert(_el$165, () => pod.status, null);
                setStyleProperty(_el$167, "color", textColor);
                insert(_el$167, () => {
                  const containerInfos = getContainerInfos(pod);
                  if (containerInfos.length > 0) {
                    const summary = calculateContainerStatus(containerInfos);
                    return createComponent(ContainerStatusBadge, {
                      summary,
                      size: "sm"
                    });
                  }
                  return (() => {
                    var _el$180 = _tmpl$22();
                    insert(_el$180, () => pod.ready);
                    return _el$180;
                  })();
                });
                setStyleProperty(_el$168, "color", textColor);
                insert(_el$168, () => pod.ip || "-");
                setStyleProperty(_el$170, "color", textColor);
                insert(_el$170, () => podMetrics()[`${pod.namespace}/${pod.name}`]?.cpu || pod.cpu || "-", null);
                insert(_el$170, (() => {
                  var _c$3 = memo(() => getChangeIndicator(`${pod.namespace}/${pod.name}`, "cpu") === "up");
                  return () => _c$3() && (() => {
                    var _el$181 = _tmpl$23();
                    createRenderEffect((_$p) => setStyleProperty(_el$181, "font-size", `${fontSize() * 0.7}px`));
                    return _el$181;
                  })();
                })(), null);
                insert(_el$170, (() => {
                  var _c$4 = memo(() => getChangeIndicator(`${pod.namespace}/${pod.name}`, "cpu") === "down");
                  return () => _c$4() && (() => {
                    var _el$182 = _tmpl$24();
                    createRenderEffect((_$p) => setStyleProperty(_el$182, "font-size", `${fontSize() * 0.7}px`));
                    return _el$182;
                  })();
                })(), null);
                setStyleProperty(_el$172, "color", textColor);
                insert(_el$172, () => podMetrics()[`${pod.namespace}/${pod.name}`]?.memory || pod.memory || "-", null);
                insert(_el$172, (() => {
                  var _c$5 = memo(() => getChangeIndicator(`${pod.namespace}/${pod.name}`, "memory") === "up");
                  return () => _c$5() && (() => {
                    var _el$183 = _tmpl$23();
                    createRenderEffect((_$p) => setStyleProperty(_el$183, "font-size", `${fontSize() * 0.7}px`));
                    return _el$183;
                  })();
                })(), null);
                insert(_el$172, (() => {
                  var _c$6 = memo(() => getChangeIndicator(`${pod.namespace}/${pod.name}`, "memory") === "down");
                  return () => _c$6() && (() => {
                    var _el$184 = _tmpl$24();
                    createRenderEffect((_$p) => setStyleProperty(_el$184, "font-size", `${fontSize() * 0.7}px`));
                    return _el$184;
                  })();
                })(), null);
                setStyleProperty(_el$173, "color", textColor);
                insert(_el$173, () => pod.restarts);
                setStyleProperty(_el$174, "color", textColor);
                insert(_el$174, () => pod.node);
                setStyleProperty(_el$175, "color", textColor);
                insert(_el$175, () => formatAgeFromTimestamp(pod.createdAt, ageTicker()));
                insert(_el$176, createComponent(ActionMenu, {
                  actions: [{
                    label: "Shell",
                    icon: "shell",
                    onClick: () => openShellInNewTab(pod)
                  }, {
                    label: "Port Forward",
                    icon: "portforward",
                    onClick: () => openModal(pod, "portforward")
                  }, {
                    label: "View Logs",
                    icon: "logs",
                    onClick: () => openModal(pod, "logs")
                  }, {
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => openModal(pod, "yaml")
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelectedPod(pod);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Describe",
                    icon: "describe",
                    onClick: () => openModal(pod, "describe")
                  }, {
                    label: "Explain Pod",
                    icon: "info",
                    onClick: () => openExplain(pod),
                    divider: true
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => openDeleteConfirm(pod),
                    variant: "danger"
                  }],
                  onOpenChange: setActionMenuOpen
                }));
                createRenderEffect((_p$) => {
                  var _v$26 = getRowBackground(), _v$27 = `${Math.max(24, fontSize() * 1.7)}px`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${fontSize()}px`, _v$30 = getFontFamilyCSS(), _v$31 = `${fontSize()}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${Math.max(24, fontSize() * 1.7)}px`, _v$35 = `${Math.max(24, fontSize() * 1.7)}px`, _v$36 = isTerminating ? "#a855f7" : (
                    // Purple/violet for terminating
                    pod.status === "Running" ? "#22c55e" : isPending ? "#fbbf24" : (
                      // Yellow for pending/initializing
                      pod.status === "Succeeded" ? "#06b6d4" : isFailed ? "#ef4444" : "#ef4444"
                    )
                  ), _v$37 = `${fontSize()}px`, _v$38 = `${fontSize()}px`, _v$39 = `${Math.max(24, fontSize() * 1.7)}px`, _v$40 = `${Math.max(24, fontSize() * 1.7)}px`, _v$41 = `${fontSize()}px`, _v$42 = `${Math.max(24, fontSize() * 1.7)}px`, _v$43 = `${Math.max(24, fontSize() * 1.7)}px`, _v$44 = `${Math.max(24, fontSize() * 1.7)}px`, _v$45 = `${Math.max(24, fontSize() * 1.7)}px`, _v$46 = `${fontSize()}px`, _v$47 = `${Math.max(24, fontSize() * 1.7)}px`, _v$48 = `${Math.max(24, fontSize() * 1.7)}px`, _v$49 = `${fontSize()}px`, _v$50 = `${fontSize()}px`, _v$51 = `${Math.max(24, fontSize() * 1.7)}px`, _v$52 = `${Math.max(24, fontSize() * 1.7)}px`, _v$53 = `${fontSize()}px`, _v$54 = `${Math.max(24, fontSize() * 1.7)}px`, _v$55 = `${Math.max(24, fontSize() * 1.7)}px`, _v$56 = `${fontSize()}px`, _v$57 = `${Math.max(24, fontSize() * 1.7)}px`, _v$58 = `${Math.max(24, fontSize() * 1.7)}px`, _v$59 = `${Math.max(24, fontSize() * 1.7)}px`, _v$60 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$26 !== _p$.e && setStyleProperty(_el$159, "background", _p$.e = _v$26);
                  _v$27 !== _p$.t && setStyleProperty(_el$159, "height", _p$.t = _v$27);
                  _v$28 !== _p$.a && setStyleProperty(_el$159, "line-height", _p$.a = _v$28);
                  _v$29 !== _p$.o && setStyleProperty(_el$159, "font-size", _p$.o = _v$29);
                  _v$30 !== _p$.i && setStyleProperty(_el$159, "font-family", _p$.i = _v$30);
                  _v$31 !== _p$.n && setStyleProperty(_el$161, "font-size", _p$.n = _v$31);
                  _v$32 !== _p$.s && setStyleProperty(_el$161, "height", _p$.s = _v$32);
                  _v$33 !== _p$.h && setStyleProperty(_el$161, "line-height", _p$.h = _v$33);
                  _v$34 !== _p$.r && setStyleProperty(_el$164, "height", _p$.r = _v$34);
                  _v$35 !== _p$.d && setStyleProperty(_el$164, "line-height", _p$.d = _v$35);
                  _v$36 !== _p$.l && setStyleProperty(_el$165, "color", _p$.l = _v$36);
                  _v$37 !== _p$.u && setStyleProperty(_el$165, "font-size", _p$.u = _v$37);
                  _v$38 !== _p$.c && setStyleProperty(_el$167, "font-size", _p$.c = _v$38);
                  _v$39 !== _p$.w && setStyleProperty(_el$167, "height", _p$.w = _v$39);
                  _v$40 !== _p$.m && setStyleProperty(_el$167, "line-height", _p$.m = _v$40);
                  _v$41 !== _p$.f && setStyleProperty(_el$168, "font-size", _p$.f = _v$41);
                  _v$42 !== _p$.y && setStyleProperty(_el$168, "height", _p$.y = _v$42);
                  _v$43 !== _p$.g && setStyleProperty(_el$168, "line-height", _p$.g = _v$43);
                  _v$44 !== _p$.p && setStyleProperty(_el$169, "height", _p$.p = _v$44);
                  _v$45 !== _p$.b && setStyleProperty(_el$169, "line-height", _p$.b = _v$45);
                  _v$46 !== _p$.T && setStyleProperty(_el$170, "font-size", _p$.T = _v$46);
                  _v$47 !== _p$.A && setStyleProperty(_el$171, "height", _p$.A = _v$47);
                  _v$48 !== _p$.O && setStyleProperty(_el$171, "line-height", _p$.O = _v$48);
                  _v$49 !== _p$.I && setStyleProperty(_el$172, "font-size", _p$.I = _v$49);
                  _v$50 !== _p$.S && setStyleProperty(_el$173, "font-size", _p$.S = _v$50);
                  _v$51 !== _p$.W && setStyleProperty(_el$173, "height", _p$.W = _v$51);
                  _v$52 !== _p$.C && setStyleProperty(_el$173, "line-height", _p$.C = _v$52);
                  _v$53 !== _p$.B && setStyleProperty(_el$174, "font-size", _p$.B = _v$53);
                  _v$54 !== _p$.v && setStyleProperty(_el$174, "height", _p$.v = _v$54);
                  _v$55 !== _p$.k && setStyleProperty(_el$174, "line-height", _p$.k = _v$55);
                  _v$56 !== _p$.x && setStyleProperty(_el$175, "font-size", _p$.x = _v$56);
                  _v$57 !== _p$.j && setStyleProperty(_el$175, "height", _p$.j = _v$57);
                  _v$58 !== _p$.q && setStyleProperty(_el$175, "line-height", _p$.q = _v$58);
                  _v$59 !== _p$.z && setStyleProperty(_el$176, "height", _p$.z = _v$59);
                  _v$60 !== _p$.P && setStyleProperty(_el$176, "line-height", _p$.P = _v$60);
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
                  T: void 0,
                  A: void 0,
                  O: void 0,
                  I: void 0,
                  S: void 0,
                  W: void 0,
                  C: void 0,
                  B: void 0,
                  v: void 0,
                  k: void 0,
                  x: void 0,
                  j: void 0,
                  q: void 0,
                  z: void 0,
                  P: void 0
                });
                return _el$159;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(), _v$4 = `${Math.max(24, fontSize() * 1.7)}px`, _v$5 = getFontFamilyCSS(), _v$6 = `${fontSize()}px`, _v$7 = `${Math.max(24, fontSize() * 1.7)}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`, _v$0 = `${fontSize()}px`, _v$1 = `${fontSize()}px`, _v$10 = `${fontSize()}px`, _v$11 = `${fontSize()}px`, _v$12 = `${fontSize()}px`, _v$13 = `${fontSize()}px`, _v$14 = `${fontSize()}px`, _v$15 = `${fontSize()}px`;
            _v$3 !== _p$.e && setStyleProperty(_el$35, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$37, "height", _p$.t = _v$4);
            _v$5 !== _p$.a && setStyleProperty(_el$37, "font-family", _p$.a = _v$5);
            _v$6 !== _p$.o && setStyleProperty(_el$37, "font-size", _p$.o = _v$6);
            _v$7 !== _p$.i && setStyleProperty(_el$37, "line-height", _p$.i = _v$7);
            _v$8 !== _p$.n && setStyleProperty(_el$39, "font-size", _p$.n = _v$8);
            _v$9 !== _p$.s && setStyleProperty(_el$42, "font-size", _p$.s = _v$9);
            _v$0 !== _p$.h && setStyleProperty(_el$45, "font-size", _p$.h = _v$0);
            _v$1 !== _p$.r && setStyleProperty(_el$46, "font-size", _p$.r = _v$1);
            _v$10 !== _p$.d && setStyleProperty(_el$47, "font-size", _p$.d = _v$10);
            _v$11 !== _p$.l && setStyleProperty(_el$50, "font-size", _p$.l = _v$11);
            _v$12 !== _p$.u && setStyleProperty(_el$53, "font-size", _p$.u = _v$12);
            _v$13 !== _p$.c && setStyleProperty(_el$56, "font-size", _p$.c = _v$13);
            _v$14 !== _p$.w && setStyleProperty(_el$57, "font-size", _p$.w = _v$14);
            _v$15 !== _p$.m && setStyleProperty(_el$60, "font-size", _p$.m = _v$15);
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
            m: void 0
          });
          return _el$34;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1;
          },
          get children() {
            var _el$62 = _tmpl$4(), _el$63 = _el$62.firstChild, _el$64 = _el$63.firstChild, _el$68 = _el$64.nextSibling, _el$65 = _el$68.nextSibling, _el$69 = _el$65.nextSibling, _el$66 = _el$69.nextSibling, _el$70 = _el$66.nextSibling; _el$70.nextSibling; var _el$71 = _el$63.nextSibling, _el$72 = _el$71.firstChild, _el$73 = _el$72.nextSibling, _el$74 = _el$73.nextSibling, _el$75 = _el$74.firstChild, _el$77 = _el$75.nextSibling; _el$77.nextSibling; var _el$78 = _el$74.nextSibling, _el$79 = _el$78.nextSibling, _el$80 = _el$79.nextSibling;
            insert(_el$63, () => (currentPage() - 1) * pageSize() + 1, _el$68);
            insert(_el$63, () => Math.min(currentPage() * pageSize(), filteredAndSortedPods().length), _el$69);
            insert(_el$63, () => filteredAndSortedPods().length, _el$70);
            _el$72.$$click = () => setCurrentPage(1);
            _el$73.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$74, currentPage, _el$77);
            insert(_el$74, totalPages, null);
            _el$78.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$79.$$click = () => setCurrentPage(totalPages());
            _el$80.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$16 = currentPage() === 1, _v$17 = currentPage() === 1, _v$18 = currentPage() === totalPages(), _v$19 = currentPage() === totalPages();
              _v$16 !== _p$.e && (_el$72.disabled = _p$.e = _v$16);
              _v$17 !== _p$.t && (_el$73.disabled = _p$.t = _v$17);
              _v$18 !== _p$.a && (_el$78.disabled = _p$.a = _v$18);
              _v$19 !== _p$.o && (_el$79.disabled = _p$.o = _v$19);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$80.value = pageSize());
            return _el$62;
          }
        })];
      }
    }));
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      onClose: () => setShowYaml(false),
      get title() {
        return `YAML: ${selectedPod()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return !yamlContent.loading;
          },
          get fallback() {
            return _tmpl$25();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selectedPod()?.name;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "pod",
      get name() {
        return selectedPod()?.name || "";
      },
      get namespace() {
        return selectedPod()?.namespace;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showLogs();
      },
      onClose: () => {
        stopLogStream();
        setShowLogs(false);
      },
      get title() {
        return `Logs: ${selectedPod()?.name}`;
      },
      size: "xl",
      get children() {
        var _el$81 = _tmpl$7(), _el$82 = _el$81.firstChild, _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$86.nextSibling, _el$89 = _el$84.nextSibling, _el$90 = _el$89.nextSibling, _el$91 = _el$90.nextSibling, _el$92 = _el$82.nextSibling;
        _el$83.addEventListener("change", (e) => {
          setLogsTail(parseInt(e.currentTarget.value));
          if (selectedPod()) fetchLogs(selectedPod(), logsFollow());
        });
        _el$85.addEventListener("change", (e) => {
          const follow = e.currentTarget.checked;
          setLogsFollow(follow);
          if (selectedPod()) fetchLogs(selectedPod(), follow);
        });
        insert(_el$88, () => logsFollow() ? "Live" : "Follow");
        insert(_el$84, (() => {
          var _c$ = memo(() => !!logsFollow());
          return () => _c$() && _tmpl$26();
        })(), null);
        _el$89.$$input = (e) => setLogsSearch(e.currentTarget.value);
        _el$90.$$click = () => selectedPod() && fetchLogs(selectedPod(), logsFollow());
        _el$91.$$click = downloadLogs;
        insert(_el$92, createComponent(Show, {
          get when() {
            return !logsLoading();
          },
          get fallback() {
            return _tmpl$27();
          },
          get children() {
            return [createComponent(Show, {
              get when() {
                return logsError();
              },
              get children() {
                var _el$93 = _tmpl$5(); _el$93.firstChild;
                insert(_el$93, logsError, null);
                return _el$93;
              }
            }), (() => {
              var _el$95 = _tmpl$6();
              insert(_el$95, () => filteredLogs() || "No logs available");
              return _el$95;
            })()];
          }
        }));
        createRenderEffect((_p$) => {
          var _v$20 = logsFollow(), _v$21 = logsFollow() ? "var(--accent-primary)" : "var(--bg-tertiary)", _v$22 = logsFollow() ? "white" : "var(--text-primary)", _v$23 = logsFollow() ? "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
          _v$20 !== _p$.e && (_el$83.disabled = _p$.e = _v$20);
          _v$21 !== _p$.t && setStyleProperty(_el$84, "background", _p$.t = _v$21);
          _v$22 !== _p$.a && setStyleProperty(_el$84, "color", _p$.a = _v$22);
          _v$23 !== _p$.o && setAttribute(_el$87, "d", _p$.o = _v$23);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        });
        createRenderEffect(() => _el$83.value = logsTail());
        createRenderEffect(() => _el$85.checked = logsFollow());
        createRenderEffect(() => _el$89.value = logsSearch());
        return _el$81;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => setShowDetails(false),
      get title() {
        return `Pod: ${selectedPod()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedPod();
          },
          get children() {
            return (() => {
              const [podDetails] = createResource(() => selectedPod() ? {
                name: selectedPod().name,
                ns: selectedPod().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getPodDetails(params.name, params.ns);
              });
              return (() => {
                var _el$188 = _tmpl$28(), _el$189 = _el$188.firstChild, _el$190 = _el$189.firstChild, _el$191 = _el$190.nextSibling, _el$192 = _el$191.firstChild, _el$193 = _el$192.firstChild, _el$194 = _el$193.nextSibling, _el$195 = _el$194.firstChild, _el$196 = _el$192.nextSibling, _el$197 = _el$196.firstChild, _el$198 = _el$197.nextSibling, _el$199 = _el$196.nextSibling, _el$200 = _el$199.firstChild, _el$201 = _el$200.nextSibling, _el$202 = _el$199.nextSibling, _el$203 = _el$202.firstChild, _el$204 = _el$203.nextSibling, _el$205 = _el$202.nextSibling, _el$206 = _el$205.firstChild, _el$207 = _el$206.nextSibling, _el$208 = _el$205.nextSibling, _el$209 = _el$208.firstChild, _el$210 = _el$209.nextSibling, _el$211 = _el$208.nextSibling, _el$212 = _el$211.firstChild, _el$213 = _el$212.nextSibling, _el$214 = _el$211.nextSibling, _el$215 = _el$214.firstChild, _el$216 = _el$215.nextSibling, _el$217 = _el$191.nextSibling, _el$218 = _el$217.firstChild, _el$219 = _el$218.nextSibling, _el$220 = _el$189.nextSibling; _el$220.firstChild; var _el$222 = _el$220.nextSibling, _el$223 = _el$222.firstChild, _el$224 = _el$223.nextSibling, _el$225 = _el$224.nextSibling, _el$226 = _el$225.nextSibling, _el$227 = _el$226.nextSibling;
                insert(_el$195, () => selectedPod()?.status);
                insert(_el$198, () => {
                  const pod = selectedPod();
                  if (!pod) return "-";
                  const containerInfos = getContainerInfos(pod);
                  if (containerInfos.length > 0) {
                    const summary = calculateContainerStatus(containerInfos);
                    return createComponent(ContainerStatusBadge, {
                      summary
                    });
                  }
                  return pod.ready;
                });
                insert(_el$201, () => selectedPod()?.cpu || "-");
                insert(_el$204, () => selectedPod()?.memory || "-");
                insert(_el$207, () => selectedPod()?.restarts);
                insert(_el$210, () => selectedPod()?.age);
                insert(_el$213, () => selectedPod()?.ip || "-");
                insert(_el$216, () => selectedPod()?.namespace);
                insert(_el$219, () => selectedPod()?.node);
                insert(_el$220, createComponent(Show, {
                  get when() {
                    return memo(() => !!!podDetails.loading)() && podDetails()?.containers;
                  },
                  get fallback() {
                    return _tmpl$29();
                  },
                  get children() {
                    return (() => {
                      const containers = podDetails()?.containers || [];
                      const metrics = podDetails()?.metrics;
                      const containerInfos = containers.map((c) => ({
                        name: c.name || (typeof c === "string" ? c : ""),
                        type: c.type || "main",
                        image: c.image || "",
                        ready: c.ready,
                        state: c.state,
                        restartCount: c.restartCount,
                        containerID: c.containerID,
                        startedAt: c.startedAt,
                        reason: c.reason,
                        message: c.message,
                        exitCode: c.exitCode,
                        ports: c.ports || []
                      }));
                      const containerMetricsMap = {};
                      if (metrics?.containerMetricsMap) {
                        const metricsMap = metrics.containerMetricsMap;
                        Object.keys(metricsMap).forEach((name) => {
                          const cm = metricsMap[name];
                          containerMetricsMap[name] = {
                            cpu: cm.cpu || "-",
                            memory: cm.memory || "-"
                          };
                        });
                      }
                      const containerPortsMap = {};
                      containers.forEach((c) => {
                        if (c.name && c.ports && Array.isArray(c.ports)) {
                          containerPortsMap[c.name] = c.ports;
                        }
                      });
                      const tableRows = containersToTableRows(containerInfos, containerMetricsMap, containerPortsMap);
                      return (() => {
                        var _el$229 = _tmpl$30();
                        insert(_el$229, createComponent(ContainerTable, {
                          containers: tableRows
                        }));
                        return _el$229;
                      })();
                    })();
                  }
                }), null);
                _el$223.$$click = () => openShellInNewTab(selectedPod());
                _el$224.$$click = () => {
                  setShowDetails(false);
                  openModal(selectedPod(), "portforward");
                };
                _el$225.$$click = () => {
                  setShowDetails(false);
                  openModal(selectedPod(), "logs");
                };
                _el$226.$$click = () => {
                  setShowDetails(false);
                  openModal(selectedPod(), "yaml");
                };
                _el$227.$$click = () => {
                  setShowDetails(false);
                  openModal(selectedPod(), "describe");
                };
                createRenderEffect(() => className(_el$195, `badge ${selectedPod()?.status === "Running" ? "badge-success" : selectedPod()?.status === "Pending" || selectedPod()?.status === "Initializing" || selectedPod()?.status?.includes("ContainerCreating") || selectedPod()?.status?.includes("PodInitializing") || selectedPod()?.status?.includes("Init:") || selectedPod()?.status?.toLowerCase().includes("initializing") ? "badge-warning" : selectedPod()?.status === "Failed" || selectedPod()?.status === "CrashLoopBackOff" || selectedPod()?.status === "Error" ? "badge-error" : "badge-warning"}`));
                return _el$188;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showPortForward();
      },
      onClose: () => setShowPortForward(false),
      title: "Port Forward",
      size: "xs",
      get children() {
        var _el$96 = _tmpl$8(), _el$97 = _el$96.firstChild, _el$98 = _el$97.firstChild, _el$99 = _el$98.firstChild, _el$100 = _el$99.nextSibling, _el$101 = _el$98.nextSibling, _el$102 = _el$101.nextSibling, _el$103 = _el$102.firstChild, _el$104 = _el$103.nextSibling, _el$105 = _el$97.nextSibling, _el$106 = _el$105.firstChild; _el$106.firstChild; var _el$108 = _el$106.nextSibling, _el$109 = _el$108.nextSibling, _el$110 = _el$109.firstChild, _el$111 = _el$105.nextSibling, _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling;
        _el$100.$$input = (e) => setLocalPort(parseInt(e.currentTarget.value) || 8080);
        _el$104.$$input = (e) => setRemotePort(parseInt(e.currentTarget.value) || 80);
        insert(_el$106, localPort, null);
        insert(_el$109, () => selectedPod()?.name, _el$110);
        insert(_el$109, remotePort, null);
        _el$112.$$click = () => setShowPortForward(false);
        _el$113.$$click = startPortForward;
        createRenderEffect(() => _el$100.value = localPort());
        createRenderEffect(() => _el$104.value = remotePort());
        return _el$96;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDeleteConfirm();
      },
      onClose: () => {
        setShowDeleteConfirm(false);
        setPodToDelete(null);
      },
      title: "Delete Pod",
      size: "md",
      get children() {
        var _el$114 = _tmpl$9(), _el$115 = _el$114.firstChild, _el$116 = _el$115.firstChild; _el$116.firstChild; var _el$118 = _el$116.nextSibling, _el$119 = _el$118.firstChild, _el$120 = _el$119.nextSibling, _el$121 = _el$120.firstChild, _el$122 = _el$121.nextSibling; _el$122.firstChild; _el$120.nextSibling; var _el$125 = _el$115.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling;
        insert(_el$121, () => podToDelete()?.name);
        insert(_el$122, () => podToDelete()?.namespace, null);
        _el$126.$$click = () => {
          setShowDeleteConfirm(false);
          setPodToDelete(null);
        };
        _el$127.$$click = deletePod;
        return _el$114;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showContainerSelect();
      },
      onClose: () => setShowContainerSelect(false),
      get title() {
        return `Select Container for ${containerSelectPod()?.name}`;
      },
      size: "sm",
      get children() {
        var _el$128 = _tmpl$0();
        insert(_el$128, createComponent(Show, {
          get when() {
            return containerSelectPod();
          },
          get fallback() {
            return _tmpl$31();
          },
          children: (pod) => {
            const containerInfos = getContainerInfos(pod());
            return createComponent(Show, {
              get when() {
                return containerInfos.length > 0;
              },
              get fallback() {
                return _tmpl$32();
              },
              get children() {
                return createComponent(For, {
                  each: containerInfos,
                  children: (container) => (() => {
                    var _el$232 = _tmpl$33(), _el$233 = _el$232.firstChild, _el$234 = _el$233.firstChild, _el$235 = _el$234.nextSibling, _el$236 = _el$235.firstChild, _el$237 = _el$236.nextSibling, _el$238 = _el$237.firstChild, _el$239 = _el$238.nextSibling; _el$239.firstChild;
                    _el$232.addEventListener("mouseleave", (e) => e.currentTarget.style.background = "var(--bg-secondary)");
                    _el$232.addEventListener("mouseenter", (e) => e.currentTarget.style.background = "var(--bg-tertiary)");
                    _el$232.$$click = () => connectToContainer(pod(), container.name);
                    insert(_el$236, () => container.name);
                    insert(_el$238, () => container.type);
                    insert(_el$239, () => pod().namespace, null);
                    insert(_el$233, (() => {
                      var _c$8 = memo(() => !!container.ready);
                      return () => _c$8() && _tmpl$34();
                    })(), null);
                    createRenderEffect(() => className(_el$238, `px-1.5 py-0.5 rounded text-xs ${container.type === "init" ? "bg-blue-500/20 text-blue-400" : container.type === "sidecar" ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"}`));
                    return _el$232;
                  })()
                });
              }
            });
          }
        }));
        return _el$128;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showEdit();
      },
      onClose: () => setShowEdit(false),
      get title() {
        return `Edit YAML: ${selectedPod()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return !yamlContent.loading;
          },
          get fallback() {
            return _tmpl$35();
          },
          get children() {
            var _el$129 = _tmpl$1();
            insert(_el$129, createComponent(Show, {
              get when() {
                return selectedPod();
              },
              children: (pod) => createComponent(CommandPreview, {
                label: "Equivalent kubectl command",
                defaultCollapsed: true,
                get command() {
                  return `kubectl apply -f - -n ${pod().namespace || "default"}  # YAML from editor is sent via Kubernetes API`;
                },
                description: "This is an equivalent kubectl-style view of the Pod update. The actual change is applied via Kubernetes API."
              })
            }), null);
            insert(_el$129, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selectedPod()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => setShowEdit(false)
            }), null);
            return _el$129;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showExplain();
      },
      onClose: () => {
        setShowExplain(false);
        setExplainData(null);
        setExplainError(null);
      },
      get title() {
        return `🧠 Explain Pod: ${selectedPod()?.name}`;
      },
      size: "lg",
      get children() {
        var _el$130 = _tmpl$15();
        insert(_el$130, createComponent(Show, {
          get when() {
            return explainLoading();
          },
          get children() {
            var _el$131 = _tmpl$10(); _el$131.firstChild;
            return _el$131;
          }
        }), null);
        insert(_el$130, createComponent(Show, {
          get when() {
            return explainError();
          },
          get children() {
            var _el$133 = _tmpl$11(), _el$134 = _el$133.firstChild; _el$134.nextSibling;
            insert(_el$133, explainError, null);
            return _el$133;
          }
        }), null);
        insert(_el$130, createComponent(Show, {
          get when() {
            return memo(() => !!explainData())() && !explainLoading();
          },
          get children() {
            return [(() => {
              var _el$136 = _tmpl$12(), _el$137 = _el$136.firstChild, _el$138 = _el$137.nextSibling;
              insert(_el$138, () => explainData()?.Summary || "No summary available");
              return _el$136;
            })(), createComponent(Show, {
              get when() {
                return memo(() => !!explainData()?.KeyFindings)() && explainData()?.KeyFindings.length > 0;
              },
              get children() {
                var _el$139 = _tmpl$13(), _el$140 = _el$139.firstChild, _el$141 = _el$140.nextSibling;
                insert(_el$141, createComponent(For, {
                  get each() {
                    return explainData()?.KeyFindings || [];
                  },
                  children: (finding) => (() => {
                    var _el$243 = _tmpl$36();
                    insert(_el$243, finding);
                    return _el$243;
                  })()
                }));
                return _el$139;
              }
            }), createComponent(Show, {
              get when() {
                return memo(() => !!explainData()?.Timeline)() && explainData()?.Timeline.length > 0;
              },
              get children() {
                var _el$142 = _tmpl$14(), _el$143 = _el$142.firstChild, _el$144 = _el$143.nextSibling;
                insert(_el$144, createComponent(For, {
                  get each() {
                    return explainData()?.Timeline || [];
                  },
                  children: (event, index) => (() => {
                    var _el$244 = _tmpl$37();
                    insert(_el$244, event);
                    createRenderEffect((_p$) => {
                      var _v$63 = event.includes("Error") || event.includes("Failed") ? "var(--error-color)" : event.includes("Warning") ? "var(--warning-color)" : "var(--text-secondary)", _v$64 = index() < explainData()?.Timeline.length - 1 ? "1px dashed var(--border-color)" : "none";
                      _v$63 !== _p$.e && setStyleProperty(_el$244, "color", _p$.e = _v$63);
                      _v$64 !== _p$.t && setStyleProperty(_el$244, "border-bottom", _p$.t = _v$64);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    return _el$244;
                  })()
                }));
                return _el$142;
              }
            })];
          }
        }), null);
        return _el$130;
      }
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      resourceType: "Pods",
      get selectedItems() {
        return selectedItemsForModal();
      },
      onConfirm: async () => {
        const selectedPods = selectedItemsForModal();
        for (const pod of selectedPods) {
          try {
            await api.deletePod(pod.name, pod.namespace);
          } catch (error) {
            console.error(`Failed to delete pod ${pod.namespace}/${pod.name}:`, error);
            addNotification(`Failed to delete pod ${pod.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        podsCache.refetch();
        addNotification(`Successfully deleted ${selectedPods.length} pod${selectedPods.length !== 1 ? "s" : ""}`, "success");
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$24 = terminalView() ? "var(--accent-primary)" : "var(--bg-secondary)", _v$25 = terminalView() ? "Switch to Normal View" : "Switch to Terminal View";
      _v$24 !== _p$.e && setStyleProperty(_el$10, "background", _p$.e = _v$24);
      _v$25 !== _p$.t && setAttribute(_el$10, "title", _p$.t = _v$25);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$26.value = fontSize());
    createRenderEffect(() => _el$27.value = fontFamily());
    createRenderEffect(() => _el$28.value = statusFilter());
    createRenderEffect(() => _el$29.value = searchQuery());
    return _el$4;
  })();
};
delegateEvents(["click", "input", "keydown"]);

export { Pods as default };
//# sourceMappingURL=Pods-MJFVm6Z0.js.map
