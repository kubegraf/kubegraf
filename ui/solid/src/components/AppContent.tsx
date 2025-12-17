import { Component, Show, For, createSignal } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { currentView, sidebarCollapsed, notifications, terminalOpen, setTerminalOpen, addNotification, setCurrentView } from '../stores/ui';
import { setUpdateInfo } from '../stores/globalStore';
import { clusterSwitching, clusterSwitchMessage } from '../stores/cluster';
import DeploymentProgress from './DeploymentProgress';
import DockedTerminal from './DockedTerminal';
import NotificationCenter from './NotificationCenter';
import { ConnectionOverlay } from './ConnectionOverlay';
import ExecutionPanel from './ExecutionPanel';
import { api } from '../services/api';
import UpdateModal from './UpdateModal';

import { noConnectionViews, views } from '../routes/viewRegistry';

interface AppContentProps {
  isConnected: () => boolean;
  connectionStatus: () => any;
  refetchStatus: () => void;
}

export const AppContent: Component<AppContentProps> = (props) => {
  const [checkingUpdate, setCheckingUpdate] = createSignal(false);
  const [updateModalOpen, setUpdateModalOpen] = createSignal(false);
  const [updateInfoState, setUpdateInfoState] = createSignal<any>(null);

  const handleFooterUpdateCheck = async () => {
    setCheckingUpdate(true);
    try {
      const info = await api.checkUpdate();
      if (info.updateAvailable) {
        setUpdateInfo(info);
        setUpdateInfoState(info);
        setUpdateModalOpen(true);
      } else {
        addNotification("You're on the latest version 🎉", 'success');
      }
    } catch (err) {
      addNotification('Failed to check for updates', 'error');
      console.error('Footer update check failed:', err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <>
      {/* Connection status banner */}
      <Show when={!props.isConnected()}>
        <div class="px-6 py-3 flex items-center gap-3" style={{
          background: 'rgba(239, 68, 68, 0.1)',
          'border-bottom': '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--error-color)' }}>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1 min-w-0">
            <span class="font-medium" style={{ color: 'var(--error-color)' }}>
              Cluster not connected
            </span>
            <span class="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
              — Connect to a Kubernetes cluster to use KubeGraf
            </span>
          </div>
          <button
            onClick={() => location.reload()}
            class="px-3 py-1.5 rounded text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1.5"
            style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </Show>

      {/* Cluster switching indicator */}
      <Show when={clusterSwitching()}>
        <div class="px-4 py-2 flex items-center gap-3" style={{
          background: 'rgba(6, 182, 212, 0.1)',
          'border-bottom': '1px solid rgba(6, 182, 212, 0.3)',
          color: 'var(--accent-primary)',
        }}>
          <div class="spinner" style={{ width: '16px', height: '16px' }} />
          <span class="text-sm font-medium">{clusterSwitchMessage()}</span>
        </div>
      </Show>

      {/* Main content area */}
      <main class="flex-1 overflow-auto p-6 relative">
        {/* Always allow Cluster Manager to be shown, even when not connected */}
        <Show when={props.isConnected() || noConnectionViews.has(currentView())}>
          {(() => {
            const view = currentView();
            const Component = views[view];
            if (!Component) {
              console.error('[App] Component not found for view:', view);
              return <div class="p-6" style="background: red; color: white;">Error: Component not found for view "{view}"</div>;
            }
            try {
              return <Dynamic component={Component} />;
            } catch (error) {
              console.error('[App] Error rendering component:', error);
              return <div class="p-6" style="background: red; color: white;">Error rendering {view}: {String(error)}</div>;
            }
          })()}
        </Show>
        {/* Show ConnectionOverlay for most views when not connected (but allow Apps & Cluster Manager) */}
        <Show
          when={
            !props.isConnected() &&
            currentView() !== 'clustermanager' &&
            currentView() !== 'settings' &&
            currentView() !== 'logs' &&
            currentView() !== 'apps'
          }
        >
          <ConnectionOverlay
            connectionStatus={props.connectionStatus}
            refetchStatus={props.refetchStatus}
          />
        </Show>
      </main>

      {/* Status Footer - aligned with header/quick access bar */}
      <footer
        class="header-glass px-6 py-2 border-t flex items-center justify-end text-xs"
        style={{
          background: 'var(--bg-secondary)',
          'border-color': 'var(--border-color)',
          color: 'var(--text-muted)',
          'margin-left': '0.75rem',
          'margin-right': '0.75rem',
        }}
      >
        <div class="flex items-center gap-4 w-full justify-end">
          <NotificationCenter />
          <button
            onClick={handleFooterUpdateCheck}
            disabled={checkingUpdate()}
            class="p-1.5 rounded hover:bg-bg-hover transition-colors"
            title="Check for updates"
            style={{
              color: 'var(--text-primary)',
              opacity: checkingUpdate() ? 0.7 : 1,
              border: '1px solid var(--border-color)',
            }}
          >
            <Show
              when={!checkingUpdate()}
              fallback={
                <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Show>
          </button>
          <span class="flex items-center gap-1">
            <span class={`w-2 h-2 rounded-full ${props.connectionStatus()?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {props.connectionStatus()?.connected ? 'Connected' : 'Disconnected'}
          </span>
          <button
            class="hover:underline"
            style={{ color: 'var(--accent-primary)' }}
            onClick={() => setCurrentView('documentation')}
          >
            Docs
          </button>
          <button
            class="hover:underline"
            style={{ color: 'var(--accent-primary)' }}
            onClick={() => setCurrentView('privacy')}
          >
            Privacy
          </button>
        </div>
      </footer>

      {/* Update modal from footer check */}
      <Show when={updateModalOpen() && updateInfoState()}>
        <UpdateModal
          isOpen={updateModalOpen()}
          onClose={() => setUpdateModalOpen(false)}
          updateInfo={updateInfoState()!}
        />
      </Show>

      {/* Notifications */}
      <div class="fixed bottom-24 right-6 z-50 flex flex-col-reverse gap-3 max-w-sm">
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

      {/* Deployment Progress Overlay */}
      <DeploymentProgress />

      {/* Docked Terminal */}
      <DockedTerminal
        isOpen={terminalOpen()}
        onClose={() => setTerminalOpen(false)}
      />

      {/* Command Execution Panel */}
      <ExecutionPanel />
    </>
  );
};
