import { Component, For, Show, createSignal, createMemo, createResource, onCleanup, onMount, Match, Switch, createEffect } from 'solid-js';
import { api } from '../services/api';
import { addNotification, setCurrentView } from '../stores/ui';
import { setNamespace } from '../stores/cluster';
import Modal from '../components/Modal';
import AppUninstallModal from '../components/AppUninstallModal';
import CustomAppDeleteModal from '../components/CustomAppDeleteModal';
import { addDeployment, updateDeploymentTask } from '../components/DeploymentProgress';
import MLflowInstallWizard from '../features/mlflow/MLflowInstallWizard';
import FeastInstallWizard from '../features/feast/FeastInstallWizard';
import { marketplaceCatalog } from '../features/marketplace/catalog';
import { marketplaceCategories, getCategoryColor } from '../features/marketplace/categories';
import { marketplaceAppToLegacyApp, mapLegacyCategoryToNew, type LegacyApp } from '../features/marketplace/adapters';
import { ClusterManager } from '../features/marketplace/clustering';
import { VersionManager } from '../features/marketplace/versioning';
import { installStatusTracker } from '../features/marketplace/install-status';
import { addPersistentNotification } from '../stores/persistent-notifications';
import { isLocalClusterApp, validateClusterName, generateDefaultClusterName } from '../utils/local-cluster-installer';
import { formatDockerError } from '../utils/docker-detection';
import type { InstalledInstance as MarketplaceInstalledInstance } from '../features/marketplace/types';
import type { InstalledHelmRelease } from '../features/marketplace/installedApps';
import { formatInstalledNamespaces, getInstalledInstancesForApp, getInstalledNamespaces } from '../features/marketplace/installedApps';
import NamespaceBadge from '../components/NamespaceBadge';
import NamespaceBadges from '../components/NamespaceBadges';
import { formatNamespacesForUninstall } from '../features/marketplace/uninstallFormatting';

// Use LegacyApp type from adapters for backward compatibility
type App = LegacyApp;

type TabType = 'marketplace' | 'custom';
type ViewMode = 'card' | 'list' | 'grid';

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

// Convert marketplace catalog to legacy apps format for backward compatibility
const defaultApps: App[] = marketplaceCatalog.map(marketplaceAppToLegacyApp);

// Use new category system with color mapping
const categoryColors: Record<string, string> = Object.fromEntries(
  marketplaceCategories.map(cat => [cat.id, cat.color])
);

interface AppsProps {
  defaultTab?: 'marketplace' | 'custom';
}

