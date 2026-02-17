/**
 * IntelligentWorkspace - Main container for the unique 3-panel incident investigation UI
 *
 * Layout: Context Navigator (20%) | Investigation Workspace (60%) | Intelligence Assistant (20%)
 *
 * Features:
 * - Adaptive layout based on confidence
 * - Keyboard navigation (J/K, Enter, ESC)
 * - Responsive design
 * - Spatial memory navigation
 */

import { Component, createSignal, createEffect, Show, For, onMount, onCleanup } from 'solid-js';
import { Incident } from '../../services/api';
import './workspace.css';

interface IntelligentWorkspaceProps {
  incidents: Incident[];
  isLoading?: boolean;
  onIncidentSelect?: (incident: Incident) => void;
  onClose?: () => void;
}

interface WorkspaceState {
  currentIncidentId: string | null;
  selectedIndex: number;
  contextNavigatorVisible: boolean;
  intelligenceAssistantVisible: boolean;
  isMobile: boolean;
}

const IntelligentWorkspace: Component<IntelligentWorkspaceProps> = (props) => {
  // State management
  const [state, setState] = createSignal<WorkspaceState>({
    currentIncidentId: null,
    selectedIndex: 0,
    contextNavigatorVisible: true,
    intelligenceAssistantVisible: true,
    isMobile: false,
  });

  const [filterState, setFilterState] = createSignal({
    severity: [] as string[],
    pattern: [] as string[],
    namespace: [] as string[],
    status: [] as string[],
  });

  // Computed values
  const currentIncident = () => {
    const incidents = props.incidents || [];
    const idx = state().selectedIndex;
    return incidents[idx] || null;
  };

  const filteredIncidents = () => {
    const incidents = props.incidents || [];
    const filters = filterState();

    return incidents.filter((inc) => {
      if (filters.severity.length > 0 && !filters.severity.includes(inc.severity)) {
        return false;
      }
      if (filters.pattern.length > 0 && !filters.pattern.includes(inc.pattern || '')) {
        return false;
      }
      return true;
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentState = state();
    const incidents = filteredIncidents();

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        if (currentState.selectedIndex < incidents.length - 1) {
          setState({
            ...currentState,
            selectedIndex: currentState.selectedIndex + 1,
          });
        }
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        if (currentState.selectedIndex > 0) {
          setState({
            ...currentState,
            selectedIndex: currentState.selectedIndex - 1,
          });
        }
        break;

      case 'Enter':
        e.preventDefault();
        const selected = currentIncident();
        if (selected && props.onIncidentSelect) {
          props.onIncidentSelect(selected);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (props.onClose) {
          props.onClose();
        }
        break;

      case '[':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setState({
            ...currentState,
            contextNavigatorVisible: !currentState.contextNavigatorVisible,
          });
        }
        break;

      case ']':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setState({
            ...currentState,
            intelligenceAssistantVisible: !currentState.intelligenceAssistantVisible,
          });
        }
        break;

      case '?':
        e.preventDefault();
        // Show keyboard shortcuts help (TODO: implement)
        console.log('Keyboard shortcuts help');
        break;
    }
  };

  // Responsive handling
  const checkMobile = () => {
    const isMobile = window.innerWidth < 768;
    setState((prev) => ({ ...prev, isMobile }));

    // Auto-hide panels on mobile
    if (isMobile) {
      setState((prev) => ({
        ...prev,
        contextNavigatorVisible: false,
        intelligenceAssistantVisible: false,
      }));
    }
  };

  // Lifecycle
  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', checkMobile);
    checkMobile();

    // Select first incident by default
    if (props.incidents && props.incidents.length > 0) {
      setState((prev) => ({
        ...prev,
        currentIncidentId: props.incidents[0].id,
      }));
    }
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', checkMobile);
  });

  // Calculate cluster health (placeholder)
  const clusterHealth = () => {
    const incidents = props.incidents || [];
    if (incidents.length === 0) return 100;

    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const high = incidents.filter((i) => i.severity === 'high').length;

    // Simple health calculation: 100 - (critical * 10) - (high * 5)
    const health = Math.max(0, 100 - (critical * 10) - (high * 5));
    return health;
  };

  return (
    <div class="intelligent-workspace" data-mobile={state().isMobile}>
      {/* Workspace Header */}
      <header class="workspace-header">
        <div class="workspace-title">
          <h1>KUBEGRAF INCIDENT INTELLIGENCE</h1>
        </div>

        <div class="workspace-status">
          <div class="status-item">
            <span class="status-icon live-pulse">⚡</span>
            <span class="status-label">Live Scan: ON</span>
          </div>

          <div class="status-item">
            <span class="status-icon">🏥</span>
            <span class="status-label">Health: {clusterHealth()}%</span>
          </div>

          <button
            class="workspace-settings-btn"
            onClick={() => console.log('Settings')}
            aria-label="Settings"
          >
            ⚙️
          </button>

          <button
            class="workspace-close-btn"
            onClick={props.onClose}
            aria-label="Close workspace"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Three-Panel Layout */}
      <div class="workspace-panels">
        {/* Context Navigator (Left Panel - 20%) */}
        <Show when={state().contextNavigatorVisible}>
          <aside class="context-navigator" role="navigation" aria-label="Incident list">
            <div class="panel-header">
              <h2>CONTEXT</h2>
            </div>

            <div class="filter-section">
              <div class="filter-label">🔍 Filter</div>
              <div class="filter-chips">
                <button
                  class="filter-chip"
                  classList={{ active: filterState().severity.length === 0 }}
                  onClick={() => setFilterState({ ...filterState(), severity: [] })}
                >
                  All ({props.incidents?.length || 0})
                </button>
                <button
                  class="filter-chip filter-critical"
                  classList={{ active: filterState().severity.includes('critical') }}
                  onClick={() => {
                    const current = filterState().severity;
                    const updated = current.includes('critical')
                      ? current.filter((s) => s !== 'critical')
                      : ['critical'];
                    setFilterState({ ...filterState(), severity: updated });
                  }}
                >
                  🔴 Critical
                </button>
                <button
                  class="filter-chip filter-high"
                  classList={{ active: filterState().severity.includes('high') }}
                  onClick={() => {
                    const current = filterState().severity;
                    const updated = current.includes('high')
                      ? current.filter((s) => s !== 'high')
                      : ['high'];
                    setFilterState({ ...filterState(), severity: updated });
                  }}
                >
                  🟠 High
                </button>
              </div>
            </div>

            <div class="incident-list">
              <For each={filteredIncidents()}>
                {(incident, index) => (
                  <button
                    class="incident-mini-card"
                    classList={{
                      selected: index() === state().selectedIndex,
                      critical: incident.severity === 'critical',
                      high: incident.severity === 'high',
                      medium: incident.severity === 'medium',
                    }}
                    onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        selectedIndex: index(),
                        currentIncidentId: incident.id,
                      }));
                      if (props.onIncidentSelect) {
                        props.onIncidentSelect(incident);
                      }
                    }}
                    aria-selected={index() === state().selectedIndex}
                    aria-label={`Incident ${index() + 1}: ${incident.title}, ${incident.severity} severity`}
                  >
                    <div class="mini-card-header">
                      <span class="mini-card-indicator">
                        {index() === state().selectedIndex ? '●' : '○'}
                      </span>
                      <span class="mini-card-id">#{index() + 1}</span>
                    </div>

                    <div class="mini-card-pattern">
                      {incident.pattern || 'UNKNOWN'}
                    </div>

                    <div class="mini-card-confidence">
                      <div class="confidence-bar">
                        <div
                          class="confidence-fill"
                          style={{
                            width: `${incident.diagnosis?.confidence || 0}%`,
                          }}
                        />
                      </div>
                      <span class="confidence-label">
                        {Math.round(incident.diagnosis?.confidence || 0)}%
                      </span>
                    </div>

                    <div class="mini-card-fixes">
                      {incident.recommendations?.length || 0} fixes
                    </div>
                  </button>
                )}
              </For>
            </div>
          </aside>
        </Show>

        {/* Investigation Workspace (Center Panel - 60%) */}
        <main class="investigation-workspace" role="main" aria-label="Incident details">
          <Show
            when={!props.isLoading && currentIncident()}
            fallback={
              <div class="workspace-loading">
                <div class="loading-spinner" />
                <p>Loading incident details...</p>
              </div>
            }
          >
            <div class="workspace-content">
              <div class="incident-header">
                <div class="incident-title">
                  <span class="severity-badge" data-severity={currentIncident()?.severity}>
                    {currentIncident()?.severity?.toUpperCase()}
                  </span>
                  <h2>{currentIncident()?.resource?.name || 'Unknown Resource'}</h2>
                </div>

                <div class="incident-meta">
                  <span>
                    {currentIncident()?.resource?.namespace || 'default'}/
                    {currentIncident()?.resource?.kind || 'Unknown'}
                  </span>
                  <span>•</span>
                  <span>First: {currentIncident()?.firstSeen ? new Date(currentIncident()!.firstSeen).toLocaleString() : 'Unknown'}</span>
                  <span>•</span>
                  <span>Occurrences: {currentIncident()?.occurrences || 0}</span>
                </div>
              </div>

              {/* Placeholder for adaptive layouts */}
              <div class="incident-content">
                <div class="content-placeholder">
                  <p>📊 Incident content will be rendered here</p>
                  <p>Layout adapts based on confidence level:</p>
                  <ul>
                    <li>≥95% confidence: Action-first layout</li>
                    <li>&lt;95% confidence: Investigation layout</li>
                  </ul>
                </div>
              </div>

              {/* Action Footer */}
              <footer class="action-footer">
                <button
                  class="action-btn secondary"
                  onClick={() => {
                    const idx = state().selectedIndex;
                    if (idx > 0) {
                      setState((prev) => ({
                        ...prev,
                        selectedIndex: idx - 1,
                      }));
                    }
                  }}
                  disabled={state().selectedIndex === 0}
                >
                  ◄ Previous
                </button>

                <button class="action-btn secondary">
                  Download RCA
                </button>

                <button class="action-btn primary">
                  Mark Resolved
                </button>

                <button
                  class="action-btn secondary"
                  onClick={() => {
                    const idx = state().selectedIndex;
                    const incidents = filteredIncidents();
                    if (idx < incidents.length - 1) {
                      setState((prev) => ({
                        ...prev,
                        selectedIndex: idx + 1,
                      }));
                    }
                  }}
                  disabled={state().selectedIndex >= filteredIncidents().length - 1}
                >
                  Next ►
                </button>
              </footer>
            </div>
          </Show>
        </main>

        {/* Intelligence Assistant (Right Panel - 20%) */}
        <Show when={state().intelligenceAssistantVisible}>
          <aside class="intelligence-assistant" role="complementary" aria-label="Intelligence insights">
            <div class="panel-header">
              <h2>INTELLIGENCE</h2>
            </div>

            <div class="intelligence-section">
              <h3>💡 Insights</h3>
              <div class="insights-content">
                <p class="insight-item">Pattern matching in progress...</p>
              </div>
            </div>

            <div class="intelligence-section">
              <h3>🔗 Related</h3>
              <div class="related-content">
                <p class="related-item">Finding similar incidents...</p>
              </div>
            </div>

            <div class="intelligence-section">
              <h3>🎯 Actions</h3>
              <div class="actions-content">
                <button class="quick-action-btn">
                  <span class="action-icon">⚡</span>
                  <span class="action-label">Quick Fix</span>
                  <span class="action-confidence">95% ✓</span>
                </button>
              </div>
            </div>

            <div class="intelligence-section">
              <h3>📚 Learning</h3>
              <div class="learning-content">
                <div class="stat-item">
                  <span class="stat-label">Incidents this week:</span>
                  <span class="stat-value">{props.incidents?.length || 0}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Auto-fixed:</span>
                  <span class="stat-value">0</span>
                </div>
              </div>
            </div>

            <div class="intelligence-section">
              <h3>🏥 Health</h3>
              <div class="health-score">
                <div class="health-gauge">
                  <div class="health-fill" style={{ width: `${clusterHealth()}%` }} />
                </div>
                <span class="health-label">{clusterHealth()}%</span>
              </div>
            </div>
          </aside>
        </Show>
      </div>

      {/* Keyboard Shortcuts Footer */}
      <footer class="workspace-footer">
        <div class="shortcut-hints">
          <span class="shortcut-hint">⌨ J/K: Navigate</span>
          <span class="shortcut-separator">•</span>
          <span class="shortcut-hint">Enter: Select</span>
          <span class="shortcut-separator">•</span>
          <span class="shortcut-hint">ESC: Close</span>
          <span class="shortcut-separator">•</span>
          <span class="shortcut-hint">?: Help</span>
        </div>
      </footer>
    </div>
  );
};

export default IntelligentWorkspace;
