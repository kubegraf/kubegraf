import { t as template, i as insert, m as memo, f as createRenderEffect, g as className, q as style, e as setAttribute, a as createMemo, d as createComponent, F as For, S as Show, c as createSignal, n as createEffect, u as addEventListener, M as Modal, v as delegateEvents, j as createResource, k as api, h as setStyleProperty, G as addNotification, o as onMount, a7 as currentView, T as Match, R as Switch, a5 as setNamespace, s as setCurrentView, a1 as currentTheme, a8 as addDeployment, a9 as updateDeploymentTask, aa as addPersistentNotification } from './index-Bh-O-sIc.js';
import { m as mlflowService } from './mlflow-DuxVEIg-.js';
import { F as FeastInstallWizard } from './FeastInstallWizard-iHJpL-hb.js';
import { C as CommandPreview } from './CommandPreview-C6bYxIqz.js';
import { Y as YAMLViewer } from './YAMLViewer-CNUTWpkV.js';

var _tmpl$$6 = /* @__PURE__ */ template(`<span class="inline-flex items-center gap-1 min-w-0"><span>`), _tmpl$2$6 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>namespace:`);
const NamespaceBadge = (props) => {
  const size = () => props.size || "xs";
  const badgeStyle = () => ({
    background: "rgba(139, 92, 246, 0.18)",
    // violet
    color: "#a78bfa",
    border: "1px solid rgba(139, 92, 246, 0.35)"
  });
  return (() => {
    var _el$ = _tmpl$$6(), _el$2 = _el$.firstChild;
    insert(_el$, (() => {
      var _c$ = memo(() => props.showLabel !== false);
      return () => _c$() && _tmpl$2$6();
    })(), _el$2);
    insert(_el$2, () => props.namespace);
    createRenderEffect((_p$) => {
      var _v$ = `font-mono rounded whitespace-nowrap truncate ${size() === "sm" ? "text-xs px-2 py-0.5" : "text-[11px] px-1.5 py-0.5"}`, _v$2 = badgeStyle(), _v$3 = props.namespace;
      _v$ !== _p$.e && className(_el$2, _p$.e = _v$);
      _p$.t = style(_el$2, _v$2, _p$.t);
      _v$3 !== _p$.a && setAttribute(_el$2, "title", _p$.a = _v$3);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};

var _tmpl$$5 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>+`), _tmpl$2$5 = /* @__PURE__ */ template(`<span class="inline-flex flex-wrap items-center gap-1">`);
const NamespaceBadges = (props) => {
  const maxShown = () => typeof props.maxShown === "number" ? props.maxShown : 3;
  const uniqueSorted = createMemo(() => {
    const set = /* @__PURE__ */ new Set();
    for (const ns of props.namespaces || []) {
      const v = String(ns || "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });
  const shown = createMemo(() => uniqueSorted().slice(0, maxShown()));
  const hiddenCount = createMemo(() => Math.max(0, uniqueSorted().length - shown().length));
  return (() => {
    var _el$ = _tmpl$2$5();
    insert(_el$, createComponent(For, {
      get each() {
        return shown();
      },
      children: (ns) => createComponent(NamespaceBadge, {
        namespace: ns,
        showLabel: false,
        get size() {
          return props.badgeSize || "xs";
        }
      })
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return hiddenCount() > 0;
      },
      get children() {
        var _el$2 = _tmpl$$5(); _el$2.firstChild;
        insert(_el$2, hiddenCount, null);
        return _el$2;
      }
    }), null);
    return _el$;
  })();
};

var _tmpl$$4 = /* @__PURE__ */ template(`<div class=text-xs style=color:var(--text-muted)>Uninstalling from: `), _tmpl$2$4 = /* @__PURE__ */ template(`<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Uninstalling...`), _tmpl$3$3 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-start gap-3"><div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"style="background:rgba(239, 68, 68, 0.15)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><div class=flex-1><p class="text-sm mb-3"style=color:var(--text-primary)>Choose where you want to uninstall <strong></strong> from:</p><div class="p-3 rounded-lg mb-4 space-y-2"style=background:var(--bg-tertiary)><div class="flex items-center justify-between"><div class="text-sm font-medium"style=color:var(--text-primary)>Installed Instances</div><div class="flex items-center gap-2"><button class="text-xs px-2 py-1 rounded"title="Select all"style="background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color)">Select all</button><button class="text-xs px-2 py-1 rounded"title="Clear selection"style="background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border-color)">Clear</button></div></div><div class=space-y-2></div><div class=text-xs style=color:var(--text-muted)> selected</div></div><div class="mt-4 p-4 rounded-lg border-l-4"style="background:rgba(239, 68, 68, 0.1);border-left-color:var(--error-color);border:1px solid rgba(239, 68, 68, 0.2)"><div class="flex items-start gap-3"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class=flex-1><h4 class="text-sm font-semibold mb-2"style=color:var(--error-color)>⚠️ Disruptive Action - Permanent Removal</h4><p class="text-sm mb-2"style=color:var(--text-primary)><strong>The selected application will be removed permanently from the cluster.</strong></p><ul class="text-xs space-y-1 mb-2"style=color:var(--text-secondary)><li class="flex items-start gap-2"><span class=mt-0.5>•</span><span>All application resources, configurations, and data will be permanently deleted</span></li><li class="flex items-start gap-2"><span class=mt-0.5>•</span><span>This action <strong>cannot be undone</strong> and data <strong>cannot be retrieved</strong></span></li><li class="flex items-start gap-2"><span class=mt-0.5>•</span><span>Any running services or workloads will be terminated immediately</span></li></ul><p class="text-xs font-medium"style=color:var(--error-color)>Please ensure you have backups of any important data before proceeding.</p></div></div></div></div></div><div class="flex justify-end gap-3 pt-4 border-t"style=border-color:var(--border-color)><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--error-color);color:white>`), _tmpl$4$2 = /* @__PURE__ */ template(`<span>v`), _tmpl$5$2 = /* @__PURE__ */ template(`<label class="flex items-center gap-3 p-2 rounded cursor-pointer"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><input type=checkbox><div class="min-w-0 flex-1"><div class="text-sm font-medium truncate"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)><span class="inline-flex items-center gap-2 flex-wrap">`);
const AppUninstallModal = (props) => {
  const [selectedKeys, setSelectedKeys] = createSignal(/* @__PURE__ */ new Set());
  const keyOf = (i) => `${i.releaseName}@@${i.namespace}`;
  createEffect(() => {
    if (!props.isOpen) return;
    const initial = props.initialSelection && props.initialSelection.length > 0 ? props.initialSelection : props.instances.length === 1 ? props.instances : [];
    setSelectedKeys(new Set(initial.map(keyOf)));
  });
  const selectedInstances = createMemo(() => {
    const keys = selectedKeys();
    return props.instances.filter((i) => keys.has(keyOf(i)));
  });
  const selectedNamespaces = createMemo(() => selectedInstances().map((i) => i.namespace));
  const toggle = (i) => {
    const next = new Set(selectedKeys());
    const k = keyOf(i);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelectedKeys(next);
  };
  const selectAll = () => setSelectedKeys(new Set(props.instances.map(keyOf)));
  const clearAll = () => setSelectedKeys(/* @__PURE__ */ new Set());
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    title: "Uninstall Application",
    size: "md",
    get children() {
      var _el$ = _tmpl$3$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.firstChild; var _el$5 = _el$3.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$0.nextSibling, _el$14 = _el$13.nextSibling, _el$15 = _el$14.firstChild, _el$19 = _el$9.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling; _el$25.nextSibling; var _el$27 = _el$2.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling;
      insert(_el$8, () => props.displayName);
      _el$11.$$click = selectAll;
      _el$12.$$click = clearAll;
      insert(_el$13, createComponent(For, {
        get each() {
          return props.instances;
        },
        children: (inst) => (() => {
          var _el$31 = _tmpl$5$2(), _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild;
          _el$32.$$input = () => toggle(inst);
          insert(_el$34, () => inst.releaseName);
          insert(_el$36, createComponent(NamespaceBadge, {
            get namespace() {
              return inst.namespace;
            }
          }), null);
          insert(_el$36, createComponent(Show, {
            get when() {
              return !!inst.version;
            },
            get children() {
              var _el$37 = _tmpl$4$2(); _el$37.firstChild;
              insert(_el$37, () => inst.version, null);
              return _el$37;
            }
          }), null);
          createRenderEffect(() => _el$32.disabled = props.loading);
          createRenderEffect(() => _el$32.checked = selectedKeys().has(keyOf(inst)));
          return _el$31;
        })()
      }));
      insert(_el$14, () => selectedInstances().length, _el$15);
      insert(_el$9, createComponent(Show, {
        get when() {
          return selectedInstances().length > 0;
        },
        get children() {
          var _el$16 = _tmpl$$4(); _el$16.firstChild;
          insert(_el$16, createComponent(NamespaceBadges, {
            get namespaces() {
              return selectedNamespaces();
            },
            maxShown: 6,
            badgeSize: "sm"
          }), null);
          return _el$16;
        }
      }), null);
      addEventListener(_el$28, "click", props.onClose, true);
      _el$29.$$click = () => props.onConfirm(selectedInstances());
      insert(_el$29, createComponent(Show, {
        get when() {
          return props.loading;
        },
        fallback: "Uninstall",
        get children() {
          return _tmpl$2$4();
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = props.loading, _v$2 = props.loading, _v$3 = props.loading, _v$4 = props.loading || selectedInstances().length === 0;
        _v$ !== _p$.e && (_el$11.disabled = _p$.e = _v$);
        _v$2 !== _p$.t && (_el$12.disabled = _p$.t = _v$2);
        _v$3 !== _p$.a && (_el$28.disabled = _p$.a = _v$3);
        _v$4 !== _p$.o && (_el$29.disabled = _p$.o = _v$4);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0
      });
      return _el$;
    }
  });
};
delegateEvents(["click", "input"]);

var _tmpl$$3 = /* @__PURE__ */ template(`<span class="flex items-center gap-2"><svg class="animate-spin h-4 w-4"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Removing...`), _tmpl$2$3 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-start gap-3"><div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"style="background:rgba(245, 158, 11, 0.15)"><svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--warning-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><div class=flex-1><p class="text-sm mb-3"style=color:var(--text-primary)>Are you sure you want to remove <strong></strong> from your custom apps?</p><div class="p-3 rounded-lg mb-4"style=background:var(--bg-tertiary)><div class="text-sm font-medium mb-1"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)>App ID: </div></div><p class="text-xs mb-4"style=color:var(--text-muted)>This will remove the app from your custom apps list. It will not uninstall any installed instances.</p></div></div><div class="flex justify-end gap-3 pt-4 border-t"style=border-color:var(--border-color)><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--warning-color);color:white>`);
const CustomAppDeleteModal = (props) => {
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    get onClose() {
      return props.onClose;
    },
    title: "Remove Custom App",
    size: "md",
    get children() {
      var _el$ = _tmpl$2$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild; _el$3.firstChild; var _el$5 = _el$3.nextSibling, _el$6 = _el$5.firstChild, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling, _el$9 = _el$6.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling; _el$1.firstChild; _el$9.nextSibling; var _el$12 = _el$2.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling;
      insert(_el$8, () => props.displayName);
      insert(_el$0, () => props.displayName);
      insert(_el$1, () => props.appName, null);
      addEventListener(_el$13, "click", props.onClose, true);
      addEventListener(_el$14, "click", props.onConfirm, true);
      insert(_el$14, createComponent(Show, {
        get when() {
          return props.loading;
        },
        fallback: "Remove",
        get children() {
          return _tmpl$$3();
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = props.loading, _v$2 = props.loading;
        _v$ !== _p$.e && (_el$13.disabled = _p$.e = _v$);
        _v$2 !== _p$.t && (_el$14.disabled = _p$.t = _v$2);
        return _p$;
      }, {
        e: void 0,
        t: void 0
      });
      return _el$;
    }
  });
};
delegateEvents(["click"]);

var _tmpl$$2 = /* @__PURE__ */ template(`<div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4"><div class=p-6><div class="flex items-center justify-between mb-6"><h2 class="text-2xl font-bold">Install MLflow</h2><button class="text-gray-500 hover:text-gray-700 text-2xl">×</button></div><div class=space-y-6><div><label class="block text-sm font-medium mb-2">Namespace</label><select class="w-full px-3 py-2 border rounded-lg"></select></div><div><label class="block text-sm font-medium mb-2">Backend Store</label><select class="w-full px-3 py-2 border rounded-lg"><option value=pvc>PVC (Persistent Volume Claim)</option><option value=minio>MinIO</option><option value=s3>Amazon S3</option><option value=gcs>Google Cloud Storage</option></select></div><div><label class="block text-sm font-medium mb-2">Artifact Store</label><select class="w-full px-3 py-2 border rounded-lg"><option value=pvc>PVC (Persistent Volume Claim)</option><option value=minio>MinIO</option><option value=s3>Amazon S3</option><option value=gcs>Google Cloud Storage</option></select></div><div><label class="block text-sm font-medium mb-2">Version</label><select class="w-full px-3 py-2 border rounded-lg"><option value>Latest (<!>)</option></select></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2">CPU Limit</label><input type=text placeholder=500m class="w-full px-3 py-2 border rounded-lg"></div><div><label class="block text-sm font-medium mb-2">Memory Limit</label><input type=text placeholder=1Gi class="w-full px-3 py-2 border rounded-lg"></div></div><div class=space-y-3><label class="flex items-center gap-2"><input type=checkbox class="w-4 h-4"><span class=text-sm>Enable Tracking UI</span></label><label class="flex items-center gap-2"><input type=checkbox class="w-4 h-4"><span class=text-sm>Enable Ingress/Gateway</span></label></div><div class="flex gap-3 justify-end pt-4 border-t"><button class="px-6 py-2 rounded-lg border hover:bg-gray-50">Cancel</button><button class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">`), _tmpl$3$2 = /* @__PURE__ */ template(`<option>`);
const MLflowInstallWizard = (props) => {
  const [namespace, setNamespace] = createSignal("mlflow");
  const [backendStore, setBackendStore] = createSignal("pvc");
  const [artifactStore, setArtifactStore] = createSignal("pvc");
  const [enableUI, setEnableUI] = createSignal(true);
  const [enableIngress, setEnableIngress] = createSignal(false);
  const [cpu, setCpu] = createSignal("500m");
  const [memory, setMemory] = createSignal("1Gi");
  const [version, setVersion] = createSignal("");
  const [installing, setInstalling] = createSignal(false);
  const [error, setError] = createSignal("");
  const [namespaces] = createResource(api.getNamespaces);
  const [versions] = createResource(mlflowService.getVersions);
  const handleInstall = async () => {
    setInstalling(true);
    setError("");
    try {
      const request = {
        namespace: namespace(),
        backendStore: backendStore(),
        artifactStore: artifactStore(),
        enableUI: enableUI(),
        enableIngress: enableIngress(),
        cpu: cpu(),
        memory: memory(),
        version: version() || versions()?.latest || "2.8.0"
      };
      const result = await mlflowService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError("Installation failed");
      }
    } catch (err) {
      setError(err.message || "Installation failed");
    } finally {
      setInstalling(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$2$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$8.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$1.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$21 = _el$19.nextSibling; _el$21.nextSibling; var _el$22 = _el$15.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$23.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling, _el$29 = _el$22.nextSibling, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$30.nextSibling, _el$33 = _el$32.firstChild, _el$35 = _el$29.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling;
    addEventListener(_el$6, "click", props.onClose, true);
    _el$0.addEventListener("change", (e) => setNamespace(e.currentTarget.value));
    insert(_el$0, createComponent(For, {
      get each() {
        return namespaces() || [];
      },
      children: (ns) => (() => {
        var _el$38 = _tmpl$3$2();
        insert(_el$38, () => ns.name);
        createRenderEffect(() => _el$38.value = ns.name);
        return _el$38;
      })()
    }));
    _el$11.addEventListener("change", (e) => setBackendStore(e.currentTarget.value));
    _el$14.addEventListener("change", (e) => setArtifactStore(e.currentTarget.value));
    _el$17.addEventListener("change", (e) => setVersion(e.currentTarget.value));
    insert(_el$18, () => versions()?.latest || "2.8.0", _el$21);
    insert(_el$17, createComponent(For, {
      get each() {
        return versions()?.versions || [];
      },
      children: (v) => (() => {
        var _el$39 = _tmpl$3$2();
        _el$39.value = v;
        insert(_el$39, v);
        return _el$39;
      })()
    }), null);
    _el$25.addEventListener("change", (e) => setCpu(e.currentTarget.value));
    _el$28.addEventListener("change", (e) => setMemory(e.currentTarget.value));
    _el$31.addEventListener("change", (e) => setEnableUI(e.currentTarget.checked));
    _el$33.addEventListener("change", (e) => setEnableIngress(e.currentTarget.checked));
    insert(_el$7, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$34 = _tmpl$$2();
        insert(_el$34, error);
        return _el$34;
      }
    }), _el$35);
    addEventListener(_el$36, "click", props.onClose, true);
    _el$37.$$click = handleInstall;
    insert(_el$37, () => installing() ? "Installing..." : "Install");
    createRenderEffect((_p$) => {
      var _v$ = installing(), _v$2 = installing();
      _v$ !== _p$.e && (_el$36.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$37.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$0.value = namespace());
    createRenderEffect(() => _el$11.value = backendStore());
    createRenderEffect(() => _el$14.value = artifactStore());
    createRenderEffect(() => _el$17.value = version());
    createRenderEffect(() => _el$25.value = cpu());
    createRenderEffect(() => _el$28.value = memory());
    createRenderEffect(() => _el$31.checked = enableUI());
    createRenderEffect(() => _el$33.checked = enableIngress());
    return _el$;
  })();
};
delegateEvents(["click"]);

const kubernetesEssentialsApps = [
  {
    name: "nginx-ingress",
    displayName: "NGINX Ingress",
    description: "Ingress controller for Kubernetes using NGINX as a reverse proxy",
    category: "kubernetes-essentials",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    version: "4.9.0",
    chartRepo: "https://kubernetes.github.io/ingress-nginx",
    chartName: "ingress-nginx",
    tags: ["ingress", "networking", "load-balancer"],
    maintainer: "Kubernetes",
    sourceCitation: "Helm Chart: https://kubernetes.github.io/ingress-nginx | Official: https://kubernetes.github.io/ingress-nginx",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["ingress-nginx", "default"]
    }
  },
  {
    name: "argocd",
    displayName: "Argo CD",
    description: "Declarative GitOps continuous delivery tool for Kubernetes",
    category: "kubernetes-essentials",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    version: "5.51.0",
    chartRepo: "https://argoproj.github.io/argo-helm",
    chartName: "argo-cd",
    tags: ["gitops", "cicd", "deployment"],
    maintainer: "Argo Project",
    sourceCitation: "Helm Chart: https://argoproj.github.io/argo-helm | Official: https://argo-cd.readthedocs.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["argocd"]
    }
  },
  {
    name: "fluxcd",
    displayName: "Flux CD",
    description: "GitOps toolkit for continuous and progressive delivery",
    category: "kubernetes-essentials",
    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
    version: "2.12.0",
    chartRepo: "https://fluxcd-community.github.io/helm-charts",
    chartName: "flux2",
    tags: ["gitops", "cicd"],
    maintainer: "Flux Project",
    sourceCitation: "Helm Chart: https://fluxcd-community.github.io/helm-charts | Official: https://fluxcd.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["flux-system"]
    }
  }
];

const observabilityApps = [
  {
    name: "prometheus",
    displayName: "Prometheus",
    description: "Monitoring system and time series database for metrics",
    category: "observability",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    version: "25.8.0",
    chartRepo: "https://prometheus-community.github.io/helm-charts",
    chartName: "prometheus",
    tags: ["metrics", "monitoring", "alerting"],
    maintainer: "Prometheus Community",
    sourceCitation: "Helm Chart: https://prometheus-community.github.io/helm-charts | Official: https://prometheus.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["monitoring", "prometheus"]
    }
  },
  {
    name: "grafana",
    displayName: "Grafana",
    description: "Analytics & monitoring dashboards for all your metrics",
    category: "observability",
    icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    version: "7.0.19",
    chartRepo: "https://grafana.github.io/helm-charts",
    chartName: "grafana",
    tags: ["dashboards", "visualization", "metrics"],
    maintainer: "Grafana Labs",
    sourceCitation: "Helm Chart: https://grafana.github.io/helm-charts | Official: https://grafana.com",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["monitoring", "grafana"]
    }
  },
  {
    name: "loki",
    displayName: "Loki",
    description: "Like Prometheus, but for logs - scalable log aggregation",
    category: "observability",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    version: "5.41.4",
    chartRepo: "https://grafana.github.io/helm-charts",
    chartName: "loki-stack",
    tags: ["logs", "aggregation", "storage"],
    maintainer: "Grafana Labs",
    sourceCitation: "Helm Chart: https://grafana.github.io/helm-charts | Official: https://grafana.com/docs/loki",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["monitoring", "loki"]
    }
  },
  {
    name: "tempo",
    displayName: "Tempo",
    description: "High-scale distributed tracing backend",
    category: "observability",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    version: "1.7.1",
    chartRepo: "https://grafana.github.io/helm-charts",
    chartName: "tempo",
    tags: ["tracing", "distributed-tracing", "opentelemetry"],
    maintainer: "Grafana Labs",
    sourceCitation: "Helm Chart: https://grafana.github.io/helm-charts | Official: https://grafana.com/docs/tempo",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["monitoring", "tempo"]
    }
  },
  {
    name: "kube-prometheus-stack",
    displayName: "Kube Prometheus Stack",
    description: "Full Prometheus + Grafana + Alertmanager observability stack",
    category: "observability",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    version: "55.5.0",
    chartRepo: "https://prometheus-community.github.io/helm-charts",
    chartName: "kube-prometheus-stack",
    tags: ["full-stack", "prometheus", "grafana", "alertmanager"],
    maintainer: "Prometheus Community",
    sourceCitation: "Helm Chart: https://prometheus-community.github.io/helm-charts | GitHub: https://github.com/prometheus-community/kube-prometheus-stack",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["monitoring"]
    }
  }
];

