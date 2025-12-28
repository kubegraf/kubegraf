import { c as createSignal, o as onMount, W as wsService, a as createMemo, t as template, i as insert, d as createComponent, F as For, S as Show, m as memo, f as createRenderEffect, h as setStyleProperty, e as setAttribute, v as delegateEvents, j as createResource, k as api, r as refreshTrigger, l as currentContext, E as onCleanup, n as createEffect, g as className } from './index-B8I71-mz.js';

function getEventFilter() {
  const resource = sessionStorage.getItem("kubegraf-event-filter-resource");
  const namespace = sessionStorage.getItem("kubegraf-event-filter-namespace");
  const kind = sessionStorage.getItem("kubegraf-event-filter-kind");
  if (resource && namespace && kind) {
    return { resource, namespace, kind };
  }
  return null;
}
function clearEventFilter() {
  sessionStorage.removeItem("kubegraf-event-filter-resource");
  sessionStorage.removeItem("kubegraf-event-filter-namespace");
  sessionStorage.removeItem("kubegraf-event-filter-kind");
}
function matchesEventFilter(eventResource, eventNamespace, eventKind) {
  const filter = getEventFilter();
  if (!filter) return false;
  const resourceMatch = eventResource.includes(filter.resource) || filter.resource.includes(eventResource) || eventResource.split("/")[0] === filter.resource || filter.resource.split("/")[0] === eventResource;
  const namespaceMatch = eventNamespace === filter.namespace;
  const kindMatch = !eventKind || !filter.kind || eventKind === filter.kind || eventKind.toLowerCase() === filter.kind.toLowerCase();
  return resourceMatch && namespaceMatch && kindMatch;
}

