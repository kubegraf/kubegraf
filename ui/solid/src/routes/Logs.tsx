import { Component, For, Show, createSignal, createResource, createMemo, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';

const Logs: Component = () => {
  const [selectedPod, setSelectedPod] = createSignal<string>('');
  const [selectedContainer, setSelectedContainer] = createSignal<string>('');
  const [selectedNamespace, setSelectedNamespace] = createSignal<string>('');
  const [tailLines, setTailLines] = createSignal(100);
  const [follow, setFollow] = createSignal(false);
  const [search, setSearch] = createSignal('');
  const [logsContent, setLogsContent] = createSignal('');
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [logsError, setLogsError] = createSignal<string | null>(null);
  let logsEventSource: EventSource | null = null;

  // Fetch pods for selection - ensure it always returns an array
  const [pods] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        const nsParam = ns === '_all' ? undefined : ns;
        const podList = await api.getPods(nsParam);
        return Array.isArray(podList) ? podList : [];
      } catch (err) {
        return [];
      }
    }
  );

  // Fetch containers for selected pod
  const [podDetails] = createResource(
    () => {
      const podName = selectedPod();
      const ns = selectedNamespace() || namespace();
      if (!podName) return null;
      const nsParam = ns === '_all' ? undefined : ns;
      const actualNs = nsParam || 'default';
      return { pod: podName, namespace: actualNs };
    },
    async (params) => {
      if (!params) return null;
      try {
        return await api.getPodDetails(params.pod, params.namespace);
      } catch (err) {
        return null;
      }
    }
  );

  const containers = createMemo(() => {
    try {
      const details = podDetails();
      if (!details || !details.containers) {
        return [];
      }
      if (!Array.isArray(details.containers)) {
        return [];
      }
      return details.containers.map((c: any) => c.name || c).filter(Boolean);
    } catch (err) {
      return [];
    }
  });

  const stopLogStream = () => {
    if (logsEventSource) {
      logsEventSource.close();
      logsEventSource = null;
    }
  };

  const fetchLogs = async () => {
    const pod = selectedPod();
    const container = selectedContainer();
    const ns = selectedNamespace() || namespace();
    
    if (!pod || !container) {
      setLogsError('Please select a pod and container');
      return;
    }

    stopLogStream();
    setLogsLoading(true);
    setLogsError(null);

    const nsParam = ns === '_all' ? undefined : ns;
    const actualNs = nsParam || 'default';
    const url = `/api/pod/logs?name=${pod}&namespace=${actualNs}&container=${container}&tail=${tailLines()}${follow() ? '&follow=true' : ''}`;

    if (follow()) {
      setLogsContent('');
      logsEventSource = new EventSource(url);

      logsEventSource.onmessage = (event) => {
        setLogsContent(prev => prev + event.data + '\n');
        setLogsLoading(false);
        setTimeout(() => {
          const logContainer = document.getElementById('logs-container');
          if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
          }
        }, 50);
      };

      logsEventSource.onerror = () => {
        setLogsError('Stream connection lost');
        setLogsLoading(false);
        stopLogStream();
      };

      logsEventSource.onopen = () => {
        setLogsLoading(false);
      };
    } else {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setLogsContent(data.logs || 'No logs available');
      } catch (e: any) {
        setLogsError(e.message || 'Failed to fetch logs');
        setLogsContent('');
      } finally {
        setLogsLoading(false);
      }
    }
  };

  const filteredLogs = createMemo(() => {
    const logs = logsContent();
    const query = search().toLowerCase();
    if (!query) return logs;
    return logs.split('\n').filter(line => line.toLowerCase().includes(query)).join('\n');
  });

  const downloadLogs = () => {
    const blob = new Blob([logsContent()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPod()}-${selectedContainer() || 'logs'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  createMemo(() => {
    const conts = containers();
    if (conts.length > 0 && !selectedContainer()) {
      setSelectedContainer(conts[0]);
    }
  });

  onMount(() => {
    // Component mounted
  });

  onCleanup(() => {
    stopLogStream();
  });

  // Ensure pods() is always an array for For component
  const podsList = createMemo(() => {
    try {
      if (pods.loading) return [];
      if (pods.error) return [];
      const p = pods();
      if (p === undefined || p === null) return [];
      if (!Array.isArray(p)) return [];
      return p;
    } catch (err) {
      return [];
    }
  });
  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Logs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View and stream pod container logs</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={!selectedPod() || !selectedContainer() || logsLoading()}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent-primary)', color: 'white' }}
          >
            {logsLoading() ? 'Loading...' : 'Fetch Logs'}
          </button>
          <button
            onClick={downloadLogs}
            disabled={!logsContent()}
            class="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Download
          </button>
        </div>
      </div>

      {/* Filters */}
      <div class="card p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Namespace</label>
            <select
              value={selectedNamespace() || namespace()}
              onChange={(e) => {
                setSelectedNamespace(e.currentTarget.value);
                setSelectedPod('');
                setSelectedContainer('');
              }}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value={namespace()}>{namespace() === '_all' ? 'All Namespaces' : namespace()}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Pod</label>
            <select
              value={selectedPod()}
              onChange={(e) => {
                setSelectedPod(e.currentTarget.value);
                setSelectedContainer('');
              }}
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">Select a pod</option>
              <Show when={pods.loading}>
                <option disabled>Loading pods...</option>
              </Show>
              <Show when={!pods.loading && Array.isArray(podsList()) && podsList().length > 0}>
                <For each={podsList()}>
                  {(pod: any) => (
                    <option value={pod.name}>{pod.name} ({pod.namespace || 'default'})</option>
                  )}
                </For>
              </Show>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Container</label>
            <select
              value={selectedContainer()}
              onChange={(e) => setSelectedContainer(e.currentTarget.value)}
              disabled={!selectedPod()}
              class="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">Select a container</option>
              <Show when={podDetails.loading}>
                <option disabled>Loading containers...</option>
              </Show>
              <Show when={!podDetails.loading && containers().length > 0}>
                <For each={containers()}>
                  {(container) => (
                    <option value={container}>{container}</option>
                  )}
                </For>
              </Show>
              <Show when={!podDetails.loading && selectedPod() && containers().length === 0}>
                <option disabled>No containers found</option>
              </Show>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Tail Lines</label>
            <input
              type="number"
              value={tailLines()}
              onChange={(e) => setTailLines(parseInt(e.currentTarget.value) || 100)}
              min="10"
              max="10000"
              class="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
        </div>
        <div class="flex items-center gap-4 mt-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={follow()}
              onChange={(e) => {
                setFollow(e.currentTarget.checked);
                if (e.currentTarget.checked && selectedPod() && selectedContainer()) {
                  fetchLogs();
                } else {
                  stopLogStream();
                }
              }}
              disabled={!selectedPod() || !selectedContainer()}
              class="w-4 h-4 rounded"
            />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Follow logs (stream)</span>
          </label>
        </div>
      </div>

      {/* Search */}
      <div class="card p-4">
        <input
          type="text"
          placeholder="Search logs..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="w-full px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />
      </div>

      {/* Logs Display */}
      <div class="card overflow-hidden">
        <Show when={logsError()}>
          <div class="p-4 bg-red-500/10 border-l-4 border-red-500">
            <p style={{ color: 'var(--error-color)' }}>{logsError()}</p>
          </div>
        </Show>
        <Show when={logsLoading() && !logsContent()}>
          <div class="p-8 text-center">
            <div class="spinner mx-auto mb-2" />
            <span style={{ color: 'var(--text-muted)' }}>Loading logs...</span>
          </div>
        </Show>
        <Show when={!logsContent() && !logsLoading() && !logsError()}>
          <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Select a pod and container, then click "Fetch Logs"</p>
          </div>
        </Show>
        <Show when={logsContent()}>
          <div
            id="logs-container"
            class="p-4 font-mono text-sm overflow-auto"
            style={{
              background: '#0d1117',
              color: '#c9d1d9',
              'max-height': 'calc(100vh - 400px)',
              'white-space': 'pre-wrap',
              'word-break': 'break-word'
            }}
          >
            {filteredLogs() || 'No logs available'}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Logs;
