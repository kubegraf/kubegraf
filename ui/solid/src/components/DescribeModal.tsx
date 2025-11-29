import { Component, createResource, Show } from 'solid-js';
import Modal from './Modal';

interface DescribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'pod' | 'deployment' | 'service' | 'node' | 'statefulset' | 'daemonset' | 'configmap' | 'secret' | 'ingress' | 'cronjob' | 'job';
  name: string;
  namespace?: string;
}

const DescribeModal: Component<DescribeModalProps> = (props) => {
  const [describe] = createResource(
    () => ({ type: props.resourceType, name: props.name, ns: props.namespace, open: props.isOpen }),
    async (params) => {
      if (!params.open || !params.name) return '';
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

  // Simple syntax highlighting for describe output
  const highlightDescribe = (text: string) => {
    return text
      .split('\n')
      .map((line) => {
        // Section headers (e.g., "Name:", "Namespace:")
        const headerMatch = line.match(/^([A-Za-z][A-Za-z\s]+):\s*(.*)$/);
        if (headerMatch && line.indexOf(':') < 30) {
          const [, key, value] = headerMatch;
          return `<span class="text-cyan-400">${escapeHtml(key)}:</span> <span class="text-amber-300">${escapeHtml(value)}</span>`;
        }
        // Indented key-value pairs
        const kvMatch = line.match(/^(\s+)([A-Za-z][A-Za-z\s-]+):\s*(.*)$/);
        if (kvMatch) {
          const [, indent, key, value] = kvMatch;
          return `${indent}<span class="text-blue-400">${escapeHtml(key)}:</span> ${escapeHtml(value)}`;
        }
        return escapeHtml(line);
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
            background: '#0d1117',
            color: '#c9d1d9',
            border: '1px solid var(--border-color)',
          }}
        >
          <Show
            when={!describe.loading}
            fallback={
              <div class="flex items-center justify-center h-full">
                <div class="spinner" />
              </div>
            }
          >
            <Show when={describe.error}>
              <div class="text-red-400">Error: {describe.error?.message}</div>
            </Show>
            <pre class="whitespace-pre-wrap" innerHTML={highlightDescribe(describe() || '')} />
          </Show>
        </div>
      </div>
    </Modal>
  );
};

export default DescribeModal;
