import { c as createSignal, j as createResource, k as api, l as currentContext, r as refreshTrigger, a as createMemo, n as createEffect, E as onCleanup, o as onMount, t as template, i as insert, d as createComponent, f as createRenderEffect, S as Show, m as memo, F as For, h as setStyleProperty, e as setAttribute, g as className, a3 as setSelectedResource, s as setCurrentView, w as clusterStatus, G as addNotification, v as delegateEvents } from './index-Bh-O-sIc.js';
import { C as ConfirmationModal } from './ConfirmationModal-CGGyzH3M.js';
import { C as CommandPreview } from './CommandPreview-C6bYxIqz.js';

var _tmpl$ = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--accent-primary);color:white>`), _tmpl$2 = /* @__PURE__ */ template(`<span class=text-sm style=color:var(--text-muted)>Detection time: `), _tmpl$3 = /* @__PURE__ */ template(`<div class="card p-4"><div class="flex items-center gap-4"><label class="text-sm font-medium"style=color:var(--text-secondary)>Filter by Severity:</label><select class="px-3 py-2 rounded-lg text-sm"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)"><option value>All Severities</option><option value=critical>Critical</option><option value=warning>Warning</option><option value=info>Info`), _tmpl$4 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="spinner mx-auto mb-2"></div><span style=color:var(--text-muted)>Detecting anomalies...`), _tmpl$5 = /* @__PURE__ */ template(`<div class=space-y-4>`), _tmpl$6 = /* @__PURE__ */ template(`<div class="flex items-center justify-center gap-2 mt-4"><button class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-secondary);color:var(--text-primary)>Previous</button><span class=text-sm style=color:var(--text-secondary)>Page <!> of </span><button class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"style=background:var(--bg-secondary);color:var(--text-primary)>Next`), _tmpl$7 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><svg class="w-16 h-16 mx-auto mb-4 opacity-50"fill=none stroke=currentColor viewBox="0 0 24 24"><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-lg font-medium mb-2"style=color:var(--text-primary)>No Anomalies Detected</p><p style=color:var(--text-secondary)>Your cluster appears to be healthy!`), _tmpl$8 = /* @__PURE__ */ template(`<div class="card p-4 bg-red-500/10 border-l-4 border-red-500"><p style=color:var(--error-color)>Error: `), _tmpl$9 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><div class="spinner mx-auto mb-2"></div><div class="flex flex-col items-center gap-2"><span style=color:var(--text-muted)>Loading ML recommendations...</span><p class=text-sm style=color:var(--text-muted)>This may take a few seconds`), _tmpl$0 = /* @__PURE__ */ template(`<div class="card p-4 bg-red-500/10 border-l-4 border-red-500"><p style=color:var(--error-color)>Error: </p><p class="text-sm mt-2"style=color:var(--text-muted)>Tip: Run anomaly detection first to collect metrics, then try again.`), _tmpl$1 = /* @__PURE__ */ template(`<div class=space-y-4><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Total Recommendations: <strong style=color:var(--text-primary)>`), _tmpl$10 = /* @__PURE__ */ template(`<div class="space-y-6 p-6"style=minHeight:100vh;background:var(--bg-primary)><div class="flex items-center justify-between flex-wrap gap-4"><div><h1 class="text-3xl font-bold"style=color:var(--text-primary)>AI/ML Insights</h1><p style=color:var(--text-secondary)>Anomaly detection and ML-powered recommendations</p></div><div class="flex items-center gap-2"></div></div><div class="flex gap-2 border-b"style=border-color:var(--border-color)><button>Anomaly Detection</button><button>ML Recommendations`), _tmpl$11 = /* @__PURE__ */ template(`<div class="grid grid-cols-1 md:grid-cols-4 gap-4"><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Total Anomalies</div><div class="text-2xl font-bold"style=color:var(--text-primary)></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Critical</div><div class="text-2xl font-bold"style=color:#ef4444></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Warning</div><div class="text-2xl font-bold"style=color:#f59e0b></div></div><div class="card p-4"><div class=text-sm style=color:var(--text-secondary)>Info</div><div class="text-2xl font-bold"style=color:#3b82f6>`), _tmpl$12 = /* @__PURE__ */ template(`<button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"style=background:var(--accent-primary);color:white>`), _tmpl$13 = /* @__PURE__ */ template(`<div class="card p-4 border-l-4"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-2"><span class=text-xl></span><span class="px-2 py-1 rounded text-xs font-medium uppercase"></span><span class=text-sm style=color:var(--text-secondary)></span><span class="text-sm font-mono"style=color:var(--text-muted)>Score: <!>%</span></div><h3 class="font-semibold mb-1"style=color:var(--text-primary)></h3><p class="text-sm mb-2"style=color:var(--text-secondary)><strong>Namespace:</strong> <!> | <strong>Pod:</strong> </p><p class="text-sm mb-2"style=color:var(--text-secondary)><strong>Recommendation:</strong> </p><div class=text-xs style=color:var(--text-muted)>Detected: `), _tmpl$14 = /* @__PURE__ */ template(`<div class="card p-8 text-center"><svg fill=none stroke=currentColor viewBox="0 0 24 24"style=color:var(--text-muted)><path stroke-linecap=round stroke-linejoin=round stroke-width=2 d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg><p class="text-lg font-medium mb-4"style=color:var(--text-primary)></p><div class="max-w-md mx-auto mb-4"><div class="flex items-center justify-between mb-2"><span class="text-sm font-medium"style=color:var(--text-secondary)>Metrics Collected</span><span class="text-sm font-medium"style=color:var(--text-primary)> / </span></div><div class="w-full rounded-full h-3 overflow-hidden"style=background:var(--bg-tertiary)><div class="h-full rounded-full transition-all duration-300"></div></div><p class="text-xs mt-2"style=color:var(--text-muted)></p></div><div class="text-sm space-y-2 max-w-md mx-auto"style=color:var(--text-secondary)><p>Recommendations will appear as the system learns from your cluster metrics and completes the analysis.</p><p class=text-xs style=color:var(--text-muted)>💡 <strong>Tip:</strong> Run anomaly detection multiple times to collect more metrics. Each scan adds new samples to the history.`), _tmpl$15 = /* @__PURE__ */ template(`<span class="px-2 py-1 rounded text-xs"style=background:#22c55e20;color:#22c55e>Auto-Apply Available`), _tmpl$16 = /* @__PURE__ */ template(`<div class="mt-2 text-sm"style=color:#22c55e>💰 Estimated Savings: `), _tmpl$17 = /* @__PURE__ */ template(`<div class="card p-4 border-l-4"><div class="flex items-start justify-between gap-4"><div class=flex-1><div class="flex items-center gap-2 mb-2 flex-wrap"><span class="px-2 py-1 rounded text-xs font-medium uppercase"></span><span class="px-2 py-1 rounded text-xs font-medium"></span><span class=text-sm style=color:var(--text-muted)>Confidence: <!>%</span></div><h3 class="font-semibold mb-1"style=color:var(--text-primary)></h3><p class="text-sm mb-2"style=color:var(--text-secondary)><strong>Resource:</strong> <!> | <strong>Namespace:</strong> </p><p class="text-sm mb-2"style=color:var(--text-secondary)></p><div class="flex items-center gap-4 text-sm mb-2"><div><span style=color:var(--text-muted)>Current: </span><strong style=color:var(--text-primary)></strong></div><div>→</div><div><span style=color:var(--text-muted)>Recommended: </span><strong style=color:var(--accent-primary)></strong></div></div><div class="mt-2 flex items-center gap-4 text-xs"style=color:var(--text-muted)><span>Impact: </span><span>Effort: </span></div><div class="text-xs mt-2"style=color:var(--text-muted)>Generated: </div></div><div class="flex flex-col gap-2"><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"style="background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)">View Resource</button><button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"style=background:var(--accent-primary);color:white>`);
const Anomalies = () => {
  const [activeTab, setActiveTab] = createSignal("anomalies");
  const [selectedSeverity, setSelectedSeverity] = createSignal("");
  const [scanKey, setScanKey] = createSignal(0);
  const [remediating, setRemediating] = createSignal(null);
  const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
  const [pendingAction, setPendingAction] = createSignal(null);
  const [isApplying, setIsApplying] = createSignal(false);
  const buildRecommendationCommand = (rec) => {
    const [kind, name] = String(rec.resource || "").split("/");
    const ns = rec.namespace || "default";
    if (!kind || !name) {
      return `# Resource: ${rec.resource || "unknown"}
# Namespace: ${ns}
# Actual operations depend on the recommendation type.`;
    }
    if (rec.recommendedValue && typeof rec.recommendedValue === "number") {
      switch (kind) {
        case "Deployment":
          return `kubectl scale deployment ${name} -n ${ns} --replicas=${rec.recommendedValue}`;
        case "StatefulSet":
          return `kubectl scale statefulset ${name} -n ${ns} --replicas=${rec.recommendedValue}`;
        case "DaemonSet":
          return `kubectl get daemonset ${name} -n ${ns} -o yaml  # Recommendation may patch this resource`;
        default:
          return `# Recommendation for ${kind}/${name} in ${ns}
# Suggested value: ${rec.recommendedValue}`;
      }
    }
    switch (kind) {
      case "Pod":
        return `kubectl delete pod ${name} -n ${ns}  # Recommendation may restart or reschedule this pod`;
      default:
        return `# Recommendation will modify ${kind}/${name} in namespace ${ns}
# Exact kubectl commands depend on recommendation type.`;
    }
  };
  const [anomaliesData, {
    refetch: refetchAnomalies
  }] = createResource(() => {
    const sev = selectedSeverity();
    const key = scanKey();
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      severity: sev,
      key,
      context: ctx,
      refresh
    };
  }, async ({
    severity
  }) => {
    try {
      const data = await api.detectAnomalies(severity || void 0);
      console.log("[Anomalies] Fetched anomalies:", data?.anomalies?.length || 0);
      return {
        anomalies: data?.anomalies || [],
        stats: data?.stats || {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0
        },
        duration: data?.duration || "0s"
      };
    } catch (err) {
      console.error("[Anomalies] Failed to fetch anomalies:", err);
      return {
        anomalies: [],
        stats: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0
        },
        duration: "0s"
      };
    }
  });
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 10;
  const paginatedAnomalies = createMemo(() => {
    const anomalies = anomaliesData()?.anomalies || [];
    const start = (currentPage() - 1) * pageSize;
    const end = start + pageSize;
    return {
      list: anomalies.slice(start, end),
      total: anomalies.length,
      pages: Math.ceil(anomalies.length / pageSize)
    };
  });
  const handleRemediate = async (anomaly) => {
    if (!anomaly.autoRemediate) {
      alert("Auto-remediation is not available for this anomaly type.");
      return;
    }
    if (!confirm(`Are you sure you want to auto-remediate this anomaly?

${anomaly.message}

Recommendation: ${anomaly.recommendation}`)) {
      return;
    }
    setRemediating(anomaly.id);
    try {
      const result = await api.remediateAnomaly(anomaly.id);
      if (result.success) {
        alert(result.message || "Anomaly remediated successfully!");
        setScanKey((prev) => prev + 1);
      } else {
        alert("Failed to remediate anomaly.");
      }
    } catch (err) {
      alert(`Failed to remediate: ${err.message}`);
    } finally {
      setRemediating(null);
    }
  };
  const handleRemediateRecommendation = async (rec) => {
    setPendingAction({
      type: "recommendation",
      data: rec
    });
    setConfirmModalOpen(true);
  };
  const confirmApply = async () => {
    const action = pendingAction();
    if (!action) return;
    setIsApplying(true);
    try {
      if (action.type === "recommendation") {
        const status = clusterStatus();
        if (!status?.connected) {
          addNotification("Cluster is not connected. Connect to a cluster before applying recommendations.", "error");
          return;
        }
        const result = await api.applyRecommendation(action.data.id);
        if (result?.success) {
          setConfirmModalOpen(false);
          setPendingAction(null);
          addNotification(result?.message || "Recommendation applied successfully!", "success");
          refetchRecommendations();
        } else {
          addNotification(result?.error || "Failed to apply recommendation.", "error");
        }
      }
    } catch (err) {
      addNotification(`Failed to apply: ${err.message}`, "error");
    } finally {
      setIsApplying(false);
    }
  };
  const navigateToResource = (rec) => {
    const [resourceType, resourceName] = rec.resource.split("/");
    const namespace = rec.namespace;
    setSelectedResource({
      kind: resourceType,
      name: resourceName,
      namespace
    });
    if (resourceType === "Deployment") {
      setCurrentView("deployments");
    } else if (resourceType === "Pod") {
      setCurrentView("pods");
    } else if (resourceType === "StatefulSet") {
      setCurrentView("statefulsets");
    } else if (resourceType === "DaemonSet") {
      setCurrentView("daemonsets");
    }
  };
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };
  const getTypeIcon = (type) => {
    switch (type) {
      case "crash_loop":
        return "🔄";
      case "cpu_spike":
        return "⚡";
      case "memory_spike":
        return "💾";
      case "hpa_maxed":
        return "📈";
      case "pod_not_ready":
        return "⚠️";
      case "frequent_restarts":
        return "🔄";
      default:
        return "🔍";
    }
  };
  const [recommendations, {
    refetch: refetchRecommendations
  }] = createResource(() => {
    const shouldFetch = activeTab() === "recommendations";
    const ctx = currentContext();
    const refresh = refreshTrigger();
    return {
      shouldFetch,
      context: ctx,
      refresh
    };
  }, async ({
    shouldFetch
  }) => {
    if (!shouldFetch) {
      return {
        recommendations: [],
        total: 0,
        error: void 0
      };
    }
    try {
      console.log("[Anomalies] Fetching ML recommendations...");
      const data = await api.getMLRecommendations();
      console.log("[Anomalies] Fetched ML recommendations:", data);
      return {
        ...data,
        error: void 0
      };
    } catch (err) {
      console.error("[Anomalies] Failed to fetch recommendations:", err);
      const errorMessage = err?.message || "Failed to load ML recommendations. This may take a few moments if there is no historical data.";
      return {
        recommendations: [],
        total: 0,
        error: errorMessage
      };
    }
  });
  createEffect(() => {
    if (activeTab() === "recommendations" && !recommendations.loading && !recommendations()) {
      console.log("[Anomalies] Tab changed to recommendations, fetching...");
      refetchRecommendations();
    }
  });
  let recommendationsPollAttempts = 0;
  createEffect(() => {
    const isRecommendationsTab = activeTab() === "recommendations";
    const data = recommendations();
    const isLoading = recommendations.loading;
    if (!isRecommendationsTab) {
      recommendationsPollAttempts = 0;
      return;
    }
    if (isLoading || !data) {
      return;
    }
    const stats = data.metricsStats;
    const hasEnoughData = stats?.hasEnoughData || false;
    const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
    const hasError = Boolean(data.error);
    if (hasError || recs.length > 0 || !hasEnoughData) {
      recommendationsPollAttempts = 0;
      return;
    }
    const maxAttempts = 12;
    if (recommendationsPollAttempts >= maxAttempts) {
      return;
    }
    recommendationsPollAttempts += 1;
    const timeoutId = setTimeout(() => {
      console.log("[Anomalies] Auto-polling ML recommendations (attempt", recommendationsPollAttempts, ")");
      refetchRecommendations();
    }, 5e3);
    onCleanup(() => {
      clearTimeout(timeoutId);
    });
  });
  onMount(() => {
    setScanKey(1);
  });
  return (() => {
    var _el$ = _tmpl$10(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild, _el$4 = _el$3.firstChild; _el$4.nextSibling; var _el$6 = _el$3.nextSibling, _el$9 = _el$2.nextSibling, _el$0 = _el$9.firstChild, _el$1 = _el$0.nextSibling;
    insert(_el$6, createComponent(Show, {
      get when() {
        return activeTab() === "anomalies";
      },
      get children() {
        var _el$7 = _tmpl$();
        _el$7.$$click = () => {
          setScanKey((prev) => prev + 1);
          setSelectedSeverity("");
          setCurrentPage(1);
        };
        insert(_el$7, () => anomaliesData.loading ? "Detecting..." : "Detect Anomalies");
        createRenderEffect(() => _el$7.disabled = anomaliesData.loading);
        return _el$7;
      }
    }), null);
    insert(_el$6, createComponent(Show, {
      get when() {
        return activeTab() === "recommendations";
      },
      get children() {
        var _el$8 = _tmpl$();
        _el$8.$$click = () => refetchRecommendations();
        insert(_el$8, () => recommendations.loading ? "Loading..." : "Refresh Recommendations");
        createRenderEffect(() => _el$8.disabled = recommendations.loading);
        return _el$8;
      }
    }), null);
    _el$0.$$click = () => setActiveTab("anomalies");
    _el$1.$$click = () => setActiveTab("recommendations");
    insert(_el$, createComponent(Show, {
      get when() {
        return memo(() => activeTab() === "anomalies")() && anomaliesData()?.stats;
      },
      children: (stats) => (() => {
        var _el$48 = _tmpl$11(), _el$49 = _el$48.firstChild, _el$50 = _el$49.firstChild, _el$51 = _el$50.nextSibling, _el$52 = _el$49.nextSibling, _el$53 = _el$52.firstChild, _el$54 = _el$53.nextSibling, _el$55 = _el$52.nextSibling, _el$56 = _el$55.firstChild, _el$57 = _el$56.nextSibling, _el$58 = _el$55.nextSibling, _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling;
        insert(_el$51, () => stats().total);
        insert(_el$54, () => stats().critical);
        insert(_el$57, () => stats().warning);
        insert(_el$60, () => stats().info);
        return _el$48;
      })()
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "anomalies";
      },
      get children() {
        var _el$10 = _tmpl$3(), _el$11 = _el$10.firstChild, _el$12 = _el$11.firstChild, _el$13 = _el$12.nextSibling;
        _el$13.addEventListener("change", (e) => {
          setSelectedSeverity(e.currentTarget.value);
          setCurrentPage(1);
        });
        insert(_el$11, createComponent(Show, {
          get when() {
            return anomaliesData()?.duration;
          },
          get children() {
            var _el$14 = _tmpl$2(); _el$14.firstChild;
            insert(_el$14, () => anomaliesData()?.duration, null);
            return _el$14;
          }
        }), null);
        createRenderEffect(() => _el$13.value = selectedSeverity());
        return _el$10;
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "anomalies";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return anomaliesData.loading;
          },
          get children() {
            var _el$16 = _tmpl$4(), _el$17 = _el$16.firstChild; _el$17.nextSibling;
            return _el$16;
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!anomaliesData.loading && !anomaliesData.error))() && paginatedAnomalies().total > 0;
          },
          get children() {
            return [(() => {
              var _el$19 = _tmpl$5();
              insert(_el$19, createComponent(For, {
                get each() {
                  return paginatedAnomalies().list;
                },
                children: (anomaly) => (() => {
                  var _el$61 = _tmpl$13(), _el$62 = _el$61.firstChild, _el$63 = _el$62.firstChild, _el$64 = _el$63.firstChild, _el$65 = _el$64.firstChild, _el$66 = _el$65.nextSibling, _el$67 = _el$66.nextSibling, _el$68 = _el$67.nextSibling, _el$69 = _el$68.firstChild, _el$71 = _el$69.nextSibling; _el$71.nextSibling; var _el$72 = _el$64.nextSibling, _el$73 = _el$72.nextSibling, _el$74 = _el$73.firstChild, _el$75 = _el$74.nextSibling, _el$79 = _el$75.nextSibling, _el$76 = _el$79.nextSibling, _el$77 = _el$76.nextSibling; _el$77.nextSibling; var _el$80 = _el$73.nextSibling, _el$81 = _el$80.firstChild; _el$81.nextSibling; var _el$83 = _el$80.nextSibling; _el$83.firstChild;
                  insert(_el$65, () => getTypeIcon(anomaly.type));
                  insert(_el$66, () => anomaly.severity);
                  insert(_el$67, () => anomaly.type.replace(/_/g, " "));
                  insert(_el$68, () => (anomaly.score * 100).toFixed(1), _el$71);
                  insert(_el$72, () => anomaly.message);
                  insert(_el$73, () => anomaly.namespace, _el$79);
                  insert(_el$73, () => anomaly.podName, null);
                  insert(_el$73, (() => {
                    var _c$2 = memo(() => !!anomaly.deployment);
                    return () => _c$2() && ` | <strong>Deployment:</strong> ${anomaly.deployment}`;
                  })(), null);
                  insert(_el$80, () => anomaly.recommendation, null);
                  insert(_el$83, () => new Date(anomaly.timestamp).toLocaleString(), null);
                  insert(_el$62, createComponent(Show, {
                    get when() {
                      return anomaly.autoRemediate;
                    },
                    get children() {
                      var _el$85 = _tmpl$12();
                      _el$85.$$click = () => handleRemediate(anomaly);
                      insert(_el$85, () => remediating() === anomaly.id ? "Remediating..." : "Auto-Remediate");
                      createRenderEffect(() => _el$85.disabled = remediating() === anomaly.id);
                      return _el$85;
                    }
                  }), null);
                  createRenderEffect((_p$) => {
                    var _v$9 = getSeverityColor(anomaly.severity), _v$0 = `${getSeverityColor(anomaly.severity)}20`, _v$1 = getSeverityColor(anomaly.severity);
                    _v$9 !== _p$.e && setStyleProperty(_el$61, "border-left-color", _p$.e = _v$9);
                    _v$0 !== _p$.t && setStyleProperty(_el$66, "background", _p$.t = _v$0);
                    _v$1 !== _p$.a && setStyleProperty(_el$66, "color", _p$.a = _v$1);
                    return _p$;
                  }, {
                    e: void 0,
                    t: void 0,
                    a: void 0
                  });
                  return _el$61;
                })()
              }));
              return _el$19;
            })(), createComponent(Show, {
              get when() {
                return paginatedAnomalies().pages > 1;
              },
              get children() {
                var _el$20 = _tmpl$6(), _el$21 = _el$20.firstChild, _el$22 = _el$21.nextSibling, _el$23 = _el$22.firstChild, _el$25 = _el$23.nextSibling; _el$25.nextSibling; var _el$26 = _el$22.nextSibling;
                _el$21.$$click = () => setCurrentPage((prev) => Math.max(1, prev - 1));
                insert(_el$22, currentPage, _el$25);
                insert(_el$22, () => paginatedAnomalies().pages, null);
                _el$26.$$click = () => setCurrentPage((prev) => Math.min(paginatedAnomalies().pages, prev + 1));
                createRenderEffect((_p$) => {
                  var _v$ = currentPage() === 1, _v$2 = currentPage() === paginatedAnomalies().pages;
                  _v$ !== _p$.e && (_el$21.disabled = _p$.e = _v$);
                  _v$2 !== _p$.t && (_el$26.disabled = _p$.t = _v$2);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0
                });
                return _el$20;
              }
            })];
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!anomaliesData.loading && !anomaliesData.error))() && paginatedAnomalies().total === 0;
          },
          get children() {
            var _el$27 = _tmpl$7(), _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling; _el$29.nextSibling;
            return _el$27;
          }
        }), createComponent(Show, {
          get when() {
            return anomaliesData.error;
          },
          get children() {
            var _el$31 = _tmpl$8(), _el$32 = _el$31.firstChild; _el$32.firstChild;
            insert(_el$32, (() => {
              var _c$ = memo(() => anomaliesData.error instanceof Error);
              return () => _c$() ? anomaliesData.error.message : String(anomaliesData.error);
            })(), null);
            return _el$31;
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(Show, {
      get when() {
        return activeTab() === "recommendations";
      },
      get children() {
        return [createComponent(Show, {
          get when() {
            return memo(() => !!recommendations.loading)() && activeTab() === "recommendations";
          },
          get children() {
            var _el$34 = _tmpl$9(), _el$35 = _el$34.firstChild, _el$36 = _el$35.nextSibling, _el$37 = _el$36.firstChild; _el$37.nextSibling;
            return _el$34;
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!recommendations.loading && recommendations()))() && recommendations().error;
          },
          get children() {
            var _el$39 = _tmpl$0(), _el$40 = _el$39.firstChild; _el$40.firstChild; _el$40.nextSibling;
            insert(_el$40, () => recommendations().error, null);
            return _el$39;
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!recommendations.loading && recommendations() && !recommendations().error))() && (!recommendations().recommendations || !Array.isArray(recommendations().recommendations) || recommendations().recommendations.length === 0);
          },
          children: () => {
            const stats = recommendations()?.metricsStats;
            const totalSamples = stats?.totalSamples || 0;
            const minRequired = stats?.minRequired || 20;
            const progress = stats?.progress || 0;
            const hasEnoughData = stats?.hasEnoughData || false;
            const remainingNeeded = stats?.remainingNeeded || minRequired;
            const isPreparing = hasEnoughData && totalSamples >= minRequired;
            return (() => {
              var _el$86 = _tmpl$14(), _el$87 = _el$86.firstChild, _el$88 = _el$87.nextSibling, _el$89 = _el$88.nextSibling, _el$90 = _el$89.firstChild, _el$91 = _el$90.firstChild, _el$92 = _el$91.nextSibling, _el$93 = _el$92.firstChild, _el$94 = _el$90.nextSibling, _el$95 = _el$94.firstChild, _el$96 = _el$94.nextSibling, _el$97 = _el$89.nextSibling, _el$98 = _el$97.firstChild; _el$98.nextSibling;
              setAttribute(_el$87, "class", `w-16 h-16 mx-auto mb-4 ${isPreparing ? "animate-spin-slow" : "opacity-50"}`);
              insert(_el$88, isPreparing ? "Preparing ML Recommendations…" : "No ML Recommendations Yet");
              insert(_el$92, totalSamples, _el$93);
              insert(_el$92, minRequired, null);
              setStyleProperty(_el$95, "background", hasEnoughData ? "linear-gradient(90deg, #22c55e, #10b981)" : "linear-gradient(90deg, #3b82f6, #2563eb)");
              insert(_el$96, hasEnoughData ? "✓ Enough data collected! We are generating recommendations automatically." : `${remainingNeeded} more sample${remainingNeeded !== 1 ? "s" : ""} needed`);
              createRenderEffect((_$p) => setStyleProperty(_el$95, "width", `${Math.min(progress, 100)}%`));
              return _el$86;
            })();
          }
        }), createComponent(Show, {
          get when() {
            return memo(() => !!(!recommendations.loading && recommendations() && recommendations().recommendations && Array.isArray(recommendations().recommendations)))() && recommendations().recommendations.length > 0;
          },
          get children() {
            var _el$43 = _tmpl$1(), _el$44 = _el$43.firstChild, _el$45 = _el$44.firstChild, _el$46 = _el$45.firstChild, _el$47 = _el$46.nextSibling;
            insert(_el$47, () => recommendations().total || 0);
            insert(_el$43, createComponent(For, {
              get each() {
                return recommendations().recommendations || [];
              },
              children: (rec) => (() => {
                var _el$100 = _tmpl$17(), _el$101 = _el$100.firstChild, _el$102 = _el$101.firstChild, _el$103 = _el$102.firstChild, _el$104 = _el$103.firstChild, _el$105 = _el$104.nextSibling, _el$106 = _el$105.nextSibling, _el$107 = _el$106.firstChild, _el$109 = _el$107.nextSibling; _el$109.nextSibling; var _el$111 = _el$103.nextSibling, _el$112 = _el$111.nextSibling, _el$113 = _el$112.firstChild, _el$114 = _el$113.nextSibling, _el$118 = _el$114.nextSibling, _el$115 = _el$118.nextSibling, _el$116 = _el$115.nextSibling; _el$116.nextSibling; var _el$119 = _el$112.nextSibling, _el$120 = _el$119.nextSibling, _el$121 = _el$120.firstChild, _el$122 = _el$121.firstChild, _el$123 = _el$122.nextSibling, _el$124 = _el$121.nextSibling, _el$125 = _el$124.nextSibling, _el$126 = _el$125.firstChild, _el$127 = _el$126.nextSibling, _el$130 = _el$120.nextSibling, _el$131 = _el$130.firstChild; _el$131.firstChild; var _el$133 = _el$131.nextSibling; _el$133.firstChild; var _el$135 = _el$130.nextSibling; _el$135.firstChild; var _el$137 = _el$102.nextSibling, _el$138 = _el$137.firstChild, _el$139 = _el$138.nextSibling;
                insert(_el$104, () => rec.severity);
                insert(_el$105, () => rec.type.replace(/_/g, " "));
                insert(_el$106, () => (rec.confidence * 100).toFixed(0), _el$109);
                insert(_el$103, createComponent(Show, {
                  get when() {
                    return rec.autoApply;
                  },
                  get children() {
                    return _tmpl$15();
                  }
                }), null);
                insert(_el$111, () => rec.title);
                insert(_el$112, () => rec.resource, _el$118);
                insert(_el$112, () => rec.namespace, null);
                insert(_el$119, () => rec.description);
                insert(_el$123, () => rec.currentValue);
                insert(_el$127, () => rec.recommendedValue);
                insert(_el$102, createComponent(Show, {
                  get when() {
                    return rec.estimatedSavings;
                  },
                  get children() {
                    var _el$128 = _tmpl$16(); _el$128.firstChild;
                    insert(_el$128, () => rec.estimatedSavings, null);
                    return _el$128;
                  }
                }), _el$130);
                insert(_el$131, () => rec.impact, null);
                insert(_el$133, () => rec.effort, null);
                insert(_el$135, () => new Date(rec.timestamp).toLocaleString(), null);
                _el$138.$$click = () => navigateToResource(rec);
                _el$139.$$click = () => handleRemediateRecommendation(rec);
                insert(_el$139, () => rec.autoApply ? "Auto-Apply" : "Apply Recommendation");
                createRenderEffect((_p$) => {
                  var _v$10 = rec.severity === "high" ? "#ef4444" : rec.severity === "medium" ? "#f59e0b" : "#3b82f6", _v$11 = rec.severity === "high" ? "#ef444420" : rec.severity === "medium" ? "#f59e0b20" : "#3b82f620", _v$12 = rec.severity === "high" ? "#ef4444" : rec.severity === "medium" ? "#f59e0b" : "#3b82f6", _v$13 = rec.type === "scaling" ? "#a855f720" : rec.type === "resource_optimization" ? "#22c55e20" : rec.type === "cost_saving" ? "#f59e0b20" : "#3b82f620", _v$14 = rec.type === "scaling" ? "#a855f7" : rec.type === "resource_optimization" ? "#22c55e" : rec.type === "cost_saving" ? "#f59e0b" : "#3b82f6";
                  _v$10 !== _p$.e && setStyleProperty(_el$100, "border-left-color", _p$.e = _v$10);
                  _v$11 !== _p$.t && setStyleProperty(_el$104, "background", _p$.t = _v$11);
                  _v$12 !== _p$.a && setStyleProperty(_el$104, "color", _p$.a = _v$12);
                  _v$13 !== _p$.o && setStyleProperty(_el$105, "background", _p$.o = _v$13);
                  _v$14 !== _p$.i && setStyleProperty(_el$105, "color", _p$.i = _v$14);
                  return _p$;
                }, {
                  e: void 0,
                  t: void 0,
                  a: void 0,
                  o: void 0,
                  i: void 0
                });
                return _el$100;
              })()
            }), null);
            return _el$43;
          }
        })];
      }
    }), null);
    insert(_el$, createComponent(ConfirmationModal, {
      get isOpen() {
        return confirmModalOpen();
      },
      title: "Apply Recommendation",
      get message() {
        return pendingAction() ? "Are you sure you want to apply this recommendation? Review the details and equivalent kubectl operations below." : "Are you sure you want to apply this recommendation?";
      },
      variant: "info",
      confirmText: "Apply",
      get loading() {
        return isApplying();
      },
      size: "md",
      get details() {
        return memo(() => !!pendingAction())() ? [{
          label: "Title",
          value: pendingAction().data.title
        }, {
          label: "Description",
          value: pendingAction().data.description
        }, {
          label: "Recommended Value",
          value: pendingAction().data.recommendedValue
        }] : void 0;
      },
      onClose: () => {
        setConfirmModalOpen(false);
        setPendingAction(null);
      },
      onConfirm: confirmApply,
      get children() {
        return createComponent(Show, {
          get when() {
            return pendingAction();
          },
          children: (action) => createComponent(CommandPreview, {
            label: "Equivalent kubectl operations",
            defaultCollapsed: true,
            get command() {
              return buildRecommendationCommand(action().data);
            },
            description: "This shows an approximate kubectl-equivalent view of what the recommendation will do. The actual changes are applied via the recommendation API on the backend."
          })
        });
      }
    }), null);
    createRenderEffect((_p$) => {
      var _v$3 = `px-4 py-2 text-sm font-medium transition-colors ${activeTab() === "anomalies" ? "border-b-2" : "opacity-60 hover:opacity-100"}`, _v$4 = activeTab() === "anomalies" ? "var(--accent-primary)" : "var(--text-secondary)", _v$5 = activeTab() === "anomalies" ? "var(--accent-primary)" : "transparent", _v$6 = `px-4 py-2 text-sm font-medium transition-colors ${activeTab() === "recommendations" ? "border-b-2" : "opacity-60 hover:opacity-100"}`, _v$7 = activeTab() === "recommendations" ? "var(--accent-primary)" : "var(--text-secondary)", _v$8 = activeTab() === "recommendations" ? "var(--accent-primary)" : "transparent";
      _v$3 !== _p$.e && className(_el$0, _p$.e = _v$3);
      _v$4 !== _p$.t && setStyleProperty(_el$0, "color", _p$.t = _v$4);
      _v$5 !== _p$.a && setStyleProperty(_el$0, "border-bottom-color", _p$.a = _v$5);
      _v$6 !== _p$.o && className(_el$1, _p$.o = _v$6);
      _v$7 !== _p$.i && setStyleProperty(_el$1, "color", _p$.i = _v$7);
      _v$8 !== _p$.n && setStyleProperty(_el$1, "border-bottom-color", _p$.n = _v$8);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0
    });
    return _el$;
  })();
};
delegateEvents(["click"]);

export { Anomalies as default };
//# sourceMappingURL=Anomalies-DiljQihw.js.map
