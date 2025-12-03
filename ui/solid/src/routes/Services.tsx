import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';

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

type SortField = 'name' | 'namespace' | 'type' | 'age';
type SortDirection = 'asc' | 'desc';

const Services: Component = () => {
  const [search, setSearch] = createSignal('');
  const [typeFilter, setTypeFilter] = createSignal('all');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Service | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showPortForward, setShowPortForward] = createSignal(false);
  const [localPort, setLocalPort] = createSignal(8080);
  const [remotePort, setRemotePort] = createSignal(80);

  const [services, { refetch }] = createResource(namespace, api.getServices);
  const [portForwards, { refetch: refetchPF }] = createResource(api.listPortForwards);
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      const data = await api.getServiceYAML(params.name, params.ns);
      return data.yaml || '';
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const svc = selected();
    if (!svc) return;
    try {
      await api.updateService(svc.name, svc.namespace, yaml);
      addNotification(`✅ Service ${svc.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update service: ${errorMsg}`, 'error');
      throw error;
    }
  };

  // Parse age for sorting
  const parseAge = (age: string | undefined): number => {
    if (!age) return 0;
    let total = 0;
    const days = age.match(/(\d+)d/);
    const hours = age.match(/(\d+)h/);
    const mins = age.match(/(\d+)m/);
    if (days) total += parseInt(days[1]) * 24 * 60;
    if (hours) total += parseInt(hours[1]) * 60;
    if (mins) total += parseInt(mins[1]);
    return total;
  };

  const filteredAndSorted = createMemo(() => {
    let all = services() || [];
    const query = search().toLowerCase();
    const type = typeFilter();

    // Filter by type
    if (type !== 'all') {
      all = all.filter((s: Service) => s.type === type);
    }

    // Filter by search
    if (query) {
      all = all.filter((s: Service) =>
        s.name.toLowerCase().includes(query) ||
        s.namespace.toLowerCase().includes(query) ||
        s.type.toLowerCase().includes(query)
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Service, b: Service) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'age':
          comparison = parseAge(a.age) - parseAge(b.age);
          break;
      }
      return direction === 'asc' ? comparison : -comparison;
    });

    return all;
  });

  // Pagination
  const totalPages = createMemo(() => Math.ceil(filteredAndSorted().length / pageSize()));
  const paginatedServices = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = services() || [];
    return {
      total: all.length,
      clusterIP: all.filter((s: Service) => s.type === 'ClusterIP').length,
      nodePort: all.filter((s: Service) => s.type === 'NodePort').length,
      loadBalancer: all.filter((s: Service) => s.type === 'LoadBalancer').length,
    };
  });

  const handleSort = (field: SortField) => {
    if (sortField() === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = (props: { field: SortField }) => (
    <span class="ml-1 inline-flex flex-col text-xs leading-none">
      <span style={{ color: sortField() === props.field && sortDirection() === 'asc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>▲</span>
      <span style={{ color: sortField() === props.field && sortDirection() === 'desc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>▼</span>
    </span>
  );

  const startPortForward = async () => {
    const svc = selected();
    if (!svc) return;
    try {
      await api.startPortForward('service', svc.name, svc.namespace, localPort(), remotePort());
      addNotification(`✅ Port forward started: localhost:${localPort()} → ${svc.name}:${remotePort()}`, 'success');
      setShowPortForward(false);
      refetchPF();
    } catch (error) {
      console.error('Failed to start port forward:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to start port forward: ${errorMsg}`, 'error');
    }
  };

  const stopPortForward = async (pf: PortForward) => {
    try {
      await api.stopPortForward(pf.id);
      addNotification(`✅ Port forward stopped: ${pf.name}`, 'success');
      refetchPF();
    } catch (error) {
      console.error('Failed to stop port forward:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to stop port forward: ${errorMsg}`, 'error');
    }
  };

  const openPortForward = (svc: Service) => {
    setSelected(svc);
    // Safely parse port from ports string
    const portsStr = svc.ports;
    if (typeof portsStr === 'string' && portsStr.trim() !== '' && portsStr !== '-') {
      const portMatch = portsStr.match(/(\d+)/);
      if (portMatch) {
        setRemotePort(parseInt(portMatch[1]));
      }
    }
    setShowPortForward(true);
  };

  const deleteService = async (svc: Service) => {
    if (!confirm(`Are you sure you want to delete service "${svc.name}" in namespace "${svc.namespace}"?`)) return;
    try {
      await api.deleteService(svc.name, svc.namespace);
      addNotification(`Service ${svc.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete service:', error);
      addNotification(`Failed to delete service: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Services</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Network services and load balancers</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh Services"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary with clickable filters */}
      <div class="flex flex-wrap items-center gap-3">
        <div
          class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"
          style={{
            'border-left': typeFilter() === 'all' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            opacity: typeFilter() === 'all' ? 1 : 0.7
          }}
          onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
        >
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div
          class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"
          style={{
            'border-left': typeFilter() === 'ClusterIP' ? '3px solid var(--success-color)' : '3px solid transparent',
            opacity: typeFilter() === 'ClusterIP' ? 1 : 0.7
          }}
          onClick={() => { setTypeFilter('ClusterIP'); setCurrentPage(1); }}
        >
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">ClusterIP</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().clusterIP}</span>
        </div>
        <div
          class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"
          style={{
            'border-left': typeFilter() === 'NodePort' ? '3px solid var(--warning-color)' : '3px solid transparent',
            opacity: typeFilter() === 'NodePort' ? 1 : 0.7
          }}
          onClick={() => { setTypeFilter('NodePort'); setCurrentPage(1); }}
        >
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">NodePort</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().nodePort}</span>
        </div>
        <div
          class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2 transition-all"
          style={{
            'border-left': typeFilter() === 'LoadBalancer' ? '3px solid #3b82f6' : '3px solid transparent',
            opacity: typeFilter() === 'LoadBalancer' ? 1 : 0.7
          }}
          onClick={() => { setTypeFilter('LoadBalancer'); setCurrentPage(1); }}
        >
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">LoadBalancer</span>
          <span class="text-xl font-bold" style={{ color: '#3b82f6' }}>{statusCounts().loadBalancer}</span>
        </div>

        <div class="flex-1" />

        <input
          type="text"
          placeholder="Search..."
          value={search()}
          onInput={(e) => { setSearch(e.currentTarget.value); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm w-48"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        />

        <select
          value={pageSize()}
          onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
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

      {/* Services table */}
      <div class="overflow-hidden rounded-lg" style={{ background: '#0d1117' }}>
        <Show
          when={!services.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading services...</span>
            </div>
          }
        >
          <div class="overflow-x-auto">
            <table class="data-table terminal-table">
              <thead>
                <tr>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('name')}>
                    <div class="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('namespace')}>
                    <div class="flex items-center gap-1">Namespace <SortIcon field="namespace" /></div>
                  </th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('type')}>
                    <div class="flex items-center gap-1">Type <SortIcon field="type" /></div>
                  </th>
                  <th class="whitespace-nowrap">Cluster IP</th>
                  <th class="whitespace-nowrap">External IP</th>
                  <th class="whitespace-nowrap">Ports</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedServices()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No services found</td></tr>
                }>
                  {(svc: Service) => (
                    <tr>
                      <td>
                        <button
                          onClick={() => { setSelected(svc); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {svc.name.length > 40 ? svc.name.slice(0, 37) + '...' : svc.name}
                        </button>
                      </td>
                      <td>{svc.namespace}</td>
                      <td>
                        <span class={`badge ${svc.type === 'LoadBalancer' ? 'badge-info' : svc.type === 'NodePort' ? 'badge-warning' : 'badge-success'}`}>
                          {svc.type}
                        </span>
                      </td>
                      <td class="font-mono text-sm">{svc.clusterIP}</td>
                      <td class="font-mono text-sm">{svc.externalIP || '-'}</td>
                      <td class="text-sm">{svc.ports}</td>
                      <td>{svc.age}</td>
                      <td>
                        <ActionMenu
                          actions={[
                            { label: 'Port Forward', icon: 'portforward', onClick: () => openPortForward(svc) },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(svc); setShowYaml(true); } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(svc); setShowEdit(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteService(svc), variant: 'danger', divider: true },
                          ]}
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: '#161b22' }}>
              <div style={{ color: '#8b949e' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} services
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  ← Prev
                </button>
                <span class="px-3 py-1" style={{ color: '#c9d1d9' }}>
                  Page {currentPage()} of {totalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: '#21262d', color: '#c9d1d9' }}
                >
                  Last
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => setShowEdit(false)} title={`Edit YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <div style={{ height: '70vh' }}>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selected()?.name}
              onSave={handleSaveYAML}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="service" name={selected()?.name || ''} namespace={selected()?.namespace} />

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
