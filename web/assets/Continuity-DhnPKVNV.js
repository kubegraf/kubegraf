import { c as createSignal, j as createResource, k as api, t as template, i as insert, d as createComponent, S as Show, F as For, m as memo, f as createRenderEffect, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="flex items-center justify-center py-12"><div class=spinner style=width:32px;height:32px>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-6 text-center"><p style=color:var(--error-color)>Failed to load continuity summary. Please try again.`), _tmpl$3 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"><div class="flex items-center justify-between mb-6"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Continuity Tracking</h1><p class="text-sm mt-1"style=color:var(--text-secondary)>Track incidents and issues since your last session</p></div><div class="flex items-center gap-3"><select class="px-4 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=24h>Last 24 hours</option><option value=3d>Last 3 days</option><option value=7d>Last 7 days</option><option value=14d>Last 14 days</option><option value=30d>Last 30 days</option></select><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Refresh`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-6"><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Deployments with Failures</h2><div class=space-y-2>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card p-6"><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Node Issues</h2><div class=space-y-2>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card p-12 text-center"><div class="text-4xl mb-4">✅</div><h3 class="text-lg font-semibold mb-2"style=color:var(--text-primary)>No Issues Detected</h3><p style=color:var(--text-secondary)>Your cluster has been running smoothly since `), _tmpl$7 = /* @__PURE__ */ template(`<div class=space-y-6><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="card p-6"><div class="text-sm font-medium mb-2"style=color:var(--text-secondary)>Total Incidents</div><div class="text-3xl font-bold"style=color:var(--text-primary)></div><div class="text-xs mt-2"style=color:var(--text-muted)>Since </div></div><div class="card p-6"><div class="text-sm font-medium mb-2"style=color:var(--text-secondary)>Major Incidents</div><div class="text-3xl font-bold"style=color:var(--error-color)></div><div class="text-xs mt-2"style=color:var(--text-muted)>Warning-level events</div></div><div class="card p-6"><div class="text-sm font-medium mb-2"style=color:var(--text-secondary)>Deployments with Failures</div><div class="text-3xl font-bold"style=color:var(--text-primary)></div><div class="text-xs mt-2"style=color:var(--text-muted)>Deployments affected</div></div><div class="card p-6"><div class="text-sm font-medium mb-2"style=color:var(--text-secondary)>Node Issues</div><div class="text-3xl font-bold"style=color:var(--warning-color)></div><div class="text-xs mt-2"style=color:var(--text-muted)>Nodes with problems</div></div></div><div class="card p-4"><div class=text-xs style=color:var(--text-muted)><div>Window: </div><div>Last seen: `), _tmpl$8 = /* @__PURE__ */ template(`<div class="px-4 py-2 rounded-lg"style=background:var(--bg-tertiary);color:var(--text-primary)>`);
const Continuity = () => {
  const [window, setWindow] = createSignal("7d");
  const [summary, {
    refetch
  }] = createResource(() => window(), async (w) => {
    try {
      console.log("[Continuity] Fetching continuity summary for window:", w);
      const data = await api.getContinuitySummary(w);
      console.log("[Continuity] Received continuity data:", data);
      const result = {
        incidents_count: data?.incidents_count ?? 0,
        major_incidents_count: data?.major_incidents_count ?? 0,
        deployments_with_failures: data?.deployments_with_failures ?? [],
        node_issues: data?.node_issues ?? [],
        window: data?.window ?? w,
        last_seen_at: data?.last_seen_at ?? (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log("[Continuity] Processed continuity result:", result);
      return result;
    } catch (error) {
      console.error("[Continuity] Continuity summary error:", error);
      return {
        incidents_count: 0,
        major_incidents_count: 0,
        deployments_with_failures: [],
        node_issues: [],
        window: w,
        last_seen_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  });
  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };
  return (() => {
    var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$7.nextSibling;
    _el$7.addEventListener("change", (e) => setWindow(e.currentTarget.value));
    _el$8.$$click = () => refetch();
    insert(_el$, createComponent(Show, {
      get when() {
        return summary.loading;
      },
      get children() {
        var _el$9 = _tmpl$(); _el$9.firstChild;
        return _el$9;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return summary.error;
      },
      get children() {
        var _el$1 = _tmpl$2(); _el$1.firstChild;
        return _el$1;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return summary();
      },
      children: (data) => (() => {
        var _el$11 = _tmpl$7(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling, _el$16 = _el$15.nextSibling; _el$16.firstChild; var _el$18 = _el$13.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$19.nextSibling; _el$20.nextSibling; var _el$22 = _el$18.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$23.nextSibling; _el$24.nextSibling; var _el$26 = _el$22.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling; _el$28.nextSibling; var _el$41 = _el$12.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.firstChild; _el$43.firstChild; var _el$45 = _el$43.nextSibling; _el$45.firstChild;
        insert(_el$15, () => data().incidents_count);
        insert(_el$16, () => formatTime(data().last_seen_at), null);
        insert(_el$20, () => data().major_incidents_count);
        insert(_el$24, () => data().deployments_with_failures.length);
        insert(_el$28, () => data().node_issues.length);
        insert(_el$11, createComponent(Show, {
          get when() {
            return data().deployments_with_failures.length > 0;
          },
          get children() {
            var _el$30 = _tmpl$4(), _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling;
            insert(_el$32, createComponent(For, {
              get each() {
                return data().deployments_with_failures;
              },
              children: (deployment) => (() => {
                var _el$47 = _tmpl$8();
                insert(_el$47, deployment);
                return _el$47;
              })()
            }));
            return _el$30;
          }
        }), _el$41);
        insert(_el$11, createComponent(Show, {
          get when() {
            return data().node_issues.length > 0;
          },
          get children() {
            var _el$33 = _tmpl$5(), _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling;
            insert(_el$35, createComponent(For, {
              get each() {
                return data().node_issues;
              },
              children: (node) => (() => {
                var _el$48 = _tmpl$8();
                insert(_el$48, node);
                return _el$48;
              })()
            }));
            return _el$33;
          }
        }), _el$41);
        insert(_el$11, createComponent(Show, {
          get when() {
            return memo(() => !!(data().incidents_count === 0 && data().deployments_with_failures.length === 0))() && data().node_issues.length === 0;
          },
          get children() {
            var _el$36 = _tmpl$6(), _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.nextSibling; _el$39.firstChild;
            insert(_el$39, () => formatTime(data().last_seen_at), null);
            return _el$36;
          }
        }), _el$41);
        insert(_el$43, () => data().window, null);
        insert(_el$45, () => formatTime(data().last_seen_at), null);
        return _el$11;
      })()
    }), null);
    createRenderEffect(() => _el$7.value = window());
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Continuity as default };
//# sourceMappingURL=Continuity-DhnPKVNV.js.map
