import { Component, For, Show, createSignal, createResource } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
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
  const [showEdit, setShowEdit] = createSignal(false);
  
  // Use createResource for automatic YAML loading like Deployments
  const [yamlContent] = createResource(
    () => (showYaml() || showEdit()) && selectedSA() ? { name: selectedSA()!.name, ns: selectedSA()!.namespace } : null,
    async (params) => {
      if (!params) return '';
      try {
        const response = await fetch(`/api/serviceaccount/yaml?name=${encodeURIComponent(params.name)}&namespace=${encodeURIComponent(params.ns)}`);
        if (!response.ok) throw new Error('Failed to fetch YAML');
        const data = await response.json();
        return data.yaml || '';
      } catch (err: any) {
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
    setShowYaml(true);
  };

  const handleEditYAML = (sa: ServiceAccount) => {
    setSelectedSA(sa);
    setShowEdit(true);
  };

  const handleSaveYAML = async (yaml: string) => {
    const sa = selectedSA();
    if (!sa) return;

    try {
      const params = new URLSearchParams({
        name: sa.name,
        namespace: sa.namespace,
      });
      const response = await fetch(`/api/serviceaccount/update?${params.toString()}`, {
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

      addNotification(`Successfully updated ${sa.name}`, 'success');
      setShowEdit(false);
      refetch();
    } catch (err: any) {
      addNotification(`Failed to update: ${err.message}`, 'error');
    }
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
            setSelectedSA(null);
          }}
          title={`Service Account: ${selectedSA()?.name}`}
          size="xl"
        >
          <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
            <YAMLViewer yaml={yamlContent() || ''} title={selectedSA()?.name} />
          </Show>
        </Modal>
      </Show>

      <Show when={showEdit()}>
        <Modal
          isOpen={showEdit()}
          onClose={() => {
            setShowEdit(false);
            setSelectedSA(null);
          }}
          title={`Edit Service Account: ${selectedSA()?.name}`}
          size="xl"
        >
          <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
            <div style={{ height: '70vh' }}>
              <YAMLEditor yaml={yamlContent() || ''} title={selectedSA()?.name} onSave={handleSaveYAML} onCancel={() => setShowEdit(false)} />
            </div>
          </Show>
        </Modal>
      </Show>
    </div>
  );
};

export default ServiceAccounts;

