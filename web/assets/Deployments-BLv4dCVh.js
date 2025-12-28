import { c as createSignal, o as onMount, H as selectedNamespaces, I as setNamespaces, n as createEffect, a as createMemo, G as addNotification, j as createResource, k as api, J as searchQuery, t as template, i as insert, d as createComponent, S as Show, m as memo, K as setSearchQuery, F as For, L as use, f as createRenderEffect, q as style, h as setStyleProperty, g as className, M as Modal, s as setCurrentView, N as setGlobalLoading, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-Bh-O-sIc.js';
import { c as createCachedResource } from './resourceCache-DXA8Kj29.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';
import { Y as YAMLEditor } from './YAMLEditor-Cvfm5wCJ.js';
import { D as DescribeModal } from './DescribeModal-6Ip9Wbf-.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';
import { A as ActionMenu } from './ActionMenu-BVo-8BTq.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-BCNQqaHy.js';
import { C as CommandPreview } from './CommandPreview-C6bYxIqz.js';
import { R as RelatedResources } from './RelatedResources-C1PaEPdu.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><button class="px-3 py-2 rounded-lg text-sm font-medium"title="Restart All Deployments in Namespace"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">🔄 Restart All</button><button class="px-3 py-2 rounded-lg text-sm font-medium"title="Delete All Deployments in Namespace"style="background:rgba(239, 68, 68, 0.1);color:#ef4444;border:1px solid rgba(239, 68, 68, 0.3)">🗑️ Delete All`), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Namespace </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Ready </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Up-to-date</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Available</th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> deployments</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class=space-y-4><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Replicas</label><input type=number min=0 max=100 class="w-full px-4 py-2 rounded-lg"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class="flex gap-2"><button class="btn-secondary flex-1">Cancel</button><button class="btn-primary flex-1">Scale`), _tmpl$7 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Deployments</h1><p class=text-xs style=color:var(--text-secondary)>Manage application deployments</p></div><div class="flex items-center gap-3"><button class=icon-btn title="Refresh Deployments"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Ready</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Partial</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--error-color)"><span class=text-sm style=color:var(--text-secondary)>Unavailable</span><span class="text-xl font-bold"style=color:var(--error-color)></span></div><div class=flex-1></div><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px">`), _tmpl$8 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border mb-4"style=background:var(--bg-secondary);border-color:var(--border-color)>`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading deployments...`), _tmpl$0 = /* @__PURE__ */ template(`<tr><td colspan=8 class="text-center py-8"style=color:var(--text-muted)>No deployments found`), _tmpl$1 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$10 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$11 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$12 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>ReplicaSets</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Name</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Ready</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Replicas</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Age</th></tr></thead><tbody>`), _tmpl$13 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Pods (<!>)</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Name</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Status</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Ready</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Restarts</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>IP</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Node</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Age</th></tr></thead><tbody>`), _tmpl$14 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Conditions</h3><div class=space-y-2>`), _tmpl$15 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Available</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Updated</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Replicas</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Strategy</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Selector</div><div class="text-xs break-all"style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-3 md:grid-cols-6 gap-2 pt-3"><button class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Scale><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Scale</span></button><button class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Restart><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Restart</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$16 = /* @__PURE__ */ template(`<span>`), _tmpl$17 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$18 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"><span></span></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$19 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-secondary)>Reason: `), _tmpl$20 = /* @__PURE__ */ template(`<div class="text-xs mt-1"style=color:var(--text-muted)>`), _tmpl$21 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium"style=color:var(--text-primary)></span><span></span></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last transition: `);
const Deployments = () => {
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showScale, setShowScale] = createSignal(false);
  const [scaleReplicas, setScaleReplicas] = createSignal(1);
  const [restarting, setRestarting] = createSignal(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const [focusedDeployment, setFocusedDeployment] = createSignal(null);
  const [focusedRowRef, setFocusedRowRef] = createSignal(null);
  const [previousNamespaces, setPreviousNamespaces] = createSignal(null);
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const focusName = params.get("focus");
    const focusNamespace = params.get("namespace");
    if (focusNamespace) {
      const current = selectedNamespaces();
      setPreviousNamespaces(current.length > 0 ? [...current] : null);
      setNamespaces([focusNamespace]);
      sessionStorage.setItem("kubegraf:namespaceSetProgrammatically", "true");
    }
    if (focusName) {
      setFocusedDeployment(focusName);
    }
  });
  createEffect(() => {
    const focusName = focusedDeployment();
    const allDeps = filteredAndSorted();
    if (focusName && allDeps.length > 0) {
      const dep = allDeps.find((d) => d.name === focusName);
      if (dep) {
        const depIndex = allDeps.findIndex((d) => d.name === focusName);
        if (depIndex >= 0) {
          const targetPage = Math.floor(depIndex / pageSize()) + 1;
          if (targetPage !== currentPage()) {
            setCurrentPage(targetPage);
            setTimeout(() => focusDeployment(dep), 200);
            return;
          }
        }
        focusDeployment(dep);
      }
    }
  });
  const focusDeployment = (dep) => {
    setSelected(dep);
    setShowDetails(true);
    addNotification(`Viewing Deployment: ${dep.name}`, "success");
    setTimeout(() => {
      const row = focusedRowRef();
      if (row) {
        row.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }, 100);
    setTimeout(() => {
      setFocusedDeployment(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("focus");
      const hadNamespaceParam = url.searchParams.has("namespace");
      url.searchParams.delete("namespace");
      window.history.replaceState({}, "", url.toString());
      if (hadNamespaceParam) {
        const previous = previousNamespaces();
        if (previous !== null) {
          setNamespaces(previous);
        } else {
          setNamespaces([]);
        }
        setPreviousNamespaces(null);
        sessionStorage.removeItem("kubegraf:namespaceSetProgrammatically");
      }
    }, 2e3);
  };
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("deployments-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("deployments-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("deployments-font-family");
    return saved || "Monaco";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("deployments-font-family", family);
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
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const deploymentsCache = createCachedResource("deployments", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const deployments2 = await api.getDeployments(namespaceParam);
      return deployments2;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const deployments = createMemo(() => deploymentsCache.data() || []);
  createEffect(() => {
    const interval = setInterval(() => {
      deploymentsCache.refetch();
    }, 2e3);
    return () => clearInterval(interval);
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getDeploymentYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch deployment YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const dep = selected();
    if (!dep) return;
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
      label: `Apply Deployment YAML: ${dep.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: dep.namespace,
      context: status.context,
      userAction: "deployments-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "deployments",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setSelected(null);
    setYamlKey(null);
    setTimeout(() => deploymentsCache.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const dep = selected();
    if (!dep) return;
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
      label: `Dry run Deployment YAML: ${dep.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: dep.namespace,
      context: status.context,
      userAction: "deployments-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "deployments",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
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
  const filteredAndSorted = createMemo(() => {
    let all = deployments() || [];
    const query = searchQuery().toLowerCase();
    if (query) {
      all = all.filter((d) => d.name.toLowerCase().includes(query) || d.namespace.toLowerCase().includes(query));
    }
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "namespace":
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case "ready":
          comparison = a.ready.localeCompare(b.ready);
          break;
        case "age":
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return all;
  });
  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedDeployments = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = deployments() || [];
    return {
      total: all.length,
      ready: all.filter((d) => {
        const parts = d.ready?.split("/") || ["0", "0"];
        return parts[0] === parts[1] && parseInt(parts[0]) > 0;
      }).length,
      partial: all.filter((d) => {
        const parts = d.ready?.split("/") || ["0", "0"];
        return parts[0] !== parts[1] && parseInt(parts[0]) > 0;
      }).length,
      unavailable: all.filter((d) => {
        const parts = d.ready?.split("/") || ["0", "0"];
        return parseInt(parts[0]) === 0;
      }).length
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
  const restart = async (dep) => {
    const deploymentKey = `${dep.namespace}/${dep.name}`;
    setRestarting(deploymentKey);
    try {
      const result = await api.restartDeployment(dep.name, dep.namespace);
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} restart initiated - pods will restart shortly`, "success");
      } else {
        addNotification(`⚠️ Restart initiated but may not have completed: ${result?.message || "Unknown status"}`, "warning");
      }
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2e3);
      setTimeout(() => deploymentsCache.refetch(), 5e3);
    } catch (error) {
      console.error("Failed to restart deployment:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addNotification(`❌ Failed to restart deployment ${dep.name}: ${errorMsg}`, "error");
    } finally {
      setTimeout(() => setRestarting(null), 2e3);
    }
  };
  const scale = async () => {
    const dep = selected();
    if (!dep) return;
    try {
      const result = await api.scaleDeployment(dep.name, dep.namespace, scaleReplicas());
      if (result?.success) {
        addNotification(`✅ Deployment ${dep.name} scaled to ${scaleReplicas()} replicas`, "success");
      } else {
        addNotification(`⚠️ Scale may not have completed: ${result?.message || "Unknown status"}`, "warning");
      }
      setShowScale(false);
      setTimeout(() => deploymentsCache.refetch(), 500);
      setTimeout(() => deploymentsCache.refetch(), 2e3);
    } catch (error) {
      console.error("Failed to scale deployment:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addNotification(`❌ Failed to scale deployment: ${errorMsg}`, "error");
    }
  };
  const handleDeleteConfirm = async () => {
    const dep = selected();
    if (!dep) return;
    setDeleting(true);
    try {
      await api.deleteDeployment(dep.name, dep.namespace);
      addNotification(`Deployment ${dep.name} deleted successfully`, "success");
      deploymentsCache.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
      setSelected(null);
    } catch (error) {
      console.error("Failed to delete deployment:", error);
      addNotification(`Failed to delete deployment: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteDeployment = (dep) => {
    setSelected(dep);
    setShowDeleteConfirm(true);
  };
  const openScale = (dep) => {
    setSelected(dep);
    const parts = dep.ready?.split("/") || ["1", "1"];
    setScaleReplicas(parseInt(parts[1]) || 1);
    setShowScale(true);
  };
  return (() => {
    var _el$4 = _tmpl$7(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$5.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$26 = _el$22.nextSibling, _el$27 = _el$26.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$1.nextSibling;
    insert(_el$4, createComponent(BulkActions, {
      get selectedCount() {
        return bulk.selectedCount();
      },
      get totalCount() {
        return filteredAndSorted().length;
      },
      onSelectAll: () => bulk.selectAll(filteredAndSorted()),
      onDeselectAll: () => bulk.deselectAll(),
      onDelete: () => setShowBulkDeleteModal(true),
      resourceType: "deployments"
    }), _el$5);
    _el$0.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      deploymentsCache.refetch();
    };
    insert(_el$4, createComponent(Show, {
      get when() {
        return selected();
      },
      children: (dep) => (() => {
        var _el$78 = _tmpl$8();
        insert(_el$78, createComponent(RelatedResources, {
          get namespace() {
            return dep().namespace;
          },
          kind: "deployment",
          get name() {
            return dep().name;
          }
        }));
        return _el$78;
      })()
    }), _el$1);
    insert(_el$12, () => statusCounts().total);
    insert(_el$15, () => statusCounts().ready);
    insert(_el$18, () => statusCounts().partial);
    insert(_el$21, () => statusCounts().unavailable);
    insert(_el$1, createComponent(Show, {
      get when() {
        return memo(() => !!(getNamespaceParam() && getNamespaceParam() !== "_all"))() && getNamespaceParam() !== "All Namespaces";
      },
      get children() {
        var _el$23 = _tmpl$2(), _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling;
        _el$24.$$click = async () => {
          const ns = getNamespaceParam();
          if (!ns || !confirm(`Are you sure you want to restart ALL deployments in namespace "${ns}"?`)) return;
          try {
            const result = await api.bulkRestartDeployments(ns);
            if (result?.success) {
              addNotification(`✅ Restarted ${result.restarted?.length || 0}/${result.total || 0} deployments in ${ns}`, "success");
              if (result.failed && result.failed.length > 0) {
                addNotification(`⚠️ ${result.failed.length} deployments failed to restart`, "warning");
              }
            }
            setTimeout(() => deploymentsCache.refetch(), 1e3);
          } catch (error) {
            addNotification(`❌ Failed to restart deployments: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        };
        _el$25.$$click = async () => {
          const ns = getNamespaceParam();
          if (!ns || !confirm(`⚠️ DANGER: Are you sure you want to DELETE ALL deployments in namespace "${ns}"? This cannot be undone!`)) return;
          if (!confirm(`This will delete ALL ${deployments().filter((d) => d.namespace === ns).length} deployments in "${ns}". Type the namespace name to confirm:`) || prompt("Type namespace name to confirm:") !== ns) return;
          try {
            const result = await api.bulkDeleteDeployments(ns);
            if (result?.success) {
              addNotification(`✅ Deleted ${result.deleted?.length || 0}/${result.total || 0} deployments in ${ns}`, "success");
              if (result.failed && result.failed.length > 0) {
                addNotification(`⚠️ ${result.failed.length} deployments failed to delete`, "warning");
              }
            }
            setTimeout(() => deploymentsCache.refetch(), 1e3);
          } catch (error) {
            addNotification(`❌ Failed to delete deployments: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        };
        return _el$23;
      }
    }), _el$26);
    _el$26.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$27.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$28.$$input = (e) => {
      setSearchQuery(e.currentTarget.value);
      setCurrentPage(1);
    };
    insert(_el$29, createComponent(Show, {
      get when() {
        return !deploymentsCache.loading() || deploymentsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$79 = _tmpl$9(), _el$80 = _el$79.firstChild; _el$80.nextSibling;
          return _el$79;
        })();
      },
      get children() {
        return [(() => {
          var _el$30 = _tmpl$3(), _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild; _el$36.firstChild; var _el$38 = _el$35.nextSibling, _el$39 = _el$38.firstChild; _el$39.firstChild; var _el$41 = _el$38.nextSibling, _el$42 = _el$41.firstChild; _el$42.firstChild; var _el$44 = _el$41.nextSibling, _el$45 = _el$44.nextSibling, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild; _el$47.firstChild; var _el$49 = _el$46.nextSibling, _el$50 = _el$32.nextSibling;
          insert(_el$34, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === filteredAndSorted().length)() && filteredAndSorted().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < filteredAndSorted().length;
            },
            onChange: (checked) => {
              if (checked) {
                bulk.selectAll(filteredAndSorted());
              } else {
                bulk.deselectAll();
              }
            }
          }));
          _el$35.$$click = () => handleSort("name");
          insert(_el$36, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$38.$$click = () => handleSort("namespace");
          insert(_el$39, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$41.$$click = () => handleSort("ready");
          insert(_el$42, createComponent(SortIcon, {
            field: "ready"
          }), null);
          _el$46.$$click = () => handleSort("age");
          insert(_el$47, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$50, createComponent(For, {
            get each() {
              return paginatedDeployments();
            },
            get fallback() {
              return (() => {
                var _el$82 = _tmpl$0(); _el$82.firstChild;
                return _el$82;
              })();
            },
            children: (dep) => {
              const isFocused = () => focusedDeployment() === dep.name;
              return (() => {
                var _el$84 = _tmpl$1(), _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$86.nextSibling, _el$89 = _el$88.nextSibling, _el$90 = _el$89.firstChild, _el$91 = _el$89.nextSibling, _el$92 = _el$91.nextSibling, _el$93 = _el$92.nextSibling, _el$94 = _el$93.nextSibling;
                use((el) => {
                  if (el && isFocused()) {
                    setFocusedRowRef(el);
                  }
                }, _el$84);
                insert(_el$85, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(dep);
                  },
                  onChange: () => bulk.toggleSelection(dep)
                }));
                _el$87.$$click = () => {
                  setSelected(dep);
                  setShowDetails(true);
                };
                insert(_el$87, (() => {
                  var _c$ = memo(() => dep.name.length > 40);
                  return () => _c$() ? dep.name.slice(0, 37) + "..." : dep.name;
                })());
                insert(_el$88, () => dep.namespace);
                insert(_el$90, () => dep.ready);
                insert(_el$91, () => dep.upToDate);
                insert(_el$92, () => dep.available);
                insert(_el$93, () => dep.age);
                insert(_el$94, createComponent(ActionMenu, {
                  get actions() {
                    return [{
                      label: "Scale",
                      icon: "scale",
                      onClick: () => openScale(dep)
                    }, {
                      label: "Restart",
                      icon: "restart",
                      onClick: () => restart(dep),
                      loading: restarting() === `${dep.namespace}/${dep.name}`
                    }, {
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelected(dep);
                        setYamlKey(`${dep.name}|${dep.namespace}`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelected(dep);
                        setYamlKey(`${dep.name}|${dep.namespace}`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => deleteDeployment(dep),
                      variant: "danger",
                      divider: true
                    }];
                  }
                }));
                createRenderEffect((_p$) => {
                  var _v$17 = {
                    ...isFocused() ? {
                      background: "rgba(14, 165, 233, 0.15)",
                      "border-left": "3px solid #0ea5e9",
                      transition: "background 0.3s ease, border-left 0.3s ease"
                    } : {}
                  }, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${fontSize()}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `badge ${dep.ready.split("/")[0] === dep.ready.split("/")[1] ? "badge-success" : "badge-warning"}`, _v$28 = `${fontSize()}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${Math.max(24, fontSize() * 1.7)}px`, _v$31 = `${fontSize()}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${fontSize()}px`, _v$35 = `${Math.max(24, fontSize() * 1.7)}px`, _v$36 = `${Math.max(24, fontSize() * 1.7)}px`, _v$37 = `${Math.max(24, fontSize() * 1.7)}px`, _v$38 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _p$.e = style(_el$84, _v$17, _p$.e);
                  _v$18 !== _p$.t && setStyleProperty(_el$86, "font-size", _p$.t = _v$18);
                  _v$19 !== _p$.a && setStyleProperty(_el$86, "height", _p$.a = _v$19);
                  _v$20 !== _p$.o && setStyleProperty(_el$86, "line-height", _p$.o = _v$20);
                  _v$21 !== _p$.i && setStyleProperty(_el$88, "font-size", _p$.i = _v$21);
                  _v$22 !== _p$.n && setStyleProperty(_el$88, "height", _p$.n = _v$22);
                  _v$23 !== _p$.s && setStyleProperty(_el$88, "line-height", _p$.s = _v$23);
                  _v$24 !== _p$.h && setStyleProperty(_el$89, "font-size", _p$.h = _v$24);
                  _v$25 !== _p$.r && setStyleProperty(_el$89, "height", _p$.r = _v$25);
                  _v$26 !== _p$.d && setStyleProperty(_el$89, "line-height", _p$.d = _v$26);
                  _v$27 !== _p$.l && className(_el$90, _p$.l = _v$27);
                  _v$28 !== _p$.u && setStyleProperty(_el$91, "font-size", _p$.u = _v$28);
                  _v$29 !== _p$.c && setStyleProperty(_el$91, "height", _p$.c = _v$29);
                  _v$30 !== _p$.w && setStyleProperty(_el$91, "line-height", _p$.w = _v$30);
                  _v$31 !== _p$.m && setStyleProperty(_el$92, "font-size", _p$.m = _v$31);
                  _v$32 !== _p$.f && setStyleProperty(_el$92, "height", _p$.f = _v$32);
                  _v$33 !== _p$.y && setStyleProperty(_el$92, "line-height", _p$.y = _v$33);
                  _v$34 !== _p$.g && setStyleProperty(_el$93, "font-size", _p$.g = _v$34);
                  _v$35 !== _p$.p && setStyleProperty(_el$93, "height", _p$.p = _v$35);
                  _v$36 !== _p$.b && setStyleProperty(_el$93, "line-height", _p$.b = _v$36);
                  _v$37 !== _p$.T && setStyleProperty(_el$94, "height", _p$.T = _v$37);
                  _v$38 !== _p$.A && setStyleProperty(_el$94, "line-height", _p$.A = _v$38);
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
                  A: void 0
                });
                return _el$84;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(), _v$4 = `${Math.max(24, fontSize() * 1.7)}px`, _v$5 = getFontFamilyCSS(), _v$6 = `${fontSize()}px`, _v$7 = `${Math.max(24, fontSize() * 1.7)}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`, _v$0 = `${fontSize()}px`, _v$1 = `${fontSize()}px`, _v$10 = `${fontSize()}px`, _v$11 = `${fontSize()}px`, _v$12 = `${fontSize()}px`;
            _v$3 !== _p$.e && setStyleProperty(_el$31, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$33, "height", _p$.t = _v$4);
            _v$5 !== _p$.a && setStyleProperty(_el$33, "font-family", _p$.a = _v$5);
            _v$6 !== _p$.o && setStyleProperty(_el$33, "font-size", _p$.o = _v$6);
            _v$7 !== _p$.i && setStyleProperty(_el$33, "line-height", _p$.i = _v$7);
            _v$8 !== _p$.n && setStyleProperty(_el$35, "font-size", _p$.n = _v$8);
            _v$9 !== _p$.s && setStyleProperty(_el$38, "font-size", _p$.s = _v$9);
            _v$0 !== _p$.h && setStyleProperty(_el$41, "font-size", _p$.h = _v$0);
            _v$1 !== _p$.r && setStyleProperty(_el$44, "font-size", _p$.r = _v$1);
            _v$10 !== _p$.d && setStyleProperty(_el$45, "font-size", _p$.d = _v$10);
            _v$11 !== _p$.l && setStyleProperty(_el$46, "font-size", _p$.l = _v$11);
            _v$12 !== _p$.u && setStyleProperty(_el$49, "font-size", _p$.u = _v$12);
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
            u: void 0
          });
          return _el$30;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$51 = _tmpl$4(), _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild, _el$57 = _el$53.nextSibling, _el$54 = _el$57.nextSibling, _el$58 = _el$54.nextSibling, _el$55 = _el$58.nextSibling, _el$59 = _el$55.nextSibling; _el$59.nextSibling; var _el$60 = _el$52.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling, _el$63 = _el$62.nextSibling, _el$64 = _el$63.firstChild, _el$66 = _el$64.nextSibling; _el$66.nextSibling; var _el$67 = _el$63.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.nextSibling;
            insert(_el$52, () => (currentPage() - 1) * pageSize() + 1, _el$57);
            insert(_el$52, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$58);
            insert(_el$52, () => filteredAndSorted().length, _el$59);
            _el$61.$$click = () => setCurrentPage(1);
            _el$62.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$63, currentPage, _el$66);
            insert(_el$63, totalPages, null);
            _el$67.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$68.$$click = () => setCurrentPage(totalPages());
            _el$69.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$13 = currentPage() === 1, _v$14 = currentPage() === 1, _v$15 = currentPage() === totalPages(), _v$16 = currentPage() === totalPages();
              _v$13 !== _p$.e && (_el$61.disabled = _p$.e = _v$13);
              _v$14 !== _p$.t && (_el$62.disabled = _p$.t = _v$14);
              _v$15 !== _p$.a && (_el$67.disabled = _p$.a = _v$15);
              _v$16 !== _p$.o && (_el$68.disabled = _p$.o = _v$16);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$69.value = pageSize());
            return _el$51;
          }
        })];
      }
    }));
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      onClose: () => {
        setShowYaml(false);
        setSelected(null);
        setYamlKey(null);
      },
      get title() {
        return `YAML: ${selected()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$95 = _tmpl$10(), _el$96 = _el$95.firstChild; _el$96.nextSibling;
              return _el$95;
            })();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selected()?.name;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showEdit();
      },
      onClose: () => {
        setShowEdit(false);
        setSelected(null);
        setYamlKey(null);
      },
      get title() {
        return `Edit YAML: ${selected()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$98 = _tmpl$10(), _el$99 = _el$98.firstChild; _el$99.nextSibling;
              return _el$98;
            })();
          },
          get children() {
            var _el$70 = _tmpl$5();
            insert(_el$70, createComponent(Show, {
              get when() {
                return selected();
              },
              children: (dep) => createComponent(CommandPreview, {
                label: "Equivalent kubectl command",
                defaultCollapsed: true,
                get command() {
                  return `kubectl apply -f - -n ${dep().namespace || "default"}  # YAML from editor is sent via Kubernetes API`;
                },
                description: "This is an equivalent kubectl-style representation of what will be applied. The actual operation uses the Kubernetes API with your current context and namespace."
              })
            }), null);
            insert(_el$70, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selected()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => {
                setShowEdit(false);
                setSelected(null);
                setYamlKey(null);
              }
            }), null);
            return _el$70;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => {
        setShowDetails(false);
        const urlParams = new URLSearchParams(window.location.search);
        const returnView = urlParams.get("returnView");
        if (returnView) {
          urlParams.delete("returnView");
          const newUrl = new URL(window.location.href);
          newUrl.search = urlParams.toString();
          window.history.replaceState({}, "", newUrl.toString());
          setCurrentView(returnView);
        }
      },
      get title() {
        return `Deployment: ${selected()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [deploymentDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getDeploymentDetails(params.name, params.ns);
              });
              return (() => {
                var _el$101 = _tmpl$15(), _el$102 = _el$101.firstChild, _el$103 = _el$102.firstChild, _el$104 = _el$103.nextSibling, _el$105 = _el$104.firstChild, _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling, _el$109 = _el$105.nextSibling, _el$110 = _el$109.firstChild, _el$111 = _el$110.nextSibling, _el$113 = _el$109.nextSibling, _el$114 = _el$113.firstChild, _el$115 = _el$114.nextSibling, _el$117 = _el$113.nextSibling, _el$118 = _el$117.firstChild, _el$119 = _el$118.nextSibling, _el$121 = _el$117.nextSibling, _el$122 = _el$121.firstChild, _el$123 = _el$122.nextSibling, _el$125 = _el$121.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling, _el$128 = _el$125.nextSibling, _el$129 = _el$128.firstChild, _el$130 = _el$129.nextSibling, _el$131 = _el$128.nextSibling, _el$132 = _el$131.firstChild, _el$133 = _el$132.nextSibling, _el$166 = _el$102.nextSibling, _el$167 = _el$166.firstChild, _el$168 = _el$167.nextSibling, _el$169 = _el$168.nextSibling, _el$170 = _el$169.nextSibling, _el$171 = _el$170.nextSibling, _el$172 = _el$171.nextSibling;
                insert(_el$107, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => {
                    const readyParts = details().ready?.split("/") || ["0", "0"];
                    const isReady = readyParts[0] === readyParts[1] && parseInt(readyParts[0]) > 0;
                    return (() => {
                      var _el$173 = _tmpl$16();
                      className(_el$173, `badge ${isReady ? "badge-success" : "badge-warning"}`);
                      insert(_el$173, () => details().ready || selected()?.ready || "-");
                      return _el$173;
                    })();
                  }
                }), null);
                insert(_el$107, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$111, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => details().available || selected()?.available || "-"
                }), null);
                insert(_el$111, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$115, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => details().updated || selected()?.upToDate || "-"
                }), null);
                insert(_el$115, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$119, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => details().replicas || selected()?.replicas || "-"
                }), null);
                insert(_el$119, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$123, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => details().strategy || "-"
                }), null);
                insert(_el$123, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$127, () => selected()?.age || "-");
                insert(_el$130, () => selected()?.namespace);
                insert(_el$133, createComponent(Show, {
                  get when() {
                    return memo(() => !!!deploymentDetails.loading)() && deploymentDetails();
                  },
                  children: (details) => details().selector || "-"
                }), null);
                insert(_el$133, createComponent(Show, {
                  get when() {
                    return deploymentDetails.loading;
                  },
                  get children() {
                    return _tmpl$11();
                  }
                }), null);
                insert(_el$101, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!deploymentDetails.loading && deploymentDetails()?.replicaSets))() && deploymentDetails().replicaSets.length > 0;
                  },
                  get children() {
                    var _el$135 = _tmpl$12(), _el$136 = _el$135.firstChild, _el$137 = _el$136.nextSibling, _el$138 = _el$137.firstChild, _el$139 = _el$138.firstChild, _el$140 = _el$139.firstChild, _el$141 = _el$140.firstChild, _el$142 = _el$141.nextSibling, _el$143 = _el$142.nextSibling; _el$143.nextSibling; var _el$145 = _el$139.nextSibling;
                    insert(_el$145, createComponent(For, {
                      get each() {
                        return deploymentDetails().replicaSets;
                      },
                      children: (rs) => (() => {
                        var _el$174 = _tmpl$17(), _el$175 = _el$174.firstChild, _el$176 = _el$175.nextSibling, _el$177 = _el$176.nextSibling, _el$178 = _el$177.nextSibling;
                        insert(_el$175, () => rs.name);
                        insert(_el$176, () => rs.ready);
                        insert(_el$177, () => rs.replicas);
                        insert(_el$178, () => rs.age);
                        return _el$174;
                      })()
                    }));
                    return _el$135;
                  }
                }), _el$166);
                insert(_el$101, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!deploymentDetails.loading && deploymentDetails()?.pods))() && deploymentDetails().pods.length > 0;
                  },
                  get children() {
                    var _el$146 = _tmpl$13(), _el$147 = _el$146.firstChild, _el$148 = _el$147.firstChild, _el$150 = _el$148.nextSibling; _el$150.nextSibling; var _el$151 = _el$147.nextSibling, _el$152 = _el$151.firstChild, _el$153 = _el$152.firstChild, _el$154 = _el$153.firstChild, _el$155 = _el$154.firstChild, _el$156 = _el$155.nextSibling, _el$157 = _el$156.nextSibling, _el$158 = _el$157.nextSibling, _el$159 = _el$158.nextSibling, _el$160 = _el$159.nextSibling; _el$160.nextSibling; var _el$162 = _el$153.nextSibling;
                    insert(_el$147, () => deploymentDetails().pods.length, _el$150);
                    insert(_el$162, createComponent(For, {
                      get each() {
                        return deploymentDetails().pods;
                      },
                      children: (pod) => (() => {
                        var _el$179 = _tmpl$18(), _el$180 = _el$179.firstChild, _el$181 = _el$180.nextSibling, _el$182 = _el$181.firstChild, _el$183 = _el$181.nextSibling, _el$184 = _el$183.nextSibling, _el$185 = _el$184.nextSibling, _el$186 = _el$185.nextSibling, _el$187 = _el$186.nextSibling;
                        insert(_el$180, () => pod.name);
                        insert(_el$182, () => pod.status);
                        insert(_el$183, () => pod.ready);
                        insert(_el$184, () => pod.restarts);
                        insert(_el$185, () => pod.ip || "-");
                        insert(_el$186, () => pod.node || "-");
                        insert(_el$187, () => pod.age);
                        createRenderEffect(() => className(_el$182, `badge ${pod.status === "Running" ? "badge-success" : pod.status === "Pending" ? "badge-warning" : "badge-error"}`));
                        return _el$179;
                      })()
                    }));
                    return _el$146;
                  }
                }), _el$166);
                insert(_el$101, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!deploymentDetails.loading && deploymentDetails()?.conditions))() && deploymentDetails().conditions.length > 0;
                  },
                  get children() {
                    var _el$163 = _tmpl$14(), _el$164 = _el$163.firstChild, _el$165 = _el$164.nextSibling;
                    insert(_el$165, createComponent(For, {
                      get each() {
                        return deploymentDetails().conditions;
                      },
                      children: (condition) => (() => {
                        var _el$188 = _tmpl$21(), _el$189 = _el$188.firstChild, _el$190 = _el$189.firstChild, _el$191 = _el$190.nextSibling, _el$195 = _el$189.nextSibling; _el$195.firstChild;
                        insert(_el$190, () => condition.type);
                        insert(_el$191, () => condition.status);
                        insert(_el$188, createComponent(Show, {
                          get when() {
                            return condition.reason;
                          },
                          get children() {
                            var _el$192 = _tmpl$19(); _el$192.firstChild;
                            insert(_el$192, () => condition.reason, null);
                            return _el$192;
                          }
                        }), _el$195);
                        insert(_el$188, createComponent(Show, {
                          get when() {
                            return condition.message;
                          },
                          get children() {
                            var _el$194 = _tmpl$20();
                            insert(_el$194, () => condition.message);
                            return _el$194;
                          }
                        }), _el$195);
                        insert(_el$195, () => new Date(condition.lastTransitionTime).toLocaleString(), null);
                        createRenderEffect(() => className(_el$191, `badge ${condition.status === "True" ? "badge-success" : "badge-warning"}`));
                        return _el$188;
                      })()
                    }));
                    return _el$163;
                  }
                }), _el$166);
                _el$167.$$click = () => {
                  setShowDetails(false);
                  openScale(selected());
                };
                _el$168.$$click = () => {
                  setShowDetails(false);
                  restart(selected());
                };
                _el$169.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$170.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$171.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$172.$$click = (e) => {
                  e.stopPropagation();
                  deleteDeployment(selected());
                };
                return _el$101;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "deployment",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
      }
    }), null);
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showScale();
      },
      onClose: () => setShowScale(false),
      get title() {
        return `Scale: ${selected()?.name}`;
      },
      size: "sm",
      get children() {
        var _el$71 = _tmpl$6(), _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$74 = _el$73.nextSibling, _el$75 = _el$72.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling;
        _el$74.$$input = (e) => setScaleReplicas(parseInt(e.currentTarget.value) || 0);
        _el$76.$$click = () => setShowScale(false);
        _el$77.$$click = scale;
        createRenderEffect(() => _el$74.value = scaleReplicas());
        return _el$71;
      }
    }), null);
    insert(_el$4, createComponent(ConfirmationModal, {
      get isOpen() {
        return showDeleteConfirm();
      },
      onClose: () => {
        if (!deleting()) {
          setShowDeleteConfirm(false);
          setShowDetails(false);
        }
      },
      title: "Delete Deployment",
      get message() {
        return `Are you sure you want to delete the deployment "${selected()?.name}"?`;
      },
      get details() {
        return memo(() => !!selected())() ? [{
          label: "Name",
          value: selected().name
        }, {
          label: "Namespace",
          value: selected().namespace
        }] : void 0;
      },
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      get loading() {
        return deleting();
      },
      onConfirm: handleDeleteConfirm,
      size: "sm"
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      resourceType: "Deployments",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedDeployments = bulk.getSelectedItems(filteredAndSorted());
        for (const dep of selectedDeployments) {
          try {
            await api.deleteDeployment(dep.name, dep.namespace);
          } catch (error) {
            console.error(`Failed to delete deployment ${dep.namespace}/${dep.name}:`, error);
            addNotification(`Failed to delete deployment ${dep.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        deploymentsCache.refetch();
        addNotification(`Successfully deleted ${selectedDeployments.length} deployment${selectedDeployments.length !== 1 ? "s" : ""}`, "success");
      }
    }), null);
    createRenderEffect(() => _el$26.value = fontSize());
    createRenderEffect(() => _el$27.value = fontFamily());
    createRenderEffect(() => _el$28.value = searchQuery());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { Deployments as default };
//# sourceMappingURL=Deployments-BLv4dCVh.js.map
