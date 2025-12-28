import { a2 as fetchAPI, c as createSignal, j as createResource, k as api, t as template, u as addEventListener, i as insert, d as createComponent, F as For, f as createRenderEffect, S as Show, v as delegateEvents } from './index-B8I71-mz.js';

const feastService = {
  getStatus: async () => {
    return fetchAPI("/feast/status");
  },
  install: async (request) => {
    return fetchAPI("/feast/install", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
};

var _tmpl$ = /* @__PURE__ */ template(`<div class="grid grid-cols-3 gap-4 ml-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Host</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Port</label><input type=number class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Password (optional)</label><input type=password class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4 ml-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Project ID</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Dataset</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$3 = /* @__PURE__ */ template(`<div class=ml-4><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Path</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4 ml-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>PVC Name</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Mount Path</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="rounded-lg p-3 text-sm border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">`), _tmpl$6 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class=p-6><div class="flex items-center justify-between mb-6"><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Install Feast Feature Store</h2><button class="text-2xl transition-colors hover:opacity-70"style=color:var(--text-secondary)>×</button></div><div class=space-y-6><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Namespace</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=feast>feast</option></select></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Version</label><input type=text class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Online Store</label><select class="w-full px-3 py-2 rounded-lg border mb-2"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=redis>Redis</option><option value=bigquery>BigQuery</option></select></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Offline Store</label><select class="w-full px-3 py-2 rounded-lg border mb-2"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=file>File</option><option value=pvc>PVC</option><option value=bigquery>BigQuery</option><option value=snowflake>Snowflake</option></select></div><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>CPU</label><input type=text placeholder=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Memory</label><input type=text placeholder=2Gi class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div></div><div class="flex gap-3 justify-end pt-4 border-t"style=borderColor:var(--border-color)><button class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-secondary)>Cancel</button><button class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$7 = /* @__PURE__ */ template(`<option>`);
const FeastInstallWizard = (props) => {
  const [namespace, setNamespace] = createSignal("feast");
  const [version, setVersion] = createSignal("0.38.0");
  const [onlineStoreType, setOnlineStoreType] = createSignal("redis");
  const [offlineStoreType, setOfflineStoreType] = createSignal("file");
  const [cpu, setCpu] = createSignal("1");
  const [memory, setMemory] = createSignal("2Gi");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [redisHost, setRedisHost] = createSignal("redis");
  const [redisPort, setRedisPort] = createSignal(6379);
  const [redisPassword, setRedisPassword] = createSignal("");
  const [bqProjectId, setBqProjectId] = createSignal("");
  const [bqDataset, setBqDataset] = createSignal("");
  const [filePath, setFilePath] = createSignal("/data/feast");
  const [pvcName, setPvcName] = createSignal("");
  const [pvcMountPath, setPvcMountPath] = createSignal("/data/feast");
  const [namespaces] = createResource(api.getNamespaces);
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      let onlineStore;
      if (onlineStoreType() === "redis") {
        onlineStore = {
          type: "redis",
          redis: {
            host: redisHost(),
            port: redisPort(),
            password: redisPassword() || void 0
          }
        };
      } else {
        onlineStore = {
          type: "bigquery",
          bigquery: {
            projectId: bqProjectId(),
            dataset: bqDataset()
          }
        };
      }
      let offlineStore;
      if (offlineStoreType() === "file") {
        offlineStore = {
          type: "file",
          file: {
            path: filePath()
          }
        };
      } else if (offlineStoreType() === "pvc") {
        offlineStore = {
          type: "pvc",
          pvc: {
            pvcName: pvcName(),
            mountPath: pvcMountPath()
          }
        };
      } else if (offlineStoreType() === "bigquery") {
        offlineStore = {
          type: "bigquery",
          bigquery: {
            projectId: bqProjectId(),
            dataset: bqDataset()
          }
        };
      } else {
        offlineStore = {
          type: "snowflake",
          snowflake: {
            account: "",
            database: "",
            schema: "",
            warehouse: "",
            username: ""
          }
        };
      }
      const request = {
        namespace: namespace(),
        version: version(),
        onlineStore,
        offlineStore,
        cpu: cpu(),
        memory: memory()
      };
      const result = await feastService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || "Failed to install Feast");
      }
    } catch (err) {
      setError(err.message || "Failed to install Feast");
    } finally {
      setSubmitting(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$6(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling; _el$1.firstChild; var _el$11 = _el$9.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling, _el$14 = _el$8.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$34 = _el$14.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$47 = _el$34.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling, _el$51 = _el$48.nextSibling, _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, _el$55 = _el$47.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling;
    addEventListener(_el$6, "click", props.onClose, true);
    _el$1.addEventListener("change", (e) => setNamespace(e.currentTarget.value));
    insert(_el$1, createComponent(For, {
      get each() {
        return namespaces() || [];
      },
      children: (ns) => (() => {
        var _el$58 = _tmpl$7();
        _el$58.value = ns;
        insert(_el$58, ns);
        return _el$58;
      })()
    }), null);
    _el$13.$$input = (e) => setVersion(e.currentTarget.value);
    _el$16.addEventListener("change", (e) => setOnlineStoreType(e.currentTarget.value));
    insert(_el$14, createComponent(Show, {
      get when() {
        return onlineStoreType() === "redis";
      },
      get children() {
        var _el$17 = _tmpl$(), _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling, _el$24 = _el$21.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling;
        _el$20.$$input = (e) => setRedisHost(e.currentTarget.value);
        _el$23.$$input = (e) => setRedisPort(parseInt(e.currentTarget.value) || 6379);
        _el$26.$$input = (e) => setRedisPassword(e.currentTarget.value);
        createRenderEffect(() => _el$20.value = redisHost());
        createRenderEffect(() => _el$23.value = redisPort());
        createRenderEffect(() => _el$26.value = redisPassword());
        return _el$17;
      }
    }), null);
    insert(_el$14, createComponent(Show, {
      get when() {
        return onlineStoreType() === "bigquery";
      },
      get children() {
        var _el$27 = _tmpl$2(), _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$28.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling;
        _el$30.$$input = (e) => setBqProjectId(e.currentTarget.value);
        _el$33.$$input = (e) => setBqDataset(e.currentTarget.value);
        createRenderEffect(() => _el$30.value = bqProjectId());
        createRenderEffect(() => _el$33.value = bqDataset());
        return _el$27;
      }
    }), null);
    _el$36.addEventListener("change", (e) => setOfflineStoreType(e.currentTarget.value));
    insert(_el$34, createComponent(Show, {
      get when() {
        return offlineStoreType() === "file";
      },
      get children() {
        var _el$37 = _tmpl$3(), _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling;
        _el$39.$$input = (e) => setFilePath(e.currentTarget.value);
        createRenderEffect(() => _el$39.value = filePath());
        return _el$37;
      }
    }), null);
    insert(_el$34, createComponent(Show, {
      get when() {
        return offlineStoreType() === "pvc";
      },
      get children() {
        var _el$40 = _tmpl$4(), _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$41.nextSibling, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling;
        _el$43.$$input = (e) => setPvcName(e.currentTarget.value);
        _el$46.$$input = (e) => setPvcMountPath(e.currentTarget.value);
        createRenderEffect(() => _el$43.value = pvcName());
        createRenderEffect(() => _el$46.value = pvcMountPath());
        return _el$40;
      }
    }), null);
    _el$50.$$input = (e) => setCpu(e.currentTarget.value);
    _el$53.$$input = (e) => setMemory(e.currentTarget.value);
    insert(_el$7, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$54 = _tmpl$5();
        insert(_el$54, error);
        return _el$54;
      }
    }), _el$55);
    addEventListener(_el$56, "click", props.onClose, true);
    _el$57.$$click = handleSubmit;
    insert(_el$57, () => submitting() ? "Installing..." : "Install Feast");
    createRenderEffect((_p$) => {
      var _v$ = submitting(), _v$2 = submitting();
      _v$ !== _p$.e && (_el$56.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$57.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$1.value = namespace());
    createRenderEffect(() => _el$13.value = version());
    createRenderEffect(() => _el$16.value = onlineStoreType());
    createRenderEffect(() => _el$36.value = offlineStoreType());
    createRenderEffect(() => _el$50.value = cpu());
    createRenderEffect(() => _el$53.value = memory());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { FeastInstallWizard as F, feastService as f };
//# sourceMappingURL=FeastInstallWizard-Dh_p6pZr.js.map
