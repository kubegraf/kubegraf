// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, Show, For } from 'solid-js';
import { feastService, FeastInstallRequest, OnlineStoreSpec, OfflineStoreSpec } from '../../services/feast';
import { api } from '../../services/api';

interface FeastInstallWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const FeastInstallWizard: Component<FeastInstallWizardProps> = (props) => {
  const [namespace, setNamespace] = createSignal('feast');
  const [version, setVersion] = createSignal('0.38.0');
  const [onlineStoreType, setOnlineStoreType] = createSignal<'redis' | 'bigquery'>('redis');
  const [offlineStoreType, setOfflineStoreType] = createSignal<'file' | 'pvc' | 'bigquery' | 'snowflake'>('file');
  const [cpu, setCpu] = createSignal('1');
  const [memory, setMemory] = createSignal('2Gi');
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  // Redis config
  const [redisHost, setRedisHost] = createSignal('redis');
  const [redisPort, setRedisPort] = createSignal(6379);
  const [redisPassword, setRedisPassword] = createSignal('');

  // BigQuery config
  const [bqProjectId, setBqProjectId] = createSignal('');
  const [bqDataset, setBqDataset] = createSignal('');

  // File store config
  const [filePath, setFilePath] = createSignal('/data/feast');

  // PVC config
  const [pvcName, setPvcName] = createSignal('');
  const [pvcMountPath, setPvcMountPath] = createSignal('/data/feast');

  const [namespaces] = createResource(api.getNamespaces);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      // Build online store spec
      let onlineStore: OnlineStoreSpec;
      if (onlineStoreType() === 'redis') {
        onlineStore = {
          type: 'redis',
          redis: {
            host: redisHost(),
            port: redisPort(),
            password: redisPassword() || undefined,
          },
        };
      } else {
        onlineStore = {
          type: 'bigquery',
          bigquery: {
            projectId: bqProjectId(),
            dataset: bqDataset(),
          },
        };
      }

      // Build offline store spec
      let offlineStore: OfflineStoreSpec;
      if (offlineStoreType() === 'file') {
        offlineStore = {
          type: 'file',
          file: {
            path: filePath(),
          },
        };
      } else if (offlineStoreType() === 'pvc') {
        offlineStore = {
          type: 'pvc',
          pvc: {
            pvcName: pvcName(),
            mountPath: pvcMountPath(),
          },
        };
      } else if (offlineStoreType() === 'bigquery') {
        offlineStore = {
          type: 'bigquery',
          bigquery: {
            projectId: bqProjectId(),
            dataset: bqDataset(),
          },
        };
      } else {
        offlineStore = {
          type: 'snowflake',
          snowflake: {
            account: '',
            database: '',
            schema: '',
            warehouse: '',
            username: '',
          },
        };
      }

      const request: FeastInstallRequest = {
        namespace: namespace(),
        version: version(),
        onlineStore,
        offlineStore,
        cpu: cpu(),
        memory: memory(),
      };

      const result = await feastService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || 'Failed to install Feast');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install Feast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 border" style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)'
      }}>
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Install Feast Feature Store</h2>
            <button
              onClick={props.onClose}
              class="text-2xl transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          </div>

          <div class="space-y-6">
            {/* Basic Configuration */}
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
                  <option value="feast">feast</option>
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
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            {/* Online Store */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Online Store</label>
              <select
                value={onlineStoreType()}
                onChange={(e) => setOnlineStoreType(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg border mb-2"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="redis">Redis</option>
                <option value="bigquery">BigQuery</option>
              </select>
              <Show when={onlineStoreType() === 'redis'}>
                <div class="grid grid-cols-3 gap-4 ml-4">
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Host</label>
                    <input
                      type="text"
                      value={redisHost()}
                      onInput={(e) => setRedisHost(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Port</label>
                    <input
                      type="number"
                      value={redisPort()}
                      onInput={(e) => setRedisPort(parseInt(e.currentTarget.value) || 6379)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password (optional)</label>
                    <input
                      type="password"
                      value={redisPassword()}
                      onInput={(e) => setRedisPassword(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                </div>
              </Show>
              <Show when={onlineStoreType() === 'bigquery'}>
                <div class="grid grid-cols-2 gap-4 ml-4">
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Project ID</label>
                    <input
                      type="text"
                      value={bqProjectId()}
                      onInput={(e) => setBqProjectId(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Dataset</label>
                    <input
                      type="text"
                      value={bqDataset()}
                      onInput={(e) => setBqDataset(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                </div>
              </Show>
            </div>

            {/* Offline Store */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Offline Store</label>
              <select
                value={offlineStoreType()}
                onChange={(e) => setOfflineStoreType(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg border mb-2"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="file">File</option>
                <option value="pvc">PVC</option>
                <option value="bigquery">BigQuery</option>
                <option value="snowflake">Snowflake</option>
              </select>
              <Show when={offlineStoreType() === 'file'}>
                <div class="ml-4">
                  <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Path</label>
                  <input
                    type="text"
                    value={filePath()}
                    onInput={(e) => setFilePath(e.currentTarget.value)}
                    class="w-full px-3 py-2 rounded-lg border"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>
              </Show>
              <Show when={offlineStoreType() === 'pvc'}>
                <div class="grid grid-cols-2 gap-4 ml-4">
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>PVC Name</label>
                    <input
                      type="text"
                      value={pvcName()}
                      onInput={(e) => setPvcName(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Mount Path</label>
                    <input
                      type="text"
                      value={pvcMountPath()}
                      onInput={(e) => setPvcMountPath(e.currentTarget.value)}
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                </div>
              </Show>
            </div>

            {/* Resources */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>CPU</label>
                <input
                  type="text"
                  value={cpu()}
                  onInput={(e) => setCpu(e.currentTarget.value)}
                  placeholder="1"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Memory</label>
                <input
                  type="text"
                  value={memory()}
                  onInput={(e) => setMemory(e.currentTarget.value)}
                  placeholder="2Gi"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            {/* Error */}
            <Show when={error()}>
              <div class="rounded-lg p-3 text-sm border" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'var(--error-color)',
                color: 'var(--error-color)'
              }}>
                {error()}
              </div>
            </Show>

            {/* Actions */}
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
                {submitting() ? 'Installing...' : 'Install Feast'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeastInstallWizard;

