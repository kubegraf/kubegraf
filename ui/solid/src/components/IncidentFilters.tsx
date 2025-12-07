import { Component, For } from 'solid-js';
import { Incident } from '../services/api';

interface IncidentFiltersProps {
  typeFilter: string;
  severityFilter: string;
  namespaceFilter: string;
  namespaces: string[];
  onTypeFilterChange: (type: string) => void;
  onSeverityFilterChange: (severity: string) => void;
  onNamespaceFilterChange: (namespace: string) => void;
}

const IncidentFilters: Component<IncidentFiltersProps> = (props) => {
  const incidentTypes = [
    { value: '', label: 'All Types' },
    { value: 'oom', label: 'OOMKilled' },
    { value: 'crashloop', label: 'CrashLoopBackOff' },
    { value: 'node_pressure', label: 'Node Pressure' },
    { value: 'node_memory_pressure', label: 'Node Memory Pressure' },
    { value: 'node_disk_pressure', label: 'Node Disk Pressure' },
    { value: 'job_failure', label: 'Job Failure' },
    { value: 'cronjob_failure', label: 'CronJob Failure' },
  ];

  const severities = [
    { value: '', label: 'All Severities' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <div class="flex flex-wrap items-center gap-4 mb-4">
      <select
        value={props.typeFilter}
        onChange={(e) => props.onTypeFilterChange(e.currentTarget.value)}
        class="px-3 py-2 rounded-lg text-sm"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          border: '1px solid var(--border-color)' 
        }}
      >
        <For each={incidentTypes}>
          {(type) => (
            <option value={type.value}>{type.label}</option>
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
          border: '1px solid var(--border-color)' 
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
          border: '1px solid var(--border-color)' 
        }}
      >
        <option value="">All Namespaces</option>
        <For each={props.namespaces}>
          {(ns) => (
            <option value={ns}>{ns}</option>
          )}
        </For>
      </select>
    </div>
  );
};

export default IncidentFilters;


