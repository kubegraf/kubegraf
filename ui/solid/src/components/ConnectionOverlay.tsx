import { Component, Show } from 'solid-js';
import { currentView, setCurrentView } from '../stores/ui';

interface ConnectionOverlayProps {
  connectionStatus: () => any;
  refetchStatus: () => void;
}

/**
 * Connection overlay component
 * Shows when cluster is not connected with options to connect or create cluster
 */
export const ConnectionOverlay: Component<ConnectionOverlayProps> = (props) => {
  return (
    <div class="absolute inset-0 z-10 flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)', 'pointer-events': 'auto' }}>
      <div class="max-w-3xl w-full">
        <div class="text-center mb-8">
          <div class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            No Cluster Connected
          </h2>
          <p class="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            Connect to an existing Kubernetes cluster or create a local one to get started
          </p>
        </div>

        {/* Two options: Connect or Create */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Option 1: Connect via kubeconfig */}
          <div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer" style={{ border: '2px solid var(--border-color)' }}
            onClick={() => {
              // Show instructions for connecting via kubeconfig
              alert('To connect to an existing cluster:\n\n1. Ensure your kubeconfig is set up (~/.kube/config)\n2. Verify access: kubectl cluster-info\n3. Click "Retry Connection" or refresh the page\n\nKubeGraf will automatically detect and connect to your cluster.');
            }}
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Connect via kubeconfig
              </h3>
            </div>
            <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Connect to an existing Kubernetes cluster using your kubeconfig file
            </p>
            <ul class="text-xs space-y-2 mb-4" style={{ color: 'var(--text-muted)' }}>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Ensure kubeconfig is at <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>~/.kube/config</code></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Verify with: <code class="px-1 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>kubectl cluster-info</code></span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Click "Retry Connection" below</span>
              </li>
            </ul>
            <button
              onClick={(e) => {
                e.stopPropagation();
                props.refetchStatus();
              }}
              class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Connection
            </button>
          </div>

          {/* Option 2: Create local cluster */}
          <div class="card p-6 hover:border-cyan-500/50 transition-all cursor-pointer" style={{ border: '2px solid var(--border-color)' }}
            onClick={() => {
              setCurrentView('apps');
              // Store flag to auto-filter to Local Cluster
              sessionStorage.setItem('kubegraf-auto-filter', 'Local Cluster');
            }}
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#22c55e' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Create Local Cluster
              </h3>
            </div>
            <p class="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Set up a local Kubernetes cluster using k3d, kind, or minikube
            </p>
            <ul class="text-xs space-y-2 mb-4" style={{ color: 'var(--text-muted)' }}>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Requires Docker Desktop installed and running</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Choose from k3d, kind, or minikube</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-1">•</span>
                <span>Automatically connects after creation</span>
              </li>
            </ul>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Set filter and tab preference
                sessionStorage.setItem('kubegraf-auto-filter', 'Local Cluster');
                sessionStorage.setItem('kubegraf-default-tab', 'marketplace');
                setCurrentView('apps');
              }}
              class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: '#22c55e', color: '#000' }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Go to Marketplace
            </button>
          </div>
        </div>
        
        <Show when={props.connectionStatus()?.error}>
          <div class="card p-4 mb-6 text-left max-w-lg mx-auto">
            <div class="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--error-color)' }}>
              Error
            </div>
            <div class="text-xs font-mono break-all mb-2" style={{ color: 'var(--text-secondary)' }}>
              {props.connectionStatus()?.error}
            </div>
            <div class="text-sm font-medium mt-3" style={{ color: 'var(--text-primary)' }}>
              <div class="mb-2">Check your kubeconfig at:</div>
              <code class="block px-3 py-2 rounded mb-3 text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                ~/.kube/config
              </code>
              <div class="mb-2">Or run this command to verify access:</div>
              <code class="block px-3 py-2 rounded text-xs font-mono" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                kubectl cluster-info
              </code>
            </div>
          </div>
        </Show>

        <div class="flex items-center justify-center gap-3">
          <button
            onClick={() => location.reload()}
            class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: 'var(--error-color)', color: 'white' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
          <a
            href="https://kubegraf.io/docs"
            target="_blank"
            class="px-5 py-2.5 rounded-lg font-medium transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
};
