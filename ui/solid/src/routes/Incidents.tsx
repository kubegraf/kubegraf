import { Component, createSignal, createMemo, createEffect, Show, For, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';
import IncidentTable from '../components/IncidentTable';
import IncidentFilters from '../components/IncidentFilters';
import { Incident } from '../services/api';
import { navigateToPod, openPodLogs, navigateToEvent } from '../utils/incident-navigation';
import { IncidentModalV2, MonitoringStatus } from '../components/intelligence';
import { AutoRemediationPanel, LearningDashboard } from '../components/intelligence';
import {
  getCachedIncidents,
  setCachedIncidentsData,
  isCacheValid,
  getIsFetching,
  setFetching,
  invalidateIncidentsCache
} from '../stores/incidents';
import { currentContext, onClusterSwitch } from '../stores/cluster';
import { trackIncidentListLoad } from '../stores/performance';
import { capabilities } from '../stores/capabilities';
import { settings, updateSetting } from '../stores/settings';
import { extractNamespaceNames } from '../utils/namespaceResponse';
import IntelligentWorkspace from '../components/workspace/IntelligentWorkspace';

// Separate component for intelligence panels - conditionally rendered based on capabilities
const IntelligencePanels: Component = () => {
  const caps = capabilities.get();
  
  // Only render panels if their capabilities are enabled
  const showAutoRemediation = caps.autoRemediation;
  const showLearningDashboard = caps.learningEngine;
  
  // Don't render anything if both are disabled
  if (!showAutoRemediation && !showLearningDashboard) {
    return null;
  }
  
  // Render grid with only enabled panels
  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <Show when={showAutoRemediation}>
        <AutoRemediationPanel />
      </Show>
      <Show when={showLearningDashboard}>
        <LearningDashboard />
      </Show>
    </div>
  );
};

// Helper function to categorize incidents by resource kind or pattern
const getIncidentCategory = (incident: Incident): string => {
  const kind = incident.resource?.kind || incident.resourceKind || '';
  const pattern = incident.pattern || '';

  // Cert-Manager resources
  if (['Certificate', 'CertificateRequest', 'Issuer', 'ClusterIssuer', 'Order', 'Challenge'].includes(kind) ||
      pattern.includes('CERTIFICATE') || pattern.includes('ISSUER')) {
    return 'cert-manager';
  }

  // Istio resources
  if (['VirtualService', 'Gateway', 'DestinationRule', 'ServiceEntry', 'Sidecar', 'PeerAuthentication', 'AuthorizationPolicy'].includes(kind)) {
    return 'istio';
  }

  // Node-level incidents
  if (kind === 'Node' || pattern.includes('NODE')) {
    return 'nodes';
  }

  // Workload resources (default)
  return 'workloads';
};

