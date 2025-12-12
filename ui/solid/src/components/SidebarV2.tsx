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
                class="flex flex-col items-center justify-center hover:opacity-80 transition-opacity"
                title="Go to Dashboard"
              >
                <svg class="floating-logo" viewBox="0 0 100 100" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#22d3ee"/>
                      <stop offset="50%" stop-color="#3b82f6"/>
                      <stop offset="100%" stop-color="#d946ef"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <g filter="url(#glow)">
                    <line x1="80" y1="30" x2="60" y2="12" stroke="#22d3ee" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="60" y1="12" x2="35" y2="12" stroke="#06b6d4" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="35" y1="12" x2="12" y2="30" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="12" y1="30" x2="12" y2="70" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="12" y1="70" x2="35" y2="88" stroke="#6366f1" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="35" y1="88" x2="60" y2="88" stroke="#8b5cf6" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="60" y1="88" x2="80" y2="70" stroke="#a855f7" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="80" y1="70" x2="80" y2="50" stroke="#c026d3" stroke-width="3.5" stroke-linecap="round"/>
                    <line x1="80" y1="50" x2="55" y2="50" stroke="#d946ef" stroke-width="3.5" stroke-linecap="round"/>
                  </g>
                  <circle cx="80" cy="30" r="5" fill="#22d3ee"/>
                  <circle cx="60" cy="12" r="5" fill="#06b6d4"/>
                  <circle cx="35" cy="12" r="5" fill="#3b82f6"/>
                  <circle cx="12" cy="30" r="5" fill="#3b82f6"/>
                  <circle cx="12" cy="70" r="5" fill="#6366f1"/>
                  <circle cx="35" cy="88" r="5" fill="#8b5cf6"/>
                  <circle cx="60" cy="88" r="5" fill="#a855f7"/>
                  <circle cx="80" cy="70" r="5" fill="#c026d3"/>
                  <circle cx="80" cy="50" r="5" fill="#d946ef"/>
                  <circle cx="55" cy="50" r="5" fill="#d946ef"/>
                  <g filter="url(#glow)">
                    <path d="M42 22 L62 34 L42 46 L22 34 Z" fill="#22d3ee" stroke="#fff" stroke-width="1.5"/>
                    <path d="M42 46 L62 34 L62 54 L42 66 Z" fill="#8b5cf6" stroke="#fff" stroke-width="1.5"/>
                    <path d="M42 46 L22 34 L22 54 L42 66 Z" fill="#3b82f6" stroke="#fff" stroke-width="1.5"/>
                  </g>
                </svg>
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
                <span class="text-[11px] font-medium text-text-muted block text-center">{version() ? `v${version()}` : '...'}</span>
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

