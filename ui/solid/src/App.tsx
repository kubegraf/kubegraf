import { Component, Show, onMount, createSignal, onCleanup } from 'solid-js';
import AppShell from './components/AppShell';
import { AppContent } from './components/AppContent';
import { setUpdateInfo } from './stores/globalStore';
import { api } from './services/api';
import { QueryClientProvider } from './providers/QueryClientProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import AIChat from './components/AIChat';
import BrainPanel from './features/brain/BrainPanel';
import CommandPalette from './components/CommandPalette';
import { isOpen as commandPaletteOpen, closeCommandPalette, openCommandPalette, buttonRef as commandPaletteButtonRef } from './stores/commandPalette';
import { aiPanelOpen, sidebarCollapsed } from './stores/ui';
import { refreshClusterStatus } from './stores/clusterManager';
import { wsService } from './services/websocket';
import { backgroundPrefetch } from './services/backgroundPrefetch';
import { createResource } from 'solid-js';
import { currentView, setCurrentView } from './stores/ui';
import { autoReattachMostRecentRunning } from './stores/executionPanel';
import { settings } from './stores/settings';
import { createEffect } from 'solid-js';

const App: Component = () => {
  const [connectionStatus, { refetch: refetchStatus }] = createResource(() => api.getStatus());
  const [wsConnected, setWsConnected] = createSignal(false);

  // Apply compact mode to body
  createEffect(() => {
    const isCompact = settings().compactMode;
    if (isCompact) {
      document.body.setAttribute('data-compact', 'true');
    } else {
      document.body.removeAttribute('data-compact');
    }
  });

  onMount(() => {
    // Global keyboard shortcut for command palette (Cmd+K / Ctrl+K)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        openCommandPalette();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    // Initialize background pre-fetching in parallel (non-blocking)
    backgroundPrefetch.initialize();

    // WebSocket connection is now handled by WebSocketProvider
    // wsService.connect() is called in WebSocketProvider

    // Prime cluster manager status for header indicator (in parallel)
    refreshClusterStatus();

    // Enhanced routing guards based on cluster state
    setTimeout(async () => {
      const view = currentView();
      const status = connectionStatus();

      // Views that don't require cluster connection (work offline)
      const noConnectionViews = [
        'connect',
        'clustermanager',
        'settings',
        'logs',
        'privacy',
        'documentation',
        'apps',
        'plugins',
        'uidemo', // allow UI demo (including ExecutionPanel) even when not connected
      ];

      // Skip routing guard for views that don't need connection
      if (noConnectionViews.includes(view)) {
        return;
      }

      try {
        // Check for sources first
        const sourcesData = await api.getClusterSources();
        const hasSources = sourcesData.sources && sourcesData.sources.length > 0;

        // If no sources, redirect to /connect
        if (!hasSources) {
          console.log('[App] No kubeconfig sources - redirecting to Connect');
          setCurrentView('connect');
          return;
        }

        // Check for active cluster
        const activeData = await api.getActiveCluster();
        const hasActiveCluster = activeData.cluster && activeData.cluster.active;

        // If no active cluster, redirect to /clusters
        if (!hasActiveCluster) {
          console.log('[App] No active cluster - redirecting to Cluster Manager');
          setCurrentView('clustermanager');
          return;
        }

        // Check if active cluster is healthy
        const activeCluster = activeData.cluster;
        const isHealthy = activeCluster.status === 'CONNECTED' || activeCluster.status === 'DEGRADED';

        // If cluster is not healthy (AUTH_ERROR or DISCONNECTED), redirect to /clusters
        if (!isHealthy && (activeCluster.status === 'AUTH_ERROR' || activeCluster.status === 'DISCONNECTED')) {
          console.log(`[App] Cluster ${activeCluster.status} - redirecting to Cluster Manager`);
          setCurrentView('clustermanager');
          return;
        }

        // If connected via legacy status, allow access
        if (status?.connected) {
          return;
        }
      } catch (err) {
        console.error('[App] Error checking cluster state:', err);
        // Fallback to legacy check
        if (!status?.connected) {
          console.log('[App] Fallback: Not connected - redirecting to Cluster Manager');
          setCurrentView('clustermanager');
        }
      }
    }, 500);

    // Auto-check for updates silently on app load (in parallel)
    api.autoCheckUpdate()
      .then((info) => {
        setUpdateInfo(info);
      })
      .catch((err) => {
        // Silently fail - don't show error to user on auto-check
        console.debug('Auto-update check failed:', err);
      });

    // Attempt to auto-reattach to any running execution so users don't lose
    // visibility if they refresh while a long-running operation is in progress.
    autoReattachMostRecentRunning()
      .catch((err) => {
        console.debug('[App] Failed to auto-reattach execution:', err);
      });

    // Check if user was away for > 24h and auto-redirect to Continuity page
    api.getContinuitySummary('7d')
      .then((summary) => {
        try {
          const lastSeenAt = new Date(summary.last_seen_at);
          const now = new Date();
          const diffHours = (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60);
          
          // If user was away for more than 24 hours, redirect to continuity page
          if (diffHours > 24 && currentView() === 'dashboard') {
            // Small delay to let the app finish initializing
            setTimeout(() => {
              setCurrentView('continuity');
            }, 1000);
          }
        } catch (err) {
          // Silently fail - don't block app loading
          console.debug('Failed to check last seen time:', err);
        }
      })
      .catch((err) => {
        // Silently fail - don't block app loading if continuity API fails
        console.debug('Failed to fetch continuity summary for auto-redirect:', err);
      });

    // Subscribe to connection state
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'connection') {
        setWsConnected(msg.data.connected);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  const isConnected = () => connectionStatus()?.connected !== false;

  return (
    <QueryClientProvider>
      <WebSocketProvider>
        <AppShell>
          <AppContent
            isConnected={isConnected}
            connectionStatus={() => connectionStatus()}
            refetchStatus={refetchStatus}
          />
        </AppShell>

        {/* AI Chat Panel */}
        <Show when={aiPanelOpen()}>
          <AIChat />
        </Show>

        {/* Brain Panel */}
        <BrainPanel />

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen()}
          onClose={closeCommandPalette}
          buttonRef={commandPaletteButtonRef()}
        />

        {/* WebSocket Status Indicator */}
        <div class="fixed bottom-4 z-50" style={{ left: '80px' }}>
          <Show when={sidebarCollapsed()}>
            <div
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              <span class={`w-2 h-2 rounded-full ${wsConnected() ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{wsConnected() ? 'Live' : 'Offline'}</span>
            </div>
          </Show>
        </div>
      </WebSocketProvider>
    </QueryClientProvider>
  );
};


export default App;
