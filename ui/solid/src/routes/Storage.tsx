import { Component, For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import ActionMenu from '../components/ActionMenu';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import { getTableHeaderCellStyle, getTableHeaderRowStyle } from '../utils/tableCellStyles';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';

interface PersistentVolume {
  name: string;
  capacity: string;
  accessModes: string[];
  reclaimPolicy: string;
  status: string;
  storageClass: string;
  claim?: string;
  age: string;
}

interface PersistentVolumeClaim {
  name: string;
  namespace: string;
  status: string;
  volume: string;
  capacity: string;
  accessModes: string[];
  storageClass: string;
  age: string;
}

interface StorageClass {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  age: string;
}

const Storage: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'pvs' | 'pvcs' | 'storageclasses'>('pvs');
  const [selectedPV, setSelectedPV] = createSignal<any>(null);
  const [selectedPVC, setSelectedPVC] = createSignal<any>(null);
  const [selectedSC, setSelectedSC] = createSignal<any>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);

  // Bulk selection for PVCs
  const bulkPVC = useBulkSelection<PersistentVolumeClaim>();
  const [showBulkDeleteModalPVC, setShowBulkDeleteModalPVC] = createSignal(false);

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('storage-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('storage-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('storage-font-family');
    return saved || 'Monospace';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('storage-font-family', family);
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

  // Fetch PersistentVolumes
  const [pvs, { refetch: refetchPVs }] = createResource(async () => {
    try {
      const response = await fetch('/api/storage/persistentvolumes');
      if (!response.ok) throw new Error('Failed to fetch PVs');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to fetch PVs:', err);
      return [];
    }
  });

  // Fetch PersistentVolumeClaims
  const [pvcs, { refetch: refetchPVCs }] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        // Handle "All Namespaces" - send empty namespace param
        const nsParam = (ns === '_all' || ns === 'All Namespaces' || !ns) ? '' : ns;
        const response = await fetch(`/api/storage/persistentvolumeclaims${nsParam ? `?namespace=${nsParam}` : ''}`);
        if (!response.ok) throw new Error('Failed to fetch PVCs');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Failed to fetch PVCs:', err);
        return [];
      }
    }
  );

  // Fetch StorageClasses
  const [storageClasses, { refetch: refetchSC }] = createResource(async () => {
    try {
      const response = await fetch('/api/storage/storageclasses');
      if (!response.ok) throw new Error('Failed to fetch StorageClasses');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to fetch StorageClasses:', err);
      return [];
    }
  });

  // YAML resource
  const [yamlContent] = createResource(
    () => yamlKey(),
    async (key) => {
      if (!key) return '';
      const [type, name, ns] = key.split('|');
      if (!type || !name) return '';
      try {
        if (type === 'pv') {
          const data = await api.getPVYAML(name);
          return data.yaml || '';
        } else if (type === 'pvc') {
          const data = await api.getPVCYAML(name, ns || 'default');
          return data.yaml || '';
        } else if (type === 'sc') {
          const data = await api.getStorageClassYAML(name);
          return data.yaml || '';
        }
        return '';
      } catch (error) {
        console.error('Failed to fetch storage YAML:', error);
        addNotification(`Failed to load YAML: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        return '';
      }
    }
  );

  const handleSaveYAML = async (yaml: string) => {
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

    if (activeTab() === 'pvs' && selectedPV()) {
      const pv = selectedPV()!;
      startExecution({
        label: `Apply PersistentVolume YAML: ${pv.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'apply',
        kubernetesEquivalent: true,
        namespace: '', // PV is cluster-scoped
        context: status.context,
        userAction: 'storage-pv-apply-yaml',
        dryRun: false,
        allowClusterWide: true,
        resource: 'pv',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
      setShowEdit(false);
      setTimeout(() => refetchPVs(), 1500);
    } else if (activeTab() === 'pvcs' && selectedPVC()) {
      const pvc = selectedPVC()!;
      startExecution({
        label: `Apply PVC YAML: ${pvc.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'apply',
        kubernetesEquivalent: true,
        namespace: pvc.namespace || 'default',
        context: status.context,
        userAction: 'storage-pvc-apply-yaml',
        dryRun: false,
        allowClusterWide: false,
        resource: 'pvc',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
      setShowEdit(false);
      setTimeout(() => refetchPVCs(), 1500);
    } else if (activeTab() === 'storageclasses' && selectedSC()) {
      const sc = selectedSC()!;
      startExecution({
        label: `Apply StorageClass YAML: ${sc.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'apply',
        kubernetesEquivalent: true,
        namespace: '',
        context: status.context,
        userAction: 'storage-sc-apply-yaml',
        dryRun: false,
        allowClusterWide: true,
        resource: 'storageclasses',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
      setShowEdit(false);
      setTimeout(() => refetchSC(), 1500);
    }
  };

  const handleDelete = async (type: 'pv' | 'pvc' | 'sc', name: string, ns?: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      if (type === 'pv') {
        await api.deletePV(name);
        addNotification(`✅ PersistentVolume ${name} deleted successfully`, 'success');
        refetchPVs();
      } else if (type === 'pvc') {
        await api.deletePersistentVolumeClaim(ns || 'default', name);
        addNotification(`✅ PersistentVolumeClaim ${name} deleted successfully`, 'success');
        refetchPVCs();
      } else if (type === 'sc') {
        await api.deleteStorageClass(name);
        addNotification(`✅ StorageClass ${name} deleted successfully`, 'success');
        refetchSC();
      }
    } catch (err) {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleBulkDeletePVC = async () => {
    const itemsToDelete = bulkPVC.getSelectedItems(pvcs() || []);
    try {
      await Promise.all(
        itemsToDelete.map(pvc => api.deletePersistentVolumeClaim(pvc.namespace || 'default', pvc.name))
      );
      addNotification(`Successfully deleted ${itemsToDelete.length} PersistentVolumeClaim(s)`, 'success');
      bulkPVC.deselectAll();
      refetchPVCs();
    } catch (error) {
      console.error('Failed to delete PVCs:', error);
      addNotification(`Failed to delete PVCs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Storage</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage PersistentVolumes, PersistentVolumeClaims, and StorageClasses</p>
        </div>
        <div class="flex items-center gap-2">
          {/* Font Size Selector */}
          <select
            value={fontSize()}
            onChange={(e) => handleFontSizeChange(parseInt(e.currentTarget.value))}
            class="px-3 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            title="Font Size"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
          </select>

          {/* Font Style Selector */}
          <select
            value={fontFamily()}
            onChange={(e) => handleFontFamilyChange(e.currentTarget.value)}
            class="px-3 py-2 rounded-lg text-sm font-bold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            title="Font Style"
          >
            <option value="Monospace">Monospace</option>
            <option value="System-ui">System-ui</option>
            <option value="Monaco">Monaco</option>
            <option value="Consolas">Consolas</option>
            <option value="Courier">Courier</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('pvs')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'pvs' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'pvs' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'pvs' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          PersistentVolumes ({pvs()?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('pvcs')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'pvcs' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'pvcs' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'pvcs' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          PersistentVolumeClaims ({pvcs()?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('storageclasses')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'storageclasses' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'storageclasses' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'storageclasses' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          StorageClasses ({storageClasses()?.length || 0})
        </button>
      </div>

      {/* Content */}
      <Show when={activeTab() === 'pvs'}>
        <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
          <Show when={pvs.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading PersistentVolumes...</span>
            </div>
          </Show>
          <Show when={!pvs.loading && (!pvs() || pvs().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No PersistentVolumes found</p>
            </div>
          </Show>
          <Show when={!pvs.loading && pvs() && pvs().length > 0}>
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
                  <tr style={getTableHeaderRowStyle(fontSize())}>
                    <th class="cursor-pointer select-none whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>
                      <div class="flex items-center gap-1">Name</div>
                    </th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Capacity</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Access Modes</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Reclaim Policy</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Status</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Storage Class</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Claim</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pvs()}>
                    {(pv: any) => {
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
                        }}>{pv.name}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pv.capacity || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{Array.isArray(pv.accessModes) ? pv.accessModes.join(', ') : pv.accessModes || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pv.reclaimPolicy || 'N/A'}</td>
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
                          <span
                            class="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              background: pv.status === 'Bound' ? '#10b98120' : pv.status === 'Available' ? '#3b82f620' : '#ef444420',
                              color: pv.status === 'Bound' ? '#10b981' : pv.status === 'Available' ? '#3b82f6' : '#ef4444',
                            }}
                          >
                            {pv.status || 'Unknown'}
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
                        }}>{pv.storageClass || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pv.claim || '-'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedPV(pv); setYamlKey(`pv|${pv.name}|`); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedPV(pv); setYamlKey(`pv|${pv.name}|`); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('pv', pv.name), variant: 'danger', divider: true },
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
          </Show>
        </div>
      </Show>

      <Show when={activeTab() === 'pvcs'}>
        <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
          <Show when={pvcs.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading PersistentVolumeClaims...</span>
            </div>
          </Show>
          <Show when={!pvcs.loading && (!pvcs() || (Array.isArray(pvcs()) && pvcs().length === 0))}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No PersistentVolumeClaims found</p>
            </div>
          </Show>
          <Show when={!pvcs.loading && pvcs() && Array.isArray(pvcs()) && pvcs().length > 0}>
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
                  <tr style={getTableHeaderRowStyle(fontSize())}>
                    <th class="whitespace-nowrap" style={{ ...getTableHeaderCellStyle(fontSize()), width: '40px', padding: '0 8px' }}>
                      <SelectAllCheckbox
                        checked={bulkPVC.selectedCount() === (pvcs() || []).length && (pvcs() || []).length > 0}
                        indeterminate={bulkPVC.selectedCount() > 0 && bulkPVC.selectedCount() < (pvcs() || []).length}
                        onChange={() => {
                          if (bulkPVC.selectedCount() === (pvcs() || []).length) {
                            bulkPVC.deselectAll();
                          } else {
                            bulkPVC.selectAll(pvcs() || []);
                          }
                        }}
                      />
                    </th>
                    <th class="cursor-pointer select-none whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>
                      <div class="flex items-center gap-1">Name</div>
                    </th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Namespace</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Status</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Volume</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Capacity</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Access Modes</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Storage Class</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pvcs()}>
                    {(pvc: any) => {
                      const textColor = '#0ea5e9';
                      return (
                      <tr>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'center',
                          width: '40px',
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>
                          <SelectionCheckbox
                            checked={bulkPVC.isSelected(pvc)}
                            onChange={() => bulkPVC.toggleSelection(pvc)}
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
                        }}>{pvc.name}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pvc.namespace || 'default'}</td>
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
                          <span
                            class="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              background: pvc.status === 'Bound' ? '#10b98120' : '#ef444420',
                              color: pvc.status === 'Bound' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {pvc.status || 'Unknown'}
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
                        }}>{pvc.volume || '-'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pvc.capacity || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{Array.isArray(pvc.accessModes) ? pvc.accessModes.join(', ') : pvc.accessModes || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{pvc.storageClass || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedPVC(pvc); setYamlKey(`pvc|${pvc.name}|${pvc.namespace}`); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedPVC(pvc); setYamlKey(`pvc|${pvc.name}|${pvc.namespace}`); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('pvc', pvc.name, pvc.namespace), variant: 'danger', divider: true },
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
          </Show>
        </div>
      </Show>

      <Show when={activeTab() === 'storageclasses'}>
        <div class="w-full" style={{ background: getThemeBackground(), margin: '0', padding: '0', border: `1px solid ${getThemeBorderColor()}`, 'border-radius': '4px' }}>
          <Show when={storageClasses.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading StorageClasses...</span>
            </div>
          </Show>
          <Show when={!storageClasses.loading && (!storageClasses() || storageClasses().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No StorageClasses found</p>
            </div>
          </Show>
          <Show when={!storageClasses.loading && storageClasses() && storageClasses().length > 0}>
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
                  <tr style={getTableHeaderRowStyle(fontSize())}>
                    <th class="cursor-pointer select-none whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>
                      <div class="flex items-center gap-1">Name</div>
                    </th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Provisioner</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Reclaim Policy</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Volume Binding Mode</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Allow Volume Expansion</th>
                    <th class="whitespace-nowrap" style={getTableHeaderCellStyle(fontSize())}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={storageClasses()}>
                    {(sc: any) => {
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
                        }}>{sc.name}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sc.provisioner || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sc.reclaimPolicy || 'N/A'}</td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          color: textColor,
                          'font-weight': '900',
                          'font-size': `${fontSize()}px`,
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>{sc.volumeBindingMode || 'N/A'}</td>
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
                          {sc.allowVolumeExpansion ? (
                            <span class="text-green-500">Yes</span>
                          ) : (
                            <span class="text-gray-500">No</span>
                          )}
                        </td>
                        <td style={{
                          padding: '0 8px',
                          'text-align': 'left',
                          height: `${Math.max(24, fontSize() * 1.7)}px`,
                          'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                          border: 'none'
                        }}>
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedSC(sc); setYamlKey(`sc|${sc.name}|`); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedSC(sc); setYamlKey(`sc|${sc.name}|`); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('sc', sc.name), variant: 'danger', divider: true },
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
          </Show>
        </div>
      </Show>

      {/* YAML Viewer Modal */}
      <Modal
        isOpen={showYaml()}
        size="large"
        title={`View YAML - ${activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name || ''}`}
        onClose={() => { setShowYaml(false); setSelectedPV(null); setSelectedPVC(null); setSelectedSC(null); setYamlKey(null); }}
      >
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading YAML...</span>
            </div>
          }
        >
          <YAMLViewer yaml={yamlContent() || ''} title={activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name} />
        </Show>
      </Modal>

      {/* YAML Editor Modal */}
      <Modal
        isOpen={showEdit()}
        size="large"
        title={`Edit YAML - ${activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name || ''}`}
        onClose={() => { setShowEdit(false); setSelectedPV(null); setSelectedPVC(null); setSelectedSC(null); setYamlKey(null); }}
      >
        <Show 
          when={!yamlContent.loading && yamlContent()} 
          fallback={
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading YAML...</span>
            </div>
          }
        >
          <div style={{ height: '70vh' }}>
            <YAMLEditor
              yaml={yamlContent() || ''}
              title={activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name}
              onSave={handleSaveYAML}
              onCancel={() => { setShowEdit(false); setSelectedPV(null); setSelectedPVC(null); setSelectedSC(null); setYamlKey(null); }}
            />
          </div>
        </Show>
      </Modal>

      {/* Bulk Actions Bar for PVCs */}
      <Show when={activeTab() === 'pvcs'}>
        <BulkActions
          selectedCount={bulkPVC.selectedCount()}
          totalCount={(pvcs() || []).length}
          onSelectAll={() => bulkPVC.selectAll(pvcs() || [])}
          onDeselectAll={() => bulkPVC.deselectAll()}
          onDelete={() => setShowBulkDeleteModalPVC(true)}
          resourceType="PVCs"
        />

        {/* Bulk Delete Modal for PVCs */}
        <BulkDeleteModal
          isOpen={showBulkDeleteModalPVC()}
          onClose={() => setShowBulkDeleteModalPVC(false)}
          onConfirm={handleBulkDeletePVC}
          resourceType="PersistentVolumeClaims"
          selectedItems={bulkPVC.getSelectedItems(pvcs() || [])}
        />
      </Show>
    </div>
  );
};

export default Storage;

