import { Component, Show } from 'solid-js';
import Modal from './Modal';

interface HelmRelease {
  name: string;
  namespace: string;
  chart?: string;
  revision?: number;
  appVersion?: string;
  status?: string;
  updated?: string;
}

interface HelmReleaseDeleteModalProps {
  isOpen: boolean;
  release: HelmRelease | null;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const HelmReleaseDeleteModal: Component<HelmReleaseDeleteModalProps> = (props) => {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Uninstall Helm Release"
      size="sm"
    >
      <div class="space-y-3">
        <div class="flex items-start gap-2">
          <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
              Are you sure you want to uninstall <strong>{props.release?.name}</strong> from <strong>{props.release?.namespace}</strong>?
            </p>
            <div class="p-2 rounded-lg mb-2" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-xs font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {props.release?.name}
              </div>
              <Show when={props.release?.chart}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Chart: {props.release?.chart}
                </div>
              </Show>
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                Namespace: {props.release?.namespace}
              </div>
            </div>
            <p class="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t" style={{ 'border-color': 'var(--border-color)' }}>
          <button
            onClick={props.onClose}
            disabled={props.loading}
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

export default HelmReleaseDeleteModal;

