import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { currentView, setCurrentView, sidebarCollapsed, toggleSidebar, toggleTerminal, addNotification } from '../stores/ui';
import { setUpdateInfo } from '../stores/globalStore';
import { api } from '../services/api';
import UpdateModal from './UpdateModal';
import { navSections, type NavSection } from '../config/navSections';
import { shouldShowMLSection } from '../utils/mlDetection';

// Collapsible Section Component
const CollapsibleSection: Component<{ section: NavSection; defaultExpanded?: boolean; onTerminalClick?: () => void }> = (props) => {
  const [expanded, setExpanded] = createSignal(props.defaultExpanded ?? true);

  // Check if any item in this section is currently active
  const hasActiveItem = () => props.section.items.some(item => currentView() === item.id);

  return (
    <div class="mb-1">
      <Show when={!sidebarCollapsed()}>
        <button
          onClick={() => setExpanded(!expanded())}
          class="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-white/5 transition-colors group"
        >
          <span class="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {props.section.title}
          </span>
          <svg
            class={`w-3.5 h-3.5 transition-transform duration-200 ${expanded() ? '' : '-rotate-90'}`}
            style={{ color: 'var(--text-muted)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Show>

      <Show when={expanded() || sidebarCollapsed()}>
        <div class={`space-y-px ${sidebarCollapsed() ? '' : 'mt-0.5'}`}>
          <For each={props.section.items}>
            {(item) => {
              const [hovered, setHovered] = createSignal(false);
              const [pos, setPos] = createSignal({ top: 0, left: 0 });
              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Special handling for terminal - open as view instead of docked terminal
                      setCurrentView(item.id);
                  }}
                  onMouseEnter={(e) => {
                    if (sidebarCollapsed()) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
                      setHovered(true);
                    }
                  }}
                  onMouseLeave={() => setHovered(false)}
                  class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all ${
                    currentView() === item.id
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    color: currentView() === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                  </svg>
                  <Show when={!sidebarCollapsed()}>
                    <span class={`text-sm ${currentView() === item.id ? 'font-medium' : ''}`}>{item.label}</span>
                  </Show>
                  <Show when={sidebarCollapsed() && hovered()}>
                    <Portal>
                      <div
                        class="fixed px-2 py-1 rounded text-xs font-medium whitespace-nowrap z-[9999]"
                        style={{
                          top: `${pos().top}px`,
                          left: `${pos().left}px`,
                          transform: 'translateY(-50%)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          'box-shadow': '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {item.label}
                      </div>
                    </Portal>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};

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
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        }>
          {/* Upward arrow in circle icon */}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
            {/* Blue circular background */}
            <circle cx="12" cy="12" r="12" fill="#3b82f6" />
            {/* White circle outline */}
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.5" fill="none" />
            {/* White upward arrow - triangular head with rectangular shaft */}
            <path d="M12 7v6M9 10l3-3 3 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </Show>
        <Show when={!sidebarCollapsed()}>
          <span class="text-sm">Check Updates</span>
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

  // Handle terminal view - toggle docked terminal at bottom
  const handleTerminalClick = () => {
    console.log('[Sidebar] Terminal icon clicked - calling toggleTerminal()');
    toggleTerminal();
    console.log('[Sidebar] toggleTerminal() called');
  };

  // Filter sections based on search query and ML detection
  const filteredSections = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    const showML = shouldShowMLSection();
    
    // Filter sections based on ML detection and search
    let sections = navSections.filter(section => {
      // Hide ML section if not detected
      if (section.conditional && !showML) {
        return false;
      }
      return true;
    });

    // Apply search filter
    if (query) {
      sections = sections.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(query) ||
          section.title.toLowerCase().includes(query)
        )
      })).filter(section => section.items.length > 0);
    }

    return sections;
  });

  return (
    <aside class={`fixed left-0 top-0 h-full sidebar-glass transition-all duration-300 z-40 ${sidebarCollapsed() ? 'w-16' : 'w-52'}`}>
      {/* Logo */}
      <div class="h-14 flex items-center justify-between px-3 border-b" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
        <button onClick={() => setCurrentView('dashboard')} class="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title="Go to Dashboard">
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
            <span class="font-bold text-lg gradient-text floating-text">KubeGraf</span>
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
      <nav class="p-1.5 overflow-y-auto" style={{ height: sidebarCollapsed() ? 'calc(100% - 3.5rem - 4rem)' : 'calc(100% - 3.5rem - 4rem - 3rem)' }}>
        <For each={filteredSections()}>
          {(section, index) => {
            // Default expanded for first 3 sections (Overview, Insights, Workloads)
            const defaultExpanded = index() < 3;
            return (
              <CollapsibleSection
                section={section}
                defaultExpanded={defaultExpanded}
                onTerminalClick={handleTerminalClick}
              />
            );
          }}
        </For>
        <Show when={searchQuery() && filteredSections().length === 0}>
          <div class="px-2.5 py-8 text-center">
            <p class="text-sm" style={{ color: 'var(--text-muted)' }}>No results found</p>
          </div>
        </Show>
      </nav>

      {/* Bottom section with Updates and Version */}
      <div class="absolute bottom-0 left-0 right-0 p-2 border-t" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
        {/* Check for Updates button */}
        <SidebarUpdateButton />
        
        <Show when={!sidebarCollapsed()}>
          <div class="flex items-center gap-1.5 px-2.5 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>v1.0.0</span>
          </div>
        </Show>
      </div>
    </aside>
  );
};

export default Sidebar;
