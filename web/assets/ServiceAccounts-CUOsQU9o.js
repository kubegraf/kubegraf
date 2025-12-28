import { c as createSignal, j as createResource, G as addNotification, P as namespace, t as template, i as insert, d as createComponent, S as Show, m as memo, F as For, f as createRenderEffect, h as setStyleProperty, M as Modal, w as clusterStatus, O as startExecution, k as api, v as delegateEvents } from './index-Bh-O-sIc.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';
import { Y as YAMLEditor } from './YAMLEditor-Cvfm5wCJ.js';
import { A as ActionMenu } from './ActionMenu-BVo-8BTq.js';
import { u as useBulkSelection, B as BulkActions, S as SelectAllCheckbox, a as SelectionCheckbox, b as BulkDeleteModal } from './useBulkSelection-BCNQqaHy.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class=w-full style="background:var(--bg-primary);margin:0;padding:0;border:1px solid var(--border-color);border-radius:4px"><div class="w-full overflow-x-auto"style=margin:0;padding:0><table class=w-full style=width:100%;table-layout:auto;background:var(--bg-primary);border-collapse:collapse;margin:0;padding:0><thead><tr style=font-weight:900;color:#0ea5e9><th class=whitespace-nowrap style="padding:0 8px;text-align:center;width:40px;border:none"></th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Name</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Namespace</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Secrets</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Age</th><th class=whitespace-nowrap style="padding:0 8px;text-align:left;font-weight:900;color:#0ea5e9;border:none">Actions</th></tr></thead><tbody>`), _tmpl$2 = /* @__PURE__ */ template(`<div style=height:70vh>`), _tmpl$3 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Service Accounts</h1><p style=color:var(--text-secondary)>Manage service accounts and their permissions</p></div><div class="flex items-center gap-3"><button class=icon-btn title="Refresh Service Accounts"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><select class="px-3 py-2 rounded-lg text-sm"title="Font Size"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=12>12px</option><option value=14>14px</option><option value=16>16px</option><option value=18>18px</option><option value=20>20px</option></select><select class="px-3 py-2 rounded-lg text-sm"title="Font Family"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Monospace>Monospace</option><option value=System-ui>System-ui</option><option value=Monaco>Monaco</option><option value=Consolas>Consolas</option><option value=Courier>Courier`), _tmpl$4 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading service accounts...`), _tmpl$5 = /* @__PURE__ */ template(`<div class="text-center py-12"><p style=color:var(--text-muted)>No service accounts found`), _tmpl$6 = /* @__PURE__ */ template(`<tr><td colspan=6 class="text-center py-8"style=color:var(--text-muted)>No service accounts found`), _tmpl$7 = /* @__PURE__ */ template(`<tr><td style="padding:0 8px;text-align:center;width:40px;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;color:#0ea5e9;font-weight:900;border:none"></td><td style="padding:0 8px;text-align:left;border:none">`), _tmpl$8 = /* @__PURE__ */ template(`<div class="flex items-center justify-center p-8"><div class="spinner mx-auto"></div><span class=ml-3 style=color:var(--text-secondary)>Loading YAML...`);
const ServiceAccounts = () => {
  const [selectedSA, setSelectedSA] = createSignal(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal(null);
  const bulk = useBulkSelection();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const getInitialFontSize = () => {
    const saved = localStorage.getItem("serviceaccounts-font-size");
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem("serviceaccounts-font-size", size.toString());
  };
  const getInitialFontFamily = () => {
    const saved = localStorage.getItem("serviceaccounts-font-family");
    return saved || "Monaco";
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());
  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    localStorage.setItem("serviceaccounts-font-family", family);
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
  const [yamlContent] = createResource(() => yamlKey(), async (key) => {
    if (!key) return "";
    const [name, ns] = key.split("|");
    if (!name || !ns) return "";
    try {
      const response = await fetch(`/api/serviceaccount/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to fetch YAML"
        }));
        throw new Error(errorData.error || "Failed to fetch YAML");
      }
      const data = await response.json();
      return data.yaml || "";
    } catch (err) {
      console.error("Failed to fetch service account YAML:", err);
      addNotification(`Failed to load YAML: ${err.message}`, "error");
      return "";
    }
  });
  const [serviceAccounts, {
    refetch
  }] = createResource(() => namespace(), async (ns) => {
    try {
      const params = new URLSearchParams();
      if (ns && ns !== "All Namespaces") {
        params.append("namespace", ns);
      }
      const response = await fetch(`/api/serviceaccounts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch service accounts");
      return await response.json();
    } catch (err) {
      addNotification(`Failed to load service accounts: ${err.message}`, "error");
      return [];
    }
  });
  const handleViewYAML = (sa) => {
    setSelectedSA(sa);
    setYamlKey(`${sa.name}|${sa.namespace}`);
    setShowYaml(true);
  };
  const handleEditYAML = (sa) => {
    setSelectedSA(sa);
    setYamlKey(`${sa.name}|${sa.namespace}`);
    setShowEdit(true);
  };
  const handleSaveYAML = async (yaml) => {
    const sa = selectedSA();
    if (!sa) return;
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
      label: `Apply ServiceAccount YAML: ${sa.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "apply",
      kubernetesEquivalent: true,
      namespace: sa.namespace,
      context: status.context,
      userAction: "serviceaccounts-apply-yaml",
      dryRun: false,
      allowClusterWide: false,
      resource: "serviceaccounts",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };
  const handleDryRunYAML = async (yaml) => {
    const sa = selectedSA();
    if (!sa) return;
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
      label: `Dry run ServiceAccount YAML: ${sa.name}`,
      command: "__k8s-apply-yaml",
      args: [],
      mode: "dry-run",
      kubernetesEquivalent: true,
      namespace: sa.namespace,
      context: status.context,
      userAction: "serviceaccounts-apply-yaml-dry-run",
      dryRun: true,
      allowClusterWide: false,
      resource: "serviceaccounts",
      action: "update",
      intent: "apply-yaml",
      yaml: trimmed
    });
  };
  const handleDelete = async (sa) => {
    if (!confirm(`Are you sure you want to delete ServiceAccount ${sa.name}?`)) {
      return;
    }
    try {
      const params = new URLSearchParams({
        name: sa.name,
        namespace: sa.namespace
      });
      const response = await fetch(`/api/serviceaccount/delete?${params.toString()}`, {
        method: "POST"
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Delete failed");
      }
      addNotification(`Successfully deleted ${sa.name}`, "success");
      refetch();
    } catch (err) {
      addNotification(`Failed to delete: ${err.message}`, "error");
    }
  };
  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(serviceAccounts());
    try {
      await Promise.all(itemsToDelete.map((sa) => api.deleteServiceAccount(sa.name, sa.namespace)));
      addNotification(`Successfully deleted ${itemsToDelete.length} ServiceAccount(s)`, "success");
      bulk.deselectAll();
      refetch();
    } catch (error) {
      console.error("Failed to delete ServiceAccounts:", error);
      addNotification(`Failed to delete ServiceAccounts: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };
  return (() => {
    var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$8.nextSibling;
    insert(_el$, createComponent(BulkActions, {
      get selectedCount() {
        return bulk.selectedCount();
      },
      get totalCount() {
        return (serviceAccounts() || []).length;
      },
      onSelectAll: () => bulk.selectAll(serviceAccounts() || []),
      onDeselectAll: () => bulk.deselectAll(),
      onDelete: () => setShowBulkDeleteModal(true),
      resourceType: "service accounts"
    }), _el$2);
    _el$7.$$click = (e) => {
      const btn = e.currentTarget;
      btn.classList.add("refreshing");
      setTimeout(() => btn.classList.remove("refreshing"), 500);
      refetch();
    };
    _el$8.addEventListener("change", (e) => handleFontSizeChange(parseInt(e.currentTarget.value)));
    _el$9.addEventListener("change", (e) => handleFontFamilyChange(e.currentTarget.value));
    insert(_el$, createComponent(Show, {
      get when() {
        return !serviceAccounts.loading;
      },
      get fallback() {
        return (() => {
          var _el$21 = _tmpl$4(), _el$22 = _el$21.firstChild; _el$22.nextSibling;
          return _el$21;
        })();
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return (serviceAccounts() || []).length > 0;
          },
          get fallback() {
            return (() => {
              var _el$24 = _tmpl$5(); _el$24.firstChild;
              return _el$24;
            })();
          },
          get children() {
            var _el$0 = _tmpl$(), _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$14.nextSibling, _el$16 = _el$15.nextSibling, _el$17 = _el$16.nextSibling, _el$18 = _el$17.nextSibling, _el$19 = _el$11.nextSibling;
            insert(_el$13, createComponent(SelectAllCheckbox, {
              get checked() {
                return memo(() => bulk.selectedCount() === (serviceAccounts() || []).length)() && (serviceAccounts() || []).length > 0;
              },
              get indeterminate() {
                return memo(() => bulk.selectedCount() > 0)() && bulk.selectedCount() < (serviceAccounts() || []).length;
              },
              onChange: () => {
                if (bulk.selectedCount() === (serviceAccounts() || []).length) {
                  bulk.deselectAll();
                } else {
                  bulk.selectAll(serviceAccounts() || []);
                }
              }
            }));
            insert(_el$19, createComponent(For, {
              get each() {
                return serviceAccounts();
              },
              get fallback() {
                return (() => {
                  var _el$26 = _tmpl$6(); _el$26.firstChild;
                  return _el$26;
                })();
              },
              children: (sa) => {
                return (() => {
                  var _el$28 = _tmpl$7(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.nextSibling, _el$33 = _el$32.nextSibling, _el$34 = _el$33.nextSibling;
                  insert(_el$29, createComponent(SelectionCheckbox, {
                    get checked() {
                      return bulk.isSelected(sa);
                    },
                    onChange: () => bulk.toggleSelection(sa)
                  }));
                  insert(_el$30, () => sa.name);
                  insert(_el$31, () => sa.namespace);
                  insert(_el$32, () => sa.secrets);
                  insert(_el$33, () => sa.age);
                  insert(_el$34, createComponent(ActionMenu, {
                    actions: [{
                      label: "View YAML",
                      icon: "yaml",
                      onClick: () => handleViewYAML(sa)
                    }, {
                      label: "Edit YAML",
                      icon: "edit",
                      onClick: () => handleEditYAML(sa)
                    }, {
                      label: "Delete",
                      icon: "delete",
                      onClick: () => handleDelete(sa),
                      variant: "danger",
                      divider: true
                    }]
                  }));
                  createRenderEffect((_p$) => {
                    var _v$1 = `${fontSize()}px`, _v$10 = `${Math.max(24, fontSize() * 1.7)}px`, _v$11 = `${Math.max(24, fontSize() * 1.7)}px`, _v$12 = `${fontSize()}px`, _v$13 = `${Math.max(24, fontSize() * 1.7)}px`, _v$14 = `${Math.max(24, fontSize() * 1.7)}px`, _v$15 = `${fontSize()}px`, _v$16 = `${Math.max(24, fontSize() * 1.7)}px`, _v$17 = `${Math.max(24, fontSize() * 1.7)}px`, _v$18 = `${fontSize()}px`, _v$19 = `${Math.max(24, fontSize() * 1.7)}px`, _v$20 = `${Math.max(24, fontSize() * 1.7)}px`, _v$21 = `${Math.max(24, fontSize() * 1.7)}px`, _v$22 = `${Math.max(24, fontSize() * 1.7)}px`;
                    _v$1 !== _p$.e && setStyleProperty(_el$30, "font-size", _p$.e = _v$1);
                    _v$10 !== _p$.t && setStyleProperty(_el$30, "height", _p$.t = _v$10);
                    _v$11 !== _p$.a && setStyleProperty(_el$30, "line-height", _p$.a = _v$11);
                    _v$12 !== _p$.o && setStyleProperty(_el$31, "font-size", _p$.o = _v$12);
                    _v$13 !== _p$.i && setStyleProperty(_el$31, "height", _p$.i = _v$13);
                    _v$14 !== _p$.n && setStyleProperty(_el$31, "line-height", _p$.n = _v$14);
                    _v$15 !== _p$.s && setStyleProperty(_el$32, "font-size", _p$.s = _v$15);
                    _v$16 !== _p$.h && setStyleProperty(_el$32, "height", _p$.h = _v$16);
                    _v$17 !== _p$.r && setStyleProperty(_el$32, "line-height", _p$.r = _v$17);
                    _v$18 !== _p$.d && setStyleProperty(_el$33, "font-size", _p$.d = _v$18);
                    _v$19 !== _p$.l && setStyleProperty(_el$33, "height", _p$.l = _v$19);
                    _v$20 !== _p$.u && setStyleProperty(_el$33, "line-height", _p$.u = _v$20);
                    _v$21 !== _p$.c && setStyleProperty(_el$34, "height", _p$.c = _v$21);
                    _v$22 !== _p$.w && setStyleProperty(_el$34, "line-height", _p$.w = _v$22);
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
                  return _el$28;
                })();
              }
            }));
            createRenderEffect((_p$) => {
              var _v$ = getFontFamilyCSS(), _v$2 = `${Math.max(24, fontSize() * 1.7)}px`, _v$3 = getFontFamilyCSS(), _v$4 = `${fontSize()}px`, _v$5 = `${Math.max(24, fontSize() * 1.7)}px`, _v$6 = `${fontSize()}px`, _v$7 = `${fontSize()}px`, _v$8 = `${fontSize()}px`, _v$9 = `${fontSize()}px`, _v$0 = `${fontSize()}px`;
              _v$ !== _p$.e && setStyleProperty(_el$10, "font-family", _p$.e = _v$);
              _v$2 !== _p$.t && setStyleProperty(_el$12, "height", _p$.t = _v$2);
              _v$3 !== _p$.a && setStyleProperty(_el$12, "font-family", _p$.a = _v$3);
              _v$4 !== _p$.o && setStyleProperty(_el$12, "font-size", _p$.o = _v$4);
              _v$5 !== _p$.i && setStyleProperty(_el$12, "line-height", _p$.i = _v$5);
              _v$6 !== _p$.n && setStyleProperty(_el$14, "font-size", _p$.n = _v$6);
              _v$7 !== _p$.s && setStyleProperty(_el$15, "font-size", _p$.s = _v$7);
              _v$8 !== _p$.h && setStyleProperty(_el$16, "font-size", _p$.h = _v$8);
              _v$9 !== _p$.r && setStyleProperty(_el$17, "font-size", _p$.r = _v$9);
              _v$0 !== _p$.d && setStyleProperty(_el$18, "font-size", _p$.d = _v$0);
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
              d: void 0
            });
            return _el$0;
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showYaml();
      },
      onClose: () => {
        setShowYaml(false);
        setSelectedSA(null);
        setYamlKey(null);
      },
      get title() {
        return `YAML: ${selectedSA()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$35 = _tmpl$8(), _el$36 = _el$35.firstChild; _el$36.nextSibling;
              return _el$35;
            })();
          },
          get children() {
            return createComponent(YAMLViewer, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selectedSA()?.name;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showEdit();
      },
      onClose: () => {
        setShowEdit(false);
        setSelectedSA(null);
        setYamlKey(null);
      },
      get title() {
        return `Edit YAML: ${selectedSA()?.name || ""}`;
      },
      size: "xl",
      get children() {
        return createComponent(Show, {
          get when() {
            return memo(() => !!!yamlContent.loading)() && yamlContent();
          },
          get fallback() {
            return (() => {
              var _el$38 = _tmpl$8(), _el$39 = _el$38.firstChild; _el$39.nextSibling;
              return _el$38;
            })();
          },
          get children() {
            var _el$20 = _tmpl$2();
            insert(_el$20, createComponent(YAMLEditor, {
              get yaml() {
                return yamlContent() || "";
              },
              get title() {
                return selectedSA()?.name;
              },
              onSave: handleSaveYAML,
              onDryRun: handleDryRunYAML,
              onCancel: () => {
                setShowEdit(false);
                setSelectedSA(null);
                setYamlKey(null);
              }
            }));
            return _el$20;
          }
        });
      }
    }), null);
    insert(_el$, createComponent(BulkActions, {
      get selectedCount() {
        return bulk.selectedCount();
      },
      get totalCount() {
        return (serviceAccounts() || []).length;
      },
      onSelectAll: () => bulk.selectAll(serviceAccounts() || []),
      onDeselectAll: () => bulk.deselectAll(),
      onDelete: () => setShowBulkDeleteModal(true),
      resourceType: "service accounts"
    }), null);
    insert(_el$, createComponent(BulkDeleteModal, {
      get isOpen() {
        return showBulkDeleteModal();
      },
      onClose: () => setShowBulkDeleteModal(false),
      onConfirm: handleBulkDelete,
      resourceType: "Service Accounts",
      get selectedItems() {
        return bulk.getSelectedItems(serviceAccounts() || []);
      }
    }), null);
    createRenderEffect(() => _el$8.value = fontSize());
    createRenderEffect(() => _el$9.value = fontFamily());
    return _el$;
  })();
};
delegateEvents(["click"]);

export { ServiceAccounts as default };
//# sourceMappingURL=ServiceAccounts-CUOsQU9o.js.map
