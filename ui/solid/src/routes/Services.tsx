import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import DescribeModal from '../components/DescribeModal';

interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
}

interface PortForward {
  id: string;
  type: string;
  name: string;
  namespace: string;
  localPort: number;
  remotePort: number;
  status: string;
}

const Services: Component = () => {
  const [namespace, setNamespace] = createSignal('_all');
  const [search, setSearch] = createSignal('');
  const [selected, setSelected] = createSignal<Service | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [localPort, setLocalPort] = createSignal(8080);
  const [remotePort, setRemotePort] = createSignal(80);

  const [namespaces] = createResource(api.getNamespaces);
  const [services, { refetch }] = createResource(namespace, api.getServices);
  const [portForwards, { refetch: refetchPF }] = createResource(api.listPortForwards);
  const [yamlContent] = createResource(
    () => showYaml() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getServiceYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const filtered = createMemo(() => {
    const all = services() || [];
    const query = search().toLowerCase();
    if (!query) return all;
    return all.filter((s: Service) =>
      s.name.toLowerCase().includes(query) ||
      s.namespace.toLowerCase().includes(query) ||
      s.type.toLowerCase().includes(query)
    );
  });

  const startPortForward = async () => {
    const svc = selected();
    if (!svc) return;
    try {
      await api.startPortForward('service', svc.name, svc.namespace, localPort(), remotePort());
      setShowPortForward(false);
      refetchPF();
    } catch (error) {
      console.error('Failed to start port forward:', error);
    }
  };

  const stopPortForward = async (pf: PortForward) => {
    try {
      await api.stopPortForward(pf.id);
      refetchPF();
    } catch (error) {
      console.error('Failed to stop port forward:', error);
    }
  };

  const openPortForward = (svc: Service) => {
    setSelected(svc);
    // Try to parse port from service
    const portMatch = svc.ports?.match(/(\d+)/);
    if (portMatch) {
      setRemotePort(parseInt(portMatch[1]));
    }
    setShowPortForward(true);
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Services</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Network services and load balancers</p>
        </div>
        <button onClick={() => refetch()} class="btn-primary flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Active Port Forwards */}
      <Show when={(portForwards() || []).length > 0}>
        <div class="card p-4">
          <h3 class="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Active Port Forwards
          </h3>
          <div class="flex flex-wrap gap-2">
            <For each={portForwards() || []}>
              {(pf: PortForward) => (
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span style={{ color: 'var(--text-primary)' }}>{pf.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>localhost:{pf.localPort} → {pf.remotePort}</span>
                  <a href={`http://localhost:${pf.localPort}`} target="_blank" class="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                    Open
                  </a>
                  <button onClick={() => stopPortForward(pf)} class="text-red-400 hover:text-red-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div class="flex flex-wrap gap-4">
        <select value={namespace()} onChange={(e) => setNamespace(e.currentTarget.value)}
          class="px-4 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
          <option value="_all">All Namespaces</option>
          <For each={namespaces() || []}>{(ns) => <option value={ns}>{ns}</option>}</For>
        </select>
        <input type="text" placeholder="Search services..." value={search()} onInput={(e) => setSearch(e.currentTarget.value)}
          class="flex-1 min-w-[200px] px-4 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
      </div>

      <div class="card overflow-hidden">
        <Show when={!services.loading} fallback={<div class="p-8 text-center"><div class="spinner mx-auto mb-2" /><span style={{ color: 'var(--text-muted)' }}>Loading services...</span></div>}>
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Namespace</th><th>Type</th><th>Cluster IP</th><th>External IP</th><th>Ports</th><th>Age</th><th>Actions</th></tr></thead>
              <tbody>
                <For each={filtered()} fallback={<tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No services found</td></tr>}>
                  {(svc: Service) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => { setSelected(svc); setShowDetails(true); }}
                          class="font-medium hover:underline"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {svc.name}
                        </button>
                      </td>
                      <td>{svc.namespace}</td>
                      <td><span class={`badge ${svc.type === 'LoadBalancer' ? 'badge-info' : svc.type === 'NodePort' ? 'badge-warning' : 'badge-success'}`}>{svc.type}</span></td>
                      <td class="font-mono text-sm">{svc.clusterIP}</td>
                      <td class="font-mono text-sm">{svc.externalIP || '-'}</td>
                      <td class="text-sm">{svc.ports}</td>
                      <td>{svc.age}</td>
                      <td>
                        <div class="flex items-center gap-1">
                          <button onClick={() => { setSelected(svc); setShowDetails(true); }} class="action-btn" title="Details">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button onClick={() => openPortForward(svc)} class="action-btn" title="Port Forward">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                          <button onClick={() => { setSelected(svc); setShowYaml(true); }} class="action-btn" title="YAML">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          </button>
                          <button onClick={() => { setSelected(svc); setShowDescribe(true); }} class="action-btn" title="Describe">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="service" name={selected()?.name || ''} namespace={selected()?.namespace} />

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Service: ${selected()?.name}`} size="lg">
        <Show when={selected()}>
          <div class="space-y-4">
            {/* Basic Info */}
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Name</div>
                <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{selected()?.name}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div style={{ color: 'var(--text-primary)' }}>{selected()?.namespace}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Type</div>
                <div><span class={`badge ${selected()?.type === 'LoadBalancer' ? 'badge-info' : selected()?.type === 'NodePort' ? 'badge-warning' : 'badge-success'}`}>{selected()?.type}</span></div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Cluster IP</div>
                <div class="font-mono text-sm" style={{ color: 'var(--accent-primary)' }}>{selected()?.clusterIP}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>External IP</div>
                <div class="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{selected()?.externalIP || '-'}</div>
              </div>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                <div style={{ color: 'var(--text-primary)' }}>{selected()?.age}</div>
              </div>
            </div>

            {/* Ports */}
            <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Ports</div>
              <div class="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{selected()?.ports}</div>
            </div>

            {/* Actions */}
            <div class="flex flex-wrap gap-2 pt-2">
              <button onClick={() => { setShowDetails(false); openPortForward(selected()!); }} class="btn-primary flex-1">Port Forward</button>
              <button onClick={() => { setShowDetails(false); setShowYaml(true); }} class="btn-secondary flex-1">View YAML</button>
              <button onClick={() => { setShowDetails(false); setShowDescribe(true); }} class="btn-secondary flex-1">Describe</button>
            </div>
          </div>
        </Show>
      </Modal>

      {/* Port Forward Modal */}
      <Modal isOpen={showPortForward()} onClose={() => setShowPortForward(false)} title={`Port Forward: ${selected()?.name}`} size="sm">
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Local Port</label>
            <input
              type="number"
              min="1024"
              max="65535"
              value={localPort()}
              onInput={(e) => setLocalPort(parseInt(e.currentTarget.value) || 8080)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label class="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Remote Port</label>
            <input
              type="number"
              min="1"
              max="65535"
              value={remotePort()}
              onInput={(e) => setRemotePort(parseInt(e.currentTarget.value) || 80)}
              class="w-full px-4 py-2 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div class="p-3 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            This will forward <code>localhost:{localPort()}</code> to <code>{selected()?.name}:{remotePort()}</code>
          </div>
          <div class="flex gap-2">
            <button onClick={() => setShowPortForward(false)} class="btn-secondary flex-1">Cancel</button>
            <button onClick={startPortForward} class="btn-primary flex-1">Start</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Services;
