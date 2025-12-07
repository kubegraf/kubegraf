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
        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text'
      }}>
        OOM & Reliability Insights
      </h3>

      {/* Metrics Cards */}
      <div class="grid grid-cols-2 gap-3">
        <div class="p-4 rounded-lg" style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div class="text-xs mb-1" style={{ color: '#8b949e' }}>OOM Incidents</div>
          <div class="text-2xl font-bold" style={{ color: '#ef4444' }}>
            {props.metrics.incidents24h}
          </div>
          <div class="text-xs mt-1" style={{ color: '#6b7280' }}>Last 24h</div>
        </div>

        <div class="p-4 rounded-lg" style={{ 
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          <div class="text-xs mb-1" style={{ color: '#8b949e' }}>CrashLoops</div>
          <div class="text-2xl font-bold" style={{ color: '#f59e0b' }}>
            {props.metrics.crashLoops24h}
          </div>
          <div class="text-xs mt-1" style={{ color: '#6b7280' }}>Last 24h</div>
        </div>
      </div>

      {/* Top Problematic Workloads */}
      <div>
        <h4 class="text-sm font-semibold mb-3" style={{ color: '#0ea5e9' }}>
          Top 5 Problematic Workloads
        </h4>
        <Show 
          when={topProblematic().length > 0}
          fallback={
            <div class="text-center py-4 text-sm" style={{ color: '#8b949e' }}>
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
                    background: 'rgba(22, 27, 34, 0.5)',
                    border: '1px solid #333333'
                  }}
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold" style={{ color: '#0ea5e9' }}>
                        {workload.name}
                      </div>
                      <div class="text-xs mt-1" style={{ color: '#8b949e' }}>
                        <span class="capitalize">{workload.kind}</span>
                        {' '}• {workload.namespace}
                      </div>
                    </div>
                    <div class="text-xs font-bold px-2 py-1 rounded" style={{ 
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444'
                    }}>
                      Score: {workload.score}
                    </div>
                  </div>
                  <div class="flex gap-4 text-xs mt-2" style={{ color: '#6b7280' }}>
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


