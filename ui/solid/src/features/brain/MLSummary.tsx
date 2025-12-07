// Copyright 2025 KubeGraf Contributors

import { Component, For, Show } from 'solid-js';
import { MLSummary as MLSummaryType } from '../../services/brainML';

interface MLSummaryProps {
  summary: MLSummaryType;
}

const MLSummary: Component<MLSummaryProps> = (props) => {
  return (
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold" style={{ color: '#f0f6fc' }}>ML Summary</h3>
        <span class="text-xs" style={{ color: '#8b949e' }}>
          {props.summary.timeRange}
        </span>
      </div>

      <div class="space-y-6">
        {/* Summary Text */}
        <div class="p-4 rounded-lg border" style={{
          background: 'rgba(22, 27, 34, 0.5)',
          borderColor: '#333333'
        }}>
          <h4 class="font-medium mb-2" style={{ color: '#f0f6fc' }}>Overview</h4>
          <p class="text-sm whitespace-pre-line" style={{ color: '#c9d1d9' }}>
            {props.summary.summary}
          </p>
        </div>

        {/* Key Insights */}
        <Show when={props.summary.keyInsights && props.summary.keyInsights.length > 0}>
          <div>
            <h4 class="font-medium mb-3" style={{ color: '#f0f6fc' }}>Key Insights</h4>
            <div class="space-y-2">
              <For each={props.summary.keyInsights}>
                {(insight) => (
                  <div class="flex items-start gap-3 p-3 rounded-lg" style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderLeft: '3px solid #3b82f6'
                  }}>
                    <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#3b82f6' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm flex-1" style={{ color: '#c9d1d9' }}>{insight}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Recommendations */}
        <Show when={props.summary.recommendations && props.summary.recommendations.length > 0}>
          <div>
            <h4 class="font-medium mb-3" style={{ color: '#f0f6fc' }}>Recommendations</h4>
            <div class="space-y-2">
              <For each={props.summary.recommendations}>
                {(recommendation) => (
                  <div class="flex items-start gap-3 p-3 rounded-lg" style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderLeft: '3px solid #f59e0b'
                  }}>
                    <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p class="text-sm flex-1" style={{ color: '#c9d1d9' }}>{recommendation}</p>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default MLSummary;

