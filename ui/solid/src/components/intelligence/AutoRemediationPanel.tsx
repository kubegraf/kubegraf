import { Component, createSignal, createResource, Show } from 'solid-js';

interface AutoRemediationStatus {
  enabled: boolean;
  activeExecutions: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  rolledBackExecutions: number;
  lastExecution?: string;
  queuedIncidents: number;
  cooldownResources: number;
}

interface AutoRemediationDecision {
  incidentId: string;
  runbookId: string;
  decision: string;
  reason: string;
  confidence: number;
  successRate: number;
  risk: string;
  autonomyLevel: number;
  decidedAt: string;
  executionId?: string;
}

const AutoRemediationPanel: Component = () => {
  const [toggling, setToggling] = createSignal(false);

  const [status, { refetch: refetchStatus }] = createResource(async () => {
    try {
      const response = await fetch('/api/v2/auto-remediation/status');
      if (!response.ok) return null;
      return await response.json() as AutoRemediationStatus;
    } catch (e) {
      console.error('Failed to fetch auto-remediation status:', e);
      return null;
    }
  });

  const [decisions] = createResource(async () => {
    try {
      const response = await fetch('/api/v2/auto-remediation/decisions');
      if (!response.ok) return [];
      return await response.json() as AutoRemediationDecision[];
    } catch (e) {
      console.error('Failed to fetch decisions:', e);
      return [];
    }
  });

  const toggleAutoRemediation = async () => {
    setToggling(true);
    const currentlyEnabled = status()?.enabled;
    const endpoint = currentlyEnabled 
      ? '/api/v2/auto-remediation/disable' 
      : '/api/v2/auto-remediation/enable';

    try {
      await fetch(endpoint, { method: 'POST' });
      refetchStatus();
    } catch (e) {
      console.error('Failed to toggle auto-remediation:', e);
    } finally {
      setToggling(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'execute': return '#28a745';
      case 'skip': return '#6c757d';
      case 'blocked': return '#dc3545';
      case 'cooldown': return '#ffc107';
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
          🤖 Auto-Remediation
        </h4>
        <Show when={status()}>
          <button
            onClick={toggleAutoRemediation}
            disabled={toggling()}
            style={{
              padding: '4px 12px',
              'font-size': '11px',
              'border-radius': '12px',
              border: 'none',
              background: status()?.enabled ? '#28a745' : '#6c757d',
              color: '#fff',
              cursor: 'pointer',
              'font-weight': '600',
              opacity: toggling() ? 0.6 : 1
            }}
          >
            {status()?.enabled ? '● Enabled' : '○ Disabled'}
          </button>
        </Show>
      </div>

      {/* Stats */}
      <Show when={status()}>
        <div style={{ 
          display: 'grid', 
          'grid-template-columns': 'repeat(4, 1fr)', 
          gap: '12px',
          padding: '12px',
          'border-bottom': '1px solid var(--border-color)'
        }}>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '20px', 'font-weight': '700', color: 'var(--text-primary)' }}>
              {status()?.totalExecutions || 0}
            </div>
            <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>Total</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#28a745' }}>
              {status()?.successfulExecutions || 0}
            </div>
            <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>Success</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#dc3545' }}>
              {status()?.failedExecutions || 0}
            </div>
            <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>Failed</div>
          </div>
          <div style={{ 'text-align': 'center' }}>
            <div style={{ 'font-size': '20px', 'font-weight': '700', color: '#ffc107' }}>
              {status()?.rolledBackExecutions || 0}
            </div>
            <div style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>Rolled Back</div>
          </div>
        </div>

        {/* Active Info */}
        <div style={{ 
          padding: '12px',
          display: 'flex',
          gap: '16px',
          'font-size': '11px',
          color: 'var(--text-muted)',
          'border-bottom': '1px solid var(--border-color)'
        }}>
          <span>🔄 Active: {status()?.activeExecutions || 0}</span>
          <span>📋 Queued: {status()?.queuedIncidents || 0}</span>
          <span>⏳ In Cooldown: {status()?.cooldownResources || 0}</span>
        </div>
      </Show>

      {/* Recent Decisions */}
      <div style={{ padding: '12px' }}>
        <h5 style={{ margin: '0 0 8px', 'font-size': '12px', color: 'var(--text-secondary)' }}>
          Recent Decisions
        </h5>
        <Show when={decisions.loading}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '10px' }}>
            Loading...
          </div>
        </Show>
        <Show when={!decisions.loading && (!decisions() || decisions()?.length === 0)}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '10px', 'font-size': '12px' }}>
            No decisions yet
          </div>
        </Show>
        <Show when={!decisions.loading && decisions() && decisions()!.length > 0}>
          <div style={{ 'max-height': '200px', 'overflow-y': 'auto' }}>
            {decisions()?.slice(0, 10).map((decision) => (
              <div style={{
                padding: '8px',
                'border-radius': '4px',
                background: 'var(--bg-secondary)',
                'margin-bottom': '6px',
                'font-size': '11px'
              }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '4px' }}>
                  <span style={{ 
                    color: getDecisionColor(decision.decision),
                    'font-weight': '600',
                    'text-transform': 'uppercase'
                  }}>
                    {decision.decision}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(decision.decidedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', 'margin-bottom': '4px' }}>
                  {decision.reason}
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                  <span>Confidence: {Math.round(decision.confidence * 100)}%</span>
                  <span>Success Rate: {Math.round(decision.successRate * 100)}%</span>
                  <span>{getAutonomyLabel(decision.autonomyLevel)}</span>
                </div>
              </div>
            ))}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default AutoRemediationPanel;

