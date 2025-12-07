// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show, onMount } from 'solid-js';
import { gpuService, GPUStatus, GPUMetrics } from '../../services/gpu';
import GPUCharts from './GPUCharts';
import GPUInstallWizard from './GPUInstallWizard';

const GPUDashboard: Component = () => {
  const [showWizard, setShowWizard] = createSignal(false);
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  let refreshInterval: number | undefined;

  const [status, { refetch: refetchStatus }] = createResource(
    () => refetchTrigger(),
    async () => {
      return await gpuService.getStatus();
    }
  );

  const [metrics, { refetch: refetchMetrics }] = createResource(
    () => [refetchTrigger(), autoRefresh()],
    async () => {
      if (!status()?.dcgmInstalled) {
        return { metrics: [] };
      }
      return await gpuService.getMetrics();
    }
  );

  onMount(() => {
    // Auto-refresh metrics every 5 seconds
    refreshInterval = setInterval(() => {
      if (autoRefresh()) {
        refetchMetrics();
      }
    }, 5000);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  const handleInstallSuccess = () => {
    setRefetchTrigger(prev => prev + 1);
    setShowWizard(false);
  };

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>GPU Dashboard</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Monitor GPU utilization, memory, temperature, and power consumption
          </p>
        </div>
        <div class="flex gap-2">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh()}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              class="w-4 h-4"
            />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Auto-refresh</span>
          </label>
          <button
            onClick={() => refetchMetrics()}
            class="px-4 py-2 rounded-lg border transition-colors hover:opacity-80"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            Refresh
          </button>
          <Show when={!status()?.dcgmInstalled}>
            <button
              onClick={() => setShowWizard(true)}
              class="px-4 py-2 rounded-lg text-white transition-colors"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Install DCGM Exporter
            </button>
          </Show>
        </div>
      </div>

      <Show when={showWizard()}>
        <GPUInstallWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleInstallSuccess}
        />
      </Show>

      <Show when={status.loading}>
        <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </Show>

      <Show when={!status.loading && status()}>
        <Show when={!status()!.dcgmInstalled}>
          <div class="card p-8 text-center border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <p class="mb-4" style={{ color: 'var(--text-secondary)' }}>DCGM Exporter is not installed</p>
            <p class="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              DCGM Exporter is required to monitor GPU metrics. Install it to view GPU utilization, memory usage, temperature, and power consumption.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              class="px-4 py-2 rounded-lg text-white transition-colors"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Install DCGM Exporter
            </button>
          </div>
        </Show>

        <Show when={status()!.dcgmInstalled}>
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</div>
              <div class="text-lg font-semibold text-green-500">Active</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Namespace</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()!.namespace || 'N/A'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Service URL</div>
              <div class="text-lg font-mono text-xs break-all" style={{ color: 'var(--text-primary)' }}>
                {status()!.serviceURL || 'N/A'}
              </div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>GPUs Monitored</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {metrics()?.metrics.length || 0}
              </div>
            </div>
          </div>

          <Show when={metrics.loading}>
            <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading GPU metrics...</div>
          </Show>

          <Show when={!metrics.loading && metrics()?.metrics && metrics()!.metrics.length > 0}>
            <GPUCharts metrics={metrics()!.metrics} />
          </Show>

          <Show when={!metrics.loading && (!metrics()?.metrics || metrics()!.metrics.length === 0)}>
            <div class="card p-8 text-center border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <p style={{ color: 'var(--text-secondary)' }}>No GPU metrics available</p>
              <p class="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Make sure GPU nodes are available and DCGM exporter is running
              </p>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
};

export default GPUDashboard;

