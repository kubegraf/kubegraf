import { Component, For, Show, createMemo, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ActionMenu from '../components/ActionMenu';
import { getTableCellStyle, STANDARD_TEXT_COLOR } from '../utils/tableCellStyles';

interface Certificate {
  name: string;
  namespace: string;
  secretName: string;
  issuer: string;
  status: string;
  notBefore: string;
  notAfter: string;
  renewalTime: string;
  dnsNames: string[];
  age: string;
}

type SortField = 'name' | 'namespace' | 'status' | 'age';
type SortDirection = 'asc' | 'desc';

const Certificates: Component = () => {
  const [search, setSearch] = createSignal('');
  const [sortField, setSortField] = createSignal<SortField>('name');
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('asc');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(20);
  const [selected, setSelected] = createSignal<Certificate | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [fontSize, setFontSize] = createSignal(parseInt(localStorage.getItem('certificates-font-size') || '14'));
  const [fontFamily, setFontFamily] = createSignal(localStorage.getItem('certificates-font-family') || 'Monaco');

  const getFontFamilyCSS = (family: string): string => {
    switch (family) {
      case 'Monospace': return 'monospace';
      case 'System-ui': return 'system-ui';
      case 'Monaco': return 'Monaco, monospace';
      case 'Consolas': return 'Consolas, monospace';
      case 'Courier': return '"Courier New", monospace';
      default: return 'Monaco, monospace';
    }
  };

  const [certificates, { refetch }] = createResource(namespace, api.getCertificates);
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const data = await api.getCertificateYAML(name, ns);
        return data.yaml || '';
      } catch (error) {
        console.error('Failed to fetch certificate YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
    const cert = selected();
    if (!cert) return;
    try {
      await api.updateCertificate(cert.name, cert.namespace, yaml);
      addNotification(`✅ Certificate ${cert.name} updated successfully`, 'success');
      setShowEdit(false);
      setTimeout(() => refetch(), 500);
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addNotification(`❌ Failed to update certificate: ${errorMsg}`, 'error');
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
    let all = certificates() || [];
    const query = search().toLowerCase();

    // Filter by search
    if (query) {
      all = all.filter((c: Certificate) =>
        c.name.toLowerCase().includes(query) ||
        c.namespace.toLowerCase().includes(query) ||
        c.issuer?.toLowerCase().includes(query) ||
        c.dnsNames?.some(d => d.toLowerCase().includes(query))
      );
    }

    // Sort
    const field = sortField();
    const direction = sortDirection();
    all = [...all].sort((a: Certificate, b: Certificate) => {
      let comparison = 0;
      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'namespace':
          comparison = a.namespace.localeCompare(b.namespace);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
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
  const paginatedCertificates = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    return filteredAndSorted().slice(start, start + pageSize());
  });

  const statusCounts = createMemo(() => {
    const all = certificates() || [];
    return {
      total: all.length,
      ready: all.filter((c: Certificate) => c.status === 'Ready' || c.status === 'True').length,
      pending: all.filter((c: Certificate) => c.status === 'Pending' || c.status === 'Unknown').length,
      failed: all.filter((c: Certificate) => c.status === 'Failed' || c.status === 'False').length,
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
      <span style={{ color: sortField() === props.field && sortDirection() === 'asc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>&#9650;</span>
      <span style={{ color: sortField() === props.field && sortDirection() === 'desc' ? 'var(--accent-primary)' : 'var(--text-muted)' }}>&#9660;</span>
    </span>
  );

  const deleteCertificate = async (cert: Certificate) => {
    if (!confirm(`Are you sure you want to delete certificate ${cert.name}?`)) return;
    try {
      await api.deleteCertificate(cert.name, cert.namespace);
      addNotification(`Certificate ${cert.name} deleted successfully`, 'success');
      refetch();
    } catch (error) {
      console.error('Failed to delete certificate:', error);
      addNotification(`Failed to delete certificate: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'Ready' || status === 'True') return 'badge-success';
    if (status === 'Failed' || status === 'False') return 'badge-error';
    return 'badge-warning';
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Certificates</h1>
          <p style={{ color: 'var(--text-secondary)' }}>TLS certificates managed by cert-manager</p>
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
            title="Refresh Certificates"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Total</span>
          <span class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCounts().total}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--success-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Ready</span>
          <span class="text-xl font-bold" style={{ color: 'var(--success-color)' }}>{statusCounts().ready}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--warning-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Pending</span>
          <span class="text-xl font-bold" style={{ color: 'var(--warning-color)' }}>{statusCounts().pending}</span>
        </div>
        <div class="card px-4 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2" style={{ 'border-left': '3px solid var(--error-color)' }}>
          <span style={{ color: 'var(--text-secondary)' }} class="text-sm">Failed</span>
          <span class="text-xl font-bold" style={{ color: 'var(--error-color)' }}>{statusCounts().failed}</span>
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

      {/* Certificates table */}
      <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
        <Show
          when={!certificates.loading}
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading certificates...</span>
            </div>
          }
        >
          <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
            <table
              class="w-full"
              style={{
                width: '100%',
                'table-layout': 'auto',
                'font-family': getFontFamilyCSS(fontFamily()),
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
                  <th class="whitespace-nowrap">Secret</th>
                  <th class="whitespace-nowrap">Issuer</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                    <div class="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th class="whitespace-nowrap">Expires</th>
                  <th class="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('age')}>
                    <div class="flex items-center gap-1">Age <SortIcon field="age" /></div>
                  </th>
                  <th class="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={paginatedCertificates()} fallback={
                  <tr><td colspan="8" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No certificates found. Make sure cert-manager is installed.</td></tr>
                }>
                  {(cert: Certificate) => {
                    const textColor = STANDARD_TEXT_COLOR;
                    return (
                    <tr>
                      <td style={getTableCellStyle(fontSize(), textColor)}>
                        <button
                          onClick={() => { setSelected(cert); setShowDescribe(true); }}
                          class="font-medium hover:underline text-left"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {cert.name.length > 40 ? cert.name.slice(0, 37) + '...' : cert.name}
                        </button>
                      </td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>{cert.namespace}</td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>
                        <code class="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)' }}>
                          {cert.secretName || '-'}
                        </code>
                      </td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>{cert.issuer || '-'}</td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>
                        <span class={`badge ${getStatusBadgeClass(cert.status)}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>{cert.notAfter || '-'}</td>
                      <td style={getTableCellStyle(fontSize(), textColor)}>{cert.age}</td>
                      <td style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        height: `${Math.max(24, fontSize() * 1.7)}px`,
                        'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                        border: 'none'
                      }}>
                        <ActionMenu
                          actions={[
                            { label: 'View YAML', icon: 'yaml', onClick: () => { 
                              setSelected(cert);
                              setYamlKey(`${cert.name}|${cert.namespace}`);
                              setShowYaml(true);
                            } },
                            { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                              setSelected(cert);
                              setYamlKey(`${cert.name}|${cert.namespace}`);
                              setShowEdit(true);
                            } },
                            { label: 'Delete', icon: 'delete', onClick: () => deleteCertificate(cert), variant: 'danger', divider: true },
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
                Showing {((currentPage() - 1) * pageSize()) + 1} - {Math.min(currentPage() * pageSize(), filteredAndSorted().length)} of {filteredAndSorted().length} certificates
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

      {/* YAML Modal */}
      <Modal isOpen={showYaml()} onClose={() => { setShowYaml(false); setSelected(null); setYamlKey(null); }} title={`YAML: ${selected()?.name || ''}`} size="xl">
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="spinner mx-auto" />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <YAMLViewer yaml={yamlContent() || ''} title={selected()?.name} />
        </Show>
      </Modal>

      {/* Edit YAML Modal */}
      <Modal isOpen={showEdit()} onClose={() => { setShowEdit(false); setSelected(null); setYamlKey(null); }} title={`Edit YAML: ${selected()?.name || ''}`} size="xl">
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="spinner mx-auto" />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <div style={{ height: '70vh' }}>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={selected()?.name}
              onSave={handleSaveYAML}
              onCancel={() => { setShowEdit(false); setSelected(null); setYamlKey(null); }}
            />
          </div>
        </Show>
      </Modal>

      {/* Describe Modal */}
      <DescribeModal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} resourceType="certificate" name={selected()?.name || ''} namespace={selected()?.namespace} />
    </div>
  );
};

export default Certificates;
