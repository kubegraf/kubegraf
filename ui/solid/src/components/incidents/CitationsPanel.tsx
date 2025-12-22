// Copyright 2025 KubeGraf Contributors
// Citations Panel - Shows citations and references for the incident

import { Component, Show, For, createSignal, createEffect } from 'solid-js';
import { api } from '../../services/api';

interface CitationsPanelProps {
  incidentId: string;
}

interface Citation {
  title?: string;
  source?: string;
  text?: string;
  content?: string;
  url?: string;
  type?: string;
}

const CitationsPanel: Component<CitationsPanelProps> = (props) => {
  const [citations, setCitations] = createSignal<Citation[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Load citations
  createEffect(async () => {
    if (!props.incidentId) return;

    setLoading(true);
    setError(null);

    try {
      const citationsData = await api.getIncidentCitations(props.incidentId);
      
      if (citationsData.citations && Array.isArray(citationsData.citations)) {
        setCitations(citationsData.citations);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load citations');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div style={{ 'font-size': '16px', 'font-weight': '600', 'margin-bottom': '16px', color: 'var(--text-primary)' }}>
        Citations & References
      </div>

      <Show when={loading()}>
        <div style={{ padding: '40px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
          Loading citations...
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', 'border-radius': '6px', color: '#dc3545', 'font-size': '13px' }}>
          {error()}
        </div>
      </Show>

      <Show when={!loading() && !error()}>
        <Show when={citations().length === 0}>
          <div style={{ padding: '16px', 'text-align': 'center', color: 'var(--text-secondary)', 'font-size': '13px' }}>
            No citations available for this incident
          </div>
        </Show>

        <Show when={citations().length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            <For each={citations()}>
              {(citation) => (
                <div
                  style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ 'font-size': '14px', 'font-weight': '600', color: 'var(--text-primary)', 'margin-bottom': '8px' }}>
                    {citation.title || citation.source || 'Citation'}
                  </div>
                  <div style={{ 'font-size': '13px', color: 'var(--text-secondary)', 'margin-bottom': '4px', 'line-height': '1.6' }}>
                    {citation.text || citation.content || 'No content'}
                  </div>
                  {citation.url && (
                    <div style={{ 'margin-top': '8px' }}>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          'font-size': '12px',
                          color: 'var(--accent-primary)',
                          'text-decoration': 'none',
                        }}
                      >
                        View source →
                      </a>
                    </div>
                  )}
                  {citation.type && (
                    <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-top': '4px' }}>
                      Type: {citation.type}
                    </div>
                  )}
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default CitationsPanel;

