import { Component, For, Show, createSignal, createMemo, createResource, onCleanup } from 'solid-js';
import { api } from '../services/api';
import { addNotification, setCurrentView } from '../stores/ui';
import { setNamespace } from '../stores/cluster';
import Modal from '../components/Modal';

interface App {
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  chartRepo: string;
  chartName: string;
  installed?: boolean;
  installedNamespace?: string;
  isCustom?: boolean;
}

type TabType = 'marketplace' | 'custom';

// Load custom apps from localStorage
const loadCustomApps = (): App[] => {
  try {
    const saved = localStorage.getItem('kubegraf-custom-apps');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom apps to localStorage
const saveCustomApps = (apps: App[]) => {
  localStorage.setItem('kubegraf-custom-apps', JSON.stringify(apps));
};

interface AppCategory {
  name: string;
  apps: App[];
}

const defaultApps: App[] = [
  {
    name: 'nginx-ingress',
    displayName: 'NGINX Ingress',
    description: 'Ingress controller for Kubernetes using NGINX as a reverse proxy',
    category: 'Networking',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    version: '4.9.0',
    chartRepo: 'https://kubernetes.github.io/ingress-nginx',
    chartName: 'ingress-nginx',
  },
  {
    name: 'istio',
    displayName: 'Istio Service Mesh',
    description: 'Connect, secure, control, and observe services across your cluster',
    category: 'Networking',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    version: '1.20.0',
    chartRepo: 'https://istio-release.storage.googleapis.com/charts',
    chartName: 'istiod',
  },
  {
    name: 'cilium',
    displayName: 'Cilium CNI',
    description: 'eBPF-based networking, observability, and security for Kubernetes',
    category: 'Networking',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    version: '1.14.5',
    chartRepo: 'https://helm.cilium.io/',
    chartName: 'cilium',
  },
  {
    name: 'argocd',
    displayName: 'Argo CD',
    description: 'Declarative GitOps continuous delivery tool for Kubernetes',
    category: 'CI/CD',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    version: '5.51.0',
    chartRepo: 'https://argoproj.github.io/argo-helm',
    chartName: 'argo-cd',
  },
  {
    name: 'fluxcd',
    displayName: 'Flux CD',
    description: 'GitOps toolkit for continuous and progressive delivery',
    category: 'CI/CD',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    version: '2.12.0',
    chartRepo: 'https://fluxcd-community.github.io/helm-charts',
    chartName: 'flux2',
  },
  {
    name: 'prometheus',
    displayName: 'Prometheus',
    description: 'Monitoring system and time series database for metrics',
    category: 'Observability',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '25.8.0',
    chartRepo: 'https://prometheus-community.github.io/helm-charts',
    chartName: 'prometheus',
  },
  {
    name: 'grafana',
    displayName: 'Grafana',
    description: 'Analytics & monitoring dashboards for all your metrics',
    category: 'Observability',
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    version: '7.0.19',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'grafana',
  },
  {
    name: 'loki',
    displayName: 'Loki',
    description: 'Like Prometheus, but for logs - scalable log aggregation',
    category: 'Observability',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    version: '5.41.4',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'loki-stack',
  },
  {
    name: 'tempo',
    displayName: 'Tempo',
    description: 'High-scale distributed tracing backend',
    category: 'Observability',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    version: '1.7.1',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'tempo',
  },
  {
    name: 'cert-manager',
    displayName: 'cert-manager',
    description: 'Automatically provision and manage TLS certificates',
    category: 'Security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    version: '1.13.3',
    chartRepo: 'https://charts.jetstack.io',
    chartName: 'cert-manager',
  },
  {
    name: 'vault',
    displayName: 'HashiCorp Vault',
    description: 'Secrets management, encryption, and privileged access',
    category: 'Security',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    version: '0.27.0',
    chartRepo: 'https://helm.releases.hashicorp.com',
    chartName: 'vault',
  },
  {
    name: 'redis',
    displayName: 'Redis',
    description: 'In-memory data structure store, cache, and message broker',
    category: 'Data',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
    version: '18.6.1',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'redis',
  },
  {
    name: 'postgresql',
    displayName: 'PostgreSQL',
    description: 'Advanced open source relational database',
    category: 'Data',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    version: '14.0.5',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'postgresql',
  },
  {
    name: 'memcached',
    displayName: 'Memcached',
    description: 'High-performance distributed memory caching system',
    category: 'Data',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    version: '6.7.2',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'memcached',
  },
  {
    name: 'kube-prometheus-stack',
    displayName: 'Kube Prometheus Stack',
    description: 'Full Prometheus + Grafana + Alertmanager observability stack',
    category: 'Observability',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '55.5.0',
    chartRepo: 'https://prometheus-community.github.io/helm-charts',
    chartName: 'kube-prometheus-stack',
  },
];

const categoryColors: Record<string, string> = {
  'Networking': '#22d3ee',
  'CI/CD': '#a855f7',
  'Observability': '#f97316',
  'Security': '#22c55e',
  'Data': '#3b82f6',
};

const Apps: Component = () => {
  const [search, setSearch] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [selectedApp, setSelectedApp] = createSignal<App | null>(null);
  const [showInstallModal, setShowInstallModal] = createSignal(false);
  const [installNamespace, setInstallNamespace] = createSignal('default');
  const [installing, setInstalling] = createSignal(false);
  // Track apps currently being deployed with their target namespace
  const [deployingApps, setDeployingApps] = createSignal<Record<string, { namespace: string; startTime: number }>>({});

  // Custom apps state
  const [activeTab, setActiveTab] = createSignal<TabType>('marketplace');
  const [customApps, setCustomApps] = createSignal<App[]>(loadCustomApps());
  const [showAddCustomModal, setShowAddCustomModal] = createSignal(false);
  const [newCustomApp, setNewCustomApp] = createSignal({
    name: '',
    displayName: '',
    description: '',
    category: 'Custom',
    chartRepo: '',
    chartName: '',
    version: '1.0.0',
  });

  // Fetch installed apps
  const [installedApps, { refetch: refetchInstalled }] = createResource(async () => {
    try {
      return await api.getInstalledApps();
    } catch {
      return [];
    }
  });

  // Merge installed status with default apps
  const apps = createMemo(() => {
    const installed = installedApps() || [];
    return defaultApps.map(app => {
      const installedApp = installed.find((i: any) => i.name === app.name);
      return {
        ...app,
        installed: !!installedApp,
        installedNamespace: installedApp?.namespace,
      };
    });
  });

  const categories = createMemo(() => {
    const cats = new Set(defaultApps.map(app => app.category));
    return ['all', ...Array.from(cats)];
  });

  const filteredApps = createMemo(() => {
    let all = apps();
    const query = search().toLowerCase();
    const cat = selectedCategory();

    if (cat !== 'all') {
      all = all.filter(app => app.category === cat);
    }

    if (query) {
      all = all.filter(app =>
        app.displayName.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query)
      );
    }

    return all;
  });

  const groupedApps = createMemo(() => {
    const filtered = filteredApps();
    const groups: Record<string, App[]> = {};

    filtered.forEach(app => {
      if (!groups[app.category]) {
        groups[app.category] = [];
      }
      groups[app.category].push(app);
    });

    return Object.entries(groups).map(([name, apps]) => ({ name, apps }));
  });

  const appCounts = createMemo(() => {
    const all = apps();
    return {
      total: all.length,
      installed: all.filter(a => a.installed).length,
      available: all.filter(a => !a.installed).length,
    };
  });

  // Poll to check if a deploying app is now installed
  const checkDeploymentStatus = (appName: string, displayName: string, targetNamespace: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const installed = await api.getInstalledApps();
        const isInstalled = installed?.some((app: any) => app.name === appName);

        if (isInstalled) {
          clearInterval(checkInterval);
          setDeployingApps(prev => {
            const next = { ...prev };
            delete next[appName];
            return next;
          });
          addNotification(`${displayName} deployed successfully to ${targetNamespace}`, 'success');
          refetchInstalled();
        }
      } catch (e) {
        // Continue polling
      }
    }, 5000); // Check every 5 seconds

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      setDeployingApps(prev => {
        const next = { ...prev };
        delete next[appName];
        return next;
      });
    }, 300000);
  };

  const handleInstall = async () => {
    const app = selectedApp();
    if (!app) return;

    setInstalling(true);
    const targetNs = installNamespace() || 'default';
    try {
      await api.installApp(app.name, targetNs);
      addNotification(`${app.displayName} installation started in ${targetNs}`, 'info');

      // Mark as deploying
      setDeployingApps(prev => ({
        ...prev,
        [app.name]: { namespace: targetNs, startTime: Date.now() }
      }));

      // Start polling for deployment status
      checkDeploymentStatus(app.name, app.displayName, targetNs);

      setShowInstallModal(false);
    } catch (error) {
      addNotification(`Failed to install ${app.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setInstalling(false);
    }
  };

  // Navigate to pods for an installed app
  const navigateToPods = (app: App) => {
    const ns = app.installedNamespace || 'default';
    console.log('Navigating to pods for app:', app.name, 'in namespace:', ns);
    setNamespace(ns);
    setCurrentView('pods');
  };

  const handleUninstall = async (app: App) => {
    if (!confirm(`Are you sure you want to uninstall ${app.displayName}?`)) return;

    try {
      await api.uninstallApp(app.name, app.installedNamespace || 'default');
      addNotification(`${app.displayName} uninstalled successfully`, 'success');
      refetchInstalled();
    } catch (error) {
      addNotification(`Failed to uninstall ${app.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Add a custom app
  const handleAddCustomApp = () => {
    const app = newCustomApp();
    if (!app.name || !app.chartRepo || !app.chartName) {
      addNotification('Please fill in all required fields', 'error');
      return;
    }

    // Generate name from display name if not provided
    const name = app.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const customApp: App = {
      name,
      displayName: app.displayName || app.name,
      description: app.description || `Custom Helm chart: ${app.chartName}`,
      category: app.category || 'Custom',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', // Settings gear icon
      version: app.version || '1.0.0',
      chartRepo: app.chartRepo,
      chartName: app.chartName,
      isCustom: true,
    };

    const updated = [...customApps(), customApp];
    setCustomApps(updated);
    saveCustomApps(updated);

    // Reset form
    setNewCustomApp({
      name: '',
      displayName: '',
      description: '',
      category: 'Custom',
      chartRepo: '',
      chartName: '',
      version: '1.0.0',
    });
    setShowAddCustomModal(false);
    addNotification(`${customApp.displayName} added to custom apps`, 'success');
  };

  // Delete a custom app
  const handleDeleteCustomApp = (app: App) => {
    if (!confirm(`Are you sure you want to remove ${app.displayName} from your custom apps?`)) return;

    const updated = customApps().filter(a => a.name !== app.name);
    setCustomApps(updated);
    saveCustomApps(updated);
    addNotification(`${app.displayName} removed from custom apps`, 'success');
  };

  // Get all apps (marketplace + custom) with installed status
  const allApps = createMemo(() => {
    const installed = installedApps() || [];
    const marketplaceWithStatus = defaultApps.map(app => {
      const installedApp = installed.find((i: any) => i.name === app.name);
      return {
        ...app,
        installed: !!installedApp,
        installedNamespace: installedApp?.namespace,
      };
    });

    const customWithStatus = customApps().map(app => {
      const installedApp = installed.find((i: any) => i.name === app.name);
      return {
        ...app,
        installed: !!installedApp,
        installedNamespace: installedApp?.namespace,
      };
    });

    return { marketplace: marketplaceWithStatus, custom: customWithStatus };
  });

  // Filter apps based on active tab
  const displayedApps = createMemo(() => {
    const { marketplace, custom } = allApps();
    const baseApps = activeTab() === 'marketplace' ? marketplace : custom;
    const query = search().toLowerCase();
    const cat = selectedCategory();

    let filtered = baseApps;

    if (cat !== 'all') {
      filtered = filtered.filter(app => app.category === cat);
    }

    if (query) {
      filtered = filtered.filter(app =>
        app.displayName.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query) ||
        app.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  });

  const displayedGroupedApps = createMemo(() => {
    const filtered = displayedApps();
    const groups: Record<string, App[]> = {};

    filtered.forEach(app => {
      if (!groups[app.category]) {
        groups[app.category] = [];
      }
      groups[app.category].push(app);
    });

    return Object.entries(groups).map(([name, apps]) => ({ name, apps }));
  });

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Apps Marketplace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Deploy platform tools and applications with one click</p>
        </div>
        <div class="flex items-center gap-3">
          <Show when={activeTab() === 'custom'}>
            <button
              onClick={() => setShowAddCustomModal(true)}
              class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:opacity-80"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Custom App
            </button>
          </Show>
          <button
            onClick={() => refetchInstalled()}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div class="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        <button
          onClick={() => setActiveTab('marketplace')}
          class={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab() === 'marketplace' ? 'shadow-sm' : 'hover:opacity-80'
          }`}
          style={{
            background: activeTab() === 'marketplace' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab() === 'marketplace' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Marketplace
          <span class="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            {defaultApps.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          class={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab() === 'custom' ? 'shadow-sm' : 'hover:opacity-80'
          }`}
          style={{
            background: activeTab() === 'custom' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab() === 'custom' ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Custom Apps
          <span class="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            {customApps().length}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total Apps</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{appCounts().total}</span>
        </div>
        <div class="card px-4 py-2 flex items-center gap-2" style={{ 'border-left': '3px solid var(--success-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Installed</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{appCounts().installed}</span>
        </div>
        <div class="card px-4 py-2 flex items-center gap-2" style={{ 'border-left': '3px solid #8b5cf6' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Available</span>
          <span class="text-xl font-bold" style={{ color: '#8b5cf6' }}>{appCounts().available}</span>
        </div>

        <div class="flex-1" />

        <input
          type="text"
          placeholder="Search apps..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg text-sm w-64"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
      </div>

      {/* Category filters */}
      <div class="flex flex-wrap gap-2">
        <For each={categories()}>
          {(cat) => (
            <button
              onClick={() => setSelectedCategory(cat)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory() === cat
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40'
                  : 'bg-white/5 border border-transparent hover:border-white/10'
              }`}
              style={{
                color: selectedCategory() === cat
                  ? cat === 'all' ? 'var(--accent-primary)' : categoryColors[cat] || 'var(--accent-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          )}
        </For>
      </div>

      {/* Empty state for custom apps */}
      <Show when={activeTab() === 'custom' && customApps().length === 0}>
        <div class="card p-12 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Custom Apps</h3>
          <p class="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add your own Helm charts to deploy custom applications.
          </p>
          <button
            onClick={() => setShowAddCustomModal(true)}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Add Your First Custom App
          </button>
        </div>
      </Show>

      {/* Apps grid */}
      <For each={displayedGroupedApps()}>
        {(group) => (
          <div class="space-y-4">
            <h2 class="text-lg font-semibold flex items-center gap-2" style={{ color: categoryColors[group.name] || 'var(--text-primary)' }}>
              <span class="w-3 h-3 rounded-full" style={{ background: categoryColors[group.name] || 'var(--accent-primary)' }} />
              {group.name}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <For each={group.apps}>
                {(app) => {
                  const isDeploying = () => !!deployingApps()[app.name];
                  const deployInfo = () => deployingApps()[app.name];

                  return (
                    <div
                      class={`card p-4 relative overflow-hidden group transition-all ${
                        app.installed ? 'cursor-pointer hover:border-green-500/50' : 'hover:border-cyan-500/30'
                      } ${isDeploying() ? 'animate-pulse' : ''}`}
                      style={{ 'border-left': `4px solid ${categoryColors[app.category] || 'var(--accent-primary)'}` }}
                      onClick={() => app.installed && navigateToPods(app)}
                    >
                      {/* Status badge */}
                      <Show when={isDeploying()}>
                        <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                             style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-primary)' }}>
                          <div class="spinner" style={{ width: '12px', height: '12px' }} />
                          Deploying...
                        </div>
                      </Show>
                      <Show when={app.installed && !isDeploying()}>
                        <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                             style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success-color)' }}>
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                          Installed
                        </div>
                      </Show>

                      <div class="flex items-start gap-3">
                        <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <Show when={isDeploying()} fallback={
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                 style={{ color: categoryColors[app.category] || 'var(--accent-primary)' }}>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={app.icon} />
                            </svg>
                          }>
                            <div class="spinner" style={{ width: '24px', height: '24px' }} />
                          </Show>
                        </div>
                        <div class="flex-1 min-w-0">
                          <h3 class="font-semibold" style={{ color: 'var(--text-primary)' }}>{app.displayName}</h3>
                          <p class="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>v{app.version}</p>
                        </div>
                      </div>

                      <p class="mt-3 text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {app.description}
                      </p>

                      <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          {app.chartName}
                        </span>

                        <Show when={isDeploying()}>
                          <div class="flex items-center gap-2">
                            <span class="text-xs" style={{ color: 'var(--accent-primary)' }}>
                              to {deployInfo()?.namespace}
                            </span>
                          </div>
                        </Show>

                        <Show when={!isDeploying()}>
                          <Show
                            when={app.installed}
                            fallback={
                              <div class="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedApp(app); setShowInstallModal(true); }}
                                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                                >
                                  Install
                                </button>
                                <Show when={app.isCustom}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomApp(app); }}
                                    class="p-1.5 rounded-lg text-sm transition-all hover:opacity-80"
                                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
                                    title="Remove custom app"
                                  >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </Show>
                              </div>
                            }
                          >
                            <div class="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigateToPods(app); }}
                                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1"
                                style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success-color)' }}
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Pods
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUninstall(app); }}
                                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
                              >
                                Uninstall
                              </button>
                            </div>
                          </Show>
                        </Show>
                      </div>

                      {/* Namespace indicator for installed apps */}
                      <Show when={app.installed && !isDeploying()}>
                        <div class="mt-2 pt-2 border-t flex items-center gap-1 text-xs" style={{ 'border-color': 'var(--border-color)', color: 'var(--text-muted)' }}>
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Namespace: <span style={{ color: 'var(--text-secondary)' }}>{app.installedNamespace || 'default'}</span>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        )}
      </For>

      {/* Install Modal */}
      <Modal isOpen={showInstallModal()} onClose={() => setShowInstallModal(false)} title={`Install ${selectedApp()?.displayName}`}>
        <div class="space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            {selectedApp()?.description}
          </p>

          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <div class="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Chart</span>
              <span style={{ color: 'var(--text-primary)' }}>{selectedApp()?.chartName}</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-2">
              <span style={{ color: 'var(--text-muted)' }}>Version</span>
              <span style={{ color: 'var(--text-primary)' }}>{selectedApp()?.version}</span>
            </div>
            <div class="flex items-center justify-between text-sm mt-2">
              <span style={{ color: 'var(--text-muted)' }}>Repository</span>
              <span class="text-xs truncate max-w-xs" style={{ color: 'var(--accent-primary)' }}>{selectedApp()?.chartRepo}</span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Target Namespace
            </label>
            <input
              type="text"
              value={installNamespace()}
              onInput={(e) => setInstallNamespace(e.currentTarget.value)}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="default"
            />
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowInstallModal(false)}
              class="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={installing()}
              class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              <Show when={installing()}>
                <div class="spinner" style={{ width: '16px', height: '16px' }} />
              </Show>
              {installing() ? 'Installing...' : 'Install'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Custom App Modal */}
      <Modal isOpen={showAddCustomModal()} onClose={() => setShowAddCustomModal(false)} title="Add Custom App">
        <div class="space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            Add your own Helm chart to the marketplace. Custom apps are stored locally in your browser.
          </p>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              App Name <span style={{ color: 'var(--error-color)' }}>*</span>
            </label>
            <input
              type="text"
              value={newCustomApp().name}
              onInput={(e) => setNewCustomApp(prev => ({ ...prev, name: e.currentTarget.value }))}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="my-app"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Display Name
            </label>
            <input
              type="text"
              value={newCustomApp().displayName}
              onInput={(e) => setNewCustomApp(prev => ({ ...prev, displayName: e.currentTarget.value }))}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="My Application"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Chart Repository URL <span style={{ color: 'var(--error-color)' }}>*</span>
            </label>
            <input
              type="text"
              value={newCustomApp().chartRepo}
              onInput={(e) => setNewCustomApp(prev => ({ ...prev, chartRepo: e.currentTarget.value }))}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="https://charts.example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Chart Name <span style={{ color: 'var(--error-color)' }}>*</span>
            </label>
            <input
              type="text"
              value={newCustomApp().chartName}
              onInput={(e) => setNewCustomApp(prev => ({ ...prev, chartName: e.currentTarget.value }))}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="my-chart"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Category
              </label>
              <select
                value={newCustomApp().category}
                onChange={(e) => setNewCustomApp(prev => ({ ...prev, category: e.currentTarget.value }))}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <option value="Custom">Custom</option>
                <option value="Networking">Networking</option>
                <option value="CI/CD">CI/CD</option>
                <option value="Observability">Observability</option>
                <option value="Security">Security</option>
                <option value="Data">Data</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Version
              </label>
              <input
                type="text"
                value={newCustomApp().version}
                onInput={(e) => setNewCustomApp(prev => ({ ...prev, version: e.currentTarget.value }))}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={newCustomApp().description}
              onInput={(e) => setNewCustomApp(prev => ({ ...prev, description: e.currentTarget.value }))}
              class="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              placeholder="Optional description for the app"
              rows={3}
            />
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowAddCustomModal(false)}
              class="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustomApp}
              class="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Add App
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Apps;
