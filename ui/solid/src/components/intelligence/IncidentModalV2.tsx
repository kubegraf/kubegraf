import { Component, Show, createSignal, createEffect, For, onMount, onCleanup } from 'solid-js';
import { Incident, IncidentSnapshot, api } from '../../services/api';
import EvidencePanel from './EvidencePanel';
import CitationsPanel from './CitationsPanel';
import RunbookSelector from './RunbookSelector';
import SimilarIncidents from './SimilarIncidents';
import ChangeTimeline from './ChangeTimeline';

interface IncidentModalV2Props {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

const IncidentModalV2: Component<IncidentModalV2Props> = (props) => {
  const [snapshot, setSnapshot] = createSignal<IncidentSnapshot | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [activeTab, setActiveTab] = createSignal<string | null>(null);
  const [loadedTabs, setLoadedTabs] = createSignal<Set<string>>(new Set());
  const [resolving, setResolving] = createSignal(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = createSignal<string | null>(null);

  // Fetch snapshot when modal opens
  createEffect(async () => {
    if (props.isOpen && props.incident) {
      setLoading(true);
      setError(null);
      setActiveTab(null);
      setLoadedTabs(new Set());

      try {
        const snap = await api.getIncidentSnapshot(props.incident.id);
        setSnapshot(snap);

        // Auto-open recommended action tab if available
        if (snap.recommendedAction) {
          setActiveTab(snap.recommendedAction.tab);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load incident snapshot');
        console.error('Error loading snapshot:', err);
      } finally {
        setLoading(false);
      }
    }
  });

  // Handle ESC key
  onMount(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen) {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    onCleanup(() => window.removeEventListener('keydown', handleEsc));
  });

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (!loadedTabs().has(tabId)) {
      setLoadedTabs(new Set([...loadedTabs(), tabId]));
    }
  };

  const handleResolve = async () => {
    if (!props.incident) return;
    setResolving(true);
    try {
      await api.resolveIncident(props.incident.id, 'Resolved by user');
      props.onClose();
    } catch (err: any) {
      console.error('Error resolving incident:', err);
      alert('Failed to resolve incident: ' + (err.message || 'Unknown error'));
    } finally {
      setResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff6b6b';
      case 'medium': case 'warning': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const getPatternIcon = (pattern: string) => {
    switch (pattern.toUpperCase()) {
      case 'RESTART_STORM': return '🌪️';
      case 'CRASHLOOP': return '💥';
      case 'OOM_PRESSURE': return '💾';
      case 'LIVENESS_FAILURE': case 'READINESS_FAILURE': return '💓';
      case 'PENDING_POD': return '⏳';
      default: return '⚠️';
    }
  };

  const getStatusBadge = (status: string) => {
    const isActive = status === 'open' || status === 'investigating' || status === 'remediating';
    return (
      <span style={{
        padding: '4px 8px',
        'border-radius': '4px',
        'font-size': '11px',
        'font-weight': '600',
        background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        color: isActive ? '#dc3545' : '#22c55e',
        'text-transform': 'uppercase'
      }}>
        {isActive ? 'Active' : 'Resolved'}
      </span>
    );
  };

  // Use snapshot() directly in JSX for reactivity

  return (
    <Show when={props.isOpen && props.incident}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          'z-index': 9998,
          transition: 'opacity 0.2s ease',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            props.onClose();
          }
        }}
      >
        {/* Modal - Right-side slide-in */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            'max-width': '720px',
            background: 'var(--bg-primary)',
            'box-shadow': '-4px 0 24px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            'flex-direction': 'column',
            'z-index': 9999,
            transform: props.isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease',
            '@media (max-width: 768px)': {
              'max-width': '100%',
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div style={{
            padding: '20px 24px',
            'border-bottom': '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            position: 'sticky',
            top: 0,
            'z-index': 10,
          }}>
            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '8px', 'flex-wrap': 'wrap' }}>
                  <span style={{ 'font-size': '24px' }}>{snapshot() ? getPatternIcon(snapshot()!.pattern) : '⚠️'}</span>
                  <span style={{
                    padding: '4px 10px',
                    'border-radius': '4px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: snapshot() ? `${getSeverityColor(snapshot()!.severity)}20` : 'var(--bg-secondary)',
                    color: snapshot() ? getSeverityColor(snapshot()!.severity) : 'var(--text-secondary)',
                    'text-transform': 'uppercase'
                  }}>
                    {snapshot()?.severity || props.incident?.severity || 'unknown'}
                  </span>
                  {snapshot() && getStatusBadge(snapshot()!.status)}
                </div>
                <div style={{ color: 'var(--text-secondary)', 'font-size': '13px', 'margin-bottom': '4px' }}>
                  {snapshot()?.resource.namespace || props.incident?.resource?.namespace || ''} / {snapshot()?.resource.kind || props.incident?.resource?.kind || ''} / {snapshot()?.resource.name || props.incident?.resource?.name || ''}
                </div>
                <div style={{ color: 'var(--text-secondary)', 'font-size': '12px' }}>
                  {snapshot()?.occurrences || props.incident?.occurrences || 0} occurrences
                </div>
              </div>
              <button
                onClick={props.onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  'font-size': '20px',
                  'line-height': 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}>
            <Show when={loading()}>
              <div style={{
                display: 'flex',
                'justify-content': 'center',
                'align-items': 'center',
                padding: '60px 20px',
                color: 'var(--text-secondary)'
              }}>
                <div class="spinner" style={{ 'margin-right': '12px' }} />
                Loading incident snapshot...
              </div>
            </Show>

            <Show when={error()}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                'border-radius': '8px',
                padding: '16px',
                color: '#dc3545',
                'margin-bottom': '20px'
              }}>
                <strong>Error:</strong> {error()}
              </div>
            </Show>

            <Show when={!loading() && !error() && snapshot()}>
              {/* Impact Panel */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{
                  margin: '0 0 12px',
                  'font-size': '14px',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Impact
                </h3>
                <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Affected Replicas</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.affectedReplicas}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>User-Facing</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.userFacingLabel}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Service Exposure</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.serviceExposure.hasService ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Namespace</div>
                    <div style={{ 'font-size': '16px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {snapshot()!.impact.namespaceCriticality}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{
                  margin: '0 0 12px',
                  'font-size': '14px',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Diagnosis
                </h3>
                <p style={{
                  margin: '0 0 12px',
                  color: 'var(--text-primary)',
                  'line-height': '1.6'
                }}>
                  {snapshot()!.diagnosisSummary}
                </p>
                <div style={{ 'margin-bottom': '12px' }}>
                  <div style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'margin-bottom': '8px' }}>
                    Root Causes:
                  </div>
                  <For each={snapshot()!.rootCauses}>
                    {(cause, index) => (
                      <div style={{
                        'margin-bottom': '8px',
                        padding: '8px',
                        background: index() === 0 ? 'var(--bg-secondary)' : 'transparent',
                        'border-radius': '4px',
                        'border-left': index() === 0 ? '3px solid var(--accent-primary)' : 'none'
                      }}>
                        <div style={{
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center',
                          'margin-bottom': '4px'
                        }}>
                          <span style={{
                            color: 'var(--text-primary)',
                            'font-weight': index() === 0 ? '600' : '400'
                          }}>
                            {index() === 0 ? 'Primary' : 'Secondary'}: {cause.cause}
                          </span>
                          <span style={{
                            'font-size': '11px',
                            color: 'var(--text-secondary)'
                          }}>
                            {Math.round(cause.likelihood * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px',
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  'border-radius': '4px'
                }}>
                  <span style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>Confidence:</span>
                  <span style={{
                    padding: '2px 8px',
                    'border-radius': '4px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: snapshot()!.confidence >= 0.8 ? 'rgba(34, 197, 94, 0.1)' :
                               snapshot()!.confidence >= 0.5 ? 'rgba(251, 191, 36, 0.1)' :
                               'rgba(239, 68, 68, 0.1)',
                    color: snapshot()!.confidence >= 0.8 ? '#22c55e' :
                           snapshot()!.confidence >= 0.5 ? '#fbbf24' :
                           '#dc3545'
                  }}>
                    {snapshot()!.confidenceLabel}
                  </span>
                </div>
              </div>

              {/* Why Now */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{
                  margin: '0 0 8px',
                  'font-size': '14px',
                  'font-weight': '600',
                  color: 'var(--text-primary)'
                }}>
                  Why Now
                </h3>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  'font-size': '13px',
                  'line-height': '1.5'
                }}>
                  {snapshot()!.whyNowExplanation}
                </p>
              </div>

              {/* Restart Context (if applicable) */}
              <Show when={snapshot() && (snapshot()!.pattern === 'RESTART_STORM' || snapshot()!.pattern === 'CRASHLOOP')}>
                <div style={{
                  background: 'var(--bg-card)',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{
                    margin: '0 0 12px',
                    'font-size': '14px',
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Restart Frequency
                  </h3>
                  <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 5 min</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last5Minutes}
                      </div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 1 hour</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last1Hour}
                      </div>
                    </div>
                    <div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>Last 24 hours</div>
                      <div style={{ 'font-size': '18px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {snapshot()!.restartCounts.last24Hours}
                      </div>
                    </div>
                  </div>
                </div>
              </Show>

              {/* Recommended First Action */}
              <Show when={snapshot()?.recommendedAction}>
                <div style={{
                  background: 'var(--accent-primary)10',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '20px',
                  border: '2px solid var(--accent-primary)'
                }}>
                  <h3 style={{
                    margin: '0 0 8px',
                    'font-size': '14px',
                    'font-weight': '600',
                    color: 'var(--text-primary)'
                  }}>
                    Recommended First Action
                  </h3>
                  <p style={{
                    margin: '0 0 12px',
                    color: 'var(--text-secondary)',
                    'font-size': '13px'
                  }}>
                    {snapshot()!.recommendedAction!.description}
                  </p>
                  <button
                    onClick={() => handleTabClick(snapshot()!.recommendedAction!.tab)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      'border-radius': '6px',
                      cursor: 'pointer',
                      'font-weight': '500',
                      'font-size': '13px'
                    }}
                  >
                    {snapshot()!.recommendedAction!.title}
                  </button>
                </div>
              </Show>

              {/* Evidence Tabs */}
              <div style={{
                background: 'var(--bg-card)',
                'border-radius': '8px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  'border-bottom': '1px solid var(--border-color)',
                  overflow: 'auto'
                }}>
                  <For each={[
                    { id: 'evidence', label: '📦 Evidence', icon: '📦' },
                    { id: 'logs', label: '📝 Logs', icon: '📝' },
                    { id: 'metrics', label: '📈 Metrics', icon: '📈' },
                    { id: 'changes', label: '🔄 Changes', icon: '🔄' },
                    { id: 'runbooks', label: '📋 Runbooks', icon: '📋' },
                    { id: 'similar', label: '🔗 Similar', icon: '🔗' },
                  ]}>
                    {(tab) => (
                      <button
                        onClick={() => handleTabClick(tab.id)}
                        style={{
                          padding: '12px 16px',
                          background: activeTab() === tab.id ? 'var(--bg-secondary)' : 'transparent',
                          border: 'none',
                          'border-bottom': activeTab() === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          color: activeTab() === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          'font-size': '13px',
                          'font-weight': activeTab() === tab.id ? '600' : '400',
                          'white-space': 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    )}
                  </For>
                </div>
                <div style={{ padding: '20px', 'min-height': '200px' }}>
                  <Show when={activeTab() === 'evidence' && loadedTabs().has('evidence')}>
                    <EvidencePanel incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'logs' && loadedTabs().has('logs')}>
                    <LogsTab incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'metrics' && loadedTabs().has('metrics')}>
                    <MetricsTab incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'changes' && loadedTabs().has('changes')}>
                    <ChangeTimeline incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'runbooks' && loadedTabs().has('runbooks')}>
                    <RunbookSelector incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() === 'similar' && loadedTabs().has('similar')}>
                    <SimilarIncidents incidentId={props.incident!.id} />
                  </Show>
                  <Show when={activeTab() && !loadedTabs().has(activeTab()!)}>
                    <div style={{
                      display: 'flex',
                      'justify-content': 'center',
                      'align-items': 'center',
                      padding: '40px',
                      color: 'var(--text-secondary)'
                    }}>
                      <div class="spinner" style={{ 'margin-right': '12px' }} />
                      Loading {activeTab()}...
                    </div>
                  </Show>
                  <Show when={!activeTab()}>
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-secondary)',
                      'font-size': '13px'
                    }}>
                      Select a tab to view evidence
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          {/* Sticky Footer */}
          <div style={{
            padding: '16px 24px',
            'border-top': '1px solid var(--border-color)',
            background: 'var(--bg-primary)',
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            gap: '12px',
            'z-index': 10,
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  if (!props.incident) return;
                  setFeedbackSubmitting('worked');
                  try {
                    await api.submitIncidentFeedback(props.incident.id, 'worked');
                    // Optionally show success notification or refresh learning status
                  } catch (err: any) {
                    console.error('Failed to submit feedback:', err);
                  } finally {
                    setFeedbackSubmitting(null);
                  }
                }}
                disabled={feedbackSubmitting() !== null}
                style={{
                  padding: '8px 12px',
                  background: feedbackSubmitting() === 'worked' ? 'var(--text-muted)' : '#22c55e',
                  border: '1px solid #22c55e',
                  'border-radius': '6px',
                  color: 'white',
                  cursor: feedbackSubmitting() === 'worked' ? 'not-allowed' : 'pointer',
                  'font-size': '12px',
                  opacity: feedbackSubmitting() === 'worked' ? 0.6 : 1
                }}
              >
                ✅ Worked
              </button>
              <button
                onClick={async () => {
                  if (!props.incident) return;
                  setFeedbackSubmitting('not_worked');
                  try {
                    await api.submitIncidentFeedback(props.incident.id, 'not_worked');
                  } catch (err: any) {
                    console.error('Failed to submit feedback:', err);
                  } finally {
                    setFeedbackSubmitting(null);
                  }
                }}
                disabled={feedbackSubmitting() !== null}
                style={{
                  padding: '8px 12px',
                  background: feedbackSubmitting() === 'not_worked' ? 'var(--text-muted)' : '#dc3545',
                  border: '1px solid #dc3545',
                  'border-radius': '6px',
                  color: 'white',
                  cursor: feedbackSubmitting() === 'not_worked' ? 'not-allowed' : 'pointer',
                  'font-size': '12px',
                  opacity: feedbackSubmitting() === 'not_worked' ? 0.6 : 1
                }}
              >
                ❌ Didn't Work
              </button>
              <button
                onClick={async () => {
                  if (!props.incident) return;
                  setFeedbackSubmitting('unknown');
                  try {
                    await api.submitIncidentFeedback(props.incident.id, 'unknown');
                  } catch (err: any) {
                    console.error('Failed to submit feedback:', err);
                  } finally {
                    setFeedbackSubmitting(null);
                  }
                }}
                disabled={feedbackSubmitting() !== null}
                style={{
                  padding: '8px 12px',
                  background: feedbackSubmitting() === 'unknown' ? 'var(--text-muted)' : 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  'border-radius': '6px',
                  color: 'var(--text-primary)',
                  cursor: feedbackSubmitting() === 'unknown' ? 'not-allowed' : 'pointer',
                  'font-size': '12px',
                  opacity: feedbackSubmitting() === 'unknown' ? 0.6 : 1
                }}
              >
                ⚠️ Incorrect Cause
              </button>
            </div>
            <button
              onClick={handleResolve}
              disabled={resolving()}
              style={{
                padding: '8px 16px',
                background: resolving() ? 'var(--bg-secondary)' : '#22c55e',
                color: 'white',
                border: 'none',
                'border-radius': '6px',
                cursor: resolving() ? 'not-allowed' : 'pointer',
                'font-weight': '500',
                'font-size': '13px',
                opacity: resolving() ? 0.6 : 1
              }}
            >
              {resolving() ? 'Resolving...' : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

// Logs Tab Component (lazy-loaded)
const LogsTab: Component<{ incidentId: string }> = (props) => {
  const [logs, setLogs] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentLogs(props.incidentId, 20);
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading() && !error()} fallback={
      <div style={{
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center',
        padding: '40px',
        color: 'var(--text-secondary)'
      }}>
        <Show when={loading()}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading logs...
        </Show>
        <Show when={error()}>
          <div style={{ color: '#dc3545' }}>Error: {error()}</div>
        </Show>
      </div>
    }>
      <div style={{ 'max-height': '400px', overflow: 'auto' }}>
        <Show when={logs().length === 0}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)',
            'font-size': '13px'
          }}>
            No logs available
          </div>
        </Show>
        <For each={logs()}>
          {(log) => (
            <div style={{
              padding: '8px 12px',
              'margin-bottom': '4px',
              background: 'var(--bg-secondary)',
              'border-radius': '4px',
              'font-family': 'monospace',
              'font-size': '12px',
              color: 'var(--text-primary)',
              'white-space': 'pre-wrap',
              'word-break': 'break-all'
            }}>
              <div style={{ 'margin-bottom': '4px', color: 'var(--text-secondary)', 'font-size': '11px' }}>
                {log.time ? new Date(log.time).toLocaleString() : ''}
              </div>
              <div>{log.value || log.message || log.content}</div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

// Metrics Tab Component (lazy-loaded)
const MetricsTab: Component<{ incidentId: string }> = (props) => {
  const [metrics, setMetrics] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentMetrics(props.incidentId);
      setMetrics(data.metrics || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  });

  return (
    <Show when={!loading() && !error()} fallback={
      <div style={{
        display: 'flex',
        'justify-content': 'center',
        'align-items': 'center',
        padding: '40px',
        color: 'var(--text-secondary)'
      }}>
        <Show when={loading()}>
          <div class="spinner" style={{ 'margin-right': '12px' }} />
          Loading metrics...
        </Show>
        <Show when={error()}>
          <div style={{ color: '#dc3545' }}>Error: {error()}</div>
        </Show>
      </div>
    }>
      <div>
        <Show when={metrics().length === 0}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)',
            'font-size': '13px'
          }}>
            No metrics available
          </div>
        </Show>
        <For each={metrics()}>
          {(metric) => (
            <div style={{
              padding: '12px',
              'margin-bottom': '8px',
              background: 'var(--bg-secondary)',
              'border-radius': '6px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                'font-weight': '600',
                color: 'var(--text-primary)',
                'margin-bottom': '4px'
              }}>
                {metric.type || 'Metric'}
              </div>
              <div style={{
                color: 'var(--text-secondary)',
                'font-size': '12px',
                'margin-bottom': '4px'
              }}>
                {metric.message || metric.value}
              </div>
              <div style={{
                color: 'var(--text-muted)',
                'font-size': '11px'
              }}>
                {metric.time ? new Date(metric.time).toLocaleString() : ''}
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

export default IncidentModalV2;
