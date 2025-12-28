import { c as createSignal, a as createMemo, o as onMount, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, S as Show, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces, v as delegateEvents } from './index-B8I71-mz.js';
import { c as createCachedResource } from './resourceCache-P2tk5pf3.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-Cv9JHSq7.js';
import { Y as YAMLViewer } from './YAMLViewer-BH5fzWmG.js';
import { Y as YAMLEditor } from './YAMLEditor-DeL5BHL5.js';
import { D as DescribeModal } from './DescribeModal-BOrOE6vF.js';
import { C as ConfirmationModal } from './ConfirmationModal-BOUoNqd5.js';
import { R as RelatedResources } from './RelatedResources-rUnE1-tT.js';
import { A as ActionMenu } from './ActionMenu-F4cRW3cz.js';
import { u as useBulkSelection, S as SelectAllCheckbox, a as SelectionCheckbox, B as BulkActions, b as BulkDeleteModal } from './useBulkSelection-CgTI3QZq.js';
import './workload-navigation-Cle66AyL.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class=whitespace-nowrap style="width:40px;padding:0 8px"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class=whitespace-nowrap>Pod Selector</th><th class=whitespace-nowrap>Ingress</th><th class=whitespace-nowrap>Egress</th><th class=whitespace-nowrap>Policy Types</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style=background:var(--bg-secondary)><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> policies</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last`), _tmpl$4 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>Network Policies</h1><p class=text-xs style=color:var(--text-secondary)>View and manage Kubernetes Network Policies for controlling pod-to-pod communication</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><button class=icon-btn title="Refresh Network Policies"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading network policies...`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td colspan=9 class="text-center py-8"style=color:var(--text-muted)>No network policies found`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`), _tmpl$0 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Ingress Rules</h3><div class=space-y-4>`), _tmpl$10 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Egress Rules</h3><div class=space-y-4>`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6><div><h3 class="text-sm font-semibold mb-3"style=color:var(--text-secondary)>Basic Information</h3><div class="grid grid-cols-2 md:grid-cols-4 gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Policy Types</div><div class=text-sm style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Ingress Rules</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Egress Rules</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Age</div><div style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg col-span-2"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Pod Selector</div><div class="text-sm break-all"style=color:var(--text-primary)></div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-xs style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div></div></div><div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3"><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=YAML><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg><span>YAML</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Describe><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>Describe</span></button><button class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Edit><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Edit</span></button><button class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"title=Delete><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg><span>Delete`), _tmpl$12 = /* @__PURE__ */ template(`<div class=mb-2><div class="text-xs mb-1"style=color:var(--text-muted)>Ports:`), _tmpl$13 = /* @__PURE__ */ template(`<div><div class="text-xs mb-1"style=color:var(--text-muted)>From:`), _tmpl$14 = /* @__PURE__ */ template(`<div class="rounded-lg border p-4"style=border-color:var(--border-color);background:var(--bg-secondary)><div class="text-xs font-semibold mb-2"style=color:var(--text-secondary)>Rule `), _tmpl$15 = /* @__PURE__ */ template(`<div class="text-sm ml-2"style=color:var(--text-primary)>/`), _tmpl$16 = /* @__PURE__ */ template(`<div class="text-sm ml-2"style=color:var(--text-primary)>`), _tmpl$17 = /* @__PURE__ */ template(`<div><div class="text-xs mb-1"style=color:var(--text-muted)>To:`);
const NetworkPolicies = () => {
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
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("networkpolicies-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("networkpolicies-font-family") || "Monaco");
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
    localStorage.setItem("networkpolicies-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("networkpolicies-font-family", family);
  };
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const policiesCache = createCachedResource("networkpolicies", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const policies2 = await api.getNetworkPolicies(namespaceParam);
      return policies2;
    } catch (error) {
      console.error("[NetworkPolicies] Error fetching policies:", error);
      addNotification(`❌ Failed to fetch network policies: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    backgroundRefresh: true
  });
  const policies = createMemo(() => policiesCache.data() || []);
  onMount(() => {
    if (!policiesCache.data()) {
      policiesCache.refetch();
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getNetworkPolicyYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch network policy YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleEdit = async (np) => {
    setSelected(np);
    setYamlKey(`${np.name}|${np.namespace}`);
    setShowEdit(true);
  };
  const handleSaveYAML = async (yaml) => {
    const np = selected();
    if (!np) return;
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
      label: `Apply NetworkPolicy YAML: ${np.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: np.namespace,
      context: status.context,
      userAction: "networkpolicies-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "networkpolicy",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => policiesCache.refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const np = selected();
    if (!np) return;
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
      label: `Dry run NetworkPolicy YAML: ${np.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: np.namespace,
      context: status.context,
      userAction: "networkpolicies-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "networkpolicy",
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
    let all = policies() || [];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((p) => p.name.toLowerCase().includes(query) || p.namespace.toLowerCase().includes(query) || p.selector.toLowerCase().includes(query));
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
        case "age":
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return all;
  });
  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedPolicies = createMemo(() => {
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
    const np = selected();
    if (!np) return;
    setDeleting(true);
    try {
      await api.deleteNetworkPolicy(np.name, np.namespace);
      addNotification(`Network policy ${np.name} deleted successfully`, "success");
      policiesCache.refetch();
      setSelected(null);
      setShowDeleteConfirm(false);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to delete network policy:", error);
      addNotification(`Failed to delete network policy: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setDeleting(false);
    }
  };
  const deleteNetworkPolicy = (np) => {
    setSelected(np);
    setShowDeleteConfirm(true);
  };
  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(paginatedPolicies());
    try {
      await Promise.all(itemsToDelete.map((np) => api.deleteNetworkPolicy(np.name, np.namespace)));
      addNotification(`Successfully deleted ${itemsToDelete.length} Network Policy(s)`, "success");
      bulk.deselectAll();
      policiesCache.refetch();
    } catch (error) {
      console.error("Failed to delete network policies:", error);
      addNotification(`Failed to delete network policies: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  return (() => {
    var _el$4 = _tmpl$5(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$5.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$14 = _el$13.nextSibling, _el$15 = _el$11.nextSibling;
    _el$0.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$1.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$10.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      policiesCache.refetch();
    };
    _el$13.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$14.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$15, createComponent(Show, {
      get when() {
        return !policiesCache.loading() || policiesCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$54 = _tmpl$6(), _el$55 = _el$54.firstChild; _el$55.nextSibling;
          return _el$54;
        })();
      },
      get children() {
        return [(() => {
          var _el$16 = _tmpl$2(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$21.firstChild; _el$22.firstChild; var _el$24 = _el$21.nextSibling, _el$25 = _el$24.firstChild; _el$25.firstChild; var _el$27 = _el$24.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.firstChild; _el$32.firstChild; var _el$34 = _el$18.nextSibling;
          insert(_el$20, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === paginatedPolicies().length)() && paginatedPolicies().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < paginatedPolicies().length;
            },
            onChange: () => {
              if (bulk.selectedCount() === paginatedPolicies().length) {
                bulk.deselectAll();
              } else {
                bulk.selectAll(paginatedPolicies());
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
          _el$31.$$click = () => handleSort("age");
          insert(_el$32, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$34, createComponent(For, {
            get each() {
              return paginatedPolicies();
            },
            get fallback() {
              return (() => {
                var _el$57 = _tmpl$7(); _el$57.firstChild;
                return _el$57;
              })();
            },
            children: (np) => {
              return (() => {
                var _el$59 = _tmpl$8(), _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$61.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$64.nextSibling, _el$66 = _el$65.nextSibling, _el$67 = _el$66.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.nextSibling;
                insert(_el$60, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(np);
                  },
                  onChange: () => bulk.toggleSelection(np)
                }));
                _el$62.$$click = () => {
                  setSelected(np);
                  setShowDetails(true);
                };
                insert(_el$62, (() => {
                  var _c$ = memo(() => np.name.length > 40);
                  return () => _c$() ? np.name.slice(0, 37) + "..." : np.name;
                })());
                insert(_el$63, () => np.namespace);
                insert(_el$64, () => np.selector);
                insert(_el$65, () => np.ingress);
                insert(_el$66, () => np.egress);
                insert(_el$67, () => np.policyTypes?.join(", ") || "-");
                insert(_el$68, () => np.age);
                _el$69.$$click = (e) => e.stopPropagation();
                insert(_el$69, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(np);
                      setYamlKey(`${np.name}|${np.namespace}`);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => handleEdit(np)
                  }, {
                    label: "Describe",
                    icon: "info",
                    onClick: () => {
                      setSelected(np);
                      setShowDescribe(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => {
                      setSelected(np);
                      deleteNetworkPolicy(np);
                    },
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${fontSize()}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `${Math.max(24, fontSize() * 1.7)}px`, _v$24 = `${fontSize()}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `${fontSize()}px`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${fontSize()}px`, _v$31 = `${Math.max(24, fontSize() * 1.7)}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$10 !== _p$.e && setStyleProperty(_el$60, "height", _p$.e = _v$10);
                  _v$11 !== _p$.t && setStyleProperty(_el$60, "line-height", _p$.t = _v$11);
                  _v$12 !== _p$.a && setStyleProperty(_el$61, "font-size", _p$.a = _v$12);
                  _v$13 !== _p$.o && setStyleProperty(_el$61, "height", _p$.o = _v$13);
                  _v$14 !== _p$.i && setStyleProperty(_el$61, "line-height", _p$.i = _v$14);
                  _v$15 !== _p$.n && setStyleProperty(_el$63, "font-size", _p$.n = _v$15);
                  _v$16 !== _p$.s && setStyleProperty(_el$63, "height", _p$.s = _v$16);
                  _v$17 !== _p$.h && setStyleProperty(_el$63, "line-height", _p$.h = _v$17);
                  _v$18 !== _p$.r && setStyleProperty(_el$64, "font-size", _p$.r = _v$18);
                  _v$19 !== _p$.d && setStyleProperty(_el$64, "height", _p$.d = _v$19);
                  _v$20 !== _p$.l && setStyleProperty(_el$64, "line-height", _p$.l = _v$20);
                  _v$21 !== _p$.u && setStyleProperty(_el$65, "font-size", _p$.u = _v$21);
                  _v$22 !== _p$.c && setStyleProperty(_el$65, "height", _p$.c = _v$22);
                  _v$23 !== _p$.w && setStyleProperty(_el$65, "line-height", _p$.w = _v$23);
                  _v$24 !== _p$.m && setStyleProperty(_el$66, "font-size", _p$.m = _v$24);
                  _v$25 !== _p$.f && setStyleProperty(_el$66, "height", _p$.f = _v$25);
                  _v$26 !== _p$.y && setStyleProperty(_el$66, "line-height", _p$.y = _v$26);
                  _v$27 !== _p$.g && setStyleProperty(_el$67, "font-size", _p$.g = _v$27);
                  _v$28 !== _p$.p && setStyleProperty(_el$67, "height", _p$.p = _v$28);
                  _v$29 !== _p$.b && setStyleProperty(_el$67, "line-height", _p$.b = _v$29);
                  _v$30 !== _p$.T && setStyleProperty(_el$68, "font-size", _p$.T = _v$30);
                  _v$31 !== _p$.A && setStyleProperty(_el$68, "height", _p$.A = _v$31);
                  _v$32 !== _p$.O && setStyleProperty(_el$68, "line-height", _p$.O = _v$32);
                  _v$33 !== _p$.I && setStyleProperty(_el$69, "height", _p$.I = _v$33);
                  _v$34 !== _p$.S && setStyleProperty(_el$69, "line-height", _p$.S = _v$34);
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
                  S: void 0
                });
                return _el$59;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$17, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$17, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$16;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$35 = _tmpl$3(), _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$41 = _el$37.nextSibling, _el$38 = _el$41.nextSibling, _el$42 = _el$38.nextSibling, _el$39 = _el$42.nextSibling, _el$43 = _el$39.nextSibling; _el$43.nextSibling; var _el$44 = _el$36.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.firstChild, _el$50 = _el$48.nextSibling; _el$50.nextSibling; var _el$51 = _el$47.nextSibling, _el$52 = _el$51.nextSibling;
            insert(_el$36, () => (currentPage() - 1) * pageSize() + 1, _el$41);
            insert(_el$36, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$42);
            insert(_el$36, () => filteredAndSorted().length, _el$43);
            _el$45.$$click = () => setCurrentPage(1);
            _el$46.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$47, currentPage, _el$50);
            insert(_el$47, totalPages, null);
            _el$51.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$52.$$click = () => setCurrentPage(totalPages());
            createRenderEffect((_p$) => {
              var _v$5 = `1px solid ${getThemeBorderColor()}`, _v$6 = currentPage() === 1, _v$7 = currentPage() === 1, _v$8 = currentPage() === totalPages(), _v$9 = currentPage() === totalPages();
              _v$5 !== _p$.e && setStyleProperty(_el$35, "borderTop", _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$45.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$46.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$51.disabled = _p$.o = _v$8);
              _v$9 !== _p$.i && (_el$52.disabled = _p$.i = _v$9);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            return _el$35;
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
              var _el$70 = _tmpl$9(), _el$71 = _el$70.firstChild; _el$71.nextSibling;
              return _el$70;
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
              var _el$73 = _tmpl$9(), _el$74 = _el$73.firstChild; _el$74.nextSibling;
              return _el$73;
            })();
          },
          get children() {
            var _el$53 = _tmpl$4();
            insert(_el$53, createComponent(YAMLEditor, {
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
            return _el$53;
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
        return `NetworkPolicy: ${selected()?.name}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return selected();
          },
          get children() {
            return (() => {
              const [npDetails] = createResource(() => selected() ? {
                name: selected().name,
                ns: selected().namespace
              } : null, async (params) => {
                if (!params) return null;
                return api.getNetworkPolicyDetails(params.name, params.ns);
              });
              return (() => {
                var _el$76 = _tmpl$11(), _el$77 = _el$76.firstChild, _el$78 = _el$77.firstChild, _el$79 = _el$78.nextSibling, _el$80 = _el$79.firstChild, _el$81 = _el$80.firstChild, _el$82 = _el$81.nextSibling, _el$84 = _el$80.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling, _el$88 = _el$84.nextSibling, _el$89 = _el$88.firstChild, _el$90 = _el$89.nextSibling, _el$92 = _el$88.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$93.nextSibling, _el$95 = _el$92.nextSibling, _el$96 = _el$95.firstChild, _el$97 = _el$96.nextSibling, _el$99 = _el$95.nextSibling, _el$100 = _el$99.firstChild, _el$101 = _el$100.nextSibling, _el$108 = _el$77.nextSibling, _el$109 = _el$108.firstChild, _el$110 = _el$109.nextSibling, _el$111 = _el$110.nextSibling, _el$112 = _el$111.nextSibling;
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return memo(() => !!!npDetails.loading)() && npDetails();
                  },
                  children: (details) => (details().policyTypes || selected()?.policyTypes || []).join(", ") || "-"
                }), null);
                insert(_el$82, createComponent(Show, {
                  get when() {
                    return npDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$86, createComponent(Show, {
                  get when() {
                    return memo(() => !!!npDetails.loading)() && npDetails();
                  },
                  children: (details) => (details().ingressRules || []).length || selected()?.ingress || 0
                }), null);
                insert(_el$86, createComponent(Show, {
                  get when() {
                    return npDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return memo(() => !!!npDetails.loading)() && npDetails();
                  },
                  children: (details) => (details().egressRules || []).length || selected()?.egress || 0
                }), null);
                insert(_el$90, createComponent(Show, {
                  get when() {
                    return npDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$94, () => selected()?.age || "-");
                insert(_el$97, createComponent(Show, {
                  get when() {
                    return memo(() => !!!npDetails.loading)() && npDetails();
                  },
                  children: (details) => {
                    const selector = details().podSelector || {};
                    return Object.keys(selector).length > 0 ? Object.entries(selector).map(([k, v]) => `${k}=${v}`).join(", ") : selected()?.selector || "-";
                  }
                }), null);
                insert(_el$97, createComponent(Show, {
                  get when() {
                    return npDetails.loading;
                  },
                  get children() {
                    return _tmpl$0();
                  }
                }), null);
                insert(_el$101, () => selected()?.namespace);
                insert(_el$76, createComponent(Show, {
                  get when() {
                    return npDetails();
                  },
                  get children() {
                    return createComponent(RelatedResources, {
                      kind: "networkpolicy",
                      get name() {
                        return npDetails().name;
                      },
                      get namespace() {
                        return npDetails().namespace;
                      },
                      get relatedData() {
                        return npDetails();
                      }
                    });
                  }
                }), _el$108);
                insert(_el$76, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!npDetails.loading && npDetails()?.ingressRules && Array.isArray(npDetails().ingressRules)))() && npDetails().ingressRules.length > 0;
                  },
                  get children() {
                    var _el$102 = _tmpl$1(), _el$103 = _el$102.firstChild, _el$104 = _el$103.nextSibling;
                    insert(_el$104, createComponent(For, {
                      get each() {
                        return npDetails().ingressRules;
                      },
                      children: (rule, index) => (() => {
                        var _el$113 = _tmpl$14(), _el$114 = _el$113.firstChild; _el$114.firstChild;
                        insert(_el$114, () => index() + 1, null);
                        insert(_el$113, createComponent(Show, {
                          get when() {
                            return memo(() => !!rule.ports)() && rule.ports.length > 0;
                          },
                          get children() {
                            var _el$116 = _tmpl$12(); _el$116.firstChild;
                            insert(_el$116, createComponent(For, {
                              get each() {
                                return rule.ports;
                              },
                              children: (port) => (() => {
                                var _el$120 = _tmpl$15(), _el$121 = _el$120.firstChild;
                                insert(_el$120, () => port.protocol || "TCP", _el$121);
                                insert(_el$120, () => port.port || "*", null);
                                return _el$120;
                              })()
                            }), null);
                            return _el$116;
                          }
                        }), null);
                        insert(_el$113, createComponent(Show, {
                          get when() {
                            return memo(() => !!rule.from)() && rule.from.length > 0;
                          },
                          get children() {
                            var _el$118 = _tmpl$13(); _el$118.firstChild;
                            insert(_el$118, createComponent(For, {
                              get each() {
                                return rule.from;
                              },
                              children: (from) => (() => {
                                var _el$122 = _tmpl$16();
                                insert(_el$122, createComponent(Show, {
                                  get when() {
                                    return from.podSelector;
                                  },
                                  get children() {
                                    return ["Pod: ", memo(() => Object.entries(from.podSelector || {}).map(([k, v]) => `${k}=${v}`).join(", "))];
                                  }
                                }), null);
                                insert(_el$122, createComponent(Show, {
                                  get when() {
                                    return from.namespaceSelector;
                                  },
                                  get children() {
                                    return ["Namespace: ", memo(() => Object.entries(from.namespaceSelector || {}).map(([k, v]) => `${k}=${v}`).join(", "))];
                                  }
                                }), null);
                                insert(_el$122, createComponent(Show, {
                                  get when() {
                                    return from.ipBlock;
                                  },
                                  get children() {
                                    return ["IP Block: ", memo(() => from.ipBlock.cidr), " ", memo(() => memo(() => !!(from.ipBlock.except && from.ipBlock.except.length > 0))() && `(except: ${from.ipBlock.except.join(", ")})`)];
                                  }
                                }), null);
                                return _el$122;
                              })()
                            }), null);
                            return _el$118;
                          }
                        }), null);
                        return _el$113;
                      })()
                    }));
                    return _el$102;
                  }
                }), _el$108);
                insert(_el$76, createComponent(Show, {
                  get when() {
                    return memo(() => !!(!npDetails.loading && npDetails()?.egressRules && Array.isArray(npDetails().egressRules)))() && npDetails().egressRules.length > 0;
                  },
                  get children() {
                    var _el$105 = _tmpl$10(), _el$106 = _el$105.firstChild, _el$107 = _el$106.nextSibling;
                    insert(_el$107, createComponent(For, {
                      get each() {
                        return npDetails().egressRules;
                      },
                      children: (rule, index) => (() => {
                        var _el$123 = _tmpl$14(), _el$124 = _el$123.firstChild; _el$124.firstChild;
                        insert(_el$124, () => index() + 1, null);
                        insert(_el$123, createComponent(Show, {
                          get when() {
                            return memo(() => !!rule.ports)() && rule.ports.length > 0;
                          },
                          get children() {
                            var _el$126 = _tmpl$12(); _el$126.firstChild;
                            insert(_el$126, createComponent(For, {
                              get each() {
                                return rule.ports;
                              },
                              children: (port) => (() => {
                                var _el$130 = _tmpl$15(), _el$131 = _el$130.firstChild;
                                insert(_el$130, () => port.protocol || "TCP", _el$131);
                                insert(_el$130, () => port.port || "*", null);
                                return _el$130;
                              })()
                            }), null);
                            return _el$126;
                          }
                        }), null);
                        insert(_el$123, createComponent(Show, {
                          get when() {
                            return memo(() => !!rule.to)() && rule.to.length > 0;
                          },
                          get children() {
                            var _el$128 = _tmpl$17(); _el$128.firstChild;
                            insert(_el$128, createComponent(For, {
                              get each() {
                                return rule.to;
                              },
                              children: (to) => (() => {
                                var _el$132 = _tmpl$16();
                                insert(_el$132, createComponent(Show, {
                                  get when() {
                                    return to.podSelector;
                                  },
                                  get children() {
                                    return ["Pod: ", memo(() => Object.entries(to.podSelector || {}).map(([k, v]) => `${k}=${v}`).join(", "))];
                                  }
                                }), null);
                                insert(_el$132, createComponent(Show, {
                                  get when() {
                                    return to.namespaceSelector;
                                  },
                                  get children() {
                                    return ["Namespace: ", memo(() => Object.entries(to.namespaceSelector || {}).map(([k, v]) => `${k}=${v}`).join(", "))];
                                  }
                                }), null);
                                insert(_el$132, createComponent(Show, {
                                  get when() {
                                    return to.ipBlock;
                                  },
                                  get children() {
                                    return ["IP Block: ", memo(() => to.ipBlock.cidr), " ", memo(() => memo(() => !!(to.ipBlock.except && to.ipBlock.except.length > 0))() && `(except: ${to.ipBlock.except.join(", ")})`)];
                                  }
                                }), null);
                                return _el$132;
                              })()
                            }), null);
                            return _el$128;
                          }
                        }), null);
                        return _el$123;
                      })()
                    }));
                    return _el$105;
                  }
                }), _el$108);
                _el$109.$$click = () => {
                  setShowDetails(false);
                  setShowYaml(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$110.$$click = () => {
                  setShowDetails(false);
                  setShowDescribe(true);
                };
                _el$111.$$click = () => {
                  setShowDetails(false);
                  setShowEdit(true);
                  setYamlKey(`${selected().name}|${selected().namespace}`);
                };
                _el$112.$$click = (e) => {
                  e.stopPropagation();
                  deleteNetworkPolicy(selected());
                };
                return _el$76;
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
      resourceType: "networkpolicy",
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
      title: "Delete NetworkPolicy",
      get message() {
        return memo(() => !!selected())() ? `Are you sure you want to delete the NetworkPolicy "${selected().name}"?` : "Are you sure you want to delete this NetworkPolicy?";
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
      resourceType: "policies"
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      onConfirm: handleBulkDelete,
      resourceType: "Network Policies",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$0 = getThemeBackground(), _v$1 = `1px solid ${getThemeBorderColor()}`;
      _v$0 !== _p$.e && setStyleProperty(_el$15, "background", _p$.e = _v$0);
      _v$1 !== _p$.t && setStyleProperty(_el$15, "border", _p$.t = _v$1);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = fontSize());
    createRenderEffect(() => _el$1.value = fontFamily());
    createRenderEffect(() => _el$13.value = search());
    createRenderEffect(() => _el$14.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { NetworkPolicies as default };
//# sourceMappingURL=NetworkPolicies-h2hqutzP.js.map
