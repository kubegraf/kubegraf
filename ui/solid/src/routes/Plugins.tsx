import { Component, For, Show, createSignal, createResource, createEffect, createMemo, JSX } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import HelmReleaseDeleteModal from '../components/HelmReleaseDeleteModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { currentContext } from '../stores/cluster';

interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
  description: string;
  icon: JSX.Element;
}

interface HelmRelease {
  name: string;
  namespace: string;
  chart: string;
  revision: number;
  appVersion: string;
  status: string;
  updated: string;
}

interface ArgoCDApp {
  name: string;
  namespace: string;
  project: string;
  syncStatus: string;
  health: string;
  repoURL: string;
  path: string;
  revision: string;
  cluster: string;
  age: string;
}

interface HelmHistoryEntry {
  revision: number;
  status: string;
  updated: string;
  description?: string;
}

const Plugins: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'helm' | 'argocd' | 'flux'>('overview');
  const [selectedRelease, setSelectedRelease] = createSignal<HelmRelease | null>(null);
  const [selectedArgoApp, setSelectedArgoApp] = createSignal<ArgoCDApp | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showArgoDetails, setShowArgoDetails] = createSignal(false);
  const [releaseHistory, setReleaseHistory] = createSignal<HelmHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [actionMessage, setActionMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [releaseToUninstall, setReleaseToUninstall] = createSignal<HelmRelease | null>(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = createSignal(false);
  const [rollbackRevision, setRollbackRevision] = createSignal<number | null>(null);
  
  // Search signals for filtering
  const [helmSearch, setHelmSearch] = createSignal('');
  const [argoSearch, setArgoSearch] = createSignal('');
  
  // Resources now depend on currentContext to auto-refetch when cluster changes
  // Fetch data when on Overview tab OR when on the specific tab
  const [helmReleases, { refetch: refetchHelm, mutate: mutateHelm }] = createResource(
    () => (activeTab() === 'helm' || activeTab() === 'overview') ? currentContext() : false,
    async () => api.getHelmReleases()
  );
  const [argoCDApps, { refetch: refetchArgo, mutate: mutateArgo }] = createResource(
    () => (activeTab() === 'argocd' || activeTab() === 'overview') ? currentContext() : false,
    async () => api.getArgoCDApps()
  );
  const [fluxResources, { refetch: refetchFlux, mutate: mutateFlux }] = createResource(
    () => (activeTab() === 'flux' || activeTab() === 'overview') ? currentContext() : false,
    async () => api.getFluxResources()
  );

  // Clear plugin data when context changes (to prevent showing stale data)
  createEffect(() => {
    const ctx = currentContext();
    if (ctx) {
      // Clear all plugin data when context changes
      mutateHelm(undefined);
      mutateArgo(undefined);
      mutateFlux(undefined);
    }
  });
  
  // Filtered results
  const filteredHelmReleases = createMemo(() => {
    const releases = helmReleases() || [];
    const search = helmSearch().toLowerCase();
    if (!search) return releases;
    return releases.filter((r: HelmRelease) =>
      r.name.toLowerCase().includes(search) ||
      r.namespace.toLowerCase().includes(search) ||
      r.chart.toLowerCase().includes(search) ||
      r.status.toLowerCase().includes(search)
    );
  });
  
  const filteredArgoApps = createMemo(() => {
    const apps = argoCDApps() || [];
    const search = argoSearch().toLowerCase();
    if (!search) return apps;
    return apps.filter((a: ArgoCDApp) =>
      a.name.toLowerCase().includes(search) ||
      a.namespace.toLowerCase().includes(search) ||
      a.project.toLowerCase().includes(search) ||
      a.syncStatus.toLowerCase().includes(search) ||
      a.health.toLowerCase().includes(search)
    );
  });

  // Fetch helm release history when modal opens
  const fetchHistory = async (name: string, namespace: string) => {
    setHistoryLoading(true);
    try {
      const result = await api.getHelmReleaseHistory(name, namespace);
      setReleaseHistory(result.history || []);
    } catch (e) {
      console.error('Failed to fetch release history:', e);
      setReleaseHistory([]);
    }
    setHistoryLoading(false);
  };

  // Handle helm rollback confirmation
  const handleRollbackClick = (revision: number) => {
    setRollbackRevision(revision);
    setShowRollbackConfirm(true);
  };

  // Handle helm rollback execution
  const handleRollback = async () => {
    const release = selectedRelease();
    const revision = rollbackRevision();
    if (!release || !revision) return;

    setActionLoading(true);
    setActionMessage(null);
    setShowRollbackConfirm(false);
    try {
      await api.rollbackHelmRelease(release.name, release.namespace, revision);
      setActionMessage({ type: 'success', text: `Rolled back to revision ${revision}` });
      // Refresh history and releases
      fetchHistory(release.name, release.namespace);
      refetchHelm();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Rollback failed' });
    } finally {
      setActionLoading(false);
      setRollbackRevision(null);
    }
  };

  // Handle ArgoCD sync
  const handleArgoSync = async () => {
    const app = selectedArgoApp();
    if (!app) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.syncArgoCDApp(app.name, app.namespace);
      setActionMessage({ type: 'success', text: 'Sync triggered successfully' });
      refetchArgo();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Sync failed' });
    }
    setActionLoading(false);
  };

  // Handle ArgoCD refresh
  const handleArgoRefresh = async () => {
    const app = selectedArgoApp();
    if (!app) return;

    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.refreshArgoCDApp(app.name, app.namespace);
      setActionMessage({ type: 'success', text: 'Refresh triggered successfully' });
      refetchArgo();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Refresh failed' });
    }
    setActionLoading(false);
  };

  // Handle Helm uninstall
  const handleUninstallHelm = (release: HelmRelease) => {
    console.log('[Plugins] Opening uninstall modal for:', release.name);
    setReleaseToUninstall(release);
    setShowUninstallModal(true);
  };

  const confirmUninstallHelm = async () => {
    const release = releaseToUninstall();
    if (!release) return;

    setUninstalling(true);
    try {
      await api.uninstallApp(release.name, release.namespace);
      refetchHelm();
      setShowUninstallModal(false);
      setReleaseToUninstall(null);
      setActionMessage({ type: 'success', text: `${release.name} uninstalled successfully` });
    } catch (e: any) {
      setActionMessage({ type: 'error', text: `Failed to uninstall ${release.name}: ${e.message || 'Unknown error'}` });
    } finally {
      setUninstalling(false);
    }
  };

  // Open helm details and fetch history
  const openHelmDetails = (release: HelmRelease) => {
    setSelectedRelease(release);
    setShowDetails(true);
    setActionMessage(null);
    fetchHistory(release.name, release.namespace);
  };

  // Open ArgoCD details
  const openArgoDetails = (app: ArgoCDApp) => {
    setSelectedArgoApp(app);
    setShowArgoDetails(true);
    setActionMessage(null);
  };

  // Official SVG Icons for plugins
  const HelmIcon = () => (
    // Official Helm ship wheel logo
    <svg viewBox="0 0 512 512" class="w-8 h-8">
      <path fill="#0F1689" d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z"/>
      <g fill="#fff">
        <circle cx="256" cy="256" r="50"/>
        <rect x="248" y="96" width="16" height="80" rx="8"/>
        <rect x="248" y="336" width="16" height="80" rx="8"/>
        <rect x="96" y="248" width="80" height="16" rx="8"/>
        <rect x="336" y="248" width="80" height="16" rx="8"/>
        <rect x="132" y="132" width="16" height="80" rx="8" transform="rotate(-45 140 172)"/>
        <rect x="364" y="300" width="16" height="80" rx="8" transform="rotate(-45 372 340)"/>
        <rect x="300" y="132" width="16" height="80" rx="8" transform="rotate(45 308 172)"/>
        <rect x="132" y="300" width="16" height="80" rx="8" transform="rotate(45 140 340)"/>
      </g>
    </svg>
  );

  const ArgoCDIcon = () => (
    // Official ArgoCD octopus logo
    <svg viewBox="0 0 128 128" class="w-8 h-8">
      <defs>
        <linearGradient id="argoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#EF7B4D"/>
          <stop offset="100%" style="stop-color:#E96D3F"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill="url(#argoGrad)"/>
      <g fill="#fff">
        <ellipse cx="64" cy="52" rx="28" ry="24"/>
        <circle cx="52" cy="48" r="6" fill="#E96D3F"/>
        <circle cx="76" cy="48" r="6" fill="#E96D3F"/>
        <circle cx="52" cy="48" r="3" fill="#1a1a1a"/>
        <circle cx="76" cy="48" r="3" fill="#1a1a1a"/>
        <path d="M44 76 Q34 90 28 100" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M52 78 Q48 94 44 106" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M64 80 Q64 96 64 108" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M76 78 Q80 94 84 106" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M84 76 Q94 90 100 100" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/>
      </g>
    </svg>
  );

  const FluxIcon = () => (
    // Official Flux logo - blue waves
    <svg viewBox="0 0 128 128" class="w-8 h-8">
      <defs>
        <linearGradient id="fluxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#5468FF"/>
          <stop offset="100%" style="stop-color:#316CE6"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill="url(#fluxGrad)"/>
      <g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round">
        <path d="M24 44 Q44 28 64 44 Q84 60 104 44"/>
        <path d="M24 64 Q44 48 64 64 Q84 80 104 64"/>
        <path d="M24 84 Q44 68 64 84 Q84 100 104 84"/>
      </g>
    </svg>
  );

  const KustomizeIcon = () => (
    // Official Kustomize logo - K with squares
    <svg viewBox="0 0 128 128" class="w-8 h-8">
      <defs>
        <linearGradient id="kustomizeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#326CE5"/>
          <stop offset="100%" style="stop-color:#1D4ED8"/>
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill="url(#kustomizeGrad)"/>
      <g fill="#fff">
        <rect x="32" y="28" width="16" height="72" rx="2"/>
        <polygon points="48,64 80,28 96,28 56,72 96,100 80,100"/>
      </g>
      <g fill="none" stroke="#fff" stroke-width="3">
        <rect x="76" y="52" width="20" height="20" rx="2"/>
        <rect x="86" y="62" width="20" height="20" rx="2"/>
      </g>
    </svg>
  );

  const plugins: Plugin[] = [
    { name: 'Helm', version: 'v3', enabled: true, description: 'Package manager for Kubernetes', icon: <HelmIcon /> },
    { name: 'ArgoCD', version: 'v2', enabled: true, description: 'GitOps continuous delivery', icon: <ArgoCDIcon /> },
    { name: 'Flux', version: 'v2', enabled: true, description: 'GitOps toolkit for Kubernetes', icon: <FluxIcon /> },
    { name: 'Kustomize', version: 'v5', enabled: true, description: 'Kubernetes native configuration management', icon: <KustomizeIcon /> },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'helm', label: 'Helm Releases' },
    { id: 'argocd', label: 'ArgoCD Apps' },
    { id: 'flux', label: 'Flux Resources' },
  ];

  return (
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Plugins</h1>
        <p style={{ color: 'var(--text-secondary)' }}>GitOps and package management integrations</p>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <For each={tabs}>
          {(tab) => (
            <button
              onClick={() => setActiveTab(tab.id as any)}
              class="px-4 py-2 -mb-px transition-colors"
              style={{
                color: activeTab() === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                'border-bottom': activeTab() === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      {/* Overview Tab */}
      <Show when={activeTab() === 'overview'}>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <For each={plugins}>
            {(plugin) => (
              <div class="card p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div class="flex-shrink-0">{plugin.icon}</div>
                  <div>
                    <div class="font-semibold" style={{ color: 'var(--text-primary)' }}>{plugin.name}</div>
                    <div class="text-sm" style={{ color: 'var(--text-muted)' }}>{plugin.version}</div>
                  </div>
                </div>
                <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{plugin.description}</p>
                <div class="flex items-center justify-between">
                  <span class={`badge ${plugin.enabled ? 'badge-success' : 'badge-warning'}`}>
                    {plugin.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => setActiveTab(plugin.name.toLowerCase() as any)}
                    class="text-sm"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    View →
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Quick Stats */}
        <div class="card p-6">
          <h3 class="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Stats</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <Show when={helmReleases.loading} fallback={
                <div class="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {Array.isArray(helmReleases()) ? helmReleases()?.length ?? 0 : 0}
                </div>
              }>
                <div class="text-2xl font-bold flex items-center justify-center" style={{ color: 'var(--accent-primary)' }}>
                  <div class="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
              </Show>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Helm Releases</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <Show when={argoCDApps.loading} fallback={
                <div class="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                  {Array.isArray(argoCDApps()) ? argoCDApps()?.length ?? 0 : 0}
                </div>
              }>
                <div class="text-2xl font-bold flex items-center justify-center" style={{ color: 'var(--accent-secondary)' }}>
                  <div class="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
              </Show>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>ArgoCD Apps</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <Show when={fluxResources.loading} fallback={
                <div class="text-2xl font-bold" style={{ color: '#8b5cf6' }}>
                  {Array.isArray(fluxResources()) ? fluxResources()?.length ?? 0 : 0}
                </div>
              }>
                <div class="text-2xl font-bold flex items-center justify-center" style={{ color: '#8b5cf6' }}>
                  <div class="spinner" style={{ width: '24px', height: '24px' }} />
                </div>
              </Show>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Flux Resources</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>{plugins.filter(p => p.enabled).length}</div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Plugins</div>
            </div>
          </div>
        </div>
      </Show>

      {/* Helm Tab */}
      <Show when={activeTab() === 'helm'}>
        <>
          <div class="flex items-center justify-between mb-4 gap-4">
            <div class="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search Helm releases..."
                value={helmSearch()}
                onInput={(e) => setHelmSearch(e.currentTarget.value)}
                class="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
            <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filteredHelmReleases().length} of {helmReleases()?.length || 0} releases
            </div>
                <button
                  onClick={() => refetchHelm()}
                  disabled={helmReleases.loading}
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    opacity: helmReleases.loading ? 0.5 : 1,
                  }}
                >
                  <svg class={`w-4 h-4 ${helmReleases.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
        <div class="card overflow-hidden">
          <Show when={!helmReleases.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>Namespace</th><th>Chart</th><th>Revision</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <For each={filteredHelmReleases()} fallback={
                  <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    {helmSearch() ? `No Helm releases match "${helmSearch()}"` : 'No Helm releases found'}
                  </td></tr>
                }>
                  {(release: HelmRelease) => (
                    <tr
                      class="cursor-pointer hover:bg-[var(--bg-tertiary)]"
                      onClick={() => openHelmDetails(release)}
                    >
                      <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{release.name}</td>
                      <td>{release.namespace}</td>
                      <td>{release.chart}</td>
                      <td>{release.revision}</td>
                      <td><span class={`badge ${release.status === 'deployed' ? 'badge-success' : 'badge-warning'}`}>{release.status}</span></td>
                      <td>{release.updated}</td>
                      <td>
                        <div class="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openHelmDetails(release); }} class="action-btn" title="Details & History">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              console.log('[Plugins] Uninstall button clicked for:', release.name);
                              handleUninstallHelm(release); 
                            }}
                            class="action-btn"
                            style={{ color: 'var(--error-color)' }}
                            title="Uninstall release"
                            type="button"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
        </>
      </Show>

      {/* ArgoCD Tab */}
      <Show when={activeTab() === 'argocd'}>
        <>
          <div class="flex items-center justify-between mb-4 gap-4">
            <div class="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search ArgoCD applications..."
                value={argoSearch()}
                onInput={(e) => setArgoSearch(e.currentTarget.value)}
                class="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>
            <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
              {filteredArgoApps().length} of {argoCDApps()?.length || 0} applications
            </div>
                <button
                  onClick={() => refetchArgo()}
                  disabled={argoCDApps.loading}
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    opacity: argoCDApps.loading ? 0.5 : 1,
                  }}
                >
                  <svg class={`w-4 h-4 ${argoCDApps.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
        <div class="card overflow-hidden">
          <Show when={!argoCDApps.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <Show when={(argoCDApps() || []).length > 0} fallback={
              <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p>No ArgoCD applications found</p>
                <p class="text-sm mt-2">ArgoCD may not be installed or configured</p>
              </div>
            }>
              <table class="data-table">
                <thead><tr><th>Name</th><th>Project</th><th>Sync Status</th><th>Health</th><th>Age</th><th>Actions</th></tr></thead>
                <tbody>
                  <For each={filteredArgoApps()} fallback={
                    <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      {argoSearch() ? `No ArgoCD applications match "${argoSearch()}"` : 'No ArgoCD applications found'}
                    </td></tr>
                  }>
                    {(app: ArgoCDApp) => (
                      <tr
                        class="cursor-pointer hover:bg-[var(--bg-tertiary)]"
                        onClick={() => openArgoDetails(app)}
                      >
                        <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{app.name}</td>
                        <td>{app.project}</td>
                        <td><span class={`badge ${app.syncStatus === 'Synced' ? 'badge-success' : 'badge-warning'}`}>{app.syncStatus}</span></td>
                        <td><span class={`badge ${app.health === 'Healthy' ? 'badge-success' : 'badge-error'}`}>{app.health}</span></td>
                        <td>{app.age}</td>
                        <td class="flex gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedArgoApp(app); handleArgoSync(); }}
                            class="action-btn"
                            title="Sync - Apply changes from Git"
                          >
                            {/* Cloud upload/sync icon for GitOps sync */}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedArgoApp(app); handleArgoRefresh(); }}
                            class="action-btn"
                            title="Refresh - Fetch latest state"
                          >
                            {/* Circular arrows for refresh/reload */}
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openArgoDetails(app); }} class="action-btn" title="Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </div>
        </>
      </Show>

      {/* Flux Tab */}
      <Show when={activeTab() === 'flux'}>
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>
            {fluxResources()?.length || 0} resources
          </div>
          <button
            onClick={() => refetchFlux()}
            disabled={fluxResources.loading}
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              opacity: fluxResources.loading ? 0.5 : 1,
            }}
          >
            <svg class={`w-4 h-4 ${fluxResources.loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div class="card overflow-hidden">
          <Show when={!fluxResources.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <Show when={(fluxResources() || []).length > 0} fallback={
              <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p>No Flux resources found</p>
                <p class="text-sm mt-2">Flux may not be installed or configured</p>
              </div>
            }>
              <table class="data-table">
                <thead><tr><th>Name</th><th>Kind</th><th>Namespace</th><th>Ready</th><th>Status</th></tr></thead>
                <tbody>
                  <For each={fluxResources() || []}>
                    {(resource: any) => (
                      <tr>
                        <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{resource.name}</td>
                        <td>{resource.kind}</td>
                        <td>{resource.namespace}</td>
                        <td><span class={`badge ${resource.ready ? 'badge-success' : 'badge-error'}`}>{resource.ready ? 'True' : 'False'}</span></td>
                        <td>{resource.status}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </div>
      </Show>

      {/* Helm Release Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Helm Release: ${selectedRelease()?.name}`} size="lg">
        <Show when={selectedRelease()}>
          <div class="space-y-4">
            {/* Action Message */}
            <Show when={actionMessage()}>
              <div class={`p-3 rounded-lg ${actionMessage()?.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {actionMessage()?.text}
              </div>
            </Show>

            {/* Release Info */}
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Chart</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedRelease()?.chart}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Current Revision</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedRelease()?.revision}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedRelease()?.namespace}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Status</div>
                <div><span class="badge badge-success">{selectedRelease()?.status}</span></div>
              </div>
              <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Last Updated</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedRelease()?.updated}</div>
              </div>
            </div>

            {/* Release History */}
            <div>
              <h4 class="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Release History
              </h4>
              <Show when={!historyLoading()} fallback={
                <div class="p-4 text-center"><div class="spinner mx-auto" /></div>
              }>
                <Show when={releaseHistory().length > 0} fallback={
                  <div class="p-4 text-center" style={{ color: 'var(--text-muted)' }}>No history available</div>
                }>
                  <div class="border rounded-lg overflow-hidden" style={{ 'border-color': 'var(--border-color)' }}>
                    <table class="data-table w-full">
                      <thead>
                        <tr>
                          <th>Revision</th>
                          <th>Status</th>
                          <th>Updated</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={releaseHistory()}>
                          {(entry: HelmHistoryEntry) => (
                            <tr>
                              <td style={{ color: 'var(--accent-primary)' }}>
                                {entry.revision}
                                <Show when={entry.revision === selectedRelease()?.revision}>
                                  <span class="ml-2 badge badge-success">current</span>
                                </Show>
                              </td>
                              <td>
                                <span class={`badge ${entry.status === 'deployed' ? 'badge-success' : entry.status === 'superseded' ? 'badge-secondary' : 'badge-warning'}`}>
                                  {entry.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{entry.updated}</td>
                              <td class="max-w-xs truncate" style={{ color: 'var(--text-muted)' }}>{entry.description || '-'}</td>
                              <td>
                                <Show when={entry.revision !== selectedRelease()?.revision}>
                                  <button
                                    onClick={() => handleRollbackClick(entry.revision)}
                                    disabled={actionLoading()}
                                    class="px-3 py-1.5 rounded transition-colors font-medium"
                                    style={{
                                      background: 'var(--warning-color)',
                                      color: '#000',
                                      opacity: actionLoading() ? 0.5 : 1,
                                    }}
                                  >
                                    {actionLoading() ? 'Rolling back...' : 'Rollback'}
                                  </button>
                                </Show>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
      </Modal>

      {/* ArgoCD App Details Modal */}
      <Modal isOpen={showArgoDetails()} onClose={() => setShowArgoDetails(false)} title={`ArgoCD App: ${selectedArgoApp()?.name}`} size="lg">
        <Show when={selectedArgoApp()}>
          <div class="space-y-4">
            {/* Action Message */}
            <Show when={actionMessage()}>
              <div class={`p-3 rounded-lg ${actionMessage()?.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {actionMessage()?.text}
              </div>
            </Show>

            {/* Action Buttons */}
            <div class="flex gap-2">
              <button
                onClick={handleArgoSync}
                disabled={actionLoading()}
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  opacity: actionLoading() ? 0.5 : 1,
                }}
                title="Apply changes from Git repository"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {actionLoading() ? 'Syncing...' : 'Sync'}
              </button>
              <button
                onClick={handleArgoRefresh}
                title="Fetch latest state from cluster"
                disabled={actionLoading()}
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  opacity: actionLoading() ? 0.5 : 1,
                }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {actionLoading() ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {/* App Info */}
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Project</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.project}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.namespace}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Sync Status</div>
                <div><span class={`badge ${selectedArgoApp()?.syncStatus === 'Synced' ? 'badge-success' : 'badge-warning'}`}>{selectedArgoApp()?.syncStatus}</span></div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Health</div>
                <div><span class={`badge ${selectedArgoApp()?.health === 'Healthy' ? 'badge-success' : 'badge-error'}`}>{selectedArgoApp()?.health}</span></div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Age</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.age}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Revision</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.revision || '-'}</div>
              </div>
              <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Repository</div>
                <div class="text-sm break-all" style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.repoURL || '-'}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Path</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.path || '-'}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Cluster</div>
                <div class="text-sm break-all" style={{ color: 'var(--text-primary)' }}>{selectedArgoApp()?.cluster || '-'}</div>
              </div>
            </div>
          </div>
        </Show>
      </Modal>

      {/* Helm Rollback Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRollbackConfirm()}
        onClose={() => {
          if (!actionLoading()) {
            setShowRollbackConfirm(false);
            setRollbackRevision(null);
          }
        }}
        title="Rollback Helm Release"
        message={selectedRelease() && rollbackRevision() 
          ? `Are you sure you want to rollback "${selectedRelease()!.name}" to revision ${rollbackRevision()}?` 
          : 'Are you sure you want to rollback this Helm release?'}
        details={selectedRelease() && rollbackRevision() ? [
          { label: 'Release', value: selectedRelease()!.name },
          { label: 'Namespace', value: selectedRelease()!.namespace },
          { label: 'Target Revision', value: rollbackRevision()!.toString() },
          { label: 'Current Revision', value: selectedRelease()!.revision.toString() },
        ] : undefined}
        variant="warning"
        confirmText="Rollback"
        cancelText="Cancel"
        loading={actionLoading()}
        onConfirm={handleRollback}
        size="sm"
      />

      {/* Helm Release Uninstall Confirmation Modal */}
      <HelmReleaseDeleteModal
        isOpen={showUninstallModal()}
        release={releaseToUninstall()}
        onClose={() => {
          setShowUninstallModal(false);
          setReleaseToUninstall(null);
        }}
        onConfirm={confirmUninstallHelm}
        loading={uninstalling()}
      />
    </div>
  );
};

export default Plugins;
