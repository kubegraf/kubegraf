import { c as createSignal, a as createMemo, o as onMount, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces, v as delegateEvents } from './index-Bh-O-sIc.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-CU5t99BZ.js';
import { c as createCachedResource } from './resourceCache-DXA8Kj29.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';
import { Y as YAMLEditor } from './YAMLEditor-Cvfm5wCJ.js';
import { C as CommandPreview } from './CommandPreview-C6bYxIqz.js';
import { D as DescribeModal } from './DescribeModal-6Ip9Wbf-.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';
import { R as RelatedResources } from './RelatedResources-C1PaEPdu.js';
import { A as ActionMenu } from './ActionMenu-BVo-8BTq.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-BCNQqaHy.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4 mb-4"style="background:var(--error-bg);border:1px solid var(--error-color)"><div class="flex items-center gap-2"><span style=color:var(--error-color)>❌</span><span style=color:var(--error-color)>Error loading ConfigMaps: `), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th style="padding:0 8px;text-align:left;font-weight:bold;line-height:24px;height:24px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Namespace </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Data </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> ConfigMaps</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>ConfigMaps</h1><p class=text-xs style=color:var(--text-secondary)>Configuration data storage</p></div><div class="flex items-center gap-3"><button class=icon-btn title="Refresh ConfigMaps"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-2"><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:2px solid var(--accent-primary);border-color:var(--border-color)"><span class=text-xs style=color:var(--text-secondary)>Total</span><span class="text-sm font-bold"style=color:var(--text-primary)></span></div><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:2px solid #8b5cf6;border-color:var(--border-color)"><span class=text-xs style=color:var(--text-secondary)>Filtered</span><span class="text-sm font-bold"style=color:#8b5cf6></span></div><div class="card px-3 py-1.5 rounded border cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:2px solid #22c55e;border-color:var(--border-color)"><span class=text-xs style=color:var(--text-secondary)>Namespaces</span><span class="text-sm font-bold"style=color:#22c55e></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading ConfigMaps...`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td colspan=6 class="text-center py-8"style=color:var(--text-muted)>No ConfigMaps found`), _tmpl$9 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:left;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span class="badge badge-info"> keys</span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$0 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Data</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Key</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Value</th></tr></thead><tbody>`), _tmpl$10 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Binary Data</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Key</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Size</th></tr></thead><tbody>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Data Keys</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$12 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm font-mono"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm font-mono break-all"style=color:var(--text-primary)><pre class=whitespace-pre-wrap style=max-width:500px;overflow:auto>`), _tmpl$13 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm font-mono"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm"style=color:var(--text-primary)>`), _tmpl$14 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const ConfigMaps = () => {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [fontSize] = createSignal(parseInt(localStorage.getItem("configmaps-font-size") || "14"));
  const [fontFamily] = createSignal(localStorage.getItem("configmaps-font-family") || "Monaco");
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
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const configMapsCache = createCachedResource("configmaps", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const configmaps2 = await api.getConfigMaps(namespaceParam);
      return configmaps2;
    } catch (error) {
      console.error("[ConfigMaps] Error fetching configmaps:", error);
      addNotification(`❌ Failed to fetch ConfigMaps: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const configmaps = createMemo(() => configMapsCache.data() || []);
  const refetch = () => configMapsCache.refetch();
  onMount(() => {
    if (!configMapsCache.data()) {
      configMapsCache.refetch();
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getConfigMapYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch configmap YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const cm = selected();
    if (!cm) return;
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
      label: `Apply ConfigMap YAML: ${cm.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: cm.namespace,
      context: status.context,
      userAction: "configmaps-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "configmaps",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const cm = selected();
    if (!cm) return;
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
      label: `Dry run ConfigMap YAML: ${cm.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: cm.namespace,
      context: status.context,
      userAction: "configmaps-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "configmaps",
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
    let all = configmaps() || [];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((c) => c.name.toLowerCase().includes(query) || c.namespace.toLowerCase().includes(query));
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
        case "data":
          comparison = a.data - b.data;
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
  const paginated = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
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
  const handleDeleteConfirm = async () => {
    const cm = selected();
    if (!cm) return;
    setDeleting(true);
    try {
      await api.deleteConfigMap(cm.name, cm.namespace);
      addNotification(`ConfigMap ${cm.name} deleted successfully`, "success");
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete ConfigMap:", error);
      addNotification(`Failed to delete ConfigMap: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteConfigMap = (cm) => {
    setSelected(cm);
    setShowDeleteConfirm(true);
  };
  return (() => {
    var _el$4 = _tmpl$6(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$5.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling, _el$27 = _el$1.nextSibling;
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
      resourceType: "ConfigMaps"
    }), _el$5);
    _el$0.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    insert(_el$12, () => (configmaps() || []).length);
    insert(_el$15, () => filteredAndSorted().length);
    insert(_el$18, () => new Set((configmaps() || []).map((c) => c.namespace)).size);
    _el$20.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$21.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$4, createComponent(Show, {
      get when() {
        return configMapsCache.error();
      },
      get children() {
        var _el$22 = _tmpl$2(), _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling; _el$25.firstChild;
        insert(_el$25, () => configMapsCache.error()?.message || "Unknown error", null);
        return _el$22;
      }
    }), _el$27);
    insert(_el$27, createComponent(Show, {
      get when() {
        return !configMapsCache.loading() || configMapsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$67 = _tmpl$7(), _el$68 = _el$67.firstChild; _el$68.nextSibling;
          return _el$67;
        })();
      },
      get children() {
        return [(() => {
          var _el$28 = _tmpl$3(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild; _el$34.firstChild; var _el$36 = _el$33.nextSibling, _el$37 = _el$36.firstChild; _el$37.firstChild; var _el$39 = _el$36.nextSibling, _el$40 = _el$39.firstChild; _el$40.firstChild; var _el$42 = _el$39.nextSibling, _el$43 = _el$42.firstChild; _el$43.firstChild; var _el$45 = _el$42.nextSibling, _el$46 = _el$30.nextSibling;
          insert(_el$32, createComponent(SelectAllCheckbox, {
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
          _el$33.$$click = () => handleSort("name");
          insert(_el$34, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$36.$$click = () => handleSort("namespace");
          insert(_el$37, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$39.$$click = () => handleSort("data");
          insert(_el$40, createComponent(SortIcon, {
            field: "data"
          }), null);
          _el$42.$$click = () => handleSort("age");
          insert(_el$43, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$46, createComponent(For, {
            get each() {
              return paginated();
            },
            get fallback() {
              return (() => {
                var _el$70 = _tmpl$8(); _el$70.firstChild;
                return _el$70;
              })();
            },
            children: (cm) => {
              return (() => {
                var _el$72 = _tmpl$9(), _el$73 = _el$72.firstChild, _el$74 = _el$73.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$74.nextSibling, _el$77 = _el$76.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.firstChild, _el$80 = _el$77.nextSibling, _el$81 = _el$80.nextSibling;
                insert(_el$73, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(cm);
                  },
                  onChange: () => bulk.toggleSelection(cm)
                }));
                _el$75.$$click = () => {
                  setSelected(cm);
                  setShowDetails(true);
                };
                insert(_el$75, (() => {
                  var _c$ = memo(() => cm.name.length > 40);
                  return () => _c$() ? cm.name.slice(0, 37) + "..." : cm.name;
                })());
                insert(_el$76, () => cm.namespace);
                insert(_el$78, () => cm.data, _el$79);
                insert(_el$80, () => cm.age);
                insert(_el$81, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(cm);
                      setYamlKey(`${cm.name}|${cm.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(cm);
                      setYamlKey(`${cm.name}|${cm.namespace}`);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(cm);
                      deleteConfigMap(cm);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${fontSize()}px`, _v$31 = `${Math.max(24, fontSize() * 1.7)}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${fontSize()}px`, _v$34 = `${Math.max(24, fontSize() * 1.7)}px`, _v$35 = `${Math.max(24, fontSize() * 1.7)}px`, _v$36 = `${fontSize()}px`, _v$37 = `${Math.max(24, fontSize() * 1.7)}px`, _v$38 = `${Math.max(24, fontSize() * 1.7)}px`, _v$39 = `${fontSize()}px`, _v$40 = `${Math.max(24, fontSize() * 1.7)}px`, _v$41 = `${Math.max(24, fontSize() * 1.7)}px`, _v$42 = `${Math.max(24, fontSize() * 1.7)}px`, _v$43 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$28 !== _p$.e && setStyleProperty(_el$73, "height", _p$.e = _v$28);
                  _v$29 !== _p$.t && setStyleProperty(_el$73, "line-height", _p$.t = _v$29);
                  _v$30 !== _p$.a && setStyleProperty(_el$74, "font-size", _p$.a = _v$30);
                  _v$31 !== _p$.o && setStyleProperty(_el$74, "height", _p$.o = _v$31);
                  _v$32 !== _p$.i && setStyleProperty(_el$74, "line-height", _p$.i = _v$32);
                  _v$33 !== _p$.n && setStyleProperty(_el$76, "font-size", _p$.n = _v$33);
                  _v$34 !== _p$.s && setStyleProperty(_el$76, "height", _p$.s = _v$34);
                  _v$35 !== _p$.h && setStyleProperty(_el$76, "line-height", _p$.h = _v$35);
                  _v$36 !== _p$.r && setStyleProperty(_el$77, "font-size", _p$.r = _v$36);
                  _v$37 !== _p$.d && setStyleProperty(_el$77, "height", _p$.d = _v$37);
                  _v$38 !== _p$.l && setStyleProperty(_el$77, "line-height", _p$.l = _v$38);
                  _v$39 !== _p$.u && setStyleProperty(_el$80, "font-size", _p$.u = _v$39);
                  _v$40 !== _p$.c && setStyleProperty(_el$80, "height", _p$.c = _v$40);
                  _v$41 !== _p$.w && setStyleProperty(_el$80, "line-height", _p$.w = _v$41);
                  _v$42 !== _p$.m && setStyleProperty(_el$81, "height", _p$.m = _v$42);
                  _v$43 !== _p$.f && setStyleProperty(_el$81, "line-height", _p$.f = _v$43);
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
                  f: void 0
                });
                return _el$72;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground(), _v$5 = `${Math.max(24, fontSize() * 1.7)}px`, _v$6 = getFontFamilyCSS(fontFamily()), _v$7 = `${fontSize()}px`, _v$8 = `${Math.max(24, fontSize() * 1.7)}px`, _v$9 = `${fontSize()}px`, _v$0 = `${Math.max(24, fontSize() * 1.7)}px`, _v$1 = `${Math.max(24, fontSize() * 1.7)}px`, _v$10 = `${fontSize()}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${Math.max(24, fontSize() * 1.7)}px`, _v$13 = `${fontSize()}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${Math.max(24, fontSize() * 1.7)}px`, _v$16 = `${fontSize()}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${Math.max(24, fontSize() * 1.7)}px`, _v$19 = `${fontSize()}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`;
            _v$3 !== _p$.e && setStyleProperty(_el$29, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$29, "background", _p$.t = _v$4);
            _v$5 !== _p$.a && setStyleProperty(_el$31, "height", _p$.a = _v$5);
            _v$6 !== _p$.o && setStyleProperty(_el$31, "font-family", _p$.o = _v$6);
            _v$7 !== _p$.i && setStyleProperty(_el$31, "font-size", _p$.i = _v$7);
            _v$8 !== _p$.n && setStyleProperty(_el$31, "line-height", _p$.n = _v$8);
            _v$9 !== _p$.s && setStyleProperty(_el$33, "font-size", _p$.s = _v$9);
            _v$0 !== _p$.h && setStyleProperty(_el$33, "height", _p$.h = _v$0);
            _v$1 !== _p$.r && setStyleProperty(_el$33, "line-height", _p$.r = _v$1);
            _v$10 !== _p$.d && setStyleProperty(_el$36, "font-size", _p$.d = _v$10);
            _v$11 !== _p$.l && setStyleProperty(_el$36, "height", _p$.l = _v$11);
            _v$12 !== _p$.u && setStyleProperty(_el$36, "line-height", _p$.u = _v$12);
            _v$13 !== _p$.c && setStyleProperty(_el$39, "font-size", _p$.c = _v$13);
            _v$14 !== _p$.w && setStyleProperty(_el$39, "height", _p$.w = _v$14);
            _v$15 !== _p$.m && setStyleProperty(_el$39, "line-height", _p$.m = _v$15);
            _v$16 !== _p$.f && setStyleProperty(_el$42, "font-size", _p$.f = _v$16);
            _v$17 !== _p$.y && setStyleProperty(_el$42, "height", _p$.y = _v$17);
            _v$18 !== _p$.g && setStyleProperty(_el$42, "line-height", _p$.g = _v$18);
            _v$19 !== _p$.p && setStyleProperty(_el$45, "font-size", _p$.p = _v$19);
            _v$20 !== _p$.b && setStyleProperty(_el$45, "height", _p$.b = _v$20);
            _v$21 !== _p$.T && setStyleProperty(_el$45, "line-height", _p$.T = _v$21);
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
          return _el$28;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$47 = _tmpl$4(), _el$48 = _el$47.firstChild, _el$49 = _el$48.firstChild, _el$53 = _el$49.nextSibling, _el$50 = _el$53.nextSibling, _el$54 = _el$50.nextSibling, _el$51 = _el$54.nextSibling, _el$55 = _el$51.nextSibling; _el$55.nextSibling; var _el$56 = _el$48.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling, _el$59 = _el$58.nextSibling, _el$60 = _el$59.firstChild, _el$62 = _el$60.nextSibling; _el$62.nextSibling; var _el$63 = _el$59.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$64.nextSibling;
            insert(_el$48, () => (currentPage() - 1) * pageSize() + 1, _el$53);
            insert(_el$48, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$54);
            insert(_el$48, () => filteredAndSorted().length, _el$55);
            _el$57.$$click = () => setCurrentPage(1);
            _el$58.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$59, currentPage, _el$62);
            insert(_el$59, totalPages, null);
            _el$63.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$64.$$click = () => setCurrentPage(totalPages());
            _el$65.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$22 = currentPage() === 1, _v$23 = currentPage() === 1, _v$24 = currentPage() === totalPages(), _v$25 = currentPage() === totalPages();
              _v$22 !== _p$.e && (_el$57.disabled = _p$.e = _v$22);
              _v$23 !== _p$.t && (_el$58.disabled = _p$.t = _v$23);
              _v$24 !== _p$.a && (_el$63.disabled = _p$.a = _v$24);
              _v$25 !== _p$.o && (_el$64.disabled = _p$.o = _v$25);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$65.value = pageSize());
            return _el$47;
          }
        })];
      }
    }));
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => {
        setShowDetails(false);
        setSelected(null);
      },
      get title() {
        return `ConfigMap: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [cmDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getConfigMapDetails(params.name, params.ns);
              });
              return (() => {
                var _el$82 = _tmpl$11(), _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$86 = _el$85.firstChild, _el$87 = _el$86.firstChild, _el$88 = _el$87.nextSibling, _el$90 = _el$86.nextSibling, _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling, _el$93 = _el$90.nextSibling, _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling, _el$114 = _el$83.nextSibling, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling, _el$117 = _el$116.nextSibling, _el$118 = _el$117.nextSibling;
                insert(_el$88, createComponent(Show, {
                  get when() {
                    return memo(() => !!!cmDetails.loading)() && cmDetails();
                  },
                  children: (details) => {
                    const dataKeys = Object.keys(details().data || {});
                    const binaryKeys = Object.keys(details().binaryData || {});
                    return dataKeys.length + binaryKeys.length || selected()?.data || 0;
                  }
                }), null);
                insert(_el$88, createComponent(Show, {
                  get when() {
                    return cmDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$92, () => selected()?.age || "-");
                insert(_el$95, () => selected()?.namespace);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return cmDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "configmap",
                      get name() {
                        return cmDetails().name;
                      },
                      get namespace() {
                        return cmDetails().namespace;
                      },
                      get relatedData() {
                        return cmDetails();
                      }
                    });
                  }
                }), _el$114);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!cmDetails.loading && cmDetails()?.data))() && Object.keys(cmDetails().data).length > 0;
                  },
                  get children() {
                    var _el$96 = _tmpl$1(), _el$97 = _el$96.firstChild, _el$98 = _el$97.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild, _el$102 = _el$101.firstChild; _el$102.nextSibling; var _el$104 = _el$100.nextSibling;
                    insert(_el$104, createComponent(For, {
                      get each() {
                        return Object.entries(cmDetails().data || {});
                      },
                      children: ([key, value]) => (() => {
                        var _el$119 = _tmpl$12(), _el$120 = _el$119.firstChild, _el$121 = _el$120.nextSibling, _el$122 = _el$121.firstChild;
                        insert(_el$120, key);
                        insert(_el$122, () => String(value));
                        return _el$119;
                      })()
                    }));
                    return _el$96;
                  }
                }), _el$114);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!cmDetails.loading && cmDetails()?.binaryData))() && Object.keys(cmDetails().binaryData).length > 0;
                  },
                  get children() {
                    var _el$105 = _tmpl$10(), _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling, _el$108 = _el$107.firstChild, _el$109 = _el$108.firstChild, _el$110 = _el$109.firstChild, _el$111 = _el$110.firstChild; _el$111.nextSibling; var _el$113 = _el$109.nextSibling;
                    insert(_el$113, createComponent(For, {
                      get each() {
                        return Object.keys(cmDetails().binaryData || {});
                      },
                      children: (key) => (() => {
                        var _el$123 = _tmpl$13(), _el$124 = _el$123.firstChild, _el$125 = _el$124.nextSibling;
                        insert(_el$124, key);
                        insert(_el$125, (() => {
                          var _c$2 = memo(() => !!cmDetails().binaryData[key]);
                          return () => _c$2() ? `${cmDetails().binaryData[key].length} bytes` : "-";
                        })());
                        return _el$123;
                      })()
                    }));
                    return _el$105;
                  }
                }), _el$114);
                _el$115.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$116.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$117.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$118.$$click = (e) => {
                  e.stopPropagation();
                  deleteConfigMap(selected());
                };
                return _el$82;
              })();
            })();
          }
        });
      }
    }), null);
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
              var _el$126 = _tmpl$14(), _el$127 = _el$126.firstChild; _el$127.nextSibling;
              return _el$126;
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
              var _el$129 = _tmpl$14(), _el$130 = _el$129.firstChild; _el$130.nextSibling;
              return _el$129;
            })();
          },
          get children() {
            var _el$66 = _tmpl$5();
            insert(_el$66, createComponent(Show, {
              get when() {
                return selected();
              },
              children: (cm) => createComponent(CommandPreview, {
                label: "Equivalent kubectl command",
                defaultCollapsed: true,
                get command() {
                  return `kubectl apply -f - -n ${cm().namespace || "default"}  # YAML from editor is sent via Kubernetes API`;
                },
                description: "This is an equivalent kubectl-style view of the ConfigMap update. The actual change is applied via Kubernetes API."
              })
            }), null);
            insert(_el$66, createComponent(YAMLEditor, {
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
            return _el$66;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "configmap",
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
      title: "Delete ConfigMap",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the ConfigMap "${selected().name}"?` : "Are you sure you want to delete this ConfigMap?";
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
      resourceType: "ConfigMaps",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedConfigMaps = bulk.getSelectedItems(filteredAndSorted());
        for (const cm of selectedConfigMaps) {
          try {
            await api.deleteConfigMap(cm.name, cm.namespace);
          } catch (error) {
            console.error(`Failed to delete ConfigMap ${cm.namespace}/${cm.name}:`, error);
            addNotification(`Failed to delete ConfigMap ${cm.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        refetch();
        addNotification(`Successfully deleted ${selectedConfigMaps.length} ConfigMap(s)`, "success");
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$26 = getThemeBackground(), _v$27 = `1px solid ${getThemeBorderColor()}`;
      _v$26 !== _p$.e && setStyleProperty(_el$27, "background", _p$.e = _v$26);
      _v$27 !== _p$.t && setStyleProperty(_el$27, "border", _p$.t = _v$27);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$20.value = search());
    createRenderEffect(() => _el$21.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { ConfigMaps as default };
//# sourceMappingURL=ConfigMaps-BroK-vwC.js.map
