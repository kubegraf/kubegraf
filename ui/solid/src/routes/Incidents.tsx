import { Component, createSignal, createMemo, Show, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';
import IncidentTable from '../components/IncidentTable';
import IncidentFilters from '../components/IncidentFilters';
import { Incident } from '../services/api';
import { navigateToPod, openPodLogs, navigateToEvent } from '../utils/incident-navigation';
import { IncidentModalV2 } from '../components/intelligence';
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

const Incidents: Component = () => {
  const [patternFilter, setPatternFilter] = createSignal('');
  const [severityFilter, setSeverityFilter] = createSignal('');
  const [namespaceFilter, setNamespaceFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [selectedIncident, setSelectedIncident] = createSignal<Incident | null>(null);
  const [detailModalOpen, setDetailModalOpen] = createSignal(false);
  const [showSidePanels, setShowSidePanels] = createSignal(false);
  
  // Initialize with cached data immediately - NO loading state blocking UI
  const [localIncidents, setLocalIncidents] = createSignal<Incident[]>(getCachedIncidents());
  const [isRefreshing, setIsRefreshing] = createSignal(false); // Subtle indicator, doesn't block UI
  const [isInitialLoad, setIsInitialLoad] = createSignal(true); // Track if this is the first load
  const [namespaces, setNamespaces] = createSignal<string[]>([]);

  // Fast background fetch - never blocks UI
  const fetchIncidentsBackground = async () => {
    if (getIsFetching()) return;
    
    setFetching(true);
    setIsRefreshing(true);
    
    // Track incident list load
    const endListLoad = trackIncidentListLoad();
    
    try {
      const data = await api.getIncidents(
        namespaceFilter() || undefined,
        patternFilter() || undefined,
        severityFilter() || undefined,
        statusFilter() || undefined
      );
      const incidents = data || [];
      setLocalIncidents(incidents);
      // Save with current cluster context for cache validation
      setCachedIncidentsData(incidents, currentContext());
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
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
      setNamespaces(ns || []);
    } catch (e) {
      console.error('Error fetching namespaces:', e);
    }
  };

  // On mount: show cached data INSTANTLY, then refresh in background
  onMount(() => {
    const ctx = currentContext();
    
    // Show cached data immediately if from same cluster
    const cached = getCachedIncidents();
    if (cached.length > 0 && isCacheValid(ctx)) {
      setLocalIncidents(cached);
      setIsInitialLoad(false); // If we have cached data, we're not in initial load
    } else {
      // No cache or invalid cache - we're in initial load
      setIsInitialLoad(true);
    }
    
    // Fetch fresh data in background (non-blocking)
    if (!isCacheValid(ctx)) {
      fetchIncidentsBackground();
    } else {
      // Even with valid cache, refresh after short delay
      setTimeout(fetchIncidentsBackground, 500);
    }
    
    // Fetch namespaces in background
    fetchNamespacesBackground();
    
    // Register for cluster switch notifications
    const unsubscribe = onClusterSwitch(() => {
      console.log('[Incidents] Cluster switched - refreshing data');
      // Invalidate cache and clear local data
      invalidateIncidentsCache();
      setLocalIncidents([]);
      setIsInitialLoad(true); // Reset to initial load state on cluster switch
      // Refetch data for new cluster
      fetchIncidentsBackground();
      fetchNamespacesBackground();
    });
    
    // Cleanup on unmount
    onCleanup(unsubscribe);
  });

  // Manual refresh
  const refetch = () => fetchIncidentsBackground();

  // Client-side filtering
  const filteredIncidents = createMemo(() => {
    const all = localIncidents() || [];
    return all.filter((inc: Incident) => {
      const pattern = inc.pattern || inc.type || '';
      const namespace = inc.resource?.namespace || inc.namespace || '';
      
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

  // Counts - always computed from current data
  const criticalCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.severity === 'critical').length
  );
  const highCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.severity === 'high').length
  );
  const warningCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => 
      inc.severity === 'medium' || inc.severity === 'warning'
    ).length
  );
  const diagnosedCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.diagnosis).length
  );
  const fixableCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => 
      inc.recommendations && inc.recommendations.length > 0
    ).length
  );

  return (
    <div class="space-y-4 p-6">
      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Incident Intelligence
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            AI-powered detection with root cause analysis and remediation recommendations
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isRefreshing()}
          class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{ 
            background: 'var(--accent-primary)', 
            color: '#000',
            opacity: isRefreshing() ? 0.7 : 1
          }}
        >
          <Show when={isRefreshing()}>
            <span class="inline-block animate-spin">⟳</span>
          </Show>
          {isRefreshing() ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Post-launch notice: compact, non-blocking */}
      <div class="card p-3 mb-4 flex flex-col gap-1" style={{ background: 'var(--bg-tertiary)', 'border-color': 'var(--border-color)' }}>
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Incident Intelligence roadmap</span>
          <span class="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-primary)15', color: 'var(--accent-primary)' }}>Not in v1 launch</span>
        </div>
        <div class="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span class="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)' }}>
            Security Incidents (scanner/exploit) — coming after launch
          </span>
          <span class="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)' }}>
            Reliability Incidents (5xx RCA) — coming after launch
          </span>
          <span class="px-2 py-1 rounded" style={{ background: 'var(--bg-secondary)' }}>
            No runtime traffic analysis in v1
          </span>
        </div>
      </div>

      {/* Summary chips - compact with color accents */}
      <div class="flex flex-wrap gap-2 mb-3">
        <div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
          <span style={{ color: 'var(--error-color)' }}>Critical</span>
          <span class="text-base font-bold" style={{ color: 'var(--error-color)' }}>{criticalCount()}</span>
        </div>
        <div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.35)' }}>
          <span style={{ color: '#ff6b6b' }}>High</span>
          <span class="text-base font-bold" style={{ color: '#ff6b6b' }}>{highCount()}</span>
        </div>
        <div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
          <span style={{ color: 'var(--warning-color)' }}>Medium/Warning</span>
          <span class="text-base font-bold" style={{ color: 'var(--warning-color)' }}>{warningCount()}</span>
        </div>
        <div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(81,207,102,0.12)', border: '1px solid rgba(81,207,102,0.35)' }}>
          <span style={{ color: '#51cf66' }}>With Diagnosis</span>
          <span class="text-base font-bold" style={{ color: '#51cf66' }}>{diagnosedCount()}</span>
        </div>
        <div class="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)' }}>
          <span style={{ color: 'var(--accent-primary)' }}>Fixable</span>
          <span class="text-base font-bold" style={{ color: 'var(--accent-primary)' }}>{fixableCount()}</span>
        </div>
      </div>

      {/* Filters - Always visible */}
        <IncidentFilters
          patternFilter={patternFilter()}
          severityFilter={severityFilter()}
          namespaceFilter={namespaceFilter()}
          statusFilter={statusFilter()}
          namespaces={namespaces()}
          onPatternFilterChange={(val) => {
            setPatternFilter(val);
            fetchIncidentsBackground();
          }}
          onSeverityFilterChange={(val) => {
            setSeverityFilter(val);
            fetchIncidentsBackground();
          }}
          onNamespaceFilterChange={(val) => {
            setNamespaceFilter(val);
            fetchIncidentsBackground();
          }}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            fetchIncidentsBackground();
          }}
        />

      {/* Incidents Table - Always rendered, shows empty state or data */}
      <IncidentTable
        incidents={filteredIncidents()}
        isLoading={isInitialLoad() || (isRefreshing() && localIncidents().length === 0)}
        onViewPod={handleViewPod}
        onViewLogs={handleViewLogs}
        onViewEvents={handleViewEvents}
        onViewDetails={handleViewDetails}
      />

      {/* Info Banner - Only when no incidents and not refreshing */}
      <Show when={filteredIncidents().length === 0 && !isRefreshing()}>
        <div 
          class="p-4 rounded-lg"
          style={{ 
            background: 'var(--accent-primary)15', 
            border: '1px solid var(--accent-primary)40' 
          }}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
            <span style={{ 'font-size': '24px' }}>🎉</span>
            <div>
              <div style={{ color: 'var(--text-primary)', 'font-weight': '600' }}>
                No incidents detected
              </div>
              <div style={{ color: 'var(--text-secondary)', 'font-size': '13px' }}>
                The incident intelligence system is actively monitoring your cluster.
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Side Panels Toggle - Only show if capabilities are enabled */}
      <Show when={capabilities.isAutoRemediationEnabled() || capabilities.isLearningEngineEnabled()}>
        <div class="mt-6 mb-4" style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
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
              transition: 'all 0.2s ease',
              'box-shadow': showSidePanels() ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
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
      <div class="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', color: 'var(--text-secondary)', 'font-size': '12px' }}>
          <span>ℹ️</span>
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
    </div>
  );
};

export default Incidents;
