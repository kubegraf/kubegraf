import { Component, createSignal, createResource, Show, For } from 'solid-js';
import Modal from './Modal';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  podName: string;
  namespace: string;
  containers?: string[];
}

const LogsModal: Component<LogsModalProps> = (props) => {
  const [selectedContainer, setSelectedContainer] = createSignal(props.containers?.[0] || '');
  const [tailLines, setTailLines] = createSignal(100);
  const [follow, setFollow] = createSignal(false);
  const [search, setSearch] = createSignal('');

  const [logs, { refetch }] = createResource(
    () => ({ pod: props.podName, ns: props.namespace, container: selectedContainer(), tail: tailLines() }),
    async (params) => {
      if (!params.pod || !params.ns) return '';
      const res = await fetch(
        `/api/pod/logs?name=${params.pod}&namespace=${params.ns}&container=${params.container}&tail=${params.tail}`
      );
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      return data.logs || '';
    }
  );

  const filteredLogs = () => {
    const logText = logs() || '';
    const query = search().toLowerCase();
    if (!query) return logText;
    return logText
      .split('\n')
      .filter((line: string) => line.toLowerCase().includes(query))
      .join('\n');
  };

  const downloadLogs = () => {
    const blob = new Blob([logs() || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.podName}-${selectedContainer() || 'logs'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title={`Logs: ${props.podName}`} size="xl">
      <div class="flex flex-col h-[60vh]">
        {/* Controls */}
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <Show when={props.containers && props.containers.length > 1}>
            <select
              value={selectedContainer()}
              onChange={(e) => setSelectedContainer(e.currentTarget.value)}
              class="px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <For each={props.containers}>
                {(container) => <option value={container}>{container}</option>}
              </For>
            </select>
          </Show>

          <select
            value={tailLines()}
            onChange={(e) => setTailLines(parseInt(e.currentTarget.value))}
            class="px-3 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <option value="50">Last 50 lines</option>
            <option value="100">Last 100 lines</option>
            <option value="500">Last 500 lines</option>
            <option value="1000">Last 1000 lines</option>
          </select>

          <input
            type="text"
            placeholder="Search logs..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="px-3 py-2 rounded-lg text-sm flex-1 min-w-[150px]"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />

          <button
            onClick={() => refetch()}
            class="px-3 py-2 rounded-lg text-sm flex items-center gap-1"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <button
            onClick={downloadLogs}
            class="px-3 py-2 rounded-lg text-sm flex items-center gap-1"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>

        {/* Logs content */}
        <div
          class="flex-1 font-mono text-xs p-4 rounded-lg overflow-auto"
          style={{
            background: '#0d1117',
            color: '#c9d1d9',
            border: '1px solid var(--border-color)',
          }}
        >
          <Show
            when={!logs.loading}
            fallback={
              <div class="flex items-center justify-center h-full">
                <div class="spinner" />
              </div>
            }
          >
            <Show when={logs.error}>
              <div class="text-red-400">Error loading logs: {logs.error?.message}</div>
            </Show>
            <pre class="whitespace-pre-wrap">{filteredLogs()}</pre>
          </Show>
        </div>
      </div>
    </Modal>
  );
};

export default LogsModal;
