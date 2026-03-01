/**
 * IntelligentWorkspace — Shell layout matching kubegraf-final-white.html
 * Layout: 52px rail | content-area (260px sidebar | 1fr main-panel)
 */

import { Component, createSignal, createMemo, createEffect, Show, onMount, onCleanup } from 'solid-js';
import { Incident, api } from '../../services/api';
import { wsService } from '../../services/websocket';
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
import OrkasAIPanel from './OrkasAIPanel';
import SafeFixPanel from './SafeFixPanel';
import MLInsightsPanel from './MLInsightsPanel';
import KnowledgeBankPanel from './KnowledgeBankPanel';
import './workspace.css';

interface IntelligentWorkspaceProps {
  incidents: Incident[];
  isLoading?: boolean;
  onIncidentSelect?: (incident: Incident) => void;
  onClose?: () => void;
}

const IntelligentWorkspace: Component<IntelligentWorkspaceProps> = (props) => {
  // Track selection by ID so it stays stable when the list refreshes and re-sorts
  const [selectedId, setSelectedId] = createSignal<string | null>(null);
  const [activeRail, setActiveRail] = createSignal('incident');
  const [activeScreen, setActiveScreen] = createSignal<
    'home' | 'incident' | 'workloads' | 'graph' | 'metrics' | 'gitops' | 'cost' | 'settings' | 'orkai' | 'safefix' | 'mlinsights' | 'knowledgebank'
  >('incident');
  const [resolveToast, setResolveToast] = createSignal<{ msg: string; ok: boolean } | null>(null);
  const [graphAlert, setGraphAlert] = createSignal<{ rootName: string; pattern: string; conf: number } | null>(null);

  // Only propagate a new value to consumers (IncidentDetail) when the incident ID
  // actually changes. Same ID from a refreshed array → same memo output → no
  // downstream effects re-fire, no panel flash.
  const currentIncident = createMemo(
    () => {
      const incidents = props.incidents || [];
      const id = selectedId();
      if (id) {
        const found = incidents.find(i => i.id === id);
        if (found) return found;
      }
      // If the selected ID is gone from the list (resolved/deleted), fall back to
      // the first incident — but do NOT fall back merely because selectedId is null.
      // selectedId will be seeded below via createEffect once incidents first load.
      return null;
    },
    null,
    { equals: (a, b) => a?.id === b?.id },
  );

  // Seed / re-seed the selection:
  //   1. On first load — the parent clears localIncidents before fetching, so
  //      onMount fires before any incidents exist. This effect fires once they arrive.
  //   2. If the previously selected incident was resolved/deleted and is no longer
  //      in the list — auto-advance to the first remaining incident rather than
  //      showing a blank panel.
  // In all other cases (auto-refresh with the selected incident still present)
  // this is a no-op because selectedId() is non-null and found in the list.
  createEffect(() => {
    const incidents = props.incidents || [];
    const id = selectedId();
    // Case 1: nothing selected yet
    if (id === null) {
      const first = incidents[0];
      if (first?.id) setSelectedId(first.id);
      return;
    }
    // Case 2: selected incident was removed from the list
    const stillExists = incidents.some(i => i.id === id);
    if (!stillExists && incidents.length > 0) {
      setSelectedId(incidents[0].id);
    }
  });

  const handleSelectById = (id: string) => {
    const incident = (props.incidents || []).find(i => i.id === id);
    setSelectedId(id);
    setActiveRail('incident');
    setActiveScreen('incident');
    if (incident && props.onIncidentSelect) {
      props.onIncidentSelect(incident);
    }
  };

  // Kept for internal callers that pass an ID directly
  const handleSelectIncident = (id: string) => handleSelectById(id);

  const handleFilterChange = (_newFilters: FilterState) => {
    // Selection is ID-based — no need to reset on filter change.
    // The incident remains highlighted if it's still visible after filtering.
  };

  // prev/next navigate in props.incidents order (stable fetch order, not UI sort)
  const currentNavIndex = createMemo(() => {
    const id = selectedId();
    if (!id) return 0;
    const idx = (props.incidents || []).findIndex(i => i.id === id);
    return idx >= 0 ? idx : 0;
  });

  const handlePrevious = () => {
    const idx = currentNavIndex();
    if (idx > 0) {
      const prev = (props.incidents || [])[idx - 1];
      if (prev?.id) handleSelectById(prev.id);
    }
  };

  const handleNext = () => {
    const idx = currentNavIndex();
    const list = props.incidents || [];
    if (idx < list.length - 1) {
      const next = list[idx + 1];
      if (next?.id) handleSelectById(next.id);
    }
  };

  const showToast = (msg: string, ok: boolean) => {
    setResolveToast({ msg, ok });
    setTimeout(() => setResolveToast(null), 3500);
  };

  const handleResolve = async () => {
    const inc = currentIncident();
    if (!inc) return;
    try {
      await api.resolveIncident(inc.id, 'Resolved from Intelligence Workspace');
      showToast('✓ Incident resolved', true);
    } catch (err) {
      showToast('✗ Failed to resolve incident', false);
    }
  };

  // Navigate to the incident matching a workload by resource name
  const handleWorkloadIncidentSelect = (name: string, ns: string) => {
    const match = (props.incidents || []).find(
      inc => inc.resource?.name === name && (!ns || !inc.resource?.namespace || inc.resource.namespace === ns)
    );
    if (match?.id) {
      handleSelectById(match.id);
    } else {
      setActiveRail('incident');
      setActiveScreen('incident');
    }
  };

  const handleSelectRelated = (incidentId: string) => {
    handleSelectById(incidentId);
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

    // Subscribe to graph engine anomaly pushes — show a dismissible banner
    const unsub = wsService.subscribe((msg) => {
      if (msg.type === 'graph_incident' && msg.data) {
        const d = msg.data;
        const rootName = d.root_cause ? `${d.root_cause.kind}/${d.root_cause.name}` : 'Unknown';
        const pattern  = d.pattern_matched ? d.pattern_matched.replace(/_/g, ' ') : 'Anomaly';
        const conf     = Math.round((d.confidence || 0) * 100);
        setGraphAlert({ rootName, pattern, conf });
        setTimeout(() => setGraphAlert(null), 15_000);
      }
    });
    onCleanup(unsub);
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
    else if (id === 'orkai')         setActiveScreen('orkai');
    else if (id === 'safefix')       setActiveScreen('safefix');
    else if (id === 'mlinsights')    setActiveScreen('mlinsights');
    else if (id === 'knowledgebank') setActiveScreen('knowledgebank');
  };

  const critCount = createMemo(() => props.incidents.filter(i => i.severity === 'critical').length);

  return (
    <div class="shell">
      {/* ═══ TOAST ═══ */}
      <Show when={resolveToast()}>
        {(toast) => (
          <div style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            padding: '10px 16px',
            background: toast().ok ? 'rgba(5,150,105,.95)' : 'rgba(220,38,38,.95)',
            color: '#fff',
            'border-radius': '8px',
            'font-size': '12.5px',
            'font-weight': '600',
            'z-index': '9999',
            'box-shadow': '0 4px 12px rgba(0,0,0,.2)',
            animation: 'fadeIn 0.2s ease',
          }}>
            {toast().msg}
          </div>
        )}
      </Show>
      {/* ═══ GRAPH INCIDENT ALERT BANNER ═══ */}
      <Show when={graphAlert()}>
        {(alert) => (
          <div style={{
            position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(220,38,38,.95)', color: '#fff', 'border-radius': '8px',
            padding: '10px 16px', 'font-size': '12.5px', 'font-weight': '600',
            'z-index': '9999', 'box-shadow': '0 4px 16px rgba(220,38,38,.3)',
            display: 'flex', 'align-items': 'center', gap: '10px', 'max-width': '480px',
            animation: 'fadeIn 0.2s ease',
          }}>
            <span style={{ opacity: '.8', 'font-size': '14px' }}>⬡</span>
            <div>
              <span style={{ 'font-weight': '700' }}>Graph Incident: </span>
              <span>{alert().pattern} on {alert().rootName}</span>
              <span style={{ opacity: '.75', 'margin-left': '8px', 'font-size': '11px' }}>({alert().conf}% confidence)</span>
            </div>
            <button
              onClick={() => setGraphAlert(null)}
              style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', 'border-radius': '4px', cursor: 'pointer', padding: '2px 7px', 'font-size': '12px', 'font-family': 'inherit', 'flex-shrink': '0' }}>
              ✕
            </button>
          </div>
        )}
      </Show>
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

        {/* SafeFix */}
        <div class={`nav-item ${activeRail() === 'safefix' ? 'active' : ''}`} title="SafeFix Engine" onClick={() => handleRailClick('safefix')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>

        {/* ML Insights */}
        <div class={`nav-item ${activeRail() === 'mlinsights' ? 'active' : ''}`} title="ML Insights" onClick={() => handleRailClick('mlinsights')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>

        {/* Knowledge Bank */}
        <div class={`nav-item ${activeRail() === 'knowledgebank' ? 'active' : ''}`} title="Knowledge Bank" onClick={() => handleRailClick('knowledgebank')}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
          </svg>
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

        {/* Orkas AI */}
        <div
          class={`nav-item ${activeRail() === 'orkai' ? 'active' : ''}`}
          title="Orkas AI"
          onClick={() => handleRailClick('orkai')}
          style={{ position: 'relative' }}
        >
          <img src="/orkas-logo.png" alt="Orkas AI" style={{ height: '18px', width: 'auto', 'object-fit': 'contain' }} />
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
            selectedId={selectedId()}
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
            <Show when={activeScreen() === 'safefix'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                SafeFix
              </div>
            </Show>
            <Show when={activeScreen() === 'mlinsights'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                ML Insights
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
            <Show when={activeScreen() === 'orkai'}>
              <div class="stab on">
                <img src="/orkas-logo.png" alt="" style={{ height: '11px', width: 'auto', 'object-fit': 'contain', 'vertical-align': 'middle' }} />
                Orkas AI
              </div>
            </Show>
            <Show when={activeScreen() === 'knowledgebank'}>
              <div class="stab on">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/>
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                </svg>
                Knowledge Bank
              </div>
            </Show>

            {/* ── Close button — always visible, pushed to far right ── */}
            <Show when={!!props.onClose}>
              <button
                class="stab ws-close-btn"
                style={{ 'margin-left': 'auto' }}
                onClick={props.onClose}
                title="Close Intelligence Workspace (Esc)"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Close
              </button>
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
                canNavigatePrevious={currentNavIndex() > 0}
                canNavigateNext={currentNavIndex() < (props.incidents?.length || 0) - 1}
                currentIndex={currentNavIndex()}
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
                onSelectWorkloadIncident={handleWorkloadIncidentSelect}
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

          {/* ── SafeFix screen ── */}
          <Show when={activeScreen() === 'safefix'}>
            <WorkspaceErrorBoundary componentName="SafeFixPanel">
              <SafeFixPanel />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── ML Insights screen ── */}
          <Show when={activeScreen() === 'mlinsights'}>
            <WorkspaceErrorBoundary componentName="MLInsightsPanel">
              <MLInsightsPanel />
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

          {/* ── Knowledge Bank screen ── */}
          <Show when={activeScreen() === 'knowledgebank'}>
            <WorkspaceErrorBoundary componentName="KnowledgeBankPanel">
              <KnowledgeBankPanel />
            </WorkspaceErrorBoundary>
          </Show>

          {/* ── Orkas AI screen ── */}
          <Show when={activeScreen() === 'orkai'}>
            <WorkspaceErrorBoundary componentName="Orkas AI">
              <OrkasAIPanel incident={currentIncident() ? {
                id: currentIncident()!.id,
                title: currentIncident()!.title,
                severity: currentIncident()!.severity,
                pattern: currentIncident()!.pattern,
                resource: currentIncident()!.resource,
                namespace: currentIncident()!.resource?.namespace,
              } : null} />
            </WorkspaceErrorBoundary>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default IntelligentWorkspace;
