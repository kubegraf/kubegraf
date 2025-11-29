import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import DescribeModal from '../components/DescribeModal';

interface StatefulSet {
  name: string;
  namespace: string;
  ready: string;
  replicas: number;
  age: string;
}

const StatefulSets: Component = () => {
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [selected, setSelected] = createSignal<StatefulSet | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);

  const [namespaces] = createResource(api.getNamespaces);
  const [statefulsets, { refetch }] = createResource(namespace, api.getStatefulSets);
  const [yamlContent] = createResource(
    () => showYaml() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getStatefulSetYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const filtered = createMemo(() => {
    const all = statefulsets() || [];
    const query = search().toLowerCase();
    if (!query) return all;
    return all.filter((s: StatefulSet) =>
      s.name.toLowerCase().includes(query) ||
      s.namespace.toLowerCase().includes(query)
    );
  });

  const restart = async (sts: StatefulSet) => {
    try {
      await api.restartStatefulSet(sts.name, sts.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to restart StatefulSet:', error);
    }
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>StatefulSets</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage stateful applications</p>
        </div>
        <button onClick={() => refetch()} class="btn-primary flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div class="flex flex-wrap gap-4">
        <select value={namespace()} onChange={(e) => setNamespace(e.currentTarget.value)}
          class="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
          <option value="_all">All Namespaces</option>
          <For each={namespaces() || []}>{(ns) => <option value={ns}>{ns}</option>}</For>
        </select>
        <input type="text" placeholder="Search..." value={search()} onInput={(e) => setSearch(e.currentTarget.value)}
          class="flex-1 min-w-[200px] px-4 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
      </div>

      <div class="card overflow-hidden">
        <Show when={!statefulsets.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
          <table class="data-table">
            <thead><tr><th>Name</th><th>Namespace</th><th>Ready</th><th>Replicas</th><th>Age</th><th>Actions</th></tr></thead>
            <tbody>
              <For each={filtered()} fallback={<tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No StatefulSets found</td></tr>}>
                {(sts: StatefulSet) => (
                  <tr>
                    <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{sts.name}</td>
                    <td>{sts.namespace}</td>
                    <td><span class="badge badge-success">{sts.ready}</span></td>
                    <td>{sts.replicas}</td>
                    <td>{sts.age}</td>
                    <td>
                      <div class="flex items-center gap-1">
                        <button onClick={() => { setSelected(sts); setShowYaml(true); }} class="action-btn" title="YAML">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </button>
                        <button onClick={() => { setSelected(sts); setShowDescribe(true); }} class="action-btn" title="Describe">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <button onClick={() => restart(sts)} class="action-btn" title="Restart">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>

      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="statefulset" name={selected()?.name || ''} namespace={selected()?.namespace} />
    </div>
  );
};

export default StatefulSets;
