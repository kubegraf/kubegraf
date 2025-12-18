import { Component, createSignal, createMemo, Show, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';
import IncidentTable from '../components/IncidentTable';
import IncidentFilters from '../components/IncidentFilters';
import { Incident } from '../services/api';
import { navigateToPod, openPodLogs, navigateToEvent } from '../utils/incident-navigation';
import IncidentDetailModal from '../components/intelligence/IncidentDetailModal';
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

// Separate component for intelligence panels to avoid loading until needed
const IntelligencePanels: Component = () => (
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
    <AutoRemediationPanel />
    <LearningDashboard />
  </div>
);

const Incidents: Component = () => {
  const [patternFilter, setPatternFilter] = createSignal('');
  const [severityFilter, setSeverityFilter] = createSignal('');
  const [namespaceFilter, setNamespaceFilter] = createSignal('');
  const [selectedIncident, setSelectedIncident] = createSignal<Incident | null>(null);
  const [detailModalOpen, setDetailModalOpen] = createSignal(false);
  const [showSidePanels, setShowSidePanels] = createSignal(false);
  
  // Initialize with cached data immediately - NO loading state blocking UI
  const [localIncidents, setLocalIncidents] = createSignal<Incident[]>(getCachedIncidents());
  const [isRefreshing, setIsRefreshing] = createSignal(false); // Subtle indicator, doesn't block UI
  const [namespaces, setNamespaces] = createSignal<string[]>([]);

  // Fast background fetch - never blocks UI
  const fetchIncidentsBackground = async () => {
    if (getIsFetching()) return;
    
    setFetching(true);
    setIsRefreshing(true);
    
    try {
      const data = await api.getIncidents();
      const incidents = data || [];
      setLocalIncidents(incidents);
      // Save with current cluster context for cache validation
      setCachedIncidentsData(incidents, currentContext());
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setIsRefreshing(false);
      setFetching(false);
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

      {/* Summary Cards - Always visible, shows current counts */}
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div class="card p-4" style={{ 'border-left': '4px solid var(--error-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--error-color)' }}>
            {criticalCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid #ff6b6b' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>High</div>
          <div class="text-2xl font-bold mt-1" style={{ color: '#ff6b6b' }}>
            {highCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--warning-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Medium/Warning</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--warning-color)' }}>
            {warningCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid #51cf66' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>With Diagnosis</div>
          <div class="text-2xl font-bold mt-1" style={{ color: '#51cf66' }}>
            {diagnosedCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--accent-primary)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Fixable</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
            {fixableCount()}
          </div>
        </div>
      </div>

      {/* Filters - Always visible */}
      <IncidentFilters
        patternFilter={patternFilter()}
        severityFilter={severityFilter()}
        namespaceFilter={namespaceFilter()}
        namespaces={namespaces()}
        onPatternFilterChange={setPatternFilter}
        onSeverityFilterChange={setSeverityFilter}
        onNamespaceFilterChange={setNamespaceFilter}
      />

      {/* Incidents Table - Always rendered, shows empty state or data */}
      <IncidentTable
        incidents={filteredIncidents()}
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

      {/* Side Panels Toggle */}
      <div class="mt-6 mb-4">
        <button
          onClick={() => setShowSidePanels(!showSidePanels())}
          style={{
            padding: '8px 16px',
            'font-size': '12px',
            'border-radius': '6px',
            border: '1px solid var(--border-color)',
            background: showSidePanels() ? 'var(--accent-primary)20' : 'var(--bg-secondary)',
            color: showSidePanels() ? 'var(--accent-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            'font-weight': '500'
          }}
        >
          {showSidePanels() ? '🧠 Hide Intelligence Panels' : '🧠 Show Intelligence Panels'}
        </button>
      </div>

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

      {/* Modal */}
      <IncidentDetailModal
        incident={selectedIncident()}
        isOpen={detailModalOpen()}
        onClose={closeDetailModal}
      />
    </div>
  );
};

export default Incidents;
