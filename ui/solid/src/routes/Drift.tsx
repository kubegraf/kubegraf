import { Component, For, Show, createResource, createSignal } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import Modal from '../components/Modal';

interface DriftResult {
  kind: string;
  name: string;
  namespace: string;
  hasDrift: boolean;
  driftDetails: Array<{
    field: string;
    expected: string;
    actual: string;
  }>;
  lastChecked: string;
}

const Drift: Component = () => {
  const [showDiffModal, setShowDiffModal] = createSignal(false);
  const [selectedDrift, setSelectedDrift] = createSignal<DriftResult | null>(null);

  const [driftData, { refetch }] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        const actualNs = ns === '_all' || !ns ? 'default' : ns;
        console.log('[Drift] Fetching drift summary for namespace:', actualNs);
        const data = await api.getDriftSummary(actualNs);
        console.log('[Drift] Received drift data:', data);
        // Ensure we have the correct structure
        if (data && typeof data === 'object') {
          const result = {
            total: data.total || 0,
            synced: data.synced || 0,
            drifted: data.drifted || 0,
            missing: data.missing || 0,
            unknown: data.unknown || 0,
            driftedResources: data.driftedResources || data.drifted || [],
          };
          console.log('[Drift] Processed drift result:', result);
          return result;
        }
        console.warn('[Drift] Invalid data structure received');
        return { total: 0, synced: 0, drifted: 0, missing: 0, unknown: 0, driftedResources: [] };
      } catch (error) {
        console.error('[Drift] Failed to fetch drift summary:', error);
        return { total: 0, synced: 0, drifted: 0, missing: 0, unknown: 0, driftedResources: [] };
      }
    }
  );

  const viewDiff = (drift: DriftResult) => {
    setSelectedDrift(drift);
    setShowDiffModal(true);
  };

  const handleRevert = async (drift: DriftResult) => {
    if (confirm(`Revert ${drift.kind}/${drift.name} to its expected state?`)) {
      try {
        await api.revertDrift(drift.kind, drift.name, drift.namespace);
        refetch();
      } catch (error) {
        console.error('Failed to revert drift:', error);
        alert('Failed to revert. Check console for details.');
      }
    }
  };

  const totalDrifted = () => driftData()?.drifted || 0;
  const totalChecked = () => driftData()?.total || 0;

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configuration Drift</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Detect and remediate configuration drift from desired state</p>
        </div>
        <button
          onClick={() => refetch()}
          class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Check Drift
        </button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Resources Checked</div>
          <div class="text-3xl font-bold mt-2" style={{ color: 'var(--accent-primary)' }}>
            {totalChecked()}
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>In Sync</div>
          <div class="text-3xl font-bold mt-2" style={{ color: 'var(--success-color)' }}>
            {totalChecked() - totalDrifted()}
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Drifted</div>
          <div class="text-3xl font-bold mt-2" style={{ color: totalDrifted() > 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
            {totalDrifted()}
          </div>
        </div>
        <div class="card p-6">
          <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Health</div>
          <div class="text-3xl font-bold mt-2" style={{
            color: totalDrifted() === 0 ? 'var(--success-color)' :
                   totalDrifted() < 5 ? 'var(--warning-color)' : 'var(--error-color)'
          }}>
            {totalChecked() > 0 ? Math.round(((totalChecked() - totalDrifted()) / totalChecked()) * 100) : 100}%
          </div>
        </div>
      </div>

      {/* Drift Status */}
      <Show when={driftData.loading}>
        <div class="card p-8">
          <div class="text-center">
            <div class="spinner mx-auto mb-4" />
            <p style={{ color: 'var(--text-muted)' }}>Checking for configuration drift...</p>
          </div>
        </div>
      </Show>

      <Show when={!driftData.loading && totalDrifted() === 0}>
        <div class="card p-8">
          <div class="text-center">
            <svg class="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--success-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No Configuration Drift Detected</h3>
            <p style={{ color: 'var(--text-secondary)' }}>All resources are in sync with their expected state</p>
          </div>
        </div>
      </Show>

      <Show when={!driftData.loading && totalDrifted() > 0}>
        <div class="card overflow-hidden">
          <div class="p-4 border-b" style={{ 'border-color': 'var(--border-color)' }}>
            <h3 class="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg class="w-5 h-5" style={{ color: 'var(--error-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Drifted Resources ({totalDrifted()})
            </h3>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Kind</th>
                <th>Namespace</th>
                <th>Changes</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={driftData()?.driftedResources || []}>
                {(drift: DriftResult) => (
                  <tr class="hover:bg-[var(--bg-tertiary)]">
                    <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{drift.name}</td>
                    <td>
                      <span class="badge badge-info">{drift.kind}</span>
                    </td>
                    <td>{drift.namespace}</td>
                    <td>
                      <span class="badge badge-warning">{drift.driftDetails?.length || 0} changes</span>
                    </td>
                    <td class="text-sm" style={{ color: 'var(--text-muted)' }}>{drift.lastChecked || 'Just now'}</td>
                    <td>
                      <div class="flex items-center gap-2">
                        <button
                          onClick={() => viewDiff(drift)}
                          class="action-btn"
                          title="View Diff"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRevert(drift)}
                          class="action-btn"
                          style={{ color: 'var(--success-color)' }}
                          title="Revert to Expected"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      {/* How Drift Detection Works */}
      <div class="card p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About Configuration Drift
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>What is Drift?</h4>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Configuration drift occurs when the actual state of a resource differs from its expected or desired state, often due to manual changes.
            </p>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Detection Method</h4>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We compare resource specifications against their last-applied-configuration annotation or GitOps source of truth.
            </p>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Remediation</h4>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Revert drifted resources to their expected state automatically, or use GitOps to sync from your repository.
            </p>
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      <Modal
        isOpen={showDiffModal()}
        onClose={() => setShowDiffModal(false)}
        title={`Drift Details: ${selectedDrift()?.kind}/${selectedDrift()?.name}`}
        size="lg"
      >
        <Show when={selectedDrift()}>
          <div class="space-y-4">
            <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Namespace</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedDrift()?.namespace}</div>
            </div>

            <h4 class="font-medium" style={{ color: 'var(--text-primary)' }}>Changes Detected</h4>

            <Show when={(selectedDrift()?.driftDetails || []).length > 0} fallback={
              <div class="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No detailed changes available
              </div>
            }>
              <div class="space-y-3">
                <For each={selectedDrift()?.driftDetails || []}>
                  {(change) => (
                    <div class="p-3 rounded-lg border" style={{ background: 'var(--bg-secondary)', 'border-color': 'var(--border-color)' }}>
                      <div class="font-mono text-sm mb-2" style={{ color: 'var(--accent-primary)' }}>{change.field}</div>
                      <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Expected</div>
                          <div class="p-2 rounded font-mono text-xs break-all" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)' }}>
                            {change.expected || '(not set)'}
                          </div>
                        </div>
                        <div>
                          <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Actual</div>
                          <div class="p-2 rounded font-mono text-xs break-all" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)' }}>
                            {change.actual || '(not set)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div class="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowDiffModal(false)}
                class="px-4 py-2 rounded-lg"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (selectedDrift()) handleRevert(selectedDrift()!);
                  setShowDiffModal(false);
                }}
                class="px-4 py-2 rounded-lg"
                style={{ background: 'var(--success-color)', color: 'white' }}
              >
                Revert to Expected
              </button>
            </div>
          </div>
        </Show>
      </Modal>
    </div>
  );
};

export default Drift;
