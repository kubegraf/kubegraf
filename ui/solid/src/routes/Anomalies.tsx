import { Component, For, Show, createSignal, createResource, createMemo, onMount, createEffect, onCleanup } from 'solid-js';
import { api, Anomaly, AnomalyStats } from '../services/api';
import { setCurrentView, setSelectedResource, addNotification } from '../stores/ui';
import { refreshTrigger, currentContext, clusterStatus } from '../stores/cluster';
import ConfirmationModal from '../components/ConfirmationModal';
import CommandPreview from '../components/CommandPreview';

const Anomalies: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'anomalies' | 'recommendations'>('recommendations');
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>('');
  const [scanKey, setScanKey] = createSignal(0);
  const [remediating, setRemediating] = createSignal<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = createSignal(false);
  const [pendingAction, setPendingAction] = createSignal<{ type: 'anomaly' | 'recommendation', data: any } | null>(null);
  const [isApplying, setIsApplying] = createSignal(false);
  const [scanProgress, setScanProgress] = createSignal<{
    isScanning: boolean;
    totalPods: number;
    processedPods: number;
    currentSamples: number;
    message: string;
    totalInHistory: number;
  } | null>(null);
  const [progressPollInterval, setProgressPollInterval] = createSignal<number | null>(null);

  // Export recommendations to JSON
  const exportRecommendations = () => {
    const recs = recommendations();
    if (!recs || !recs.recommendations || recs.recommendations.length === 0) {
      addNotification('No recommendations to export', 'warning');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      clusterContext: currentContext(),
      totalRecommendations: recs.total,
      metricsStats: recs.metricsStats,
      recommendations: recs.recommendations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-recommendations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('Recommendations exported successfully', 'success');
  };

  const buildRecommendationCommand = (rec: any): string => {
    // Best-effort equivalent "kubectl" commands for transparency only.
    const [kind, name] = String(rec.resource || '').split('/');
    const ns = rec.namespace || 'default';
    if (!kind || !name) {
      return `# Resource: ${rec.resource || 'unknown'}\n# Namespace: ${ns}\n# Actual operations depend on the recommendation type.`;
    }

    if (rec.recommendedValue && typeof rec.recommendedValue === 'number') {
      // Common case: scaling
      switch (kind) {
        case 'Deployment':
          return `kubectl scale deployment ${name} -n ${ns} --replicas=${rec.recommendedValue}`;
        case 'StatefulSet':
          return `kubectl scale statefulset ${name} -n ${ns} --replicas=${rec.recommendedValue}`;
        case 'DaemonSet':
          return `kubectl get daemonset ${name} -n ${ns} -o yaml  # Recommendation may patch this resource`;
        default:
          return `# Recommendation for ${kind}/${name} in ${ns}\n# Suggested value: ${rec.recommendedValue}`;
      }
    }

    switch (kind) {
      case 'Pod':
        return `kubectl delete pod ${name} -n ${ns}  # Recommendation may restart or reschedule this pod`;
      default:
        return `# Recommendation will modify ${kind}/${name} in namespace ${ns}\n# Exact kubectl commands depend on recommendation type.`;
    }
  };

  // Fetch anomalies - refresh when cluster changes
  const [anomaliesData, { refetch: refetchAnomalies }] = createResource(
    () => {
      const sev = selectedSeverity();
      const key = scanKey();
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { severity: sev, key, context: ctx, refresh };
    },
    async ({ severity }) => {
      try {
        const data = await api.detectAnomalies(severity || undefined);
        console.log('[Anomalies] Fetched anomalies:', data?.anomalies?.length || 0);
        return {
          anomalies: data?.anomalies || [],
          stats: data?.stats || { total: 0, critical: 0, warning: 0, info: 0 },
          duration: data?.duration || '0s'
        };
      } catch (err) {
        console.error('[Anomalies] Failed to fetch anomalies:', err);
        return { anomalies: [], stats: { total: 0, critical: 0, warning: 0, info: 0 }, duration: '0s' };
      }
    }
  );

  // Pagination
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 10;

  const paginatedAnomalies = createMemo(() => {
    const anomalies = anomaliesData()?.anomalies || [];
    const start = (currentPage() - 1) * pageSize;
    const end = start + pageSize;
    return {
      list: anomalies.slice(start, end),
      total: anomalies.length,
      pages: Math.ceil(anomalies.length / pageSize),
    };
  });

  const handleRemediate = async (anomaly: Anomaly) => {
    if (!anomaly.autoRemediate) {
      alert('Auto-remediation is not available for this anomaly type.');
      return;
    }

    if (!confirm(`Are you sure you want to auto-remediate this anomaly?\n\n${anomaly.message}\n\nRecommendation: ${anomaly.recommendation}`)) {
      return;
    }

    setRemediating(anomaly.id);
    try {
      const result = await api.remediateAnomaly(anomaly.id);
      if (result.success) {
        alert(result.message || 'Anomaly remediated successfully!');
        // Refresh anomalies
        setScanKey(prev => prev + 1);
      } else {
        alert('Failed to remediate anomaly.');
      }
    } catch (err: any) {
      alert(`Failed to remediate: ${err.message}`);
    } finally {
      setRemediating(null);
    }
  };

  const handleRemediateRecommendation = async (rec: any) => {
    setPendingAction({ type: 'recommendation', data: rec });
    setConfirmModalOpen(true);
  };

  const confirmApply = async () => {
    const action = pendingAction();
    if (!action) return;

    setIsApplying(true);
    try {
      if (action.type === 'recommendation') {
        const status = clusterStatus();
        if (!status?.connected) {
          addNotification('Cluster is not connected. Connect to a cluster before applying recommendations.', 'error');
          return;
        }
        const result = await api.applyRecommendation(action.data.id);
        if (result?.success) {
          setConfirmModalOpen(false);
          setPendingAction(null);
          addNotification(result?.message || 'Recommendation applied successfully!', 'success');
          refetchRecommendations();
        } else {
          addNotification(result?.error || 'Failed to apply recommendation.', 'error');
        }
      }
    } catch (err: any) {
      addNotification(`Failed to apply: ${err.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const navigateToResource = (rec: any) => {
    // Parse resource type and name from "Deployment/name" or "Pod/name"
    const [resourceType, resourceName] = rec.resource.split('/');
    const namespace = rec.namespace;
    
    // Set the selected resource
    setSelectedResource({
      kind: resourceType,
      name: resourceName,
      namespace: namespace
    });
    
    // Navigate to appropriate view
    if (resourceType === 'Deployment') {
      setCurrentView('deployments');
    } else if (resourceType === 'Pod') {
      setCurrentView('pods');
    } else if (resourceType === 'StatefulSet') {
      setCurrentView('statefulsets');
    } else if (resourceType === 'DaemonSet') {
      setCurrentView('daemonsets');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crash_loop':
        return '🔄';
      case 'cpu_spike':
        return '⚡';
      case 'memory_spike':
        return '💾';
      case 'hpa_maxed':
        return '📈';
      case 'pod_not_ready':
        return '⚠️';
      case 'frequent_restarts':
        return '🔄';
      default:
        return '🔍';
    }
  };

  // Fetch ML Recommendations - refresh when cluster changes or tab changes
  const [recommendations, { refetch: refetchRecommendations }] = createResource(
    () => {
      const shouldFetch = activeTab() === 'recommendations';
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { shouldFetch, context: ctx, refresh };
    },
    async ({ shouldFetch }) => {
      if (!shouldFetch) {
        // Return empty data immediately when tab is not active
        return { recommendations: [], total: 0, error: undefined };
      }
      try {
        console.log('[Anomalies] Fetching ML recommendations...');
        const data = await api.getMLRecommendations();
        console.log('[Anomalies] Fetched ML recommendations:', data);
        return { ...data, error: undefined };
      } catch (err: any) {
        console.error('[Anomalies] Failed to fetch recommendations:', err);
        const errorMessage = err?.message || 'Failed to load ML recommendations. This may take a few moments if there is no historical data.';
        return { 
          recommendations: [], 
          total: 0, 
          error: errorMessage
        };
      }
    }
  );

  // Refetch recommendations when tab changes to recommendations and no data is present yet
  createEffect(() => {
    if (activeTab() === 'recommendations' && !recommendations.loading && !recommendations()) {
      console.log('[Anomalies] Tab changed to recommendations, fetching...');
      refetchRecommendations();
    }
  });

  // Auto-poll ML recommendations when enough data has been collected but recommendations are still empty
  let recommendationsPollAttempts = 0;
  createEffect(() => {
    const isRecommendationsTab = activeTab() === 'recommendations';
    const data = recommendations();
    const isLoading = recommendations.loading;

    // Clear when leaving tab
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

    // Stop polling on error or once we have recommendations
    if (hasError || recs.length > 0 || !hasEnoughData) {
      recommendationsPollAttempts = 0;
      return;
    }

    // Limit polling attempts to avoid infinite loops (e.g. ~1 minute if interval is 5s)
    const maxAttempts = 12;
    if (recommendationsPollAttempts >= maxAttempts) {
      return;
    }

    recommendationsPollAttempts += 1;
    const timeoutId = setTimeout(() => {
      console.log('[Anomalies] Auto-polling ML recommendations (attempt', recommendationsPollAttempts, ')');
      refetchRecommendations();
    }, 5000);

    onCleanup(() => {
      clearTimeout(timeoutId);
    });
  });

  // Poll scan progress while anomalies are loading or recommendations are loading
  createEffect(() => {
    const isAnomaliesLoading = anomaliesData.loading;
    const isRecommendationsLoading = recommendations.loading;
    const isScanning = isAnomaliesLoading || isRecommendationsLoading;

    if (isScanning) {
      // Start polling
      const pollProgress = async () => {
        try {
          const progress = await api.getScanProgress();
          setScanProgress(progress);

          // If scan completed, refetch recommendations to update stats
          if (!progress.isScanning && activeTab() === 'recommendations') {
            refetchRecommendations();
          }
        } catch (err) {
          console.error('[Anomalies] Failed to fetch scan progress:', err);
        }
      };

      // Initial poll
      pollProgress();

      // Set up interval
      const interval = setInterval(pollProgress, 500); // Poll every 500ms for smooth updates
      setProgressPollInterval(interval);

      onCleanup(() => {
        if (interval) {
          clearInterval(interval);
          setProgressPollInterval(null);
        }
      });
    } else {
      // Clear interval when not scanning
      const interval = progressPollInterval();
      if (interval) {
        clearInterval(interval);
        setProgressPollInterval(null);
      }

      // One final poll to get the final state
      api.getScanProgress().then(setScanProgress).catch(console.error);
    }
  });

  onMount(() => {
    // Trigger initial scan
    setScanKey(1);
  });

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>AI/ML Insights</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Anomaly detection and ML-powered recommendations</p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={activeTab() === 'anomalies'}>
            <button
              onClick={() => {
                setScanKey(prev => prev + 1);
                setSelectedSeverity('');
                setCurrentPage(1);
              }}
              disabled={anomaliesData.loading}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              {anomaliesData.loading ? 'Detecting...' : 'Detect Anomalies'}
            </button>
          </Show>
          <Show when={activeTab() === 'recommendations'}>
            <div class="flex gap-2">
              <button
                onClick={() => refetchRecommendations()}
                disabled={recommendations.loading}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                {recommendations.loading ? 'Loading...' : 'Refresh Recommendations'}
              </button>
              <Show when={recommendations() && recommendations()!.recommendations && recommendations()!.recommendations.length > 0}>
                <button
                  onClick={exportRecommendations}
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  title="Export recommendations as JSON"
                >
                  <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('recommendations')}
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab() === 'recommendations' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab() === 'recommendations' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'recommendations' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          ML Recommendations
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab() === 'anomalies' ? 'border-b-2' : 'opacity-60 hover:opacity-100'
          }`}
          style={{
            color: activeTab() === 'anomalies' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'anomalies' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          Anomaly Detection
        </button>
      </div>

      {/* Statistics - Only show for Anomalies tab */}
      <Show when={activeTab() === 'anomalies' && anomaliesData()?.stats}>
        {(stats: () => AnomalyStats) => (
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Anomalies</div>
              <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats().total}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical</div>
              <div class="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats().critical}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Warning</div>
              <div class="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats().warning}</div>
            </div>
            <div class="card p-4">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Info</div>
              <div class="text-2xl font-bold" style={{ color: '#3b82f6' }}>{stats().info}</div>
            </div>
          </div>
        )}
      </Show>

      {/* Filters - Only show for Anomalies tab */}
      <Show when={activeTab() === 'anomalies'}>
        <div class="card p-4">
          <div class="flex items-center gap-4">
            <label class="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Filter by Severity:</label>
            <select
              value={selectedSeverity()}
              onChange={(e) => {
                setSelectedSeverity(e.currentTarget.value);
                setCurrentPage(1);
              }}
              class="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <Show when={anomaliesData()?.duration}>
              <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
                Detection time: {anomaliesData()?.duration}
              </span>
            </Show>
          </div>
        </div>
      </Show>

      {/* Anomalies Tab Content */}
      <Show when={activeTab() === 'anomalies'}>
        {/* Anomalies List */}
      <Show when={anomaliesData.loading}>
        <div class="card p-8 text-center">
          <div class="spinner mx-auto mb-2" />
          <span style={{ color: 'var(--text-muted)' }}>Detecting anomalies...</span>
        </div>
      </Show>

      <Show when={!anomaliesData.loading && !anomaliesData.error && paginatedAnomalies().total > 0}>
        <div class="space-y-4">
          <For each={paginatedAnomalies().list}>
            {(anomaly) => (
              <div
                class="card p-4 border-l-4"
                style={{
                  'border-left-color': getSeverityColor(anomaly.severity),
                }}
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xl">{getTypeIcon(anomaly.type)}</span>
                      <span
                        class="px-2 py-1 rounded text-xs font-medium uppercase"
                        style={{
                          background: `${getSeverityColor(anomaly.severity)}20`,
                          color: getSeverityColor(anomaly.severity),
                        }}
                      >
                        {anomaly.severity}
                      </span>
                      <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {anomaly.type.replace(/_/g, ' ')}
                      </span>
                      <span class="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                        Score: {(anomaly.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{anomaly.message}</h3>
                    <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Namespace:</strong> {anomaly.namespace} | <strong>Pod:</strong> {anomaly.podName}
                      {anomaly.deployment && ` | <strong>Deployment:</strong> ${anomaly.deployment}`}
                    </p>
                    <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      <strong>Recommendation:</strong> {anomaly.recommendation}
                    </p>
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Detected: {new Date(anomaly.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Show when={anomaly.autoRemediate}>
                    <button
                      onClick={() => handleRemediate(anomaly)}
                      disabled={remediating() === anomaly.id}
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      style={{ background: 'var(--accent-primary)', color: 'white' }}
                    >
                      {remediating() === anomaly.id ? 'Remediating...' : 'Auto-Remediate'}
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Pagination */}
        <Show when={paginatedAnomalies().pages > 1}>
          <div class="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage() === 1}
              class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Previous
            </button>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Page {currentPage()} of {paginatedAnomalies().pages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(paginatedAnomalies().pages, prev + 1))}
              disabled={currentPage() === paginatedAnomalies().pages}
              class="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              Next
            </button>
          </div>
        </Show>
      </Show>

      <Show when={!anomaliesData.loading && !anomaliesData.error && paginatedAnomalies().total === 0}>
        <div class="card p-8 text-center">
          <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No Anomalies Detected</p>
          <p style={{ color: 'var(--text-secondary)' }}>Your cluster appears to be healthy!</p>
        </div>
      </Show>

      <Show when={anomaliesData.error}>
        <div class="card p-4 bg-red-500/10 border-l-4 border-red-500">
          <p style={{ color: 'var(--error-color)' }}>
            Error: {anomaliesData.error instanceof Error ? anomaliesData.error.message : String(anomaliesData.error)}
          </p>
        </div>
      </Show>
      </Show>

      {/* ML Recommendations Tab Content */}
      <Show when={activeTab() === 'recommendations'}>
        <Show when={recommendations.loading && activeTab() === 'recommendations'}>
          <div class="card p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <div class="flex flex-col items-center gap-2">
              <span style={{ color: 'var(--text-muted)' }}>Loading ML recommendations...</span>
              <p class="text-sm" style={{ color: 'var(--text-muted)' }}>This may take a few seconds</p>
            </div>
          </div>
        </Show>

        <Show when={!recommendations.loading && recommendations() && recommendations()!.error}>
          <div class="card p-4 bg-red-500/10 border-l-4 border-red-500">
            <p style={{ color: 'var(--error-color)' }}>
              Error: {recommendations()!.error}
            </p>
            <p class="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              Tip: Run anomaly detection first to collect metrics, then try again.
            </p>
          </div>
        </Show>

        {/* Empty state when there are no recommendations yet */}
        <Show
          when={
            !recommendations.loading &&
            recommendations() &&
            !recommendations()!.error &&
            (!recommendations()!.recommendations ||
              !Array.isArray(recommendations()!.recommendations) ||
              recommendations()!.recommendations.length === 0)
          }
        >
          {() => {
            const stats = recommendations()?.metricsStats;
            const totalSamples = stats?.totalSamples || 0;
            const minRequired = stats?.minRequired || 20;
            const progress = stats?.progress || 0;
            const hasEnoughData = stats?.hasEnoughData || false;
            const remainingNeeded = stats?.remainingNeeded || minRequired;

            // When we have enough data but no recommendations yet, treat this as a "preparing" state
            const isPreparing = hasEnoughData && totalSamples >= minRequired;

            return (
              <div class="card p-8 text-center">
                <svg
                  class={`w-16 h-16 mx-auto mb-4 ${isPreparing ? 'animate-spin-slow' : 'opacity-50'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p class="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                  {isPreparing ? 'Preparing ML Recommendations…' : 'No ML Recommendations Yet'}
                </p>

                {/* Scanning Progress (Live Updates) */}
                <Show when={scanProgress()?.isScanning}>
                  {() => {
                    const progress = scanProgress()!;
                    const percentComplete = progress.totalPods > 0 ? (progress.processedPods / progress.totalPods) * 100 : 0;

                    // Calculate estimated time remaining
                    let estimatedTimeRemaining = '';
                    if (progress.startTime && progress.processedPods > 0 && progress.totalPods > 0) {
                      const elapsed = Date.now() - new Date(progress.startTime).getTime();
                      const avgTimePerPod = elapsed / progress.processedPods;
                      const remainingPods = progress.totalPods - progress.processedPods;
                      const estimatedMs = avgTimePerPod * remainingPods;

                      if (estimatedMs < 1000) {
                        estimatedTimeRemaining = '< 1 sec remaining';
                      } else if (estimatedMs < 60000) {
                        estimatedTimeRemaining = `~${Math.ceil(estimatedMs / 1000)} sec remaining`;
                      } else {
                        const minutes = Math.ceil(estimatedMs / 60000);
                        estimatedTimeRemaining = `~${minutes} min${minutes > 1 ? 's' : ''} remaining`;
                      }
                    }

                    return (
                      <div class="max-w-md mx-auto mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                            <span class="animate-spin">⚡</span>
                            Scanning Cluster...
                          </span>
                          <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {progress.processedPods} / {progress.totalPods} pods
                          </span>
                        </div>
                        <div class="w-full rounded-full h-3 overflow-hidden mb-2" style={{ background: 'var(--bg-secondary)' }}>
                          <div
                            class="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${percentComplete}%`,
                              background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                            }}
                          />
                        </div>
                        <div class="flex items-center justify-between">
                          <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {progress.message}
                          </p>
                          <Show when={estimatedTimeRemaining}>
                            <p class="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                              {estimatedTimeRemaining}
                            </p>
                          </Show>
                        </div>
                        <p class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          Collecting samples: {progress.currentSamples} (Total in history: {progress.totalInHistory + progress.currentSamples})
                        </p>
                      </div>
                    );
                  }}
                </Show>

                {/* Metrics Progress */}
                <div class="max-w-md mx-auto mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Metrics Samples Collected
                    </span>
                    <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {(scanProgress()?.totalInHistory || totalSamples).toLocaleString()} {hasEnoughData ? `(min ${minRequired} required)` : `/ ${minRequired}`}
                    </span>
                  </div>
                  <div class="w-full rounded-full h-3 overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        background: hasEnoughData
                          ? 'linear-gradient(90deg, #22c55e, #10b981)'
                          : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                      }}
                    />
                  </div>
                  <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {hasEnoughData
                      ? `✓ ${(scanProgress()?.totalInHistory || totalSamples).toLocaleString()} samples collected! Generating recommendations automatically. (Collects up to 10,000 samples)`
                      : `${remainingNeeded} more sample${remainingNeeded !== 1 ? 's' : ''} needed to start analysis`}
                  </p>
                </div>

                <div class="text-sm space-y-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    Recommendations will appear as the system learns from your cluster metrics and completes the analysis.
                  </p>

                  {/* Info about scanning time and settings */}
                  <div class="mt-4 p-3 rounded-lg text-xs space-y-2" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <p style={{ color: 'var(--text-primary)' }}>
                      <strong>⏱️ About Scanning Time:</strong>
                    </p>
                    <ul class="list-disc list-inside space-y-0.5 ml-2" style={{ color: 'var(--text-muted)' }}>
                      <li>Scan time depends on your current cluster size (number of pods)</li>
                      <li>Small clusters (~10-50 pods): <strong>5-15 seconds</strong></li>
                      <li>Medium clusters (~50-200 pods): <strong>15-45 seconds</strong></li>
                      <li>Large clusters (~200-1000 pods): <strong>1-3 minutes</strong></li>
                      <li>Background collection happens automatically every 5 minutes</li>
                      <li>Time varies based on cluster load and network latency</li>
                    </ul>

                    <div class="pt-2 border-t" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                      <p style={{ color: 'var(--text-primary)' }} class="mb-2">
                        <strong>⚙️ Configure Background Collection:</strong>
                      </p>
                      <a
                        href="/settings"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentView('settings');
                        }}
                        class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{
                          background: 'var(--accent-primary)',
                          color: 'white',
                          textDecoration: 'none'
                        }}
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Open Metrics Collection Settings
                      </a>
                      <p style={{ color: 'var(--text-muted)' }} class="mt-1">
                        Change collection interval, disable auto-collection, or adjust retention period
                      </p>
                    </div>
                  </div>

                  <p class="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                    💡 <strong>Tip:</strong> Run anomaly detection multiple times to collect more metrics. Each scan adds new
                    samples to the history.
                  </p>
                </div>
              </div>
            );
          }}
        </Show>

        <Show when={!recommendations.loading && recommendations() && recommendations()!.recommendations && Array.isArray(recommendations()!.recommendations) && recommendations()!.recommendations.length > 0}>
          <div class="space-y-4">
            <div class="card p-4 flex items-center justify-between">
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Total Recommendations: <strong style={{ color: 'var(--text-primary)' }}>{recommendations()!.total || 0}</strong>
              </div>
              <button
                onClick={exportRecommendations}
                class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                title="Export all recommendations as JSON"
              >
                <svg class="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All
              </button>
            </div>
            <For each={recommendations()!.recommendations || []}>
              {(rec: any) => (
                <div
                  class="card p-4 border-l-4"
                  style={{
                    'border-left-color': rec.severity === 'high' ? '#ef4444' : rec.severity === 'medium' ? '#f59e0b' : '#3b82f6',
                  }}
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          class="px-2 py-1 rounded text-xs font-medium uppercase"
                          style={{
                            background: rec.severity === 'high' ? '#ef444420' : rec.severity === 'medium' ? '#f59e0b20' : '#3b82f620',
                            color: rec.severity === 'high' ? '#ef4444' : rec.severity === 'medium' ? '#f59e0b' : '#3b82f6',
                          }}
                        >
                          {rec.severity}
                        </span>
                        <span
                          class="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            background: rec.type === 'scaling' ? '#a855f720' : rec.type === 'resource_optimization' ? '#22c55e20' : rec.type === 'cost_saving' ? '#f59e0b20' : '#3b82f620',
                            color: rec.type === 'scaling' ? '#a855f7' : rec.type === 'resource_optimization' ? '#22c55e' : rec.type === 'cost_saving' ? '#f59e0b' : '#3b82f6',
                          }}
                        >
                          {rec.type.replace(/_/g, ' ')}
                        </span>
                        <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Confidence: {(rec.confidence * 100).toFixed(0)}%
                        </span>
                        <Show when={rec.autoApply}>
                          <span class="px-2 py-1 rounded text-xs" style={{ background: '#22c55e20', color: '#22c55e' }}>
                            Auto-Apply Available
                          </span>
                        </Show>
                      </div>
                      <h3 class="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{rec.title}</h3>
                      <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        <strong>Resource:</strong> {rec.resource} | <strong>Namespace:</strong> {rec.namespace}
                      </p>
                      <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                      <div class="flex items-center gap-4 text-sm mb-2">
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{rec.currentValue}</strong>
                        </div>
                        <div>→</div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Recommended: </span>
                          <strong style={{ color: 'var(--accent-primary)' }}>{rec.recommendedValue}</strong>
                        </div>
                      </div>
                      <Show when={rec.estimatedSavings}>
                        <div class="mt-2 text-sm" style={{ color: '#22c55e' }}>
                          💰 Estimated Savings: {rec.estimatedSavings}
                        </div>
                      </Show>
                      <div class="mt-2 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>Impact: {rec.impact}</span>
                        <span>Effort: {rec.effort}</span>
                      </div>
                      <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Generated: {new Date(rec.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div class="flex flex-col gap-2">
                      <button
                        onClick={() => navigateToResource(rec)}
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        View Resource
                      </button>
                      <button
                        onClick={() => handleRemediateRecommendation(rec)}
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        style={{ background: 'var(--accent-primary)', color: 'white' }}
                      >
                        {rec.autoApply ? 'Auto-Apply' : 'Apply Recommendation'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <ConfirmationModal
        isOpen={confirmModalOpen()}
        title="Apply Recommendation"
        message={pendingAction()
          ? 'Are you sure you want to apply this recommendation? Review the details and equivalent kubectl operations below.'
          : 'Are you sure you want to apply this recommendation?'}
        variant="info"
        confirmText="Apply"
        loading={isApplying()}
        size="md"
        details={pendingAction() ? [
          { label: 'Title', value: pendingAction()!.data.title },
          { label: 'Description', value: pendingAction()!.data.description },
          { label: 'Recommended Value', value: pendingAction()!.data.recommendedValue }
        ] : undefined}
        onClose={() => {
          setConfirmModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={confirmApply}
      >
        <Show when={pendingAction()}>
          {(action) => (
            <CommandPreview
              label="Equivalent kubectl operations"
              defaultCollapsed={true}
              command={buildRecommendationCommand(action().data)}
              description="This shows an approximate kubectl-equivalent view of what the recommendation will do. The actual changes are applied via the recommendation API on the backend."
            />
          )}
        </Show>
      </ConfirmationModal>
    </div>
  );
};

export default Anomalies;

