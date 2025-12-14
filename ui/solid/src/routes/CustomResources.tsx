import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import ActionMenu from '../components/ActionMenu';

interface CRD {
  name: string;
  group: string;
  version: string;
  kind: string;
  scope: string;
  instances: number;
  namespaces: string[];
  age: string;
}

interface CRInstance {
  name: string;
  namespace: string;
  kind: string;
  group: string;
  version: string;
  age: string;
  status?: Record<string, any>;
  labels?: Record<string, string>;
}

const CustomResources: Component = () => {
  const [selectedCRD, setSelectedCRD] = createSignal<CRD | null>(null);
  const [selectedInstance, setSelectedInstance] = createSignal<CRInstance | null>(null);
  const [showInstances, setShowInstances] = createSignal(false);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  const [yamlContent, setYamlContent] = createSignal('');
  const [yamlLoading, setYamlLoading] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'crds' | 'instances'>('crds');

  const [crds, { refetch: refetchCRDs }] = createResource(async () => {
    try {
      const response = await fetch('/api/crds');
      if (!response.ok) throw new Error('Failed to fetch CRDs');
      return await response.json();
    } catch (err: any) {
      addNotification(`Failed to load CRDs: ${err.message}`, 'error');
      return [];
    }
  });

  const [instances, { refetch: refetchInstances }] = createResource(
    () => selectedCRD()?.name,
    async (crdName) => {
      if (!crdName) return [];
      try {
        const params = new URLSearchParams({ crd: crdName });
        const ns = namespace();
        if (ns && ns !== 'All Namespaces') {
          params.append('namespace', ns);
        }
        const response = await fetch(`/api/crd/instances?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch instances');
        return await response.json();
      } catch (err: any) {
        addNotification(`Failed to load instances: ${err.message}`, 'error');
        return [];
      }
    }
  );

  const handleViewInstances = (crd: CRD) => {
    setSelectedCRD(crd);
    setShowInstances(true);
    setActiveTab('instances');
  };

  const loadYAML = async (instance: CRInstance, crd: CRD) => {
    setYamlLoading(true);
    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name,
      });
      if (instance.namespace) {
        params.append('namespace', instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/yaml?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch YAML');
      const yaml = await response.text();
      setYamlContent(yaml);
    } catch (err: any) {
      addNotification(`Failed to load YAML: ${err.message}`, 'error');
      setYamlContent('');
    } finally {
      setYamlLoading(false);
    }
  };

  const handleViewYAML = async (instance: CRInstance, crd: CRD) => {
    setSelectedInstance(instance);
    setShowYaml(true);
    await loadYAML(instance, crd);
  };

  const handleEditYAML = async (instance: CRInstance, crd: CRD) => {
    setSelectedInstance(instance);
    setShowEdit(true);
    await loadYAML(instance, crd);
  };

  const handleSaveYAML = async (yaml: string) => {
    const instance = selectedInstance();
    const crd = selectedCRD();
    if (!instance || !crd) return;

    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name,
      });
      if (instance.namespace) {
        params.append('namespace', instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/update?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/yaml' },
        body: yaml,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(errorData.error || 'Update failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Update failed');
      }

      addNotification(`Successfully updated ${instance.name}`, 'success');
      setShowEdit(false);
      refetchInstances();
    } catch (err: any) {
      addNotification(`Failed to update: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (instance: CRInstance, crd: CRD) => {
    if (!confirm(`Are you sure you want to delete ${instance.name}?`)) {
      return;
    }

    try {
      const params = new URLSearchParams({
        crd: crd.name,
        name: instance.name,
      });
      if (instance.namespace) {
        params.append('namespace', instance.namespace);
      }
      const response = await fetch(`/api/crd/instance/delete?${params.toString()}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      addNotification(`Successfully deleted ${instance.name}`, 'success');
      refetchInstances();
    } catch (err: any) {
      addNotification(`Failed to delete: ${err.message}`, 'error');
    }
  };

  return (
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Custom Resources</h1>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage CustomResourceDefinitions and their instances</p>
        </div>
        <div class="flex gap-2">
          <button
            onClick={() => {
              if (activeTab() === 'crds') {
                refetchCRDs();
              } else {
                refetchInstances();
              }
            }}
            class="px-4 py-2 rounded-md text-sm font-semibold transition-all"
            style={{
              background: 'var(--accent-primary)',
              color: '#000000',
              border: '2px solid var(--accent-primary)',
              'box-shadow': '0 2px 4px rgba(6, 182, 212, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(6, 182, 212, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(6, 182, 212, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div class="mb-4 flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button
          onClick={() => {
            setActiveTab('crds');
            setShowInstances(false);
            setSelectedCRD(null);
          }}
          class="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab() === 'crds' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom': activeTab() === 'crds' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            opacity: activeTab() === 'crds' ? 1 : 0.7,
          }}
          onMouseEnter={(e) => {
            if (activeTab() !== 'crds') {
              e.currentTarget.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab() !== 'crds') {
              e.currentTarget.style.opacity = '0.7';
            }
          }}
        >
          CRDs ({crds()?.length || 0})
        </button>
        <Show when={selectedCRD()}>
          <button
            onClick={() => setActiveTab('instances')}
            class="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab() === 'instances' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              'border-bottom': activeTab() === 'instances' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              opacity: activeTab() === 'instances' ? 1 : 0.7,
            }}
            onMouseEnter={(e) => {
              if (activeTab() !== 'instances') {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab() !== 'instances') {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            Instances ({instances()?.length || 0})
          </button>
        </Show>
      </div>

      {/* CRDs Tab */}
      <Show when={activeTab() === 'crds'}>
        <Show when={!crds.loading} fallback={
          <div class="text-center py-12">
            <div 
              class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ 'border-color': 'var(--accent-primary)' }}
            ></div>
            <p class="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading CRDs...</p>
          </div>
        }>
          <Show when={(crds() || []).length > 0} fallback={
            <div class="text-center py-12">
              <p class="text-lg" style={{ color: 'var(--text-secondary)' }}>No CustomResourceDefinitions found</p>
            </div>
          }>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Group</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Version</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Kind</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Scope</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Instances</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={crds()}>
                    {(crd) => (
                      <tr 
                        class="border-b transition-colors"
                        style={{ 'border-color': 'var(--border-color)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td class="py-3 px-4">
                          <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{crd.name}</div>
                        </td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{crd.group}</td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{crd.version}</td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{crd.kind}</td>
                        <td class="py-3 px-4 text-sm">
                          <span 
                            class="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              background: crd.scope === 'Namespaced' 
                                ? 'rgba(6, 182, 212, 0.2)' 
                                : 'rgba(168, 85, 247, 0.2)',
                              color: crd.scope === 'Namespaced' 
                                ? 'var(--accent-primary)' 
                                : '#a855f7',
                            }}
                          >
                            {crd.scope}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>{crd.instances}</td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{crd.age}</td>
                        <td class="py-3 px-4">
                          <ActionMenu
                            actions={[
                              {
                                label: 'View Instances',
                                icon: 'details',
                                onClick: () => handleViewInstances(crd),
                              },
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
        </Show>
      </Show>

      {/* Instances Tab */}
      <Show when={activeTab() === 'instances' && selectedCRD()}>
        <div class="mb-4">
          <button
            onClick={() => {
              setActiveTab('crds');
              setShowInstances(false);
              setSelectedCRD(null);
            }}
            class="text-sm mb-4 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ← Back to CRDs
          </button>
          <h2 class="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Instances of {selectedCRD()?.kind} ({selectedCRD()?.name})
          </h2>
        </div>
        <Show when={!instances.loading} fallback={
          <div class="text-center py-12">
            <div 
              class="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ 'border-color': 'var(--accent-primary)' }}
            ></div>
            <p class="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading instances...</p>
          </div>
        }>
          <Show when={(instances() || []).length > 0} fallback={
            <div class="text-center py-12">
              <p class="text-lg" style={{ color: 'var(--text-secondary)' }}>No instances found</p>
            </div>
          }>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b" style={{ 'border-color': 'var(--border-color)' }}>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={instances()}>
                    {(instance) => (
                      <tr 
                        class="border-b transition-colors"
                        style={{ 'border-color': 'var(--border-color)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td class="py-3 px-4">
                          <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{instance.name}</div>
                        </td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{instance.namespace || '-'}</td>
                        <td class="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{instance.age}</td>
                        <td class="py-3 px-4">
                          <ActionMenu
                            actions={[
                              {
                                label: 'View YAML',
                                icon: 'yaml',
                                onClick: () => handleViewYAML(instance, selectedCRD()!),
                              },
                              {
                                label: 'Edit YAML',
                                icon: 'edit',
                                onClick: () => handleEditYAML(instance, selectedCRD()!),
                              },
                              {
                                label: 'Delete',
                                icon: 'delete',
                                onClick: () => handleDelete(instance, selectedCRD()!),
                                variant: 'danger',
                                divider: true,
                              },
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
        </Show>
      </Show>

      <Show when={showYaml() && selectedInstance()}>
        <Modal
          isOpen={showYaml()}
          onClose={() => {
            setShowYaml(false);
            setYamlContent('');
            setSelectedInstance(null);
          }}
          title={`${selectedCRD()?.kind}: ${selectedInstance()?.name}`}
        >
          <Show when={yamlLoading()} fallback={<YAMLViewer content={yamlContent()} />}>
            <div class="text-center py-8">
              <div 
                class="inline-block animate-spin rounded-full h-6 w-6 border-b-2"
                style={{ 'border-color': 'var(--accent-primary)' }}
              ></div>
            </div>
          </Show>
        </Modal>
      </Show>

      <Show when={showEdit() && selectedInstance()}>
        <Modal
          isOpen={showEdit()}
          onClose={() => {
            setShowEdit(false);
            setYamlContent('');
            setSelectedInstance(null);
          }}
          title={`Edit ${selectedCRD()?.kind}: ${selectedInstance()?.name}`}
        >
          <Show when={yamlLoading()} fallback={<YAMLEditor yaml={yamlContent()} onSave={handleSaveYAML} onCancel={() => setShowEdit(false)} />}>
            <div class="text-center py-8">
              <div 
                class="inline-block animate-spin rounded-full h-6 w-6 border-b-2"
                style={{ 'border-color': 'var(--accent-primary)' }}
              ></div>
            </div>
          </Show>
        </Modal>
      </Show>
    </div>
  );
};

export default CustomResources;

