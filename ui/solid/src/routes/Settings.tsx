import { Component, For, Show, createSignal, createEffect } from 'solid-js';
import { currentTheme, setTheme, themes, type ThemeName, visibleThemes } from '../stores/theme';
import { namespace, setNamespace, namespaces } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { settings, updateSetting, resetSettings, type AppSettings } from '../stores/settings';
import { api } from '../services/api';
import type { PerformanceSummary } from '../stores/performance';

interface SettingSection {
  title: string;
  description?: string;
  icon: string;
  items: SettingItem[];
}

interface SettingItem {
  id: keyof AppSettings;
  label: string;
  description?: string;
  type: 'select' | 'toggle' | 'number';
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  badge?: string;
  badgeColor?: string;
}

const Settings: Component = () => {
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [collapsedSections, setCollapsedSections] = createSignal<Set<string>>(new Set());
  const [version, setVersion] = createSignal('1.2.1');
  const [updateInfo, setUpdateInfo] = createSignal<{
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
    releaseNotes?: string;
    downloadUrl?: string;
    publishedAt?: string;
    error?: string;
  } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);
  const [installingUpdate, setInstallingUpdate] = createSignal(false);
  const [backupStatus, setBackupStatus] = createSignal<any>(null);
  const [backupLoading, setBackupLoading] = createSignal(false);
  const [backupCreating, setBackupCreating] = createSignal(false);
  const [backupList, setBackupList] = createSignal<any[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = createSignal(false);
  const [selectedBackup, setSelectedBackup] = createSignal<string | null>(null);
  const [restoring, setRestoring] = createSignal(false);
  const [backupInterval, setBackupInterval] = createSignal<number>(6);
  const [editingInterval, setEditingInterval] = createSignal(false);
  const [learningStatus, setLearningStatus] = createSignal<any>(null);
  const [resettingLearning, setResettingLearning] = createSignal(false);
  const [perfSummaries, setPerfSummaries] = createSignal<PerformanceSummary[]>([]);
  const [loadingPerf, setLoadingPerf] = createSignal(false);
  const [clearingPerf, setClearingPerf] = createSignal(false);
  const [announcementsStatus, setAnnouncementsStatus] = createSignal<any>(null);
  const [fetchingAnnouncements, setFetchingAnnouncements] = createSignal(false);
  const [metricsCollectorConfig, setMetricsCollectorConfig] = createSignal<any>(null);
  const [metricsCollectorStatus, setMetricsCollectorStatus] = createSignal<any>(null);
  const [updatingMetricsConfig, setUpdatingMetricsConfig] = createSignal(false);
  const [clearingMetrics, setClearingMetrics] = createSignal(false);

  // Load current version from status
  createEffect(async () => {
    try {
      const status = await api.getStatus();
      if (status && (status as any).version) {
        setVersion((status as any).version);
      }
    } catch (err) {
      console.error('Failed to get version:', err);
    }
  });

  // Load backup status and list
  createEffect(async () => {
    try {
      const status = await api.database.getBackupStatus();
      setBackupStatus(status);
      if (status?.interval) {
        setBackupInterval(status.interval);
      }
      
      const list = await api.database.listBackups();
      setBackupList(list.backups || []);
    } catch (err) {
      console.error('Failed to get backup status:', err);
    }
  });

  // Load learning status
  createEffect(async () => {
    try {
      const status = await api.getLearningStatus();
      setLearningStatus(status);
    } catch (err) {
      console.error('Failed to get learning status:', err);
    }
  });

  // Load announcements status
  createEffect(async () => {
    try {
      const status = await api.getAnnouncementsStatus();
      setAnnouncementsStatus(status);
    } catch (err) {
      console.error('Failed to get announcements status:', err);
    }
  });

  // Load metrics collector config and status
  createEffect(async () => {
    try {
      const config = await api.getMetricsCollectorConfig();
      setMetricsCollectorConfig(config);

      const status = await api.getMetricsCollectorStatus();
      setMetricsCollectorStatus(status);
    } catch (err) {
      console.error('Failed to get metrics collector config:', err);
    }
  });

  // Load performance summaries
  const loadPerfSummaries = async () => {
    setLoadingPerf(true);
    try {
      const data = await api.getPerfSummary(15); // 15 minute window
      setPerfSummaries(data.summaries || []);
    } catch (err: any) {
      // Handle 503 Service Unavailable gracefully - performance instrumentation is optional
      const errorMessage = err?.message || '';
      const isNotEnabled = errorMessage.includes('not enabled') || 
                          errorMessage.includes('503') ||
                          errorMessage.includes('Service Unavailable');
      
      if (isNotEnabled) {
        // Performance instrumentation is not enabled - this is expected and not an error
        console.log('Performance instrumentation not enabled (optional feature)');
        setPerfSummaries([]); // Set empty array instead of showing error
      } else {
        // Only show error for unexpected failures
        console.error('Failed to load performance summaries:', err);
        addNotification('Failed to load performance data', 'error');
      }
    } finally {
      setLoadingPerf(false);
    }
  };

  // Load performance data when advanced section is opened
  createEffect(() => {
    if (showAdvanced()) {
      loadPerfSummaries();
      // Refresh every 30 seconds while advanced section is open
      const interval = setInterval(loadPerfSummaries, 30000);
      return () => clearInterval(interval);
    }
  });

  const handleSettingChange = (id: keyof AppSettings, value: any) => {
    updateSetting(id, value);
    addNotification(`Setting updated: ${id}`, 'success');
  };

  const handleThemeChange = (theme: ThemeName) => {
    setTheme(theme);
    updateSetting('theme', theme);
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetSettings();
      setTheme('dark');
      addNotification('All settings have been reset to defaults', 'success');
      setTimeout(() => location.reload(), 1000);
    }
  };

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
  };

  const isSectionCollapsed = (sectionTitle: string) => {
    return collapsedSections().has(sectionTitle);
  };

  const sections: SettingSection[] = [
    {
      title: 'Appearance',
      description: 'Customize the look and feel of KubeGraf',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      items: [
        {
          id: 'theme' as keyof AppSettings,
          label: 'Color Theme',
          description: 'Choose your preferred color scheme',
          type: 'select',
          options: visibleThemes.map((theme) => ({
            label: themes[theme].label,
            value: theme,
          })),
        },
        {
          id: 'sidebarCollapsed',
          label: 'Collapsed Sidebar by Default',
          description: 'Start with sidebar in collapsed state',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'General Settings',
      description: 'Configure basic application behavior',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      items: [
        {
          id: 'defaultNamespace',
          label: 'Default Namespace',
          description: 'Set the default namespace to load on startup',
          type: 'select',
          options: [
            { label: 'All Namespaces', value: '_all' },
            ...namespaces().map(ns => ({ label: ns, value: ns })),
          ],
        },
        {
          id: 'itemsPerPage',
          label: 'Items Per Page',
          description: 'Number of items to display per page in resource lists',
          type: 'number',
          min: 10,
          max: 200,
          step: 10,
        },
        {
          id: 'enableAutoRefresh',
          label: 'Auto Refresh',
          description: 'Automatically refresh resource data at regular intervals',
          type: 'toggle',
        },
        {
          id: 'refreshInterval',
          label: 'Refresh Interval (seconds)',
          description: 'Time between automatic refreshes',
          type: 'number',
          min: 5,
          max: 300,
          step: 5,
        },
      ],
    },
    {
      title: 'Notifications & Alerts',
      description: 'Configure notification and alert preferences',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      items: [
        {
          id: 'enableNotifications',
          label: 'Desktop Notifications',
          description: 'Show toast notifications for important events and actions',
          type: 'toggle',
        },
        {
          id: 'enableSoundEffects',
          label: 'Sound Effects',
          description: 'Play sound effects for notifications and alerts',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Announcements',
      description: 'Opt-in to receive KubeGraf announcements (privacy-first, no telemetry)',
      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      items: [],
      isAnnouncementsSection: true, // Special flag for custom rendering
    },
    {
      title: 'Security & Diagnostics',
      description: 'Enable or disable security scanning and diagnostic features',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      items: [
        {
          id: 'enableDiagnostics',
          label: 'Cluster Diagnostics',
          description: 'Run automatic cluster health checks and diagnostics',
          type: 'toggle',
          badge: 'Core',
          badgeColor: 'blue',
        },
        {
          id: 'enableSecurityChecks',
          label: 'Security Checks',
          description: 'Perform security-related diagnostic checks',
          type: 'toggle',
          badge: 'Security',
          badgeColor: 'red',
        },
        {
          id: 'enableCVEVulnerabilities',
          label: 'CVE Vulnerability Scanning',
          description: 'Scan for known CVE vulnerabilities using NIST NVD database',
          type: 'toggle',
          badge: 'NIST NVD',
          badgeColor: 'purple',
        },
      ],
    },
    {
      title: 'Database Backup',
      description: 'Configure automatic database backups and manage backup settings',
      icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      items: [],
      isBackupSection: true, // Special flag for custom rendering
    },
    {
      title: 'AI & ML Features',
      description: 'Control AI-powered features and machine learning capabilities',
      icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      items: [
        {
          id: 'enableAIChat',
          label: 'AI Chat Assistant',
          description: 'Enable AI-powered chat assistant for cluster management',
          type: 'toggle',
          badge: 'AI',
          badgeColor: 'green',
        },
        {
          id: 'enableMLRecommendations',
          label: 'ML Recommendations',
          description: 'Get AI/ML-powered optimization recommendations',
          type: 'toggle',
          badge: 'ML',
          badgeColor: 'green',
        },
        {
          id: 'enableAnomalyDetection',
          label: 'Anomaly Detection',
          description: 'Detect anomalies in cluster behavior using machine learning',
          type: 'toggle',
          badge: 'Advanced',
          badgeColor: 'orange',
        },
        {
          id: 'showMLTimelineInBrain',
          label: 'ML Timeline in Brain Panel',
          description: 'Show ML timeline events in the Brain Panel',
          type: 'toggle',
          badge: 'Brain',
          badgeColor: 'blue',
        },
      ],
    },
    {
      title: 'Incident Learning',
      description: 'On-device learning that improves incident confidence and root cause ranking over time',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [],
      isLearningSection: true, // Special flag for custom rendering
    },
    {
      title: 'Metrics Collection',
      description: 'Configure background metrics collection for ML recommendations',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [],
      isMetricsCollectionSection: true, // Special flag for custom rendering
    },
    {
      title: 'Monitoring & Analysis',
      description: 'Configure monitoring, cost analysis, and drift detection',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      items: [
        {
          id: 'enableEventMonitoring',
          label: 'Event Monitoring',
          description: 'Monitor and track Kubernetes events in real-time',
          type: 'toggle',
        },
        {
          id: 'enableCostAnalysis',
          label: 'Cost Analysis',
          description: 'Analyze and track cluster costs across cloud providers',
          type: 'toggle',
          badge: 'Beta',
          badgeColor: 'yellow',
        },
        {
          id: 'enableDriftDetection',
          label: 'Configuration Drift Detection',
          description: 'Detect configuration drift in deployments and resources',
          type: 'toggle',
        },
        {
          id: 'enableMetrics',
          label: 'Resource Metrics',
          description: 'Display CPU, memory, and other resource metrics',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Integrations',
      description: 'Enable or disable external integrations and connectors',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
      items: [
        {
          id: 'enableMCP',
          label: 'AI Agents',
          description: 'Enable Model Context Protocol server for AI agent integration (Claude, Cursor, etc.)',
          type: 'toggle',
          badge: 'New',
          badgeColor: 'cyan',
        },
        {
          id: 'enableConnectors',
          label: 'External Connectors',
          description: 'Enable integrations with external services (GitHub, Slack, PagerDuty, Webhooks)',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Visualization',
      description: 'Configure visualization and topology features',
      icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      items: [
        {
          id: 'enableTopology',
          label: 'Topology View',
          description: 'Enable interactive topology visualization',
          type: 'toggle',
        },
        {
          id: 'enableResourceMap',
          label: 'Resource Map',
          description: 'Enable resource relationship mapping',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Developer Tools',
      description: 'Tools for developers and advanced users',
      icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      items: [
        {
          id: 'enableWebTerminal',
          label: 'Web Terminal',
          description: 'Enable built-in web terminal for kubectl commands',
          type: 'toggle',
        },
        {
          id: 'enableLogs',
          label: 'Log Viewer',
          description: 'Enable advanced log viewing and streaming',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Sidebar Visibility',
      description: 'Control which sections and menu items appear in the sidebar',
      icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      items: [
        {
          id: 'showOverviewSection',
          label: 'Show Overview Section',
          description: 'Display Dashboard in sidebar',
          type: 'toggle',
        },
        {
          id: 'showInsightsSection',
          label: 'Show Insights Section',
          description: 'Display AI Insights, Cost Analysis, Security, Drift Detection',
          type: 'toggle',
        },
        {
          id: 'showDeploymentsSection',
          label: 'Show Deployments Section',
          description: 'Display Deploy and Rollouts',
          type: 'toggle',
        },
        {
          id: 'showWorkloadsSection',
          label: 'Show Workloads Section',
          description: 'Display Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs',
          type: 'toggle',
        },
        {
          id: 'showNetworkingSection',
          label: 'Show Networking Section',
          description: 'Display Services, Ingresses, Network Policies',
          type: 'toggle',
        },
        {
          id: 'showConfigStorageSection',
          label: 'Show Config & Storage Section',
          description: 'Display ConfigMaps, Secrets, Certificates, Storage',
          type: 'toggle',
        },
        {
          id: 'showClusterSection',
          label: 'Show Cluster Section',
          description: 'Display Nodes, RBAC, Events, Resource Map',
          type: 'toggle',
        },
        {
          id: 'showIntegrationsSection',
          label: 'Show Integrations Section',
          description: 'Display Connectors and AI Agents menu items',
          type: 'toggle',
          badge: 'Important',
          badgeColor: 'cyan',
        },
        {
          id: 'showExtensionsSection',
          label: 'Show Extensions Section',
          description: 'Display Plugins and Terminal',
          type: 'toggle',
        },
      ],
    },
    {
      title: 'Individual Menu Items',
      description: 'Fine-grained control over specific sidebar menu items',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      items: [
        {
          id: 'showConnectorsMenu',
          label: 'Show Connectors Menu',
          description: 'Display Connectors in Integrations section',
          type: 'toggle',
          badge: 'Integration',
          badgeColor: 'cyan',
        },
        {
          id: 'showAIAgentsMenu',
          label: 'Show AI Agents Menu',
          description: 'Display AI Agents in Integrations section',
          type: 'toggle',
          badge: 'Integration',
          badgeColor: 'cyan',
        },
        {
          id: 'showAIInsights',
          label: 'Show AI Insights',
          description: 'Display AI Insights in Insights section',
          type: 'toggle',
        },
        {
          id: 'showCostAnalysisMenu',
          label: 'Show Cost Analysis',
          description: 'Display Cost Analysis in Insights section',
          type: 'toggle',
        },
        {
          id: 'showSecurityInsights',
          label: 'Show Security Insights',
          description: 'Display Security in Insights section',
          type: 'toggle',
        },
        {
          id: 'showDriftDetectionMenu',
          label: 'Show Drift Detection',
          description: 'Display Drift Detection in Insights section',
          type: 'toggle',
        },
        {
          id: 'showPlugins',
          label: 'Show Plugins',
          description: 'Display Plugins in Extensions section',
          type: 'toggle',
        },
        {
          id: 'showTerminalMenu',
          label: 'Show Terminal',
          description: 'Display Terminal in Extensions section',
          type: 'toggle',
        },
      ],
    },
  ];

  const SettingItemComponent: Component<{ item: SettingItem }> = (props) => {
    const item = props.item;
    const value = () => settings()[item.id];

    return (
      <div class="card p-4 hover:border-opacity-60 transition-all">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <label class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {item.label}
              </label>
              <Show when={item.badge}>
                <span
                  class="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide"
                  style={{
                    background: item.badgeColor === 'blue' ? '#3b82f620' :
                              item.badgeColor === 'red' ? '#ef444420' :
                              item.badgeColor === 'green' ? '#22c55e20' :
                              item.badgeColor === 'purple' ? '#a855f720' :
                              item.badgeColor === 'orange' ? '#f97316 20' :
                              item.badgeColor === 'yellow' ? '#f59e0b20' :
                              item.badgeColor === 'cyan' ? '#06b6d420' : '#3b82f620',
                    color: item.badgeColor === 'blue' ? '#3b82f6' :
                           item.badgeColor === 'red' ? '#ef4444' :
                           item.badgeColor === 'green' ? '#22c55e' :
                           item.badgeColor === 'purple' ? '#a855f7' :
                           item.badgeColor === 'orange' ? '#f97316' :
                           item.badgeColor === 'yellow' ? '#f59e0b' :
                           item.badgeColor === 'cyan' ? '#06b6d4' : '#3b82f6',
                  }}
                >
                  {item.badge}
                </span>
              </Show>
            </div>
            <Show when={item.description}>
              <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.description}
              </p>
            </Show>
          </div>

          <div class="flex-shrink-0">
            <Show when={item.type === 'toggle'}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSettingChange(item.id, !value());
                }}
                class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  value() ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                }`}
                style={{ outline: 'none' }}
                title={value() ? 'Enabled' : 'Disabled'}
              >
                <span
                  class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform pointer-events-none ${
                    value() ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </Show>

            <Show when={item.type === 'select'}>
              <select
                value={value() as string}
                onChange={(e) => handleSettingChange(item.id, e.currentTarget.value)}
                class="rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <For each={item.options}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </Show>

            <Show when={item.type === 'number'}>
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  value={value() as number}
                  onChange={(e) => handleSettingChange(item.id, parseInt(e.currentTarget.value, 10))}
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  class="w-24 rounded-lg px-3 py-1.5 text-sm text-right"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                />
              </div>
            </Show>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div class="max-w-5xl mx-auto">
      {/* Header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2 gradient-text">
          Settings
        </h1>
        <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
          Configure KubeGraf to match your workflow and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <For each={sections}>
        {(section) => (
          <div class="mb-8">
            <button
              onClick={() => toggleSection(section.title)}
              class="w-full flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={section.icon} />
                </svg>
              </div>
              <div class="flex-1 text-left">
                <h2 class="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
                <Show when={section.description}>
                  <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {section.description}
                  </p>
                </Show>
              </div>
              <svg
                class={`w-5 h-5 transition-transform flex-shrink-0 ${isSectionCollapsed(section.title) ? '' : 'rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: 'var(--text-primary)' }}
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={!isSectionCollapsed(section.title)}>
              <Show when={(section as any).isBackupSection}>
                {/* Database Backup Section */}
                <div class="space-y-4">
                  {/* Information Banner */}
                  <div class="card p-4 mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="flex-1">
                        <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          What gets backed up?
                        </div>
                        <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                          <p>KubeGraf stores all data locally on your device in a SQLite database. The backup includes:</p>
                          <ul class="list-disc list-inside ml-2 space-y-0.5">
                            <li>User accounts and authentication sessions</li>
                            <li>Cloud provider credentials (encrypted)</li>
                            <li>Cluster configurations and connections</li>
                            <li>Event monitoring data and log errors</li>
                            <li>Application settings and preferences</li>
                          </ul>
                          <p class="mt-2">
                            <strong>Storage location:</strong> Backups are stored in <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>~/.kubegraf/backups/</code> on your local device. All data remains on your machine - nothing is sent to external servers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Automatic Backups
                        </h3>
                        <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Automatically backup your database at regular intervals
                        </p>
                      </div>
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={backupStatus()?.enabled ?? false}
                          onChange={async (e) => {
                            const target = e.target as HTMLInputElement;
                            if (!target) return;
                            
                            const isEnabled = target.checked;
                            setBackupLoading(true);
                            try {
                              await api.database.updateBackupConfig({
                                enabled: isEnabled,
                                interval: backupInterval(),
                              });
                              const status = await api.database.getBackupStatus();
                              setBackupStatus(status);
                              addNotification(
                                isEnabled ? 'Automatic backups enabled' : 'Automatic backups disabled',
                                'success'
                              );
                            } catch (err) {
                              addNotification(`Failed to update backup settings: ${err}`, 'error');
                            } finally {
                              setBackupLoading(false);
                            }
                          }}
                          disabled={backupLoading()}
                          class="sr-only peer"
                        />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <Show when={backupStatus()}>
                      <div class="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Backup Interval
                          </div>
                          <Show when={!editingInterval()}>
                            <div class="flex items-center gap-2">
                              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {backupInterval()} {backupInterval() === 1 ? 'hour' : 'hours'}
                              </div>
                              <button
                                onClick={() => setEditingInterval(true)}
                                class="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                title="Edit interval"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          </Show>
                          <Show when={editingInterval()}>
                            <div class="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max="168"
                                value={backupInterval()}
                                onInput={(e) => {
                                  const value = parseInt(e.currentTarget.value);
                                  if (!isNaN(value) && value >= 1 && value <= 168) {
                                    setBackupInterval(value);
                                  }
                                }}
                                class="w-20 px-2 py-1 rounded text-sm border"
                                style={{ 
                                  background: 'var(--bg-primary)', 
                                  color: 'var(--text-primary)',
                                  borderColor: 'var(--border-color)'
                                }}
                                autofocus
                              />
                              <span class="text-sm" style={{ color: 'var(--text-muted)' }}>hours</span>
                              <button
                                onClick={async () => {
                                  setBackupLoading(true);
                                  try {
                                    await api.database.updateBackupConfig({
                                      enabled: backupStatus()?.enabled ?? true,
                                      interval: backupInterval(),
                                    });
                                    const status = await api.database.getBackupStatus();
                                    setBackupStatus(status);
                                    setEditingInterval(false);
                                    addNotification(`Backup interval updated to ${backupInterval()} hours`, 'success');
                                  } catch (err) {
                                    addNotification(`Failed to update interval: ${err}`, 'error');
                                  } finally {
                                    setBackupLoading(false);
                                  }
                                }}
                                disabled={backupLoading()}
                                class="px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
                                style={{ background: 'var(--accent-primary)', color: '#000' }}
                                title="Save"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setBackupInterval(backupStatus()?.interval ?? 6);
                                  setEditingInterval(false);
                                }}
                                disabled={backupLoading()}
                                class="px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                title="Cancel"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </Show>
                          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Range: 1-168 hours (1 week)
                          </div>
                          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            Backups stored in: <code class="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>~/.kubegraf/backups/</code>
                          </div>
                        </div>
                        <div>
                          <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Total Backups
                          </div>
                          <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {backupStatus()?.backup_count ?? 0}
                          </div>
                        </div>
                        <Show when={backupStatus()?.last_backup}>
                          <div>
                            <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Last Backup
                            </div>
                            <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {new Date(backupStatus()!.last_backup!).toLocaleString()}
                            </div>
                          </div>
                        </Show>
                        <Show when={backupStatus()?.next_backup}>
                          <div>
                            <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Next Backup
                            </div>
                            <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {new Date(backupStatus()!.next_backup!).toLocaleString()}
                            </div>
                          </div>
                        </Show>
                      </div>

                      <div class="mt-4 flex gap-2">
                        <button
                          onClick={async () => {
                            setBackupCreating(true);
                            try {
                              const result = await api.database.createBackup();
                              addNotification('Backup created successfully', 'success');
                              const status = await api.database.getBackupStatus();
                              setBackupStatus(status);
                              const list = await api.database.listBackups();
                              setBackupList(list.backups || []);
                            } catch (err) {
                              addNotification(`Failed to create backup: ${err}`, 'error');
                            } finally {
                              setBackupCreating(false);
                            }
                          }}
                          disabled={backupCreating() || !backupStatus()?.enabled}
                          class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                          style={{ background: 'var(--accent-primary)', color: '#000' }}
                        >
                          <Show when={backupCreating()}>
                            <div class="spinner" style={{ width: '16px', height: '16px' }} />
                          </Show>
                          {backupCreating() ? 'Creating...' : 'Create Backup Now'}
                        </button>
                        <button
                          onClick={() => {
                            const list = backupList();
                            if (list.length === 0) {
                              addNotification('No backups available to restore', 'warning');
                              return;
                            }
                            setShowRestoreDialog(true);
                          }}
                          disabled={backupList().length === 0}
                          class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'var(--error-color)', color: 'white' }}
                        >
                          Restore from Backup
                        </button>
                      </div>

                      {/* Backup List */}
                      <Show when={backupList().length > 0}>
                        <div class="mt-4">
                          <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                            Available Backups
                          </div>
                          <div class="space-y-2 max-h-48 overflow-y-auto">
                            <For each={backupList()}>
                              {(backup) => (
                                <div class="flex items-center justify-between p-2 rounded border" style={{ borderColor: 'var(--border-color)' }}>
                                  <div class="flex-1">
                                    <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {backup.name}
                                    </div>
                                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                                      {new Date(backup.created_at).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedBackup(backup.path);
                                      setShowRestoreDialog(true);
                                    }}
                                    class="px-3 py-1 text-xs rounded hover:opacity-80 transition-opacity"
                                    style={{ background: 'var(--error-color)', color: 'white' }}
                                  >
                                    Restore
                                  </button>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </Show>
                  </div>

                  {/* Restore Confirmation Dialog */}
                  <Show when={showRestoreDialog()}>
                    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRestoreDialog(false)}>
                      <div class="card p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                          Restore Database from Backup
                        </h3>
                        <p class="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                          <strong class="text-red-500">WARNING:</strong> This will overwrite your current database with the selected backup. This action cannot be undone.
                        </p>
                        <Show when={selectedBackup()}>
                          <div class="mb-4 p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                            <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                              Selected Backup:
                            </div>
                            <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {selectedBackup()}
                            </div>
                          </div>
                        </Show>
                        <div class="flex gap-2">
                          <button
                            onClick={async () => {
                              const backupPath = selectedBackup() || (backupList().length > 0 ? backupList()[0].path : '');
                              if (!backupPath) {
                                addNotification('No backup selected', 'error');
                                return;
                              }
                              if (!confirm('Are you absolutely sure you want to restore from this backup? This will overwrite your current database!')) {
                                return;
                              }
                              setRestoring(true);
                              try {
                                await api.database.restoreBackup(backupPath);
                                addNotification('Database restored successfully. Please restart the application.', 'success');
                                setShowRestoreDialog(false);
                                setSelectedBackup(null);
                                // Reload page after a delay
                                setTimeout(() => {
                                  window.location.reload();
                                }, 2000);
                              } catch (err) {
                                addNotification(`Failed to restore backup: ${err}`, 'error');
                              } finally {
                                setRestoring(false);
                              }
                            }}
                            disabled={restoring() || !selectedBackup()}
                            class="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ background: 'var(--error-color)', color: 'white' }}
                          >
                            <Show when={restoring()}>
                              <div class="spinner" style={{ width: '16px', height: '16px' }} />
                            </Show>
                            {restoring() ? 'Restoring...' : 'Confirm Restore'}
                          </button>
                          <button
                            onClick={() => {
                              setShowRestoreDialog(false);
                              setSelectedBackup(null);
                            }}
                            disabled={restoring()}
                            class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
              <Show when={!(section as any).isBackupSection && !(section as any).isLearningSection && !(section as any).isAnnouncementsSection && !(section as any).isMetricsCollectionSection}>
                <div class="space-y-3">
                  <For each={section.items}>
                    {(item) => <SettingItemComponent item={item} />}
                  </For>
                </div>
              </Show>
              <Show when={(section as any).isAnnouncementsSection}>
                {/* Announcements Section */}
                <div class="space-y-4">
                  {/* Privacy Banner */}
                  <div class="card p-4 mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div class="flex items-start gap-3">
                      <div class="text-2xl flex-shrink-0">🔒</div>
                      <div class="flex-1">
                        <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          Privacy First - No Telemetry
                        </div>
                        <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                          <p>Announcements are completely optional and privacy-safe:</p>
                          <ul class="list-disc list-inside ml-2 space-y-0.5">
                            <li><strong>Opt-in only:</strong> Disabled by default, you must explicitly enable</li>
                            <li><strong>No identifiers:</strong> No user ID, device ID, or tracking data sent</li>
                            <li><strong>No telemetry:</strong> Simple GET request to fetch a static JSON file</li>
                            <li><strong>Rate limited:</strong> Fetches at most once per 24 hours</li>
                            <li><strong>Public endpoint:</strong> Same announcements for all users</li>
                          </ul>
                          <p class="mt-2">When enabled, KubeGraf will check once daily for new announcements about releases, security updates, and important information.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Receive Announcements
                        </h3>
                        <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Get notified about new releases, security updates, and important announcements
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentOptIn = announcementsStatus()?.opt_in ?? false;
                          const newOptIn = !currentOptIn;

                          try {
                            await api.updateAnnouncementsOptIn(newOptIn);
                            const status = await api.getAnnouncementsStatus();
                            setAnnouncementsStatus(status);
                            addNotification(
                              newOptIn
                                ? 'Announcements enabled. You will now receive updates (checked daily).'
                                : 'Announcements disabled. You will no longer receive updates.',
                              'success'
                            );
                          } catch (err: any) {
                            addNotification(`Failed to update announcements setting: ${err.message}`, 'error');
                          }
                        }}
                        class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          announcementsStatus()?.opt_in ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                        }`}
                        style={{ outline: 'none' }}
                        title={announcementsStatus()?.opt_in ? 'Enabled' : 'Disabled'}
                      >
                        <span
                          class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform pointer-events-none ${
                            announcementsStatus()?.opt_in ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <Show when={announcementsStatus()?.opt_in}>
                      <div class="mt-4 space-y-4">
                        <Show when={announcementsStatus()?.last_fetch_at}>
                          <div>
                            <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Last Checked
                            </div>
                            <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {new Date(announcementsStatus()!.last_fetch_at!).toLocaleString()}
                            </div>
                          </div>
                        </Show>

                        <div>
                          <button
                            onClick={async () => {
                              setFetchingAnnouncements(true);
                              try {
                                await api.fetchAnnouncements();
                                const status = await api.getAnnouncementsStatus();
                                setAnnouncementsStatus(status);
                                addNotification('Announcements fetched successfully', 'success');
                              } catch (err: any) {
                                const errorMsg = err.message || 'Unknown error';
                                if (errorMsg.includes('rate limit') || errorMsg.includes('24 hours')) {
                                  addNotification('Announcements can only be fetched once every 24 hours', 'warning');
                                } else {
                                  addNotification(`Failed to fetch announcements: ${errorMsg}`, 'error');
                                }
                              } finally {
                                setFetchingAnnouncements(false);
                              }
                            }}
                            disabled={fetchingAnnouncements()}
                            class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                            style={{ background: 'var(--accent-primary)', color: '#000' }}
                          >
                            <Show when={fetchingAnnouncements()}>
                              <div class="spinner" style={{ width: '16px', height: '16px' }} />
                            </Show>
                            {fetchingAnnouncements() ? 'Fetching...' : 'Check for Announcements Now'}
                          </button>
                          <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            Manually check for new announcements (limited to once per 24 hours)
                          </p>
                        </div>
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>
              <Show when={(section as any).isLearningSection}>
                {/* Incident Learning Section */}
                <div class="space-y-4">
                  <div class="card p-4 mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="flex-1">
                        <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          How Incident Learning Works
                        </div>
                        <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                          <p>KubeGraf learns from your feedback to improve incident diagnosis accuracy over time. All learning happens locally on your device - no data is sent to external servers.</p>
                          <ul class="list-disc list-inside ml-2 space-y-0.5">
                            <li>When you provide feedback (✅ Worked, ❌ Didn't Work, ⚠️ Incorrect Cause), the system updates feature weights and cause priors</li>
                            <li>Confidence scores and root cause rankings improve based on your feedback</li>
                            <li>All learning data is stored in your local SQLite database</li>
                            <li>You can reset learning at any time to return to default weights</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="card p-6">
                    <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                      Learning Status
                    </h3>
                    <Show when={learningStatus()}>
                      <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Sample Size
                          </div>
                          <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {learningStatus()?.sampleSize ?? 0} outcomes
                          </div>
                        </div>
                        <Show when={learningStatus()?.lastUpdated}>
                          <div>
                            <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Last Updated
                            </div>
                            <div class="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {new Date(learningStatus()!.lastUpdated).toLocaleString()}
                            </div>
                          </div>
                        </Show>
                      </div>
                    </Show>

                    <div class="mt-4">
                      <h4 class="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Reset Learning
                      </h4>
                      <p class="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Reset all learned weights and priors to their default values. This will clear all learning progress and start fresh.
                      </p>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to reset all learning? This will clear all learned weights and priors. This action cannot be undone.')) {
                            return;
                          }
                          setResettingLearning(true);
                          try {
                            await api.resetLearning();
                            addNotification('Learning reset successfully', 'success');
                            // Reload learning status
                            const status = await api.getLearningStatus();
                            setLearningStatus(status);
                          } catch (err) {
                            addNotification(`Failed to reset learning: ${err}`, 'error');
                          } finally {
                            setResettingLearning(false);
                          }
                        }}
                        disabled={resettingLearning()}
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                        style={{ background: 'var(--error-color)', color: 'white' }}
                      >
                        <Show when={resettingLearning()}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                        {resettingLearning() ? 'Resetting...' : 'Reset Learning'}
                      </button>
                    </div>
                  </div>
                </div>
              </Show>
              <Show when={(section as any).isMetricsCollectionSection}>
                {/* Metrics Collection Section */}
                <div class="space-y-4">
                  {/* Information Banner */}
                  <div class="card p-4 mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="flex-1">
                        <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                          How Background Metrics Collection Works
                        </div>
                        <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                          <p>KubeGraf automatically collects pod metrics in the background to power ML-based recommendations:</p>
                          <ul class="list-disc list-inside ml-2 space-y-0.5">
                            <li>Collects CPU, memory, and resource usage from all pods periodically</li>
                            <li>Data is stored locally on your device at <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>~/.kubegraf/metrics/</code></li>
                            <li>Used by ML algorithms to generate optimization recommendations</li>
                            <li>Only collects when cluster is connected</li>
                            <li>All data stays local - nothing is sent to external servers</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                      <div>
                        <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Background Collection
                        </h3>
                        <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                          Automatically collect metrics at regular intervals
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentEnabled = metricsCollectorConfig()?.enabled ?? true;
                          const newEnabled = !currentEnabled;

                          setUpdatingMetricsConfig(true);
                          try {
                            await api.updateMetricsCollectorConfig({ enabled: newEnabled });
                            const config = await api.getMetricsCollectorConfig();
                            setMetricsCollectorConfig(config);
                            addNotification(
                              newEnabled ? 'Metrics collection enabled' : 'Metrics collection disabled',
                              'success'
                            );
                          } catch (err: any) {
                            addNotification(`Failed to update metrics collection: ${err.message || err}`, 'error');
                          } finally {
                            setUpdatingMetricsConfig(false);
                          }
                        }}
                        disabled={updatingMetricsConfig()}
                        class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          metricsCollectorConfig()?.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                        }`}
                        style={{ outline: 'none' }}
                        title={metricsCollectorConfig()?.enabled ? 'Enabled' : 'Disabled'}
                      >
                        <span
                          class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform pointer-events-none ${
                            metricsCollectorConfig()?.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <Show when={metricsCollectorConfig()}>
                      <div class="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Collection Interval
                          </div>
                          <select
                            value={metricsCollectorConfig()?.collectionInterval || 5}
                            onChange={async (e) => {
                              const interval = parseFloat(e.currentTarget.value);
                              setUpdatingMetricsConfig(true);
                              try {
                                await api.updateMetricsCollectorConfig({
                                  collectionInterval: interval
                                });
                                const config = await api.getMetricsCollectorConfig();
                                setMetricsCollectorConfig(config);
                                addNotification(`Collection interval updated to ${interval} minutes`, 'success');
                              } catch (err: any) {
                                addNotification(`Failed to update interval: ${err.message || err}`, 'error');
                              } finally {
                                setUpdatingMetricsConfig(false);
                              }
                            }}
                            disabled={!metricsCollectorConfig()?.enabled || updatingMetricsConfig()}
                            class="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <option value="1">1 minute (testing)</option>
                            <option value="5">5 minutes (recommended)</option>
                            <option value="10">10 minutes (battery saver)</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes (minimal)</option>
                            <option value="60">1 hour</option>
                          </select>
                          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            How often to collect pod metrics
                          </div>
                        </div>
                        <div>
                          <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Data Retention
                          </div>
                          <select
                            value={metricsCollectorConfig()?.maxRetentionDays || 7}
                            onChange={async (e) => {
                              const days = parseInt(e.currentTarget.value);
                              setUpdatingMetricsConfig(true);
                              try {
                                await api.updateMetricsCollectorConfig({
                                  maxRetentionDays: days
                                });
                                const config = await api.getMetricsCollectorConfig();
                                setMetricsCollectorConfig(config);
                                addNotification(`Retention period updated to ${days} days`, 'success');
                              } catch (err: any) {
                                addNotification(`Failed to update retention: ${err.message || err}`, 'error');
                              } finally {
                                setUpdatingMetricsConfig(false);
                              }
                            }}
                            disabled={updatingMetricsConfig()}
                            class="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <option value="1">1 day</option>
                            <option value="3">3 days</option>
                            <option value="7">7 days (recommended)</option>
                            <option value="14">14 days</option>
                            <option value="30">30 days</option>
                          </select>
                          <div class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            How long to keep metrics data
                          </div>
                        </div>
                      </div>

                      <Show when={metricsCollectorStatus()}>
                        <div class="grid grid-cols-3 gap-4 mt-6 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                          <div>
                            <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Total Samples
                            </div>
                            <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {metricsCollectorStatus()?.totalSamples || 0}
                            </div>
                          </div>
                          <div>
                            <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                              Status
                            </div>
                            <div class="flex items-center gap-1">
                              <span class={`w-2 h-2 rounded-full ${metricsCollectorStatus()?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {metricsCollectorStatus()?.isConnected ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                          </div>
                          <Show when={metricsCollectorStatus()?.lastUpdated}>
                            <div>
                              <div class="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                Last Updated
                              </div>
                              <div class="text-xs" style={{ color: 'var(--text-primary)' }}>
                                {new Date(metricsCollectorStatus()!.lastUpdated).toLocaleString()}
                              </div>
                            </div>
                          </Show>
                        </div>
                      </Show>

                      <div class="mt-4">
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to clear all metrics history? This action cannot be undone and will reset ML recommendations.')) {
                              return;
                            }
                            setClearingMetrics(true);
                            try {
                              await api.clearMetricsHistory();
                              addNotification('Metrics history cleared successfully', 'success');
                              // Reload status
                              const status = await api.getMetricsCollectorStatus();
                              setMetricsCollectorStatus(status);
                            } catch (err: any) {
                              addNotification(`Failed to clear metrics: ${err.message || err}`, 'error');
                            } finally {
                              setClearingMetrics(false);
                            }
                          }}
                          disabled={clearingMetrics() || (metricsCollectorStatus()?.totalSamples || 0) === 0}
                          class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                          style={{ background: 'var(--error-color)', color: 'white' }}
                        >
                          <Show when={clearingMetrics()}>
                            <div class="spinner" style={{ width: '16px', height: '16px' }} />
                          </Show>
                          {clearingMetrics() ? 'Clearing...' : 'Clear Metrics History'}
                        </button>
                        <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                          Remove all collected metrics data and reset ML recommendations
                        </p>
                      </div>
                    </Show>
                  </div>
                </div>
              </Show>
            </Show>
          </div>
        )}
      </For>

      {/* Advanced Section */}
      <div class="mb-8">
        <button
          onClick={() => setShowAdvanced(!showAdvanced())}
          class="flex items-center gap-2 text-sm font-medium mb-4 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-primary)' }}
        >
          <svg
            class={`w-4 h-4 transition-transform ${showAdvanced() ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings & Information
        </button>

        <Show when={showAdvanced()}>
          <div class="space-y-4">
            {/* Version & Updates */}
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Application Version & Updates
              </h3>
              <div class="flex items-center justify-between mb-4">
                <div>
                  <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    KubeGraf {version()}
                  </div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Advanced Kubernetes Visualization & Management Platform
                  </div>
                </div>
                <Show when={updateInfo() && updateInfo()!.updateAvailable}>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                    Update Available
                  </span>
                </Show>
              </div>
              <button
                onClick={async () => {
                  setCheckingUpdate(true);
                  try {
                    const info = await api.checkForUpdates();
                    setUpdateInfo(info);
                    if (info.updateAvailable) {
                      addNotification(`Update available: ${info.latestVersion}`, 'info');
                    } else {
                      addNotification('You are running the latest version', 'success');
                    }
                  } catch (err) {
                    addNotification(`Failed to check for updates: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                  } finally {
                    setCheckingUpdate(false);
                  }
                }}
                disabled={checkingUpdate()}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
              >
                <Show when={checkingUpdate()}>
                  <div class="spinner" style={{ width: '16px', height: '16px' }} />
                </Show>
                {checkingUpdate() ? 'Checking...' : 'Check for Updates'}
              </button>
            </div>

            {/* Reset Settings */}
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Reset All Settings
              </h3>
              <p class="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Reset all settings to their default values. This will clear all customizations and preferences.
              </p>
              <button
                onClick={handleResetSettings}
                class="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{
                  background: 'var(--error-color)',
                  color: 'white',
                }}
              >
                Reset to Defaults
              </button>
            </div>

            {/* Links */}
            <div class="card p-6">
              <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Documentation & Links
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <a
                  href="https://kubegraf.io"
                  target="_blank"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Website
                </a>
                <a
                  href="https://github.com/kubegraf/kubegraf"
                  target="_blank"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
                <a
                  href="https://kubegraf.io/docs"
                  target="_blank"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Documentation
                </a>
                <a
                  href="https://github.com/kubegraf/kubegraf/issues"
                  target="_blank"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report Issue
                </a>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Settings;
