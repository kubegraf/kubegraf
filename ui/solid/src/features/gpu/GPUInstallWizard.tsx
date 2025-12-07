// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, Show, For } from 'solid-js';
import { gpuService, GPUInstallRequest } from '../../services/gpu';
import { api } from '../../services/api';

interface GPUInstallWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const GPUInstallWizard: Component<GPUInstallWizardProps> = (props) => {
  const [namespace, setNamespace] = createSignal('gpu-operator');
  const [version, setVersion] = createSignal('latest');
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const [namespaces] = createResource(api.getNamespaces);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const request: GPUInstallRequest = {
        namespace: namespace(),
        version: version() || undefined,
      };

      const result = await gpuService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || 'Failed to install DCGM exporter');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install DCGM exporter');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="rounded-lg shadow-xl max-w-2xl w-full m-4 border" style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}>
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Install DCGM Exporter</h2>
            <button
              onClick={props.onClose}
              class="text-2xl transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          </div>

          <div class="space-y-6">
            <div class="rounded-lg p-4 border" style={{
              background: 'rgba(6, 182, 212, 0.1)',
              borderColor: 'var(--accent-primary)'
            }}>
              <p class="text-sm" style={{ color: 'var(--text-primary)' }}>
                DCGM (Data Center GPU Manager) Exporter provides GPU metrics including utilization, memory usage, temperature, and power consumption.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Namespace</label>
                <select
                  value={namespace()}
                  onChange={(e) => setNamespace(e.currentTarget.value)}
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                >
                  <option value="gpu-operator">gpu-operator</option>
                  <For each={namespaces() || []}>
                    {(ns) => (
                      <option value={ns}>{ns}</option>
                    )}
                  </For>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Version</label>
                <input
                  type="text"
                  value={version()}
                  onInput={(e) => setVersion(e.currentTarget.value)}
                  placeholder="latest"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            <Show when={error()}>
              <div class="rounded-lg p-3 text-sm border" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'var(--error-color)',
                color: 'var(--error-color)'
              }}>
                {error()}
              </div>
            </Show>

            <div class="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={props.onClose}
                class="px-6 py-2 rounded-lg border transition-colors hover:opacity-80"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
                disabled={submitting()}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting()}
                class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                {submitting() ? 'Installing...' : 'Install DCGM Exporter'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPUInstallWizard;

