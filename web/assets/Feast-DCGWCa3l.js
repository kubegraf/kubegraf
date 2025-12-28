import { c as createSignal, j as createResource, t as template, i as insert, d as createComponent, S as Show, m as memo, v as delegateEvents } from './index-B8I71-mz.js';
import { f as feastService, F as FeastInstallWizard } from './FeastInstallWizard-Dh_p6pZr.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Install Feast`), _tmpl$2 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)>Loading...`), _tmpl$3 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 gap-4"><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Status</div><div class="text-lg font-semibold text-green-500">Installed</div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Version</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Namespace</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Serving URL</div><div class="text-lg font-mono text-sm break-all"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Online Store</div><div class="text-lg font-semibold"style=color:var(--text-primary)></div></div><div class="card rounded-lg p-4 border"style=background:var(--bg-card);borderColor:var(--border-color)><div class="text-sm mb-1"style=color:var(--text-secondary)>Offline Store</div><div class="text-lg font-semibold"style=color:var(--text-primary)>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-8 text-center border"style=background:var(--bg-card);borderColor:var(--border-color)><p class=mb-4 style=color:var(--text-secondary)>Feast is not installed</p><button class="px-4 py-2 rounded-lg text-white transition-colors"style=background:var(--accent-primary);color:#000>Install Feast`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-6 space-y-6"style=background:var(--bg-primary)><div class="flex items-center justify-between"><div><h2 class="text-2xl font-bold"style=color:var(--text-primary)>Feast Feature Store</h2><p class="text-sm mt-1"style=color:var(--text-secondary)>Store, manage, and serve features for machine learning`);
const FeastPanel = () => {
  const [showWizard, setShowWizard] = createSignal(false);
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);
  const [status, {
    refetch
  }] = createResource(() => refetchTrigger(), async () => {
    return await feastService.getStatus();
  });
  const handleInstallSuccess = () => {
    setRefetchTrigger((prev) => prev + 1);
    setShowWizard(false);
  };
  return (() => {
    var _el$ = _tmpl$5(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling;
    insert(_el$2, createComponent(Show, {
      get when() {
        return !status()?.installed;
      },
      get children() {
        var _el$6 = _tmpl$();
        _el$6.$$click = () => setShowWizard(true);
        return _el$6;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return showWizard();
      },
      get children() {
        return createComponent(FeastInstallWizard, {
          onClose: () => setShowWizard(false),
          onSuccess: handleInstallSuccess
        });
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
        return memo(() => !!!status.loading)() && status();
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return status().installed;
          },
          get children() {
            var _el$8 = _tmpl$3(), _el$9 = _el$8.firstChild; _el$9.firstChild; var _el$1 = _el$9.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$1.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$15.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling, _el$21 = _el$18.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.nextSibling;
            insert(_el$11, () => status().version || "Unknown");
            insert(_el$14, () => status().namespace || "N/A");
            insert(_el$17, () => status().servingURL || "N/A");
            insert(_el$20, () => status().onlineStore || "N/A");
            insert(_el$23, () => status().offlineStore || "N/A");
            return _el$8;
          }
        }), createComponent(Show, {
          get when() {
            return !status().installed;
          },
          get children() {
            var _el$24 = _tmpl$4(), _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling;
            _el$26.$$click = () => setShowWizard(true);
            return _el$24;
          }
        })];
      }
    }), null);
    return _el$;
  })();
};
delegateEvents(["click"]);

const Feast = () => {
  return createComponent(FeastPanel, {});
};

export { Feast as default };
//# sourceMappingURL=Feast-DCGWCa3l.js.map
