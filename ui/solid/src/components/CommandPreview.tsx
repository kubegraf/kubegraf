import { Component, Show, createSignal, JSX } from 'solid-js';
import { addNotification } from '../stores/ui';

interface CommandPreviewProps {
  label?: string;               // "Actual command" or "Equivalent kubectl command"
  command: string;              // Full command line (single string, can include newlines)
  description?: string;         // Optional helper text
  defaultCollapsed?: boolean;   // Start collapsed by default (true)
  badge?: JSX.Element;          // Optional extra badge (e.g. mode, namespace)
}

const CommandPreview: Component<CommandPreviewProps> = (props) => {
  const [expanded, setExpanded] = createSignal(!(props.defaultCollapsed ?? true));
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.command || '');
      setCopied(true);
      addNotification('Command copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('[CommandPreview] Failed to copy command:', err);
      addNotification('Failed to copy command', 'error');
    }
  };

  const labelText = () => props.label || 'Command preview';

  return (
    <div
      class="rounded-lg border mt-3 mb-2"
      style={{
        background: 'var(--bg-secondary)',
        'border-color': 'var(--border-color)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 text-xs"
        onClick={() => setExpanded(!expanded())}
        style={{ color: 'var(--text-secondary)' }}
      >
        <div class="flex items-center gap-2 min-w-0">
          <svg
            class="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={expanded() ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'}
            />
          </svg>
          <span class="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {labelText()}
          </span>
          <Show when={props.badge}>
            <span class="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]"
              style={{
                background: 'rgba(148, 163, 184, 0.16)',
                color: 'var(--text-secondary)',
              }}
            >
              {props.badge}
            </span>
          </Show>
        </div>
        <div class="flex items-center gap-2">
          <Show when={props.description}>
            <span class="hidden sm:inline text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              {props.description}
            </span>
          </Show>
          <span class="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {expanded() ? 'Hide' : 'Show'}
          </span>
        </div>
      </button>

      {/* Body */}
      <Show when={expanded()}>
        <div
          class="px-3 pb-3 pt-1 border-t"
          style={{ 'border-color': 'var(--border-color)' }}
        >
          <div
            class="relative rounded-md overflow-hidden font-mono text-[11px]"
            style={{
              background: '#020617',
              border: '1px solid rgba(15, 23, 42, 0.7)',
            }}
          >
            <pre
              class="m-0 p-3 whitespace-pre-wrap overflow-x-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
{props.command || '# Command preview will appear here'}
            </pre>

            <button
              type="button"
              onClick={handleCopy}
              class="absolute top-1 right-1 px-2 py-1 rounded text-[11px] flex items-center gap-1"
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(148, 163, 184, 0.5)',
              }}
            >
              <Show when={!copied()} fallback="Copied">
                <>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              </Show>
            </button>
          </div>
          <Show when={props.description}>
            <p class="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {props.description}
            </p>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default CommandPreview;


