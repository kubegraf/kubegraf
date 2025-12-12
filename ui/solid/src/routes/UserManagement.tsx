import { Component, createSignal, createResource, For, Show } from 'solid-js';
import { addNotification } from '../stores/ui';
import LoginModal from '../components/LoginModal';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  enabled: boolean;
  created_at: string;
  last_login: string;
}

const UserManagement: Component = () => {
  const [showLoginModal, setShowLoginModal] = createSignal(false);
  const [currentUser, setCurrentUser] = createSignal<any>(null);
  const [showCreateUser, setShowCreateUser] = createSignal(false);

  // Check if user is logged in
  const checkAuth = () => {
    const token = localStorage.getItem('kubegraf_token');
    const user = localStorage.getItem('kubegraf_user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      return true;
    }
    return false;
  };

  // Initialize auth check
  checkAuth();

  const handleLogout = () => {
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    localStorage.removeItem('kubegraf_token');
    localStorage.removeItem('kubegraf_user');
    setCurrentUser(null);
    addNotification('👋 Logged out successfully', 'success');
  };

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  return (
    <div class="space-y-6 p-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            👥 User Management
          </h1>
          <p class="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Manage users, roles, and authentication
          </p>
        </div>
      </div>

      {/* IAM Status */}
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent-primary)' }}
            >
              <span class="text-2xl">🔐</span>
            </div>
            <div>
              <h2 class="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Local IAM System
              </h2>
              <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Identity and Access Management
              </p>
            </div>
          </div>

          <Show
            when={currentUser()}
            fallback={
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Login button clicked! Current state:', showLoginModal());
                  setShowLoginModal(true);
                  console.log('After setState:', showLoginModal());
                  setTimeout(() => {
                    console.log('After timeout:', showLoginModal());
                  }, 0);
                }}
                class="px-6 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  border: 'none'
                }}
                type="button"
              >
                🔑 Login
              </button>
            }
          >
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {currentUser()?.username}
                </div>
                <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {currentUser()?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                class="px-4 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                Logout
              </button>
            </div>
          </Show>
        </div>

        {/* Current User Info */}
        <Show when={currentUser()}>
          <div
            class="p-4 rounded-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Username
                </div>
                <div class="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {currentUser()?.username}
                </div>
              </div>
              <div>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Email
                </div>
                <div class="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {currentUser()?.email || 'Not set'}
                </div>
              </div>
              <div>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Role
                </div>
                <div>
                  <span
                    class="inline-flex px-2 py-1 rounded text-xs font-medium"
                    style={{
                      background:
                        currentUser()?.role === 'admin'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : currentUser()?.role === 'developer'
                          ? 'rgba(59, 130, 246, 0.1)'
                          : 'rgba(34, 197, 94, 0.1)',
                      color:
                        currentUser()?.role === 'admin'
                          ? '#ef4444'
                          : currentUser()?.role === 'developer'
                          ? '#3b82f6'
                          : '#22c55b',
                    }}
                  >
                    {currentUser()?.role}
                  </span>
                </div>
              </div>
              <div>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Status
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-500" />
                  <span class="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Quick Setup Guide */}
      <Show when={!currentUser()}>
        <div class="card p-6">
          <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            🚀 Quick Setup Guide
          </h3>

          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                1
              </div>
              <div>
                <div class="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Create Admin Account
                </div>
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Click "Login" button → "Create one" → Fill details → Select "Admin" role
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                2
              </div>
              <div>
                <div class="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Login
                </div>
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Use your credentials to login → Session valid for 24 hours
                </div>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                3
              </div>
              <div>
                <div class="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Create Additional Users
                </div>
                <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  As admin, create accounts for team members with appropriate roles
                </div>
              </div>
            </div>
          </div>

          <div
            class="mt-6 p-4 rounded-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <div class="flex items-start gap-2">
              <span>💡</span>
              <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>First Time?</strong> If IAM is enabled but you don't have credentials,
                you'll need to create the first admin account. Click the Login button above to get
                started.
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Roles & Permissions */}
      <div class="card p-6">
        <h3 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          📋 Roles & Permissions
        </h3>

        <div class="space-y-3">
          {/* Admin */}
          <div
            class="p-4 rounded-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <div class="flex items-center gap-3 mb-2">
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
              >
                Admin
              </span>
              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Full Access
              </span>
            </div>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Complete control over all resources, users, and settings. Can create/delete users, modify any
              resource, and access all namespaces.
            </p>
          </div>

          {/* Developer */}
          <div
            class="p-4 rounded-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <div class="flex items-center gap-3 mb-2">
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
              >
                Developer
              </span>
              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Read/Write Access
              </span>
            </div>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Can create, update, and delete pods, deployments, services, and config maps. Can view all
              resources but cannot manage users or cluster settings.
            </p>
          </div>

          {/* Viewer */}
          <div
            class="p-4 rounded-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <div class="flex items-center gap-3 mb-2">
              <span
                class="px-2 py-1 rounded text-xs font-medium"
                style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55b' }}
              >
                Viewer
              </span>
              <span class="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Read-Only Access
              </span>
            </div>
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Can view all resources, logs, and metrics. Cannot create, update, or delete any resources.
              Perfect for monitoring and auditing purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Login Modal - Always rendered, visibility controlled by isOpen */}
      <Show when={true}>
        <LoginModal
          isOpen={showLoginModal()}
          onClose={() => {
            console.log('Closing login modal');
            setShowLoginModal(false);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      </Show>
    </div>
  );
};

export default UserManagement;
