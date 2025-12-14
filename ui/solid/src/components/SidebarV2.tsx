import { Component, Show, createSignal, createMemo, createEffect, onMount, onCleanup } from 'solid-js';
import { currentView, setCurrentView, setSidebarCollapsed, sidebarAutoHide, addNotification } from '../stores/ui';
import { setUpdateInfo } from '../stores/globalStore';
import { api } from '../services/api';
import UpdateModal from './UpdateModal';
import { navSections } from '../config/navSections';
import { shouldShowMLSection } from '../utils/mlDetection';
import { clusterStatus, currentContext } from '../stores/cluster';
import { ensureSidebarSections } from './sidebar/sidebarSectionState';
import SidebarRail from './sidebar/SidebarRail';
import SidebarFlyout from './sidebar/SidebarFlyout';
import QuickSwitcher from './sidebar/QuickSwitcher';
import { setActive, closeWithDelay } from '../stores/sidebarState';
import { currentTheme } from '../stores/theme';

// Update button component for sidebar
const SidebarUpdateButton: Component = () => {
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  const [updateInfo, setUpdateInfoState] = createSignal<any>(null);

  return (
    <>
      <button
        onClick={async () => {
          setCheckingUpdate(true);
          try {
            const info = await api.checkUpdate();
            setUpdateInfoState(info);
            setUpdateInfo(info);
            if (info.updateAvailable) {
              setUpdateModalOpen(true);
            } else {
              addNotification("You're on the latest version 🎉", 'success');
            }
          } catch (err) {
            addNotification('Failed to check for updates', 'error');
            console.error('Update check failed:', err);
          } finally {
            setCheckingUpdate(false);
          }
        }}
        class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-bg-hover text-text-secondary hover:text-text-primary"
        title="Check for Updates"
        disabled={checkingUpdate()}
      >
        <Show when={!checkingUpdate()} fallback={
          <svg class="w-4 h-4 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }>
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#3b82f6" />
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5" fill="none" />
            <path d="M12 7v6M9 10l3-3 3 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </Show>
        <span class="text-sm flex-1 min-w-0 truncate">Check Updates</span>
      </button>
      <Show when={updateModalOpen() && updateInfo()}>
        <UpdateModal
          isOpen={updateModalOpen()}
          onClose={() => setUpdateModalOpen(false)}
          updateInfo={updateInfo()!}
        />
      </Show>
    </>
  );
};

const SidebarV2: Component = () => {
  const [version, setVersion] = createSignal<string>('');
  const [bottomSectionCollapsed, setBottomSectionCollapsed] = createSignal(true);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = createSignal(false);

  // Auto-hide behavior: collapse when not hovered
  createEffect(() => {
    if (sidebarAutoHide()) {
      setSidebarCollapsed(true);
    }
  });

  // Fetch version function
  const fetchVersion = async () => {
    try {
      const status = await api.getStatus();
      if (status?.version) {
        const newVersion = status.version;
        const oldVersion = version();
        setVersion(newVersion);
        
        if (oldVersion && oldVersion !== newVersion && oldVersion !== '') {
          addNotification(`🎉 KubeGraf updated to v${newVersion}!`, 'success');
        }
      } else {
        try {
          const updateInfo = await api.checkForUpdates();
          if (updateInfo?.currentVersion) {
            const newVersion = updateInfo.currentVersion;
            const oldVersion = version();
            setVersion(newVersion);
            
            if (oldVersion && oldVersion !== newVersion && oldVersion !== '') {
              addNotification(`🎉 KubeGraf updated to v${newVersion}!`, 'success');
            }
          }
        } catch (e) {
          console.error('Failed to get version from update check:', e);
        }
      }
    } catch (err) {
      console.error('Failed to fetch version:', err);
    }
  };

  // Fetch version on mount and periodically refresh
  onMount(() => {
    fetchVersion();
    const interval = setInterval(fetchVersion, 10000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(fetchVersion, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleFocus = () => {
      setTimeout(fetchVersion, 500);
    };
    window.addEventListener('focus', handleFocus);

    // Cmd+K / Ctrl+K handler
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSwitcherOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  // Sections available (ML conditional only)
  const availableSections = createMemo(() => {
    const showML = shouldShowMLSection();
    return navSections.filter((section) => !(section.conditional && !showML));
  });

  // Ensure open/close state exists for all sections
  createEffect(() => {
    const titles = availableSections().map((s) => s.title);
    const defaults = ['Overview', 'Insights', 'Workloads'].filter((t) => titles.includes(t));
    ensureSidebarSections(titles, defaults);
  });

  // Handle click outside to close flyout
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.sidebar-v2-container')) {
      closeWithDelay(0);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  return (
    <>
      <aside
        class="sidebar-v2-container fixed left-0 top-0 h-full z-[110] flex flex-col"
        onMouseEnter={() => {
          if (sidebarAutoHide()) {
            setSidebarCollapsed(false);
          }
        }}
        onMouseLeave={() => {
          if (sidebarAutoHide()) {
            setSidebarCollapsed(true);
            closeWithDelay(0);
          }
        }}
      >
        <div class="flex flex-1 overflow-hidden">
          {/* Left Rail */}
          <div class="flex flex-col">
            {/* Logo/Header */}
            <div class="h-14 flex flex-col items-center justify-center border-b border-border-subtle bg-bg-sidebar">
              <button
                onClick={() => setCurrentView('dashboard')}
                class="flex flex-col items-center justify-center hover:opacity-80 transition-opacity rounded-lg p-1.5 mb-1"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                }}
                title="Go to Dashboard"
              >
                <img 
                  src="/logo.png" 
                  alt="KubeGraf Logo" 
                  class="w-7 h-7 object-contain"
                  style={{ 
                    'max-width': '28px', 
                    'max-height': '28px',
                    filter: currentTheme() === 'light' 
                      ? 'brightness(0.85) contrast(1.1)' 
                      : 'brightness(1.1) contrast(1.05) drop-shadow(0 0 8px rgba(6, 182, 212, 0.3))',
                    transition: 'filter 0.3s ease',
                  }}
                />
                <span class="text-[10px] font-bold text-text-primary tracking-tight mt-0.5">KubeGraf</span>
              </button>
            </div>

            {/* Cluster Status */}
            <div class="px-2 py-2 border-b border-border-subtle bg-bg-sidebar">
              <div class="flex flex-col items-center gap-1">
                <span class={`w-2 h-2 rounded-full ${clusterStatus().connected ? 'bg-status-success' : 'bg-status-danger'}`} />
                <span class="text-[10px] text-text-muted text-center truncate w-full" title={currentContext() || 'No cluster selected'}>
                  {clusterStatus().connected ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Navigation Rail */}
            <div class="flex-1 overflow-y-auto">
              <SidebarRail
                sections={availableSections()}
                onSectionClick={(section) => {
                  // Optional: navigate to first item in section
                  if (section.items.length > 0) {
                    // Don't auto-navigate, let user choose from flyout
                  }
                }}
              />
            </div>

            {/* Bottom Controls */}
            <div class="border-t border-border-subtle bg-bg-sidebar">
              {/* Expand/Collapse Toggle */}
              <button
                onClick={() => setBottomSectionCollapsed(!bottomSectionCollapsed())}
                class="w-full flex items-center justify-center gap-1 py-1.5 px-2 transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                title={bottomSectionCollapsed() ? 'Expand options' : 'Collapse options'}
              >
                <svg
                  class={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${bottomSectionCollapsed() ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <span class="text-[9px] text-text-muted">{bottomSectionCollapsed() ? 'More' : 'Less'}</span>
              </button>

              {/* Collapsible Section */}
              <Show when={!bottomSectionCollapsed()}>
                <div class="border-t border-border-subtle/50">
                  {/* Docs button */}
                  <button
                    onClick={() => setCurrentView('documentation')}
                    class={`w-full flex flex-col items-center justify-center gap-0.5 py-2 px-2 transition-all duration-150 ${currentView() === 'documentation' ? 'text-brand-cyan shadow-glowCyan' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                    title="Documentation"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span class="text-[10px] font-medium">Docs</span>
                  </button>

                  {/* Privacy button */}
                  <button
                    onClick={() => setCurrentView('privacy')}
                    class={`w-full flex flex-col items-center justify-center gap-0.5 py-2 px-2 transition-all duration-150 ${currentView() === 'privacy' ? 'text-brand-cyan shadow-glowCyan' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
                    title="Privacy Policy"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span class="text-[10px] font-medium">Privacy</span>
                  </button>

                  {/* Check Updates button */}
                  <button
                    onClick={async () => {
                      try {
                        const info = await api.checkUpdate();
                        setUpdateInfo(info);
                        if (info.updateAvailable) {
                          addNotification(`Update available: v${info.latestVersion}`, 'info');
                        } else {
                          addNotification("You're on the latest version", 'success');
                        }
                      } catch (err) {
                        addNotification('Failed to check for updates', 'error');
                      }
                    }}
                    class="w-full flex flex-col items-center justify-center gap-0.5 py-2 px-2 transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                    title="Check for Updates"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span class="text-[10px] font-medium">Update</span>
                  </button>

                  {/* Settings button */}
                  <button
                    onClick={() => setCurrentView('settings')}
                    class={`
                      w-full flex flex-col items-center justify-center gap-0.5 py-2 px-2
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-brand-cyan/40
                      ${
                        currentView() === 'settings'
                          ? 'text-brand-cyan shadow-glowCyan'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                      }
                    `}
                    title="Settings"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span class="text-[10px] font-medium">Settings</span>
                  </button>
                </div>
              </Show>

              {/* Version - Always visible at bottom */}
              <div class="border-t border-border-subtle py-2 px-2">
                <span class="text-[11px] font-semibold text-text-primary block text-center" style={{ color: 'var(--text-primary)' }}>{version() ? `v${version()}` : '...'}</span>
              </div>
            </div>
          </div>

          {/* Right Flyout */}
          <SidebarFlyout
            sections={availableSections()}
            onItemClick={(itemId) => {
              // Item clicked, navigation handled by SidebarFlyout
            }}
          />
        </div>
      </aside>

      {/* Quick Switcher */}
      <QuickSwitcher
        sections={availableSections()}
        isOpen={quickSwitcherOpen()}
        onClose={() => setQuickSwitcherOpen(false)}
      />

    </>
  );
};

export default SidebarV2;

