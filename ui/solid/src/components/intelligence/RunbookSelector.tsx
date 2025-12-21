import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../../services/api';

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
  const [applyingFix, setApplyingFix] = createSignal(false);
  const [applyResult, setApplyResult] = createSignal<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = createSignal(false);

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
    console.log('[RunbookSelector] Previewing runbook:', runbook.id);
    setSelectedRunbook(runbook.id);
    setPreviewLoading(true);
    setPreviewResult(null);
    setApplyResult(null);

    try {
      // Use the correct endpoint: fix-preview (not fix/preview)
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runbookId: runbook.id })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RunbookSelector] Preview failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[RunbookSelector] Preview result:', result);
      setPreviewResult(result);
      props.onPreviewFix?.(runbook.id);
    } catch (e: any) {
      console.error('[RunbookSelector] Failed to preview fix:', e);
      setPreviewResult({ error: e.message || 'Failed to generate preview' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyFix = () => {
    console.log('[RunbookSelector] Apply Fix clicked');
    console.log('[RunbookSelector] Preview result:', previewResult());
    console.log('[RunbookSelector] Has error:', !!previewResult()?.error);

    if (!previewResult() || previewResult().error) {
      console.log('[RunbookSelector] Cannot apply - no preview or has error');
      alert('Please preview the fix first before applying.');
      return;
    }

    console.log('[RunbookSelector] Setting showConfirmDialog to true');
    setShowConfirmDialog(true);
    console.log('[RunbookSelector] showConfirmDialog is now:', showConfirmDialog());
  };

  const confirmAndApplyFix = async () => {
    if (!previewResult() || !previewResult().fixId) {
      alert('No preview available. Please preview the fix first.');
      return;
    }

    setShowConfirmDialog(false);
    setApplyingFix(true);
    setApplyResult(null);

    try {
      const fixId = previewResult().fixId;
      console.log('[RunbookSelector] Applying fix:', fixId);

      const result = await api.applyFix(props.incidentId, fixId, true);
      console.log('[RunbookSelector] Apply result:', result);
      setApplyResult(result);

      if (result && result.status === 'applied') {
        alert(`Fix applied successfully! ${result.message || ''}`);
      } else if (result && result.status === 'failed') {
        alert(`Fix application failed: ${result.message || result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[RunbookSelector] Apply error:', err);
      const errorMessage = err.message || 'Unknown error';
      setApplyResult({ status: 'failed', error: errorMessage });
      alert(`Failed to apply fix: ${errorMessage}`);
    } finally {
      setApplyingFix(false);
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
                        flex: 1,
                        padding: '6px 12px',
                        'font-size': '11px',
                        'border-radius': '4px',
                        border: '1px solid var(--accent-primary)',
                        background: selectedRunbook() === runbook.id && previewResult() && !previewResult().error ? 'var(--bg-secondary)' : 'transparent',
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        'font-weight': '600',
                        opacity: previewLoading() && selectedRunbook() === runbook.id ? 0.6 : 1
                      }}
                    >
                      {previewLoading() && selectedRunbook() === runbook.id ? '⏳ Loading...' : selectedRunbook() === runbook.id && previewResult() && !previewResult().error ? '✓ Previewed' : '👁️ Preview'}
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
          padding: '16px',
          'border-top': '1px solid var(--border-color)',
          background: 'var(--bg-secondary)'
        }}>
          <h5 style={{ margin: '0 0 12px', 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)' }}>
            Fix Preview
          </h5>
          <Show when={previewResult()?.error}>
            <div style={{
              color: 'var(--error-color)',
              'font-size': '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '12px',
              'border-radius': '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              ❌ {previewResult()?.error}
            </div>
          </Show>
          <Show when={!previewResult()?.error}>
            {/* Title and Description */}
            <div style={{ 'margin-bottom': '12px' }}>
              <div style={{ 'font-weight': '600', 'font-size': '12px', color: 'var(--text-primary)', 'margin-bottom': '4px' }}>
                {previewResult()?.title || 'Fix Details'}
              </div>
              <div style={{ 'font-size': '11px', color: 'var(--text-secondary)' }}>
                {previewResult()?.description}
              </div>
            </div>

            {/* Risk and Confidence */}
            <Show when={previewResult()?.risk || previewResult()?.confidence}>
              <div style={{ display: 'flex', gap: '8px', 'margin-bottom': '12px' }}>
                <Show when={previewResult()?.risk}>
                  <span style={{
                    'font-size': '10px',
                    padding: '3px 8px',
                    'border-radius': '4px',
                    background: getRiskColor(previewResult()!.risk) + '20',
                    color: getRiskColor(previewResult()!.risk),
                    'text-transform': 'uppercase',
                    'font-weight': '600'
                  }}>
                    {previewResult()?.risk} risk
                  </span>
                </Show>
                <Show when={previewResult()?.confidence}>
                  <span style={{
                    'font-size': '10px',
                    padding: '3px 8px',
                    'border-radius': '4px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    'font-weight': '600'
                  }}>
                    {Math.round((previewResult()!.confidence || 0) * 100)}% confidence
                  </span>
                </Show>
              </div>
            </Show>

            {/* Expected Change */}
            <Show when={previewResult()?.diff}>
              <div style={{ 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px', 'text-transform': 'uppercase', 'font-weight': '600' }}>
                  Expected change:
                </div>
                <div style={{
                  background: 'var(--bg-code, #1e1e2e)',
                  padding: '10px',
                  'border-radius': '4px',
                  'font-family': 'monospace',
                  'font-size': '11px',
                  color: 'var(--text-code, #cdd6f4)',
                  'line-height': '1.5'
                }}>
                  {previewResult()?.diff}
                </div>
              </div>
            </Show>

            {/* Commands */}
            <Show when={previewResult()?.kubectlCommands && previewResult()!.kubectlCommands.length > 0}>
              <div style={{ 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px', 'text-transform': 'uppercase', 'font-weight': '600' }}>
                  Commands:
                </div>
                <For each={previewResult()!.kubectlCommands}>
                  {(cmd) => (
                    <div style={{
                      background: 'var(--bg-code, #1e1e2e)',
                      padding: '8px',
                      'border-radius': '4px',
                      'font-family': 'monospace',
                      'font-size': '11px',
                      color: 'var(--text-code, #cdd6f4)',
                      'margin-bottom': '6px'
                    }}>
                      {cmd}
                    </div>
                  )}
                </For>
              </div>
            </Show>

            {/* Dry Run Result */}
            <Show when={previewResult()?.dryRunOutput}>
              <div style={{ 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px', 'text-transform': 'uppercase', 'font-weight': '600' }}>
                  ✓ Dry-run result:
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '10px',
                  'border-radius': '4px',
                  'font-size': '11px',
                  color: '#22c55e',
                  'line-height': '1.5'
                }}>
                  {previewResult()?.dryRunOutput}
                </div>
              </div>
            </Show>

            <Show when={previewResult()?.dryRunError}>
              <div style={{ 'margin-bottom': '12px' }}>
                <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'margin-bottom': '6px', 'text-transform': 'uppercase', 'font-weight': '600' }}>
                  ⚠️ Dry-run error:
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px',
                  'border-radius': '4px',
                  'font-size': '11px',
                  color: '#dc3545',
                  'line-height': '1.5'
                }}>
                  {previewResult()?.dryRunError}
                </div>
              </div>
            </Show>

            {/* Apply Button */}
            <div style={{ display: 'flex', gap: '8px', 'margin-top': '16px' }}>
              <button
                onClick={handleApplyFix}
                disabled={applyingFix() || !!previewResult()?.dryRunError}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  'font-size': '12px',
                  'border-radius': '6px',
                  border: 'none',
                  background: applyingFix() || previewResult()?.dryRunError ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: applyingFix() || previewResult()?.dryRunError ? 'var(--text-secondary)' : '#fff',
                  cursor: applyingFix() || previewResult()?.dryRunError ? 'not-allowed' : 'pointer',
                  'font-weight': '600',
                  opacity: applyingFix() || previewResult()?.dryRunError ? 0.6 : 1
                }}
              >
                {applyingFix() ? '⏳ Applying...' : '✅ Apply Fix'}
              </button>
            </div>
          </Show>
        </div>
      </Show>

      {/* Apply Result */}
      <Show when={applyResult()}>
        <div style={{
          padding: '16px',
          'border-top': '1px solid var(--border-color)',
          background: applyResult()?.status === 'applied'
            ? 'rgba(34, 197, 94, 0.1)'
            : 'rgba(239, 68, 68, 0.1)',
          border: applyResult()?.status === 'applied'
            ? '1px solid rgba(34, 197, 94, 0.3)'
            : '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{
            'font-weight': '600',
            'font-size': '13px',
            color: applyResult()?.status === 'applied' ? '#22c55e' : '#dc3545',
            'margin-bottom': '8px'
          }}>
            {applyResult()?.status === 'applied' ? '✅ Fix Applied Successfully' : '❌ Fix Application Failed'}
          </div>
          <Show when={applyResult()?.message}>
            <div style={{ 'font-size': '12px', color: 'var(--text-primary)', 'margin-bottom': '8px' }}>
              {applyResult()?.message}
            </div>
          </Show>
          <Show when={applyResult()?.executionId}>
            <div style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'font-family': 'monospace' }}>
              Execution ID: {applyResult()?.executionId}
            </div>
          </Show>
          <Show when={applyResult()?.error}>
            <div style={{ 'font-size': '12px', color: '#dc3545' }}>
              Error: {applyResult()?.error}
            </div>
          </Show>
        </div>
      </Show>

      {/* Confirmation Dialog */}
      <Show when={showConfirmDialog()}>
        {(() => {
          console.log('[RunbookSelector] Rendering confirmation dialog - showConfirmDialog:', showConfirmDialog());
          return null;
        })()}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 10000
        }} onClick={() => setShowConfirmDialog(false)}>
          <div style={{
            background: 'var(--bg-card)',
            'border-radius': '12px',
            padding: '24px',
            'max-width': '500px',
            width: '90%',
            border: '1px solid var(--border-color)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', 'font-size': '16px', 'font-weight': '700', color: 'var(--text-primary)' }}>
              Confirm Fix Application
            </h3>
            <p style={{ margin: '0 0 20px', 'font-size': '14px', color: 'var(--text-secondary)' }}>
              This will modify your cluster resources. Are you sure you want to apply this fix?
            </p>
            <div style={{ display: 'flex', gap: '12px', 'justify-content': 'flex-end' }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  padding: '8px 16px',
                  'border-radius': '6px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  'font-size': '13px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAndApplyFix}
                style={{
                  padding: '8px 16px',
                  'border-radius': '6px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  'font-weight': '600',
                  cursor: 'pointer',
                  'font-size': '13px'
                }}
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default RunbookSelector;

