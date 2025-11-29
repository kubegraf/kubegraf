import { Component, JSX, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: JSX.Element;
}

const Modal: Component<ModalProps> = (props) => {
  // Close on escape key
  createEffect(() => {
    if (props.isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          props.onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      onCleanup(() => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      });
    }
  });

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] w-full',
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="modal-overlay animate-fade-in" onClick={props.onClose}>
          <div
            class={`modal-content ${sizeClasses[props.size || 'lg']} animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div class="flex items-center justify-between p-4 border-b" style={{ 'border-color': 'var(--border-color)' }}>
              <h2 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{props.title}</h2>
              <button
                onClick={props.onClose}
                class="p-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div class="p-4 max-h-[70vh] overflow-auto">
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default Modal;
