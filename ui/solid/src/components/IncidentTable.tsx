import { Component, For, Show, createSignal } from 'solid-js';
import { Incident, FixApplyResponse } from '../services/api';
import ActionMenu from './ActionMenu';

interface IncidentTableProps {
  incidents: Incident[];
  isLoading?: boolean;
  onViewPod?: (incident: Incident) => void;
  onViewLogs?: (incident: Incident) => void;
  onViewEvents?: (incident: Incident) => void;
  onViewDetails?: (incident: Incident) => void;
}

// Inline FixPreviewModal with proper confirmation modal
import { setExecutionStateFromResult } from '../stores/executionPanel';
import { api } from '../services/api';

const FixPreviewModalInline: Component<{
  isOpen: boolean;
  incidentId: string;
  recommendationId?: string;
  title: string;
  onClose: () => void;
}> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [preview, setPreview] = createSignal<any>(null);
  const [applyResult, setApplyResult] = createSignal<any>(null);
  const [applying, setApplying] = createSignal(false);
  const [showConfirmation, setShowConfirmation] = createSignal(false);
  const [dryRunStatus, setDryRunStatus] = createSignal<'idle' | 'running' | 'success' | 'failed'>('idle');

  const fetchPreview = async () => {
    if (!props.incidentId) return;
    
    setLoading(true);
    setError(null);
    setPreview(null);
    setApplyResult(null);
    setDryRunStatus('idle');
    
    try {
      const endpoint = props.recommendationId
        ? `/api/v2/incidents/${props.incidentId}/recommendations/${props.recommendationId}/preview`
        : `/api/v2/incidents/${props.incidentId}/fix-preview`;
      
      const response = await fetch(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          incidentId: props.incidentId,
          recommendationId: props.recommendationId 
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setPreview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = async () => {
    setApplying(true);
    setApplyResult(null);
    setDryRunStatus('running');
    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dryRun: true, 
          incidentId: props.incidentId,
          recommendationId: props.recommendationId 
        })
      });
      const data = await response.json();
      setApplyResult(data);
      setDryRunStatus(data.success ? 'success' : 'failed');
    } catch (err: any) {
      setApplyResult({ success: false, error: err.message, dryRun: true });
      setDryRunStatus('failed');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyClick = () => {
    // Show centered confirmation modal instead of browser confirm
    setShowConfirmation(true);
  };

  const handleApplyConfirmed = async () => {
    setShowConfirmation(false);
    setApplying(true);
    setApplyResult(null);
    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/fix-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dryRun: false, 
          recommendationId: props.recommendationId,
          confirmed: true
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // Show execution summary in bottom right panel
      const startedAt = new Date().toISOString();
      const completedAt = new Date().toISOString();
      
      setExecutionStateFromResult({
        executionId: result.executionId || `fix-apply-${Date.now()}`,
        label: props.title || 'Fix Application',
        status: result.status === 'applied' || result.status === 'ok' ? 'succeeded' : 'failed',
        message: result.message || 'Fix applied successfully',
        error: result.status === 'failed' ? (result.error || result.message) : undefined,
        startedAt: startedAt,
        completedAt: completedAt,
        exitCode: result.status === 'applied' || result.status === 'ok' ? 0 : 1,
        resourcesChanged: result.changes ? {
          configured: result.changes.length,
          created: 0,
          updated: result.changes.length,
          deleted: 0,
        } : null,
        lines: [
          {
            id: `fix-apply-${Date.now()}-msg`,
            executionId: result.executionId || `fix-apply-${Date.now()}`,
            timestamp: startedAt,
            stream: 'stdout',
            text: `Applying fix: ${props.title}`,
            mode: 'apply',
            sourceLabel: 'kubectl-equivalent',
          },
          {
            id: `fix-apply-${Date.now()}-result`,
            executionId: result.executionId || `fix-apply-${Date.now()}`,
            timestamp: completedAt,
            stream: result.status === 'applied' || result.status === 'ok' ? 'stdout' : 'stderr',
            text: result.message || (result.status === 'applied' ? 'Fix applied successfully' : 'Fix application failed'),
            mode: 'apply',
            sourceLabel: 'kubectl-equivalent',
          },
          {
            id: `fix-apply-${Date.now()}-final`,
            executionId: result.executionId || `fix-apply-${Date.now()}`,
            timestamp: completedAt,
            stream: 'stdout',
            text: 'Execution completed successfully',
            mode: 'apply',
            sourceLabel: 'kubectl-equivalent',
          },
        ],
      });
      
      setApplyResult({ 
        success: result.status === 'applied' || result.status === 'ok',
        message: result.message,
        dryRun: false 
      });
      
      // Optionally run post-check after a delay
      if (result.executionId && result.postCheckPlan) {
        setTimeout(async () => {
          try {
            console.log('[FixApply] Running post-check for execution:', result.executionId, 'incidentId:', props.incidentId);
            const postCheck = await api.postCheck(props.incidentId, result.executionId);
            console.log('[FixApply] Post-check completed:', postCheck);
            // Post-check results are already handled by the execution panel
          } catch (err: any) {
            console.error('[FixApply] Error running post-check:', err);
            // Don't show error to user - post-check is optional
          }
        }, 15000); // Wait 15 seconds for pod to be recreated
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      const executionId = `fix-apply-error-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Show error in execution panel
      setExecutionStateFromResult({
        executionId: executionId,
        label: props.title || 'Fix Application',
        status: 'failed',
        message: `Failed to apply fix: ${errorMessage}`,
        error: errorMessage,
        startedAt: timestamp,
        completedAt: timestamp,
        exitCode: 1,
        lines: [
          {
            id: `${executionId}-msg`,
            executionId: executionId,
            timestamp: timestamp,
            stream: 'stdout',
            text: `Applying fix: ${props.title}`,
            mode: 'apply',
            sourceLabel: 'kubectl-equivalent',
          },
          {
            id: `${executionId}-err`,
            executionId: executionId,
            timestamp: timestamp,
            stream: 'stderr',
            text: `Failed to apply fix: ${errorMessage}`,
            mode: 'apply',
            sourceLabel: 'kubectl-equivalent',
          },
        ],
      });
      
      setApplyResult({ success: false, error: errorMessage, dryRun: false });
    } finally {
      setApplying(false);
    }
  };

  const handleApplyCancelled = () => {
    setShowConfirmation(false);
  };

  // Fetch preview when modal opens
  const onOpen = () => {
    if (props.isOpen && props.incidentId) {
      fetchPreview();
    }
  };

  // Use effect-like pattern
  let lastOpen = false;
  if (props.isOpen && !lastOpen) {
    onOpen();
  }
  lastOpen = props.isOpen;

  return (
    <Show when={props.isOpen}>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': 9999,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div 
          style={{
            background: 'var(--bg-card)',
            'border-radius': '12px',
            border: '1px solid var(--border-color)',
            'max-width': '700px',
            width: '90%',
            'max-height': '80vh',
            overflow: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            'border-bottom': '1px solid var(--border-color)',
            display: 'flex',
            'justify-content': 'space-between',
            'align-items': 'center',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card)',
          }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '16px', 'font-weight': '700' }}>
                🔧 Fix Preview
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', 'font-size': '13px' }}>
                {props.title}
              </p>
            </div>
            <button 
              onClick={props.onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                'font-size': '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                'line-height': 1,
              }}
            >×</button>
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            <Show when={loading()}>
              <div style={{ 'text-align': 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading preview...
              </div>
            </Show>

            <Show when={error()}>
              <div style={{
                background: '#dc354520',
                border: '1px solid #dc3545',
                'border-radius': '8px',
                padding: '16px',
                color: '#dc3545',
              }}>
                <strong>Error:</strong> {error()}
              </div>
            </Show>

            <Show when={!loading() && !error() && preview()}>
              <div style={{ 'margin-bottom': '16px' }}>
                <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                  Description
                </h4>
                <p style={{ color: 'var(--text-primary)', 'font-size': '14px', margin: 0 }}>
                  {preview()?.description || 'No description'}
                </p>
              </div>

              <Show when={preview()?.targetResource}>
                <div style={{ 'margin-bottom': '16px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                    Target Resource
                  </h4>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px',
                    'border-radius': '6px',
                    'font-family': 'monospace',
                    'font-size': '12px',
                    color: 'var(--text-primary)',
                  }}>
                    {preview()?.targetResource?.kind}/{preview()?.targetResource?.name} (ns: {preview()?.targetResource?.namespace})
                  </div>
                </div>
              </Show>

              <Show when={preview()?.dryRunCmd}>
                <div style={{ 'margin-bottom': '16px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                    Dry Run Command
                  </h4>
                  <pre style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px',
                    'border-radius': '6px',
                    'font-family': 'monospace',
                    'font-size': '11px',
                    color: 'var(--text-primary)',
                    overflow: 'auto',
                    margin: 0,
                  }}>
                    {preview()?.dryRunCmd}
                  </pre>
                </div>
              </Show>

              <Show when={preview()?.applyCmd}>
                <div style={{ 'margin-bottom': '16px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', 'margin-bottom': '8px' }}>
                    Apply Command
                  </h4>
                  <pre style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px',
                    'border-radius': '6px',
                    'font-family': 'monospace',
                    'font-size': '11px',
                    color: 'var(--text-primary)',
                    overflow: 'auto',
                    margin: 0,
                  }}>
                    {preview()?.applyCmd}
                  </pre>
                </div>
              </Show>

              {/* Execution Summary */}
              <Show when={applyResult()}>
                <div style={{
                  background: applyResult()?.success ? '#28a74520' : '#dc354520',
                  border: `1px solid ${applyResult()?.success ? '#28a745' : '#dc3545'}`,
                  'border-radius': '8px',
                  padding: '16px',
                  'margin-bottom': '16px',
                }}>
                  {/* Header with status */}
                  <div style={{ 
                    display: 'flex',
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-bottom': '12px',
                    'padding-bottom': '12px',
                    'border-bottom': `1px solid ${applyResult()?.success ? '#28a74540' : '#dc354540'}`,
                  }}>
                    <div style={{ 
                      color: applyResult()?.success ? '#28a745' : '#dc3545',
                      'font-weight': '700',
                      'font-size': '14px',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '8px',
                    }}>
                      {applyResult()?.success ? '✅' : '❌'}
                      {applyResult()?.dryRun ? 'Dry Run' : 'Execution'} {applyResult()?.success ? 'Succeeded' : 'Failed'}
                    </div>
                    <Show when={applyResult()?.appliedAt}>
                      <span style={{ 
                        'font-size': '11px', 
                        color: 'var(--text-muted)',
                        background: 'var(--bg-secondary)',
                        padding: '2px 8px',
                        'border-radius': '4px',
                      }}>
                        {new Date(applyResult()?.appliedAt).toLocaleTimeString()}
                      </span>
                    </Show>
                  </div>

                  {/* Message */}
                  <Show when={applyResult()?.message}>
                    <div style={{ 'margin-bottom': '12px' }}>
                      <div style={{ 
                        'font-size': '11px', 
                        color: 'var(--text-muted)', 
                        'margin-bottom': '4px',
                        'text-transform': 'uppercase',
                        'font-weight': '600',
                      }}>
                        Result
                      </div>
                      <p style={{ 
                        margin: 0, 
                        color: 'var(--text-primary)', 
                        'font-size': '13px',
                        'line-height': '1.5',
                      }}>
                        {applyResult()?.message}
                      </p>
                    </div>
                  </Show>

                  {/* Changes Made */}
                  <Show when={applyResult()?.changes && applyResult()?.changes.length > 0}>
                    <div style={{ 'margin-bottom': '12px' }}>
                      <div style={{ 
                        'font-size': '11px', 
                        color: 'var(--text-muted)', 
                        'margin-bottom': '4px',
                        'text-transform': 'uppercase',
                        'font-weight': '600',
                      }}>
                        Changes Made
                      </div>
                      <ul style={{ 
                        margin: 0, 
                        'padding-left': '16px',
                        'font-size': '12px',
                        color: 'var(--text-secondary)',
                      }}>
                        <For each={applyResult()?.changes}>
                          {(change) => (
                            <li style={{ 'margin-bottom': '2px' }}>{change}</li>
                          )}
                        </For>
                      </ul>
                    </div>
                  </Show>

                  {/* Rollback Command */}
                  <Show when={applyResult()?.rollbackCmd && !applyResult()?.dryRun}>
                    <div style={{ 'margin-bottom': '12px' }}>
                      <div style={{ 
                        'font-size': '11px', 
                        color: 'var(--text-muted)', 
                        'margin-bottom': '4px',
                        'text-transform': 'uppercase',
                        'font-weight': '600',
                        display: 'flex',
                        'align-items': 'center',
                        gap: '6px',
                      }}>
                        ⏪ Rollback Command
                      </div>
                      <pre style={{
                        background: 'var(--bg-secondary)',
                        padding: '8px 10px',
                        'border-radius': '4px',
                        'font-family': 'monospace',
                        'font-size': '11px',
                        color: 'var(--text-primary)',
                        overflow: 'auto',
                        margin: 0,
                      }}>
                        {applyResult()?.rollbackCmd}
                      </pre>
                    </div>
                  </Show>

                  {/* Error */}
                  <Show when={applyResult()?.error}>
                    <div style={{ 
                      background: '#dc354515',
                      padding: '10px',
                      'border-radius': '4px',
                      'margin-top': '8px',
                    }}>
                      <div style={{ 
                        'font-size': '11px', 
                        color: '#dc3545', 
                        'margin-bottom': '4px',
                        'text-transform': 'uppercase',
                        'font-weight': '600',
                      }}>
                        Error Details
                      </div>
                      <p style={{ 
                        margin: 0, 
                        color: '#dc3545', 
                        'font-size': '12px',
                        'font-family': 'monospace',
                      }}>
                        {applyResult()?.error}
                      </p>
                    </div>
                  </Show>

                  {/* Target Resource Summary */}
                  <Show when={preview()?.targetResource && !applyResult()?.dryRun}>
                    <div style={{ 
                      'margin-top': '12px',
                      'padding-top': '12px',
                      'border-top': '1px solid var(--border-color)',
                      display: 'flex',
                      gap: '16px',
                      'font-size': '11px',
                      color: 'var(--text-muted)',
                    }}>
                      <span>📦 {preview()?.targetResource?.kind}</span>
                      <span>🏷️ {preview()?.targetResource?.name}</span>
                      <span>📁 {preview()?.targetResource?.namespace}</span>
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
            position: 'sticky',
            bottom: 0,
            background: 'var(--bg-card)',
          }}>
            <button 
              onClick={props.onClose}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                'font-size': '13px',
              }}
            >
              Close
            </button>
            <button 
              onClick={handleDryRun}
              disabled={applying() || loading()}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: `1px solid ${dryRunStatus() === 'success' ? '#28a745' : dryRunStatus() === 'failed' ? '#dc3545' : 'var(--accent-primary)'}`,
                background: dryRunStatus() === 'success' ? '#28a74520' : dryRunStatus() === 'failed' ? '#dc354520' : 'transparent',
                color: dryRunStatus() === 'success' ? '#28a745' : dryRunStatus() === 'failed' ? '#dc3545' : 'var(--accent-primary)',
                cursor: applying() ? 'not-allowed' : 'pointer',
                'font-size': '13px',
                opacity: applying() ? 0.6 : 1,
              }}
            >
              {dryRunStatus() === 'running' ? '⏳ Running...' : 
               dryRunStatus() === 'success' ? '✅ Dry Run OK' :
               dryRunStatus() === 'failed' ? '❌ Dry Run Failed' : '🧪 Dry Run'}
            </button>
            <button 
              onClick={handleApplyClick}
              disabled={applying() || loading()}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: 'none',
                background: 'var(--accent-primary)',
                color: '#000',
                cursor: applying() ? 'not-allowed' : 'pointer',
                'font-size': '13px',
                'font-weight': '600',
                opacity: applying() ? 0.6 : 1,
              }}
            >
              {applying() && !applyResult()?.dryRun ? '⏳ Applying...' : '⚡ Apply Fix'}
            </button>
          </div>
        </div>

        {/* Confirmation Modal - Centered */}
        <Show when={showConfirmation()}>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 10000,
          }}>
            <div style={{
              background: 'var(--bg-card)',
              'border-radius': '12px',
              border: '2px solid var(--warning-color)',
              padding: '24px',
              'max-width': '450px',
              width: '90%',
              'text-align': 'center',
              'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}>
              <div style={{ 'font-size': '48px', 'margin-bottom': '16px' }}>⚠️</div>
              <h3 style={{ 
                margin: '0 0 12px', 
                color: 'var(--text-primary)', 
                'font-size': '18px',
                'font-weight': '700',
              }}>
                Confirm Fix Application
              </h3>
              <p style={{ 
                margin: '0 0 20px', 
                color: 'var(--text-secondary)', 
                'font-size': '14px',
                'line-height': '1.5',
              }}>
                You are about to apply a fix that will modify your Kubernetes cluster.
                <br /><br />
                <strong style={{ color: 'var(--warning-color)' }}>This action cannot be undone automatically.</strong>
              </p>
              <Show when={preview()?.targetResource}>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px',
                  'border-radius': '6px',
                  'margin-bottom': '20px',
                  'font-family': 'monospace',
                  'font-size': '12px',
                  color: 'var(--text-primary)',
                }}>
                  Target: {preview()?.targetResource?.kind}/{preview()?.targetResource?.name}
                  <br />
                  Namespace: {preview()?.targetResource?.namespace}
                </div>
              </Show>
              <div style={{ display: 'flex', gap: '12px', 'justify-content': 'center' }}>
                <button
                  onClick={handleApplyCancelled}
                  style={{
                    padding: '10px 24px',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    'font-size': '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyConfirmed}
                  style={{
                    padding: '10px 24px',
                    'border-radius': '6px',
                    border: 'none',
                    background: 'var(--warning-color)',
                    color: '#000',
                    cursor: 'pointer',
                    'font-size': '14px',
                    'font-weight': '700',
                  }}
                >
                  Yes, Apply Fix
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
};

const IncidentTable: Component<IncidentTableProps> = (props) => {
  const [expandedRow, setExpandedRow] = createSignal<string | null>(null);
  const [fixModalOpen, setFixModalOpen] = createSignal(false);
  const [fixModalIncidentId, setFixModalIncidentId] = createSignal('');
  const [fixModalRecId, setFixModalRecId] = createSignal<string | undefined>(undefined);
  const [fixModalTitle, setFixModalTitle] = createSignal('');

  const openFixModal = (incidentId: string, recId?: string, title?: string) => {
    console.log('openFixModal called:', { incidentId, recId, title });
    setFixModalIncidentId(incidentId);
    setFixModalRecId(recId);
    setFixModalTitle(title || 'Proposed Fix');
    setFixModalOpen(true);
  };

  const closeFixModal = () => {
    setFixModalOpen(false);
  };

  const getPatternIcon = (pattern: string): string => {
    const p = pattern?.toUpperCase() || '';
    switch (p) {
      case 'OOM_PRESSURE': return '💥';
      case 'CRASHLOOP': return '🔄';
      case 'RESTART_STORM': return '🌪️';
      case 'NO_READY_ENDPOINTS': return '🔌';
      case 'INTERNAL_ERRORS': return '🐛';
      case 'IMAGE_PULL_FAILURE': return '📦';
      case 'CONFIG_ERROR': return '⚙️';
      case 'DNS_FAILURE': return '🌐';
      case 'PERMISSION_DENIED': return '🔒';
      case 'APP_CRASH': return '💀';
      case 'TIMEOUTS': return '⏱️';
      case 'UPSTREAM_FAILURE': return '⬆️';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'var(--error-color)';
      case 'high': return '#ff6b6b';
      case 'medium': return 'var(--warning-color)';
      case 'low': return '#4dabf7';
      case 'info': return 'var(--text-secondary)';
      default: return 'var(--warning-color)';
    }
  };

  const getRiskColor = (risk: string): string => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'var(--error-color)';
      case 'medium': return 'var(--warning-color)';
      case 'low': return '#51cf66';
      default: return 'var(--text-secondary)';
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

  const getPattern = (inc: Incident) => inc.pattern || inc.type || 'unknown';
  const getResourceName = (inc: Incident) => inc.resource?.name || inc.resourceName || 'unknown';
  const getResourceKind = (inc: Incident) => inc.resource?.kind || inc.resourceKind || 'unknown';
  const getNamespace = (inc: Incident) => inc.resource?.namespace || inc.namespace || '-';
  const getOccurrences = (inc: Incident) => inc.occurrences || inc.count || 1;

  const toggleRow = (id: string) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  return (
    <>
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
            <Show when={props.isLoading}>
              <tr>
                <td colspan="8" style={{ padding: '40px', 'text-align': 'center' }}>
                  <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '16px' }}>
                    <div class="spinner" style={{ width: '32px', height: '32px' }} />
                    <div style={{ color: 'var(--text-secondary)', 'font-size': '14px' }}>
                      Loading incidents...
                    </div>
                  </div>
                </td>
              </tr>
            </Show>
            <Show when={!props.isLoading}>
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
                    onClick={(e) => {
                      // If clicking on a button or link, don't toggle
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A' || target.closest('a')) {
                        return;
                      }
                      toggleRow(incident.id);
                    }}
                    onDoubleClick={() => {
                      // Double-click opens the modal
                      if (props.onViewDetails) {
                        props.onViewDetails(incident);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = expandedRow() === incident.id ? 'var(--bg-secondary)' : 'var(--bg-card)';
                    }}
                  >
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        transform: expandedRow() === incident.id ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}>▶</span>
                    </td>

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

                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', 'font-size': '12px' }}>
                      {formatDate(incident.lastSeen)}
                    </td>

                    <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        actions={[
                          ...(props.onViewDetails ? [
                            { label: 'View Details', icon: 'info', onClick: () => {
                              console.log('View Details clicked for:', incident.id);
                              props.onViewDetails!(incident);
                            }}
                          ] : []),
                          ...((getResourceKind(incident) === 'Pod') && props.onViewPod ? [
                            { label: 'View Pod', icon: 'pod', onClick: () => props.onViewPod!(incident) }
                          ] : []),
                          ...(props.onViewLogs ? [
                            { label: 'View Logs', icon: 'logs', onClick: () => props.onViewLogs!(incident) }
                          ] : []),
                          ...(props.onViewEvents ? [
                            { label: 'View Events', icon: 'events', onClick: () => props.onViewEvents!(incident) }
                          ] : []),
                        ]}
                      />
                    </td>
                  </tr>

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
                            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '12px' }}>
                              <h4 style={{ color: 'var(--accent-primary)', 'font-size': '13px', 'font-weight': '700', margin: 0 }}>
                                💡 Recommendations
                              </h4>
                              <Show when={props.onViewDetails}>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('[IncidentTable] View Full Remediation clicked for:', incident.id);
                                    props.onViewDetails!(incident);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    'border-radius': '6px',
                                    cursor: 'pointer',
                                    'font-weight': '500',
                                    'font-size': '12px',
                                    display: 'flex',
                                    'align-items': 'center',
                                    gap: '6px'
                                  }}
                                >
                                  🚀 View Full Remediation
                                </button>
                              </Show>
                            </div>
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
                                      {/* Always show action button */}
                                      <div style={{ 'margin-top': '10px' }}>
                                        <button 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const actionType = rec.action?.type || '';
                                            console.log('Action button clicked!', { incidentId: incident.id, recId: rec.id, actionType });
                                            
                                            // Handle different action types - route to appropriate UI views
                                            if (actionType === 'VIEW_LOGS' && props.onViewLogs) {
                                              props.onViewLogs(incident);
                                            } else if (actionType === 'VIEW_EVENTS' && props.onViewEvents) {
                                              props.onViewEvents(incident);
                                            } else if (actionType === 'DESCRIBE' && props.onViewDetails) {
                                              // DESCRIBE opens the pod details view
                                              props.onViewDetails(incident);
                                            } else {
                                              // Default: open fix modal for RESTART, SCALE, ROLLBACK, PREVIEW_PATCH, etc.
                                              openFixModal(incident.id, rec.id, rec.action?.label || rec.title);
                                            }
                                          }}
                                          style={{
                                            padding: '6px 12px',
                                            'font-size': '11px',
                                            'border-radius': '4px',
                                            border: 'none',
                                            background: rec.action?.type === 'VIEW_LOGS' || rec.action?.type === 'VIEW_EVENTS' || rec.action?.type === 'DESCRIBE'
                                              ? 'var(--accent-secondary, #6c5ce7)' 
                                              : 'var(--accent-primary)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            'font-weight': '600',
                                            display: 'inline-flex',
                                            'align-items': 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          {rec.action?.type === 'RESTART' ? '🔄' : 
                                           rec.action?.type === 'SCALE' ? '📊' : 
                                           rec.action?.type === 'ROLLBACK' ? '⏪' : 
                                           rec.action?.type === 'DELETE_POD' ? '🗑️' : 
                                           rec.action?.type === 'VIEW_LOGS' ? '📋' :
                                           rec.action?.type === 'VIEW_EVENTS' ? '📅' :
                                           rec.action?.type === 'DESCRIBE' ? '🔍' : '🔧'}
                                          {rec.action?.label || rec.title}
                                        </button>
                                      </div>
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
            </Show>
          </tbody>
        </table>
      </div>

      {/* Fix Preview Modal */}
      <FixPreviewModalInline
        isOpen={fixModalOpen()}
        incidentId={fixModalIncidentId()}
        recommendationId={fixModalRecId()}
        title={fixModalTitle()}
        onClose={closeFixModal}
      />
    </>
  );
};

export default IncidentTable;
