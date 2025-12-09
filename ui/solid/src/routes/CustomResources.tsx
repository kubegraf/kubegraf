import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
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

  const handleViewYAML = async (instance: CRInstance, crd: CRD) => {
    setSelectedInstance(instance);
    setYamlLoading(true);
    setShowYaml(true);
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

  return (
    <div class="p-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-1">Custom Resources</h1>
          <p class="text-sm opacity-70">Manage CustomResourceDefinitions and their instances</p>
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
            class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div class="mb-4 flex gap-2 border-b border-white/10">
        <button
          onClick={() => {
            setActiveTab('crds');
            setShowInstances(false);
            setSelectedCRD(null);
          }}
          class={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab() === 'crds'
              ? 'border-b-2 border-blue-500 text-blue-400'
              : 'opacity-70 hover:opacity-100'
          }`}
        >
          CRDs ({crds()?.length || 0})
        </button>
        <Show when={selectedCRD()}>
          <button
            onClick={() => setActiveTab('instances')}
            class={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab() === 'instances'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Instances ({instances()?.length || 0})
          </button>
        </Show>
      </div>

      {/* CRDs Tab */}
      <Show when={activeTab() === 'crds'}>
        <Show when={!crds.loading} fallback={
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p class="mt-4 text-sm opacity-70">Loading CRDs...</p>
          </div>
        }>
          <Show when={(crds() || []).length > 0} fallback={
            <div class="text-center py-12">
              <p class="text-lg opacity-70">No CustomResourceDefinitions found</p>
            </div>
          }>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b border-white/10">
                    <th class="text-left py-3 px-4 font-semibold text-sm">Name</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Group</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Version</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Kind</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Scope</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Instances</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Age</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={crds()}>
                    {(crd) => (
                      <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-3 px-4">
                          <div class="font-medium">{crd.name}</div>
                        </td>
                        <td class="py-3 px-4 text-sm opacity-70">{crd.group}</td>
                        <td class="py-3 px-4 text-sm opacity-70">{crd.version}</td>
                        <td class="py-3 px-4 text-sm">{crd.kind}</td>
                        <td class="py-3 px-4 text-sm">
                          <span class={`px-2 py-1 rounded text-xs ${
                            crd.scope === 'Namespaced' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {crd.scope}
                          </span>
                        </td>
                        <td class="py-3 px-4 text-sm">{crd.instances}</td>
                        <td class="py-3 px-4 text-sm opacity-70">{crd.age}</td>
                        <td class="py-3 px-4">
                          <ActionMenu
                            items={[
                              {
                                label: 'View Instances',
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
            class="text-sm opacity-70 hover:opacity-100 mb-4"
          >
            ← Back to CRDs
          </button>
          <h2 class="text-lg font-semibold mb-2">
            Instances of {selectedCRD()?.kind} ({selectedCRD()?.name})
          </h2>
        </div>
        <Show when={!instances.loading} fallback={
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p class="mt-4 text-sm opacity-70">Loading instances...</p>
          </div>
        }>
          <Show when={(instances() || []).length > 0} fallback={
            <div class="text-center py-12">
              <p class="text-lg opacity-70">No instances found</p>
            </div>
          }>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="border-b border-white/10">
                    <th class="text-left py-3 px-4 font-semibold text-sm">Name</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Namespace</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Age</th>
                    <th class="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={instances()}>
                    {(instance) => (
                      <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-3 px-4">
                          <div class="font-medium">{instance.name}</div>
                        </td>
                        <td class="py-3 px-4 text-sm opacity-70">{instance.namespace || '-'}</td>
                        <td class="py-3 px-4 text-sm opacity-70">{instance.age}</td>
                        <td class="py-3 px-4">
                          <ActionMenu
                            items={[
                              {
                                label: 'View YAML',
                                onClick: () => handleViewYAML(instance, selectedCRD()!),
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
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          </Show>
        </Modal>
      </Show>
    </div>
  );
};

export default CustomResources;

