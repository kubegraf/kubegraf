import { Component, createSignal, For, Show, onCleanup, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';

interface ActionItem {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  actions: ActionItem[];
  onOpenChange?: (isOpen: boolean) => void;
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
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  pod: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  events: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

const ActionMenu: Component<ActionMenuProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [menuPosition, setMenuPosition] = createSignal({ top: 0, left: 0 });
  const [isHovering, setIsHovering] = createSignal(false);
  let buttonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const toggleMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const newState = !isOpen();
    if (buttonRef && newState) {
      const rect = buttonRef.getBoundingClientRect();
      const menuHeight = 300; // Approximate menu height
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If not enough space below and more space above, show above
      let top = rect.bottom + 4;
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        top = rect.top - menuHeight - 4;
      }
      
      // Ensure menu stays within viewport
      top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
      
      setMenuPosition({
        top,
        left: Math.max(10, Math.min(rect.right - 180, window.innerWidth - 190)), // Menu width approximately 180px
      });
    }
    
    // Set open state immediately
    setIsOpen(newState);
    props.onOpenChange?.(newState);
    
    // Mark that we just toggled to prevent immediate close
    if (newState) {
      // Set a flag to ignore the next click outside for a short time
      (window as any).__actionMenuJustOpened = true;
      setTimeout(() => {
        (window as any).__actionMenuJustOpened = false;
      }, 300);
    }
  };

  const executeAction = (action: ActionItem) => {
    console.log('ActionMenu: Executing action:', action.label);
    setIsOpen(false);
    props.onOpenChange?.(false);
    
    // Execute the action
    try {
      action.onClick();
    } catch (err) {
      console.error('ActionMenu: Error executing action:', err);
    }
  };

  // Track close timeout for mouse leave
  let closeTimeout: number | null = null;

  // Close menu when clicking outside, but keep it open when hovering
  createEffect(() => {
    if (!isOpen()) {
      // Clear any pending close timeout when menu closes
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
      return;
    }

    let timeoutId: number | null = null;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Ignore if menu was just opened (within last 300ms)
      if ((window as any).__actionMenuJustOpened) {
        return;
      }
      
      // Always ignore clicks on the button itself
      if (buttonRef?.contains(target)) {
        return;
      }
      
      // Don't close if clicking inside menu or hovering over it
      if (menuRef?.contains(target) || isHovering()) {
        return;
      }
      
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Use a delay to prevent rapid open/close cycles
      // Only close if not hovering and not clicking on button
      timeoutId = setTimeout(() => {
        // Double-check we're not hovering and menu is still open
        if (isOpen() && !isHovering() && !buttonRef?.contains(document.activeElement)) {
          setIsOpen(false);
          props.onOpenChange?.(false);
        }
      }, 150);
    };

    // Use click instead of mousedown to avoid conflicts
    // Add a longer delay to ensure the button's click handler runs first and menu is fully rendered
    const setupTimeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 200);
    
    onCleanup(() => {
      if (timeoutId) clearTimeout(timeoutId);
      if (closeTimeout) clearTimeout(closeTimeout);
      clearTimeout(setupTimeout);
      document.removeEventListener('click', handleClickOutside, true);
    });
  });

  return (
    <div class="relative" style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"
        style={{
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
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
            ref={menuRef}
            class="fixed py-2 rounded-lg shadow-xl min-w-[180px]"
            style={{
              top: `${menuPosition().top}px`,
              left: `${menuPosition().left}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.3)',
              'z-index': 9998,
            }}
            onMouseEnter={() => {
              setIsHovering(true);
              // Cancel any pending close timeout when mouse enters
              if (closeTimeout) {
                clearTimeout(closeTimeout);
                closeTimeout = null;
              }
            }}
            onMouseLeave={() => {
              setIsHovering(false);
              // Start a timeout to close when mouse leaves, but only if not clicking button
              if (closeTimeout) clearTimeout(closeTimeout);
              closeTimeout = setTimeout(() => {
                if (!isHovering() && !buttonRef?.contains(document.activeElement)) {
                  setIsOpen(false);
                  props.onOpenChange?.(false);
                }
                closeTimeout = null;
              }, 300);
            }}
          >
            <For each={props.actions}>
              {(action) => (
                <>
                  <Show when={action.divider}>
                    <div class="my-1 border-t" style={{ 'border-color': 'var(--border-color)' }} />
                  </Show>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!action.disabled && !action.loading) {
                        executeAction(action);
                      }
                    }}
                    disabled={action.disabled || action.loading}
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                    classList={{
                      'opacity-50 cursor-not-allowed': action.disabled || action.loading,
                    }}
                    style={{
                      color: action.variant === 'danger' ? 'var(--error-color)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: action.disabled || action.loading ? 'not-allowed' : 'pointer',
                      'text-align': 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!action.disabled && !action.loading) {
                        e.currentTarget.style.background = action.variant === 'danger'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : 'var(--bg-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Show when={action.loading} fallback={
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d={icons[action.icon] || icons.details}
                        />
                      </svg>
                    }>
                      <div class="spinner" style={{ width: '16px', height: '16px' }} />
                    </Show>
                    {action.loading ? `${action.label}...` : action.label}
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
