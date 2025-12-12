import { Component, Show, onMount, For, createSignal } from 'solid-js';
import AppShell from './components/AppShell';
import { AppContent } from './components/AppContent';
import { setUpdateInfo } from './stores/globalStore';
import { api } from './services/api';
import { QueryClientProvider } from './providers/QueryClientProvider';
import { WebSocketProvider } from './providers/WebSocketProvider';
import AIChat from './components/AIChat';
import BrainPanel from './features/brain/BrainPanel';
import { aiPanelOpen, sidebarCollapsed, notifications } from './stores/ui';
import { refreshClusterStatus } from './stores/clusterManager';
import { wsService } from './services/websocket';
import { backgroundPrefetch } from './services/backgroundPrefetch';
import { createResource } from 'solid-js';
import { currentView, setCurrentView } from './stores/ui';

const App: Component = () => {
  const [connectionStatus, { refetch: refetchStatus }] = createResource(() => api.getStatus());
  const [wsConnected, setWsConnected] = createSignal(false);

  onMount(() => {
    // Initialize background pre-fetching in parallel (non-blocking)
    backgroundPrefetch.initialize();

    // WebSocket connection is now handled by WebSocketProvider
    // wsService.connect() is called in WebSocketProvider

    // Prime cluster manager status for header indicator (in parallel)
    refreshClusterStatus();

    // Simple: If not connected and viewing a view that requires connection, redirect to Cluster Manager
    setTimeout(() => {
      const status = connectionStatus();
      const view = currentView();

      // If connected, no need to redirect
      if (status?.connected) {
        return;
      }

      // Views that don't require connection
      const noConnectionViews = ['clustermanager', 'settings', 'logs', 'privacy', 'documentation'];

      // If not connected and viewing a view that requires connection, redirect to Cluster Manager
      if (!noConnectionViews.includes(view)) {
        console.log('[App] Not connected - redirecting to Cluster Manager');
        setCurrentView('clustermanager');
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

        {/* Notifications - Centered on page */}
        <div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col-reverse gap-3 max-w-md">
          <For each={notifications()}>
            {(notification) => (
              <div
                class="animate-slide-in px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm"
                style={{
                  background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                             notification.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' :
                             notification.type === 'success' ? 'rgba(34, 197, 94, 0.95)' :
                             'rgba(6, 182, 212, 0.95)',
                  'border-color': notification.type === 'error' ? 'rgba(239, 68, 68, 0.5)' :
                                 notification.type === 'warning' ? 'rgba(245, 158, 11, 0.5)' :
                                 notification.type === 'success' ? 'rgba(34, 197, 94, 0.5)' :
                                 'rgba(6, 182, 212, 0.5)',
                  color: notification.type === 'error' ? '#fff' :
                         notification.type === 'warning' ? '#000' :
                         notification.type === 'success' ? '#fff' :
                         '#000',
                }}
              >
                <div class="flex items-start gap-2.5">
                  <span class="flex-shrink-0 text-base">
                    {notification.type === 'error' ? '❌' :
                     notification.type === 'warning' ? '⚠️' :
                     notification.type === 'success' ? '✓' : 'ℹ️'}
                  </span>
                  <span class="text-sm break-words leading-relaxed">{notification.message}</span>
                </div>
              </div>
            )}
          </For>
        </div>

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
