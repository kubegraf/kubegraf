import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import ActionMenu from '../components/ActionMenu';

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
  const [yamlContent, setYamlContent] = createSignal('');
  const [yamlLoading, setYamlLoading] = createSignal(false);

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

  const handleViewYAML = async (sa: ServiceAccount) => {
    setSelectedSA(sa);
    setYamlLoading(true);
    setShowYaml(true);
    try {
      const params = new URLSearchParams({
        name: sa.name,
        namespace: sa.namespace,
      });
      const response = await fetch(`/api/serviceaccount/yaml?${params.toString()}`);
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
          <h1 class="text-2xl font-bold mb-1">Service Accounts</h1>
          <p class="text-sm opacity-70">Manage service accounts and their permissions</p>
        </div>
        <button
          onClick={() => refetch()}
          class="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      <Show when={!serviceAccounts.loading} fallback={
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p class="mt-4 text-sm opacity-70">Loading service accounts...</p>
        </div>
      }>
        <Show when={(serviceAccounts() || []).length > 0} fallback={
          <div class="text-center py-12">
            <p class="text-lg opacity-70">No service accounts found</p>
          </div>
        }>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-white/10">
                  <th class="text-left py-3 px-4 font-semibold text-sm">Name</th>
                  <th class="text-left py-3 px-4 font-semibold text-sm">Namespace</th>
                  <th class="text-left py-3 px-4 font-semibold text-sm">Secrets</th>
                  <th class="text-left py-3 px-4 font-semibold text-sm">Age</th>
                  <th class="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={serviceAccounts()}>
                  {(sa) => (
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td class="py-3 px-4">
                        <div class="font-medium">{sa.name}</div>
                      </td>
                      <td class="py-3 px-4 text-sm opacity-70">{sa.namespace}</td>
                      <td class="py-3 px-4 text-sm">{sa.secrets}</td>
                      <td class="py-3 px-4 text-sm opacity-70">{sa.age}</td>
                      <td class="py-3 px-4">
                        <ActionMenu
                          actions={[
                            {
                              label: 'View YAML',
                              icon: 'yaml',
                              onClick: () => handleViewYAML(sa),
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

      <Show when={showYaml()}>
        <Modal
          isOpen={showYaml()}
          onClose={() => {
            setShowYaml(false);
            setYamlContent('');
            setSelectedSA(null);
          }}
          title={`Service Account: ${selectedSA()?.name}`}
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

export default ServiceAccounts;

