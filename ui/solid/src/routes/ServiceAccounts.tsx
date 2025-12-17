import { Component, For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import ActionMenu from '../components/ActionMenu';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';

interface ServiceAccount {
  name: string;
  namespace: string;
  secrets: number;
  age: string;
  labels: Record<string, string>;
}

const ServiceAccounts: Component = () => {
  const [selectedSA, setSelectedSA] = createSignal<ServiceAccount | null>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);

  // Bulk selection
  const bulk = useBulkSelection<ServiceAccount>();
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('serviceaccounts-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('serviceaccounts-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('serviceaccounts-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('serviceaccounts-font-family', family);
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
  
  // Use createResource for automatic YAML loading like Deployments
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [name, ns] = key.split('|');
      if (!name || !ns) return '';
      try {
        const response = await fetch(`/api/serviceaccount/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns)}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch YAML' }));
          throw new Error(errorData.error || 'Failed to fetch YAML');
        }
        const data = await response.json();
        return data.yaml || '';
      } catch (err: any) {
        console.error('Failed to fetch service account YAML:', err);
        addNotification(`Failed to load YAML: ${err.message}`, 'error');
        return '';
      }
    }
  );

  const [serviceAccounts, { refetch }] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        const params = new URLSearchParams();
        if (ns && ns !== 'All Namespaces') {
          params.append('namespace', ns);
        }
        const response = await fetch(`/api/serviceaccounts?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch service accounts');
        return await response.json();
      } catch (err: any) {
        addNotification(`Failed to load service accounts: ${err.message}`, 'error');
        return [];
      }
    }
  );

  const handleViewYAML = (sa: ServiceAccount) => {
    setSelectedSA(sa);
    setYamlKey(`${sa.name}|${sa.namespace}`);
    setShowYaml(true);
  };

  const handleEditYAML = (sa: ServiceAccount) => {
    setSelectedSA(sa);
    setYamlKey(`${sa.name}|${sa.namespace}`);
    setShowEdit(true);
  };

  const handleSaveYAML = async (yaml: string) => {
    const sa = selectedSA();
    if (!sa) return;

    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = 'YAML cannot be empty';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    const status = clusterStatus();
    if (!status?.connected) {
      const msg = 'Cluster is not connected. Connect to a cluster before applying YAML.';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    startExecution({
      label: `Apply ServiceAccount YAML: ${sa.name}`,
      command: '__k8s-apply-yaml',
      args: [],
      mode: 'apply',
      kubernetesEquivalent: true,
      namespace: sa.namespace,
      context: status.context,
      userAction: 'serviceaccounts-apply-yaml',
      dryRun: false,
      allowClusterWide: false,
      resource: 'serviceaccounts',
      action: 'update',
      intent: 'apply-yaml',
      yaml: trimmed,
    });

    setShowEdit(false);
    setTimeout(() => refetch(), 1500);
  };

  const handleDelete = async (sa: ServiceAccount) => {
    if (!confirm(`Are you sure you want to delete ServiceAccount ${sa.name}?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        name: sa.name,
        namespace: sa.namespace,
      });
      const response = await fetch(`/api/serviceaccount/delete?${params.toString()}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      addNotification(`Successfully deleted ${sa.name}`, 'success');
      refetch();
    } catch (err: any) {
      addNotification(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = bulk.getSelectedItems(serviceAccounts());
    try {
      await Promise.all(
        itemsToDelete.map(sa => api.deleteServiceAccount(sa.name, sa.namespace))
      );
      addNotification(`Successfully deleted ${itemsToDelete.length} ServiceAccount(s)`, 'success');
      bulk.deselectAll();
      refetch();
    } catch (error) {
      console.error('Failed to delete ServiceAccounts:', error);
      addNotification(`Failed to delete ServiceAccounts: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-4">
      {/* Bulk Actions */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={(serviceAccounts() || []).length}
        onSelectAll={() => bulk.selectAll(serviceAccounts() || [])}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="service accounts"
      />

      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Service Accounts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage service accounts and their permissions</p>
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
            title="Refresh Service Accounts"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

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
        </div>
      </div>

      <Show when={!serviceAccounts.loading} fallback={
        <div class="p-8 text-center">
          <div class="spinner mx-auto mb-2" />
          <span style={{ color: 'var(--text-muted)' }}>Loading service accounts...</span>
        </div>
      }>
        <Show when={(serviceAccounts() || []).length > 0} fallback={
          <div class="text-center py-12">
            <p style={{ color: 'var(--text-muted)' }}>No service accounts found</p>
          </div>
        }>
          <div class="w-full" style={{ background: 'var(--bg-primary)', margin: '0', padding: '0', border: '1px solid var(--border-color)', 'border-radius': '4px' }}>
            <div class="w-full overflow-x-auto" style={{ margin: '0', padding: '0' }}>
              <table
                class="w-full"
                style={{
                  width: '100%',
                  'table-layout': 'auto',
                  'font-family': getFontFamilyCSS(),
                  background: 'var(--bg-primary)',
                  'border-collapse': 'collapse',
                  margin: '0',
                  padding: '0'
                }}
              >
                <thead>
                  <tr style={{
                    height: `${Math.max(24, fontSize() * 1.7)}px`,
                    'font-family': getFontFamilyCSS(),
                    'font-weight': '900',
                    color: '#0ea5e9',
                    'font-size': `${fontSize()}px`,
                    'line-height': `${Math.max(24, fontSize() * 1.7)}px`
                  }}>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'center',
                      width: '40px',
                      border: 'none'
                    }}>
                      <SelectAllCheckbox
                        checked={bulk.selectedCount() === (serviceAccounts() || []).length && (serviceAccounts() || []).length > 0}
                        indeterminate={bulk.selectedCount() > 0 && bulk.selectedCount() < (serviceAccounts() || []).length}
                        onChange={() => {
                          if (bulk.selectedCount() === (serviceAccounts() || []).length) {
                            bulk.deselectAll();
                          } else {
                            bulk.selectAll(serviceAccounts() || []);
                          }
                        }}
                      />
                    </th>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      border: 'none'
                    }}>Name</th>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      border: 'none'
                    }}>Namespace</th>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      border: 'none'
                    }}>Secrets</th>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      border: 'none'
                    }}>Age</th>
                    <th class="whitespace-nowrap" style={{
                      padding: '0 8px',
                      'text-align': 'left',
                      'font-weight': '900',
                      color: '#0ea5e9',
                      'font-size': `${fontSize()}px`,
                      border: 'none'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={serviceAccounts()} fallback={
                    <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No service accounts found</td></tr>
                  }>
                    {(sa) => {
                      const textColor = '#0ea5e9';
                      return (
                      <tr>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'center',
                          width: '40px',
                          border: 'none'
                        }}>
                          <SelectionCheckbox
                            checked={bulk.isSelected(sa)}
                            onChange={() => bulk.toggleSelection(sa)}
                          />
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
                        }}>{sa.name}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sa.namespace}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sa.secrets}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sa.age}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>
                          <ActionMenu
                            actions={[
                              {
                                label: 'View YAML',
                                icon: 'yaml',
                                onClick: () => handleViewYAML(sa),
                              },
                              {
                                label: 'Edit YAML',
                                icon: 'edit',
                                onClick: () => handleEditYAML(sa),
                              },
                              {
                                label: 'Delete',
                                icon: 'delete',
                                onClick: () => handleDelete(sa),
                                variant: 'danger',
                                divider: true,
                              },
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
          </div>
        </Show>
      </Show>

      <Modal
        isOpen={showYaml()}
        onClose={() => {
          setShowYaml(false);
          setSelectedSA(null);
          setYamlKey(null);
        }}
        title={`YAML: ${selectedSA()?.name || ''}`}
        size="xl"
      >
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="flex items-center justify-center p-8">
              <div class="spinner mx-auto" />
              <span class="ml-3" style={{ color: 'var(--text-secondary)' }}>Loading YAML...</span>
            </div>
          }
        >
          <YAMLViewer yaml={yamlContent() || ''} title={selectedSA()?.name} />
        </Show>
      </Modal>

      <Modal
        isOpen={showEdit()}
        onClose={() => {
          setShowEdit(false);
          setSelectedSA(null);
          setYamlKey(null);
        }}
        title={`Edit YAML: ${selectedSA()?.name || ''}`}
        size="xl"
      >
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
              title={selectedSA()?.name} 
              onSave={handleSaveYAML} 
              onCancel={() => {
                setShowEdit(false);
                setSelectedSA(null);
                setYamlKey(null);
              }} 
            />
          </div>
        </Show>
      </Modal>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={bulk.selectedCount()}
        totalCount={(serviceAccounts() || []).length}
        onSelectAll={() => bulk.selectAll(serviceAccounts() || [])}
        onDeselectAll={() => bulk.deselectAll()}
        onDelete={() => setShowBulkDeleteModal(true)}
        resourceType="service accounts"
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal()}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        resourceType="Service Accounts"
        selectedItems={bulk.getSelectedItems(serviceAccounts() || [])}
      />
    </div>
  );
};

export default ServiceAccounts;

