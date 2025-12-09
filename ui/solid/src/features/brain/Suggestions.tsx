import { Component, For, Show } from 'solid-js';
import { BrainSummary } from './types';

interface SuggestionsProps {
  summary: BrainSummary;
}

const Suggestions: Component<SuggestionsProps> = (props) => {
  return (
    <div class="space-y-4">
      <h3 class="text-lg font-bold" style={{ 
        background: 'var(--accent-gradient)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text'
      }}>
        Explanation & Suggestions
      </h3>

      {/* Summary */}
      <div class="p-4 rounded-lg" style={{ 
        background: 'var(--glass-gradient)',
        border: '1px solid var(--border-color)'
      }}>
        <h4 class="text-sm font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>
          Summary of Last 24h
        </h4>
        <p class="text-sm" style={{ color: 'var(--text-secondary)', 'line-height': '1.6' }}>
          {props.summary.last24hSummary}
        </p>
      </div>

      {/* Top Risk Areas */}
      <div>
        <h4 class="text-sm font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
          Top 3 Risk Areas
        </h4>
        <Show 
          when={props.summary.topRiskAreas.length > 0}
          fallback={
            <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
              No significant risk areas identified
            </div>
          }
        >
          <div class="space-y-2">
            <For each={props.summary.topRiskAreas}>
              {(risk, index) => (
                <div 
                  class="flex items-start gap-3 p-3 rounded-lg"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ 
                    background: 'var(--bg-secondary)',
                    color: 'var(--error-color)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {index() + 1}
                  </div>
                  <p class="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {risk}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Recommended Actions */}
      <div>
        <h4 class="text-sm font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
          Recommended Next Actions
        </h4>
        <Show 
          when={props.summary.recommendedActions.length > 0}
          fallback={
            <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
              No specific actions recommended at this time
            </div>
          }
        >
          <div class="space-y-2">
            <For each={props.summary.recommendedActions}>
              {(action) => (
                <div 
                  class="flex items-start gap-3 p-3 rounded-lg"
                  style={{ 
                    background: 'var(--glass-gradient)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div class="flex-shrink-0 mt-0.5" style={{ color: 'var(--success-color)' }}>✓</div>
                  <p class="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
                    {action}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="text-xs pt-2" style={{ color: 'var(--text-muted)' }}>
        Generated at {new Date(props.summary.generatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default Suggestions;



