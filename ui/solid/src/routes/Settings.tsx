import { Component, For, Show, createSignal, createEffect, createMemo } from 'solid-js';
import { currentTheme, setTheme, themes, type ThemeName } from '../stores/theme';
import { namespace, setNamespace, namespaces } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { api } from '../services/api';

interface SettingSection {
  title: string;
  description?: string;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'select' | 'toggle' | 'input' | 'number';
  value: () => any;
  onChange: (value: any) => void;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

const Settings: Component = () => {
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [refreshInterval, setRefreshInterval] = createSignal(30); // seconds
  const [itemsPerPage, setItemsPerPage] = createSignal(50);
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [compactMode, setCompactMode] = createSignal(false);
  const [enableNotifications, setEnableNotifications] = createSignal(true);
  const [enableSound, setEnableSound] = createSignal(false);
  const [defaultNamespace, setDefaultNamespace] = createSignal(namespace());
  const [enableDiagnostics, setEnableDiagnostics] = createSignal(true);
  const [enableCVEVulnerabilities, setEnableCVEVulnerabilities] = createSignal(true);
  const [enableSecurityChecks, setEnableSecurityChecks] = createSignal(true);
  
  // Update checking
  const [version, setVersion] = createSignal('1.0.0');
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

  // Load settings from localStorage
  createEffect(() => {
    const savedAutoRefresh = localStorage.getItem('kubegraf-auto-refresh');
    if (savedAutoRefresh !== null) {
      setAutoRefresh(savedAutoRefresh === 'true');
    }

    const savedInterval = localStorage.getItem('kubegraf-refresh-interval');
    if (savedInterval) {
      setRefreshInterval(parseInt(savedInterval, 10));
    }

    const savedItemsPerPage = localStorage.getItem('kubegraf-items-per-page');
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage, 10));
    }

    const savedCompactMode = localStorage.getItem('kubegraf-compact-mode');
    if (savedCompactMode !== null) {
      setCompactMode(savedCompactMode === 'true');
    }

    const savedNotifications = localStorage.getItem('kubegraf-notifications');
    if (savedNotifications !== null) {
      setEnableNotifications(savedNotifications === 'true');
    }

    const savedSound = localStorage.getItem('kubegraf-sound');
    if (savedSound !== null) {
      setEnableSound(savedSound === 'true');
    }

    const savedDefaultNs = localStorage.getItem('kubegraf-default-namespace');
    if (savedDefaultNs) {
      setDefaultNamespace(savedDefaultNs);
    }

    const savedDiagnostics = localStorage.getItem('kubegraf-enable-diagnostics');
    if (savedDiagnostics !== null) {
      setEnableDiagnostics(savedDiagnostics === 'true');
    }

    const savedCVE = localStorage.getItem('kubegraf-enable-cve-vulnerabilities');
    if (savedCVE !== null) {
      setEnableCVEVulnerabilities(savedCVE === 'true');
    }

