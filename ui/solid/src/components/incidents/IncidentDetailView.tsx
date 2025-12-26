// Copyright 2025 KubeGraf Contributors
// Incident Detail View - Production-grade incident explanation UI
// Sections in MANDATORY ORDER: Header → Signals → Root Cause → Timeline → Logs → Impact → Changes → Fixes → Knowledge

import { Component, Show, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { Incident, IncidentSnapshot, api } from '../../services/api';
import { incidentsV2Store } from '../../stores/incidentsV2';
import { capabilities } from '../../stores/capabilities';
import IncidentHeader from './IncidentHeader';
import SignalSummaryPanel from './SignalSummaryPanel';
import RootCauseExplanation from './RootCauseExplanation';
import TimelineReconstruction from './TimelineReconstruction';
import LogErrorAnalysis from './LogErrorAnalysis';
import AvailabilityImpact from './AvailabilityImpact';
import ChangeIntelligence from './ChangeIntelligence';
import RecommendedFixes from './RecommendedFixes';
import FixPreviewPanel from './FixPreviewPanel';
import KnowledgeBank from './KnowledgeBank';
import MetricsAnalysis from './MetricsAnalysis';
import CitationsPanel from './CitationsPanel';

interface IncidentDetailViewProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

const IncidentDetailView: Component<IncidentDetailViewProps> = (props) => {
  const [snapshot, setSnapshot] = createSignal<IncidentSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = createSignal(false);
  const [snapshotError, setSnapshotError] = createSignal<string | null>(null);
  const [selectedFixId, setSelectedFixId] = createSignal<string | null>(null);
  const [collapsedSections, setCollapsedSections] = createSignal<Set<string>>(new Set());

  // Handle ESC key to close modal
  onMount(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen) {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    onCleanup(() => window.removeEventListener('keydown', handleEsc));
  });

  // Fetch snapshot when modal opens
  createEffect(async () => {
    if (props.isOpen && props.incident) {
      const incidentId = props.incident.id;
      
      // Check cache first
      const cached = incidentsV2Store.getSnapshot(incidentId);
      if (cached) {
        setSnapshot(cached);
        setSnapshotLoading(false);
        setSnapshotError(null);
        return;
      }

      // Fetch snapshot
      setSnapshotLoading(true);
      setSnapshotError(null);
      try {
        const snap = await api.getIncidentSnapshot(incidentId);
        incidentsV2Store.setSnapshot(incidentId, snap);
        setSnapshot(snap);
      } catch (err: any) {
        setSnapshotError(err.message || 'Failed to load incident snapshot');
      } finally {
        setSnapshotLoading(false);
      }
    } else if (!props.isOpen && props.incident) {
      // Clear data when modal closes
      setSelectedFixId(null);
      setCollapsedSections(new Set());
    }
  });

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections().has(sectionId);

  const snap = snapshot();
  const inc = props.incident;

  if (!props.isOpen || !inc) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          transition: 'opacity 0.2s',
        }}
        onClick={props.onClose}
      />

      {/* Modal Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '900px',
          background: 'var(--bg-primary)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          'flex-direction': 'column',
          zIndex: 9999,
          transform: props.isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (top right) */}
        <button
          onClick={props.onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '8px',
            border: 'none',
            background: 'var(--bg-secondary)',
            'border-radius': '6px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-primary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: 'auto', '-webkit-overflow-scrolling': 'touch' }}>
          <Show when={snapshotLoading()}>
            <div style={{ padding: '60px 20px', 'text-align': 'center', color: 'var(--text-secondary)' }}>
              <div style={{ 'font-size': '16px', 'margin-bottom': '8px' }}>Loading incident details...</div>
              <div style={{ 'font-size': '13px', color: 'var(--text-muted)' }}>Fetching snapshot and evidence</div>
            </div>
          </Show>

          <Show when={snapshotError()}>
            <div style={{ padding: '40px 20px', 'text-align': 'center' }}>
              <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '8px', color: '#dc3545', 'margin-bottom': '16px' }}>
                Error: {snapshotError()}
              </div>
              <button
                onClick={() => {
                  setSnapshotLoading(true);
                  setSnapshotError(null);
                  const incidentId = inc.id;
                  api.getIncidentSnapshot(incidentId)
                    .then((snap) => {
                      incidentsV2Store.setSnapshot(incidentId, snap);
                      setSnapshot(snap);
                    })
                    .catch((err: any) => {
                      setSnapshotError(err.message || 'Failed to load incident snapshot');
                    })
                    .finally(() => {
                      setSnapshotLoading(false);
                    });
                }}
                style={{
                  padding: '10px 20px',
                  'border-radius': '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  'font-size': '13px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </Show>

          <Show when={snap && !snapshotLoading() && !snapshotError()}>
            {/* 1. Incident Header */}
            <IncidentHeader incident={inc} snapshot={snap!} />

            {/* 2. Signal Summary Panel */}
            <CollapsibleSection
              id="signals"
              title="Signal Summary"
              collapsed={isSectionCollapsed('signals')}
              onToggle={() => toggleSection('signals')}
            >
              <SignalSummaryPanel snapshot={snap!} />
            </CollapsibleSection>

            {/* 3. Root Cause Explanation */}
            <CollapsibleSection
              id="root-cause"
              title="Root Cause Explanation"
              collapsed={isSectionCollapsed('root-cause')}
              onToggle={() => toggleSection('root-cause')}
            >
              <RootCauseExplanation snapshot={snap!} />
            </CollapsibleSection>

            {/* 4. Timeline Reconstruction */}
            <CollapsibleSection
              id="timeline"
              title="Timeline Reconstruction"
              collapsed={isSectionCollapsed('timeline')}
              onToggle={() => toggleSection('timeline')}
            >
              <TimelineReconstruction incidentId={inc.id} />
            </CollapsibleSection>

            {/* 5. Log Error Analysis */}
            <CollapsibleSection
              id="logs"
              title="Log Error Analysis"
              collapsed={isSectionCollapsed('logs')}
              onToggle={() => toggleSection('logs')}
            >
              <LogErrorAnalysis incidentId={inc.id} />
            </CollapsibleSection>

            {/* 5b. Metrics Analysis */}
            <CollapsibleSection
              id="metrics"
              title="Metrics Analysis"
              collapsed={isSectionCollapsed('metrics')}
              onToggle={() => toggleSection('metrics')}
            >
              <MetricsAnalysis incidentId={inc.id} />
            </CollapsibleSection>

            {/* 6. Availability / HTTP Impact */}
            <CollapsibleSection
              id="impact"
              title="Availability / HTTP Impact"
              collapsed={isSectionCollapsed('impact')}
              onToggle={() => toggleSection('impact')}
            >
              <AvailabilityImpact snapshot={snap!} />
            </CollapsibleSection>

            {/* 7. Change Intelligence */}
            <CollapsibleSection
              id="changes"
              title="Change Intelligence"
              collapsed={isSectionCollapsed('changes')}
              onToggle={() => toggleSection('changes')}
            >
              <ChangeIntelligence incidentId={inc.id} firstSeen={snap!.firstSeen} />
            </CollapsibleSection>

            {/* 8. Recommended Fixes */}
            <CollapsibleSection
              id="fixes"
              title="Recommended Fixes"
              collapsed={isSectionCollapsed('fixes')}
              onToggle={() => toggleSection('fixes')}
            >
              <RecommendedFixes
                incidentId={inc.id}
                snapshot={snap!}
                onPreviewFix={(fixId) => setSelectedFixId(fixId)}
              />
            </CollapsibleSection>

            {/* 9. Knowledge Bank - Only show if similar incidents capability is enabled */}
            <Show when={capabilities.isSimilarIncidentsEnabled()}>
              <CollapsibleSection
                id="knowledge"
                title="Knowledge Bank"
                collapsed={isSectionCollapsed('knowledge')}
                onToggle={() => toggleSection('knowledge')}
              >
                <KnowledgeBank incidentId={inc.id} />
              </CollapsibleSection>
            </Show>

            {/* 10. Citations & References */}
            <CollapsibleSection
              id="citations"
              title="Citations & References"
              collapsed={isSectionCollapsed('citations')}
              onToggle={() => toggleSection('citations')}
            >
              <CitationsPanel incidentId={inc.id} />
            </CollapsibleSection>
          </Show>
        </div>
      </div>

      {/* Footer with Resolve Button */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          display: 'flex',
          'justify-content': 'flex-end',
          gap: '12px',
        }}
      >
        <Show when={snap && snap.status !== 'resolved'}>
          <button
            onClick={async () => {
              if (!inc.id) return;
              try {
                await api.resolveIncident(inc.id, 'Resolved via UI');
                // Refresh snapshot or close modal
                props.onClose();
              } catch (err: any) {
                console.error('Failed to resolve incident:', err);
                alert(`Failed to resolve incident: ${err.message || 'Unknown error'}`);
              }
            }}
            style={{
              padding: '10px 20px',
              'border-radius': '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              'font-size': '13px',
              'font-weight': '500',
              cursor: 'pointer',
            }}
          >
            Mark as Resolved
          </button>
        </Show>
      </div>

      {/* Fix Preview Panel */}
      <Show when={selectedFixId()}>
        <FixPreviewPanel
          incidentId={inc.id}
          fixId={selectedFixId()}
          onClose={() => setSelectedFixId(null)}
          onApply={() => {
            setSelectedFixId(null);
            // Refresh snapshot to reflect changes
            if (inc.id) {
              api.getIncidentSnapshot(inc.id)
                .then((snap) => {
                  incidentsV2Store.setSnapshot(inc.id, snap);
                  setSnapshot(snap);
                })
                .catch((err) => console.error('Failed to refresh snapshot:', err));
            }
          }}
        />
      </Show>
    </>
  );
};

// Collapsible Section Wrapper
interface CollapsibleSectionProps {
  id: string;
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: any;
}

const CollapsibleSection: Component<CollapsibleSectionProps> = (props) => {
  return (
    <div>
      <button
        onClick={props.onToggle}
        style={{
          width: '100%',
          padding: '16px 20px',
          border: 'none',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          'font-size': '15px',
          'font-weight': '600',
          cursor: 'pointer',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-primary)';
        }}
      >
        <span>{props.title}</span>
        <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>
          {props.collapsed ? '▼' : '▲'}
        </span>
      </button>
      <Show when={!props.collapsed}>
        {props.children}
      </Show>
    </div>
  );
};

export default IncidentDetailView;

