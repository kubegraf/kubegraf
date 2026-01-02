import { Component, For, Show, createMemo, onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import type { NavSection } from '../../config/navSections';
import { currentView, setCurrentView, setTerminalOpen } from '../../stores/ui';
import { getVisibleSection, closeWithDelay, isSectionPinned, unpinSection, activeSection, setActive } from '../../stores/sidebarState';
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

  // Position state - track where to show the flyout
  const [position, setPosition] = createSignal({ 
    top: 56, 
    left: 56, 
    height: 200
  });

  // Update position based on active section
  createEffect(() => {
    const sectionTitle = getVisibleSection();
    if (sectionTitle) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        // Find the section button in the sidebar rail
        const railButton = document.querySelector(`[data-section-rail="${sectionTitle}"]`);
        if (railButton) {
          const rect = railButton.getBoundingClientRect();
          // Find section to calculate height
          const section = props.sections.find((s) => s.title === sectionTitle);
          // Calculate approximate flyout height (will be updated when flyout renders)
          const estimatedHeight = section 
            ? Math.min(400, section.items.length * 40 + 60)
            : 200;
          const flyoutLeft = rect.right; // NO gap - flyout starts immediately after button to prevent mouseleave
          setPosition({
            top: Math.max(56, rect.top), // Minimum top position
            left: flyoutLeft,
            height: estimatedHeight,
          });
        }
      });
    }
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
    // Special handling for terminal - open docked terminal instead of navigating
    if (itemId === 'terminal') {
      const { setTerminalOpen } = require('../../stores/ui');
      setTerminalOpen(true);
      props.onItemClick?.(itemId);
      return;
    }
    
    setCurrentView(itemId as any);
    props.onItemClick?.(itemId);
    // Scroll to top of content area (not window top, but main content)
    setTimeout(() => {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
    // Don't close on click - let user navigate
  };

  const handleMouseEnter = () => {
    // CRITICAL: Keep flyout open when mouse enters - cancel any pending close
    // This prevents the flyout from closing when moving from rail button to flyout
    const section = visibleSection();
    if (section) {
      setActive(section); // This cancels any pending closeWithDelay from rail button's onMouseLeave
    }
  };

  const handleMouseLeave = () => {
    // Close with delay if not pinned
    const section = visibleSection();
    if (section && !isSectionPinned(section)) {
      closeWithDelay(200);
    }
  };

  return (
    <Show when={visibleSection()}>
      {(section) => (
        <>
          {/* Bridge element no longer needed - extended wrapper in SidebarRail handles hover zone */}
          <div
            ref={flyoutRef}
            data-flyout-menu
            tabindex="-1"
            class="
              fixed
              w-56
              max-h-[calc(100vh-2rem)]
              rounded-xl
              border border-border-subtle/50
              bg-bg-panel/95
              backdrop-blur-xl
              shadow-2xl
              flex flex-col
              animate-slideIn
              overflow-hidden
              z-[200]
            "
            style={{
              top: `${position().top}px`,
              left: `${position().left}px`,
              'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
          {/* Header */}
          <div class="px-3 py-2.5 border-b border-border-subtle/50 flex items-center justify-between bg-bg-sidebar/50">
            <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider">
              {section().title}
            </h2>
            <Show when={isSectionPinned(section().title)}>
              <button
                onClick={() => unpinSection()}
                class="
                  p-1 rounded-md hover:bg-bg-hover
                  text-text-muted hover:text-text-primary
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                "
                title="Unpin section"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Show>
          </div>

          {/* Navigation Items - scrollable with proper constraints */}
          <nav class="overflow-y-auto py-1.5 px-1.5 min-h-0 flex-1">
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
                      w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                      ${
                        isActive()
                          ? 'bg-gradient-to-r from-brand-cyan/20 to-brand-purple/10 text-brand-cyan border border-brand-cyan/30'
                          : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                      }
                    `}
                  >
                    <svg
                      class={`w-4 h-4 flex-shrink-0 ${isActive() ? 'text-brand-cyan' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                    </svg>
                    <span class="text-sm flex-1 text-left truncate">{item.label}</span>

                    {/* Pulse indicator */}
                    <Show when={showPulse()}>
                      <span class="w-2 h-2 rounded-full bg-status-danger animate-pulseSoft" />
                    </Show>

                    {/* Active indicator */}
                    <Show when={isActive()}>
                      <span class="w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-glowCyan" />
                    </Show>
                  </button>
                );
              }}
            </For>
          </nav>
        </div>
        </>
      )}
    </Show>
  );
};

export default SidebarFlyout;

