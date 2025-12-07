// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, Show } from 'solid-js';
import { mlflowService, MLflowStatus } from '../../services/mlflow';

const MLflowPanel: Component = () => {
  const [status, { refetch }] = createResource(mlflowService.getStatus);
  const [showUI, setShowUI] = createSignal(false);

  const openUI = () => {
    if (status()?.installed && status()?.serviceName) {
      // Open MLflow UI via port-forward proxy
      const url = `/api/mlflow/proxy/?namespace=${status()?.namespace || 'mlflow'}`;
      window.open(url, '_blank');
    }
  };

  const restartPods = async () => {
    if (!status()?.installed) return;
    
    try {
      // Restart deployment by scaling down and up
      const response = await fetch(`/api/deployments/${status()?.namespace}/${status()?.deployment}/restart`, {
        method: 'POST',
      });
      if (response.ok) {
        alert('MLflow pods are restarting...');
        setTimeout(() => refetch(), 5000);
      }
    } catch (error) {
      console.error('Failed to restart pods:', error);
      alert('Failed to restart pods');
    }
  };

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>MLflow</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Open source platform for managing the ML lifecycle
          </p>
        </div>
        <Show when={status()?.installed}>
          <button
            onClick={() => refetch()}
            class="px-4 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Refresh
          </button>
        </Show>
      </div>

      <Show when={status.loading}>
        <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading MLflow status...</div>
      </Show>

      <Show when={status.error}>
        <div class="rounded-lg p-4 border" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'var(--error-color)',
          color: 'var(--error-color)'
        }}>
          Error: {status.error?.message || 'Failed to load MLflow status'}
        </div>
      </Show>

      <Show when={!status.loading && !status()?.installed}>
        <div class="card p-8 text-center border" style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}>
          <p class="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>MLflow is not installed</p>
          <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Install MLflow from the Marketplace → ML Apps section
          </p>
          <a
            href="/apps?tab=marketplace&category=ML Apps"
            class="inline-block px-6 py-2 rounded-lg text-white transition-colors hover:opacity-80"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Go to Marketplace
          </a>
        </div>
      </Show>

      <Show when={status()?.installed}>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</div>
              <div class="text-lg font-semibold text-green-500">Installed</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Version</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.version || 'Unknown'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Namespace</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.namespace || 'N/A'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Deployment</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.deployment || 'N/A'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Service</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.serviceName || 'N/A'}</div>
            </div>
            <Show when={status()?.backendStore}>
              <div class="card rounded-lg p-4 border" style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)'
              }}>
                <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Backend Store</div>
                <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.backendStore || 'N/A'}</div>
              </div>
            </Show>
            <Show when={status()?.artifactStore}>
              <div class="card rounded-lg p-4 border" style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-color)'
              }}>
                <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Artifact Store</div>
                <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()?.artifactStore || 'N/A'}</div>
              </div>
            </Show>
          </div>

          <div class="flex gap-3">
            <button
              onClick={openUI}
              class="px-6 py-2 rounded-lg text-white transition-colors hover:opacity-80"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Open Tracking UI
            </button>
            <button
              onClick={restartPods}
              class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              Restart Pods
            </button>
          </div>

          <div class="card rounded-lg p-4 border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <h3 class="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Links</h3>
            <div class="space-y-2 text-sm">
              <a
                href={`/api/mlflow/proxy/?namespace=${status()?.namespace || 'mlflow'}`}
                target="_blank"
                class="block transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                → MLflow Tracking UI
              </a>
              <a
                href={`/api/mlflow/proxy/api/2.0/mlflow/experiments/search?namespace=${status()?.namespace || 'mlflow'}`}
                target="_blank"
                class="block transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                → MLflow API (Experiments)
              </a>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default MLflowPanel;

