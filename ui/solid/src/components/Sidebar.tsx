import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { currentView, setCurrentView, sidebarCollapsed, toggleSidebar, type View } from '../stores/ui';
import LocalTerminalModal from './LocalTerminalModal';

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
    title: 'Insights',
    items: [
      { id: 'anomalies', label: 'AI Insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
      { id: 'cost', label: 'Cost Analysis', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { id: 'security', label: 'Security Insights', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { id: 'drift', label: 'Drift Detection', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    ],
  },
  {
    title: 'Deployments',
    items: [
      { id: 'apps', label: 'Deploy', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { id: 'rollouts', label: 'Rollouts', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    title: 'Workloads',
    items: [
      { id: 'pods', label: 'Pods', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { id: 'deployments', label: 'Deployments', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
      { id: 'statefulsets', label: 'StatefulSets', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
      { id: 'daemonsets', label: 'DaemonSets', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
      { id: 'jobs', label: 'Jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { id: 'cronjobs', label: 'CronJobs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    title: 'Networking',
    items: [
      { id: 'services', label: 'Services', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
      { id: 'ingresses', label: 'Ingresses', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { id: 'networkpolicies', label: 'Network Policies', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    ],
  },
  {
    title: 'Config & Storage',
    items: [
      { id: 'configmaps', label: 'ConfigMaps', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
      { id: 'secrets', label: 'Secrets', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
      { id: 'certificates', label: 'Certificates', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { id: 'storage', label: 'Storage', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    ],
  },
  {
    title: 'Cluster',
    items: [
      { id: 'nodes', label: 'Nodes', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
      { id: 'rbac', label: 'RBAC', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { id: 'events', label: 'Events', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
      { id: 'monitoredevents', label: 'Event Monitor', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { id: 'resourcemap', label: 'Resource Map', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    ],
  },
        {
          title: 'Integrations',
          items: [
            { id: 'connectors', label: 'Connectors', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            { id: 'mcpagents', label: 'MCP Agents', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.57.393A9.065 9.065 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.065 9.065 0 003.464 3.693M19.8 15.3l-1.464-1.464M5 14.5l-1.464-1.464' },
          ],
        },
  {
    title: 'Extensions',
    items: [
      { id: 'plugins', label: 'Plugins', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
      { id: 'terminal', label: 'Terminal', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ],
  },
];

// Collapsible Section Component
const CollapsibleSection: Component<{ section: NavSection; defaultExpanded?: boolean }> = (props) => {
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
                    // Special handling for terminal
                    if (item.id === 'terminal') {
                      handleTerminalClick();
                    } else {
                      setCurrentView(item.id);
                    }
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

const Sidebar: Component = () => {
  const [terminalOpen, setTerminalOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  
  // Handle terminal view
  const handleTerminalClick = () => {
    setTerminalOpen(true);
  };

  // Filter sections based on search query
  const filteredSections = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return navSections;

    return navSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        section.title.toLowerCase().includes(query)
      )
    })).filter(section => section.items.length > 0);
  });

  return (
    <aside class={`fixed left-0 top-0 h-full sidebar-glass transition-all duration-300 z-40 ${sidebarCollapsed() ? 'w-16' : 'w-52'}`}>
      {/* Logo */}
      <div class="h-14 flex items-center justify-between px-3 border-b" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
        <button onClick={() => setCurrentView('dashboard')} class="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title="Go to Dashboard">
          <svg viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
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
            <span class="font-bold text-lg gradient-text">KubeGraf</span>
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
            // Debug: Log sections being rendered
            if (section.title === 'Integrations') {
              console.log('[Sidebar] Rendering Integrations section with items:', section.items.map(i => i.label));
            }
            return (
              <CollapsibleSection
                section={section}
                defaultExpanded={index() < 3 || section.title === 'Integrations'}
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

      {/* Bottom section with Settings */}
      <div class="absolute bottom-0 left-0 right-0 p-2 border-t" style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
        {/* Settings button */}
        <button
          onClick={() => setCurrentView('settings')}
          class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all ${
            currentView() === 'settings' ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
          style={{ color: currentView() === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <Show when={!sidebarCollapsed()}>
            <span class="text-sm">Settings</span>
          </Show>
        </button>
        <Show when={!sidebarCollapsed()}>
          <div class="flex items-center gap-1.5 px-2.5 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>v1.0.0</span>
          </div>
        </Show>
      </div>

      {/* Local Terminal Modal */}
      <LocalTerminalModal isOpen={terminalOpen()} onClose={() => setTerminalOpen(false)} />
    </aside>
  );
};

export default Sidebar;
