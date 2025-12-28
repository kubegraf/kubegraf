import { c as createSignal, a as createMemo, o as onMount, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, g as className, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, v as delegateEvents } from './index-NnaOo1cf.js';
import { c as createCachedResource } from './resourceCache-DgXvRxiF.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-DuY4ZOBL.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { D as DescribeModal } from './DescribeModal-CnmW-EF9.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';
import { u as useBulkSelection, S as SelectAllCheckbox, a as SelectionCheckbox, B as BulkActions, b as BulkDeleteModal } from './useBulkSelection-yjZBpTKC.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4 mb-4"style="background:var(--error-bg);border:1px solid var(--error-color)"><div class="flex items-center gap-2"><span style=color:var(--error-color)>❌</span><span style=color:var(--error-color)>Error loading namespaces: `), _tmpl$3 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class=whitespace-nowrap style="width:40px;padding:0 8px"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Status </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> namespaces</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$5 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$6 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Namespaces</h1><p style=color:var(--text-secondary)>Cluster namespace management</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><button class=icon-btn title="Refresh Namespaces"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Active</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Terminating</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading namespaces...`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td colspan=5 class="text-center py-8"style=color:var(--text-muted)>No namespaces found`), _tmpl$9 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$0 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const Namespaces = () => {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("name");
  const [sortDirection, setSortDirection] = createSignal("asc");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("namespaces-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("namespaces-font-family") || "Monaco");
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
    localStorage.setItem("namespaces-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("namespaces-font-family", family);
  };
  const namespacesCache = createCachedResource("namespaces", async () => {
    setGlobalLoading(true);
    try {
      const namespaces2 = await api.getNamespaces();
      return namespaces2;
    } catch (error) {
      console.error("[Namespaces] Error fetching namespaces:", error);
      addNotification(`❌ Failed to fetch namespaces: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      throw error;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const namespaces = createMemo(() => {
    const data = namespacesCache.data();
    return data || [];
  });
  const refetch = () => namespacesCache.refetch();
  onMount(() => {
    if (!namespacesCache.data()) {
      namespacesCache.refetch();
    }
  });
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    try {
      const data = await api.getNamespaceYAML(key);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch namespace YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const ns = selected();
    if (!ns) return;
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
      label: `Apply Namespace YAML: ${ns.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: ns.name,
      context: status.context,
      userAction: "namespaces-apply-yaml",
      dryRun: false,
      allowClusterWide: true,
      resource: "namespaces",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const ns = selected();
    if (!ns) return;
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
      label: `Dry run Namespace YAML: ${ns.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: ns.name,
      context: status.context,
      userAction: "namespaces-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: true,
      resource: "namespaces",
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
    const data = namespaces();
    if (!data || !Array.isArray(data)) {
      return [];
    }
    let all = [...data];
    const query = search().toLowerCase();
    if (query) {
      all = all.filter((ns) => ns.name.toLowerCase().includes(query) || ns.status.toLowerCase().includes(query));
    }
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
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
  const paginatedNamespaces = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = namespaces() || [];
    return {
      total: all.length,
      active: all.filter((ns) => ns.status === "Active").length,
      terminating: all.filter((ns) => ns.status === "Terminating").length
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
  const deleteNamespace = async (ns) => {
    if (!confirm(`Are you sure you want to delete namespace "${ns.name}"? This will delete all resources in this namespace!`)) return;
    try {
      await api.deleteNamespace(ns.name);
      addNotification(`Namespace ${ns.name} deleted successfully`, "success");
      refetch();
    } catch (error) {
      console.error("Failed to delete namespace:", error);
      addNotification(`Failed to delete namespace: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(paginatedNamespaces());
    try {
      await Promise.all(itemsToDelete.map((ns) => api.deleteNamespace(ns.name)));
      addNotification(`Successfully deleted ${itemsToDelete.length} namespace(s)`, "success");
      bulk.deselectAll();
      refetch();
    } catch (error) {
      console.error("Failed to delete namespaces:", error);
      addNotification(`Failed to delete namespaces: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  return (() => {
    var _el$4 = _tmpl$6(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$5.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling, _el$29 = _el$11.nextSibling;
    _el$0.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$1.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    _el$10.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    insert(_el$14, () => statusCounts().total);
    insert(_el$17, () => statusCounts().active);
    insert(_el$20, () => statusCounts().terminating);
    _el$22.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$23.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$4, createComponent(Show, {
      get when() {
        return namespacesCache.error();
      },
      get children() {
        var _el$24 = _tmpl$2(), _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling; _el$27.firstChild;
        insert(_el$27, () => namespacesCache.error()?.message || "Unknown error", null);
        return _el$24;
      }
    }), _el$29);
    insert(_el$29, createComponent(Show, {
      get when() {
        return !namespacesCache.loading() || namespacesCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$65 = _tmpl$7(), _el$66 = _el$65.firstChild; _el$66.nextSibling;
          return _el$65;
        })();
      },
      get children() {
        return [(() => {
          var _el$30 = _tmpl$3(), _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild; _el$36.firstChild; var _el$38 = _el$35.nextSibling, _el$39 = _el$38.firstChild; _el$39.firstChild; var _el$41 = _el$38.nextSibling, _el$42 = _el$41.firstChild; _el$42.firstChild; var _el$44 = _el$32.nextSibling;
          insert(_el$34, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === paginatedNamespaces().length)() && paginatedNamespaces().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < paginatedNamespaces().length;
            },
            onChange: () => {
              if (bulk.selectedCount() === paginatedNamespaces().length) {
                bulk.deselectAll();
              } else {
                bulk.selectAll(paginatedNamespaces());
              }
            }
          }));
          _el$35.$$click = () => handleSort("name");
          insert(_el$36, createComponent(SortIcon, {
            field: "name"
          }), null);
          _el$38.$$click = () => handleSort("status");
          insert(_el$39, createComponent(SortIcon, {
            field: "status"
          }), null);
          _el$41.$$click = () => handleSort("age");
          insert(_el$42, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$44, createComponent(For, {
            get each() {
              return paginatedNamespaces();
            },
            get fallback() {
              return (() => {
                var _el$68 = _tmpl$8(); _el$68.firstChild;
                return _el$68;
              })();
            },
            children: (ns) => {
              return (() => {
                var _el$70 = _tmpl$9(), _el$71 = _el$70.firstChild, _el$72 = _el$71.nextSibling, _el$73 = _el$72.firstChild, _el$74 = _el$72.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$74.nextSibling, _el$77 = _el$76.nextSibling;
                insert(_el$71, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(ns);
                  },
                  onChange: () => bulk.toggleSelection(ns)
                }));
                _el$73.$$click = () => {
                  setSelected(ns);
                  setShowDescribe(true);
                };
                insert(_el$73, (() => {
                  var _c$ = memo(() => ns.name.length > 40);
                  return () => _c$() ? ns.name.slice(0, 37) + "..." : ns.name;
                })());
                insert(_el$75, () => ns.status);
                insert(_el$76, () => ns.age);
                insert(_el$77, createComponent(ActionMenu, {
                  actions: [{
                    label: "View YAML",
                    icon: "yaml",
                    onClick: () => {
                      setSelected(ns);
                      setYamlKey(ns.name);
                      setShowYaml(true);
                    }
                  }, {
                    label: "Edit YAML",
                    icon: "edit",
                    onClick: () => {
                      setSelected(ns);
                      setYamlKey(ns.name);
                      setShowEdit(true);
                    }
                  }, {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => deleteNamespace(ns),
                    variant: "danger",
                    divider: true
                  }]
                }));
                createRenderEffect((_p$) => {
                  var _v$1 = `${Math.max(24, fontSize() * 1.7)}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${fontSize()}px`, _v$12 = `${Math.max(24, fontSize() * 1.7)}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${fontSize()}px`, _v$15 = `${Math.max(24, fontSize() * 1.7)}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `px-2 py-1 rounded text-xs font-medium ${ns.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$1 !== _p$.e && setStyleProperty(_el$71, "height", _p$.e = _v$1);
                  _v$10 !== _p$.t && setStyleProperty(_el$71, "line-height", _p$.t = _v$10);
                  _v$11 !== _p$.a && setStyleProperty(_el$72, "font-size", _p$.a = _v$11);
                  _v$12 !== _p$.o && setStyleProperty(_el$72, "height", _p$.o = _v$12);
                  _v$13 !== _p$.i && setStyleProperty(_el$72, "line-height", _p$.i = _v$13);
                  _v$14 !== _p$.n && setStyleProperty(_el$74, "font-size", _p$.n = _v$14);
                  _v$15 !== _p$.s && setStyleProperty(_el$74, "height", _p$.s = _v$15);
                  _v$16 !== _p$.h && setStyleProperty(_el$74, "line-height", _p$.h = _v$16);
                  _v$17 !== _p$.r && className(_el$75, _p$.r = _v$17);
                  _v$18 !== _p$.d && setStyleProperty(_el$76, "font-size", _p$.d = _v$18);
                  _v$19 !== _p$.l && setStyleProperty(_el$76, "height", _p$.l = _v$19);
                  _v$20 !== _p$.u && setStyleProperty(_el$76, "line-height", _p$.u = _v$20);
                  _v$21 !== _p$.c && setStyleProperty(_el$77, "height", _p$.c = _v$21);
                  _v$22 !== _p$.w && setStyleProperty(_el$77, "line-height", _p$.w = _v$22);
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
                  w: void 0
                });
                return _el$70;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$31, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$31, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$30;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$45 = _tmpl$4(), _el$46 = _el$45.firstChild, _el$47 = _el$46.firstChild, _el$51 = _el$47.nextSibling, _el$48 = _el$51.nextSibling, _el$52 = _el$48.nextSibling, _el$49 = _el$52.nextSibling, _el$53 = _el$49.nextSibling; _el$53.nextSibling; var _el$54 = _el$46.nextSibling, _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild, _el$60 = _el$58.nextSibling; _el$60.nextSibling; var _el$61 = _el$57.nextSibling, _el$62 = _el$61.nextSibling, _el$63 = _el$62.nextSibling;
            insert(_el$46, () => (currentPage() - 1) * pageSize() + 1, _el$51);
            insert(_el$46, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$52);
            insert(_el$46, () => filteredAndSorted().length, _el$53);
            _el$55.$$click = () => setCurrentPage(1);
            _el$56.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$57, currentPage, _el$60);
            insert(_el$57, totalPages, null);
            _el$61.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$62.$$click = () => setCurrentPage(totalPages());
            _el$63.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
              _v$5 !== _p$.e && (_el$55.disabled = _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$56.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$61.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$62.disabled = _p$.o = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$63.value = pageSize());
            return _el$45;
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
              var _el$78 = _tmpl$0(), _el$79 = _el$78.firstChild; _el$79.nextSibling;
              return _el$78;
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
              var _el$81 = _tmpl$0(), _el$82 = _el$81.firstChild; _el$82.nextSibling;
              return _el$81;
            })();
          },
          get children() {
            var _el$64 = _tmpl$5();
            insert(_el$64, createComponent(YAMLEditor, {
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
            return _el$64;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "namespace",
      get name() {
        return selected()?.name || "";
      }
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
      resourceType: "namespaces"
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      onConfirm: handleBulkDelete,
      resourceType: "Namespaces",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
      _v$9 !== _p$.e && setStyleProperty(_el$29, "background", _p$.e = _v$9);
      _v$0 !== _p$.t && setStyleProperty(_el$29, "border", _p$.t = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = fontSize());
    createRenderEffect(() => _el$1.value = fontFamily());
    createRenderEffect(() => _el$22.value = search());
    createRenderEffect(() => _el$23.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { Namespaces as default };
//# sourceMappingURL=Namespaces-DMeuncck.js.map
