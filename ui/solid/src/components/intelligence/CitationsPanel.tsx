import { Component, For, Show, createResource } from 'solid-js';

interface Citation {
  id: string;
  source: string;
  ref: string;
  title: string;
  excerpt?: string;
  timestamp?: string;
  confidence: number;
}

interface CitationsPanelProps {
  incidentId: string;
}

const CitationsPanel: Component<CitationsPanelProps> = (props) => {
  const [citations] = createResource(
    () => props.incidentId,
    async (id) => {
      try {
        const response = await fetch(`/api/v2/incidents/${id}/citations`);
        if (!response.ok) return [];
        return await response.json() as Citation[];
      } catch (e) {
        console.error('Failed to fetch citations:', e);
        return [];
      }
    }
  );

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'event': return '📢';
      case 'log': return '📝';
      case 'status': return '📊';
      case 'metric': return '📈';
      case 'doc': return '📚';
      case 'runbook': return '📋';
      case 'history': return '🕐';
      default: return '📎';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'event': return '#ff6b6b';
      case 'log': return '#4ecdc4';
      case 'status': return '#45b7d1';
      case 'metric': return '#96ceb4';
      case 'doc': return '#ffeaa7';
      case 'runbook': return '#dfe6e9';
      case 'history': return '#a29bfe';
      default: return 'var(--text-secondary)';
    }
  };

  const isExternalLink = (ref: string) => ref.startsWith('http');

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
          📚 Citations & References
        </h4>
        <Show when={citations()}>
          <span style={{ 
            'font-size': '11px', 
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '2px 8px',
            'border-radius': '4px'
          }}>
            {citations()?.length || 0} sources
          </span>
        </Show>
      </div>

      {/* Content */}
      <div style={{ padding: '12px', 'max-height': '250px', 'overflow-y': 'auto' }}>
        <Show when={citations.loading}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            Loading citations...
          </div>
        </Show>

        <Show when={!citations.loading && (!citations() || citations()?.length === 0)}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            No citations available
          </div>
        </Show>

        <Show when={!citations.loading && citations() && citations()!.length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={citations()}>
              {(citation) => (
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '10px 12px',
                  'border-radius': '6px',
                  border: '1px solid var(--border-color)',
                  'border-left': `3px solid ${getSourceColor(citation.source)}`
                }}>
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', 'margin-bottom': '4px' }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                      <span>{getSourceIcon(citation.source)}</span>
                      <Show when={isExternalLink(citation.ref)} fallback={
                        <span style={{ 
                          'font-size': '12px', 
                          'font-weight': '600', 
                          color: 'var(--text-primary)' 
                        }}>
                          {citation.title}
                        </span>
                      }>
                        <a 
                          href={citation.ref} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            'font-size': '12px', 
                            'font-weight': '600', 
                            color: 'var(--accent-primary)',
                            'text-decoration': 'none'
                          }}
                        >
                          {citation.title} ↗
                        </a>
                      </Show>
                    </div>
                    <span style={{
                      'font-size': '10px',
                      padding: '2px 6px',
                      'border-radius': '3px',
                      background: getSourceColor(citation.source) + '30',
                      color: getSourceColor(citation.source),
                      'text-transform': 'uppercase',
                      'font-weight': '600'
                    }}>
                      {citation.source}
                    </span>
                  </div>
                  <Show when={citation.excerpt}>
                    <div style={{ 
                      'font-size': '11px', 
                      color: 'var(--text-secondary)',
                      'margin-top': '6px',
                      'padding-left': '24px',
                      'border-left': '2px solid var(--border-color)',
                      'font-style': 'italic'
                    }}>
                      "{citation.excerpt}"
                    </div>
                  </Show>
                  <div style={{ 
                    display: 'flex', 
                    'justify-content': 'space-between',
                    'align-items': 'center',
                    'margin-top': '6px'
                  }}>
                    <Show when={citation.timestamp}>
                      <span style={{ 'font-size': '10px', color: 'var(--text-muted)' }}>
                        {new Date(citation.timestamp!).toLocaleString()}
                      </span>
                    </Show>
                    <span style={{ 
                      'font-size': '10px', 
                      color: 'var(--text-muted)' 
                    }}>
                      {Math.round(citation.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default CitationsPanel;

