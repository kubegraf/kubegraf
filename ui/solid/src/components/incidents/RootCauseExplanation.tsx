// Copyright 2025 KubeGraf Contributors
// Root Cause Explanation - Primary root cause with optional secondary factors

import { Component, Show, For } from 'solid-js';
import { IncidentSnapshot } from '../../services/api';

interface RootCauseExplanationProps {
  snapshot: IncidentSnapshot;
}

const RootCauseExplanation: Component<RootCauseExplanationProps> = (props) => {
  const snap = props.snapshot;

  const primaryCause = snap.rootCauses?.[0];
  const secondaryCauses = snap.rootCauses?.slice(1) || [];

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Root Cause Explanation
      </div>

      {/* Diagnosis Summary */}
      <div
        style={{
          'margin-bottom': '20px',
          padding: '16px',
          background: 'var(--bg-secondary)',
          'border-radius': '8px',
          'font-size': '14px',
          color: 'var(--text-primary)',
          'line-height': '1.6',
        }}
      >
        {snap.diagnosisSummary || 'No diagnosis available'}
      </div>

      {/* Primary Root Cause */}
      <Show when={primaryCause}>
        <div style={{ 'margin-bottom': '16px' }}>
          <div
            style={{
              'font-size': '13px',
              'font-weight': '600',
              'margin-bottom': '8px',
              color: 'var(--text-primary)',
              'text-transform': 'uppercase',
              'letter-spacing': '0.5px',
            }}
          >
            Primary Cause
          </div>
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              'border-left': '4px solid var(--accent-primary)',
              'border-radius': '4px',
              'font-size': '14px',
              color: 'var(--text-primary)',
              'font-weight': '500',
            }}
          >
            {primaryCause!.cause}
          </div>
          <Show when={primaryCause!.likelihood !== undefined}>
            <div style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--text-secondary)' }}>
              Likelihood: {Math.round(primaryCause!.likelihood * 100)}%
              {primaryCause!.evidenceCount !== undefined && primaryCause!.evidenceCount > 0 && (
                <span style={{ 'margin-left': '12px' }}>
                  • {primaryCause!.evidenceCount} evidence item{primaryCause!.evidenceCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Show>
        </div>
      </Show>

      {/* Secondary Contributing Factors */}
      <Show when={secondaryCauses.length > 0}>
        <div>
          <div
            style={{
              'font-size': '13px',
              'font-weight': '600',
              'margin-bottom': '8px',
              color: 'var(--text-secondary)',
              'text-transform': 'uppercase',
              'letter-spacing': '0.5px',
            }}
          >
            Contributing Factors
          </div>
          <ul style={{ 'margin': 0, 'padding-left': '20px', 'list-style': 'none' }}>
            <For each={secondaryCauses}>
              {(cause, index) => (
                <li
                  style={{
                    'margin-bottom': '12px',
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    'border-radius': '4px',
                    'font-size': '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ 'margin-right': '8px', 'font-weight': '600' }}>
                    {index() + 2}.
                  </span>
                  {cause.cause}
                  <Show when={cause.likelihood !== undefined}>
                    <span style={{ 'margin-left': '8px', 'font-size': '12px', color: 'var(--text-secondary)' }}>
                      ({Math.round(cause.likelihood * 100)}% likelihood)
                    </span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      {/* Confidence Display */}
      <div
        style={{
          'margin-top': '20px',
          padding: '12px',
          background: snap.confidence >= 0.8 ? 'rgba(34, 197, 94, 0.1)' : snap.confidence >= 0.5 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 107, 107, 0.1)',
          'border-radius': '6px',
          display: 'flex',
          'align-items': 'center',
          gap: '8px',
        }}
      >
        <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--text-secondary)' }}>
          Diagnosis Confidence:
        </span>
        <span
          style={{
            'font-size': '14px',
            'font-weight': '700',
            color: snap.confidence >= 0.8 ? '#22c55e' : snap.confidence >= 0.5 ? '#ffc107' : '#ff6b6b',
          }}
        >
          {snap.confidenceLabel || 'Unknown'} ({Math.round(snap.confidence * 100)}%)
        </span>
      </div>
    </div>
  );
};

export default RootCauseExplanation;

