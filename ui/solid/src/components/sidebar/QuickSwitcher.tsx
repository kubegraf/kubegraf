import { Component, Show, For, createSignal, createMemo, onMount, onCleanup } from 'solid-js';
import type { NavSection, NavItem } from '../../config/navSections';
import { setCurrentView } from '../../stores/ui';
import { pinSection } from '../../stores/sidebarState';

interface QuickSwitcherProps {
  sections: NavSection[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Cmd+K quick switcher component
 * Allows jumping directly to any sidebar section or item
 */
const QuickSwitcher: Component<QuickSwitcherProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  // Flatten all items with their section info
  const allItems = createMemo(() => {
    const items: Array<{ item: NavItem; section: NavSection }> = [];
    props.sections.forEach((section) => {
      section.items.forEach((item) => {
        items.push({ item, section });
      });
    });
    return items;
  });

  // Filter items based on query
  const filteredItems = createMemo(() => {
    const q = query().toLowerCase().trim();
    if (!q) return [];

    return allItems().filter(({ item, section }) => {
      return (
        item.label.toLowerCase().includes(q) ||
        section.title.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  });

  // Reset selected index when query changes
  createMemo(() => {
    query();
    setSelectedIndex(0);
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems().length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selected = filteredItems()[selectedIndex()];
        if (selected) {
          handleSelect(selected.item, selected.section);
        }
        break;
      case 'Escape':
        e.preventDefault();
        props.onClose();
        break;
    }
  };

  const handleSelect = (item: NavItem, section: NavSection) => {
    setCurrentView(item.id as any);
    pinSection(section.title);
    props.onClose();
    setQuery('');
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Handle Cmd+K / Ctrl+K
  onMount(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!props.isOpen) {
          // Open switcher - handled by parent
        } else {
          props.onClose();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={props.onClose}
      />

      {/* Switcher Modal */}
      <div
        class="
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-full max-w-2xl
          bg-bg-panel border border-border-subtle rounded-lg
          shadow-elevated
          z-50
          animate-fadeIn
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div class="px-4 py-3 border-b border-border-subtle">
          <div class="relative">
            <svg
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search sections and items... (Cmd+K)"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              class="
                w-full pl-10 pr-4 py-2
                bg-bg-panelAlt border border-border-subtle rounded-md
                text-text-primary placeholder-text-muted
                focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
              "
              autofocus
            />
          </div>
        </div>

        {/* Results */}
        <div class="max-h-96 overflow-y-auto py-2">
          <Show
            when={filteredItems().length > 0}
            fallback={
              <div class="px-4 py-8 text-center text-text-muted text-sm">
                {query() ? 'No results found' : 'Start typing to search...'}
              </div>
            }
          >
            <For each={filteredItems()}>
              {({ item, section }, index) => (
                <button
                  onClick={() => handleSelect(item, section)}
                  class={`
                    w-full flex items-center gap-3 px-4 py-2.5
                    transition-colors
                    focus:outline-none
                    ${
                      index() === selectedIndex()
                        ? 'bg-bg-panelAlt text-brand-cyan'
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
                  <div class="flex-1 text-left">
                    <div class="text-sm font-medium">{item.label}</div>
                    <div class="text-xs text-text-muted">{section.title}</div>
                  </div>
                </button>
              )}
            </For>
          </Show>
        </div>

        {/* Footer */}
        <div class="px-4 py-2 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">↑</kbd>
              <kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">↓</kbd>
              Navigate
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">Enter</kbd>
              Select
            </span>
          </div>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-bg-panelAlt border border-border-subtle rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </Show>
  );
};

export default QuickSwitcher;

