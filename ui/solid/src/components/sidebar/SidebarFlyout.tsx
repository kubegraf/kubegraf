import { Component, For, Show, createMemo, onMount, onCleanup } from 'solid-js';
import type { NavSection } from '../../config/navSections';
import { currentView, setCurrentView } from '../../stores/ui';
import { getVisibleSection, closeWithDelay, isSectionPinned, unpinSection } from '../../stores/sidebarState';
import { unreadInsightsEvents } from '../../stores/insightsPulse';

interface SidebarFlyoutProps {
  sections: NavSection[];
  onItemClick?: (itemId: string) => void;
}

/**
 * Right fly-out panel component - shows sub-navigation for active section
 */
const SidebarFlyout: Component<SidebarFlyoutProps> = (props) => {
  const visibleSection = createMemo(() => {
    const sectionTitle = getVisibleSection();
    if (!sectionTitle) return null;
    return props.sections.find((s) => s.title === sectionTitle);
  });

  // Keyboard navigation
  let flyoutRef: HTMLDivElement | undefined;
  let itemRefs: Record<number, HTMLButtonElement> = {};
  let focusedIndex = -1;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!visibleSection()) return;

    const items = visibleSection()!.items;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
        itemRefs[focusedIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, -1);
        if (focusedIndex === -1) {
          flyoutRef?.focus();
        } else {
          itemRefs[focusedIndex]?.focus();
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex]) {
          handleItemClick(items[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (isSectionPinned(visibleSection()!.title)) {
          unpinSection();
        } else {
          closeWithDelay(0);
        }
        break;
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  const handleItemClick = (itemId: string) => {
    setCurrentView(itemId as any);
    props.onItemClick?.(itemId);
    // Don't close on click - let user navigate
  };

  const handleMouseEnter = () => {
    // Keep flyout open when mouse is inside
    if (visibleSection()) {
      // Cancel any pending close
    }
  };

  const handleMouseLeave = () => {
    // Close with delay if not pinned
    if (visibleSection() && !isSectionPinned(visibleSection()!.title)) {
      closeWithDelay(200);
    }
  };

  return (
    <Show when={visibleSection()}>
      {(section) => (
        <div
          ref={flyoutRef}
          tabindex="-1"
          class="
            bg-bg-panel
            border-r border-border-subtle
            shadow-elevated
            w-64
            h-full
            flex flex-col
            animate-slideIn
          "
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div class="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 class="text-sm font-semibold text-text-primary">
              {section().title}
            </h2>
            <Show when={isSectionPinned(section().title)}>
              <button
                onClick={() => unpinSection()}
                class="
                  p-1 rounded hover:bg-bg-hover
                  text-text-muted hover:text-text-primary
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                "
                title="Unpin section"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Show>
          </div>

          {/* Navigation Items */}
          <nav class="flex-1 overflow-y-auto py-2 px-2">
            <For each={section().items}>
              {(item, index) => {
                const isActive = () => currentView() === item.id;
                const showPulse = () => section().title === 'Insights' && unreadInsightsEvents() > 0 && item.id === 'incidents';

                return (
                  <button
                    ref={(el) => {
                      if (el) itemRefs[index()] = el;
                    }}
                    onClick={() => handleItemClick(item.id)}
                    class={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md
                      transition-colors duration-150
                      focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                      ${
                        isActive()
                          ? 'bg-bg-panelAlt text-brand-cyan shadow-glowCyan'
                          : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }
                    `}
                  >
                    <svg
                      class="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                    </svg>
                    <span class="text-sm flex-1 text-left">{item.label}</span>
                    
                    {/* Pulse indicator */}
                    <Show when={showPulse()}>
                      <span class="w-2 h-2 rounded-full bg-status-danger animate-pulseSoft" />
                    </Show>
                    
                    {/* Active indicator */}
                    <Show when={isActive()}>
                      <span class="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                    </Show>
                  </button>
                );
              }}
            </For>
          </nav>

          {/* Footer with section info */}
          <div class="px-4 py-2 border-t border-border-subtle">
            <p class="text-xs text-text-muted">
              {section().items.length} {section().items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
      )}
    </Show>
  );
};

export default SidebarFlyout;

