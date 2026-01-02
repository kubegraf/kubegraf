import { Component, createResource, Show } from 'solid-js';
import Modal from './Modal';
import { api } from '../services/api';

interface DescribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'pod' | 'deployment' | 'service' | 'node' | 'statefulset' | 'daemonset' | 'configmap' | 'secret' | 'ingress' | 'cronjob' | 'job' | 'helmrelease' | 'argocdapp';
  name: string;
  namespace?: string;
  getDescribe?: (name: string, namespace?: string) => Promise<{ describe: string; success: boolean }>;
}

const DescribeModal: Component<DescribeModalProps> = (props) => {
  const [describe] = createResource(
    () => ({ type: props.resourceType, name: props.name, ns: props.namespace, open: props.isOpen }),
    async (params) => {
      if (!params.open || !params.name) return '';
      
      // Handle Helm and ArgoCD with custom API methods
      if (params.type === 'helmrelease') {
        if (!params.ns) throw new Error('Namespace is required for Helm releases');
        const result = await api.getHelmReleaseDescribe(params.name, params.ns);
        return result.describe || '';
      }
      
      if (params.type === 'argocdapp') {
        if (!params.ns) throw new Error('Namespace is required for ArgoCD apps');
        const result = await api.getArgoCDAppDescribe(params.name, params.ns);
        return result.describe || '';
      }
      
      // Handle custom getDescribe function if provided
      if (props.getDescribe) {
        const result = await props.getDescribe(params.name, params.ns);
        return result.describe || '';
      }
      
      // Default behavior for standard Kubernetes resources
      const nsParam = params.ns ? `&namespace=${params.ns}` : '';
      const res = await fetch(`/api/${params.type}/describe?name=${params.name}${nsParam}`);
      if (!res.ok) throw new Error('Failed to fetch describe output');
      const data = await res.json();
      return data.describe || '';
    }
  );

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(describe() || '');
  };

  // Simple syntax highlighting for describe output - theme aware
  const highlightDescribe = (text: string) => {
    if (!text) return '';
    return text
      .split('\n')
      .map((line) => {
        // Section headers (e.g., "Name:", "Namespace:")
        const headerMatch = line.match(/^([A-Za-z][A-Za-z\s]+):\s*(.*)$/);
        if (headerMatch && line.indexOf(':') < 30) {
          const [, key, value] = headerMatch;
          return `<span style="color: var(--accent-primary)">${escapeHtml(key)}:</span> <span style="color: var(--text-primary) !important">${escapeHtml(value)}</span>`;
        }
        // Indented key-value pairs
        const kvMatch = line.match(/^(\s+)([A-Za-z][A-Za-z\s-]+):\s*(.*)$/);
        if (kvMatch) {
          const [, indent, key, value] = kvMatch;
          return `${indent}<span style="color: var(--accent-secondary)">${escapeHtml(key)}:</span> <span style="color: var(--text-primary) !important">${escapeHtml(value)}</span>`;
        }
        // Default: ensure all text has proper color
        return `<span style="color: var(--text-primary) !important">${escapeHtml(line)}</span>`;
      })
      .join('\n');
  };

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Describe: ${props.name}`} size="xl">
      <div class="flex flex-col h-[60vh]">
        {/* Toolbar */}
        <div class="flex items-center justify-end gap-2 mb-2">
          <button
            onClick={copyToClipboard}
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>

        {/* Content */}
        <div
          class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"
          style={{
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Show
            when={!describe.loading && describe() !== undefined}
            fallback={
              <div class="flex items-center justify-center h-full">
                <div class="spinner" />
              </div>
            }
          >
            <Show when={describe.error}>
              <div style={{ color: 'var(--error-color)' }}>Error: {describe.error?.message}</div>
            </Show>
            <Show when={!describe.error && describe()}>
              <pre 
                class="whitespace-pre-wrap" 
                style={{ color: 'var(--text-primary)' }}
                innerHTML={highlightDescribe(describe() || '')} 
              />
            </Show>
            <Show when={!describe.error && !describe() && !describe.loading}>
              <div style={{ color: 'var(--text-secondary)' }}>No describe output available</div>
            </Show>
          </Show>
        </div>
      </div>
    </Modal>
  );
};

export default DescribeModal;
