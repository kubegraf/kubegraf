import { Component, createSignal, Show } from 'solid-js';

interface YAMLEditorProps {
  yaml: string;
  title?: string;
  onSave?: (yaml: string) => Promise<void>;
  onDryRun?: (yaml: string) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const YAMLEditor: Component<YAMLEditorProps> = (props) => {
  const [editedYaml, setEditedYaml] = createSignal(props.yaml);
  const [saving, setSaving] = createSignal(false);
  const [dryRunning, setDryRunning] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await props.onSave?.(editedYaml());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save YAML');
    } finally {
      setSaving(false);
    }
  };

  const handleDryRun = async () => {
    if (!props.onDryRun) return;
    setError(null);
    setDryRunning(true);
    try {
      await props.onDryRun(editedYaml());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry run failed');
    } finally {
      setDryRunning(false);
    }
  };

  const handleCancel = () => {
    setEditedYaml(props.yaml);
    setError(null);
    props.onCancel?.();
  };

  return (
    <div class="flex flex-col h-full">
      {/* Toolbar */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Show when={error()}>
            <div class="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)' }}>
              {error()}
            </div>
          </Show>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={handleCancel}
            disabled={saving() || props.loading}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            Cancel
          </button>
          <Show when={props.onDryRun}>
            <button
              onClick={handleDryRun}
              disabled={saving() || props.loading || dryRunning()}
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: 'var(--bg-secondary)', color: 'var(--warning-color)', border: '1px solid rgba(245, 158, 11, 0.4)' }}
            >
              <Show when={dryRunning() || props.loading} fallback="Dry run">
                <div class="spinner" style={{ width: '16px', height: '16px' }} />
                Dry running...
              </Show>
            </button>
          </Show>
          <button
            onClick={handleSave}
            disabled={saving() || props.loading || editedYaml() === props.yaml}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            <Show when={saving() || props.loading} fallback="Save">
              <div class="spinner" style={{ width: '16px', height: '16px' }} />
              Saving...
            </Show>
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={editedYaml()}
        onInput={(e) => setEditedYaml(e.currentTarget.value)}
        class="flex-1 w-full p-4 rounded-lg font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        }}
        spellcheck={false}
      />
    </div>
  );
};

export default YAMLEditor;