const Incidents: Component = () => {
  const [showRoadmap, setShowRoadmap] = createSignal(false);
  const [patternFilter, setPatternFilter] = createSignal('');
  const [severityFilter, setSeverityFilter] = createSignal('');
  const [namespaceFilter, setNamespaceFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [categoryFilter, setCategoryFilter] = createSignal('');
  const [selectedIncident, setSelectedIncident] = createSignal<Incident | null>(null);
  const [detailModalOpen, setDetailModalOpen] = createSignal(false);
  const [showSidePanels, setShowSidePanels] = createSignal(false);
  const [useWorkspaceView, setUseWorkspaceView] = createSignal(true);

  // Initialize with empty array to show loading state
  const [localIncidents, setLocalIncidents] = createSignal<Incident[]>([]);
  const [isRefreshing, setIsRefreshing] = createSignal(false); // Subtle indicator, doesn't block UI
  const [isInitialLoad, setIsInitialLoad] = createSignal(true); // Track if this is the first load - MUST start as true
  const [namespaces, setNamespaces] = createSignal<string[]>([]);

  // Track if we've ever loaded incidents (to distinguish between "loading" and "no incidents")
  const [hasLoadedOnce, setHasLoadedOnce] = createSignal(false);

  // One-shot retry timer: fires once if the first fetch returns 0 incidents while a background
  // scan is still running (e.g. after connecting to a new cluster).
  let scanRetryTimer: ReturnType<typeof setTimeout> | undefined;

  // Fast background fetch - never blocks UI
  const fetchIncidentsBackground = async () => {
    if (getIsFetching()) {
      console.log('[Incidents] fetchIncidentsBackground: Already fetching, skipping');
      return;
    }
    
    console.log('[Incidents] fetchIncidentsBackground: Starting fetch, setting loading states');
    setFetching(true);
    setIsRefreshing(true);

    // Track incident list load
    const endListLoad = trackIncidentListLoad();
    
    try {
      console.log('[Incidents] fetchIncidentsBackground: Calling api.getIncidents');
      const data = await api.getIncidents(
        namespaceFilter() || undefined,
        patternFilter() || undefined,
        severityFilter() || undefined,
        statusFilter() || undefined
      );
      const incidents = data || [];
      console.log(`[Incidents] fetchIncidentsBackground: Received ${incidents.length} incidents`);
      setLocalIncidents(incidents);
      setHasLoadedOnce(true); // Mark that we've loaded at least once
      // Save with current cluster context for cache validation
      setCachedIncidentsData(incidents, currentContext());

      // If we got 0 incidents the backend likely triggered a background scan.
      // Schedule a single one-shot retry so we pick up real/demo incidents once
      // the scan completes (~3-10 s) without requiring the user to manually refresh.
      if (incidents.length === 0 && !scanRetryTimer) {
        scanRetryTimer = setTimeout(() => {
          scanRetryTimer = undefined;
          console.log('[Incidents] scan-retry: re-fetching after empty initial response');
          fetchIncidentsBackground();
        }, 5000);
      }
    } catch (error) {
      console.error('[Incidents] fetchIncidentsBackground: Error fetching incidents:', error);
      setHasLoadedOnce(true); // Even on error, we've attempted to load
    } finally {
      console.log('[Incidents] fetchIncidentsBackground: Fetch complete, setting isInitialLoad=false');
      setIsRefreshing(false);
      setFetching(false);
      setIsInitialLoad(false); // Mark initial load as complete
      endListLoad();
    }
  };

  // Fetch namespaces in background
  const fetchNamespacesBackground = async () => {
    try {
      const ns = await api.getNamespaces();
      // Extract namespace names from the list items
      const namespaceNames = extractNamespaceNames(ns || []);
      setNamespaces(namespaceNames);
    } catch (e) {
      console.error('Error fetching namespaces:', e);
    }
  };

  // On mount: Always trigger a fresh scan and show loading state
  onMount(() => {
    const ctx = currentContext();

    // CRITICAL: Set loading state BEFORE anything else
    // This ensures the UI shows loading immediately
    setIsInitialLoad(true);
    setHasLoadedOnce(false);
    
    // Clear any cached incidents to show loading state
    setLocalIncidents([]);
    
    console.log('[Incidents] onMount: Setting isInitialLoad=true, hasLoadedOnce=false, clearing incidents');

    // Start fetch immediately - no delay needed since we've already set loading state
    // Always trigger a fresh scan immediately on page load
    console.log('[Incidents] onMount: Starting fetchIncidentsBackground immediately');
    fetchIncidentsBackground();

    // Fetch namespaces in background
    fetchNamespacesBackground();

    // Register for cluster switch notifications
    const unsubscribe = onClusterSwitch(() => {
      console.log('[Incidents] Cluster switched - refreshing data');
      // Cancel any pending scan-retry so it doesn't fire for the old cluster
      if (scanRetryTimer) {
        clearTimeout(scanRetryTimer);
        scanRetryTimer = undefined;
      }
      // Invalidate cache and clear local data
      invalidateIncidentsCache();
      setLocalIncidents([]);
      setIsInitialLoad(true); // Reset to initial load state on cluster switch
      // Refetch data for new cluster
      fetchIncidentsBackground();
      fetchNamespacesBackground();
    });

    // Cleanup on unmount
    onCleanup(() => {
      unsubscribe();
      if (scanRetryTimer) {
        clearTimeout(scanRetryTimer);
        scanRetryTimer = undefined;
      }
    });
  });

  // Setup reactive auto-refresh that responds to settings changes
  let refreshIntervalId: number | undefined;
  createEffect(() => {
    // Clear existing interval
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = undefined;
    }

    const currentSettings = settings();
    if (currentSettings.enableAutoRefresh && currentSettings.refreshInterval > 0) {
      console.log(`[Incidents] Auto-refresh enabled: every ${currentSettings.refreshInterval} seconds`);
      refreshIntervalId = setInterval(() => {
        console.log('[Incidents] Auto-refresh triggered');
        fetchIncidentsBackground();
      }, currentSettings.refreshInterval * 1000);
    } else {
      console.log('[Incidents] Auto-refresh disabled');
    }
  });

  // Cleanup interval on unmount
  onCleanup(() => {
    if (refreshIntervalId) {
      console.log('[Incidents] Clearing auto-refresh interval');
      clearInterval(refreshIntervalId);
    }
  });

  // Manual refresh
  const refetch = () => fetchIncidentsBackground();

  // Client-side filtering
  const filteredIncidents = createMemo(() => {
    const all = localIncidents() || [];
    return all.filter((inc: Incident) => {
      const pattern = inc.pattern || inc.type || '';
      const namespace = inc.resource?.namespace || inc.namespace || '';

      if (categoryFilter() && getIncidentCategory(inc) !== categoryFilter()) return false;
      if (patternFilter() && pattern.toUpperCase() !== patternFilter().toUpperCase()) return false;
      if (severityFilter() && inc.severity !== severityFilter()) return false;
      if (namespaceFilter() && namespace !== namespaceFilter()) return false;
      if (statusFilter() && inc.status !== statusFilter()) return false;
      return true;
    });
  });

  const handleViewPod = (incident: Incident) => navigateToPod(incident);
  const handleViewLogs = (incident: Incident) => openPodLogs(incident);
  const handleViewEvents = (incident: Incident) => navigateToEvent(incident);
  
  const handleViewDetails = (incident: Incident) => {
    console.log('handleViewDetails called with incident:', incident);
    setSelectedIncident(incident);
    setDetailModalOpen(true);
    console.log('Modal state set - selectedIncident:', incident.id, 'detailModalOpen:', true);
  };

  const closeDetailModal = () => {
    console.log('closeDetailModal called');
    setDetailModalOpen(false);
    setSelectedIncident(null);
  };

  // Severity counts - computed from ALL incidents (not filtered)
  // This ensures the filter chips show totals regardless of current filter
  const criticalCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => inc.severity === 'critical').length
  );
  const highCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => inc.severity === 'high').length
  );
  const warningCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) =>
      inc.severity === 'medium' || inc.severity === 'warning'
    ).length
  );
  const diagnosedCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => inc.diagnosis).length
  );
  const fixableCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) =>
      inc.recommendations && inc.recommendations.length > 0
    ).length
  );

  // Category counts (based on all incidents, not filtered)
  const workloadsCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => getIncidentCategory(inc) === 'workloads').length
  );
  const certManagerCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => getIncidentCategory(inc) === 'cert-manager').length
  );
  const istioCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => getIncidentCategory(inc) === 'istio').length
  );
  const nodesCount = createMemo(() =>
    (localIncidents() || []).filter((inc: Incident) => getIncidentCategory(inc) === 'nodes').length
  );

  return (
    <div class="p-4">
      {/* Conditionally render Workspace or Table View */}
      <Show when={useWorkspaceView()}>
        <IntelligentWorkspace
          incidents={localIncidents()}
          isLoading={isInitialLoad()}
          onClose={() => setUseWorkspaceView(false)}
        />
      </Show>

      <Show when={!useWorkspaceView()}>
        {/* Header */}
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div>
              <h1 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Incident Intelligence
              </h1>
              <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                AI-powered detection with root cause analysis and remediation recommendations
              </p>
            </div>
            {/* Roadmap toggle button */}
            <button
              onClick={() => setShowRoadmap(!showRoadmap())}
              class="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: showRoadmap() ? 'var(--accent-primary)20' : 'var(--bg-secondary)',
                color: showRoadmap() ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${showRoadmap() ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                cursor: 'pointer'
              }}
              title={showRoadmap() ? 'Hide roadmap' : 'Show roadmap'}
            >
              Roadmap
            </button>
            {/* Intelligence Workspace toggle button */}
            <button
              onClick={() => setUseWorkspaceView(true)}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                'box-shadow': '0 2px 8px rgba(79, 70, 229, 0.3)',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
              }}
              title="Open Intelligence Workspace - 3-panel adaptive UI with smart insights"
            >
              🧠 Intelligence Workspace
            </button>
          </div>
          <div class="flex items-center gap-3">
          {/* Auto-refresh interval selector */}
          <div class="flex items-center gap-2">
            <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>Auto-refresh:</span>
            <select
              value={settings().refreshInterval}
              onChange={(e) => {
                const newInterval = parseInt(e.currentTarget.value);
                updateSetting('refreshInterval', newInterval);
                updateSetting('enableAutoRefresh', newInterval > 0);
              }}
              class="px-2 py-1 rounded text-xs"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                'box-shadow': '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
              }}
            >
              <option value="0">Off</option>
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">1m</option>
              <option value="120">2m</option>
              <option value="300">5m</option>
            </select>
          </div>
          <button
            onClick={refetch}
            disabled={isRefreshing()}
            class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{
              background: 'var(--accent-primary)',
              color: '#000',
              opacity: isRefreshing() ? 0.7 : 1,
              cursor: isRefreshing() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              'box-shadow': isRefreshing() ? '0 1px 2px rgba(0,0,0,0.05)' : '0 2px 4px rgba(0,0,0,0.1)',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing()) {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRefreshing()) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }
            }}
            onMouseDown={(e) => {
              if (!isRefreshing()) {
                e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
              }
            }}
            onMouseUp={(e) => {
              if (!isRefreshing()) {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }
            }}
          >
            <Show when={isRefreshing()}>
              <span class="inline-block animate-spin">⟳</span>
            </Show>
            {isRefreshing() ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Post-launch roadmap: Collapsible */}
      <Show when={showRoadmap()}>
      <div class="card p-2 mb-2 flex flex-col gap-1" style={{ background: 'var(--bg-tertiary)', 'border-color': 'var(--border-color)' }}>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Incident Intelligence roadmap</span>
          <span class="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-primary)15', color: 'var(--accent-primary)' }}>Not in v1 launch</span>
        </div>
        <div class="flex flex-wrap gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span class="px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>
            Security Incidents (scanner/exploit) — coming after launch
          </span>
          <span class="px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>
            Reliability Incidents (5xx RCA) — coming after launch
          </span>
          <span class="px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>
            No runtime traffic analysis in v1
          </span>
        </div>
      </div>
      </Show>

      {/* Summary chips and filters - combined in one row */}
      <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
        {/* Summary chips - now clickable buttons that filter */}
        <button
          onClick={() => {
            if (severityFilter() === 'critical') {
              setSeverityFilter('');
            } else {
              setSeverityFilter('critical');
            }
            fetchIncidentsBackground();
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: severityFilter() === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.12)',
            border: severityFilter() === 'critical' ? '2px solid rgba(239,68,68,0.6)' : '1px solid rgba(239,68,68,0.35)',
            transform: severityFilter() === 'critical' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Click to filter by Critical severity"
        >
          <span style={{ color: 'var(--error-color)' }}>Critical</span>
          <span class="text-xs font-bold" style={{ color: 'var(--error-color)' }}>{criticalCount()}</span>
        </button>
        <button
          onClick={() => {
            if (severityFilter() === 'high') {
              setSeverityFilter('');
            } else {
              setSeverityFilter('high');
            }
            fetchIncidentsBackground();
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: severityFilter() === 'high' ? 'rgba(255,107,107,0.25)' : 'rgba(255,107,107,0.12)',
            border: severityFilter() === 'high' ? '2px solid rgba(255,107,107,0.6)' : '1px solid rgba(255,107,107,0.35)',
            transform: severityFilter() === 'high' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Click to filter by High severity"
        >
          <span style={{ color: '#ff6b6b' }}>High</span>
          <span class="text-xs font-bold" style={{ color: '#ff6b6b' }}>{highCount()}</span>
        </button>
        <button
          onClick={() => {
            if (severityFilter() === 'medium' || severityFilter() === 'warning') {
              setSeverityFilter('');
            } else {
              setSeverityFilter('medium');
            }
            fetchIncidentsBackground();
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: (severityFilter() === 'medium' || severityFilter() === 'warning') ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)',
            border: (severityFilter() === 'medium' || severityFilter() === 'warning') ? '2px solid rgba(245,158,11,0.6)' : '1px solid rgba(245,158,11,0.35)',
            transform: (severityFilter() === 'medium' || severityFilter() === 'warning') ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Click to filter by Medium/Warning severity"
        >
          <span style={{ color: 'var(--warning-color)' }}>Medium/Warning</span>
          <span class="text-xs font-bold" style={{ color: 'var(--warning-color)' }}>{warningCount()}</span>
        </button>
        <div class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1" style={{ background: 'rgba(81,207,102,0.12)', border: '1px solid rgba(81,207,102,0.35)' }} title="Incidents with diagnosis available">
          <span style={{ color: '#51cf66' }}>With Diagnosis</span>
          <span class="text-xs font-bold" style={{ color: '#51cf66' }}>{diagnosedCount()}</span>
        </div>
        <div class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }} title="Incidents with available fixes">
          <span style={{ color: 'var(--accent-primary)' }}>Fixable</span>
          <span class="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{fixableCount()}</span>
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Category filter chips */}
        <button
          onClick={() => {
            if (categoryFilter() === 'workloads') {
              setCategoryFilter('');
            } else {
              setCategoryFilter('workloads');
            }
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: categoryFilter() === 'workloads' ? 'rgba(147,51,234,0.25)' : 'rgba(147,51,234,0.12)',
            border: categoryFilter() === 'workloads' ? '2px solid rgba(147,51,234,0.6)' : '1px solid rgba(147,51,234,0.35)',
            transform: categoryFilter() === 'workloads' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Filter by Workloads (Pods, Deployments, etc.)"
        >
          <span style={{ color: '#9333ea' }}>Workloads</span>
          <span class="text-xs font-bold" style={{ color: '#9333ea' }}>{workloadsCount()}</span>
        </button>
        <button
          onClick={() => {
            if (categoryFilter() === 'cert-manager') {
              setCategoryFilter('');
            } else {
              setCategoryFilter('cert-manager');
            }
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: categoryFilter() === 'cert-manager' ? 'rgba(14,165,233,0.25)' : 'rgba(14,165,233,0.12)',
            border: categoryFilter() === 'cert-manager' ? '2px solid rgba(14,165,233,0.6)' : '1px solid rgba(14,165,233,0.35)',
            transform: categoryFilter() === 'cert-manager' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Filter by Cert-Manager (Certificates, Issuers, etc.)"
        >
          <span style={{ color: '#0ea5e9' }}>Cert-Manager</span>
          <span class="text-xs font-bold" style={{ color: '#0ea5e9' }}>{certManagerCount()}</span>
        </button>
        <button
          onClick={() => {
            if (categoryFilter() === 'istio') {
              setCategoryFilter('');
            } else {
              setCategoryFilter('istio');
            }
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: categoryFilter() === 'istio' ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)',
            border: categoryFilter() === 'istio' ? '2px solid rgba(99,102,241,0.6)' : '1px solid rgba(99,102,241,0.35)',
            transform: categoryFilter() === 'istio' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Filter by Istio (VirtualServices, Gateways, etc.)"
        >
          <span style={{ color: '#6366f1' }}>Istio</span>
          <span class="text-xs font-bold" style={{ color: '#6366f1' }}>{istioCount()}</span>
        </button>
        <button
          onClick={() => {
            if (categoryFilter() === 'nodes') {
              setCategoryFilter('');
            } else {
              setCategoryFilter('nodes');
            }
          }}
          class="px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer hover:scale-105"
          style={{
            background: categoryFilter() === 'nodes' ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.12)',
            border: categoryFilter() === 'nodes' ? '2px solid rgba(34,197,94,0.6)' : '1px solid rgba(34,197,94,0.35)',
            transform: categoryFilter() === 'nodes' ? 'scale(1.05)' : 'scale(1)'
          }}
          title="Filter by Nodes (Node issues, preemptions, etc.)"
        >
          <span style={{ color: '#22c55e' }}>Nodes</span>
          <span class="text-xs font-bold" style={{ color: '#22c55e' }}>{nodesCount()}</span>
        </button>

        {/* Separator */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

        {/* Filters inline */}
        <select
          value={patternFilter()}
          onChange={(e) => {
            setPatternFilter(e.currentTarget.value);
            fetchIncidentsBackground();
          }}
          class="px-2 py-1 rounded text-xs"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            'min-width': '140px'
          }}
        >
          <option value="">All Patterns</option>
          <option value="APP_CRASH">💀 App Crash</option>
          <option value="CRASHLOOP">🔄 CrashLoop</option>
          <option value="OOM_PRESSURE">💥 OOM Pressure</option>
          <option value="RESTART_STORM">🌪️ Restart Storm</option>
          <option value="NO_READY_ENDPOINTS">🔌 No Ready Endpoints</option>
          <option value="INTERNAL_ERRORS">🐛 Internal Errors</option>
          <option value="UPSTREAM_FAILURE">⬆️ Upstream Failure</option>
          <option value="TIMEOUTS">⏱️ Timeouts</option>
          <option value="IMAGE_PULL_FAILURE">📦 Image Pull Failure</option>
          <option value="CONFIG_ERROR">⚙️ Config Error</option>
          <option value="DNS_FAILURE">🌐 DNS Failure</option>
          <option value="PERMISSION_DENIED">🔒 Permission Denied</option>
        </select>

        <select
          value={severityFilter()}
          onChange={(e) => {
            setSeverityFilter(e.currentTarget.value);
            fetchIncidentsBackground();
          }}
          class="px-2 py-1 rounded text-xs"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            'min-width': '120px'
          }}
        >
          <option value="">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🔵 Low</option>
          <option value="info">⚪ Info</option>
        </select>

        <select
          value={namespaceFilter()}
          onChange={(e) => {
            setNamespaceFilter(e.currentTarget.value);
            fetchIncidentsBackground();
          }}
          class="px-2 py-1 rounded text-xs"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            'min-width': '120px'
          }}
        >
          <option value="">All Namespaces</option>
          <For each={namespaces()}>
            {(ns) => (
              <option value={ns}>{ns}</option>
            )}
          </For>
        </select>

        <select
          value={statusFilter()}
          onChange={(e) => {
            setStatusFilter(e.currentTarget.value);
            fetchIncidentsBackground();
          }}
          class="px-2 py-1 rounded text-xs"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            'min-width': '110px'
          }}
        >
          <option value="">All Status</option>
          <option value="open">🟢 Active</option>
          <option value="resolved">✅ Resolved</option>
          <option value="investigating">🔍 Investigating</option>
          <option value="remediating">🔧 Remediating</option>
          <option value="suppressed">🔇 Suppressed</option>
        </select>
      </div>

      {/* Incidents Table - Always rendered, shows empty state or data */}
      <IncidentTable
        incidents={filteredIncidents()}
        isLoading={isInitialLoad() || (!hasLoadedOnce() && isRefreshing())}
        onViewPod={handleViewPod}
        onViewLogs={handleViewLogs}
        onViewEvents={handleViewEvents}
        onViewDetails={handleViewDetails}
      />

      {/* Monitoring Status - Always visible after initial load (don't hide during refresh) */}
      <Show when={!isInitialLoad() && hasLoadedOnce()}>
        <MonitoringStatus />
      </Show>

      {/* No Incidents Message - Only when no incidents (don't hide during refresh) */}
      <Show when={filteredIncidents().length === 0 && !isInitialLoad() && hasLoadedOnce()}>
        <div
          class="p-3 rounded-lg mt-2"
          style={{
            background: 'var(--accent-primary)15',
            border: '1px solid var(--accent-primary)40'
          }}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '10px' }}>
            <span style={{ 'font-size': '20px' }}>🎉</span>
            <div>
              <div style={{ color: 'var(--text-primary)', 'font-weight': '600', 'font-size': '13px' }}>
                No incidents detected
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Side Panels Toggle - Only show if capabilities are enabled */}
      <Show when={capabilities.isAutoRemediationEnabled() || capabilities.isLearningEngineEnabled()}>
        <div class="mt-3 mb-2" style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
          <button
            onClick={() => setShowSidePanels(!showSidePanels())}
            style={{
              padding: '10px 20px',
              'font-size': '13px',
              'border-radius': '6px',
              border: '1px solid var(--border-color)',
              background: showSidePanels() ? 'var(--accent-primary)20' : 'var(--bg-secondary)',
              color: showSidePanels() ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              'font-weight': '600',
              transition: 'all 0.15s ease',
              'box-shadow': showSidePanels() ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
              transform: 'scale(1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
              if (!showSidePanels()) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              } else {
                e.currentTarget.style.background = 'var(--accent-primary)30';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = showSidePanels() ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)';
              e.currentTarget.style.background = showSidePanels() ? 'var(--accent-primary)20' : 'var(--bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
            }}
          >
            {showSidePanels() ? '🧠 Hide Intelligence Panels' : '🧠 Show Intelligence Panels'}
          </button>
          <span style={{ color: 'var(--text-muted)', 'font-size': '12px' }}>
            View auto-remediation status and learning insights
          </span>
        </div>
      </Show>

      {/* Intelligence Panels - Only render when toggled */}
      <Show when={showSidePanels()}>
        <IntelligencePanels />
      </Show>

      {/* Footer */}
      <div class="mt-3 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', color: 'var(--text-secondary)', 'font-size': '11px' }}>
          <span style={{ 'font-size': '14px' }}>ℹ️</span>
          <span>
            Click on any incident row to expand and see diagnosis, probable causes, and recommendations.
          </span>
        </div>
      </div>

      {/* Incident Detail View V2 - Production-grade incident explanation with tabbed UI */}
      <IncidentModalV2
        incident={selectedIncident()}
        isOpen={detailModalOpen()}
        onClose={closeDetailModal}
      />
      </Show>
    </div>
  );
};

export default Incidents;
