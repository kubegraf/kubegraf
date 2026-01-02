import { Component, For, Show, createMemo, createEffect, createSignal, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { NavSection } from '../../config/navSections';
import { currentView, setCurrentView, setTerminalOpen } from '../../stores/ui';
import { setActive, pinSection, isSectionActive, isSectionPinned, isSectionPinned as checkSectionPinned, unpinSection } from '../../stores/sidebarState';
import { unreadInsightsEvents } from '../../stores/insightsPulse';

interface SidebarRailProps {
  sections: NavSection[];
  onSectionClick?: (section: NavSection) => void;
}

/**
 * Left rail component - shows primary category icons
 */
const SidebarRail: Component<SidebarRailProps> = (props) => {
  // Get icon for section (use first item's icon or a default)
  const getSectionIcon = (section: NavSection): string => {
    if (section.items.length > 0) {
      return section.items[0].icon;
    }
    // Default icons per section
    const iconMap: Record<string, string> = {
      'Overview': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'Insights': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      'Workloads': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      'Networking': 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      'Config & Storage': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'Access Control': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      'Platform': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      'Intelligence': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      'Machine learning': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      'Custom Resources': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      'CD': 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    };
    return iconMap[section.title] || section.items[0]?.icon || '';
  };

  // Check if section has active items
  const hasActiveItem = (section: NavSection): boolean => {
    return section.items.some((item) => currentView() === item.id);
  };

  // Get short label for section
  const getShortLabel = (section: NavSection): string => {
    // Return first 2-3 letters or abbreviation
    const abbreviations: Record<string, string> = {
      'Overview': 'OV',
      'Insights': 'IN',
      'Workloads': 'WK',
      'Networking': 'NW',
      'Config & Storage': 'CS',
      'Access Control': 'AC',
      'Platform': 'PL',
      'Intelligence': 'AI',
      'Machine learning': 'ML',
      'Custom Resources': 'CR',
      'CD': 'CD',
    };
    return abbreviations[section.title] || section.title.substring(0, 2).toUpperCase();
  };

  const handleItemClick = (itemId: string) => {
    // Special handling for terminal - open docked terminal instead of navigating
    if (itemId === 'terminal') {
      setTerminalOpen(true);
      return;
    }
    
    setCurrentView(itemId as any);
    // Scroll to top of content area
    setTimeout(() => {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div class="w-16 flex flex-col" style={{ overflow: 'visible' }}>
      <nav class="flex-1 py-2 space-y-1" style={{ overflow: 'visible' }}>
        <For each={props.sections}>
          {(section) => {
            const active = () => isSectionActive(section.title);
            const pinned = () => isSectionPinned(section.title);
            const hasActive = () => hasActiveItem(section);
            const showInsightsPulse = () => section.title === 'Insights' && unreadInsightsEvents() > 0;

            let wrapperRef: HTMLDivElement | undefined;
            let flyoutRef: HTMLDivElement | undefined;
            const [flyoutPosition, setFlyoutPosition] = createSignal({ top: 0, left: 0 });
            let closeTimeout: number | null = null;

            // Update flyout position when active - use requestAnimationFrame to ensure DOM is ready
            createEffect(() => {
              if (active()) {
                const updatePosition = () => {
                  if (wrapperRef) {
                    const rect = wrapperRef.getBoundingClientRect();
                    setFlyoutPosition({
                      top: rect.top,
                      left: rect.right,
                    });
                  }
                };
                
                // Use requestAnimationFrame to ensure DOM is updated
                requestAnimationFrame(() => {
                  updatePosition();
                });
                
                // Update on scroll/resize
                const handleScroll = () => updatePosition();
                const handleResize = () => updatePosition();
                
                window.addEventListener('scroll', handleScroll, true);
                window.addEventListener('resize', handleResize);
                
                // Cleanup listeners
                onCleanup(() => {
                  window.removeEventListener('scroll', handleScroll, true);
                  window.removeEventListener('resize', handleResize);
                });
              }
            });

            // Cleanup timeout on unmount
            onCleanup(() => {
              if (closeTimeout !== null) {
                clearTimeout(closeTimeout);
              }
            });

            return (
              // ✅ ONE wrapper that contains BOTH the button AND the flyout submenu
              <div
                ref={wrapperRef}
                class="relative"
                style={{ overflow: 'visible' }}
                onMouseEnter={() => {
                  // Cancel any pending close
                  if (closeTimeout !== null) {
                    clearTimeout(closeTimeout);
                    closeTimeout = null;
                  }
                  // Activate section immediately on hover
                  setActive(section.title);
                }}
                onMouseLeave={(e) => {
                  // ✅ Only close if the mouse truly left this wrapper (not moving between children)
                  const next = e.relatedTarget as Node | null;
                  if (next && wrapperRef && wrapperRef.contains(next)) {
                    // Mouse is moving to a child element, don't close
                    return;
                  }
                  
                  // Check if mouse is moving to the flyout (only if flyout is active)
                  if (active() && next && flyoutRef && (flyoutRef.contains(next) || flyoutRef === next)) {
                    // Mouse is moving to flyout, don't close
                    return;
                  }
                  
                  // Mouse truly left the wrapper - close with small delay to allow movement to flyout
                  if (!pinned()) {
                    // Clear any existing timeout
                    if (closeTimeout !== null) {
                      clearTimeout(closeTimeout);
                    }
                    // Add small delay to allow mouse to reach flyout (only if flyout is active)
                    if (active()) {
                      closeTimeout = window.setTimeout(() => {
                        // Double-check that mouse is not over flyout before closing
                        if (flyoutRef && document.elementFromPoint) {
                          const mouseX = e.clientX;
                          const mouseY = e.clientY;
                          const elementAtPoint = document.elementFromPoint(mouseX, mouseY);
                          if (elementAtPoint && flyoutRef.contains(elementAtPoint)) {
                            // Mouse is over flyout, don't close
                            return;
                          }
                        }
                        // Only close if still active (might have been pinned or reactivated)
                        if (!pinned() && active()) {
                          setActive(null);
                        }
                        closeTimeout = null;
                      }, 150); // 150ms delay to allow smooth transition to flyout
                    } else {
                      // Flyout not active, close immediately
                      setActive(null);
                    }
                  }
                }}
              >
                <button
                  data-section-rail={section.title}
                  onClick={() => {
                    if (pinned()) {
                      pinSection(null);
                    } else {
                      pinSection(section.title);
                    }
                    props.onSectionClick?.(section);
                  }}
                  class={`
                    w-full flex flex-col items-center justify-center
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                    ${active() || hasActive()
                      ? 'text-brand-cyan shadow-glowCyan'
                      : 'text-text-primary hover:text-text-primary hover:bg-bg-hover'
                    }
                    ${pinned() ? 'bg-bg-panelAlt' : ''}
                  `}
                  style={{
                    opacity: active() || hasActive() ? 1 : 0.95,
                    gap: 'clamp(2px, 0.25rem, 4px)',
                    padding: 'clamp(6px, 0.625rem, 10px) clamp(4px, 0.5rem, 8px)'
                  }}
                  title={section.title}
                >
                  <svg
                    class="flex-shrink-0"
                    style={{ width: 'clamp(16px, 1.25rem, 20px)', height: 'clamp(16px, 1.25rem, 20px)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d={getSectionIcon(section)} />
                  </svg>
                  <span class="font-bold leading-tight text-center" style={{ 'font-size': 'clamp(8px, 0.625rem, 10px)' }}>
                    {getShortLabel(section)}
                  </span>
                  
                  {/* Pulse indicator for Insights */}
                  <Show when={showInsightsPulse()}>
                    <span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-danger animate-pulseSoft" />
                  </Show>
                  
                  {/* Active indicator */}
                  <Show when={hasActive() && !active()}>
                    <span class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-brand-cyan rounded-r" />
                  </Show>
                </button>

                {/* ✅ Flyout submenu - rendered via Portal with fixed positioning to avoid overflow clipping */}
                <Show when={active()}>
                  <Portal mount={document.body}>
                    <div
                      ref={flyoutRef}
                      class="pointer-events-auto"
                      style={{
                        position: 'fixed',
                        top: `${flyoutPosition().top}px`,
                        left: `${flyoutPosition().left}px`,
                        'z-index': 9999,
                        'will-change': 'transform',
                        'contain': 'none',
                      }}
                      onMouseEnter={() => {
                        // Cancel any pending close when mouse enters flyout
                        if (closeTimeout !== null) {
                          clearTimeout(closeTimeout);
                          closeTimeout = null;
                        }
                        // Keep flyout open when hovering over it
                        setActive(section.title);
                      }}
                      onMouseLeave={() => {
                        // Close if not pinned
                        if (!checkSectionPinned(section.title)) {
                          // Clear any existing timeout
                          if (closeTimeout !== null) {
                            clearTimeout(closeTimeout);
                          }
                          setActive(null);
                          closeTimeout = null;
                        }
                      }}
                    >
                      <div
                        class="
                          w-56
                          max-h-[calc(100dvh-2rem)]
                          rounded-xl
                          border border-border-subtle/50
                          bg-bg-panel/95
                          backdrop-blur-xl
                          shadow-2xl
                          flex flex-col
                          animate-slideIn
                          overflow-hidden
                          min-h-0
                        "
                        style={{
                          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                        }}
                      >
                      {/* Header */}
                      <div class="px-3 py-2.5 border-b border-border-subtle/50 flex items-center justify-between bg-bg-sidebar/50">
                        <h2 class="text-xs font-bold text-text-primary uppercase tracking-wider">
                          {section.title}
                        </h2>
                        <Show when={checkSectionPinned(section.title)}>
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
                        <For each={section.items}>
                          {(item) => {
                            const isActive = () => currentView() === item.id;
                            const showPulse = () => section.title === 'Insights' && unreadInsightsEvents() > 0 && item.id === 'incidents';

                            return (
                              <button
                                onClick={() => handleItemClick(item.id)}
                                class={`
                                  w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                                  transition-all duration-150
                                  focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                                  ${
                                    isActive()
                                      ? 'bg-gradient-to-r from-brand-cyan/20 to-brand-purple/10 text-brand-cyan border border-brand-cyan/30'
                                      : 'text-text-primary hover:bg-white/5 hover:text-text-primary'
                                  }
                                `}
                                style={{
                                  opacity: isActive() ? 1 : 0.95
                                }}
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
                                <span class="text-sm font-semibold flex-1 text-left truncate">{item.label}</span>

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
                    </div>
                  </Portal>
                </Show>
              </div>
            );
          }}
        </For>
      </nav>
    </div>
  );
};

export default SidebarRail;

