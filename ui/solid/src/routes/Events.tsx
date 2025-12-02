import { Component, For, Show, createSignal, createMemo, onMount, onCleanup, createResource, createEffect } from 'solid-js';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { namespace } from '../stores/cluster';

interface KubeEvent {
  time: string;
  type: string;
  reason: string;
  object: string;
  kind: string;
  message: string;
  namespace: string;
  count: number;
  source: string;
}

type FilterType = 'all' | 'Normal' | 'Warning';

const Events: Component = () => {
  const [events, setEvents] = createSignal<KubeEvent[]>([]);
  const [filter, setFilter] = createSignal<FilterType>('all');
  const [search, setSearch] = createSignal('');
  const [paused, setPaused] = createSignal(false);
  const [liveEvents, setLiveEvents] = createSignal<KubeEvent[]>([]);

  // Signal to trigger refetch
  const [fetchTrigger, setFetchTrigger] = createSignal(0);

  // Fetch initial events - use a combined dependency to ensure we always fetch
  const [initialEvents, { refetch }] = createResource(
    () => ({ ns: namespace(), trigger: fetchTrigger() }),
    async ({ ns }) => {
      try {
        console.log('[Events] Fetching events for namespace:', ns);
        // Pass undefined for "All Namespaces" or empty string
        const nsParam = (ns === '_all' || ns === 'All Namespaces' || !ns) ? undefined : ns;
        const response = await api.getEvents(nsParam, 200);
        console.log('[Events] Received events:', response?.events?.length || 0, 'total:', response?.total || 0);
        return response?.events || [];
      } catch (err) {
        console.error('[Events] Failed to fetch events:', err);
        return [];
      }
    }
  );

  // Initialize events when initial data loads
  createEffect(() => {
    const initial = initialEvents();
    const loading = initialEvents.loading;
    const error = initialEvents.error;
    
    console.log('[Events] createEffect triggered:', {
      hasInitial: !!initial,
      initialLength: initial?.length || 0,
      loading,
      error: error ? String(error) : null
    });
    
    if (initial && Array.isArray(initial)) {
      if (initial.length > 0) {
        console.log('[Events] Setting events:', initial.length);
        setEvents(initial);
      } else {
        console.log('[Events] Initial events array is empty');
      }
    } else if (!loading && error) {
      console.error('[Events] Error loading events:', error);
    } else if (!loading && !initial) {
      console.log('[Events] No initial events data');
    }
  });

  // Trigger initial fetch on mount
  onMount(() => {
    // Force a refetch to ensure events load
    setFetchTrigger(prev => prev + 1);
  });

  // Subscribe to real-time events via WebSocket
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'event' && !paused()) {
        const newEvent = msg.data as KubeEvent;
        // Filter by namespace if selected
        const ns = namespace();
        if (ns && ns !== 'All Namespaces' && newEvent.namespace !== ns) {
          return;
        }
        setLiveEvents(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return [newEvent, ...current].slice(0, 50);
        });
        setEvents(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return [newEvent, ...current].slice(0, 500);
        });
      }
    });

    return () => unsubscribe();
  });

  const filteredEvents = createMemo(() => {
    let all = events();
    // Ensure all is always an array
    if (!Array.isArray(all)) {
      console.warn('[Events] events() is not an array:', typeof all, all);
      all = [];
    }
    const filterType = filter();
    const query = search().toLowerCase();

    console.log('[Events] filteredEvents memo:', {
      totalEvents: all.length,
      filterType,
      query,
      hasQuery: !!query
    });

    if (filterType !== 'all') {
      all = all.filter(e => e.type === filterType);
    }

    if (query) {
      all = all.filter(e =>
        e.message?.toLowerCase().includes(query) ||
        e.object?.toLowerCase().includes(query) ||
        e.reason?.toLowerCase().includes(query) ||
        e.namespace?.toLowerCase().includes(query)
      );
    }

    console.log('[Events] Filtered result:', all.length);
    return all;
  });

  const eventCounts = createMemo(() => {
    const all = events();
    return {
      total: all.length,
      normal: all.filter(e => e.type === 'Normal').length,
      warning: all.filter(e => e.type === 'Warning').length,
    };
  });

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Unknown';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Unknown';
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getKindIcon = (kind: string) => {
    switch (kind?.toLowerCase()) {
      case 'pod': return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4';
      case 'deployment': return 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10';
      case 'service': return 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9';
      case 'node': return 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01';
      case 'replicaset': return 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4';
      default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Events</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time cluster events stream</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={() => setPaused(!paused())}
            class={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              paused()
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40'
                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40'
            }`}
            style={{ color: paused() ? 'var(--success-color)' : 'var(--warning-color)' }}
          >
            <Show when={paused()} fallback={
              <>
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </>
            }>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Resume
            </Show>
          </button>
          <button
            onClick={() => refetch()}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Events"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Live indicator and stats */}
      <div class="flex flex-wrap items-center gap-3">
        <div class={`card px-4 py-2 flex items-center gap-2 ${!paused() ? 'animate-pulse' : ''}`}
             style={{ 'border-left': `3px solid ${paused() ? 'var(--warning-color)' : 'var(--success-color)'}` }}>
          <span class={`w-3 h-3 rounded-full ${paused() ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">
            {paused() ? 'Paused' : 'Live'}
          </span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{liveEvents().length}</span>
          <span style={{ color: 'var(--text-muted)' }} class="text-xs">new</span>
        </div>

        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"
             style={{ 'border-left': '3px solid var(--accent-primary)' }}
             onClick={() => setFilter('all')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{eventCounts().total}</span>
        </div>

        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"
             style={{ 'border-left': '3px solid var(--success-color)' }}
             onClick={() => setFilter('Normal')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Normal</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{eventCounts().normal}</span>
        </div>

        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2"
             style={{ 'border-left': '3px solid var(--warning-color)' }}
             onClick={() => setFilter('Warning')}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Warning</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{eventCounts().warning}</span>
        </div>

        <div class="flex-1" />

        <input
          type="text"
          placeholder="Search events..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg text-sm w-64"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />

        <select
          value={filter()}
          onChange={(e) => setFilter(e.currentTarget.value as FilterType)}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="all">All Types</option>
          <option value="Normal">Normal</option>
          <option value="Warning">Warning</option>
        </select>
      </div>

      {/* Events stream */}
      <div class="card overflow-hidden">
        <Show
          when={!initialEvents.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading events...</span>
            </div>
          }
        >
          <div class="overflow-y-auto" style={{ 'max-height': 'calc(100vh - 320px)' }}>
            <For each={filteredEvents()} fallback={
              <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                No events found
              </div>
            }>
              {(event, index) => (
                <div
                  class={`p-4 border-b transition-all hover:bg-white/5 ${index() < liveEvents().length && !paused() ? 'animate-slide-in' : ''}`}
                  style={{
                    'border-color': 'var(--border-color)',
                    'border-left': `4px solid ${event.type === 'Warning' ? 'var(--warning-color)' : 'var(--success-color)'}`,
                  }}
                >
                  <div class="flex items-start gap-4">
                    {/* Kind icon */}
                    <div class="flex-shrink-0 p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                           style={{ color: event.type === 'Warning' ? 'var(--warning-color)' : 'var(--accent-primary)' }}>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getKindIcon(event.kind)} />
                      </svg>
                    </div>

                    {/* Event content */}
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class={`px-2 py-0.5 rounded text-xs font-medium ${
                          event.type === 'Warning'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {event.type}
                        </span>
                        <span class="px-2 py-0.5 rounded text-xs"
                              style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
                          {event.reason}
                        </span>
                        <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {event.kind}/{event.object}
                        </span>
                        <Show when={event.namespace}>
                          <span class="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            {event.namespace}
                          </span>
                        </Show>
                      </div>
                      <p class="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {event.message}
                      </p>
                      <div class="mt-2 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{formatTime(event.time)}</span>
                        <Show when={event.count > 1}>
                          <span class="px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                            x{event.count}
                          </span>
                        </Show>
                        <Show when={event.source}>
                          <span>Source: {event.source}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Events;
