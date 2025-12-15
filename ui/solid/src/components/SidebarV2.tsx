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
  const [updateInfo, setUpdateInfoState] = createSignal<any>(null);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);

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

  // Check for updates function
  const checkForUpdates = async (showNotification = false) => {
    try {
      const info = await api.autoCheckUpdate();
      setUpdateInfoState(info);
      setUpdateInfo(info);
      
      if (info.updateAvailable) {
        // Check if we should show daily reminder
        const lastReminderKey = 'kubegraf-update-reminder-date';
        const lastReminder = localStorage.getItem(lastReminderKey);
        const today = new Date().toDateString();
        
        if (lastReminder !== today) {
          // Show reminder notification once per day
          if (showNotification) {
            addNotification(`🆕 New version v${info.latestVersion} available! Click Update button to install.`, 'info');
          }
          localStorage.setItem(lastReminderKey, today);
        }
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
    }
  };

  // Fetch version on mount and periodically refresh
  onMount(() => {
    fetchVersion();
    checkForUpdates(true); // Check on mount and show notification if available
    
    const versionInterval = setInterval(fetchVersion, 10000);
    // Check for updates every 15 minutes to match backend cache expiration
    // This ensures long-running apps detect new releases quickly
    const updateInterval = setInterval(() => checkForUpdates(false), 15 * 60 * 1000); // Check every 15 minutes
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(fetchVersion, 1000);
        setTimeout(() => checkForUpdates(true), 2000); // Check for updates when page becomes visible
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleFocus = () => {
      setTimeout(fetchVersion, 500);
      setTimeout(() => checkForUpdates(true), 1000); // Check for updates on focus
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
      clearInterval(versionInterval);
      clearInterval(updateInterval);
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
          <div class="flex flex-col w-16 flex-shrink-0">
            {/* Navigation Rail */}
            <div class="flex-1 overflow-y-auto w-16">
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

            {/* Bottom Controls - Compact - Matches sidebar width (w-16) */}
            <div 
              class="border-t border-border-subtle flex-shrink-0"
              style={{
                width: '64px',
                minWidth: '64px',
                maxWidth: '64px',
                boxSizing: 'border-box',
                overflow: 'visible',
                background: 'var(--bg-surface)'
              }}
            >
              {/* Expand/Collapse Toggle */}
              <button
                onClick={() => setBottomSectionCollapsed(!bottomSectionCollapsed())}
                class="w-full flex items-center justify-center gap-0.5 py-0.5 px-0.5 transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box' }}
                title={bottomSectionCollapsed() ? 'Expand options' : 'Collapse options'}
              >
                <svg
                  class={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${bottomSectionCollapsed() ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <span 
                  class="text-text-muted truncate"
                  style={{
                    fontSize: '6px',
                    fontWeight: '500',
                    maxWidth: '64px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    transform: 'scale(0.75)',
                    transformOrigin: 'center',
                    color: 'var(--text-secondary)',
                    textShadow: 'none'
                  }}
                >
                  {bottomSectionCollapsed() ? 'More' : 'Less'}
                </span>
              </button>

              {/* Update and Settings Buttons */}
              <Show when={!bottomSectionCollapsed()}>
                <div 
                  class="border-t border-border-subtle/50 py-0.5"
                  style={{ 
                    width: '64px', 
                    maxWidth: '64px', 
                    minWidth: '64px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    overflow: 'visible'
                  }}
                >
                  {/* Settings Button (first) */}
                  <div style={{ 
                    width: '64px', 
                    maxWidth: '64px', 
                    minWidth: '64px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                    visibility: 'visible',
                    opacity: 1
                  }}>
                    <button
                      onClick={() => setCurrentView('settings')}
                      class={`
                        transition-all duration-150
                        focus:outline-none focus:ring-1 focus:ring-brand-cyan/40
                        ${
                          currentView() === 'settings'
                            ? 'text-brand-cyan shadow-glowCyan'
                            : 'text-text-primary hover:text-text-primary hover:bg-bg-hover'
                        }
                      `}
                      title="Settings"
                      style={{ 
                        width: '64px', 
                        maxWidth: '64px', 
                        minWidth: '64px', 
                        boxSizing: 'border-box', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        flexBasis: 'auto',
                        padding: '6px 0',
                        margin: '0',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        minHeight: '32px',
                        color: 'var(--text-primary, #e5e7eb)'
                      }}
                    >
                      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto', display: 'block', visibility: 'visible' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* Update Button (second) */}
                  <div style={{ 
                    width: '64px', 
                    maxWidth: '64px', 
                    minWidth: '64px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0
                  }}>
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
                      class={`
                        transition-all duration-150
                        focus:outline-none focus:ring-1 focus:ring-brand-cyan/40
                        ${checkingUpdate()
                          ? 'text-brand-cyan'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}
                      `}
                      title="Check for Updates"
                      disabled={checkingUpdate()}
                      style={{ 
                        width: '64px', 
                        maxWidth: '64px', 
                        minWidth: '64px', 
                        boxSizing: 'border-box', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        flexBasis: 'auto',
                        padding: '8px 0',
                        margin: '0',
                        border: 'none',
                        background: 'transparent',
                        cursor: checkingUpdate() ? 'wait' : 'pointer',
                        minHeight: '40px'
                      }}
                    >
                      <Show when={!checkingUpdate()} fallback={
                        <svg class="w-5 h-5 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      }>
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto' }}>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </Show>
                    </button>
                  </div>
                </div>
              </Show>

              {/* Version - Only version number displayed */}
              <div 
                class="border-t border-border-subtle py-0.5 px-0.5"
                style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box' }}
              >
                <div 
                  class="flex flex-col items-center gap-0.5"
                  style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box' }}
                >
                  <div 
                    class="flex items-center justify-center"
                    style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box' }}
                  >
                    <span 
                      class="font-semibold truncate" 
                      style={{ 
                        color: 'var(--text-primary)',
                        textShadow: 'none',
                        fontWeight: '600',
                        fontSize: '6px',
                        lineHeight: '1.1',
                        width: '64px',
                        maxWidth: '64px',
                        boxSizing: 'border-box',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        transform: 'scale(0.75)',
                        transformOrigin: 'center'
                      }}
                    >
                      {version() ? `v${version()}` : '...'}
                    </span>
                  </div>
                </div>
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

      {/* Update Modal */}
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

export default SidebarV2;

