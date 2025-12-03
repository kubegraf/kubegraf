import { Component, For, Show, createSignal, onMount, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  selectedNamespaces,
  allNamespaces,
  namespaceFilter,
  setNamespaceFilter,
  toggleNamespace,
  selectAllNamespaces,
  clearAllNamespaces,
  isNamespaceSelected,
  fetchAndUpdateNamespaces,
} from '../stores/namespace';

const NamespaceSelector: Component = () => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [dropdownPosition, setDropdownPosition] = createSignal({ top: 0, left: 0 });
  let buttonRef: HTMLButtonElement | undefined;

  onMount(() => {
    // Fetch namespaces on mount
    fetchAndUpdateNamespaces();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAndUpdateNamespaces, 30000);
    return () => clearInterval(interval);
  });

  const filteredNamespaces = createMemo(() => {
    const filter = namespaceFilter().toLowerCase();
    if (!filter) return allNamespaces();
    return allNamespaces().filter((ns) => ns.toLowerCase().includes(filter));
  });

  const handleToggle = () => {
    if (!isOpen() && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setIsOpen(!isOpen());
  };

  const selectedCount = createMemo(() => selectedNamespaces().length);
  const totalCount = createMemo(() => allNamespaces().length);

  const displayText = createMemo(() => {
    const count = selectedCount();
    const total = totalCount();
    if (count === total) return `All namespaces (${total})`;
    if (count === 1) return selectedNamespaces()[0];
    return `${count} namespaces`;
  });

  return (
    <>
      <button
        ref={buttonRef}
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onClick={handleToggle}
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <span>{displayText()}</span>
        <svg
          class="w-4 h-4 transition-transform"
          classList={{ 'rotate-180': isOpen() }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <Show when={isOpen()}>
        <Portal>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            style={{ background: 'transparent' }}
          />

          {/* Dropdown */}
          <div
            class="fixed z-50 rounded-lg shadow-2xl"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              top: `${dropdownPosition().top}px`,
              left: `${dropdownPosition().left}px`,
              width: '320px',
              'max-height': '480px',
              'overflow-y': 'auto',
            }}
          >
            {/* Header */}
            <div class="p-4 border-b" style={{ 'border-color': 'var(--border-color)' }}>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Select Namespaces
                </h3>
                <span class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedCount()} / {totalCount()}
                </span>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Filter namespaces..."
                class="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                value={namespaceFilter()}
                onInput={(e) => setNamespaceFilter(e.currentTarget.value)}
              />

              {/* Quick Actions */}
              <div class="flex gap-2 mt-3">
                <button
                  class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: 'var(--primary-color)',
                    color: 'white',
                  }}
                  onClick={() => {
                    selectAllNamespaces();
                    setIsOpen(false);
                  }}
                >
                  Select All
                </button>
                <button
                  class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                  }}
                  onClick={() => {
                    clearAllNamespaces();
                    setIsOpen(false);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Namespace List */}
            <div class="p-2">
              <Show
                when={filteredNamespaces().length > 0}
                fallback={
                  <div class="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    <p class="text-sm">No namespaces found</p>
                  </div>
                }
              >
                <For each={filteredNamespaces()}>
                  {(namespace) => {
                    const isSelected = createMemo(() => isNamespaceSelected(namespace));
                    return (
                      <button
                        class="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all hover:opacity-80"
                        style={{
                          background: isSelected()
                            ? 'var(--primary-color-alpha)'
                            : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                        onClick={() => toggleNamespace(namespace)}
                      >
                        {/* Checkbox */}
                        <div
                          class="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected()
                              ? 'var(--primary-color)'
                              : 'var(--input-bg)',
                            border: isSelected()
                              ? 'none'
                              : '1px solid var(--border-color)',
                          }}
                        >
                          <Show when={isSelected()}>
                            <svg
                              class="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </Show>
                        </div>

                        {/* Namespace Name */}
                        <span class="flex-1 text-left">{namespace}</span>

                        {/* Badge for system namespaces */}
                        <Show
                          when={
                            namespace.startsWith('kube-') ||
                            namespace === 'default' ||
                            namespace === 'kube-system'
                          }
                        >
                          <span
                            class="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: 'var(--warning-color-alpha)',
                              color: 'var(--warning-color)',
                            }}
                          >
                            System
                          </span>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </Show>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
};

export default NamespaceSelector;
