import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../../services/api';

interface EvidenceItem {
  id: string;
  source: string;
  type: string;
  timestamp: string;
  content: string;
  summary: string;
  severity?: string;
  relevance: number;
}

interface EvidencePack {
  incidentId: string;
  events: EvidenceItem[];
  logs: EvidenceItem[];
  statusFacts: EvidenceItem[];
  metricsFacts: EvidenceItem[];
  changeHistory: EvidenceItem[];
  probeResults: EvidenceItem[];
  generatedAt: string;
  confidence: number;
}

interface EvidencePanelProps {
  incidentId: string;
}

const EvidencePanel: Component<EvidencePanelProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<string>('events');

  const [evidencePack] = createResource(
    () => props.incidentId,
    async (id) => {
      try {
        const response = await fetch(`/api/v2/incidents/${id}/evidence`);
        if (!response.ok) return null;
        return await response.json() as EvidencePack;
      } catch (e) {
        console.error('Failed to fetch evidence:', e);
        return null;
      }
    }
  );

  const tabs = [
    { id: 'events', label: 'Events', icon: '📢' },
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'changes', label: 'Changes', icon: '🔄' },
    { id: 'probes', label: 'Probes', icon: '🏥' },
  ];

  const getTabData = (tabId: string): EvidenceItem[] => {
    const pack = evidencePack();
    if (!pack) return [];
    switch (tabId) {
      case 'events': return pack.events || [];
      case 'logs': return pack.logs || [];
      case 'status': return pack.statusFacts || [];
      case 'metrics': return pack.metricsFacts || [];
      case 'changes': return pack.changeHistory || [];
      case 'probes': return pack.probeResults || [];
      default: return [];
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'error': return '#ff6b6b';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return 'var(--text-secondary)';
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <div style={{ background: 'var(--bg-card)', 'border-radius': '8px', border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        'border-bottom': '1px solid var(--border-color)',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center'
      }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '14px', 'font-weight': '600' }}>
          📦 Evidence Pack
        </h4>
        <Show when={evidencePack()}>
          <span style={{ 
            'font-size': '11px', 
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '2px 8px',
            'border-radius': '4px'
          }}>
            Confidence: {Math.round((evidencePack()?.confidence || 0) * 100)}%
          </span>
        </Show>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        'border-bottom': '1px solid var(--border-color)',
        'overflow-x': 'auto'
      }}>
        <For each={tabs}>
          {(tab) => {
            const count = () => getTabData(tab.id).length;
            return (
              <button
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px',
                  background: activeTab() === tab.id ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  'border-bottom': activeTab() === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab() === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  'font-size': '12px',
                  'font-weight': '500',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '6px',
                  'white-space': 'nowrap'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <Show when={count() > 0}>
                  <span style={{
                    background: 'var(--accent-primary)',
                    color: '#000',
                    padding: '1px 6px',
                    'border-radius': '10px',
                    'font-size': '10px',
                    'font-weight': '600'
                  }}>
                    {count()}
                  </span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>

      {/* Content */}
      <div style={{ padding: '12px', 'max-height': '300px', 'overflow-y': 'auto' }}>
        <Show when={evidencePack.loading}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            Loading evidence...
          </div>
        </Show>

        <Show when={!evidencePack.loading && getTabData(activeTab()).length === 0}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            No {activeTab()} evidence found
          </div>
        </Show>

        <Show when={!evidencePack.loading && getTabData(activeTab()).length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={getTabData(activeTab())}>
              {(item) => (
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '10px 12px',
                  'border-radius': '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '6px' }}>
                    <span style={{ 
                      'font-size': '12px', 
                      'font-weight': '600', 
                      color: 'var(--text-primary)' 
                    }}>
                      {item.summary}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
                      <Show when={item.severity}>
                        <span style={{
                          'font-size': '10px',
                          padding: '2px 6px',
                          'border-radius': '3px',
                          background: getSeverityColor(item.severity) + '20',
                          color: getSeverityColor(item.severity),
                          'text-transform': 'uppercase',
                          'font-weight': '600'
                        }}>
                          {item.severity}
                        </span>
                      </Show>
                      <span style={{
                        'font-size': '10px',
                        color: 'var(--text-muted)'
                      }}>
                        {Math.round(item.relevance * 100)}% relevant
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    'font-size': '11px', 
                    color: 'var(--text-secondary)',
                    'font-family': 'monospace',
                    'white-space': 'pre-wrap',
                    'word-break': 'break-all',
                    'max-height': '60px',
                    overflow: 'hidden'
                  }}>
                    {item.content}
                  </div>
                  <div style={{ 
                    'font-size': '10px', 
                    color: 'var(--text-muted)',
                    'margin-top': '6px'
                  }}>
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default EvidencePanel;

