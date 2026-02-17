/**
 * IntelligentWorkspace - Main container for the unique 3-panel incident investigation UI
 *
 * Layout: Context Navigator (20%) | Investigation Workspace (60%) | Intelligence Assistant (20%)
 *
 * Features:
 * - Adaptive layout based on confidence
 * - Keyboard navigation (J/K, Enter, ESC, [/])
 * - Responsive design
 * - Spatial memory navigation
 * - Integrated panel components
 */

import { Component, createSignal, createMemo, Show, onMount, onCleanup } from 'solid-js';
import { Incident } from '../../services/api';
import ContextNavigator, { FilterState } from './ContextNavigator';
import InvestigationWorkspace from './InvestigationWorkspace';
import IntelligenceAssistant from './IntelligenceAssistant';
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

  const [filters, setFilters] = createSignal<FilterState>({
    severity: [],
    pattern: [],
    namespace: [],
    status: [],
    searchQuery: '',
  });

  // Computed values
  const currentIncident = createMemo(() => {
    const incidents = props.incidents || [];
    const idx = state().selectedIndex;
    return incidents[idx] || null;
  });

  // Calculate cluster health
  const clusterHealth = createMemo(() => {
    const incidents = props.incidents || [];
    if (incidents.length === 0) return 100;

    const critical = incidents.filter((i) => i.severity === 'critical').length;
    const high = incidents.filter((i) => i.severity === 'high').length;

    // Simple health calculation: 100 - (critical * 10) - (high * 5)
    const health = Math.max(0, 100 - critical * 10 - high * 5);
    return health;
  });

  // Handlers
  const handleSelectIncident = (index: number) => {
    const incident = props.incidents[index];
    setState((prev) => ({
      ...prev,
      selectedIndex: index,
      currentIncidentId: incident?.id || null,
    }));

    if (incident && props.onIncidentSelect) {
      props.onIncidentSelect(incident);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Reset selection when filters change
    setState((prev) => ({ ...prev, selectedIndex: 0 }));
  };

  const handlePrevious = () => {
    if (state().selectedIndex > 0) {
      handleSelectIncident(state().selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (state().selectedIndex < props.incidents.length - 1) {
      handleSelectIncident(state().selectedIndex + 1);
    }
  };

  const handleResolve = () => {
    console.log('Resolve incident:', currentIncident()?.id);
    // TODO: Implement resolve functionality in Phase 4
  };

  const handleDownloadRCA = () => {
    console.log('Download RCA for incident:', currentIncident()?.id);
    // TODO: Implement RCA download in Phase 4
  };

  const handleQuickAction = (actionId: string) => {
    console.log('Quick action:', actionId, 'for incident:', currentIncident()?.id);
    // TODO: Implement quick action execution in Phase 4
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const currentState = state();
    const incidents = props.incidents || [];

    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        if (currentState.selectedIndex < incidents.length - 1) {
          handleNext();
        }
        break;

      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        if (currentState.selectedIndex > 0) {
          handlePrevious();
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
          setState((prev) => ({
            ...prev,
            contextNavigatorVisible: !prev.contextNavigatorVisible,
          }));
        }
        break;

      case ']':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setState((prev) => ({
            ...prev,
            intelligenceAssistantVisible: !prev.intelligenceAssistantVisible,
          }));
        }
        break;

      case '?':
        e.preventDefault();
        // Show keyboard shortcuts help (TODO: implement in Phase 5)
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
          <ContextNavigator
            incidents={props.incidents || []}
            currentIndex={state().selectedIndex}
            onSelectIncident={handleSelectIncident}
            onFilterChange={handleFilterChange}
          />
        </Show>

        {/* Investigation Workspace (Center Panel - 60%) */}
        <InvestigationWorkspace
          incident={currentIncident()}
          allIncidents={props.incidents}
          isLoading={props.isLoading}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onResolve={handleResolve}
          onDownloadRCA={handleDownloadRCA}
          canNavigatePrevious={state().selectedIndex > 0}
          canNavigateNext={state().selectedIndex < (props.incidents?.length || 0) - 1}
          currentIndex={state().selectedIndex}
          totalIncidents={props.incidents?.length || 0}
        />

        {/* Intelligence Assistant (Right Panel - 20%) */}
        <Show when={state().intelligenceAssistantVisible}>
          <IntelligenceAssistant
            incident={currentIncident()}
            allIncidents={props.incidents}
            clusterHealth={clusterHealth()}
            onQuickAction={handleQuickAction}
          />
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
          <span class="shortcut-hint">Cmd+[/]: Toggle Panels</span>
          <span class="shortcut-separator">•</span>
          <span class="shortcut-hint">?: Help</span>
        </div>
      </footer>
    </div>
  );
};

export default IntelligentWorkspace;
