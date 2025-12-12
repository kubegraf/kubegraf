import { Component, For, Show, createSignal } from 'solid-js';
import Modal from './Modal';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  resourceType: string; // e.g., "Pods", "Deployments"
  selectedItems: Array<{ name: string; namespace?: string }>;
}

export const BulkDeleteModal: Component<BulkDeleteModalProps> = (props) => {
  const [deleting, setDeleting] = createSignal(false);
  const [confirmText, setConfirmText] = createSignal('');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await props.onConfirm();
      props.onClose();
      setConfirmText('');
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const expectedText = `delete ${props.selectedItems.length} ${props.resourceType.toLowerCase()}`;
  const isConfirmValid = () => confirmText().toLowerCase() === expectedText;

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={() => {
        if (!deleting()) {
          props.onClose();
          setConfirmText('');
        }
      }}
      title={`Delete ${props.selectedItems.length} ${props.resourceType}`}
    >
      <div class="space-y-4">
        {/* Warning Banner */}
        <div
          class="p-4 rounded-lg border-l-4 flex items-start gap-3"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            'border-color': '#ef4444',
          }}
        >
          <svg
            class="w-6 h-6 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            stroke-width="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div class="font-bold mb-1" style={{ color: '#ef4444' }}>
              Permanent Action
            </div>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              You are about to delete <strong>{props.selectedItems.length}</strong> {props.resourceType.toLowerCase()}.
              This action cannot be undone.
            </div>
          </div>
        </div>

        {/* Items list (scrollable if many) */}
        <div class="space-y-2">
          <div class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Resources to be deleted:
          </div>
          <div
            class="max-h-60 overflow-y-auto space-y-1 p-3 rounded-lg"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <For each={props.selectedItems}>
              {(item) => (
                <div
                  class="flex items-center gap-2 py-2 px-3 rounded"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <svg
                    class="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span class="text-sm font-mono flex-1" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <Show when={item.namespace}>
                    <span
                      class="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}
                    >
                      {item.namespace}
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Confirmation input */}
        <div class="space-y-2">
          <label class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Type{' '}
            <span class="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: '#ef4444' }}>
              {expectedText}
            </span>{' '}
            to confirm:
          </label>
          <input
            type="text"
            value={confirmText()}
            onInput={(e) => setConfirmText(e.currentTarget.value)}
            placeholder={expectedText}
            class="w-full px-4 py-2 rounded-lg text-sm font-mono"
            style={{
              background: 'var(--bg-secondary)',
              border: `2px solid ${isConfirmValid() ? '#22c55e' : 'var(--border-color)'}`,
              color: 'var(--text-primary)',
            }}
            disabled={deleting()}
            autofocus
          />
        </div>

        {/* Action buttons */}
        <div class="flex items-center gap-3 pt-4">
          <button
            onClick={() => {
              props.onClose();
              setConfirmText('');
            }}
            disabled={deleting()}
            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmValid() || deleting()}
            class="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: isConfirmValid() ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'var(--bg-tertiary)',
              color: '#fff',
            }}
          >
            <Show when={deleting()} fallback={<>Delete {props.selectedItems.length} {props.resourceType}</>}>
              <div class="spinner" style={{ width: '16px', height: '16px' }} />
              Deleting...
            </Show>
          </button>
        </div>
      </div>
    </Modal>
  );
};
