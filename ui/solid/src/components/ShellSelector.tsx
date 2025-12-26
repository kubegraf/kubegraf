// Copyright 2025 KubeGraf Contributors
// Shell Selector Component - Allows users to select their preferred terminal shell

import { Component, createSignal, createResource, For, Show, onMount } from 'solid-js';
import { api } from '../services/api';

interface Shell {
  name: string;
  display: string;
  path: string;
  priority: number;
}

interface ShellSelectorProps {
  selectedShell: string | undefined;
  onShellChange: (shellName: string) => void;
}

const ShellSelector: Component<ShellSelectorProps> = (props) => {
  const [shells] = createResource(() => api.getAvailableShells().then(res => res.shells || []));
  const [selected, setSelected] = createSignal<string>(props.selectedShell || '');

  // Load saved preference from localStorage
  onMount(() => {
    try {
      const saved = localStorage.getItem('kubegraf-preferred-shell');
      if (saved) {
        setSelected(saved);
        props.onShellChange(saved);
      }
    } catch (e) {
      console.error('Failed to load shell preference:', e);
    }
  });

  const handleChange = (shellName: string) => {
    setSelected(shellName);
    // Save to localStorage
    try {
      localStorage.setItem('kubegraf-preferred-shell', shellName);
    } catch (e) {
      console.error('Failed to save shell preference:', e);
    }
    props.onShellChange(shellName);
  };

  return (
    <div class="flex items-center gap-3">
      <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Shell:
      </label>
      <Show
        when={!shells.loading && shells() && shells()!.length > 0}
        fallback={
          <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading shells...
          </span>
        }
      >
        <select
          value={selected()}
          onChange={(e) => handleChange(e.currentTarget.value)}
          class="px-3 py-1.5 text-sm rounded-md border"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            'border-color': 'var(--border-color)',
            outline: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style['border-color'] = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style['border-color'] = 'var(--border-color)';
          }}
        >
          <For each={shells()}>
            {(shell) => (
              <option value={shell.name}>
                {shell.display} {shell.name === selected() ? '✓' : ''}
              </option>
            )}
          </For>
        </select>
        <Show when={selected()}>
          <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
            (Change takes effect on next terminal connection)
          </span>
        </Show>
      </Show>
    </div>
  );
};

export default ShellSelector;

