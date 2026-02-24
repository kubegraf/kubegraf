/**
 * IntelligentWorkspace — Shell layout matching kubegraf-final-white.html
 * Layout: 52px rail | content-area (260px sidebar | 1fr main-panel)
 */

import { Component, createSignal, createMemo, Show, onMount, onCleanup } from 'solid-js';
import { Incident, api } from '../../services/api';
import ContextNavigator, { FilterState } from './ContextNavigator';
import IncidentDetail from './IncidentDetail';
import WorkspaceErrorBoundary from './ErrorBoundary';
import HomeScreen from './HomeScreen';
import ContextGraphScreen from './ContextGraphScreen';
import WorkloadScreen from './WorkloadScreen';
import {
  MetricsPanel,
  GitOpsPanel,
  CostPanel,
  SettingsPanel,
} from './WorkspacePanels';
import './workspace.css';

interface IntelligentWorkspaceProps {
  incidents: Incident[];
  isLoading?: boolean;
  onIncidentSelect?: (incident: Incident) => void;
  onClose?: () => void;
}

const IntelligentWorkspace: Component<IntelligentWorkspaceProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [activeRail, setActiveRail] = createSignal('incident');
  const [activeScreen, setActiveScreen] = createSignal<
    'home' | 'incident' | 'workloads' | 'graph' | 'metrics' | 'gitops' | 'cost' | 'settings'
  >('incident');

  const currentIncident = createMemo(() => {
    const incidents = props.incidents || [];
    return incidents[selectedIndex()] || null;
  });

  const handleSelectIncident = (index: number) => {
    const incident = props.incidents[index];
    setSelectedIndex(index);
    setActiveRail('incident');
    setActiveScreen('incident');
    if (incident && props.onIncidentSelect) {
      props.onIncidentSelect(incident);
    }
  };

  const handleFilterChange = (_newFilters: FilterState) => {
    setSelectedIndex(0);
  };

  const handlePrevious = () => {
    if (selectedIndex() > 0) handleSelectIncident(selectedIndex() - 1);
  };

  const handleNext = () => {
    if (selectedIndex() < props.incidents.length - 1) handleSelectIncident(selectedIndex() + 1);
  };

  const handleResolve = async () => {
    const inc = currentIncident();
    if (!inc) return;
    try {
      await api.resolveIncident(inc.id, 'Resolved from Intelligence Workspace');
    } catch (err) {
      console.error('Failed to resolve:', err);
    }
  };

  const handleSelectRelated = (incidentId: string) => {
    const idx = (props.incidents || []).findIndex(inc => inc.id === incidentId);
    if (idx >= 0) {
      handleSelectIncident(idx);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        handleNext();
        break;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        handlePrevious();
        break;
      case 'Enter':
        e.preventDefault();
        const selected = currentIncident();
        if (selected && props.onIncidentSelect) props.onIncidentSelect(selected);
        break;
      case 'Escape':
        e.preventDefault();
        if (props.onClose) props.onClose();
        break;
    }
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (props.incidents?.length > 0) setSelectedIndex(0);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  const handleRailClick = (id: string) => {
    setActiveRail(id);
    if (id === 'home') setActiveScreen('home');
    else if (id === 'incident') setActiveScreen('incident');
    else if (id === 'workloads') setActiveScreen('workloads');
    else if (id === 'graph') setActiveScreen('graph');
    else if (id === 'metrics') setActiveScreen('metrics');
    else if (id === 'gitops') setActiveScreen('gitops');
    else if (id === 'cost') setActiveScreen('cost');
    else if (id === 'settings') setActiveScreen('settings');
  };

  const critCount = createMemo(() => props.incidents.filter(i => i.severity === 'critical').length);

  return (
    <div class="shell">
      {/* ═══ RAIL ═══ */}
      <nav class="rail">
        {/* Logo */}
        <div class="logo">
          <svg width="30" height="30" viewBox="0 0 34 34" fill="none">
            <polygon points="17,2 30,9.5 30,24.5 17,32 4,24.5 4,9.5" stroke="#22D3EE" stroke-width="1.5" fill="rgba(34,211,238,.08)"/>
            <circle cx="17" cy="17" r="3" fill="#22D3EE"/>
            <line x1="17" y1="2" x2="17" y2="14" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
            <line x1="30" y1="9.5" x2="20" y2="14.5" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
            <line x1="30" y1="24.5" x2="20" y2="19.5" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
            <line x1="17" y1="32" x2="17" y2="20" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
            <line x1="4" y1="24.5" x2="14" y2="19.5" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
            <line x1="4" y1="9.5" x2="14" y2="14.5" stroke="#22D3EE" stroke-width="1" opacity=".4"/>
          </svg>
        </div>

        {/* Home */}
        <div class={`nav-item ${activeRail() === 'home' ? 'active' : ''}`} title="Overview" onClick={() => handleRailClick('home')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </div>

        {/* Incidents */}
        <div class={`nav-item ${activeRail() === 'incident' ? 'active' : ''}`} title="Incidents" onClick={() => handleRailClick('incident')}>
          <Show when={critCount() > 0}><div class="badge" /></Show>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>

        {/* Workloads */}
        <div class={`nav-item ${activeRail() === 'workloads' ? 'active' : ''}`} title="Workloads" onClick={() => handleRailClick('workloads')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        </div>

        {/* Context Graph */}
        <div class={`nav-item ${activeRail() === 'graph' ? 'active' : ''}`} title="Context Graph" onClick={() => handleRailClick('graph')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.8 10.8L17.2 6.2M6.8 13.2L17.2 17.8"/></svg>
        </div>

        {/* Metrics */}
        <div class={`nav-item ${activeRail() === 'metrics' ? 'active' : ''}`} title="Metrics" onClick={() => handleRailClick('metrics')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>

        <div class="rail-sep" />

        {/* GitOps */}
        <div class={`nav-item ${activeRail() === 'gitops' ? 'active' : ''}`} title="GitOps" onClick={() => handleRailClick('gitops')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
        </div>

        {/* Cost */}
        <div class={`nav-item ${activeRail() === 'cost' ? 'active' : ''}`} title="Cost" onClick={() => handleRailClick('cost')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        </div>

        <div class="rail-spacer" />

        {/* Settings */}
        <div class={`nav-item ${activeRail() === 'settings' ? 'active' : ''}`} title="Settings" onClick={() => handleRailClick('settings')}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </div>

        {/* User avatar */}
        <div class="user-avatar" title="Profile">PV</div>
      </nav>

      {/* ═══ CONTENT AREA ═══ */}
      <div class="content-area">

        {/* ═══ SIDEBAR ═══ */}
        <WorkspaceErrorBoundary componentName="ContextNavigator">
          <ContextNavigator
            incidents={props.incidents || []}
            currentIndex={selectedIndex()}
            onSelectIncident={handleSelectIncident}
            onFilterChange={handleFilterChange}
          />
        </WorkspaceErrorBoundary>

        {/* ═══ MAIN PANEL ═══ */}
        <div class="main-panel">
          {/* Screen tabs */}
          <div class="screen-tabs">
            <div class={`stab ${activeScreen() === 'home' ? 'on' : ''}`} onClick={() => handleRailClick('home')}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Overview
            </div>
            <div class={`stab ${activeScreen() === 'incident' ? 'on' : ''}`} onClick={() => handleRailClick('incident')}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              Incident
              <Show when={critCount() > 0}>
                <span class="ct">SEV-{critCount() > 1 ? critCount() : '1'}</span>
              </Show>
            </div>
            <div class={`stab ${activeScreen() === 'workloads' ? 'on' : ''}`} onClick={() => handleRailClick('workloads')}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              Workloads
            </div>
            <div class={`stab ${activeScreen() === 'graph' ? 'on' : ''}`} onClick={() => handleRailClick('graph')}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.8 10.8L17.2 6.2M6.8 13.2L17.2 17.8"/></svg>
              Context Graph
            </div>
            <Show when={activeScreen() === 'metrics'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Metrics
              </div>
            </Show>
            <Show when={activeScreen() === 'gitops'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                GitOps
              </div>
            </Show>
            <Show when={activeScreen() === 'cost'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                Cost
              </div>
            </Show>
            <Show when={activeScreen() === 'settings'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Settings
              </div>
            </Show>
          </div>

          {/* ── Overview screen ── */}
          <Show when={activeScreen() === 'home'}>
            <WorkspaceErrorBoundary componentName="HomeScreen">
              <HomeScreen
                incidents={props.incidents || []}
                onSelectIncident={handleSelectIncident}
                onGoToIncident={() => { setActiveScreen('incident'); setActiveRail('incident'); }}
              />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Incident screen ── */}
          <Show when={activeScreen() === 'incident'}>
            <WorkspaceErrorBoundary componentName="IncidentDetail">
              <IncidentDetail
                incident={currentIncident()}
                allIncidents={props.incidents}
                isLoading={props.isLoading}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onResolve={handleResolve}
                onSelectRelated={handleSelectRelated}
                onClose={props.onClose}
                canNavigatePrevious={selectedIndex() > 0}
                canNavigateNext={selectedIndex() < (props.incidents?.length || 0) - 1}
                currentIndex={selectedIndex()}
                totalIncidents={props.incidents?.length || 0}
              />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Workloads screen ── */}
          <Show when={activeScreen() === 'workloads'}>
            <WorkspaceErrorBoundary componentName="WorkloadScreen">
              <WorkloadScreen
                incidents={props.incidents || []}
                onViewIncident={() => { setActiveScreen('incident'); setActiveRail('incident'); }}
              />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Context Graph screen ── */}
          <Show when={activeScreen() === 'graph'}>
            <WorkspaceErrorBoundary componentName="ContextGraphScreen">
              <ContextGraphScreen
                incidents={props.incidents || []}
                onSelectIncident={(id) => {
                  handleSelectRelated(id);
                  setActiveScreen('incident');
                  setActiveRail('incident');
                }}
              />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Metrics screen ── */}
          <Show when={activeScreen() === 'metrics'}>
            <WorkspaceErrorBoundary componentName="MetricsPanel">
              <MetricsPanel />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── GitOps screen ── */}
          <Show when={activeScreen() === 'gitops'}>
            <WorkspaceErrorBoundary componentName="GitOpsPanel">
              <GitOpsPanel />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Cost screen ── */}
          <Show when={activeScreen() === 'cost'}>
            <WorkspaceErrorBoundary componentName="CostPanel">
              <CostPanel />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Settings screen ── */}
          <Show when={activeScreen() === 'settings'}>
            <WorkspaceErrorBoundary componentName="SettingsPanel">
              <SettingsPanel incidents={props.incidents} onClose={props.onClose} />
            </WorkspaceErrorBoundary>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default IntelligentWorkspace;
