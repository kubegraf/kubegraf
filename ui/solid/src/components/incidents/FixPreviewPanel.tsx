// Copyright 2025 KubeGraf Contributors
// Fix Preview Panel - Shows kubectl dry-run diff output

import { Component, Show, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';
import { capabilities } from '../../stores/capabilities';

interface FixPreviewPanelProps {
  incidentId: string;
  fixId: string | null;
  onClose: () => void;
  onApply?: () => void;
}

const FixPreviewPanel: Component<FixPreviewPanelProps> = (props) => {
  const [preview, setPreview] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [applying, setApplying] = createSignal(false);
  const [confirmed, setConfirmed] = createSignal(false);

  // Load preview when fixId changes
  createEffect(async () => {
    if (!props.fixId || !props.incidentId) {
      setPreview(null);
      return;
    }

    setLoading(true);
    setError(null);
    setConfirmed(false);

    try {
      // Fetch runbook details to get preview info
      const runbooksData = await api.getIncidentRunbooks(props.incidentId);
      const runbook = runbooksData.runbooks?.find((rb: any) => rb.id === props.fixId);

      if (runbook) {
        setPreview({
          id: runbook.id,
          title: runbook.name,
          description: runbook.description,
          dryRunCommand: runbook.action?.dryRunCommand || '',
          applyCommand: runbook.action?.applyCommand || '',
          previewDiff: runbook.action?.previewDiff || 'Preview diff not available',
        });
      } else {
        setError('Fix not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  });

  const handleApply = async () => {
    if (!confirmed()) {
      setConfirmed(true);
      return;
    }

    if (!props.fixId || !props.incidentId) {
      setError('Missing fix ID or incident ID');
      return;
    }

    setApplying(true);
    setError(null);
    try {
      // Get resource info from preview if available
      const resourceInfo = preview() ? {
        resourceNamespace: (preview() as any).targetResource?.namespace,
        resourceKind: (preview() as any).targetResource?.kind,
        resourceName: (preview() as any).targetResource?.name,
      } : undefined;

      // Use the runbook ID as fixId - the API expects the runbook ID
      const result = await api.applyFix(props.incidentId, props.fixId, true, resourceInfo);
      
      if (result.status === 'success' || result.executionId) {
        // Success - close panel and notify parent
        if (props.onApply) {
          props.onApply();
        }
        props.onClose();
      } else {
        setError(result.message || 'Failed to apply fix');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply fix');
    } finally {
      setApplying(false);
    }
  };

  if (!props.fixId) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          props.onClose();
        }
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          'border-radius': '8px',
          width: '100%',
          'max-width': '800px',
          'max-height': '90vh',
          display: 'flex',
          'flex-direction': 'column',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
          }}
        >
          <h3 style={{ 'font-size': '18px', 'font-weight': '600', 'margin': 0, color: 'var(--text-primary)' }}>
            Fix Preview
          </h3>
          <button
            onClick={props.onClose}
            style={{
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              'font-size': '20px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          <Show when={loading()}>
            <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              Loading preview...
            </div>
          </Show>

          <Show when={error()}>
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
              {error()}
            </div>
          </Show>

          <Show when={preview() && !loading() && !error()}>
            {(prev) => (
              <>
                <div style={{ 'margin-bottom': '20px' }}>
                  <h4 style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
                    {prev().title}
                  </h4>
                  <p style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'margin': 0 }}>
                    {prev().description}
                  </p>
                </div>

                {/* Dry-run command */}
                <div style={{ 'margin-bottom': '20px' }}>
                  <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
                    Dry-run Command
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      'border-radius': '6px',
                      'font-family': 'monospace',
                      'font-size': '12px',
                      color: 'var(--text-primary)',
                      'white-space': 'pre-wrap',
                      'word-break': 'break-all',
                    }}
                  >
                    {prev().dryRunCommand || 'No dry-run command available'}
                  </div>
                </div>

                {/* Preview Diff */}
                <div style={{ 'margin-bottom': '20px' }}>
                  <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
                    Preview Diff
                  </div>
                  <div
                    style={{
                      padding: '12px',
                      background: '#1e1e1e',
                      'border-radius': '6px',
                      'font-family': 'monospace',
                      'font-size': '12px',
                      color: '#d4d4d4',
                      'white-space': 'pre-wrap',
                      'word-break': 'break-word',
                      'max-height': '400px',
                      overflow: 'auto',
                    }}
                  >
                    {prev().previewDiff}
                  </div>
                </div>

                {/* Confirmation checkbox */}
                <div style={{ 'margin-bottom': '20px' }}>
                  <label
                    style={{
                      display: 'flex',
                      'align-items': 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      'font-size': '13px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmed()}
                      onChange={(e) => setConfirmed(e.currentTarget.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                    <span>I understand this fix will modify Kubernetes resources</span>
                  </label>
                </div>
              </>
            )}
          </Show>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={props.onClose}
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
            Cancel
          </button>
          <Show when={preview()}>
            <Show when={capabilities.isFixApplicationEnabled()}>
              <button
                onClick={handleApply}
                disabled={!confirmed() || applying()}
                style={{
                  padding: '10px 20px',
                  'border-radius': '6px',
                  border: 'none',
                  background: confirmed() && !applying() ? 'var(--accent-primary)' : 'var(--text-muted)',
                  color: 'white',
                  'font-size': '13px',
                  'font-weight': '500',
                  cursor: confirmed() && !applying() ? 'pointer' : 'not-allowed',
                  opacity: confirmed() && !applying() ? 1 : 0.6,
                }}
              >
                {applying() ? 'Applying...' : 'Apply Fix'}
              </button>
            </Show>
            <Show when={!capabilities.isFixApplicationEnabled()}>
              <div style={{ padding: '10px 20px', color: 'var(--text-secondary)', 'font-size': '13px' }}>
                Fix application is disabled in this release. Only dry-run preview is available.
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default FixPreviewPanel;