function deduplicateEvents(events, timeWindowMinutes = 5) {
  const grouped = /* @__PURE__ */ new Map();
  const windowMs = timeWindowMinutes * 60 * 1e3;
  events.forEach((event) => {
    const key = `${event.namespace || "cluster-wide"}:${event.resource}:${event.category || event.type}`;
    const eventTime = new Date(event.timestamp).getTime();
    events.filter((e) => {
      const eTime = new Date(e.timestamp).getTime();
      return Math.abs(eTime - eventTime) <= windowMs;
    });
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(event);
  });
  const deduplicated = [];
  grouped.forEach((group, key) => {
    if (group.length === 0) return;
    group.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const first = group[0];
    const last = group[group.length - 1];
    const relatedIds = group.map((e) => e.id).filter((id, idx, arr) => arr.indexOf(id) === idx);
    deduplicated.push({
      ...first,
      duplicateCount: group.length,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      relatedEvents: relatedIds.slice(1),
      // Exclude self
      count: group.reduce((sum, e) => sum + (e.count || 1), 0)
    });
  });
  return deduplicated.sort((a, b) => {
    if (b.duplicateCount !== a.duplicateCount) {
      return b.duplicateCount - a.duplicateCount;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
function escalateSeverity(event) {
  const reason = event.category?.toLowerCase() || "";
  const description = event.description?.toLowerCase() || "";
  const title = event.title?.toLowerCase() || "";
  const combined = `${reason} ${description} ${title}`.toLowerCase();
  if (combined.includes("failedcreatepodsandbox") || combined.includes("failed to create pod") || combined.includes("node not ready") || combined.includes("outofmemory") || combined.includes("oomkilled") || combined.includes("crashloopbackoff") || combined.includes("imagepullbackoff") || combined.includes("network") && combined.includes("failed") || combined.includes("cilium") && combined.includes("failed")) {
    return "critical";
  }
  if (combined.includes("pod") && combined.includes("failed") || combined.includes("deployment") && combined.includes("failed") || combined.includes("replicaset") && combined.includes("failed") || combined.includes("unhealthy") || combined.includes("restart") && event.count > 5) {
    return "high";
  }
  return event.severity;
}

var _tmpl$$2 = /* @__PURE__ */ template(`<span class=text-yellow-400>Paused`), _tmpl$2$2 = /* @__PURE__ */ template(`<div class="rounded-lg border p-4"style=background:var(--bg-secondary);border-color:var(--border-color);maxHeight:600px;display:flex;flex-direction:column><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full animate-pulse"></div><div><h3 class="text-sm font-semibold"style=color:var(--text-primary)>Real-time Events Stream</h3><p class=text-xs style=color:var(--text-muted)>Live cluster events as they happen</p></div></div><div class="flex items-center gap-2"><button class="text-xs px-2 py-1 rounded"></button><button class="text-xs px-2 py-1 rounded"title="Clear events"style=background:var(--bg-tertiary);color:var(--text-secondary)>Clear</button></div></div><div class="overflow-y-auto space-y-2"style=max-height:500px></div><div class="mt-4 pt-3 border-t text-xs"style=border-color:var(--border-color)><div class="flex items-center justify-between"style=color:var(--text-muted)><span> event`), _tmpl$3$2 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)><div class=text-sm>Waiting for events...</div><div class="text-xs mt-2">Events will appear here in real-time`), _tmpl$4$1 = /* @__PURE__ */ template(`<span class="text-xs truncate"style=color:var(--text-muted)>`), _tmpl$5$1 = /* @__PURE__ */ template(`<span>×`), _tmpl$6$1 = /* @__PURE__ */ template(`<span class=truncate>`), _tmpl$7$1 = /* @__PURE__ */ template(`<div class="p-3 rounded border-l-4 text-xs"style=background:var(--bg-primary);border-color:var(--border-color)><div class="flex items-start justify-between gap-2 mb-1"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class="px-1.5 py-0.5 rounded text-xs font-medium"></span><span class="font-medium truncate"style=color:var(--text-primary)></span></div><div class="text-xs mb-1"style=color:var(--text-secondary)></div><div class="text-xs line-clamp-2"style=color:var(--text-muted)></div></div><div class="text-xs whitespace-nowrap ml-2"style=color:var(--text-muted)></div></div><div class="flex items-center gap-3 mt-2 text-xs"style=color:var(--text-muted)><span>`);
const RealtimeEventsPanel = (props) => {
  const [events, setEvents] = createSignal([]);
  const [isPaused, setIsPaused] = createSignal(false);
  const maxEvents = () => props.maxEvents || 50;
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === "event" && !isPaused()) {
        const newEvent = msg.data;
        setEvents((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          return [newEvent, ...current].slice(0, maxEvents());
        });
      }
    });
    return () => unsubscribe();
  });
  const clearEvents = () => {
    setEvents([]);
  };
  const formatTime = (timeStr) => {
    if (!timeStr) return "Just now";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "Just now";
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 1e3) return "Just now";
    if (diff < 6e4) return `${Math.floor(diff / 1e3)}s ago`;
    if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
    return date.toLocaleTimeString();
  };
  const getEventTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case "warning":
        return "#f59e0b";
      case "normal":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };
  const filteredEvents = createMemo(() => {
    return events().slice(0, maxEvents());
  });
  return (() => {
    var _el$ = _tmpl$2$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$5.firstChild; _el$6.nextSibling; var _el$8 = _el$3.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.nextSibling, _el$1 = _el$2.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild;
    _el$9.$$click = () => setIsPaused(!isPaused());
    insert(_el$9, () => isPaused() ? "▶" : "⏸");
    _el$0.$$click = clearEvents;
    insert(_el$1, createComponent(Show, {
      get when() {
        return filteredEvents().length > 0;
      },
      get fallback() {
        return _tmpl$3$2();
      },
      get children() {
        return createComponent(For, {
          get each() {
            return filteredEvents();
          },
          children: (event) => (() => {
            var _el$16 = _tmpl$7$1(), _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild, _el$20 = _el$19.firstChild, _el$21 = _el$20.nextSibling, _el$23 = _el$19.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$18.nextSibling, _el$26 = _el$17.nextSibling, _el$27 = _el$26.firstChild;
            insert(_el$20, () => event.type || "Normal");
            insert(_el$21, () => event.object);
            insert(_el$19, createComponent(Show, {
              get when() {
                return memo(() => !!props.showNamespace)() && event.namespace;
              },
              get children() {
                var _el$22 = _tmpl$4$1();
                insert(_el$22, () => event.namespace);
                return _el$22;
              }
            }), null);
            insert(_el$23, () => event.reason);
            insert(_el$24, () => event.message);
            insert(_el$25, () => formatTime(event.timestamp));
            insert(_el$27, () => event.kind);
            insert(_el$26, createComponent(Show, {
              get when() {
                return event.count > 1;
              },
              get children() {
                var _el$28 = _tmpl$5$1(); _el$28.firstChild;
                insert(_el$28, () => event.count, null);
                return _el$28;
              }
            }), null);
            insert(_el$26, createComponent(Show, {
              get when() {
                return event.source;
              },
              get children() {
                var _el$30 = _tmpl$6$1();
                insert(_el$30, () => event.source);
                return _el$30;
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$6 = getEventTypeColor(event.type), _v$7 = `${getEventTypeColor(event.type)}20`, _v$8 = getEventTypeColor(event.type);
              _v$6 !== _p$.e && setStyleProperty(_el$16, "border-left-color", _p$.e = _v$6);
              _v$7 !== _p$.t && setStyleProperty(_el$20, "background", _p$.t = _v$7);
              _v$8 !== _p$.a && setStyleProperty(_el$20, "color", _p$.a = _v$8);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$16;
          })()
        });
      }
    }));
    insert(_el$12, () => filteredEvents().length, _el$13);
    insert(_el$12, () => filteredEvents().length !== 1 ? "s" : "", null);
    insert(_el$11, createComponent(Show, {
      get when() {
        return isPaused();
      },
      get children() {
        return _tmpl$$2();
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = isPaused() ? "#6b7280" : "#10b981", _v$2 = isPaused() ? "Stream paused" : "Stream active", _v$3 = isPaused() ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$4 = isPaused() ? "var(--text-secondary)" : "#000", _v$5 = isPaused() ? "Resume" : "Pause";
      _v$ !== _p$.e && setStyleProperty(_el$4, "background", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$4, "title", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$9, "background", _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$9, "color", _p$.o = _v$4);
      _v$5 !== _p$.i && setAttribute(_el$9, "title", _p$.i = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$$1 = /* @__PURE__ */ template(`<span>`), _tmpl$2$1 = /* @__PURE__ */ template(`<span class="ml-1 px-1 rounded"style=color:#fff>`), _tmpl$3$1 = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs font-medium border flex items-center gap-1"><span>`);
const EventSeverityBadge = (props) => {
  const getSeverityConfig = () => {
    switch (props.severity) {
      case "critical":
        return {
          color: "#ef4444",
          bgColor: "#ef444420",
          borderColor: "#ef444440",
          icon: "🔴",
          label: "CRITICAL"
        };
      case "high":
        return {
          color: "#f59e0b",
          bgColor: "#f59e0b20",
          borderColor: "#f59e0b40",
          icon: "🟠",
          label: "HIGH"
        };
      case "medium":
        return {
          color: "#3b82f6",
          bgColor: "#3b82f620",
          borderColor: "#3b82f640",
          icon: "🔵",
          label: "MEDIUM"
        };
      case "low":
        return {
          color: "#6b7280",
          bgColor: "#6b728020",
          borderColor: "#6b728040",
          icon: "⚪",
          label: "LOW"
        };
      case "info":
        return {
          color: "#10b981",
          bgColor: "#10b98120",
          borderColor: "#10b98140",
          icon: "ℹ️",
          label: "INFO"
        };
      default:
        return {
          color: "#6b7280",
          bgColor: "#6b728020",
          borderColor: "#6b728040",
          icon: "",
          label: "UNKNOWN"
        };
    }
  };
  const config = getSeverityConfig();
  return (() => {
    var _el$ = _tmpl$3$1(), _el$3 = _el$.firstChild;
    insert(_el$, createComponent(Show, {
      get when() {
        return config.icon;
      },
      get children() {
        var _el$2 = _tmpl$$1();
        insert(_el$2, () => config.icon);
        return _el$2;
      }
    }), _el$3);
    insert(_el$3, () => config.label);
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => !!(props.showCount && props.count))() && props.count > 1;
      },
      get children() {
        var _el$4 = _tmpl$2$1();
        insert(_el$4, () => props.count);
        createRenderEffect((_$p) => setStyleProperty(_el$4, "background", config.color));
        return _el$4;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = config.bgColor, _v$2 = config.color, _v$3 = config.borderColor;
      _v$ !== _p$.e && setStyleProperty(_el$, "background", _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$, "color", _p$.t = _v$2);
      _v$3 !== _p$.a && setStyleProperty(_el$, "borderColor", _p$.a = _v$3);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};

var _tmpl$ = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs font-medium">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="p-4 text-center text-sm"style=color:var(--text-muted)>No namespaces found`), _tmpl$3 = /* @__PURE__ */ template(`<div class="p-2 border-t text-xs text-center"style=borderColor:var(--border-color);color:var(--text-muted)> selected`), _tmpl$4 = /* @__PURE__ */ template(`<div class="absolute right-0 mt-2 w-64 rounded-lg border shadow-lg z-50 max-h-96 overflow-hidden flex flex-col"style=background:var(--bg-secondary);borderColor:var(--border-color)><div class="p-2 border-b"style=borderColor:var(--border-color)><input type=text placeholder="Search namespaces..."class="w-full px-3 py-2 rounded border text-sm"style=background:var(--bg-primary);color:var(--text-primary);borderColor:var(--border-color)></div><div class="p-2 border-b flex gap-2"style=borderColor:var(--border-color)><button class="px-3 py-1 text-xs rounded border"style=background:var(--bg-primary);color:var(--text-primary);borderColor:var(--border-color)>Select All</button><button class="px-3 py-1 text-xs rounded border"style=background:var(--bg-primary);color:var(--text-primary);borderColor:var(--border-color)>Clear</button></div><div class="overflow-y-auto flex-1">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center gap-2 flex-wrap"><span class=text-sm style=color:var(--text-muted)>Filtering by:</span><button class="text-xs underline"style=color:var(--text-muted)>Clear all`), _tmpl$6 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"title="View more namespaces">+<!> more`), _tmpl$7 = /* @__PURE__ */ template(`<select class="px-3 py-2 rounded-lg text-sm border"style=background:var(--bg-secondary);color:var(--text-primary)><option value=15m>15 minutes</option><option value=1h>1 hour</option><option value=6h>6 hours</option><option value=24h>24 hours`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading events...`), _tmpl$9 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><p style=color:var(--text-muted)>No events found`), _tmpl$0 = /* @__PURE__ */ template(`<div class=space-y-4>`), _tmpl$1 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading grouped events...`), _tmpl$10 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><p style=color:var(--text-muted)>No grouped events found`), _tmpl$11 = /* @__PURE__ */ template(`<div class=space-y-6>`), _tmpl$12 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading log errors...`), _tmpl$13 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><p style=color:var(--text-muted)>No log errors found`), _tmpl$14 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"style=minHeight:100vh;background:var(--bg-primary)><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>Event Monitor</h1><p style=color:var(--text-secondary)>Production environment events and alerts</p><div class="mt-2 text-xs"style=color:var(--text-muted)><span>📊 Historical analysis & pattern detection | </span><span>⚡ Real-time stream shows events as they happen</span></div></div><div class="flex items-center gap-2 flex-wrap"><div class="relative namespace-dropdown-container"><button type=button class="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg><span></span><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M19 9l-7 7-7-7"></path></svg></button></div><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"style=background:var(--accent-primary);color:white>Refresh</button><label class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer"style=background:var(--bg-secondary)><input type=checkbox class="w-4 h-4"><span style=color:var(--text-secondary)>Auto-refresh</span></label></div></div><div class="flex items-center justify-between flex-wrap gap-4"><div class="flex items-center gap-2 flex-wrap"><div class="flex items-center gap-2"><button>Timeline</button><button>Grouped</button><button>Log Errors</button></div><div class="flex items-center gap-2 ml-4 pl-4 border-l"style=borderColor:var(--border-color)><span class="text-xs font-medium"style=color:var(--text-muted)>Namespace:</span><button>All</button></div></div><div class="flex items-center gap-2"><select class="px-3 py-2 rounded-lg text-sm border"style=background:var(--bg-secondary);color:var(--text-primary)><option value=all>All Severities</option><option value=critical>Critical</option><option value=high>High</option><option value=medium>Medium</option><option value=low>Low</option><option value=info>Info</option></select><select class="px-3 py-2 rounded-lg text-sm border"style=background:var(--bg-secondary);color:var(--text-primary)><option value=all>All Types</option><option value=infrastructure>Infrastructure</option><option value=application>Application</option><option value=security>Security</option></select></div></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class=lg:col-span-2></div><div class=lg:col-span-1>`), _tmpl$15 = /* @__PURE__ */ template(`<label class="flex items-center gap-2 p-2 hover:bg-opacity-50 cursor-pointer"><input type=checkbox class="w-4 h-4 rounded"style=accentColor:var(--accent-color)><span class=text-sm style=color:var(--text-primary)>`), _tmpl$16 = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"style=background:var(--accent-color);color:var(--text-primary);opacity:0.8><button class=hover:opacity-70 style=color:var(--text-primary)><svg class="w-3 h-3"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M6 18L18 6M6 6l12 12">`), _tmpl$17 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Total Events</div><div class="text-2xl font-bold"style=color:var(--text-primary)></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Critical</div><div class="text-2xl font-bold"style=color:#ef4444></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>High</div><div class="text-2xl font-bold"style=color:#f59e0b></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Log Errors</div><div class="text-2xl font-bold"style=color:var(--text-primary)>`), _tmpl$18 = /* @__PURE__ */ template(`<button>`), _tmpl$19 = /* @__PURE__ */ template(`<span class="text-xs px-2 py-0.5 rounded"style=background:var(--bg-tertiary);color:var(--text-muted)> similar events grouped`), _tmpl$20 = /* @__PURE__ */ template(`<span>`), _tmpl$21 = /* @__PURE__ */ template(`<div class="card p-4 border-l-4"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-2"><span class="text-sm font-medium"style=color:var(--text-primary)></span></div><p class="text-sm mb-2"style=color:var(--text-secondary)></p><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span></span><span></span><span></span></div></div><div class=text-right><div class="text-sm font-medium"style=color:var(--text-primary)>x</div><div class=text-xs style=color:var(--text-muted)>`), _tmpl$22 = /* @__PURE__ */ template(`<div class="card p-4"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold"style=color:var(--text-primary)></h3><span class="px-3 py-1 rounded-full text-sm"style=background:var(--bg-secondary);color:var(--text-secondary)> events</span></div><div class=space-y-2>`), _tmpl$23 = /* @__PURE__ */ template(`<div class="p-3 rounded border-l-4"style=background:var(--bg-secondary)><div class="flex items-center gap-2 mb-1"><span class="text-sm font-medium"style=color:var(--text-primary)></span></div><p class=text-xs style=color:var(--text-secondary)>`), _tmpl$24 = /* @__PURE__ */ template(`<div class="card p-4 border-l-4"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-2"><span class="px-2 py-1 rounded text-xs font-medium">HTTP </span><span class="text-sm font-medium"style=color:var(--text-primary)> </span></div><p class="text-sm mb-2"style=color:var(--text-secondary)></p><div class="flex items-center gap-4 text-xs"style=color:var(--text-muted)><span>Pod: </span><span>Container: </span><span></span><span></span></div></div><div class=text-right><div class=text-xs style=color:var(--text-muted)>`);
const MonitoredEvents = () => {
  const [viewMode, setViewMode] = createSignal("timeline");
  const [severityFilter, setSeverityFilter] = createSignal("all");
  const [typeFilter, setTypeFilter] = createSignal("all");
  const [groupPeriod, setGroupPeriod] = createSignal("1h");
  const [events, setEvents] = createSignal([]);
  const [logErrors, setLogErrors] = createSignal([]);
  const [stats, setStats] = createSignal(null);
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [selectedNamespaces, setSelectedNamespaces] = createSignal([]);
  const [namespaceDropdownOpen, setNamespaceDropdownOpen] = createSignal(false);
  const [namespaceSearch, setNamespaceSearch] = createSignal("");
  const [namespacesData] = createResource(async () => {
    try {
      return await api.getNamespaceNames();
    } catch (err) {
      console.error("[MonitoredEvents] Failed to fetch namespaces:", err);
      return [];
    }
  });
  const filteredNamespaces = createMemo(() => {
    const namespaces = namespacesData() || [];
    const search = namespaceSearch().toLowerCase();
    if (!search) return namespaces;
    return namespaces.filter((ns) => ns.toLowerCase().includes(search));
  });
  const toggleNamespace = (ns) => {
    const current = selectedNamespaces();
    if (current.includes(ns)) {
      setSelectedNamespaces(current.filter((n) => n !== ns));
    } else {
      setSelectedNamespaces([...current, ns]);
    }
  };
  const selectAllNamespaces = () => {
    const all = namespacesData() || [];
    setSelectedNamespaces([...all]);
  };
  const clearNamespaces = () => {
    setSelectedNamespaces([]);
  };
  const [eventsData, {
    refetch: refetchEvents
  }] = createResource(() => ({
    namespaces: selectedNamespaces(),
    severity: severityFilter(),
    type: typeFilter(),
    context: currentContext(),
    refresh: refreshTrigger()
  }), async ({
    namespaces,
    severity,
    type
  }) => {
    try {
      const filters = {
        limit: 500
      };
      if (namespaces.length === 1) {
        filters.namespace = namespaces[0];
      }
      if (severity !== "all") {
        filters.severity = severity;
      }
      if (type !== "all") {
        filters.type = type;
      }
      const response = await api.getMonitoredEvents(filters);
      let events2 = response?.events || [];
      if (namespaces.length > 1) {
        events2 = events2.filter((e) => namespaces.includes(e.namespace || ""));
      } else if (namespaces.length === 0) {
      }
      return events2;
    } catch (err) {
      console.error("[MonitoredEvents] Failed to fetch events:", err);
      return [];
    }
  });
  const [errorsData, {
    refetch: refetchErrors
  }] = createResource(() => ({
    namespaces: selectedNamespaces(),
    context: currentContext(),
    refresh: refreshTrigger()
  }), async ({
    namespaces
  }) => {
    try {
      const filters = {
        limit: 200,
        critical_only: false
      };
      if (namespaces.length === 1) {
        filters.namespace = namespaces[0];
      }
      const response = await api.getLogErrors(filters);
      let errors = response?.errors || [];
      if (namespaces.length > 1) {
        errors = errors.filter((e) => namespaces.includes(e.namespace || ""));
      }
      return errors;
    } catch (err) {
      console.error("[MonitoredEvents] Failed to fetch log errors:", err);
      return [];
    }
  });
  const [statsData, {
    refetch: refetchStats
  }] = createResource(async () => {
    try {
      return await api.getEventStats();
    } catch (err) {
      console.error("[MonitoredEvents] Failed to fetch stats:", err);
      return null;
    }
  });
  const [groupedData, {
    refetch: refetchGrouped
  }] = createResource(() => groupPeriod(), async (period) => {
    try {
      const response = await api.getGroupedEvents(period);
      return response?.groups || [];
    } catch (err) {
      console.error("[MonitoredEvents] Failed to fetch grouped events:", err);
      return [];
    }
  });
  createMemo(() => {
    const data = eventsData();
    if (data && Array.isArray(data)) {
      setEvents(data);
    } else if (!eventsData.loading && !eventsData.error) {
      setEvents([]);
    }
  });
  createMemo(() => {
    const data = errorsData();
    console.log("[MonitoredEvents] errorsData:", {
      data,
      loading: errorsData.loading,
      error: errorsData.error,
      isArray: Array.isArray(data),
      length: data?.length
    });
    if (data && Array.isArray(data)) {
      console.log("[MonitoredEvents] Setting logErrors:", data.length);
      setLogErrors(data);
    } else if (!errorsData.loading && !errorsData.error) {
      console.log("[MonitoredEvents] No data, setting empty array");
      setLogErrors([]);
    }
  });
  createMemo(() => {
    const data = statsData();
    if (data) {
      setStats(data);
    }
  });
  const filteredLogErrors = createMemo(() => {
    const errors = logErrors() || [];
    const filtered = errors.filter((e) => e.status_code > 0);
    console.log("[MonitoredEvents] Filtered log errors:", {
      total: errors.length,
      filtered: filtered.length
    });
    return filtered;
  });
  let refreshInterval = null;
  onMount(() => {
    if (autoRefresh()) {
      refreshInterval = window.setInterval(() => {
        refetchEvents();
        refetchErrors();
        refetchStats();
        if (viewMode() === "grouped") {
          refetchGrouped();
        }
      }, 3e4);
    }
  });
  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  createEffect(() => {
    const filter = getEventFilter();
    if (filter) {
      if (filter.namespace) {
        setSelectedNamespaces([filter.namespace]);
      }
      setTimeout(() => clearEventFilter(), 1e3);
    }
    const incidentNamespace = sessionStorage.getItem("kubegraf-event-filter-namespace");
    if (incidentNamespace && selectedNamespaces().length === 0) {
      setSelectedNamespaces([incidentNamespace]);
    }
  });
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === "monitored_event" && autoRefresh()) {
        const newEvent = msg.data;
        const selected = selectedNamespaces();
        if (selected.length === 0 || selected.includes(newEvent.namespace || "")) {
          setEvents((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            return [newEvent, ...current].slice(0, 500);
          });
          refetchStats();
        }
      }
    });
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!target.closest(".namespace-dropdown-container")) {
        setNamespaceDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener("click", handleClickOutside);
    };
  });
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "medium":
        return "#3b82f6";
      case "low":
        return "#6b7280";
      case "info":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };
  const getSeverityBadge = (severity) => {
    const color = getSeverityColor(severity);
    return (() => {
      var _el$ = _tmpl$();
      setStyleProperty(_el$, "background", `${color}20`);
      setStyleProperty(_el$, "color", color);
      setStyleProperty(_el$, "border", `1px solid ${color}40`);
      insert(_el$, () => severity.toUpperCase());
      return _el$;
    })();
  };
  const formatTime = (timeStr) => {
    if (!timeStr) return "Unknown";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString();
  };
  const formatRelativeTime = (timeStr) => {
    if (!timeStr) return "Unknown";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "Unknown";
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 6e4) return "Just now";
    if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
    if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
    return `${Math.floor(diff / 864e5)}d ago`;
  };
  const filteredEvents = createMemo(() => {
    let evts = events();
    if (!Array.isArray(evts)) {
      evts = [];
    }
    evts = evts.map((e) => ({
      ...e,
      severity: escalateSeverity(e)
    }));
    const severity = severityFilter();
    if (severity !== "all") {
      evts = evts.filter((e) => e.severity === severity);
    }
    const type = typeFilter();
    if (type !== "all") {
      evts = evts.filter((e) => e.type === type);
    }
    const namespaces = selectedNamespaces();
    if (namespaces.length > 0) {
      evts = evts.filter((e) => namespaces.includes(e.namespace || ""));
    }
    const eventFilter = getEventFilter();
    if (eventFilter) {
      evts = evts.filter((e) => matchesEventFilter(e.resource, e.namespace || "", e.type));
    }
    const deduplicated = deduplicateEvents(evts, 5);
    return deduplicated;
  });
  return (() => {
    var _el$2 = _tmpl$14(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling; _el$6.nextSibling; var _el$8 = _el$4.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$21 = _el$9.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.firstChild; _el$23.nextSibling; var _el$28 = _el$3.nextSibling, _el$29 = _el$28.firstChild, _el$30 = _el$29.firstChild, _el$31 = _el$30.firstChild, _el$32 = _el$31.nextSibling, _el$33 = _el$32.nextSibling, _el$34 = _el$30.nextSibling, _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$41 = _el$29.nextSibling, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$45 = _el$28.nextSibling, _el$46 = _el$45.firstChild, _el$65 = _el$46.nextSibling;
    _el$0.$$click = (e) => {
      e.stopPropagation();
      setNamespaceDropdownOpen(!namespaceDropdownOpen());
    };
    insert(_el$10, (() => {
      var _c$ = memo(() => selectedNamespaces().length === 0);
      return () => _c$() ? "All Namespaces" : memo(() => selectedNamespaces().length === 1)() ? selectedNamespaces()[0] : `${selectedNamespaces().length} namespaces`;
    })());
    insert(_el$9, createComponent(Show, {
      get when() {
        return namespaceDropdownOpen();
      },
      get children() {
        var _el$11 = _tmpl$4(), _el$12 = _el$11.firstChild, _el$13 = _el$12.firstChild, _el$14 = _el$12.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$14.nextSibling;
        _el$11.$$click = (e) => e.stopPropagation();
        _el$13.$$input = (e) => setNamespaceSearch(e.currentTarget.value);
        _el$15.$$click = selectAllNamespaces;
        _el$16.$$click = clearNamespaces;
        insert(_el$17, createComponent(Show, {
          get when() {
            return filteredNamespaces().length === 0;
          },
          get children() {
            return _tmpl$2();
          }
        }), null);
        insert(_el$17, createComponent(For, {
          get each() {
            return filteredNamespaces();
          },
          children: (ns) => (() => {
            var _el$66 = _tmpl$15(), _el$67 = _el$66.firstChild, _el$68 = _el$67.nextSibling;
            _el$67.addEventListener("change", () => toggleNamespace(ns));
            insert(_el$68, ns);
            createRenderEffect((_p$) => {
              var _v$5 = selectedNamespaces().includes(ns) ? "var(--accent-color)" : "transparent", _v$6 = selectedNamespaces().includes(ns) ? "0.1" : "0";
              _v$5 !== _p$.e && setStyleProperty(_el$66, "background", _p$.e = _v$5);
              _v$6 !== _p$.t && setStyleProperty(_el$66, "--tw-bg-opacity", _p$.t = _v$6);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            createRenderEffect(() => _el$67.checked = selectedNamespaces().includes(ns));
            return _el$66;
          })()
        }), null);
        insert(_el$11, createComponent(Show, {
          get when() {
            return selectedNamespaces().length > 0;
          },
          get children() {
            var _el$19 = _tmpl$3(), _el$20 = _el$19.firstChild;
            insert(_el$19, () => selectedNamespaces().length, _el$20);
            return _el$19;
          }
        }), null);
        createRenderEffect(() => _el$13.value = namespaceSearch());
        return _el$11;
      }
    }), null);
    _el$21.$$click = () => {
      refetchEvents();
      refetchErrors();
      refetchStats();
      if (viewMode() === "grouped") refetchGrouped();
    };
    _el$23.addEventListener("change", (e) => setAutoRefresh(e.currentTarget.checked));
    insert(_el$2, createComponent(Show, {
      get when() {
        return selectedNamespaces().length > 0;
      },
      get children() {
        var _el$25 = _tmpl$5(), _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling;
        insert(_el$25, createComponent(For, {
          get each() {
            return selectedNamespaces();
          },
          children: (ns) => (() => {
            var _el$69 = _tmpl$16(), _el$70 = _el$69.firstChild;
            insert(_el$69, ns, _el$70);
            _el$70.$$click = () => toggleNamespace(ns);
            return _el$69;
          })()
        }), _el$27);
        _el$27.$$click = clearNamespaces;
        return _el$25;
      }
    }), _el$28);
    insert(_el$2, createComponent(Show, {
      get when() {
        return stats();
      },
      children: (statsData2) => {
        const stats2 = statsData2();
        const bySeverity = stats2?.by_severity || {};
        return (() => {
          var _el$71 = _tmpl$17(), _el$72 = _el$71.firstChild, _el$73 = _el$72.firstChild, _el$74 = _el$73.nextSibling, _el$75 = _el$72.nextSibling, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$75.nextSibling, _el$79 = _el$78.firstChild, _el$80 = _el$79.nextSibling, _el$81 = _el$78.nextSibling, _el$82 = _el$81.firstChild, _el$83 = _el$82.nextSibling;
          insert(_el$74, () => stats2?.total_events || 0);
          insert(_el$77, () => bySeverity["critical"] || 0);
          insert(_el$80, () => bySeverity["high"] || 0);
          insert(_el$83, () => stats2?.total_errors || 0);
          return _el$71;
        })();
      }
    }), _el$28);
    _el$31.$$click = () => setViewMode("timeline");
    _el$32.$$click = () => setViewMode("grouped");
    _el$33.$$click = () => setViewMode("errors");
    _el$36.$$click = () => {
      clearNamespaces();
    };
    insert(_el$34, createComponent(For, {
      get each() {
        return namespacesData()?.slice(0, 8) || [];
      },
      children: (ns) => (() => {
        var _el$84 = _tmpl$18();
        _el$84.$$click = () => {
          if (selectedNamespaces().includes(ns)) {
            setSelectedNamespaces(selectedNamespaces().filter((n) => n !== ns));
          } else {
            setSelectedNamespaces([ns]);
          }
        };
        setAttribute(_el$84, "title", `View events for namespace: ${ns}`);
        insert(_el$84, ns);
        createRenderEffect(() => className(_el$84, `px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedNamespaces().includes(ns) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`));
        return _el$84;
      })()
    }), null);
    insert(_el$34, createComponent(Show, {
      get when() {
        return (namespacesData()?.length || 0) > 8;
      },
      get children() {
        var _el$37 = _tmpl$6(), _el$38 = _el$37.firstChild, _el$40 = _el$38.nextSibling; _el$40.nextSibling;
        _el$37.$$click = () => setNamespaceDropdownOpen(true);
        insert(_el$37, () => (namespacesData()?.length || 0) - 8, _el$40);
        return _el$37;
      }
    }), null);
    _el$42.addEventListener("change", (e) => setSeverityFilter(e.currentTarget.value));
    _el$43.addEventListener("change", (e) => setTypeFilter(e.currentTarget.value));
    insert(_el$41, createComponent(Show, {
      get when() {
        return viewMode() === "grouped";
      },
      get children() {
        var _el$44 = _tmpl$7();
        _el$44.addEventListener("change", (e) => setGroupPeriod(e.currentTarget.value));
        createRenderEffect(() => _el$44.value = groupPeriod());
        return _el$44;
      }
    }), null);
    insert(_el$46, createComponent(Show, {
      get when() {
        return viewMode() === "timeline";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return eventsData.loading;
          },
          get children() {
            var _el$47 = _tmpl$8(), _el$48 = _el$47.firstChild; _el$48.nextSibling;
            return _el$47;
          }
        }), createComponent(Show, {
          get when() {
            return !eventsData.loading;
          },
          get children() {
            var _el$50 = _tmpl$0();
            insert(_el$50, createComponent(For, {
              get each() {
                return filteredEvents();
              },
              children: (event) => (() => {
                var _el$85 = _tmpl$21(), _el$86 = _el$85.firstChild, _el$87 = _el$86.firstChild, _el$88 = _el$87.firstChild, _el$89 = _el$88.firstChild, _el$92 = _el$88.nextSibling, _el$93 = _el$92.nextSibling, _el$94 = _el$93.firstChild, _el$95 = _el$94.nextSibling, _el$98 = _el$95.nextSibling, _el$99 = _el$87.nextSibling, _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild, _el$102 = _el$100.nextSibling;
                insert(_el$88, createComponent(EventSeverityBadge, {
                  get severity() {
                    return event.severity;
                  },
                  get count() {
                    return event.duplicateCount || event.count;
                  },
                  showCount: true
                }), _el$89);
                insert(_el$89, () => event.title);
                insert(_el$88, createComponent(Show, {
                  get when() {
                    return memo(() => !!event.duplicateCount)() && event.duplicateCount > 1;
                  },
                  get children() {
                    var _el$90 = _tmpl$19(), _el$91 = _el$90.firstChild;
                    insert(_el$90, () => event.duplicateCount || event.count, _el$91);
                    return _el$90;
                  }
                }), null);
                insert(_el$92, () => event.description);
                insert(_el$94, () => event.resource);
                insert(_el$95, () => event.namespace || "cluster-wide");
                insert(_el$93, createComponent(Show, {
                  get when() {
                    return memo(() => !!(event.firstSeen && event.lastSeen))() && event.firstSeen !== event.lastSeen;
                  },
                  get children() {
                    var _el$96 = _tmpl$20();
                    insert(_el$96, () => formatRelativeTime(event.lastSeen || event.timestamp));
                    createRenderEffect(() => setAttribute(_el$96, "title", `First: ${formatTime(event.firstSeen)}, Last: ${formatTime(event.lastSeen)}`));
                    return _el$96;
                  }
                }), _el$98);
                insert(_el$93, createComponent(Show, {
                  get when() {
                    return !event.firstSeen || event.firstSeen === event.lastSeen;
                  },
                  get children() {
                    var _el$97 = _tmpl$20();
                    insert(_el$97, () => formatRelativeTime(event.timestamp));
                    return _el$97;
                  }
                }), _el$98);
                insert(_el$98, () => event.source);
                insert(_el$100, () => event.duplicateCount || event.count, _el$101);
                insert(_el$102, () => formatTime(event.timestamp));
                createRenderEffect((_$p) => setStyleProperty(_el$85, "border-left-color", getSeverityColor(event.severity)));
                return _el$85;
              })()
            }), null);
            insert(_el$50, createComponent(Show, {
              get when() {
                return filteredEvents().length === 0;
              },
              get children() {
                var _el$51 = _tmpl$9(); _el$51.firstChild;
                return _el$51;
              }
            }), null);
            return _el$50;
          }
        })];
      }
    }), null);
    insert(_el$46, createComponent(Show, {
      get when() {
        return viewMode() === "grouped";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return groupedData.loading;
          },
          get children() {
            var _el$53 = _tmpl$1(), _el$54 = _el$53.firstChild; _el$54.nextSibling;
            return _el$53;
          }
        }), createComponent(Show, {
          get when() {
            return !groupedData.loading;
          },
          get children() {
            var _el$56 = _tmpl$11();
            insert(_el$56, createComponent(For, {
              get each() {
                return groupedData() || [];
              },
              children: (group) => (() => {
                var _el$103 = _tmpl$22(), _el$104 = _el$103.firstChild, _el$105 = _el$104.firstChild, _el$106 = _el$105.nextSibling, _el$107 = _el$106.firstChild, _el$108 = _el$104.nextSibling;
                insert(_el$105, () => new Date(group.time).toLocaleString());
                insert(_el$106, () => group.count, _el$107);
                insert(_el$108, createComponent(For, {
                  get each() {
                    return group.events;
                  },
                  children: (event) => (() => {
                    var _el$109 = _tmpl$23(), _el$110 = _el$109.firstChild, _el$111 = _el$110.firstChild, _el$112 = _el$110.nextSibling;
                    insert(_el$110, () => getSeverityBadge(event.severity), _el$111);
                    insert(_el$111, () => event.title);
                    insert(_el$112, () => event.resource);
                    createRenderEffect((_$p) => setStyleProperty(_el$109, "border-left-color", getSeverityColor(event.severity)));
                    return _el$109;
                  })()
                }));
                return _el$103;
              })()
            }), null);
            insert(_el$56, createComponent(Show, {
              get when() {
                return !groupedData() || groupedData()?.length === 0;
              },
              get children() {
                var _el$57 = _tmpl$10(); _el$57.firstChild;
                return _el$57;
              }
            }), null);
            return _el$56;
          }
        })];
      }
    }), null);
    insert(_el$46, createComponent(Show, {
      get when() {
        return viewMode() === "errors";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return errorsData.loading;
          },
          get children() {
            var _el$59 = _tmpl$12(), _el$60 = _el$59.firstChild; _el$60.nextSibling;
            return _el$59;
          }
        }), createComponent(Show, {
          get when() {
            return !errorsData.loading;
          },
          get children() {
            var _el$62 = _tmpl$0();
            insert(_el$62, createComponent(For, {
              get each() {
                return filteredLogErrors();
              },
              children: (error) => (() => {
                var _el$113 = _tmpl$24(), _el$114 = _el$113.firstChild, _el$115 = _el$114.firstChild, _el$116 = _el$115.firstChild, _el$117 = _el$116.firstChild; _el$117.firstChild; var _el$119 = _el$117.nextSibling, _el$120 = _el$119.firstChild, _el$121 = _el$116.nextSibling, _el$122 = _el$121.nextSibling, _el$123 = _el$122.firstChild; _el$123.firstChild; var _el$125 = _el$123.nextSibling; _el$125.firstChild; var _el$127 = _el$125.nextSibling, _el$128 = _el$127.nextSibling, _el$129 = _el$115.nextSibling, _el$130 = _el$129.firstChild;
                insert(_el$117, () => error.status_code, null);
                insert(_el$119, () => error.method, _el$120);
                insert(_el$119, () => error.path, null);
                insert(_el$121, () => error.message);
                insert(_el$123, () => error.pod, null);
                insert(_el$125, () => error.container, null);
                insert(_el$127, () => error.namespace);
                insert(_el$128, () => formatRelativeTime(error.timestamp));
                insert(_el$130, () => formatTime(error.timestamp));
                createRenderEffect((_p$) => {
                  var _v$7 = error.status_code >= 500 ? "#ef4444" : "#f59e0b", _v$8 = error.status_code >= 500 ? "#ef444420" : "#f59e0b20", _v$9 = error.status_code >= 500 ? "#ef4444" : "#f59e0b";
                  _v$7 !== _p$.e && setStyleProperty(_el$113, "border-left-color", _p$.e = _v$7);
                  _v$8 !== _p$.t && setStyleProperty(_el$117, "background", _p$.t = _v$8);
                  _v$9 !== _p$.a && setStyleProperty(_el$117, "color", _p$.a = _v$9);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0
                });
                return _el$113;
              })()
            }), null);
            insert(_el$62, createComponent(Show, {
              get when() {
                return filteredLogErrors().length === 0;
              },
              get children() {
                var _el$63 = _tmpl$13(); _el$63.firstChild;
                return _el$63;
              }
            }), null);
            return _el$62;
          }
        })];
      }
    }), null);
    insert(_el$65, createComponent(RealtimeEventsPanel, {
      maxEvents: 50,
      showNamespace: true
    }));
    createRenderEffect((_p$) => {
      var _v$ = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode() === "timeline" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`, _v$2 = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode() === "grouped" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`, _v$3 = `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode() === "errors" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`, _v$4 = `px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedNamespaces().length === 0 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`;
      _v$ !== _p$.e && className(_el$31, _p$.e = _v$);
      _v$2 !== _p$.t && className(_el$32, _p$.t = _v$2);
      _v$3 !== _p$.a && className(_el$33, _p$.a = _v$3);
      _v$4 !== _p$.o && className(_el$36, _p$.o = _v$4);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0
    });
    createRenderEffect(() => _el$23.checked = autoRefresh());
    createRenderEffect(() => _el$42.value = severityFilter());
    createRenderEffect(() => _el$43.value = typeFilter());
    return _el$2;
  })();
};
delegateEvents(["click", "input"]);

export { MonitoredEvents as default };
//# sourceMappingURL=MonitoredEvents-CegS_pSJ.js.map
