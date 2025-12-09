import { Component, For, Show, createSignal, createResource, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { addNotification } from '../stores/ui';
import Modal from '../components/Modal';
import YAMLViewer from '../components/YAMLViewer';
import YAMLEditor from '../components/YAMLEditor';
import ActionMenu from '../components/ActionMenu';

interface Role {
  name: string;
  namespace: string;
  rules: number;
  age: string;
}

interface RoleBinding {
  name: string;
  namespace: string;
  roleRef: string;
  subjects: number;
  age: string;
}

interface ClusterRole {
  name: string;
  rules: number;
  age: string;
}

interface ClusterRoleBinding {
  name: string;
  roleRef: string;
  subjects: number;
  age: string;
}

const RBAC: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'roles' | 'rolebindings' | 'clusterroles' | 'clusterrolebindings'>('roles');
  const [selectedRole, setSelectedRole] = createSignal<any>(null);
  const [selectedRB, setSelectedRB] = createSignal<any>(null);
  const [selectedCR, setSelectedCR] = createSignal<any>(null);
  const [selectedCRB, setSelectedCRB] = createSignal<any>(null);
  const [showYaml, setShowYaml] = createSignal(false);
  const [showEdit, setShowEdit] = createSignal(false);
  
  // Use createResource for automatic YAML loading like Deployments
  const [yamlContent] = createResource(
    () => {
      if (!(showYaml() || showEdit())) return null;
      const tab = activeTab();
      const resource = tab === 'roles' ? selectedRole() :
                      tab === 'rolebindings' ? selectedRB() :
                      tab === 'clusterroles' ? selectedCR() :
                      selectedCRB();
      if (!resource) return null;
      
      const type = tab === 'roles' ? 'role' :
                   tab === 'rolebindings' ? 'rolebinding' :
                   tab === 'clusterroles' ? 'clusterrole' :
                   'clusterrolebinding';
      
      // For cluster-scoped resources, namespace is undefined
      // Include it in the key to ensure proper reactivity
      return {
        type,
        name: resource.name,
        namespace: resource.namespace || undefined
      };
    },
    async (params) => {
      if (!params) return '';
      try {
        let url = '';
        if (params.type === 'role') {
          url = `/api/rbac/role/yaml?name=${encodeURIComponent(params.name)}&namespace=${encodeURIComponent(params.namespace || '')}`;
        } else if (params.type === 'rolebinding') {
          url = `/api/rbac/rolebinding/yaml?name=${encodeURIComponent(params.name)}&namespace=${encodeURIComponent(params.namespace || '')}`;
        } else if (params.type === 'clusterrole') {
          url = `/api/rbac/clusterrole/yaml?name=${encodeURIComponent(params.name)}`;
        } else if (params.type === 'clusterrolebinding') {
          url = `/api/rbac/clusterrolebinding/yaml?name=${encodeURIComponent(params.name)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch YAML');
        const data = await response.json();
        return data.yaml || '';
      } catch (err: any) {
        addNotification(`Failed to load YAML: ${err.message}`, 'error');
        return '';
      }
    }
  );

  // Fetch Roles
  const [roles] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        const nsParam = ns === '_all' ? undefined : ns;
        const response = await fetch(`/api/rbac/roles${nsParam ? `?namespace=${nsParam}` : ''}`);
        if (!response.ok) throw new Error('Failed to fetch Roles');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Failed to fetch Roles:', err);
        return [];
      }
    }
  );

  // Fetch RoleBindings
  const [roleBindings] = createResource(
    () => namespace(),
    async (ns) => {
      try {
        const nsParam = ns === '_all' ? undefined : ns;
        const response = await fetch(`/api/rbac/rolebindings${nsParam ? `?namespace=${nsParam}` : ''}`);
        if (!response.ok) throw new Error('Failed to fetch RoleBindings');
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Failed to fetch RoleBindings:', err);
        return [];
      }
    }
  );

  // Fetch ClusterRoles
  const [clusterRoles] = createResource(async () => {
    try {
      const response = await fetch('/api/rbac/clusterroles');
      if (!response.ok) throw new Error('Failed to fetch ClusterRoles');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to fetch ClusterRoles:', err);
      return [];
    }
  });

  // Fetch ClusterRoleBindings
  const [clusterRoleBindings] = createResource(async () => {
    try {
      const response = await fetch('/api/rbac/clusterrolebindings');
      if (!response.ok) throw new Error('Failed to fetch ClusterRoleBindings');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to fetch ClusterRoleBindings:', err);
      return [];
    }
  });


  // Handle delete
  const handleDelete = async (type: string, name: string, namespace?: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    try {
      let url = '';
      if (type === 'role') {
        url = `/api/rbac/role/delete?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace || '')}`;
      } else if (type === 'rb' || type === 'rolebinding') {
        url = `/api/rbac/rolebinding/delete?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(namespace || '')}`;
      } else if (type === 'cr' || type === 'clusterrole') {
        url = `/api/rbac/clusterrole/delete?name=${encodeURIComponent(name)}`;
      } else if (type === 'crb' || type === 'clusterrolebinding') {
        url = `/api/rbac/clusterrolebinding/delete?name=${encodeURIComponent(name)}`;
      }

      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }
      addNotification(`Successfully deleted ${name}`, 'success');
      
      // Refetch data
      if (type === 'role') roles.refetch();
      else if (type === 'rb' || type === 'rolebinding') roleBindings.refetch();
      else if (type === 'cr' || type === 'clusterrole') clusterRoles.refetch();
      else if (type === 'crb' || type === 'clusterrolebinding') clusterRoleBindings.refetch();
    } catch (err: any) {
      addNotification(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Handle save YAML
  const handleSaveYAML = async (yaml: string) => {
    const currentResource = activeTab() === 'roles' ? selectedRole() :
                            activeTab() === 'rolebindings' ? selectedRB() :
                            activeTab() === 'clusterroles' ? selectedCR() :
                            selectedCRB();
    
    if (!currentResource) return;

    try {
      let url = '';
      const type = activeTab() === 'roles' ? 'role' :
                   activeTab() === 'rolebindings' ? 'rolebinding' :
                   activeTab() === 'clusterroles' ? 'clusterrole' :
                   'clusterrolebinding';
      
      if (type === 'role') {
        url = `/api/rbac/role/update?name=${encodeURIComponent(currentResource.name)}&namespace=${encodeURIComponent(currentResource.namespace || '')}`;
      } else if (type === 'rolebinding') {
        url = `/api/rbac/rolebinding/update?name=${encodeURIComponent(currentResource.name)}&namespace=${encodeURIComponent(currentResource.namespace || '')}`;
      } else if (type === 'clusterrole') {
        url = `/api/rbac/clusterrole/update?name=${encodeURIComponent(currentResource.name)}`;
      } else if (type === 'clusterrolebinding') {
        url = `/api/rbac/clusterrolebinding/update?name=${encodeURIComponent(currentResource.name)}`;
      }

      const response = await fetch(url, {
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

      addNotification(`Successfully updated ${currentResource.name}`, 'success');
      setShowEdit(false);
      
      // Refetch data
      if (type === 'role') roles.refetch();
      else if (type === 'rolebinding') roleBindings.refetch();
      else if (type === 'clusterrole') clusterRoles.refetch();
      else if (type === 'clusterrolebinding') clusterRoleBindings.refetch();
    } catch (err: any) {
      addNotification(`Failed to update: ${err.message}`, 'error');
    }
  };

  return (
    <div class="space-y-6 p-6" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>RBAC</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings</p>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 border-b" style={{ 'border-color': 'var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('roles')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'roles' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'roles' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'roles' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          Roles ({roles()?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('rolebindings')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'rolebindings' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'rolebindings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'rolebindings' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          RoleBindings ({roleBindings()?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('clusterroles')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'clusterroles' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'clusterroles' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'clusterroles' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          ClusterRoles ({clusterRoles()?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('clusterrolebindings')}
          class={`px-4 py-2 font-medium transition-colors ${
            activeTab() === 'clusterrolebindings' ? 'border-b-2' : ''
          }`}
          style={{
            color: activeTab() === 'clusterrolebindings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            'border-bottom-color': activeTab() === 'clusterrolebindings' ? 'var(--accent-primary)' : 'transparent',
          }}
        >
          ClusterRoleBindings ({clusterRoleBindings()?.length || 0})
        </button>
      </div>

      {/* Content */}
      <Show when={activeTab() === 'roles'}>
        <div class="card overflow-hidden">
          <Show when={roles.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading Roles...</span>
            </div>
          </Show>
          <Show when={!roles.loading && (!roles() || roles().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No Roles found</p>
            </div>
          </Show>
          <Show when={!roles.loading && roles() && roles().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Rules</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={roles()}>
                    {(role: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{role.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{role.namespace || 'default'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{role.rules || 0}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{role.age || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedRole(role); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedRole(role); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('role', role.name, role.namespace), variant: 'danger', divider: true },
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

      <Show when={activeTab() === 'rolebindings'}>
        <div class="card overflow-hidden">
          <Show when={roleBindings.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading RoleBindings...</span>
            </div>
          </Show>
          <Show when={!roleBindings.loading && (!roleBindings() || roleBindings().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No RoleBindings found</p>
            </div>
          </Show>
          <Show when={!roleBindings.loading && roleBindings() && roleBindings().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Namespace</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Role Ref</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subjects</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={roleBindings()}>
                    {(rb: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{rb.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rb.namespace || 'default'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rb.roleRef || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rb.subjects || 0}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{rb.age || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedRB(rb); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedRB(rb); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('rb', rb.name, rb.namespace), variant: 'danger', divider: true },
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

      <Show when={activeTab() === 'clusterroles'}>
        <div class="card overflow-hidden">
          <Show when={clusterRoles.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading ClusterRoles...</span>
            </div>
          </Show>
          <Show when={!clusterRoles.loading && (!clusterRoles() || clusterRoles().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No ClusterRoles found</p>
            </div>
          </Show>
          <Show when={!clusterRoles.loading && clusterRoles() && clusterRoles().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Rules</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={clusterRoles()}>
                    {(cr: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{cr.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{cr.rules || 0}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{cr.age || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedCR(cr); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedCR(cr); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('cr', cr.name), variant: 'danger', divider: true },
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

      <Show when={activeTab() === 'clusterrolebindings'}>
        <div class="card overflow-hidden">
          <Show when={clusterRoleBindings.loading}>
            <div class="p-8 text-center">
              <div class="spinner mx-auto mb-2" />
              <span style={{ color: 'var(--text-muted)' }}>Loading ClusterRoleBindings...</span>
            </div>
          </Show>
          <Show when={!clusterRoleBindings.loading && (!clusterRoleBindings() || clusterRoleBindings().length === 0)}>
            <div class="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No ClusterRoleBindings found</p>
            </div>
          </Show>
          <Show when={!clusterRoleBindings.loading && clusterRoleBindings() && clusterRoleBindings().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Role Ref</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Subjects</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Age</th>
                    <th class="px-4 py-3 text-left text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={clusterRoleBindings()}>
                    {(crb: any) => (
                      <tr class="border-t" style={{ 'border-color': 'var(--border-color)' }}>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{crb.name}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{crb.roleRef || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{crb.subjects || 0}</td>
                        <td class="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{crb.age || 'N/A'}</td>
                        <td class="px-4 py-3 text-sm">
                          <ActionMenu
                            actions={[
                              { label: 'View YAML', icon: 'yaml', onClick: () => { setSelectedCRB(crb); setShowYaml(true); } },
                              { label: 'Edit YAML', icon: 'edit', onClick: () => { setSelectedCRB(crb); setShowEdit(true); } },
                              { label: 'Delete', icon: 'delete', onClick: () => handleDelete('crb', crb.name), variant: 'danger', divider: true },
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
        <Modal
        isOpen={showYaml()}
        size="xl"
          title={`View YAML - ${activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name}`}
          onClose={() => { setShowYaml(false); setSelectedRole(null); setSelectedRB(null); setSelectedCR(null); setSelectedCRB(null); }}
        >
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <YAMLViewer yaml={yamlContent() || ''} title={activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name} />
          </Show>
        </Modal>

      {/* YAML Editor Modal */}
        <Modal
        isOpen={showEdit()}
        size="xl"
          title={`Edit YAML - ${activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name}`}
          onClose={() => { setShowEdit(false); setSelectedRole(null); setSelectedRB(null); setSelectedCR(null); setSelectedCRB(null); }}
        >
        <Show when={!yamlContent.loading} fallback={<div class="spinner mx-auto" />}>
          <div style={{ height: '70vh' }}>
            <YAMLEditor yaml={yamlContent() || ''} title={activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name} onSave={handleSaveYAML} onCancel={() => setShowEdit(false)} />
            </div>
          </Show>
        </Modal>
    </div>
  );
};

export default RBAC;

