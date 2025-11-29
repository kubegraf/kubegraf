import { Component, For, Show, createSignal, createResource, JSX } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';

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

const Plugins: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'helm' | 'argocd' | 'flux'>('overview');
  const [selectedRelease, setSelectedRelease] = createSignal<HelmRelease | null>(null);
  const [selectedArgoApp, setSelectedArgoApp] = createSignal<ArgoCDApp | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showArgoDetails, setShowArgoDetails] = createSignal(false);

  const [helmReleases] = createResource(
    () => activeTab() === 'helm',
    async () => api.getHelmReleases()
  );
  const [argoCDApps] = createResource(
    () => activeTab() === 'argocd',
    async () => api.getArgoCDApps()
  );
  const [fluxResources] = createResource(
    () => activeTab() === 'flux',
    async () => api.getFluxResources()
  );

  // SVG Icons for plugins
  const HelmIcon = () => (
    <svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10" stroke="var(--accent-primary)" />
      <circle cx="12" cy="12" r="3" fill="var(--accent-primary)" />
      <line x1="12" y1="2" x2="12" y2="6" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="2" y1="12" x2="6" y2="12" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="18" y1="12" x2="22" y2="12" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="var(--accent-primary)" stroke-width="2" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" stroke="var(--accent-primary)" stroke-width="2" />
    </svg>
  );

  const ArgoCDIcon = () => (
    <svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="var(--accent-secondary)" stroke-width="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M12 6v6l4 2" stroke-linecap="round" />
      <path d="M8 12a4 4 0 1 0 8 0" stroke-linecap="round" />
      <circle cx="12" cy="12" r="2" fill="var(--accent-secondary)" />
    </svg>
  );

  const FluxIcon = () => (
    <svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round">
      <path d="M2 6c3-3 6-3 9 0s6 3 9 0" />
      <path d="M2 12c3-3 6-3 9 0s6 3 9 0" />
      <path d="M2 18c3-3 6-3 9 0s6 3 9 0" />
    </svg>
  );

  const KustomizeIcon = () => (
    <svg viewBox="0 0 24 24" class="w-8 h-8" fill="none" stroke="var(--success-color)" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
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
              <div class="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>--</div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Helm Releases</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>--</div>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>ArgoCD Apps</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-2xl font-bold" style={{ color: '#8b5cf6' }}>--</div>
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
        <div class="card overflow-hidden">
          <Show when={!helmReleases.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>Namespace</th><th>Chart</th><th>Revision</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <For each={helmReleases() || []} fallback={
                  <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No Helm releases found</td></tr>
                }>
                  {(release: HelmRelease) => (
                    <tr
                      class="cursor-pointer hover:bg-[var(--bg-tertiary)]"
                      onClick={() => { setSelectedRelease(release); setShowDetails(true); }}
                    >
                      <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{release.name}</td>
                      <td>{release.namespace}</td>
                      <td>{release.chart}</td>
                      <td>{release.revision}</td>
                      <td><span class={`badge ${release.status === 'deployed' ? 'badge-success' : 'badge-warning'}`}>{release.status}</span></td>
                      <td>{release.updated}</td>
                      <td>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedRelease(release); setShowDetails(true); }} class="action-btn" title="Details">
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
        </div>
      </Show>

      {/* ArgoCD Tab */}
      <Show when={activeTab() === 'argocd'}>
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
                  <For each={argoCDApps() || []}>
                    {(app: ArgoCDApp) => (
                      <tr
                        class="cursor-pointer hover:bg-[var(--bg-tertiary)]"
                        onClick={() => { setSelectedArgoApp(app); setShowArgoDetails(true); }}
                      >
                        <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{app.name}</td>
                        <td>{app.project}</td>
                        <td><span class={`badge ${app.syncStatus === 'Synced' ? 'badge-success' : 'badge-warning'}`}>{app.syncStatus}</span></td>
                        <td><span class={`badge ${app.health === 'Healthy' ? 'badge-success' : 'badge-error'}`}>{app.health}</span></td>
                        <td class="text-sm">{app.age}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedArgoApp(app); setShowArgoDetails(true); }} class="action-btn" title="Details">
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
      </Show>

      {/* Flux Tab */}
      <Show when={activeTab() === 'flux'}>
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
                        <td class="text-sm">{resource.status}</td>
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
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Chart</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedRelease()?.chart}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Revision</div>
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
          </div>
        </Show>
      </Modal>

      {/* ArgoCD App Details Modal */}
      <Modal isOpen={showArgoDetails()} onClose={() => setShowArgoDetails(false)} title={`ArgoCD App: ${selectedArgoApp()?.name}`} size="lg">
        <Show when={selectedArgoApp()}>
          <div class="space-y-4">
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
    </div>
  );
};

export default Plugins;
