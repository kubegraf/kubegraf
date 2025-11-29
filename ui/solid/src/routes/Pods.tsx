import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import ShellModal from '../components/ShellModal';
import LogsModal from '../components/LogsModal';
import DescribeModal from '../components/DescribeModal';

interface Pod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node: string;
  containers?: string[];
  ip?: string;
}

const Pods: Component = () => {
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [selectedPod, setSelectedPod] = createSignal<Pod | null>(null);

  // Modal states
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showLogs, setShowLogs] = createSignal(false);
  const [showShell, setShowShell] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);

  // Resources
  const [namespaces] = createResource(api.getNamespaces);
  const [pods, { refetch }] = createResource(namespace, api.getPods);
  const [yamlContent] = createResource(
    () => showYaml() && selectedPod() ? { name: selectedPod()!.name, ns: selectedPod()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getPodYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const filteredPods = createMemo(() => {
    const allPods = pods() || [];
    const query = search().toLowerCase();
    if (!query) return allPods;
    return allPods.filter((p: Pod) =>
      p.name.toLowerCase().includes(query) ||
      p.namespace.toLowerCase().includes(query) ||
      p.status.toLowerCase().includes(query)
    );
  });

  const statusCounts = createMemo(() => {
    const all = pods() || [];
    return {
      running: all.filter((p: Pod) => p.status === 'Running').length,
      pending: all.filter((p: Pod) => p.status === 'Pending').length,
      failed: all.filter((p: Pod) => ['Failed', 'Error', 'CrashLoopBackOff'].includes(p.status)).length,
      total: all.length,
    };
  });

  const openModal = (pod: Pod, modal: 'yaml' | 'describe' | 'logs' | 'shell' | 'details') => {
    setSelectedPod(pod);
    switch (modal) {
      case 'yaml': setShowYaml(true); break;
      case 'describe': setShowDescribe(true); break;
      case 'logs': setShowLogs(true); break;
      case 'shell': setShowShell(true); break;
      case 'details': setShowDetails(true); break;
    }
  };

  const deletePod = async (pod: Pod) => {
    if (!confirm(`Are you sure you want to delete pod ${pod.name}?`)) return;
    try {
      await api.deletePod(pod.name, pod.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to delete pod:', error);
    }
  };

  const restartPod = async (pod: Pod) => {
    try {
      await api.restartPod(pod.name, pod.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to restart pod:', error);
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Pods</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and monitor your Kubernetes pods</p>
        </div>
        <button
          onClick={() => refetch()}
          class="btn-primary flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div class="flex flex-wrap gap-4">
        <select
          value={namespace()}
          onChange={(e) => setNamespace(e.currentTarget.value)}
          class="px-4 py-2 rounded-lg"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <option value="_all">All Namespaces</option>
          <For each={namespaces() || []}>
            {(ns) => <option value={ns}>{ns}</option>}
          </For>
        </select>

        <div class="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search pods..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="w-full px-4 py-2 rounded-lg"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>
      </div>

      {/* Status summary */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="card p-4" style={{ 'border-left': '4px solid var(--accent-primary)' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--success-color)' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Running</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().running}</div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--warning-color)' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Pending</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().pending}</div>
        </div>
        <div class="card p-4" style={{ 'border-left': '4px solid var(--error-color)' }}>
          <div style={{ color: 'var(--text-secondary)' }} class="text-sm">Failed</div>
          <div class="text-2xl font-bold" style={{ color: 'var(--error-color)' }}>{statusCounts().failed}</div>
        </div>
      </div>

      {/* Pods table */}
      <div class="card overflow-hidden">
        <Show
          when={!pods.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading pods...</span>
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Namespace</th>
                  <th>Status</th>
                  <th>Ready</th>
                  <th>Restarts</th>
                  <th>Age</th>
                  <th>Node</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredPods()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No pods found</td></tr>
                }>
                  {(pod: Pod) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => openModal(pod, 'details')}
                          class="font-medium hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {pod.name}
                        </button>
                      </td>
                      <td>{pod.namespace}</td>
                      <td>
                        <span class={`badge ${
                          pod.status === 'Running' ? 'badge-success' :
                          pod.status === 'Pending' ? 'badge-warning' :
                          pod.status === 'Succeeded' ? 'badge-info' :
                          'badge-error'
                        }`}>
                          {pod.status}
                        </span>
                      </td>
                      <td>{pod.ready}</td>
                      <td class={pod.restarts > 0 ? 'text-yellow-400' : ''}>{pod.restarts}</td>
                      <td>{pod.age}</td>
                      <td class="text-sm">{pod.node}</td>
                      <td>
                        <div class="flex items-center gap-1">
                          <button
                            onClick={() => openModal(pod, 'shell')}
                            class="action-btn"
                            title="Shell"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal(pod, 'logs')}
                            class="action-btn"
                            title="Logs"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal(pod, 'yaml')}
                            class="action-btn"
                            title="YAML"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openModal(pod, 'describe')}
                            class="action-btn"
                            title="Describe"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => restartPod(pod)}
                            class="action-btn"
                            title="Restart"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deletePod(pod)}
                            class="action-btn text-red-400 hover:text-red-300"
                            title="Delete"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      </div>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selectedPod()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selectedPod()?.name} />
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal
        isOpen={showDescribe()}
        onClose={() => setShowDescribe(false)}
        resourceType="pod"
        name={selectedPod()?.name || ''}
        namespace={selectedPod()?.namespace}
      />

      {/* Logs Modal */}
      <LogsModal
        isOpen={showLogs()}
        onClose={() => setShowLogs(false)}
        podName={selectedPod()?.name || ''}
        namespace={selectedPod()?.namespace || ''}
        containers={selectedPod()?.containers}
      />

      {/* Shell Modal */}
      <ShellModal
        isOpen={showShell()}
        onClose={() => setShowShell(false)}
        podName={selectedPod()?.name || ''}
        namespace={selectedPod()?.namespace || ''}
        container={selectedPod()?.containers?.[0]}
      />

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Pod: ${selectedPod()?.name}`} size="lg">
        <Show when={selectedPod()}>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Name</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.name}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.namespace}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Status</div>
                <div><span class={`badge ${selectedPod()?.status === 'Running' ? 'badge-success' : 'badge-warning'}`}>{selectedPod()?.status}</span></div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Ready</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.ready}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Restarts</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.restarts}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Age</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.age}</div>
              </div>
              <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Node</div>
                <div style={{ color: 'var(--text-primary)' }}>{selectedPod()?.node}</div>
              </div>
            </div>
            <div class="flex gap-2 pt-4">
              <button onClick={() => { setShowDetails(false); setShowLogs(true); }} class="btn-primary flex-1">View Logs</button>
              <button onClick={() => { setShowDetails(false); setShowShell(true); }} class="btn-secondary flex-1">Open Shell</button>
            </div>
          </div>
        </Show>
      </Modal>
    </div>
  );
};

export default Pods;
