import { Component, For, Show, createMemo, createSignal, createEffect } from 'solid-js';
import Modal from './Modal';
import type { InstalledInstance } from '../features/marketplace/types';
import NamespaceBadge from './NamespaceBadge';
import NamespaceBadges from './NamespaceBadges';

interface AppUninstallModalProps {
  isOpen: boolean;
  displayName: string;
  instances: InstalledInstance[];
  // Optional pre-selection when user clicked a specific instance uninstall icon
  initialSelection?: InstalledInstance[];
  onClose: () => void;
  onConfirm: (instancesToUninstall: InstalledInstance[]) => void | Promise<void>;
  loading?: boolean;
}

const AppUninstallModal: Component<AppUninstallModalProps> = (props) => {
  const [selectedKeys, setSelectedKeys] = createSignal<Set<string>>(new Set());

  const keyOf = (i: InstalledInstance) => `${i.releaseName}@@${i.namespace}`;

  // Reset selection each time the modal opens
  createEffect(() => {
    if (!props.isOpen) return;
    const initial = props.initialSelection && props.initialSelection.length > 0
      ? props.initialSelection
      : (props.instances.length === 1 ? props.instances : []);
    setSelectedKeys(new Set(initial.map(keyOf)));
  });

  const selectedInstances = createMemo(() => {
    const keys = selectedKeys();
    return props.instances.filter((i) => keys.has(keyOf(i)));
  });

  const selectedNamespaces = createMemo(() => selectedInstances().map((i) => i.namespace));

  const toggle = (i: InstalledInstance) => {
    const next = new Set(selectedKeys());
    const k = keyOf(i);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSelectedKeys(next);
  };

  const selectAll = () => setSelectedKeys(new Set(props.instances.map(keyOf)));
  const clearAll = () => setSelectedKeys(new Set());

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Uninstall Application"
      size="md"
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              Choose where you want to uninstall <strong>{props.displayName}</strong> from:
            </p>
            <div class="p-3 rounded-lg mb-4 space-y-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Installed Instances
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    onClick={selectAll}
                    disabled={props.loading}
                    title="Select all"
                  >
                    Select all
                  </button>
                  <button
                    class="text-xs px-2 py-1 rounded"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    onClick={clearAll}
                    disabled={props.loading}
                    title="Clear selection"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <For each={props.instances}>
                  {(inst) => (
                    <label
                      class="flex items-center gap-3 p-2 rounded cursor-pointer"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKeys().has(keyOf(inst))}
                        onInput={() => toggle(inst)}
                        disabled={props.loading}
                      />
                      <div class="min-w-0 flex-1">
                        <div class="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {inst.releaseName}
                        </div>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span class="inline-flex items-center gap-2 flex-wrap">
                            <NamespaceBadge namespace={inst.namespace} />
                            <Show when={!!inst.version}>
                              <span>v{inst.version}</span>
                            </Show>
                          </span>
                        </div>
                      </div>
                    </label>
                  )}
                </For>
              </div>
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                {selectedInstances().length} selected
              </div>
              <Show when={selectedInstances().length > 0}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Uninstalling from:{' '}
                  <NamespaceBadges namespaces={selectedNamespaces()} maxShown={6} badgeSize="sm" />
                </div>
              </Show>
            </div>
            <div class="mt-4 p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              'border-left-color': 'var(--error-color)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div class="flex-1">
                  <h4 class="text-sm font-semibold mb-2" style={{ color: 'var(--error-color)' }}>
                    ⚠️ Disruptive Action - Permanent Removal
                  </h4>
                  <p class="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                    <strong>The selected application will be removed permanently from the cluster.</strong>
                  </p>
                  <ul class="text-xs space-y-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <li class="flex items-start gap-2">
                      <span class="mt-0.5">•</span>
                      <span>All application resources, configurations, and data will be permanently deleted</span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="mt-0.5">•</span>
                      <span>This action <strong>cannot be undone</strong> and data <strong>cannot be retrieved</strong></span>
                    </li>
                    <li class="flex items-start gap-2">
                      <span class="mt-0.5">•</span>
                      <span>Any running services or workloads will be terminated immediately</span>
                    </li>
                  </ul>
                  <p class="text-xs font-medium" style={{ color: 'var(--error-color)' }}>
                    Please ensure you have backups of any important data before proceeding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
          <button
            onClick={props.onClose}
            disabled={props.loading}
            class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => props.onConfirm(selectedInstances())}
            disabled={props.loading || selectedInstances().length === 0}
            class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--error-color)',
              color: 'white',
            }}
          >
            <Show when={props.loading} fallback="Uninstall">
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uninstalling...
              </span>
            </Show>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AppUninstallModal;



