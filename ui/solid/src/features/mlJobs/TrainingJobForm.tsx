// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { mlJobsService, MLTrainingJobRequest, VolumeMount } from '../../services/mlJobs';
import { api } from '../../services/api';

interface TrainingJobFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const TrainingJobForm: Component<TrainingJobFormProps> = (props) => {
  const [name, setName] = createSignal('');
  const [namespace, setNamespace] = createSignal('default');
  const [script, setScript] = createSignal('');
  const [image, setImage] = createSignal('');
  const [autoBuild, setAutoBuild] = createSignal(false);
  const [cpu, setCpu] = createSignal('1');
  const [memory, setMemory] = createSignal('2Gi');
  const [gpu, setGpu] = createSignal('0');
  const [restartPolicy, setRestartPolicy] = createSignal<'Never' | 'OnFailure' | 'Always'>('Never');
  const [envVars, setEnvVars] = createSignal<Array<{ key: string; value: string }>>([]);
  const [volumeMounts, setVolumeMounts] = createSignal<VolumeMount[]>([]);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const [namespaces] = createResource(api.getNamespaces);
  // TODO: Add PVC API endpoint if needed
  const [pvcs] = createResource(() => namespace(), async () => []);

  const addEnvVar = () => {
    setEnvVars([...envVars(), { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars().filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars()];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const addVolumeMount = () => {
    setVolumeMounts([...volumeMounts(), { name: '', mountPath: '', pvcName: '', readOnly: false }]);
  };

  const removeVolumeMount = (index: number) => {
    setVolumeMounts(volumeMounts().filter((_, i) => i !== index));
  };

  const updateVolumeMount = (index: number, field: keyof VolumeMount, value: string | boolean) => {
    const updated = [...volumeMounts()];
    (updated[index] as any)[field] = value;
    setVolumeMounts(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      // Build env vars map
      const envVarsMap: Record<string, string> = {};
      envVars().forEach(env => {
        if (env.key) {
          envVarsMap[env.key] = env.value;
        }
      });

      const request: MLTrainingJobRequest = {
        name: name(),
        namespace: namespace(),
        script: script() || undefined,
        image: image() || undefined,
        autoBuild: autoBuild(),
        cpu: cpu(),
        memory: memory(),
        gpu: gpu() !== '0' ? gpu() : undefined,
        restartPolicy: restartPolicy(),
        envVars: Object.keys(envVarsMap).length > 0 ? envVarsMap : undefined,
        volumeMounts: volumeMounts().length > 0 ? volumeMounts() : undefined,
        nodeSelector: gpu() !== '0' ? { 'nvidia.com/gpu': 'true' } : undefined,
      };

      const result = await mlJobsService.create(request);
      if (result.success) {
        props.onSuccess?.();
        props.onClose();
      } else {
        setError(result.error || 'Failed to create job');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
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
            <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create ML Training Job</h2>
            <button
              onClick={props.onClose}
              class="text-2xl transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          </div>

          <div class="space-y-6">
            {/* Basic Info */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Job Name *</label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="my-training-job"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                  required
                />
              </div>
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
                  <option value="default">default</option>
                  <For each={namespaces() || []}>
                    {(ns) => (
                      <option value={ns}>{ns}</option>
                    )}
                  </For>
                </select>
              </div>
            </div>

            {/* Script or Image */}
            <div>
              <label class="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={autoBuild()}
                  onChange={(e) => setAutoBuild(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-build Docker image from script</span>
              </label>
            </div>

            <Show when={autoBuild()}>
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Python Script *</label>
                <textarea
                  value={script()}
                  onInput={(e) => setScript(e.currentTarget.value)}
                  placeholder="# Your training script here&#10;import torch&#10;# ..."
                  class="w-full px-3 py-2 rounded-lg font-mono text-sm border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                  rows={10}
                />
              </div>
            </Show>

            <Show when={!autoBuild()}>
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Docker Image *</label>
                <input
                  type="text"
                  value={image()}
                  onInput={(e) => setImage(e.currentTarget.value)}
                  placeholder="pytorch/pytorch:latest"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </Show>

            {/* Resources */}
            <div class="grid grid-cols-3 gap-4">
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
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>GPU</label>
                <input
                  type="text"
                  value={gpu()}
                  onInput={(e) => setGpu(e.currentTarget.value)}
                  placeholder="0"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            {/* Restart Policy */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Restart Policy</label>
              <select
                value={restartPolicy()}
                onChange={(e) => setRestartPolicy(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg border"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="Never">Never</option>
                <option value="OnFailure">On Failure</option>
                <option value="Always">Always</option>
              </select>
            </div>

            {/* Environment Variables */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Environment Variables</label>
                <button
                  onClick={addEnvVar}
                  class="px-3 py-1 text-sm rounded transition-colors"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                >
                  + Add
                </button>
              </div>
              <div class="space-y-2">
                <For each={envVars()}>
                  {(env, index) => (
                    <div class="flex gap-2">
                      <input
                        type="text"
                        value={env.key}
                        onInput={(e) => updateEnvVar(index(), 'key', e.currentTarget.value)}
                        placeholder="KEY"
                        class="flex-1 px-3 py-2 rounded-lg border"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                      <input
                        type="text"
                        value={env.value}
                        onInput={(e) => updateEnvVar(index(), 'value', e.currentTarget.value)}
                        placeholder="value"
                        class="flex-1 px-3 py-2 rounded-lg border"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                      <button
                        onClick={() => removeEnvVar(index())}
                        class="px-3 py-2 rounded transition-colors"
                        style={{ color: 'var(--error-color)', background: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Volume Mounts */}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Volume Mounts</label>
                <button
                  onClick={addVolumeMount}
                  class="px-3 py-1 text-sm rounded transition-colors"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                >
                  + Add
                </button>
              </div>
              <div class="space-y-2">
                <For each={volumeMounts()}>
                  {(vm, index) => (
                    <div class="grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={vm.name}
                        onInput={(e) => updateVolumeMount(index(), 'name', e.currentTarget.value)}
                        placeholder="Volume Name"
                        class="px-3 py-2 rounded-lg border"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                      <input
                        type="text"
                        value={vm.mountPath}
                        onInput={(e) => updateVolumeMount(index(), 'mountPath', e.currentTarget.value)}
                        placeholder="/mnt/data"
                        class="px-3 py-2 rounded-lg border"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)'
                        }}
                      />
                      <select
                        value={vm.pvcName || ''}
                        onChange={(e) => updateVolumeMount(index(), 'pvcName', e.currentTarget.value)}
                        class="px-3 py-2 rounded-lg border"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderColor: 'var(--border-color)'
                        }}
                      >
                        <option value="">Select PVC</option>
                        <For each={pvcs() || []}>
                          {(pvc) => <option value={pvc.name}>{pvc.name}</option>}
                        </For>
                      </select>
                      <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <input
                            type="checkbox"
                            checked={vm.readOnly || false}
                            onChange={(e) => updateVolumeMount(index(), 'readOnly', e.currentTarget.checked)}
                            class="w-4 h-4"
                          />
                          Read-only
                        </label>
                        <button
                          onClick={() => removeVolumeMount(index())}
                          class="px-2 py-1 rounded transition-colors"
                          style={{ color: 'var(--error-color)', background: 'rgba(239, 68, 68, 0.1)' }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </For>
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
                disabled={submitting() || !name()}
                class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                {submitting() ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingJobForm;

