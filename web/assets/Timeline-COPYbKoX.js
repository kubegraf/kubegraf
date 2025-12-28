import { c as createSignal, a as createMemo, j as createResource, k as api, t as template, i as insert, d as createComponent, F as For, m as memo, S as Show, f as createRenderEffect, h as setStyleProperty, v as delegateEvents } from './index-Bh-O-sIc.js';

var _tmpl$ = /* @__PURE__ */ template(`<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4"><div class="card p-3 text-center"><div class=text-sm style=color:var(--text-secondary)>Total</div><div class="text-xl font-bold mt-1"style=color:var(--accent-primary)>`), _tmpl$2 = /* @__PURE__ */ template(`<div class="card p-4 mb-4"style="border:1px solid var(--error-color);background:var(--bg-secondary)"><div class="text-red-400 font-semibold mb-2">Error loading timeline events</div><div class=text-sm style=color:var(--text-secondary)></div><button class="mt-3 px-4 py-2 rounded text-sm"style=background:var(--error-color);color:#fff>Retry`), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-4"><div class=space-y-3>`), _tmpl$4 = /* @__PURE__ */ template(`<div class="space-y-4 p-6"><div class="flex items-center justify-between mb-6"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Timeline Replay</h1><p class="text-sm mt-1"style=color:var(--text-secondary)>Chronological view of Kubernetes events, pod status changes, deployment rollouts, and node conditions</p></div><button class="px-4 py-2 rounded-lg text-sm font-medium"style=background:var(--accent-primary);color:#000>Refresh</button></div><div class="card p-4 mb-4"><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Time Range</label><select class="w-full p-2 rounded border"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=0.5>Last 30 minutes</option><option value=1>Last 1 hour</option><option value=6>Last 6 hours</option><option value=24>Last 24 hours</option><option value=72>Last 3 days</option></select></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Event Type</label><select class="w-full p-2 rounded border"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=all>All Types</option><option value=k8s_event>K8s Events</option><option value=pod_status_change>Pod Status</option><option value=deployment_rollout>Deployments</option><option value=node_condition_change>Node Conditions</option></select></div><div><label class="block text-sm mb-2"style=color:var(--text-secondary)>Incident ID (optional)</label><input type=text placeholder=inc-... class="w-full p-2 rounded border"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="card p-3 text-center"><div class=text-sm style=color:var(--text-secondary)></div><div class="text-xl font-bold mt-1"style=color:var(--accent-primary)>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card p-8 text-center"style=color:var(--text-secondary)><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div><div>Loading timeline events...`), _tmpl$7 = /* @__PURE__ */ template(`<div class="card p-8 text-center"style=color:var(--text-secondary)>No events found in the selected time range`), _tmpl$8 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border-l-4"style="background:var(--bg-secondary);border:1px solid var(--border-color)"><div class="flex items-start justify-between"><div class=flex-1><div class="flex items-center gap-2 mb-2"><span class=text-xl></span><span class="text-sm font-semibold px-2 py-1 rounded"style=color:#000></span><span class="text-sm font-medium"style=color:var(--text-primary)></span></div><div class="text-sm mb-1"style=color:var(--text-secondary)><strong></strong> / </div></div><div class="text-xs ml-4"style=color:var(--text-muted)>`), _tmpl$9 = /* @__PURE__ */ template(`<span class="ml-2 opacity-75">in `), _tmpl$0 = /* @__PURE__ */ template(`<div class="text-xs mb-1"style=color:var(--text-muted)>Event: `), _tmpl$1 = /* @__PURE__ */ template(`<div class="text-sm mt-2"style=color:var(--text-primary)>`);
const Timeline = () => {
  const [incidentId, setIncidentId] = createSignal("");
  const [hours, setHours] = createSignal(0.5);
  const [selectedType, setSelectedType] = createSignal("all");
  const timeRange = createMemo(() => {
    const until = /* @__PURE__ */ new Date();
    const since = new Date(until.getTime() - hours() * 60 * 60 * 1e3);
    return {
      since: since.toISOString(),
      until: until.toISOString()
    };
  });
  const [historyData, {
    refetch
  }] = createResource(() => ({
    incidentId: incidentId() || void 0,
    since: timeRange().since,
    until: timeRange().until
  }), async (params) => {
    try {
      return await api.getHistoryEvents(params.incidentId, params.since, params.until);
    } catch (error) {
      console.error("[Timeline] Failed to fetch history events:", error);
      throw error;
    }
  });
  const filteredEvents = createMemo(() => {
    const events = historyData()?.events || [];
    if (selectedType() === "all") return events;
    return events.filter((e) => e.type === selectedType());
  });
  const eventSummary = createMemo(() => {
    const events = historyData()?.events || [];
    const summary = {};
    events.forEach((e) => {
      summary[e.type] = (summary[e.type] || 0) + 1;
    });
    return summary;
  });
  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return "var(--error-color)";
      case "warning":
        return "var(--warning-color)";
      default:
        return "var(--accent-primary)";
    }
  };
  const getTypeIcon = (type) => {
    switch (type) {
      case "k8s_event":
        return "📋";
      case "pod_status_change":
        return "☸️";
      case "deployment_rollout":
        return "🚀";
      case "node_condition_change":
        return "🖥️";
      case "metrics_spike":
        return "📈";
      default:
        return "⚡";
    }
  };
  return (() => {
    var _el$ = _tmpl$4(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$2.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$9.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.nextSibling, _el$13 = _el$10.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.nextSibling;
    _el$6.$$click = () => refetch();
    _el$1.addEventListener("change", (e) => setHours(Number(e.target.value)));
    _el$12.addEventListener("change", (e) => setSelectedType(e.target.value));
    _el$15.$$input = (e) => setIncidentId(e.currentTarget.value);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!historyData())() && Object.keys(eventSummary()).length > 0;
      },
      get children() {
        var _el$16 = _tmpl$(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling;
        insert(_el$19, () => historyData()?.total || 0);
        insert(_el$16, createComponent(For, {
          get each() {
            return Object.entries(eventSummary());
          },
          children: ([type, count]) => (() => {
            var _el$26 = _tmpl$5(), _el$27 = _el$26.firstChild, _el$28 = _el$27.nextSibling;
            insert(_el$27, () => type.replace(/_/g, " "));
            insert(_el$28, count);
            return _el$26;
          })()
        }), null);
        return _el$16;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return historyData.error;
      },
      get children() {
        var _el$20 = _tmpl$2(), _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling;
        insert(_el$22, () => String(historyData.error));
        _el$23.$$click = () => refetch();
        return _el$20;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return !historyData.loading;
      },
      get fallback() {
        return _tmpl$6();
      },
      get children() {
        return createComponent(Show, {
          get when() {
            return filteredEvents().length > 0;
          },
          get fallback() {
            return _tmpl$7();
          },
          get children() {
            var _el$24 = _tmpl$3(), _el$25 = _el$24.firstChild;
            insert(_el$25, createComponent(For, {
              get each() {
                return filteredEvents();
              },
              children: (event) => (() => {
                var _el$31 = _tmpl$8(), _el$32 = _el$31.firstChild, _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$36.nextSibling, _el$38 = _el$34.nextSibling, _el$39 = _el$38.firstChild; _el$39.nextSibling; var _el$41 = _el$33.nextSibling;
                insert(_el$35, () => getTypeIcon(event.type));
                insert(_el$36, () => event.severity);
                insert(_el$37, () => event.type.replace(/_/g, " "));
                insert(_el$39, () => event.resourceKind);
                insert(_el$38, () => event.resourceName, null);
                insert(_el$38, (() => {
                  var _c$ = memo(() => !!event.namespace);
                  return () => _c$() && (() => {
                    var _el$42 = _tmpl$9(); _el$42.firstChild;
                    insert(_el$42, () => event.namespace, null);
                    return _el$42;
                  })();
                })(), null);
                insert(_el$33, (() => {
                  var _c$2 = memo(() => !!event.eventType);
                  return () => _c$2() && (() => {
                    var _el$44 = _tmpl$0(); _el$44.firstChild;
                    insert(_el$44, () => event.eventType, null);
                    return _el$44;
                  })();
                })(), null);
                insert(_el$33, (() => {
                  var _c$3 = memo(() => !!event.message);
                  return () => _c$3() && (() => {
                    var _el$46 = _tmpl$1();
                    insert(_el$46, () => event.message);
                    return _el$46;
                  })();
                })(), null);
                insert(_el$41, () => formatTimestamp(event.timestamp));
                createRenderEffect((_p$) => {
                  var _v$ = getSeverityColor(event.severity), _v$2 = getSeverityColor(event.severity);
                  _v$ !== _p$.e && setStyleProperty(_el$31, "borderLeftColor", _p$.e = _v$);
                  _v$2 !== _p$.t && setStyleProperty(_el$36, "background", _p$.t = _v$2);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0
                });
                return _el$31;
              })()
            }));
            return _el$24;
          }
        });
      }
    }), null);
    createRenderEffect(() => _el$1.value = hours());
    createRenderEffect(() => _el$12.value = selectedType());
    createRenderEffect(() => _el$15.value = incidentId());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { Timeline as default };
//# sourceMappingURL=Timeline-COPYbKoX.js.map