const Apps: Component<AppsProps> = (props) => {
  const [search, setSearch] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [selectedApp, setSelectedApp] = createSignal<App | null>(null);
  const [showInstallModal, setShowInstallModal] = createSignal(false);
  const [showMLflowWizard, setShowMLflowWizard] = createSignal(false);
  const [showFeastWizard, setShowFeastWizard] = createSignal(false);
  const [installNamespace, setInstallNamespace] = createSignal('default');
  const [clusterName, setClusterName] = createSignal(generateDefaultClusterName()); // For local clusters
  const [clusterNameError, setClusterNameError] = createSignal<string>('');
  const [installing, setInstalling] = createSignal(false);
  const [localClusters, setLocalClusters] = createSignal<any[]>([]);
  const [showLocalClusters, setShowLocalClusters] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<ViewMode>('card');
  // Track apps currently being deployed with their target namespace
  const [deployingApps, setDeployingApps] = createSignal<Record<string, { namespace: string; startTime: number }>>({});
  
  // Uninstall modal states
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [appToUninstall, setAppToUninstall] = createSignal<{
    app: App;
    instances: MarketplaceInstalledInstance[];
    initialSelection?: MarketplaceInstalledInstance[];
  } | null>(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  
  // Custom app delete modal states
  const [showDeleteCustomModal, setShowDeleteCustomModal] = createSignal(false);
  const [appToDelete, setAppToDelete] = createSignal<App | null>(null);

  // Auto-filter to Local Cluster if coming from no-cluster overlay
  onMount(() => {
    const autoFilter = sessionStorage.getItem('kubegraf-auto-filter');
    if (autoFilter) {
      setSelectedCategory(autoFilter);
      sessionStorage.removeItem('kubegraf-auto-filter');
    }
    
    // Set default tab if specified
    const defaultTab = sessionStorage.getItem('kubegraf-default-tab');
    if (defaultTab && (defaultTab === 'marketplace' || defaultTab === 'custom')) {
      setActiveTab(defaultTab as TabType);
      sessionStorage.removeItem('kubegraf-default-tab');
    }
    
    // Scroll to Local Cluster section after a brief delay
    if (autoFilter === 'Local Cluster') {
      setTimeout(() => {
        const localClusterSection = document.querySelector('[data-category="Local Cluster"]');
        if (localClusterSection) {
          localClusterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  });

  // Custom apps state
  const [activeTab, setActiveTab] = createSignal<TabType>(props.defaultTab || 'marketplace');
  
  // If defaultTab is provided, set it once on mount
  createEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab);
    }
  });
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

  // Merge installed status with default apps and integrate tracking
  const apps = createMemo(() => {
    const installed = (installedApps() || []) as InstalledHelmRelease[];
    
    // Sync install status tracker with installed apps
    installStatusTracker.syncWithInstalled(installed.map((i: any) => ({
      namespace: i.namespace,
      chart: i.chart,
      version: i.version,
      releaseName: i.name,
      status: 'installed' as const,
    })));
    
    return defaultApps.map(app => {
      const instances = getInstalledInstancesForApp(app, installed);

      return {
        ...app,
        installedInstances: instances,
      };
    });
  });

  const categories = createMemo(() => {
    // Use new category system
    const allCategories = ['all', ...marketplaceCategories.map(cat => cat.id)];
    return allCategories;
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
      installed: all.filter(a => a.installedInstances && a.installedInstances.length > 0).length,
      available: all.filter(a => !a.installedInstances || a.installedInstances.length === 0).length,
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
          const successMessage = `${displayName} deployed successfully to ${targetNamespace}`;
          addPersistentNotification(successMessage, 'success');
          addNotification(successMessage, 'success');
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

    const isLocalCluster = isLocalClusterApp(app.name);
    
    // Validate cluster name for local clusters
    if (isLocalCluster) {
      const validation = validateClusterName(clusterName());
      if (!validation.valid) {
        setClusterNameError(validation.error || 'Invalid cluster name');
        return;
      }
      setClusterNameError('');
    }

    setInstalling(true);
    const targetNs = isLocalCluster ? 'default' : (installNamespace() || 'default');
    const customClusterName = isLocalCluster ? clusterName() : undefined;

    // Create deployment progress tracker with tasks
    const tasks = isLocalCluster 
      ? ['Checking Docker', 'Preparing cluster', 'Installing cluster', 'Verifying installation']
      : ['Validating namespace', 'Adding Helm repository', 'Fetching chart metadata', 'Installing resources', 'Verifying deployment'];
    
    const deploymentId = addDeployment(
      app.displayName,
      app.version,
      targetNs,
      tasks
    );

    try {
      // Task 1: Check Docker for local clusters (CRITICAL - must pass before continuing)
      if (isLocalCluster) {
        updateDeploymentTask(deploymentId, 'task-0', {
          status: 'running',
          progress: 10,
          startTime: Date.now(),
          message: 'Checking Docker availability...'
        });

        // Call the API - it will check Docker synchronously and return error if not available
        const response = await api.installApp(app.name, targetNs, undefined, customClusterName);
        
        // Check if installation failed due to Docker
        if (!response.success || response.error) {
          const errorMessage = response.error || 'Docker check failed';
          const dockerError = formatDockerError();
          
          // Fail the Docker check task immediately
          updateDeploymentTask(deploymentId, 'task-0', {
            status: 'failed',
            progress: 0,
            message: dockerError.message,
            endTime: Date.now()
          });
          
          // Add persistent notification
          addPersistentNotification(
            `${app.displayName} installation failed: ${dockerError.message}. Please install or start Docker Desktop first.`,
            'error'
          );
          
          // Show error notification
          addNotification(
            `Docker is not available. Please install or start Docker Desktop before installing local clusters.`,
            'error'
          );
          
          setShowInstallModal(false);
          setInstalling(false);
          return; // Stop immediately - don't continue with other tasks
        }
        
        // Docker check passed - mark as completed
        updateDeploymentTask(deploymentId, 'task-0', {
          status: 'completed',
          progress: 100,
          endTime: Date.now()
        });
      } else {
        // For regular apps, validate namespace
        updateDeploymentTask(deploymentId, 'task-0', {
          status: 'running',
          progress: 10,
          startTime: Date.now(),
          message: 'Validating namespace...'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        updateDeploymentTask(deploymentId, 'task-0', {
          status: 'completed',
          progress: 100,
          endTime: Date.now()
        });
      }

      // Task 2: Setup/preparation (only if Docker check passed for local clusters)
      if (tasks.length > 1) {
        updateDeploymentTask(deploymentId, 'task-1', {
          status: 'running',
          progress: 20,
          startTime: Date.now(),
          message: isLocalCluster ? 'Preparing cluster environment...' : 'Adding Helm repository...'
        });

        if (!isLocalCluster) {
          await new Promise(resolve => setTimeout(resolve, 500));
          updateDeploymentTask(deploymentId, 'task-1', {
            status: 'completed',
            progress: 100,
            endTime: Date.now()
          });
        } else {
          // For local clusters, mark preparation as completed quickly
          await new Promise(resolve => setTimeout(resolve, 500));
          updateDeploymentTask(deploymentId, 'task-1', {
            status: 'completed',
            progress: 100,
            endTime: Date.now()
          });
        }
      }

      // Task 3: Fetching metadata (for regular apps only)
      if (!isLocalCluster && tasks.length > 2) {
        updateDeploymentTask(deploymentId, 'task-2', {
          status: 'running',
          progress: 30,
          startTime: Date.now(),
          message: 'Fetching chart metadata...'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        updateDeploymentTask(deploymentId, 'task-2', {
          status: 'completed',
          progress: 100,
          endTime: Date.now()
        });
      }

      // Task 4: Actual installation (this is the real work)
      const installTaskId = isLocalCluster ? 'task-2' : 'task-3';
      
      if (!isLocalCluster) {
        // For regular apps, call the API now
        updateDeploymentTask(deploymentId, installTaskId, {
          status: 'running',
          progress: 50,
          startTime: Date.now(),
          message: `Installing ${app.displayName}...`
        });

        await api.installApp(app.name, targetNs);

        updateDeploymentTask(deploymentId, installTaskId, {
          status: 'running',
          progress: 70,
          message: `${app.displayName} installation in progress...`
        });
      } else {
        // For local clusters, installation was already started in Docker check (task-0)
        // Just update the task status to show installation is in progress
        updateDeploymentTask(deploymentId, installTaskId, {
          status: 'running',
          progress: 40,
          startTime: Date.now(),
          message: `Installing ${app.displayName} cluster "${customClusterName}"...`
        });
      }

      // Mark as deploying
      setDeployingApps(prev => ({
        ...prev,
        [app.name]: { namespace: targetNs, startTime: Date.now() }
      }));

      // For local clusters, we poll differently
      if (isLocalCluster) {
        // Poll for local cluster status
        let pollCount = 0;
        const maxPolls = 60; // 5 minutes max
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const installed = await api.getInstalledApps();
            const isInstalled = installed?.some((inst: any) => 
              inst.name === customClusterName || inst.name.includes(customClusterName || '')
            );

            if (isInstalled || pollCount >= maxPolls) {
              clearInterval(pollInterval);
              updateDeploymentTask(deploymentId, installTaskId, {
                status: 'completed',
                progress: 100,
                message: `${app.displayName} "${customClusterName}" installed successfully!`
              });

              // Final verification task
              const verifyTaskId = 'task-3';
              updateDeploymentTask(deploymentId, verifyTaskId, {
                status: 'running',
                progress: 90,
                startTime: Date.now(),
                message: 'Verifying cluster...'
              });

              await new Promise(resolve => setTimeout(resolve, 1000));

              updateDeploymentTask(deploymentId, verifyTaskId, {
                status: 'completed',
                progress: 100,
                message: 'Cluster verified and ready!'
              });

              const successMessage = `${app.displayName} "${customClusterName}" installed successfully!`;
              addPersistentNotification(successMessage, 'success');
              addNotification(successMessage, 'success');
              setShowInstallModal(false);
              refetchInstalled();
            } else {
              // Update progress based on poll count
              const progress = Math.min(70 + (pollCount / maxPolls) * 20, 90);
              updateDeploymentTask(deploymentId, installTaskId, {
                progress,
                message: `Installing... (${pollCount * 5}s)`
              });
            }
          } catch (e) {
            // Continue polling
          }
        }, 5000);
      } else {
        // For regular apps, use existing polling
        checkDeploymentStatus(app.name, app.displayName, targetNs);

        // Final verification task
        const verifyTaskId = 'task-4';
        updateDeploymentTask(deploymentId, verifyTaskId, {
          status: 'running',
          progress: 80,
          startTime: Date.now(),
          message: 'Verifying deployment...'
        });

        // Don't mark as completed immediately - wait for actual verification
        // The checkDeploymentStatus will handle completion
        setTimeout(() => {
          updateDeploymentTask(deploymentId, verifyTaskId, {
            status: 'running',
            progress: 90,
            message: 'Waiting for deployment to be ready...'
          });
        }, 2000);
      }
    } catch (error: any) {
      // Handle errors properly
      const errorMessage = error?.message || error?.error || 'Unknown error';
      
      // Check if it's a Docker error
      if (errorMessage.toLowerCase().includes('docker')) {
        const dockerError = formatDockerError();
        updateDeploymentTask(deploymentId, 'task-0', {
          status: 'failed',
          progress: 0,
          message: dockerError.message
        });
        
        addPersistentNotification(
          `${app.displayName} installation failed: ${dockerError.message}. Click to install Docker Desktop.`,
          'error'
        );
        
        window.open(dockerError.installUrl, '_blank');
        addNotification(`Docker not found. Opening Docker Desktop installation page...`, 'warning');
      } else {
        // Mark current task as failed
        const tasks = ['task-0', 'task-1', 'task-2', 'task-3', 'task-4'];
        for (const taskId of tasks) {
          updateDeploymentTask(deploymentId, taskId, {
            status: 'failed',
            message: errorMessage
          });
          break;
        }
        
        addPersistentNotification(
          `Failed to install ${app.displayName}: ${errorMessage}`,
          'error'
        );
        addNotification(`Failed to install ${app.displayName}: ${errorMessage}`, 'error');
      }
      
      setShowInstallModal(false);
    } finally {
      setInstalling(false);
    }
  };

  // Navigate to pods for an installed app
  const navigateToPods = (app: App) => {
    const ns = app.installedInstances && app.installedInstances.length > 0
      ? (app.installedInstances[0] as any).namespace
      : (app.installedNamespace || 'default');
    console.log('Navigating to pods for app:', app.name, 'in namespace:', ns);
    setNamespace(ns);
    setCurrentView('pods');
  };

  const handleUninstall = (app: App, instance?: MarketplaceInstalledInstance) => {
    const instances = (app.installedInstances || []) as MarketplaceInstalledInstance[];
    const initialSelection = instance ? [instance] : undefined;
    setAppToUninstall({ app, instances, initialSelection });
    setShowUninstallModal(true);
  };

  const confirmUninstall = async (instancesToUninstall: MarketplaceInstalledInstance[]) => {
    const uninstallData = appToUninstall();
    if (!uninstallData) return;
    if (!instancesToUninstall || instancesToUninstall.length === 0) return;

    setUninstalling(true);
    try {
      for (const inst of instancesToUninstall) {
        await api.uninstallApp(inst.releaseName, inst.namespace);
      }

      const summary = formatNamespacesForUninstall(instancesToUninstall.map((i) => i.namespace));
      addNotification(`${uninstallData.app.displayName} uninstalled from ${summary}`, 'success');
      refetchInstalled();
      setShowUninstallModal(false);
      setAppToUninstall(null);
    } catch (error) {
      addNotification(`Failed to uninstall ${uninstallData.app.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setUninstalling(false);
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
    setAppToDelete(app);
    setShowDeleteCustomModal(true);
  };

  const confirmDeleteCustomApp = () => {
    const app = appToDelete();
    if (!app) return;

    const updated = customApps().filter(a => a.name !== app.name);
    setCustomApps(updated);
    saveCustomApps(updated);
    addNotification(`${app.displayName} removed from custom apps`, 'success');
    setShowDeleteCustomModal(false);
    setAppToDelete(null);
  };

  // Get all apps (marketplace + custom) with installed status
  const allApps = createMemo(() => {
    const installed = (installedApps() || []) as InstalledHelmRelease[];
    const marketplaceWithStatus = defaultApps.map(app => {
      const instances = getInstalledInstancesForApp(app, installed);

      return {
        ...app,
        installedInstances: instances,
      };
    });

    const customWithStatus = customApps().map(app => {
      const instances = getInstalledInstancesForApp(app, installed);

      return {
        ...app,
        installedInstances: instances,
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

  // View Icon Component
  const ViewIcon = (props: { mode: ViewMode }) => (
    <Switch>
      <Match when={props.mode === 'card'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </Match>
      <Match when={props.mode === 'list'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </Match>
      <Match when={props.mode === 'grid'}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </Match>
    </Switch>
  );

  // Card View Component (current default view)
  const CardView = () => (
    <For each={displayedGroupedApps()}>
      {(group) => (
        <div class="space-y-4" data-category={group.name}>
          <h2 class="text-lg font-semibold flex items-center gap-2" style={{ color: getCategoryColor(group.name) || 'var(--text-primary)' }}>
            <span class="w-3 h-3 rounded-full" style={{ background: getCategoryColor(group.name) || 'var(--accent-primary)' }} />
            {marketplaceCategories.find(c => c.id === group.name)?.name || group.name}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <For each={group.apps}>
              {(app) => {
                const isDeploying = () => !!deployingApps()[app.name];
                const deployInfo = () => deployingApps()[app.name];
                return (
                  <div
                    class={`card p-4 relative overflow-hidden group transition-all ${
                      app.installedInstances && app.installedInstances.length > 0 ? 'hover:border-blue-500/30' : 'hover:border-cyan-500/30'
                    } ${isDeploying() ? 'animate-pulse' : ''}`}
                    style={{ 'border-left': `4px solid ${getCategoryColor(app.category) || 'var(--accent-primary)'}` }}
                  >
                    {/* Status badge */}
                    <Show when={isDeploying()}>
                      <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                           style={{ background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-primary)' }}>
                        <div class="spinner" style={{ width: '12px', height: '12px' }} />
                        Deploying...
                      </div>
                    </Show>
                    <Show when={app.installedInstances && app.installedInstances.length > 0 && !isDeploying()}>
                      <div class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                           style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success-color)' }}>
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        {app.installedInstances.length} Installed
                      </div>
                    </Show>

                    <div class="flex items-start gap-3">
                      <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                        <Show when={isDeploying()} fallback={
                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                               style={{ color: getCategoryColor(app.category) || 'var(--accent-primary)' }}>
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
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedApp(app);
                            if (app.name === 'mlflow') {
                              setShowMLflowWizard(true);
                            } else if (app.name === 'feast') {
                              setShowFeastWizard(true);
                            } else {
                              setShowInstallModal(true);
                            }
                          }}
                          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                          style={{ background: 'var(--accent-primary)', color: '#000' }}
                        >
                          Install
                        </button>
                        <Show when={app.isCustom}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomApp(app); }}
                            class="p-1.5 rounded-lg text-sm transition-all hover:opacity-80 ml-2"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
                            title="Remove custom app"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Show>
                      </Show>
                    </div>

                    {/* Installed instances list */}
                    <Show when={app.installedInstances && app.installedInstances.length > 0 && !isDeploying()}>
                      <div class="mt-3 pt-3 border-t space-y-2" style={{ 'border-color': 'var(--border-color)' }}>
                        <div class="text-xs flex items-center gap-2 flex-wrap">
                          <span style={{ color: 'var(--text-muted)' }}>Installed in:</span>
                          <NamespaceBadges namespaces={getInstalledNamespaces(app.installedInstances as any)} maxShown={6} />
                        </div>
                        <div class="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Installed Instances:</div>
                        <For each={app.installedInstances}>
                          {(instance) => (
                            <div class="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                              <div class="flex-1 min-w-0">
                                <div class="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                  {instance.releaseName}
                                </div>
                                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  <span class="inline-flex items-center gap-2 flex-wrap">
                                    <span>
                                      {app.chartName}{instance.version ? ` • v${instance.version}` : ''}
                                    </span>
                                    <NamespaceBadge namespace={instance.namespace} />
                                  </span>
                                </div>
                              </div>
                              <div class="flex items-center gap-1 ml-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNamespace(instance.namespace); setCurrentView('pods'); }}
                                  class="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                                  title="View pods"
                                  style={{ color: 'var(--success-color)' }}
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUninstall(app, instance); }}
                                  class="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors"
                                  title="Uninstall"
                                  style={{ color: 'var(--error-color)' }}
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </For>
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
  );

  // List View Component (Table)
  const ListView = () => (
    <div class="overflow-hidden rounded-lg" style={{ background: '#0d1117' }}>
      <div class="overflow-x-auto">
        <table class="data-table terminal-table">
          <thead>
            <tr>
              <th class="whitespace-nowrap">App</th>
              <th class="whitespace-nowrap">Category</th>
              <th class="whitespace-nowrap">Version</th>
              <th class="whitespace-nowrap">Chart</th>
              <th class="whitespace-nowrap">Status</th>
              <th class="whitespace-nowrap">Namespace</th>
              <th class="whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            <For each={displayedApps()} fallback={
              <tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No apps found</td></tr>
            }>
              {(app) => {
                const isDeploying = () => !!deployingApps()[app.name];
                const isInstalled = () => (app.installedInstances?.length || 0) > 0 && !isDeploying();
                return (
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                               style={{ color: getCategoryColor(app.category) || 'var(--accent-primary)' }}>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={app.icon} />
                          </svg>
                        </div>
                        <div>
                          <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{app.displayName}</div>
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>{app.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="text-xs px-2 py-1 rounded" style={{ 
                        background: `${getCategoryColor(app.category) || 'var(--accent-primary)'}20`, 
                        color: categoryColors[app.category] || 'var(--accent-primary)' 
                      }}>
                        {app.category}
                      </span>
                    </td>
                    <td class="font-mono text-sm">{app.version}</td>
                    <td class="font-mono text-sm">{app.chartName}</td>
                    <td>
                      <Show when={isDeploying()} fallback={
                        <Show when={(app.installedInstances?.length || 0) > 0} fallback={
                          <span class="badge badge-default">Available</span>
                        }>
                          <span class="badge badge-success">Installed</span>
                        </Show>
                      }>
                        <span class="badge badge-info flex items-center gap-1">
                          <div class="spinner" style={{ width: '12px', height: '12px' }} />
                          Deploying
                        </span>
                      </Show>
                    </td>
                    <td class="text-sm">
                      <Show when={app.installedInstances && app.installedInstances.length > 0} fallback="-">
                        <NamespaceBadges namespaces={getInstalledNamespaces(app.installedInstances as any)} maxShown={3} badgeSize="sm" />
                      </Show>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <Show when={!isDeploying()}>
                          <Show when={(app.installedInstances?.length || 0) > 0} fallback={
                            <button
                              onClick={() => { 
                                setSelectedApp(app);
                                if (app.name === 'mlflow') {
                                  setShowMLflowWizard(true);
                                } else {
                                  setShowInstallModal(true);
                                }
                              }}
                              class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                              style={{ background: 'var(--accent-primary)', color: '#000' }}
                            >
                              Install
                            </button>
                          }>
                            <button
                              onClick={() => navigateToPods(app)}
                              class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                              style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success-color)' }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleUninstall(app)}
                              class="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                              style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
                            >
                              Uninstall
                            </button>
                          </Show>
                        </Show>
                      </div>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Grid View Component (Compact Cards)
  const GridView = () => (
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <For each={displayedApps()}>
        {(app) => {
          const isDeploying = () => !!deployingApps()[app.name];
          const isInstalled = () => (app.installedInstances?.length || 0) > 0 && !isDeploying();
          return (
            <button
              onClick={() => isInstalled() && navigateToPods(app)}
              class={`card p-3 text-left hover:border-cyan-500/30 transition-colors relative ${
                isInstalled() ? 'cursor-pointer' : ''
              } ${isDeploying() ? 'animate-pulse' : ''}`}
              style={{ 'border-left': `3px solid ${categoryColors[app.category] || 'var(--accent-primary)'}` }}
            >
              <Show when={isDeploying() || isInstalled()}>
                <div class="absolute top-1 right-1">
                  <Show when={isDeploying()} fallback={
                    <div class="w-2 h-2 rounded-full bg-green-500" title="Installed" />
                  }>
                    <div class="spinner" style={{ width: '12px', height: '12px' }} />
                  </Show>
                </div>
              </Show>
              <div class="flex items-center gap-2 mb-2">
                <div class="p-1.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       style={{ color: categoryColors[app.category] || 'var(--accent-primary)' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={app.icon} />
                  </svg>
                </div>
              </div>
              <h4 class="font-medium text-sm truncate mb-1" style={{ color: 'var(--text-primary)' }} title={app.displayName}>
                {app.displayName}
              </h4>
              <p class="text-xs truncate mb-2" style={{ color: 'var(--text-muted)' }} title={app.description}>
                {app.description}
              </p>
              <div class="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>v{app.version}</span>
                <Show when={!isDeploying() && !isInstalled()}>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedApp(app);
                      if (app.name === 'mlflow') {
                        setShowMLflowWizard(true);
                      } else {
                        setShowInstallModal(true);
                      }
                    }}
                    class="px-2 py-0.5 rounded text-xs transition-all hover:opacity-80"
                    style={{ background: 'var(--accent-primary)', color: '#000' }}
                  >
                    Install
                  </button>
                </Show>
              </div>
            </button>
          );
        }}
      </For>
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            <Show when={activeTab() === 'marketplace'}>
              Apps Marketplace
            </Show>
            <Show when={activeTab() === 'custom'}>
              Custom Apps
            </Show>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            <Show when={activeTab() === 'marketplace'}>
              Deploy platform tools and applications with one click
            </Show>
            <Show when={activeTab() === 'custom'}>
              Manage your custom application deployments
            </Show>
          </p>
        </div>
        <div class="flex items-center gap-3">
          {/* View Mode Selector */}
          <div class="flex items-center rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <For each={(['card', 'list', 'grid'] as ViewMode[])}>
              {(mode) => (
                <button
                  onClick={() => setViewMode(mode)}
                  class={`px-3 py-2 flex items-center gap-2 text-sm transition-colors ${
                    viewMode() === mode
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={viewMode() === mode 
                    ? { background: 'var(--accent-primary)' }
                    : { background: 'transparent' }
                  }
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                >
                  <ViewIcon mode={mode} />
                  <span class="hidden sm:inline capitalize">{mode}</span>
                </button>
              )}
            </For>
          </div>
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

      {/* Tab Navigation - Always show tabs */}
      <Show when={true}>
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
      </Show>

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
                  ? cat === 'all' ? 'var(--accent-primary)' : getCategoryColor(cat) || 'var(--accent-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              {cat === 'all' 
                ? 'All Categories' 
                : marketplaceCategories.find(c => c.id === cat)?.name || cat}
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

      {/* Apps View */}
      <Switch>
        <Match when={viewMode() === 'card'}>
          <CardView />
        </Match>
        <Match when={viewMode() === 'list'}>
          <ListView />
        </Match>
        <Match when={viewMode() === 'grid'}>
          <GridView />
        </Match>
      </Switch>

      {/* Install Modal */}
      <Modal isOpen={showInstallModal()} onClose={() => setShowInstallModal(false)} title={`Install ${selectedApp()?.displayName}`} size="xs">
        <div class="space-y-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            {selectedApp()?.description}
          </p>
          
          {/* Prerequisites warning for local clusters */}
          <Show when={selectedApp()?.name === 'k3d' || selectedApp()?.name === 'kind' || selectedApp()?.name === 'minikube'}>
            <div class="p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              'border-left-color': '#f59e0b',
              color: 'var(--text-primary)'
            }}>
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div class="flex-1">
                  <h4 class="font-semibold mb-1">Prerequisites Required</h4>
                  <p class="text-sm mb-2">
                    This local cluster installer requires <strong>Docker</strong> to be installed and running.
                  </p>
                  <ul class="text-sm list-disc list-inside space-y-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
                    <li>Docker Desktop must be installed</li>
                    <li>Docker Desktop must be running</li>
                    <li>Docker daemon must be accessible</li>
                  </ul>
                  <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    If Docker is not installed, the installation will fail. Check server logs for detailed error messages.
                  </p>
                </div>
              </div>
            </div>
          </Show>

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

          {/* Cluster Name for Local Clusters */}
          <Show when={selectedApp()?.name === 'k3d' || selectedApp()?.name === 'kind' || selectedApp()?.name === 'minikube'}>
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Cluster Name <span style={{ color: 'var(--error-color)' }}>*</span>
              </label>
              <input
                type="text"
                value={clusterName()}
                onInput={(e) => {
                  setClusterName(e.currentTarget.value);
                  setClusterNameError('');
                }}
                class="w-full px-3 py-2 rounded-lg text-sm"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)', 
                  border: `1px solid ${clusterNameError() ? 'var(--error-color)' : 'var(--border-color)'}` 
                }}
                placeholder="kubegraf-my-cluster"
              />
              <Show when={clusterNameError()}>
                <p class="text-xs mt-1" style={{ color: 'var(--error-color)' }}>
                  {clusterNameError()}
                </p>
              </Show>
              <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Must start with "kubegraf-" followed by lowercase letters, numbers, or hyphens
              </p>
            </div>
          </Show>

          {/* Namespace for Regular Apps */}
          <Show when={selectedApp()?.name !== 'k3d' && selectedApp()?.name !== 'kind' && selectedApp()?.name !== 'minikube'}>
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
          </Show>

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

      {/* MLflow Installation Wizard */}
      <Show when={showMLflowWizard()}>
        <MLflowInstallWizard
          onClose={() => {
            setShowMLflowWizard(false);
            setSelectedApp(null);
          }}
          onSuccess={() => {
            refetchInstalled();
            addNotification('MLflow installation started', 'success');
          }}
        />
      </Show>

      {/* Feast Installation Wizard */}
      <Show when={showFeastWizard()}>
        <FeastInstallWizard
          onClose={() => {
            setShowFeastWizard(false);
            setSelectedApp(null);
          }}
          onSuccess={() => {
            refetchInstalled();
            addNotification('Feast installation started', 'success');
          }}
        />
      </Show>

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

      {/* App Uninstall Confirmation Modal */}
      <AppUninstallModal
        isOpen={showUninstallModal()}
        displayName={appToUninstall()?.app.displayName || ''}
        instances={(appToUninstall()?.instances || []) as any}
        initialSelection={(appToUninstall()?.initialSelection || []) as any}
        onClose={() => {
          setShowUninstallModal(false);
          setAppToUninstall(null);
        }}
        onConfirm={confirmUninstall as any}
        loading={uninstalling()}
      />

      {/* Custom App Delete Confirmation Modal */}
      <CustomAppDeleteModal
        isOpen={showDeleteCustomModal()}
        appName={appToDelete()?.name || ''}
        displayName={appToDelete()?.displayName || ''}
        onClose={() => {
          setShowDeleteCustomModal(false);
          setAppToDelete(null);
        }}
        onConfirm={confirmDeleteCustomApp}
      />
    </div>
  );
};

export default Apps;
