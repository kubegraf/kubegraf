import { Component, For, Show, createSignal, createMemo, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { namespace, setNamespace, namespaces, clusterStatus, refreshAll, namespacesResource } from '../stores/cluster';
import { toggleAIPanel, searchQuery, setSearchQuery } from '../stores/ui';
import ThemeToggle from './ThemeToggle';

const Header: Component = () => {
  const [searchFocused, setSearchFocused] = createSignal(false);
  const [nsDropdownOpen, setNsDropdownOpen] = createSignal(false);
  const [nsSearch, setNsSearch] = createSignal('');
  let nsDropdownRef: HTMLDivElement | undefined;
  let nsButtonRef: HTMLButtonElement | undefined;

  // Filtered namespaces based on search
  const filteredNamespaces = createMemo(() => {
    const search = nsSearch().toLowerCase();
    if (!search) return namespaces();
    return namespaces().filter(ns => ns.toLowerCase().includes(search));
  });

  // Keyboard shortcut for search
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (nsDropdownOpen() && nsDropdownRef && !nsDropdownRef.contains(e.target as Node) &&
          nsButtonRef && !nsButtonRef.contains(e.target as Node)) {
        setNsDropdownOpen(false);
        setNsSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
  }

  const selectNamespace = (ns: string) => {
    setNamespace(ns);
    setNsDropdownOpen(false);
    setNsSearch('');
  };

  const getDisplayName = () => {
    return namespace() === '_all' ? 'All Namespaces' : namespace();
  };

  return (
    <header class="h-16 header-glass flex items-center justify-between px-6 relative" style={{ 'z-index': 100 }}>
      {/* Left side - Namespace selector & Search */}
      <div class="flex items-center gap-4">
        {/* Namespace selector with search */}
        <div class="flex items-center gap-2 relative">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Namespace:</label>
          <button
            ref={nsButtonRef}
            onClick={() => setNsDropdownOpen(!nsDropdownOpen())}
            class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[180px] justify-between"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span class="truncate">{getDisplayName()}</span>
            <svg class={`w-4 h-4 transition-transform ${nsDropdownOpen() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          <Show when={nsDropdownOpen()}>
            <div
              ref={nsDropdownRef}
              class="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-[200] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Search input */}
              <div class="p-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
                <div class="relative">
                  <svg
                    class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search namespaces..."
                    value={nsSearch()}
                    onInput={(e) => setNsSearch(e.target.value)}
                    class="w-full rounded-md pl-8 pr-3 py-1.5 text-sm"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                    autofocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div class="max-h-64 overflow-y-auto">
                {/* All namespaces option */}
                <Show when={!nsSearch() || 'all namespaces'.includes(nsSearch().toLowerCase())}>
                  <button
                    onClick={() => selectNamespace('_all')}
                    class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                    style={{
                      background: namespace() === '_all' ? 'var(--bg-tertiary)' : 'transparent',
                      color: namespace() === '_all' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = namespace() === '_all' ? 'var(--bg-tertiary)' : 'transparent'}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    All Namespaces
                    <Show when={namespace() === '_all'}>
                      <svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </Show>
                  </button>
                </Show>

                {/* Namespace list */}
                <Show when={!namespacesResource.loading} fallback={
                  <div class="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                }>
                  <For each={filteredNamespaces()}>
                    {(ns) => (
                      <button
                        onClick={() => selectNamespace(ns)}
                        class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                        style={{
                          background: namespace() === ns ? 'var(--bg-tertiary)' : 'transparent',
                          color: namespace() === ns ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = namespace() === ns ? 'var(--bg-tertiary)' : 'transparent'}
                      >
                        <svg class="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span class="truncate flex-1">{ns}</span>
                        <Show when={namespace() === ns}>
                          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </Show>
                      </button>
                    )}
                  </For>
                </Show>

                {/* No results */}
                <Show when={nsSearch() && filteredNamespaces().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No namespaces found
                  </div>
                </Show>
              </div>

              {/* Footer with count */}
              <div class="px-3 py-2 text-xs border-t" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                {namespaces().length} namespaces available
              </div>
            </div>
          </Show>
        </div>

        {/* Global Search */}
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="global-search"
            type="text"
            placeholder="Search resources..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            class="w-72 rounded-lg pl-10 pr-16 py-1.5 text-sm"
          />
          <Show when={!searchFocused()}>
            <kbd class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              ⌘K
            </kbd>
          </Show>
        </div>
      </div>

      {/* Right side - Status and actions */}
      <div class="flex items-center gap-4">
        {/* Connection status */}
        <div class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-2">
            <span class={`status-dot ${clusterStatus().connected ? 'connected' : 'disconnected'}`}></span>
            <span style={{ color: clusterStatus().connected ? 'var(--success-color)' : 'var(--text-muted)' }}>
              {clusterStatus().connected ? clusterStatus().context : 'Not connected'}
            </span>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={refreshAll}
          class="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-secondary)' }}
          title="Refresh all data"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* AI Assistant button */}
        <button
          onClick={toggleAIPanel}
          class="flex items-center gap-2 px-4 py-2 btn-accent rounded-lg"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
