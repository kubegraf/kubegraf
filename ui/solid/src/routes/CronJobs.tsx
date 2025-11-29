import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';

interface CronJob {
  name: string;
  namespace: string;
  schedule: string;
  suspend: boolean;
  active: number;
  lastSchedule: string;
  age: string;
}

const CronJobs: Component = () => {
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [selected, setSelected] = createSignal<CronJob | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);

  const [namespaces] = createResource(api.getNamespaces);
  const [cronjobs, { refetch }] = createResource(namespace, api.getCronJobs);
  const [yamlContent] = createResource(
    () => showYaml() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getCronJobYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const filtered = createMemo(() => {
    const all = cronjobs() || [];
    const query = search().toLowerCase();
    if (!query) return all;
    return all.filter((c: CronJob) => c.name.toLowerCase().includes(query) || c.namespace.toLowerCase().includes(query));
  });

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CronJobs</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Scheduled job management</p>
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
        <Show when={!cronjobs.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto" /></div>}>
          <table class="data-table">
            <thead><tr><th>Name</th><th>Namespace</th><th>Schedule</th><th>Suspend</th><th>Active</th><th>Last Schedule</th><th>Age</th><th>Actions</th></tr></thead>
            <tbody>
              <For each={filtered()} fallback={<tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No CronJobs found</td></tr>}>
                {(cj: CronJob) => (
                  <tr>
                    <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{cj.name}</td>
                    <td>{cj.namespace}</td>
                    <td><code class="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>{cj.schedule}</code></td>
                    <td><span class={`badge ${cj.suspend ? 'badge-warning' : 'badge-success'}`}>{cj.suspend ? 'Yes' : 'No'}</span></td>
                    <td>{cj.active}</td>
                    <td>{cj.lastSchedule || 'Never'}</td>
                    <td>{cj.age}</td>
                    <td>
                      <button onClick={() => { setSelected(cj); setShowYaml(true); }} class="action-btn" title="YAML">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>

      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}><YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} /></Show>
      </Modal>
    </div>
  );
};

export default CronJobs;
