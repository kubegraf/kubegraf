// Copyright 2025 KubeGraf Contributors
// Signal Summary Panel - Lists all signals that triggered the incident

import { Component, Show, For, createSignal } from 'solid-js';
import { IncidentSnapshot } from '../../services/api';

interface SignalSummaryPanelProps {
  snapshot: IncidentSnapshot;
  onSignalClick?: (signalType: string) => void;
}

interface Signal {
  type: string;
  label: string;
  value: string;
  icon: string;
  source: string;
}

const SignalSummaryPanel: Component<SignalSummaryPanelProps> = (props) => {
  const [expandedSignal, setExpandedSignal] = createSignal<string | null>(null);
  const snap = props.snapshot;

  // Format timestamp for evidence
  const formatEvidenceTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const lastSeenTime = snap.lastSeen ? formatEvidenceTimestamp(snap.lastSeen) : 'Unknown time';

  const signals: Signal[] = [];

  // Pod restarts
  if (snap.restartCounts) {
    const total = snap.restartCounts.last24Hours || snap.restartCounts.total || 0;
    if (total > 0) {
      const restartDetail = `5m: ${snap.restartCounts.last5Minutes || 0}, 1h: ${snap.restartCounts.last1Hour || 0}, 24h: ${snap.restartCounts.last24Hours || 0}, total: ${snap.restartCounts.total || total}`;
      signals.push({
        type: 'restarts',
        label: 'Pod Restarts',
        value: `${total} restart${total !== 1 ? 's' : ''} detected (${restartDetail}) [Source: Pod status]`,
        icon: '🔄',
        source: 'Pod status',
      });
    }
  }

  // OOMKilled
  if (snap.lastExitCode === 137 || snap.lastErrorString?.toLowerCase().includes('oom')) {
    const errorMsg = snap.lastErrorString || 'OOMKilled';
    signals.push({
      type: 'oom',
      label: 'OOMKilled',
      value: `Container exited with code 137 (OOMKilled): ${errorMsg} at ${lastSeenTime}`,
      icon: '💾',
      source: 'Container status',
    });
  }

  // Exit codes (non-OOM)
  if (snap.lastExitCode !== undefined && snap.lastExitCode !== 0 && snap.lastExitCode !== 137) {
    const exitCodeMeaning = snap.lastExitCode === 1 ? 'Application error' : 
                           snap.lastExitCode === 2 ? 'Misuse of shell command' : 
                           `Exit code ${snap.lastExitCode}`;
    signals.push({
      type: 'exit_code',
      label: 'Container Exit Code',
      value: `Container exited with code ${snap.lastExitCode} (${exitCodeMeaning})${snap.lastErrorString ? `: ${snap.lastErrorString}` : ''} at ${lastSeenTime}`,
      icon: '⚠️',
      source: 'Container status',
    });
  }

  // Error strings (only if not already covered by exit code)
  if (snap.lastErrorString && snap.lastExitCode !== 137 && snap.lastExitCode !== 0) {
    const lowerError = snap.lastErrorString.toLowerCase();
    if (lowerError.includes('error') || lowerError.includes('failed') || lowerError.includes('fatal')) {
      signals.push({
        type: 'error',
        label: 'Error Signal',
        value: `${snap.lastErrorString} [Source: Container logs] at ${lastSeenTime}`,
        icon: '❌',
        source: 'Container logs',
      });
    }
  }

  // Readiness status
  if (snap.readinessStatus && (snap.readinessStatus.toLowerCase().includes('unready') || snap.readinessStatus.toLowerCase().includes('not ready'))) {
    signals.push({
      type: 'readiness',
      label: 'Readiness Failure',
      value: `${snap.readinessStatus} [Source: Pod status]`,
      icon: '💓',
      source: 'Pod status',
    });
  }

  // Service endpoints (if available from impact)
  if (snap.impact?.serviceExposure?.hasService && !snap.impact.serviceExposure.serviceName) {
    signals.push({
      type: 'endpoints',
      label: 'Service Endpoints',
      value: `Service has 0 ready endpoints [Source: Service status]`,
      icon: '🔗',
      source: 'Service status',
    });
  }

  const handleSignalClick = (signal: Signal) => {
    if (expandedSignal() === signal.type) {
      setExpandedSignal(null);
    } else {
      setExpandedSignal(signal.type);
      if (props.onSignalClick) {
        props.onSignalClick(signal.type);
      }
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Signal Summary
      </div>

      <Show when={signals.length === 0}>
        <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          No signals detected
        </div>
      </Show>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <For each={signals}>
          {(signal) => (
            <div
              style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                'border-radius': '6px',
                background: expandedSignal() === signal.type ? 'var(--bg-secondary)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => handleSignalClick(signal)}
            >
              <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
                <span style={{ 'font-size': '20px' }}>{signal.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                    <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                      {signal.label}
                    </span>
                    <span
                      style={{
                        'font-size': '11px',
                        padding: '2px 6px',
                        'border-radius': '4px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {signal.source}
                    </span>
                  </div>
                  <div style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>
                    {signal.value}
                  </div>
                </div>
                <span style={{ 'font-size': '12px', color: 'var(--text-muted)' }}>
                  {expandedSignal() === signal.type ? '▼' : '▶'}
                </span>
              </div>

              <Show when={expandedSignal() === signal.type}>
                <div
                  style={{
                    'margin-top': '12px',
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    'border-radius': '4px',
                    'font-size': '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Click to view detailed evidence in the Evidence tab.
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default SignalSummaryPanel;

