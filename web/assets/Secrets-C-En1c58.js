import { c as createSignal, a as createMemo, o as onMount, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, g as className, M as Modal, e as setAttribute, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces, v as delegateEvents } from './index-Bh-O-sIc.js';
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

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4 mb-4"style="background:var(--error-bg);border:1px solid var(--error-color)"><div class="flex items-center gap-2"><span style=color:var(--error-color)>❌</span><span style=color:var(--error-color)>Error loading Secrets: `), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Namespace </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Type </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Data </div></th><th class="cursor-pointer select-none whitespace-nowrap"style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> Secrets</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"style=background:var(--bg-primary);minHeight:100%><div class="flex items-center justify-between"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Secrets</h1><p class=text-xs style=color:var(--text-secondary)>Sensitive data storage</p></div><div class="flex items-center gap-3"><input type=text placeholder="Search secrets..."class="px-3 py-2 rounded-lg bg-[var(--bg-alt)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"style="border:1px solid var(--border-color);color:var(--text-primary)"><button class="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">Refresh</button></div></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading Secrets...`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td colspan=7 class="text-center py-8"style=color:var(--text-muted)>No secrets found`), _tmpl$9 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$0 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$1 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$10 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Data</h3><div class="rounded-lg border overflow-x-auto"style=border-color:var(--border-color);background:var(--bg-secondary)><table class=w-full><thead><tr style=background:var(--bg-tertiary)><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Key</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Value</th><th class="px-4 py-2 text-left text-xs font-semibold"style=color:var(--text-secondary)>Actions</th></tr></thead><tbody>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Data Keys</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Type</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$12 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21">`), _tmpl$13 = /* @__PURE__ */ template(`<tr class=border-b style=border-color:var(--border-color)><td class="px-4 py-2 text-sm font-mono"style=color:var(--text-primary)></td><td class="px-4 py-2 text-sm font-mono break-all"style=color:var(--text-primary)><div class="flex items-center gap-2"><pre class=whitespace-pre-wrap style=max-width:500px;overflow:auto></pre></div></td><td class="px-4 py-2"><div class="flex items-center gap-2"><button class="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"></button><button class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors"title="Copy decoded value to clipboard"style=background:var(--accent-primary);color:white><svg class="w-3 h-3"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>Copy`), _tmpl$14 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z">`);
const Secrets = () => {
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
  const [fontSize] = createSignal(parseInt(localStorage.getItem("secrets-font-size") || "14"));
  const [fontFamily] = createSignal(localStorage.getItem("secrets-font-family") || "Monaco");
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
  const [visibleSecrets, setVisibleSecrets] = createSignal(/* @__PURE__ */ new Set());
  const toggleSecretVisibility = (secretKey) => {
    const visible = new Set(visibleSecrets());
    if (visible.has(secretKey)) {
      visible.delete(secretKey);
    } else {
      visible.add(secretKey);
    }
    setVisibleSecrets(visible);
  };
  const decodeBase64 = (value) => {
    try {
      return atob(value);
    } catch (e) {
      return value;
    }
  };
  const copyDecodedValue = (value) => {
    const decoded = decodeBase64(value);
    navigator.clipboard.writeText(decoded).then(() => {
      addNotification("Decoded value copied to clipboard", "success");
    }).catch(() => {
      addNotification("Failed to copy to clipboard", "error");
    });
  };
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const secretsCache = createCachedResource("secrets", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const secrets2 = await api.getSecrets(namespaceParam);
      return secrets2;
    } catch (error) {
      console.error("[Secrets] Error fetching secrets:", error);
      addNotification(`❌ Failed to fetch Secrets: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const secrets = createMemo(() => secretsCache.data() || []);
  const refetch = () => secretsCache.refetch();
  onMount(() => {
    if (!secretsCache.data()) {
      secretsCache.refetch();
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getSecretYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch secret YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const secret = selected();
    if (!secret) return;
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
      label: `Apply Secret YAML: ${secret.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: secret.namespace,
      context: status.context,
      userAction: "secrets-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "secrets",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const secret = selected();
    if (!secret) return;
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
      label: `Dry run Secret YAML: ${secret.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: secret.namespace,
      context: status.context,
      userAction: "secrets-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "secrets",
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
    let all = secrets() || [];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((s) => s.name.toLowerCase().includes(query) || s.namespace.toLowerCase().includes(query) || s.type.toLowerCase().includes(query));
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
        case "type":
          comparison = a.type.localeCompare(b.type);
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
    const secret = selected();
    if (!secret) return;
    setDeleting(true);
    try {
      await api.deleteSecret(secret.name, secret.namespace);
      addNotification(`Secret ${secret.name} deleted successfully`, "success");
      refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete secret:", error);
      addNotification(`Failed to delete secret: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteSecret = (secret) => {
    setSelected(secret);
    setShowDeleteConfirm(true);
  };
  const getTypeBadgeClass = (type) => {
    if (type.includes("tls")) return "badge-success";
    if (type.includes("Opaque")) return "badge-default";
    if (type.includes("helm")) return "badge-info";
    return "badge-default";
  };
  return (() => {
    var _el$4 = _tmpl$6(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$15 = _el$5.nextSibling;
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
      resourceType: "secrets"
    }), _el$5);
    _el$0.$$input = (e) => setSearch(e.currentTarget.value);
    _el$1.$$click = () => refetch();
    insert(_el$4, createComponent(Show, {
      get when() {
        return secretsCache.error();
      },
      get children() {
        var _el$10 = _tmpl$2(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling; _el$13.firstChild;
        insert(_el$13, () => secretsCache.error()?.message || "Unknown error", null);
        return _el$10;
      }
    }), _el$15);
    insert(_el$15, createComponent(Show, {
      get when() {
        return !secretsCache.loading() || secretsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$58 = _tmpl$7(), _el$59 = _el$58.firstChild; _el$59.nextSibling;
          return _el$58;
        })();
      },
      get children() {
        return [(() => {
          var _el$16 = _tmpl$3(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild; _el$22.firstChild; var _el$24 = _el$21.nextSibling, _el$25 = _el$24.firstChild; _el$25.firstChild; var _el$27 = _el$24.nextSibling, _el$28 = _el$27.firstChild; _el$28.firstChild; var _el$30 = _el$27.nextSibling, _el$31 = _el$30.firstChild; _el$31.firstChild; var _el$33 = _el$30.nextSibling, _el$34 = _el$33.firstChild; _el$34.firstChild; var _el$36 = _el$33.nextSibling, _el$37 = _el$18.nextSibling;
          insert(_el$20, createComponent(SelectAllCheckbox, {
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
          _el$21.$$click = () => handleSort("name");
          insert(_el$22, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$24.$$click = () => handleSort("namespace");
          insert(_el$25, createComponent(SortIcon, {
            field: "namespace"
          }), null);
          _el$27.$$click = () => handleSort("type");
          insert(_el$28, createComponent(SortIcon, {
            field: "type"
          }), null);
          _el$30.$$click = () => handleSort("data");
          insert(_el$31, createComponent(SortIcon, {
            field: "data"
          }), null);
          _el$33.$$click = () => handleSort("age");
          insert(_el$34, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$37, createComponent(For, {
            get each() {
              return paginated();
            },
            get fallback() {
              return (() => {
                var _el$61 = _tmpl$8(); _el$61.firstChild;
                return _el$61;
              })();
            },
            children: (secret) => {
              return (() => {
                var _el$63 = _tmpl$9(), _el$64 = _el$63.firstChild, _el$65 = _el$64.nextSibling, _el$66 = _el$65.firstChild, _el$67 = _el$65.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$68.nextSibling, _el$71 = _el$70.nextSibling, _el$72 = _el$71.nextSibling;
                insert(_el$64, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(secret);
                  },
                  onChange: () => bulk.toggleSelection(secret)
                }));
                _el$66.$$click = () => {
                  setSelected(secret);
                  setShowDetails(true);
                };
                insert(_el$66, (() => {
                  var _c$ = memo(() => secret.name.length > 40);
                  return () => _c$() ? secret.name.slice(0, 37) + "..." : secret.name;
                })());
                insert(_el$67, () => secret.namespace);
                insert(_el$69, () => secret.type);
                insert(_el$70, () => secret.data);
                insert(_el$71, () => secret.age);
                insert(_el$72, createComponent(ActionMenu, {
                  actions: [{
                    label: "View Data",
                    icon: "describe",
                    onClick: () => {
                      setSelected(secret);
                      setShowDetails(true);
                    }
                  }, {
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(secret);
                      setYamlKey(`${secret.name}|${secret.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(secret);
                      setYamlKey(`${secret.name}|${secret.namespace}`);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Describe",
                    icon: "describe",
                    onClick: () => {
                      setSelected(secret);
                      setShowDescribe(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(secret);
                      deleteSecret(secret);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$31 = `${fontSize()}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${fontSize()}px`, _v$35 = `${Math.max(24, fontSize() * 1.7)}px`, _v$36 = `${Math.max(24, fontSize() * 1.7)}px`, _v$37 = `${fontSize()}px`, _v$38 = `${Math.max(24, fontSize() * 1.7)}px`, _v$39 = `${Math.max(24, fontSize() * 1.7)}px`, _v$40 = `badge ${getTypeBadgeClass(secret.type)}`, _v$41 = `${fontSize()}px`, _v$42 = `${Math.max(24, fontSize() * 1.7)}px`, _v$43 = `${Math.max(24, fontSize() * 1.7)}px`, _v$44 = `${fontSize()}px`, _v$45 = `${Math.max(24, fontSize() * 1.7)}px`, _v$46 = `${Math.max(24, fontSize() * 1.7)}px`, _v$47 = `${Math.max(24, fontSize() * 1.7)}px`, _v$48 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$31 !== _p$.e && setStyleProperty(_el$65, "font-size", _p$.e = _v$31);
                  _v$32 !== _p$.t && setStyleProperty(_el$65, "height", _p$.t = _v$32);
                  _v$33 !== _p$.a && setStyleProperty(_el$65, "line-height", _p$.a = _v$33);
                  _v$34 !== _p$.o && setStyleProperty(_el$67, "font-size", _p$.o = _v$34);
                  _v$35 !== _p$.i && setStyleProperty(_el$67, "height", _p$.i = _v$35);
                  _v$36 !== _p$.n && setStyleProperty(_el$67, "line-height", _p$.n = _v$36);
                  _v$37 !== _p$.s && setStyleProperty(_el$68, "font-size", _p$.s = _v$37);
                  _v$38 !== _p$.h && setStyleProperty(_el$68, "height", _p$.h = _v$38);
                  _v$39 !== _p$.r && setStyleProperty(_el$68, "line-height", _p$.r = _v$39);
                  _v$40 !== _p$.d && className(_el$69, _p$.d = _v$40);
                  _v$41 !== _p$.l && setStyleProperty(_el$70, "font-size", _p$.l = _v$41);
                  _v$42 !== _p$.u && setStyleProperty(_el$70, "height", _p$.u = _v$42);
                  _v$43 !== _p$.c && setStyleProperty(_el$70, "line-height", _p$.c = _v$43);
                  _v$44 !== _p$.w && setStyleProperty(_el$71, "font-size", _p$.w = _v$44);
                  _v$45 !== _p$.m && setStyleProperty(_el$71, "height", _p$.m = _v$45);
                  _v$46 !== _p$.f && setStyleProperty(_el$71, "line-height", _p$.f = _v$46);
                  _v$47 !== _p$.y && setStyleProperty(_el$72, "height", _p$.y = _v$47);
                  _v$48 !== _p$.g && setStyleProperty(_el$72, "line-height", _p$.g = _v$48);
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
                  g: void 0
                });
                return _el$63;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground(), _v$5 = `${Math.max(24, fontSize() * 1.7)}px`, _v$6 = getFontFamilyCSS(fontFamily()), _v$7 = `${fontSize()}px`, _v$8 = `${Math.max(24, fontSize() * 1.7)}px`, _v$9 = `${fontSize()}px`, _v$0 = `${Math.max(24, fontSize() * 1.7)}px`, _v$1 = `${Math.max(24, fontSize() * 1.7)}px`, _v$10 = `${fontSize()}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${Math.max(24, fontSize() * 1.7)}px`, _v$13 = `${fontSize()}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${Math.max(24, fontSize() * 1.7)}px`, _v$16 = `${fontSize()}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${Math.max(24, fontSize() * 1.7)}px`, _v$19 = `${fontSize()}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = `${fontSize()}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${Math.max(24, fontSize() * 1.7)}px`;
            _v$3 !== _p$.e && setStyleProperty(_el$17, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$17, "background", _p$.t = _v$4);
            _v$5 !== _p$.a && setStyleProperty(_el$19, "height", _p$.a = _v$5);
            _v$6 !== _p$.o && setStyleProperty(_el$19, "font-family", _p$.o = _v$6);
            _v$7 !== _p$.i && setStyleProperty(_el$19, "font-size", _p$.i = _v$7);
            _v$8 !== _p$.n && setStyleProperty(_el$19, "line-height", _p$.n = _v$8);
            _v$9 !== _p$.s && setStyleProperty(_el$21, "font-size", _p$.s = _v$9);
            _v$0 !== _p$.h && setStyleProperty(_el$21, "height", _p$.h = _v$0);
            _v$1 !== _p$.r && setStyleProperty(_el$21, "line-height", _p$.r = _v$1);
            _v$10 !== _p$.d && setStyleProperty(_el$24, "font-size", _p$.d = _v$10);
            _v$11 !== _p$.l && setStyleProperty(_el$24, "height", _p$.l = _v$11);
            _v$12 !== _p$.u && setStyleProperty(_el$24, "line-height", _p$.u = _v$12);
            _v$13 !== _p$.c && setStyleProperty(_el$27, "font-size", _p$.c = _v$13);
            _v$14 !== _p$.w && setStyleProperty(_el$27, "height", _p$.w = _v$14);
            _v$15 !== _p$.m && setStyleProperty(_el$27, "line-height", _p$.m = _v$15);
            _v$16 !== _p$.f && setStyleProperty(_el$30, "font-size", _p$.f = _v$16);
            _v$17 !== _p$.y && setStyleProperty(_el$30, "height", _p$.y = _v$17);
            _v$18 !== _p$.g && setStyleProperty(_el$30, "line-height", _p$.g = _v$18);
            _v$19 !== _p$.p && setStyleProperty(_el$33, "font-size", _p$.p = _v$19);
            _v$20 !== _p$.b && setStyleProperty(_el$33, "height", _p$.b = _v$20);
            _v$21 !== _p$.T && setStyleProperty(_el$33, "line-height", _p$.T = _v$21);
            _v$22 !== _p$.A && setStyleProperty(_el$36, "font-size", _p$.A = _v$22);
            _v$23 !== _p$.O && setStyleProperty(_el$36, "height", _p$.O = _v$23);
            _v$24 !== _p$.I && setStyleProperty(_el$36, "line-height", _p$.I = _v$24);
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
          return _el$16;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$38 = _tmpl$4(), _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$44 = _el$40.nextSibling, _el$41 = _el$44.nextSibling, _el$45 = _el$41.nextSibling, _el$42 = _el$45.nextSibling, _el$46 = _el$42.nextSibling; _el$46.nextSibling; var _el$47 = _el$39.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$49.nextSibling, _el$51 = _el$50.firstChild, _el$53 = _el$51.nextSibling; _el$53.nextSibling; var _el$54 = _el$50.nextSibling, _el$55 = _el$54.nextSibling, _el$56 = _el$55.nextSibling;
            insert(_el$39, () => (currentPage() - 1) * pageSize() + 1, _el$44);
            insert(_el$39, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$45);
            insert(_el$39, () => filteredAndSorted().length, _el$46);
            _el$48.$$click = () => setCurrentPage(1);
            _el$49.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$50, currentPage, _el$53);
            insert(_el$50, totalPages, null);
            _el$54.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$55.$$click = () => setCurrentPage(totalPages());
            _el$56.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$25 = currentPage() === 1, _v$26 = currentPage() === 1, _v$27 = currentPage() === totalPages(), _v$28 = currentPage() === totalPages();
              _v$25 !== _p$.e && (_el$48.disabled = _p$.e = _v$25);
              _v$26 !== _p$.t && (_el$49.disabled = _p$.t = _v$26);
              _v$27 !== _p$.a && (_el$54.disabled = _p$.a = _v$27);
              _v$28 !== _p$.o && (_el$55.disabled = _p$.o = _v$28);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$56.value = pageSize());
            return _el$38;
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
              var _el$73 = _tmpl$0(), _el$74 = _el$73.firstChild; _el$74.nextSibling;
              return _el$73;
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
              var _el$76 = _tmpl$0(), _el$77 = _el$76.firstChild; _el$77.nextSibling;
              return _el$76;
            })();
          },
          get children() {
            var _el$57 = _tmpl$5();
            insert(_el$57, createComponent(Show, {
              get when() {
                return selected();
              },
              children: (sec) => createComponent(CommandPreview, {
                label: "Equivalent kubectl command",
                defaultCollapsed: true,
                get command() {
                  return `kubectl apply -f - -n ${sec().namespace || "default"}  # YAML from editor is sent via Kubernetes API`;
                },
                description: "This is an equivalent kubectl-style view of the Secret update. The actual change is applied via Kubernetes API. Secret data is redacted in server logs."
              })
            }), null);
            insert(_el$57, createComponent(YAMLEditor, {
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
            return _el$57;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "secret",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace || "";
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
      title: "Delete Secret",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the Secret "${selected().name}"?` : "Are you sure you want to delete this Secret?";
      },
      get details() {
        return memo(() => !!selected())() ? [{
          label: "Name",
          value: selected().name
        }, {
          label: "Namespace",
          value: selected().namespace
        }, {
          label: "Type",
          value: selected().type
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
    insert(_el$4, createComponent(Modal, {
      get isOpen() {
        return showDetails();
      },
      onClose: () => {
        setShowDetails(false);
        setSelected(null);
      },
      get title() {
        return `Secret: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [secretDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getSecretDetails(params.name, params.ns);
              });
              const [secretData] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                const yaml = await api.getSecretYAML(params.name, params.ns);
                try {
                  const lines = yaml.yaml.split("\n");
                  const data = {};
                  let inDataSection = false;
                  let dataIndent = 0;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.match(/^data:\s*$/)) {
                      inDataSection = true;
                      dataIndent = 0;
                      continue;
                    }
                    if (inDataSection) {
                      const indent = line.search(/\S/);
                      const match = line.match(/^\s+([^:]+):\s*(.*)$/);
                      if (match) {
                        if (dataIndent === 0) {
                          dataIndent = indent;
                        }
                        const key = match[1].trim();
                        const value = match[2].trim();
                        if (key) {
                          data[key] = value;
                        }
                      } else if (indent !== -1 && dataIndent > 0 && indent < dataIndent) {
                        break;
                      }
                    }
                  }
                  return data;
                } catch (e) {
                  console.error("Failed to parse secret data:", e);
                }
                return {};
              });
              return (() => {
                var _el$79 = _tmpl$11(), _el$80 = _el$79.firstChild, _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$87 = _el$83.nextSibling, _el$88 = _el$87.firstChild, _el$89 = _el$88.nextSibling, _el$90 = _el$87.nextSibling, _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling, _el$93 = _el$90.nextSibling, _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling, _el$106 = _el$80.nextSibling, _el$107 = _el$106.firstChild, _el$108 = _el$107.nextSibling, _el$109 = _el$108.nextSibling, _el$110 = _el$109.nextSibling;
                insert(_el$85, createComponent(Show, {
                  get when() {
                    return memo(() => !!!secretDetails.loading)() && secretDetails();
                  },
                  children: (details) => details().dataKeys + details().stringKeys || selected()?.data || 0
                }), null);
                insert(_el$85, createComponent(Show, {
                  get when() {
                    return secretDetails.loading;
                  },
                  get children() {
                    return _tmpl$1();
                  }
                }), null);
                insert(_el$89, () => selected()?.type || "-");
                insert(_el$92, () => selected()?.age || "-");
                insert(_el$95, () => selected()?.namespace);
                insert(_el$79, createComponent(Show, {
                  get when() {
                    return secretDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "secret",
                      get name() {
                        return secretDetails().name;
                      },
                      get namespace() {
                        return secretDetails().namespace;
                      },
                      get relatedData() {
                        return secretDetails();
                      }
                    });
                  }
                }), _el$106);
                insert(_el$79, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!secretData.loading && secretData()))() && Object.keys(secretData()).length > 0;
                  },
                  get children() {
                    var _el$96 = _tmpl$10(), _el$97 = _el$96.firstChild, _el$98 = _el$97.nextSibling, _el$99 = _el$98.firstChild, _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild, _el$102 = _el$101.firstChild, _el$103 = _el$102.nextSibling; _el$103.nextSibling; var _el$105 = _el$100.nextSibling;
                    insert(_el$105, createComponent(For, {
                      get each() {
                        return Object.entries(secretData());
                      },
                      children: ([key, value]) => {
                        const secretKey = `${selected().name}/${key}`;
                        const isVisible = visibleSecrets().has(secretKey);
                        const decodedValue = decodeBase64(value);
                        return (() => {
                          var _el$111 = _tmpl$13(), _el$112 = _el$111.firstChild, _el$113 = _el$112.nextSibling, _el$114 = _el$113.firstChild, _el$115 = _el$114.firstChild, _el$116 = _el$113.nextSibling, _el$117 = _el$116.firstChild, _el$118 = _el$117.firstChild, _el$120 = _el$118.nextSibling;
                          insert(_el$112, key);
                          insert(_el$115, isVisible ? decodedValue : "••••••••••••••••••••••••••••");
                          _el$118.$$click = () => toggleSecretVisibility(secretKey);
                          setAttribute(_el$118, "title", isVisible ? "Hide value" : "Show value");
                          insert(_el$118, createComponent(Show, {
                            when: isVisible,
                            get fallback() {
                              return _tmpl$14();
                            },
                            get children() {
                              return _tmpl$12();
                            }
                          }));
                          _el$120.$$click = () => copyDecodedValue(value);
                          return _el$111;
                        })();
                      }
                    }));
                    return _el$96;
                  }
                }), _el$106);
                _el$107.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$108.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$109.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$110.$$click = (e) => {
                  e.stopPropagation();
                  deleteSecret(selected());
                };
                return _el$79;
              })();
            })();
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      resourceType: "Secrets",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      },
      onConfirm: async () => {
        const selectedSecrets = bulk.getSelectedItems(filteredAndSorted());
        for (const secret of selectedSecrets) {
          try {
            await api.deleteSecret(secret.name, secret.namespace);
          } catch (error) {
            console.error(`Failed to delete secret ${secret.namespace}/${secret.name}:`, error);
            addNotification(`Failed to delete secret ${secret.name}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
        bulk.deselectAll();
        refetch();
        addNotification(`Successfully deleted ${selectedSecrets.length} secret${selectedSecrets.length !== 1 ? "s" : ""}`, "success");
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$29 = getThemeBackground(), _v$30 = `1px solid ${getThemeBorderColor()}`;
      _v$29 !== _p$.e && setStyleProperty(_el$15, "background", _p$.e = _v$29);
      _v$30 !== _p$.t && setStyleProperty(_el$15, "border", _p$.t = _v$30);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$4;
  })();
};
delegateEvents(["input", "click"]);

export { Secrets as default };
//# sourceMappingURL=Secrets-C-En1c58.js.map
