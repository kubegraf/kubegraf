import { Component, createSignal, createResource, createMemo, Show } from 'solid-js';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';
import IncidentTable from '../components/IncidentTable';
import IncidentFilters from '../components/IncidentFilters';
import { Incident } from '../services/api';
import { navigateToPod, openPodLogs, navigateToEvent } from '../utils/incident-navigation';

const Incidents: Component = () => {
  const [typeFilter, setTypeFilter] = createSignal('');
  const [severityFilter, setSeverityFilter] = createSignal('');
  const [namespaceFilter, setNamespaceFilter] = createSignal('');

  // Fetch namespaces for filter
  const [namespaces] = createResource(api.getNamespaces);

  // Fetch incidents with filters
  const [incidents, { refetch }] = createResource(
    () => ({
      namespace: namespaceFilter() || undefined,
      type: typeFilter() || undefined,
      severity: severityFilter() || undefined,
    }),
    async (params) => {
      return await api.getIncidents(params.namespace, params.type, params.severity);
    }
  );

  // Filter incidents client-side (in case backend doesn't filter)
  const filteredIncidents = createMemo(() => {
    const all = incidents() || [];
    return all.filter((inc: Incident) => {
      if (typeFilter() && inc.type !== typeFilter()) return false;
      if (severityFilter() && inc.severity !== severityFilter()) return false;
      if (namespaceFilter() && inc.namespace !== namespaceFilter()) return false;
      return true;
    });
  });

  const handleViewPod = (incident: Incident) => {
    navigateToPod(incident);
  };

  const handleViewLogs = (incident: Incident) => {
    // Store incident info for Pods component to pick up
    openPodLogs(incident);
  };

  const handleViewEvents = (incident: Incident) => {
    navigateToEvent(incident);
  };

  const criticalCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.severity === 'critical').length
  );
  const warningCount = createMemo(() => 
    filteredIncidents().filter((inc: Incident) => inc.severity === 'warning').length
  );

  return (
    <div class="space-y-4 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Incidents & OOM
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Real-time detection of OOMKilled, CrashLoopBackOff, Node Pressure, and Job Failures
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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card p-4" style={{ 'border-left': '4px solid var(--error-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--error-color)' }}>
            {criticalCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--warning-color)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Warnings</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--warning-color)' }}>
            {warningCount()}
          </div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--accent-primary)' }}>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</div>
          <div class="text-2xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
            {filteredIncidents().length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <IncidentFilters
        typeFilter={typeFilter()}
        severityFilter={severityFilter()}
        namespaceFilter={namespaceFilter()}
        namespaces={namespaces() || []}
        onTypeFilterChange={setTypeFilter}
        onSeverityFilterChange={setSeverityFilter}
        onNamespaceFilterChange={setNamespaceFilter}
      />

      {/* Incidents Table */}
      <Show
        when={!incidents.loading}
        fallback={
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading incidents...</span>
          </div>
        }
      >
        <IncidentTable
          incidents={filteredIncidents()}
          onViewPod={handleViewPod}
          onViewLogs={handleViewLogs}
          onViewEvents={handleViewEvents}
        />
      </Show>
    </div>
  );
};

export default Incidents;



