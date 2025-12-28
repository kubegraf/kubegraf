import { a2 as fetchAPI, c as createSignal, j as createResource, k as api, t as template, u as addEventListener, i as insert, d as createComponent, F as For, S as Show, f as createRenderEffect, v as delegateEvents, P as namespace, m as memo, g as className, o as onMount, q as style } from './index-Bh-O-sIc.js';

const inferenceService = {
  create: async (request) => {
    return fetchAPI("/inference/create", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  list: async (namespace) => {
    const endpoint = namespace && namespace !== "_all" ? `/inference/list?namespace=${namespace}` : "/inference/list";
    return fetchAPI(endpoint);
  },
  get: async (name, namespace) => {
    return fetchAPI(`/inference/get?name=${name}&namespace=${namespace}`);
  },
  delete: async (name, namespace) => {
    return fetchAPI("/inference/delete", {
      method: "POST",
      body: JSON.stringify({ name, namespace })
    });
  },
  test: async (request) => {
    return fetchAPI("/inference/test", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  getStatus: async (name, namespace) => {
    return fetchAPI(`/inference/status?name=${name}&namespace=${namespace}`);
  }
};

var _tmpl$$2 = /* @__PURE__ */ template(`<p class="text-sm mt-2"style=color:var(--text-secondary)>Selected: <!> (<!> KB)`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="grid grid-cols-3 gap-4 mt-4 ml-6"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Min Replicas</label><input type=number min=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Max Replicas</label><input type=number min=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Target CPU %</label><input type=number min=1 max=100 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$3$2 = /* @__PURE__ */ template(`<div class="grid grid-cols-3 gap-4 mt-4 ml-6"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Host</label><input type=text placeholder=inference.example.com class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Path</label><input type=text placeholder=/ class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div class="flex items-end"><label class="flex items-center gap-2"><input type=checkbox class="w-4 h-4"><span class=text-sm style=color:var(--text-primary)>TLS`), _tmpl$4$2 = /* @__PURE__ */ template(`<input type=text placeholder="PVC Name (optional)"class="w-full px-3 py-2 rounded-lg border mt-2"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$5$2 = /* @__PURE__ */ template(`<div class="rounded-lg p-3 text-sm border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">`), _tmpl$6$2 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class=p-6><div class="flex items-center justify-between mb-6"><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Deploy Model Inference Service</h2><button class="text-2xl transition-colors hover:opacity-70"style=color:var(--text-secondary)>×</button></div><div class=space-y-6><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Service Name *</label><input type=text placeholder=my-inference-service class="w-full px-3 py-2 rounded-lg border"required style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Namespace</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=default>default</option></select></div></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Model File * (.pt, .onnx, .pickle, .h5)</label><input type=file accept=.pt,.onnx,.pickle,.h5,.pkl class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Runtime *</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=fastapi>FastAPI + Custom Handler</option><option value=mlserver>MLServer</option><option value=bentoml>BentoML</option><option value=kserve>KServe (lite)</option></select></div><div class="grid grid-cols-4 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>CPU</label><input type=text placeholder=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Memory</label><input type=text placeholder=2Gi class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>GPU</label><input type=text placeholder=0 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Replicas</label><input type=number min=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div></div><div><label class="flex items-center gap-2 mb-2"><input type=checkbox class="w-4 h-4"><span class="text-sm font-medium"style=color:var(--text-primary)>Enable Horizontal Pod Autoscaler (HPA)</span></label></div><div><label class="flex items-center gap-2 mb-2"><input type=checkbox class="w-4 h-4"><span class="text-sm font-medium"style=color:var(--text-primary)>Enable Ingress/Gateway</span></label></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Model Storage</label><select class="w-full px-3 py-2 rounded-lg border mb-2"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=pvc>PVC (Persistent Volume Claim)</option><option value=minio>MinIO</option><option value=s3>S3</option></select></div><div><div class="flex items-center justify-between mb-2"><label class="block text-sm font-medium"style=color:var(--text-secondary)>Environment Variables</label><button class="px-3 py-1 text-sm rounded transition-colors"style=background:var(--accent-primary);color:#000>+ Add</button></div><div class=space-y-2></div></div><div class="flex gap-3 justify-end pt-4 border-t"style=borderColor:var(--border-color)><button class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-secondary)>Cancel</button><button class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$7$1 = /* @__PURE__ */ template(`<option>`), _tmpl$8$1 = /* @__PURE__ */ template(`<div class="flex gap-2"><input type=text placeholder=KEY class="flex-1 px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><input type=text placeholder=value class="flex-1 px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><button class="px-3 py-2 rounded transition-colors"style="color:var(--error-color);background:rgba(239, 68, 68, 0.1)">×`);
const InferenceServiceForm = (props) => {
  const [name, setName] = createSignal("");
  const [namespace, setNamespace] = createSignal("default");
  const [modelFile, setModelFile] = createSignal(null);
  const [runtime, setRuntime] = createSignal("fastapi");
  const [cpu, setCpu] = createSignal("1");
  const [memory, setMemory] = createSignal("2Gi");
  const [gpu, setGpu] = createSignal("0");
  const [replicas, setReplicas] = createSignal(1);
  const [hpaEnabled, setHpaEnabled] = createSignal(false);
  const [hpaMin, setHpaMin] = createSignal(1);
  const [hpaMax, setHpaMax] = createSignal(3);
  const [hpaTargetCPU, setHpaTargetCPU] = createSignal(70);
  const [ingressEnabled, setIngressEnabled] = createSignal(false);
  const [ingressHost, setIngressHost] = createSignal("");
  const [ingressPath, setIngressPath] = createSignal("/");
  const [ingressTLS, setIngressTLS] = createSignal(false);
  const [storageType, setStorageType] = createSignal("pvc");
  const [storagePVC, setStoragePVC] = createSignal("");
  const [envVars, setEnvVars] = createSignal([]);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [namespaces] = createResource(api.getNamespaces);
  const handleFileChange = (e) => {
    const target = e.currentTarget;
    if (target.files && target.files.length > 0) {
      setModelFile(target.files[0]);
    }
  };
  const addEnvVar = () => {
    setEnvVars([...envVars(), {
      key: "",
      value: ""
    }]);
  };
  const removeEnvVar = (index) => {
    setEnvVars(envVars().filter((_, i) => i !== index));
  };
  const updateEnvVar = (index, field, value) => {
    const updated = [...envVars()];
    updated[index][field] = value;
    setEnvVars(updated);
  };
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    if (!modelFile()) {
      setError("Please select a model file");
      setSubmitting(false);
      return;
    }
    try {
      const file = modelFile();
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Content = (e.target?.result).split(",")[1] || e.target?.result;
          const envVarsMap = {};
          envVars().forEach((env) => {
            if (env.key) {
              envVarsMap[env.key] = env.value;
            }
          });
          let hpa;
          if (hpaEnabled()) {
            hpa = {
              enabled: true,
              minReplicas: hpaMin(),
              maxReplicas: hpaMax(),
              targetCPU: hpaTargetCPU()
            };
          }
          let ingress;
          if (ingressEnabled()) {
            ingress = {
              enabled: true,
              host: ingressHost() || void 0,
              path: ingressPath() || "/",
              tls: ingressTLS()
            };
          }
          let storage;
          if (storageType() === "pvc" && storagePVC()) {
            storage = {
              type: "pvc",
              pvcName: storagePVC(),
              mountPath: "/models"
            };
          } else if (storageType() !== "pvc") {
            storage = {
              type: storageType(),
              mountPath: "/models"
            };
          }
          const request = {
            name: name(),
            namespace: namespace(),
            modelFile: base64Content,
            modelFileName: file.name,
            runtime: runtime(),
            cpu: cpu(),
            memory: memory(),
            gpu: gpu() !== "0" ? gpu() : void 0,
            replicas: replicas(),
            hpa,
            ingress,
            storage,
            envVars: Object.keys(envVarsMap).length > 0 ? envVarsMap : void 0
          };
          const result = await inferenceService.create(request);
          if (result.success) {
            props.onSuccess?.();
            props.onClose();
          } else {
            setError(result.error || "Failed to create inference service");
          }
        } catch (err) {
          setError(err.message || "Failed to process model file");
        } finally {
          setSubmitting(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read model file");
        setSubmitting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || "Failed to create inference service");
      setSubmitting(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$6$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling; _el$12.firstChild; var _el$14 = _el$8.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$23 = _el$14.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$23.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$27.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$30.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$33.nextSibling, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$26.nextSibling, _el$40 = _el$39.firstChild, _el$41 = _el$40.firstChild; _el$41.nextSibling; var _el$53 = _el$39.nextSibling, _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild; _el$55.nextSibling; var _el$68 = _el$53.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, _el$72 = _el$68.nextSibling, _el$73 = _el$72.firstChild, _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$73.nextSibling, _el$78 = _el$72.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling;
    addEventListener(_el$6, "click", props.onClose, true);
    _el$1.$$input = (e) => setName(e.currentTarget.value);
    _el$12.addEventListener("change", (e) => setNamespace(e.currentTarget.value));
    insert(_el$12, createComponent(For, {
      get each() {
        return namespaces() || [];
      },
      children: (ns) => (() => {
        var _el$81 = _tmpl$7$1();
        _el$81.value = ns;
        insert(_el$81, ns);
        return _el$81;
      })()
    }), null);
    _el$16.addEventListener("change", handleFileChange);
    insert(_el$14, createComponent(Show, {
      get when() {
        return modelFile();
      },
      get children() {
        var _el$17 = _tmpl$$2(), _el$18 = _el$17.firstChild, _el$21 = _el$18.nextSibling, _el$19 = _el$21.nextSibling, _el$22 = _el$19.nextSibling; _el$22.nextSibling;
        insert(_el$17, () => modelFile()?.name, _el$21);
        insert(_el$17, () => (modelFile()?.size || 0) / 1024, _el$22);
        return _el$17;
      }
    }), null);
    _el$25.addEventListener("change", (e) => setRuntime(e.currentTarget.value));
    _el$29.$$input = (e) => setCpu(e.currentTarget.value);
    _el$32.$$input = (e) => setMemory(e.currentTarget.value);
    _el$35.$$input = (e) => setGpu(e.currentTarget.value);
    _el$38.$$input = (e) => setReplicas(parseInt(e.currentTarget.value) || 1);
    _el$41.addEventListener("change", (e) => setHpaEnabled(e.currentTarget.checked));
    insert(_el$39, createComponent(Show, {
      get when() {
        return hpaEnabled();
      },
      get children() {
        var _el$43 = _tmpl$2$2(), _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild, _el$46 = _el$45.nextSibling, _el$47 = _el$44.nextSibling, _el$48 = _el$47.firstChild, _el$49 = _el$48.nextSibling, _el$50 = _el$47.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.nextSibling;
        _el$46.$$input = (e) => setHpaMin(parseInt(e.currentTarget.value) || 1);
        _el$49.$$input = (e) => setHpaMax(parseInt(e.currentTarget.value) || 3);
        _el$52.$$input = (e) => setHpaTargetCPU(parseInt(e.currentTarget.value) || 70);
        createRenderEffect(() => _el$46.value = hpaMin());
        createRenderEffect(() => _el$49.value = hpaMax());
        createRenderEffect(() => _el$52.value = hpaTargetCPU());
        return _el$43;
      }
    }), null);
    _el$55.addEventListener("change", (e) => setIngressEnabled(e.currentTarget.checked));
    insert(_el$53, createComponent(Show, {
      get when() {
        return ingressEnabled();
      },
      get children() {
        var _el$57 = _tmpl$3$2(), _el$58 = _el$57.firstChild, _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, _el$61 = _el$58.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$61.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild; _el$66.nextSibling;
        _el$60.$$input = (e) => setIngressHost(e.currentTarget.value);
        _el$63.$$input = (e) => setIngressPath(e.currentTarget.value);
        _el$66.addEventListener("change", (e) => setIngressTLS(e.currentTarget.checked));
        createRenderEffect(() => _el$60.value = ingressHost());
        createRenderEffect(() => _el$63.value = ingressPath());
        createRenderEffect(() => _el$66.checked = ingressTLS());
        return _el$57;
      }
    }), null);
    _el$70.addEventListener("change", (e) => setStorageType(e.currentTarget.value));
    insert(_el$68, createComponent(Show, {
      get when() {
        return storageType() === "pvc";
      },
      get children() {
        var _el$71 = _tmpl$4$2();
        _el$71.$$input = (e) => setStoragePVC(e.currentTarget.value);
        createRenderEffect(() => _el$71.value = storagePVC());
        return _el$71;
      }
    }), null);
    _el$75.$$click = addEnvVar;
    insert(_el$76, createComponent(For, {
      get each() {
        return envVars();
      },
      children: (env, index) => (() => {
        var _el$82 = _tmpl$8$1(), _el$83 = _el$82.firstChild, _el$84 = _el$83.nextSibling, _el$85 = _el$84.nextSibling;
        _el$83.$$input = (e) => updateEnvVar(index(), "key", e.currentTarget.value);
        _el$84.$$input = (e) => updateEnvVar(index(), "value", e.currentTarget.value);
        _el$85.$$click = () => removeEnvVar(index());
        createRenderEffect(() => _el$83.value = env.key);
        createRenderEffect(() => _el$84.value = env.value);
        return _el$82;
      })()
    }));
    insert(_el$7, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$77 = _tmpl$5$2();
        insert(_el$77, error);
        return _el$77;
      }
    }), _el$78);
    addEventListener(_el$79, "click", props.onClose, true);
    _el$80.$$click = handleSubmit;
    insert(_el$80, () => submitting() ? "Deploying..." : "Deploy Service");
    createRenderEffect((_p$) => {
      var _v$ = submitting(), _v$2 = submitting() || !name() || !modelFile();
      _v$ !== _p$.e && (_el$79.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$80.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$1.value = name());
    createRenderEffect(() => _el$12.value = namespace());
    createRenderEffect(() => _el$25.value = runtime());
    createRenderEffect(() => _el$29.value = cpu());
    createRenderEffect(() => _el$32.value = memory());
    createRenderEffect(() => _el$35.value = gpu());
    createRenderEffect(() => _el$38.value = replicas());
    createRenderEffect(() => _el$41.checked = hpaEnabled());
    createRenderEffect(() => _el$55.checked = ingressEnabled());
    createRenderEffect(() => _el$70.value = storageType());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading services...`), _tmpl$2$1 = /* @__PURE__ */ template(`<div class="rounded-lg p-4 border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">Error: `), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p class=mb-4 style=color:var(--text-secondary)>No inference services found</p><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Deploy Your First Model`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="card border rounded-lg overflow-hidden"style=background:var(--bg-card);borderColor:var(--border-color)><table class=w-full><thead class=border-b style=background:var(--bg-secondary);borderColor:var(--border-color)><tr><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Name</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Namespace</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Status</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Runtime</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Replicas</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Model</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Created</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Actions</th></tr></thead><tbody class=divide-y style=borderColor:var(--border-color)>`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Inference Services</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Deploy and manage ML model inference services</p></div><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>+ Deploy Model`), _tmpl$6$1 = /* @__PURE__ */ template(`<tr class="hover:opacity-80 transition-opacity"style=background:var(--bg-card);border-color:var(--border-color)><td class="px-4 py-3"><button class="font-medium transition-colors hover:opacity-80"style=color:var(--accent-primary)></button></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)></td><td class="px-4 py-3"><span></span></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)>/</td><td class="px-4 py-3 text-sm font-mono"style=color:var(--text-secondary)></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)></td><td class="px-4 py-3"><div class="flex gap-2"><button class="px-3 py-1 text-sm rounded transition-colors"style=background:var(--accent-primary);color:#000>View</button><button class="px-3 py-1 text-sm rounded transition-colors"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)">Delete`);
const InferenceServicesList = () => {
  const [showForm, setShowForm] = createSignal(false);
  const [services, {
    refetch
  }] = createResource(() => namespace(), async (ns) => {
    const result = await inferenceService.list(ns === "_all" ? void 0 : ns);
    return result.services;
  });
  const handleDelete = async (service) => {
    if (!confirm(`Are you sure you want to delete inference service "${service.name}"?`)) {
      return;
    }
    try {
      await inferenceService.delete(service.name, service.namespace);
      refetch();
    } catch (error) {
      alert(`Failed to delete service: ${error.message}`);
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "Running":
        return "bg-green-500";
      case "Failed":
        return "bg-red-500";
      case "Pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };
  return (() => {
    var _el$ = _tmpl$5$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling;
    _el$6.$$click = () => setShowForm(true);
    insert(_el$, createComponent(Show, {
      get when() {
        return showForm();
      },
      get children() {
        return createComponent(InferenceServiceForm, {
          onClose: () => setShowForm(false),
          onSuccess: () => {
            refetch();
            setShowForm(false);
          }
        });
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return services.loading;
      },
      get children() {
        return _tmpl$$1();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return services.error;
      },
      get children() {
        var _el$8 = _tmpl$2$1(); _el$8.firstChild;
        insert(_el$8, () => services.error?.message || "Failed to load services", null);
        return _el$8;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!services.loading && services()))() && services().length === 0;
      },
      get children() {
        var _el$0 = _tmpl$3$1(), _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling;
        _el$10.$$click = () => setShowForm(true);
        return _el$0;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!services.loading && services()))() && services().length > 0;
      },
      get children() {
        var _el$11 = _tmpl$4$1(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.nextSibling, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling, _el$20 = _el$19.nextSibling, _el$21 = _el$20.nextSibling; _el$21.nextSibling; var _el$23 = _el$13.nextSibling;
        insert(_el$23, createComponent(For, {
          get each() {
            return services();
          },
          children: (service) => (() => {
            var _el$24 = _tmpl$6$1(), _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$25.nextSibling, _el$28 = _el$27.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$28.nextSibling, _el$31 = _el$30.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$31.nextSibling, _el$34 = _el$33.nextSibling, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling;
            _el$26.$$click = () => {
              sessionStorage.setItem("kubegraf-selected-inference-service", JSON.stringify({
                name: service.name,
                namespace: service.namespace
              }));
              window.location.reload();
            };
            insert(_el$26, () => service.name);
            insert(_el$27, () => service.namespace);
            insert(_el$29, () => service.status);
            insert(_el$30, () => service.runtime);
            insert(_el$31, () => service.readyReplicas, _el$32);
            insert(_el$31, () => service.replicas, null);
            insert(_el$33, () => service.modelFile);
            insert(_el$34, () => new Date(service.createdAt).toLocaleString());
            _el$37.$$click = () => {
              sessionStorage.setItem("kubegraf-selected-inference-service", JSON.stringify({
                name: service.name,
                namespace: service.namespace
              }));
              window.location.reload();
            };
            _el$38.$$click = () => handleDelete(service);
            createRenderEffect(() => className(_el$29, `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(service.status)}`));
            return _el$24;
          })()
        }));
        return _el$11;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class=space-y-4><div class="grid grid-cols-2 gap-4"><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Status</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Runtime</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Endpoint</div><div class="text-lg font-mono text-sm break-all"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Replicas</div><div class="text-lg font-semibold"style=color:var(--text-primary)>/</div></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-2"style=color:var(--text-secondary)>Resources</div><div class="grid grid-cols-3 gap-4">`), _tmpl$2 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>Latency: `), _tmpl$3 = /* @__PURE__ */ template(`<pre class="text-sm font-mono p-3 rounded border overflow-auto"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-primary)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="text-sm p-3 rounded border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="flex items-center justify-between mb-2"><h3 class=font-medium style=color:var(--text-primary)>Response`), _tmpl$6 = /* @__PURE__ */ template(`<div class=space-y-4><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Input JSON</label><textarea class="w-full px-3 py-2 rounded-lg font-mono text-sm border"rows=10 placeholder="{\\n  &quot;input&quot;: [1, 2, 3]\\n}"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></textarea></div><button class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$7 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex gap-2"><button class="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000></button></div><div class="font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto border"style=background:#000;borderColor:var(--border-color);color:#22c55e><pre class=whitespace-pre-wrap>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card rounded-lg p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p style=color:var(--text-secondary)>Metrics visualization coming soon`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)></h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Namespace: </p></div><button class="px-4 py-2 rounded-lg text-white text-sm transition-colors"style=background:var(--accent-primary);color:#000>Refresh</button></div><div class=border-b style=borderColor:var(--border-color)><div class="flex gap-4"><button>Overview</button><button>Test Interface</button><button>Logs</button><button>Metrics`), _tmpl$0 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>CPU</div><div class=font-medium style=color:var(--text-primary)>`), _tmpl$1 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>Memory</div><div class=font-medium style=color:var(--text-primary)>`), _tmpl$10 = /* @__PURE__ */ template(`<div><div class=text-xs style=color:var(--text-muted)>GPU</div><div class=font-medium style=color:var(--text-primary)>`);
const InferenceServicePanel = (props) => {
  const [activeTab, setActiveTab] = createSignal("overview");
  const [testInput, setTestInput] = createSignal('{\n  "input": [1, 2, 3]\n}');
  const [testResponse, setTestResponse] = createSignal(null);
  const [testing, setTesting] = createSignal(false);
  const [logs, setLogs] = createSignal("");
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [service, {
    refetch
  }] = createResource(() => ({
    name: props.serviceName,
    namespace: props.serviceNamespace
  }), async (params) => {
    return await inferenceService.get(params.name, params.namespace);
  });
  const handleTest = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      let inputData;
      try {
        inputData = JSON.parse(testInput());
      } catch (e) {
        setTestResponse({
          success: false,
          error: "Invalid JSON input"
        });
        setTesting(false);
        return;
      }
      const request = {
        name: props.serviceName,
        namespace: props.serviceNamespace,
        input: inputData
      };
      const response = await inferenceService.test(request);
      setTestResponse(response);
    } catch (error) {
      setTestResponse({
        success: false,
        error: error.message || "Test request failed"
      });
    } finally {
      setTesting(false);
    }
  };
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const pods = await api.getPods(props.serviceNamespace);
      const servicePod = pods.find((p) => p.name?.includes(props.serviceName));
      if (servicePod) {
        setLogs("Logs would be fetched from pod: " + servicePod.name);
      } else {
        setLogs("No pods found for this service");
      }
    } catch (error) {
      setLogs(`Error fetching logs: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  };
  onMount(() => {
    if (activeTab() === "logs") {
      fetchLogs();
    }
  });
  return (() => {
    var _el$ = _tmpl$9(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling; _el$5.firstChild; var _el$7 = _el$3.nextSibling, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling;
    insert(_el$4, () => props.serviceName);
    insert(_el$5, () => props.serviceNamespace, null);
    _el$7.$$click = () => refetch();
    _el$0.$$click = () => setActiveTab("overview");
    _el$1.$$click = () => setActiveTab("test");
    _el$10.$$click = () => {
      setActiveTab("logs");
      fetchLogs();
    };
    _el$11.$$click = () => setActiveTab("metrics");
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "overview")() && service();
      },
      get children() {
        var _el$12 = _tmpl$(), _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$14.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$20.nextSibling, _el$24 = _el$23.firstChild, _el$25 = _el$24.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$13.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling;
        insert(_el$16, () => service()?.status);
        insert(_el$19, () => service()?.runtime);
        insert(_el$22, () => service()?.endpoint || "N/A");
        insert(_el$25, () => service()?.readyReplicas, _el$26);
        insert(_el$25, () => service()?.replicas, null);
        insert(_el$29, (() => {
          var _c$ = memo(() => !!service()?.resources.cpu);
          return () => _c$() && (() => {
            var _el$49 = _tmpl$0(), _el$50 = _el$49.firstChild, _el$51 = _el$50.nextSibling;
            insert(_el$51, () => service()?.resources.cpu);
            return _el$49;
          })();
        })(), null);
        insert(_el$29, (() => {
          var _c$2 = memo(() => !!service()?.resources.memory);
          return () => _c$2() && (() => {
            var _el$52 = _tmpl$1(), _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling;
            insert(_el$54, () => service()?.resources.memory);
            return _el$52;
          })();
        })(), null);
        insert(_el$29, (() => {
          var _c$3 = memo(() => !!service()?.resources.gpu);
          return () => _c$3() && (() => {
            var _el$55 = _tmpl$10(), _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling;
            insert(_el$57, () => service()?.resources.gpu);
            return _el$55;
          })();
        })(), null);
        return _el$12;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "test";
      },
      get children() {
        var _el$30 = _tmpl$6(), _el$31 = _el$30.firstChild, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$31.nextSibling;
        _el$33.$$input = (e) => setTestInput(e.currentTarget.value);
        _el$34.$$click = handleTest;
        insert(_el$34, () => testing() ? "Testing..." : "Send Test Request");
        insert(_el$30, createComponent(Show, {
          get when() {
            return testResponse();
          },
          get children() {
            var _el$35 = _tmpl$5(), _el$36 = _el$35.firstChild; _el$36.firstChild;
            insert(_el$36, createComponent(Show, {
              get when() {
                return testResponse()?.latency;
              },
              get children() {
                var _el$38 = _tmpl$2(); _el$38.firstChild;
                insert(_el$38, () => testResponse()?.latency, null);
                return _el$38;
              }
            }), null);
            insert(_el$35, createComponent(Show, {
              get when() {
                return testResponse()?.success;
              },
              get children() {
                var _el$40 = _tmpl$3();
                insert(_el$40, () => JSON.stringify(testResponse()?.output, null, 2));
                return _el$40;
              }
            }), null);
            insert(_el$35, createComponent(Show, {
              get when() {
                return !testResponse()?.success;
              },
              get children() {
                var _el$41 = _tmpl$4();
                insert(_el$41, () => testResponse()?.error);
                return _el$41;
              }
            }), null);
            return _el$35;
          }
        }), null);
        createRenderEffect(() => _el$34.disabled = testing());
        createRenderEffect(() => _el$33.value = testInput());
        return _el$30;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "logs";
      },
      get children() {
        var _el$42 = _tmpl$7(), _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$43.nextSibling, _el$46 = _el$45.firstChild;
        _el$44.$$click = fetchLogs;
        insert(_el$44, () => logsLoading() ? "Loading..." : "Refresh Logs");
        insert(_el$46, () => logs() || "No logs available");
        createRenderEffect(() => _el$44.disabled = logsLoading());
        return _el$42;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "metrics";
      },
      get children() {
        var _el$47 = _tmpl$8(); _el$47.firstChild;
        return _el$47;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "overview" ? "" : "border-transparent"}`, _v$2 = activeTab() === "overview" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      }, _v$3 = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "test" ? "" : "border-transparent"}`, _v$4 = activeTab() === "test" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      }, _v$5 = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "logs" ? "" : "border-transparent"}`, _v$6 = activeTab() === "logs" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      }, _v$7 = `px-4 py-2 border-b-2 font-medium transition-colors ${activeTab() === "metrics" ? "" : "border-transparent"}`, _v$8 = activeTab() === "metrics" ? {
        borderColor: "var(--accent-primary)",
        color: "var(--accent-primary)"
      } : {
        color: "var(--text-secondary)"
      };
      _v$ !== _p$.e && className(_el$0, _p$.e = _v$);
      _p$.t = style(_el$0, _v$2, _p$.t);
      _v$3 !== _p$.a && className(_el$1, _p$.a = _v$3);
      _p$.o = style(_el$1, _v$4, _p$.o);
      _v$5 !== _p$.i && className(_el$10, _p$.i = _v$5);
      _p$.n = style(_el$10, _v$6, _p$.n);
      _v$7 !== _p$.s && className(_el$11, _p$.s = _v$7);
      _p$.h = style(_el$11, _v$8, _p$.h);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

const InferenceServices = () => {
  const [serviceName, setServiceName] = createSignal("");
  const [serviceNamespace, setServiceNamespace] = createSignal("");
  onMount(() => {
    const stored = sessionStorage.getItem("kubegraf-selected-inference-service");
    if (stored) {
      try {
        const service = JSON.parse(stored);
        setServiceName(service.name);
        setServiceNamespace(service.namespace);
        sessionStorage.removeItem("kubegraf-selected-inference-service");
      } catch (e) {
      }
    }
  });
  const viewingDetails = () => serviceName() !== "";
  return createComponent(Show, {
    get when() {
      return !viewingDetails();
    },
    get fallback() {
      return createComponent(InferenceServicePanel, {
        get serviceName() {
          return serviceName();
        },
        get serviceNamespace() {
          return serviceNamespace();
        }
      });
    },
    get children() {
      return createComponent(InferenceServicesList, {});
    }
  });
};

export { InferenceServices as default };
//# sourceMappingURL=InferenceServices-B3sSjQSA.js.map
