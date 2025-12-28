import { c as createSignal, j as createResource, k as api, P as namespace, G as addNotification, a as createMemo, t as template, i as insert, d as createComponent, m as memo, S as Show, F as For, f as createRenderEffect, h as setStyleProperty, g as className, M as Modal, H as selectedNamespaces, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-B8I71-mz.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-Cv9JHSq7.js';
import { Y as YAMLViewer } from './YAMLViewer-BH5fzWmG.js';
import { Y as YAMLEditor } from './YAMLEditor-DeL5BHL5.js';
import { D as DescribeModal } from './DescribeModal-BOrOE6vF.js';
import { C as ConfirmationModal } from './ConfirmationModal-BOUoNqd5.js';
import { R as RelatedResources } from './RelatedResources-rUnE1-tT.js';
import { A as ActionMenu } from './ActionMenu-F4cRW3cz.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-CgTI3QZq.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><button class="px-3 py-2 rounded-lg text-sm font-medium"title="Restart All DaemonSets in Namespace"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">🔄 Restart All</button><button class="px-3 py-2 rounded-lg text-sm font-medium"title="Delete All DaemonSets in Namespace"style="background:rgba(239, 68, 68, 0.1);color:#ef4444;border:1px solid rgba(239, 68, 68, 0.3)">🗑️ Delete All`), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class=whitespace-nowrap>Desired</th><th class=whitespace-nowrap>Current</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Ready </div></th><th class=whitespace-nowrap>Available</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> DaemonSets</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>DaemonSets</h1><p class=text-xs style=color:var(--text-secondary)>Node-level workloads running on all or selected nodes</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><button class=icon-btn title="Refresh DaemonSets"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Ready</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Partial</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--error-color)"><span class=text-sm style=color:var(--text-secondary)>Unavailable</span><span class="text-xl font-bold"style=color:var(--error-color)></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading DaemonSets...`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td colspan=9 class="text-center py-8"style=color:var(--text-muted)>No DaemonSets found`), _tmpl$9 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$0 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$1 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$10 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Pods (<!>)</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Name</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Status</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Ready</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Restarts</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>IP</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Node</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Age</th></tr></thead><tbody>`), _tmpl$11 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Conditions</h3><div class=space-y-2>`), _tmpl$12 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Status</div><div></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Available</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Desired</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Current</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Selector</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-5 gap-2 pt-3"><button class="btn-primary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Restart><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Restart</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$13 = /* @__PURE__ */ template(`<span>`), _tmpl$14 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"><span></span></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$15 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-secondary)>Reason: `), _tmpl$16 = /* @__PURE__ */ template(`<div class="text-xs mt-1"style=color:var(--text-muted)>`), _tmpl$17 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-tertiary);border-color:var(--border-color)><div class="flex items-center justify-between mb-1"><span class="text-sm font-medium"style=color:var(--text-primary)></span><span></span></div><div class="text-xs mt-1"style=color:var(--text-muted)>Last transition: `);
const DaemonSets = () => {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  createSignal(null);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("daemonsets-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("daemonsets-font-family") || "Monaco");
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
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
    localStorage.setItem("daemonsets-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("daemonsets-font-family", family);
  };
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const [daemonsets, {
    refetch
  }] = createResource(namespace, api.getDaemonSets);
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getDaemonSetYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch daemonset YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const ds = selected();
    if (!ds) return;
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
      label: `Apply DaemonSet YAML: ${ds.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: ds.namespace,
      context: status.context,
      userAction: "daemonsets-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "daemonsets",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const ds = selected();
    if (!ds) return;
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
      label: `Dry run DaemonSet YAML: ${ds.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: ds.namespace,
      context: status.context,
      userAction: "daemonsets-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "daemonsets",
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
    let all = daemonsets() || [];
    const query = search().toLowerCase();
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
          comparison = a.ready - b.ready;
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
  const paginatedDaemonSets = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = daemonsets() || [];
    return {
      total: all.length,
      ready: all.filter((d) => d.ready === d.desired && d.ready > 0).length,
      partial: all.filter((d) => d.ready !== d.desired && d.ready > 0).length,
      unavailable: all.filter((d) => d.ready === 0).length
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
  const restart = async (ds) => {
    try {
      await api.restartDaemonSet(ds.name, ds.namespace);
      refetch();
    } catch (error) {
      console.error("Failed to restart DaemonSet:", error);
    }
  };
  const handleDeleteConfirm = async () => {
    const ds = selected();
    if (!ds) return;
    setDeleting(true);
    try {
      await api.deleteDaemonSet(ds.name, ds.namespace);
      addNotification(`DaemonSet ${ds.name} deleted successfully`, "success");
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete DaemonSet:", error);
      addNotification(`Failed to delete DaemonSet: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteDaemonSet = (ds) => {
    setSelected(ds);
    setShowDeleteConfirm(true);
  };
  return (() => {
    var _el$4 = _tmpl$6(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$5.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$28 = _el$24.nextSibling, _el$29 = _el$28.nextSibling, _el$30 = _el$11.nextSibling;
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
      resourceType: "DaemonSets"
    }), _el$5);
    _el$0.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$1.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$10.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    insert(_el$14, () => statusCounts().total);
    insert(_el$17, () => statusCounts().ready);
    insert(_el$20, () => statusCounts().partial);
    insert(_el$23, () => statusCounts().unavailable);
    insert(_el$11, createComponent(Show, {
      get when() {
        return memo(() => !!(getNamespaceParam() && getNamespaceParam() !== "_all"))() && getNamespaceParam() !== "All Namespaces";
      },
      get children() {
        var _el$25 = _tmpl$2(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling;
        _el$26.$$click = async () => {
          const ns = getNamespaceParam();
          if (!ns || !confirm(`Are you sure you want to restart ALL DaemonSets in namespace "${ns}"?`)) return;
          try {
            const result = await api.bulkRestartDaemonSets(ns);
            if (result?.success) {
              addNotification(`✅ Restarted ${result.restarted?.length || 0}/${result.total || 0} DaemonSets in ${ns}`, "success");
              if (result.failed && result.failed.length > 0) {
                addNotification(`⚠️ ${result.failed.length} DaemonSets failed to restart`, "warning");
              }
            }
            setTimeout(() => refetch(), 1e3);
          } catch (error) {
            addNotification(`❌ Failed to restart DaemonSets: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        };
        _el$27.$$click = async () => {
          const ns = getNamespaceParam();
          if (!ns || !confirm(`⚠️ DANGER: Are you sure you want to DELETE ALL DaemonSets in namespace "${ns}"? This cannot be undone!`)) return;
          if (!confirm(`This will delete ALL ${daemonsets()?.filter((ds) => ds.namespace === ns).length || 0} DaemonSets in "${ns}". Type the namespace name to confirm:`) || prompt("Type namespace name to confirm:") !== ns) return;
          try {
            const result = await api.bulkDeleteDaemonSets(ns);
            if (result?.success) {
              addNotification(`✅ Deleted ${result.deleted?.length || 0}/${result.total || 0} DaemonSets in ${ns}`, "success");
              if (result.failed && result.failed.length > 0) {
                addNotification(`⚠️ ${result.failed.length} DaemonSets failed to delete`, "warning");
              }
            }
            setTimeout(() => refetch(), 1e3);
          } catch (error) {
            addNotification(`❌ Failed to delete DaemonSets: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        };
        return _el$25;
      }
    }), _el$28);
    _el$28.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$29.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$30, createComponent(Show, {
      get when() {
        return !daemonsets.loading;
      },
      get fallback() {
        return (() => {
          var _el$72 = _tmpl$7(), _el$73 = _el$72.firstChild; _el$73.nextSibling;
          return _el$72;
        })();
      },
      get children() {
        return [(() => {
          var _el$31 = _tmpl$3(), _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$36.firstChild; _el$37.firstChild; var _el$39 = _el$36.nextSibling, _el$40 = _el$39.firstChild; _el$40.firstChild; var _el$42 = _el$39.nextSibling, _el$43 = _el$42.nextSibling, _el$44 = _el$43.nextSibling, _el$45 = _el$44.firstChild; _el$45.firstChild; var _el$47 = _el$44.nextSibling, _el$48 = _el$47.nextSibling, _el$49 = _el$48.firstChild; _el$49.firstChild; var _el$51 = _el$33.nextSibling;
          insert(_el$35, createComponent(SelectAllCheckbox, {
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
          _el$36.$$click = () => handleSort("name");
          insert(_el$37, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$39.$$click = () => handleSort("namespace");
          insert(_el$40, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$44.$$click = () => handleSort("ready");
          insert(_el$45, createComponent(SortIcon, {
            field: "ready"
          }), null);
          _el$48.$$click = () => handleSort("age");
          insert(_el$49, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$51, createComponent(For, {
            get each() {
              return paginatedDaemonSets();
            },
            get fallback() {
              return (() => {
                var _el$75 = _tmpl$8(); _el$75.firstChild;
                return _el$75;
              })();
            },
            children: (ds) => {
              return (() => {
                var _el$77 = _tmpl$9(), _el$78 = _el$77.firstChild, _el$79 = _el$78.nextSibling, _el$80 = _el$79.firstChild, _el$81 = _el$79.nextSibling, _el$82 = _el$81.nextSibling, _el$83 = _el$82.nextSibling, _el$84 = _el$83.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$84.nextSibling, _el$87 = _el$86.nextSibling, _el$88 = _el$87.nextSibling;
                insert(_el$78, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(ds);
                  },
                  onChange: () => bulk.toggleSelection(ds)
                }));
                _el$80.$$click = () => {
                  setSelected(ds);
                  setShowDetails(true);
                };
                insert(_el$80, (() => {
                  var _c$ = memo(() => ds.name.length > 40);
                  return () => _c$() ? ds.name.slice(0, 37) + "..." : ds.name;
                })());
                insert(_el$81, () => ds.namespace);
                insert(_el$82, () => ds.desired);
                insert(_el$83, () => ds.current);
                insert(_el$85, () => ds.ready);
                insert(_el$86, () => ds.available);
                insert(_el$87, () => ds.age);
                insert(_el$88, createComponent(ActionMenu, {
                  actions: [{
                    label: "Restart",
                    icon: "restart",
                    onClick: () => restart(ds)
                  }, {
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(ds);
                      setYamlKey(`${ds.name}|${ds.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(ds);
                      setYamlKey(`${ds.name}|${ds.namespace}`);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(ds);
                      deleteDaemonSet(ds);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$1 = `${fontSize()}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `badge ${ds.ready === ds.desired ? "badge-success" : "badge-warning"}`, _v$25 = `${fontSize()}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `${Math.max(24, fontSize() * 1.7)}px`, _v$28 = `${fontSize()}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${Math.max(24, fontSize() * 1.7)}px`, _v$31 = `${Math.max(24, fontSize() * 1.7)}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$1 !== _p$.e && setStyleProperty(_el$79, "font-size", _p$.e = _v$1);
                  _v$10 !== _p$.t && setStyleProperty(_el$79, "height", _p$.t = _v$10);
                  _v$11 !== _p$.a && setStyleProperty(_el$79, "line-height", _p$.a = _v$11);
                  _v$12 !== _p$.o && setStyleProperty(_el$81, "font-size", _p$.o = _v$12);
                  _v$13 !== _p$.i && setStyleProperty(_el$81, "height", _p$.i = _v$13);
                  _v$14 !== _p$.n && setStyleProperty(_el$81, "line-height", _p$.n = _v$14);
                  _v$15 !== _p$.s && setStyleProperty(_el$82, "font-size", _p$.s = _v$15);
                  _v$16 !== _p$.h && setStyleProperty(_el$82, "height", _p$.h = _v$16);
                  _v$17 !== _p$.r && setStyleProperty(_el$82, "line-height", _p$.r = _v$17);
                  _v$18 !== _p$.d && setStyleProperty(_el$83, "font-size", _p$.d = _v$18);
                  _v$19 !== _p$.l && setStyleProperty(_el$83, "height", _p$.l = _v$19);
                  _v$20 !== _p$.u && setStyleProperty(_el$83, "line-height", _p$.u = _v$20);
                  _v$21 !== _p$.c && setStyleProperty(_el$84, "font-size", _p$.c = _v$21);
                  _v$22 !== _p$.w && setStyleProperty(_el$84, "height", _p$.w = _v$22);
                  _v$23 !== _p$.m && setStyleProperty(_el$84, "line-height", _p$.m = _v$23);
                  _v$24 !== _p$.f && className(_el$85, _p$.f = _v$24);
                  _v$25 !== _p$.y && setStyleProperty(_el$86, "font-size", _p$.y = _v$25);
                  _v$26 !== _p$.g && setStyleProperty(_el$86, "height", _p$.g = _v$26);
                  _v$27 !== _p$.p && setStyleProperty(_el$86, "line-height", _p$.p = _v$27);
                  _v$28 !== _p$.b && setStyleProperty(_el$87, "font-size", _p$.b = _v$28);
                  _v$29 !== _p$.T && setStyleProperty(_el$87, "height", _p$.T = _v$29);
                  _v$30 !== _p$.A && setStyleProperty(_el$87, "line-height", _p$.A = _v$30);
                  _v$31 !== _p$.O && setStyleProperty(_el$88, "height", _p$.O = _v$31);
                  _v$32 !== _p$.I && setStyleProperty(_el$88, "line-height", _p$.I = _v$32);
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
                  I: void 0
                });
                return _el$77;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$32, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$32, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$31;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$52 = _tmpl$4(), _el$53 = _el$52.firstChild, _el$54 = _el$53.firstChild, _el$58 = _el$54.nextSibling, _el$55 = _el$58.nextSibling, _el$59 = _el$55.nextSibling, _el$56 = _el$59.nextSibling, _el$60 = _el$56.nextSibling; _el$60.nextSibling; var _el$61 = _el$53.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$64.firstChild, _el$67 = _el$65.nextSibling; _el$67.nextSibling; var _el$68 = _el$64.nextSibling, _el$69 = _el$68.nextSibling, _el$70 = _el$69.nextSibling;
            insert(_el$53, () => (currentPage() - 1) * pageSize() + 1, _el$58);
            insert(_el$53, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$59);
            insert(_el$53, () => filteredAndSorted().length, _el$60);
            _el$62.$$click = () => setCurrentPage(1);
            _el$63.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$64, currentPage, _el$67);
            insert(_el$64, totalPages, null);
            _el$68.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$69.$$click = () => setCurrentPage(totalPages());
            _el$70.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
              _v$5 !== _p$.e && (_el$62.disabled = _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$63.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$68.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$69.disabled = _p$.o = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$70.value = pageSize());
            return _el$52;
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
              var _el$89 = _tmpl$0(), _el$90 = _el$89.firstChild; _el$90.nextSibling;
              return _el$89;
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
              var _el$92 = _tmpl$0(), _el$93 = _el$92.firstChild; _el$93.nextSibling;
              return _el$92;
            })();
          },
          get children() {
            var _el$71 = _tmpl$5();
            insert(_el$71, createComponent(YAMLEditor, {
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
            }));
            return _el$71;
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
        setSelected(null);
      },
      get title() {
        return `DaemonSet: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [daemonSetDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getDaemonSetDetails(params.name, params.ns);
              });
              return (() => {
                var _el$95 = _tmpl$12(), _el$96 = _el$95.firstChild, _el$97 = _el$96.firstChild, _el$98 = _el$97.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.firstChild, _el$101 = _el$100.nextSibling, _el$103 = _el$99.nextSibling, _el$104 = _el$103.firstChild, _el$105 = _el$104.nextSibling, _el$107 = _el$103.nextSibling, _el$108 = _el$107.firstChild, _el$109 = _el$108.nextSibling, _el$111 = _el$107.nextSibling, _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling, _el$115 = _el$111.nextSibling, _el$116 = _el$115.firstChild, _el$117 = _el$116.nextSibling, _el$118 = _el$115.nextSibling, _el$119 = _el$118.firstChild, _el$120 = _el$119.nextSibling, _el$121 = _el$118.nextSibling, _el$122 = _el$121.firstChild, _el$123 = _el$122.nextSibling, _el$145 = _el$96.nextSibling, _el$146 = _el$145.firstChild, _el$147 = _el$146.nextSibling, _el$148 = _el$147.nextSibling, _el$149 = _el$148.nextSibling, _el$150 = _el$149.nextSibling;
                insert(_el$101, createComponent(Show, {
                  get when() {
                    return memo(() => !!!daemonSetDetails.loading)() && daemonSetDetails();
                  },
                  children: (details) => {
                    const readyParts = (details().ready || selected()?.ready?.toString() || "0/0").split("/");
                    const isReady = readyParts[0] === readyParts[1] && parseInt(readyParts[0]) > 0;
                    return (() => {
                      var _el$151 = _tmpl$13();
                      className(_el$151, `badge ${isReady ? "badge-success" : "badge-warning"}`);
                      insert(_el$151, () => details().ready || `${selected()?.ready || 0}/${selected()?.desired || 0}`);
                      return _el$151;
                    })();
                  }
                }), null);
                insert(_el$101, createComponent(Show, {
                  get when() {
                    return daemonSetDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$105, createComponent(Show, {
                  get when() {
                    return memo(() => !!!daemonSetDetails.loading)() && daemonSetDetails();
                  },
                  children: (details) => details().available || selected()?.available || "-"
                }), null);
                insert(_el$105, createComponent(Show, {
                  get when() {
                    return daemonSetDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$109, createComponent(Show, {
                  get when() {
                    return memo(() => !!!daemonSetDetails.loading)() && daemonSetDetails();
                  },
                  children: (details) => details().desired || selected()?.desired || "-"
                }), null);
                insert(_el$109, createComponent(Show, {
                  get when() {
                    return daemonSetDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$113, createComponent(Show, {
                  get when() {
                    return memo(() => !!!daemonSetDetails.loading)() && daemonSetDetails();
                  },
                  children: (details) => details().current || selected()?.current || "-"
                }), null);
                insert(_el$113, createComponent(Show, {
                  get when() {
                    return daemonSetDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$117, () => selected()?.age || "-");
                insert(_el$120, () => selected()?.namespace);
                insert(_el$123, createComponent(Show, {
                  get when() {
                    return memo(() => !!!daemonSetDetails.loading)() && daemonSetDetails();
                  },
                  children: (details) => details().selector || "-"
                }), null);
                insert(_el$123, createComponent(Show, {
                  get when() {
                    return daemonSetDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$95, createComponent(Show, {
                  get when() {
                    return daemonSetDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "daemonset",
                      get name() {
                        return daemonSetDetails().name;
                      },
                      get namespace() {
                        return daemonSetDetails().namespace;
                      },
                      get relatedData() {
                        return daemonSetDetails();
                      }
                    });
                  }
                }), _el$145);
                insert(_el$95, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!daemonSetDetails.loading && daemonSetDetails()?.pods))() && daemonSetDetails().pods.length > 0;
                  },
                  get children() {
                    var _el$125 = _tmpl$10(), _el$126 = _el$125.firstChild, _el$127 = _el$126.firstChild, _el$129 = _el$127.nextSibling; _el$129.nextSibling; var _el$130 = _el$126.nextSibling, _el$131 = _el$130.firstChild, _el$132 = _el$131.firstChild, _el$133 = _el$132.firstChild, _el$134 = _el$133.firstChild, _el$135 = _el$134.nextSibling, _el$136 = _el$135.nextSibling, _el$137 = _el$136.nextSibling, _el$138 = _el$137.nextSibling, _el$139 = _el$138.nextSibling; _el$139.nextSibling; var _el$141 = _el$132.nextSibling;
                    insert(_el$126, () => daemonSetDetails().pods.length, _el$129);
                    insert(_el$141, createComponent(For, {
                      get each() {
                        return daemonSetDetails().pods;
                      },
                      children: (pod) => (() => {
                        var _el$152 = _tmpl$14(), _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling, _el$155 = _el$154.firstChild, _el$156 = _el$154.nextSibling, _el$157 = _el$156.nextSibling, _el$158 = _el$157.nextSibling, _el$159 = _el$158.nextSibling, _el$160 = _el$159.nextSibling;
                        insert(_el$153, () => pod.name);
                        insert(_el$155, () => pod.status);
                        insert(_el$156, () => pod.ready);
                        insert(_el$157, () => pod.restarts);
                        insert(_el$158, () => pod.ip || "-");
                        insert(_el$159, () => pod.node || "-");
                        insert(_el$160, () => pod.age);
                        createRenderEffect(() => className(_el$155, `badge ${pod.status === "Running" ? "badge-success" : pod.status === "Pending" ? "badge-warning" : "badge-error"}`));
                        return _el$152;
                      })()
                    }));
                    return _el$125;
                  }
                }), _el$145);
                insert(_el$95, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!daemonSetDetails.loading && daemonSetDetails()?.conditions))() && daemonSetDetails().conditions.length > 0;
                  },
                  get children() {
                    var _el$142 = _tmpl$11(), _el$143 = _el$142.firstChild, _el$144 = _el$143.nextSibling;
                    insert(_el$144, createComponent(For, {
                      get each() {
                        return daemonSetDetails().conditions;
                      },
                      children: (condition) => (() => {
                        var _el$161 = _tmpl$17(), _el$162 = _el$161.firstChild, _el$163 = _el$162.firstChild, _el$164 = _el$163.nextSibling, _el$168 = _el$162.nextSibling; _el$168.firstChild;
                        insert(_el$163, () => condition.type);
                        insert(_el$164, () => condition.status);
                        insert(_el$161, createComponent(Show, {
                          get when() {
                            return condition.reason;
                          },
                          get children() {
                            var _el$165 = _tmpl$15(); _el$165.firstChild;
                            insert(_el$165, () => condition.reason, null);
                            return _el$165;
                          }
                        }), _el$168);
                        insert(_el$161, createComponent(Show, {
                          get when() {
                            return condition.message;
                          },
                          get children() {
                            var _el$167 = _tmpl$16();
                            insert(_el$167, () => condition.message);
                            return _el$167;
                          }
                        }), _el$168);
                        insert(_el$168, () => new Date(condition.lastTransitionTime).toLocaleString(), null);
                        createRenderEffect(() => className(_el$164, `badge ${condition.status === "True" ? "badge-success" : "badge-warning"}`));
                        return _el$161;
                      })()
                    }));
                    return _el$142;
                  }
                }), _el$145);
                _el$146.$$click = () => {
                  setShowDetails(false);
                  restart(selected());
                };
                _el$147.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$148.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$149.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$150.$$click = (e) => {
                  e.stopPropagation();
                  deleteDaemonSet(selected());
                };
                return _el$95;
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
      resourceType: "daemonset",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
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
      title: "Delete DaemonSet",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the DaemonSet "${selected().name}"?` : "Are you sure you want to delete this DaemonSet?";
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
      resourceType: "DaemonSets",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedDaemonSets = bulk.getSelectedItems(filteredAndSorted());
        for (const ds of selectedDaemonSets) {
          try {
            await api.deleteDaemonSet(ds.name, ds.namespace);
          } catch (error) {
            console.error(`Failed to delete daemonset ${ds.namespace}/${ds.name}:`, error);
            addNotification(`Failed to delete daemonset ${ds.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        refetch();
        addNotification(`Successfully deleted ${selectedDaemonSets.length} daemonset${selectedDaemonSets.length !== 1 ? "s" : ""}`, "success");
        setShowBulkDeleteModal(false);
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
      _v$9 !== _p$.e && setStyleProperty(_el$30, "background", _p$.e = _v$9);
      _v$0 !== _p$.t && setStyleProperty(_el$30, "border", _p$.t = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = fontSize());
    createRenderEffect(() => _el$1.value = fontFamily());
    createRenderEffect(() => _el$28.value = search());
    createRenderEffect(() => _el$29.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { DaemonSets as default };
//# sourceMappingURL=DaemonSets-DyPisz29.js.map
