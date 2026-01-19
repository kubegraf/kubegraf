import { Component, For, Show, createSignal, createMemo, createEffect, onCleanup, createResource, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  namespace,
  setNamespace,
  namespaces,
  clusterStatus,
  refreshAll,
  namespacesResource,
  contexts,
  currentContext,
  switchContext,
  contextsResource,
  selectedNamespaces,
  setSelectedNamespaces,
  workspaceContext,
} from '../stores/cluster';
import { toggleAIPanel, setCurrentView, addNotification, currentView } from '../stores/ui';
import { openCommandPalette, setCommandPaletteButtonRef } from '../stores/commandPalette';
import { clusterManagerStatus, goToClusterManager } from '../stores/clusterManager';
import { clusterSimpleStore } from '../stores/clusterSimple';
import { setNamespaces } from '../stores/globalStore';
import { toggleBrainPanel, brainPanelOpen } from '../stores/brain';
import ThemeToggle from './ThemeToggle';
import NotificationCenter from './NotificationCenter';
import { api } from '../services/api';
import { DOCS_URL, BUG_URL, FEATURE_URL, CONTACT_EMAIL } from '../config/links';
import LocalTerminalModal from './LocalTerminalModal';
import { favorites, toggleFavorite, isFavorite } from '../stores/favorites';
import { navSections } from '../config/navSections';
import { CloudProviderLogo } from './cloud-logos';
import { useWorkerFilter } from '../hooks/useWorkerFilter';
import { settings, updateSetting } from '../stores/settings';

