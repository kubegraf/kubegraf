import { Component, For, Show } from 'solid-js';
import { currentView, setCurrentView, sidebarCollapsed, toggleSidebar, type View } from '../stores/ui';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  id: View;
  label: string;
  icon: string;
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    title: 'Workloads',
    items: [
      { id: 'pods', label: 'Pods', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { id: 'deployments', label: 'Deployments', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { id: 'statefulsets', label: 'StatefulSets', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
      { id: 'daemonsets', label: 'DaemonSets', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
      { id: 'cronjobs', label: 'CronJobs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'jobs', label: 'Jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    ],
  },
  {
    title: 'Network',
    items: [
      { id: 'services', label: 'Services', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
      { id: 'ingresses', label: 'Ingresses', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ],
  },
  {
    title: 'Config',
    items: [
      { id: 'configmaps', label: 'ConfigMaps', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    ],
  },
  {
    title: 'Cluster',
    items: [
      { id: 'nodes', label: 'Nodes', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
      { id: 'resourcemap', label: 'Resource Map', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'security', label: 'Security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { id: 'plugins', label: 'Plugins', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    ],
  },
];

const Sidebar: Component = () => {
  return (
    <aside class={`fixed left-0 top-0 h-full sidebar-glass transition-all duration-300 z-40 ${sidebarCollapsed() ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div class="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <svg viewBox="0 0 100 100" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#06b6d4"/>
                <stop offset="50%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#8b5cf6"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="50" cy="50" r="46" fill="rgba(6, 182, 212, 0.1)" stroke="url(#logoGrad)" stroke-width="2"/>
            <g filter="url(#glow)">
              <circle cx="50" cy="50" r="12" fill="url(#logoGrad)"/>
              <line x1="50" y1="38" x2="50" y2="18" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="61" y1="41" x2="76" y2="26" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="62" y1="54" x2="80" y2="60" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="56" y1="61" x2="64" y2="80" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="44" y1="61" x2="36" y2="80" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="38" y1="54" x2="20" y2="60" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <line x1="39" y1="41" x2="24" y2="26" stroke="url(#logoGrad)" stroke-width="4" stroke-linecap="round"/>
              <circle cx="50" cy="16" r="5" fill="#06b6d4"/>
              <circle cx="78" cy="24" r="5" fill="#22d3ee"/>
              <circle cx="82" cy="60" r="5" fill="#3b82f6"/>
              <circle cx="66" cy="82" r="5" fill="#6366f1"/>
              <circle cx="34" cy="82" r="5" fill="#8b5cf6"/>
              <circle cx="18" cy="60" r="5" fill="#a855f7"/>
              <circle cx="22" cy="24" r="5" fill="#06b6d4"/>
            </g>
          </svg>
          <Show when={!sidebarCollapsed()}>
            <span class="font-bold text-xl gradient-text">KubeGraf</span>
          </Show>
        </div>
        <button
          onClick={toggleSidebar}
          class="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          title={sidebarCollapsed() ? 'Expand' : 'Collapse'}
        >
          <svg class={`w-5 h-5 transition-transform ${sidebarCollapsed() ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav class="p-2 space-y-4 overflow-y-auto" style={{ height: 'calc(100% - 4rem - 3rem)' }}>
        <For each={navSections}>
          {(section) => (
            <div>
              <Show when={!sidebarCollapsed()}>
                <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {section.title}
                </div>
              </Show>
              <div class="space-y-0.5">
                <For each={section.items}>
                  {(item) => (
                    <button
                      onClick={() => setCurrentView(item.id)}
                      class={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        currentView() === item.id
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                          : 'hover:bg-white/5'
                      }`}
                      style={{
                        color: currentView() === item.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                      title={sidebarCollapsed() ? item.label : undefined}
                    >
                      <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
                      </svg>
                      <Show when={!sidebarCollapsed()}>
                        <span class="text-sm font-medium">{item.label}</span>
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </nav>

      {/* Version info at bottom */}
      <div class="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ 'border-color': 'var(--border-color)' }}>
        <Show when={!sidebarCollapsed()}>
          <div class="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>KubeGraf v1.0.0 - Solid.js UI</span>
          </div>
        </Show>
      </div>
    </aside>
  );
};

export default Sidebar;
