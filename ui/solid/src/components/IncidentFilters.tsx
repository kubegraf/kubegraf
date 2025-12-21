import { Component, For } from 'solid-js';

interface IncidentFiltersProps {
  patternFilter: string;
  severityFilter: string;
  namespaceFilter: string;
  statusFilter: string;
  namespaces: string[];
  onPatternFilterChange: (pattern: string) => void;
  onSeverityFilterChange: (severity: string) => void;
  onNamespaceFilterChange: (namespace: string) => void;
  onStatusFilterChange: (status: string) => void;
}

const IncidentFilters: Component<IncidentFiltersProps> = (props) => {
  // V2 failure patterns
  const patterns = [
    { value: '', label: 'All Patterns' },
    { value: 'APP_CRASH', label: '💀 App Crash' },
    { value: 'CRASHLOOP', label: '🔄 CrashLoop' },
    { value: 'OOM_PRESSURE', label: '💥 OOM Pressure' },
    { value: 'RESTART_STORM', label: '🌪️ Restart Storm' },
    { value: 'NO_READY_ENDPOINTS', label: '🔌 No Ready Endpoints' },
    { value: 'INTERNAL_ERRORS', label: '🐛 Internal Errors' },
    { value: 'UPSTREAM_FAILURE', label: '⬆️ Upstream Failure' },
    { value: 'TIMEOUTS', label: '⏱️ Timeouts' },
    { value: 'IMAGE_PULL_FAILURE', label: '📦 Image Pull Failure' },
    { value: 'CONFIG_ERROR', label: '⚙️ Config Error' },
    { value: 'DNS_FAILURE', label: '🌐 DNS Failure' },
    { value: 'PERMISSION_DENIED', label: '🔒 Permission Denied' },
  ];

  const severities = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: '🔴 Critical' },
    { value: 'high', label: '🟠 High' },
    { value: 'medium', label: '🟡 Medium' },
    { value: 'low', label: '🔵 Low' },
    { value: 'info', label: '⚪ Info' },
  ];

  const statuses = [
    { value: '', label: 'All Status' },
    { value: 'open', label: '🟢 Active' },
    { value: 'resolved', label: '✅ Resolved' },
    { value: 'investigating', label: '🔍 Investigating' },
    { value: 'remediating', label: '🔧 Remediating' },
    { value: 'suppressed', label: '🔇 Suppressed' },
  ];

  return (
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <select
        value={props.patternFilter}
        onChange={(e) => props.onPatternFilterChange(e.currentTarget.value)}
        class="px-3 py-2 rounded-lg text-sm"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          border: '1px solid var(--border-color)',
          'min-width': '180px'
        }}
      >
        <For each={patterns}>
          {(pattern) => (
            <option value={pattern.value}>{pattern.label}</option>
          )}
        </For>
      </select>

      <select
        value={props.severityFilter}
        onChange={(e) => props.onSeverityFilterChange(e.currentTarget.value)}
        class="px-3 py-2 rounded-lg text-sm"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          border: '1px solid var(--border-color)',
          'min-width': '150px'
        }}
      >
        <For each={severities}>
          {(severity) => (
            <option value={severity.value}>{severity.label}</option>
          )}
        </For>
      </select>

      <select
        value={props.namespaceFilter}
        onChange={(e) => props.onNamespaceFilterChange(e.currentTarget.value)}
        class="px-3 py-2 rounded-lg text-sm"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          border: '1px solid var(--border-color)',
          'min-width': '150px'
        }}
      >
        <option value="">All Namespaces</option>
        <For each={props.namespaces}>
          {(ns) => (
            <option value={ns}>{ns}</option>
          )}
        </For>
      </select>

      <select
        value={props.statusFilter}
        onChange={(e) => props.onStatusFilterChange(e.currentTarget.value)}
        class="px-3 py-2 rounded-lg text-sm"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          border: '1px solid var(--border-color)',
          'min-width': '150px'
        }}
      >
        <For each={statuses}>
          {(status) => (
            <option value={status.value}>{status.label}</option>
          )}
        </For>
      </select>
    </div>
  );
};

export default IncidentFilters;
