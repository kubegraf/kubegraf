// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { inferenceService, InferenceServiceRequest, HPASpec, IngressSpec, StorageSpec } from '../../services/inference';
import { api } from '../../services/api';

interface InferenceServiceFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const InferenceServiceForm: Component<InferenceServiceFormProps> = (props) => {
  const [name, setName] = createSignal('');
  const [namespace, setNamespace] = createSignal('default');
  const [modelFile, setModelFile] = createSignal<File | null>(null);
  const [runtime, setRuntime] = createSignal<'fastapi' | 'mlserver' | 'bentoml' | 'kserve'>('fastapi');
  const [cpu, setCpu] = createSignal('1');
  const [memory, setMemory] = createSignal('2Gi');
  const [gpu, setGpu] = createSignal('0');
  const [replicas, setReplicas] = createSignal(1);
  const [hpaEnabled, setHpaEnabled] = createSignal(false);
  const [hpaMin, setHpaMin] = createSignal(1);
  const [hpaMax, setHpaMax] = createSignal(3);
  const [hpaTargetCPU, setHpaTargetCPU] = createSignal(70);
  const [ingressEnabled, setIngressEnabled] = createSignal(false);
  const [ingressHost, setIngressHost] = createSignal('');
  const [ingressPath, setIngressPath] = createSignal('/');
  const [ingressTLS, setIngressTLS] = createSignal(false);
  const [storageType, setStorageType] = createSignal<'pvc' | 'minio' | 's3'>('pvc');
  const [storagePVC, setStoragePVC] = createSignal('');
  const [envVars, setEnvVars] = createSignal<Array<{ key: string; value: string }>>([]);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const [namespaces] = createResource(api.getNamespaces);

