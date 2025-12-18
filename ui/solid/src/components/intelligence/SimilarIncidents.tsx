import { Component, For, Show, createResource } from 'solid-js';

interface SimilarityResult {
  incidentId: string;
  similarity: number;
  pattern: string;
  resolution?: string;
  wasResolved: boolean;
  successfulFix?: string;
}

interface SimilarIncidentsProps {
  incidentId: string;
  onViewIncident?: (incidentId: string) => void;
}

const SimilarIncidents: Component<SimilarIncidentsProps> = (props) => {
  const [similarIncidents] = createResource(
    () => props.incidentId,
    async (id) => {
      try {
        const response = await fetch(`/api/v2/incidents/${id}/similar`);
        if (!response.ok) return [];
        return await response.json() as SimilarityResult[];
      } catch (e) {
        console.error('Failed to fetch similar incidents:', e);
        return [];
      }
    }
  );

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return '#28a745';
    if (similarity >= 0.7) return '#ffc107';
    return '#6c757d';
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
          🔗 Similar Incidents
        </h4>
        <Show when={similarIncidents()}>
          <span style={{ 
            'font-size': '11px', 
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            padding: '2px 8px',
            'border-radius': '4px'
          }}>
            {similarIncidents()?.length || 0} found
          </span>
        </Show>
      </div>

      {/* Content */}
      <div style={{ padding: '12px', 'max-height': '200px', 'overflow-y': 'auto' }}>
        <Show when={similarIncidents.loading}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            Searching for similar incidents...
          </div>
        </Show>

        <Show when={!similarIncidents.loading && (!similarIncidents() || similarIncidents()?.length === 0)}>
          <div style={{ color: 'var(--text-muted)', 'text-align': 'center', padding: '20px' }}>
            No similar incidents found
          </div>
        </Show>

        <Show when={!similarIncidents.loading && similarIncidents() && similarIncidents()!.length > 0}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={similarIncidents()}>
              {(incident) => (
                <div 
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: '10px 12px',
                    'border-radius': '6px',
                    border: '1px solid var(--border-color)',
                    cursor: props.onViewIncident ? 'pointer' : 'default'
                  }}
                  onClick={() => props.onViewIncident?.(incident.incidentId)}
                >
                  <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '6px' }}>
                    <span style={{ 
                      'font-size': '12px', 
                      'font-weight': '600', 
                      color: 'var(--text-primary)',
                      'font-family': 'monospace'
                    }}>
                      {incident.incidentId.substring(0, 20)}...
                    </span>
                    <div style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
                      <span style={{
                        'font-size': '10px',
                        padding: '2px 6px',
                        'border-radius': '3px',
                        background: getSimilarityColor(incident.similarity) + '20',
                        color: getSimilarityColor(incident.similarity),
                        'font-weight': '600'
                      }}>
                        {Math.round(incident.similarity * 100)}% similar
                      </span>
                      <Show when={incident.wasResolved}>
                        <span style={{
                          'font-size': '10px',
                          padding: '2px 6px',
                          'border-radius': '3px',
                          background: '#28a74520',
                          color: '#28a745',
                          'font-weight': '600'
                        }}>
                          ✓ Resolved
                        </span>
                      </Show>
                    </div>
                  </div>
                  <div style={{ 'font-size': '11px', color: 'var(--text-muted)', 'margin-bottom': '4px' }}>
                    Pattern: {incident.pattern}
                  </div>
                  <Show when={incident.resolution}>
                    <div style={{ 
                      'font-size': '11px', 
                      color: 'var(--text-secondary)',
                      'padding-left': '8px',
                      'border-left': '2px solid var(--accent-primary)'
                    }}>
                      💡 {incident.resolution}
                    </div>
                  </Show>
                  <Show when={incident.successfulFix}>
                    <div style={{ 
                      'font-size': '11px', 
                      color: '#28a745',
                      'margin-top': '4px'
                    }}>
                      ✅ Fixed with: {incident.successfulFix}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default SimilarIncidents;

