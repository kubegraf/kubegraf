// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { Component, createSignal, For, Show } from 'solid-js';
import { fetchAPI } from '../../services/api';

interface TimelineEvent {
  timestamp: string;
  event: string;
  description: string;
  severity: string;
}

interface Finding {
  category: string;
  description: string;
  severity: string;
  suggestion?: string;
}

interface ContainerAnalysis {
  name: string;
  image: string;
  status: string;
  ready: boolean;
  restartCount: number;
  lastExitCode?: number;
  lastExitReason?: string;
  startedAt?: string;
  issues?: string[];
}

interface ResourcePressure {
  memoryPressure: boolean;
  cpuThrottled: boolean;
  summary: string;
}

interface RestartAnalysis {
  totalRestarts: number;
  recentRestarts: number;
  pattern: string;
  lastRestartTime?: string;
  commonExitCodes?: number[];
  recommendation?: string;
}

interface PodExplanation {
  summary: string;
  status: string;
  timeline: TimelineEvent[];
  keyFindings: Finding[];
  containers: ContainerAnalysis[];
  resourcePressure?: ResourcePressure;
  restartAnalysis?: RestartAnalysis;
  generatedAt: string;
}

interface ExplainPodPanelProps {
  namespace: string;
  podName: string;
  onClose?: () => void;
}

