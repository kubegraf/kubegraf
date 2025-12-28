import { j as createResource, c as createSignal, t as template, i as insert, d as createComponent, S as Show, m as memo, f as createRenderEffect, e as setAttribute, v as delegateEvents } from './index-NnaOo1cf.js';
import { m as mlflowService } from './mlflow-DI74GHPx.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-sm transition-colors hover:opacity-80"style=background:var(--accent-primary);color:#000>Refresh`), _tmpl$2 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading MLflow status...`), _tmpl$3 = /* @__PURE__ */ template(`<div class="rounded-lg p-4 border"style="background:rgba(239, 68, 68, 0.1);borderColor:var(--error-color);color:var(--error-color)">Error: `), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p class="text-lg font-medium mb-2"style=color:var(--text-primary)>MLflow is not installed</p><p class="text-sm mb-4"style=color:var(--text-secondary)>Install MLflow from the Marketplace → ML Apps section</p><a href="/apps?tab=marketplace&amp;category=ML Apps"class="inline-block px-6 py-2 rounded-lg text-white transition-colors hover:opacity-80"style=background:var(--accent-primary);color:#000>Go to Marketplace`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Backend Store</div><div class="text-lg font-semibold"style=color:var(--text-primary)>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Artifact Store</div><div class="text-lg font-semibold"style=color:var(--text-primary)>`), _tmpl$7 = /* @__PURE__ */ template(`<div class=space-y-4><div class="grid grid-cols-2 gap-4"><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Status</div><div class="text-lg font-semibold text-green-500">Installed</div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Version</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Namespace</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Deployment</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Service</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div></div><div class="flex gap-3"><button class="px-6 py-2 rounded-lg text-white transition-colors hover:opacity-80"style=background:var(--accent-primary);color:#000>Open Tracking UI</button><button class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"style=background:var(--bg-secondary);borderColor:var(--border-color);color:var(--text-primary)>Restart Pods</button></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><h3 class="font-semibold mb-3"style=color:var(--text-primary)>Quick Links</h3><div class="space-y-2 text-sm"><a target=_blank class="block transition-colors hover:opacity-80"style=color:var(--accent-primary)>→ MLflow Tracking UI</a><a target=_blank class="block transition-colors hover:opacity-80"style=color:var(--accent-primary)>→ MLflow API (Experiments)`), _tmpl$8 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>MLflow</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Open source platform for managing the ML lifecycle`);
const MLflowPanel = () => {
  const [status, {
    refetch
  }] = createResource(mlflowService.getStatus);
  createSignal(false);
  const openUI = () => {
    if (status()?.installed && status()?.serviceName) {
      const url = `/api/mlflow/proxy/?namespace=${status()?.namespace || "mlflow"}`;
      window.open(url, "_blank");
    }
  };
  const restartPods = async () => {
    if (!status()?.installed) return;
    try {
      const response = await fetch(`/api/deployments/${status()?.namespace}/${status()?.deployment}/restart`, {
        method: "POST"
      });
      if (response.ok) {
        alert("MLflow pods are restarting...");
        setTimeout(() => refetch(), 5e3);
      }
    } catch (error) {
      console.error("Failed to restart pods:", error);
      alert("Failed to restart pods");
    }
  };
  return (() => {
    var _el$ = _tmpl$8(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling;
    insert(_el$2, createComponent(Show, {
      get when() {
        return status()?.installed;
      },
      get children() {
        var _el$6 = _tmpl$();
        _el$6.$$click = () => refetch();
        return _el$6;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return status.loading;
      },
      get children() {
        return _tmpl$2();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return status.error;
      },
      get children() {
        var _el$8 = _tmpl$3(); _el$8.firstChild;
        insert(_el$8, () => status.error?.message || "Failed to load MLflow status", null);
        return _el$8;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!status.loading)() && !status()?.installed;
      },
      get children() {
        var _el$0 = _tmpl$4(), _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling; _el$10.nextSibling;
        return _el$0;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return status()?.installed;
      },
      get children() {
        var _el$12 = _tmpl$7(), _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild; _el$14.firstChild; var _el$16 = _el$14.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$16.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$22 = _el$19.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling, _el$25 = _el$22.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$34 = _el$13.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$34.nextSibling, _el$38 = _el$37.firstChild, _el$39 = _el$38.nextSibling, _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling;
        insert(_el$18, () => status()?.version || "Unknown");
        insert(_el$21, () => status()?.namespace || "N/A");
        insert(_el$24, () => status()?.deployment || "N/A");
        insert(_el$27, () => status()?.serviceName || "N/A");
        insert(_el$13, createComponent(Show, {
          get when() {
            return status()?.backendStore;
          },
          get children() {
            var _el$28 = _tmpl$5(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling;
            insert(_el$30, () => status()?.backendStore || "N/A");
            return _el$28;
          }
        }), null);
        insert(_el$13, createComponent(Show, {
          get when() {
            return status()?.artifactStore;
          },
          get children() {
            var _el$31 = _tmpl$6(), _el$32 = _el$31.firstChild, _el$33 = _el$32.nextSibling;
            insert(_el$33, () => status()?.artifactStore || "N/A");
            return _el$31;
          }
        }), null);
        _el$35.$$click = openUI;
        _el$36.$$click = restartPods;
        createRenderEffect((_p$) => {
          var _v$ = `/api/mlflow/proxy/?namespace=${status()?.namespace || "mlflow"}`, _v$2 = `/api/mlflow/proxy/api/2.0/mlflow/experiments/search?namespace=${status()?.namespace || "mlflow"}`;
          _v$ !== _p$.e && setAttribute(_el$40, "href", _p$.e = _v$);
          _v$2 !== _p$.t && setAttribute(_el$41, "href", _p$.t = _v$2);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$12;
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

const MLflow = () => {
  return createComponent(MLflowPanel, {});
};

export { MLflow as default };
//# sourceMappingURL=MLflow-Lmt-chN0.js.map
