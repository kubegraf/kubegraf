import { Component, For, Show, createSignal } from 'solid-js';
import { namespace, setNamespace, namespaces, clusterStatus, refreshAll, namespacesResource } from '../stores/cluster';
import { toggleAIPanel, searchQuery, setSearchQuery } from '../stores/ui';
import ThemeToggle from './ThemeToggle';

const Header: Component = () => {
  const [searchFocused, setSearchFocused] = createSignal(false);

  // Keyboard shortcut for search
  if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    });
  }

  return (
    <header class="h-16 header-glass flex items-center justify-between px-6">
      {/* Left side - Namespace selector & Search */}
      <div class="flex items-center gap-4">
        {/* Namespace selector */}
        <div class="flex items-center gap-2">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Namespace:</label>
          <select
            value={namespace()}
            onChange={(e) => setNamespace(e.target.value)}
            class="rounded-lg px-3 py-1.5 text-sm min-w-[150px]"
          >
            <option value="_all">All Namespaces</option>
            <Show when={!namespacesResource.loading} fallback={<option disabled>Loading...</option>}>
              <For each={namespaces()}>
                {(ns) => <option value={ns}>{ns}</option>}
              </For>
            </Show>
          </select>
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
