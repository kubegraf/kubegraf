import { Component, For, Show } from 'solid-js';
import { BrainSummary } from './types';

interface SuggestionsProps {
  summary: BrainSummary;
}

const Suggestions: Component<SuggestionsProps> = (props) => {
  return (
    <div class="space-y-4">
      <h3 class="text-lg font-bold" style={{ 
        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text'
      }}>
        Explanation & Suggestions
      </h3>

      {/* Summary */}
      <div class="p-4 rounded-lg" style={{ 
        background: 'rgba(14, 165, 233, 0.1)',
        border: '1px solid rgba(14, 165, 233, 0.3)'
      }}>
        <h4 class="text-sm font-semibold mb-2" style={{ color: '#0ea5e9' }}>
          Summary of Last 24h
        </h4>
        <p class="text-sm" style={{ color: '#c9d1d9', 'line-height': '1.6' }}>
          {props.summary.last24hSummary}
        </p>
      </div>

      {/* Top Risk Areas */}
      <div>
        <h4 class="text-sm font-semibold mb-3" style={{ color: '#0ea5e9' }}>
          Top 3 Risk Areas
        </h4>
        <Show 
          when={props.summary.topRiskAreas.length > 0}
          fallback={
            <div class="text-sm" style={{ color: '#8b949e' }}>
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
                    background: 'rgba(22, 27, 34, 0.5)',
                    border: '1px solid #333333'
                  }}
                >
                  <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ 
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }}>
                    {index() + 1}
                  </div>
                  <p class="text-sm flex-1" style={{ color: '#c9d1d9' }}>
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
        <h4 class="text-sm font-semibold mb-3" style={{ color: '#0ea5e9' }}>
          Recommended Next Actions
        </h4>
        <Show 
          when={props.summary.recommendedActions.length > 0}
          fallback={
            <div class="text-sm" style={{ color: '#8b949e' }}>
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
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <div class="flex-shrink-0 mt-0.5">✓</div>
                  <p class="text-sm flex-1" style={{ color: '#c9d1d9' }}>
                    {action}
                  </p>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="text-xs pt-2" style={{ color: '#6b7280' }}>
        Generated at {new Date(props.summary.generatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default Suggestions;