const securityApps = [
  {
    name: "cert-manager",
    displayName: "cert-manager",
    description: "Automatically provision and manage TLS certificates",
    category: "security",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    version: "1.13.3",
    chartRepo: "https://charts.jetstack.io",
    chartName: "cert-manager",
    tags: ["tls", "certificates", "ssl"],
    maintainer: "Jetstack",
    sourceCitation: "Helm Chart: https://charts.jetstack.io | Official: https://cert-manager.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["cert-manager"]
    }
  },
  {
    name: "vault",
    displayName: "HashiCorp Vault",
    description: "Secrets management, encryption, and privileged access",
    category: "security",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    version: "0.27.0",
    chartRepo: "https://helm.releases.hashicorp.com",
    chartName: "vault",
    tags: ["secrets", "encryption", "security"],
    maintainer: "HashiCorp",
    sourceCitation: "Helm Chart: https://helm.releases.hashicorp.com | Official: https://www.vaultproject.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["vault"]
    }
  }
];

const serviceMeshApps = [
  {
    name: "istio",
    displayName: "Istio Service Mesh",
    description: "Connect, secure, control, and observe services across your cluster",
    category: "service-mesh",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
    version: "1.20.0",
    chartRepo: "https://istio-release.storage.googleapis.com/charts",
    chartName: "istiod",
    tags: ["service-mesh", "networking", "security"],
    maintainer: "Istio",
    sourceCitation: "Helm Chart: https://istio-release.storage.googleapis.com/charts | Official: https://istio.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["istio-system"]
    }
  },
  {
    name: "kiali",
    displayName: "Kiali",
    description: "Service mesh observability console for Istio. Visualize service topology, health, and traffic flow",
    category: "service-mesh",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    version: "1.73.0",
    chartRepo: "https://kiali.org/helm-charts",
    chartName: "kiali-server",
    tags: ["observability", "istio", "service-mesh", "topology"],
    maintainer: "Kiali",
    documentation: "https://kiali.io/docs/",
    sourceCitation: "Helm Chart: https://kiali.org/helm-charts | Official: https://kiali.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["istio-system", "kiali-operator"]
    }
  },
  {
    name: "cilium",
    displayName: "Cilium CNI",
    description: "eBPF-based networking, observability, and security for Kubernetes",
    category: "service-mesh",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    version: "1.14.5",
    chartRepo: "https://helm.cilium.io/",
    chartName: "cilium",
    tags: ["cni", "ebpf", "networking", "security"],
    maintainer: "Cilium",
    sourceCitation: "Helm Chart: https://helm.cilium.io/ | Official: https://cilium.io",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["kube-system"]
    }
  }
];

const machineLearningApps = [
  {
    name: "mlflow",
    displayName: "MLflow",
    description: "Open source platform for managing the ML lifecycle, including experimentation, reproducibility, deployment, and a central model registry",
    category: "machine-learning",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    version: "2.8.0",
    chartRepo: "https://community-charts.github.io/helm-charts",
    chartName: "mlflow",
    tags: ["mlops", "experiment-tracking", "model-registry"],
    maintainer: "MLflow",
    documentation: "https://mlflow.org/docs/latest/index.html",
    sourceCitation: "Helm Chart: https://community-charts.github.io/helm-charts | Official: https://mlflow.org",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["mlflow"]
    }
  },
  {
    name: "feast",
    displayName: "Feast Feature Store",
    description: "Open source feature store for machine learning. Store, manage, and serve features for training and inference",
    category: "machine-learning",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    version: "0.38.0",
    chartRepo: "https://feast-charts.storage.googleapis.com",
    chartName: "feast",
    tags: ["feature-store", "ml", "data"],
    maintainer: "Feast",
    documentation: "https://docs.feast.dev/",
    sourceCitation: "Helm Chart: https://feast-charts.storage.googleapis.com | Official: https://feast.dev",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["feast"]
    }
  },
  {
    name: "kserve",
    displayName: "KServe",
    description: "Serverless inferencing for ML models on Kubernetes. High performance model serving with autoscaling",
    category: "machine-learning",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    version: "0.12.0",
    chartRepo: "https://kserve.github.io/kserve",
    chartName: "kserve",
    tags: ["model-serving", "inference", "serverless"],
    maintainer: "KServe",
    documentation: "https://kserve.github.io/website/",
    sourceCitation: "Helm Chart: https://kserve.github.io/kserve | Official: https://kserve.github.io/website",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["kserve", "kserve-system"]
    }
  },
  {
    name: "bentoml",
    displayName: "BentoML",
    description: "Unified Model Serving Framework. Build, ship, and scale ML models with ease",
    category: "machine-learning",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    version: "1.0.0",
    chartRepo: "https://bentoml.github.io/helm-charts",
    chartName: "bentoml",
    tags: ["model-serving", "mlops", "deployment"],
    maintainer: "BentoML",
    documentation: "https://docs.bentoml.com/",
    sourceCitation: "Helm Chart: https://bentoml.github.io/helm-charts | Official: https://www.bentoml.com",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["bentoml"]
    }
  }
];

const databaseApps = [
  {
    name: "postgresql",
    displayName: "PostgreSQL",
    description: "Advanced open-source relational database with JSON support and ACID compliance",
    category: "database",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
    version: "16.2.0",
    chartRepo: "https://charts.bitnami.com/bitnami",
    chartName: "postgresql",
    tags: ["database", "sql", "rdbms", "postgres"],
    maintainer: "Bitnami",
    sourceCitation: "Helm Chart: https://charts.bitnami.com/bitnami | PostgreSQL: https://www.postgresql.org",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["default", "database", "postgresql"]
    }
  },
  {
    name: "mysql",
    displayName: "MySQL",
    description: "Popular open-source relational database management system",
    category: "database",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
    version: "10.6.0",
    chartRepo: "https://charts.bitnami.com/bitnami",
    chartName: "mysql",
    tags: ["database", "sql", "rdbms", "mysql"],
    maintainer: "Bitnami",
    sourceCitation: "Helm Chart: https://charts.bitnami.com/bitnami | MySQL: https://www.mysql.com",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["default", "database", "mysql"]
    }
  },
  {
    name: "memcached",
    displayName: "Memcached",
    description: "High-performance distributed memory caching system",
    category: "database",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
    version: "6.4.0",
    chartRepo: "https://charts.bitnami.com/bitnami",
    chartName: "memcached",
    tags: ["cache", "memory", "key-value", "memcached"],
    maintainer: "Bitnami",
    sourceCitation: "Helm Chart: https://charts.bitnami.com/bitnami | Memcached: https://memcached.org",
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ["default", "database", "cache", "memcached"]
    }
  }
];

const localClusterApps = [
  {
    name: "k3d",
    displayName: "k3d - Local Kubernetes",
    description: "Lightweight wrapper to run k3s in Docker. Perfect for local development and testing.",
    category: "local-cluster",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
    version: "Latest",
    chartRepo: "local-cluster",
    chartName: "k3d",
    tags: ["local", "development", "docker", "k3s"],
    maintainer: "Rancher",
    sourceCitation: "k3d Official Documentation - https://k3d.io",
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ["default"]
    }
  },
  {
    name: "kind",
    displayName: "kind - Kubernetes in Docker",
    description: "Run local Kubernetes clusters using Docker container nodes. Great for CI/CD and development.",
    category: "local-cluster",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
    version: "Latest",
    chartRepo: "local-cluster",
    chartName: "kind",
    tags: ["local", "development", "docker", "ci-cd"],
    maintainer: "Kubernetes SIGs",
    sourceCitation: "kind Official Documentation - https://kind.sigs.k8s.io",
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ["default"]
    }
  },
  {
    name: "minikube",
    displayName: "Minikube - Local Kubernetes",
    description: "Run Kubernetes locally. Minikube runs a single-node Kubernetes cluster inside a VM on your laptop.",
    category: "local-cluster",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
    version: "Latest",
    chartRepo: "local-cluster",
    chartName: "minikube",
    tags: ["local", "development", "vm", "single-node"],
    maintainer: "Kubernetes",
    sourceCitation: "Minikube Official Documentation - https://minikube.sigs.k8s.io",
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ["default"]
    }
  }
];

const marketplaceCatalog = [
  ...kubernetesEssentialsApps,
  ...observabilityApps,
  ...securityApps,
  ...serviceMeshApps,
  ...machineLearningApps,
  ...databaseApps,
  ...localClusterApps
];

const marketplaceCategories = [
  {
    id: "kubernetes-essentials",
    name: "Kubernetes Essentials",
    description: "Core Kubernetes tools and utilities",
    color: "#3b82f6",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
  },
  {
    id: "observability",
    name: "Observability",
    description: "Monitoring, logging, and tracing solutions",
    color: "#f97316",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  },
  {
    id: "security",
    name: "Security",
    description: "Security tools and policies",
    color: "#22c55e",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
  },
  {
    id: "service-mesh",
    name: "Service Mesh",
    description: "Service mesh solutions and observability",
    color: "#8b5cf6",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    description: "ML platforms, feature stores, and model serving",
    color: "#ec4899",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  },
  {
    id: "database",
    name: "Database",
    description: "Databases and data storage solutions",
    color: "#10b981",
    icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
  },
  {
    id: "local-cluster",
    name: "Local Cluster",
    description: "Local Kubernetes cluster installers for development and testing",
    color: "#10b981",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
  }
];
const getCategoryById = (id) => {
  return marketplaceCategories.find((cat) => cat.id === id);
};
const getCategoryColor = (categoryId) => {
  const category = getCategoryById(categoryId);
  return category?.color || "#6b7280";
};

function marketplaceAppToLegacyApp(marketplaceApp) {
  return {
    name: marketplaceApp.name,
    displayName: marketplaceApp.displayName,
    description: marketplaceApp.description,
    category: marketplaceApp.category,
    icon: marketplaceApp.icon,
    version: marketplaceApp.version,
    chartRepo: marketplaceApp.chartRepo,
    chartName: marketplaceApp.chartName,
    maintainer: marketplaceApp.maintainer,
    documentation: marketplaceApp.documentation,
    sourceCitation: marketplaceApp.sourceCitation,
    installedInstances: marketplaceApp.installedInstances?.map((inst) => ({
      namespace: inst.namespace,
      chart: inst.chart,
      version: inst.version,
      releaseName: inst.releaseName
    })),
    isCustom: marketplaceApp.isCustom
  };
}
function mapLegacyCategoryToNew(category) {
  const categoryMap = {
    "Networking": "kubernetes-essentials",
    "CI/CD": "kubernetes-essentials",
    "Observability": "observability",
    "Security": "security",
    "Data": "database",
    "ML Apps": "machine-learning",
    "Local Cluster": "local-cluster"
  };
  return categoryMap[category] || category.toLowerCase().replace(/\s+/g, "-");
}

