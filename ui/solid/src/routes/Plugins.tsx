import { Component, For, Show, createSignal, createResource, createEffect, createMemo, JSX, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api } from '../services/api';
import Modal from '../components/Modal';
import HelmReleaseDeleteModal from '../components/HelmReleaseDeleteModal';
import ConfirmationModal from '../components/ConfirmationModal';
import DescribeModal from '../components/DescribeModal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
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
  const [showHelmDescribe, setShowHelmDescribe] = createSignal(false);
  const [showArgoDescribe, setShowArgoDescribe] = createSignal(false);
  const [showHelmYAML, setShowHelmYAML] = createSignal(false);
  const [showHelmEdit, setShowHelmEdit] = createSignal(false);
  const [showArgoYAML, setShowArgoYAML] = createSignal(false);
  const [showArgoEdit, setShowArgoEdit] = createSignal(false);
  const [showArgoDeleteConfirm, setShowArgoDeleteConfirm] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  
  // Action menu state for Helm releases
  const [openMenuHelmRelease, setOpenMenuHelmRelease] = createSignal<string | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] = createSignal<{ top: number; left: number } | null>(null);
  const [menuHovering, setMenuHovering] = createSignal(false);
  
  // Action menu state for ArgoCD apps
  const [openMenuArgoApp, setOpenMenuArgoApp] = createSignal<string | null>(null);
  const [releaseHistory, setReleaseHistory] = createSignal<HelmHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [actionMessage, setActionMessage] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [releaseToUninstall, setReleaseToUninstall] = createSignal<HelmRelease | null>(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
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

  // Handle ArgoCD delete
  const handleDeleteArgo = async () => {
    const app = selectedArgoApp();
    if (!app) return;

    setDeleting(true);
    try {
      await api.deleteArgoCDApp(app.name, app.namespace);
      refetchArgo();
      setShowArgoDeleteConfirm(false);
      setSelectedArgoApp(null);
      setActionMessage({ type: 'success', text: `${app.name} deleted successfully` });
    } catch (e: any) {
      setActionMessage({ type: 'error', text: `Failed to delete ${app.name}: ${e.message || 'Unknown error'}` });
    } finally {
      setDeleting(false);
    }
  };

  const openArgoDeleteConfirm = (app: ArgoCDApp) => {
    setSelectedArgoApp(app);
    setShowArgoDeleteConfirm(true);
  };

  // YAML resources
  const [helmYAML] = createResource(
    () => showHelmYAML() && selectedRelease() ? { name: selectedRelease()!.name, namespace: selectedRelease()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      try {
        const result = await api.getHelmReleaseYAML(params.name, params.namespace);
        return result.yaml || '';
      } catch (error) {
        console.error('Failed to fetch Helm YAML:', error);
        return '';
      }
    }
  );

  const [argoYAML] = createResource(
    () => showArgoYAML() && selectedArgoApp() ? { name: selectedArgoApp()!.name, namespace: selectedArgoApp()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      try {
        const result = await api.getArgoCDAppYAML(params.name, params.namespace);
        return result.yaml || '';
      } catch (error) {
        console.error('Failed to fetch ArgoCD YAML:', error);
        return '';
      }
    }
  );

  const [helmEditYAML] = createResource(
    () => showHelmEdit() && selectedRelease() && yamlKey() ? { name: selectedRelease()!.name, namespace: selectedRelease()!.namespace, key: yamlKey() } : null,
    async (params) => {
      if (!params) return '';
      try {
        const result = await api.getHelmReleaseYAML(params.name, params.namespace);
        return result.yaml || '';
      } catch (error) {
        console.error('Failed to fetch Helm YAML for edit:', error);
        return '';
      }
    }
  );

  const [argoEditYAML] = createResource(
    () => showArgoEdit() && selectedArgoApp() && yamlKey() ? { name: selectedArgoApp()!.name, namespace: selectedArgoApp()!.namespace, key: yamlKey() } : null,
    async (params) => {
      if (!params) return '';
      try {
        const result = await api.getArgoCDAppYAML(params.name, params.namespace);
        return result.yaml || '';
      } catch (error) {
        console.error('Failed to fetch ArgoCD YAML for edit:', error);
        return '';
      }
    }
  );

  const handleSaveHelmYAML = async (yaml: string) => {
    const release = selectedRelease();
    if (!release) return;

    // For Helm, we can't directly edit the release YAML
    // This would require helm upgrade with the modified values
    // For now, show an error message
    setActionMessage({ type: 'error', text: 'Helm releases cannot be edited directly. Use helm upgrade command instead.' });
    setShowHelmEdit(false);
  };

  const handleSaveArgoYAML = async (yaml: string) => {
    const app = selectedArgoApp();
    if (!app) return;

    const trimmed = yaml.trim();
    if (!trimmed) {
      setActionMessage({ type: 'error', text: 'YAML cannot be empty' });
      return;
    }

    try {
      // Use kubectl apply to update the ArgoCD Application
      const response = await fetch('/api/plugins/argocd/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: app.name, namespace: app.namespace, yaml: trimmed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ArgoCD Application');
      }

      setActionMessage({ type: 'success', text: `${app.name} updated successfully` });
      setShowArgoEdit(false);
      setYamlKey(null);
      refetchArgo();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to update ArgoCD Application' });
    }
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

  // Handle Helm action menu
  const handleHelmActionMenuClick = (e: MouseEvent, release: HelmRelease) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const releaseKey = `${release.namespace}/${release.name}`;
    
    if (openMenuHelmRelease() === releaseKey) {
      setOpenMenuHelmRelease(null);
      setMenuAnchorPosition(null);
      setMenuHovering(false);
      return;
    }
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 300;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top = rect.bottom + 4;
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight - 4;
    }
    top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
    
    setMenuAnchorPosition({
      top,
      left: Math.max(10, Math.min(rect.right - 180, window.innerWidth - 190)),
    });
    setOpenMenuHelmRelease(releaseKey);
    setMenuHovering(false);
  };

  const closeHelmActionMenu = () => {
    setOpenMenuHelmRelease(null);
    setMenuAnchorPosition(null);
    setMenuHovering(false);
  };

  const currentMenuHelmRelease = createMemo(() => {
    const key = openMenuHelmRelease();
    if (!key) return null;
    const [namespace, name] = key.split('/');
    return filteredHelmReleases().find(r => r.namespace === namespace && r.name === name) || null;
  });

  // Handle ArgoCD action menu
  const handleArgoActionMenuClick = (e: MouseEvent, app: ArgoCDApp) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const appKey = `${app.namespace}/${app.name}`;
    
    if (openMenuArgoApp() === appKey) {
      setOpenMenuArgoApp(null);
      setMenuAnchorPosition(null);
      setMenuHovering(false);
      return;
    }
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuHeight = 300;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top = rect.bottom + 4;
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      top = rect.top - menuHeight - 4;
    }
    top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
    
    setMenuAnchorPosition({
      top,
      left: Math.max(10, Math.min(rect.right - 180, window.innerWidth - 190)),
    });
    setOpenMenuArgoApp(appKey);
    setMenuHovering(false);
  };

  const closeArgoActionMenu = () => {
    setOpenMenuArgoApp(null);
    setMenuAnchorPosition(null);
    setMenuHovering(false);
  };

  const currentMenuArgoApp = createMemo(() => {
    const key = openMenuArgoApp();
    if (!key) return null;
    const [namespace, name] = key.split('/');
    return filteredArgoApps().find(a => a.namespace === namespace && a.name === name) || null;
  });

  // Close menus when clicking outside
  createEffect(() => {
    if (!openMenuHelmRelease() && !openMenuArgoApp()) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const actionMenu = document.querySelector('[data-action-menu]');
      const actionButton = document.querySelector('[data-action-button]');
      
      if (actionMenu?.contains(target) || actionButton?.contains(target) || menuHovering()) {
        return;
      }
      
      closeHelmActionMenu();
      closeArgoActionMenu();
    };

    // Use a small delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  });

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
        <div class="w-full" style={{ background: 'var(--bg-primary)', margin: '0', padding: '0', border: '1px solid var(--border-color)', 'border-radius': '4px' }}>
          <Show when={!helmReleases.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
              <thead>
                <tr style={{
                  height: '24px',
                  'font-family': 'system-ui, -apple-system, sans-serif',
                  'font-weight': '900',
                  color: '#0ea5e9',
                  'font-size': '14px',
                }}>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Name</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Namespace</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Chart</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Revision</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Status</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Updated</th>
                  <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredHelmReleases()} fallback={
                  <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    {helmSearch() ? `No Helm releases match "${helmSearch()}"` : 'No Helm releases found'}
                  </td></tr>
                }>
                  {(release: HelmRelease) => {
                    const textColor = '#0ea5e9';
                    return (
                    <tr
                      class="cursor-pointer"
                      onClick={() => openHelmDetails(release)}
                    >
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openHelmDetails(release); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {release.name.length > 40 ? release.name.slice(0, 37) + '...' : release.name}
                        </button>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>{release.namespace}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>{release.chart}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>{release.revision}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>
                        <span class={`badge ${release.status === 'deployed' ? 'badge-success' : 'badge-warning'}`}>{release.status}</span>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': '14px',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>{release.updated}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: '24px',
                        'line-height': '24px',
                        border: 'none'
                      }}>
                        <button
                          data-action-button
                          data-helm-release={`${release.namespace}/${release.name}`}
                          onClick={(e) => handleHelmActionMenuClick(e, release)}
                          class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"
                          style={{
                            background: openMenuHelmRelease() === `${release.namespace}/${release.name}` ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                          }}
                          title="Actions"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    );
                  }}
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
        <div class="w-full" style={{ background: 'var(--bg-primary)', margin: '0', padding: '0', border: '1px solid var(--border-color)', 'border-radius': '4px' }}>
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
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead>
                  <tr style={{
                    height: '24px',
                    'font-family': 'system-ui, -apple-system, sans-serif',
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': '14px',
                  }}>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Name</th>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Project</th>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Sync Status</th>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Health</th>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Age</th>
                    <th style={{ padding: '0 8px', 'text-align': 'left', border: 'none' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredArgoApps()} fallback={
                    <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      {argoSearch() ? `No ArgoCD applications match "${argoSearch()}"` : 'No ArgoCD applications found'}
                    </td></tr>
                  }>
                    {(app: ArgoCDApp) => {
                      const textColor = '#0ea5e9';
                      return (
                      <tr
                        class="cursor-pointer"
                        onClick={() => openArgoDetails(app)}
                      >
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': '14px',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openArgoDetails(app); }}
                            class="font-medium hover:underline text-left"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {app.name.length > 40 ? app.name.slice(0, 37) + '...' : app.name}
                          </button>
                        </td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': '14px',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>{app.project}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': '14px',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>
                          <span class={`badge ${app.syncStatus === 'Synced' ? 'badge-success' : 'badge-warning'}`}>{app.syncStatus}</span>
                        </td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': '14px',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>
                          <span class={`badge ${app.health === 'Healthy' ? 'badge-success' : 'badge-error'}`}>{app.health}</span>
                        </td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': '14px',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>{app.age}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          height: '24px',
                          'line-height': '24px',
                          border: 'none'
                        }}>
                          <button
                            data-action-button
                            data-argocd-app={`${app.namespace}/${app.name}`}
                            onClick={(e) => handleArgoActionMenuClick(e, app)}
                            class="flex items-center justify-center p-1 rounded transition-all hover:bg-opacity-80"
                            style={{
                              background: openMenuArgoApp() === `${app.namespace}/${app.name}` ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer',
                            }}
                            title="Actions"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                      );
                    }}
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

      {/* Helm Release Describe Modal */}
      <Show when={selectedRelease()}>
        <DescribeModal
          isOpen={showHelmDescribe()}
          onClose={() => setShowHelmDescribe(false)}
          resourceType="helmrelease"
          name={selectedRelease()!.name}
          namespace={selectedRelease()!.namespace}
        />
      </Show>

      {/* ArgoCD App Describe Modal */}
      <Show when={selectedArgoApp()}>
        <DescribeModal
          isOpen={showArgoDescribe()}
          onClose={() => setShowArgoDescribe(false)}
          resourceType="argocdapp"
          name={selectedArgoApp()!.name}
          namespace={selectedArgoApp()!.namespace}
        />
      </Show>

      {/* Helm Release YAML Viewer */}
      <Show when={selectedRelease()}>
        <Modal isOpen={showHelmYAML()} onClose={() => setShowHelmYAML(false)} title={`Helm Release YAML: ${selectedRelease()!.name}`} size="xl">
          <Show when={!helmYAML.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <YAMLViewer yaml={helmYAML() || ''} title={selectedRelease()!.name} />
          </Show>
        </Modal>
      </Show>

      {/* Helm Release YAML Editor */}
      <Show when={selectedRelease()}>
        <Modal isOpen={showHelmEdit()} onClose={() => {
          setShowHelmEdit(false);
          setYamlKey(null);
        }} title={`Edit Helm Release: ${selectedRelease()!.name}`} size="xl">
          <Show when={!helmEditYAML.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <YAMLEditor
              yaml={helmEditYAML() || ''}
              title={selectedRelease()!.name}
              onSave={handleSaveHelmYAML}
              onCancel={() => {
                setShowHelmEdit(false);
                setYamlKey(null);
              }}
            />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD App YAML Viewer */}
      <Show when={selectedArgoApp()}>
        <Modal isOpen={showArgoYAML()} onClose={() => setShowArgoYAML(false)} title={`ArgoCD App YAML: ${selectedArgoApp()!.name}`} size="xl">
          <Show when={!argoYAML.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <YAMLViewer yaml={argoYAML() || ''} title={selectedArgoApp()!.name} />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD App YAML Editor */}
      <Show when={selectedArgoApp()}>
        <Modal isOpen={showArgoEdit()} onClose={() => {
          setShowArgoEdit(false);
          setYamlKey(null);
        }} title={`Edit ArgoCD App: ${selectedArgoApp()!.name}`} size="xl">
          <Show when={!argoEditYAML.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
            <YAMLEditor
              yaml={argoEditYAML() || ''}
              title={selectedArgoApp()!.name}
              onSave={handleSaveArgoYAML}
              onCancel={() => {
                setShowArgoEdit(false);
                setYamlKey(null);
              }}
            />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD App Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showArgoDeleteConfirm()}
        onClose={() => {
          if (!deleting()) {
            setShowArgoDeleteConfirm(false);
            setSelectedArgoApp(null);
          }
        }}
        title="Delete ArgoCD Application"
        message={selectedArgoApp() 
          ? `Are you sure you want to delete "${selectedArgoApp()!.name}"?` 
          : 'Are you sure you want to delete this ArgoCD Application?'}
        details={selectedArgoApp() ? [
          { label: 'Application', value: selectedArgoApp()!.name },
          { label: 'Namespace', value: selectedArgoApp()!.namespace },
        ] : undefined}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting()}
        onConfirm={handleDeleteArgo}
        size="sm"
      />

      {/* Helm Release Action Menu Portal */}
      <Show when={openMenuHelmRelease() && menuAnchorPosition() && currentMenuHelmRelease()}>
        <Portal>
          <div
            data-action-menu
            class="fixed py-2 rounded-lg shadow-xl min-w-[180px]"
            style={{
              top: `${menuAnchorPosition()!.top}px`,
              left: `${menuAnchorPosition()!.left}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.3)',
              'z-index': 9998,
            }}
            onMouseEnter={() => setMenuHovering(true)}
            onMouseLeave={() => setMenuHovering(false)}
          >
            <For each={[
              { label: 'Details & History', icon: 'details', onClick: () => { if (currentMenuHelmRelease()) { openHelmDetails(currentMenuHelmRelease()!); closeHelmActionMenu(); } } },
              { label: 'Describe', icon: 'describe', onClick: () => { if (currentMenuHelmRelease()) { setSelectedRelease(currentMenuHelmRelease()!); setShowHelmDescribe(true); closeHelmActionMenu(); } } },
              { label: 'Uninstall', icon: 'delete', onClick: () => { if (currentMenuHelmRelease()) { handleUninstallHelm(currentMenuHelmRelease()!); closeHelmActionMenu(); } }, variant: 'danger' as const, divider: true },
            ]}>
              {(action) => (
                <>
                  <Show when={action.divider}>
                    <div class="my-1 border-t" style={{ 'border-color': 'var(--border-color)' }} />
                  </Show>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick();
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                    style={{
                      color: action.variant === 'danger' ? 'var(--error-color)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      'text-align': 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = action.variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={action.icon === 'details' ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' :
                         action.icon === 'yaml' ? 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' :
                         action.icon === 'edit' ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' :
                         action.icon === 'describe' ? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                         action.icon === 'delete' ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' : ''}
                      />
                    </svg>
                    {action.label}
                  </button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>

      {/* ArgoCD App Action Menu Portal */}
      <Show when={openMenuArgoApp() && menuAnchorPosition() && currentMenuArgoApp()}>
        <Portal>
          <div
            data-action-menu
            class="fixed py-2 rounded-lg shadow-xl min-w-[180px]"
            style={{
              top: `${menuAnchorPosition()!.top}px`,
              left: `${menuAnchorPosition()!.left}px`,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              'box-shadow': '0 10px 40px rgba(0, 0, 0, 0.3)',
              'z-index': 9998,
            }}
            onMouseEnter={() => setMenuHovering(true)}
            onMouseLeave={() => setMenuHovering(false)}
          >
            <For each={[
              { label: 'Details', icon: 'details', onClick: () => { if (currentMenuArgoApp()) { openArgoDetails(currentMenuArgoApp()!); closeArgoActionMenu(); } } },
              { label: 'View YAML', icon: 'yaml', onClick: () => { if (currentMenuArgoApp()) { setSelectedArgoApp(currentMenuArgoApp()!); setShowArgoYAML(true); closeArgoActionMenu(); } } },
              { label: 'Edit YAML', icon: 'edit', onClick: () => { if (currentMenuArgoApp()) { setSelectedArgoApp(currentMenuArgoApp()!); setYamlKey(`${Date.now()}`); setShowArgoEdit(true); closeArgoActionMenu(); } } },
              { label: 'Sync', icon: 'portforward', onClick: () => { if (currentMenuArgoApp()) { setSelectedArgoApp(currentMenuArgoApp()!); handleArgoSync(); closeArgoActionMenu(); } } },
              { label: 'Refresh', icon: 'restart', onClick: () => { if (currentMenuArgoApp()) { setSelectedArgoApp(currentMenuArgoApp()!); handleArgoRefresh(); closeArgoActionMenu(); } } },
              { label: 'Describe', icon: 'describe', onClick: () => { if (currentMenuArgoApp()) { setSelectedArgoApp(currentMenuArgoApp()!); setShowArgoDescribe(true); closeArgoActionMenu(); } } },
              { label: 'Delete', icon: 'delete', onClick: () => { if (currentMenuArgoApp()) { openArgoDeleteConfirm(currentMenuArgoApp()!); closeArgoActionMenu(); } }, variant: 'danger' as const, divider: true },
            ]}>
              {(action) => (
                <>
                  <Show when={action.divider}>
                    <div class="my-1 border-t" style={{ 'border-color': 'var(--border-color)' }} />
                  </Show>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      action.onClick();
                    }}
                    class="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                    style={{
                      color: action.variant === 'danger' ? 'var(--error-color)' : 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      'text-align': 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = action.variant === 'danger'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d={action.icon === 'details' ? 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' :
                         action.icon === 'yaml' ? 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' :
                         action.icon === 'edit' ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' :
                         action.icon === 'portforward' ? 'M13 10V3L4 14h7v7l9-11h-7z' :
                         action.icon === 'restart' ? 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' :
                         action.icon === 'describe' ? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                         action.icon === 'delete' ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' : ''}
                      />
                    </svg>
                    {action.label}
                  </button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
};

export default Plugins;
