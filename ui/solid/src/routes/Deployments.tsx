import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import DescribeModal from '../components/DescribeModal';

interface Deployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
  replicas: number;
}

const Deployments: Component = () => {
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [selected, setSelected] = createSignal<Deployment | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showScale, setShowScale] = createSignal(false);
  const [scaleReplicas, setScaleReplicas] = createSignal(1);

  const [namespaces] = createResource(api.getNamespaces);
  const [deployments, { refetch }] = createResource(namespace, api.getDeployments);
  const [yamlContent] = createResource(
    () => showYaml() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getDeploymentYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const filtered = createMemo(() => {
    const all = deployments() || [];
    const query = search().toLowerCase();
    if (!query) return all;
    return all.filter((d: Deployment) =>
      d.name.toLowerCase().includes(query) ||
      d.namespace.toLowerCase().includes(query)
    );
  });

  const restart = async (dep: Deployment) => {
    try {
      await api.restartDeployment(dep.name, dep.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to restart deployment:', error);
    }
  };

  const scale = async () => {
    const dep = selected();
    if (!dep) return;
    try {
      await api.scaleDeployment(dep.name, dep.namespace, scaleReplicas());
      setShowScale(false);
      refetch();
    } catch (error) {
      console.error('Failed to scale deployment:', error);
    }
  };

  const deleteDeployment = async (dep: Deployment) => {
    if (!confirm(`Are you sure you want to delete deployment ${dep.name}?`)) return;
    try {
      await api.deleteDeployment(dep.name, dep.namespace);
      refetch();
    } catch (error) {
      console.error('Failed to delete deployment:', error);
    }
  };

  const openScale = (dep: Deployment) => {
    setSelected(dep);
    const parts = dep.ready?.split('/') || ['1', '1'];
    setScaleReplicas(parseInt(parts[1]) || 1);
    setShowScale(true);
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Deployments</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage application deployments</p>
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
        <input type="text" placeholder="Search deployments..." value={search()} onInput={(e) => setSearch(e.currentTarget.value)}
          class="flex-1 min-w-[200px] px-4 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
      </div>

      <div class="card overflow-hidden">
        <Show when={!deployments.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto mb-2" /><span style={{ color: 'var(--text-muted)' }}>Loading deployments...</span></div>}>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Namespace</th><th>Ready</th><th>Up-to-date</th><th>Available</th><th>Age</th><th>Actions</th></tr></thead>
              <tbody>
                <For each={filtered()} fallback={<tr><td colspan="7" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No deployments found</td></tr>}>
                  {(dep: Deployment) => (
                    <tr>
                      <td class="font-medium" style={{ color: 'var(--accent-primary)' }}>{dep.name}</td>
                      <td>{dep.namespace}</td>
                      <td><span class="badge badge-success">{dep.ready}</span></td>
                      <td>{dep.upToDate}</td>
                      <td>{dep.available}</td>
                      <td>{dep.age}</td>
                      <td>
                        <div class="flex items-center gap-1">
                          <button onClick={() => openScale(dep)} class="action-btn" title="Scale">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                          <button onClick={() => { setSelected(dep); setShowYaml(true); }} class="action-btn" title="YAML">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          </button>
                          <button onClick={() => { setSelected(dep); setShowDescribe(true); }} class="action-btn" title="Describe">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </button>
                          <button onClick={() => restart(dep)} class="action-btn" title="Restart">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                          <button onClick={() => deleteDeployment(dep)} class="action-btn text-red-400 hover:text-red-300" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="deployment" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Scale Modal */}
      <Modal isOpen={showScale()} onClose={() => setShowScale(false)} title={`Scale: ${selected()?.name}`} size="sm">
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Replicas</label>
            <input
              type="number"
              min="0"
              max="100"
              value={scaleReplicas()}
              onInput={(e) => setScaleReplicas(parseInt(e.currentTarget.value) || 0)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div class="flex gap-2">
            <button onClick={() => setShowScale(false)} class="btn-secondary flex-1">Cancel</button>
            <button onClick={scale} class="btn-primary flex-1">Scale</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Deployments;
