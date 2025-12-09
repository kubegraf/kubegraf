import { Component, JSX, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: JSX.Element;
}

const Modal: Component<ModalProps> = (props) => {
  // Close on escape key - but only if not in an input/terminal
  createEffect(() => {
    if (props.isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        // Don't close if user is typing in an input or terminal
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
            target.closest('.xterm') || target.closest('[data-terminal]')) {
          return;
        }
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
    xs: 'max-w-[420px]',
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] w-full',
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div 
          class="modal-overlay animate-fade-in" 
          onClick={props.onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': 1000,
          }}
        >
          <div
            class={`modal-content ${sizeClasses[props.size || 'lg']} animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              position: 'relative',
              width: props.size === 'xs' ? '420px' : props.size === 'sm' ? '448px' : '100%',
              'max-width': props.size === 'xs' ? '420px' : props.size === 'sm' ? '448px' : undefined,
            }}
          >
            {/* Header */}
            <div class={`flex items-center justify-between border-b ${props.size === 'xs' ? 'p-3' : 'p-4'}`} style={{ 'border-color': 'var(--border-color)' }}>
              <h2 class={`font-semibold ${props.size === 'xs' ? 'text-base' : 'text-lg'}`} style={{ color: 'var(--text-primary)' }}>{props.title}</h2>
              <button
                onClick={props.onClose}
                class="p-1 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg class={`${props.size === 'xs' ? 'w-5 h-5' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div class={`overflow-auto ${props.size === 'xs' ? 'p-3' : 'p-4'} ${props.size === 'full' ? 'max-h-[85vh]' : 'max-h-[70vh]'}`}>
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default Modal;
