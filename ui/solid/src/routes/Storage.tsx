import { Component, For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace, clusterStatus } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import DescribeModal from '../components/DescribeModal';
import ConfirmationModal from '../components/ConfirmationModal';
import RelatedResources from '../components/RelatedResources';
import ActionMenu from '../components/ActionMenu';
import { getThemeBackground, getThemeBorderColor } from '../utils/themeBackground';
import { getTableHeaderCellStyle, getTableHeaderRowStyle } from '../utils/tableCellStyles';
import { BulkActions, SelectionCheckbox, SelectAllCheckbox } from '../components/BulkActions';
import { BulkDeleteModal } from '../components/BulkDeleteModal';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { startExecution } from '../stores/executionPanel';
import { getInitialFontSize, getInitialFontFamily, getFontFamilyCSS, saveFontSize, saveFontFamily } from '../utils/resourceTableFontDefaults';

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
  const [showDetailsPV, setShowDetailsPV] = createSignal(false);
  const [showDetailsPVC, setShowDetailsPVC] = createSignal(false);
  const [showDescribe, setShowDescribe] = createSignal(false);
  const [showDeleteConfirmPV, setShowDeleteConfirmPV] = createSignal(false);
  const [showDeleteConfirmPVC, setShowDeleteConfirmPVC] = createSignal(false);
  const [deletingPV, setDeletingPV] = createSignal(false);
  const [deletingPVC, setDeletingPVC] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);

  // Bulk selection for PVCs
  const bulkPVC = useBulkSelection<PersistentVolumeClaim>();
  const [showBulkDeleteModalPVC, setShowBulkDeleteModalPVC] = createSignal(false);

  // Font size and family using shared utility with 14px and Monaco defaults
  const [fontSize, setFontSize] = createSignal(getInitialFontSize('storage'));

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    saveFontSize('storage', size);
  };

  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily('storage'));

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    saveFontFamily('storage', family);
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

  const handleDryRunYAML = async (yaml: string) => {
    const trimmed = yaml.trim();
    if (!trimmed) {
      const msg = 'YAML cannot be empty';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    const status = clusterStatus();
    if (!status?.connected) {
      const msg = 'Cluster is not connected. Connect to a cluster before running a dry run.';
      addNotification(msg, 'error');
      throw new Error(msg);
    }

    if (activeTab() === 'pvs' && selectedPV()) {
      const pv = selectedPV()!;
      startExecution({
        label: `Dry run PersistentVolume YAML: ${pv.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'dry-run',
        kubernetesEquivalent: true,
        namespace: '', // PV is cluster-scoped
        context: status.context,
        userAction: 'storage-pv-apply-yaml-dry-run',
        dryRun: true,
        allowClusterWide: true,
        resource: 'pv',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
    } else if (activeTab() === 'pvcs' && selectedPVC()) {
      const pvc = selectedPVC()!;
      startExecution({
        label: `Dry run PVC YAML: ${pvc.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'dry-run',
        kubernetesEquivalent: true,
        namespace: pvc.namespace || 'default',
        context: status.context,
        userAction: 'storage-pvc-apply-yaml-dry-run',
        dryRun: true,
        allowClusterWide: false,
        resource: 'pvc',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
    } else if (activeTab() === 'storageclasses' && selectedSC()) {
      const sc = selectedSC()!;
      startExecution({
        label: `Dry run StorageClass YAML: ${sc.name}`,
        command: '__k8s-apply-yaml',
        args: [],
        mode: 'dry-run',
        kubernetesEquivalent: true,
        namespace: '',
        context: status.context,
        userAction: 'storage-sc-apply-yaml-dry-run',
        dryRun: true,
        allowClusterWide: true,
        resource: 'storageclasses',
        action: 'update',
        intent: 'apply-yaml',
        yaml: trimmed,
      });
    }
  };

  const handleDeleteConfirmPV = async () => {
    const pv = selectedPV();
    if (!pv) return;
    
    setDeletingPV(true);
    try {
      await api.deletePV(pv.name);
      addNotification(`✅ PersistentVolume ${pv.name} deleted successfully`, 'success');
        refetchPVs();
      setSelectedPV(null);
      setShowDeleteConfirmPV(false);
      setShowDetailsPV(false);
    } catch (err) {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setDeletingPV(false);
    }
  };

  const handleDeleteConfirmPVC = async () => {
    const pvc = selectedPVC();
    if (!pvc) return;
    
    setDeletingPVC(true);
    try {
      await api.deletePersistentVolumeClaim(pvc.namespace || 'default', pvc.name);
      addNotification(`✅ PersistentVolumeClaim ${pvc.name} deleted successfully`, 'success');
        refetchPVCs();
      setSelectedPVC(null);
      setShowDeleteConfirmPVC(false);
      setShowDetailsPVC(false);
    } catch (err) {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setDeletingPVC(false);
    }
  };

  const handleDelete = (type: 'pv' | 'pvc' | 'sc', name: string, ns?: string) => {
    if (type === 'pv') {
      const pv = (pvs() || []).find((p: PersistentVolume) => p.name === name);
      if (pv) {
        setSelectedPV(pv);
        setShowDeleteConfirmPV(true);
      }
    } else if (type === 'pvc') {
      const pvc = (pvcs() || []).find((p: PersistentVolumeClaim) => p.name === name && p.namespace === ns);
      if (pvc) {
        setSelectedPVC(pvc);
        setShowDeleteConfirmPVC(true);
      }
      } else if (type === 'sc') {
      if (!confirm(`Are you sure you want to delete StorageClass ${name}?`)) return;
      api.deleteStorageClass(name).then(() => {
        addNotification(`✅ StorageClass ${name} deleted successfully`, 'success');
        refetchSC();
      }).catch((err) => {
      addNotification(`❌ Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      });
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
    <div class="space-y-2 max-w-full -mt-4 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header - reduced size */}
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 class="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Storage</h1>
          <p class="text-xs" style={{ color: 'var(--text-secondary)' }}>Manage PersistentVolumes, PersistentVolumeClaims, and StorageClasses</p>
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
                  'font-family': getFontFamilyCSS(fontFamily()),
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
                        }}>
                          <button
                            onClick={() => { setSelectedPV(pv); setShowDetailsPV(true); }}
                            class="font-medium hover:underline text-left"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {pv.name}
                          </button>
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
                              { label: 'Delete', icon: 'delete', onClick: () => { setSelectedPV(pv); handleDelete('pv', pv.name); }, variant: 'danger', divider: true },
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
                  'font-family': getFontFamilyCSS(fontFamily()),
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
                        }}>
                          <button
                            onClick={() => { setSelectedPVC(pvc); setShowDetailsPVC(true); }}
                            class="font-medium hover:underline text-left"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {pvc.name}
                          </button>
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
                              { label: 'Delete', icon: 'delete', onClick: () => { setSelectedPVC(pvc); handleDelete('pvc', pvc.name, pvc.namespace); }, variant: 'danger', divider: true },
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
                  'font-family': getFontFamilyCSS(fontFamily()),
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
              onDryRun={handleDryRunYAML}
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

      {/* PV Details Modal */}
      <Modal isOpen={showDetailsPV()} onClose={() => { setShowDetailsPV(false); setSelectedPV(null); }} title={`PersistentVolume: ${selectedPV()?.name}`} size="xl">
        <Show when={selectedPV()}>
          {(() => {
            const [pvDetails] = createResource(
              () => selectedPV() ? selectedPV()!.name : null,
              async (name) => {
                if (!name) return null;
                return api.getPVDetails(name);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Capacity</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => details().capacity || selectedPV()?.capacity || '-'}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
      </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => details().status || selectedPV()?.status || '-'}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Reclaim Policy</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => details().reclaimPolicy || selectedPV()?.reclaimPolicy || '-'}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Storage Class</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => details().storageClass || selectedPV()?.storageClass || '-'}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Access Modes</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm">
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => (details().accessModes || selectedPV()?.accessModes || []).join(', ') || '-'}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Claim</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm">
                        <Show when={!pvDetails.loading && pvDetails()}>
                          {(details) => {
                            const claim = details().claim;
                            const claimNs = details().claimNamespace;
                            return claim ? (claimNs ? `${claimNs}/${claim}` : claim) : selectedPV()?.claim || '-';
                          }}
                        </Show>
                        <Show when={pvDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPV()?.age || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Related Resources Section */}
                <Show when={pvDetails()}>
                  <RelatedResources
                    kind="persistentvolume"
                    name={pvDetails()!.name}
                    namespace=""
                    relatedData={pvDetails()}
                  />
                </Show>

                {/* Actions */}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                  <button
                    onClick={() => { setShowDetailsPV(false); setSelectedPV(selectedPV()!); setYamlKey(`pv|${selectedPV()!.name}|`); setShowYaml(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="YAML"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>YAML</span>
                  </button>
                  <button
                    onClick={() => { setShowDetailsPV(false); setSelectedPV(selectedPV()!); setShowDescribe(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Describe"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Describe</span>
                  </button>
                  <button
                    onClick={() => { setShowDetailsPV(false); setSelectedPV(selectedPV()!); setYamlKey(`pv|${selectedPV()!.name}|`); setShowEdit(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('pv', selectedPV()!.name);
                    }}
                    class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* PVC Details Modal */}
      <Modal isOpen={showDetailsPVC()} onClose={() => { setShowDetailsPVC(false); setSelectedPVC(null); }} title={`PersistentVolumeClaim: ${selectedPVC()?.name}`} size="xl">
        <Show when={selectedPVC()}>
          {(() => {
            const [pvcDetails] = createResource(
              () => selectedPVC() ? { name: selectedPVC()!.name, ns: selectedPVC()!.namespace } : null,
              async (params) => {
                if (!params) return null;
                return api.getPVCDetails(params.name, params.ns);
              }
            );
            return (
              <div class="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 class="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Basic Information</h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvcDetails.loading && pvcDetails()}>
                          {(details) => details().status || selectedPVC()?.status || '-'}
                        </Show>
                        <Show when={pvcDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Capacity</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvcDetails.loading && pvcDetails()}>
                          {(details) => details().capacity || selectedPVC()?.capacity || '-'}
                        </Show>
                        <Show when={pvcDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Storage Class</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        <Show when={!pvcDetails.loading && pvcDetails()}>
                          {(details) => details().storageClass || selectedPVC()?.storageClass || '-'}
                        </Show>
                        <Show when={pvcDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Volume</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm break-all">
                        <Show when={!pvcDetails.loading && pvcDetails()}>
                          {(details) => details().volume || selectedPVC()?.volume || '-'}
                        </Show>
                        <Show when={pvcDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg col-span-2" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Access Modes</div>
                      <div style={{ color: 'var(--text-primary)' }} class="text-sm">
                        <Show when={!pvcDetails.loading && pvcDetails()}>
                          {(details) => (details().accessModes || selectedPVC()?.accessModes || []).join(', ') || '-'}
                        </Show>
                        <Show when={pvcDetails.loading}>
                          <div class="spinner" style={{ width: '16px', height: '16px' }} />
                        </Show>
                      </div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Age</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPVC()?.age || '-'}</div>
                    </div>
                    <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                      <div style={{ color: 'var(--text-primary)' }}>{selectedPVC()?.namespace}</div>
                    </div>
                  </div>
                </div>

                {/* Related Resources Section */}
                <Show when={pvcDetails()}>
                  <RelatedResources
                    kind="persistentvolumeclaim"
                    name={pvcDetails()!.name}
                    namespace={pvcDetails()!.namespace}
                    relatedData={pvcDetails()}
                  />
                </Show>

                {/* Actions */}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                  <button
                    onClick={() => { setShowDetailsPVC(false); setSelectedPVC(selectedPVC()!); setYamlKey(`pvc|${selectedPVC()!.name}|${selectedPVC()!.namespace}`); setShowYaml(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="YAML"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>YAML</span>
                  </button>
                  <button
                    onClick={() => { setShowDetailsPVC(false); setSelectedPVC(selectedPVC()!); setShowDescribe(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Describe"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Describe</span>
                  </button>
                  <button
                    onClick={() => { setShowDetailsPVC(false); setSelectedPVC(selectedPVC()!); setYamlKey(`pvc|${selectedPVC()!.name}|${selectedPVC()!.namespace}`); setShowEdit(true); }}
                    class="btn-secondary flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('pvc', selectedPVC()!.name, selectedPVC()!.namespace);
                    }}
                    class="btn-danger flex flex-col items-center justify-center gap-1 px-2 py-2 rounded text-xs"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </Show>
      </Modal>

      {/* Describe Modal for PV */}
      <Show when={showDescribe() && activeTab() === 'pvs' && selectedPV()}>
        {(() => {
          const [describe] = createResource(
            () => selectedPV() ? selectedPV()!.name : null,
            async (name) => {
              if (!name) return null;
              const result = await api.getPVDescribe(name);
              return result.describe || '';
            }
          );
          return (
            <Modal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} title={`Describe: ${selectedPV()?.name}`} size="xl">
              <div class="flex flex-col h-[60vh]">
                <div class="flex items-center justify-end gap-2 mb-2">
                  <button
                    onClick={async () => {
                      const text = describe() || '';
                      await navigator.clipboard.writeText(text);
                      addNotification('Copied to clipboard', 'success');
                    }}
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div
                  class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"
                  style={{
                    background: '#0d1117',
                    color: '#c9d1d9',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Show
                    when={!describe.loading}
                    fallback={
                      <div class="flex items-center justify-center h-full">
                        <div class="spinner" />
                      </div>
                    }
                  >
                    <Show when={describe.error}>
                      <div class="text-red-400">Error: {describe.error?.message}</div>
                    </Show>
                    <pre class="whitespace-pre-wrap">{describe() || ''}</pre>
                  </Show>
                </div>
              </div>
            </Modal>
          );
        })()}
      </Show>

      {/* Describe Modal for PVC */}
      <Show when={showDescribe() && activeTab() === 'pvcs' && selectedPVC()}>
        {(() => {
          const [describe] = createResource(
            () => selectedPVC() ? { name: selectedPVC()!.name, ns: selectedPVC()!.namespace } : null,
            async (params) => {
              if (!params) return null;
              const result = await api.getPVCDescribe(params.name, params.ns);
              return result.describe || '';
            }
          );
          return (
            <Modal isOpen={showDescribe()} onClose={() => setShowDescribe(false)} title={`Describe: ${selectedPVC()?.name}`} size="xl">
              <div class="flex flex-col h-[60vh]">
                <div class="flex items-center justify-end gap-2 mb-2">
                  <button
                    onClick={async () => {
                      const text = describe() || '';
                      await navigator.clipboard.writeText(text);
                      addNotification('Copied to clipboard', 'success');
                    }}
                    class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div
                  class="flex-1 font-mono text-sm p-4 rounded-lg overflow-auto"
                  style={{
                    background: '#0d1117',
                    color: '#c9d1d9',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <Show
                    when={!describe.loading}
                    fallback={
                      <div class="flex items-center justify-center h-full">
                        <div class="spinner" />
                      </div>
                    }
                  >
                    <Show when={describe.error}>
                      <div class="text-red-400">Error: {describe.error?.message}</div>
                    </Show>
                    <pre class="whitespace-pre-wrap">{describe() || ''}</pre>
                  </Show>
                </div>
              </div>
            </Modal>
          );
        })()}
      </Show>

      {/* Delete Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirmPV()}
        onClose={() => {
          if (!deletingPV()) {
            setShowDeleteConfirmPV(false);
            setShowDetailsPV(false);
          }
        }}
        title="Delete PersistentVolume"
        message={selectedPV() ? `Are you sure you want to delete the PersistentVolume "${selectedPV()!.name}"?` : 'Are you sure you want to delete this PersistentVolume?'}
        details={selectedPV() ? [
          { label: 'Name', value: selectedPV()!.name },
          { label: 'Status', value: selectedPV()!.status },
        ] : undefined}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingPV()}
        onConfirm={handleDeleteConfirmPV}
        size="sm"
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmPVC()}
        onClose={() => {
          if (!deletingPVC()) {
            setShowDeleteConfirmPVC(false);
            setShowDetailsPVC(false);
          }
        }}
        title="Delete PersistentVolumeClaim"
        message={selectedPVC() ? `Are you sure you want to delete the PersistentVolumeClaim "${selectedPVC()!.name}"?` : 'Are you sure you want to delete this PersistentVolumeClaim?'}
        details={selectedPVC() ? [
          { label: 'Name', value: selectedPVC()!.name },
          { label: 'Namespace', value: selectedPVC()!.namespace },
        ] : undefined}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
        loading={deletingPVC()}
        onConfirm={handleDeleteConfirmPVC}
        size="sm"
      />
    </div>
  );
};

export default Storage;

