import { c as createSignal, j as createResource, k as api, P as namespace, n as createEffect, o as onMount, W as wsService, a as createMemo, t as template, i as insert, d as createComponent, S as Show, F as For, f as createRenderEffect, g as className, h as setStyleProperty, e as setAttribute, v as delegateEvents } from './index-NnaOo1cf.js';

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=currentColor viewBox="0 0 24 24"><path d="M8 5v14l11-7z">`), _tmpl$2 = /* @__PURE__ */ template(`<div class=overflow-y-auto style="max-height:calc(100vh - 320px)">`), _tmpl$3 = /* @__PURE__ */ template(`<div class=space-y-4><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Events</h1><p style=color:var(--text-secondary)>Real-time cluster events stream</p></div><div class="flex items-center gap-3"><button></button><button class=icon-btn title="Refresh Events"style=background:var(--bg-secondary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button></div></div><div class="flex flex-wrap items-center gap-3"><div><span></span><span class=text-sm style=color:var(--text-secondary)></span><span class="text-xl font-bold"style=color:var(--text-primary)></span><span class=text-xs style=color:var(--text-muted)>new</span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--accent-primary)"><span class=text-sm style=color:var(--text-secondary)>Total</span><span class="text-xl font-bold"style=color:var(--text-primary)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--success-color)"><span class=text-sm style=color:var(--text-secondary)>Normal</span><span class="text-xl font-bold"style=color:var(--success-color)></span></div><div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"style="border-left:3px solid var(--warning-color)"><span class=text-sm style=color:var(--text-secondary)>Warning</span><span class="text-xl font-bold"style=color:var(--warning-color)></span></div><div class=flex-1></div><input type=text placeholder="Search events..."class="px-3 py-2 rounded-lg text-sm w-64"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value=all>All Types</option><option value=Normal>Normal</option><option value=Warning>Warning</option></select></div><div class="card overflow-hidden">`), _tmpl$4 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=currentColor viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z">`), _tmpl$5 = /* @__PURE__ */ template(`<div class="p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Loading events...`), _tmpl$6 = /* @__PURE__ */ template(`<div class="p-8 text-center"style=color:var(--text-muted)>No events found`), _tmpl$7 = /* @__PURE__ */ template(`<span class="text-xs px-2 py-0.5 rounded"style=background:var(--bg-tertiary);color:var(--text-secondary)>`), _tmpl$8 = /* @__PURE__ */ template(`<span class="px-2 py-0.5 rounded"style=background:var(--bg-tertiary)>x`), _tmpl$9 = /* @__PURE__ */ template(`<span>Source: `), _tmpl$0 = /* @__PURE__ */ template(`<div style=border-color:var(--border-color)><div class="flex items-start gap-4"><div class="flex-shrink-0 p-2 rounded-lg"style=background:var(--bg-tertiary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2></path></svg></div><div class="flex-1 min-w-0"><div class="flex items-center gap-2 flex-wrap"><span></span><span class="px-2 py-0.5 rounded text-xs"style=background:var(--bg-tertiary);color:var(--accent-primary)></span><span class=text-xs style=color:var(--text-muted)>/</span></div><p class="mt-1 text-sm"style=color:var(--text-primary)></p><div class="mt-2 flex items-center gap-4 text-xs"style=color:var(--text-muted)><span>`);
const Events = () => {
  const [events, setEvents] = createSignal([]);
  const [filter, setFilter] = createSignal("all");
  const [search, setSearch] = createSignal("");
  const [paused, setPaused] = createSignal(false);
  const [liveEvents, setLiveEvents] = createSignal([]);
  const [fetchTrigger, setFetchTrigger] = createSignal(0);
  const [initialEvents, {
    refetch
  }] = createResource(() => ({
    ns: namespace(),
    trigger: fetchTrigger()
  }), async ({
    ns
  }) => {
    try {
      console.log("[Events] Fetching events for namespace:", ns);
      const nsParam = ns === "_all" || ns === "All Namespaces" || !ns ? void 0 : ns;
      const response = await api.getEvents(nsParam, 200);
      console.log("[Events] Received events:", response?.events?.length || 0, "total:", response?.total || 0);
      return response?.events || [];
    } catch (err) {
      console.error("[Events] Failed to fetch events:", err);
      return [];
    }
  });
  createEffect(() => {
    const initial = initialEvents();
    const loading = initialEvents.loading;
    const error = initialEvents.error;
    console.log("[Events] createEffect triggered:", {
      hasInitial: !!initial,
      initialLength: initial?.length || 0,
      loading,
      error: error ? String(error) : null
    });
    if (initial && Array.isArray(initial)) {
      if (initial.length > 0) {
        console.log("[Events] Setting events:", initial.length);
        setEvents(initial);
      } else {
        console.log("[Events] Initial events array is empty");
      }
    } else if (!loading && error) {
      console.error("[Events] Error loading events:", error);
    } else if (!loading && !initial) {
      console.log("[Events] No initial events data");
    }
  });
  onMount(() => {
    setFetchTrigger((prev) => prev + 1);
  });
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === "event" && !paused()) {
        const newEvent = msg.data;
        const ns = namespace();
        if (ns && ns !== "All Namespaces" && newEvent.namespace !== ns) {
          return;
        }
        setLiveEvents((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          return [newEvent, ...current].slice(0, 50);
        });
        setEvents((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          return [newEvent, ...current].slice(0, 500);
        });
      }
    });
    return () => unsubscribe();
  });
  const filteredEvents = createMemo(() => {
    let all = events();
    if (!Array.isArray(all)) {
      console.warn("[Events] events() is not an array:", typeof all, all);
      all = [];
    }
    const filterType = filter();
    const query = search().toLowerCase();
    console.log("[Events] filteredEvents memo:", {
      totalEvents: all.length,
      filterType,
      query,
      hasQuery: !!query
    });
    if (filterType !== "all") {
      all = all.filter((e) => e.type === filterType);
    }
    if (query) {
      all = all.filter((e) => e.message?.toLowerCase().includes(query) || e.object?.toLowerCase().includes(query) || e.reason?.toLowerCase().includes(query) || e.namespace?.toLowerCase().includes(query));
    }
    console.log("[Events] Filtered result:", all.length);
    return all;
  });
  const eventCounts = createMemo(() => {
    const all = events();
    return {
      total: all.length,
      normal: all.filter((e) => e.type === "Normal").length,
      warning: all.filter((e) => e.type === "Warning").length
    };
  });
  const formatTime = (timeStr) => {
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
  const getKindIcon = (kind) => {
    switch (kind?.toLowerCase()) {
      case "pod":
        return "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4";
      case "deployment":
        return "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10";
      case "service":
        return "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9";
      case "node":
        return "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01";
      case "replicaset":
        return "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4";
      default:
        return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
    }
  };
  return (() => {
    var _el$ = _tmpl$3(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$9 = _el$7.nextSibling, _el$0 = _el$2.nextSibling, _el$1 = _el$0.firstChild, _el$10 = _el$1.firstChild, _el$11 = _el$10.nextSibling, _el$12 = _el$11.nextSibling; _el$12.nextSibling; var _el$14 = _el$1.nextSibling, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$14.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$17.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$20.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling, _el$26 = _el$0.nextSibling;
    _el$7.$$click = () => setPaused(!paused());
    insert(_el$7, createComponent(Show, {
      get when() {
        return paused();
      },
      get fallback() {
        return [_tmpl$4(), "Pause"];
      },
      get children() {
        return [_tmpl$(), "Resume"];
      }
    }));
    _el$9.$$click = () => refetch();
    insert(_el$11, () => paused() ? "Paused" : "Live");
    insert(_el$12, () => liveEvents().length);
    _el$14.$$click = () => setFilter("all");
    insert(_el$16, () => eventCounts().total);
    _el$17.$$click = () => setFilter("Normal");
    insert(_el$19, () => eventCounts().normal);
    _el$20.$$click = () => setFilter("Warning");
    insert(_el$22, () => eventCounts().warning);
    _el$24.$$input = (e) => setSearch(e.currentTarget.value);
    _el$25.addEventListener("change", (e) => setFilter(e.currentTarget.value));
    insert(_el$26, createComponent(Show, {
      get when() {
        return !initialEvents.loading;
      },
      get fallback() {
        return (() => {
          var _el$29 = _tmpl$5(), _el$30 = _el$29.firstChild; _el$30.nextSibling;
          return _el$29;
        })();
      },
      get children() {
        var _el$27 = _tmpl$2();
        insert(_el$27, createComponent(For, {
          get each() {
            return filteredEvents();
          },
          get fallback() {
            return _tmpl$6();
          },
          children: (event, index) => (() => {
            var _el$33 = _tmpl$0(), _el$34 = _el$33.firstChild, _el$35 = _el$34.firstChild, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$35.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$39.firstChild, _el$41 = _el$40.nextSibling, _el$42 = _el$41.nextSibling, _el$43 = _el$42.firstChild, _el$45 = _el$39.nextSibling, _el$46 = _el$45.nextSibling, _el$47 = _el$46.firstChild;
            insert(_el$40, () => event.type);
            insert(_el$41, () => event.reason);
            insert(_el$42, () => event.kind, _el$43);
            insert(_el$42, () => event.object, null);
            insert(_el$39, createComponent(Show, {
              get when() {
                return event.namespace;
              },
              get children() {
                var _el$44 = _tmpl$7();
                insert(_el$44, () => event.namespace);
                return _el$44;
              }
            }), null);
            insert(_el$45, () => event.message);
            insert(_el$47, () => formatTime(event.time));
            insert(_el$46, createComponent(Show, {
              get when() {
                return event.count > 1;
              },
              get children() {
                var _el$48 = _tmpl$8(); _el$48.firstChild;
                insert(_el$48, () => event.count, null);
                return _el$48;
              }
            }), null);
            insert(_el$46, createComponent(Show, {
              get when() {
                return event.source;
              },
              get children() {
                var _el$50 = _tmpl$9(); _el$50.firstChild;
                insert(_el$50, () => event.source, null);
                return _el$50;
              }
            }), null);
            createRenderEffect((_p$) => {
              var _v$6 = `p-4 border-b transition-all hover:bg-white/5 ${index() < liveEvents().length && !paused() ? "animate-slide-in" : ""}`, _v$7 = `4px solid ${event.type === "Warning" ? "var(--warning-color)" : "var(--success-color)"}`, _v$8 = event.type === "Warning" ? "var(--warning-color)" : "var(--accent-primary)", _v$9 = getKindIcon(event.kind), _v$0 = `px-2 py-0.5 rounded text-xs font-medium ${event.type === "Warning" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`;
              _v$6 !== _p$.e && className(_el$33, _p$.e = _v$6);
              _v$7 !== _p$.t && setStyleProperty(_el$33, "border-left", _p$.t = _v$7);
              _v$8 !== _p$.a && setStyleProperty(_el$36, "color", _p$.a = _v$8);
              _v$9 !== _p$.o && setAttribute(_el$37, "d", _p$.o = _v$9);
              _v$0 !== _p$.i && className(_el$40, _p$.i = _v$0);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0,
              o: void 0,
              i: void 0
            });
            return _el$33;
          })()
        }));
        return _el$27;
      }
    }));
    createRenderEffect((_p$) => {
      var _v$ = `px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${paused() ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40" : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40"}`, _v$2 = paused() ? "var(--success-color)" : "var(--warning-color)", _v$3 = `card px-4 py-2 flex items-center gap-2 ${!paused() ? "animate-pulse" : ""}`, _v$4 = `3px solid ${paused() ? "var(--warning-color)" : "var(--success-color)"}`, _v$5 = `w-3 h-3 rounded-full ${paused() ? "bg-amber-500" : "bg-green-500 animate-pulse"}`;
      _v$ !== _p$.e && className(_el$7, _p$.e = _v$);
      _v$2 !== _p$.t && setStyleProperty(_el$7, "color", _p$.t = _v$2);
      _v$3 !== _p$.a && className(_el$1, _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$1, "border-left", _p$.o = _v$4);
      _v$5 !== _p$.i && className(_el$10, _p$.i = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0
    });
    createRenderEffect(() => _el$24.value = search());
    createRenderEffect(() => _el$25.value = filter());
    return _el$;
  })();
};
delegateEvents(["click", "input"]);

export { Events as default };
//# sourceMappingURL=Events-7C31DkFY.js.map
