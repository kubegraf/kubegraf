import { Component, For, Show, createMemo, createSignal, createResource, createEffect } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import {
  selectedCluster,
  selectedNamespaces,
  searchQuery,
  setSearchQuery,
  globalLoading,
  setGlobalLoading,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import { LoadingSpinner } from '../components/Loading';
import ServicePortForwardModal, { ServicePort } from '../components/ServicePortForwardModal';
import ServicePortsList from '../components/ServicePortsList';
import ServiceDetailsPanel from '../components/ServiceDetailsPanel';

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
  // Use global search query instead of local search
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
  const [showDetails, setShowDetails] = createSignal(false);
  const [selectedPort, setSelectedPort] = createSignal<ServicePort | null>(null);
  const [activeTab, setActiveTab] = createSignal<'services' | 'portforward'>('services');

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('services-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('services-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('services-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('services-font-family', family);
  };

  // Map font family option to actual font-family CSS value
  const getFontFamilyCSS = (): string => {
    const family = fontFamily();
    switch (family) {
      case 'Monospace': return '"Courier New", Monaco, monospace';
      case 'System-ui': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case 'Monaco': return 'Monaco, "Lucida Console", monospace';
      case 'Consolas': return 'Consolas, "Courier New", monospace';
      case 'Courier': return 'Courier, "Courier New", monospace';
      default: return '"Courier New", Monaco, monospace';
    }
  };

  // Determine namespace parameter from global store
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    // For multiple namespaces, backend should handle it via query params
    // For now, pass first namespace (backend may need to be updated to handle multiple)
    return namespaces[0];
  };

  // CACHED RESOURCE - Uses globalStore and cache
  const servicesCache = createCachedResource<Service[]>(
    'services',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        const services = await api.getServices(namespaceParam);
        return services;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  // Get services from cache
  const services = createMemo(() => servicesCache.data() || []);
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
      setTimeout(() => servicesCache.refetch(), 500);
      setTimeout(() => servicesCache.refetch(), 2000);
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
    const query = searchQuery().toLowerCase();
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

  const [servicePorts, setServicePorts] = createSignal<ServicePort[]>([]);
  const [serviceDetails] = createResource(
    () => showPortForward() && selected() ? { name: selected()!.name, ns: selected()!.namespace } : null,
    async (params) => {
      if (!params) return null;
      return await api.getServiceDetails(params.name, params.ns);
    }
  );

  // Parse service ports when details are loaded
  createEffect(() => {
    const details = serviceDetails();
    if (details && details.portsDetails) {
      const ports: ServicePort[] = details.portsDetails.map((p: any) => ({
        name: p.name || '',
        port: p.port,
        targetPort: p.targetPort || p.port,
        protocol: p.protocol || 'TCP',
        nodePort: p.nodePort || undefined,
      }));
      setServicePorts(ports);
    }
  });

  const openPortForward = (svc: Service) => {
    setSelected(svc);
    setShowPortForward(true);
  };

  const handlePortForward = (port: ServicePort) => {
    setSelectedPort(port);
    setShowPortForward(true);
  };

  const startPortForward = async (localPort: number, remotePort: number, openInBrowser: boolean) => {
    const svc = selected();
    if (!svc) return;
    
    try {
      await api.startPortForward('service', svc.name, svc.namespace, localPort, remotePort);
      addNotification(`✅ Port forward started: localhost:${localPort} → ${svc.name}:${remotePort}`, 'success');
      setShowPortForward(false);
      setSelectedPort(null);
      refetchPF();
      
      // Open in browser if requested
      if (openInBrowser) {
        setTimeout(() => {
          window.open(`http://localhost:${localPort}`, '_blank');
        }, 500); // Small delay to ensure port forward is ready
      }
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

  const deleteService = async (svc: Service) => {
    if (!confirm(`Are you sure you want to delete service "${svc.name}" in namespace "${svc.namespace}"?`)) return;
    try {
      await api.deleteService(svc.name, svc.namespace);
      addNotification(`Service ${svc.name} deleted successfully`, 'success');
      servicesCache.refetch();
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
        
        {/* Tabs */}
        <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('services')}
            class={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab() === 'services' 
                ? 'border-b-2' 
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              color: activeTab() === 'services' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              'border-color': activeTab() === 'services' ? 'var(--accent-primary)' : 'transparent',
            }}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('portforward')}
            class={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab() === 'portforward' 
                ? 'border-b-2' 
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              color: activeTab() === 'portforward' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              'border-color': activeTab() === 'portforward' ? 'var(--accent-primary)' : 'transparent',
            }}
          >
            Port Forward
            {(portForwards() || []).length > 0 && (
              <span class="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                {(portForwards() || []).length}
              </span>
            )}
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              servicesCache.refetch();
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

        {/* Font Size Selector */}
        <select
          value={fontSize()}
          onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Size"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
        </select>

        {/* Font Family Selector */}
        <select
          value={fontFamily()}
          onChange={(e) => handleFontFamilyChange(e.currentTarget.value)}
          class="px-3 py-2 rounded-lg text-sm"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          title="Font Family"
        >
          <option value="Monospace">Monospace</option>
          <option value="System-ui">System-ui</option>
          <option value="Monaco">Monaco</option>
          <option value="Consolas">Consolas</option>
          <option value="Courier">Courier</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={searchQuery()}
          onInput={(e) => { setSearchQuery(e.currentTarget.value); setCurrentPage(1); }}
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

      {/* Content based on active tab */}
      <Show when={activeTab() === 'services'}>
      {/* Services table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!servicesCache.loading() || servicesCache.data() !== undefined}
          fallback={
            <div class="p-8 text-center">
              <LoadingSpinner size="lg" showText={true} text="Loading services..." />
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
              class="w-full"
              style={{
                width: '100%',
                'table-layout': 'auto',
                'font-family': getFontFamilyCSS(),
                background: getThemeBackground(),
                'border-collapse': 'collapse',
                margin: '0',
                padding: '0'
              }}
            >
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
                  {(svc: Service) => {
                    const textColor = '#0ea5e9';
                    return (
                    <tr>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <button
                          onClick={() => { setSelected(svc); setShowDetails(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {svc.name.length > 40 ? svc.name.slice(0, 37) + '...' : svc.name}
                        </button>
                      </td>
                      <td 
                        onClick={() => { setSelected(svc); setShowDetails(true); }}
                        style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none',
                        cursor: 'pointer'
                      }}>{svc.namespace}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <span class={`badge ${svc.type === 'LoadBalancer' ? 'badge-info' : svc.type === 'NodePort' ? 'badge-warning' : 'badge-success'}`}>
                          {svc.type}
                        </span>
                      </td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }} class="font-mono text-sm">{svc.clusterIP}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }} class="font-mono text-sm">{svc.externalIP || '-'}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }} class="text-sm">{svc.ports}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        color: textColor,
                        'font-weight': '900',
                        'font-size': `${fontSize()}px`,
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>{svc.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'Describe', icon: 'info', onClick: () => { setSelected(svc); setShowDescribe(true); } },
                            { label: 'Port Forward', icon: 'portforward', onClick: () => openPortForward(svc) },
                            { label: 'View YAML', icon: 'yaml', onClick: () => { setSelected(svc); setShowYaml(true); } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelected(svc); setShowEdit(true); } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteService(svc), variant: 'danger', divider: true },
                          ]}
                        />
                      </td>
                    </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={totalPages() > 1 || filteredAndSorted().length > 0}>
            <div class="flex items-center justify-between p-4 font-mono text-sm" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} services
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage() === 1}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  ← Prev
                </button>
                <span class="px-3 py-1" style={{ color: 'var(--text-primary)' }}>
                  Page {currentPage()} of {totalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages())}
                  disabled={currentPage() === totalPages()}
                  class="px-3 py-1 rounded text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Last
                </button>
                <select
                  value={pageSize()}
                  onChange={(e) => { setPageSize(parseInt(e.currentTarget.value)); setCurrentPage(1); }}
                  class="px-3 py-1 rounded-lg text-sm ml-4"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <option value="20">20 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                  <option value="200">200 per page</option>
                </select>
              </div>
            </div>
          </Show>
        </Show>
      </div>
      </Show>

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => setShowYaml(false)} title={`YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="flex items-center justify-center p-8"><LoadingSpinner size="md" /></div>}>
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => setShowEdit(false)} title={`Edit YAML: ${selected()?.name}`} size="xl">
        <Show when={!yamlContent.loading} fallback={<div class="flex items-center justify-center p-8"><LoadingSpinner size="md" /></div>}>
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

      {/* Service Details Panel */}
      <ServiceDetailsPanel
        isOpen={showDetails()}
        onClose={() => setShowDetails(false)}
        serviceName={selected()?.name || ''}
        serviceNamespace={selected()?.namespace || ''}
        onPortForwardChange={() => refetchPF()}
      />

      {/* Port Forward Modal - Show ports list */}
      <Show when={showPortForward() && servicePorts().length > 0 && !selectedPort()}>
        <Modal isOpen={showPortForward() && !selectedPort()} onClose={() => { setShowPortForward(false); setSelectedPort(null); }} title="Ports" size="xs">
          <ServicePortsList
            serviceName={selected()?.name || ''}
            ports={servicePorts()}
            onForward={handlePortForward}
          />
        </Modal>
      </Show>
      
      <Show when={showPortForward() && servicePorts().length === 0}>
        <Modal isOpen={showPortForward()} onClose={() => { setShowPortForward(false); setSelectedPort(null); }} title="Ports" size="xs">
          <div class="flex items-center justify-center p-8">
            <LoadingSpinner size="md" />
          </div>
        </Modal>
      </Show>
      
      {/* Port Forward Modal - Show forwarding dialog */}
      <ServicePortForwardModal
        isOpen={showPortForward() && selectedPort() !== null}
        onClose={() => { setShowPortForward(false); setSelectedPort(null); }}
        serviceName={selected()?.name || ''}
        serviceNamespace={selected()?.namespace || ''}
        port={selectedPort()}
        onStart={startPortForward}
      />

      {/* Port Forward Tab */}
      <Show when={activeTab() === 'portforward'}>
        <div class="card p-4">
          <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Active Port Forwards
          </h3>
          <Show 
            when={(portForwards() || []).length > 0} 
            fallback={
              <div class="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                No active port forwards
              </div>
            }
          >
            <div class="space-y-2">
              <For each={portForwards() || []}>
                {(pf: PortForward) => (
                  <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border" style={{ background: 'var(--bg-tertiary)', 'border-color': 'var(--border-color)' }}>
                    <div class="flex items-center gap-2 flex-1">
                      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <div class="flex-1">
                        <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {pf.name}
                          {pf.type === 'service' && <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Service</span>}
                          {pf.type === 'pod' && <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Pod</span>}
                        </div>
                        <div class="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          localhost:{pf.localPort} → {pf.remotePort}
                          {pf.namespace && <span class="ml-2">({pf.namespace})</span>}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <a 
                        href={`http://localhost:${pf.localPort}`} 
                        target="_blank" 
                        class="text-xs px-2 py-1 rounded transition-colors hover:opacity-80" 
                        style={{ background: 'var(--accent-primary)', color: 'white' }}
                      >
                        Open
                      </a>
                      <button 
                        onClick={() => stopPortForward(pf)} 
                        class="p-1.5 rounded transition-colors hover:bg-red-500/20 text-red-400 hover:text-red-300"
                        title="Stop Port Forward"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

export default Services;
