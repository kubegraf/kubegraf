import { Component, For, Show, createSignal, createMemo, createEffect, onMount } from 'solid-js';
import { currentView, setCurrentView, sidebarCollapsed, setSidebarCollapsed, toggleSidebar, sidebarAutoHide, toggleSidebarAutoHide, addNotification } from '../stores/ui';
import { setUpdateInfo } from '../stores/globalStore';
import { api } from '../services/api';
import UpdateModal from './UpdateModal';
import { navSections } from '../config/navSections';
import { shouldShowMLSection } from '../utils/mlDetection';
import { clusterStatus, currentContext } from '../stores/cluster';
import { unreadInsightsEvents, clearInsightsUnread } from '../stores/insightsPulse';
import { AnimatedSection } from './sidebar/AnimatedSection';
import { ensureSidebarSections } from './sidebar/sidebarSectionState';

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
        class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-white/5`}
        style={{ color: 'var(--text-secondary)' }}
        title="Check for Updates"
        disabled={checkingUpdate()}
      >
        <Show when={!checkingUpdate()} fallback={
          <svg class="w-4 h-4 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }>
          {/* Upward arrow in circle icon */}
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            {/* Blue circular background */}
            <circle cx="12" cy="12" r="12" fill="#3b82f6" />
            {/* White circle outline */}
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5" fill="none" />
            {/* White upward arrow - triangular head with rectangular shaft */}
            <path d="M12 7v6M9 10l3-3 3 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </Show>
        <Show when={!sidebarCollapsed()}>
          <span class="text-sm flex-1 min-w-0 truncate">Check Updates</span>
        </Show>
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

const Sidebar: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [version, setVersion] = createSignal<string>('');
  const [bottomSectionCollapsed, setBottomSectionCollapsed] = createSignal(true);
  const [updateInfo, setUpdateInfoState] = createSignal<any>(null);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);

  // Auto-hide behavior: collapse when not hovered
  createEffect(() => {
    if (sidebarAutoHide()) {
      // Default to compact when auto-hide is enabled
      setSidebarCollapsed(true);
    }
  });

  // Clear Insights pulse when visiting any Insights-related view
  createEffect(() => {
    const view = currentView();
    const insightsViews = new Set([
      'incidents',
      'timeline',
      'anomalies',
      'security',
      'cost',
      'drift',
      'continuity',
      'monitoredevents',
      'events',
    ]);
    if (insightsViews.has(view)) {
      clearInsightsUnread();
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
        
        // If version changed and we had an old version, show notification
        if (oldVersion && oldVersion !== newVersion && oldVersion !== '') {
          addNotification(`🎉 KubeGraf updated to v${newVersion}!`, 'success');
        }
      } else {
        // Fallback: try to get version from update check
        try {
          const updateInfo = await api.checkForUpdates();
          if (updateInfo?.currentVersion) {
            const newVersion = updateInfo.currentVersion;
            const oldVersion = version();
            setVersion(newVersion);
            
            // If version changed, show notification
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
    
    // Refresh version every 10 seconds (more frequent to catch updates)
    const versionInterval = setInterval(fetchVersion, 10000);
    // Check for updates every 15 minutes to match backend cache expiration
    // This ensures long-running apps detect new releases quickly
    const updateInterval = setInterval(() => checkForUpdates(false), 15 * 60 * 1000); // Check every 15 minutes
    
    // Also refresh when page becomes visible (after app restart)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Small delay to ensure server is ready after restart
        setTimeout(fetchVersion, 1000);
        setTimeout(() => checkForUpdates(true), 2000); // Check for updates when page becomes visible
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh on focus (when user returns to tab)
    const handleFocus = () => {
      setTimeout(fetchVersion, 500);
      setTimeout(() => checkForUpdates(true), 1000); // Check for updates on focus
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(versionInterval);
      clearInterval(updateInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  });

  // Sections available (ML conditional only). Used for persisted open/close defaults.
  const availableSections = createMemo(() => {
    const showML = shouldShowMLSection();
    return navSections.filter((section) => !(section.conditional && !showML));
  });

  // Filter sections based on search query (without mutating the persisted open/close state)
  const filteredSections = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    let sections = availableSections();

    if (query) {
      sections = sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.label.toLowerCase().includes(query) ||
              section.title.toLowerCase().includes(query)
          ),
        }))
        .filter((section) => section.items.length > 0);
    }

    return sections;
  });

  // Ensure open/close state exists for all sections (persisted in sessionStorage)
  createEffect(() => {
    const titles = availableSections().map((s) => s.title);
    const defaults = ['Overview', 'Insights', 'Workloads'].filter((t) => titles.includes(t));
    ensureSidebarSections(titles, defaults);
  });

  return (
    <aside
      class={`fixed left-0 top-0 h-full sidebar-glass transition-all duration-300 z-40 ${sidebarCollapsed() ? 'w-16' : 'w-52'}`}
      onMouseEnter={() => {
        if (sidebarAutoHide()) {
          setSidebarCollapsed(false);
        }
      }}
      onMouseLeave={() => {
        if (sidebarAutoHide()) {
          setSidebarCollapsed(true);
        }
      }}
    >
      {/* Logo */}
      <div class="h-14 flex items-center justify-between px-3 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button 
          onClick={() => setCurrentView('dashboard')} 
          class="flex items-center gap-2.5 hover:opacity-80 transition-opacity" 
          title="Go to Dashboard"
        >
          <svg class="floating-logo" viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
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
          <Show when={!sidebarCollapsed()}>
            <span 
              class="font-bold text-base"
              style={{ 
                color: 'var(--text-primary)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              KubeGraf
            </span>
          </Show>
        </button>
        <button
          onClick={toggleSidebar}
          class="p-1 rounded hover:bg-white/10 transition-colors"
          title={sidebarCollapsed() ? 'Expand' : 'Collapse'}
        >
          <svg class={`w-4 h-4 transition-transform ${sidebarCollapsed() ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Active cluster badge */}
      <div class="px-3 py-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <div class="flex items-center gap-2">
          <span 
            class="w-2 h-2 rounded-full"
            style={{
              background: clusterStatus().connected 
                ? 'var(--success-color, #10b981)' 
                : 'var(--error-color, #ef4444)'
            }}
          />
          <Show when={!sidebarCollapsed()} fallback={
            <span 
              class="text-xs font-semibold"
              style={{ 
                color: 'var(--text-primary)',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              title={currentContext() || 'No cluster selected'}
            >
              {clusterStatus().connected ? 'ON' : 'OFF'}
            </span>
          }>
            <div class="min-w-0">
              <div 
                class="text-xs font-medium truncate"
                style={{ 
                  color: 'var(--text-primary)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              >
                {currentContext() || 'Select cluster'}
              </div>
              <div 
                class="text-[11px] font-semibold truncate"
                style={{ 
                  color: 'var(--text-primary)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
              >
                {clusterStatus().connected ? 'ON' : 'OFF'}
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Search */}
      <Show when={!sidebarCollapsed()}>
        <div class="px-2.5 py-2 border-b" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full pl-8 pr-2.5 py-1.5 rounded-md text-sm"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
            <Show when={searchQuery()}>
              <button
                onClick={() => setSearchQuery('')}
                class="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Navigation */}
      <nav class="p-1.5 overflow-y-auto" style={{ height: sidebarCollapsed() ? 'calc(100% - 3.5rem - 7rem)' : 'calc(100% - 3.5rem - 7rem - 3rem)' }}>
        <For each={filteredSections()}>
          {(section, index) => {
            const showInsightsPulse = section.title === 'Insights' && unreadInsightsEvents() > 0;
            return (
              <>
                <Show when={index() !== 0}>
                  <div class="mx-2 my-2 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </Show>
                <AnimatedSection section={section} showPulse={showInsightsPulse} />
              </>
            );
          }}
        </For>
        <Show when={searchQuery() && filteredSections().length === 0}>
          <div class="px-2.5 py-8 text-center">
            <p class="text-sm" style={{ color: 'var(--text-muted)' }}>No results found</p>
          </div>
        </Show>
      </nav>

      {/* Bottom section with Settings, Privacy, Docs, Updates and Version */}
      <div class="absolute bottom-0 left-0 right-0 border-t" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
        {/* Collapse/Expand button */}
        <button
          onClick={() => setBottomSectionCollapsed(!bottomSectionCollapsed())}
          class="w-full flex items-center justify-center px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          title={bottomSectionCollapsed() ? 'Expand' : 'Collapse'}
        >
          <svg
            class={`w-3.5 h-3.5 transition-transform duration-200 ${bottomSectionCollapsed() ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Show when={!bottomSectionCollapsed()}>
          <div class="p-2 space-y-1">
            {/* Settings button */}
            <button
              onClick={() => setCurrentView('settings')}
              class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-white/5 ${
                currentView() === 'settings' ? 'bg-white/10' : ''
              }`}
              style={{ color: currentView() === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              title="Settings"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <Show when={!sidebarCollapsed()}>
                <span class="text-sm flex-1 min-w-0 truncate">Settings</span>
              </Show>
            </button>

            {/* Privacy button */}
            <button
              onClick={() => setCurrentView('privacy')}
              class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-white/5 ${
                currentView() === 'privacy' ? 'bg-white/10' : ''
              }`}
              style={{ color: currentView() === 'privacy' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              title="Privacy Policy"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <Show when={!sidebarCollapsed()}>
                <span class="text-sm flex-1 min-w-0 truncate">Privacy</span>
              </Show>
            </button>

            {/* Docs button */}
            <button
              onClick={() => setCurrentView('documentation')}
              class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-white/5 ${
                currentView() === 'documentation' ? 'bg-white/10' : ''
              }`}
              style={{ color: currentView() === 'documentation' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              title="Documentation"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <Show when={!sidebarCollapsed()}>
                <span class="text-sm flex-1 min-w-0 truncate">Docs</span>
              </Show>
            </button>
            {/* Check for Updates button */}
            <SidebarUpdateButton />

            {/* Auto-hide toggle */}
            <button
              onClick={() => toggleSidebarAutoHide()}
              class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
              title="Auto-hide sidebar"
            >
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <Show when={!sidebarCollapsed()}>
                <span class="text-sm flex-1 min-w-0 truncate">Auto-hide</span>
                <span class={`text-xs px-2 py-0.5 rounded-full ${sidebarAutoHide() ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-white/60'}`}>
                  {sidebarAutoHide() ? 'On' : 'Off'}
                </span>
              </Show>
            </button>
          </div>
        </Show>

        {/* Version and Update Button - Always visible at bottom */}
        <div class="px-2.5 py-1.5 border-t" style={{ 'border-color': 'rgba(255,255,255,0.05)' }}>
          <div class="flex flex-col items-center gap-1.5">
            <div class="flex items-center gap-1.5 text-xs w-full justify-center">
              <span class={`w-1.5 h-1.5 rounded-full ${clusterStatus().connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span 
                class="truncate text-[11px] font-semibold" 
                style={{ 
                  color: 'rgba(128, 128, 128, 0.9)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  fontWeight: '600'
                }}
              >
                {version() ? `v${version()}` : 'Loading...'}
              </span>
            </div>
            
            {/* Update Button - Shows when update is available */}
            <Show when={updateInfo()?.updateAvailable}>
              <button
                onClick={async () => {
                  setCheckingUpdate(true);
                  try {
                    const info = await api.checkUpdate();
                    setUpdateInfoState(info);
                    setUpdateInfo(info);
                    if (info.updateAvailable) {
                      setUpdateModalOpen(true);
                    }
                  } catch (err) {
                    addNotification('Failed to check for updates', 'error');
                    console.error('Update check failed:', err);
                  } finally {
                    setCheckingUpdate(false);
                  }
                }}
                disabled={checkingUpdate()}
                class="w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 text-[10px] font-medium"
                style={{
                  background: updateInfo()?.updateAvailable 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'var(--bg-secondary)',
                  color: updateInfo()?.updateAvailable ? '#ffffff' : 'var(--text-secondary)',
                  border: updateInfo()?.updateAvailable ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                  boxShadow: updateInfo()?.updateAvailable 
                    ? '0 2px 8px rgba(245, 158, 11, 0.4), 0 0 12px rgba(245, 158, 11, 0.2)' 
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (updateInfo()?.updateAvailable) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (updateInfo()?.updateAvailable) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                title={`Update available: v${updateInfo()?.latestVersion || ''}`}
              >
                <Show when={!checkingUpdate()} fallback={
                  <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Show>
                <span>Update</span>
              </button>
              <div 
                class="text-[9px] text-center px-1"
                style={{ 
                  color: 'var(--text-muted)',
                  lineHeight: '1.2'
                }}
              >
                New version available, please click here to update
              </div>
            </Show>
          </div>
        </div>
      </div>
      
      {/* Update Modal */}
      <Show when={updateModalOpen() && updateInfo()}>
        <UpdateModal
          isOpen={updateModalOpen()}
          onClose={() => setUpdateModalOpen(false)}
          updateInfo={updateInfo()!}
        />
      </Show>
    </aside>
  );
};

export default Sidebar;
