import { Component, createSignal, createResource, Show, For } from 'solid-js';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';

const Continuity: Component = () => {
  const [window, setWindow] = createSignal('7d');
  const [summary, { refetch }] = createResource(
    () => window(),
    async (w) => {
      try {
        return await api.getContinuitySummary(w);
      } catch (error: any) {
        addNotification({
          type: 'error',
          message: `Failed to load continuity summary: ${error.message}`,
        });
        throw error;
      }
    }
  );

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString();
    } catch {
      return timeStr;
    }
  };

  return (
    <div class="space-y-6 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Continuity Tracking
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Track incidents and issues since your last session
          </p>
        </div>
        <div class="flex items-center gap-3">
          <select
            value={window()}
            onChange={(e) => setWindow(e.currentTarget.value)}
            class="px-4 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="24h">Last 24 hours</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={() => refetch()}
            class="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: 'var(--accent-primary)',
              color: '#000',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <Show when={summary.loading}>
        <div class="flex items-center justify-center py-12">
          <div class="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      </Show>

      <Show when={summary.error}>
        <div class="card p-6 text-center">
          <p style={{ color: 'var(--error-color)' }}>
            Failed to load continuity summary. Please try again.
          </p>
        </div>
      </Show>

      <Show when={summary()}>
        {(data) => (
          <div class="space-y-6">
            {/* Summary Cards */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="card p-6">
                <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Total Incidents
                </div>
                <div class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {data().incidents_count}
                </div>
                <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Since {formatTime(data().last_seen_at)}
                </div>
              </div>

              <div class="card p-6">
                <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Major Incidents
                </div>
                <div class="text-3xl font-bold" style={{ color: 'var(--error-color)' }}>
                  {data().major_incidents_count}
                </div>
                <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Warning-level events
                </div>
              </div>

              <div class="card p-6">
                <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Deployments with Failures
                </div>
                <div class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {data().deployments_with_failures.length}
                </div>
                <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Deployments affected
                </div>
              </div>

              <div class="card p-6">
                <div class="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Node Issues
                </div>
                <div class="text-3xl font-bold" style={{ color: 'var(--warning-color)' }}>
                  {data().node_issues.length}
                </div>
                <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Nodes with problems
                </div>
              </div>
            </div>

            {/* Deployments with Failures */}
            <Show when={data().deployments_with_failures.length > 0}>
              <div class="card p-6">
                <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Deployments with Failures
                </h2>
                <div class="space-y-2">
                  <For each={data().deployments_with_failures}>
                    {(deployment) => (
                      <div
                        class="px-4 py-2 rounded-lg"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {deployment}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Node Issues */}
            <Show when={data().node_issues.length > 0}>
              <div class="card p-6">
                <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Node Issues
                </h2>
                <div class="space-y-2">
                  <For each={data().node_issues}>
                    {(node) => (
                      <div
                        class="px-4 py-2 rounded-lg"
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {node}
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Empty State */}
            <Show when={data().incidents_count === 0 && data().deployments_with_failures.length === 0 && data().node_issues.length === 0}>
              <div class="card p-12 text-center">
                <div class="text-4xl mb-4">✅</div>
                <h3 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  No Issues Detected
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Your cluster has been running smoothly since {formatTime(data().last_seen_at)}
                </p>
              </div>
            </Show>

            {/* Metadata */}
            <div class="card p-4">
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                <div>Window: {data().window}</div>
                <div>Last seen: {formatTime(data().last_seen_at)}</div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default Continuity;


