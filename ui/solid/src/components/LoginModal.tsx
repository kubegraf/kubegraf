import { Component, createSignal, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { api } from '../services/api';
import { addNotification } from '../stores/ui';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const LoginModal: Component<LoginModalProps> = (props) => {
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [isRegister, setIsRegister] = createSignal(false);
  const [email, setEmail] = createSignal('');
  const [role, setRole] = createSignal('viewer');

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username(),
          password: password(),
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('kubegraf_token', data.token);
      localStorage.setItem('kubegraf_user', JSON.stringify(data.user));

      addNotification(`✅ Welcome back, ${data.user.username}!`, 'success');
      props.onLoginSuccess(data.user);
      props.onClose();
    } catch (error) {
      addNotification(`❌ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username(),
          password: password(),
          email: email(),
          role: role(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Registration failed');
      }

      addNotification('✅ Account created! Please login.', 'success');
      setIsRegister(false);
      setPassword('');
    } catch (error) {
      addNotification(`❌ Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  console.log('[LoginModal] Render called - isOpen:', props.isOpen);

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            'z-index': '9999',
            'pointer-events': 'auto'
          }}
          onClick={props.onClose}
        >
      <div
        class="card p-8 max-w-md w-full mx-4"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div class="mb-6">
          <h2 class="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isRegister() ? '🔐 Create Account' : '🔑 Login to KubeGraf'}
          </h2>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isRegister()
              ? 'Create a new account to access KubeGraf'
              : 'Enter your credentials to continue'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isRegister() ? handleRegister : handleLogin} class="space-y-4">
          {/* Username */}
          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Username
            </label>
            <input
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              required
              class="w-full px-4 py-2 rounded-lg"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              placeholder="Enter username"
              disabled={loading()}
            />
          </div>

          {/* Email (register only) */}
          <Show when={isRegister()}>
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required={isRegister()}
                class="w-full px-4 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                placeholder="your@email.com"
                disabled={loading()}
              />
            </div>
          </Show>

          {/* Password */}
          <div>
            <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              class="w-full px-4 py-2 rounded-lg"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
              placeholder="Enter password"
              disabled={loading()}
            />
          </div>

          {/* Role (register only) */}
          <Show when={isRegister()}>
            <div>
              <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Role
              </label>
              <select
                value={role()}
                onChange={(e) => setRole(e.currentTarget.value)}
                class="w-full px-4 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                disabled={loading()}
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="developer">Developer (Read/Write)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
              <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Choose your access level
              </p>
            </div>
          </Show>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading()}
            class="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
            }}
          >
            {loading() ? '⏳ Processing...' : isRegister() ? '🔐 Create Account' : '🔑 Login'}
          </button>
        </form>

        {/* Toggle Register/Login */}
        <div class="mt-4 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister());
              setPassword('');
              setEmail('');
            }}
            class="text-sm hover:underline"
            style={{ color: 'var(--accent-primary)' }}
            disabled={loading()}
          >
            {isRegister() ? '← Back to Login' : "Don't have an account? Create one →"}
          </button>
        </div>

        {/* Info Box */}
        <Show when={!isRegister()}>
          <div
            class="mt-6 p-4 rounded-lg text-sm"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
          >
            <p class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              ℹ️ First Time Setup
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              If this is your first time, create an admin account by clicking "Create one" below,
              or use the default credentials if configured.
            </p>
          </div>
        </Show>
      </div>
    </div>
      </Portal>
    </Show>
  );
};

export default LoginModal;
