// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For } from 'solid-js';
import { mlflowService, MLflowInstallRequest, MLflowVersions } from '../../services/mlflow';
import { api } from '../../services/api';

interface MLflowInstallWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const MLflowInstallWizard: Component<MLflowInstallWizardProps> = (props) => {
  const [namespace, setNamespace] = createSignal('mlflow');
  const [backendStore, setBackendStore] = createSignal<'minio' | 's3' | 'gcs' | 'pvc'>('pvc');
  const [artifactStore, setArtifactStore] = createSignal<'minio' | 's3' | 'gcs' | 'pvc'>('pvc');
  const [enableUI, setEnableUI] = createSignal(true);
  const [enableIngress, setEnableIngress] = createSignal(false);
  const [cpu, setCpu] = createSignal('500m');
  const [memory, setMemory] = createSignal('1Gi');
  const [version, setVersion] = createSignal('');
  const [installing, setInstalling] = createSignal(false);
  const [error, setError] = createSignal('');

  const [namespaces] = createResource(api.getNamespaces);
  const [versions] = createResource(mlflowService.getVersions);

  const handleInstall = async () => {
    setInstalling(true);
    setError('');

    try {
      const request: MLflowInstallRequest = {
        namespace: namespace(),
        backendStore: backendStore(),
        artifactStore: artifactStore(),
        enableUI: enableUI(),
        enableIngress: enableIngress(),
        cpu: cpu(),
        memory: memory(),
        version: version() || versions()?.latest || '2.8.0',
      };

      const result = await mlflowService.install(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError('Installation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">Install MLflow</h2>
            <button
              onClick={props.onClose}
              class="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div class="space-y-6">
            {/* Namespace */}
            <div>
              <label class="block text-sm font-medium mb-2">Namespace</label>
              <select
                value={namespace()}
                onChange={(e) => setNamespace(e.currentTarget.value)}
                class="w-full px-3 py-2 border rounded-lg"
              >
                <For each={namespaces() || []}>
                  {(ns) => <option value={ns.name}>{ns.name}</option>}
                </For>
              </select>
            </div>

            {/* Backend Store */}
            <div>
              <label class="block text-sm font-medium mb-2">Backend Store</label>
              <select
                value={backendStore()}
                onChange={(e) => setBackendStore(e.currentTarget.value as any)}
                class="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pvc">PVC (Persistent Volume Claim)</option>
                <option value="minio">MinIO</option>
                <option value="s3">Amazon S3</option>
                <option value="gcs">Google Cloud Storage</option>
              </select>
            </div>

            {/* Artifact Store */}
            <div>
              <label class="block text-sm font-medium mb-2">Artifact Store</label>
              <select
                value={artifactStore()}
                onChange={(e) => setArtifactStore(e.currentTarget.value as any)}
                class="w-full px-3 py-2 border rounded-lg"
              >
                <option value="pvc">PVC (Persistent Volume Claim)</option>
                <option value="minio">MinIO</option>
                <option value="s3">Amazon S3</option>
                <option value="gcs">Google Cloud Storage</option>
              </select>
            </div>

            {/* Version */}
            <div>
              <label class="block text-sm font-medium mb-2">Version</label>
              <select
                value={version()}
                onChange={(e) => setVersion(e.currentTarget.value)}
                class="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Latest ({versions()?.latest || '2.8.0'})</option>
                <For each={versions()?.versions || []}>
                  {(v) => <option value={v}>{v}</option>}
                </For>
              </select>
            </div>

            {/* Resource Limits */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">CPU Limit</label>
                <input
                  type="text"
                  value={cpu()}
                  onChange={(e) => setCpu(e.currentTarget.value)}
                  placeholder="500m"
                  class="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Memory Limit</label>
                <input
                  type="text"
                  value={memory()}
                  onChange={(e) => setMemory(e.currentTarget.value)}
                  placeholder="1Gi"
                  class="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Options */}
            <div class="space-y-3">
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableUI()}
                  onChange={(e) => setEnableUI(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm">Enable Tracking UI</span>
              </label>
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableIngress()}
                  onChange={(e) => setEnableIngress(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm">Enable Ingress/Gateway</span>
              </label>
            </div>

            {/* Error */}
            <Show when={error()}>
              <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {error()}
              </div>
            </Show>

            {/* Actions */}
            <div class="flex gap-3 justify-end pt-4 border-t">
              <button
                onClick={props.onClose}
                class="px-6 py-2 rounded-lg border hover:bg-gray-50"
                disabled={installing()}
              >
                Cancel
              </button>
              <button
                onClick={handleInstall}
                disabled={installing()}
                class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {installing() ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLflowInstallWizard;

