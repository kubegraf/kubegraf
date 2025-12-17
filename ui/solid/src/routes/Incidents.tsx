import { Component, createSignal, createResource, createMemo, Show } from 'solid-js';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';
import IncidentTable from '../components/IncidentTable';
import IncidentFilters from '../components/IncidentFilters';
import { Incident } from '../services/api';
import { navigateToPod, openPodLogs, navigateToEvent } from '../utils/incident-navigation';

const Incidents: Component = () => {
  const [patternFilter, setPatternFilter] = createSignal('');
  const [severityFilter, setSeverityFilter] = createSignal('');
  const [namespaceFilter, setNamespaceFilter] = createSignal('');

  // Fetch namespaces for filter
  const [namespaces] = createResource(api.getNamespaces);

  // Fetch incidents with filters (now using v2 API)
  const [incidents, { refetch }] = createResource(
    () => ({
      namespace: namespaceFilter() || undefined,
      pattern: patternFilter() || undefined,
      severity: severityFilter() || undefined,
    }),
    async (params) => {
      try {
        const data = await api.getIncidents(params.namespace, params.pattern, params.severity);
        return data || [];
      } catch (error) {
        console.error('Error fetching incidents:', error);
        addNotification({
          type: 'error',
          message: `Failed to load incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        return []; // Return empty array on error
      }
    }
  );

  // Filter incidents client-side (in case backend doesn't filter)
  const filteredIncidents = createMemo(() => {
    const all = incidents() || [];
    return all.filter((inc: Incident) => {
      const pattern = inc.pattern || inc.type || '';
      const namespace = inc.resource?.namespace || inc.namespace || '';
      
      if (patternFilter() && pattern.toUpperCase() !== patternFilter().toUpperCase()) return false;
      if (severityFilter() && inc.severity !== severityFilter()) return false;
      if (namespaceFilter() && namespace !== namespaceFilter()) return false;
      return true;
    });
  });

  const handleViewPod = (incident: Incident) => {
    navigateToPod(incident);
  };

  const handleViewLogs = (incident: Incident) => {
    openPodLogs(incident);
  };

  const handleViewEvents = (incident: Incident) => {
    navigateToEvent(incident);
  };

  const handleViewDetails = (incident: Incident) => {
    // For now, just log - could open a modal
    console.log('View incident details:', incident);
  };

  // Count by severity
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

  // Count incidents with diagnosis
  const diagnosedCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.diagnosis).length
  );

  // Count incidents with recommendations
  const fixableCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => 
      inc.recommendations && inc.recommendations.length > 0
    ).length
  );

  return (
    <div class="space-y-4 p-6">
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
          onClick={() => refetch()}
          class="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ 
            background: 'var(--accent-primary)', 
            color: '#000' 
          }}
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
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

      {/* Info Banner */}
      <Show when={filteredIncidents().length === 0 && !incidents.loading}>
        <div 
          class="p-4 rounded-lg mb-4"
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
                Incidents will appear here when issues are detected.
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Filters */}
      <IncidentFilters
        patternFilter={patternFilter()}
        severityFilter={severityFilter()}
        namespaceFilter={namespaceFilter()}
        namespaces={namespaces() || []}
        onPatternFilterChange={setPatternFilter}
        onSeverityFilterChange={setSeverityFilter}
        onNamespaceFilterChange={setNamespaceFilter}
      />

      {/* Incidents Table */}
      <Show
        when={!incidents.loading && !incidents.error}
        fallback={
          <div class="p-8 text-center">
            {incidents.loading ? (
              <>
                <div class="spinner mx-auto mb-2" />
                <span style={{ color: 'var(--text-muted)' }}>Loading incidents...</span>
              </>
            ) : (
              <div>
                <div class="text-red-500 mb-2">Error loading incidents</div>
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {incidents.error?.message || 'Unknown error occurred'}
                </div>
                <button
                  onClick={() => refetch()}
                  class="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    background: 'var(--accent-primary)', 
                    color: '#000' 
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        }
      >
        <IncidentTable
          incidents={filteredIncidents()}
          onViewPod={handleViewPod}
          onViewLogs={handleViewLogs}
          onViewEvents={handleViewEvents}
          onViewDetails={handleViewDetails}
        />
      </Show>

      {/* Footer Info */}
      <div class="mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', color: 'var(--text-secondary)', 'font-size': '12px' }}>
          <span>ℹ️</span>
          <span>
            Click on any incident row to expand and see diagnosis, probable causes, and recommendations.
            Incidents are automatically detected using rule-based pattern matching.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Incidents;
