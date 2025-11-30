import { Component, createSignal, For, Show, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ActionMenuProps {
  actions: ActionItem[];
}

const icons: Record<string, string> = {
  shell: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  portforward: 'M13 10V3L4 14h7v7l9-11h-7z',
  logs: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  yaml: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  describe: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  restart: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  scale: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
  details: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
};

const ActionMenu: Component<ActionMenuProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ top: 0, left: 0 });
  let buttonRef: HTMLButtonElement | undefined;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180, // Menu width approximately 180px
      });
    }
    setIsOpen(!isOpen());
  };

  const handleActionClick = (action: ActionItem) => {
    setIsOpen(false);
    action.onClick();
  };

  // Close menu when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    if (isOpen() && buttonRef && !buttonRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  // Add global click listener
  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  }

  return (
    <div class="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        }}
        title="Actions"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            class="fixed z-50 py-2 rounded-lg shadow-xl min-w-[180px]"
            style={{
              top: `${menuPosition().top}px`,
              left: `${menuPosition().left}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <For each={props.actions}>
              {(action) => (
                <>
                  <Show when={action.divider}>
                    <div class="my-1 border-t" style={{ 'border-color': 'var(--border-color)' }} />
                  </Show>
                  <button
                    onClick={() => handleActionClick(action)}
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-opacity-50"
                    style={{
                      color: action.variant === 'danger' ? 'var(--error-color)' : 'var(--text-primary)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = action.variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={icons[action.icon] || icons.details}
                      />
                    </svg>
                    {action.label}
                  </button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
};

export default ActionMenu;