  const handleFileChange = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      setModelFile(target.files[0]);
    }
  };

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

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    if (!modelFile()) {
      setError('Please select a model file');
      setSubmitting(false);
      return;
    }

    try {
      // Read file as base64
      const file = modelFile()!;
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const base64Content = (e.target?.result as string).split(',')[1] || e.target?.result as string;

          // Build env vars map
          const envVarsMap: Record<string, string> = {};
          envVars().forEach(env => {
            if (env.key) {
              envVarsMap[env.key] = env.value;
            }
          });

          // Build HPA spec
          let hpa: HPASpec | undefined;
          if (hpaEnabled()) {
            hpa = {
              enabled: true,
              minReplicas: hpaMin(),
              maxReplicas: hpaMax(),
              targetCPU: hpaTargetCPU(),
            };
          }

          // Build Ingress spec
          let ingress: IngressSpec | undefined;
          if (ingressEnabled()) {
            ingress = {
              enabled: true,
              host: ingressHost() || undefined,
              path: ingressPath() || '/',
              tls: ingressTLS(),
            };
          }

          // Build Storage spec
          let storage: StorageSpec | undefined;
          if (storageType() === 'pvc' && storagePVC()) {
            storage = {
              type: 'pvc',
              pvcName: storagePVC(),
              mountPath: '/models',
            };
          } else if (storageType() !== 'pvc') {
            storage = {
              type: storageType(),
              mountPath: '/models',
            };
          }

          const request: InferenceServiceRequest = {
            name: name(),
            namespace: namespace(),
            modelFile: base64Content,
            modelFileName: file.name,
            runtime: runtime(),
            cpu: cpu(),
            memory: memory(),
            gpu: gpu() !== '0' ? gpu() : undefined,
            replicas: replicas(),
            hpa,
            ingress,
            storage,
            envVars: Object.keys(envVarsMap).length > 0 ? envVarsMap : undefined,
          };

          const result = await inferenceService.create(request);
          if (result.success) {
            props.onSuccess?.();
            props.onClose();
          } else {
            setError(result.error || 'Failed to create inference service');
          }
        } catch (err: any) {
          setError(err.message || 'Failed to process model file');
        } finally {
          setSubmitting(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read model file');
        setSubmitting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Failed to create inference service');
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
            <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Deploy Model Inference Service</h2>
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
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Service Name *</label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="my-inference-service"
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

            {/* Model File Upload */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Model File * (.pt, .onnx, .pickle, .h5)</label>
              <input
                type="file"
                accept=".pt,.onnx,.pickle,.h5,.pkl"
                onChange={handleFileChange}
                class="w-full px-3 py-2 rounded-lg border"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              />
              <Show when={modelFile()}>
                <p class="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Selected: {modelFile()?.name} ({(modelFile()?.size || 0) / 1024} KB)
                </p>
              </Show>
            </div>

            {/* Runtime Selection */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Runtime *</label>
              <select
                value={runtime()}
                onChange={(e) => setRuntime(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg border"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="fastapi">FastAPI + Custom Handler</option>
                <option value="mlserver">MLServer</option>
                <option value="bentoml">BentoML</option>
                <option value="kserve">KServe (lite)</option>
              </select>
            </div>

            {/* Resources */}
            <div class="grid grid-cols-4 gap-4">
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
              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Replicas</label>
                <input
                  type="number"
                  value={replicas()}
                  onInput={(e) => setReplicas(parseInt(e.currentTarget.value) || 1)}
                  min="1"
                  class="w-full px-3 py-2 rounded-lg border"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </div>
            </div>

            {/* HPA Configuration */}
            <div>
              <label class="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={hpaEnabled()}
                  onChange={(e) => setHpaEnabled(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enable Horizontal Pod Autoscaler (HPA)</span>
              </label>
              <Show when={hpaEnabled()}>
                <div class="grid grid-cols-3 gap-4 mt-4 ml-6">
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Min Replicas</label>
                    <input
                      type="number"
                      value={hpaMin()}
                      onInput={(e) => setHpaMin(parseInt(e.currentTarget.value) || 1)}
                      min="1"
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Max Replicas</label>
                    <input
                      type="number"
                      value={hpaMax()}
                      onInput={(e) => setHpaMax(parseInt(e.currentTarget.value) || 3)}
                      min="1"
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Target CPU %</label>
                    <input
                      type="number"
                      value={hpaTargetCPU()}
                      onInput={(e) => setHpaTargetCPU(parseInt(e.currentTarget.value) || 70)}
                      min="1"
                      max="100"
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

            {/* Ingress Configuration */}
            <div>
              <label class="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={ingressEnabled()}
                  onChange={(e) => setIngressEnabled(e.currentTarget.checked)}
                  class="w-4 h-4"
                />
                <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Enable Ingress/Gateway</span>
              </label>
              <Show when={ingressEnabled()}>
                <div class="grid grid-cols-3 gap-4 mt-4 ml-6">
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Host</label>
                    <input
                      type="text"
                      value={ingressHost()}
                      onInput={(e) => setIngressHost(e.currentTarget.value)}
                      placeholder="inference.example.com"
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Path</label>
                    <input
                      type="text"
                      value={ingressPath()}
                      onInput={(e) => setIngressPath(e.currentTarget.value)}
                      placeholder="/"
                      class="w-full px-3 py-2 rounded-lg border"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-color)'
                      }}
                    />
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={ingressTLS()}
                        onChange={(e) => setIngressTLS(e.currentTarget.checked)}
                        class="w-4 h-4"
                      />
                      <span class="text-sm" style={{ color: 'var(--text-primary)' }}>TLS</span>
                    </label>
                  </div>
                </div>
              </Show>
            </div>

            {/* Storage Configuration */}
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Model Storage</label>
              <select
                value={storageType()}
                onChange={(e) => setStorageType(e.currentTarget.value as any)}
                class="w-full px-3 py-2 rounded-lg border mb-2"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <option value="pvc">PVC (Persistent Volume Claim)</option>
                <option value="minio">MinIO</option>
                <option value="s3">S3</option>
              </select>
              <Show when={storageType() === 'pvc'}>
                <input
                  type="text"
                  value={storagePVC()}
                  onInput={(e) => setStoragePVC(e.currentTarget.value)}
                  placeholder="PVC Name (optional)"
                  class="w-full px-3 py-2 rounded-lg border mt-2"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-color)'
                  }}
                />
              </Show>
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
                disabled={submitting() || !name() || !modelFile()}
                class="px-6 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                {submitting() ? 'Deploying...' : 'Deploy Service'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InferenceServiceForm;

