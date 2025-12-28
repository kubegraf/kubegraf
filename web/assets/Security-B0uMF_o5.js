import { c as createSignal, o as onMount, E as onCleanup, n as createEffect, t as template, i as insert, d as createComponent, m as memo, S as Show, u as addEventListener, f as createRenderEffect, h as setStyleProperty, G as addNotification, v as delegateEvents, j as createResource, k as api, P as namespace, a as createMemo, F as For, e as setAttribute, g as className, V as settings } from './index-Bh-O-sIc.js';
import { L as LoadingSpinner } from './LoadingSpinner-CmW4_c8t.js';

var _tmpl$$1 = /* @__PURE__ */ template(`<div class="text-xs px-3 py-1.5 rounded"style="background:rgba(6, 182, 212, 0.1);color:var(--accent-primary);border:1px solid rgba(6, 182, 212, 0.3)">Next run: `), _tmpl$2$1 = /* @__PURE__ */ template(`<svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">`), _tmpl$3$1 = /* @__PURE__ */ template(`<div class="text-xs px-3 py-1.5 rounded"style="background:rgba(107, 114, 128, 0.1);color:var(--text-muted)">Diagnostics set to manual mode. Click "Run Diagnostics Now" to scan.`), _tmpl$4$1 = /* @__PURE__ */ template(`<div class="text-xs px-3 py-1.5 rounded"style="background:rgba(6, 182, 212, 0.1);color:var(--accent-primary);border:1px solid rgba(6, 182, 212, 0.3)">`), _tmpl$5$1 = /* @__PURE__ */ template(`<div class="flex items-center gap-3 flex-wrap"><div class="flex items-center gap-2"><label class=text-sm style=color:var(--text-secondary)>Run every:</label><select class="px-3 py-1.5 rounded-lg text-sm border"style=background:var(--bg-secondary);color:var(--text-primary);borderColor:var(--border-color)><option value=0>Manual only</option><option value=1440>Once per day</option><option value=360>6 hours</option><option value=720>12 hours</option><option value=5>5 minutes</option><option value=15>15 minutes</option><option value=30>30 minutes</option><option value=60>1 hour</option><option value=120>2 hours</option><option value=240>4 hours</option></select></div><button class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">`), _tmpl$6$1 = /* @__PURE__ */ template(`<svg class="w-4 h-4 animate-spin"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">`);
const DiagnosticsControls = (props) => {
  const getStoredFrequency = () => {
    const stored = localStorage.getItem("diagnostics-frequency-minutes");
    return stored ? parseInt(stored, 10) : 1440;
  };
  const [frequency, setFrequency] = createSignal(getStoredFrequency());
  const [nextRunTime, setNextRunTime] = createSignal(null);
  const [intervalId, setIntervalId] = createSignal(null);
  const updateFrequency = (minutes) => {
    setFrequency(minutes);
    localStorage.setItem("diagnostics-frequency-minutes", minutes.toString());
    setupAutoRun();
    addNotification(`Diagnostics frequency set to ${minutes} minutes`, "success");
  };
  const setupAutoRun = () => {
    if (intervalId() !== null) {
      clearInterval(intervalId());
    }
    const freqMinutes = frequency();
    if (freqMinutes === 0) {
      setNextRunTime(null);
      return;
    }
    const lastRun = props.lastRunTime;
    let nextRun;
    if (lastRun) {
      nextRun = new Date(lastRun.getTime() + freqMinutes * 60 * 1e3);
      if (nextRun.getTime() < Date.now()) {
        nextRun = new Date(Date.now() + freqMinutes * 60 * 1e3);
      }
    } else {
      nextRun = new Date(Date.now() + freqMinutes * 60 * 1e3);
    }
    setNextRunTime(nextRun);
    const id = window.setInterval(() => {
      props.onRun();
      setNextRunTime(new Date(Date.now() + freqMinutes * 60 * 1e3));
    }, freqMinutes * 60 * 1e3);
    setIntervalId(id);
  };
  onMount(() => {
    setupAutoRun();
  });
  onCleanup(() => {
    if (intervalId() !== null) {
      clearInterval(intervalId());
    }
  });
  createEffect(() => {
    if (props.lastRunTime) {
      setupAutoRun();
    }
  });
  const formatTimeUntil = (targetDate) => {
    const now = Date.now();
    const target = targetDate.getTime();
    const diff = target - now;
    if (diff <= 0) return "Now";
    const minutes = Math.floor(diff / 6e4);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    }
    return `in ${minutes}m`;
  };
  return (() => {
    var _el$ = _tmpl$5$1(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.nextSibling, _el$5 = _el$4.firstChild, _el$6 = _el$5.nextSibling, _el$9 = _el$2.nextSibling;
    _el$4.addEventListener("change", (e) => updateFrequency(parseInt(e.currentTarget.value, 10)));
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => frequency() > 0)() && nextRunTime();
      },
      get children() {
        var _el$7 = _tmpl$$1(); _el$7.firstChild;
        insert(_el$7, (() => {
          var _c$ = memo(() => !!nextRunTime());
          return () => _c$() ? formatTimeUntil(nextRunTime()) : "Calculating...";
        })(), null);
        return _el$7;
      }
    }), _el$9);
    addEventListener(_el$9, "click", props.onRun, true);
    insert(_el$9, createComponent(Show, {
      get when() {
        return !props.isRunning;
      },
      get fallback() {
        return _tmpl$6$1();
      },
      get children() {
        return _tmpl$2$1();
      }
    }), null);
    insert(_el$9, () => props.isRunning ? "Running..." : "Run Diagnostics Now", null);
    insert(_el$, createComponent(Show, {
      get when() {
        return frequency() === 0;
      },
      get children() {
        return _tmpl$3$1();
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return frequency() > 0;
      },
      get children() {
        var _el$10 = _tmpl$4$1();
        insert(_el$10, (() => {
          var _c$2 = memo(() => frequency() === 1440);
          return () => _c$2() ? "Automatic scan runs once per day. You can also run manually anytime to get the latest results." : memo(() => frequency() === 360)() ? "Automatic scan runs every 6 hours. You can also run manually anytime to get the latest results." : memo(() => frequency() === 720)() ? "Automatic scan runs every 12 hours. You can also run manually anytime to get the latest results." : `Automatic scan runs every ${frequency() < 60 ? `${frequency()} minutes` : `${Math.floor(frequency() / 60)} hour${Math.floor(frequency() / 60) > 1 ? "s" : ""}`}. You can also run manually anytime.`;
        })());
        return _el$10;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$ = props.isRunning, _v$2 = frequency() === 1440, _v$3 = props.isRunning, _v$4 = props.isRunning ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$5 = props.isRunning ? "var(--text-secondary)" : "white";
      _v$ !== _p$.e && (_el$4.disabled = _p$.e = _v$);
      _v$2 !== _p$.t && (_el$6.selected = _p$.t = _v$2);
      _v$3 !== _p$.a && (_el$9.disabled = _p$.a = _v$3);
      _v$4 !== _p$.o && setStyleProperty(_el$9, "background", _p$.o = _v$4);
      _v$5 !== _p$.i && setStyleProperty(_el$9, "color", _p$.i = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0
    });
    createRenderEffect(() => _el$4.value = frequency());
    return _el$;
  })();
};
delegateEvents(["click"]);

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"title="Show single replica workloads"style="background:rgba(245, 158, 11, 0.2);color:var(--warning-color);border:1px solid rgba(245, 158, 11, 0.4)"><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Single Replica Issues<span class="px-1.5 py-0.5 rounded text-xs"style="background:rgba(245, 158, 11, 0.3)">`), _tmpl$2 = /* @__PURE__ */ template(`<div class="text-center py-8"><p class="text-xs mt-2"style=color:var(--text-muted)>Optimized with parallel execution and caching`), _tmpl$3 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4 text-green-500"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class=text-lg>All checks passed!</p><p class=text-sm>No issues found in the selected scope.`), _tmpl$4 = /* @__PURE__ */ template(`<div class=space-y-3>`), _tmpl$5 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mt-6 pt-4 border-t"style=border-color:var(--border-color)><div class=text-sm style=color:var(--text-secondary)>Showing <!>-<!> of <!> findings</div><div class="flex items-center gap-2"><button class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button><div class="flex items-center gap-1"></div><button class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next`), _tmpl$6 = /* @__PURE__ */ template(`<div class="card p-6"><h3 class="font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>Findings (<!>)`), _tmpl$7 = /* @__PURE__ */ template(`<div class="card p-6"><div class="text-center py-8"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><p class="text-lg mb-2">Diagnostics are disabled</p><p class=text-sm>Enable Diagnostics in Settings to run health checks`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-6 mt-6"><h3 class="font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>High Availability (HA) Recommendations</h3><div class=space-y-4><div class="p-4 rounded-lg border-l-4"style="background:rgba(245, 158, 11, 0.1);border-color:var(--warning-color)"><div class="flex items-start gap-3"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--warning-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class=flex-1><h4 class="font-medium mb-2"style=color:var(--text-primary)>Single Replica Workloads</h4><p class="text-sm mb-3"style=color:var(--text-secondary)>Deployments and StatefulSets with only 1 replica are at high risk. At least 2 replicas are recommended for production workloads to ensure high availability.</p><div class="text-xs space-y-1"style=color:var(--text-muted)><p><strong>Check:</strong> REL005 - Single Replica Deployment/StatefulSet</p><p><strong>Impact:</strong> No redundancy - single point of failure</p></div></div></div></div><div class="p-4 rounded-lg border-l-4"style="background:rgba(6, 182, 212, 0.1);border-color:var(--accent-primary)"><div class="flex items-start gap-3"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div class=flex-1><h4 class="font-medium mb-2"style=color:var(--text-primary)>Pod Anti-Affinity</h4><p class="text-sm mb-3"style=color:var(--text-secondary)>Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.</p><div class="text-xs space-y-1"style=color:var(--text-muted)><p><strong>Check:</strong> REL007 - No Anti-Affinity</p><p><strong>Recommendation:</strong> Add podAntiAffinity rules to pod templates</p></div></div></div></div><div class="p-4 rounded-lg border-l-4"style="background:rgba(6, 182, 212, 0.1);border-color:var(--accent-primary)"><div class="flex items-start gap-3"><svg class="w-5 h-5 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><div class=flex-1><h4 class="font-medium mb-2"style=color:var(--text-primary)>Pod Disruption Budget (PDB)</h4><p class="text-sm mb-3"style=color:var(--text-secondary)>PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).</p><div class="text-xs space-y-1"style=color:var(--text-muted)><p><strong>Check:</strong> REL006 - Missing PDB</p><p><strong>Recommendation:</strong> Create PDBs for all production workloads with 2+ replicas</p></div></div></div></div><div class="mt-4 p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Best Practices Summary</h4><ul class="text-sm space-y-1"style=color:var(--text-secondary)><li>• Use at least 2 replicas for production workloads</li><li>• Configure podAntiAffinity to spread pods across nodes</li><li>• Create PodDisruptionBudgets for multi-replica workloads</li><li>• Consider using topologySpreadConstraints for advanced placement</li><li>• Monitor pod distribution across nodes regularly`), _tmpl$9 = /* @__PURE__ */ template(`<div class="text-center py-4"style=color:var(--text-secondary)>Loading vulnerability stats...`), _tmpl$0 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)><p class="text-xs mt-2"style=color:var(--text-muted)>This may take a few moments`), _tmpl$1 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--error-color)><p class=mb-2>Error scanning for vulnerabilities</p><p class=text-xs style=color:var(--text-muted)></p><button class="mt-4 px-4 py-2 rounded text-sm transition-colors"style=background:var(--accent-primary);color:white>Retry Scan`), _tmpl$10 = /* @__PURE__ */ template(`<div class="text-center py-8"style=color:var(--text-secondary)><svg class="w-12 h-12 mx-auto mb-4 text-green-500"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class=mb-2>No vulnerabilities found matching the selected criteria.</p><p class=text-xs style=color:var(--text-muted)>Click "Scan Cluster" to scan for vulnerabilities.`), _tmpl$11 = /* @__PURE__ */ template(`<div class="flex items-center justify-between mt-6 pt-4 border-t"style=border-color:var(--border-color)><div class=text-sm style=color:var(--text-secondary)>Showing <!>-<!> of <!> vulnerabilities</div><div class="flex items-center gap-2"><button class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Previous</button><div class="flex items-center gap-1"></div><button class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next`), _tmpl$12 = /* @__PURE__ */ template(`<div class="mt-4 text-xs text-center"style=color:var(--text-muted)>Last NVD refresh: `), _tmpl$13 = /* @__PURE__ */ template(`<div class="card p-6 mt-6"><div class="flex items-center justify-between mb-4"><h3 class="font-semibold flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>CVE Vulnerabilities (NIST NVD)</h3><div class="flex items-center gap-2"><select class="px-3 py-1.5 rounded text-sm"style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border-color)"><option value>All Severities</option><option value=CRITICAL>Critical</option><option value=HIGH>High</option><option value=MEDIUM>Medium</option><option value=LOW>Low</option></select><button class="px-3 py-1.5 rounded text-sm transition-colors"title="Refresh NVD data"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button><button class="px-3 py-1.5 rounded text-sm transition-colors"style=background:var(--accent-primary);color:white>Scan Cluster`), _tmpl$14 = /* @__PURE__ */ template(`<div class="card p-6 mt-6"><div class="text-center py-8"style=color:var(--text-muted)><svg class="w-12 h-12 mx-auto mb-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><p class="text-lg mb-2">CVE Vulnerabilities are disabled</p><p class=text-sm>Enable CVE Vulnerabilities (NIST NVD) in Settings to scan for vulnerabilities`), _tmpl$15 = /* @__PURE__ */ template(`<div class=space-y-6><div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold"style=color:var(--text-primary)>Security & Diagnostics</h1><p style=color:var(--text-secondary)>Cluster health checks, security posture, vulnerability scanning, and best practices analysis</p></div><div class="flex items-center gap-2 flex-wrap"><button class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"title="Export diagnostic report"style=background:var(--bg-tertiary);color:var(--text-primary)><svg class="w-4 h-4"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Export Report</button></div></div><div class="grid grid-cols-1 md:grid-cols-4 gap-6"><div class="card p-6"><div class=text-center><div class="text-5xl font-bold mb-2"></div><div style=color:var(--text-secondary)>Health Score</div><div class="mt-4 h-2 rounded-full overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full transition-all"></div></div></div></div><div class="card p-6"><div class=text-center><div class="text-3xl font-bold"style=color:var(--error-color)></div><div class=text-sm style=color:var(--text-secondary)>Critical Issues</div></div></div><div class="card p-6"><div class=text-center><div class="text-3xl font-bold"style=color:var(--warning-color)></div><div class=text-sm style=color:var(--text-secondary)>Warnings</div></div></div><div class="card p-6"><div class=text-center><div class="text-3xl font-bold"style=color:var(--accent-primary)></div><div class=text-sm style=color:var(--text-secondary)>Info</div></div></div></div><div class="flex gap-2 flex-wrap items-center"><button class="px-3 py-1.5 rounded-lg text-sm transition-colors">All Categories</button><div class=flex-1></div></div><div class="card p-6 mt-6"><h3 class="font-semibold mb-4 flex items-center gap-2"style=color:var(--text-primary)><svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>Security Best Practices</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Pod Security</h4><ul class="space-y-1 text-sm"style=color:var(--text-secondary)><li>- Run containers as non-root user</li><li>- Use read-only root filesystem</li><li>- Drop all capabilities and add only needed ones</li><li>- Use Pod Security Standards</li></ul></div><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Network Security</h4><ul class="space-y-1 text-sm"style=color:var(--text-secondary)><li>- Implement NetworkPolicies</li><li>- Use TLS for all communications</li><li>- Restrict egress traffic</li><li>- Use service mesh for mTLS</li></ul></div><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Access Control</h4><ul class="space-y-1 text-sm"style=color:var(--text-secondary)><li>- Use RBAC with least privilege</li><li>- Avoid cluster-admin bindings</li><li>- Use dedicated service accounts</li><li>- Enable audit logging</li></ul></div><div class="p-4 rounded-lg"style=background:var(--bg-tertiary)><h4 class="font-medium mb-2"style=color:var(--text-primary)>Image Security</h4><ul class="space-y-1 text-sm"style=color:var(--text-secondary)><li>- Scan images for vulnerabilities</li><li>- Use trusted base images</li><li>- Sign and verify images</li><li>- Keep images up to date`), _tmpl$16 = /* @__PURE__ */ template(`<span class="ml-1 opacity-70">(<!>)`), _tmpl$17 = /* @__PURE__ */ template(`<button class="px-3 py-1.5 rounded-lg text-sm transition-colors">`), _tmpl$18 = /* @__PURE__ */ template(`<div class="mt-2 text-xs flex items-start gap-1"style=color:var(--accent-primary)><svg class="w-3 h-3 mt-0.5 flex-shrink-0"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span>`), _tmpl$19 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"><div class="flex items-start justify-between gap-4"><div class="flex items-start gap-3 flex-1"><div class=mt-0.5></div><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1"><span class=font-medium style=color:var(--text-primary)></span><span class="px-2 py-0.5 rounded text-xs"></span><span class="px-2 py-0.5 rounded text-xs"style=background:var(--bg-tertiary);color:var(--text-muted)></span></div><div class="text-sm mb-1"style=color:var(--text-secondary)></div><div class=text-xs style=color:var(--text-muted)><span class=font-mono>`), _tmpl$20 = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--error-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">`), _tmpl$21 = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--warning-color)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">`), _tmpl$22 = /* @__PURE__ */ template(`<svg class="w-5 h-5"fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--accent-primary)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">`), _tmpl$23 = /* @__PURE__ */ template(`<span> in `), _tmpl$24 = /* @__PURE__ */ template(`<button>`), _tmpl$25 = /* @__PURE__ */ template(`<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class="text-2xl font-bold"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-secondary)>Total CVEs</div></div><div class="p-3 rounded-lg"style="background:rgba(239, 68, 68, 0.1)"><div class="text-2xl font-bold"style=color:var(--error-color)></div><div class=text-xs style=color:var(--text-secondary)>Critical</div></div><div class="p-3 rounded-lg"style="background:rgba(245, 158, 11, 0.1)"><div class="text-2xl font-bold"style=color:var(--warning-color)></div><div class=text-xs style=color:var(--text-secondary)>High</div></div><div class="p-3 rounded-lg"style="background:rgba(6, 182, 212, 0.1)"><div class="text-2xl font-bold"style=color:var(--accent-primary)></div><div class=text-xs style=color:var(--text-secondary)>Medium</div></div><div class="p-3 rounded-lg"style=background:var(--bg-tertiary)><div class="text-2xl font-bold"style=color:var(--text-primary)></div><div class=text-xs style=color:var(--text-secondary)>CVE Cache`), _tmpl$26 = /* @__PURE__ */ template(`<div class="mt-2 flex flex-wrap gap-2">`), _tmpl$27 = /* @__PURE__ */ template(`<div class="p-4 rounded-lg border"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-2"><span class="font-mono font-bold"style=color:var(--text-primary)></span><span class="px-2 py-0.5 rounded text-xs font-medium"style=color:white></span><span class=text-sm style=color:var(--text-secondary)>CVSS: </span></div><div class="text-sm mb-2"style=color:var(--text-secondary)></div><div class="text-xs mb-2"style=color:var(--text-muted)><span class=font-mono>`), _tmpl$28 = /* @__PURE__ */ template(`<span> in <!>/`), _tmpl$29 = /* @__PURE__ */ template(`<span> (<!>)`), _tmpl$30 = /* @__PURE__ */ template(`<a target=_blank rel="noopener noreferrer"class="text-xs px-2 py-1 rounded"style=background:var(--bg-tertiary);color:var(--accent-primary)>Reference`);
const Security = () => {
  const [initialFilter] = createSignal(() => {
    try {
      const stored = sessionStorage.getItem("securityFilter");
      if (stored) {
        const filter = JSON.parse(stored);
        sessionStorage.removeItem("securityFilter");
        return filter;
      }
    } catch (e) {
    }
    return null;
  });
  const [selectedCategory, setSelectedCategory] = createSignal(initialFilter()?.category || "");
  const [selectedSeverity, setSelectedSeverity] = createSignal(initialFilter()?.severity || "");
  const [diagnosticsPage, setDiagnosticsPage] = createSignal(1);
  const [vulnPage, setVulnPage] = createSignal(1);
  const [diagnosticsProgress, setDiagnosticsProgress] = createSignal("");
  const [lastDiagnosticsRun, setLastDiagnosticsRun] = createSignal(null);
  const itemsPerPage = 10;
  onMount(() => {
    const handleFilterChange = (event) => {
      const filter = event.detail;
      if (filter.category) setSelectedCategory(filter.category);
      if (filter.severity) setSelectedSeverity(filter.severity);
    };
    window.addEventListener("securityFilterChange", handleFilterChange);
    return () => {
      window.removeEventListener("securityFilterChange", handleFilterChange);
    };
  });
  const isDiagnosticsEnabled = () => {
    return settings().enableDiagnostics;
  };
  const isCVEEnabled = () => {
    return settings().enableCVEVulnerabilities;
  };
  const isSecurityChecksEnabled = () => {
    return settings().enableSecurityChecks;
  };
  const [categories] = createResource(api.getDiagnosticsCategories);
  const [diagnostics, {
    refetch
  }] = createResource(() => ({
    ns: namespace(),
    cat: selectedCategory(),
    enabled: isDiagnosticsEnabled()
  }), async (params) => {
    if (!params.enabled) {
      return {
        findings: [],
        summary: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
          byCategory: {}
        },
        total: 0
      };
    }
    setDiagnosticsPage(1);
    setDiagnosticsProgress("Initializing diagnostics...");
    const ns = params.ns === "_all" ? void 0 : params.ns;
    const cat = params.cat || void 0;
    try {
      setDiagnosticsProgress(cat ? `Running ${cat} checks in parallel...` : "Running all diagnostic checks in parallel...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45e3);
      try {
        const result = await api.runDiagnostics(ns, cat);
        clearTimeout(timeoutId);
        setDiagnosticsProgress("");
        setLastDiagnosticsRun(/* @__PURE__ */ new Date());
        return result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          setDiagnosticsProgress("");
          return {
            findings: [],
            summary: {
              total: 0,
              critical: 0,
              warning: 0,
              info: 0,
              byCategory: {}
            },
            total: 0
          };
        }
        throw fetchError;
      }
    } catch (error) {
      setDiagnosticsProgress("");
      console.error("Diagnostics error:", error);
      return {
        findings: [],
        summary: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
          byCategory: {}
        },
        total: 0
      };
    }
  });
  const [scanKey, setScanKey] = createSignal(0);
  const [vulnerabilities, {
    refetch: refetchVulns
  }] = createResource(() => {
    const sev = selectedSeverity();
    const key = scanKey();
    return key > 0 ? {
      severity: sev,
      key
    } : null;
  }, async (params) => {
    try {
      console.log("[Security] Fetching vulnerabilities with params:", params);
      const startTime = Date.now();
      const result = await api.scanVulnerabilities(params.severity || void 0);
      const duration = Date.now() - startTime;
      console.log(`[Security] Vulnerabilities fetched in ${duration}ms:`, result?.vulnerabilities?.length || 0, "vulnerabilities");
      console.log("[Security] Result structure:", {
        hasVulnerabilities: !!result?.vulnerabilities,
        vulnArray: Array.isArray(result?.vulnerabilities),
        vulnLength: result?.vulnerabilities?.length,
        hasStats: !!result?.stats,
        hasLastRefresh: !!result?.lastRefresh,
        resultKeys: result ? Object.keys(result) : []
      });
      setVulnPage(1);
      const response = {
        vulnerabilities: Array.isArray(result?.vulnerabilities) ? result.vulnerabilities : [],
        stats: result?.stats || {},
        lastRefresh: result?.lastRefresh || null
      };
      console.log("[Security] Returning response:", {
        vulnCount: response.vulnerabilities.length,
        hasStats: !!response.stats,
        hasLastRefresh: !!response.lastRefresh
      });
      return response;
    } catch (error) {
      console.error("[Security] Failed to scan vulnerabilities:", error);
      return {
        vulnerabilities: [],
        stats: {},
        lastRefresh: null
      };
    }
  });
  const [vulnStats] = createResource(api.getVulnerabilityStats);
  const paginatedDiagnostics = createMemo(() => {
    const data = diagnostics();
    if (!data || !Array.isArray(data.findings) || data.findings.length === 0) {
      return {
        list: [],
        totalPages: 0,
        startIdx: 0,
        endIdx: 0,
        total: 0
      };
    }
    const allFindings = data.findings;
    const totalPages = Math.ceil(allFindings.length / itemsPerPage);
    const currentPage = diagnosticsPage();
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return {
      list: allFindings.slice(startIdx, endIdx),
      totalPages,
      startIdx,
      endIdx,
      total: allFindings.length
    };
  });
  const paginatedVulnerabilities = createMemo(() => {
    const data = vulnerabilities();
    console.log("[Security] paginatedVulnerabilities memo - data:", {
      hasData: !!data,
      hasVulnerabilities: !!data?.vulnerabilities,
      isArray: Array.isArray(data?.vulnerabilities),
      length: data?.vulnerabilities?.length || 0
    });
    if (!data || !Array.isArray(data.vulnerabilities) || data.vulnerabilities.length === 0) {
      console.log("[Security] paginatedVulnerabilities - returning empty");
      return {
        list: [],
        totalPages: 0,
        startIdx: 0,
        endIdx: 0,
        total: 0
      };
    }
    const vulnList = data.vulnerabilities;
    const totalPages = Math.ceil(vulnList.length / itemsPerPage);
    const currentPage = vulnPage();
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const result = {
      list: vulnList.slice(startIdx, endIdx),
      totalPages,
      startIdx,
      endIdx,
      total: vulnList.length
    };
    console.log("[Security] paginatedVulnerabilities - result:", result);
    return result;
  });
  onMount(() => {
    console.log("[Security] Component mounted, triggering initial scan");
    setScanKey(1);
  });
  createEffect(() => {
    const data = vulnerabilities();
    const paginated = paginatedVulnerabilities();
    console.log("[Security] Vulnerabilities resource state:", {
      loading: vulnerabilities.loading,
      error: vulnerabilities.error,
      hasData: !!data,
      vulnCount: data?.vulnerabilities?.length || 0,
      scanKey: scanKey(),
      selectedSeverity: selectedSeverity(),
      paginatedTotal: paginated.total,
      paginatedListLength: paginated.list.length,
      dataStructure: data ? {
        hasVulnerabilities: !!data.vulnerabilities,
        vulnArrayLength: data.vulnerabilities?.length,
        isArray: Array.isArray(data.vulnerabilities),
        hasStats: !!data.stats,
        hasLastRefresh: !!data.lastRefresh
      } : null
    });
  });
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "var(--error-color)";
      case "warning":
        return "var(--warning-color)";
      case "info":
        return "var(--accent-primary)";
      default:
        return "var(--text-secondary)";
    }
  };
  const getSeverityBg = (severity) => {
    switch (severity) {
      case "critical":
        return "rgba(239, 68, 68, 0.1)";
      case "warning":
        return "rgba(245, 158, 11, 0.1)";
      case "info":
        return "rgba(6, 182, 212, 0.1)";
      default:
        return "var(--bg-tertiary)";
    }
  };
  const getSeverityBorder = (severity) => {
    switch (severity) {
      case "critical":
        return "rgba(239, 68, 68, 0.3)";
      case "warning":
        return "rgba(245, 158, 11, 0.3)";
      case "info":
        return "rgba(6, 182, 212, 0.3)";
      default:
        return "var(--border-color)";
    }
  };
  const calculateScore = () => {
    const summary = diagnostics()?.summary;
    if (!summary || summary.total === 0) return 100;
    const criticalWeight = summary.critical * 25;
    const warningWeight = summary.warning * 8;
    const infoWeight = summary.info * 1;
    const score = Math.max(0, 100 - criticalWeight - warningWeight - infoWeight);
    return Math.round(score);
  };
  return (() => {
    var _el$ = _tmpl$15(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$7 = _el$6.firstChild, _el$8 = _el$2.nextSibling, _el$9 = _el$8.firstChild, _el$0 = _el$9.firstChild, _el$1 = _el$0.firstChild, _el$10 = _el$1.nextSibling, _el$11 = _el$10.nextSibling, _el$12 = _el$11.firstChild, _el$13 = _el$9.nextSibling, _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild; _el$15.nextSibling; var _el$17 = _el$13.nextSibling, _el$18 = _el$17.firstChild, _el$19 = _el$18.firstChild; _el$19.nextSibling; var _el$21 = _el$17.nextSibling, _el$22 = _el$21.firstChild, _el$23 = _el$22.firstChild; _el$23.nextSibling; var _el$25 = _el$8.nextSibling, _el$26 = _el$25.firstChild, _el$27 = _el$26.nextSibling, _el$84 = _el$25.nextSibling, _el$85 = _el$84.firstChild, _el$86 = _el$85.nextSibling, _el$87 = _el$86.firstChild, _el$88 = _el$87.firstChild; _el$88.nextSibling; var _el$90 = _el$87.nextSibling, _el$91 = _el$90.firstChild; _el$91.nextSibling; var _el$93 = _el$90.nextSibling, _el$94 = _el$93.firstChild; _el$94.nextSibling; var _el$96 = _el$93.nextSibling, _el$97 = _el$96.firstChild; _el$97.nextSibling;
    _el$7.$$click = () => {
      const data = diagnostics();
      if (data) {
        const report = {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          summary: data.summary,
          findings: data.findings
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kubegraf-diagnostics-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };
    insert(_el$6, createComponent(DiagnosticsControls, {
      onRun: () => {
        refetch().then(() => {
          setLastDiagnosticsRun(/* @__PURE__ */ new Date());
        }).catch((err) => {
          console.error("Diagnostics run failed:", err);
        });
      },
      get isRunning() {
        return diagnostics.loading;
      },
      get lastRunTime() {
        return lastDiagnosticsRun();
      }
    }), null);
    insert(_el$1, calculateScore);
    insert(_el$15, () => diagnostics()?.summary?.critical || 0);
    insert(_el$19, () => diagnostics()?.summary?.warning || 0);
    insert(_el$23, () => diagnostics()?.summary?.info || 0);
    _el$26.$$click = () => setSelectedCategory("");
    insert(_el$25, createComponent(For, {
      get each() {
        return categories() || [];
      },
      children: (cat) => (() => {
        var _el$135 = _tmpl$17();
        _el$135.$$click = () => setSelectedCategory(cat.id);
        insert(_el$135, () => cat.name, null);
        insert(_el$135, createComponent(Show, {
          get when() {
            return diagnostics()?.summary?.byCategory?.[cat.id];
          },
          get children() {
            var _el$136 = _tmpl$16(), _el$137 = _el$136.firstChild, _el$139 = _el$137.nextSibling; _el$139.nextSibling;
            insert(_el$136, () => diagnostics()?.summary?.byCategory?.[cat.id], _el$139);
            return _el$136;
          }
        }), null);
        createRenderEffect((_p$) => {
          var _v$16 = selectedCategory() === cat.id ? "var(--accent-primary)" : "var(--bg-tertiary)", _v$17 = selectedCategory() === cat.id ? "white" : "var(--text-secondary)";
          _v$16 !== _p$.e && setStyleProperty(_el$135, "background", _p$.e = _v$16);
          _v$17 !== _p$.t && setStyleProperty(_el$135, "color", _p$.t = _v$17);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$135;
      })()
    }), _el$27);
    insert(_el$25, createComponent(Show, {
      get when() {
        return memo(() => !!diagnostics())() && (diagnostics()?.findings || []).some((f) => f.rule === "REL005");
      },
      get children() {
        var _el$28 = _tmpl$(), _el$29 = _el$28.firstChild, _el$30 = _el$29.nextSibling, _el$31 = _el$30.nextSibling;
        _el$28.$$click = () => {
          const allFindings = diagnostics()?.findings || [];
          const singleReplicaFindings = allFindings.filter((f) => f.rule === "REL005");
          if (selectedCategory() === "reliability" && singleReplicaFindings.length > 0) {
            document.querySelector('[data-rule="REL005"]')?.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          } else {
            setSelectedCategory("reliability");
            setTimeout(() => {
              document.querySelector('[data-rule="REL005"]')?.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            }, 300);
          }
        };
        insert(_el$31, () => (diagnostics()?.findings || []).filter((f) => f.rule === "REL005").length);
        return _el$28;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return isDiagnosticsEnabled();
      },
      get children() {
        var _el$32 = _tmpl$6(), _el$33 = _el$32.firstChild, _el$34 = _el$33.firstChild, _el$35 = _el$34.nextSibling, _el$37 = _el$35.nextSibling; _el$37.nextSibling;
        insert(_el$33, () => diagnostics()?.total || 0, _el$37);
        insert(_el$32, createComponent(Show, {
          get when() {
            return diagnostics.loading;
          },
          get children() {
            var _el$38 = _tmpl$2(), _el$39 = _el$38.firstChild;
            insert(_el$38, createComponent(LoadingSpinner, {
              size: "lg",
              showText: true,
              get text() {
                return diagnosticsProgress() || "Running diagnostics in parallel...";
              }
            }), _el$39);
            return _el$38;
          }
        }), null);
        insert(_el$32, createComponent(Show, {
          get when() {
            return memo(() => !!!diagnostics.loading)() && (diagnostics()?.findings?.length || 0) === 0;
          },
          get children() {
            return _tmpl$3();
          }
        }), null);
        insert(_el$32, createComponent(Show, {
          get when() {
            return memo(() => !!!diagnostics.loading)() && paginatedDiagnostics().total > 0;
          },
          get children() {
            return [(() => {
              var _el$41 = _tmpl$4();
              insert(_el$41, createComponent(For, {
                get each() {
                  return paginatedDiagnostics().list;
                },
                children: (finding) => (() => {
                  var _el$140 = _tmpl$19(), _el$141 = _el$140.firstChild, _el$142 = _el$141.firstChild, _el$143 = _el$142.firstChild, _el$144 = _el$143.nextSibling, _el$145 = _el$144.firstChild, _el$146 = _el$145.firstChild, _el$147 = _el$146.nextSibling, _el$148 = _el$147.nextSibling, _el$149 = _el$145.nextSibling, _el$150 = _el$149.nextSibling, _el$151 = _el$150.firstChild;
                  insert(_el$143, (() => {
                    var _c$ = memo(() => finding.severity === "critical");
                    return () => _c$() ? _tmpl$20() : memo(() => finding.severity === "warning")() ? _tmpl$21() : _tmpl$22();
                  })());
                  insert(_el$146, () => finding.rule);
                  insert(_el$147, () => finding.severity);
                  insert(_el$148, () => finding.category);
                  insert(_el$149, () => finding.message);
                  insert(_el$151, () => finding.resource);
                  insert(_el$150, (() => {
                    var _c$2 = memo(() => !!finding.namespace);
                    return () => _c$2() && (() => {
                      var _el$158 = _tmpl$23(); _el$158.firstChild;
                      insert(_el$158, () => finding.namespace, null);
                      return _el$158;
                    })();
                  })(), null);
                  insert(_el$144, createComponent(Show, {
                    get when() {
                      return finding.remediation;
                    },
                    get children() {
                      var _el$152 = _tmpl$18(), _el$153 = _el$152.firstChild, _el$154 = _el$153.nextSibling;
                      insert(_el$154, () => finding.remediation);
                      return _el$152;
                    }
                  }), null);
                  createRenderEffect((_p$) => {
                    var _v$18 = finding.rule, _v$19 = getSeverityBg(finding.severity), _v$20 = getSeverityBorder(finding.severity), _v$21 = getSeverityBg(finding.severity), _v$22 = getSeverityColor(finding.severity), _v$23 = `1px solid ${getSeverityBorder(finding.severity)}`;
                    _v$18 !== _p$.e && setAttribute(_el$140, "data-rule", _p$.e = _v$18);
                    _v$19 !== _p$.t && setStyleProperty(_el$140, "background", _p$.t = _v$19);
                    _v$20 !== _p$.a && setStyleProperty(_el$140, "border-color", _p$.a = _v$20);
                    _v$21 !== _p$.o && setStyleProperty(_el$147, "background", _p$.o = _v$21);
                    _v$22 !== _p$.i && setStyleProperty(_el$147, "color", _p$.i = _v$22);
                    _v$23 !== _p$.n && setStyleProperty(_el$147, "border", _p$.n = _v$23);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0,
                    a: void 0,
                    o: void 0,
                    i: void 0,
                    n: void 0
                  });
                  return _el$140;
                })()
              }));
              return _el$41;
            })(), (() => {
              var _el$42 = _tmpl$5(), _el$43 = _el$42.firstChild, _el$44 = _el$43.firstChild, _el$48 = _el$44.nextSibling, _el$45 = _el$48.nextSibling, _el$49 = _el$45.nextSibling, _el$46 = _el$49.nextSibling, _el$50 = _el$46.nextSibling; _el$50.nextSibling; var _el$51 = _el$43.nextSibling, _el$52 = _el$51.firstChild, _el$53 = _el$52.nextSibling, _el$54 = _el$53.nextSibling;
              insert(_el$43, () => paginatedDiagnostics().startIdx + 1, _el$48);
              insert(_el$43, () => Math.min(paginatedDiagnostics().endIdx, paginatedDiagnostics().total), _el$49);
              insert(_el$43, () => paginatedDiagnostics().total, _el$50);
              _el$52.$$click = () => setDiagnosticsPage(Math.max(1, diagnosticsPage() - 1));
              insert(_el$53, () => Array.from({
                length: Math.min(5, paginatedDiagnostics().totalPages)
              }, (_, i) => {
                const totalPages = paginatedDiagnostics().totalPages;
                const currentPage = diagnosticsPage();
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (() => {
                  var _el$160 = _tmpl$24();
                  _el$160.$$click = () => setDiagnosticsPage(pageNum);
                  className(_el$160, `px-3 py-1.5 rounded text-sm transition-colors ${pageNum === currentPage ? "font-bold" : ""}`);
                  setStyleProperty(_el$160, "background", pageNum === currentPage ? "var(--accent-primary)" : "var(--bg-tertiary)");
                  setStyleProperty(_el$160, "color", pageNum === currentPage ? "white" : "var(--text-primary)");
                  insert(_el$160, pageNum);
                  return _el$160;
                })();
              }));
              _el$54.$$click = () => setDiagnosticsPage(Math.min(paginatedDiagnostics().totalPages, diagnosticsPage() + 1));
              createRenderEffect((_p$) => {
                var _v$ = diagnosticsPage() === 1, _v$2 = diagnosticsPage() === 1 ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$3 = diagnosticsPage() === 1 ? "var(--text-muted)" : "white", _v$4 = diagnosticsPage() === paginatedDiagnostics().totalPages, _v$5 = diagnosticsPage() === paginatedDiagnostics().totalPages ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$6 = diagnosticsPage() === paginatedDiagnostics().totalPages ? "var(--text-muted)" : "white";
                _v$ !== _p$.e && (_el$52.disabled = _p$.e = _v$);
                _v$2 !== _p$.t && setStyleProperty(_el$52, "background", _p$.t = _v$2);
                _v$3 !== _p$.a && setStyleProperty(_el$52, "color", _p$.a = _v$3);
                _v$4 !== _p$.o && (_el$54.disabled = _p$.o = _v$4);
                _v$5 !== _p$.i && setStyleProperty(_el$54, "background", _p$.i = _v$5);
                _v$6 !== _p$.n && setStyleProperty(_el$54, "color", _p$.n = _v$6);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0,
                n: void 0
              });
              return _el$42;
            })()];
          }
        }), null);
        return _el$32;
      }
    }), _el$84);
    insert(_el$, createComponent(Show, {
      get when() {
        return !isDiagnosticsEnabled();
      },
      get children() {
        var _el$55 = _tmpl$7(); _el$55.firstChild;
        return _el$55;
      }
    }), _el$84);
    insert(_el$, createComponent(Show, {
      get when() {
        return isSecurityChecksEnabled();
      },
      get children() {
        var _el$57 = _tmpl$8(), _el$58 = _el$57.firstChild, _el$59 = _el$58.nextSibling, _el$60 = _el$59.firstChild, _el$61 = _el$60.firstChild, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$63.firstChild, _el$65 = _el$64.nextSibling; _el$65.nextSibling; var _el$67 = _el$60.nextSibling, _el$68 = _el$67.firstChild, _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling, _el$71 = _el$70.firstChild, _el$72 = _el$71.nextSibling; _el$72.nextSibling; var _el$74 = _el$67.nextSibling, _el$75 = _el$74.firstChild, _el$76 = _el$75.firstChild, _el$77 = _el$76.nextSibling, _el$78 = _el$77.firstChild, _el$79 = _el$78.nextSibling; _el$79.nextSibling; var _el$81 = _el$74.nextSibling, _el$82 = _el$81.firstChild; _el$82.nextSibling;
        return _el$57;
      }
    }), _el$84);
    insert(_el$, createComponent(Show, {
      get when() {
        return isCVEEnabled();
      },
      get children() {
        var _el$99 = _tmpl$13(), _el$100 = _el$99.firstChild, _el$101 = _el$100.firstChild, _el$102 = _el$101.nextSibling, _el$103 = _el$102.firstChild, _el$104 = _el$103.nextSibling, _el$105 = _el$104.nextSibling;
        _el$103.addEventListener("change", (e) => setSelectedSeverity(e.currentTarget.value));
        _el$104.$$click = () => api.refreshVulnerabilities().then(() => refetchVulns());
        _el$105.$$click = async () => {
          console.log("[Security] Scan Cluster button clicked");
          setSelectedSeverity("");
          setScanKey((prev) => prev + 1);
          setTimeout(() => {
            console.log("[Security] Manually refetching vulnerabilities");
            refetchVulns();
          }, 50);
        };
        insert(_el$99, createComponent(Show, {
          get when() {
            return vulnStats.loading;
          },
          get fallback() {
            return createComponent(Show, {
              get when() {
                return vulnStats();
              },
              children: (stats) => (() => {
                var _el$161 = _tmpl$25(), _el$162 = _el$161.firstChild, _el$163 = _el$162.firstChild; _el$163.nextSibling; var _el$165 = _el$162.nextSibling, _el$166 = _el$165.firstChild; _el$166.nextSibling; var _el$168 = _el$165.nextSibling, _el$169 = _el$168.firstChild; _el$169.nextSibling; var _el$171 = _el$168.nextSibling, _el$172 = _el$171.firstChild; _el$172.nextSibling; var _el$174 = _el$171.nextSibling, _el$175 = _el$174.firstChild; _el$175.nextSibling;
                insert(_el$163, () => stats().total || 0);
                insert(_el$166, () => stats().critical || 0);
                insert(_el$169, () => stats().high || 0);
                insert(_el$172, () => stats().medium || 0);
                insert(_el$175, () => stats().cveCount || 0);
                return _el$161;
              })()
            });
          },
          get children() {
            return _tmpl$9();
          }
        }), null);
        insert(_el$99, createComponent(Show, {
          get when() {
            return vulnerabilities.loading;
          },
          get children() {
            var _el$107 = _tmpl$0(), _el$108 = _el$107.firstChild;
            insert(_el$107, createComponent(LoadingSpinner, {
              size: "lg",
              showText: true,
              text: "Scanning cluster for vulnerabilities..."
            }), _el$108);
            return _el$107;
          }
        }), null);
        insert(_el$99, createComponent(Show, {
          get when() {
            return vulnerabilities.error;
          },
          get children() {
            var _el$109 = _tmpl$1(), _el$110 = _el$109.firstChild, _el$111 = _el$110.nextSibling, _el$112 = _el$111.nextSibling;
            insert(_el$111, () => String(vulnerabilities.error));
            _el$112.$$click = () => {
              setScanKey((prev) => prev + 1);
              setTimeout(() => refetchVulns(), 50);
            };
            return _el$109;
          }
        }), null);
        insert(_el$99, () => {
          const data = vulnerabilities();
          const paginated = paginatedVulnerabilities();
          console.log("[Security] Render check - vulnerabilities:", {
            loading: vulnerabilities.loading,
            error: vulnerabilities.error,
            hasData: !!data,
            vulnCount: data?.vulnerabilities?.length || 0,
            paginatedTotal: paginated.total,
            shouldShowList: !vulnerabilities.loading && !vulnerabilities.error && paginated.total > 0
          });
          return null;
        }, null);
        insert(_el$99, createComponent(Show, {
          get when() {
            return memo(() => !!(!vulnerabilities.loading && !vulnerabilities.error && vulnerabilities()))() && (vulnerabilities()?.vulnerabilities || []).length === 0;
          },
          get children() {
            var _el$113 = _tmpl$10(), _el$114 = _el$113.firstChild, _el$115 = _el$114.nextSibling; _el$115.nextSibling;
            return _el$113;
          }
        }), null);
        insert(_el$99, createComponent(Show, {
          get when() {
            return memo(() => !!(!vulnerabilities.loading && !vulnerabilities.error))() && paginatedVulnerabilities().total > 0;
          },
          get children() {
            return [(() => {
              var _el$117 = _tmpl$4();
              insert(_el$117, createComponent(For, {
                get each() {
                  return paginatedVulnerabilities().list;
                },
                children: (vuln) => (() => {
                  var _el$177 = _tmpl$27(), _el$178 = _el$177.firstChild, _el$179 = _el$178.firstChild, _el$180 = _el$179.firstChild, _el$181 = _el$180.firstChild, _el$182 = _el$181.nextSibling, _el$183 = _el$182.nextSibling; _el$183.firstChild; var _el$185 = _el$180.nextSibling, _el$186 = _el$185.nextSibling, _el$187 = _el$186.firstChild;
                  insert(_el$181, () => vuln.cveId);
                  insert(_el$182, () => vuln.severity);
                  insert(_el$183, () => vuln.cvssScore?.toFixed(1) || "N/A", null);
                  insert(_el$185, () => vuln.description);
                  insert(_el$187, () => vuln.affectedImage);
                  insert(_el$186, (() => {
                    var _c$3 = memo(() => !!vuln.namespace);
                    return () => _c$3() && (() => {
                      var _el$192 = _tmpl$28(), _el$193 = _el$192.firstChild, _el$195 = _el$193.nextSibling; _el$195.nextSibling;
                      insert(_el$192, () => vuln.namespace, _el$195);
                      insert(_el$192, () => vuln.podName, null);
                      return _el$192;
                    })();
                  })(), null);
                  insert(_el$186, (() => {
                    var _c$4 = memo(() => !!vuln.containerName);
                    return () => _c$4() && (() => {
                      var _el$196 = _tmpl$29(), _el$197 = _el$196.firstChild, _el$199 = _el$197.nextSibling; _el$199.nextSibling;
                      insert(_el$196, () => vuln.containerName, _el$199);
                      return _el$196;
                    })();
                  })(), null);
                  insert(_el$179, createComponent(Show, {
                    get when() {
                      return vuln.remediation;
                    },
                    get children() {
                      var _el$188 = _tmpl$18(), _el$189 = _el$188.firstChild, _el$190 = _el$189.nextSibling;
                      insert(_el$190, () => vuln.remediation);
                      return _el$188;
                    }
                  }), null);
                  insert(_el$179, createComponent(Show, {
                    get when() {
                      return memo(() => !!vuln.references)() && vuln.references.length > 0;
                    },
                    get children() {
                      var _el$191 = _tmpl$26();
                      insert(_el$191, createComponent(For, {
                        get each() {
                          return vuln.references.slice(0, 3);
                        },
                        children: (ref) => (() => {
                          var _el$200 = _tmpl$30();
                          setAttribute(_el$200, "href", ref);
                          return _el$200;
                        })()
                      }));
                      return _el$191;
                    }
                  }), null);
                  createRenderEffect((_p$) => {
                    var _v$24 = vuln.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.1)" : vuln.severity === "HIGH" ? "rgba(245, 158, 11, 0.1)" : "rgba(6, 182, 212, 0.1)", _v$25 = vuln.severity === "CRITICAL" ? "rgba(239, 68, 68, 0.3)" : vuln.severity === "HIGH" ? "rgba(245, 158, 11, 0.3)" : "rgba(6, 182, 212, 0.3)", _v$26 = vuln.severity === "CRITICAL" ? "var(--error-color)" : vuln.severity === "HIGH" ? "var(--warning-color)" : "var(--accent-primary)";
                    _v$24 !== _p$.e && setStyleProperty(_el$177, "background", _p$.e = _v$24);
                    _v$25 !== _p$.t && setStyleProperty(_el$177, "border-color", _p$.t = _v$25);
                    _v$26 !== _p$.a && setStyleProperty(_el$182, "background", _p$.a = _v$26);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0,
                    a: void 0
                  });
                  return _el$177;
                })()
              }));
              return _el$117;
            })(), (() => {
              var _el$118 = _tmpl$11(), _el$119 = _el$118.firstChild, _el$120 = _el$119.firstChild, _el$124 = _el$120.nextSibling, _el$121 = _el$124.nextSibling, _el$125 = _el$121.nextSibling, _el$122 = _el$125.nextSibling, _el$126 = _el$122.nextSibling; _el$126.nextSibling; var _el$127 = _el$119.nextSibling, _el$128 = _el$127.firstChild, _el$129 = _el$128.nextSibling, _el$130 = _el$129.nextSibling;
              insert(_el$119, () => paginatedVulnerabilities().startIdx + 1, _el$124);
              insert(_el$119, () => Math.min(paginatedVulnerabilities().endIdx, paginatedVulnerabilities().total), _el$125);
              insert(_el$119, () => paginatedVulnerabilities().total, _el$126);
              _el$128.$$click = () => setVulnPage(Math.max(1, vulnPage() - 1));
              insert(_el$129, () => Array.from({
                length: Math.min(5, paginatedVulnerabilities().totalPages)
              }, (_, i) => {
                const totalPages = paginatedVulnerabilities().totalPages;
                const currentPage = vulnPage();
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (() => {
                  var _el$201 = _tmpl$24();
                  _el$201.$$click = () => setVulnPage(pageNum);
                  className(_el$201, `px-3 py-1.5 rounded text-sm transition-colors ${pageNum === currentPage ? "font-bold" : ""}`);
                  setStyleProperty(_el$201, "background", pageNum === currentPage ? "var(--accent-primary)" : "var(--bg-tertiary)");
                  setStyleProperty(_el$201, "color", pageNum === currentPage ? "white" : "var(--text-primary)");
                  insert(_el$201, pageNum);
                  return _el$201;
                })();
              }));
              _el$130.$$click = () => setVulnPage(Math.min(paginatedVulnerabilities().totalPages, vulnPage() + 1));
              createRenderEffect((_p$) => {
                var _v$7 = vulnPage() === 1, _v$8 = vulnPage() === 1 ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$9 = vulnPage() === 1 ? "var(--text-muted)" : "white", _v$0 = vulnPage() === paginatedVulnerabilities().totalPages, _v$1 = vulnPage() === paginatedVulnerabilities().totalPages ? "var(--bg-tertiary)" : "var(--accent-primary)", _v$10 = vulnPage() === paginatedVulnerabilities().totalPages ? "var(--text-muted)" : "white";
                _v$7 !== _p$.e && (_el$128.disabled = _p$.e = _v$7);
                _v$8 !== _p$.t && setStyleProperty(_el$128, "background", _p$.t = _v$8);
                _v$9 !== _p$.a && setStyleProperty(_el$128, "color", _p$.a = _v$9);
                _v$0 !== _p$.o && (_el$130.disabled = _p$.o = _v$0);
                _v$1 !== _p$.i && setStyleProperty(_el$130, "background", _p$.i = _v$1);
                _v$10 !== _p$.n && setStyleProperty(_el$130, "color", _p$.n = _v$10);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0,
                o: void 0,
                i: void 0,
                n: void 0
              });
              return _el$118;
            })()];
          }
        }), null);
        insert(_el$99, createComponent(Show, {
          get when() {
            return memo(() => !!vulnerabilities())() && vulnerabilities()?.lastRefresh;
          },
          get children() {
            var _el$131 = _tmpl$12(); _el$131.firstChild;
            insert(_el$131, () => new Date(vulnerabilities()?.lastRefresh || "").toLocaleString(), null);
            return _el$131;
          }
        }), null);
        createRenderEffect(() => _el$103.value = selectedSeverity());
        return _el$99;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return !isCVEEnabled();
      },
      get children() {
        var _el$133 = _tmpl$14(); _el$133.firstChild;
        return _el$133;
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$11 = calculateScore() >= 80 ? "var(--success-color)" : calculateScore() >= 60 ? "var(--warning-color)" : "var(--error-color)", _v$12 = `${calculateScore()}%`, _v$13 = calculateScore() >= 80 ? "var(--success-color)" : calculateScore() >= 60 ? "var(--warning-color)" : "var(--error-color)", _v$14 = selectedCategory() === "" ? "var(--accent-primary)" : "var(--bg-tertiary)", _v$15 = selectedCategory() === "" ? "white" : "var(--text-secondary)";
      _v$11 !== _p$.e && setStyleProperty(_el$1, "color", _p$.e = _v$11);
      _v$12 !== _p$.t && setStyleProperty(_el$12, "width", _p$.t = _v$12);
      _v$13 !== _p$.a && setStyleProperty(_el$12, "background", _p$.a = _v$13);
      _v$14 !== _p$.o && setStyleProperty(_el$26, "background", _p$.o = _v$14);
      _v$15 !== _p$.i && setStyleProperty(_el$26, "color", _p$.i = _v$15);
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

export { Security as default };
//# sourceMappingURL=Security-B0uMF_o5.js.map
