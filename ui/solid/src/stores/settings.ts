import { createSignal, createEffect } from 'solid-js';

// Feature flags for toggling functionality
export interface FeatureFlags {
  // Core Features
  enableDiagnostics: boolean;
  enableCVEVulnerabilities: boolean;
  enableSecurityChecks: boolean;
  enableMLRecommendations: boolean;
  enableEventMonitoring: boolean;

  // Integrations
  enableMCP: boolean;
  enableConnectors: boolean;

  // Advanced Features
  enableAnomalyDetection: boolean;
  enableCostAnalysis: boolean;
  enableDriftDetection: boolean;
  enableTopology: boolean;
  enableResourceMap: boolean;

  // UI Features
  enableAIChat: boolean;
  enableWebTerminal: boolean;
  enableLogs: boolean;
  enableMetrics: boolean;
  showMLTimelineInBrain: boolean;

  // Monitoring & Alerts
  enableAutoRefresh: boolean;
  enableNotifications: boolean;
  enableSoundEffects: boolean;

  // Sidebar Visibility - Individual Sections
  showOverviewSection: boolean;
  showInsightsSection: boolean;
  showDeploymentsSection: boolean;
  showWorkloadsSection: boolean;
  showNetworkingSection: boolean;
  showConfigStorageSection: boolean;
  showClusterSection: boolean;
  showIntegrationsSection: boolean;
  showExtensionsSection: boolean;

  // Sidebar Visibility - Individual Items
  showDashboard: boolean;
  showAIInsights: boolean;
  showCostAnalysisMenu: boolean;
  showSecurityInsights: boolean;
  showDriftDetectionMenu: boolean;
  showConnectorsMenu: boolean;
  showAIAgentsMenu: boolean;
  showPlugins: boolean;
  showTerminalMenu: boolean;
}

// App settings
export interface AppSettings extends FeatureFlags {
  // Display
  theme: string;
  compactMode: boolean;
  sidebarCollapsed: boolean;

  // General
  defaultNamespace: string;
  itemsPerPage: number;
  refreshInterval: number; // seconds

  // Advanced
  enableDebugMode: boolean;
  enablePerformanceMetrics: boolean;
}

// Default feature flags (all enabled by default for existing users)
const defaultFeatureFlags: FeatureFlags = {
  // Core Features
  enableDiagnostics: true,
  enableCVEVulnerabilities: true,
  enableSecurityChecks: true,
  enableMLRecommendations: true,
  enableEventMonitoring: true,

  // Integrations
  enableMCP: true,
  enableConnectors: true,

  // Advanced Features
  enableAnomalyDetection: true,
  enableCostAnalysis: true,
  enableDriftDetection: true,
  enableTopology: true,
  enableResourceMap: true,

  // UI Features
  enableAIChat: true,
  enableWebTerminal: true,
  enableLogs: true,
  enableMetrics: true,
  showMLTimelineInBrain: true,

  // Monitoring & Alerts
  enableAutoRefresh: true,
  enableNotifications: true,
  enableSoundEffects: true,

  // Sidebar Visibility - All sections visible by default
  showOverviewSection: true,
  showInsightsSection: true,
  showDeploymentsSection: true,
  showWorkloadsSection: true,
  showNetworkingSection: true,
  showConfigStorageSection: true,
  showClusterSection: true,
  showIntegrationsSection: true,
  showExtensionsSection: true,

  // Sidebar Visibility - All items visible by default
  showDashboard: true,
  showAIInsights: true,
  showCostAnalysisMenu: true,
  showSecurityInsights: true,
  showDriftDetectionMenu: true,
  showConnectorsMenu: true,
  showAIAgentsMenu: true,
  showPlugins: true,
  showTerminalMenu: true,
};

// Settings version - increment this when defaults change to force update
const SETTINGS_VERSION = 4;

// Default settings
const defaultSettings: AppSettings = {
  ...defaultFeatureFlags,
  theme: 'dark',
  compactMode: false,
  sidebarCollapsed: false,
  defaultNamespace: '_all',
  itemsPerPage: 50,
  refreshInterval: 30,
  enableDebugMode: false,
  enablePerformanceMetrics: false,
};

// Load settings from localStorage
function loadSettings(): AppSettings {
  try {
    const storedVersion = localStorage.getItem('kubegraf-settings-version');
    const stored = localStorage.getItem('kubegraf-settings');

    // If version mismatch or no version, reset to defaults
    if (!storedVersion || parseInt(storedVersion) < SETTINGS_VERSION) {
      console.log('Settings version mismatch or upgrade needed - resetting to defaults');
      localStorage.setItem('kubegraf-settings-version', SETTINGS_VERSION.toString());
      return defaultSettings;
    }

    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new settings
      return { ...defaultSettings, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return defaultSettings;
}

// Save settings to localStorage
function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem('kubegraf-settings', JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

// Create reactive signals for settings
const [settings, setSettings] = createSignal<AppSettings>(loadSettings());

// Auto-save settings whenever they change
createEffect(() => {
  saveSettings(settings());
});

// Helper functions to update individual settings
export function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
) {
  setSettings(prev => ({ ...prev, [key]: value }));
}

export function updateSettings(updates: Partial<AppSettings>) {
  setSettings(prev => ({ ...prev, ...updates }));
}

export function resetSettings() {
  setSettings(defaultSettings);
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return settings()[feature];
}

// Export settings signal
export { settings };

// Export individual feature flags as computed signals for convenience
export const featureFlags = () => {
  const s = settings();
  const flags: FeatureFlags = {
    enableDiagnostics: s.enableDiagnostics,
    enableCVEVulnerabilities: s.enableCVEVulnerabilities,
    enableSecurityChecks: s.enableSecurityChecks,
    enableMLRecommendations: s.enableMLRecommendations,
    enableEventMonitoring: s.enableEventMonitoring,
    enableMCP: s.enableMCP,
    enableConnectors: s.enableConnectors,
    enableAnomalyDetection: s.enableAnomalyDetection,
    enableCostAnalysis: s.enableCostAnalysis,
    enableDriftDetection: s.enableDriftDetection,
    enableTopology: s.enableTopology,
    enableResourceMap: s.enableResourceMap,
    enableAIChat: s.enableAIChat,
    enableWebTerminal: s.enableWebTerminal,
    enableLogs: s.enableLogs,
    enableMetrics: s.enableMetrics,
    showMLTimelineInBrain: s.showMLTimelineInBrain,
    enableAutoRefresh: s.enableAutoRefresh,
    enableNotifications: s.enableNotifications,
    enableSoundEffects: s.enableSoundEffects,
    showOverviewSection: s.showOverviewSection,
    showInsightsSection: s.showInsightsSection,
    showDeploymentsSection: s.showDeploymentsSection,
    showWorkloadsSection: s.showWorkloadsSection,
    showNetworkingSection: s.showNetworkingSection,
    showConfigStorageSection: s.showConfigStorageSection,
    showClusterSection: s.showClusterSection,
    showIntegrationsSection: s.showIntegrationsSection,
    showExtensionsSection: s.showExtensionsSection,
    showDashboard: s.showDashboard,
    showAIInsights: s.showAIInsights,
    showCostAnalysisMenu: s.showCostAnalysisMenu,
    showSecurityInsights: s.showSecurityInsights,
    showDriftDetectionMenu: s.showDriftDetectionMenu,
    showConnectorsMenu: s.showConnectorsMenu,
    showAIAgentsMenu: s.showAIAgentsMenu,
    showPlugins: s.showPlugins,
    showTerminalMenu: s.showTerminalMenu,
  };
  return flags;
};
