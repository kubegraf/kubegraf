import { Component, createSignal, Show } from 'solid-js';

interface YAMLViewerProps {
  yaml: string;
  title?: string;
  onCopy?: () => void;
}

const YAMLViewer: Component<YAMLViewerProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.yaml);
    setCopied(true);
    props.onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([props.yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.title || 'resource'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple syntax highlighting for YAML - theme aware
  const highlightYAML = (yaml: string) => {
    if (!yaml) return '';
    return yaml
      .split('\n')
      .map((line) => {
        // Comments
        if (line.trim().startsWith('#')) {
          return `<span style="color: var(--text-muted)">${escapeHtml(line)}</span>`;
        }
        // Keys
        const keyMatch = line.match(/^(\s*)([a-zA-Z0-9_-]+)(:)/);
        if (keyMatch) {
          const [, indent, key, colon] = keyMatch;
          const value = line.slice(keyMatch[0].length);
          return `${indent}<span style="color: var(--accent-secondary)">${escapeHtml(key)}</span>${colon}<span style="color: var(--text-primary)">${escapeHtml(value)}</span>`;
        }
        // List items
        if (line.trim().startsWith('-')) {
          return `<span style="color: var(--accent-tertiary)">${escapeHtml(line)}</span>`;
        }
        // Default text - ensure it's visible in light theme
        return `<span style="color: var(--text-primary)">${escapeHtml(line)}</span>`;
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
    <div class="relative">
      {/* Toolbar */}
      <div class="flex items-center justify-end gap-2 mb-2">
        <button
          onClick={handleCopy}
          class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <Show when={copied()} fallback={
            <>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          }>
            <svg class="w-4 h-4" style={{ color: 'var(--success-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span style={{ color: 'var(--success-color)' }}>Copied!</span>
          </Show>
        </button>
        <button
          onClick={handleDownload}
          class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>

      {/* Code block */}
      <div 
        class="code-block overflow-auto max-h-[60vh]"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          'border-radius': '8px',
          padding: '1rem',
        }}
      >
        <pre 
          class="text-sm leading-relaxed" 
          style={{ 
            color: 'var(--text-primary)',
            margin: 0,
            'font-family': 'monospace',
          }}
          innerHTML={highlightYAML(props.yaml)} 
        />
      </div>
    </div>
  );
};

export default YAMLViewer;