const ExplainPodPanel: Component<ExplainPodPanelProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [explanation, setExplanation] = createSignal<PodExplanation | null>(null);
  const [activeTab, setActiveTab] = createSignal<'summary' | 'timeline' | 'containers'>('summary');

  const explain = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI<PodExplanation>(
        `/api/explain/pod?namespace=${props.namespace}&pod=${props.podName}`
      );
      setExplanation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to explain pod');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      background: 'var(--bg-primary)',
      'border-radius': '12px',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
      'max-width': '800px',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '16px 20px',
        'border-bottom': '1px solid var(--border-color)',
        display: 'flex',
        'justify-content': 'space-between',
        'align-items': 'center',
      }}>
        <div>
          <h2 style={{ margin: 0, 'font-size': '16px', 'font-weight': '700', color: 'var(--text-primary)' }}>
            🧠 Explain Pod
          </h2>
          <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-top': '4px' }}>
            {props.namespace}/{props.podName}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={explain}
            disabled={loading()}
            style={{
              background: 'var(--accent-primary)',
              color: '#000',
              border: 'none',
              'border-radius': '6px',
              padding: '8px 16px',
              'font-weight': '600',
              cursor: loading() ? 'not-allowed' : 'pointer',
              opacity: loading() ? 0.5 : 1,
            }}
          >
            {loading() ? 'Analyzing...' : '🔍 Explain'}
          </button>
          <Show when={props.onClose}>
            <button
              onClick={props.onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                'border-radius': '6px',
                padding: '8px 12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </Show>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <Show when={error()}>
          <div style={{
            background: '#ef444420',
            border: '1px solid #ef4444',
            'border-radius': '8px',
            padding: '16px',
            color: '#ef4444',
            'margin-bottom': '16px',
          }}>
            {error()}
          </div>
        </Show>

        <Show when={!explanation() && !loading() && !error()}>
          <div style={{
            'text-align': 'center',
            padding: '40px',
            color: 'var(--text-muted)',
          }}>
            <div style={{ 'font-size': '48px', 'margin-bottom': '16px' }}>🧠</div>
            <div>Click "Explain" to analyze this pod</div>
            <div style={{ 'font-size': '12px', 'margin-top': '8px' }}>
              Get insights into pod lifecycle, restarts, and issues
            </div>
          </div>
        </Show>

        <Show when={explanation()}>
          {/* Status Banner */}
          <div style={{
            background: getStatusColor(explanation()!.status) + '15',
            border: `1px solid ${getStatusColor(explanation()!.status)}`,
            'border-radius': '8px',
            padding: '16px',
            'margin-bottom': '20px',
          }}>
            <div style={{
              display: 'flex',
              'align-items': 'center',
              gap: '12px',
            }}>
              <span style={{ 'font-size': '24px' }}>
                {getStatusIcon(explanation()!.status)}
              </span>
              <div>
                <div style={{
                  'font-size': '14px',
                  'font-weight': '700',
                  color: getStatusColor(explanation()!.status),
                  'text-transform': 'capitalize',
                }}>
                  📋 {explanation()!.status}
                </div>
                <div style={{
                  'font-size': '12px',
                  'font-weight': '600',
                  color: 'var(--text-secondary)',
                  'margin-top': '4px',
                }}>
                  {explanation()!.summary}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            'margin-bottom': '16px',
            'border-bottom': '1px solid var(--border-color)',
            'padding-bottom': '12px',
          }}>
            <button
              onClick={() => setActiveTab('summary')}
              style={{
                background: activeTab() === 'summary' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab() === 'summary' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                'border-radius': '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                'font-weight': '500',
              }}
            >
              Key Findings
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              style={{
                background: activeTab() === 'timeline' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab() === 'timeline' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                'border-radius': '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                'font-weight': '500',
              }}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              style={{
                background: activeTab() === 'containers' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab() === 'containers' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                'border-radius': '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                'font-weight': '500',
              }}
            >
              Containers
            </button>
          </div>

          {/* Tab Content */}
          <Show when={activeTab() === 'summary'}>
            {/* Key Findings */}
            <div style={{ 'margin-bottom': '20px' }}>
              <h4 style={{ margin: '0 0 12px', 'font-size': '13px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                🔍 Key Findings
              </h4>
              <For each={explanation()!.keyFindings}>
                {(finding) => (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    'border-radius': '6px',
                    padding: '12px',
                    'margin-bottom': '8px',
                    'border-left': `3px solid ${getSeverityColor(finding.severity)}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      'align-items': 'flex-start',
                    }}>
                      <span style={{
                        background: getSeverityColor(finding.severity) + '20',
                        color: getSeverityColor(finding.severity),
                        padding: '2px 6px',
                        'border-radius': '4px',
                        'font-size': '10px',
                        'text-transform': 'uppercase',
                      }}>
                        {finding.category}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ 'font-size': '12px', color: 'var(--text-primary)' }}>
                          {finding.description}
                        </div>
                        <Show when={finding.suggestion}>
                          <div style={{
                            'font-size': '11px',
                            color: 'var(--text-muted)',
                            'margin-top': '4px',
                          }}>
                            💡 {finding.suggestion}
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Restart Analysis */}
            <Show when={explanation()!.restartAnalysis}>
              <div style={{
                background: 'var(--bg-secondary)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
              }}>
                <h4 style={{ margin: '0 0 12px', 'font-size': '13px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                  🔄 Restart Analysis
                </h4>
                <div style={{
                  display: 'grid',
                  'grid-template-columns': 'repeat(3, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '12px',
                    'border-radius': '6px',
                    'text-align': 'center',
                  }}>
                    <div style={{ 'font-size': '20px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {explanation()!.restartAnalysis!.totalRestarts}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Total Restarts</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '12px',
                    'border-radius': '6px',
                    'text-align': 'center',
                  }}>
                    <div style={{ 'font-size': '20px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {explanation()!.restartAnalysis!.recentRestarts}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Last Hour</div>
                  </div>
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: '12px',
                    'border-radius': '6px',
                    'text-align': 'center',
                  }}>
                    <div style={{
                      'font-size': '14px',
                      'font-weight': '600',
                      color: explanation()!.restartAnalysis!.pattern === 'crashloop' ? '#ef4444' : 'var(--text-primary)',
                      'text-transform': 'capitalize',
                    }}>
                      {explanation()!.restartAnalysis!.pattern}
                    </div>
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>Pattern</div>
                  </div>
                </div>
                <Show when={explanation()!.restartAnalysis!.recommendation}>
                  <div style={{
                    'margin-top': '12px',
                    'font-size': '12px',
                    color: 'var(--text-secondary)',
                  }}>
                    💡 {explanation()!.restartAnalysis!.recommendation}
                  </div>
                </Show>
              </div>
            </Show>

            {/* Resource Pressure */}
            <Show when={explanation()!.resourcePressure}>
              <div style={{
                background: '#ef444420',
                border: '1px solid #ef4444',
                'border-radius': '8px',
                padding: '16px',
              }}>
                <h4 style={{ margin: '0 0 8px', 'font-size': '13px', 'font-weight': '700', color: '#ef4444' }}>
                  ⚠️ Resource Pressure Detected
                </h4>
                <div style={{ 'font-size': '12px', color: 'var(--text-primary)' }}>
                  {explanation()!.resourcePressure!.summary}
                </div>
              </div>
            </Show>
          </Show>

          <Show when={activeTab() === 'timeline'}>
            <div style={{
              'border-left': '2px solid var(--border-color)',
              'padding-left': '16px',
              'max-height': '400px',
              'overflow-y': 'auto',
            }}>
              <For each={explanation()!.timeline}>
                {(event) => (
                  <div style={{
                    position: 'relative',
                    'padding-bottom': '12px',
                    'margin-bottom': '8px',
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '-21px',
                      top: '4px',
                      width: '10px',
                      height: '10px',
                      'border-radius': '50%',
                      background: getSeverityColor(event.severity),
                      border: '2px solid var(--bg-primary)',
                    }} />
                    <div style={{
                      'font-size': '10px',
                      color: 'var(--text-muted)',
                      'margin-bottom': '4px',
                    }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                    <div style={{
                      'font-size': '12px',
                      'font-weight': '700',
                      color: 'var(--text-primary)',
                    }}>
                      {event.event}
                    </div>
                    <div style={{
                      'font-size': '11px',
                      color: 'var(--text-secondary)',
                      'margin-top': '2px',
                    }}>
                      {event.description}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={activeTab() === 'containers'}>
            <For each={explanation()!.containers}>
              {(container) => (
                <div style={{
                  background: 'var(--bg-secondary)',
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '12px',
                }}>
                  <div style={{
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '12px',
                  }}>
                    <div>
                      <div style={{ 'font-size': '14px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                        {container.name}
                      </div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-muted)' }}>
                        {container.image}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        background: container.ready ? '#22c55e20' : '#ef444420',
                        color: container.ready ? '#22c55e' : '#ef4444',
                        padding: '4px 8px',
                        'border-radius': '4px',
                        'font-size': '11px',
                      }}>
                        {container.ready ? 'Ready' : 'Not Ready'}
                      </span>
                      <span style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        padding: '4px 8px',
                        'border-radius': '4px',
                        'font-size': '11px',
                        'text-transform': 'capitalize',
                      }}>
                        {container.status}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(2, 1fr)',
                    gap: '8px',
                    'font-size': '12px',
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Restarts: </span>
                      <span style={{ color: container.restartCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                        {container.restartCount}
                      </span>
                    </div>
                    <Show when={container.lastExitCode !== undefined}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Last Exit: </span>
                        <span style={{ color: container.lastExitCode !== 0 ? '#ef4444' : 'var(--text-primary)' }}>
                          {container.lastExitCode} ({container.lastExitReason || 'Unknown'})
                        </span>
                      </div>
                    </Show>
                  </div>

                  <Show when={container.issues && container.issues.length > 0}>
                    <div style={{
                      'margin-top': '12px',
                      'border-top': '1px solid var(--border-color)',
                      'padding-top': '12px',
                    }}>
                      <For each={container.issues}>
                        {(issue) => (
                          <div style={{
                            'font-size': '11px',
                            color: '#f59e0b',
                            'margin-bottom': '4px',
                          }}>
                            ⚠️ {issue}
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default ExplainPodPanel;