    const savedSecurity = localStorage.getItem('kubegraf-enable-security-checks');
    if (savedSecurity !== null) {
      setEnableSecurityChecks(savedSecurity === 'true');
    }
  });

  const handleSettingChange = (id: string, value: any) => {
    localStorage.setItem(`kubegraf-${id}`, String(value));
    addNotification(`Setting saved: ${id}`, 'success');
  };

  const handleThemeChange = (theme: ThemeName) => {
    setTheme(theme);
    handleSettingChange('theme', theme);
  };

  const handleNamespaceChange = (ns: string) => {
    setDefaultNamespace(ns);
    setNamespace(ns);
    handleSettingChange('default-namespace', ns);
  };

  const handleAutoRefreshChange = (enabled: boolean) => {
    setAutoRefresh(enabled);
    handleSettingChange('auto-refresh', enabled);
  };

  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
    handleSettingChange('refresh-interval', interval);
  };

  const handleItemsPerPageChange = (count: number) => {
    setItemsPerPage(count);
    handleSettingChange('items-per-page', count);
  };

  const handleCompactModeChange = (enabled: boolean) => {
    setCompactMode(enabled);
    handleSettingChange('compact-mode', enabled);
    document.documentElement.classList.toggle('compact-mode', enabled);
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setEnableNotifications(enabled);
    handleSettingChange('notifications', enabled);
  };

  const handleSoundChange = (enabled: boolean) => {
    setEnableSound(enabled);
    handleSettingChange('sound', enabled);
  };

  const handleDiagnosticsChange = (enabled: boolean) => {
    setEnableDiagnostics(enabled);
    handleSettingChange('enable-diagnostics', enabled);
  };

  const handleCVEVulnerabilitiesChange = (enabled: boolean) => {
    setEnableCVEVulnerabilities(enabled);
    handleSettingChange('enable-cve-vulnerabilities', enabled);
  };

  const handleSecurityChecksChange = (enabled: boolean) => {
    setEnableSecurityChecks(enabled);
    handleSettingChange('enable-security-checks', enabled);
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      localStorage.removeItem('kubegraf-auto-refresh');
      localStorage.removeItem('kubegraf-refresh-interval');
      localStorage.removeItem('kubegraf-items-per-page');
      localStorage.removeItem('kubegraf-compact-mode');
      localStorage.removeItem('kubegraf-notifications');
      localStorage.removeItem('kubegraf-sound');
      localStorage.removeItem('kubegraf-default-namespace');
      localStorage.removeItem('kubegraf-enable-diagnostics');
      localStorage.removeItem('kubegraf-enable-cve-vulnerabilities');
      localStorage.removeItem('kubegraf-enable-security-checks');
      location.reload();
    }
  };

  const sections: SettingSection[] = [
    {
      title: 'Appearance',
      description: 'Customize the look and feel of KubeGraf',
      items: [
        {
          id: 'theme',
          label: 'Theme',
          description: 'Choose your preferred color theme',
          type: 'select',
          value: () => currentTheme(),
          onChange: handleThemeChange,
          options: (Object.keys(themes) as ThemeName[]).map(theme => ({
            label: themes[theme].label,
            value: theme,
          })),
        },
        {
          id: 'compact-mode',
          label: 'Compact Mode',
          description: 'Reduce spacing and padding for a more compact view',
          type: 'toggle',
          value: () => compactMode(),
          onChange: handleCompactModeChange,
        },
      ],
    },
    {
      title: 'General',
      description: 'General application settings',
      items: [
        {
          id: 'default-namespace',
          label: 'Default Namespace',
          description: 'Set the default namespace to load on startup',
          type: 'select',
          value: () => defaultNamespace(),
          onChange: handleNamespaceChange,
          options: [
            { label: 'All Namespaces', value: '_all' },
            ...namespaces().map(ns => ({ label: ns, value: ns })),
          ],
        },
        {
          id: 'items-per-page',
          label: 'Items Per Page',
          description: 'Number of items to display per page in resource lists',
          type: 'number',
          value: () => itemsPerPage(),
          onChange: handleItemsPerPageChange,
          min: 10,
          max: 200,
          step: 10,
        },
      ],
    },
    {
      title: 'Refresh & Updates',
      description: 'Configure automatic refresh and update intervals',
      items: [
        {
          id: 'auto-refresh',
          label: 'Auto Refresh',
          description: 'Automatically refresh resource data',
          type: 'toggle',
          value: () => autoRefresh(),
          onChange: handleAutoRefreshChange,
        },
        {
          id: 'refresh-interval',
          label: 'Refresh Interval',
          description: 'Time between automatic refreshes (seconds)',
          type: 'number',
          value: () => refreshInterval(),
          onChange: handleRefreshIntervalChange,
          min: 5,
          max: 300,
          step: 5,
        },
      ],
    },
    {
      title: 'Notifications',
      description: 'Configure notification preferences',
      items: [
        {
          id: 'notifications',
          label: 'Enable Notifications',
          description: 'Show toast notifications for actions and events',
          type: 'toggle',
          value: () => enableNotifications(),
          onChange: handleNotificationsChange,
        },
        {
          id: 'sound',
          label: 'Sound Effects',
          description: 'Play sound effects for notifications',
          type: 'toggle',
          value: () => enableSound(),
          onChange: handleSoundChange,
        },
      ],
    },
    {
      title: 'Security Features',
      description: 'Enable or disable security-related features',
      items: [
        {
          id: 'enable-diagnostics',
          label: 'Enable Diagnostics',
          description: 'Run cluster diagnostics and health checks',
          type: 'toggle',
          value: () => enableDiagnostics(),
          onChange: handleDiagnosticsChange,
        },
        {
          id: 'enable-cve-vulnerabilities',
          label: 'Enable CVE Vulnerabilities (NIST NVD)',
          description: 'Scan cluster for CVE vulnerabilities using NIST NVD database',
          type: 'toggle',
          value: () => enableCVEVulnerabilities(),
          onChange: handleCVEVulnerabilitiesChange,
        },
        {
          id: 'enable-security-checks',
          label: 'Enable Security Checks',
          description: 'Run security-related diagnostic checks',
          type: 'toggle',
          value: () => enableSecurityChecks(),
          onChange: handleSecurityChecksChange,
        },
      ],
    },
  ];

  const SettingItemComponent: Component<{ item: SettingItem }> = (props) => {
    const item = props.item;
    // Use createMemo to make value reactive - it will re-evaluate when the signal changes
    const value = createMemo(() => item.value());

    return (
      <div class="card p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </label>
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
                  const currentValue = item.value();
                  item.onChange(!currentValue);
                }}
                class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  value() ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                }`}
                style={{ outline: 'none' }}
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
                value={value}
                onChange={(e) => item.onChange(e.currentTarget.value)}
                class="rounded-lg px-3 py-1.5 text-sm"
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
                  value={value}
                  onChange={(e) => item.onChange(parseInt(e.currentTarget.value, 10))}
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
                <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {item.id === 'refresh-interval' ? 'sec' : 'items'}
                </span>
              </div>
            </Show>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div class="max-w-4xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
          Configure KubeGraf to match your preferences
        </p>
      </div>

      <For each={sections}>
        {(section) => (
          <div class="mb-8">
            <div class="mb-4">
              <h2 class="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {section.title}
              </h2>
              <Show when={section.description}>
                <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {section.description}
                </p>
              </Show>
            </div>

            <div class="space-y-3">
              <For each={section.items}>
                {(item) => <SettingItemComponent item={item} />}
              </For>
            </div>
          </div>
        )}
      </For>


      {/* Advanced Settings */}
      <div class="mb-8">
        <button
          onClick={() => setShowAdvanced(!showAdvanced())}
          class="flex items-center gap-2 text-sm font-medium mb-4"
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
          Advanced Settings
        </button>

        <Show when={showAdvanced()}>
          <div class="card p-4 space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Reset All Settings
              </label>
              <p class="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Reset all settings to their default values
              </p>
              <button
                onClick={resetSettings}
                class="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--error-color)',
                  color: 'white',
                }}
              >
                Reset to Defaults
              </button>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Application Version
              </label>
              <div class="flex items-center gap-2">
                <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  KubeGraf {version()}
                </p>
                <Show when={updateInfo() && updateInfo()!.updateAvailable}>
                  <span class="px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                    Update Available
                  </span>
                </Show>
              </div>
            </div>
            
            {/* Update Section */}
            <div class="p-4 rounded-lg mb-4" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="flex items-center justify-between mb-3">
                <div>
                  <div class="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Check for Updates
                  </div>
                  <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Keep KubeGraf up to date with the latest features and fixes
                  </div>
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
              
              <Show when={updateInfo()}>
                {(info) => (
                  <div class="space-y-3">
                    <Show when={info().updateAvailable}>
                      <div class="p-3 rounded-lg border-l-4" style={{ 
                        background: 'rgba(34, 197, 94, 0.1)', 
                        'border-left-color': '#22c55e' 
                      }}>
                        <div class="flex items-start justify-between gap-4">
                          <div class="flex-1">
                            <div class="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                              Update Available: {info().latestVersion}
                            </div>
                            <div class="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                              Current: {info().currentVersion} → Latest: {info().latestVersion}
                            </div>
                            <Show when={info().publishedAt}>
                              <div class="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                Published: {new Date(info().publishedAt!).toLocaleDateString()}
                              </div>
                            </Show>
                            <Show when={info().releaseNotes}>
                              <details class="text-xs mt-2">
                                <summary class="cursor-pointer font-medium mb-1" style={{ color: 'var(--accent-primary)' }}>
                                  Release Notes
                                </summary>
                                <div class="mt-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                  <pre class="whitespace-pre-wrap text-xs">{info().releaseNotes}</pre>
                                </div>
                              </details>
                            </Show>
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm(`Update KubeGraf from ${info().currentVersion} to ${info().latestVersion}?\n\nThe application will restart automatically after the update.`)) {
                                return;
                              }
                              
                              if (!info().downloadUrl) {
                                addNotification('Download URL not available', 'error');
                                return;
                              }
                              
                              setInstallingUpdate(true);
                              try {
                                const result = await api.installUpdate(info().downloadUrl!);
                                if (result.success) {
                                  addNotification(result.message || 'Update started. Application will restart shortly...', 'success');
                                  // Show countdown
                                  let countdown = 5;
                                  const countdownInterval = setInterval(() => {
                                    countdown--;
                                    if (countdown <= 0) {
                                      clearInterval(countdownInterval);
                                      addNotification('Application restarting...', 'info');
                                    } else {
                                      addNotification(`Update complete. Restarting in ${countdown} seconds...`, 'info');
                                    }
                                  }, 1000);
                                } else {
                                  addNotification(result.error || 'Update failed', 'error');
                                  setInstallingUpdate(false);
                                }
                              } catch (err) {
                                addNotification(`Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                                setInstallingUpdate(false);
                              }
                            }}
                            disabled={installingUpdate() || !info().downloadUrl}
                            class="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                            style={{ background: '#22c55e', color: '#000' }}
                          >
                            <Show when={installingUpdate()}>
                              <div class="spinner" style={{ width: '16px', height: '16px' }} />
                            </Show>
                            {installingUpdate() ? 'Installing...' : 'Install Update'}
                          </button>
                        </div>
                      </div>
                    </Show>
                    <Show when={!info().updateAvailable && !info().error}>
                      <div class="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <div class="text-sm" style={{ color: '#22c55e' }}>
                          ✓ You are running the latest version ({info().latestVersion})
                        </div>
                      </div>
                    </Show>
                    <Show when={info().error}>
                      <div class="p-3 rounded-lg border-l-4" style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        'border-left-color': '#ef4444' 
                      }}>
                        <div class="text-sm" style={{ color: '#ef4444' }}>
                          Error checking for updates: {info().error}
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Documentation
              </label>
              <div class="flex gap-2">
                <a
                  href="https://kubegraf.io"
                  target="_blank"
                  class="text-sm underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Website
                </a>
                <a
                  href="https://github.com/kubegraf/kubegraf"
                  target="_blank"
                  class="text-sm underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  GitHub
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

