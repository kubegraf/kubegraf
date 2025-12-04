import { Component, For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import ActionMenu from '../components/ActionMenu';

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
  const [yamlContent, setYamlContent] = createSignal('');
  const [yamlLoading, setYamlLoading] = createSignal(false);

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
        const nsParam = ns === '_all' ? undefined : ns;
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

  // YAML handlers
  const loadYAML = async (type: 'pv' | 'pvc' | 'sc', name: string, ns?: string) => {
    setYamlLoading(true);
    try {
      let yaml = '';
      if (type === 'pv') {
        const data = await api.getPVYAML(name);
        yaml = data.yaml || '';
      } else if (type === 'pvc') {
        const data = await api.getPVCYAML(name, ns || 'default');
        yaml = data.yaml || '';
      } else if (type === 'sc') {
        const data = await api.getStorageClassYAML(name);
        yaml = data.yaml || '';
      }
      setYamlContent(yaml);
    } catch (err) {
      addNotification(`Failed to load YAML: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setYamlLoading(false);
    }
  };

  const handleSaveYAML = async (yaml: string) => {
    try {
      if (activeTab() === 'pvs' && selectedPV()) {
        await api.updatePV(selectedPV().name, yaml);
        addNotification(`✅ PersistentVolume ${selectedPV().name} updated successfully`, 'success');
        refetchPVs();
      } else if (activeTab() === 'pvcs' && selectedPVC()) {
        await api.updatePVC(selectedPVC().name, selectedPVC().namespace || 'default', yaml);
        addNotification(`✅ PersistentVolumeClaim ${selectedPVC().name} updated successfully`, 'success');
        refetchPVCs();
      } else if (activeTab() === 'storageclasses' && selectedSC()) {
        await api.updateStorageClass(selectedSC().name, yaml);
        addNotification(`✅ StorageClass ${selectedSC().name} updated successfully`, 'success');
        refetchSC();
      }
      setShowEdit(false);
    } catch (err) {
      addNotification(`❌ Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      throw err;
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
        await api.deletePVC(name, ns || 'default');
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
        <div class="card overflow-hidden">
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
            <div class="overflow-x-auto">
              <table class="w-full" style={{ 'font-family': getFontFamilyCSS() }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Capacity</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Access Modes</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Reclaim Policy</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Storage Class</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Claim</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pvs()}>
                    {(pv: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{pv.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pv.capacity || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{Array.isArray(pv.accessModes) ? pv.accessModes.join(', ') : pv.accessModes || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pv.reclaimPolicy || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
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
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pv.storageClass || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pv.claim || '-'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedPV(pv); loadYAML('pv', pv.name); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedPV(pv); loadYAML('pv', pv.name); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('pv', pv.name), variant: 'danger', divider: true },
                            ]}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={activeTab() === 'pvcs'}>
        <div class="card overflow-hidden">
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
            <div class="overflow-x-auto">
              <table class="w-full" style={{ 'font-family': getFontFamilyCSS() }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Status</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Volume</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Capacity</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Access Modes</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Storage Class</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pvcs()}>
                    {(pvc: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{pvc.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pvc.namespace || 'default'}</td>
                        <td class="px-4 py-3 text-sm">
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
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pvc.volume || '-'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pvc.capacity || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{Array.isArray(pvc.accessModes) ? pvc.accessModes.join(', ') : pvc.accessModes || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{pvc.storageClass || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedPVC(pvc); loadYAML('pvc', pvc.name, pvc.namespace); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedPVC(pvc); loadYAML('pvc', pvc.name, pvc.namespace); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('pvc', pvc.name, pvc.namespace), variant: 'danger', divider: true },
                            ]}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={activeTab() === 'storageclasses'}>
        <div class="card overflow-hidden">
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
            <div class="overflow-x-auto">
              <table class="w-full" style={{ 'font-family': getFontFamilyCSS() }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Provisioner</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Reclaim Policy</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Volume Binding Mode</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Allow Volume Expansion</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={storageClasses()}>
                    {(sc: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{sc.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{sc.provisioner || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{sc.reclaimPolicy || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{sc.volumeBindingMode || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {sc.allowVolumeExpansion ? (
                            <span class="text-green-500">Yes</span>
                          ) : (
                            <span class="text-gray-500">No</span>
                          )}
                        </td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedSC(sc); loadYAML('sc', sc.name); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedSC(sc); loadYAML('sc', sc.name); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('sc', sc.name), variant: 'danger', divider: true },
                            ]}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      {/* YAML Viewer Modal */}
      <Show when={showYaml()}>
        <Modal
          size="large"
          title={`View YAML - ${activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name}`}
          onClose={() => { setShowYaml(false); setSelectedPV(null); setSelectedPVC(null); setSelectedSC(null); }}
        >
          <Show when={yamlLoading()} fallback={<YAMLViewer content={yamlContent()} />}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading YAML...</span>
            </div>
          </Show>
        </Modal>
      </Show>

      {/* YAML Editor Modal */}
      <Show when={showEdit()}>
        <Modal
          size="large"
          title={`Edit YAML - ${activeTab() === 'pvs' ? selectedPV()?.name : activeTab() === 'pvcs' ? selectedPVC()?.name : selectedSC()?.name}`}
          onClose={() => { setShowEdit(false); setSelectedPV(null); setSelectedPVC(null); setSelectedSC(null); }}
        >
          <Show when={yamlLoading()} fallback={<YAMLEditor content={yamlContent()} onSave={handleSaveYAML} onCancel={() => setShowEdit(false)} />}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading YAML...</span>
            </div>
          </Show>
        </Modal>
      </Show>
    </div>
  );
};

export default Storage;

