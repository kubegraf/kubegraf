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
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);

  // Font size selector with localStorage persistence
  const getInitialFontSize = (): number => {
    const saved = localStorage.getItem('rbac-font-size');
    return saved ? parseInt(saved) : 14;
  };
  const [fontSize, setFontSize] = createSignal(getInitialFontSize());

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('rbac-font-size', size.toString());
  };

  // Font family selector with localStorage persistence
  const getInitialFontFamily = (): string => {
    const saved = localStorage.getItem('rbac-font-family');
    return saved || 'Monaco';
  };
  const [fontFamily, setFontFamily] = createSignal(getInitialFontFamily());

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    localStorage.setItem('rbac-font-family', family);
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
      const [type, name, ns] = key.split('|');
      if (!type || !name) return '';
      try {
        let url = '';
        if (type === 'role') {
          url = `/api/rbac/role/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns || '')}`;
        } else if (type === 'rolebinding') {
          url = `/api/rbac/rolebinding/yaml?name=${encodeURIComponent(name)}&namespace=${encodeURIComponent(ns || '')}`;
        } else if (type === 'clusterrole') {
          url = `/api/rbac/clusterrole/yaml?name=${encodeURIComponent(name)}`;
        } else if (type === 'clusterrolebinding') {
          url = `/api/rbac/clusterrolebinding/yaml?name=${encodeURIComponent(name)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch YAML' }));
          throw new Error(errorData.error || 'Failed to fetch YAML');
        }
        const data = await response.json();
        return data.yaml || '';
      } catch (err: any) {
        console.error('Failed to fetch RBAC YAML:', err);
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
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>RBAC</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings</p>
        </div>
        <div class="flex items-center gap-3">
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
        <div>
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
                      }}>Rules</th>
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
                    <For each={roles()} fallback={
                      <tr><td colspan="5" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No roles found</td></tr>
                    }>
                      {(role: any) => {
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
                          }}>{role.name}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{role.namespace || 'default'}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{role.rules || 0}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{role.age || 'N/A'}</td>
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
                                  setSelectedRole(role);
                                  setYamlKey(`role|${role.name}|${role.namespace || ''}`);
                                  setShowYaml(true);
                                } },
                                { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                                  setSelectedRole(role);
                                  setYamlKey(`role|${role.name}|${role.namespace || ''}`);
                                  setShowEdit(true);
                                } },
                                { label: 'Delete', icon: 'delete', onClick: () => handleDelete('role', role.name, role.namespace), variant: 'danger', divider: true },
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
        </div>
      </Show>

      <Show when={activeTab() === 'rolebindings'}>
        <div>
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
                      }}>Role Ref</th>
                      <th class="whitespace-nowrap" style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        'font-weight': '900',
                        color: '#0ea5e9',
                        'font-size': `${fontSize()}px`,
                        border: 'none'
                      }}>Subjects</th>
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
                    <For each={roleBindings()} fallback={
                      <tr><td colspan="6" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No role bindings found</td></tr>
                    }>
                      {(rb: any) => {
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
                          }}>{rb.name}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{rb.namespace || 'default'}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{rb.roleRef || 'N/A'}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{rb.subjects || 0}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{rb.age || 'N/A'}</td>
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
                                  setSelectedRB(rb);
                                  setYamlKey(`rolebinding|${rb.name}|${rb.namespace || ''}`);
                                  setShowYaml(true);
                                } },
                                { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                                  setSelectedRB(rb);
                                  setYamlKey(`rolebinding|${rb.name}|${rb.namespace || ''}`);
                                  setShowEdit(true);
                                } },
                                { label: 'Delete', icon: 'delete', onClick: () => handleDelete('rb', rb.name, rb.namespace), variant: 'danger', divider: true },
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
        </div>
      </Show>

      <Show when={activeTab() === 'clusterroles'}>
        <div>
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
                      }}>Rules</th>
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
                    <For each={clusterRoles()} fallback={
                      <tr><td colspan="4" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No cluster roles found</td></tr>
                    }>
                      {(cr: any) => {
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
                          }}>{cr.name}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{cr.rules || 0}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{cr.age || 'N/A'}</td>
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
                                  setSelectedCR(cr);
                                  setYamlKey(`clusterrole|${cr.name}|`);
                                  setShowYaml(true);
                                } },
                                { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                                  setSelectedCR(cr);
                                  setYamlKey(`clusterrole|${cr.name}|`);
                                  setShowEdit(true);
                                } },
                                { label: 'Delete', icon: 'delete', onClick: () => handleDelete('cr', cr.name), variant: 'danger', divider: true },
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
        </div>
      </Show>

      <Show when={activeTab() === 'clusterrolebindings'}>
        <div>
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
                      }}>Role Ref</th>
                      <th class="whitespace-nowrap" style={{
                        padding: '0 8px',
                        'text-align': 'left',
                        'font-weight': '900',
                        color: '#0ea5e9',
                        'font-size': `${fontSize()}px`,
                        border: 'none'
                      }}>Subjects</th>
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
                    <For each={clusterRoleBindings()} fallback={
                      <tr><td colspan="5" class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No cluster role bindings found</td></tr>
                    }>
                      {(crb: any) => {
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
                          }}>{crb.name}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{crb.roleRef || 'N/A'}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{crb.subjects || 0}</td>
                          <td style={{
                            padding: '0 8px',
                            'text-align': 'left',
                            color: textColor,
                            'font-weight': '900',
                            'font-size': `${fontSize()}px`,
                            height: `${Math.max(24, fontSize() * 1.7)}px`,
                            'line-height': `${Math.max(24, fontSize() * 1.7)}px`,
                            border: 'none'
                          }}>{crb.age || 'N/A'}</td>
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
                                  setSelectedCRB(crb);
                                  setYamlKey(`clusterrolebinding|${crb.name}|`);
                                  setShowYaml(true);
                                } },
                                { label: 'Edit YAML', icon: 'edit', onClick: () => { 
                                  setSelectedCRB(crb);
                                  setYamlKey(`clusterrolebinding|${crb.name}|`);
                                  setShowEdit(true);
                                } },
                                { label: 'Delete', icon: 'delete', onClick: () => handleDelete('crb', crb.name), variant: 'danger', divider: true },
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
        </div>
      </Show>

      {/* YAML Viewer Modal */}
      <Modal
        isOpen={showYaml()}
        size="xl"
        title={`YAML: ${activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name || ''}`}
        onClose={() => { 
          setShowYaml(false); 
          setSelectedRole(null); 
          setSelectedRB(null); 
          setSelectedCR(null); 
          setSelectedCRB(null);
          setYamlKey(null);
        }}
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
          <YAMLViewer 
            yaml={yamlContent() || ''} 
            title={activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name} 
          />
        </Show>
      </Modal>

      {/* YAML Editor Modal */}
      <Modal
        isOpen={showEdit()}
        size="xl"
        title={`Edit YAML: ${activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name || ''}`}
        onClose={() => { 
          setShowEdit(false); 
          setSelectedRole(null); 
          setSelectedRB(null); 
          setSelectedCR(null); 
          setSelectedCRB(null);
          setYamlKey(null);
        }}
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
              title={activeTab() === 'roles' ? selectedRole()?.name : activeTab() === 'rolebindings' ? selectedRB()?.name : activeTab() === 'clusterroles' ? selectedCR()?.name : selectedCRB()?.name} 
              onSave={handleSaveYAML} 
              onCancel={() => {
                setShowEdit(false);
                setSelectedRole(null);
                setSelectedRB(null);
                setSelectedCR(null);
                setSelectedCRB(null);
                setYamlKey(null);
              }} 
            />
          </div>
        </Show>
      </Modal>
    </div>
  );
};

export default RBAC;

