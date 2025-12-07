import { Component, Show } from 'solid-js';
import Modal from './Modal';

interface AppUninstallModalProps {
  isOpen: boolean;
  appName: string;
  displayName: string;
  namespace: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

const AppUninstallModal: Component<AppUninstallModalProps> = (props) => {
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
              Are you sure you want to uninstall <strong>{props.displayName}</strong> from <strong>{props.namespace}</strong>?
            </p>
            <div class="p-3 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {props.displayName}
              </div>
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                Namespace: {props.namespace}
              </div>
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                Release: {props.appName}
              </div>
            </div>
            <p class="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              This action cannot be undone. The application will be permanently uninstalled from the cluster.
            </p>
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
            onClick={props.onConfirm}
            disabled={props.loading}
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

