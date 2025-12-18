import { Component, Show, createSignal, createEffect, For } from 'solid-js';
import { Incident } from '../../services/api';
import EvidencePanel from './EvidencePanel';
import CitationsPanel from './CitationsPanel';
import RunbookSelector from './RunbookSelector';
import SimilarIncidents from './SimilarIncidents';
import FeedbackButtons from './FeedbackButtons';
import ChangeTimeline from './ChangeTimeline';

interface IncidentDetailModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

const IncidentDetailModal: Component<IncidentDetailModalProps> = (props) => {
  const [activeSection, setActiveSection] = createSignal<string>('evidence');

  // Reset active section when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setActiveSection('evidence');
      console.log('IncidentDetailModal opened with incident:', props.incident?.id);
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#ff6b6b';
      case 'medium': case 'warning': return '#ffc107';
      case 'low': return '#28a745';
      default: return 'var(--text-secondary)';
    }
  };

  const sections = [
    { id: 'evidence', label: '📦 Evidence', icon: '📦' },
    { id: 'changes', label: '🔄 Changes', icon: '🔄' },
    { id: 'citations', label: '📚 Citations', icon: '📚' },
    { id: 'runbooks', label: '📋 Runbooks', icon: '📋' },
    { id: 'similar', label: '🔗 Similar', icon: '🔗' },
    { id: 'feedback', label: '💬 Feedback', icon: '💬' },
  ];

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen && props.incident}>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          'justify-content': 'center',
          'align-items': 'center',
          'z-index': 9999,
          padding: '20px'
        }}
        onClick={handleBackdropClick}
      >
        <div 
          style={{
            background: 'var(--bg-primary)',
            'border-radius': '12px',
            width: '100%',
            'max-width': '1200px',
            'max-height': '90vh',
            overflow: 'hidden',
            display: 'flex',
            'flex-direction': 'column',
            'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'flex-start',
            background: 'var(--bg-secondary)'
          }}>
            <div>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '8px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '18px' }}>
                  {props.incident!.title || `${props.incident!.pattern} Incident`}
                </h2>
                <span style={{
                  padding: '4px 10px',
                  'border-radius': '4px',
                  'font-size': '11px',
                  'font-weight': '600',
                  background: getSeverityColor(props.incident!.severity) + '20',
                  color: getSeverityColor(props.incident!.severity),
                  'text-transform': 'uppercase'
                }}>
                  {props.incident!.severity}
                </span>
                <span style={{
                  padding: '4px 10px',
                  'border-radius': '4px',
                  'font-size': '11px',
                  'font-weight': '600',
                  background: 'var(--accent-primary)20',
                  color: 'var(--accent-primary)'
                }}>
                  {props.incident!.pattern}
                </span>
              </div>
              <div style={{ 'font-size': '13px', color: 'var(--text-secondary)' }}>
                {props.incident!.resource?.namespace}/{props.incident!.resource?.kind}/{props.incident!.resource?.name}
              </div>
              <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-top': '4px' }}>
                ID: {props.incident!.id} • Occurrences: {props.incident!.occurrences || 1}
              </div>
            </div>
            <button
              onClick={props.onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                'font-size': '24px',
                cursor: 'pointer',
                padding: '4px',
                'line-height': 1
              }}
            >
              ×
            </button>
          </div>

          {/* Section Tabs */}
          <div style={{
            display: 'flex',
            'border-bottom': '1px solid var(--border-color)',
            background: 'var(--bg-card)'
          }}>
            <For each={sections}>
              {(section) => (
                <button
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    padding: '12px 20px',
                    background: activeSection() === section.id ? 'var(--bg-secondary)' : 'transparent',
                    border: 'none',
                    'border-bottom': activeSection() === section.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    color: activeSection() === section.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    'font-size': '13px',
                    'font-weight': '500',
                    display: 'flex',
                    'align-items': 'center',
                    gap: '6px'
                  }}
                >
                  {section.label}
                </button>
              )}
            </For>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '20px', 
            'overflow-y': 'auto', 
            'flex-grow': 1,
            background: 'var(--bg-primary)'
          }}>
            {/* Diagnosis Summary (Always Visible) */}
            <Show when={props.incident!.diagnosis}>
              <div style={{
                background: 'var(--bg-card)',
                padding: '16px',
                'border-radius': '8px',
                'margin-bottom': '20px',
                border: '1px solid var(--border-color)'
              }}>
                <h4 style={{ margin: '0 0 8px', color: 'var(--accent-primary)', 'font-size': '14px' }}>
                  🧠 Diagnosis
                </h4>
                <p style={{ margin: '0 0 12px', color: 'var(--text-primary)', 'font-size': '13px', 'line-height': '1.5' }}>
                  {props.incident!.diagnosis?.summary}
                </p>
                <Show when={props.incident!.diagnosis?.probableCauses && props.incident!.diagnosis!.probableCauses.length > 0}>
                  <div style={{ 'margin-bottom': '8px' }}>
                    <span style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'font-weight': '600' }}>
                      Probable Causes:
                    </span>
                    <ul style={{ margin: '4px 0 0', 'padding-left': '20px' }}>
                      <For each={props.incident!.diagnosis?.probableCauses}>
                        {(cause) => (
                          <li style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'margin-bottom': '2px' }}>
                            {cause}
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>
                </Show>
                <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                  Confidence: {Math.round((props.incident!.diagnosis?.confidence || 0) * 100)}%
                </div>
              </div>
            </Show>

            {/* Section Content */}
            <Show when={activeSection() === 'evidence'}>
              <EvidencePanel incidentId={props.incident!.id} />
            </Show>

            <Show when={activeSection() === 'changes'}>
              <ChangeTimeline incidentId={props.incident!.id} />
            </Show>

            <Show when={activeSection() === 'citations'}>
              <CitationsPanel incidentId={props.incident!.id} />
            </Show>

            <Show when={activeSection() === 'runbooks'}>
              <RunbookSelector incidentId={props.incident!.id} />
            </Show>

            <Show when={activeSection() === 'similar'}>
              <SimilarIncidents incidentId={props.incident!.id} />
            </Show>

            <Show when={activeSection() === 'feedback'}>
              <FeedbackButtons 
                incidentId={props.incident!.id} 
                onFeedbackSubmitted={(type) => console.log('Feedback submitted:', type)}
              />
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default IncidentDetailModal;