class InstallStatusTracker {
  statuses = /* @__PURE__ */ new Map();
  /**
   * Get installation status for an app instance
   */
  getStatus(appName, namespace, clusterName) {
    const key = this.getKey(appName, namespace, clusterName);
    return this.statuses.get(key);
  }
  /**
   * Set installation status
   */
  setStatus(appName, namespace, status, progress, message, error, clusterName) {
    const key = this.getKey(appName, namespace, clusterName);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = this.statuses.get(key);
    this.statuses.set(key, {
      status,
      progress,
      message,
      error,
      installedAt: status === "installed" && !existing?.installedAt ? now : existing?.installedAt,
      updatedAt: now
    });
  }
  /**
   * Update installation progress
   */
  updateProgress(appName, namespace, progress, message, clusterName) {
    const key = this.getKey(appName, namespace, clusterName);
    const existing = this.statuses.get(key);
    if (existing) {
      this.statuses.set(key, {
        ...existing,
        progress,
        message,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  /**
   * Mark installation as complete
   */
  markInstalled(appName, namespace, message, clusterName) {
    this.setStatus(appName, namespace, "installed", 100, message, void 0, clusterName);
  }
  /**
   * Mark installation as failed
   */
  markFailed(appName, namespace, error, clusterName) {
    this.setStatus(appName, namespace, "failed", 0, void 0, error, clusterName);
  }
  /**
   * Clear status
   */
  clearStatus(appName, namespace, clusterName) {
    const key = this.getKey(appName, namespace, clusterName);
    this.statuses.delete(key);
  }
  /**
   * Get all statuses for an app across namespaces/clusters
   */
  getAllStatuses(appName) {
    const results = [];
    for (const [key, status] of this.statuses.entries()) {
      if (key.startsWith(`${appName}:`)) {
        results.push(status);
      }
    }
    return results;
  }
  /**
   * Generate unique key for app instance
   */
  getKey(appName, namespace, clusterName) {
    return clusterName ? `${appName}:${namespace}:${clusterName}` : `${appName}:${namespace}`;
  }
  /**
   * Sync with installed instances from backend
   */
  syncWithInstalled(installed) {
    for (const instance of installed) {
      const status = instance.status || "installed";
      this.setStatus(
        instance.releaseName,
        instance.namespace,
        status,
        status === "installed" ? 100 : void 0,
        `Installed version ${instance.version}`,
        void 0,
        instance.clusterName
      );
    }
  }
}
const installStatusTracker = new InstallStatusTracker();

function validateClusterName(name) {
  if (!name) {
    return { valid: false, error: "Cluster name is required" };
  }
  if (!name.startsWith("kubegraf-")) {
    return { valid: false, error: 'Cluster name must start with "kubegraf-"' };
  }
  if (name.length < 9 || name.length > 50) {
    return { valid: false, error: "Cluster name must be between 9 and 50 characters" };
  }
  const suffix = name.substring(9);
  if (!/^[a-z0-9-]+$/.test(suffix)) {
    return {
      valid: false,
      error: "Cluster name suffix can only contain lowercase letters, numbers, and hyphens"
    };
  }
  return { valid: true };
}
function generateDefaultClusterName() {
  const timestamp = Date.now().toString(36);
  return `kubegraf-${timestamp}`;
}
function isLocalClusterApp(appName) {
  return ["k3d", "kind", "minikube"].includes(appName);
}

function getDockerInstallUrl() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("win")) {
    return "https://www.docker.com/products/docker-desktop/";
  } else if (userAgent.includes("mac")) {
    return "https://www.docker.com/products/docker-desktop/";
  } else {
    return "https://docs.docker.com/get-docker/";
  }
}
function formatDockerError() {
  const installUrl = getDockerInstallUrl();
  const osName = navigator.userAgent.includes("Win") ? "Windows" : navigator.userAgent.includes("Mac") ? "macOS" : "Linux";
  return {
    message: `Docker is not installed or not running on ${osName}. Local clusters (k3d, kind, minikube) require Docker Desktop to be installed and running.`,
    installUrl
  };
}

function chartBaseName(chart) {
  if (!chart) return "";
  const lower = chart.toLowerCase();
  const idx = lower.lastIndexOf("-");
  if (idx <= 0) return lower;
  return lower.slice(0, idx);
}
function matchesAppRelease(app, rel) {
  if (!rel) return false;
  const relName = (rel.name || "").toLowerCase();
  const appName = (app.name || "").toLowerCase();
  if (relName === appName) return true;
  const relChart = (rel.chart || "").toLowerCase();
  const appChart = (app.chartName || "").toLowerCase();
  if (!relChart || !appChart) return false;
  if (chartBaseName(relChart) === appChart) return true;
  return relChart.includes(appChart);
}
function toInstalledInstance(rel) {
  const statusInfo = installStatusTracker.getStatus(rel.name, rel.namespace);
  return {
    namespace: rel.namespace,
    chart: rel.chart || "",
    version: rel.version || "",
    releaseName: rel.name,
    status: statusInfo?.status || "installed"
  };
}
function getInstalledInstancesForApp(app, installed) {
  const instances = (installed || []).filter((r) => matchesAppRelease(app, r)).map((r) => toInstalledInstance(r));
  return instances.sort((a, b) => {
    const ns = a.namespace.localeCompare(b.namespace);
    if (ns !== 0) return ns;
    return a.releaseName.localeCompare(b.releaseName);
  });
}
function getInstalledNamespaces(instances) {
  const set = /* @__PURE__ */ new Set();
  for (const i of instances || []) {
    if (i.namespace) set.add(i.namespace);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function formatNamespacesForUninstall(namespaces, maxShown = 4) {
  const unique = Array.from(
    new Set((namespaces || []).map((n) => String(n || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  if (unique.length === 0) return "";
  if (unique.length === 1) return `namespace:${unique[0]}`;
  if (unique.length <= maxShown) {
    return unique.map((n) => `namespace:${n}`).join(", ");
  }
  const shown = unique.slice(0, maxShown).map((n) => `namespace:${n}`).join(", ");
  return `${shown} (+${unique.length - maxShown} more)`;
}

const CURATED_SOURCES = {
  "https://kubernetes.github.io/ingress-nginx::ingress-nginx": {
    publisher: "Kubernetes SIGs",
    officialDocsUrl: "https://kubernetes.github.io/ingress-nginx/",
    githubUrl: "https://github.com/kubernetes/ingress-nginx"
  },
  "https://prometheus-community.github.io/helm-charts::kube-prometheus-stack": {
    publisher: "prometheus-community",
    officialDocsUrl: "https://prometheus.io/",
    githubUrl: "https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack"
  },
  "https://grafana.github.io/helm-charts::grafana": {
    publisher: "Grafana Labs",
    officialDocsUrl: "https://grafana.com/docs/",
    githubUrl: "https://github.com/grafana/helm-charts"
  },
  "https://charts.bitnami.com/bitnami::postgresql": {
    publisher: "Bitnami",
    officialDocsUrl: "https://www.postgresql.org/",
    githubUrl: "https://github.com/bitnami/charts"
  },
  "https://charts.bitnami.com/bitnami::mysql": {
    publisher: "Bitnami",
    officialDocsUrl: "https://www.mysql.com/",
    githubUrl: "https://github.com/bitnami/charts"
  }
};
const VERIFIED_REPO_ALLOWLIST = /* @__PURE__ */ new Set([
  "https://kubernetes.github.io/ingress-nginx",
  "https://prometheus-community.github.io/helm-charts",
  "https://grafana.github.io/helm-charts",
  "https://charts.bitnami.com/bitnami"
]);
function buildKey(app) {
  return `${app.chartRepo}::${app.chartName}`;
}
function getAppSourceMetadata(app) {
  const isManifestDeployment = app.deploymentType === "manifest" || app.chartName && app.chartName.startsWith("kubegraf-") && !app.chartRepo;
  const isHelmChartDeployment = app.deploymentType === "helm";
  if (isManifestDeployment) {
    return {
      publisher: app.displayName || app.name || "Custom manifest",
      helmRepo: "",
      chartName: app.name || "Custom App",
      chartVersion: void 0,
      appVersion: app.version,
      officialDocsUrl: void 0,
      githubUrl: void 0,
      chartDigest: void 0,
      verified: false,
      verifiedBy: void 0,
      trustLabel: "Manifest deployment",
      integrityNote: "Deployed directly from Kubernetes manifests (YAML files), not from a Helm chart repository.",
      isManifestDeployment: true
    };
  }
  if (isHelmChartDeployment) {
    return {
      publisher: app.displayName || app.chartName || app.name || "Custom Helm chart",
      helmRepo: "Uploaded chart",
      chartName: app.chartName || app.name || "Custom Chart",
      chartVersion: app.chartVersion || app.version,
      appVersion: app.version,
      officialDocsUrl: void 0,
      githubUrl: void 0,
      chartDigest: void 0,
      verified: false,
      verifiedBy: void 0,
      trustLabel: "Helm chart deployment",
      integrityNote: "Deployed from uploaded Helm chart files. Chart was rendered and applied to the cluster.",
      isManifestDeployment: false
    };
  }
  const key = buildKey(app);
  const curated = CURATED_SOURCES[key] || {};
  const helmRepo = app.chartRepo || curated.helmRepo || "";
  const chartName = app.chartName || curated.chartName || app.name;
  const publisher = curated.publisher || // If we later extend LegacyApp with maintainer, use that as a fallback:
  // app.maintainer ||
  app.displayName || "Community source";
  const verified = helmRepo ? VERIFIED_REPO_ALLOWLIST.has(helmRepo) : false;
  const trustLabel = verified ? "Verified publisher" : "Community source";
  const integrityNote = verified ? "Repository is on KubeGraf's verified allowlist; chart is installed from an HTTPS Helm repo." : "Source is treated as a community chart; chart is installed from its Helm repo without additional verification.";
  return {
    publisher,
    helmRepo,
    chartName,
    chartVersion: app.version,
    appVersion: app.version,
    officialDocsUrl: curated.officialDocsUrl,
    githubUrl: curated.githubUrl,
    chartDigest: curated.chartDigest,
    verified,
    verifiedBy: verified ? "repo allowlist + curated index" : void 0,
    trustLabel,
    integrityNote,
    isManifestDeployment: false
  };
}

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="flex gap-2 p-1 rounded-lg"style=background:var(--bg-tertiary)><button>📄 Standalone Manifests</button><button>⎈ Helm Charts`), _tmpl$2$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-primary)>Kubernetes Manifests (YAML files)</label><div><input type=file multiple accept=.yaml,.yml,text/yaml class=hidden id=manifest-file-input><label for=manifest-file-input class=cursor-pointer><svg class="w-12 h-12 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg><p class="text-sm mb-2"style=color:var(--text-primary)>Drag and drop YAML files here, or click to select</p><p class=text-xs style=color:var(--text-muted)>Supports multiple YAML files (.yaml, .yml)`), _tmpl$3$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-primary)>Helm Chart Directory</label><div><input type=file multiple directory mozdirectory class=hidden id=helm-folder-input><input type=file multiple accept=.yaml,.yml class=hidden id=helm-file-input><div class=space-y-4><label for=helm-folder-input class="cursor-pointer block"><svg class="w-12 h-12 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg><p class="text-sm mb-2"style=color:var(--text-primary)>Select Helm Chart Folder</p><p class=text-xs style=color:var(--text-muted)>Must contain Chart.yaml, values.yaml, and templates/</p></label><div class=text-xs style=color:var(--text-muted)>or</div><label for=helm-file-input class="cursor-pointer block"><p class=text-sm style=color:var(--text-primary)>Select Individual Files</p><p class=text-xs style=color:var(--text-muted)>Chart.yaml, values.yaml, and template files`), _tmpl$4$1 = /* @__PURE__ */ template(`<span class=font-mono> v`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="mt-4 p-4 rounded-lg"style=background:var(--bg-tertiary)><p class="text-sm font-medium mb-2"style=color:var(--text-primary)></p><ul class="space-y-1 max-h-40 overflow-y-auto">`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="mt-4 p-4 rounded-lg border-l-4"style="background:rgba(239, 68, 68, 0.1);border-left-color:#ef4444"><p class="text-sm font-medium mb-2"style=color:#ef4444>Validation Errors:</p><ul class="text-sm space-y-1"style=color:#ef4444>`), _tmpl$7$1 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border-l-4"style="background:rgba(239, 68, 68, 0.1);border-left-color:#ef4444"><p class=text-sm style=color:#ef4444>`), _tmpl$8$1 = /* @__PURE__ */ template(`<div class=space-y-4><div><label class="block text-sm font-medium mb-2"style=color:var(--text-primary)>Namespace</label><div class=space-y-2><input type=text placeholder="Enter namespace name (e.g., my-app-ns)"class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><div class="flex items-center gap-2"><span class=text-xs style=color:var(--text-muted)>Or select existing:</span><select value class="flex-1 px-3 py-2 rounded-lg text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value>Select existing namespace...</option></select></div><p class=text-xs style=color:var(--text-muted)></p></div></div><div class="flex justify-end gap-3 pt-4"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--accent-primary);color:#000>`), _tmpl$9$1 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex justify-between gap-3 pt-4"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"style=background:var(--bg-tertiary);color:var(--text-primary)>Back</button><div class="flex gap-3"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--accent-primary);color:#000>`), _tmpl$0$1 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex justify-end gap-3 pt-4"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"style=background:var(--accent-primary);color:#000>Close`), _tmpl$1$1 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between mb-6"><div class="flex items-center gap-2"><div>1</div><span class=text-sm style=color:var(--text-secondary)>Upload</span></div><div class="flex-1 h-0.5 mx-4"></div><div class="flex items-center gap-2"><div>2</div><span class=text-sm style=color:var(--text-secondary)>Preview</span></div><div class="flex-1 h-0.5 mx-4"></div><div class="flex items-center gap-2"><div>3</div><span class=text-sm style=color:var(--text-secondary)>Deploy`), _tmpl$10$1 = /* @__PURE__ */ template(`<option>`), _tmpl$11$1 = /* @__PURE__ */ template(`<span class="font-mono font-medium"style=color:var(--text-primary)>`), _tmpl$12$1 = /* @__PURE__ */ template(`<li class="text-sm flex items-center gap-2"style=color:var(--text-secondary)><svg class="w-4 h-4 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class=truncate></span><span class="text-xs opacity-75">(<!> KB)`), _tmpl$13$1 = /* @__PURE__ */ template(`<li>• `), _tmpl$14$1 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h3 class="text-sm font-medium mb-3"style=color:var(--text-primary)>Deployment Summary</h3><div class=space-y-2><div class="flex items-center justify-between text-sm"><span style=color:var(--text-secondary)>Total Resources:</span><span class=font-medium style=color:var(--text-primary)></span></div><div class="flex items-center justify-between text-sm"><span style=color:var(--text-secondary)>Namespace:</span><span class=font-medium style=color:var(--text-primary)></span></div><div class="flex items-center justify-between text-sm"><span style=color:var(--text-secondary)>Resources:</span><span class=font-medium style=color:var(--text-primary)>`), _tmpl$15$1 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border-l-4"style="background:rgba(245, 158, 11, 0.1);border-left-color:#f59e0b"><p class="text-sm font-medium mb-2"style=color:#f59e0b>Warnings:</p><ul class="text-sm space-y-1"style=color:#f59e0b>`), _tmpl$16$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-medium mb-2"style=color:var(--text-primary)>Resources to be Created</h3><div class="space-y-2 max-h-60 overflow-y-auto">`), _tmpl$17$1 = /* @__PURE__ */ template(`<div><h3 class="text-sm font-medium mb-2"style=color:var(--text-primary)>YAML Preview</h3><div class="border rounded-lg overflow-hidden"style=borderColor:var(--border-color)>`), _tmpl$18$1 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg text-sm"style=background:var(--bg-tertiary)><div class="flex items-center justify-between"><span class=font-medium style=color:var(--text-primary)>/</span><span class=text-xs style=color:var(--text-muted)>`), _tmpl$19$1 = /* @__PURE__ */ template(`<div class="p-6 rounded-lg text-center"style="background:rgba(34, 197, 94, 0.1)"><svg class="w-16 h-16 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#22c55e><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><h3 class="text-lg font-semibold mb-2"style=color:#22c55e>Deployment Successful!</h3><p class="text-sm mb-4"style=color:var(--text-secondary)></p><div class="text-xs p-3 rounded-lg"style=background:var(--bg-tertiary)><span style=color:var(--text-muted)>Deployment ID: </span><span class=font-mono style=color:var(--text-primary)>`), _tmpl$20$1 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h3 class="text-sm font-medium mb-3"style=color:var(--text-primary)>Deployed Resources</h3><div class=space-y-2><div class="flex items-center justify-between text-sm"><span style=color:var(--text-secondary)>Total:</span><span class=font-medium style=color:var(--text-primary)> resources</span></div><div class="flex items-center justify-between text-sm"><span style=color:var(--text-secondary)>Breakdown:</span><span class=font-medium style=color:var(--text-primary)>`), _tmpl$21$1 = /* @__PURE__ */ template(`<div class="space-y-2 max-h-60 overflow-y-auto">`), _tmpl$22$1 = /* @__PURE__ */ template(`<ul class="text-sm space-y-1 mt-2"style=color:#ef4444>`), _tmpl$23$1 = /* @__PURE__ */ template(`<div class="p-6 rounded-lg border-l-4"style="background:rgba(239, 68, 68, 0.1);border-left-color:#ef4444"><h3 class="text-lg font-semibold mb-2"style=color:#ef4444>Deployment Failed`);
const CustomAppDeployWizard = (props) => {
  const [deploymentType, setDeploymentType] = createSignal("manifest");
  const [step, setStep] = createSignal("upload");
  const [files, setFiles] = createSignal([]);
  const [manifests, setManifests] = createSignal([]);
  const [helmChart, setHelmChart] = createSignal(null);
  const [helmValues, setHelmValues] = createSignal({});
  const [selectedNamespace, setSelectedNamespace] = createSignal("");
  const [preview, setPreview] = createSignal(null);
  const [deployResponse, setDeployResponse] = createSignal(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isDragging, setIsDragging] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal([]);
  const [namespaces] = createResource(() => props.isOpen, async () => {
    try {
      return await api.getNamespaceNames();
    } catch (err) {
      console.error("Failed to fetch namespaces:", err);
      return ["default"];
    }
  });
  createEffect(() => {
    if (!props.isOpen) {
      setDeploymentType("manifest");
      setStep("upload");
      setFiles([]);
      setManifests([]);
      setHelmChart(null);
      setHelmValues({});
      setSelectedNamespace("");
      setPreview(null);
      setDeployResponse(null);
      setError("");
      setValidationErrors([]);
    } else if (props.initialManifests && props.initialManifests.length > 0) {
      setManifests(props.initialManifests);
      if (props.initialNamespace) {
        setSelectedNamespace(props.initialNamespace);
      }
    }
  });
  const parseHelmChart = async (fileList) => {
    const chartYamlFile = fileList.find((f) => f.name === "Chart.yaml" || f.webkitRelativePath?.endsWith("/Chart.yaml"));
    const valuesYamlFile = fileList.find((f) => f.name === "values.yaml" || f.webkitRelativePath?.endsWith("/values.yaml"));
    if (!chartYamlFile) {
      setError("Chart.yaml not found. Please select a valid Helm chart directory.");
      return null;
    }
    const templates = {};
    const templateFiles = fileList.filter((f) => {
      const path = f.webkitRelativePath || f.name;
      return path.includes("/templates/") && (path.endsWith(".yaml") || path.endsWith(".yml"));
    });
    if (templateFiles.length === 0) {
      setError("No template files found in templates/ directory");
      return null;
    }
    try {
      const chartYaml = await chartYamlFile.text();
      const valuesYaml = valuesYamlFile ? await valuesYamlFile.text() : "";
      const nameMatch = chartYaml.match(/^name:\s*(.+)$/m);
      const versionMatch = chartYaml.match(/^version:\s*(.+)$/m);
      const chartName = nameMatch ? nameMatch[1].trim() : "unknown";
      const chartVersion = versionMatch ? versionMatch[1].trim() : "1.0.0";
      for (const file of templateFiles) {
        const content = await file.text();
        const relativePath = file.webkitRelativePath || file.name;
        const templatePath = relativePath.split("/templates/")[1] || file.name;
        templates[templatePath] = content;
      }
      return {
        chartYaml,
        valuesYaml,
        templates,
        chartName,
        chartVersion
      };
    } catch (err) {
      setError(`Failed to parse Helm chart: ${err instanceof Error ? err.message : "Unknown error"}`);
      return null;
    }
  };
  const handleFileSelect = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const fileArray = Array.from(selectedFiles);
    setError("");
    setValidationErrors([]);
    if (deploymentType() === "helm") {
      setFiles(fileArray);
      const chart = await parseHelmChart(fileArray);
      if (chart) {
        setHelmChart(chart);
      }
    } else {
      const yamlFiles = fileArray.filter((f) => f.name.endsWith(".yaml") || f.name.endsWith(".yml"));
      if (yamlFiles.length === 0) {
        setError("No YAML files found. Please select .yaml or .yml files.");
        setFiles([]);
        return;
      }
      setFiles(yamlFiles);
      const excludedCount = fileArray.length - yamlFiles.length;
      if (excludedCount > 0) {
        setError(`${excludedCount} non-YAML file${excludedCount > 1 ? "s" : ""} excluded (only .yaml and .yml files are supported)`);
      }
      const fileContents = [];
      const errors = [];
      for (const file of yamlFiles) {
        try {
          const text = await file.text();
          if (text.trim().length === 0) {
            errors.push(`${file.name}: File is empty`);
            continue;
          }
          fileContents.push(text);
        } catch (err) {
          errors.push(`${file.name}: Failed to read file - ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
      if (errors.length > 0) {
        setValidationErrors(errors);
        setManifests([]);
      } else {
        setValidationErrors([]);
        setManifests(fileContents);
      }
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer?.files || null);
  };
  const validateNamespaceName = (ns) => {
    if (!ns || ns.trim().length === 0) {
      return "Namespace name is required";
    }
    const validNamespaceRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!validNamespaceRegex.test(ns)) {
      return "Namespace name must be a valid DNS label (lowercase alphanumeric characters and hyphens, must start and end with alphanumeric)";
    }
    if (ns.length > 63) {
      return "Namespace name must be 63 characters or less";
    }
    return null;
  };
  const handlePreview = async () => {
    if (deploymentType() === "manifest" && manifests().length === 0) {
      setError("Please upload at least one YAML file");
      return;
    }
    if (deploymentType() === "helm" && !helmChart()) {
      setError("Please upload a valid Helm chart");
      return;
    }
    if (!selectedNamespace()) {
      setError("Please enter or select a namespace");
      return;
    }
    const namespaceError = validateNamespaceName(selectedNamespace());
    if (namespaceError) {
      setError(namespaceError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.previewCustomApp(manifests(), selectedNamespace());
      setPreview(response);
      if (response.errors && response.errors.length > 0) {
        setError(response.errors.join("\n"));
      } else {
        setError("");
        setStep("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview");
    } finally {
      setLoading(false);
    }
  };
  const handleDeploy = async () => {
    if (deploymentType() === "manifest" && manifests().length === 0) {
      setError("No manifests to deploy");
      return;
    }
    if (deploymentType() === "helm" && !helmChart()) {
      setError("No Helm chart to deploy");
      return;
    }
    if (!selectedNamespace()) {
      setError("Please enter or select a namespace");
      return;
    }
    const namespaceError = validateNamespaceName(selectedNamespace());
    if (namespaceError) {
      setError(namespaceError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let response;
      if (deploymentType() === "helm") {
        response = await api.deployCustomAppWithHelm({
          deploymentType: "helm",
          namespace: selectedNamespace(),
          helmChart: helmChart(),
          values: helmValues()
        });
      } else {
        if (props.deploymentId) {
          response = await api.updateCustomApp(props.deploymentId, manifests(), selectedNamespace());
        } else {
          response = await api.deployCustomApp(manifests(), selectedNamespace());
        }
      }
      setDeployResponse(response);
      if (response.success) {
        addNotification({
          type: "success",
          message: response.message || `Successfully deployed ${response.resources.length} resources`
        });
        setStep("deploy");
        if (props.onSuccess) {
          props.onSuccess();
        }
      } else {
        setError(response.errors?.join("\n") || "Deployment failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy");
    } finally {
      setLoading(false);
    }
  };
  const handleBack = () => {
    if (step() === "preview") {
      setStep("upload");
    } else if (step() === "deploy") {
      setStep("preview");
    }
  };
  const handleClose = () => {
    if (!loading()) {
      props.onClose();
    }
  };
  const formatResourceSummary = (resourceCount) => {
    const items = Object.entries(resourceCount).map(([kind, count]) => `${count} ${kind}${count !== 1 ? "s" : ""}`);
    if (items.length === 0) return "No resources";
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(" and ");
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  };
  return createComponent(Modal, {
    get isOpen() {
      return props.isOpen;
    },
    onClose: handleClose,
    get title() {
      return props.deploymentId ? "Modify Custom App" : "Deploy Custom App";
    },
    size: "lg",
    get children() {
      var _el$ = _tmpl$1$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild; _el$8.nextSibling; var _el$0 = _el$7.nextSibling, _el$1 = _el$0.nextSibling, _el$10 = _el$1.firstChild; _el$10.nextSibling;
      insert(_el$, createComponent(Show, {
        get when() {
          return step() === "upload";
        },
        get children() {
          var _el$12 = _tmpl$8$1(), _el$16 = _el$12.firstChild, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling; _el$22.firstChild; var _el$24 = _el$20.nextSibling, _el$57 = _el$16.nextSibling, _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling;
          insert(_el$12, createComponent(Show, {
            get when() {
              return !props.deploymentId;
            },
            get children() {
              var _el$13 = _tmpl$$1(), _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling;
              _el$14.$$click = () => setDeploymentType("manifest");
              _el$15.$$click = () => setDeploymentType("helm");
              createRenderEffect((_p$) => {
                var _v$ = `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${deploymentType() === "manifest" ? "bg-[var(--accent-primary)] text-black" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`, _v$2 = `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${deploymentType() === "helm" ? "bg-[var(--accent-primary)] text-black" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`;
                _v$ !== _p$.e && className(_el$14, _p$.e = _v$);
                _v$2 !== _p$.t && className(_el$15, _p$.t = _v$2);
                return _p$;
              }, {
                e: void 0,
                t: void 0
              });
              return _el$13;
            }
          }), _el$16);
          _el$19.$$input = (e) => setSelectedNamespace(e.currentTarget.value);
          _el$22.addEventListener("change", (e) => {
            const value = e.currentTarget.value;
            if (value) {
              setSelectedNamespace(value);
              e.currentTarget.value = "";
            }
          });
          insert(_el$22, createComponent(Show, {
            get when() {
              return !namespaces.loading;
            },
            get children() {
              return createComponent(For, {
                get each() {
                  return namespaces() || [];
                },
                children: (ns) => (() => {
                  var _el$71 = _tmpl$10$1();
                  _el$71.value = ns;
                  insert(_el$71, ns);
                  return _el$71;
                })()
              });
            }
          }), null);
          insert(_el$24, (() => {
            var _c$ = memo(() => !!selectedNamespace());
            return () => _c$() ? ["Namespace: ", (() => {
              var _el$72 = _tmpl$11$1();
              insert(_el$72, selectedNamespace);
              return _el$72;
            })(), " ", memo(() => (namespaces() || []).includes(selectedNamespace()) ? "(exists)" : "(will be created)")] : "Enter a namespace name above or select an existing one";
          })());
          insert(_el$12, createComponent(Show, {
            get when() {
              return deploymentType() === "manifest";
            },
            get children() {
              var _el$25 = _tmpl$2$1(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$29.firstChild, _el$31 = _el$30.nextSibling; _el$31.nextSibling;
              _el$27.addEventListener("drop", handleDrop);
              _el$27.addEventListener("dragleave", handleDragLeave);
              _el$27.addEventListener("dragover", handleDragOver);
              _el$28.addEventListener("change", (e) => handleFileSelect(e.currentTarget.files));
              setAttribute(_el$28, "webkitdirectory", false);
              createRenderEffect(() => className(_el$27, `border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging() ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10" : "border-[var(--border-color)]"}`));
              return _el$25;
            }
          }), _el$57);
          insert(_el$12, createComponent(Show, {
            get when() {
              return deploymentType() === "helm";
            },
            get children() {
              var _el$33 = _tmpl$3$1(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling; _el$41.nextSibling; var _el$43 = _el$39.nextSibling, _el$44 = _el$43.nextSibling, _el$45 = _el$44.firstChild; _el$45.nextSibling;
              _el$35.addEventListener("drop", handleDrop);
              _el$35.addEventListener("dragleave", handleDragLeave);
              _el$35.addEventListener("dragover", handleDragOver);
              _el$36.addEventListener("change", (e) => handleFileSelect(e.currentTarget.files));
              setAttribute(_el$36, "webkitdirectory", true);
              _el$37.addEventListener("change", (e) => handleFileSelect(e.currentTarget.files));
              createRenderEffect(() => className(_el$35, `border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging() ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10" : "border-[var(--border-color)]"}`));
              return _el$33;
            }
          }), _el$57);
          insert(_el$12, createComponent(Show, {
            get when() {
              return files().length > 0;
            },
            get children() {
              var _el$47 = _tmpl$5$1(), _el$48 = _el$47.firstChild, _el$51 = _el$48.nextSibling;
              insert(_el$48, createComponent(Show, {
                get when() {
                  return memo(() => deploymentType() === "helm")() && helmChart();
                },
                get children() {
                  return ["Helm Chart: ", (() => {
                    var _el$49 = _tmpl$4$1(), _el$50 = _el$49.firstChild;
                    insert(_el$49, () => helmChart()?.chartName, _el$50);
                    insert(_el$49, () => helmChart()?.chartVersion, null);
                    return _el$49;
                  })()];
                }
              }), null);
              insert(_el$48, createComponent(Show, {
                get when() {
                  return deploymentType() === "manifest";
                },
                get children() {
                  return ["Selected files (", memo(() => files().length), "):"];
                }
              }), null);
              insert(_el$51, createComponent(For, {
                get each() {
                  return files();
                },
                children: (file) => (() => {
                  var _el$73 = _tmpl$12$1(), _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$75.nextSibling, _el$77 = _el$76.firstChild, _el$79 = _el$77.nextSibling; _el$79.nextSibling;
                  insert(_el$75, () => file.webkitRelativePath || file.name);
                  insert(_el$76, () => (file.size / 1024).toFixed(1), _el$79);
                  return _el$73;
                })()
              }));
              return _el$47;
            }
          }), _el$57);
          insert(_el$12, createComponent(Show, {
            get when() {
              return validationErrors().length > 0;
            },
            get children() {
              var _el$52 = _tmpl$6$1(), _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling;
              insert(_el$54, createComponent(For, {
                get each() {
                  return validationErrors();
                },
                children: (err) => (() => {
                  var _el$80 = _tmpl$13$1(); _el$80.firstChild;
                  insert(_el$80, err, null);
                  return _el$80;
                })()
              }));
              return _el$52;
            }
          }), _el$57);
          insert(_el$12, createComponent(Show, {
            get when() {
              return error();
            },
            get children() {
              var _el$55 = _tmpl$7$1(), _el$56 = _el$55.firstChild;
              insert(_el$56, error);
              return _el$55;
            }
          }), _el$57);
          addEventListener(_el$58, "click", props.onClose, true);
          _el$59.$$click = handlePreview;
          insert(_el$59, (() => {
            var _c$2 = memo(() => !!loading());
            return () => _c$2() ? "Processing..." : deploymentType() === "helm" ? "Deploy Chart" : "Preview Changes";
          })());
          createRenderEffect(() => _el$59.disabled = deploymentType() === "manifest" && manifests().length === 0 || deploymentType() === "helm" && !helmChart() || loading() || validationErrors().length > 0 || !selectedNamespace() || !selectedNamespace().trim());
          createRenderEffect(() => _el$19.value = selectedNamespace());
          return _el$12;
        }
      }), null);
      insert(_el$, createComponent(Show, {
        get when() {
          return step() === "preview";
        },
        get children() {
          var _el$60 = _tmpl$9$1(), _el$63 = _el$60.firstChild, _el$64 = _el$63.firstChild, _el$65 = _el$64.nextSibling, _el$66 = _el$65.firstChild, _el$67 = _el$66.nextSibling;
          insert(_el$60, createComponent(Show, {
            get when() {
              return preview();
            },
            children: (previewData) => [(() => {
              var _el$82 = _tmpl$14$1(), _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$85.firstChild, _el$87 = _el$86.nextSibling, _el$88 = _el$85.nextSibling, _el$89 = _el$88.firstChild, _el$90 = _el$89.nextSibling, _el$91 = _el$88.nextSibling, _el$92 = _el$91.firstChild, _el$93 = _el$92.nextSibling;
              insert(_el$87, () => previewData().resources.length);
              insert(_el$90, selectedNamespace);
              insert(_el$93, () => formatResourceSummary(previewData().resourceCount));
              return _el$82;
            })(), createComponent(Show, {
              get when() {
                return memo(() => !!previewData().warnings)() && previewData().warnings.length > 0;
              },
              get children() {
                var _el$94 = _tmpl$15$1(), _el$95 = _el$94.firstChild, _el$96 = _el$95.nextSibling;
                insert(_el$96, createComponent(For, {
                  get each() {
                    return previewData().warnings;
                  },
                  children: (warning) => (() => {
                    var _el$103 = _tmpl$13$1(); _el$103.firstChild;
                    insert(_el$103, warning, null);
                    return _el$103;
                  })()
                }));
                return _el$94;
              }
            }), (() => {
              var _el$97 = _tmpl$16$1(), _el$98 = _el$97.firstChild, _el$99 = _el$98.nextSibling;
              insert(_el$99, createComponent(For, {
                get each() {
                  return previewData().resources;
                },
                children: (resource) => (() => {
                  var _el$105 = _tmpl$18$1(), _el$106 = _el$105.firstChild, _el$107 = _el$106.firstChild, _el$108 = _el$107.firstChild, _el$109 = _el$107.nextSibling;
                  insert(_el$107, () => resource.kind, _el$108);
                  insert(_el$107, () => resource.name, null);
                  insert(_el$109, () => resource.namespace || "cluster-scoped");
                  return _el$105;
                })()
              }));
              return _el$97;
            })(), (() => {
              var _el$100 = _tmpl$17$1(), _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling;
              insert(_el$102, createComponent(YAMLViewer, {
                get yaml() {
                  return previewData().manifests.join("\n---\n");
                }
              }));
              return _el$100;
            })()]
          }), _el$63);
          insert(_el$60, createComponent(Show, {
            get when() {
              return error();
            },
            get children() {
              var _el$61 = _tmpl$7$1(), _el$62 = _el$61.firstChild;
              insert(_el$62, error);
              return _el$61;
            }
          }), _el$63);
          _el$64.$$click = handleBack;
          addEventListener(_el$66, "click", props.onClose, true);
          _el$67.$$click = handleDeploy;
          insert(_el$67, () => loading() ? "Deploying..." : "Deploy");
          createRenderEffect((_p$) => {
            var _v$3 = loading(), _v$4 = !preview()?.success || loading() || (preview()?.errors?.length || 0) > 0;
            _v$3 !== _p$.e && (_el$64.disabled = _p$.e = _v$3);
            _v$4 !== _p$.t && (_el$67.disabled = _p$.t = _v$4);
            return _p$;
          }, {
            e: void 0,
            t: void 0
          });
          return _el$60;
        }
      }), null);
      insert(_el$, createComponent(Show, {
        get when() {
          return step() === "deploy";
        },
        get children() {
          var _el$68 = _tmpl$0$1(), _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild;
          insert(_el$68, createComponent(Show, {
            get when() {
              return deployResponse();
            },
            children: (response) => [createComponent(Show, {
              get when() {
                return response().success;
              },
              get children() {
                return [(() => {
                  var _el$110 = _tmpl$19$1(), _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling, _el$113 = _el$112.nextSibling, _el$114 = _el$113.nextSibling, _el$115 = _el$114.firstChild, _el$116 = _el$115.nextSibling;
                  insert(_el$113, () => response().message || `Successfully deployed ${response().resources.length} resources`);
                  insert(_el$116, () => response().deploymentId);
                  return _el$110;
                })(), (() => {
                  var _el$117 = _tmpl$20$1(), _el$118 = _el$117.firstChild, _el$119 = _el$118.nextSibling, _el$120 = _el$119.firstChild, _el$121 = _el$120.firstChild, _el$122 = _el$121.nextSibling, _el$123 = _el$122.firstChild, _el$124 = _el$120.nextSibling, _el$125 = _el$124.firstChild, _el$126 = _el$125.nextSibling;
                  insert(_el$122, () => response().resources.length, _el$123);
                  insert(_el$126, () => formatResourceSummary(response().resourceCount));
                  return _el$117;
                })(), (() => {
                  var _el$127 = _tmpl$21$1();
                  insert(_el$127, createComponent(For, {
                    get each() {
                      return response().resources;
                    },
                    children: (resource) => (() => {
                      var _el$131 = _tmpl$18$1(), _el$132 = _el$131.firstChild, _el$133 = _el$132.firstChild, _el$134 = _el$133.firstChild, _el$135 = _el$133.nextSibling;
                      insert(_el$133, () => resource.kind, _el$134);
                      insert(_el$133, () => resource.name, null);
                      insert(_el$135, () => resource.namespace || "cluster-scoped");
                      return _el$131;
                    })()
                  }));
                  return _el$127;
                })()];
              }
            }), createComponent(Show, {
              get when() {
                return !response().success;
              },
              get children() {
                var _el$128 = _tmpl$23$1(); _el$128.firstChild;
                insert(_el$128, createComponent(Show, {
                  get when() {
                    return memo(() => !!response().errors)() && response().errors.length > 0;
                  },
                  get children() {
                    var _el$130 = _tmpl$22$1();
                    insert(_el$130, createComponent(For, {
                      get each() {
                        return response().errors;
                      },
                      children: (err) => (() => {
                        var _el$136 = _tmpl$13$1(); _el$136.firstChild;
                        insert(_el$136, err, null);
                        return _el$136;
                      })()
                    }));
                    return _el$130;
                  }
                }), null);
                return _el$128;
              }
            })]
          }), _el$69);
          addEventListener(_el$70, "click", props.onClose, true);
          return _el$68;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$5 = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step() === "upload" ? "bg-[var(--accent-primary)] text-black" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`, _v$6 = step() !== "upload" ? "var(--accent-primary)" : "var(--bg-tertiary)", _v$7 = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step() === "preview" ? "bg-[var(--accent-primary)] text-black" : step() === "deploy" ? "bg-[var(--accent-primary)] text-black" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`, _v$8 = step() === "deploy" ? "var(--accent-primary)" : "var(--bg-tertiary)", _v$9 = `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step() === "deploy" ? "bg-[var(--accent-primary)] text-black" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`;
        _v$5 !== _p$.e && className(_el$4, _p$.e = _v$5);
        _v$6 !== _p$.t && setStyleProperty(_el$6, "background", _p$.t = _v$6);
        _v$7 !== _p$.a && className(_el$8, _p$.a = _v$7);
        _v$8 !== _p$.o && setStyleProperty(_el$0, "background", _p$.o = _v$8);
        _v$9 !== _p$.i && className(_el$10, _p$.i = _v$9);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      });
      return _el$;
    }
  });
};
delegateEvents(["click", "input"]);

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">`), _tmpl$2 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 6h16M4 10h16M4 14h16M4 18h16">`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z">`), _tmpl$4 = /* @__PURE__ */ template(`<div class=space-y-4><h2 class="text-lg font-semibold flex items-center gap-2"><span class="w-3 h-3 rounded-full"></span></h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"style="background:rgba(6, 182, 212, 0.2);color:var(--accent-primary)"><div class=spinner style=width:12px;height:12px></div>Deploying...`), _tmpl$6 = /* @__PURE__ */ template(`<div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)"><svg class="w-3 h-3"fill=currentColor viewBox="0 0 20 20"><path fill-rule=evenodd d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"clip-rule=evenodd></path></svg> Installed`), _tmpl$7 = /* @__PURE__ */ template(`<div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)"><svg class="w-3 h-3"fill=currentColor viewBox="0 0 20 20"><path fill-rule=evenodd d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"clip-rule=evenodd></path></svg> Installed`), _tmpl$8 = /* @__PURE__ */ template(`<div class=spinner style=width:24px;height:24px>`), _tmpl$9 = /* @__PURE__ */ template(`<div><span class=opacity-75>Repo: </span><a target=_blank rel="noopener noreferrer"class="underline hover:opacity-80">`), _tmpl$0 = /* @__PURE__ */ template(`<div><span class=opacity-75>Chart: </span><span>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="text-xs opacity-90">Kubernetes manifests (YAML files)`), _tmpl$10 = /* @__PURE__ */ template(`<div class="pt-1 border-t text-[11px]"style="borderColor:rgba(148, 163, 184, 0.3)">`), _tmpl$11 = /* @__PURE__ */ template(`<div class="flex items-center gap-2"><span class=text-xs style=color:var(--accent-primary)>to `), _tmpl$12 = /* @__PURE__ */ template(`<div class="flex gap-2"><button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title="View Resources"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)">View</button><button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Modify/Redeploy style="background:rgba(59, 130, 246, 0.2);color:var(--accent-primary)">Modify</button><button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Restart style="background:rgba(251, 191, 36, 0.2);color:#fbbf24">Restart</button><button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Delete style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)">Delete`), _tmpl$13 = /* @__PURE__ */ template(`<div class="mt-3 pt-3 border-t space-y-2"style=border-color:var(--border-color)><div class="text-xs font-medium"style=color:var(--text-muted)>Installed Clusters (<!>)`), _tmpl$14 = /* @__PURE__ */ template(`<div class="mt-3 pt-3 border-t space-y-2"style=border-color:var(--border-color)><div class="text-xs flex items-center gap-2 flex-wrap"><span style=color:var(--text-muted)>Installed in:</span></div><div class="text-xs font-medium"style=color:var(--text-muted)>Installed Instances:`), _tmpl$15 = /* @__PURE__ */ template(`<div><div class="flex items-start gap-3"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)></div><div class="flex-1 min-w-0"><h3 class=font-semibold style=color:var(--text-primary)></h3><p class="text-xs mt-0.5"style=color:var(--text-muted)>v</p></div></div><p class="mt-3 text-sm line-clamp-2"style=color:var(--text-secondary)></p><div class="mt-2 text-xs px-2 py-1.5 rounded"style=color:var(--text-secondary)><div class="flex items-center justify-between gap-2 mb-1"><span class=font-semibold style=color:var(--text-primary)>Source</span><span></span></div><div class="leading-relaxed space-y-0.5"><div> <span class=font-semibold></span></div></div></div><div class="mt-4 flex items-center justify-between"><span class="text-xs px-2 py-1 rounded"style=background:var(--bg-tertiary);color:var(--text-muted)>`), _tmpl$16 = /* @__PURE__ */ template(`<svg class="w-6 h-6"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2>`), _tmpl$17 = /* @__PURE__ */ template(`<svg class="w-3 h-3"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$18 = /* @__PURE__ */ template(`<span> · v`), _tmpl$19 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"style=background:var(--accent-primary);color:#000>Install`), _tmpl$20 = /* @__PURE__ */ template(`<button class="p-1.5 rounded-lg text-sm transition-all hover:opacity-80 ml-2"title="Remove custom app"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">`), _tmpl$21 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded"style=background:var(--bg-tertiary)><div class="flex-1 min-w-0"><div class="text-xs font-medium truncate"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)> • </div></div><button class="p-1.5 rounded-lg text-sm transition-all hover:opacity-80"title="Delete cluster"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">`), _tmpl$22 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded"style=background:var(--bg-tertiary)><div class="flex-1 min-w-0"><div class="text-xs font-medium truncate"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)><span class="inline-flex items-center gap-2 flex-wrap"><span></span></span></div></div><div class="flex items-center gap-1 ml-2"><button class="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"title="View pods"style=color:var(--success-color)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button><button class="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"title=Uninstall style=color:var(--error-color)><svg class="w-3.5 h-3.5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">`), _tmpl$23 = /* @__PURE__ */ template(`<div class="overflow-hidden rounded-lg"style=background:#0d1117><div class=overflow-x-auto><table class="data-table terminal-table"><thead><tr><th class=whitespace-nowrap>App</th><th class=whitespace-nowrap>Category</th><th class=whitespace-nowrap>Version</th><th class=whitespace-nowrap>Chart</th><th class=whitespace-nowrap>Status</th><th class=whitespace-nowrap>Namespace</th><th class=whitespace-nowrap>Actions</th></tr></thead><tbody>`), _tmpl$24 = /* @__PURE__ */ template(`<tr><td colspan=7 class="text-center py-8"style=color:var(--text-muted)>No apps found`), _tmpl$25 = /* @__PURE__ */ template(`<div class="mt-0.5 pt-0.5 border-t text-[10px]"style="borderColor:rgba(6, 182, 212, 0.2)"><span class=opacity-75>Repo: </span><a target=_blank rel="noopener noreferrer"class="underline hover:opacity-80">`), _tmpl$26 = /* @__PURE__ */ template(`<div class="text-xs mt-1 px-1.5 py-1 rounded"style="background:rgba(6, 182, 212, 0.1);color:var(--accent-primary);border:1px solid rgba(6, 182, 212, 0.2)"><div class="font-semibold mb-0.5">📚 Source:</div><div class=leading-relaxed>`), _tmpl$27 = /* @__PURE__ */ template(`<span class="badge badge-info flex items-center gap-1"><div class=spinner style=width:12px;height:12px></div>Deploying`), _tmpl$28 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title="View Resources"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)">View`), _tmpl$29 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Modify/Redeploy style="background:rgba(59, 130, 246, 0.2);color:var(--accent-primary)">Modify`), _tmpl$30 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Restart style="background:rgba(251, 191, 36, 0.2);color:#fbbf24">Restart`), _tmpl$31 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"title=Delete style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)">Delete`), _tmpl$32 = /* @__PURE__ */ template(`<tr><td><div class="flex items-center gap-3"><div class="p-2 rounded-lg"style=background:var(--bg-tertiary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div><div class=font-medium style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-muted)></div></div></div></td><td><span class="text-xs px-2 py-1 rounded"></span></td><td class="font-mono text-sm"></td><td class="font-mono text-sm"></td><td></td><td class=text-sm></td><td><div class="flex items-center gap-2">`), _tmpl$33 = /* @__PURE__ */ template(`<span class="badge badge-success">Deployed`), _tmpl$34 = /* @__PURE__ */ template(`<span class="badge badge-success">Installed`), _tmpl$35 = /* @__PURE__ */ template(`<span class="badge badge-default">Available`), _tmpl$36 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"style=background:var(--accent-primary);color:#000>Install`), _tmpl$37 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"style="background:rgba(34, 197, 94, 0.2);color:var(--success-color)">View`), _tmpl$38 = /* @__PURE__ */ template(`<button class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)">Uninstall`), _tmpl$39 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">`), _tmpl$40 = /* @__PURE__ */ template(`<div class=spinner style=width:12px;height:12px>`), _tmpl$41 = /* @__PURE__ */ template(`<div class="absolute top-1 right-1">`), _tmpl$42 = /* @__PURE__ */ template(`<button class="px-2 py-0.5 rounded text-xs transition-all hover:opacity-80"style=background:var(--accent-primary);color:#000>Install`), _tmpl$43 = /* @__PURE__ */ template(`<button><div class="flex items-center gap-2 mb-2"><div class="p-1.5 rounded"style=background:var(--bg-tertiary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div></div><h4 class="font-medium text-sm truncate mb-1"style=color:var(--text-primary)></h4><p class="text-xs truncate mb-2"style=color:var(--text-muted)></p><div class="flex items-center justify-between text-xs"><span style=color:var(--text-muted)>v`), _tmpl$44 = /* @__PURE__ */ template(`<div class="w-2 h-2 rounded-full bg-green-500"title=Installed>`), _tmpl$45 = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"style=background:var(--accent-primary);color:#000><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>Deploy Custom App`), _tmpl$46 = /* @__PURE__ */ template(`<div class="flex items-center gap-1 p-1 rounded-lg"style=background:var(--bg-secondary)><button><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>Marketplace<span class="px-2 py-0.5 rounded text-xs"style=background:var(--bg-primary);color:var(--text-muted)></span></button><button><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>Custom Apps<span class="px-2 py-0.5 rounded text-xs"style=background:var(--bg-primary);color:var(--text-muted)>`), _tmpl$47 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border-l-4"style="background:rgba(245, 158, 11, 0.1);border-left-color:#f59e0b;color:var(--text-primary)"><div class="flex items-start gap-2"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class=flex-1><h4 class="font-semibold mb-1">Prerequisites Required</h4><p class="text-sm mb-2">This local cluster installer requires <strong>Docker</strong> to be installed and running.</p><ul class="text-sm list-disc list-inside space-y-1 mb-2"style=color:var(--text-secondary)><li>Docker Desktop must be installed</li><li>Docker Desktop must be running</li><li>Docker daemon must be accessible</li></ul><p class=text-xs style=color:var(--text-muted)>If Docker is not installed, the installation will fail. Check server logs for detailed error messages.`), _tmpl$48 = /* @__PURE__ */ template(`<div class=spinner style=width:16px;height:16px>`), _tmpl$49 = /* @__PURE__ */ template(`<div class=space-y-4><p style=color:var(--text-secondary)></p><div class="flex justify-end gap-3 mt-6"><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--bg-secondary);color:var(--text-secondary)>Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$50 = /* @__PURE__ */ template(`<div class=space-y-4><p style=color:var(--text-secondary)>Add your own Helm chart to the marketplace. Custom apps are stored locally in your browser.</p><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>App Name <span style=color:var(--error-color)>*</span></label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=my-app style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Display Name</label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder="My Application"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Chart Repository URL <span style=color:var(--error-color)>*</span></label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=https://charts.example.com style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Chart Name <span style=color:var(--error-color)>*</span></label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=my-chart style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Category</label><select class="w-full px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=Custom>Custom</option><option value=Networking>Networking</option><option value=CI/CD>CI/CD</option><option value=Observability>Observability</option><option value=Security>Security</option><option value=Data>Data</option></select></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Version</label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=1.0.0 style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Description</label><textarea class="w-full px-3 py-2 rounded-lg text-sm resize-none"placeholder="Optional description for the app"rows=3 style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></textarea></div><div class="flex justify-end gap-3 mt-6"><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--bg-secondary);color:var(--text-secondary)>Cancel</button><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Add App`), _tmpl$51 = /* @__PURE__ */ template(`<svg class="animate-spin h-4 w-4"fill=none viewBox="0 0 24 24"><circle class=opacity-25 cx=12 cy=12 r=10 stroke=currentColor stroke-width=4></circle><path class=opacity-75 fill=currentColor d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">`), _tmpl$52 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-start gap-3 p-3 rounded-lg"style="background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3)"><svg class="w-5 h-5 flex-shrink-0 mt-0.5"fill=currentColor viewBox="0 0 20 20"style=color:var(--error-color)><path fill-rule=evenodd d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"clip-rule=evenodd></path></svg><div class=flex-1><div class="text-sm font-medium mb-1"style=color:var(--error-color)>This action cannot be undone</div><div class=text-xs style=color:var(--text-secondary)>Are you sure you want to delete cluster <span class=font-semibold style=color:var(--text-primary)></span>?</div></div></div><div class="flex items-center gap-2"><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"style=background:var(--error-color);color:white>`), _tmpl$53 = /* @__PURE__ */ template(`<div class=space-y-4><div class="p-4 rounded-lg border-l-4"style="background:rgba(251, 191, 36, 0.1);border-left-color:#fbbf24"><div class="flex items-start gap-2"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#fbbf24><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class=flex-1><div class=text-sm style=color:var(--text-primary)>Are you sure you want to restart <span class=font-semibold></span>?</div><div class="text-xs mt-1"style=color:var(--text-secondary)>This will restart all pods associated with this deployment.</div></div></div></div><div class="flex items-center gap-2"><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"style="background:rgba(251, 191, 36, 0.2);color:#fbbf24">Restart`), _tmpl$54 = /* @__PURE__ */ template(`<div class=space-y-4><div class="p-4 rounded-lg border-l-4"style="background:rgba(239, 68, 68, 0.1);border-left-color:#ef4444"><div class="flex items-start gap-2"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:#ef4444><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class=flex-1><div class=text-sm style=color:var(--text-primary)>Are you sure you want to delete <span class=font-semibold></span>?</div><div class="text-xs mt-1"style=color:var(--text-secondary)>This will permanently delete all <!> resources associated with this deployment.</div><div class="text-xs mt-2 font-semibold"style=color:#ef4444>This action cannot be undone.</div></div></div></div><div class="flex items-center gap-2"><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"style=background:var(--bg-tertiary);color:var(--text-primary)>Cancel</button><button class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"style="background:rgba(239, 68, 68, 0.2);color:#ef4444">Delete`), _tmpl$55 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)></h1><p style=color:var(--text-secondary)></p></div><div class="flex items-center gap-3"><div class="flex items-center rounded-lg overflow-hidden"style="background:var(--bg-secondary);border:1px solid var(--border-color)"></div><button class=icon-btn title=Refresh style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div class="card px-4 py-2 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total Apps</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Installed</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 flex items-center gap-2"style="border-left:3px solid #8b5cf6"><span class=text-sm style=color:var(--text-secondary)>Available</span><span class="text-xl font-bold"style=color:#8b5cf6></span></div><div class=flex-1></div><input type=text placeholder="Search apps..."class="px-3 py-2 rounded-lg text-sm w-64"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"></div><div class="flex flex-wrap gap-2">`), _tmpl$56 = /* @__PURE__ */ template(`<button><span class="hidden sm:inline capitalize">`), _tmpl$57 = /* @__PURE__ */ template(`<button>`), _tmpl$58 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 border-b pb-2 mb-3"style=border-color:var(--border-color)>`), _tmpl$59 = /* @__PURE__ */ template(`<p class="text-sm mb-3"style=color:var(--text-secondary)>`), _tmpl$60 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><div class="flex items-center justify-between text-sm"><span style=color:var(--text-muted)>Chart</span><span style=color:var(--text-primary)></span></div><div class="flex items-center justify-between text-sm mt-2"><span style=color:var(--text-muted)>Chart version</span><span style=color:var(--text-primary)></span></div><div class="flex items-center justify-between text-sm mt-2"><span style=color:var(--text-muted)>Repository</span><a target=_blank rel="noopener noreferrer"class="text-xs truncate max-w-xs underline"style=color:var(--accent-primary)></a></div><div class="flex items-center justify-between text-sm mt-2"><span style=color:var(--text-muted)>Publisher</span><span class="flex items-center gap-2"><span style=color:var(--text-primary)></span><span>`), _tmpl$61 = /* @__PURE__ */ template(`<p class="text-xs mt-1"style=color:var(--error-color)>`), _tmpl$62 = /* @__PURE__ */ template(`<div class=mt-4><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Cluster Name <span style=color:var(--error-color)>*</span></label><div class="flex items-center gap-2"><span class="text-sm px-3 py-2 rounded-l-lg"style="background:var(--bg-tertiary);color:var(--text-muted);border:1px solid var(--border-color);border-right:none">kubegraf-</span><input type=text class="flex-1 px-3 py-2 rounded-r-lg text-sm"placeholder=my-cluster style=background:var(--bg-secondary);color:var(--text-primary);border-left:none></div><p class="text-xs mt-1"style=color:var(--text-muted)>Enter a custom suffix (lowercase letters, numbers, or hyphens). Full name: k3d-kubegraf-`), _tmpl$63 = /* @__PURE__ */ template(`<div class="mt-4 pt-4 border-t"style=border-color:var(--border-color)><h4 class="text-sm font-semibold mb-2"style=color:var(--text-primary)>Installed Clusters (<!>)</h4><div class=space-y-2>`), _tmpl$64 = /* @__PURE__ */ template(`<li><span class=opacity-75>Docs: </span><a target=_blank rel="noopener noreferrer"class=underline>`), _tmpl$65 = /* @__PURE__ */ template(`<li><span class=opacity-75>GitHub: </span><a target=_blank rel="noopener noreferrer"class=underline>`), _tmpl$66 = /* @__PURE__ */ template(`<div><div class="font-semibold mb-1"style=color:var(--text-primary)>Official links</div><ul class=space-y-0.5 style=color:var(--text-secondary)>`), _tmpl$67 = /* @__PURE__ */ template(`<div class="pt-2 border-t"style=border-color:var(--border-color)><div class="font-semibold mb-1"style=color:var(--text-primary)>Additional notes</div><p style=color:var(--text-secondary)>`), _tmpl$68 = /* @__PURE__ */ template(`<div class="space-y-3 text-xs"><div><div class="font-semibold mb-1"style=color:var(--text-primary)>Source</div><p style=color:var(--text-secondary)>Artifact from <span class=font-semibold></span></p></div><div><div class="font-semibold mb-1"style=color:var(--text-primary)>Helm chart</div><ul class=space-y-0.5 style=color:var(--text-secondary)><li><span class=opacity-75>Repository: </span><a target=_blank rel="noopener noreferrer"class=underline></a></li><li><span class=opacity-75>Chart: </span><span></span></li><li><span class=opacity-75>App version: </span><span>v</span></li></ul></div><div><div class="font-semibold mb-1"style=color:var(--text-primary)>Integrity</div><p style=color:var(--text-secondary)>`), _tmpl$69 = /* @__PURE__ */ template(`<p class="text-xs mb-3"style=color:var(--text-secondary)>KubeGraf will install this Helm chart into your selected namespace and track the release. Resources such as Deployments, Services, ConfigMaps, and Secrets will be created according to the chart defaults and any overrides you apply.`), _tmpl$70 = /* @__PURE__ */ template(`<div class=mb-4><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Cluster Name <span style=color:var(--error-color)>*</span></label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=kubegraf-my-cluster style=background:var(--bg-secondary);color:var(--text-primary)><p class="text-xs mt-1"style=color:var(--text-muted)>Must start with &quot;kubegraf-&quot; followed by lowercase letters, numbers, or hyphens`), _tmpl$71 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Target Namespace</label><input type=text class="w-full px-3 py-2 rounded-lg text-sm"placeholder=default style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><p class="text-xs mt-1"style=color:var(--text-muted)>KubeGraf will create or reuse this namespace when installing the chart.`), _tmpl$72 = /* @__PURE__ */ template(`<div class="space-y-2 text-xs"style=color:var(--text-secondary)><p>This install will create Kubernetes resources owned by the Helm release in the selected namespace. Access to those resources is controlled by your cluster&apos;s RBAC configuration.</p><ul class="list-disc list-inside space-y-1"><li><span class=opacity-75>Scope:</span> usually namespaced (no direct cluster-wide privileges), unless the chart itself defines cluster-scoped resources.</li><li><span class=opacity-75>Who can install:</span> users with permission to create resources in the target namespace and, if applicable, cluster-scoped objects.</li><li><span class=opacity-75>Recommendation:</span> review the chart documentation and your RBAC policies before installing in production clusters.`), _tmpl$73 = /* @__PURE__ */ template(`<button type=button>`), _tmpl$74 = /* @__PURE__ */ template(`<div class="flex items-center justify-between p-2 rounded-lg"style=background:var(--bg-tertiary)><div class=flex-1><div class="flex items-center gap-2"><span class="text-sm font-medium"style=color:var(--text-primary)></span><span></span></div></div><button class="p-1.5 rounded-lg text-sm transition-all hover:opacity-80"title="Delete cluster"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">`), _tmpl$75 = /* @__PURE__ */ template(`<span class="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]"style=background:rgba(34,197,94,0.18);color:var(--success-color)><svg class="w-3 h-3"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Verified publisher`), _tmpl$76 = /* @__PURE__ */ template(`<span>cluster: <span class=font-semibold>`), _tmpl$77 = /* @__PURE__ */ template(`<span>ns: <span class=font-semibold>`);
const loadCustomApps = () => {
  try {
    const saved = localStorage.getItem("kubegraf-custom-apps");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};
const saveCustomApps = (apps) => {
  localStorage.setItem("kubegraf-custom-apps", JSON.stringify(apps));
};
const defaultApps = marketplaceCatalog.map(marketplaceAppToLegacyApp);
const categoryColors = Object.fromEntries(marketplaceCategories.map((cat) => [cat.id, cat.color]));
const Apps = (props) => {
  const [search, setSearch] = createSignal("");
  const [selectedCategory, setSelectedCategory] = createSignal("all");
  const [selectedApp, setSelectedApp] = createSignal(null);
  const [showInstallModal, setShowInstallModal] = createSignal(false);
  const [showMLflowWizard, setShowMLflowWizard] = createSignal(false);
  const [showFeastWizard, setShowFeastWizard] = createSignal(false);
  const [installNamespace, setInstallNamespace] = createSignal("default");
  const [clusterName, setClusterName] = createSignal(generateDefaultClusterName());
  const [clusterNameError, setClusterNameError] = createSignal("");
  const [installing, setInstalling] = createSignal(false);
  createSignal(false);
  const [viewMode, setViewMode] = createSignal("card");
  const [deployingApps, setDeployingApps] = createSignal({});
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [appToUninstall, setAppToUninstall] = createSignal(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  const [showDeleteCustomModal, setShowDeleteCustomModal] = createSignal(false);
  const [appToDelete, setAppToDelete] = createSignal(null);
  const [showCustomDeployWizard, setShowCustomDeployWizard] = createSignal(false);
  const [customAppToModify, setCustomAppToModify] = createSignal(null);
  createSignal(false);
  const [showDeleteClusterModal, setShowDeleteClusterModal] = createSignal(false);
  const [clusterToDelete, setClusterToDelete] = createSignal(null);
  const [deletingCluster, setDeletingCluster] = createSignal(false);
  const [showRestartCustomAppModal, setShowRestartCustomAppModal] = createSignal(false);
  const [showDeleteDeployedCustomAppModal, setShowDeleteDeployedCustomAppModal] = createSignal(false);
  const [deployedCustomAppToAction, setDeployedCustomAppToAction] = createSignal(null);
  onMount(() => {
    const autoFilter = sessionStorage.getItem("kubegraf-auto-filter");
    let shouldScrollToLocalCluster = false;
    if (autoFilter) {
      const mappedCategory = mapLegacyCategoryToNew(autoFilter);
      setSelectedCategory(mappedCategory);
      sessionStorage.removeItem("kubegraf-auto-filter");
      shouldScrollToLocalCluster = autoFilter === "Local Cluster" || autoFilter === "local-cluster" || mappedCategory === "local-cluster";
    }
    const defaultTab = sessionStorage.getItem("kubegraf-default-tab");
    if (defaultTab && (defaultTab === "marketplace" || defaultTab === "custom")) {
      setActiveTab(defaultTab);
      sessionStorage.removeItem("kubegraf-default-tab");
    }
    if (shouldScrollToLocalCluster) {
      setTimeout(() => {
        const localClusterSection = document.querySelector('[data-category="local-cluster"]');
        if (localClusterSection) {
          localClusterSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 300);
    }
  });
  createEffect(() => {
    const view = currentView();
    if (view === "apps") {
      const autoFilter = sessionStorage.getItem("kubegraf-auto-filter");
      const defaultTab = sessionStorage.getItem("kubegraf-default-tab");
      if (autoFilter) {
        const mappedCategory = mapLegacyCategoryToNew(autoFilter);
        setSelectedCategory(mappedCategory);
        sessionStorage.removeItem("kubegraf-auto-filter");
        const shouldScrollToLocalCluster = autoFilter === "Local Cluster" || autoFilter === "local-cluster" || mappedCategory === "local-cluster";
        if (shouldScrollToLocalCluster) {
          setTimeout(() => {
            const localClusterSection = document.querySelector('[data-category="local-cluster"]');
            if (localClusterSection) {
              localClusterSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }
          }, 300);
        }
      }
      if (defaultTab && (defaultTab === "marketplace" || defaultTab === "custom")) {
        setActiveTab(defaultTab);
        sessionStorage.removeItem("kubegraf-default-tab");
      }
    }
  });
  const [activeTab, setActiveTab] = createSignal(props.defaultTab || "marketplace");
  createEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab);
    }
  });
  const [customApps, setCustomApps] = createSignal(loadCustomApps());
  const [showAddCustomModal, setShowAddCustomModal] = createSignal(false);
  const [newCustomApp, setNewCustomApp] = createSignal({
    name: "",
    displayName: "",
    description: "",
    category: "Custom",
    chartRepo: "",
    chartName: "",
    version: "1.0.0"
  });
  const [installedApps, {
    refetch: refetchInstalled
  }] = createResource(async () => {
    try {
      return await api.getInstalledApps();
    } catch {
      return [];
    }
  });
  const [deployedCustomApps, {
    refetch: refetchDeployedCustomApps
  }] = createResource(async () => {
    try {
      const response = await api.listCustomApps();
      return response.apps || [];
    } catch {
      return [];
    }
  });
  const [localClusters, {
    refetch: refetchLocalClusters
  }] = createResource(async () => {
    try {
      const response = await fetch("/api/apps/local-clusters");
      if (!response.ok) return {
        clusters: [],
        count: 0
      };
      return await response.json();
    } catch {
      return {
        clusters: [],
        count: 0
      };
    }
  });
  const apps = createMemo(() => {
    const installed = installedApps() || [];
    installStatusTracker.syncWithInstalled(installed.map((i) => ({
      namespace: i.namespace,
      chart: i.chart,
      version: i.version,
      releaseName: i.name,
      status: "installed"
    })));
    return defaultApps.map((app) => {
      const instances = getInstalledInstancesForApp(app, installed);
      return {
        ...app,
        installedInstances: instances
      };
    });
  });
  const categories = createMemo(() => {
    const allCategories = ["all", ...marketplaceCategories.map((cat) => cat.id)];
    return allCategories;
  });
  const filteredApps = createMemo(() => {
    let all = apps();
    const query = search().toLowerCase();
    const cat = selectedCategory();
    if (cat !== "all") {
      all = all.filter((app) => app.category === cat);
    }
    if (query) {
      all = all.filter((app) => app.displayName.toLowerCase().includes(query) || app.description.toLowerCase().includes(query) || app.category.toLowerCase().includes(query));
    }
    return all;
  });
  createMemo(() => {
    const filtered = filteredApps();
    const groups = {};
    filtered.forEach((app) => {
      if (!groups[app.category]) {
        groups[app.category] = [];
      }
      groups[app.category].push(app);
    });
    return Object.entries(groups).map(([name, apps2]) => ({
      name,
      apps: apps2
    }));
  });
  const appCounts = createMemo(() => {
    const all = apps();
    return {
      total: all.length,
      installed: all.filter((a) => a.installedInstances && a.installedInstances.length > 0).length,
      available: all.filter((a) => !a.installedInstances || a.installedInstances.length === 0).length
    };
  });
  const [installTab, setInstallTab] = createSignal("overview");
  const helmCommandPreview = createMemo(() => {
    const app = selectedApp();
    if (!app) return "";
    const isLocalCluster = isLocalClusterApp(app.name);
    if (isLocalCluster) {
      const name = clusterName();
      const lines2 = ["# Local cluster installer (managed by KubeGraf)", `# Provider: ${app.name}`, name ? `# Cluster name: ${name}` : "", "# KubeGraf will orchestrate Docker and local Kubernetes cluster creation for you.", "# Exact commands may differ slightly from this preview."].filter(Boolean);
      return lines2.join("\n");
    }
    const ns = installNamespace() || "default";
    const repoUrl = app.chartRepo || "<chart-repo-url>";
    const chartName = app.chartName || "<chart-name>";
    const version = app.version || "";
    const releaseNameBase = (app.displayName || app.name || "app").toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const releaseName = releaseNameBase || "release-name";
    const repoAlias = app.name || "kubegraf-app";
    const installLineBase = `helm install ${releaseName} ${repoAlias}/${chartName} --namespace ${ns} --create-namespace`;
    const installLine = version ? `${installLineBase} --version ${version}` : installLineBase;
    const lines = ["# Equivalent Helm commands (approximate)", `helm repo add ${repoAlias} ${repoUrl}`, "helm repo update", installLine];
    return lines.join("\n");
  });
  const checkDeploymentStatus = (appName, displayName, targetNamespace) => {
    const checkInterval = setInterval(async () => {
      try {
        const installed = await api.getInstalledApps();
        const isInstalled = installed?.some((app) => app.name === appName);
        if (isInstalled) {
          clearInterval(checkInterval);
          setDeployingApps((prev) => {
            const next = {
              ...prev
            };
            delete next[appName];
            return next;
          });
          const successMessage = `${displayName} deployed successfully to ${targetNamespace}`;
          addPersistentNotification(successMessage, "success");
          addNotification(successMessage, "success");
          refetchInstalled();
        }
      } catch (e) {
      }
    }, 5e3);
    setTimeout(() => {
      clearInterval(checkInterval);
      setDeployingApps((prev) => {
        const next = {
          ...prev
        };
        delete next[appName];
        return next;
      });
    }, 3e5);
  };
  const handleInstall = async () => {
    const app = selectedApp();
    if (!app) return;
    const isLocalCluster = isLocalClusterApp(app.name);
    if (isLocalCluster) {
      const validation = validateClusterName(clusterName());
      if (!validation.valid) {
        setClusterNameError(validation.error || "Invalid cluster name");
        return;
      }
      setClusterNameError("");
    }
    setInstalling(true);
    const targetNs = isLocalCluster ? "default" : installNamespace() || "default";
    const customClusterName = isLocalCluster ? clusterName() : void 0;
    const tasks = isLocalCluster ? ["Checking Docker", "Preparing cluster", "Installing cluster", "Verifying installation"] : ["Validating namespace", "Adding Helm repository", "Fetching chart metadata", "Installing resources", "Verifying deployment"];
    const deploymentId = addDeployment(app.displayName, app.version, targetNs, tasks);
    try {
      if (isLocalCluster) {
        updateDeploymentTask(deploymentId, "task-0", {
          status: "running",
          progress: 10,
          startTime: Date.now(),
          message: "Checking Docker availability..."
        });
        const response = await api.installApp(app.name, targetNs, void 0, customClusterName);
        if (!response.success || response.error) {
          const errorMessage = response.error || "Docker check failed";
          const dockerError = formatDockerError();
          updateDeploymentTask(deploymentId, "task-0", {
            status: "failed",
            progress: 0,
            message: dockerError.message,
            endTime: Date.now()
          });
          addPersistentNotification(`${app.displayName} installation failed: ${dockerError.message}. Please install or start Docker Desktop first.`, "error");
          addNotification(`Docker is not available. Please install or start Docker Desktop before installing local clusters.`, "error");
          setShowInstallModal(false);
          setInstalling(false);
          return;
        }
        updateDeploymentTask(deploymentId, "task-0", {
          status: "completed",
          progress: 100,
          endTime: Date.now()
        });
        setShowInstallModal(false);
      } else {
        updateDeploymentTask(deploymentId, "task-0", {
          status: "running",
          progress: 10,
          startTime: Date.now(),
          message: "Validating namespace..."
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        updateDeploymentTask(deploymentId, "task-0", {
          status: "completed",
          progress: 100,
          endTime: Date.now()
        });
      }
      if (tasks.length > 1) {
        updateDeploymentTask(deploymentId, "task-1", {
          status: "running",
          progress: 20,
          startTime: Date.now(),
          message: isLocalCluster ? "Preparing cluster environment..." : "Adding Helm repository..."
        });
        if (!isLocalCluster) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          updateDeploymentTask(deploymentId, "task-1", {
            status: "completed",
            progress: 100,
            endTime: Date.now()
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
          updateDeploymentTask(deploymentId, "task-1", {
            status: "completed",
            progress: 100,
            endTime: Date.now()
          });
        }
      }
      if (!isLocalCluster && tasks.length > 2) {
        updateDeploymentTask(deploymentId, "task-2", {
          status: "running",
          progress: 30,
          startTime: Date.now(),
          message: "Fetching chart metadata..."
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        updateDeploymentTask(deploymentId, "task-2", {
          status: "completed",
          progress: 100,
          endTime: Date.now()
        });
      }
      const installTaskId = isLocalCluster ? "task-2" : "task-3";
      if (!isLocalCluster) {
        updateDeploymentTask(deploymentId, installTaskId, {
          status: "running",
          progress: 50,
          startTime: Date.now(),
          message: `Installing ${app.displayName}...`
        });
        await api.installApp(app.name, targetNs);
        updateDeploymentTask(deploymentId, installTaskId, {
          status: "running",
          progress: 70,
          message: `${app.displayName} installation in progress...`
        });
      } else {
        updateDeploymentTask(deploymentId, installTaskId, {
          status: "running",
          progress: 40,
          startTime: Date.now(),
          message: `Installing ${app.displayName} cluster "${customClusterName}"...`
        });
      }
      setDeployingApps((prev) => ({
        ...prev,
        [app.name]: {
          namespace: targetNs,
          startTime: Date.now()
        }
      }));
      if (isLocalCluster) {
        let pollCount = 0;
        const maxPolls = 60;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const installed = await api.getInstalledApps();
            const isInstalled = installed?.some((inst) => inst.name === customClusterName || inst.name.includes(customClusterName || ""));
            if (isInstalled || pollCount >= maxPolls) {
              clearInterval(pollInterval);
              updateDeploymentTask(deploymentId, installTaskId, {
                status: "completed",
                progress: 100,
                message: `${app.displayName} "${customClusterName}" installed successfully!`
              });
              const verifyTaskId = "task-3";
              updateDeploymentTask(deploymentId, verifyTaskId, {
                status: "running",
                progress: 90,
                startTime: Date.now(),
                message: "Verifying cluster..."
              });
              await new Promise((resolve) => setTimeout(resolve, 1e3));
              updateDeploymentTask(deploymentId, verifyTaskId, {
                status: "completed",
                progress: 100,
                message: "Cluster verified and ready!"
              });
              const successMessage = `${app.displayName} "${customClusterName}" installed successfully!`;
              addPersistentNotification(successMessage, "success");
              addNotification(successMessage, "success");
              setShowInstallModal(false);
              refetchInstalled();
            } else {
              const progress = Math.min(70 + pollCount / maxPolls * 20, 90);
              updateDeploymentTask(deploymentId, installTaskId, {
                progress,
                message: `Installing... (${pollCount * 5}s)`
              });
            }
          } catch (e) {
          }
        }, 5e3);
      } else {
        checkDeploymentStatus(app.name, app.displayName, targetNs);
        const verifyTaskId = "task-4";
        updateDeploymentTask(deploymentId, verifyTaskId, {
          status: "running",
          progress: 80,
          startTime: Date.now(),
          message: "Verifying deployment..."
        });
        setTimeout(() => {
          updateDeploymentTask(deploymentId, verifyTaskId, {
            status: "running",
            progress: 90,
            message: "Waiting for deployment to be ready..."
          });
        }, 2e3);
      }
    } catch (error) {
      const errorMessage = error?.message || error?.error || "Unknown error";
      if (errorMessage.toLowerCase().includes("docker")) {
        const dockerError = formatDockerError();
        updateDeploymentTask(deploymentId, "task-0", {
          status: "failed",
          progress: 0,
          message: dockerError.message
        });
        addPersistentNotification(`${app.displayName} installation failed: ${dockerError.message}. Click to install Docker Desktop.`, "error");
        window.open(dockerError.installUrl, "_blank");
        addNotification(`Docker not found. Opening Docker Desktop installation page...`, "warning");
      } else {
        const tasks2 = ["task-0", "task-1", "task-2", "task-3", "task-4"];
        for (const taskId of tasks2) {
          updateDeploymentTask(deploymentId, taskId, {
            status: "failed",
            message: errorMessage
          });
          break;
        }
        addPersistentNotification(`Failed to install ${app.displayName}: ${errorMessage}`, "error");
        addNotification(`Failed to install ${app.displayName}: ${errorMessage}`, "error");
      }
      setShowInstallModal(false);
    } finally {
      setInstalling(false);
    }
  };
  const navigateToPods = (app) => {
    const ns = app.installedInstances && app.installedInstances.length > 0 ? app.installedInstances[0].namespace : app.installedNamespace || "default";
    console.log("Navigating to pods for app:", app.name, "in namespace:", ns);
    setNamespace(ns);
    setCurrentView("pods");
  };
  const handleUninstall = (app, instance) => {
    const instances = app.installedInstances || [];
    const initialSelection = instance ? [instance] : void 0;
    setAppToUninstall({
      app,
      instances,
      initialSelection
    });
    setShowUninstallModal(true);
  };
  const confirmUninstall = async (instancesToUninstall) => {
    const uninstallData = appToUninstall();
    if (!uninstallData) return;
    if (!instancesToUninstall || instancesToUninstall.length === 0) return;
    setUninstalling(true);
    try {
      for (const inst of instancesToUninstall) {
        await api.uninstallApp(inst.releaseName, inst.namespace);
      }
      const summary = formatNamespacesForUninstall(instancesToUninstall.map((i) => i.namespace));
      addNotification(`${uninstallData.app.displayName} uninstalled from ${summary}`, "success");
      refetchInstalled();
      setShowUninstallModal(false);
      setAppToUninstall(null);
    } catch (error) {
      addNotification(`Failed to uninstall ${uninstallData.app.displayName}: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setUninstalling(false);
    }
  };
  const handleAddCustomApp = () => {
    const app = newCustomApp();
    if (!app.name || !app.chartRepo || !app.chartName) {
      addNotification("Please fill in all required fields", "error");
      return;
    }
    const name = app.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const customApp = {
      name,
      displayName: app.displayName || app.name,
      description: app.description || `Custom Helm chart: ${app.chartName}`,
      category: app.category || "Custom",
      icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
      // Settings gear icon
      version: app.version || "1.0.0",
      chartRepo: app.chartRepo,
      chartName: app.chartName,
      isCustom: true
    };
    const updated = [...customApps(), customApp];
    setCustomApps(updated);
    saveCustomApps(updated);
    setNewCustomApp({
      name: "",
      displayName: "",
      description: "",
      category: "Custom",
      chartRepo: "",
      chartName: "",
      version: "1.0.0"
    });
    setShowAddCustomModal(false);
    addNotification(`${customApp.displayName} added to custom apps`, "success");
  };
  const handleDeleteCustomApp = (app) => {
    setAppToDelete(app);
    setShowDeleteCustomModal(true);
  };
  const confirmDeleteCustomApp = () => {
    const app = appToDelete();
    if (!app) return;
    const updated = customApps().filter((a) => a.name !== app.name);
    setCustomApps(updated);
    saveCustomApps(updated);
    addNotification(`${app.displayName} removed from custom apps`, "success");
    setShowDeleteCustomModal(false);
    setAppToDelete(null);
  };
  const handleModifyCustomApp = async (app) => {
    if (!app.isDeployedCustomApp || !app.customAppInfo) return;
    try {
      const response = await api.getCustomApp(app.customAppInfo.deploymentId);
      if (response.success && response.app) {
        setCustomAppToModify(response.app);
        setShowCustomDeployWizard(true);
      } else {
        addNotification("Failed to load app details", "error");
      }
    } catch (err) {
      addNotification("Failed to load app details", "error");
      console.error(err);
    }
  };
  const handleRestartCustomApp = (app) => {
    if (!app.isDeployedCustomApp || !app.customAppInfo) return;
    setDeployedCustomAppToAction(app);
    setShowRestartCustomAppModal(true);
  };
  const confirmRestartCustomApp = async () => {
    const app = deployedCustomAppToAction();
    if (!app || !app.customAppInfo) return;
    try {
      const response = await api.restartCustomApp(app.customAppInfo.deploymentId);
      if (response.success) {
        addNotification("Custom app restarted successfully", "success");
        refetchDeployedCustomApps();
      } else {
        addNotification(response.error || "Failed to restart app", "error");
      }
    } catch (err) {
      addNotification("Failed to restart app", "error");
      console.error(err);
    } finally {
      setShowRestartCustomAppModal(false);
      setDeployedCustomAppToAction(null);
    }
  };
  const handleDeleteDeployedCustomApp = (app) => {
    if (!app.isDeployedCustomApp || !app.customAppInfo) return;
    setDeployedCustomAppToAction(app);
    setShowDeleteDeployedCustomAppModal(true);
  };
  const confirmDeleteDeployedCustomApp = async () => {
    const app = deployedCustomAppToAction();
    if (!app || !app.customAppInfo) return;
    try {
      const response = await api.deleteCustomApp(app.customAppInfo.deploymentId);
      if (response.success) {
        addNotification("Custom app deleted successfully", "success");
        refetchDeployedCustomApps();
      } else {
        addNotification(response.error || "Failed to delete app", "error");
      }
    } catch (err) {
      addNotification("Failed to delete app", "error");
      console.error(err);
    } finally {
      setShowDeleteDeployedCustomAppModal(false);
      setDeployedCustomAppToAction(null);
    }
  };
  const convertCustomAppInfoToApp = (customApp) => {
    return {
      name: customApp.deploymentId,
      displayName: customApp.name || `Custom App (${customApp.deploymentId.substring(0, 8)})`,
      description: `Deployed custom app with ${Object.values(customApp.resourceCount).reduce((a, b) => a + b, 0)} resources`,
      category: "Custom",
      version: "1.0.0",
      icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
      isCustom: true,
      isDeployedCustomApp: true,
      // Flag to identify deployed custom apps
      customAppInfo: customApp
      // Store the original info
    };
  };
  const allApps = createMemo(() => {
    const installed = installedApps() || [];
    const deployedCustom = deployedCustomApps() || [];
    const marketplaceWithStatus = defaultApps.map((app) => {
      const instances = getInstalledInstancesForApp(app, installed);
      return {
        ...app,
        installedInstances: instances
      };
    });
    const deployedCustomAppsFormatted = deployedCustom.map(convertCustomAppInfoToApp);
    const customFromStorage = customApps().map((app) => {
      const instances = getInstalledInstancesForApp(app, installed);
      return {
        ...app,
        installedInstances: instances
      };
    });
    const customWithStatus = [...customFromStorage, ...deployedCustomAppsFormatted.filter((deployed) => !customFromStorage.some((storage) => storage.name === deployed.name))];
    return {
      marketplace: marketplaceWithStatus,
      custom: customWithStatus
    };
  });
  const displayedApps = createMemo(() => {
    const {
      marketplace,
      custom
    } = allApps();
    const baseApps = activeTab() === "marketplace" ? marketplace : custom;
    const query = search().toLowerCase();
    const cat = selectedCategory();
    let filtered = baseApps;
    if (cat !== "all") {
      filtered = filtered.filter((app) => app.category === cat);
    }
    if (query) {
      filtered = filtered.filter((app) => app.displayName.toLowerCase().includes(query) || app.description.toLowerCase().includes(query) || app.category.toLowerCase().includes(query));
    }
    return filtered;
  });
  const displayedGroupedApps = createMemo(() => {
    const filtered = displayedApps();
    const groups = {};
    filtered.forEach((app) => {
      if (!groups[app.category]) {
        groups[app.category] = [];
      }
      groups[app.category].push(app);
    });
    return Object.entries(groups).map(([name, apps2]) => ({
      name,
      apps: apps2
    }));
  });
  const ViewIcon = (props2) => createComponent(Switch, {
    get children() {
      return [createComponent(Match, {
        get when() {
          return props2.mode === "card";
        },
        get children() {
          return _tmpl$();
        }
      }), createComponent(Match, {
        get when() {
          return props2.mode === "list";
        },
        get children() {
          return _tmpl$2();
        }
      }), createComponent(Match, {
        get when() {
          return props2.mode === "grid";
        },
        get children() {
          return _tmpl$3();
        }
      })];
    }
  });
  const CardView = () => createComponent(For, {
    get each() {
      return displayedGroupedApps();
    },
    children: (group) => (() => {
      var _el$4 = _tmpl$4(), _el$5 = _el$4.firstChild, _el$6 = _el$5.firstChild, _el$7 = _el$5.nextSibling;
      insert(_el$5, () => marketplaceCategories.find((c) => c.id === group.name)?.name || group.name, null);
      insert(_el$7, createComponent(For, {
        get each() {
          return group.apps;
        },
        children: (app) => {
          const isDeploying = () => !!deployingApps()[app.name];
          const deployInfo = () => deployingApps()[app.name];
          const sourceMeta = getAppSourceMetadata(app);
          return (() => {
            var _el$8 = _tmpl$15(), _el$15 = _el$8.firstChild, _el$16 = _el$15.firstChild, _el$18 = _el$16.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling; _el$20.firstChild; var _el$22 = _el$15.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling, _el$27 = _el$24.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$39 = _el$23.nextSibling, _el$40 = _el$39.firstChild;
            insert(_el$8, createComponent(Show, {
              get when() {
                return isDeploying();
              },
              get children() {
                var _el$9 = _tmpl$5(); _el$9.firstChild;
                return _el$9;
              }
            }), _el$15);
            insert(_el$8, createComponent(Show, {
              get when() {
                return memo(() => !!((app.name === "k3d" || app.name === "kind" || app.name === "minikube") && localClusters()?.clusters?.filter((c) => c.type === app.name).length > 0))() && !isDeploying();
              },
              get children() {
                var _el$1 = _tmpl$6(), _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling;
                insert(_el$1, () => localClusters()?.clusters?.filter((c) => c.type === app.name).length, _el$11);
                return _el$1;
              }
            }), _el$15);
            insert(_el$8, createComponent(Show, {
              get when() {
                return memo(() => !!(app.installedInstances && app.installedInstances.length > 0 && !isDeploying() && app.name !== "k3d" && app.name !== "kind"))() && app.name !== "minikube";
              },
              get children() {
                var _el$12 = _tmpl$7(), _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling;
                insert(_el$12, () => app.installedInstances.length, _el$14);
                return _el$12;
              }
            }), _el$15);
            insert(_el$16, createComponent(Show, {
              get when() {
                return isDeploying();
              },
              get fallback() {
                return (() => {
                  var _el$58 = _tmpl$16(), _el$59 = _el$58.firstChild;
                  createRenderEffect((_p$) => {
                    var _v$9 = getCategoryColor(app.category), _v$0 = app.icon;
                    _v$9 !== _p$.e && setStyleProperty(_el$58, "color", _p$.e = _v$9);
                    _v$0 !== _p$.t && setAttribute(_el$59, "d", _p$.t = _v$0);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0
                  });
                  return _el$58;
                })();
              },
              get children() {
                return _tmpl$8();
              }
            }));
            insert(_el$19, () => app.displayName);
            insert(_el$20, () => app.version, null);
            insert(_el$22, () => app.description);
            insert(_el$26, (() => {
              var _c$ = memo(() => !!sourceMeta.isManifestDeployment);
              return () => _c$() ? "Manifest deployment" : memo(() => !!sourceMeta.verified)() ? [_tmpl$17(), "Verified publisher"] : "Community source";
            })());
            insert(_el$28, () => sourceMeta.isManifestDeployment ? "Deployed from" : "Artifact from", _el$29);
            insert(_el$30, () => sourceMeta.publisher);
            insert(_el$27, createComponent(Show, {
              get when() {
                return memo(() => !!!sourceMeta.isManifestDeployment)() && sourceMeta.helmRepo;
              },
              get children() {
                return [(() => {
                  var _el$31 = _tmpl$9(), _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling;
                  _el$33.$$click = (e) => e.stopPropagation();
                  insert(_el$33, () => sourceMeta.helmRepo);
                  createRenderEffect(() => setAttribute(_el$33, "href", sourceMeta.helmRepo));
                  return _el$31;
                })(), (() => {
                  var _el$34 = _tmpl$0(), _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling;
                  insert(_el$36, () => sourceMeta.chartName);
                  insert(_el$34, (() => {
                    var _c$2 = memo(() => !!sourceMeta.chartVersion);
                    return () => _c$2() && (() => {
                      var _el$61 = _tmpl$18(); _el$61.firstChild;
                      insert(_el$61, () => sourceMeta.chartVersion, null);
                      return _el$61;
                    })();
                  })(), null);
                  return _el$34;
                })()];
              }
            }), null);
            insert(_el$27, createComponent(Show, {
              get when() {
                return sourceMeta.isManifestDeployment;
              },
              get children() {
                return _tmpl$1();
              }
            }), null);
            insert(_el$27, createComponent(Show, {
              get when() {
                return app.sourceCitation;
              },
              get children() {
                var _el$38 = _tmpl$10();
                insert(_el$38, () => app.sourceCitation);
                return _el$38;
              }
            }), null);
            insert(_el$40, () => app.chartName);
            insert(_el$39, createComponent(Show, {
              get when() {
                return isDeploying();
              },
              get children() {
                var _el$41 = _tmpl$11(), _el$42 = _el$41.firstChild; _el$42.firstChild;
                insert(_el$42, () => deployInfo()?.namespace, null);
                return _el$41;
              }
            }), null);
            insert(_el$39, createComponent(Show, {
              get when() {
                return !isDeploying();
              },
              get children() {
                return createComponent(Show, {
                  get when() {
                    return app.isDeployedCustomApp;
                  },
                  get fallback() {
                    return [createComponent(Show, {
                      get when() {
                        return !app.isDeployedCustomApp;
                      },
                      get children() {
                        var _el$63 = _tmpl$19();
                        _el$63.$$click = (e) => {
                          e.stopPropagation();
                          setSelectedApp(app);
                          if (app.name === "mlflow") {
                            setShowMLflowWizard(true);
                          } else if (app.name === "feast") {
                            setShowFeastWizard(true);
                          } else {
                            setShowInstallModal(true);
                          }
                        };
                        return _el$63;
                      }
                    }), createComponent(Show, {
                      get when() {
                        return app.isCustom;
                      },
                      get children() {
                        var _el$64 = _tmpl$20();
                        _el$64.$$click = (e) => {
                          e.stopPropagation();
                          handleDeleteCustomApp(app);
                        };
                        return _el$64;
                      }
                    })];
                  },
                  get children() {
                    var _el$44 = _tmpl$12(), _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$46.nextSibling, _el$48 = _el$47.nextSibling;
                    _el$45.$$click = (e) => {
                      e.stopPropagation();
                      navigateToPods(app);
                    };
                    _el$46.$$click = (e) => {
                      e.stopPropagation();
                      handleModifyCustomApp(app);
                    };
                    _el$47.$$click = (e) => {
                      e.stopPropagation();
                      handleRestartCustomApp(app);
                    };
                    _el$48.$$click = (e) => {
                      e.stopPropagation();
                      handleDeleteDeployedCustomApp(app);
                    };
                    return _el$44;
                  }
                });
              }
            }), null);
            insert(_el$8, createComponent(Show, {
              get when() {
                return memo(() => !!((app.name === "k3d" || app.name === "kind" || app.name === "minikube") && localClusters()?.clusters?.filter((c) => c.type === app.name).length > 0))() && !isDeploying();
              },
              get children() {
                var _el$49 = _tmpl$13(), _el$50 = _el$49.firstChild, _el$51 = _el$50.firstChild, _el$53 = _el$51.nextSibling; _el$53.nextSibling;
                insert(_el$50, () => localClusters()?.clusters?.filter((c) => c.type === app.name).length, _el$53);
                insert(_el$49, createComponent(For, {
                  get each() {
                    return localClusters()?.clusters?.filter((c) => c.type === app.name) || [];
                  },
                  children: (cluster) => (() => {
                    var _el$65 = _tmpl$21(), _el$66 = _el$65.firstChild, _el$67 = _el$66.firstChild, _el$68 = _el$67.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$66.nextSibling;
                    insert(_el$67, () => cluster.name);
                    insert(_el$68, () => cluster.provider, _el$69);
                    insert(_el$68, () => cluster.type, null);
                    _el$70.$$click = (e) => {
                      e.stopPropagation();
                      setClusterToDelete({
                        name: cluster.name,
                        type: cluster.type
                      });
                      setShowDeleteClusterModal(true);
                    };
                    return _el$65;
                  })()
                }), null);
                return _el$49;
              }
            }), null);
            insert(_el$8, createComponent(Show, {
              get when() {
                return memo(() => !!(app.installedInstances && app.installedInstances.length > 0 && !isDeploying() && app.name !== "k3d" && app.name !== "kind"))() && app.name !== "minikube";
              },
              get children() {
                var _el$54 = _tmpl$14(), _el$55 = _el$54.firstChild; _el$55.firstChild; _el$55.nextSibling;
                insert(_el$55, createComponent(NamespaceBadges, {
                  get namespaces() {
                    return getInstalledNamespaces(app.installedInstances);
                  },
                  maxShown: 6
                }), null);
                insert(_el$54, createComponent(For, {
                  get each() {
                    return app.installedInstances;
                  },
                  children: (instance) => (() => {
                    var _el$71 = _tmpl$22(), _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$74 = _el$73.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$72.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.nextSibling;
                    insert(_el$73, () => instance.releaseName);
                    insert(_el$76, () => app.chartName, null);
                    insert(_el$76, (() => {
                      var _c$3 = memo(() => !!instance.version);
                      return () => _c$3() ? ` • v${instance.version}` : "";
                    })(), null);
                    insert(_el$75, createComponent(NamespaceBadge, {
                      get namespace() {
                        return instance.namespace;
                      }
                    }), null);
                    _el$78.$$click = (e) => {
                      e.stopPropagation();
                      setNamespace(instance.namespace);
                      setCurrentView("pods");
                    };
                    _el$79.$$click = (e) => {
                      e.stopPropagation();
                      handleUninstall(app, instance);
                    };
                    return _el$71;
                  })()
                }), null);
                return _el$54;
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$4 = `card p-4 relative overflow-hidden group transition-all ${app.installedInstances && app.installedInstances.length > 0 ? "hover:border-blue-500/30" : "hover:border-cyan-500/30"} ${isDeploying() ? "animate-pulse" : ""}`, _v$5 = `4px solid ${getCategoryColor(app.category)}`, _v$6 = currentTheme() === "light" ? "rgba(224, 242, 254, 0.9)" : "rgba(15,23,42,0.7)", _v$7 = currentTheme() === "light" ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(148, 163, 184, 0.35)", _v$8 = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${sourceMeta.verified ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-slate-600/20 text-slate-200 border border-slate-500/40"}`;
              _v$4 !== _p$.e && className(_el$8, _p$.e = _v$4);
              _v$5 !== _p$.t && setStyleProperty(_el$8, "border-left", _p$.t = _v$5);
              _v$6 !== _p$.a && setStyleProperty(_el$23, "background", _p$.a = _v$6);
              _v$7 !== _p$.o && setStyleProperty(_el$23, "border", _p$.o = _v$7);
              _v$8 !== _p$.i && className(_el$26, _p$.i = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            return _el$8;
          })();
        }
      }));
      createRenderEffect((_p$) => {
        var _v$ = group.name, _v$2 = getCategoryColor(group.name), _v$3 = getCategoryColor(group.name);
        _v$ !== _p$.e && setAttribute(_el$4, "data-category", _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$5, "color", _p$.t = _v$2);
        _v$3 !== _p$.a && setStyleProperty(_el$6, "background", _p$.a = _v$3);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$4;
    })()
  });
  const ListView = () => (() => {
    var _el$80 = _tmpl$23(), _el$81 = _el$80.firstChild, _el$82 = _el$81.firstChild, _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling;
    insert(_el$84, createComponent(For, {
      get each() {
        return displayedApps();
      },
      get fallback() {
        return (() => {
          var _el$85 = _tmpl$24(); _el$85.firstChild;
          return _el$85;
        })();
      },
      children: (app) => {
        const isDeploying = () => !!deployingApps()[app.name];
        return (() => {
          var _el$87 = _tmpl$32(), _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild, _el$90 = _el$89.firstChild, _el$91 = _el$90.firstChild, _el$92 = _el$91.firstChild, _el$93 = _el$90.nextSibling, _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling, _el$102 = _el$88.nextSibling, _el$103 = _el$102.firstChild, _el$104 = _el$102.nextSibling, _el$105 = _el$104.nextSibling, _el$106 = _el$105.nextSibling, _el$109 = _el$106.nextSibling, _el$110 = _el$109.nextSibling, _el$111 = _el$110.firstChild;
          insert(_el$94, () => app.displayName);
          insert(_el$95, () => app.description);
          insert(_el$93, createComponent(Show, {
            get when() {
              return app.sourceCitation;
            },
            get children() {
              var _el$96 = _tmpl$26(), _el$97 = _el$96.firstChild, _el$98 = _el$97.nextSibling;
              insert(_el$98, () => app.sourceCitation);
              insert(_el$96, createComponent(Show, {
                get when() {
                  return memo(() => !!app.chartRepo)() && app.chartRepo !== "local-cluster";
                },
                get children() {
                  var _el$99 = _tmpl$25(), _el$100 = _el$99.firstChild, _el$101 = _el$100.nextSibling;
                  _el$101.$$click = (e) => e.stopPropagation();
                  insert(_el$101, () => app.chartRepo);
                  createRenderEffect(() => setAttribute(_el$101, "href", app.chartRepo));
                  return _el$99;
                }
              }), null);
              return _el$96;
            }
          }), null);
          insert(_el$103, () => app.category);
          insert(_el$104, () => app.version);
          insert(_el$105, () => app.chartName);
          insert(_el$106, createComponent(Show, {
            get when() {
              return isDeploying();
            },
            get fallback() {
              return createComponent(Show, {
                get when() {
                  return app.isDeployedCustomApp;
                },
                get fallback() {
                  return createComponent(Show, {
                    get when() {
                      return (app.installedInstances?.length || 0) > 0;
                    },
                    get fallback() {
                      return _tmpl$35();
                    },
                    get children() {
                      return _tmpl$34();
                    }
                  });
                },
                get children() {
                  return _tmpl$33();
                }
              });
            },
            get children() {
              var _el$107 = _tmpl$27(); _el$107.firstChild;
              return _el$107;
            }
          }));
          insert(_el$109, createComponent(Show, {
            get when() {
              return memo(() => !!app.installedInstances)() && app.installedInstances.length > 0;
            },
            fallback: "-",
            get children() {
              return createComponent(NamespaceBadges, {
                get namespaces() {
                  return getInstalledNamespaces(app.installedInstances);
                },
                maxShown: 3,
                badgeSize: "sm"
              });
            }
          }));
          insert(_el$111, createComponent(Show, {
            get when() {
              return !isDeploying();
            },
            get children() {
              return createComponent(Show, {
                get when() {
                  return (app.installedInstances?.length || 0) > 0 || app.isDeployedCustomApp;
                },
                get fallback() {
                  return (() => {
                    var _el$119 = _tmpl$36();
                    _el$119.$$click = () => {
                      setSelectedApp(app);
                      if (app.name === "mlflow") {
                        setShowMLflowWizard(true);
                      } else {
                        setShowInstallModal(true);
                      }
                    };
                    return _el$119;
                  })();
                },
                get children() {
                  return createComponent(Show, {
                    get when() {
                      return app.isDeployedCustomApp;
                    },
                    get fallback() {
                      return [(() => {
                        var _el$120 = _tmpl$37();
                        _el$120.$$click = () => navigateToPods(app);
                        return _el$120;
                      })(), (() => {
                        var _el$121 = _tmpl$38();
                        _el$121.$$click = () => handleUninstall(app);
                        return _el$121;
                      })()];
                    },
                    get children() {
                      return [(() => {
                        var _el$112 = _tmpl$28();
                        _el$112.$$click = () => navigateToPods(app);
                        return _el$112;
                      })(), (() => {
                        var _el$113 = _tmpl$29();
                        _el$113.$$click = () => handleModifyCustomApp(app);
                        return _el$113;
                      })(), (() => {
                        var _el$114 = _tmpl$30();
                        _el$114.$$click = () => handleRestartCustomApp(app);
                        return _el$114;
                      })(), (() => {
                        var _el$115 = _tmpl$31();
                        _el$115.$$click = () => handleDeleteDeployedCustomApp(app);
                        return _el$115;
                      })()];
                    }
                  });
                }
              });
            }
          }));
          createRenderEffect((_p$) => {
            var _v$1 = getCategoryColor(app.category), _v$10 = app.icon, _v$11 = `${getCategoryColor(app.category)}20`, _v$12 = categoryColors[app.category] || "var(--accent-primary)";
            _v$1 !== _p$.e && setStyleProperty(_el$91, "color", _p$.e = _v$1);
            _v$10 !== _p$.t && setAttribute(_el$92, "d", _p$.t = _v$10);
            _v$11 !== _p$.a && setStyleProperty(_el$103, "background", _p$.a = _v$11);
            _v$12 !== _p$.o && setStyleProperty(_el$103, "color", _p$.o = _v$12);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0
          });
          return _el$87;
        })();
      }
    }));
    return _el$80;
  })();
  const GridView = () => (() => {
    var _el$122 = _tmpl$39();
    insert(_el$122, createComponent(For, {
      get each() {
        return displayedApps();
      },
      children: (app) => {
        const isDeploying = () => !!deployingApps()[app.name];
        const isInstalled = () => (app.installedInstances?.length || 0) > 0 && !isDeploying();
        return (() => {
          var _el$123 = _tmpl$43(), _el$126 = _el$123.firstChild, _el$127 = _el$126.firstChild, _el$128 = _el$127.firstChild, _el$129 = _el$128.firstChild, _el$130 = _el$126.nextSibling, _el$131 = _el$130.nextSibling, _el$132 = _el$131.nextSibling, _el$133 = _el$132.firstChild; _el$133.firstChild;
          _el$123.$$click = () => isInstalled() && navigateToPods(app);
          insert(_el$123, createComponent(Show, {
            get when() {
              return isDeploying() || isInstalled();
            },
            get children() {
              var _el$124 = _tmpl$41();
              insert(_el$124, createComponent(Show, {
                get when() {
                  return isDeploying();
                },
                get fallback() {
                  return _tmpl$44();
                },
                get children() {
                  return _tmpl$40();
                }
              }));
              return _el$124;
            }
          }), _el$126);
          insert(_el$130, () => app.displayName);
          insert(_el$131, () => app.description);
          insert(_el$133, () => app.version, null);
          insert(_el$132, createComponent(Show, {
            get when() {
              return memo(() => !!!isDeploying())() && !isInstalled();
            },
            get children() {
              var _el$135 = _tmpl$42();
              _el$135.$$click = (e) => {
                e.stopPropagation();
                setSelectedApp(app);
                if (app.name === "mlflow") {
                  setShowMLflowWizard(true);
                } else {
                  setShowInstallModal(true);
                }
              };
              return _el$135;
            }
          }), null);
          createRenderEffect((_p$) => {
            var _v$13 = `card p-3 text-left hover:border-cyan-500/30 transition-colors relative ${isInstalled() ? "cursor-pointer" : ""} ${isDeploying() ? "animate-pulse" : ""}`, _v$14 = `3px solid ${categoryColors[app.category] || "var(--accent-primary)"}`, _v$15 = categoryColors[app.category] || "var(--accent-primary)", _v$16 = app.icon, _v$17 = app.displayName, _v$18 = app.description;
            _v$13 !== _p$.e && className(_el$123, _p$.e = _v$13);
            _v$14 !== _p$.t && setStyleProperty(_el$123, "border-left", _p$.t = _v$14);
            _v$15 !== _p$.a && setStyleProperty(_el$128, "color", _p$.a = _v$15);
            _v$16 !== _p$.o && setAttribute(_el$129, "d", _p$.o = _v$16);
            _v$17 !== _p$.i && setAttribute(_el$130, "title", _p$.i = _v$17);
            _v$18 !== _p$.n && setAttribute(_el$131, "title", _p$.n = _v$18);
            return _p$;
          }, {
            e: void 0,
            t: void 0,
            a: void 0,
            o: void 0,
            i: void 0,
            n: void 0
          });
          return _el$123;
        })();
      }
    }));
    return _el$122;
  })();
  return (() => {
    var _el$137 = _tmpl$55(), _el$138 = _el$137.firstChild, _el$139 = _el$138.firstChild, _el$140 = _el$139.firstChild, _el$141 = _el$140.nextSibling, _el$142 = _el$139.nextSibling, _el$143 = _el$142.firstChild, _el$146 = _el$143.nextSibling, _el$156 = _el$138.nextSibling, _el$157 = _el$156.firstChild, _el$158 = _el$157.firstChild, _el$159 = _el$158.nextSibling, _el$160 = _el$157.nextSibling, _el$161 = _el$160.firstChild, _el$162 = _el$161.nextSibling, _el$163 = _el$160.nextSibling, _el$164 = _el$163.firstChild, _el$165 = _el$164.nextSibling, _el$166 = _el$163.nextSibling, _el$167 = _el$166.nextSibling, _el$168 = _el$156.nextSibling;
    insert(_el$140, createComponent(Show, {
      get when() {
        return activeTab() === "marketplace";
      },
      children: "Apps Marketplace"
    }), null);
    insert(_el$140, createComponent(Show, {
      get when() {
        return activeTab() === "custom";
      },
      children: "Custom Apps"
    }), null);
    insert(_el$141, createComponent(Show, {
      get when() {
        return activeTab() === "marketplace";
      },
      children: "Deploy platform tools and applications with one click"
    }), null);
    insert(_el$141, createComponent(Show, {
      get when() {
        return activeTab() === "custom";
      },
      children: "Manage your custom application deployments"
    }), null);
    insert(_el$143, createComponent(For, {
      each: ["card", "list", "grid"],
      children: (mode) => (() => {
        var _el$256 = _tmpl$56(), _el$257 = _el$256.firstChild;
        _el$256.$$click = () => setViewMode(mode);
        insert(_el$256, createComponent(ViewIcon, {
          mode
        }), _el$257);
        insert(_el$257, mode);
        createRenderEffect((_p$) => {
          var _v$31 = `px-3 py-2 flex items-center gap-2 text-sm transition-colors ${viewMode() === mode ? "text-white" : "text-gray-400 hover:text-white"}`, _v$32 = viewMode() === mode ? {
            background: "var(--accent-primary)"
          } : {
            background: "transparent"
          }, _v$33 = `${mode.charAt(0).toUpperCase() + mode.slice(1)} View`;
          _v$31 !== _p$.e && className(_el$256, _p$.e = _v$31);
          _p$.t = style(_el$256, _v$32, _p$.t);
          _v$33 !== _p$.a && setAttribute(_el$256, "title", _p$.a = _v$33);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$256;
      })()
    }));
    insert(_el$142, createComponent(Show, {
      get when() {
        return activeTab() === "marketplace";
      },
      get children() {
        var _el$144 = _tmpl$45();
        _el$144.$$click = () => setShowCustomDeployWizard(true);
        return _el$144;
      }
    }), _el$146);
    insert(_el$142, createComponent(Show, {
      get when() {
        return activeTab() === "custom";
      },
      get children() {
        var _el$145 = _tmpl$45();
        _el$145.$$click = () => setShowCustomDeployWizard(true);
        return _el$145;
      }
    }), _el$146);
    _el$146.$$click = () => refetchInstalled();
    insert(_el$137, createComponent(Show, {
      when: true,
      get children() {
        var _el$147 = _tmpl$46(), _el$148 = _el$147.firstChild, _el$149 = _el$148.firstChild, _el$150 = _el$149.nextSibling, _el$151 = _el$150.nextSibling, _el$152 = _el$148.nextSibling, _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling, _el$155 = _el$154.nextSibling;
        _el$148.$$click = () => setActiveTab("marketplace");
        insert(_el$151, () => defaultApps.length);
        _el$152.$$click = () => setActiveTab("custom");
        insert(_el$155, () => customApps().length + (deployedCustomApps()?.length || 0));
        createRenderEffect((_p$) => {
          var _v$19 = `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab() === "marketplace" ? "shadow-sm" : "hover:opacity-80"}`, _v$20 = activeTab() === "marketplace" ? "var(--bg-tertiary)" : "transparent", _v$21 = activeTab() === "marketplace" ? "var(--accent-primary)" : "var(--text-secondary)", _v$22 = `flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab() === "custom" ? "shadow-sm" : "hover:opacity-80"}`, _v$23 = activeTab() === "custom" ? "var(--bg-tertiary)" : "transparent", _v$24 = activeTab() === "custom" ? "var(--accent-primary)" : "var(--text-secondary)";
          _v$19 !== _p$.e && className(_el$148, _p$.e = _v$19);
          _v$20 !== _p$.t && setStyleProperty(_el$148, "background", _p$.t = _v$20);
          _v$21 !== _p$.a && setStyleProperty(_el$148, "color", _p$.a = _v$21);
          _v$22 !== _p$.o && className(_el$152, _p$.o = _v$22);
          _v$23 !== _p$.i && setStyleProperty(_el$152, "background", _p$.i = _v$23);
          _v$24 !== _p$.n && setStyleProperty(_el$152, "color", _p$.n = _v$24);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0
        });
        return _el$147;
      }
    }), _el$156);
    insert(_el$159, () => appCounts().total);
    insert(_el$162, () => appCounts().installed);
    insert(_el$165, () => appCounts().available);
    _el$167.$$input = (e) => setSearch(e.currentTarget.value);
    insert(_el$168, createComponent(For, {
      get each() {
        return categories();
      },
      children: (cat) => (() => {
        var _el$258 = _tmpl$57();
        _el$258.$$click = () => setSelectedCategory(cat);
        insert(_el$258, () => cat === "all" ? "All Categories" : marketplaceCategories.find((c) => c.id === cat)?.name || cat);
        createRenderEffect((_p$) => {
          var _v$34 = `px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory() === cat ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40" : "bg-white/5 border border-transparent hover:border-white/10"}`, _v$35 = selectedCategory() === cat ? cat === "all" ? "var(--accent-primary)" : getCategoryColor(cat) : "var(--text-secondary)";
          _v$34 !== _p$.e && className(_el$258, _p$.e = _v$34);
          _v$35 !== _p$.t && setStyleProperty(_el$258, "color", _p$.t = _v$35);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$258;
      })()
    }));
    insert(_el$137, createComponent(Switch, {
      get children() {
        return [createComponent(Match, {
          get when() {
            return viewMode() === "card";
          },
          get children() {
            return createComponent(CardView, {});
          }
        }), createComponent(Match, {
          get when() {
            return viewMode() === "list";
          },
          get children() {
            return createComponent(ListView, {});
          }
        }), createComponent(Match, {
          get when() {
            return viewMode() === "grid";
          },
          get children() {
            return createComponent(GridView, {});
          }
        })];
      }
    }), null);
    insert(_el$137, createComponent(Modal, {
      get isOpen() {
        return showInstallModal();
      },
      onClose: () => setShowInstallModal(false),
      get title() {
        return `Install ${selectedApp()?.displayName}`;
      },
      size: "xs",
      get children() {
        var _el$169 = _tmpl$49(), _el$170 = _el$169.firstChild, _el$179 = _el$170.nextSibling, _el$180 = _el$179.firstChild, _el$181 = _el$180.nextSibling;
        insert(_el$170, () => selectedApp()?.description);
        insert(_el$169, createComponent(Show, {
          get when() {
            return selectedApp()?.name === "k3d" || selectedApp()?.name === "kind" || selectedApp()?.name === "minikube";
          },
          get children() {
            var _el$171 = _tmpl$47(), _el$172 = _el$171.firstChild, _el$173 = _el$172.firstChild, _el$174 = _el$173.nextSibling, _el$175 = _el$174.firstChild, _el$176 = _el$175.nextSibling, _el$177 = _el$176.nextSibling; _el$177.nextSibling;
            return _el$171;
          }
        }), _el$179);
        insert(_el$169, createComponent(Show, {
          get when() {
            return selectedApp();
          },
          children: (app) => {
            const source = getAppSourceMetadata(app());
            return [(() => {
              var _el$259 = _tmpl$58();
              insert(_el$259, () => [{
                id: "overview",
                label: "Overview"
              }, {
                id: "sources",
                label: "Sources"
              }, {
                id: "plan",
                label: "Plan"
              }, {
                id: "values",
                label: "Values"
              }, {
                id: "permissions",
                label: "Permissions"
              }].map((tab) => (() => {
                var _el$339 = _tmpl$73();
                _el$339.$$click = () => setInstallTab(tab.id);
                insert(_el$339, () => tab.label);
                createRenderEffect(() => className(_el$339, `px-2.5 py-1 rounded-full text-xs font-medium ${installTab() === tab.id ? "bg-[var(--accent-primary)] text-black" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"}`));
                return _el$339;
              })()));
              return _el$259;
            })(), createComponent(Switch, {
              get children() {
                return [createComponent(Match, {
                  get when() {
                    return installTab() === "overview";
                  },
                  get children() {
                    return [(() => {
                      var _el$260 = _tmpl$59();
                      insert(_el$260, () => app().description);
                      return _el$260;
                    })(), (() => {
                      var _el$261 = _tmpl$60(), _el$262 = _el$261.firstChild, _el$263 = _el$262.firstChild, _el$264 = _el$263.nextSibling, _el$265 = _el$262.nextSibling, _el$266 = _el$265.firstChild, _el$267 = _el$266.nextSibling, _el$268 = _el$265.nextSibling, _el$269 = _el$268.firstChild, _el$270 = _el$269.nextSibling, _el$271 = _el$268.nextSibling, _el$272 = _el$271.firstChild, _el$273 = _el$272.nextSibling, _el$274 = _el$273.firstChild, _el$275 = _el$274.nextSibling;
                      insert(_el$264, () => app().chartName);
                      insert(_el$267, () => app().version);
                      _el$270.$$click = (e) => e.stopPropagation();
                      insert(_el$270, () => app().chartRepo);
                      insert(_el$274, () => source.publisher);
                      insert(_el$275, (() => {
                        var _c$4 = memo(() => !!source.verified);
                        return () => _c$4() ? [_tmpl$17(), "Verified"] : "Community source";
                      })());
                      createRenderEffect((_p$) => {
                        var _v$36 = app().chartRepo, _v$37 = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${source.verified ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-slate-600/15 text-slate-200 border border-slate-600/40"}`;
                        _v$36 !== _p$.e && setAttribute(_el$270, "href", _p$.e = _v$36);
                        _v$37 !== _p$.t && className(_el$275, _p$.t = _v$37);
                        return _p$;
                      }, {
                        e: void 0,
                        t: void 0
                      });
                      return _el$261;
                    })(), createComponent(Show, {
                      get when() {
                        return app().name === "k3d" || app().name === "kind" || app().name === "minikube";
                      },
                      get children() {
                        return [(() => {
                          var _el$276 = _tmpl$62(), _el$277 = _el$276.firstChild, _el$278 = _el$277.firstChild; _el$278.nextSibling; var _el$280 = _el$277.nextSibling, _el$281 = _el$280.firstChild, _el$282 = _el$281.nextSibling, _el$284 = _el$280.nextSibling; _el$284.firstChild;
                          _el$282.$$input = (e) => {
                            const customPart = e.currentTarget.value;
                            setClusterName(`kubegraf-${customPart}`);
                            setClusterNameError("");
                          };
                          insert(_el$276, createComponent(Show, {
                            get when() {
                              return clusterNameError();
                            },
                            get children() {
                              var _el$283 = _tmpl$61();
                              insert(_el$283, clusterNameError);
                              return _el$283;
                            }
                          }), _el$284);
                          insert(_el$284, () => clusterName().replace(/^kubegraf-/, "") || "my-cluster", null);
                          createRenderEffect((_$p) => setStyleProperty(_el$282, "border", `1px solid ${clusterNameError() ? "var(--error-color)" : "var(--border-color)"}`));
                          createRenderEffect(() => _el$282.value = clusterName().replace(/^kubegraf-/, ""));
                          return _el$276;
                        })(), createComponent(Show, {
                          get when() {
                            return localClusters()?.clusters?.filter((c) => c.type === app().name).length > 0;
                          },
                          get children() {
                            var _el$286 = _tmpl$63(), _el$287 = _el$286.firstChild, _el$288 = _el$287.firstChild, _el$290 = _el$288.nextSibling; _el$290.nextSibling; var _el$291 = _el$287.nextSibling;
                            insert(_el$287, () => localClusters()?.clusters?.filter((c) => c.type === app().name).length, _el$290);
                            insert(_el$291, createComponent(For, {
                              get each() {
                                return localClusters()?.clusters?.filter((c) => c.type === app().name);
                              },
                              children: (cluster) => (() => {
                                var _el$341 = _tmpl$74(), _el$342 = _el$341.firstChild, _el$343 = _el$342.firstChild, _el$344 = _el$343.firstChild, _el$345 = _el$344.nextSibling, _el$346 = _el$342.nextSibling;
                                insert(_el$344, () => cluster.name);
                                insert(_el$345, () => cluster.status);
                                _el$346.$$click = (e) => {
                                  e.stopPropagation();
                                  setClusterToDelete({
                                    name: cluster.name,
                                    type: cluster.type
                                  });
                                  setShowDeleteClusterModal(true);
                                };
                                createRenderEffect(() => className(_el$345, `text-xs px-2 py-0.5 rounded-full ${cluster.status === "running" || cluster.status === "Running" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-600/15 text-slate-300"}`));
                                return _el$341;
                              })()
                            }));
                            return _el$286;
                          }
                        })];
                      }
                    })];
                  }
                }), createComponent(Match, {
                  get when() {
                    return installTab() === "sources";
                  },
                  get children() {
                    var _el$292 = _tmpl$68(), _el$293 = _el$292.firstChild, _el$294 = _el$293.firstChild, _el$295 = _el$294.nextSibling, _el$296 = _el$295.firstChild, _el$297 = _el$296.nextSibling, _el$298 = _el$293.nextSibling, _el$299 = _el$298.firstChild, _el$300 = _el$299.nextSibling, _el$301 = _el$300.firstChild, _el$302 = _el$301.firstChild, _el$303 = _el$302.nextSibling, _el$304 = _el$301.nextSibling, _el$305 = _el$304.firstChild, _el$306 = _el$305.nextSibling, _el$307 = _el$304.nextSibling, _el$308 = _el$307.firstChild, _el$309 = _el$308.nextSibling; _el$309.firstChild; var _el$320 = _el$298.nextSibling, _el$321 = _el$320.firstChild, _el$322 = _el$321.nextSibling;
                    insert(_el$297, () => source.publisher);
                    insert(_el$295, (() => {
                      var _c$5 = memo(() => !!source.verified);
                      return () => _c$5() && _tmpl$75();
                    })(), null);
                    _el$303.$$click = (e) => e.stopPropagation();
                    insert(_el$303, () => source.helmRepo);
                    insert(_el$306, () => source.chartName);
                    insert(_el$304, (() => {
                      var _c$6 = memo(() => !!source.chartVersion);
                      return () => _c$6() && (() => {
                        var _el$348 = _tmpl$18(); _el$348.firstChild;
                        insert(_el$348, () => source.chartVersion, null);
                        return _el$348;
                      })();
                    })(), null);
                    insert(_el$309, () => source.appVersion || app().version, null);
                    insert(_el$292, createComponent(Show, {
                      get when() {
                        return source.officialDocsUrl || source.githubUrl;
                      },
                      get children() {
                        var _el$311 = _tmpl$66(), _el$312 = _el$311.firstChild, _el$313 = _el$312.nextSibling;
                        insert(_el$313, createComponent(Show, {
                          get when() {
                            return source.officialDocsUrl;
                          },
                          get children() {
                            var _el$314 = _tmpl$64(), _el$315 = _el$314.firstChild, _el$316 = _el$315.nextSibling;
                            _el$316.$$click = (e) => e.stopPropagation();
                            insert(_el$316, () => source.officialDocsUrl);
                            createRenderEffect(() => setAttribute(_el$316, "href", source.officialDocsUrl));
                            return _el$314;
                          }
                        }), null);
                        insert(_el$313, createComponent(Show, {
                          get when() {
                            return source.githubUrl;
                          },
                          get children() {
                            var _el$317 = _tmpl$65(), _el$318 = _el$317.firstChild, _el$319 = _el$318.nextSibling;
                            _el$319.$$click = (e) => e.stopPropagation();
                            insert(_el$319, () => source.githubUrl);
                            createRenderEffect(() => setAttribute(_el$319, "href", source.githubUrl));
                            return _el$317;
                          }
                        }), null);
                        return _el$311;
                      }
                    }), _el$320);
                    insert(_el$322, () => source.integrityNote);
                    insert(_el$292, createComponent(Show, {
                      get when() {
                        return app().sourceCitation;
                      },
                      get children() {
                        var _el$323 = _tmpl$67(), _el$324 = _el$323.firstChild, _el$325 = _el$324.nextSibling;
                        insert(_el$325, () => app().sourceCitation);
                        return _el$323;
                      }
                    }), null);
                    createRenderEffect(() => setAttribute(_el$303, "href", source.helmRepo));
                    return _el$292;
                  }
                }), createComponent(Match, {
                  get when() {
                    return installTab() === "plan";
                  },
                  get children() {
                    return [_tmpl$69(), createComponent(CommandPreview, {
                      get label() {
                        return isLocalClusterApp(app().name) ? "Local cluster installation steps (approximate)" : "Equivalent Helm command";
                      },
                      defaultCollapsed: true,
                      get command() {
                        return helmCommandPreview();
                      },
                      get description() {
                        return isLocalClusterApp(app().name) ? "This outlines the high-level steps KubeGraf will perform to create a local Kubernetes cluster using Docker. Exact commands may differ slightly." : "This shows an approximate Helm command for this install. The actual installation runs through the KubeGraf backend with additional validation and tracking.";
                      },
                      get badge() {
                        return memo(() => !!isLocalClusterApp(app().name))() ? (() => {
                          var _el$350 = _tmpl$76(), _el$351 = _el$350.firstChild, _el$352 = _el$351.nextSibling;
                          insert(_el$352, clusterName);
                          return _el$350;
                        })() : (() => {
                          var _el$353 = _tmpl$77(), _el$354 = _el$353.firstChild, _el$355 = _el$354.nextSibling;
                          insert(_el$355, () => installNamespace() || "default");
                          return _el$353;
                        })();
                      }
                    })];
                  }
                }), createComponent(Match, {
                  get when() {
                    return installTab() === "values";
                  },
                  get children() {
                    return [createComponent(Show, {
                      get when() {
                        return app().name === "k3d" || app().name === "kind" || app().name === "minikube";
                      },
                      get children() {
                        var _el$327 = _tmpl$70(), _el$328 = _el$327.firstChild, _el$329 = _el$328.firstChild; _el$329.nextSibling; var _el$331 = _el$328.nextSibling, _el$333 = _el$331.nextSibling;
                        _el$331.$$input = (e) => {
                          setClusterName(e.currentTarget.value);
                          setClusterNameError("");
                        };
                        insert(_el$327, createComponent(Show, {
                          get when() {
                            return clusterNameError();
                          },
                          get children() {
                            var _el$332 = _tmpl$61();
                            insert(_el$332, clusterNameError);
                            return _el$332;
                          }
                        }), _el$333);
                        createRenderEffect((_$p) => setStyleProperty(_el$331, "border", `1px solid ${clusterNameError() ? "var(--error-color)" : "var(--border-color)"}`));
                        createRenderEffect(() => _el$331.value = clusterName());
                        return _el$327;
                      }
                    }), createComponent(Show, {
                      get when() {
                        return memo(() => !!(app().name !== "k3d" && app().name !== "kind"))() && app().name !== "minikube";
                      },
                      get children() {
                        var _el$334 = _tmpl$71(), _el$335 = _el$334.firstChild, _el$336 = _el$335.nextSibling; _el$336.nextSibling;
                        _el$336.$$input = (e) => setInstallNamespace(e.currentTarget.value);
                        createRenderEffect(() => _el$336.value = installNamespace());
                        return _el$334;
                      }
                    })];
                  }
                }), createComponent(Match, {
                  get when() {
                    return installTab() === "permissions";
                  },
                  get children() {
                    return _tmpl$72();
                  }
                })];
              }
            })];
          }
        }), _el$179);
        _el$180.$$click = () => setShowInstallModal(false);
        _el$181.$$click = handleInstall;
        insert(_el$181, createComponent(Show, {
          get when() {
            return installing();
          },
          get children() {
            return _tmpl$48();
          }
        }), null);
        insert(_el$181, () => installing() ? "Installing..." : "Install", null);
        createRenderEffect(() => _el$181.disabled = installing());
        return _el$169;
      }
    }), null);
    insert(_el$137, createComponent(Show, {
      get when() {
        return showMLflowWizard();
      },
      get children() {
        return createComponent(MLflowInstallWizard, {
          onClose: () => {
            setShowMLflowWizard(false);
            setSelectedApp(null);
          },
          onSuccess: () => {
            refetchInstalled();
            addNotification("MLflow installation started", "success");
          }
        });
      }
    }), null);
    insert(_el$137, createComponent(Show, {
      get when() {
        return showFeastWizard();
      },
      get children() {
        return createComponent(FeastInstallWizard, {
          onClose: () => {
            setShowFeastWizard(false);
            setSelectedApp(null);
          },
          onSuccess: () => {
            refetchInstalled();
            addNotification("Feast installation started", "success");
          }
        });
      }
    }), null);
    insert(_el$137, createComponent(Modal, {
      get isOpen() {
        return showAddCustomModal();
      },
      onClose: () => setShowAddCustomModal(false),
      title: "Add Custom App",
      get children() {
        var _el$183 = _tmpl$50(), _el$184 = _el$183.firstChild, _el$185 = _el$184.nextSibling, _el$186 = _el$185.firstChild, _el$187 = _el$186.firstChild; _el$187.nextSibling; var _el$189 = _el$186.nextSibling, _el$190 = _el$185.nextSibling, _el$191 = _el$190.firstChild, _el$192 = _el$191.nextSibling, _el$193 = _el$190.nextSibling, _el$194 = _el$193.firstChild, _el$195 = _el$194.firstChild; _el$195.nextSibling; var _el$197 = _el$194.nextSibling, _el$198 = _el$193.nextSibling, _el$199 = _el$198.firstChild, _el$200 = _el$199.firstChild; _el$200.nextSibling; var _el$202 = _el$199.nextSibling, _el$203 = _el$198.nextSibling, _el$204 = _el$203.firstChild, _el$205 = _el$204.firstChild, _el$206 = _el$205.nextSibling, _el$207 = _el$204.nextSibling, _el$208 = _el$207.firstChild, _el$209 = _el$208.nextSibling, _el$210 = _el$203.nextSibling, _el$211 = _el$210.firstChild, _el$212 = _el$211.nextSibling, _el$213 = _el$210.nextSibling, _el$214 = _el$213.firstChild, _el$215 = _el$214.nextSibling;
        _el$189.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          name: e.currentTarget.value
        }));
        _el$192.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          displayName: e.currentTarget.value
        }));
        _el$197.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          chartRepo: e.currentTarget.value
        }));
        _el$202.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          chartName: e.currentTarget.value
        }));
        _el$206.addEventListener("change", (e) => setNewCustomApp((prev) => ({
          ...prev,
          category: e.currentTarget.value
        })));
        _el$209.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          version: e.currentTarget.value
        }));
        _el$212.$$input = (e) => setNewCustomApp((prev) => ({
          ...prev,
          description: e.currentTarget.value
        }));
        _el$214.$$click = () => setShowAddCustomModal(false);
        _el$215.$$click = handleAddCustomApp;
        createRenderEffect(() => _el$189.value = newCustomApp().name);
        createRenderEffect(() => _el$192.value = newCustomApp().displayName);
        createRenderEffect(() => _el$197.value = newCustomApp().chartRepo);
        createRenderEffect(() => _el$202.value = newCustomApp().chartName);
        createRenderEffect(() => _el$206.value = newCustomApp().category);
        createRenderEffect(() => _el$209.value = newCustomApp().version);
        createRenderEffect(() => _el$212.value = newCustomApp().description);
        return _el$183;
      }
    }), null);
    insert(_el$137, createComponent(AppUninstallModal, {
      get isOpen() {
        return showUninstallModal();
      },
      get displayName() {
        return appToUninstall()?.app.displayName || "";
      },
      get instances() {
        return appToUninstall()?.instances || [];
      },
      get initialSelection() {
        return appToUninstall()?.initialSelection || [];
      },
      onClose: () => {
        setShowUninstallModal(false);
        setAppToUninstall(null);
      },
      onConfirm: confirmUninstall,
      get loading() {
        return uninstalling();
      }
    }), null);
    insert(_el$137, createComponent(CustomAppDeleteModal, {
      get isOpen() {
        return showDeleteCustomModal();
      },
      get appName() {
        return appToDelete()?.name || "";
      },
      get displayName() {
        return appToDelete()?.displayName || "";
      },
      onClose: () => {
        setShowDeleteCustomModal(false);
        setAppToDelete(null);
      },
      onConfirm: confirmDeleteCustomApp
    }), null);
    insert(_el$137, createComponent(CustomAppDeployWizard, {
      get isOpen() {
        return showCustomDeployWizard();
      },
      onClose: () => {
        setShowCustomDeployWizard(false);
        setCustomAppToModify(null);
      },
      onSuccess: () => {
        refetchInstalled();
        refetchDeployedCustomApps();
        setCustomAppToModify(null);
      },
      get initialManifests() {
        return customAppToModify()?.manifests;
      },
      get initialNamespace() {
        return customAppToModify()?.namespace;
      },
      get deploymentId() {
        return customAppToModify()?.deploymentId;
      }
    }), null);
    insert(_el$137, createComponent(Modal, {
      get isOpen() {
        return showDeleteClusterModal();
      },
      onClose: () => {
        if (!deletingCluster()) {
          setShowDeleteClusterModal(false);
          setClusterToDelete(null);
        }
      },
      title: "Delete Cluster",
      size: "xs",
      get children() {
        var _el$216 = _tmpl$52(), _el$217 = _el$216.firstChild, _el$218 = _el$217.firstChild, _el$219 = _el$218.nextSibling, _el$220 = _el$219.firstChild, _el$221 = _el$220.nextSibling, _el$222 = _el$221.firstChild, _el$223 = _el$222.nextSibling, _el$224 = _el$217.nextSibling, _el$225 = _el$224.firstChild, _el$226 = _el$225.nextSibling;
        insert(_el$223, () => clusterToDelete()?.name);
        _el$225.$$click = () => {
          setShowDeleteClusterModal(false);
          setClusterToDelete(null);
        };
        _el$226.$$click = async () => {
          const cluster = clusterToDelete();
          if (!cluster) return;
          setDeletingCluster(true);
          try {
            const response = await fetch(`/api/apps/local-clusters/delete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                name: cluster.name,
                type: cluster.type
              })
            });
            if (response.ok) {
              refetchLocalClusters();
              setShowDeleteClusterModal(false);
              setClusterToDelete(null);
              addNotification("success", `Cluster "${cluster.name}" deleted successfully`);
            } else {
              const error = await response.text();
              addNotification("error", `Failed to delete cluster: ${error}`);
            }
          } catch (err) {
            console.error("Delete cluster error:", err);
            addNotification("error", "Failed to delete cluster. Check console for details.");
          } finally {
            setDeletingCluster(false);
          }
        };
        insert(_el$226, createComponent(Show, {
          get when() {
            return deletingCluster();
          },
          get children() {
            return _tmpl$51();
          }
        }), null);
        insert(_el$226, () => deletingCluster() ? "Deleting..." : "Delete Cluster", null);
        createRenderEffect((_p$) => {
          var _v$25 = deletingCluster(), _v$26 = deletingCluster() ? "0.5" : "1", _v$27 = deletingCluster() ? "not-allowed" : "pointer", _v$28 = deletingCluster(), _v$29 = deletingCluster() ? "0.7" : "1", _v$30 = deletingCluster() ? "not-allowed" : "pointer";
          _v$25 !== _p$.e && (_el$225.disabled = _p$.e = _v$25);
          _v$26 !== _p$.t && setStyleProperty(_el$225, "opacity", _p$.t = _v$26);
          _v$27 !== _p$.a && setStyleProperty(_el$225, "cursor", _p$.a = _v$27);
          _v$28 !== _p$.o && (_el$226.disabled = _p$.o = _v$28);
          _v$29 !== _p$.i && setStyleProperty(_el$226, "opacity", _p$.i = _v$29);
          _v$30 !== _p$.n && setStyleProperty(_el$226, "cursor", _p$.n = _v$30);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0
        });
        return _el$216;
      }
    }), null);
    insert(_el$137, createComponent(Modal, {
      get isOpen() {
        return showRestartCustomAppModal();
      },
      onClose: () => {
        setShowRestartCustomAppModal(false);
        setDeployedCustomAppToAction(null);
      },
      title: "Restart Custom App",
      size: "xs",
      get children() {
        var _el$228 = _tmpl$53(), _el$229 = _el$228.firstChild, _el$230 = _el$229.firstChild, _el$231 = _el$230.firstChild, _el$232 = _el$231.nextSibling, _el$233 = _el$232.firstChild, _el$234 = _el$233.firstChild, _el$235 = _el$234.nextSibling; _el$233.nextSibling; var _el$237 = _el$229.nextSibling, _el$238 = _el$237.firstChild, _el$239 = _el$238.nextSibling;
        insert(_el$235, () => deployedCustomAppToAction()?.displayName);
        _el$238.$$click = () => {
          setShowRestartCustomAppModal(false);
          setDeployedCustomAppToAction(null);
        };
        _el$239.$$click = confirmRestartCustomApp;
        return _el$228;
      }
    }), null);
    insert(_el$137, createComponent(Modal, {
      get isOpen() {
        return showDeleteDeployedCustomAppModal();
      },
      onClose: () => {
        setShowDeleteDeployedCustomAppModal(false);
        setDeployedCustomAppToAction(null);
      },
      title: "Delete Custom App",
      size: "xs",
      get children() {
        var _el$240 = _tmpl$54(), _el$241 = _el$240.firstChild, _el$242 = _el$241.firstChild, _el$243 = _el$242.firstChild, _el$244 = _el$243.nextSibling, _el$245 = _el$244.firstChild, _el$246 = _el$245.firstChild, _el$247 = _el$246.nextSibling, _el$248 = _el$245.nextSibling, _el$249 = _el$248.firstChild, _el$251 = _el$249.nextSibling; _el$251.nextSibling; _el$248.nextSibling; var _el$253 = _el$241.nextSibling, _el$254 = _el$253.firstChild, _el$255 = _el$254.nextSibling;
        insert(_el$247, () => deployedCustomAppToAction()?.displayName);
        insert(_el$248, () => Object.values(deployedCustomAppToAction()?.customAppInfo?.resourceCount || {}).reduce((a, b) => a + b, 0), _el$251);
        _el$254.$$click = () => {
          setShowDeleteDeployedCustomAppModal(false);
          setDeployedCustomAppToAction(null);
        };
        _el$255.$$click = confirmDeleteDeployedCustomApp;
        return _el$240;
      }
    }), null);
    createRenderEffect(() => _el$167.value = search());
    return _el$137;
  })();
};
delegateEvents(["click", "input"]);

export { Apps as default };
//# sourceMappingURL=Apps-vwH8H4sy.js.map
