import { c as createSignal, j as createResource, G as addNotification, P as namespace, t as template, i as insert, d as createComponent, f as createRenderEffect, h as setStyleProperty, S as Show, F as For, m as memo, M as Modal, v as delegateEvents } from './index-NnaOo1cf.js';
import { Y as YAMLViewer } from './YAMLViewer-B3aZsnWG.js';
import { Y as YAMLEditor } from './YAMLEditor-8WjJlhy7.js';
import { A as ActionMenu } from './ActionMenu-BtMa9NTM.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-4 py-2 text-sm font-medium transition-colors">Instances (<!>)`), _tmpl$2 = /* @__PURE__ */ template(`<div class=overflow-x-auto><table class="w-full border-collapse"><thead><tr class=border-b style=border-color:var(--border-color)><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Name</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Group</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Version</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Kind</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Scope</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Instances</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Age</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Actions</th></tr></thead><tbody>`), _tmpl$3 = /* @__PURE__ */ template(`<div class=mb-4><button class="text-sm mb-4 transition-colors"style=color:var(--text-secondary)>← Back to CRDs</button><h2 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>Instances of <!> (<!>)`), _tmpl$4 = /* @__PURE__ */ template(`<div class=overflow-x-auto><table class="w-full border-collapse"><thead><tr class=border-b style=border-color:var(--border-color)><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Name</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Namespace</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Age</th><th class="text-left py-3 px-4 font-semibold text-sm"style=color:var(--text-primary)>Actions</th></tr></thead><tbody>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2"style=border-color:var(--accent-primary)>`), _tmpl$6 = /* @__PURE__ */ template(`<div class=p-6><div class="mb-6 flex items-center justify-between"><div><h1 class="text-2xl font-bold mb-1"style=color:var(--text-primary)>Custom Resources</h1><p class=text-sm style=color:var(--text-secondary)>Manage CustomResourceDefinitions and their instances</p></div><div class="flex gap-2"><button class="px-4 py-2 rounded-md text-sm font-semibold transition-all"style="background:var(--accent-primary);color:#000000;border:2px solid var(--accent-primary);box-shadow:0 2px 4px rgba(6, 182, 212, 0.2)">Refresh</button></div></div><div class="mb-4 flex gap-2 border-b"style=border-color:var(--border-color)><button class="px-4 py-2 text-sm font-medium transition-colors">CRDs (<!>)`), _tmpl$7 = /* @__PURE__ */ template(`<div class="text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"style=border-color:var(--accent-primary)></div><p class="mt-4 text-sm"style=color:var(--text-secondary)>Loading CRDs...`), _tmpl$8 = /* @__PURE__ */ template(`<div class="text-center py-12"><p class=text-lg style=color:var(--text-secondary)>No CustomResourceDefinitions found`), _tmpl$9 = /* @__PURE__ */ template(`<tr class="border-b transition-colors"style=border-color:var(--border-color)><td class="py-3 px-4"><div class=font-medium style=color:var(--text-primary)></div></td><td class="py-3 px-4 text-sm"style=color:var(--text-secondary)></td><td class="py-3 px-4 text-sm"style=color:var(--text-secondary)></td><td class="py-3 px-4 text-sm"style=color:var(--text-primary)></td><td class="py-3 px-4 text-sm"><span class="px-2 py-1 rounded text-xs font-medium"></span></td><td class="py-3 px-4 text-sm"style=color:var(--text-primary)></td><td class="py-3 px-4 text-sm"style=color:var(--text-secondary)></td><td class="py-3 px-4">`), _tmpl$0 = /* @__PURE__ */ template(`<div class="text-center py-12"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"style=border-color:var(--accent-primary)></div><p class="mt-4 text-sm"style=color:var(--text-secondary)>Loading instances...`), _tmpl$1 = /* @__PURE__ */ template(`<div class="text-center py-12"><p class=text-lg style=color:var(--text-secondary)>No instances found`), _tmpl$10 = /* @__PURE__ */ template(`<tr class="border-b transition-colors"style=border-color:var(--border-color)><td class="py-3 px-4"><div class=font-medium style=color:var(--text-primary)></div></td><td class="py-3 px-4 text-sm"style=color:var(--text-secondary)></td><td class="py-3 px-4 text-sm"style=color:var(--text-secondary)></td><td class="py-3 px-4">`);
const CustomResources = () => {
  const [selectedCRD, setSelectedCRD] = createSignal(null);
  const [selectedInstance, setSelectedInstance] = createSignal(null);
  const [showInstances, setShowInstances] = createSignal(false);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlContent, setYamlContent] = createSignal("");
  const [yamlLoading, setYamlLoading] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal("crds");
  const [crds, {
    refetch: refetchCRDs
  }] = createResource(async () => {
    try {
      const response = await fetch("/api/crds");
      if (!response.ok) throw new Error("Failed to fetch CRDs");
      return await response.json();
    } catch (err) {
      addNotification(`Failed to load CRDs: ${err.message}`, "error");
      return [];
    }
  });
  const [instances, {
    refetch: refetchInstances
  }] = createResource(() => selectedCRD()?.name, async (crdName) => {
    if (!crdName) return [];
    try {
      const params = new URLSearchParams({
        crd: crdName
      });
      const ns = namespace();
      if (ns && ns !== "All Namespaces") {
        params.append("namespace", ns);
      }
      const response = await fetch(`/api/crd/instances?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch instances");
      return await response.json();
    } catch (err) {
      addNotification(`Failed to load instances: ${err.message}`, "error");
      return [];
    }
  });
  const handleViewInstances = (crd) => {
    setSelectedCRD(crd);
    setShowInstances(true);
    setActiveTab("instances");
  };
  const loadYAML = async (instance, crd) => {
    setYamlLoading(true);
    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name
      });
      if (instance.namespace) {
        params.append("namespace", instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/yaml?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch YAML");
      const yaml = await response.text();
      setYamlContent(yaml);
    } catch (err) {
      addNotification(`Failed to load YAML: ${err.message}`, "error");
      setYamlContent("");
    } finally {
      setYamlLoading(false);
    }
  };
  const handleViewYAML = async (instance, crd) => {
    setSelectedInstance(instance);
    setShowYaml(true);
    await loadYAML(instance, crd);
  };
  const handleEditYAML = async (instance, crd) => {
    setSelectedInstance(instance);
    setShowEdit(true);
    await loadYAML(instance, crd);
  };
  const handleSaveYAML = async (yaml) => {
    const instance = selectedInstance();
    const crd = selectedCRD();
    if (!instance || !crd) return;
    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name
      });
      if (instance.namespace) {
        params.append("namespace", instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/update?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/yaml"
        },
        body: yaml
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Update failed"
        }));
        throw new Error(errorData.error || "Update failed");
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Update failed");
      }
      addNotification(`Successfully updated ${instance.name}`, "success");
      setShowEdit(false);
      refetchInstances();
    } catch (err) {
      addNotification(`Failed to update: ${err.message}`, "error");
    }
  };
  const handleDelete = async (instance, crd) => {
    if (!confirm(`Are you sure you want to delete ${instance.name}?`)) {
      return;
    }
    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name
      });
      if (instance.namespace) {
        params.append("namespace", instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/delete?${params.toString()}`, {
        method: "POST"
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Delete failed");
      }
      addNotification(`Successfully deleted ${instance.name}`, "success");
      refetchInstances();
    } catch (err) {
      addNotification(`Failed to delete: ${err.message}`, "error");
    }
  };
  return (() => {
    var _el$ = _tmpl$6(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$10 = _el$0.nextSibling; _el$10.nextSibling;
    _el$7.addEventListener("mouseleave", (e) => {
      e.currentTarget.style.opacity = "1";
      e.currentTarget.style.boxShadow = "0 2px 4px rgba(6, 182, 212, 0.2)";
      e.currentTarget.style.transform = "translateY(0)";
    });
    _el$7.addEventListener("mouseenter", (e) => {
      e.currentTarget.style.opacity = "0.9";
      e.currentTarget.style.boxShadow = "0 4px 8px rgba(6, 182, 212, 0.3)";
      e.currentTarget.style.transform = "translateY(-1px)";
    });
    _el$7.$$click = () => {
      if (activeTab() === "crds") {
        refetchCRDs();
      } else {
        refetchInstances();
      }
    };
    _el$9.addEventListener("mouseleave", (e) => {
      if (activeTab() !== "crds") {
        e.currentTarget.style.opacity = "0.7";
      }
    });
    _el$9.addEventListener("mouseenter", (e) => {
      if (activeTab() !== "crds") {
        e.currentTarget.style.opacity = "1";
      }
    });
    _el$9.$$click = () => {
      setActiveTab("crds");
      setShowInstances(false);
      setSelectedCRD(null);
    };
    insert(_el$9, () => crds()?.length || 0, _el$10);
    insert(_el$8, createComponent(Show, {
      get when() {
        return selectedCRD();
      },
      get children() {
        var _el$11 = _tmpl$(), _el$12 = _el$11.firstChild, _el$14 = _el$12.nextSibling; _el$14.nextSibling;
        _el$11.addEventListener("mouseleave", (e) => {
          if (activeTab() !== "instances") {
            e.currentTarget.style.opacity = "0.7";
          }
        });
        _el$11.addEventListener("mouseenter", (e) => {
          if (activeTab() !== "instances") {
            e.currentTarget.style.opacity = "1";
          }
        });
        _el$11.$$click = () => setActiveTab("instances");
        insert(_el$11, () => instances()?.length || 0, _el$14);
        createRenderEffect((_p$) => {
          var _v$ = activeTab() === "instances" ? "var(--accent-primary)" : "var(--text-secondary)", _v$2 = activeTab() === "instances" ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$3 = activeTab() === "instances" ? 1 : 0.7;
          _v$ !== _p$.e && setStyleProperty(_el$11, "color", _p$.e = _v$);
          _v$2 !== _p$.t && setStyleProperty(_el$11, "border-bottom", _p$.t = _v$2);
          _v$3 !== _p$.a && setStyleProperty(_el$11, "opacity", _p$.a = _v$3);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$11;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "crds";
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return !crds.loading;
          },
          get fallback() {
            return (() => {
              var _el$49 = _tmpl$7(), _el$50 = _el$49.firstChild; _el$50.nextSibling;
              return _el$49;
            })();
          },
          get children() {
            return createComponent(Show, {
              get when() {
                return (crds() || []).length > 0;
              },
              get fallback() {
                return (() => {
                  var _el$52 = _tmpl$8(); _el$52.firstChild;
                  return _el$52;
                })();
              },
              get children() {
                var _el$15 = _tmpl$2(), _el$16 = _el$15.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling; _el$25.nextSibling; var _el$27 = _el$17.nextSibling;
                insert(_el$27, createComponent(For, {
                  get each() {
                    return crds();
                  },
                  children: (crd) => (() => {
                    var _el$54 = _tmpl$9(), _el$55 = _el$54.firstChild, _el$56 = _el$55.firstChild, _el$57 = _el$55.nextSibling, _el$58 = _el$57.nextSibling, _el$59 = _el$58.nextSibling, _el$60 = _el$59.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$60.nextSibling, _el$63 = _el$62.nextSibling, _el$64 = _el$63.nextSibling;
                    _el$54.addEventListener("mouseleave", (e) => {
                      e.currentTarget.style.background = "transparent";
                    });
                    _el$54.addEventListener("mouseenter", (e) => {
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    });
                    insert(_el$56, () => crd.name);
                    insert(_el$57, () => crd.group);
                    insert(_el$58, () => crd.version);
                    insert(_el$59, () => crd.kind);
                    insert(_el$61, () => crd.scope);
                    insert(_el$62, () => crd.instances);
                    insert(_el$63, () => crd.age);
                    insert(_el$64, createComponent(ActionMenu, {
                      actions: [{
                        label: "View Instances",
                        icon: "details",
                        onClick: () => handleViewInstances(crd)
                      }]
                    }));
                    createRenderEffect((_p$) => {
                      var _v$7 = crd.scope === "Namespaced" ? "rgba(6, 182, 212, 0.2)" : "rgba(168, 85, 247, 0.2)", _v$8 = crd.scope === "Namespaced" ? "var(--accent-primary)" : "#a855f7";
                      _v$7 !== _p$.e && setStyleProperty(_el$61, "background", _p$.e = _v$7);
                      _v$8 !== _p$.t && setStyleProperty(_el$61, "color", _p$.t = _v$8);
                      return _p$;
                    }, {
                      e: void 0,
                      t: void 0
                    });
                    return _el$54;
                  })()
                }));
                return _el$15;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "instances")() && selectedCRD();
      },
      get children() {
        return [(() => {
          var _el$28 = _tmpl$3(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$34 = _el$31.nextSibling, _el$32 = _el$34.nextSibling, _el$35 = _el$32.nextSibling; _el$35.nextSibling;
          _el$29.addEventListener("mouseleave", (e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
          });
          _el$29.addEventListener("mouseenter", (e) => {
            e.currentTarget.style.color = "var(--accent-primary)";
          });
          _el$29.$$click = () => {
            setActiveTab("crds");
            setShowInstances(false);
            setSelectedCRD(null);
          };
          insert(_el$30, () => selectedCRD()?.kind, _el$34);
          insert(_el$30, () => selectedCRD()?.name, _el$35);
          return _el$28;
        })(), createComponent(Show, {
          get when() {
            return !instances.loading;
          },
          get fallback() {
            return (() => {
              var _el$65 = _tmpl$0(), _el$66 = _el$65.firstChild; _el$66.nextSibling;
              return _el$65;
            })();
          },
          get children() {
            return createComponent(Show, {
              get when() {
                return (instances() || []).length > 0;
              },
              get fallback() {
                return (() => {
                  var _el$68 = _tmpl$1(); _el$68.firstChild;
                  return _el$68;
                })();
              },
              get children() {
                var _el$36 = _tmpl$4(), _el$37 = _el$36.firstChild, _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling, _el$42 = _el$41.nextSibling; _el$42.nextSibling; var _el$44 = _el$38.nextSibling;
                insert(_el$44, createComponent(For, {
                  get each() {
                    return instances();
                  },
                  children: (instance) => (() => {
                    var _el$70 = _tmpl$10(), _el$71 = _el$70.firstChild, _el$72 = _el$71.firstChild, _el$73 = _el$71.nextSibling, _el$74 = _el$73.nextSibling, _el$75 = _el$74.nextSibling;
                    _el$70.addEventListener("mouseleave", (e) => {
                      e.currentTarget.style.background = "transparent";
                    });
                    _el$70.addEventListener("mouseenter", (e) => {
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    });
                    insert(_el$72, () => instance.name);
                    insert(_el$73, () => instance.namespace || "-");
                    insert(_el$74, () => instance.age);
                    insert(_el$75, createComponent(ActionMenu, {
                      actions: [{
                        label: "View YAML",
                        icon: "yaml",
                        onClick: () => handleViewYAML(instance, selectedCRD())
                      }, {
                        label: "Edit YAML",
                        icon: "edit",
                        onClick: () => handleEditYAML(instance, selectedCRD())
                      }, {
                        label: "Delete",
                        icon: "delete",
                        onClick: () => handleDelete(instance, selectedCRD()),
                        variant: "danger",
                        divider: true
                      }]
                    }));
                    return _el$70;
                  })()
                }));
                return _el$36;
              }
            });
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!showYaml())() && selectedInstance();
      },
      get children() {
        return createComponent(Modal, {
          get isOpen() {
            return showYaml();
          },
          onClose: () => {
            setShowYaml(false);
            setYamlContent("");
            setSelectedInstance(null);
          },
          get title() {
            return `${selectedCRD()?.kind}: ${selectedInstance()?.name}`;
          },
          get children() {
            return createComponent(Show, {
              get when() {
                return yamlLoading();
              },
              get fallback() {
                return createComponent(YAMLViewer, {
                  get content() {
                    return yamlContent();
                  }
                });
              },
              get children() {
                var _el$45 = _tmpl$5(); _el$45.firstChild;
                return _el$45;
              }
            });
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!showEdit())() && selectedInstance();
      },
      get children() {
        return createComponent(Modal, {
          get isOpen() {
            return showEdit();
          },
          onClose: () => {
            setShowEdit(false);
            setYamlContent("");
            setSelectedInstance(null);
          },
          get title() {
            return `Edit ${selectedCRD()?.kind}: ${selectedInstance()?.name}`;
          },
          get children() {
            return createComponent(Show, {
              get when() {
                return yamlLoading();
              },
              get fallback() {
                return createComponent(YAMLEditor, {
                  get yaml() {
                    return yamlContent();
                  },
                  onSave: handleSaveYAML,
                  onCancel: () => setShowEdit(false)
                });
              },
              get children() {
                var _el$47 = _tmpl$5(); _el$47.firstChild;
                return _el$47;
              }
            });
          }
        });
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$4 = activeTab() === "crds" ? "var(--accent-primary)" : "var(--text-secondary)", _v$5 = activeTab() === "crds" ? "2px solid var(--accent-primary)" : "2px solid transparent", _v$6 = activeTab() === "crds" ? 1 : 0.7;
      _v$4 !== _p$.e && setStyleProperty(_el$9, "color", _p$.e = _v$4);
      _v$5 !== _p$.t && setStyleProperty(_el$9, "border-bottom", _p$.t = _v$5);
      _v$6 !== _p$.a && setStyleProperty(_el$9, "opacity", _p$.a = _v$6);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { CustomResources as default };
//# sourceMappingURL=CustomResources-DVrby8wl.js.map
