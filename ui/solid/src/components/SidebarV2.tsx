import { Component, Show, createSignal, createMemo, createEffect, onMount, onCleanup } from 'solid-js';
import { currentView, setCurrentView, setSidebarCollapsed, sidebarAutoHide, addNotification, showUpdateNotification } from '../stores/ui';
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
import SidebarLogo from './SidebarLogo';

const SidebarV2: Component = () => {
  const [version, setVersion] = createSignal<string>('');
  const [bottomSectionCollapsed, setBottomSectionCollapsed] = createSignal(true);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = createSignal(false);
  const [updateInfo, setUpdateInfoState] = createSignal<any>(null);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);

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
          addNotification(`🎉 KubēGraf updated to v${newVersion}!`, 'success');
        }
      } else {
        try {
          const updateInfo = await api.checkForUpdates();
          if (updateInfo?.currentVersion) {
            const newVersion = updateInfo.currentVersion;
            const oldVersion = version();
            setVersion(newVersion);
            
            if (oldVersion && oldVersion !== newVersion && oldVersion !== '') {
              addNotification(`🎉 KubēGraf updated to v${newVersion}!`, 'success');
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

  // Check for updates function (auto, no manual button in sidebar bottom controls)
  const checkForUpdates = async (showNotification = false) => {
    try {
      const info = await api.autoCheckUpdate();
      setUpdateInfoState(info);
      setUpdateInfo(info);

      if (info.updateAvailable) {
        // Check if we should show reminder (once per day or if user dismissed recently)
        const lastReminderKey = 'kubegraf-update-reminder-date';
        const lastReminderTimeKey = 'kubegraf-update-reminder-time';
        const lastReminder = localStorage.getItem(lastReminderKey);
        const lastReminderTime = localStorage.getItem(lastReminderTimeKey);
        const today = new Date().toDateString();
        const now = Date.now();
        
        // Don't show if reminded in the last 30 minutes (after clicking "Remind me later")
        const thirtyMinutes = 30 * 60 * 1000;
        const recentlyReminded = lastReminderTime && (now - parseInt(lastReminderTime)) < thirtyMinutes;

        if (lastReminder !== today && !recentlyReminded) {
          // Show update notification with action buttons
          if (showNotification) {
            showUpdateNotification(info.latestVersion, () => {
              setUpdateInfoState(info);
              setUpdateModalOpen(true);
            });
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
    
    const versionInterval = setInterval(fetchVersion, 60000);
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
        <div class="flex flex-1 overflow-visible">
          {/* Left Rail */}
          <div class="flex flex-col w-16 flex-shrink-0" style={{ overflow: 'visible' }}>
            {/* Logo Header */}
            <div class="w-16 border-b border-border-subtle flex-shrink-0 flex items-start justify-center py-0">
              <SidebarLogo />
            </div>

            {/* Navigation Rail - overflow-visible to allow flyout to show */}
            <div class="flex-1 overflow-visible w-16" style={{ overflow: 'visible' }}>
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
                class="w-full flex items-center justify-center gap-0.5 py-0.5 px-0.5 transition-all duration-150 text-text-primary hover:text-text-primary hover:bg-bg-hover"
                style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box', opacity: '0.95' }}
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
                  class="truncate"
                  style={{
                    fontSize: '6px',
                    fontWeight: '700',
                    maxWidth: '64px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    transform: 'scale(0.75)',
                    transformOrigin: 'center',
                    color: 'var(--text-primary)',
                    opacity: '0.95',
                    textShadow: 'none'
                  }}
                >
                  {bottomSectionCollapsed() ? 'More' : 'Less'}
                </span>
              </button>

              {/* Settings Button (only) inside More panel */}
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
                    overflow: 'visible',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      maxWidth: '64px',
                      minWidth: '64px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                      visibility: 'visible',
                      opacity: 1,
                    }}
                  >
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
                        color: 'var(--text-primary, #e5e7eb)',
                      }}
                    >
                      <svg
                        class="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ margin: '0 auto', display: 'block', visibility: 'visible' }}
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </Show>

              {/* Version - Only version number displayed */}
              <div 
                class="border-t border-border-subtle py-0.5 px-0.5"
                style={{ width: '64px', maxWidth: '64px', boxSizing: 'border-box' }}
                title={version() ? `KubēGraf v${version()}` : 'Version not available'}
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

          {/* Flyout is now rendered as child of each sidebar item in SidebarRail */}
        </div>
      </aside>

      {/* Quick Switcher */}
      <QuickSwitcher
        sections={availableSections()}
        isOpen={quickSwitcherOpen()}
        onClose={() => setQuickSwitcherOpen(false)}
      />

      {/* Update Modal (triggered from auto-checks or other global surfaces) */}
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

