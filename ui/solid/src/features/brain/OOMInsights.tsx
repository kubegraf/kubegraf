import { Component, For, Show } from 'solid-js';
import { OOMMetrics, ProblematicWorkload } from './types';

interface OOMInsightsProps {
  metrics: OOMMetrics;
}

const OOMInsights: Component<OOMInsightsProps> = (props) => {
  const topProblematic = () => props.metrics.topProblematic.slice(0, 5);

  return (
    <div class="space-y-4">
      <h3 class="text-lg font-bold" style={{ 
        background: 'var(--accent-gradient)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text'
      }}>
        OOM & Reliability Insights
      </h3>

      {/* Metrics Cards */}
      <div class="grid grid-cols-2 gap-3">
        <div class="p-4 rounded-lg" style={{ 
          background: 'var(--glass-gradient)',
          border: '1px solid var(--border-color)'
        }}>
          <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>OOM Incidents</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--error-color)' }}>
            {props.metrics.incidents24h}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Last 24h</div>
        </div>

        <div class="p-4 rounded-lg" style={{ 
          background: 'var(--glass-gradient)',
          border: '1px solid var(--border-color)'
        }}>
          <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>CrashLoops</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--warning-color)' }}>
            {props.metrics.crashLoops24h}
          </div>
          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Last 24h</div>
        </div>
      </div>

      {/* Top Problematic Workloads */}
      <div>
        <h4 class="text-sm font-semibold mb-3" style={{ color: 'var(--accent-primary)' }}>
          Top 5 Problematic Workloads
        </h4>
        <Show 
          when={topProblematic().length > 0}
          fallback={
            <div class="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              No problematic workloads detected
            </div>
          }
        >
          <div class="space-y-2">
            <For each={topProblematic()}>
              {(workload: ProblematicWorkload) => (
                <div 
                  class="p-3 rounded-lg text-sm"
                  style={{ 
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        {workload.name}
                      </div>
                      <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        <span class="capitalize">{workload.kind}</span>
                        {' '}• {workload.namespace}
                      </div>
                    </div>
                    <div class="text-xs font-bold px-2 py-1 rounded" style={{ 
                      background: 'var(--bg-secondary)',
                      color: 'var(--error-color)',
                      border: '1px solid var(--border-color)'
                    }}>
                      Score: {workload.score}
                    </div>
                  </div>
                  <div class="flex gap-4 text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {workload.issues.oomKilled > 0 && (
                      <span>OOM: {workload.issues.oomKilled}</span>
                    )}
                    {workload.issues.restarts > 0 && (
                      <span>Restarts: {workload.issues.restarts}</span>
                    )}
                    {workload.issues.crashLoops > 0 && (
                      <span>CrashLoops: {workload.issues.crashLoops}</span>
                    )}
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

export default OOMInsights;



