import { c as createSignal, a as createMemo, j as createResource, k as api, G as addNotification, t as template, i as insert, d as createComponent, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, g as className, S as Show, M as Modal, N as setGlobalLoading, w as clusterStatus, O as startExecution, H as selectedNamespaces, v as delegateEvents } from './index-B8I71-mz.js';
import { c as createCachedResource } from './resourceCache-P2tk5pf3.js';
import { g as getThemeBackground, a as getThemeBorderColor } from './themeBackground-Cv9JHSq7.js';
import { Y as YAMLViewer } from './YAMLViewer-BH5fzWmG.js';
import { Y as YAMLEditor } from './YAMLEditor-DeL5BHL5.js';
import { D as DescribeModal } from './DescribeModal-BOrOE6vF.js';
import { A as ActionMenu } from './ActionMenu-F4cRW3cz.js';
import { u as useBulkSelection, S as SelectAllCheckbox, a as SelectionCheckbox, B as BulkActions, b as BulkDeleteModal } from './useBulkSelection-CgTI3QZq.js';

var _tmpl$ = /* @__PURE__ */ template(`<span class="ml-1 inline-flex flex-col text-xs leading-none"><span>▲</span><span>▼`), _tmpl$2 = /* @__PURE__ */ template(`<div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;border-collapse:collapse;margin:0;padding:0><thead><tr><th class=whitespace-nowrap style="width:40px;padding:0 8px"></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Name </div></th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Namespace </div></th><th class=whitespace-nowrap>Schedule</th><th class=whitespace-nowrap>Suspend</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Active </div></th><th class=whitespace-nowrap>Last Schedule</th><th class="cursor-pointer select-none whitespace-nowrap"><div class="flex items-center gap-1">Age </div></th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-4 font-mono text-sm"style="background:var(--bg-secondary);borderTop:1px solid var(--border-color)"><div style=color:var(--text-secondary)>Showing <!> - <!> of <!> CronJobs</div><div class="flex items-center gap-2"><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>First</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>← Prev</button><span class="px-3 py-1"style=color:var(--text-primary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Next →</button><button class="px-3 py-1 rounded text-sm disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Last</button><select class="px-3 py-1 rounded-lg text-sm ml-4"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20 per page</option><option value=50>50 per page</option><option value=100>100 per page</option><option value=200>200 per page`), _tmpl$4 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="space-y-2 max-w-full -mt-4"><div class="flex items-center justify-between flex-wrap gap-3"><div><h1 class="text-lg font-semibold"style=color:var(--text-primary)>CronJobs</h1><p class=text-xs style=color:var(--text-secondary)>Scheduled job management</p></div><div class="flex items-center gap-3"><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=13>13px</option><option value=14>14px</option><option value=15>15px</option><option value=16>16px</option><option value=17>17px</option><option value=18>18px</option><option value=19>19px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier</option></select><button class=icon-btn title="Refresh CronJobs"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Active</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Suspended</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid #3b82f6"><span class=text-sm style=color:var(--text-secondary)>Scheduled</span><span class="text-xl font-bold"style=color:#3b82f6></span></div><div class=flex-1></div><input type=text placeholder=Search... class="px-3 py-2 rounded-lg text-sm w-48"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=20>20</option><option value=50>50</option><option value=100>100</option></select></div><div class=w-full style=margin:0;padding:0;border-radius:4px>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading CronJobs...`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td colspan=9 class="text-center py-8"style=color:var(--text-muted)>No CronJobs found`), _tmpl$8 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><button class="font-medium hover:underline text-left"style=color:var(--accent-primary)></button></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><code class="px-2 py-1 rounded text-xs"style=background:var(--bg-tertiary)></code></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"><span></span></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const CronJobs = () => {
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
  createSignal(false);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem("cronjobs-font-size") || "14"));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem("cronjobs-font-family") || "Monaco");
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
    localStorage.setItem("cronjobs-font-size", size.toString());
  };
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("cronjobs-font-family", family);
  };
  const getNamespaceParam = () => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return void 0;
    if (namespaces.length === 1) return namespaces[0];
    return namespaces[0];
  };
  const cronjobsCache = createCachedResource("cronjobs", async () => {
    setGlobalLoading(true);
    try {
      const namespaceParam = getNamespaceParam();
      const cronjobs2 = await api.getCronJobs(namespaceParam);
      return cronjobs2;
    } finally {
      setGlobalLoading(false);
    }
  }, {
    ttl: 15e3,
    // 15 seconds
    backgroundRefresh: true
  });
  const cronjobs = createMemo(() => cronjobsCache.data() || []);
  const refetch = () => cronjobsCache.refetch();
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const data = await api.getCronJobYAML(name, ns);
      return data.yaml || "";
    } catch (error) {
      console.error("Failed to fetch cronjob YAML:", error);
      addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return "";
    }
  });
  const handleSaveYAML = async (yaml) => {
    const cj = selected();
    if (!cj) return;
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
      label: `Apply CronJob YAML: ${cj.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: cj.namespace,
      context: status.context,
      userAction: "cronjobs-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "cronjobs",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const cj = selected();
    if (!cj) return;
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
      label: `Dry run CronJob YAML: ${cj.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: cj.namespace,
      context: status.context,
      userAction: "cronjobs-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "cronjobs",
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
    let all = cronjobs() || [];
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
        case "active":
          comparison = a.active - b.active;
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
  const paginatedCronJobs = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });
  const statusCounts = createMemo(() => {
    const all = cronjobs() || [];
    return {
      total: all.length,
      active: all.filter((c) => c.active > 0).length,
      suspended: all.filter((c) => c.suspend).length,
      scheduled: all.filter((c) => !c.suspend && c.active === 0).length
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
  const triggerCronJob = async (cj) => {
    try {
      await api.triggerCronJob(cj.name, cj.namespace);
      refetch();
    } catch (error) {
      console.error("Failed to trigger CronJob:", error);
    }
  };
  const toggleSuspend = async (cj) => {
    try {
      await api.suspendCronJob(cj.name, cj.namespace, !cj.suspend);
      refetch();
    } catch (error) {
      console.error("Failed to toggle suspend CronJob:", error);
    }
  };
  const deleteCronJob = (cj) => {
    setSelected(cj);
    setShowDeleteConfirm(true);
  };
  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(paginatedCronJobs());
    try {
      await Promise.all(itemsToDelete.map((cj) => api.deleteCronJob(cj.name, cj.namespace)));
      addNotification(`Successfully deleted ${itemsToDelete.length} CronJob(s)`, "success");
      bulk.deselectAll();
      refetch();
    } catch (error) {
      console.error("Failed to delete CronJobs:", error);
      addNotification(`Failed to delete CronJobs: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  return (() => {
    var _el$4 = _tmpl$5(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild; _el$7.nextSibling; var _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$5.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling, _el$27 = _el$11.nextSibling;
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
    insert(_el$20, () => statusCounts().suspended);
    insert(_el$23, () => statusCounts().scheduled);
    _el$25.$$input = (e) => {
      setSearch(e.currentTarget.value);
      setCurrentPage(1);
    };
    _el$26.addEventListener("change", (e) => {
      setPageSize(parseInt(e.currentTarget.value));
      setCurrentPage(1);
    });
    insert(_el$27, createComponent(Show, {
      get when() {
        return !cronjobsCache.loading() || cronjobsCache.data() !== void 0;
      },
      get fallback() {
        return (() => {
          var _el$69 = _tmpl$6(), _el$70 = _el$69.firstChild; _el$70.nextSibling;
          return _el$69;
        })();
      },
      get children() {
        return [(() => {
          var _el$28 = _tmpl$2(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild; _el$34.firstChild; var _el$36 = _el$33.nextSibling, _el$37 = _el$36.firstChild; _el$37.firstChild; var _el$39 = _el$36.nextSibling, _el$40 = _el$39.nextSibling, _el$41 = _el$40.nextSibling, _el$42 = _el$41.firstChild; _el$42.firstChild; var _el$44 = _el$41.nextSibling, _el$45 = _el$44.nextSibling, _el$46 = _el$45.firstChild; _el$46.firstChild; var _el$48 = _el$30.nextSibling;
          insert(_el$32, createComponent(SelectAllCheckbox, {
            get checked() {
              return memo(() => bulk.selectedCount() === paginatedCronJobs().length)() && paginatedCronJobs().length > 0;
            },
            get indeterminate() {
              return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < paginatedCronJobs().length;
            },
            onChange: () => {
              if (bulk.selectedCount() === paginatedCronJobs().length) {
                bulk.deselectAll();
              } else {
                bulk.selectAll(paginatedCronJobs());
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
          _el$41.$$click = () => handleSort("active");
          insert(_el$42, createComponent(SortIcon, {
            field: "active"
          }), null);
          _el$45.$$click = () => handleSort("age");
          insert(_el$46, createComponent(SortIcon, {
            field: "age"
          }), null);
          insert(_el$48, createComponent(For, {
            get each() {
              return paginatedCronJobs();
            },
            get fallback() {
              return (() => {
                var _el$72 = _tmpl$7(); _el$72.firstChild;
                return _el$72;
              })();
            },
            children: (cj) => {
              return (() => {
                var _el$74 = _tmpl$8(), _el$75 = _el$74.firstChild, _el$76 = _el$75.nextSibling, _el$77 = _el$76.firstChild, _el$78 = _el$76.nextSibling, _el$79 = _el$78.nextSibling, _el$80 = _el$79.firstChild, _el$81 = _el$79.nextSibling, _el$82 = _el$81.firstChild, _el$83 = _el$81.nextSibling, _el$84 = _el$83.nextSibling, _el$85 = _el$84.nextSibling, _el$86 = _el$85.nextSibling;
                insert(_el$75, createComponent(SelectionCheckbox, {
                  get checked() {
                    return bulk.isSelected(cj);
                  },
                  onChange: () => bulk.toggleSelection(cj)
                }));
                _el$77.$$click = () => {
                  setSelected(cj);
                  setShowDetails(true);
                };
                insert(_el$77, (() => {
                  var _c$ = memo(() => cj.name.length > 40);
                  return () => _c$() ? cj.name.slice(0, 37) + "..." : cj.name;
                })());
                insert(_el$78, () => cj.namespace);
                insert(_el$80, () => cj.schedule);
                insert(_el$82, () => cj.suspend ? "Yes" : "No");
                insert(_el$83, () => cj.active);
                insert(_el$84, () => cj.lastSchedule || "Never");
                insert(_el$85, () => cj.age);
                insert(_el$86, createComponent(ActionMenu, {
                  get actions() {
                    return [{
                      label: "Trigger",
                      icon: "restart",
                      onClick: () => triggerCronJob(cj)
                    }, {
                      label: cj.suspend ? "Resume" : "Suspend",
                      icon: "restart",
                      onClick: () => toggleSuspend(cj)
                    }, {
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => {
                        setSelected(cj);
                        setYamlKey(`${cj.name}|${cj.namespace}`);
                        setShowYaml(true);
                      }
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => {
                        setSelected(cj);
                        setYamlKey(`${cj.name}|${cj.namespace}`);
                        setShowEdit(true);
                      }
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => {
                        setSelected(cj);
                        deleteCronJob(cj);
                      },
                      variant: "danger",
                      divider: true
                    }];
                  }
                }));
                createRenderEffect((_p$) => {
                  var _v$1 = `${Math.max(24, fontSize() * 1.7)}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${fontSize()}px`, _v$12 = `${Math.max(24, fontSize() * 1.7)}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${fontSize()}px`, _v$15 = `${Math.max(24, fontSize() * 1.7)}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${fontSize()}px`, _v$18 = `${Math.max(24, fontSize() * 1.7)}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${fontSize()}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`, _v$23 = `badge ${cj.suspend ? "badge-warning" : "badge-success"}`, _v$24 = `${fontSize()}px`, _v$25 = `${Math.max(24, fontSize() * 1.7)}px`, _v$26 = `${Math.max(24, fontSize() * 1.7)}px`, _v$27 = `${fontSize()}px`, _v$28 = `${Math.max(24, fontSize() * 1.7)}px`, _v$29 = `${Math.max(24, fontSize() * 1.7)}px`, _v$30 = `${fontSize()}px`, _v$31 = `${Math.max(24, fontSize() * 1.7)}px`, _v$32 = `${Math.max(24, fontSize() * 1.7)}px`, _v$33 = `${Math.max(24, fontSize() * 1.7)}px`, _v$34 = `${Math.max(24, fontSize() * 1.7)}px`;
                  _v$1 !== _p$.e && setStyleProperty(_el$75, "height", _p$.e = _v$1);
                  _v$10 !== _p$.t && setStyleProperty(_el$75, "line-height", _p$.t = _v$10);
                  _v$11 !== _p$.a && setStyleProperty(_el$76, "font-size", _p$.a = _v$11);
                  _v$12 !== _p$.o && setStyleProperty(_el$76, "height", _p$.o = _v$12);
                  _v$13 !== _p$.i && setStyleProperty(_el$76, "line-height", _p$.i = _v$13);
                  _v$14 !== _p$.n && setStyleProperty(_el$78, "font-size", _p$.n = _v$14);
                  _v$15 !== _p$.s && setStyleProperty(_el$78, "height", _p$.s = _v$15);
                  _v$16 !== _p$.h && setStyleProperty(_el$78, "line-height", _p$.h = _v$16);
                  _v$17 !== _p$.r && setStyleProperty(_el$79, "font-size", _p$.r = _v$17);
                  _v$18 !== _p$.d && setStyleProperty(_el$79, "height", _p$.d = _v$18);
                  _v$19 !== _p$.l && setStyleProperty(_el$79, "line-height", _p$.l = _v$19);
                  _v$20 !== _p$.u && setStyleProperty(_el$81, "font-size", _p$.u = _v$20);
                  _v$21 !== _p$.c && setStyleProperty(_el$81, "height", _p$.c = _v$21);
                  _v$22 !== _p$.w && setStyleProperty(_el$81, "line-height", _p$.w = _v$22);
                  _v$23 !== _p$.m && className(_el$82, _p$.m = _v$23);
                  _v$24 !== _p$.f && setStyleProperty(_el$83, "font-size", _p$.f = _v$24);
                  _v$25 !== _p$.y && setStyleProperty(_el$83, "height", _p$.y = _v$25);
                  _v$26 !== _p$.g && setStyleProperty(_el$83, "line-height", _p$.g = _v$26);
                  _v$27 !== _p$.p && setStyleProperty(_el$84, "font-size", _p$.p = _v$27);
                  _v$28 !== _p$.b && setStyleProperty(_el$84, "height", _p$.b = _v$28);
                  _v$29 !== _p$.T && setStyleProperty(_el$84, "line-height", _p$.T = _v$29);
                  _v$30 !== _p$.A && setStyleProperty(_el$85, "font-size", _p$.A = _v$30);
                  _v$31 !== _p$.O && setStyleProperty(_el$85, "height", _p$.O = _v$31);
                  _v$32 !== _p$.I && setStyleProperty(_el$85, "line-height", _p$.I = _v$32);
                  _v$33 !== _p$.S && setStyleProperty(_el$86, "height", _p$.S = _v$33);
                  _v$34 !== _p$.W && setStyleProperty(_el$86, "line-height", _p$.W = _v$34);
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
                  W: void 0
                });
                return _el$74;
              })();
            }
          }));
          createRenderEffect((_p$) => {
            var _v$3 = getFontFamilyCSS(fontFamily()), _v$4 = getThemeBackground();
            _v$3 !== _p$.e && setStyleProperty(_el$29, "font-family", _p$.e = _v$3);
            _v$4 !== _p$.t && setStyleProperty(_el$29, "background", _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$28;
        })(), createComponent(Show, {
          get when() {
            return totalPages() > 1 || filteredAndSorted().length > 0;
          },
          get children() {
            var _el$49 = _tmpl$3(), _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$55 = _el$51.nextSibling, _el$52 = _el$55.nextSibling, _el$56 = _el$52.nextSibling, _el$53 = _el$56.nextSibling, _el$57 = _el$53.nextSibling; _el$57.nextSibling; var _el$58 = _el$50.nextSibling, _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, _el$61 = _el$60.nextSibling, _el$62 = _el$61.firstChild, _el$64 = _el$62.nextSibling; _el$64.nextSibling; var _el$65 = _el$61.nextSibling, _el$66 = _el$65.nextSibling, _el$67 = _el$66.nextSibling;
            insert(_el$50, () => (currentPage() - 1) * pageSize() + 1, _el$55);
            insert(_el$50, () => Math.min(currentPage() * pageSize(), filteredAndSorted().length), _el$56);
            insert(_el$50, () => filteredAndSorted().length, _el$57);
            _el$59.$$click = () => setCurrentPage(1);
            _el$60.$$click = () => setCurrentPage((p) => Math.max(1, p - 1));
            insert(_el$61, currentPage, _el$64);
            insert(_el$61, totalPages, null);
            _el$65.$$click = () => setCurrentPage((p) => Math.min(totalPages(), p + 1));
            _el$66.$$click = () => setCurrentPage(totalPages());
            _el$67.addEventListener("change", (e) => {
              setPageSize(parseInt(e.currentTarget.value));
              setCurrentPage(1);
            });
            createRenderEffect((_p$) => {
              var _v$5 = currentPage() === 1, _v$6 = currentPage() === 1, _v$7 = currentPage() === totalPages(), _v$8 = currentPage() === totalPages();
              _v$5 !== _p$.e && (_el$59.disabled = _p$.e = _v$5);
              _v$6 !== _p$.t && (_el$60.disabled = _p$.t = _v$6);
              _v$7 !== _p$.a && (_el$65.disabled = _p$.a = _v$7);
              _v$8 !== _p$.o && (_el$66.disabled = _p$.o = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0
            });
            createRenderEffect(() => _el$67.value = pageSize());
            return _el$49;
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
              var _el$87 = _tmpl$9(), _el$88 = _el$87.firstChild; _el$88.nextSibling;
              return _el$87;
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
              var _el$90 = _tmpl$9(), _el$91 = _el$90.firstChild; _el$91.nextSibling;
              return _el$90;
            })();
          },
          get children() {
            var _el$68 = _tmpl$4();
            insert(_el$68, createComponent(YAMLEditor, {
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
            return _el$68;
          }
        });
      }
    }), null);
    insert(_el$4, createComponent(DescribeModal, {
      get isOpen() {
        return showDescribe();
      },
      onClose: () => setShowDescribe(false),
      resourceType: "cronjob",
      get name() {
        return selected()?.name || "";
      },
      get namespace() {
        return selected()?.namespace;
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
      resourceType: "cronjobs"
    }), null);
    insert(_el$4, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      onConfirm: handleBulkDelete,
      resourceType: "CronJobs",
      get selectedItems() {
        return bulk.getSelectedItems(filteredAndSorted());
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$9 = getThemeBackground(), _v$0 = `1px solid ${getThemeBorderColor()}`;
      _v$9 !== _p$.e && setStyleProperty(_el$27, "background", _p$.e = _v$9);
      _v$0 !== _p$.t && setStyleProperty(_el$27, "border", _p$.t = _v$0);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = fontSize());
    createRenderEffect(() => _el$1.value = fontFamily());
    createRenderEffect(() => _el$25.value = search());
    createRenderEffect(() => _el$26.value = pageSize());
    return _el$4;
  })();
};
delegateEvents(["click", "input"]);

export { CronJobs as default };
//# sourceMappingURL=CronJobs-CHeDdW68.js.map
