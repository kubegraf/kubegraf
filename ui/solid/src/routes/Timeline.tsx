import { Component, createSignal, createResource, Show, For, createMemo } from 'solid-js';
import { api } from '../services/api';

interface TimelineEvent {
  timestamp: string;
  type: string;
  severity: string;
  resourceKind: string;
  resourceName: string;
  namespace?: string;
  eventType?: string;
  message?: string;
  metadata?: Record<string, any>;
}

const Timeline: Component = () => {
  const [incidentId, setIncidentId] = createSignal<string>('');
  const [hours, setHours] = createSignal<number>(0.5); // Default to 30 minutes for faster loading
  const [selectedType, setSelectedType] = createSignal<string>('all');

  // Calculate time range
  const timeRange = createMemo(() => {
    const until = new Date();
    const since = new Date(until.getTime() - hours() * 60 * 60 * 1000);
    return {
      since: since.toISOString(),
      until: until.toISOString(),
    };
  });

  // Fetch history events
  const [historyData, { refetch }] = createResource(
    () => ({
      incidentId: incidentId() || undefined,
      since: timeRange().since,
      until: timeRange().until,
    }),
    async (params) => {
      try {
        return await api.getHistoryEvents(params.incidentId, params.since, params.until);
      } catch (error: any) {
        console.error('[Timeline] Failed to fetch history events:', error);
        throw error;
      }
    }
  );

  // Filter events by type
  const filteredEvents = createMemo(() => {
    const events = historyData()?.events || [];
    if (selectedType() === 'all') return events;
    return events.filter((e) => e.type === selectedType());
  });

  // Group events by type for summary
  const eventSummary = createMemo(() => {
    const events = historyData()?.events || [];
    const summary: Record<string, number> = {};
    events.forEach((e) => {
      summary[e.type] = (summary[e.type] || 0) + 1;
    });
    return summary;
  });

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'var(--error-color)';
      case 'warning':
        return 'var(--warning-color)';
      default:
        return 'var(--accent-primary)';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'k8s_event':
        return '📋';
      case 'pod_status_change':
        return '☸️';
      case 'deployment_rollout':
        return '🚀';
      case 'node_condition_change':
        return '🖥️';
      case 'metrics_spike':
        return '📈';
      default:
        return '⚡';
    }
  };

  return (
    <div class="space-y-4 p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Timeline Replay
          </h1>
          <p class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Chronological view of Kubernetes events, pod status changes, deployment rollouts, and node conditions
          </p>
        </div>
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

      {/* Filters */}
      <div class="card p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Time Range
            </label>
            <select
              value={hours()}
              onChange={(e) => setHours(Number(e.target.value))}
              class="w-full p-2 rounded border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <option value={0.5}>Last 30 minutes</option>
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Event Type
            </label>
            <select
              value={selectedType()}
              onChange={(e) => setSelectedType(e.target.value)}
              class="w-full p-2 rounded border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <option value="all">All Types</option>
              <option value="k8s_event">K8s Events</option>
              <option value="pod_status_change">Pod Status</option>
              <option value="deployment_rollout">Deployments</option>
              <option value="node_condition_change">Node Conditions</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Incident ID (optional)
            </label>
            <input
              type="text"
              value={incidentId()}
              onInput={(e) => setIncidentId(e.currentTarget.value)}
              placeholder="inc-..."
              class="w-full p-2 rounded border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <Show when={historyData() && Object.keys(eventSummary()).length > 0}>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div class="card p-3 text-center">
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total</div>
            <div class="text-xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
              {historyData()?.total || 0}
            </div>
          </div>
          <For each={Object.entries(eventSummary())}>
            {([type, count]) => (
              <div class="card p-3 text-center">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {type.replace(/_/g, ' ')}
                </div>
                <div class="text-xl font-bold mt-1" style={{ color: 'var(--accent-primary)' }}>
                  {count}
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Error Display */}
      <Show when={historyData.error}>
        <div class="card p-4 mb-4" style={{ border: '1px solid var(--error-color)', background: 'var(--bg-secondary)' }}>
          <div class="text-red-400 font-semibold mb-2">Error loading timeline events</div>
          <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {String(historyData.error)}
          </div>
          <button
            onClick={() => refetch()}
            class="mt-3 px-4 py-2 rounded text-sm"
            style={{
              background: 'var(--error-color)',
              color: '#fff',
            }}
          >
            Retry
          </button>
        </div>
      </Show>

      {/* Timeline Events */}
      <Show
        when={!historyData.loading}
        fallback={
          <div class="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <div>Loading timeline events...</div>
          </div>
        }
      >
        <Show
          when={filteredEvents().length > 0}
          fallback={
            <div class="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              No events found in the selected time range
            </div>
          }
        >
          <div class="card p-4">
            <div class="space-y-3">
              <For each={filteredEvents()}>
                {(event) => (
                  <div
                    class="p-4 rounded-lg border-l-4"
                    style={{
                      borderLeftColor: getSeverityColor(event.severity),
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-xl">{getTypeIcon(event.type)}</span>
                          <span
                            class="text-sm font-semibold px-2 py-1 rounded"
                            style={{
                              background: getSeverityColor(event.severity),
                              color: '#000',
                            }}
                          >
                            {event.severity}
                          </span>
                          <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {event.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                          <strong>{event.resourceKind}</strong> / {event.resourceName}
                          {event.namespace && (
                            <span class="ml-2 opacity-75">in {event.namespace}</span>
                          )}
                        </div>
                        {event.eventType && (
                          <div class="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            Event: {event.eventType}
                          </div>
                        )}
                        {event.message && (
                          <div class="text-sm mt-2" style={{ color: 'var(--text-primary)' }}>
                            {event.message}
                          </div>
                        )}
                      </div>
                      <div class="text-xs ml-4" style={{ color: 'var(--text-muted)' }}>
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default Timeline;
