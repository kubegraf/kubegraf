import { s as setCurrentView, c as createSignal, b as batch, a as createMemo, t as template, i as insert, d as createComponent, S as Show, e as setAttribute, f as createRenderEffect, g as className, m as memo, h as setStyleProperty, j as createResource, k as api, l as currentContext, r as refreshTrigger, n as createEffect, o as onMount, p as nodesResource, F as For, q as style, u as addEventListener, v as delegateEvents } from './index-NnaOo1cf.js';

const securityCheckToCategory = {
  "Security Context Missing": "security",
  "Running as Root": "security",
  "Privileged Containers": "security",
  "No Privileged Containers": "security",
  "Resource Limits Missing": "configuration",
  "Writable Root Filesystem": "security"
};
function navigateToSecurityCheck(checkName, severity) {
  setCurrentView("security");
  const filter = {
    category: securityCheckToCategory[checkName] || "security",
    severity: severity || "critical",
    checkName
  };
  sessionStorage.setItem("securityFilter", JSON.stringify(filter));
  window.dispatchEvent(new CustomEvent("securityFilterChange", { detail: filter }));
}

const MAX_POINTS = 180;
const RECONNECT_DELAYS = [1, 2, 5, 10, 30];
const [points, setPoints] = createSignal([]);
const [latestPoint, setLatestPoint] = createSignal(null);
const [status, setStatus] = createSignal({
  connected: false,
  reconnecting: false,
  source: "unknown",
  error: null
});
let ws = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/metrics`;
}
function connectMetrics() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }
  const url = getWsUrl();
  console.log("[MetricsStore] Connecting to", url);
  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.error("[MetricsStore] Failed to create WebSocket:", err);
    scheduleReconnect();
    return;
  }
  ws.onopen = () => {
    console.log("[MetricsStore] Connected");
    reconnectAttempt = 0;
    batch(() => {
      setStatus({
        connected: true,
        reconnecting: false,
        source: "connecting",
        error: null
      });
    });
  };
  ws.onmessage = (event) => {
    try {
      const data = event.data;
      const messages = data.split("\n").filter((m) => m.trim());
      for (const msgStr of messages) {
        const msg = JSON.parse(msgStr);
        handleMessage(msg);
      }
    } catch (err) {
      console.error("[MetricsStore] Failed to parse message:", err);
    }
  };
  ws.onerror = (error) => {
    console.error("[MetricsStore] WebSocket error:", error);
  };
  ws.onclose = () => {
    console.log("[MetricsStore] Connection closed");
    ws = null;
    setStatus((prev) => ({
      ...prev,
      connected: false,
      reconnecting: true
    }));
    scheduleReconnect();
  };
}
function handleMessage(msg) {
  switch (msg.type) {
    case "snapshot":
      if (Array.isArray(msg.points)) {
        const pts = msg.points.slice(-MAX_POINTS);
        batch(() => {
          setPoints(pts);
          if (pts.length > 0) {
            const latest = pts[pts.length - 1];
            setLatestPoint(latest);
            setStatus({
              connected: true,
              reconnecting: false,
              source: latest.source,
              error: latest.error || null
            });
          }
        });
      }
      break;
    case "point":
      if (msg.point) {
        batch(() => {
          setPoints((prev) => {
            const newPoints = [...prev, msg.point];
            if (newPoints.length > MAX_POINTS) {
              return newPoints.slice(-MAX_POINTS);
            }
            return newPoints;
          });
          setLatestPoint(msg.point);
          setStatus({
            connected: true,
            reconnecting: false,
            source: msg.point.source,
            error: msg.point.error || null
          });
        });
      }
      break;
    case "status":
      setStatus({
        connected: true,
        reconnecting: false,
        source: msg.source || "unavailable",
        error: msg.error || null
      });
      break;
    default:
      console.warn("[MetricsStore] Unknown message type:", msg.type);
  }
}
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)] * 1e3;
  console.log(`[MetricsStore] Reconnecting in ${delay / 1e3}s...`);
  reconnectTimer = setTimeout(() => {
    reconnectAttempt++;
    connectMetrics();
  }, delay);
}
function getRecentPoints(count = 30) {
  const pts = points();
  if (pts.length <= count) {
    return pts;
  }
  return pts.slice(-count);
}
function getCpuSparkline(count = 30) {
  return getRecentPoints(count).map((p) => p.cluster.cpuPct);
}
function getMemSparkline(count = 30) {
  return getRecentPoints(count).map((p) => p.cluster.memPct);
}
function getStatusLevel(pct) {
  if (pct >= 80) return "hot";
  if (pct >= 60) return "moderate";
  return "normal";
}
function getStatusColor(pct) {
  const level = getStatusLevel(pct);
  switch (level) {
    case "hot":
      return "#ef4444";
    case "moderate":
      return "#f59e0b";
    default:
      return "#22c55e";
  }
}
if (typeof window !== "undefined") {
  setTimeout(() => {
    connectMetrics();
  }, 500);
}

var _tmpl$$3 = /* @__PURE__ */ template(`<span class=text-xs style=color:var(--text-muted)>Last `), _tmpl$2$3 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mb-2 px-2"><div class="flex items-center gap-4"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full"style=background:#f59e0b></div><span class=text-xs style=color:var(--text-muted)>CPU</span><span class="text-sm font-semibold"style=color:#f59e0b>%</span></div><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-full"style=background:#3b82f6></div><span class=text-xs style=color:var(--text-muted)>Memory</span><span class="text-sm font-semibold"style=color:#3b82f6>%`), _tmpl$3$3 = /* @__PURE__ */ template(`<svg><circle cx=95 r=1.5 fill=#f59e0b class=animate-pulse></svg>`, false, true, false), _tmpl$4$2 = /* @__PURE__ */ template(`<svg><circle cx=95 r=1.5 fill=#3b82f6 class=animate-pulse></svg>`, false, true, false), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="absolute inset-0 flex items-center justify-center"><span class=text-sm style=color:var(--text-muted)>Waiting for metrics data...`), _tmpl$6$1 = /* @__PURE__ */ template(`<div><svg width=100% preserveAspectRatio=none class=overflow-visible><defs><linearGradient id=cpu-gradient x1=0% y1=0% x2=0% y2=100%><stop offset=0% stop-color=#f59e0b stop-opacity=0.3></stop><stop offset=100% stop-color=#f59e0b stop-opacity=0.05></stop></linearGradient><linearGradient id=mem-gradient x1=0% y1=0% x2=0% y2=100%><stop offset=0% stop-color=#3b82f6 stop-opacity=0.3></stop><stop offset=100% stop-color=#3b82f6 stop-opacity=0.05></stop></linearGradient><filter id=cpu-glow><feGaussianBlur stdDeviation=1 result=blur></feGaussianBlur><feMerge><feMergeNode in=blur></feMergeNode><feMergeNode in=SourceGraphic></feMergeNode></feMerge></filter><filter id=mem-glow><feGaussianBlur stdDeviation=1 result=blur></feGaussianBlur><feMerge><feMergeNode in=blur></feMergeNode><feMergeNode in=SourceGraphic></feMergeNode></feMerge></filter></defs><g opacity=0.15 stroke=currentColor stroke-width=0.2><line x1=5 x2=95></line><line x1=5 x2=95></line><line x1=5 x2=95></line></g><text x=2 font-size=3 fill=currentColor opacity=0.4>75%</text><text x=2 font-size=3 fill=currentColor opacity=0.4>50%</text><text x=2 font-size=3 fill=currentColor opacity=0.4>25%</text><path fill=url(#mem-gradient) class="transition-all duration-500"></path><path fill=url(#cpu-gradient) class="transition-all duration-500"></path><path fill=none stroke=#3b82f6 stroke-width=0.5 stroke-linecap=round stroke-linejoin=round filter=url(#mem-glow) class="transition-all duration-500"></path><path fill=none stroke=#f59e0b stroke-width=0.5 stroke-linecap=round stroke-linejoin=round filter=url(#cpu-glow) class="transition-all duration-500">`);
const CpuMemChart = (props) => {
  const height = props.height || 200;
  const maxPoints = props.maxPoints || 180;
  const showLegend = props.showLegend ?? true;
  const data = createMemo(() => {
    const pts = points();
    if (pts.length > maxPoints) {
      return pts.slice(-maxPoints);
    }
    return pts;
  });
  const createPath = (getData) => {
    const pts = data();
    if (pts.length < 2) return "";
    const width = 100;
    const h = height - 40;
    const padding = 5;
    const xScale = (i) => padding + i / (pts.length - 1) * (width - padding * 2);
    const yScale = (v) => h - Math.min(v, 100) / 100 * (h - padding * 2);
    let path = `M ${xScale(0)} ${yScale(getData(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    return path;
  };
  const createAreaPath = (getData) => {
    const pts = data();
    if (pts.length < 2) return "";
    const width = 100;
    const h = height - 40;
    const padding = 5;
    const xScale = (i) => padding + i / (pts.length - 1) * (width - padding * 2);
    const yScale = (v) => h - Math.min(v, 100) / 100 * (h - padding * 2);
    let path = `M ${xScale(0)} ${h}`;
    path += ` L ${xScale(0)} ${yScale(getData(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${xScale(i)} ${yScale(getData(pts[i]))}`;
    }
    path += ` L ${xScale(pts.length - 1)} ${h}`;
    path += " Z";
    return path;
  };
  const cpuPath = createMemo(() => createPath((p) => p.cluster.cpuPct));
  const memPath = createMemo(() => createPath((p) => p.cluster.memPct));
  const cpuAreaPath = createMemo(() => createAreaPath((p) => p.cluster.cpuPct));
  const memAreaPath = createMemo(() => createAreaPath((p) => p.cluster.memPct));
  const latestCpu = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return 0;
    return pts[pts.length - 1].cluster.cpuPct;
  });
  const latestMem = createMemo(() => {
    const pts = data();
    if (pts.length === 0) return 0;
    return pts[pts.length - 1].cluster.memPct;
  });
  const timeRange = createMemo(() => {
    const pts = data();
    if (pts.length < 2) return "";
    const startTs = pts[0].ts;
    const endTs = pts[pts.length - 1].ts;
    const duration = endTs - startTs;
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m`;
    return `${Math.floor(duration / 3600)}h`;
  });
  return (() => {
    var _el$ = _tmpl$6$1(), _el$14 = _el$.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$15.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.nextSibling, _el$20 = _el$16.nextSibling, _el$21 = _el$20.nextSibling, _el$22 = _el$21.nextSibling, _el$23 = _el$22.nextSibling, _el$24 = _el$23.nextSibling, _el$25 = _el$24.nextSibling, _el$26 = _el$25.nextSibling;
    insert(_el$, createComponent(Show, {
      when: showLegend,
      get children() {
        var _el$2 = _tmpl$2$3(), _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$7 = _el$6.nextSibling, _el$8 = _el$7.firstChild, _el$9 = _el$4.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$10 = _el$1.nextSibling, _el$11 = _el$10.firstChild;
        insert(_el$7, () => latestCpu().toFixed(1), _el$8);
        insert(_el$10, () => latestMem().toFixed(1), _el$11);
        insert(_el$2, createComponent(Show, {
          get when() {
            return timeRange();
          },
          get children() {
            var _el$12 = _tmpl$$3(); _el$12.firstChild;
            insert(_el$12, timeRange, null);
            return _el$12;
          }
        }), null);
        return _el$2;
      }
    }), _el$14);
    setAttribute(_el$14, "height", height);
    setAttribute(_el$14, "viewBox", `0 0 100 ${height}`);
    setAttribute(_el$17, "y1", height * 0.25);
    setAttribute(_el$17, "y2", height * 0.25);
    setAttribute(_el$18, "y1", height * 0.5);
    setAttribute(_el$18, "y2", height * 0.5);
    setAttribute(_el$19, "y1", height * 0.75);
    setAttribute(_el$19, "y2", height * 0.75);
    setAttribute(_el$20, "y", height * 0.25);
    setAttribute(_el$21, "y", height * 0.5);
    setAttribute(_el$22, "y", height * 0.75);
    insert(_el$14, createComponent(Show, {
      get when() {
        return data().length > 0;
      },
      get children() {
        return [(() => {
          var _el$27 = _tmpl$3$3();
          createRenderEffect(() => setAttribute(_el$27, "cy", height - 40 - Math.min(latestCpu(), 100) / 100 * (height - 40 - 10)));
          return _el$27;
        })(), (() => {
          var _el$28 = _tmpl$4$2();
          createRenderEffect(() => setAttribute(_el$28, "cy", height - 40 - Math.min(latestMem(), 100) / 100 * (height - 40 - 10)));
          return _el$28;
        })()];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return data().length === 0;
      },
      get children() {
        var _el$29 = _tmpl$5$1(); _el$29.firstChild;
        return _el$29;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = `relative ${props.class || ""}`, _v$2 = memAreaPath(), _v$3 = cpuAreaPath(), _v$4 = memPath(), _v$5 = cpuPath();
      _v$ !== _p$.e && className(_el$, _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$23, "d", _p$.t = _v$2);
      _v$3 !== _p$.a && setAttribute(_el$24, "d", _p$.a = _v$3);
      _v$4 !== _p$.o && setAttribute(_el$25, "d", _p$.o = _v$4);
      _v$5 !== _p$.i && setAttribute(_el$26, "d", _p$.i = _v$5);
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

var _tmpl$$2 = /* @__PURE__ */ template(`<svg><defs><linearGradient x1=0% y1=0% x2=0% y2=100%><stop offset=0% stop-opacity=0.3></stop><stop offset=100% stop-opacity=0></stop></linearGradient></defs><polyline fill=none stroke-linecap=round stroke-linejoin=round>`), _tmpl$2$2 = /* @__PURE__ */ template(`<svg><polygon></svg>`, false, true, false), _tmpl$3$2 = /* @__PURE__ */ template(`<svg><circle r=3 class=animate-pulse></svg>`, false, true, false);
const Sparkline = (props) => {
  const height = props.height || 40;
  const width = props.width || 120;
  const color = props.color || "#06b6d4";
  const strokeWidth = props.strokeWidth || 1.5;
  const showDots = props.showDots ?? false;
  const points = createMemo(() => {
    const data = props.data;
    if (!data || data.length === 0) return "";
    const padding = 4;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    return data.map((value, i) => {
      const x = padding + i / Math.max(data.length - 1, 1) * (width - padding * 2);
      const y = height - padding - (value - minVal) / range * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");
  });
  const lastPoint = createMemo(() => {
    const data = props.data;
    if (!data || data.length === 0) return null;
    const padding = 4;
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    const i = data.length - 1;
    const value = data[i];
    return {
      x: padding + i / Math.max(data.length - 1, 1) * (width - padding * 2),
      y: height - padding - (value - minVal) / range * (height - padding * 2)
    };
  });
  return (() => {
    var _el$ = _tmpl$$2(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild, _el$5 = _el$4.nextSibling, _el$6 = _el$2.nextSibling;
    setAttribute(_el$, "width", width);
    setAttribute(_el$, "height", height);
    setAttribute(_el$, "viewBox", `0 0 ${width} ${height}`);
    setAttribute(_el$4, "stop-color", color);
    setAttribute(_el$5, "stop-color", color);
    insert(_el$, (() => {
      var _c$ = memo(() => !!(props.data && props.data.length > 0));
      return () => _c$() && (() => {
        var _el$7 = _tmpl$2$2();
        createRenderEffect((_p$) => {
          var _v$4 = `4,${height - 4} ${points()} ${width - 4},${height - 4}`, _v$5 = `url(#sparkline-grad-${color.replace("#", "")})`;
          _v$4 !== _p$.e && setAttribute(_el$7, "points", _p$.e = _v$4);
          _v$5 !== _p$.t && setAttribute(_el$7, "fill", _p$.t = _v$5);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$7;
      })();
    })(), _el$6);
    setAttribute(_el$6, "stroke", color);
    setAttribute(_el$6, "stroke-width", strokeWidth);
    insert(_el$, (() => {
      var _c$2 = memo(() => !!(showDots && lastPoint()));
      return () => _c$2() && (() => {
        var _el$8 = _tmpl$3$2();
        setAttribute(_el$8, "fill", color);
        createRenderEffect((_p$) => {
          var _v$6 = lastPoint().x, _v$7 = lastPoint().y;
          _v$6 !== _p$.e && setAttribute(_el$8, "cx", _p$.e = _v$6);
          _v$7 !== _p$.t && setAttribute(_el$8, "cy", _p$.t = _v$7);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$8;
      })();
    })(), null);
    createRenderEffect((_p$) => {
      var _v$ = `overflow-visible ${props.class || ""}`, _v$2 = `sparkline-grad-${color.replace("#", "")}`, _v$3 = points();
      _v$ !== _p$.e && setAttribute(_el$, "class", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$3, "id", _p$.t = _v$2);
      _v$3 !== _p$.a && setAttribute(_el$6, "points", _p$.a = _v$3);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="spinner w-4 h-4">`), _tmpl$2$1 = /* @__PURE__ */ template(`<svg class="w-4 h-4 flex-shrink-0"fill=none viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">`), _tmpl$3$1 = /* @__PURE__ */ template(`<span class="ml-auto text-xs px-2 py-0.5 rounded-full"style=background:rgba(255,255,255,0.1);color:var(--text-muted)>via `), _tmpl$4$1 = /* @__PURE__ */ template(`<div><span class=text-sm>`);
const MetricsStatusBanner = (props) => {
  const st = status;
  const shouldShow = createMemo(() => {
    const s = st();
    return s.reconnecting || s.source === "unavailable" || s.error;
  });
  const bannerStyle = createMemo(() => {
    const s = st();
    if (s.reconnecting) {
      return {
        bg: "rgba(245, 158, 11, 0.1)",
        border: "rgba(245, 158, 11, 0.3)",
        color: "#f59e0b"
      };
    }
    if (s.source === "unavailable" || s.error) {
      return {
        bg: "rgba(107, 114, 128, 0.1)",
        border: "rgba(107, 114, 128, 0.3)",
        color: "#6b7280"
      };
    }
    return {
      bg: "rgba(34, 197, 94, 0.1)",
      border: "rgba(34, 197, 94, 0.3)",
      color: "#22c55e"
    };
  });
  const message = createMemo(() => {
    const s = st();
    if (s.reconnecting) {
      return "Reconnecting to metrics stream…";
    }
    if (s.source === "unavailable") {
      if (s.error) {
        return `Live usage metrics unavailable: ${s.error}`;
      }
      return "Live usage metrics unavailable on this cluster.";
    }
    if (s.error) {
      return `Metrics warning: ${s.error}`;
    }
    return null;
  });
  return createComponent(Show, {
    get when() {
      return shouldShow();
    },
    get children() {
      var _el$ = _tmpl$4$1(), _el$4 = _el$.firstChild;
      insert(_el$, createComponent(Show, {
        get when() {
          return st().reconnecting;
        },
        get children() {
          var _el$2 = _tmpl$$1();
          createRenderEffect((_$p) => setStyleProperty(_el$2, "border-color", bannerStyle().color));
          return _el$2;
        }
      }), _el$4);
      insert(_el$, createComponent(Show, {
        get when() {
          return !st().reconnecting;
        },
        get children() {
          var _el$3 = _tmpl$2$1();
          createRenderEffect(() => setAttribute(_el$3, "stroke", bannerStyle().color));
          return _el$3;
        }
      }), _el$4);
      insert(_el$4, message);
      insert(_el$, createComponent(Show, {
        get when() {
          return memo(() => !!(st().source && st().source !== "unavailable"))() && st().source !== "unknown";
        },
        get children() {
          var _el$5 = _tmpl$3$1(); _el$5.firstChild;
          insert(_el$5, () => st().source === "metrics_api" ? "Metrics API" : "Summary API", null);
          return _el$5;
        }
      }), null);
      createRenderEffect((_p$) => {
        var _v$ = `px-4 py-2 rounded-lg flex items-center gap-3 ${props.class || ""}`, _v$2 = bannerStyle().bg, _v$3 = `1px solid ${bannerStyle().border}`, _v$4 = bannerStyle().color;
        _v$ !== _p$.e && className(_el$, _p$.e = _v$);
        _v$2 !== _p$.t && setStyleProperty(_el$, "background", _p$.t = _v$2);
        _v$3 !== _p$.a && setStyleProperty(_el$, "border", _p$.a = _v$3);
        _v$4 !== _p$.o && setStyleProperty(_el$4, "color", _p$.o = _v$4);
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0
      });
      return _el$;
    }
  });
};

var _tmpl$ = /* @__PURE__ */ template(`<svg class="w-6 h-6"viewBox="0 0 24 24"fill=currentColor><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.9 3.85L12 11.9 5.1 8.03 12 4.18zM5 9.48l6 3.35v6.7l-6-3.35v-6.7zm8 10.05v-6.7l6-3.35v6.7l-6 3.35z">`), _tmpl$2 = /* @__PURE__ */ template(`<svg class="w-6 h-6"viewBox="0 0 24 24"fill=currentColor><path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h16v4H4v-4z"></path><circle cx=6 cy=6 r=1></circle><circle cx=6 cy=12 r=1></circle><circle cx=6 cy=18 r=1>`), _tmpl$3 = /* @__PURE__ */ template(`<svg class="w-5 h-5"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z">`), _tmpl$4 = /* @__PURE__ */ template(`<svg class="w-5 h-5"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1=12 y1=9 x2=12 y2=13></line><line x1=12 y1=17 x2=12.01 y2=17>`), _tmpl$5 = /* @__PURE__ */ template(`<svg class="w-4 h-4"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><polyline points="20 6 9 17 4 12">`), _tmpl$6 = /* @__PURE__ */ template(`<svg class="w-4 h-4"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><line x1=18 y1=6 x2=6 y2=18></line><line x1=6 y1=6 x2=18 y2=18>`), _tmpl$7 = /* @__PURE__ */ template(`<div class="text-sm mt-1"style=color:var(--text-muted)>`), _tmpl$8 = /* @__PURE__ */ template(`<div class="metric-card card-hover cursor-pointer p-6"><div class="flex items-start justify-between"><div><div class="text-sm font-medium"style=color:var(--text-muted)></div><div class="text-3xl font-bold mt-2"></div></div><div class="w-12 h-12 rounded-xl flex items-center justify-center">`), _tmpl$9 = /* @__PURE__ */ template(`<div class="text-xs mt-2"style=color:var(--text-muted)>Top: `), _tmpl$0 = /* @__PURE__ */ template(`<div class="text-xs mt-2"style=color:var(--text-muted)>via `), _tmpl$1 = /* @__PURE__ */ template(`<div class="space-y-2 max-h-64 overflow-auto">`), _tmpl$10 = /* @__PURE__ */ template(`<div class=space-y-6><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Dashboard</h1><p style=color:var(--text-secondary)>Cluster overview and health monitoring</p></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="card p-4 relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full"style=background:#06b6d4></div><div class="flex items-start justify-between mb-2"><div><div class="text-xs font-medium uppercase tracking-wide"style=color:var(--text-muted)>Cluster CPU</div><div class="text-3xl font-bold mt-1"style=color:#06b6d4>%</div></div><div class="px-2 py-1 rounded text-xs font-medium"></div></div></div><div class="card p-4 relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full"style=background:#8b5cf6></div><div class="flex items-start justify-between mb-2"><div><div class="text-xs font-medium uppercase tracking-wide"style=color:var(--text-muted)>Cluster Memory</div><div class="text-3xl font-bold mt-1"style=color:#8b5cf6>%</div></div><div class="px-2 py-1 rounded text-xs font-medium"></div></div></div><div class="card p-4 relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full"style=background:#f59e0b></div><div class="flex items-start justify-between mb-2"><div><div class="text-xs font-medium uppercase tracking-wide"style=color:var(--text-muted)>Peak Node CPU</div><div class="text-3xl font-bold mt-1"style=color:#f59e0b>%</div></div><div class="px-2 py-1 rounded text-xs font-medium"></div></div></div><div class="card p-4 relative overflow-hidden"><div class="absolute top-0 left-0 w-1 h-full"style=background:#ec4899></div><div class="flex items-start justify-between mb-2"><div><div class="text-xs font-medium uppercase tracking-wide"style=color:var(--text-muted)>Peak Node Memory</div><div class="text-3xl font-bold mt-1"style=color:#ec4899>%</div></div><div class="px-2 py-1 rounded text-xs font-medium"></div></div></div></div><div class="card p-6"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center"style="background:linear-gradient(135deg, #06b6d420 0%, #8b5cf620 100%);border:1px solid rgba(139, 92, 246, 0.2)"><svg class="w-5 h-5"viewBox="0 0 24 24"fill=none stroke=url(#realtimeGrad) stroke-width=2><defs><linearGradient id=realtimeGrad x1=0% y1=0% x2=100% y2=100%><stop offset=0% stop-color=#06b6d4></stop><stop offset=100% stop-color=#8b5cf6></stop></linearGradient></defs><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div><div><h2 class="text-lg font-bold"style=color:var(--text-primary)>Realtime Resource Usage</h2><p class=text-sm style=color:var(--text-muted)>Live streaming metrics • Last 15 minutes</p></div></div><div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full animate-pulse"></div><span class=text-xs style=color:var(--text-muted)></span></div></div></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"></div><div class="card p-6"><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Resource Overview</h2><div class="grid grid-cols-2 md:grid-cols-5 gap-4"><div class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="text-3xl font-bold"style=color:#06b6d4></div><div class="text-sm mt-1"style=color:var(--text-secondary)>Pods</div></div><div class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="text-3xl font-bold"style=color:#3b82f6></div><div class="text-sm mt-1"style=color:var(--text-secondary)>Deployments</div></div><div class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="text-3xl font-bold"style=color:#8b5cf6></div><div class="text-sm mt-1"style=color:var(--text-secondary)>Services</div></div><div class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="text-3xl font-bold"style=color:#22c55e></div><div class="text-sm mt-1"style=color:var(--text-secondary)>Nodes</div></div><div class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"style=background:var(--bg-tertiary)><div class="text-3xl font-bold"style=color:#f59e0b></div><div class="text-sm mt-1"style=color:var(--text-secondary)>Est. Monthly Cost</div></div></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="card p-6"><h2 class="text-lg font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10"></path><circle cx=12 cy=12 r=3></circle></svg>AI Insights & Recommendations</h2><div class=space-y-3></div></div><div class="card p-6"><h2 class="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer hover:opacity-80"style=color:var(--text-primary)>Security Overview<svg class="w-4 h-4 ml-auto"viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2><path d="M9 18l6-6-6-6"></path></svg></h2><div class=space-y-4><div class="flex items-center justify-between p-4 rounded-lg"style=background:var(--bg-tertiary)><span style=color:var(--text-secondary)>Security Score</span><span class="text-2xl font-bold">/100</span></div><div class=space-y-2></div></div></div></div><div class="card p-6"><h2 class="text-lg font-semibold mb-4"style=color:var(--text-primary)>Recent Events`), _tmpl$11 = /* @__PURE__ */ template(`<ul class="mt-2 text-xs space-y-1"style=color:var(--text-muted)>`), _tmpl$12 = /* @__PURE__ */ template(`<button class="mt-3 px-3 py-1.5 text-xs font-medium rounded-md transition-all hover:opacity-80"> →`), _tmpl$13 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"><div class="flex items-start gap-3"><div></div><div class=flex-1><div class=font-medium></div><div class="text-sm mt-1"style=color:var(--text-secondary)>`), _tmpl$14 = /* @__PURE__ */ template(`<li class="flex items-center gap-2"><span class="w-1 h-1 rounded-full">`), _tmpl$15 = /* @__PURE__ */ template(`<span class="text-xs px-1.5 py-0.5 rounded font-medium">`), _tmpl$16 = /* @__PURE__ */ template(`<svg class="w-4 h-4 ml-auto opacity-60"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 5l7 7-7 7">`), _tmpl$17 = /* @__PURE__ */ template(`<div style=background:var(--bg-secondary)><div class="flex items-center gap-2 flex-1"><span></span><span style=color:var(--text-primary)></span></div><span>`), _tmpl$18 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)>No recent events`), _tmpl$19 = /* @__PURE__ */ template(`<div class="flex items-start gap-3 p-3 rounded-lg"style=background:var(--bg-secondary)><span></span><div class="flex-1 min-w-0"><div class="text-sm font-medium truncate"style=color:var(--text-primary)>: </div><div class="text-xs truncate"style=color:var(--text-muted)>`);
const PodIcon = () => (
  // Official Kubernetes Pod icon style
  _tmpl$()
);
const NodeIcon = () => (
  // Official Kubernetes Node/Server icon style
  _tmpl$2()
);
const ShieldIcon = () => _tmpl$3();
const AlertIcon = () => _tmpl$4();
const CheckIcon = () => _tmpl$5();
const XIcon = () => _tmpl$6();
const MetricCard = (props) => (() => {
  var _el$7 = _tmpl$8(), _el$8 = _el$7.firstChild, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling, _el$11 = _el$9.nextSibling;
  addEventListener(_el$7, "click", props.onClick, true);
  insert(_el$0, () => props.label);
  insert(_el$1, () => props.value);
  insert(_el$9, createComponent(Show, {
    get when() {
      return props.subtext;
    },
    get children() {
      var _el$10 = _tmpl$7();
      insert(_el$10, () => props.subtext);
      return _el$10;
    }
  }), null);
  insert(_el$11, () => props.icon({}));
  createRenderEffect((_p$) => {
    var _v$ = `4px solid ${props.color}`, _v$2 = props.color, _v$3 = `${props.color}20`, _v$4 = props.color;
    _v$ !== _p$.e && setStyleProperty(_el$7, "border-left", _p$.e = _v$);
    _v$2 !== _p$.t && setStyleProperty(_el$1, "color", _p$.t = _v$2);
    _v$3 !== _p$.a && setStyleProperty(_el$11, "background", _p$.a = _v$3);
    _v$4 !== _p$.o && setStyleProperty(_el$11, "color", _p$.o = _v$4);
    return _p$;
  }, {
    e: void 0,
    t: void 0,
    a: void 0,
    o: void 0
  });
  return _el$7;
})();
const Dashboard = () => {
  const [metrics, {
    refetch: refetchMetrics
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => {
    try {
      const data = await api.getMetrics();
      console.log("Dashboard: Metrics fetched:", data);
      return data;
    } catch (error) {
      console.error("Dashboard: Error fetching metrics:", error);
      throw error;
    }
  });
  const [pods, {
    refetch: refetchPods
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getPods("_all"));
  const [deployments, {
    refetch: refetchDeployments
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getDeployments("_all"));
  const [services, {
    refetch: refetchServices
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => api.getServices("_all"));
  const nodes = nodesResource;
  const [eventsResponse, {
    refetch: refetchEvents
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => {
    try {
      const response = await api.getEvents(void 0, 50);
      return response?.events || [];
    } catch (error) {
      console.error("Failed to fetch events:", error);
      return [];
    }
  });
  const [clusterCost, {
    refetch: refetchCost
  }] = createResource(() => {
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      context: ctx,
      refresh
    };
  }, async () => {
    try {
      const cost = await api.getClusterCost();
      console.log("Dashboard: Cost fetched:", cost);
      return cost;
    } catch (e) {
      console.error("Dashboard cost API error:", e);
      return null;
    }
  });
  createEffect(() => {
    const trigger = refreshTrigger();
    const ctx = currentContext();
    if (trigger > 0 && ctx) {
      setTimeout(() => {
        refetchCost();
      }, 1500);
    }
  });
  createEffect(() => {
    console.log("Dashboard: Cost resource state:", {
      loading: clusterCost.loading,
      error: clusterCost.error,
      hasData: !!clusterCost(),
      data: clusterCost(),
      context: currentContext(),
      refresh: refreshTrigger()
    });
  });
  createEffect(() => {
    console.log("Dashboard: Metrics resource state:", {
      loading: metrics.loading,
      error: metrics.error,
      hasData: !!metrics(),
      data: metrics(),
      context: currentContext(),
      refresh: refreshTrigger()
    });
  });
  onMount(() => {
    console.log("Dashboard: Component mounted, refetching metrics and cost");
    refetchMetrics();
    if (!clusterCost.loading && !clusterCost()) {
      refetchCost();
    }
    const refreshInterval = setInterval(() => {
      refetchMetrics().catch((err) => {
        console.error("Background metrics refresh failed:", err);
      });
    }, 5e3);
    return () => clearInterval(refreshInterval);
  });
  const runningPods = () => {
    const podList = pods();
    if (!podList || !Array.isArray(podList)) return 0;
    return podList.filter((p) => p.status === "Running").length;
  };
  const totalPods = () => {
    const podList = pods();
    return Array.isArray(podList) ? podList.length : 0;
  };
  const healthyNodes = () => {
    try {
      if (nodes.error) return 0;
      const nodeList = nodes();
      if (!nodeList || !Array.isArray(nodeList)) return 0;
      return nodeList.filter((n) => n.status === "Ready" || n.readyStatus === "Ready").length;
    } catch (err) {
      console.error("Error calculating healthy nodes:", err);
      return 0;
    }
  };
  const totalNodes = () => {
    try {
      if (nodes.error) return 0;
      const nodeList = nodes();
      return Array.isArray(nodeList) ? nodeList.length : 0;
    } catch (err) {
      console.error("Error calculating total nodes:", err);
      return 0;
    }
  };
  const recentEvents = () => {
    const eventList = eventsResponse();
    return Array.isArray(eventList) ? eventList.slice(0, 10) : [];
  };
  const securityChecks = createMemo(() => {
    const podList = pods() || [];
    const checks = [];
    const podsWithoutSecurityContext = podList.filter((p) => !p.securityContext);
    if (podsWithoutSecurityContext.length > 0) {
      checks.push({
        name: "Security Context Missing",
        status: "fail",
        severity: "critical",
        count: podsWithoutSecurityContext.length,
        details: `${podsWithoutSecurityContext.length} pods have no security context defined`
      });
    } else if (podList.length > 0) {
      checks.push({
        name: "Security Context",
        status: "pass",
        severity: "critical",
        details: "All pods have security context configured"
      });
    }
    const podsRunningAsRoot = podList.filter((p) => p.securityContext?.runAsRoot === true || !p.securityContext?.runAsNonRoot && !p.securityContext?.runAsUser);
    if (podsRunningAsRoot.length > 0) {
      checks.push({
        name: "Running as Root",
        status: "fail",
        severity: "critical",
        count: podsRunningAsRoot.length,
        details: `${podsRunningAsRoot.length} pods may run as root user`
      });
    } else if (podList.length > 0) {
      checks.push({
        name: "Non-Root User",
        status: "pass",
        severity: "critical",
        details: "All pods run as non-root"
      });
    }
    const privilegedPods = podList.filter((p) => p.privileged === true);
    if (privilegedPods.length > 0) {
      checks.push({
        name: "Privileged Containers",
        status: "fail",
        severity: "critical",
        count: privilegedPods.length,
        details: `${privilegedPods.length} containers running in privileged mode`
      });
    } else if (podList.length > 0) {
      checks.push({
        name: "No Privileged Containers",
        status: "pass",
        severity: "critical",
        details: "No privileged containers detected"
      });
    }
    const podsWithoutLimits = podList.filter((p) => !p.resources?.limits);
    if (podsWithoutLimits.length > 0) {
      checks.push({
        name: "Resource Limits Missing",
        status: "warning",
        severity: "high",
        count: podsWithoutLimits.length,
        details: `${podsWithoutLimits.length} pods without resource limits`
      });
    } else if (podList.length > 0) {
      checks.push({
        name: "Resource Limits",
        status: "pass",
        severity: "high",
        details: "All pods have resource limits configured"
      });
    }
    const podsWithWritableRootfs = podList.filter((p) => p.securityContext?.readOnlyRootFilesystem !== true);
    if (podsWithWritableRootfs.length > 0 && podList.length > 0) {
      checks.push({
        name: "Writable Root Filesystem",
        status: "warning",
        severity: "medium",
        count: podsWithWritableRootfs.length,
        details: `${podsWithWritableRootfs.length} pods have writable root filesystem`
      });
    }
    if (podList.length === 0) {
      checks.push({
        name: "No Pods to Analyze",
        status: "warning",
        severity: "low",
        details: "No pods found for security analysis"
      });
    }
    return checks;
  });
  const securityScore = createMemo(() => {
    const checks = securityChecks();
    if (checks.length === 0) return 100;
    const weights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };
    let totalWeight = 0;
    let passedWeight = 0;
    checks.forEach((check) => {
      const weight = weights[check.severity];
      totalWeight += weight;
      if (check.status === "pass") passedWeight += weight;
      else if (check.status === "warning") passedWeight += weight * 0.5;
    });
    return totalWeight > 0 ? Math.round(passedWeight / totalWeight * 100) : 100;
  });
  const getInsights = () => {
    const insights = [];
    const podList = pods() || [];
    const nodeList = nodes() || [];
    const m = metrics();
    const pendingPods = podList.filter((p) => p.status === "Pending");
    if (pendingPods.length > 0) {
      insights.push({
        type: "warning",
        title: "Pending Pods Detected",
        message: `${pendingPods.length} pods are in Pending state.`,
        details: pendingPods.slice(0, 3).map((p) => `${p.namespace}/${p.name}`),
        navigateTo: "pods",
        actionLabel: "View Pods"
      });
    }
    const failedPods = podList.filter((p) => p.status === "Failed" || p.status === "Error" || p.status === "CrashLoopBackOff");
    if (failedPods.length > 0) {
      insights.push({
        type: "error",
        title: "Failed Pods Alert",
        message: `${failedPods.length} pods are failing. Immediate attention recommended.`,
        details: failedPods.slice(0, 3).map((p) => `${p.namespace}/${p.name} (${p.status})`),
        navigateTo: "pods",
        actionLabel: "View Failed Pods"
      });
    }
    const unhealthyNodes = nodeList.filter((n) => n.status !== "Ready");
    if (unhealthyNodes.length > 0) {
      insights.push({
        type: "error",
        title: "Node Health Issue",
        message: `${unhealthyNodes.length} nodes are not ready.`,
        details: unhealthyNodes.slice(0, 3).map((n) => n.name),
        navigateTo: "nodes",
        actionLabel: "View Nodes"
      });
    }
    const cpuVal = m?.cpu != null ? typeof m.cpu === "object" ? m.cpu.percentage : Number(m.cpu) : null;
    const memVal = m?.memory != null ? typeof m.memory === "object" ? m.memory.percentage : Number(m.memory) : null;
    if (cpuVal && cpuVal > 80) {
      insights.push({
        type: "warning",
        title: "High CPU Usage",
        message: `Cluster CPU at ${cpuVal.toFixed(1)}%. Consider scaling or optimizing workloads.`
      });
    }
    if (memVal && memVal > 85) {
      insights.push({
        type: "warning",
        title: "High Memory Usage",
        message: `Cluster memory at ${memVal.toFixed(1)}%. Consider adding capacity.`
      });
    }
    const criticalSecurityIssues = securityChecks().filter((c) => c.status === "fail" && c.severity === "critical");
    if (criticalSecurityIssues.length > 0) {
      insights.push({
        type: "error",
        title: "Critical Security Issues",
        message: `${criticalSecurityIssues.length} critical security findings require immediate attention.`,
        details: criticalSecurityIssues.map((c) => `${c.name}${c.count ? ` (${c.count} affected)` : ""}`),
        navigateTo: "security",
        actionLabel: "View Security Details"
      });
    }
    const highSecurityIssues = securityChecks().filter((c) => c.status === "fail" && c.severity === "high");
    if (highSecurityIssues.length > 0 && criticalSecurityIssues.length === 0) {
      insights.push({
        type: "warning",
        title: "Security Warnings",
        message: `${highSecurityIssues.length} high-severity security findings detected.`,
        details: highSecurityIssues.map((c) => c.name),
        navigateTo: "security",
        actionLabel: "View Security Details"
      });
    }
    if (insights.length === 0) {
      insights.push({
        type: "success",
        title: "Cluster Healthy",
        message: "All systems operating normally. No issues detected."
      });
    }
    return insights;
  };
  const getScoreColor = (score) => {
    if (score >= 80) return "var(--success-color)";
    if (score >= 60) return "var(--warning-color)";
    return "var(--error-color)";
  };
  return (() => {
    var _el$12 = _tmpl$10(), _el$13 = _el$12.firstChild, _el$14 = _el$13.firstChild; _el$14.nextSibling; var _el$16 = _el$13.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.firstChild, _el$19 = _el$18.nextSibling, _el$20 = _el$19.firstChild, _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$22.firstChild, _el$24 = _el$20.nextSibling, _el$25 = _el$17.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$28 = _el$27.firstChild, _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.firstChild, _el$32 = _el$28.nextSibling, _el$33 = _el$25.nextSibling, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$36 = _el$35.firstChild, _el$37 = _el$36.firstChild, _el$38 = _el$37.nextSibling, _el$39 = _el$38.firstChild, _el$40 = _el$36.nextSibling, _el$43 = _el$33.nextSibling, _el$44 = _el$43.firstChild, _el$45 = _el$44.nextSibling, _el$46 = _el$45.firstChild, _el$47 = _el$46.firstChild, _el$48 = _el$47.nextSibling, _el$49 = _el$48.firstChild, _el$50 = _el$46.nextSibling, _el$53 = _el$16.nextSibling, _el$54 = _el$53.firstChild, _el$55 = _el$54.firstChild, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$57.firstChild; _el$58.nextSibling; var _el$60 = _el$55.nextSibling, _el$61 = _el$60.firstChild, _el$62 = _el$61.nextSibling, _el$63 = _el$53.nextSibling, _el$64 = _el$63.nextSibling, _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling, _el$67 = _el$66.firstChild, _el$68 = _el$67.firstChild; _el$68.nextSibling; var _el$70 = _el$67.nextSibling, _el$71 = _el$70.firstChild; _el$71.nextSibling; var _el$73 = _el$70.nextSibling, _el$74 = _el$73.firstChild; _el$74.nextSibling; var _el$76 = _el$73.nextSibling, _el$77 = _el$76.firstChild; _el$77.nextSibling; var _el$79 = _el$76.nextSibling, _el$80 = _el$79.firstChild; _el$80.nextSibling; var _el$82 = _el$64.nextSibling, _el$83 = _el$82.firstChild, _el$84 = _el$83.firstChild, _el$85 = _el$84.nextSibling, _el$86 = _el$83.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$87.firstChild, _el$89 = _el$87.nextSibling, _el$90 = _el$89.firstChild, _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$90.nextSibling, _el$95 = _el$82.nextSibling; _el$95.firstChild;
    insert(_el$12, createComponent(MetricsStatusBanner, {}), _el$16);
    insert(_el$22, () => latestPoint()?.cluster.cpuPct?.toFixed(1) ?? "--", _el$23);
    insert(_el$24, (() => {
      var _c$ = memo(() => getStatusLevel(latestPoint()?.cluster.cpuPct ?? 0) === "hot");
      return () => _c$() ? "🔥 Hot" : getStatusLevel(latestPoint()?.cluster.cpuPct ?? 0) === "moderate" ? "⚡ Moderate" : "✓ Normal";
    })());
    insert(_el$17, createComponent(Sparkline, {
      get data() {
        return getCpuSparkline(30);
      },
      color: "#06b6d4",
      height: 32,
      showDots: true
    }), null);
    insert(_el$30, () => latestPoint()?.cluster.memPct?.toFixed(1) ?? "--", _el$31);
    insert(_el$32, (() => {
      var _c$2 = memo(() => getStatusLevel(latestPoint()?.cluster.memPct ?? 0) === "hot");
      return () => _c$2() ? "🔥 Hot" : getStatusLevel(latestPoint()?.cluster.memPct ?? 0) === "moderate" ? "⚡ Moderate" : "✓ Normal";
    })());
    insert(_el$25, createComponent(Sparkline, {
      get data() {
        return getMemSparkline(30);
      },
      color: "#8b5cf6",
      height: 32,
      showDots: true
    }), null);
    insert(_el$38, () => latestPoint()?.peaks.cpuPct?.toFixed(1) ?? "--", _el$39);
    insert(_el$40, (() => {
      var _c$3 = memo(() => getStatusLevel(latestPoint()?.peaks.cpuPct ?? 0) === "hot");
      return () => _c$3() ? "🔥 Hot" : getStatusLevel(latestPoint()?.peaks.cpuPct ?? 0) === "moderate" ? "⚡ Moderate" : "✓ Normal";
    })());
    insert(_el$33, createComponent(Show, {
      get when() {
        return latestPoint()?.topNodes?.[0];
      },
      get children() {
        var _el$41 = _tmpl$9(); _el$41.firstChild;
        insert(_el$41, () => latestPoint()?.topNodes?.[0]?.name, null);
        return _el$41;
      }
    }), null);
    insert(_el$48, () => latestPoint()?.peaks.memPct?.toFixed(1) ?? "--", _el$49);
    insert(_el$50, (() => {
      var _c$4 = memo(() => getStatusLevel(latestPoint()?.peaks.memPct ?? 0) === "hot");
      return () => _c$4() ? "🔥 Hot" : getStatusLevel(latestPoint()?.peaks.memPct ?? 0) === "moderate" ? "⚡ Moderate" : "✓ Normal";
    })());
    insert(_el$43, createComponent(Show, {
      get when() {
        return memo(() => !!latestPoint()?.source)() && latestPoint()?.source !== "unavailable";
      },
      get children() {
        var _el$51 = _tmpl$0(); _el$51.firstChild;
        insert(_el$51, () => latestPoint()?.source === "metrics_api" ? "Metrics API" : "Summary API", null);
        return _el$51;
      }
    }), null);
    insert(_el$62, (() => {
      var _c$5 = memo(() => !!status().connected);
      return () => _c$5() ? "Live" : status().reconnecting ? "Reconnecting..." : "Disconnected";
    })());
    insert(_el$53, createComponent(CpuMemChart, {
      height: 200,
      showLegend: true
    }), null);
    insert(_el$63, createComponent(MetricCard, {
      label: "Running Pods",
      get value() {
        return `${runningPods()}/${totalPods()}`;
      },
      get subtext() {
        return `${totalPods() > 0 ? (runningPods() / totalPods() * 100).toFixed(0) : 0}% healthy`;
      },
      color: "#22c55e",
      icon: PodIcon,
      onClick: () => setCurrentView("pods")
    }), null);
    insert(_el$63, createComponent(MetricCard, {
      label: "Nodes",
      get value() {
        return memo(() => !!nodes.loading)() ? "..." : memo(() => !!nodes.error)() ? "Error" : `${healthyNodes()}/${totalNodes()}`;
      },
      get subtext() {
        return memo(() => !!nodes.loading)() ? "Loading..." : memo(() => !!nodes.error)() ? "Connection required" : memo(() => !!(healthyNodes() === totalNodes() && totalNodes() > 0))() ? "All healthy" : totalNodes() === 0 ? "No nodes" : "Some unhealthy";
      },
      get color() {
        return memo(() => !!nodes.loading)() ? "#6b7280" : memo(() => !!nodes.error)() ? "#ef4444" : healthyNodes() === totalNodes() && totalNodes() > 0 ? "#22c55e" : "#f59e0b";
      },
      icon: NodeIcon,
      onClick: () => setCurrentView("nodes")
    }), null);
    _el$67.$$click = () => setCurrentView("pods");
    insert(_el$68, totalPods);
    _el$70.$$click = () => setCurrentView("deployments");
    insert(_el$71, () => (deployments() || []).length);
    _el$73.$$click = () => setCurrentView("services");
    insert(_el$74, () => (services() || []).length);
    _el$76.$$click = () => setCurrentView("nodes");
    insert(_el$77, (() => {
      var _c$6 = memo(() => !!nodes.loading);
      return () => _c$6() ? "..." : totalNodes();
    })());
    _el$79.$$click = () => setCurrentView("cost");
    insert(_el$80, () => {
      if (clusterCost.loading) return "...";
      if (clusterCost.error) return "Error";
      const cost = clusterCost();
      if (!cost) return "--";
      const monthly = cost.monthlyCost;
      if (monthly == null || monthly === void 0) return "--";
      return `$${typeof monthly === "number" ? monthly.toFixed(0) : monthly}`;
    });
    insert(_el$85, createComponent(For, {
      get each() {
        return getInsights();
      },
      children: (insight) => (() => {
        var _el$98 = _tmpl$13(), _el$99 = _el$98.firstChild, _el$100 = _el$99.firstChild, _el$101 = _el$100.nextSibling, _el$102 = _el$101.firstChild, _el$103 = _el$102.nextSibling;
        insert(_el$100, (() => {
          var _c$7 = memo(() => insight.type === "error");
          return () => _c$7() ? createComponent(AlertIcon, {}) : memo(() => insight.type === "warning")() ? createComponent(AlertIcon, {}) : memo(() => insight.type === "success")() ? createComponent(CheckIcon, {}) : createComponent(ShieldIcon, {});
        })());
        insert(_el$102, () => insight.title);
        insert(_el$103, () => insight.message);
        insert(_el$101, createComponent(Show, {
          get when() {
            return memo(() => !!insight.details)() && insight.details.length > 0;
          },
          get children() {
            var _el$104 = _tmpl$11();
            insert(_el$104, createComponent(For, {
              get each() {
                return insight.details;
              },
              children: (detail) => (() => {
                var _el$107 = _tmpl$14(), _el$108 = _el$107.firstChild;
                insert(_el$107, detail, null);
                createRenderEffect((_$p) => setStyleProperty(_el$108, "background", insight.type === "error" ? "var(--error-color)" : insight.type === "warning" ? "var(--warning-color)" : "var(--accent-primary)"));
                return _el$107;
              })()
            }));
            return _el$104;
          }
        }), null);
        insert(_el$101, createComponent(Show, {
          get when() {
            return memo(() => !!insight.navigateTo)() && insight.actionLabel;
          },
          get children() {
            var _el$105 = _tmpl$12(), _el$106 = _el$105.firstChild;
            _el$105.$$click = () => setCurrentView(insight.navigateTo);
            insert(_el$105, () => insight.actionLabel, _el$106);
            createRenderEffect((_p$) => {
              var _v$14 = insight.type === "error" ? "rgba(239, 68, 68, 0.2)" : insight.type === "warning" ? "rgba(245, 158, 11, 0.2)" : "rgba(6, 182, 212, 0.2)", _v$15 = insight.type === "error" ? "var(--error-color)" : insight.type === "warning" ? "var(--warning-color)" : "var(--accent-primary)", _v$16 = `1px solid ${insight.type === "error" ? "rgba(239, 68, 68, 0.3)" : insight.type === "warning" ? "rgba(245, 158, 11, 0.3)" : "rgba(6, 182, 212, 0.3)"}`;
              _v$14 !== _p$.e && setStyleProperty(_el$105, "background", _p$.e = _v$14);
              _v$15 !== _p$.t && setStyleProperty(_el$105, "color", _p$.t = _v$15);
              _v$16 !== _p$.a && setStyleProperty(_el$105, "border", _p$.a = _v$16);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$105;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$17 = insight.type === "error" ? "rgba(239, 68, 68, 0.1)" : insight.type === "warning" ? "rgba(245, 158, 11, 0.1)" : insight.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(6, 182, 212, 0.1)", _v$18 = insight.type === "error" ? "rgba(239, 68, 68, 0.3)" : insight.type === "warning" ? "rgba(245, 158, 11, 0.3)" : insight.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(6, 182, 212, 0.3)", _v$19 = insight.type === "error" ? "var(--error-color)" : insight.type === "warning" ? "var(--warning-color)" : insight.type === "success" ? "var(--success-color)" : "var(--accent-primary)", _v$20 = insight.type === "error" ? "var(--error-color)" : insight.type === "warning" ? "var(--warning-color)" : insight.type === "success" ? "var(--success-color)" : "var(--accent-primary)";
          _v$17 !== _p$.e && setStyleProperty(_el$98, "background", _p$.e = _v$17);
          _v$18 !== _p$.t && setStyleProperty(_el$98, "border-color", _p$.t = _v$18);
          _v$19 !== _p$.a && setStyleProperty(_el$100, "color", _p$.a = _v$19);
          _v$20 !== _p$.o && setStyleProperty(_el$102, "color", _p$.o = _v$20);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0
        });
        return _el$98;
      })()
    }));
    _el$87.$$click = () => setCurrentView("security");
    insert(_el$87, createComponent(ShieldIcon, {}), _el$88);
    insert(_el$92, securityScore, _el$93);
    insert(_el$94, createComponent(For, {
      get each() {
        return securityChecks();
      },
      children: (check) => (() => {
        var _el$109 = _tmpl$17(), _el$110 = _el$109.firstChild, _el$111 = _el$110.firstChild, _el$112 = _el$111.nextSibling, _el$115 = _el$110.nextSibling;
        _el$109.$$click = () => {
          if (check.status !== "pass" && check.count) {
            navigateToSecurityCheck(check.name, check.severity);
          }
        };
        insert(_el$111, () => check.severity.toUpperCase());
        insert(_el$112, () => check.name);
        insert(_el$110, createComponent(Show, {
          get when() {
            return check.count;
          },
          get children() {
            var _el$113 = _tmpl$15();
            insert(_el$113, () => check.count);
            createRenderEffect((_p$) => {
              var _v$21 = check.status === "fail" ? "rgba(239, 68, 68, 0.2)" : "var(--bg-tertiary)", _v$22 = check.status === "fail" ? "var(--error-color)" : "var(--text-muted)";
              _v$21 !== _p$.e && setStyleProperty(_el$113, "background", _p$.e = _v$21);
              _v$22 !== _p$.t && setStyleProperty(_el$113, "color", _p$.t = _v$22);
              return _p$;
            }, {
              e: void 0,
              t: void 0
            });
            return _el$113;
          }
        }), null);
        insert(_el$110, createComponent(Show, {
          get when() {
            return memo(() => check.status !== "pass")() && check.count;
          },
          get children() {
            return _tmpl$16();
          }
        }), null);
        insert(_el$115, (() => {
          var _c$8 = memo(() => check.status === "pass");
          return () => _c$8() ? createComponent(CheckIcon, {}) : memo(() => check.status === "fail")() ? createComponent(XIcon, {}) : createComponent(AlertIcon, {});
        })(), null);
        insert(_el$115, (() => {
          var _c$9 = memo(() => check.status === "pass");
          return () => _c$9() ? "Pass" : check.status === "fail" ? "Fail" : "Warning";
        })(), null);
        createRenderEffect((_p$) => {
          var _v$23 = `flex items-center justify-between p-3 rounded-lg transition-all ${check.status !== "pass" && check.count ? "cursor-pointer hover:opacity-80 hover:scale-[1.02]" : ""}`, _v$24 = {
            ...check.status !== "pass" && check.count ? {
              border: "1px solid var(--accent-primary)",
              borderOpacity: 0.3
            } : {}
          }, _v$25 = check.status !== "pass" && check.count ? `Click to view ${check.count} pods with ${check.name}` : "", _v$26 = `px-1.5 py-0.5 rounded text-xs font-medium ${check.severity === "critical" ? "bg-red-500/20 text-red-400" : check.severity === "high" ? "bg-orange-500/20 text-orange-400" : check.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`, _v$27 = `flex items-center gap-1 text-sm ${check.status === "pass" ? "text-green-400" : check.status === "fail" ? "text-red-400" : "text-yellow-400"}`;
          _v$23 !== _p$.e && className(_el$109, _p$.e = _v$23);
          _p$.t = style(_el$109, _v$24, _p$.t);
          _v$25 !== _p$.a && setAttribute(_el$109, "title", _p$.a = _v$25);
          _v$26 !== _p$.o && className(_el$111, _p$.o = _v$26);
          _v$27 !== _p$.i && className(_el$115, _p$.i = _v$27);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0
        });
        return _el$109;
      })()
    }));
    insert(_el$95, createComponent(Show, {
      get when() {
        return recentEvents().length > 0;
      },
      get fallback() {
        return _tmpl$18();
      },
      get children() {
        var _el$97 = _tmpl$1();
        insert(_el$97, createComponent(For, {
          get each() {
            return recentEvents();
          },
          children: (event) => (() => {
            var _el$117 = _tmpl$19(), _el$118 = _el$117.firstChild, _el$119 = _el$118.nextSibling, _el$120 = _el$119.firstChild, _el$121 = _el$120.firstChild, _el$122 = _el$120.nextSibling;
            insert(_el$118, (() => {
              var _c$0 = memo(() => event.type === "Warning");
              return () => _c$0() ? createComponent(AlertIcon, {}) : memo(() => event.type === "Normal")() ? createComponent(CheckIcon, {}) : createComponent(XIcon, {});
            })());
            insert(_el$120, () => event.reason, _el$121);
            insert(_el$120, () => event.object, null);
            insert(_el$122, () => event.message);
            createRenderEffect(() => className(_el$118, `mt-0.5 ${event.type === "Warning" ? "text-yellow-400" : event.type === "Normal" ? "text-green-400" : "text-red-400"}`));
            return _el$117;
          })()
        }));
        return _el$97;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$5 = `${getStatusColor(latestPoint()?.cluster.cpuPct ?? 0)}20`, _v$6 = getStatusColor(latestPoint()?.cluster.cpuPct ?? 0), _v$7 = `${getStatusColor(latestPoint()?.cluster.memPct ?? 0)}20`, _v$8 = getStatusColor(latestPoint()?.cluster.memPct ?? 0), _v$9 = `${getStatusColor(latestPoint()?.peaks.cpuPct ?? 0)}20`, _v$0 = getStatusColor(latestPoint()?.peaks.cpuPct ?? 0), _v$1 = `${getStatusColor(latestPoint()?.peaks.memPct ?? 0)}20`, _v$10 = getStatusColor(latestPoint()?.peaks.memPct ?? 0), _v$11 = status().connected ? "#22c55e" : "#ef4444", _v$12 = `0 0 8px ${status().connected ? "#22c55e" : "#ef4444"}`, _v$13 = getScoreColor(securityScore());
      _v$5 !== _p$.e && setStyleProperty(_el$24, "background", _p$.e = _v$5);
      _v$6 !== _p$.t && setStyleProperty(_el$24, "color", _p$.t = _v$6);
      _v$7 !== _p$.a && setStyleProperty(_el$32, "background", _p$.a = _v$7);
      _v$8 !== _p$.o && setStyleProperty(_el$32, "color", _p$.o = _v$8);
      _v$9 !== _p$.i && setStyleProperty(_el$40, "background", _p$.i = _v$9);
      _v$0 !== _p$.n && setStyleProperty(_el$40, "color", _p$.n = _v$0);
      _v$1 !== _p$.s && setStyleProperty(_el$50, "background", _p$.s = _v$1);
      _v$10 !== _p$.h && setStyleProperty(_el$50, "color", _p$.h = _v$10);
      _v$11 !== _p$.r && setStyleProperty(_el$61, "background", _p$.r = _v$11);
      _v$12 !== _p$.d && setStyleProperty(_el$61, "box-shadow", _p$.d = _v$12);
      _v$13 !== _p$.l && setStyleProperty(_el$92, "color", _p$.l = _v$13);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0,
      l: void 0
    });
    return _el$12;
  })();
};
delegateEvents(["click"]);

export { Dashboard as default };
//# sourceMappingURL=Dashboard-7_2vVtLk.js.map
