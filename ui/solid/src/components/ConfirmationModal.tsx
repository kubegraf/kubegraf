import { Component, Show } from 'solid-js';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  details?: string | { label: string; value: string }[];
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

const ConfirmationModal: Component<ConfirmationModalProps> = (props) => {
  const getVariantStyles = () => {
    switch (props.variant || 'danger') {
      case 'danger':
        return {
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: 'var(--error-color)',
          buttonBg: 'var(--error-color)',
          iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        };
      case 'warning':
        return {
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: 'var(--warning-color)',
          buttonBg: 'var(--warning-color)',
          iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        };
      default:
        return {
          iconBg: 'rgba(59, 130, 246, 0.15)',
          iconColor: 'var(--accent-primary)',
          buttonBg: 'var(--accent-primary)',
          iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.title}
      size={props.size || "md"}
    >
      <div class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: variantStyles.iconBg }}>
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: variantStyles.iconColor }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={variantStyles.iconPath} />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              {props.message}
            </p>
            <Show when={props.details}>
              <div class="p-3 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
                {typeof props.details === 'string' ? (
                  <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {props.details}
                  </div>
                ) : (
                  <div class="space-y-2">
                    {(props.details as { label: string; value: string }[]).map((detail) => (
                      <div>
                        <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                          {detail.label}
                        </div>
                        <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {detail.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Show>
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
            {props.cancelText || 'Cancel'}
          </button>
          <button
            onClick={props.onConfirm}
            disabled={props.loading}
            class="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: variantStyles.buttonBg,
              color: 'white',
            }}
          >
            <Show when={props.loading} fallback={props.confirmText || 'Confirm'}>
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {props.confirmText || 'Confirm'}...
              </span>
            </Show>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;



