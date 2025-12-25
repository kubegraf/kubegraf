// Copyright 2025 KubeGraf Contributors

import { Component, For, Show, createSignal, createEffect, onMount, createResource } from 'solid-js';
import { api, type CustomAppPreviewResponse, type CustomAppDeployResponse } from '../services/api';
import { addNotification } from '../stores/ui';
import Modal from './Modal';
import YAMLViewer from './YAMLViewer';

interface CustomAppDeployWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type WizardStep = 'upload' | 'preview' | 'deploy';

const CustomAppDeployWizard: Component<CustomAppDeployWizardProps> = (props) => {
  const [step, setStep] = createSignal<WizardStep>('upload');
  const [files, setFiles] = createSignal<File[]>([]);
  const [manifests, setManifests] = createSignal<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = createSignal<string>('');
  const [preview, setPreview] = createSignal<CustomAppPreviewResponse | null>(null);
  const [deployResponse, setDeployResponse] = createSignal<CustomAppDeployResponse | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string>('');
  const [isDragging, setIsDragging] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);

  // Fetch namespaces
  const [namespaces] = createResource(
    () => props.isOpen,
    async () => {
      try {
        return await api.getNamespaceNames();
      } catch (err) {
        console.error('Failed to fetch namespaces:', err);
        return ['default'];
      }
    }
  );

  // Reset state when modal opens/closes
  createEffect(() => {
    if (!props.isOpen) {
      setStep('upload');
      setFiles([]);
      setManifests([]);
      setPreview(null);
      setDeployResponse(null);
      setError('');
      setValidationErrors([]);
    }
  });

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);
    const yamlFiles = fileArray.filter(f => f.name.endsWith('.yaml') || f.name.endsWith('.yml') || f.type === 'text/yaml' || f.type === '');

    if (yamlFiles.length !== fileArray.length) {
      setError('Please select only YAML files (.yaml or .yml)');
      return;
    }

    setFiles(yamlFiles);
    setError('');

    // Read files as text
    const fileContents: string[] = [];
    const errors: string[] = [];

    for (const file of yamlFiles) {
      try {
        const text = await file.text();
        // Basic YAML validation - check if it's not empty and can be parsed
        if (text.trim().length === 0) {
          errors.push(`${file.name}: File is empty`);
          continue;
        }
        fileContents.push(text);
      } catch (err) {
        errors.push(`${file.name}: Failed to read file - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setManifests([]);
    } else {
      setValidationErrors([]);
      setManifests(fileContents);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer?.files || null);
  };

  const validateNamespaceName = (ns: string): string | null => {
    if (!ns || ns.trim().length === 0) {
      return 'Namespace name is required';
    }
    // RFC 1123 label format: lowercase alphanumeric characters or '-', and must start and end with alphanumeric character
    const validNamespaceRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!validNamespaceRegex.test(ns)) {
      return 'Namespace name must be a valid DNS label (lowercase alphanumeric characters and hyphens, must start and end with alphanumeric)';
    }
    if (ns.length > 63) {
      return 'Namespace name must be 63 characters or less';
    }
    return null;
  };

  const handlePreview = async () => {
    if (manifests().length === 0) {
      setError('Please upload at least one YAML file');
      return;
    }

    if (!selectedNamespace()) {
      setError('Please enter or select a namespace');
      return;
    }

    const namespaceError = validateNamespaceName(selectedNamespace());
    if (namespaceError) {
      setError(namespaceError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.previewCustomApp(manifests(), selectedNamespace());
      setPreview(response);

      if (response.errors && response.errors.length > 0) {
        setError(response.errors.join('\n'));
      } else {
        setError('');
        setStep('preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview manifests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (manifests().length === 0) {
      setError('No manifests to deploy');
      return;
    }

    if (!selectedNamespace()) {
      setError('Please enter or select a namespace');
      return;
    }

    const namespaceError = validateNamespaceName(selectedNamespace());
    if (namespaceError) {
      setError(namespaceError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.deployCustomApp(manifests(), selectedNamespace());
      setDeployResponse(response);

      if (response.success) {
        addNotification({
          type: 'success',
          message: response.message || `Successfully deployed ${response.resources.length} resources`,
        });
        setStep('deploy');
        if (props.onSuccess) {
          props.onSuccess();
        }
      } else {
        setError(response.errors?.join('\n') || 'Deployment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy manifests');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step() === 'preview') {
      setStep('upload');
    } else if (step() === 'deploy') {
      setStep('preview');
    }
  };

  const handleClose = () => {
    if (!loading()) {
      props.onClose();
    }
  };

  const formatResourceSummary = (resourceCount: Record<string, number>) => {
    const items = Object.entries(resourceCount).map(([kind, count]) => `${count} ${kind}${count !== 1 ? 's' : ''}`);
    if (items.length === 0) return 'No resources';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} title="Custom App Deployment" size="lg">
      <div class="space-y-6">
        {/* Step indicator */}
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step() === 'upload' ? 'bg-[var(--accent-primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}>
              1
            </div>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload</span>
          </div>
          <div class="flex-1 h-0.5 mx-4" style={{ background: step() !== 'upload' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }} />
          <div class="flex items-center gap-2">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step() === 'preview' ? 'bg-[var(--accent-primary)] text-black' : step() === 'deploy' ? 'bg-[var(--accent-primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}>
              2
            </div>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Preview</span>
          </div>
          <div class="flex-1 h-0.5 mx-4" style={{ background: step() === 'deploy' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }} />
          <div class="flex items-center gap-2">
            <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step() === 'deploy' ? 'bg-[var(--accent-primary)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}>
              3
            </div>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Deploy</span>
          </div>
        </div>

        {/* Upload Step */}
        <Show when={step() === 'upload'}>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Namespace
              </label>
              <div class="space-y-2">
                <input
                  type="text"
                  value={selectedNamespace()}
                  onInput={(e) => setSelectedNamespace(e.currentTarget.value)}
                  placeholder="Enter namespace name (e.g., my-app-ns)"
                  class="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                />
                <div class="flex items-center gap-2">
                  <span class="text-xs" style={{ color: 'var(--text-muted)' }}>Or select existing:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      if (value) {
                        setSelectedNamespace(value);
                        e.currentTarget.value = '';
                      }
                    }}
                    class="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  >
                    <option value="">Select existing namespace...</option>
                    <Show when={!namespaces.loading}>
                      <For each={namespaces() || []}>
                        {(ns) => (
                          <option value={ns}>{ns}</option>
                        )}
                      </For>
                    </Show>
                  </select>
                </div>
                <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedNamespace() ? (
                    <>Namespace: <span class="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{selectedNamespace()}</span> {(namespaces() || []).includes(selectedNamespace()) ? '(exists)' : '(will be created)'}</>
                  ) : (
                    'Enter a namespace name above or select an existing one'
                  )}
                </p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Kubernetes Manifests (YAML files)
              </label>
              <div
                class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging() ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10' : 'border-[var(--border-color)]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept=".yaml,.yml,text/yaml"
                  onChange={(e) => handleFileSelect(e.currentTarget.files)}
                  class="hidden"
                  id="yaml-file-input"
                />
                <label for="yaml-file-input" class="cursor-pointer">
                  <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p class="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                    Drag and drop YAML files here, or click to select
                  </p>
                  <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Supports multiple YAML files (.yaml, .yml)
                  </p>
                </label>
              </div>

              <Show when={files().length > 0}>
                <div class="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <p class="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Selected files ({files().length}):
                  </p>
                  <ul class="space-y-1">
                    <For each={files()}>
                      {(file) => (
                        <li class="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              </Show>

              <Show when={validationErrors().length > 0}>
                <div class="mt-4 p-4 rounded-lg border-l-4" style={{ background: 'rgba(239, 68, 68, 0.1)', 'border-left-color': '#ef4444' }}>
                  <p class="text-sm font-medium mb-2" style={{ color: '#ef4444' }}>Validation Errors:</p>
                  <ul class="text-sm space-y-1" style={{ color: '#ef4444' }}>
                    <For each={validationErrors()}>
                      {(err) => <li>• {err}</li>}
                    </For>
                  </ul>
                </div>
              </Show>
            </div>

            <Show when={error()}>
              <div class="p-4 rounded-lg border-l-4" style={{ background: 'rgba(239, 68, 68, 0.1)', 'border-left-color': '#ef4444' }}>
                <p class="text-sm" style={{ color: '#ef4444' }}>{error()}</p>
              </div>
            </Show>

            <div class="flex justify-end gap-3 pt-4">
              <button
                onClick={props.onClose}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={manifests().length === 0 || loading() || validationErrors().length > 0 || !selectedNamespace() || !selectedNamespace().trim()}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                {loading() ? 'Previewing...' : 'Preview Changes'}
              </button>
            </div>
          </div>
        </Show>

        {/* Preview Step */}
        <Show when={step() === 'preview'}>
          <div class="space-y-4">
            <Show when={preview()}>
              {(previewData) => (
                <>
                  <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                    <h3 class="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                      Deployment Summary
                    </h3>
                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Total Resources:</span>
                        <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {previewData().resources.length}
                        </span>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Namespace:</span>
                        <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {selectedNamespace()}
                        </span>
                      </div>
                      <div class="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Resources:</span>
                        <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatResourceSummary(previewData().resourceCount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Show when={previewData().warnings && previewData().warnings.length > 0}>
                    <div class="p-4 rounded-lg border-l-4" style={{ background: 'rgba(245, 158, 11, 0.1)', 'border-left-color': '#f59e0b' }}>
                      <p class="text-sm font-medium mb-2" style={{ color: '#f59e0b' }}>Warnings:</p>
                      <ul class="text-sm space-y-1" style={{ color: '#f59e0b' }}>
                        <For each={previewData().warnings}>
                          {(warning) => <li>• {warning}</li>}
                        </For>
                      </ul>
                    </div>
                  </Show>

                  <div>
                    <h3 class="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Resources to be Created
                    </h3>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                      <For each={previewData().resources}>
                        {(resource) => (
                          <div class="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                            <div class="flex items-center justify-between">
                              <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {resource.kind}/{resource.name}
                              </span>
                              <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {resource.namespace || 'cluster-scoped'}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>

                  <div>
                    <h3 class="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      YAML Preview
                    </h3>
                    <div class="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                      <YAMLViewer yaml={previewData().manifests.join('\n---\n')} />
                    </div>
                  </div>
                </>
              )}
            </Show>

            <Show when={error()}>
              <div class="p-4 rounded-lg border-l-4" style={{ background: 'rgba(239, 68, 68, 0.1)', 'border-left-color': '#ef4444' }}>
                <p class="text-sm" style={{ color: '#ef4444' }}>{error()}</p>
              </div>
            </Show>

            <div class="flex justify-between gap-3 pt-4">
              <button
                onClick={handleBack}
                disabled={loading()}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Back
              </button>
              <div class="flex gap-3">
                <button
                  onClick={props.onClose}
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!preview()?.success || loading() || (preview()?.errors?.length || 0) > 0}
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                >
                  {loading() ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Deploy Step */}
        <Show when={step() === 'deploy'}>
          <div class="space-y-4">
            <Show when={deployResponse()}>
              {(response) => (
                <>
                  <Show when={response().success}>
                    <div class="p-6 rounded-lg text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                      <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 class="text-lg font-semibold mb-2" style={{ color: '#22c55e' }}>
                        Deployment Successful!
                      </h3>
                      <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        {response().message || `Successfully deployed ${response().resources.length} resources`}
                      </p>
                      <div class="text-xs p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Deployment ID: </span>
                        <span class="font-mono" style={{ color: 'var(--text-primary)' }}>{response().deploymentId}</span>
                      </div>
                    </div>

                    <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <h3 class="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                        Deployed Resources
                      </h3>
                      <div class="space-y-2">
                        <div class="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                          <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {response().resources.length} resources
                          </span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-secondary)' }}>Breakdown:</span>
                          <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatResourceSummary(response().resourceCount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-2 max-h-60 overflow-y-auto">
                      <For each={response().resources}>
                        {(resource) => (
                          <div class="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)' }}>
                            <div class="flex items-center justify-between">
                              <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {resource.kind}/{resource.name}
                              </span>
                              <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {resource.namespace || 'cluster-scoped'}
                              </span>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={!response().success}>
                    <div class="p-6 rounded-lg border-l-4" style={{ background: 'rgba(239, 68, 68, 0.1)', 'border-left-color': '#ef4444' }}>
                      <h3 class="text-lg font-semibold mb-2" style={{ color: '#ef4444' }}>
                        Deployment Failed
                      </h3>
                      <Show when={response().errors && response().errors.length > 0}>
                        <ul class="text-sm space-y-1 mt-2" style={{ color: '#ef4444' }}>
                          <For each={response().errors}>
                            {(err) => <li>• {err}</li>}
                          </For>
                        </ul>
                      </Show>
                    </div>
                  </Show>
                </>
              )}
            </Show>

            <div class="flex justify-end gap-3 pt-4">
              <button
                onClick={props.onClose}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                Close
              </button>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
};

export default CustomAppDeployWizard;

