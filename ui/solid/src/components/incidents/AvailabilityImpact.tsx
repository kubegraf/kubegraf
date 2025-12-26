// Copyright 2025 KubeGraf Contributors
// Availability / HTTP Impact - HTTP error codes and service status

import { Component, Show, For } from 'solid-js';
import { IncidentSnapshot } from '../../services/api';

interface AvailabilityImpactProps {
  snapshot: IncidentSnapshot;
}

const AvailabilityImpact: Component<AvailabilityImpactProps> = (props) => {
  const snap = props.snapshot;
  const impact = snap.impact;

  const hasServiceExposure = impact?.serviceExposure?.hasService || impact?.serviceExposure?.hasIngress;
  const serviceName = impact?.serviceExposure?.serviceName;
  const ingressNames = impact?.serviceExposure?.ingressNames || [];
  const userFacingLikelihood = impact?.userFacingLikelihood ?? 0;
  const affectedReplicas = impact?.affectedReplicas ?? 0;

  // Extract HTTP error codes from evidence (simplified - would need better integration)
  const httpErrors: string[] = [];
  if (snap.lastErrorString) {
    const errorMatch = snap.lastErrorString.match(/50[0-9]|503|502|504/);
    if (errorMatch) {
      httpErrors.push(errorMatch[0]);
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Availability / HTTP Impact
      </div>

      {/* Service Exposure */}
      <div style={{ 'margin-bottom': '16px' }}>
        <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
          Service Exposure
        </div>
        <Show when={hasServiceExposure}>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', 'border-radius': '6px' }}>
            <Show when={serviceName}>
              <div style={{ 'font-size': '13px', color: 'var(--text-primary)', 'margin-bottom': '4px' }}>
                Service: <span style={{ 'font-weight': '600' }}>{serviceName}</span>
              </div>
            </Show>
            <Show when={ingressNames.length > 0}>
              <div style={{ 'font-size': '13px', color: 'var(--text-primary)' }}>
                Ingress: <span style={{ 'font-weight': '600' }}>{ingressNames.join(', ')}</span>
              </div>
            </Show>
          </div>
        </Show>
        <Show when={!hasServiceExposure}>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', 'border-radius': '6px', 'font-size': '13px', color: 'var(--text-muted)' }}>
            Not detected yet
          </div>
        </Show>
      </div>

      {/* HTTP Error Codes */}
      <div style={{ 'margin-bottom': '16px' }}>
        <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
          HTTP Error Codes
        </div>
        <Show when={httpErrors.length > 0}>
          <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
            <For each={httpErrors}>
              {(code) => (
                <span
                  style={{
                    padding: '6px 12px',
                    'border-radius': '4px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#dc3545',
                    'font-size': '13px',
                    'font-weight': '600',
                    'font-family': 'monospace',
                  }}
                >
                  {code}
                </span>
              )}
            </For>
          </div>
        </Show>
        <Show when={httpErrors.length === 0}>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', 'border-radius': '6px', 'font-size': '13px', color: 'var(--text-muted)' }}>
            No HTTP error codes detected
          </div>
        </Show>
      </div>

      {/* User-Facing Likelihood */}
      <div style={{ 'margin-bottom': '16px' }}>
        <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
          User-Facing Impact
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-secondary)', 'border-radius': '6px' }}>
          <Show when={userFacingLikelihood > 0}>
            <div style={{ 'font-size': '13px', color: 'var(--text-primary)' }}>
              Likelihood: <span style={{ 'font-weight': '600' }}>{Math.round(userFacingLikelihood * 100)}%</span>
              <span style={{ 'margin-left': '8px', color: 'var(--text-secondary)' }}>
                ({impact?.userFacingLabel || 'Likely user-facing'})
              </span>
            </div>
          </Show>
          <Show when={userFacingLikelihood === 0 || !impact?.userFacingLabel}>
            <div style={{ 'font-size': '13px', color: 'var(--text-muted)' }}>
              Unknown
            </div>
          </Show>
        </div>
      </div>

      {/* Affected Replicas */}
      <div>
        <div style={{ 'font-size': '13px', 'font-weight': '600', 'margin-bottom': '8px', color: 'var(--text-primary)' }}>
          Affected Replicas
        </div>
        <div style={{ padding: '12px', background: 'var(--bg-secondary)', 'border-radius': '6px' }}>
          <Show when={affectedReplicas > 0}>
            <div style={{ 'font-size': '13px', color: 'var(--text-primary)' }}>
              <span style={{ 'font-weight': '600' }}>{affectedReplicas}</span> replica{affectedReplicas !== 1 ? 's' : ''} affected
            </div>
          </Show>
          <Show when={affectedReplicas === 0}>
            <div style={{ 'font-size': '13px', color: 'var(--text-muted)' }}>
              Unknown
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityImpact;

