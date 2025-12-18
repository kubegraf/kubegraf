import { Component, createSignal, createEffect, Show } from 'solid-js';
import { api, FixPreviewResponse, FixApplyResponse } from '../services/api';

interface FixPreviewModalProps {
  isOpen: boolean;
  incidentId: string;
  recommendationId?: string;
  recommendationTitle: string;
  onClose: () => void;
  onApplied?: (result: FixApplyResponse) => void;
}

const FixPreviewModal: Component<FixPreviewModalProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [preview, setPreview] = createSignal<FixPreviewResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [applyResult, setApplyResult] = createSignal<FixApplyResponse | null>(null);
  const [applying, setApplying] = createSignal(false);

  // Fetch preview when modal opens
  const fetchPreview = async () => {
    if (!props.incidentId) return;
    
    setLoading(true);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    try {
      console.log('Fetching fix preview for incident:', props.incidentId);
      const result = await api.previewIncidentFix(props.incidentId, props.recommendationId);
      console.log('Fix preview result:', result);
      setPreview(result);
    } catch (err: any) {
      console.error('Fix preview error:', err);
      setError(err.message || 'Failed to load fix preview');
    } finally {
      setLoading(false);
    }
  };

  // Use createEffect to properly react to modal opening
  createEffect(() => {
    if (props.isOpen && props.incidentId) {
      // Reset state and fetch preview when modal opens
      setPreview(null);
      setError(null);
      setApplyResult(null);
      fetchPreview();
    }
  });

  const handleDryRun = async () => {
    setApplying(true);
    setApplyResult(null);
    try {
      const result = await api.dryRunIncidentFix(props.incidentId, props.recommendationId);
      setApplyResult(result);
    } catch (err: any) {
      setApplyResult({
        success: false,
        message: '',
        dryRun: true,
        error: err.message || 'Dry run failed',
        appliedAt: new Date().toISOString(),
      });
    } finally {
      setApplying(false);
    }
  };

  const handleApply = async () => {
    if (!confirm('Are you sure you want to apply this fix? This will modify your cluster.')) {
      return;
    }
    
    setApplying(true);
    setApplyResult(null);
    try {
      const result = await api.applyIncidentFix(props.incidentId, props.recommendationId);
      setApplyResult(result);
      if (result.success && props.onApplied) {
        props.onApplied(result);
      }
    } catch (err: any) {
      setApplyResult({
        success: false,
        message: '',
        dryRun: false,
        error: err.message || 'Apply failed',
        appliedAt: new Date().toISOString(),
      });
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setError(null);
    setApplyResult(null);
    props.onClose();
  };

  if (!props.isOpen) return null;

  return (
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
      'z-index': 1000,
    }} onClick={handleClose}>
      <div style={{
        background: 'var(--bg-card)',
        'border-radius': '12px',
        border: '1px solid var(--border-color)',
        'max-width': '800px',
        width: '90%',
        'max-height': '80vh',
        overflow: 'hidden',
        display: 'flex',
        'flex-direction': 'column',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          'border-bottom': '1px solid var(--border-color)',
          display: 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '16px', 'font-weight': '700' }}>
              🔧 Fix Preview
            </h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              {props.recommendationTitle}
            </p>
          </div>
          <button onClick={handleClose} style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            'font-size': '20px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
          <Show when={loading()}>
            <div style={{ 'text-align': 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              Loading preview...
            </div>
          </Show>

          <Show when={error()}>
            <div style={{
              background: 'var(--error-color)15',
              border: '1px solid var(--error-color)',
              'border-radius': '8px',
              padding: '16px',
              color: 'var(--error-color)',
            }}>
              <strong>Error:</strong> {error()}
            </div>
          </Show>

          <Show when={preview()}>
            {/* Validation Status */}
            <Show when={!preview()!.valid}>
              <div style={{
                background: 'var(--error-color)15',
                border: '1px solid var(--error-color)',
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '16px',
                color: 'var(--error-color)',
              }}>
                <strong>⚠️ Validation Failed:</strong> {preview()!.validationError}
              </div>
            </Show>

            {/* Description */}
            <div style={{ 'margin-bottom': '20px' }}>
              <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                Description
              </h4>
              <p style={{ color: 'var(--text-primary)', 'font-size': '14px', margin: 0 }}>
                {preview()!.description}
              </p>
            </div>

            {/* Target Resource */}
            <div style={{ 'margin-bottom': '20px' }}>
              <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                Target Resource
              </h4>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '12px',
                'border-radius': '6px',
                'font-family': 'monospace',
                'font-size': '13px',
                color: 'var(--text-primary)',
              }}>
                {preview()!.targetResource.kind}/{preview()!.targetResource.name} (ns: {preview()!.targetResource.namespace})
              </div>
            </div>

            {/* Diff */}
            <Show when={preview()!.diff}>
              <div style={{ 'margin-bottom': '20px' }}>
                <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                  Changes (Diff)
                </h4>
                <pre style={{
                  background: '#1e1e2e',
                  padding: '16px',
                  'border-radius': '6px',
                  'font-family': 'monospace',
                  'font-size': '12px',
                  color: '#cdd6f4',
                  overflow: 'auto',
                  margin: 0,
                  'white-space': 'pre-wrap',
                  'word-break': 'break-word',
                }}>
                  {preview()!.diff.split('\n').map((line, i) => (
                    <div style={{
                      color: line.startsWith('+') ? '#a6e3a1' :
                             line.startsWith('-') ? '#f38ba8' :
                             line.startsWith('@') ? '#89b4fa' : '#cdd6f4'
                    }}>{line}</div>
                  ))}
                </pre>
              </div>
            </Show>

            {/* Commands */}
            <div style={{ 'margin-bottom': '20px' }}>
              <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                Commands
              </h4>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                <div>
                  <label style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'text-transform': 'uppercase' }}>
                    Dry Run
                  </label>
                  <pre style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px',
                    'border-radius': '4px',
                    'font-family': 'monospace',
                    'font-size': '12px',
                    color: 'var(--text-primary)',
                    margin: '4px 0 0',
                    overflow: 'auto',
                  }}>
                    {preview()!.dryRunCmd}
                  </pre>
                </div>
                <div>
                  <label style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'text-transform': 'uppercase' }}>
                    Apply
                  </label>
                  <pre style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px',
                    'border-radius': '4px',
                    'font-family': 'monospace',
                    'font-size': '12px',
                    color: 'var(--text-primary)',
                    margin: '4px 0 0',
                    overflow: 'auto',
                  }}>
                    {preview()!.applyCmd}
                  </pre>
                </div>
              </div>
            </div>

            {/* Risks */}
            <Show when={preview()!.risks && preview()!.risks.length > 0}>
              <div style={{ 'margin-bottom': '20px' }}>
                <h4 style={{ color: 'var(--warning-color)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                  ⚠️ Risks
                </h4>
                <ul style={{ margin: 0, 'padding-left': '20px' }}>
                  {preview()!.risks.map((risk) => (
                    <li style={{ color: 'var(--warning-color)', 'font-size': '13px', 'margin-bottom': '4px' }}>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </Show>

            {/* Apply Result */}
            <Show when={applyResult()}>
              <div style={{
                background: applyResult()!.success ? 'var(--success-color, #51cf66)15' : 'var(--error-color)15',
                border: `1px solid ${applyResult()!.success ? 'var(--success-color, #51cf66)' : 'var(--error-color)'}`,
                'border-radius': '8px',
                padding: '16px',
                'margin-bottom': '20px',
              }}>
                <div style={{ 
                  color: applyResult()!.success ? 'var(--success-color, #51cf66)' : 'var(--error-color)',
                  'font-weight': '600',
                  'margin-bottom': '8px',
                }}>
                  {applyResult()!.dryRun ? '🧪 Dry Run' : '✅ Applied'} {applyResult()!.success ? 'Successful' : 'Failed'}
                </div>
                <Show when={applyResult()!.message}>
                  <p style={{ margin: '0 0 8px', color: 'var(--text-primary)', 'font-size': '13px' }}>
                    {applyResult()!.message}
                  </p>
                </Show>
                <Show when={applyResult()!.error}>
                  <p style={{ margin: '0 0 8px', color: 'var(--error-color)', 'font-size': '13px' }}>
                    Error: {applyResult()!.error}
                  </p>
                </Show>
                <Show when={applyResult()!.changes && applyResult()!.changes!.length > 0}>
                  <div>
                    <strong style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>Changes:</strong>
                    <ul style={{ margin: '4px 0 0', 'padding-left': '20px' }}>
                      {applyResult()!.changes!.map((change) => (
                        <li style={{ 'font-size': '12px', color: 'var(--text-primary)' }}>{change}</li>
                      ))}
                    </ul>
                  </div>
                </Show>
                <Show when={applyResult()!.rollbackCmd}>
                  <div style={{ 'margin-top': '12px' }}>
                    <label style={{ 'font-size': '11px', color: 'var(--text-secondary)', 'text-transform': 'uppercase' }}>
                      Rollback Command
                    </label>
                    <pre style={{
                      background: 'var(--bg-secondary)',
                      padding: '8px',
                      'border-radius': '4px',
                      'font-family': 'monospace',
                      'font-size': '11px',
                      color: 'var(--text-primary)',
                      margin: '4px 0 0',
                    }}>
                      {applyResult()!.rollbackCmd}
                    </pre>
                  </div>
                </Show>
              </div>
            </Show>
          </Show>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          'border-top': '1px solid var(--border-color)',
          display: 'flex',
          'justify-content': 'flex-end',
          gap: '12px',
        }}>
          <button onClick={handleClose} style={{
            padding: '8px 16px',
            'border-radius': '6px',
            border: '1px solid var(--border-color)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            'font-size': '13px',
          }}>
            Close
          </button>
          <Show when={preview()?.valid}>
            <button onClick={handleDryRun} disabled={applying()} style={{
              padding: '8px 16px',
              'border-radius': '6px',
              border: '1px solid var(--accent-primary)',
              background: 'transparent',
              color: 'var(--accent-primary)',
              cursor: applying() ? 'not-allowed' : 'pointer',
              'font-size': '13px',
              opacity: applying() ? 0.6 : 1,
            }}>
              {applying() ? 'Running...' : '🧪 Dry Run'}
            </button>
            <button onClick={handleApply} disabled={applying()} style={{
              padding: '8px 16px',
              'border-radius': '6px',
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#000',
              cursor: applying() ? 'not-allowed' : 'pointer',
              'font-size': '13px',
              'font-weight': '600',
              opacity: applying() ? 0.6 : 1,
            }}>
              {applying() ? 'Applying...' : '⚡ Apply Fix'}
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default FixPreviewModal;

