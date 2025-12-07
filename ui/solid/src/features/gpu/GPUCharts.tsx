// Copyright 2025 KubeGraf Contributors

import { Component, For, Show } from 'solid-js';
import { GPUMetrics } from '../../services/gpu';

interface GPUChartsProps {
  metrics: GPUMetrics[];
}

const GPUCharts: Component<GPUChartsProps> = (props) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div class="space-y-6">
      <For each={props.metrics}>
        {(metric) => (
          <div class="card rounded-lg p-6 border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {metric.nodeName} - GPU {metric.gpuId}
                </h3>
                <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Last updated: {new Date(metric.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Utilization */}
              <div>
                <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Utilization</div>
                <div class="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {metric.utilization.toFixed(1)}%
                </div>
                <div class="w-full h-2 rounded-full mt-2" style={{ background: 'var(--bg-secondary)' }}>
                  <div
                    class="h-2 rounded-full transition-all"
                    style={{
                      background: 'var(--accent-primary)',
                      width: `${Math.min(metric.utilization, 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Memory */}
              <div>
                <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Memory</div>
                <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatBytes(metric.memoryUsed)}
                </div>
                <div class="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  / {formatBytes(metric.memoryTotal)}
                </div>
                <div class="w-full h-2 rounded-full mt-2" style={{ background: 'var(--bg-secondary)' }}>
                  <div
                    class="h-2 rounded-full transition-all"
                    style={{
                      background: metric.memoryUsed / metric.memoryTotal > 0.8 ? 'var(--error-color)' : 'var(--accent-primary)',
                      width: `${Math.min((metric.memoryUsed / metric.memoryTotal) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Temperature */}
              <div>
                <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Temperature</div>
                <div class="text-2xl font-bold" style={{
                  color: metric.temperature > 80 ? 'var(--error-color)' : metric.temperature > 60 ? '#f59e0b' : 'var(--text-primary)'
                }}>
                  {metric.temperature.toFixed(1)}°C
                </div>
              </div>

              {/* Power Draw */}
              <div>
                <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Power Draw</div>
                <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {metric.powerDraw.toFixed(1)}W
                </div>
              </div>
            </div>

            {/* Processes */}
            <Show when={metric.processes && metric.processes.length > 0}>
              <div class="mt-6">
                <div class="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Running Processes</div>
                <div class="space-y-2">
                  <For each={metric.processes}>
                    {(process) => (
                      <div class="flex items-center justify-between p-2 rounded border" style={{
                        background: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)'
                      }}>
                        <div>
                          <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{process.name}</div>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>PID: {process.pid}</div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatBytes(process.memory)}
                          </div>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {process.utilization.toFixed(1)}% GPU
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

export default GPUCharts;