const Header: Component = () => {
  const [nsDropdownOpen, setNsDropdownOpen] = createSignal(false);
  const [nsSearch, setNsSearch] = createSignal('');
  const [ctxDropdownOpen, setCtxDropdownOpen] = createSignal(false);
  const [ctxSearch, setCtxSearch] = createSignal('');
  const [switching, setSwitching] = createSignal(false);
  const [terminalOpen, setTerminalOpen] = createSignal(false);
  const [nsSelection, setNsSelection] = createSignal<string[]>([]);
  const [nsSelectionMode, setNsSelectionMode] = createSignal<'default' | 'all' | 'custom'>('default');
  const [backendAvailable, setBackendAvailable] = createSignal<boolean | null>(null); // null = not checked yet
  const [helpDropdownOpen, setHelpDropdownOpen] = createSignal(false);
  let nsDropdownRef: HTMLDivElement | undefined;
  let nsButtonRef: HTMLButtonElement | undefined;
  let ctxDropdownRef: HTMLDivElement | undefined;
  let ctxButtonRef: HTMLButtonElement | undefined;
  let helpDropdownRef: HTMLDivElement | undefined;
  let helpButtonRef: HTMLButtonElement | undefined;

  // Check backend health on mount (only once)
  onMount(() => {
    // Check if checkHealth exists (for backwards compatibility)
    if (api.checkHealth && typeof api.checkHealth === 'function') {
      api.checkHealth()
        .then(() => {
          setBackendAvailable(true);
        })
        .catch(() => {
          setBackendAvailable(false);
        });
    } else {
      // Fallback: use getStatus if checkHealth is not available
      api.getStatus()
        .then(() => {
          setBackendAvailable(true);
        })
        .catch(() => {
          setBackendAvailable(false);
        });
    }
  });

  // Fetch cloud info (fast endpoint - single API call)
  const [cloudInfo] = createResource(() => api.getCloudInfo().catch(() => null));

  // Short display names for cloud providers
  const getProviderShortName = () => {
    const provider = cloudInfo()?.provider?.toLowerCase();
    const shortNames: Record<string, string> = {
      gcp: 'GCP',
      aws: 'AWS',
      azure: 'Azure',
      ibm: 'IBM',
      oracle: 'Oracle',
      digitalocean: 'DO',
      alibaba: 'Alibaba',
      linode: 'Linode',
      vultr: 'Vultr',
      ovh: 'OVH',
      hetzner: 'Hetzner',
      kind: 'Kind',
      minikube: 'Minikube',
      'docker-desktop': 'Docker',
      k3s: 'K3s',
      rancher: 'Rancher',
      openshift: 'OpenShift',
    };
    return shortNames[provider || ''] || cloudInfo()?.displayName || 'Cloud';
  };

  // Filtered namespaces based on search
  const filteredNamespaces = useWorkerFilter(namespaces, nsSearch, { threshold: 2000 });

  // Filtered contexts based on search (worker filters names, we map back to objects)
  const filteredContextNames = useWorkerFilter(
    () => contexts().map((c) => c.name),
    ctxSearch,
    { threshold: 2000 }
  );
  // Use simple cluster store for dropdown
  const simpleClusters = () => clusterSimpleStore.clusters();
  const currentCluster = () => clusterSimpleStore.currentCluster();

  const filteredContexts = createMemo(() => {
    const names = new Set(filteredContextNames());
    if (!ctxSearch().trim()) return contexts();
    return contexts().filter((c) => names.has(c.name));
  });

  createEffect(() => {
    const ctx = workspaceContext();
    const mode = (ctx?.filters?.namespaceMode as 'default' | 'all' | 'custom' | undefined)
      || (selectedNamespaces().length === 0 ? 'default' : 'custom');
    
    // Only update local selection if workspace context changed (not when user is selecting)
    // This prevents resetting the selection while user is choosing namespaces
    if (!nsDropdownOpen()) {
      setNsSelection(selectedNamespaces());
      setNsSelectionMode(mode);
    }
  });

  // Close dropdown when clicking outside
  if (typeof window !== 'undefined') {
    const handleClickOutside = (e: MouseEvent) => {
      if (nsDropdownOpen() && nsDropdownRef && !nsDropdownRef.contains(e.target as Node) &&
          nsButtonRef && !nsButtonRef.contains(e.target as Node)) {
        setNsDropdownOpen(false);
        setNsSearch('');
      }
      if (ctxDropdownOpen() && ctxDropdownRef && !ctxDropdownRef.contains(e.target as Node) &&
          ctxButtonRef && !ctxButtonRef.contains(e.target as Node)) {
        setCtxDropdownOpen(false);
        setCtxSearch('');
      }
      if (helpDropdownOpen() && helpDropdownRef && !helpDropdownRef.contains(e.target as Node) &&
          helpButtonRef && !helpButtonRef.contains(e.target as Node)) {
        setHelpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
  }

  const toggleNamespaceSelection = (ns: string) => {
    const current = new Set(nsSelection());
    if (current.has(ns)) {
      current.delete(ns);
    } else {
      current.add(ns);
    }
    setNsSelection(Array.from(current));
    setNsSelectionMode('custom');
  };

  const isNamespaceChecked = (ns: string) => nsSelection().includes(ns);

  const applyNamespaceSelection = async () => {
    try {
      // Update global store with selected namespaces
      const selected = nsSelectionMode() === 'all' || nsSelection().length === 0 
        ? [] 
        : nsSelection();
      
      // Update global store (this will trigger cache invalidation)
      setNamespaces(selected);
      
      // Update namespace signal directly (like v1.3.0-rc6) for backward compatibility
      if (nsSelectionMode() === 'all' || nsSelection().length === 0) {
        setNamespace('All Namespaces');
      } else if (nsSelection().length === 1) {
        setNamespace(nsSelection()[0]);
      } else {
        // For multiple namespaces, just use the first one (like v1.3.0-rc6)
        setNamespace(nsSelection()[0]);
      }
      
      // Also update workspace context for persistence (non-blocking)
      setSelectedNamespaces(nsSelection(), nsSelectionMode()).catch(err => {
        console.error('Failed to persist workspace context', err);
        // Don't show error to user - namespace is already updated
      });
      
      setNsDropdownOpen(false);
      setNsSearch('');
    } catch (err) {
      console.error('Failed to update namespace', err);
      addNotification('Failed to update namespace', 'error');
      setNsDropdownOpen(false);
      setNsSearch('');
    }
  };


  const handleSelectAllNamespaces = () => {
    setNsSelection([]);
    setNsSelectionMode('all');
    // Don't call setNamespace here - it will be updated when Apply is clicked
  };

  const getDisplayName = () => namespace();

  // Connect to cluster using simple cluster store
  const selectContext = async (contextName: string) => {
    if (contextName === currentCluster()?.contextName) {
      setCtxDropdownOpen(false);
      setCtxSearch('');
      return;
    }
    setSwitching(true);
    try {
      await clusterSimpleStore.switchCluster(contextName);
      addNotification(`Switched to ${contextName}`, 'success');
      setCtxDropdownOpen(false);
    } catch (err: any) {
      console.error('Failed to switch cluster:', err);
      addNotification(err?.message || 'Failed to switch cluster', 'error');
    } finally {
      setSwitching(false);
      setCtxDropdownOpen(false);
      setCtxSearch('');
    }
  };

  // Get all available views from navSections
  const allViews = navSections.flatMap(section => section.items);
  
  // Get view label helper
  const getViewLabel = (viewId: string) => {
    const item = allViews.find(item => item.id === viewId);
    return item?.label || viewId;
  };
  
  // Get view icon helper
  const getViewIcon = (viewId: string) => {
    const item = allViews.find(item => item.id === viewId);
    return item?.icon || 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2';
  };
  
  // Quick access navigation items - use favorites or default
  const quickAccessItems = createMemo(() => {
    const favs = favorites();
    if (favs.length > 0) {
      return favs.map(view => ({
        label: getViewLabel(view),
        view: view as any,
        icon: getViewIcon(view)
      }));
    }
    // Default items if no favorites
    return [
    { label: 'Dashboard', view: 'dashboard' as const, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Pods Health', view: 'pods' as const, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { label: 'Resource Metrics', view: 'cost' as const, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { label: 'Security Status', view: 'security' as const, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { label: 'Events Log', view: 'monitoredevents' as const, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ];
  });
  
  const [showFavoritesModal, setShowFavoritesModal] = createSignal(false);

  return (
    <>
    <header
      class="h-16 header-glass flex items-center justify-between px-6 relative sticky top-0 flex-shrink-0"
      style={{ 'z-index': 100, 'margin-left': '0.75rem' }}
    >
      {/* Left side - Namespace selector & Search */}
      <div class="flex items-center gap-4">
        {/* Namespace selector with search */}
        <div class="flex items-center gap-2 relative">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Namespace:</label>
          <div class="flex items-center gap-2">
            <button
              ref={nsButtonRef}
              onClick={() => {
                if (!nsDropdownOpen()) {
                  setNsSelection(selectedNamespaces());
                }
                setNsDropdownOpen(!nsDropdownOpen());
              }}
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
          </div>

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

              <div class="max-h-64 overflow-y-auto">
                <button
                  onClick={handleSelectAllNamespaces}
                  class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                  style={{
                    background: nsSelectionMode() === 'all' ? 'var(--bg-tertiary)' : 'transparent',
                    color: nsSelectionMode() === 'all' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  All Namespaces
                  <Show when={nsSelectionMode() === 'all'}>
                    <svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </Show>
                </button>
                <Show when={!namespacesResource.loading} fallback={
                  <div class="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                }>
                  <For each={filteredNamespaces()}>
                    {(ns) => {
                      const checked = createMemo(() => isNamespaceChecked(ns));
                      return (
                        <label
                          class="w-full px-3 py-2 text-sm flex items-center gap-3 cursor-pointer transition-colors"
                          style={{
                            background: checked() ? 'var(--bg-tertiary)' : 'transparent',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <input
                            type="checkbox"
                            class="w-4 h-4"
                            checked={checked()}
                            onInput={() => toggleNamespaceSelection(ns)}
                          />
                          <span class="truncate flex-1">{ns}</span>
                        </label>
                      );
                    }}
                  </For>
                </Show>
                <Show when={nsSearch() && filteredNamespaces().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No namespaces found
                  </div>
                </Show>
              </div>

              <div class="p-3 border-t flex items-center gap-2" style={{ 'border-color': 'var(--border-color)' }}>
                <button
                  class="flex-1 px-3 py-1.5 rounded-md text-sm"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                  onClick={() => {
                    setNsDropdownOpen(false);
                    setNsSearch('');
                    setNsSelection(selectedNamespaces());
                    const ctx = workspaceContext();
                    const mode = (ctx?.filters?.namespaceMode as 'default' | 'all' | 'custom' | undefined)
                      || (selectedNamespaces().length === 0 ? 'default' : 'custom');
                    setNsSelectionMode(mode);
                  }}
                >
                  Cancel
                </button>
                <button
                  class="flex-1 px-3 py-1.5 rounded-md text-sm text-black"
                  style={{ background: 'var(--accent-primary)' }}
                  onClick={applyNamespaceSelection}
                >
                  Apply
                </button>
              </div>

              {/* Footer with count */}
              <div class="px-3 py-2 text-xs border-t" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                {namespaces().length} namespaces available
              </div>
            </div>
          </Show>
        </div>

        {/* Command Palette Button - navigate BETWEEN different views/pages */}
        <button
          ref={(el) => {
            setCommandPaletteButtonRef(el);
          }}
          onClick={(e) => {
            e.preventDefault();
            openCommandPalette();
          }}
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title="Navigate to different views/pages (⌘K)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="hidden sm:inline">Navigate</span>
          <kbd class="hidden sm:inline px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side - Cluster selector, Status and actions */}
      <div class="flex items-center gap-4">
        {/* Cluster/Context selector with provider */}
        <div class="flex items-center gap-2 relative">
          <label class="text-sm" style={{ color: 'var(--text-secondary)' }}>Cluster:</label>
          <button
            ref={ctxButtonRef}
            onClick={() => setCtxDropdownOpen(!ctxDropdownOpen())}
            class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm min-w-[220px] justify-between transition-all"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              opacity: switching() ? 0.7 : 1,
            }}
          >
            <div class="flex items-center gap-2 text-left">
              <span class={`w-2 h-2 rounded-full ${(() => {
                const active = currentCluster();
                if (active?.isReachable) return 'bg-green-500';
                if (active) return 'bg-red-500';
                return 'bg-gray-500';
              })()}`}></span>
              <div class="flex flex-col leading-tight">
                <span class="text-sm font-medium truncate">
                  {switching() ? 'Switching...' : (currentCluster()?.name || currentContext() || 'Select cluster')}
                </span>
                <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(() => {
                    const active = currentCluster();
                    if (active?.isReachable) return 'Connected';
                    if (active) return 'Disconnected';
                    return 'No cluster';
                  })()}
                </span>
              </div>
            </div>
            <svg class={`w-4 h-4 transition-transform ${ctxDropdownOpen() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Show when={ctxDropdownOpen()}>
            <div
              ref={ctxDropdownRef}
              class="absolute top-full right-0 mt-1 w-72 rounded-lg shadow-xl z-[200] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
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
                    placeholder="Search clusters..."
                    value={ctxSearch()}
                    onInput={(e) => setCtxSearch(e.currentTarget.value)}
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

              <div class="max-h-64 overflow-y-auto">
                <Show when={!clusterSimpleStore.isLoading()} fallback={
                  <div class="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading clusters...</div>
                }>
                  {/* Show clusters from simple store */}
                  <Show when={simpleClusters().length > 0}>
                    <For each={simpleClusters().filter(c => !ctxSearch() || c.name.toLowerCase().includes(ctxSearch().toLowerCase()))}>
                      {(cluster) => {
                        const statusColor = () => cluster.isReachable ? '#10b981' : '#ef4444';
                        return (
                          <button
                            onClick={() => selectContext(cluster.contextName)}
                            class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors"
                            style={{
                              background: cluster.isActive ? 'var(--bg-tertiary)' : 'transparent',
                              color: cluster.isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                            }}
                          >
                            <span class="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor() }}></span>
                            <div class="flex-1 min-w-0">
                              <span class="truncate block">{cluster.name}</span>
                              <span class="text-xs" style={{ color: 'var(--text-muted)' }}>{cluster.isReachable ? 'Available' : 'Unreachable'}</span>
                            </div>
                            <Show when={cluster.isActive}>
                              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </Show>
                </Show>

                <Show when={ctxSearch() && simpleClusters().filter(c => !ctxSearch() || c.name.toLowerCase().includes(ctxSearch().toLowerCase())).length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No clusters found
                  </div>
                </Show>

                <Show when={!clusterSimpleStore.isLoading() && simpleClusters().length === 0}>
                  <div class="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                    No clusters available
                  </div>
                </Show>
              </div>

              <div class="px-3 py-2 text-xs border-t flex items-center justify-between" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                <span>{simpleClusters().length} cluster{simpleClusters().length !== 1 ? 's' : ''} available</span>
                <div class="flex items-center gap-2">
                  <button
                    class="underline"
                    onClick={() => {
                      setCtxDropdownOpen(false);
                      goToClusterManager();
                    }}
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </Show>
        </div>

        {/* Terminal button */}
        <button
          onClick={async () => {
            const preferSystem = settings().preferSystemTerminal;
            const backendOk = backendAvailable();

            // If backend is available and user prefers system terminal, try to open native terminal
            if (preferSystem && backendOk) {
              try {
                const result = await api.openNativeTerminal();
                if (result.status === 'opened') {
                  addNotification(`System terminal opened (${result.os})`, 'success');
                  return;
                } else {
                  // API returned error, fallback to web terminal
                  addNotification(
                    `Failed to open system terminal: ${result.error || 'Unknown error'}. Opening web terminal instead.`,
                    'warning'
                  );
                  setTerminalOpen(true);
                }
              } catch (error) {
                // Network error or API unavailable, fallback to web terminal
                console.error('[Header] Failed to open native terminal:', error);
                addNotification(
                  'Native terminal access requires the local KubēGraf runtime. Opening web terminal instead.',
                  'info'
                );
                setTerminalOpen(true);
              }
            } else if (backendOk === false) {
              // Backend not available, show message and open web terminal
              addNotification(
                'Native terminal access requires the local KubeGraf runtime. Opening web terminal instead.',
                'info'
              );
              setTerminalOpen(true);
            } else {
              // User prefers web terminal or backend status unknown, open web terminal
              setTerminalOpen(true);
            }
          }}
          class="icon-btn"
          title="Open your local terminal"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            minHeight: '40px'
          }}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Refresh button */}
        <button
          onClick={(e) => {
            const btn = e.currentTarget;
            btn.classList.add('refreshing');
            setTimeout(() => btn.classList.remove('refreshing'), 500);
            refreshAll();
          }}
          class="icon-btn"
          title="Refresh all data"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Help dropdown */}
        <div class="relative">
          <button
            ref={helpButtonRef}
            onClick={() => setHelpDropdownOpen(!helpDropdownOpen())}
            class="icon-btn"
            title="Help & Support"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <Show when={helpDropdownOpen()}>
            <div
              ref={helpDropdownRef}
              class="absolute top-full right-0 mt-1 w-56 rounded-lg shadow-xl z-[200] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div class="py-1">
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setHelpDropdownOpen(false)}
                  class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Documentation
                </a>
                <a
                  href={BUG_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setHelpDropdownOpen(false)}
                  class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report a Bug
                </a>
                <a
                  href={FEATURE_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setHelpDropdownOpen(false)}
                  class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Request a Feature
                </a>
                <a
                  href={CONTACT_EMAIL}
                  onClick={() => setHelpDropdownOpen(false)}
                  class="w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </a>
              </div>
            </div>
          </Show>
        </div>

        {/* Notification bell */}
        <NotificationCenter />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Brain button */}
        <button
          onClick={toggleBrainPanel}
          class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{
            background: brainPanelOpen() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: brainPanelOpen() ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title="Open Brain Panel"
        >
          <span class="text-lg">🧠</span>
          <span>Brain</span>
        </button>

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

        {/* Cloud Provider Badge - Far right */}
        <Show when={cloudInfo() && !cloudInfo.loading} fallback={
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
            title="Loading cloud provider info..."
          >
            <CloudProviderLogo provider={cloudInfo()?.provider} size={20} class="w-5 h-5" />
            <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              ...
            </span>
          </div>
        }>
          {(() => {
            const info = cloudInfo();
            const hasConsoleUrl = info?.consoleUrl && info.consoleUrl.trim() !== '';

            if (hasConsoleUrl) {
              // Cloud provider with console URL - make it clickable
              return (
                <button
                  onClick={() => {
                    if (info.consoleUrl) {
                      window.open(info.consoleUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                  title={`Click to open ${info?.displayName || 'Cloud'} Console - ${info?.region || ''}`}
                >
                  <CloudProviderLogo provider={cloudInfo()?.provider} size={20} class="w-5 h-5" />
                  <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {getProviderShortName()}
                  </span>
                  <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              );
            } else {
              // Local cluster - show badge but not clickable
              return (
                <div
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg opacity-90"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                  title={`${info?.displayName || 'Local'} Cluster - ${info?.region || ''} (no cloud console available)`}
                >
                  <CloudProviderLogo provider={cloudInfo()?.provider} size={20} class="w-5 h-5" />
                  <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {getProviderShortName()}
                  </span>
                </div>
              );
            }
          })()}
        </Show>
      </div>

      {/* Local Terminal Modal */}
      <LocalTerminalModal isOpen={terminalOpen()} onClose={() => setTerminalOpen(false)} />
    </header>

    {/* Quick Access Navigation Bar */}
    <div
      class="h-12 flex items-center px-6 gap-0 border-b"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        'z-index': 99,
        'margin-left': '0.75rem'
      }}
    >
      <span class="text-xs font-semibold mr-1" style={{ color: 'var(--text-muted)' }}>
        QUICK ACCESS:
      </span>
      <For each={quickAccessItems()}>
        {(item) => (
          <button
            onClick={() => setCurrentView(item.view)}
            class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--bg-tertiary)]"
            style={{
              color: 'var(--text-primary)',
              background: 'transparent'
            }}
            title={item.label}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </button>
        )}
      </For>
      <button
        onClick={() => setShowFavoritesModal(true)}
        class="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[var(--bg-tertiary)]"
        style={{
          color: 'var(--text-secondary)',
          background: 'transparent'
        }}
        title="Manage Favorites"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span>Manage</span>
      </button>
      
      {/* Favorites Modal */}
      <Show when={showFavoritesModal()}>
        <Portal>
          <div
            class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setShowFavoritesModal(false)}
          >
            <div
              class="rounded-lg border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              style={{
                background: 'var(--bg-card)',
                'border-color': 'var(--border-color)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Manage Quick Access</h2>
                <button
                  onClick={() => setShowFavoritesModal(false)}
                  class="p-2 rounded hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Click the star icon to add or remove items from Quick Access
              </p>
              <div class="space-y-2">
                <For each={allViews}>
                  {(item) => (
                    <div
                      class="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                      style={{ background: isFavorite(item.id) ? 'var(--bg-secondary)' : 'transparent' }}
                    >
                      <div class="flex items-center gap-3">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                        </svg>
                        <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        class="p-2 rounded hover:bg-[var(--bg-tertiary)]"
                        style={{ color: isFavorite(item.id) ? 'var(--warning-color)' : 'var(--text-muted)' }}
                        title={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <svg class="w-5 h-5" fill={isFavorite(item.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
    </>
  );
};

export default Header;
