import { Component, For, Show, createMemo, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { currentView, setCurrentView, sidebarCollapsed } from '../../stores/ui';
import type { NavSection } from '../../config/navSections';
import { prefetchView } from '../../utils/sidebarPrefetch';
import { isSidebarSectionOpen, toggleSidebarSection } from './sidebarSectionState';

export const AnimatedSection: Component<{
  section: NavSection;
  showPulse?: boolean;
}> = (props) => {
  const isOpen = createMemo(() => sidebarCollapsed() || isSidebarSectionOpen(props.section.title));
  const itemAnimClass = createMemo(() =>
    isOpen()
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 -translate-x-1 pointer-events-none'
  );

  const hasActiveItem = () => props.section.items.some((item) => currentView() === item.id);

  return (
    <div class="mb-3">
      <Show when={!sidebarCollapsed()}>
        <button
          class={
            `w-full flex items-center justify-between px-2 py-2 text-xs uppercase tracking-wider transition-all ` +
            `${hasActiveItem() ? 'text-white' : 'text-white/70 hover:text-white'} ` +
            `active:scale-[0.99]`
          }
          onClick={() => toggleSidebarSection(props.section.title)}
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="truncate">{props.section.title}</span>
            <Show when={props.showPulse}>
              <span class="sidebar-pulse-dot" style={{ background: 'var(--accent-primary)' }} />
            </Show>
          </div>
          <span
            class={
              `transition-transform duration-300 will-change-transform ` +
              `${isOpen() ? 'rotate-90' : 'rotate-0'}`
            }
            style={{ color: 'var(--text-muted)' }}
            aria-hidden="true"
          >
            ▶
          </span>
        </button>
      </Show>

      {/* Animated Content */}
      <div
        class={
          `overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ` +
          `${isOpen() ? 'opacity-100 max-h-[600px]' : 'opacity-0 max-h-0'}`
        }
      >
        <div class={
          `mt-1 space-y-1 ${sidebarCollapsed() ? '' : 'pl-2 border-l'} `
        }
        style={sidebarCollapsed() ? {} : { borderColor: 'rgba(255,255,255,0.10)' }}>
          <For each={props.section.items}>
            {(item) => {
              const [hovered, setHovered] = createSignal(false);
              const [pos, setPos] = createSignal({ top: 0, left: 0 });
              const [hoverTimeout, setHoverTimeout] = createSignal<number | null>(null);
              const active = () => currentView() === item.id;

              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentView(item.id);
                    // Scroll to top of content area (not window top, but main content)
                    setTimeout(() => {
                      const mainContent = document.querySelector('main');
                      if (mainContent) {
                        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                  onMouseEnter={(e) => {
                    if (sidebarCollapsed()) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
                      // Clear any existing timeout
                      if (hoverTimeout() !== null) {
                        clearTimeout(hoverTimeout()!);
                      }
                      setHovered(true);
                    }
                    prefetchView(item.id);
                  }}
                  onMouseLeave={() => {
                    // Add delay before hiding to allow moving to submenu
                    if (sidebarCollapsed()) {
                      const timeout = window.setTimeout(() => {
                        setHovered(false);
                      }, 200); // 200ms delay
                      setHoverTimeout(timeout);
                    } else {
                      setHovered(false);
                    }
                  }}
                  class={
                    `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ` +
                    `transition-all transform ` +
                    `${active() ? 'bg-white/10 text-white scale-[1.01]' : 'text-white/80 hover:bg-white/5 hover:scale-[1.005]'} ` +
                    `active:scale-[0.99] ` +
                    `transition-[opacity,transform,background-color] duration-300 ` +
                    itemAnimClass()
                  }
                >
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: active() ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                  </svg>

                  <Show when={!sidebarCollapsed()}>
                    <span class="truncate">{item.label}</span>
                  </Show>

                  <Show when={sidebarCollapsed() && hovered()}>
                    <Portal>
                      <div
                        class="fixed px-2 py-1 rounded text-xs font-medium whitespace-nowrap z-[9999] pointer-events-none"
                        onMouseEnter={() => {
                          // Keep visible when hovering over tooltip
                          if (hoverTimeout() !== null) {
                            clearTimeout(hoverTimeout()!);
                          }
                        }}
                        style={{
                          top: `${pos().top}px`,
                          left: `${pos().left}px`,
                          transform: 'translateY(-50%)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          'box-shadow': '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {item.label}
                      </div>
                    </Portal>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
