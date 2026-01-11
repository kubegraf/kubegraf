import { Component, createSignal, Show } from 'solid-js';
import { setCurrentView } from '../stores/ui';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';

const Connect: Component = () => {
  const [kubeconfigContent, setKubeconfigContent] = createSignal('');
  const [sourceName, setSourceName] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [hasDefaultKubeconfig, setHasDefaultKubeconfig] = createSignal(false);

  // Check for default kubeconfig on mount
  const checkDefaultKubeconfig = async () => {
    try {
      const sources = await api.getClusterSources();
      const hasDefault = sources.some((s: any) => s.type === 'default');
      setHasDefaultKubeconfig(hasDefault);
    } catch (err) {
      console.error('Failed to check default kubeconfig:', err);
    }
  };

  checkDefaultKubeconfig();

  const handleUseDefault = async () => {
    setLoading(true);
    try {
      // Default source should already exist, just navigate to clusters
      setCurrentView('clustermanager');
      addNotification('Using default kubeconfig', 'success');
    } catch (err: any) {
      addNotification(err?.message || 'Failed to use default kubeconfig', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFile = async () => {
    try {
      const { api } = await import('../services/api');
      const result = await api.openFileDialog('Select kubeconfig file', '~/.kube');
      if (result.success && result.path) {
        const name = sourceName() || `File: ${result.path.split('/').pop()}`;
        await api.addClusterSourceFile({ name, path: result.path });
        addNotification('Kubeconfig file added successfully', 'success');
        setCurrentView('clustermanager');
      }
    } catch (err: any) {
      addNotification(err?.message || 'Failed to add kubeconfig file', 'error');
    }
  };

  const handlePasteKubeconfig = async () => {
    if (!kubeconfigContent().trim()) {
      addNotification('Please paste kubeconfig content', 'warning');
      return;
    }

    setLoading(true);
    try {
      const name = sourceName() || 'Pasted kubeconfig';
      await api.addClusterSourceInline({ name, content: kubeconfigContent() });
      addNotification('Kubeconfig added successfully', 'success');
      setKubeconfigContent('');
      setSourceName('');
      setCurrentView('clustermanager');
    } catch (err: any) {
      addNotification(err?.message || 'Failed to add kubeconfig', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex items-center justify-center min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <div class="max-w-2xl w-full">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Connect to Kubernetes Cluster
          </h1>
          <p class="text-base" style={{ color: 'var(--text-secondary)' }}>
            Add a kubeconfig source to get started with KubeGraf
          </p>
        </div>

        <div class="space-y-4">
          {/* Use Default Kubeconfig */}
          <Show when={hasDefaultKubeconfig()}>
            <div
              class="p-6 rounded-xl border cursor-pointer hover:border-cyan-500/50 transition-all"
              style={{ border: '2px solid var(--border-color)', background: 'var(--bg-card)' }}
              onClick={handleUseDefault}
            >
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Use Default Kubeconfig
                  </h3>
                  <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Use your default kubeconfig at ~/.kube/config
                  </p>
                </div>
                <button
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: 'var(--accent-primary)', color: '#000' }}
                  disabled={loading()}
                >
                  Use Default
                </button>
              </div>
            </div>
          </Show>

          {/* Add Kubeconfig File */}
          <div
            class="p-6 rounded-xl border"
            style={{ border: '2px solid var(--border-color)', background: 'var(--bg-card)' }}
          >
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Add Kubeconfig File
                </h3>
                <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Select a kubeconfig file from your system
                </p>
              </div>
            </div>
            <div class="space-y-3">
              <input
                type="text"
                placeholder="Source name (optional)"
                value={sourceName()}
                onInput={(e) => setSourceName(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
                onClick={handleAddFile}
                disabled={loading()}
              >
                Browse and Add File
              </button>
            </div>
          </div>

          {/* Paste Kubeconfig */}
          <div
            class="p-6 rounded-xl border"
            style={{ border: '2px solid var(--border-color)', background: 'var(--bg-card)' }}
          >
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent-primary)' }}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Paste Kubeconfig
                </h3>
                <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Paste your kubeconfig YAML content
                </p>
              </div>
            </div>
            <div class="space-y-3">
              <input
                type="text"
                placeholder="Source name (optional)"
                value={sourceName()}
                onInput={(e) => setSourceName(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <textarea
                placeholder="Paste kubeconfig YAML here..."
                value={kubeconfigContent()}
                onInput={(e) => setKubeconfigContent(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-md text-sm font-mono"
                rows="10"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                class="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--accent-primary)', color: '#000' }}
                onClick={handlePasteKubeconfig}
                disabled={loading() || !kubeconfigContent().trim()}
              >
                Add Kubeconfig
              </button>
            </div>
          </div>

          {/* Skip to Cluster Manager */}
          <div class="text-center pt-4">
            <button
              class="text-sm underline"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setCurrentView('clustermanager')}
            >
              Skip to Cluster Manager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connect;
