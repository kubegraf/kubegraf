// Copyright 2025 KubeGraf Contributors

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { feastService, FeastStatus } from '../../services/feast';
import FeastInstallWizard from './FeastInstallWizard';

const FeastPanel: Component = () => {
  const [showWizard, setShowWizard] = createSignal(false);
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);

  const [status, { refetch }] = createResource(
    () => refetchTrigger(),
    async () => {
      return await feastService.getStatus();
    }
  );

  const handleInstallSuccess = () => {
    setRefetchTrigger(prev => prev + 1);
    setShowWizard(false);
  };

  return (
    <div class="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Feast Feature Store</h2>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Store, manage, and serve features for machine learning
          </p>
        </div>
        <Show when={!status()?.installed}>
          <button
            onClick={() => setShowWizard(true)}
            class="px-4 py-2 rounded-lg text-white transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#000' }}
          >
            Install Feast
          </button>
        </Show>
      </div>

      <Show when={showWizard()}>
        <FeastInstallWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleInstallSuccess}
        />
      </Show>

      <Show when={status.loading}>
        <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </Show>

      <Show when={!status.loading && status()}>
        <Show when={status()!.installed}>
          <div class="grid grid-cols-2 gap-4">
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</div>
              <div class="text-lg font-semibold text-green-500">Installed</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Version</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()!.version || 'Unknown'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Namespace</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()!.namespace || 'N/A'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Serving URL</div>
              <div class="text-lg font-mono text-sm break-all" style={{ color: 'var(--text-primary)' }}>
                {status()!.servingURL || 'N/A'}
              </div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Online Store</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()!.onlineStore || 'N/A'}</div>
            </div>
            <div class="card rounded-lg p-4 border" style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)'
            }}>
              <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Offline Store</div>
              <div class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{status()!.offlineStore || 'N/A'}</div>
            </div>
          </div>
        </Show>

        <Show when={!status()!.installed}>
          <div class="card p-8 text-center border" style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}>
            <p class="mb-4" style={{ color: 'var(--text-secondary)' }}>Feast is not installed</p>
            <button
              onClick={() => setShowWizard(true)}
              class="px-4 py-2 rounded-lg text-white transition-colors"
              style={{ background: 'var(--accent-primary)', color: '#000' }}
            >
              Install Feast
            </button>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default FeastPanel;

