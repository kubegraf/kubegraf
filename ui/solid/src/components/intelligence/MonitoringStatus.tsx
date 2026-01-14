import { Component, createResource, createSignal, onCleanup, Show } from 'solid-js';

interface IntelligenceSystemStatus {
  running: boolean;
  knowledgeBankEnabled: boolean;
  learningEnabled: boolean;
  podsMonitored: number;
  nodesMonitored: number;
  eventsProcessed: number;
  lastScanTime: string;
  runbooksAvailable: number;
  systemHealth: string;
  clusterCount?: number;
  learnedPatternCount?: number;
}

interface MonitoringStatusProps {
  className?: string;
}

const MonitoringStatus: Component<MonitoringStatusProps> = (props) => {
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);

  const [status] = createResource(
    refreshTrigger,
    async () => {
      try {
        const response = await fetch('/api/v2/intelligence/status');
        if (!response.ok) return null;
        return await response.json() as IntelligenceSystemStatus;
      } catch (e) {
        console.error('Failed to fetch intelligence status:', e);
        return null;
      }
    }
  );

  // Auto-refresh every 5 seconds
  const interval = setInterval(() => {
    setRefreshTrigger(prev => prev + 1);
  }, 5000);

  onCleanup(() => clearInterval(interval));

  const getHealthColor = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'healthy': return '#4ade80';
      case 'warning': return '#fbbf24';
      case 'degraded': return '#f97316';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'healthy': return '✓';
      case 'warning': return '⚠';
      case 'degraded': return '⚠';
      case 'offline': return '✕';
      default: return '○';
    }
  };

  const formatLastScan = (timestamp: string) => {
    if (!timestamp) return 'Never';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);

      if (diffSec < 10) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      return `${diffHour}h ago`;
    } catch {
      return timestamp;
    }
  };

  return (
    <div class={props.className} style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      'border-radius': '8px',
      padding: '16px',
    }}>
      <Show when={status.loading}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            'border-radius': '50%',
            background: '#6b7280',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{ color: 'var(--text-secondary)', 'font-size': '14px' }}>
            Loading monitoring status...
          </div>
        </div>
      </Show>

      <Show when={!status.loading && status()}>
        {(data) => (
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            {/* Header with status indicator */}
            <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                'border-radius': '50%',
                background: getHealthColor(data().systemHealth),
                animation: data().running ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                'box-shadow': `0 0 8px ${getHealthColor(data().systemHealth)}40`
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  color: 'var(--text-primary)',
                  'font-weight': '600',
                  'font-size': '14px',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px'
                }}>
                  <Show when={data().running} fallback={
                    <span>Incident Intelligence Offline</span>
                  }>
                    <span>Checking for incidents</span>
                    <span style={{
                      'font-size': '10px',
                      padding: '2px 6px',
                      'border-radius': '4px',
                      background: getHealthColor(data().systemHealth) + '20',
                      color: getHealthColor(data().systemHealth),
                      'text-transform': 'uppercase',
                      'font-weight': '700'
                    }}>
                      {getHealthIcon(data().systemHealth)} {data().systemHealth}
                    </span>
                  </Show>
                </div>
                <div style={{
                  color: 'var(--text-muted)',
                  'font-size': '12px',
                  'margin-top': '2px'
                }}>
                  Last scan: {formatLastScan(data().lastScanTime)}
                </div>
              </div>
            </div>

            {/* Monitoring stats */}
            <Show when={data().running}>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
                'padding-top': '8px',
                'border-top': '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Pods
                  </div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                    {data().podsMonitored}
                  </div>
                </div>

                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Nodes
                  </div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                    {data().nodesMonitored}
                  </div>
                </div>

                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Events
                  </div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                    {data().eventsProcessed.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px' }}>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'text-transform': 'uppercase' }}>
                    Runbooks
                  </div>
                  <div style={{ 'font-size': '18px', 'font-weight': '700', color: 'var(--text-primary)' }}>
                    {data().runbooksAvailable}
                  </div>
                </div>
              </div>
            </Show>
          </div>
        )}
      </Show>

      <Show when={!status.loading && !status()}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            'border-radius': '50%',
            background: '#ef4444'
          }} />
          <div style={{ color: 'var(--text-secondary)', 'font-size': '14px' }}>
            Intelligence system unavailable
          </div>
        </div>
      </Show>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default MonitoringStatus;
