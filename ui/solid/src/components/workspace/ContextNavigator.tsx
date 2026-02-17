/**
 * ContextNavigator - Left panel for spatial memory incident navigation
 *
 * Features:
 * - Mini-card incident list with confidence visualization
 * - Multi-dimensional filtering (severity, pattern, namespace, status)
 * - Visual selection indicators
 * - Hover actions
 * - Keyboard navigation support
 */

import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { Incident } from '../../services/api';

interface ContextNavigatorProps {
  incidents: Incident[];
  currentIndex: number;
  onSelectIncident: (index: number) => void;
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  severity: string[];
  pattern: string[];
  namespace: string[];
  status: string[];
  searchQuery: string;
}

const ContextNavigator: Component<ContextNavigatorProps> = (props) => {
  const [filters, setFilters] = createSignal<FilterState>({
    severity: [],
    pattern: [],
    namespace: [],
    status: [],
    searchQuery: '',
  });

  const [expandedFilters, setExpandedFilters] = createSignal({
    severity: true,
    pattern: false,
    namespace: false,
    status: false,
  });

  // Get unique values for filter options
  const uniqueSeverities = createMemo(() => {
    const severities = new Set(props.incidents.map((i) => i.severity));
    return Array.from(severities).sort();
  });

  const uniquePatterns = createMemo(() => {
    const patterns = new Set(
      props.incidents.map((i) => i.pattern || 'UNKNOWN').filter(Boolean)
    );
    return Array.from(patterns).sort();
  });

  const uniqueNamespaces = createMemo(() => {
    const namespaces = new Set(
      props.incidents.map((i) => i.resource?.namespace || 'default')
    );
    return Array.from(namespaces).sort();
  });

  const uniqueStatuses = createMemo(() => {
    const statuses = new Set(props.incidents.map((i) => i.status || 'open'));
    return Array.from(statuses).sort();
  });

  // Apply filters
  const filteredIncidents = createMemo(() => {
    const filterState = filters();
    let filtered = props.incidents;

    // Search query
    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inc) =>
          inc.title?.toLowerCase().includes(query) ||
          inc.resource?.name?.toLowerCase().includes(query) ||
          inc.pattern?.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (filterState.severity.length > 0) {
      filtered = filtered.filter((inc) =>
        filterState.severity.includes(inc.severity)
      );
    }

    // Pattern filter
    if (filterState.pattern.length > 0) {
      filtered = filtered.filter((inc) =>
        filterState.pattern.includes(inc.pattern || 'UNKNOWN')
      );
    }

    // Namespace filter
    if (filterState.namespace.length > 0) {
      filtered = filtered.filter((inc) =>
        filterState.namespace.includes(inc.resource?.namespace || 'default')
      );
    }

    // Status filter
    if (filterState.status.length > 0) {
      filtered = filtered.filter((inc) =>
        filterState.status.includes(inc.status || 'open')
      );
    }

    return filtered;
  });

  // Count by severity
  const severityCounts = createMemo(() => {
    const counts: Record<string, number> = {};
    props.incidents.forEach((inc) => {
      counts[inc.severity] = (counts[inc.severity] || 0) + 1;
    });
    return counts;
  });

  // Toggle filter
  const toggleFilter = (
    category: 'severity' | 'pattern' | 'namespace' | 'status',
    value: string
  ) => {
    const current = filters()[category];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    const newFilters = { ...filters(), [category]: updated };
    setFilters(newFilters);

    if (props.onFilterChange) {
      props.onFilterChange(newFilters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const newFilters: FilterState = {
      severity: [],
      pattern: [],
      namespace: [],
      status: [],
      searchQuery: '',
    };
    setFilters(newFilters);
    if (props.onFilterChange) {
      props.onFilterChange(newFilters);
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  // Get pattern icon
  const getPatternIcon = (pattern: string) => {
    if (pattern?.includes('CRASH')) return '💥';
    if (pattern?.includes('OOM')) return '💾';
    if (pattern?.includes('IMAGE')) return '📦';
    if (pattern?.includes('NETWORK')) return '🌐';
    if (pattern?.includes('CONFIG')) return '⚙️';
    return '❓';
  };

  // Get confidence color class
  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 95) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <aside class="context-navigator" role="navigation" aria-label="Incident list">
      <div class="navigator-header">
        <h2>CONTEXT</h2>
        <span class="incident-count">{filteredIncidents().length}</span>
      </div>

      {/* Search Bar */}
      <div class="search-section">
        <input
          type="text"
          class="search-input"
          placeholder="Search incidents..."
          value={filters().searchQuery}
          onInput={(e) => {
            const newFilters = { ...filters(), searchQuery: e.currentTarget.value };
            setFilters(newFilters);
            if (props.onFilterChange) {
              props.onFilterChange(newFilters);
            }
          }}
        />
      </div>

      {/* Quick Filters */}
      <div class="quick-filters">
        <button
          class="quick-filter-btn"
          classList={{ active: filters().severity.length === 0 }}
          onClick={clearFilters}
        >
          All ({props.incidents.length})
        </button>
        <button
          class="quick-filter-btn quick-filter-critical"
          classList={{ active: filters().severity.includes('critical') }}
          onClick={() => toggleFilter('severity', 'critical')}
        >
          🔴 {severityCounts().critical || 0}
        </button>
        <button
          class="quick-filter-btn quick-filter-high"
          classList={{ active: filters().severity.includes('high') }}
          onClick={() => toggleFilter('severity', 'high')}
        >
          🟠 {severityCounts().high || 0}
        </button>
        <button
          class="quick-filter-btn quick-filter-medium"
          classList={{ active: filters().severity.includes('medium') }}
          onClick={() => toggleFilter('severity', 'medium')}
        >
          🟡 {severityCounts().medium || 0}
        </button>
      </div>

      {/* Advanced Filters */}
      <div class="advanced-filters">
        <button
          class="filter-toggle"
          onClick={() =>
            setExpandedFilters((prev) => ({ ...prev, pattern: !prev.pattern }))
          }
        >
          <span class="toggle-icon">{expandedFilters().pattern ? '▼' : '▶'}</span>
          <span>Pattern</span>
          <Show when={filters().pattern.length > 0}>
            <span class="filter-badge">{filters().pattern.length}</span>
          </Show>
        </button>

        <Show when={expandedFilters().pattern}>
          <div class="filter-options">
            <For each={uniquePatterns()}>
              {(pattern) => (
                <label class="filter-option">
                  <input
                    type="checkbox"
                    checked={filters().pattern.includes(pattern)}
                    onChange={() => toggleFilter('pattern', pattern)}
                  />
                  <span class="option-label">
                    {getPatternIcon(pattern)} {pattern}
                  </span>
                </label>
              )}
            </For>
          </div>
        </Show>

        <button
          class="filter-toggle"
          onClick={() =>
            setExpandedFilters((prev) => ({ ...prev, namespace: !prev.namespace }))
          }
        >
          <span class="toggle-icon">{expandedFilters().namespace ? '▼' : '▶'}</span>
          <span>Namespace</span>
          <Show when={filters().namespace.length > 0}>
            <span class="filter-badge">{filters().namespace.length}</span>
          </Show>
        </button>

        <Show when={expandedFilters().namespace}>
          <div class="filter-options">
            <For each={uniqueNamespaces()}>
              {(namespace) => (
                <label class="filter-option">
                  <input
                    type="checkbox"
                    checked={filters().namespace.includes(namespace)}
                    onChange={() => toggleFilter('namespace', namespace)}
                  />
                  <span class="option-label">{namespace}</span>
                </label>
              )}
            </For>
          </div>
        </Show>

        <button
          class="filter-toggle"
          onClick={() =>
            setExpandedFilters((prev) => ({ ...prev, status: !prev.status }))
          }
        >
          <span class="toggle-icon">{expandedFilters().status ? '▼' : '▶'}</span>
          <span>Status</span>
          <Show when={filters().status.length > 0}>
            <span class="filter-badge">{filters().status.length}</span>
          </Show>
        </button>

        <Show when={expandedFilters().status}>
          <div class="filter-options">
            <For each={uniqueStatuses()}>
              {(status) => (
                <label class="filter-option">
                  <input
                    type="checkbox"
                    checked={filters().status.includes(status)}
                    onChange={() => toggleFilter('status', status)}
                  />
                  <span class="option-label">{status}</span>
                </label>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Clear Filters */}
      <Show
        when={
          filters().severity.length > 0 ||
          filters().pattern.length > 0 ||
          filters().namespace.length > 0 ||
          filters().status.length > 0 ||
          filters().searchQuery
        }
      >
        <div class="filter-actions">
          <button class="clear-filters-btn" onClick={clearFilters}>
            Clear all filters
          </button>
        </div>
      </Show>

      {/* Incident List */}
      <div class="incident-list-container">
        <Show
          when={filteredIncidents().length > 0}
          fallback={
            <div class="empty-state">
              <p>No incidents match your filters</p>
              <button class="clear-filters-btn-small" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          }
        >
          <For each={filteredIncidents()}>
            {(incident, index) => {
              const isSelected = index() === props.currentIndex;
              const confidence = incident.diagnosis?.confidence || 0;

              return (
                <button
                  class="incident-mini-card"
                  classList={{
                    selected: isSelected,
                    critical: incident.severity === 'critical',
                    high: incident.severity === 'high',
                    medium: incident.severity === 'medium',
                    low: incident.severity === 'low',
                  }}
                  onClick={() => props.onSelectIncident(index())}
                  aria-selected={isSelected}
                  aria-label={`Incident ${index() + 1}: ${incident.title || incident.pattern}, ${incident.severity} severity, ${Math.round(confidence)}% confidence`}
                >
                  {/* Card Header */}
                  <div class="mini-card-header">
                    <span class="mini-card-indicator">
                      {isSelected ? '●' : '○'}
                    </span>
                    <span class="mini-card-id">#{index() + 1}</span>
                    <span class="mini-card-severity">
                      {getSeverityIcon(incident.severity)}
                    </span>
                  </div>

                  {/* Pattern */}
                  <div class="mini-card-pattern">
                    {getPatternIcon(incident.pattern || '')}
                    {' '}
                    {incident.pattern || 'UNKNOWN'}
                  </div>

                  {/* Resource */}
                  <div class="mini-card-resource">
                    {incident.resource?.namespace || 'default'}/
                    {incident.resource?.name || 'unknown'}
                  </div>

                  {/* Confidence */}
                  <div class="mini-card-confidence">
                    <div class="confidence-bar">
                      <div
                        class={`confidence-fill ${getConfidenceClass(confidence)}`}
                        style={{ width: `${confidence}%` }}
                      />
                    </div>
                    <span class="confidence-label">{Math.round(confidence)}%</span>
                  </div>

                  {/* Fixes */}
                  <Show when={incident.recommendations && incident.recommendations.length > 0}>
                    <div class="mini-card-fixes">
                      🔧 {incident.recommendations.length} fix
                      {incident.recommendations.length !== 1 ? 'es' : ''}
                    </div>
                  </Show>

                  {/* Occurrences */}
                  <Show when={incident.occurrences && incident.occurrences > 1}>
                    <div class="mini-card-occurrences">
                      🔄 {incident.occurrences}x
                    </div>
                  </Show>
                </button>
              );
            }}
          </For>
        </Show>
      </div>
    </aside>
  );
};

export default ContextNavigator;
