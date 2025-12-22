// Copyright 2025 KubeGraf Contributors
// Knowledge Bank - Similar past incidents and fix success rates

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface KnowledgeBankProps {
  incidentId: string;
  onFeedback?: (incidentId: string, outcome: 'worked' | 'didnt_work' | 'incorrect_cause') => void;
}

interface SimilarIncident {
  id: string;
  title: string;
  pattern: string;
  similarity: number;
  resolvedAt?: string;
  fixUsed?: string;
  fixWorked?: boolean;
}

const KnowledgeBank: Component<KnowledgeBankProps> = (props) => {
  const [similar, setSimilar] = createSignal<SimilarIncident[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = createSignal<string | null>(null);

  // Load similar incidents
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      const similarData = await api.getIncidentSimilar(props.incidentId);
      
      if (similarData.similar && Array.isArray(similarData.similar)) {
        const similarList: SimilarIncident[] = similarData.similar
          .slice(0, 10) // Limit to 10 most similar
          .map((item: any) => ({
            id: item.id || item.incidentId || '',
            title: item.title || item.description || 'Similar incident',
            pattern: item.pattern || 'unknown',
            similarity: item.similarity || 0,
            resolvedAt: item.resolvedAt || item.lastSeen,
            fixUsed: item.fixUsed || item.appliedFixId,
            fixWorked: item.fixWorked !== undefined ? item.fixWorked : undefined,
          }));

        setSimilar(similarList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load similar incidents');
    } finally {
      setLoading(false);
    }
  });

  const handleFeedback = async (outcome: 'worked' | 'didnt_work' | 'incorrect_cause') => {
    if (!props.incidentId) return;

    setFeedbackSubmitting(props.incidentId);
    try {
      await api.submitIncidentFeedback(
        props.incidentId,
        outcome === 'worked' ? 'worked' : outcome === 'didnt_work' ? 'not_worked' : 'unknown'
      );
      if (props.onFeedback) {
        props.onFeedback(props.incidentId, outcome);
      }
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return '#22c55e';
    if (similarity >= 0.6) return '#ffc107';
    return '#ff6b6b';
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
        Knowledge Bank
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Loading similar incidents...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        {/* Similar Incidents */}
        <div style={{ 'margin-bottom': '24px' }}>
          <div style={{ 'font-size': '14px', 'font-weight': '600', 'margin-bottom': '12px', color: 'var(--text-primary)' }}>
            Similar Past Incidents
          </div>

          <Show when={similar().length === 0}>
            <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
              No similar incidents found
            </div>
          </Show>

          <Show when={similar().length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
              <For each={similar()}>
                {(item) => (
                  <div
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      'border-radius': '6px',
                      display: 'flex',
                      'align-items': 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                        <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            'font-size': '11px',
                            padding: '2px 6px',
                            'border-radius': '4px',
                            background: item.similarity >= 0.8 ? 'rgba(34, 197, 94, 0.1)' : item.similarity >= 0.6 ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 107, 107, 0.1)',
                            color: getSimilarityColor(item.similarity),
                          }}
                        >
                          {Math.round(item.similarity * 100)}% similar
                        </span>
                      </div>
                      <div style={{ 'font-size': '12px', color: 'var(--text-secondary)' }}>
                        Pattern: {item.pattern}
                        {item.resolvedAt && (
                          <span style={{ 'margin-left': '8px' }}>
                            • Resolved {new Date(item.resolvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Show when={item.fixUsed && item.fixWorked !== undefined}>
                        <div style={{ 'font-size': '11px', color: item.fixWorked ? '#22c55e' : '#dc3545', 'margin-top': '4px' }}>
                          Fix: {item.fixUsed} • {item.fixWorked ? '✓ Worked' : '✗ Did not work'}
                        </div>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Feedback Section */}
        <div style={{ padding: '16px', background: 'var(--bg-secondary)', 'border-radius': '6px' }}>
          <div style={{ 'font-size': '14px', 'font-weight': '600', 'margin-bottom': '12px', color: 'var(--text-primary)' }}>
            Help Improve Diagnosis
          </div>
          <div style={{ 'font-size': '12px', color: 'var(--text-secondary)', 'margin-bottom': '12px' }}>
            Did the fix work? Mark it to help improve future recommendations.
          </div>
          <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
            <button
              onClick={() => handleFeedback('worked')}
              disabled={feedbackSubmitting() === props.incidentId}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: '1px solid #22c55e',
                background: feedbackSubmitting() === props.incidentId ? 'var(--text-muted)' : '#22c55e',
                color: 'white',
                'font-size': '12px',
                'font-weight': '500',
                cursor: feedbackSubmitting() === props.incidentId ? 'not-allowed' : 'pointer',
              }}
            >
              ✓ Fix Worked
            </button>
            <button
              onClick={() => handleFeedback('didnt_work')}
              disabled={feedbackSubmitting() === props.incidentId}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: '1px solid #dc3545',
                background: feedbackSubmitting() === props.incidentId ? 'var(--text-muted)' : '#dc3545',
                color: 'white',
                'font-size': '12px',
                'font-weight': '500',
                cursor: feedbackSubmitting() === props.incidentId ? 'not-allowed' : 'pointer',
              }}
            >
              ✗ Didn't Work
            </button>
            <button
              onClick={() => handleFeedback('incorrect_cause')}
              disabled={feedbackSubmitting() === props.incidentId}
              style={{
                padding: '8px 16px',
                'border-radius': '6px',
                border: '1px solid var(--border-color)',
                background: feedbackSubmitting() === props.incidentId ? 'var(--text-muted)' : 'var(--bg-primary)',
                color: 'var(--text-primary)',
                'font-size': '12px',
                'font-weight': '500',
                cursor: feedbackSubmitting() === props.incidentId ? 'not-allowed' : 'pointer',
              }}
            >
              Incorrect Cause
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default KnowledgeBank;

