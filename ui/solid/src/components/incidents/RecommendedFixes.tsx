// Copyright 2025 KubeGraf Contributors
// Recommended Fixes - Fix suggestions with confidence and risk levels

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api, IncidentSnapshot } from '../../services/api';

interface RecommendedFixesProps {
  incidentId: string;
  snapshot: IncidentSnapshot;
  onPreviewFix?: (fixId: string) => void;
}

interface Fix {
  id: string;
  title: string;
  description: string;
  reason?: string;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  type?: string;
}

const RecommendedFixes: Component<RecommendedFixesProps> = (props) => {
  const [fixes, setFixes] = createSignal<Fix[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Only show fixes if confidence >= 80%
  const shouldShowFixes = () => props.snapshot.confidence >= 0.8;

  // Load runbooks/fixes
  createEffect(async () => {
    if (!props.incidentId || !shouldShowFixes()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const runbooksData = await api.getIncidentRunbooks(props.incidentId);
      
      if (runbooksData.runbooks && Array.isArray(runbooksData.runbooks)) {
        const fixList: Fix[] = runbooksData.runbooks
          .filter((rb: any) => rb.enabled !== false)
          .map((rb: any) => ({
            id: rb.id || rb.name || `fix-${Math.random()}`,
            title: rb.name || 'Fix',
            description: rb.description || '',
            reason: rb.action?.description || '',
            confidence: rb.successRate || 0.5,
            risk: (rb.risk || 'medium').toLowerCase() as 'low' | 'medium' | 'high',
            type: rb.action?.type || 'unknown',
          }));

        // Sort by confidence (highest first)
        fixList.sort((a, b) => b.confidence - a.confidence);
        setFixes(fixList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load fixes');
    } finally {
      setLoading(false);
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#22c55e';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      default: return 'var(--text-secondary)';
    }
  };

  const getRiskBg = (risk: string) => {
    switch (risk) {
      case 'low': return 'rgba(34, 197, 94, 0.1)';
      case 'medium': return 'rgba(255, 193, 7, 0.1)';
      case 'high': return 'rgba(220, 53, 69, 0.1)';
      default: return 'var(--bg-secondary)';
    }
  };

  const handlePreview = (fix: Fix) => {
    if (props.onPreviewFix) {
      props.onPreviewFix(fix.id);
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
        Recommended Fixes
      </div>

      <Show when={!shouldShowFixes()}>
        <div
          style={{
            padding: '16px',
            background: 'rgba(255, 193, 7, 0.1)',
            'border-radius': '6px',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            'margin-bottom': '16px',
          }}
        >
          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '8px' }}>
            <span style={{ 'font-size': '18px' }}>⚠️</span>
            <span style={{ 'font-size': '14px', 'font-weight': '600', color: '#ffc107' }}>
              80% Confidence Rule: Fix Suggestions Not Available
            </span>
          </div>
          <div style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'line-height': '1.6' }}>
            Diagnosis confidence is {Math.round(props.snapshot.confidence * 100)}%, which is below the 80% threshold required for fix suggestions.
            This prevents showing potentially dangerous advice when confidence is low.
          </div>
          <div style={{ 'margin-top': '12px', 'font-size': '12px', color: 'var(--text-muted)' }}>
            Please review the diagnosis and evidence above to gather more information before attempting fixes.
          </div>
        </div>
      </Show>

      <Show when={shouldShowFixes()}>
        <Show when={loading()}>
          <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
            Loading fixes...
          </div>
        </Show>

        <Show when={error()}>
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
            {error()}
          </div>
        </Show>

        <Show when={!loading() && !error()}>
          <Show when={fixes().length === 0}>
            <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              No fixes available for this incident
            </div>
          </Show>

          <Show when={fixes().length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
              <For each={fixes()}>
                {(fix) => (
                  <div
                    style={{
                      padding: '16px',
                      border: '1px solid var(--border-color)',
                      'border-radius': '8px',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '12px' }}>
                      <h4 style={{ 'font-size': '15px', 'font-weight': '600', 'margin': 0, color: 'var(--text-primary)', flex: 1 }}>
                        {fix.title}
                      </h4>
                      <span
                        style={{
                          padding: '4px 10px',
                          'border-radius': '4px',
                          'font-size': '11px',
                          'font-weight': '600',
                          background: getRiskBg(fix.risk),
                          color: getRiskColor(fix.risk),
                          'text-transform': 'uppercase',
                        }}
                      >
                        {fix.risk} risk
                      </span>
                      <span
                        style={{
                          padding: '4px 10px',
                          'border-radius': '4px',
                          'font-size': '11px',
                          'font-weight': '600',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {Math.round(fix.confidence * 100)}% confidence
                      </span>
                    </div>

                    <div style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'margin-bottom': '12px', 'line-height': '1.6' }}>
                      {fix.description}
                    </div>

                    <Show when={fix.reason}>
                      <div style={{ 'font-size': '12px', color: 'var(--text-muted)', 'margin-bottom': '12px' }}>
                        Reason: {fix.reason}
                      </div>
                    </Show>

                    <button
                      onClick={() => handlePreview(fix)}
                      style={{
                        padding: '8px 16px',
                        'border-radius': '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        'font-size': '13px',
                        'font-weight': '500',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Preview Fix
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
};

export default RecommendedFixes;

