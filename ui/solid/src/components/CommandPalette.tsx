// Copyright 2025 KubeGraf Contributors
// Command Palette Component

import { Component, createSignal, createEffect, onMount, onCleanup, For, Show, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { getCommandActions, filterActions, groupActionsByCategory, type CommandAction } from '../lib/commandActions';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: HTMLElement | null;
}

const CommandPalette: Component<CommandPaletteProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  let inputRef: HTMLInputElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let previousActiveElement: HTMLElement | null = null;

  // Get all actions
  const allActions = getCommandActions();

  // Filter actions based on query
  const filteredActions = createMemo(() => {
    const q = query().trim();
    if (!q) {
      return allActions;
    }
    return filterActions(allActions, q);
  });

  // Group actions by category
  const groupedActions = createMemo(() => {
    return groupActionsByCategory(filteredActions());
  });

  // Flatten grouped actions for keyboard navigation
  const flatActions = createMemo(() => {
    const flat: CommandAction[] = [];
    groupedActions().forEach((actions) => {
      flat.push(...actions);
    });
    return flat;
  });

  // Reset selection when query changes
  createEffect(() => {
    query();
    setSelectedIndex(0);
  });

  // Calculate position relative to button when opened
  createEffect(() => {
    if (props.isOpen && props.buttonRef) {
      const rect = props.buttonRef.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4, // 4px gap below button
        left: rect.left, // Align left edge with button
      });
    }
  });

  // Focus input when opened
  createEffect(() => {
    if (props.isOpen) {
      // Store the previously focused element
      previousActiveElement = document.activeElement as HTMLElement;
      
      // Focus input after a short delay to ensure DOM is ready
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    } else {
      // Restore focus to previous element when closed
      if (previousActiveElement) {
        previousActiveElement.focus();
        previousActiveElement = null;
      }
    }
  });

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        props.onClose();
        break;

      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => {
          const max = flatActions().length - 1;
          return prev < max ? prev + 1 : prev;
        });
        scrollToSelected();
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        scrollToSelected();
        break;

      case 'Enter':
        e.preventDefault();
        const selected = flatActions()[selectedIndex()];
        if (selected) {
          selected.run();
          props.onClose();
          setQuery('');
        }
        break;

      case 'Tab':
        // Prevent tab from breaking focus trap
        e.preventDefault();
        break;
    }
  };

  // Scroll selected item into view
  const scrollToSelected = () => {
    const container = containerRef;
    if (!container) return;

    const selectedElement = container.querySelector(`[data-index="${selectedIndex()}"]`) as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  // Global keyboard handler
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  // Handle click outside - close when clicking anywhere outside the palette
  createEffect(() => {
    if (props.isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const paletteElement = containerRef;
        if (paletteElement && !paletteElement.contains(target) && !props.buttonRef?.contains(target)) {
          props.onClose();
        }
      };
      // Use setTimeout to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      onCleanup(() => {
        document.removeEventListener('mousedown', handleClickOutside);
      });
    }
  });

  // Get keyboard shortcut hint
  const getShortcutHint = () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    return isMac ? '⌘K' : 'Ctrl+K';
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        {/* Command Palette - positioned directly below button */}
        <div
          class="fixed z-[9999]"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
          style={{
            top: `${position().top}px`,
            left: `${position().left}px`,
            width: '320px',
            maxWidth: '90vw',
            animation: 'slideDown 0.15s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            class="rounded-lg shadow-2xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Input */}
            <div class="p-1.5 border-b" style={{ 'border-color': 'var(--border-color)' }}>
              <div class="relative">
                <svg
                  class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  class="w-full pl-7 pr-7 py-1.5 rounded text-xs"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  autofocus
                />
                <Show when={query()}>
                  <button
                    onClick={() => setQuery('')}
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--bg-secondary)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </Show>
              </div>
            </div>

            {/* Results */}
            <div
              ref={containerRef}
              class="max-h-64 overflow-y-auto"
              style={{ background: 'var(--bg-card)' }}
            >
                <Show
                when={flatActions().length > 0}
                fallback={
                  <div class="p-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    <p class="text-xs">No results</p>
                  </div>
                }
              >
                <For each={Array.from(groupedActions().entries())}>
                  {([category, actions]) => (
                    <div class="py-0.5">
                      <div
                        class="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {category}
                      </div>
                      <For each={actions}>
                        {(action, localIndex) => {
                          // Calculate flat index for this action
                          let flatIdx = 0;
                          let found = false;
                          groupedActions().forEach((catActions, cat) => {
                            if (found) return;
                            if (cat === category) {
                              flatIdx += localIndex();
                              found = true;
                            } else {
                              flatIdx += catActions.length;
                            }
                          });

                          const isSelected = () => flatIdx === selectedIndex();

                          return (
                            <button
                              data-index={flatIdx}
                              onClick={() => {
                                action.run();
                                props.onClose();
                                setQuery('');
                              }}
                              onMouseEnter={() => setSelectedIndex(flatIdx)}
                              class="w-full px-2 py-1 text-left flex items-center gap-1.5 transition-colors"
                              style={{
                                background: isSelected()
                                  ? 'var(--bg-tertiary)'
                                  : 'transparent',
                                color: isSelected()
                                  ? 'var(--accent-primary)'
                                  : 'var(--text-primary)',
                              }}
                            >
                              <Show when={action.icon}>
                                <svg
                                  class="w-3.5 h-3.5 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d={action.icon}
                                  />
                                </svg>
                              </Show>
                              <div class="flex-1 min-w-0">
                                <div class="text-xs font-medium truncate">{action.title}</div>
                              </div>
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            {/* Footer - minimal */}
            <div
              class="px-2 py-1 border-t flex items-center justify-between text-xs"
              style={{
                'border-color': 'var(--border-color)',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
              }}
            >
              <div class="text-xs opacity-70">{flatActions().length} results</div>
              <div class="flex items-center gap-1.5 text-xs opacity-70">
                <span>↑↓</span>
                <span>↵</span>
                <span>Esc</span>
              </div>
            </div>
          </div>
        </div>
      </Portal>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Show>
  );
};

export default CommandPalette;

