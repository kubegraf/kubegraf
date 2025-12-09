import { Component, For, Show, createSignal, createMemo, onMount, onCleanup, createResource, createEffect } from 'solid-js';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { currentContext, refreshTrigger } from '../stores/cluster';
import { getEventFilter, clearEventFilter, matchesEventFilter } from '../utils/event-filtering';
import { deduplicateEvents, escalateSeverity } from '../utils/event-deduplication';
import RealtimeEventsPanel from '../components/RealtimeEventsPanel';
import EventSeverityBadge from '../components/EventSeverityBadge';

interface MonitoredEvent {
  id: string;
  timestamp: string;
  type: 'infrastructure' | 'application' | 'security';
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  namespace: string;
  resource: string;
  details: Record<string, any>;
  count: number;
  group_id: string;
  source: string;
}

interface LogError {
  timestamp: string;
  pod: string;
  namespace: string;
  container: string;
  status_code: number;
  method: string;
  path: string;
  message: string;
  error_type: string;
}

type ViewMode = 'timeline' | 'grouped' | 'errors';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'info';

const MonitoredEvents: Component = () => {
  const [viewMode, setViewMode] = createSignal<ViewMode>('timeline');
  const [severityFilter, setSeverityFilter] = createSignal<SeverityFilter>('all');
  const [typeFilter, setTypeFilter] = createSignal<string>('all');
  const [groupPeriod, setGroupPeriod] = createSignal<string>('1h');
  const [events, setEvents] = createSignal<MonitoredEvent[]>([]);
  const [logErrors, setLogErrors] = createSignal<LogError[]>([]);
  const [stats, setStats] = createSignal<any>(null);
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [selectedNamespaces, setSelectedNamespaces] = createSignal<string[]>([]); // Multi-select namespaces
  const [namespaceDropdownOpen, setNamespaceDropdownOpen] = createSignal(false);
  const [namespaceSearch, setNamespaceSearch] = createSignal('');

  // Fetch namespaces list
  const [namespacesData] = createResource(async () => {
    try {
      return await api.getNamespaces();
    } catch (err) {
      console.error('[MonitoredEvents] Failed to fetch namespaces:', err);
      return [];
    }
  });

  // Filtered namespaces based on search
  const filteredNamespaces = createMemo(() => {
    const namespaces = namespacesData() || [];
    const search = namespaceSearch().toLowerCase();
    if (!search) return namespaces;
    return namespaces.filter(ns => ns.toLowerCase().includes(search));
  });

  // Toggle namespace selection
  const toggleNamespace = (ns: string) => {
    const current = selectedNamespaces();
    if (current.includes(ns)) {
      setSelectedNamespaces(current.filter(n => n !== ns));
    } else {
      setSelectedNamespaces([...current, ns]);
    }
  };

  // Select all namespaces
  const selectAllNamespaces = () => {
    const all = namespacesData() || [];
    setSelectedNamespaces([...all]);
  };

  // Clear all namespace selections
  const clearNamespaces = () => {
    setSelectedNamespaces([]);
  };

  // Fetch monitored events - refresh when cluster changes
  const [eventsData, { refetch: refetchEvents }] = createResource(
    () => ({ 
      namespaces: selectedNamespaces(), 
      severity: severityFilter(), 
      type: typeFilter(),
      context: currentContext(),
      refresh: refreshTrigger()
    }),
    async ({ namespaces, severity, type }) => {
      try {
        const filters: any = {
          limit: 500,
        };
        // If namespaces are selected, filter by them (API supports single namespace, so we'll filter client-side for multiple)
        // For now, if multiple selected, we'll fetch all and filter client-side
        // Or we can make multiple API calls and merge
        if (namespaces.length === 1) {
          filters.namespace = namespaces[0];
        }
        if (severity !== 'all') {
          filters.severity = severity;
        }
        if (type !== 'all') {
          filters.type = type;
        }
        const response = await api.getMonitoredEvents(filters);
        let events = response?.events || [];
        
        // Filter by selected namespaces if multiple selected
        if (namespaces.length > 1) {
          events = events.filter(e => namespaces.includes(e.namespace || ''));
        } else if (namespaces.length === 0) {
          // If no namespaces selected, show all
          // events = events; // no filter
        }
        
        return events;
      } catch (err) {
        console.error('[MonitoredEvents] Failed to fetch events:', err);
        return [];
      }
    }
  );

  // Fetch log errors - refresh when cluster changes
  const [errorsData, { refetch: refetchErrors }] = createResource(
    () => ({ 
      namespaces: selectedNamespaces(),
      context: currentContext(),
      refresh: refreshTrigger()
    }),
    async ({ namespaces }) => {
      try {
        const filters: any = { limit: 200, critical_only: false }; // Show all errors, not just critical
        // If single namespace selected, use API filter
        if (namespaces.length === 1) {
          filters.namespace = namespaces[0];
        }
        const response = await api.getLogErrors(filters);
        let errors = response?.errors || [];
        
        // Filter by selected namespaces if multiple selected
        if (namespaces.length > 1) {
          errors = errors.filter(e => namespaces.includes(e.namespace || ''));
        }
        
        return errors;
      } catch (err) {
        console.error('[MonitoredEvents] Failed to fetch log errors:', err);
        return [];
      }
    }
  );

  // Fetch event stats
  const [statsData, { refetch: refetchStats }] = createResource(
    async () => {
      try {
        return await api.getEventStats();
      } catch (err) {
        console.error('[MonitoredEvents] Failed to fetch stats:', err);
        return null;
      }
    }
  );

  // Fetch grouped events
  const [groupedData, { refetch: refetchGrouped }] = createResource(
    () => groupPeriod(),
    async (period) => {
      try {
        const response = await api.getGroupedEvents(period);
        return response?.groups || [];
      } catch (err) {
        console.error('[MonitoredEvents] Failed to fetch grouped events:', err);
        return [];
      }
    }
  );

  // Update signals when data loads
  createMemo(() => {
    const data = eventsData();
    if (data && Array.isArray(data)) {
      setEvents(data);
    } else if (!eventsData.loading && !eventsData.error) {
      setEvents([]);
    }
  });

  createMemo(() => {
    const data = errorsData();
    console.log('[MonitoredEvents] errorsData:', { 
      data: data, 
      loading: errorsData.loading, 
      error: errorsData.error,
      isArray: Array.isArray(data),
      length: data?.length 
    });
    if (data && Array.isArray(data)) {
      console.log('[MonitoredEvents] Setting logErrors:', data.length);
      setLogErrors(data);
    } else if (!errorsData.loading && !errorsData.error) {
      console.log('[MonitoredEvents] No data, setting empty array');
      setLogErrors([]);
    }
  });

  createMemo(() => {
    const data = statsData();
    if (data) {
      setStats(data);
    }
  });

  // Filtered log errors (only those with status_code > 0)
  const filteredLogErrors = createMemo(() => {
    const errors = logErrors() || [];
    const filtered = errors.filter(e => e.status_code > 0);
    console.log('[MonitoredEvents] Filtered log errors:', { total: errors.length, filtered: filtered.length });
    return filtered;
  });

  // Auto-refresh
  let refreshInterval: number | null = null;
  onMount(() => {
    if (autoRefresh()) {
      refreshInterval = window.setInterval(() => {
        refetchEvents();
        refetchErrors();
        refetchStats();
        if (viewMode() === 'grouped') {
          refetchGrouped();
        }
      }, 30000); // Refresh every 30 seconds
    }
  });

  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  // Apply event filter from incidents navigation
  createEffect(() => {
    const filter = getEventFilter();
    if (filter) {
      // Set namespace filter
      if (filter.namespace) {
        setSelectedNamespaces([filter.namespace]);
      }
      // The filteredEvents memo will automatically filter by resource
      // Clear the filter after applying
      setTimeout(() => clearEventFilter(), 1000);
    }
  });

  // Subscribe to WebSocket for real-time updates
  onMount(() => {
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.type === 'monitored_event' && autoRefresh()) {
        const newEvent = msg.data as MonitoredEvent;
        // Only add if namespace matches selected namespaces (or none selected)
        const selected = selectedNamespaces();
        if (selected.length === 0 || selected.includes(newEvent.namespace || '')) {
          setEvents(prev => {
            const current = Array.isArray(prev) ? prev : [];
            return [newEvent, ...current].slice(0, 500);
          });
          refetchStats(); // Update stats
        }
      }
    });
    
    // Close namespace dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.namespace-dropdown-container')) {
        setNamespaceDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      unsubscribe();
      document.removeEventListener('click', handleClickOutside);
    };
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      case 'info': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const color = getSeverityColor(severity);
    return (
      <span
        class="px-2 py-1 rounded text-xs font-medium"
        style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
      >
        {severity.toUpperCase()}
      </span>
    );
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Unknown';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
  };

  const formatRelativeTime = (timeStr: string) => {
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

  const filteredEvents = createMemo(() => {
    let evts = events();
    if (!Array.isArray(evts)) {
      evts = [];
    }
    
    // Apply severity escalation (production-grade)
    evts = evts.map(e => ({
      ...e,
      severity: escalateSeverity(e),
    }));
    
    // Apply severity filter
    const severity = severityFilter();
    if (severity !== 'all') {
      evts = evts.filter(e => e.severity === severity);
    }
    
    // Apply type filter
    const type = typeFilter();
    if (type !== 'all') {
      evts = evts.filter(e => e.type === type);
    }
    
    // Apply namespace filter if namespaces are selected
    const namespaces = selectedNamespaces();
    if (namespaces.length > 0) {
      evts = evts.filter(e => namespaces.includes(e.namespace || ''));
    }
    
    // Apply event filter from incidents navigation
    const eventFilter = getEventFilter();
    if (eventFilter) {
      evts = evts.filter(e => 
        matchesEventFilter(e.resource, e.namespace || '', e.type)
      );
    }
    
    // Deduplicate events (production-grade: group similar events)
    const deduplicated = deduplicateEvents(evts, 5); // 5 minute window
    
    return deduplicated;
  });

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Event Monitor</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Production environment events and alerts</p>
          <div class="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>📊 Historical analysis & pattern detection | </span>
            <span>⚡ Real-time stream shows events as they happen</span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          {/* Namespace Selector */}
          <div class="relative namespace-dropdown-container">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNamespaceDropdownOpen(!namespaceDropdownOpen());
              }}
              class="px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2"
              style={{ 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)'
              }}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>
                {selectedNamespaces().length === 0 
                  ? 'All Namespaces' 
                  : selectedNamespaces().length === 1 
                    ? selectedNamespaces()[0]
                    : `${selectedNamespaces().length} namespaces`}
              </span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <Show when={namespaceDropdownOpen()}>
              <div 
                class="absolute right-0 mt-2 w-64 rounded-lg border shadow-lg z-50 max-h-96 overflow-hidden flex flex-col"
                style={{ 
                  background: 'var(--bg-secondary)', 
                  borderColor: 'var(--border-color)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search */}
                <div class="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <input
                    type="text"
                    placeholder="Search namespaces..."
                    value={namespaceSearch()}
                    onInput={(e) => setNamespaceSearch(e.currentTarget.value)}
                    class="w-full px-3 py-2 rounded border text-sm"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  />
                </div>
                
                {/* Actions */}
                <div class="p-2 border-b flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
                  <button
                    onClick={selectAllNamespaces}
                    class="px-3 py-1 text-xs rounded border"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearNamespaces}
                    class="px-3 py-1 text-xs rounded border"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-color)'
                    }}
                  >
                    Clear
                  </button>
                </div>
                
                {/* Namespace List */}
                <div class="overflow-y-auto flex-1">
                  <Show when={filteredNamespaces().length === 0}>
                    <div class="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      No namespaces found
                    </div>
                  </Show>
                  <For each={filteredNamespaces()}>
                    {(ns) => (
                      <label class="flex items-center gap-2 p-2 hover:bg-opacity-50 cursor-pointer"
                        style={{ 
                          background: selectedNamespaces().includes(ns) ? 'var(--accent-color)' : 'transparent',
                          '--tw-bg-opacity': selectedNamespaces().includes(ns) ? '0.1' : '0'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNamespaces().includes(ns)}
                          onChange={() => toggleNamespace(ns)}
                          class="w-4 h-4 rounded"
                          style={{ accentColor: 'var(--accent-color)' }}
                        />
                        <span class="text-sm" style={{ color: 'var(--text-primary)' }}>{ns}</span>
                      </label>
                    )}
                  </For>
                </div>
                
                {/* Selected count */}
                <Show when={selectedNamespaces().length > 0}>
                  <div class="p-2 border-t text-xs text-center" style={{ 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-muted)'
                  }}>
                    {selectedNamespaces().length} selected
                  </div>
                </Show>
              </div>
            </Show>
          </div>
          
          <button
            onClick={() => {
              refetchEvents();
              refetchErrors();
              refetchStats();
              if (viewMode() === 'grouped') refetchGrouped();
            }}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            Refresh
          </button>
          <label class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer" style={{ background: 'var(--bg-secondary)' }}>
            <input
              type="checkbox"
              checked={autoRefresh()}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              class="w-4 h-4"
            />
            <span style={{ color: 'var(--text-secondary)' }}>Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Selected Namespaces Display */}
      <Show when={selectedNamespaces().length > 0}>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm" style={{ color: 'var(--text-muted)' }}>Filtering by:</span>
          <For each={selectedNamespaces()}>
            {(ns) => (
              <span class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
                style={{ 
                  background: 'var(--accent-color)',
                  color: 'var(--text-primary)',
                  opacity: 0.8
                }}
              >
                {ns}
                <button
                  onClick={() => toggleNamespace(ns)}
                  class="hover:opacity-70"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </For>
          <button
            onClick={clearNamespaces}
            class="text-xs underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Clear all
          </button>
        </div>
      </Show>

      {/* Stats Cards */}
      <Show when={stats()}>
        {(statsData: () => any) => {
          const stats = statsData();
          const bySeverity = stats?.by_severity || {};
          return (
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Events</div>
                <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.total_events || 0}</div>
              </div>
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical</div>
                <div class="text-2xl font-bold" style={{ color: '#ef4444' }}>{bySeverity['critical'] || 0}</div>
              </div>
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>High</div>
                <div class="text-2xl font-bold" style={{ color: '#f59e0b' }}>{bySeverity['high'] || 0}</div>
              </div>
              <div class="card p-4">
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Log Errors</div>
                <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.total_errors || 0}</div>
              </div>
            </div>
          );
        }}
      </Show>

      {/* Filters and View Mode */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode() === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode() === 'grouped' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Grouped
          </button>
          <button
            onClick={() => setViewMode('errors')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode() === 'errors' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Log Errors
          </button>
        </div>
        <div class="flex items-center gap-2">
          <select
            value={severityFilter()}
            onChange={(e) => setSeverityFilter(e.currentTarget.value as SeverityFilter)}
            class="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <select
            value={typeFilter()}
            onChange={(e) => setTypeFilter(e.currentTarget.value)}
            class="px-3 py-2 rounded-lg text-sm border"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Types</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="application">Application</option>
            <option value="security">Security</option>
          </select>
          <Show when={viewMode() === 'grouped'}>
            <select
              value={groupPeriod()}
              onChange={(e) => setGroupPeriod(e.currentTarget.value)}
              class="px-3 py-2 rounded-lg text-sm border"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="6h">6 hours</option>
              <option value="24h">24 hours</option>
            </select>
          </Show>
        </div>
      </div>

      {/* Main Content with Real-time Events Panel */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Events Content */}
        <div class="lg:col-span-2">
          {/* Timeline View */}
          <Show when={viewMode() === 'timeline'}>
            <Show when={eventsData.loading}>
              <div class="card p-8 text-center">
                <div class="spinner mx-auto mb-2" />
                <span style={{ color: 'var(--text-muted)' }}>Loading events...</span>
              </div>
            </Show>
            <Show when={!eventsData.loading}>
              <div class="space-y-4">
                <For each={filteredEvents()}>
                {(event) => (
                  <div class="card p-4 border-l-4" style={{ 'border-left-color': getSeverityColor(event.severity) }}>
                    <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <EventSeverityBadge severity={event.severity} count={(event as any).duplicateCount || event.count} showCount={true} />
                      <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                      <Show when={(event as any).duplicateCount && (event as any).duplicateCount > 1}>
                        <span class="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          {((event as any).duplicateCount || event.count)} similar events grouped
                        </span>
                      </Show>
                    </div>
                    <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
                    <div class="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{event.resource}</span>
                      <span>{event.namespace || 'cluster-wide'}</span>
                      <Show when={(event as any).firstSeen && (event as any).lastSeen && (event as any).firstSeen !== (event as any).lastSeen}>
                        <span title={`First: ${formatTime((event as any).firstSeen)}, Last: ${formatTime((event as any).lastSeen)}`}>
                          {formatRelativeTime((event as any).lastSeen || event.timestamp)}
                        </span>
                      </Show>
                      <Show when={!(event as any).firstSeen || (event as any).firstSeen === (event as any).lastSeen}>
                        <span>{formatRelativeTime(event.timestamp)}</span>
                      </Show>
                      <span>{event.source}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {(event as any).duplicateCount || event.count}x
                    </div>
                    <div class="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTime(event.timestamp)}</div>
                  </div>
                    </div>
                  </div>
                )}
                </For>
                <Show when={filteredEvents().length === 0}>
                  <div class="card p-8 text-center">
                    <p style={{ color: 'var(--text-muted)' }}>No events found</p>
                  </div>
                </Show>
              </div>
            </Show>
          </Show>

          {/* Grouped View */}
          <Show when={viewMode() === 'grouped'}>
            <Show when={groupedData.loading}>
              <div class="card p-8 text-center">
                <div class="spinner mx-auto mb-2" />
                <span style={{ color: 'var(--text-muted)' }}>Loading grouped events...</span>
              </div>
            </Show>
            <Show when={!groupedData.loading}>
              <div class="space-y-6">
                <For each={groupedData() || []}>
                {(group) => (
                  <div class="card p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {new Date(group.time).toLocaleString()}
                      </h3>
                      <span class="px-3 py-1 rounded-full text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {group.count} events
                      </span>
                    </div>
                    <div class="space-y-2">
                      <For each={group.events}>
                        {(event) => (
                          <div class="p-3 rounded border-l-4" style={{ 'border-left-color': getSeverityColor(event.severity), background: 'var(--bg-secondary)' }}>
                            <div class="flex items-center gap-2 mb-1">
                              {getSeverityBadge(event.severity)}
                              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{event.title}</span>
                            </div>
                            <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>{event.resource}</p>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
                </For>
                <Show when={!groupedData() || groupedData()?.length === 0}>
                  <div class="card p-8 text-center">
                    <p style={{ color: 'var(--text-muted)' }}>No grouped events found</p>
                  </div>
                </Show>
              </div>
            </Show>
          </Show>

          {/* Log Errors View */}
          <Show when={viewMode() === 'errors'}>
            <Show when={errorsData.loading}>
              <div class="card p-8 text-center">
                <div class="spinner mx-auto mb-2" />
                <span style={{ color: 'var(--text-muted)' }}>Loading log errors...</span>
              </div>
            </Show>
            <Show when={!errorsData.loading}>
              <div class="space-y-4">
                <For each={filteredLogErrors()}>
                  {(error) => (
                    <div class="card p-4 border-l-4" style={{ 'border-left-color': error.status_code >= 500 ? '#ef4444' : '#f59e0b' }}>
                      <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-1 rounded text-xs font-medium" style={{ background: error.status_code >= 500 ? '#ef444420' : '#f59e0b20', color: error.status_code >= 500 ? '#ef4444' : '#f59e0b' }}>
                              HTTP {error.status_code}
                            </span>
                            <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {error.method} {error.path}
                            </span>
                          </div>
                          <p class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{error.message}</p>
                          <div class="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span>Pod: {error.pod}</span>
                            <span>Container: {error.container}</span>
                            <span>{error.namespace}</span>
                            <span>{formatRelativeTime(error.timestamp)}</span>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTime(error.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
                <Show when={filteredLogErrors().length === 0}>
                  <div class="card p-8 text-center">
                    <p style={{ color: 'var(--text-muted)' }}>No log errors found</p>
                  </div>
                </Show>
              </div>
            </Show>
          </Show>
        </div>

        {/* Real-time Events Panel Sidebar */}
        <div class="lg:col-span-1">
          <RealtimeEventsPanel maxEvents={50} showNamespace={true} />
        </div>
      </div>
    </div>
  );
};

export default MonitoredEvents;

