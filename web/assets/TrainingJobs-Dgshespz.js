import { c as createSignal, j as createResource, k as api, t as template, u as addEventListener, i as insert, d as createComponent, F as For, f as createRenderEffect, S as Show, v as delegateEvents, P as namespace, m as memo, g as className, o as onMount } from './index-Bh-O-sIc.js';
import { m as mlJobsService, T as TrainingJobDetails } from './TrainingJobDetails-jHXGEwN0.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Python Script *</label><textarea placeholder="# Your training script here
import torch
# ..."class="w-full px-3 py-2 rounded-lg font-mono text-sm border"rows=10 style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$2$1 = /* @__PURE__ */ template(`<div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Docker Image *</label><input type=text placeholder=pytorch/pytorch:latest class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)>`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="rounded-lg p-3 text-sm border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div class="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class=p-6><div class="flex items-center justify-between mb-6"><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Create ML Training Job</h2><button class="text-2xl transition-colors hover:opacity-70"style=color:var(--text-secondary)>×</button></div><div class=space-y-6><div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Job Name *</label><input type=text placeholder=my-training-job class="w-full px-3 py-2 rounded-lg border"required style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Namespace</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=default>default</option></select></div></div><div><label class="flex items-center gap-2 mb-2"><input type=checkbox class="w-4 h-4"><span class="text-sm font-medium"style=color:var(--text-primary)>Auto-build Docker image from script</span></label></div><div class="grid grid-cols-3 gap-4"><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>CPU</label><input type=text placeholder=1 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Memory</label><input type=text placeholder=2Gi class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>GPU</label><input type=text placeholder=0 class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)></div></div><div><label class="block text-sm font-medium mb-2"style=color:var(--text-secondary)>Restart Policy</label><select class="w-full px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=Never>Never</option><option value=OnFailure>On Failure</option><option value=Always>Always</option></select></div><div><div class="flex items-center justify-between mb-2"><label class="block text-sm font-medium"style=color:var(--text-secondary)>Environment Variables</label><button class="px-3 py-1 text-sm rounded transition-colors"style=background:var(--accent-primary);color:#000>+ Add</button></div><div class=space-y-2></div></div><div><div class="flex items-center justify-between mb-2"><label class="block text-sm font-medium"style=color:var(--text-secondary)>Volume Mounts</label><button class="px-3 py-1 text-sm rounded transition-colors"style=background:var(--accent-primary);color:#000>+ Add</button></div><div class=space-y-2></div></div><div class="flex gap-3 justify-end pt-4 border-t"style=borderColor:var(--border-color)><button class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-secondary)>Cancel</button><button class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"style=background:var(--accent-primary);color:#000>`), _tmpl$5$1 = /* @__PURE__ */ template(`<option>`), _tmpl$6$1 = /* @__PURE__ */ template(`<div class="flex gap-2"><input type=text placeholder=KEY class="flex-1 px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><input type=text placeholder=value class="flex-1 px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><button class="px-3 py-2 rounded transition-colors"style="color:var(--error-color);background:rgba(239, 68, 68, 0.1)">×`), _tmpl$7$1 = /* @__PURE__ */ template(`<div class="grid grid-cols-4 gap-2"><input type=text placeholder="Volume Name"class="px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><input type=text placeholder=/mnt/data class="px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><select class="px-3 py-2 rounded-lg border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value>Select PVC</option></select><div class="flex items-center gap-2"><label class="flex items-center gap-1 text-sm"style=color:var(--text-primary)><input type=checkbox class="w-4 h-4">Read-only</label><button class="px-2 py-1 rounded transition-colors"style="color:var(--error-color);background:rgba(239, 68, 68, 0.1)">×`);
const TrainingJobForm = (props) => {
  const [name, setName] = createSignal("");
  const [namespace, setNamespace] = createSignal("default");
  const [script, setScript] = createSignal("");
  const [image, setImage] = createSignal("");
  const [autoBuild, setAutoBuild] = createSignal(false);
  const [cpu, setCpu] = createSignal("1");
  const [memory, setMemory] = createSignal("2Gi");
  const [gpu, setGpu] = createSignal("0");
  const [restartPolicy, setRestartPolicy] = createSignal("Never");
  const [envVars, setEnvVars] = createSignal([]);
  const [volumeMounts, setVolumeMounts] = createSignal([]);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
  const [namespaces] = createResource(api.getNamespaces);
  const [pvcs] = createResource(() => namespace(), async () => []);
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
  const addVolumeMount = () => {
    setVolumeMounts([...volumeMounts(), {
      name: "",
      mountPath: "",
      pvcName: "",
      readOnly: false
    }]);
  };
  const removeVolumeMount = (index) => {
    setVolumeMounts(volumeMounts().filter((_, i) => i !== index));
  };
  const updateVolumeMount = (index, field, value) => {
    const updated = [...volumeMounts()];
    updated[index][field] = value;
    setVolumeMounts(updated);
  };
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const envVarsMap = {};
      envVars().forEach((env) => {
        if (env.key) {
          envVarsMap[env.key] = env.value;
        }
      });
      const request = {
        name: name(),
        namespace: namespace(),
        script: script() || void 0,
        image: image() || void 0,
        autoBuild: autoBuild(),
        cpu: cpu(),
        memory: memory(),
        gpu: gpu() !== "0" ? gpu() : void 0,
        restartPolicy: restartPolicy(),
        envVars: Object.keys(envVarsMap).length > 0 ? envVarsMap : void 0,
        volumeMounts: volumeMounts().length > 0 ? volumeMounts() : void 0,
        nodeSelector: gpu() !== "0" ? {
          "nvidia.com/gpu": "true"
        } : void 0
      };
      const result = await mlJobsService.create(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || "Failed to create job");
      }
    } catch (err) {
      setError(err.message || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };
  return (() => {
    var _el$ = _tmpl$4$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$4.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling; _el$12.firstChild; var _el$14 = _el$8.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.firstChild; _el$16.nextSibling; var _el$24 = _el$14.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$25.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$28.nextSibling, _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling, _el$34 = _el$24.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$34.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$38.nextSibling, _el$42 = _el$37.nextSibling, _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling, _el$46 = _el$43.nextSibling, _el$48 = _el$42.nextSibling, _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling;
    addEventListener(_el$6, "click", props.onClose, true);
    _el$1.$$input = (e) => setName(e.currentTarget.value);
    _el$12.addEventListener("change", (e) => setNamespace(e.currentTarget.value));
    insert(_el$12, createComponent(For, {
      get each() {
        return namespaces() || [];
      },
      children: (ns) => (() => {
        var _el$51 = _tmpl$5$1();
        _el$51.value = ns;
        insert(_el$51, ns);
        return _el$51;
      })()
    }), null);
    _el$16.addEventListener("change", (e) => setAutoBuild(e.currentTarget.checked));
    insert(_el$7, createComponent(Show, {
      get when() {
        return autoBuild();
      },
      get children() {
        var _el$18 = _tmpl$$1(), _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling;
        _el$20.$$input = (e) => setScript(e.currentTarget.value);
        createRenderEffect(() => _el$20.value = script());
        return _el$18;
      }
    }), _el$24);
    insert(_el$7, createComponent(Show, {
      get when() {
        return !autoBuild();
      },
      get children() {
        var _el$21 = _tmpl$2$1(), _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling;
        _el$23.$$input = (e) => setImage(e.currentTarget.value);
        createRenderEffect(() => _el$23.value = image());
        return _el$21;
      }
    }), _el$24);
    _el$27.$$input = (e) => setCpu(e.currentTarget.value);
    _el$30.$$input = (e) => setMemory(e.currentTarget.value);
    _el$33.$$input = (e) => setGpu(e.currentTarget.value);
    _el$36.addEventListener("change", (e) => setRestartPolicy(e.currentTarget.value));
    _el$40.$$click = addEnvVar;
    insert(_el$41, createComponent(For, {
      get each() {
        return envVars();
      },
      children: (env, index) => (() => {
        var _el$52 = _tmpl$6$1(), _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling, _el$55 = _el$54.nextSibling;
        _el$53.$$input = (e) => updateEnvVar(index(), "key", e.currentTarget.value);
        _el$54.$$input = (e) => updateEnvVar(index(), "value", e.currentTarget.value);
        _el$55.$$click = () => removeEnvVar(index());
        createRenderEffect(() => _el$53.value = env.key);
        createRenderEffect(() => _el$54.value = env.value);
        return _el$52;
      })()
    }));
    _el$45.$$click = addVolumeMount;
    insert(_el$46, createComponent(For, {
      get each() {
        return volumeMounts();
      },
      children: (vm, index) => (() => {
        var _el$56 = _tmpl$7$1(), _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling, _el$59 = _el$58.nextSibling; _el$59.firstChild; var _el$61 = _el$59.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$62.firstChild, _el$64 = _el$62.nextSibling;
        _el$57.$$input = (e) => updateVolumeMount(index(), "name", e.currentTarget.value);
        _el$58.$$input = (e) => updateVolumeMount(index(), "mountPath", e.currentTarget.value);
        _el$59.addEventListener("change", (e) => updateVolumeMount(index(), "pvcName", e.currentTarget.value));
        insert(_el$59, createComponent(For, {
          get each() {
            return pvcs() || [];
          },
          children: (pvc) => (() => {
            var _el$65 = _tmpl$5$1();
            insert(_el$65, () => pvc.name);
            createRenderEffect(() => _el$65.value = pvc.name);
            return _el$65;
          })()
        }), null);
        _el$63.addEventListener("change", (e) => updateVolumeMount(index(), "readOnly", e.currentTarget.checked));
        _el$64.$$click = () => removeVolumeMount(index());
        createRenderEffect(() => _el$57.value = vm.name);
        createRenderEffect(() => _el$58.value = vm.mountPath);
        createRenderEffect(() => _el$59.value = vm.pvcName || "");
        createRenderEffect(() => _el$63.checked = vm.readOnly || false);
        return _el$56;
      })()
    }));
    insert(_el$7, createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$47 = _tmpl$3$1();
        insert(_el$47, error);
        return _el$47;
      }
    }), _el$48);
    addEventListener(_el$49, "click", props.onClose, true);
    _el$50.$$click = handleSubmit;
    insert(_el$50, () => submitting() ? "Creating..." : "Create Job");
    createRenderEffect((_p$) => {
      var _v$ = submitting(), _v$2 = submitting() || !name();
      _v$ !== _p$.e && (_el$49.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$50.disabled = _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    createRenderEffect(() => _el$1.value = name());
    createRenderEffect(() => _el$12.value = namespace());
    createRenderEffect(() => _el$16.checked = autoBuild());
    createRenderEffect(() => _el$27.value = cpu());
    createRenderEffect(() => _el$30.value = memory());
    createRenderEffect(() => _el$33.value = gpu());
    createRenderEffect(() => _el$36.value = restartPolicy());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

var _tmpl$ = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading jobs...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="rounded-lg p-4 border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">Error: `), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p class=mb-4 style=color:var(--text-secondary)>No training jobs found</p><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Create Your First Job`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card border rounded-lg overflow-hidden"style=background:var(--bg-card);borderColor:var(--border-color)><table class=w-full><thead class=border-b style=background:var(--bg-secondary);borderColor:var(--border-color)><tr><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Name</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Namespace</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Status</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Image</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Resources</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Created</th><th class="px-4 py-3 text-left text-sm font-medium"style=color:var(--text-primary)>Actions</th></tr></thead><tbody class=divide-y style=borderColor:var(--border-color)>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>ML Training Jobs</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Manage and monitor your machine learning training jobs</p></div><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>+ Create Job`), _tmpl$6 = /* @__PURE__ */ template(`<tr class="hover:opacity-80 transition-opacity"style=background:var(--bg-card);border-color:var(--border-color)><td class="px-4 py-3"><button class="font-medium transition-colors hover:opacity-80"style=color:var(--accent-primary)></button></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)></td><td class="px-4 py-3"><span></span></td><td class="px-4 py-3 text-sm font-mono"style=color:var(--text-secondary)></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)><div class="flex flex-col gap-1"></div></td><td class="px-4 py-3 text-sm"style=color:var(--text-secondary)></td><td class="px-4 py-3"><div class="flex gap-2"><button class="px-3 py-1 text-sm rounded transition-colors"style=background:var(--accent-primary);color:#000>View</button><button class="px-3 py-1 text-sm rounded transition-colors"style="background:rgba(239, 68, 68, 0.2);color:var(--error-color)">Delete`), _tmpl$7 = /* @__PURE__ */ template(`<span>CPU: `), _tmpl$8 = /* @__PURE__ */ template(`<span>Memory: `), _tmpl$9 = /* @__PURE__ */ template(`<span>GPU: `);
const TrainingJobsList = () => {
  createSignal(null);
  const [showForm, setShowForm] = createSignal(false);
  const [jobs, {
    refetch
  }] = createResource(() => namespace(), async (ns) => {
    const result = await mlJobsService.list(ns === "_all" ? void 0 : ns);
    return result.jobs;
  });
  const handleDelete = async (job) => {
    if (!confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      return;
    }
    try {
      await mlJobsService.delete(job.name, job.namespace);
      refetch();
    } catch (error) {
      alert(`Failed to delete job: ${error.message}`);
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "Succeeded":
        return "bg-green-500";
      case "Failed":
        return "bg-red-500";
      case "Active":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling;
    _el$6.$$click = () => setShowForm(true);
    insert(_el$, createComponent(Show, {
      get when() {
        return showForm();
      },
      get children() {
        return createComponent(TrainingJobForm, {
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
        return jobs.loading;
      },
      get children() {
        return _tmpl$();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return jobs.error;
      },
      get children() {
        var _el$8 = _tmpl$2(); _el$8.firstChild;
        insert(_el$8, () => jobs.error?.message || "Failed to load jobs", null);
        return _el$8;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!jobs.loading && jobs()))() && jobs().length === 0;
      },
      get children() {
        var _el$0 = _tmpl$3(), _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling;
        _el$10.$$click = () => setShowForm(true);
        return _el$0;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(!jobs.loading && jobs()))() && jobs().length > 0;
      },
      get children() {
        var _el$11 = _tmpl$4(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.nextSibling, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling, _el$20 = _el$19.nextSibling; _el$20.nextSibling; var _el$22 = _el$13.nextSibling;
        insert(_el$22, createComponent(For, {
          get each() {
            return jobs();
          },
          children: (job) => (() => {
            var _el$23 = _tmpl$6(), _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$24.nextSibling, _el$27 = _el$26.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$27.nextSibling, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$30.nextSibling, _el$33 = _el$32.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling;
            _el$25.$$click = () => {
              sessionStorage.setItem("kubegraf-selected-training-job", JSON.stringify({
                name: job.name,
                namespace: job.namespace
              }));
              window.location.reload();
            };
            insert(_el$25, () => job.name);
            insert(_el$26, () => job.namespace);
            insert(_el$28, () => job.status);
            insert(_el$29, () => job.image);
            insert(_el$31, (() => {
              var _c$ = memo(() => !!job.resources.cpu);
              return () => _c$() && (() => {
                var _el$37 = _tmpl$7(); _el$37.firstChild;
                insert(_el$37, () => job.resources.cpu, null);
                return _el$37;
              })();
            })(), null);
            insert(_el$31, (() => {
              var _c$2 = memo(() => !!job.resources.memory);
              return () => _c$2() && (() => {
                var _el$39 = _tmpl$8(); _el$39.firstChild;
                insert(_el$39, () => job.resources.memory, null);
                return _el$39;
              })();
            })(), null);
            insert(_el$31, (() => {
              var _c$3 = memo(() => !!job.resources.gpu);
              return () => _c$3() && (() => {
                var _el$41 = _tmpl$9(); _el$41.firstChild;
                insert(_el$41, () => job.resources.gpu, null);
                return _el$41;
              })();
            })(), null);
            insert(_el$32, () => new Date(job.createdAt).toLocaleString());
            _el$35.$$click = () => {
              sessionStorage.setItem("kubegraf-selected-training-job", JSON.stringify({
                name: job.name,
                namespace: job.namespace
              }));
              window.location.reload();
            };
            _el$36.$$click = () => handleDelete(job);
            createRenderEffect(() => className(_el$28, `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(job.status)}`));
            return _el$23;
          })()
        }));
        return _el$11;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

const TrainingJobs = () => {
  const [jobName, setJobName] = createSignal("");
  const [jobNamespace, setJobNamespace] = createSignal("");
  onMount(() => {
    const stored = sessionStorage.getItem("kubegraf-selected-training-job");
    if (stored) {
      try {
        const job = JSON.parse(stored);
        setJobName(job.name);
        setJobNamespace(job.namespace);
        sessionStorage.removeItem("kubegraf-selected-training-job");
      } catch (e) {
      }
    }
  });
  const viewingDetails = () => jobName() !== "";
  return createComponent(Show, {
    get when() {
      return !viewingDetails();
    },
    get fallback() {
      return createComponent(TrainingJobDetails, {
        get jobName() {
          return jobName();
        },
        get jobNamespace() {
          return jobNamespace();
        }
      });
    },
    get children() {
      return createComponent(TrainingJobsList, {});
    }
  });
};

export { TrainingJobs as default };
//# sourceMappingURL=TrainingJobs-Dgshespz.js.map
