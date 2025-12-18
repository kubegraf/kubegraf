import { Component, For, Show, createSignal, createResource } from 'solid-js';

interface Runbook {
  id: string;
  name: string;
  description: string;
  pattern: string;
  risk: string;
  autonomyLevel: number;
  successRate: number;
  executionCount: number;
  enabled: boolean;
  tags?: string[];
}

interface RunbookSelectorProps {
  incidentId: string;
  onSelectRunbook?: (runbook: Runbook) => void;
  onPreviewFix?: (runbookId: string) => void;
}

const RunbookSelector: Component<RunbookSelectorProps> = (props) => {
  const [selectedRunbook, setSelectedRunbook] = createSignal<string | null>(null);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewResult, setPreviewResult] = createSignal<any>(null);

  const [runbooks] = createResource(
    () => props.incidentId,
    async (id) => {
      try {
        const response = await fetch(`/api/v2/incidents/${id}/runbooks`);
        if (!response.ok) return [];
        return await response.json() as Runbook[];
      } catch (e) {
        console.error('Failed to fetch runbooks:', e);
        return [];
      }
    }
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      case 'critical': return '#721c24';
      default: return 'var(--text-secondary)';
    }
  };

  const getAutonomyLabel = (level: number) => {
    switch (level) {
      case 0: return 'Observe';
      case 1: return 'Recommend';
      case 2: return 'Propose';
      case 3: return 'Auto-Execute';
      default: return 'Unknown';
    }
  };

  const handlePreview = async (runbook: Runbook) => {
    setSelectedRunbook(runbook.id);
    setPreviewLoading(true);
    setPreviewResult(null);

    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: runbook.id })
      });
      const result = await response.json();
      setPreviewResult(result);
      props.onPreviewFix?.(runbook.id);
    } catch (e) {
      console.error('Failed to preview fix:', e);
      setPreviewResult({ error: 'Failed to generate preview' });
    } finally {
      setPreviewLoading(false);
    }
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
          📋 Available Runbooks
        </h4>
        <Show when={runbooks()}>
          <span style={{ 
            'font-size': '11px', 
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '2px 8px',
            'border-radius': '4px'
          }}>
            {runbooks()?.length || 0} available
          </span>
        </Show>
      </div>

      {/* Runbooks List */}
      <div style={{ padding: '12px', 'max-height': '300px', 'overflow-y': 'auto' }}>
        <Show when={runbooks.loading}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            Loading runbooks...
          </div>
        </Show>

        <Show when={!runbooks.loading && (!runbooks() || runbooks()?.length === 0)}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            No runbooks available for this incident pattern
          </div>
        </Show>

        <Show when={!runbooks.loading && runbooks() && runbooks()!.length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
            <For each={runbooks()}>
              {(runbook) => (
                <div style={{
                  background: selectedRunbook() === runbook.id ? 'var(--accent-primary)10' : 'var(--bg-secondary)',
                  padding: '12px',
                  'border-radius': '6px',
                  border: selectedRunbook() === runbook.id 
                    ? '1px solid var(--accent-primary)' 
                    : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setSelectedRunbook(runbook.id);
                  props.onSelectRunbook?.(runbook);
                }}
                >
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '8px' }}>
                    <div>
                      <div style={{ 
                        'font-size': '13px', 
                        'font-weight': '600', 
                        color: 'var(--text-primary)',
                        'margin-bottom': '4px'
                      }}>
                        {runbook.name}
                      </div>
                      <div style={{ 'font-size': '11px', color: 'var(--text-secondary)' }}>
                        {runbook.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        'font-size': '10px',
                        padding: '2px 6px',
                        'border-radius': '3px',
                        background: getRiskColor(runbook.risk) + '20',
                        color: getRiskColor(runbook.risk),
                        'text-transform': 'uppercase',
                        'font-weight': '600'
                      }}>
                        {runbook.risk} risk
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    'margin-bottom': '8px',
                    'font-size': '11px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>✅ {Math.round(runbook.successRate * 100)}% success</span>
                    <span>🔄 {runbook.executionCount} runs</span>
                    <span>🤖 {getAutonomyLabel(runbook.autonomyLevel)}</span>
                  </div>

                  {/* Tags */}
                  <Show when={runbook.tags && runbook.tags.length > 0}>
                    <div style={{ display: 'flex', gap: '4px', 'flex-wrap': 'wrap', 'margin-bottom': '8px' }}>
                      <For each={runbook.tags}>
                        {(tag) => (
                          <span style={{
                            'font-size': '10px',
                            padding: '2px 6px',
                            'border-radius': '3px',
                            background: 'var(--bg-card)',
                            color: 'var(--text-muted)'
                          }}>
                            {tag}
                          </span>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', 'margin-top': '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(runbook);
                      }}
                      disabled={previewLoading() && selectedRunbook() === runbook.id}
                      style={{
                        padding: '6px 12px',
                        'font-size': '11px',
                        'border-radius': '4px',
                        border: '1px solid var(--accent-primary)',
                        background: 'transparent',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        'font-weight': '600',
                        opacity: previewLoading() && selectedRunbook() === runbook.id ? 0.6 : 1
                      }}
                    >
                      {previewLoading() && selectedRunbook() === runbook.id ? 'Loading...' : '👁️ Preview'}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Preview Result */}
      <Show when={previewResult()}>
        <div style={{ 
          padding: '12px', 
          'border-top': '1px solid var(--border-color)',
          background: 'var(--bg-secondary)'
        }}>
          <h5 style={{ margin: '0 0 8px', 'font-size': '12px', color: 'var(--text-primary)' }}>
            Fix Preview
          </h5>
          <Show when={previewResult()?.error}>
            <div style={{ color: 'var(--error-color)', 'font-size': '12px' }}>
              ❌ {previewResult()?.error}
            </div>
          </Show>
          <Show when={!previewResult()?.error}>
            <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '8px' }}>
              {previewResult()?.description}
            </div>
            <Show when={previewResult()?.dryRunCmd}>
              <div style={{ 
                background: 'var(--bg-code)', 
                padding: '8px', 
                'border-radius': '4px',
                'font-family': 'monospace',
                'font-size': '11px',
                color: 'var(--text-code)',
                'margin-bottom': '8px'
              }}>
                <div style={{ color: 'var(--text-muted)', 'margin-bottom': '4px' }}>Dry Run:</div>
                {previewResult()?.dryRunCmd}
              </div>
            </Show>
            <Show when={previewResult()?.applyCmd}>
              <div style={{ 
                background: 'var(--bg-code)', 
                padding: '8px', 
                'border-radius': '4px',
                'font-family': 'monospace',
                'font-size': '11px',
                color: 'var(--text-code)'
              }}>
                <div style={{ color: 'var(--text-muted)', 'margin-bottom': '4px' }}>Apply:</div>
                {previewResult()?.applyCmd}
              </div>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default RunbookSelector;

