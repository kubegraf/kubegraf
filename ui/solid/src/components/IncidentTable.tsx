import { Component, For, Show, createSignal } from 'solid-js';
import { Incident, FixApplyResponse } from '../services/api';
import ActionMenu from './ActionMenu';
import FixPreviewModal from './FixPreviewModal';

interface IncidentTableProps {
  incidents: Incident[];
  onViewPod?: (incident: Incident) => void;
  onViewLogs?: (incident: Incident) => void;
  onViewEvents?: (incident: Incident) => void;
  onViewDetails?: (incident: Incident) => void;
}

const IncidentTable: Component<IncidentTableProps> = (props) => {
  const [expandedRow, setExpandedRow] = createSignal<string | null>(null);
  const [fixModalOpen, setFixModalOpen] = createSignal(false);
  const [fixModalIncidentId, setFixModalIncidentId] = createSignal('');
  const [fixModalRecId, setFixModalRecId] = createSignal<string | undefined>(undefined);
  const [fixModalTitle, setFixModalTitle] = createSignal('');

  const openFixModal = (incidentId: string, recId?: string, title?: string) => {
    setFixModalIncidentId(incidentId);
    setFixModalRecId(recId);
    setFixModalTitle(title || 'Proposed Fix');
    setFixModalOpen(true);
  };

  const closeFixModal = () => {
    setFixModalOpen(false);
    setFixModalIncidentId('');
    setFixModalRecId(undefined);
    setFixModalTitle('');
  };

  const handleFixApplied = (result: FixApplyResponse) => {
    console.log('Fix applied:', result);
    // Could refresh incidents here
  };

  const getPatternIcon = (pattern: string): string => {
    const p = pattern?.toUpperCase() || '';
    switch (p) {
      case 'OOM_PRESSURE':
        return '💥';
      case 'CRASHLOOP':
        return '🔄';
      case 'RESTART_STORM':
        return '🌪️';
      case 'NO_READY_ENDPOINTS':
        return '🔌';
      case 'INTERNAL_ERRORS':
        return '🐛';
      case 'IMAGE_PULL_FAILURE':
        return '📦';
      case 'CONFIG_ERROR':
        return '⚙️';
      case 'DNS_FAILURE':
        return '🌐';
      case 'PERMISSION_DENIED':
        return '🔒';
      case 'APP_CRASH':
        return '💀';
      case 'TIMEOUTS':
        return '⏱️';
      case 'UPSTREAM_FAILURE':
        return '⬆️';
      default:
        return '⚠️';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'var(--error-color)';
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return 'var(--warning-color)';
      case 'low':
        return '#4dabf7';
      case 'info':
        return 'var(--text-secondary)';
      default:
        return 'var(--warning-color)';
    }
  };

  const getRiskColor = (risk: string): string => {
    switch (risk?.toLowerCase()) {
      case 'high':
        return 'var(--error-color)';
      case 'medium':
        return 'var(--warning-color)';
      case 'low':
        return '#51cf66';
      default:
        return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#51cf66';
    if (confidence >= 0.5) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get display values from v2 or fallback to v1 fields
  const getPattern = (inc: Incident) => inc.pattern || inc.type || 'unknown';
  const getResourceName = (inc: Incident) => inc.resource?.name || inc.resourceName || 'unknown';
  const getResourceKind = (inc: Incident) => inc.resource?.kind || inc.resourceKind || 'unknown';
  const getNamespace = (inc: Incident) => inc.resource?.namespace || inc.namespace || '-';
  const getOccurrences = (inc: Incident) => inc.occurrences || inc.count || 1;

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  return (
    <div class="w-full overflow-x-auto rounded border" style={{ background: 'var(--bg-card)', 'border-color': 'var(--border-color)' }}>
      <table class="w-full" style={{ 'border-collapse': 'collapse' }}>
        <thead>
          <tr style={{ 
            background: 'var(--bg-secondary)', 
            'border-bottom': '1px solid var(--border-color)',
            height: '40px'
          }}>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900', width: '30px' }}></th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Pattern</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Resource</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Severity</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Diagnosis</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Fixes</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Last Seen</th>
            <th style={{ padding: '8px 12px', 'text-align': 'left', color: 'var(--accent-primary)', 'font-weight': '900' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.incidents} fallback={
            <tr>
              <td colspan="8" style={{ padding: '24px', 'text-align': 'center', color: 'var(--text-muted)' }}>
                No incidents found
              </td>
            </tr>
          }>
            {(incident) => (
              <>
                <tr 
                  style={{ 
                    'border-bottom': expandedRow() === incident.id ? 'none' : '1px solid var(--border-color)',
                    height: '56px',
                    background: 'var(--bg-card)',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleRow(incident.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = expandedRow() === incident.id ? 'var(--bg-secondary)' : 'var(--bg-card)';
                  }}
                >
                  {/* Expand arrow */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      transform: expandedRow() === incident.id ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>▶</span>
                  </td>

                  {/* Pattern */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <span style={{ 'font-size': '18px' }}>{getPatternIcon(getPattern(incident))}</span>
                      <div>
                        <div style={{ 'font-weight': '600', 'font-size': '13px' }}>
                          {getPattern(incident).replace(/_/g, ' ')}
                        </div>
                        <div style={{ 'font-size': '11px', color: 'var(--text-secondary)' }}>
                          ×{getOccurrences(incident)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Resource */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                    <div>
                      <div style={{ 'font-weight': '600', 'font-size': '13px', 'max-width': '200px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
                        {getResourceName(incident)}
                      </div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)' }}>
                        {getResourceKind(incident)} · {getNamespace(incident)}
                      </div>
                    </div>
                  </td>

                  {/* Severity */}
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ 
                      padding: '4px 8px',
                      'border-radius': '4px',
                      'font-size': '11px',
                      'font-weight': '700',
                      background: getSeverityColor(incident.severity) + '20',
                      color: getSeverityColor(incident.severity),
                      'text-transform': 'uppercase'
                    }}>
                      {incident.severity}
                    </span>
                  </td>

                  {/* Diagnosis Summary */}
                  <td style={{ padding: '8px 12px', 'max-width': '250px' }}>
                    <Show when={incident.diagnosis} fallback={
                      <span style={{ color: 'var(--text-muted)', 'font-size': '12px', 'font-style': 'italic' }}>
                        {incident.description || incident.message || 'No diagnosis yet'}
                      </span>
                    }>
                      <div>
                        <div style={{ 
                          'font-size': '12px', 
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap',
                          'max-width': '230px'
                        }}>
                          {incident.diagnosis!.summary}
                        </div>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-top': '4px' }}>
                          <span style={{ 
                            'font-size': '10px', 
                            color: getConfidenceColor(incident.diagnosis!.confidence),
                            'font-weight': '600'
                          }}>
                            {formatConfidence(incident.diagnosis!.confidence)} confidence
                          </span>
                        </div>
                      </div>
                    </Show>
                  </td>

                  {/* Recommendations/Fixes */}
                  <td style={{ padding: '8px 12px' }}>
                    <Show when={incident.recommendations && incident.recommendations.length > 0} fallback={
                      <span style={{ color: 'var(--text-muted)', 'font-size': '12px' }}>-</span>
                    }>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '2px' }}>
                        <span style={{ 
                          'font-size': '12px', 
                          color: 'var(--accent-primary)',
                          'font-weight': '600'
                        }}>
                          {incident.recommendations!.length} fix{incident.recommendations!.length !== 1 ? 'es' : ''}
                        </span>
                        <span style={{ 
                          'font-size': '10px', 
                          color: getRiskColor(incident.recommendations![0].risk)
                        }}>
                          {incident.recommendations![0].risk} risk
                        </span>
                      </div>
                    </Show>
                  </td>

                  {/* Last Seen */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', 'font-size': '12px' }}>
                    {formatDate(incident.lastSeen)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                      actions={[
                        ...(props.onViewDetails ? [
                          { label: 'View Details', icon: 'info', onClick: () => props.onViewDetails?.(incident) }
                        ] : []),
                        ...((getResourceKind(incident) === 'Pod') && props.onViewPod ? [
                          { label: 'View Pod', icon: 'pod', onClick: () => props.onViewPod?.(incident) }
                        ] : []),
                        ...(props.onViewLogs ? [
                          { label: 'View Logs', icon: 'logs', onClick: () => props.onViewLogs?.(incident) }
                        ] : []),
                        ...(props.onViewEvents ? [
                          { label: 'View Events', icon: 'events', onClick: () => props.onViewEvents?.(incident) }
                        ] : []),
                      ]}
                    />
                  </td>
                </tr>

                {/* Expanded Details Row */}
                <Show when={expandedRow() === incident.id}>
                  <tr style={{ background: 'var(--bg-secondary)', 'border-bottom': '1px solid var(--border-color)' }}>
                    <td colspan="8" style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '24px' }}>
                        {/* Left Column - Diagnosis */}
                        <div>
                          <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '12px' }}>
                            🔍 Diagnosis
                          </h4>
                          <Show when={incident.diagnosis} fallback={
                            <p style={{ color: 'var(--text-muted)', 'font-size': '13px' }}>
                              {incident.description || incident.message || 'No diagnosis available'}
                            </p>
                          }>
                            <div style={{ 'margin-bottom': '12px' }}>
                              <p style={{ color: 'var(--text-primary)', 'font-size': '13px', 'line-height': '1.5' }}>
                                {incident.diagnosis!.summary}
                              </p>
                            </div>
                            <Show when={incident.diagnosis!.probableCauses?.length}>
                              <div style={{ 'margin-bottom': '12px' }}>
                                <h5 style={{ color: 'var(--text-secondary)', 'font-size': '11px', 'font-weight': '600', 'margin-bottom': '6px', 'text-transform': 'uppercase' }}>
                                  Probable Causes
                                </h5>
                                <ul style={{ margin: 0, 'padding-left': '16px' }}>
                                  <For each={incident.diagnosis!.probableCauses}>
                                    {(cause) => (
                                      <li style={{ color: 'var(--text-primary)', 'font-size': '12px', 'margin-bottom': '4px' }}>
                                        {cause}
                                      </li>
                                    )}
                                  </For>
                                </ul>
                              </div>
                            </Show>
                            <Show when={incident.diagnosis!.evidence?.length}>
                              <div>
                                <h5 style={{ color: 'var(--text-secondary)', 'font-size': '11px', 'font-weight': '600', 'margin-bottom': '6px', 'text-transform': 'uppercase' }}>
                                  Evidence
                                </h5>
                                <ul style={{ margin: 0, 'padding-left': '16px' }}>
                                  <For each={incident.diagnosis!.evidence.slice(0, 3)}>
                                    {(ev) => (
                                      <li style={{ color: 'var(--text-secondary)', 'font-size': '11px', 'margin-bottom': '2px' }}>
                                        {ev}
                                      </li>
                                    )}
                                  </For>
                                </ul>
                              </div>
                            </Show>
                          </Show>
                        </div>

                        {/* Right Column - Recommendations */}
                        <div>
                          <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '12px' }}>
                            💡 Recommendations
                          </h4>
                          <Show when={incident.recommendations && incident.recommendations.length > 0} fallback={
                            <p style={{ color: 'var(--text-muted)', 'font-size': '13px' }}>No recommendations available</p>
                          }>
                            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
                              <For each={incident.recommendations!.slice(0, 3)}>
                                {(rec) => (
                                  <div style={{ 
                                    background: 'var(--bg-card)', 
                                    padding: '12px', 
                                    'border-radius': '6px',
                                    border: '1px solid var(--border-color)'
                                  }}>
                                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '6px' }}>
                                      <span style={{ color: 'var(--text-primary)', 'font-size': '13px', 'font-weight': '600' }}>
                                        {rec.title}
                                      </span>
                                      <span style={{ 
                                        padding: '2px 6px',
                                        'border-radius': '3px',
                                        'font-size': '10px',
                                        'font-weight': '600',
                                        background: getRiskColor(rec.risk) + '20',
                                        color: getRiskColor(rec.risk),
                                        'text-transform': 'uppercase'
                                      }}>
                                        {rec.risk}
                                      </span>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', 'font-size': '12px', margin: 0 }}>
                                      {rec.explanation}
                                    </p>
                                    <Show when={rec.proposedFix || rec.action}>
                                      <div style={{ 'margin-top': '8px', display: 'flex', gap: '8px' }}>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openFixModal(incident.id, rec.id, rec.action?.label || rec.title);
                                          }}
                                          style={{
                                            padding: '6px 12px',
                                            'font-size': '11px',
                                            'border-radius': '4px',
                                            border: 'none',
                                            background: 'var(--accent-primary)',
                                            color: '#000',
                                            cursor: 'pointer',
                                            'font-weight': '600',
                                            display: 'flex',
                                            'align-items': 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          {rec.action?.type === 'RESTART' ? '🔄' : 
                                           rec.action?.type === 'SCALE' ? '📊' : 
                                           rec.action?.type === 'ROLLBACK' ? '⏪' : '🔧'}
                                          {rec.action?.label || 'Propose Fix'}
                                        </button>
                                      </div>
                                    </Show>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </div>

                      {/* Timeline */}
                      <Show when={incident.timeline && incident.timeline.length > 0}>
                        <div style={{ 'margin-top': '20px', 'border-top': '1px solid var(--border-color)', 'padding-top': '16px' }}>
                          <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '12px' }}>
                            📅 Timeline
                          </h4>
                          <div style={{ display: 'flex', gap: '16px', 'overflow-x': 'auto', 'padding-bottom': '8px' }}>
                            <For each={incident.timeline!.slice(0, 5)}>
                              {(entry) => (
                                <div style={{ 
                                  'min-width': '200px',
                                  background: 'var(--bg-card)',
                                  padding: '10px',
                                  'border-radius': '6px',
                                  border: '1px solid var(--border-color)'
                                }}>
                                  <div style={{ 'font-size': '10px', color: 'var(--text-muted)', 'margin-bottom': '4px' }}>
                                    {formatDate(entry.timestamp)}
                                  </div>
                                  <div style={{ 'font-size': '12px', color: 'var(--text-primary)', 'font-weight': '600' }}>
                                    {entry.title}
                                  </div>
                                  <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-top': '4px' }}>
                                    {entry.description}
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </td>
                  </tr>
                </Show>
              </>
            )}
          </For>
        </tbody>
      </table>

      {/* Fix Preview Modal */}
      <FixPreviewModal
        isOpen={fixModalOpen()}
        incidentId={fixModalIncidentId()}
        recommendationId={fixModalRecId()}
        recommendationTitle={fixModalTitle()}
        onClose={closeFixModal}
        onApplied={handleFixApplied}
      />
    </div>
  );
};

export default IncidentTable;
