import { c as createSignal, j as createResource, k as api, P as namespace, t as template, i as insert, m as memo, d as createComponent, S as Show, F as For, M as Modal, f as createRenderEffect, h as setStyleProperty, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="card p-8"><div class=text-center><div class="spinner mx-auto mb-4"></div><p style=color:var(--text-muted)>Checking for configuration drift...`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-8"><div class=text-center><svg class="w-16 h-16 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--success-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><h3 class="text-lg font-semibold"style=color:var(--text-primary)>No Configuration Drift Detected</h3><p style=color:var(--text-secondary)>All resources are in sync with their expected state`), _tmpl$3 = /* @__PURE__ */ template(`<div class="card overflow-hidden"><div class="p-4 border-b"style=border-color:var(--border-color)><h3 class="font-semibold flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Drifted Resources (<!>)</h3></div><table class=data-table><thead><tr><th>Resource</th><th>Kind</th><th>Namespace</th><th>Changes</th><th>Last Checked</th><th>Actions</th></tr></thead><tbody>`), _tmpl$4 = /* @__PURE__ */ template(`<div class=space-y-3>`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-4><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class=text-sm style=color:var(--text-muted)>Namespace</div><div style=color:var(--text-primary)></div></div><h4 class=font-medium style=color:var(--text-primary)>Changes Detected</h4><div class="flex justify-end gap-2 mt-4"><button class="px-4 py-2 rounded-lg"style=background:var(--bg-tertiary);color:var(--text-primary)>Close</button><button class="px-4 py-2 rounded-lg"style=background:var(--success-color);color:white>Revert to Expected`), _tmpl$6 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Configuration Drift</h1><p style=color:var(--text-secondary)>Detect and remediate configuration drift from desired state</p></div><button class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Check Drift</button></div><div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Resources Checked</div><div class="text-3xl font-bold mt-2"style=color:var(--accent-primary)></div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>In Sync</div><div class="text-3xl font-bold mt-2"style=color:var(--success-color)></div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Drifted</div><div class="text-3xl font-bold mt-2"></div></div><div class="card p-6"><div class=text-sm style=color:var(--text-muted)>Health</div><div class="text-3xl font-bold mt-2">%</div></div></div><div class="card p-6"><h3 class="font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>About Configuration Drift</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>What is Drift?</h4><p class=text-sm style=color:var(--text-secondary)>Configuration drift occurs when the actual state of a resource differs from its expected or desired state, often due to manual changes.</p></div><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Detection Method</h4><p class=text-sm style=color:var(--text-secondary)>We compare resource specifications against their last-applied-configuration annotation or GitOps source of truth.</p></div><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Remediation</h4><p class=text-sm style=color:var(--text-secondary)>Revert drifted resources to their expected state automatically, or use GitOps to sync from your repository.`), _tmpl$7 = /* @__PURE__ */ template(`<tr class=hover:bg-[var(--bg-tertiary)]><td class=font-medium style=color:var(--accent-primary)></td><td><span class="badge badge-info"></span></td><td></td><td><span class="badge badge-warning"> changes</span></td><td class=text-sm style=color:var(--text-muted)></td><td><div class="flex items-center gap-2"><button class=action-btn title="View Diff"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg></button><button class=action-btn title="Revert to Expected"style=color:var(--success-color)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6">`), _tmpl$8 = /* @__PURE__ */ template(`<div class="text-center py-4"style=color:var(--text-muted)>No detailed changes available`), _tmpl$9 = /* @__PURE__ */ template(`<div class="p-3 rounded-lg border"style=background:var(--bg-secondary);border-color:var(--border-color)><div class="font-mono text-sm mb-2"style=color:var(--accent-primary)></div><div class="grid grid-cols-2 gap-4 text-sm"><div><div class="text-xs mb-1"style=color:var(--text-muted)>Expected</div><div class="p-2 rounded font-mono text-xs break-all"style="background:rgba(34, 197, 94, 0.1);color:var(--success-color)"></div></div><div><div class="text-xs mb-1"style=color:var(--text-muted)>Actual</div><div class="p-2 rounded font-mono text-xs break-all"style="background:rgba(239, 68, 68, 0.1);color:var(--error-color)">`);
const Drift = () => {
  const [showDiffModal, setShowDiffModal] = createSignal(false);
  const [selectedDrift, setSelectedDrift] = createSignal(null);
  const [driftData, {
    refetch
  }] = createResource(() => namespace(), async (ns) => {
    try {
      const actualNs = ns === "_all" || !ns ? "default" : ns;
      console.log("[Drift] Fetching drift summary for namespace:", actualNs);
      const data = await api.getDriftSummary(actualNs);
      console.log("[Drift] Received drift data:", data);
      if (data && typeof data === "object") {
        const result = {
          total: data.total || 0,
          synced: data.synced || 0,
          drifted: data.drifted || 0,
          missing: data.missing || 0,
          unknown: data.unknown || 0,
          driftedResources: data.driftedResources || data.drifted || []
        };
        console.log("[Drift] Processed drift result:", result);
        return result;
      }
      console.warn("[Drift] Invalid data structure received");
      return {
        total: 0,
        synced: 0,
        drifted: 0,
        missing: 0,
        unknown: 0,
        driftedResources: []
      };
    } catch (error) {
      console.error("[Drift] Failed to fetch drift summary:", error);
      return {
        total: 0,
        synced: 0,
        drifted: 0,
        missing: 0,
        unknown: 0,
        driftedResources: []
      };
    }
  });
  const viewDiff = (drift) => {
    setSelectedDrift(drift);
    setShowDiffModal(true);
  };
  const handleRevert = async (drift) => {
    if (confirm(`Revert ${drift.kind}/${drift.name} to its expected state?`)) {
      try {
        await api.revertDrift(drift.kind, drift.name, drift.namespace);
        refetch();
      } catch (error) {
        console.error("Failed to revert drift:", error);
        alert("Failed to revert. Check console for details.");
      }
    }
  };
  const totalDrifted = () => driftData()?.drifted || 0;
  const totalChecked = () => driftData()?.total || 0;
  return (() => {
    var _el$ = _tmpl$6(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$2.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$8.nextSibling, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$1.nextSibling, _el$13 = _el$12.firstChild, _el$14 = _el$13.nextSibling, _el$15 = _el$12.nextSibling, _el$16 = _el$15.firstChild, _el$17 = _el$16.nextSibling, _el$18 = _el$17.firstChild, _el$38 = _el$7.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.nextSibling, _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild; _el$42.nextSibling; var _el$44 = _el$41.nextSibling, _el$45 = _el$44.firstChild; _el$45.nextSibling; var _el$47 = _el$44.nextSibling, _el$48 = _el$47.firstChild; _el$48.nextSibling;
    _el$6.$$click = () => refetch();
    insert(_el$0, totalChecked);
    insert(_el$11, () => totalChecked() - totalDrifted());
    insert(_el$14, totalDrifted);
    insert(_el$17, (() => {
      var _c$ = memo(() => totalChecked() > 0);
      return () => _c$() ? Math.round((totalChecked() - totalDrifted()) / totalChecked() * 100) : 100;
    })(), _el$18);
    insert(_el$, createComponent(Show, {
      get when() {
        return driftData.loading;
      },
      get children() {
        var _el$19 = _tmpl$(), _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild; _el$21.nextSibling;
        return _el$19;
      }
    }), _el$38);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!driftData.loading)() && totalDrifted() === 0;
      },
      get children() {
        var _el$23 = _tmpl$2(), _el$24 = _el$23.firstChild, _el$25 = _el$24.firstChild, _el$26 = _el$25.nextSibling; _el$26.nextSibling;
        return _el$23;
      }
    }), _el$38);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!!driftData.loading)() && totalDrifted() > 0;
      },
      get children() {
        var _el$28 = _tmpl$3(), _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$34 = _el$32.nextSibling; _el$34.nextSibling; var _el$35 = _el$29.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.nextSibling;
        insert(_el$30, totalDrifted, _el$34);
        insert(_el$37, createComponent(For, {
          get each() {
            return driftData()?.driftedResources || [];
          },
          children: (drift) => (() => {
            var _el$59 = _tmpl$7(), _el$60 = _el$59.firstChild, _el$61 = _el$60.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$61.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.firstChild, _el$67 = _el$64.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.firstChild, _el$70 = _el$69.firstChild, _el$71 = _el$70.nextSibling;
            insert(_el$60, () => drift.name);
            insert(_el$62, () => drift.kind);
            insert(_el$63, () => drift.namespace);
            insert(_el$65, () => drift.driftDetails?.length || 0, _el$66);
            insert(_el$67, () => drift.lastChecked || "Just now");
            _el$70.$$click = () => viewDiff(drift);
            _el$71.$$click = () => handleRevert(drift);
            return _el$59;
          })()
        }));
        return _el$28;
      }
    }), _el$38);
    insert(_el$, createComponent(Modal, {
      get isOpen() {
        return showDiffModal();
      },
      onClose: () => setShowDiffModal(false),
      get title() {
        return `Drift Details: ${selectedDrift()?.kind}/${selectedDrift()?.name}`;
      },
      size: "lg",
      get children() {
        return createComponent(Show, {
          get when() {
            return selectedDrift();
          },
          get children() {
            var _el$50 = _tmpl$5(), _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, _el$54 = _el$51.nextSibling, _el$56 = _el$54.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$57.nextSibling;
            insert(_el$53, () => selectedDrift()?.namespace);
            insert(_el$50, createComponent(Show, {
              get when() {
                return (selectedDrift()?.driftDetails || []).length > 0;
              },
              get fallback() {
                return _tmpl$8();
              },
              get children() {
                var _el$55 = _tmpl$4();
                insert(_el$55, createComponent(For, {
                  get each() {
                    return selectedDrift()?.driftDetails || [];
                  },
                  children: (change) => (() => {
                    var _el$73 = _tmpl$9(), _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$76.firstChild, _el$78 = _el$77.nextSibling, _el$79 = _el$76.nextSibling, _el$80 = _el$79.firstChild, _el$81 = _el$80.nextSibling;
                    insert(_el$74, () => change.field);
                    insert(_el$78, () => change.expected || "(not set)");
                    insert(_el$81, () => change.actual || "(not set)");
                    return _el$73;
                  })()
                }));
                return _el$55;
              }
            }), _el$56);
            _el$57.$$click = () => setShowDiffModal(false);
            _el$58.$$click = () => {
              if (selectedDrift()) handleRevert(selectedDrift());
              setShowDiffModal(false);
            };
            return _el$50;
          }
        });
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = totalDrifted() > 0 ? "var(--error-color)" : "var(--success-color)", _v$2 = totalDrifted() === 0 ? "var(--success-color)" : totalDrifted() < 5 ? "var(--warning-color)" : "var(--error-color)";
      _v$ !== _p$.e && setStyleProperty(_el$14, "color", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$17, "color", _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Drift as default };
//# sourceMappingURL=Drift-ekieueYw.js.map
