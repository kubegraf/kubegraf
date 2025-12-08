import { Component, Show, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';
import { UpdateInfo } from '../stores/globalStore';
import UpdateApplyButton from './UpdateApplyButton';
import { canApplyUpdate } from '../utils/updateHelpers';
import { addNotification } from '../stores/ui';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo;
}

const UpdateModal: Component<UpdateModalProps> = (props) => {
  const handleInstallClick = () => {
    // Use htmlUrl if available, otherwise construct GitHub release URL
    const url = props.updateInfo.htmlUrl || 
                `https://github.com/kubegraf/kubegraf/releases/tag/v${props.updateInfo.latestVersion}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyCommand = () => {
    const command = 'curl -sSL https://kubegraf.io/install.sh | bash';
    navigator.clipboard.writeText(command).then(() => {
      // Show toast (you can integrate with your toast system)
      alert('Install command copied to clipboard!');
    });
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div
          class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ 'background-color': 'rgba(0, 0, 0, 0.5)' }}
          onClick={props.onClose}
        >
          <div
            class="w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              class="px-6 py-4 border-b flex items-center justify-between"
              style={{ 'border-color': 'var(--border-color)' }}
            >
              <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                KubeGraf Update Available
              </h2>
              <button
                onClick={props.onClose}
                class="text-2xl leading-none hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <div class="mb-4">
                <p class="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Version <span class="font-semibold">v{props.updateInfo.latestVersion}</span> is now available
                </p>
              </div>

              {/* Release Notes */}
              <div class="mb-6">
                <h3 class="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📝</span> Release Notes
                </h3>
                <div
                  class="prose prose-sm max-w-none p-4 rounded-lg"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    'white-space': 'pre-wrap',
                    'font-family': 'monospace',
                    'font-size': '0.875rem',
                  }}
                >
                  {props.updateInfo.releaseNotes || 'No release notes available.'}
                </div>
              </div>

              {/* Comparison */}
              <div class="mb-6">
                <h3 class="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>🔍</span> Comparison
                </h3>
                <div class="flex items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div>
                    <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Your version:</div>
                    <div class="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      v{props.updateInfo.currentVersion}
                    </div>
                  </div>
                  <div class="text-2xl" style={{ color: 'var(--text-secondary)' }}>→</div>
                  <div>
                    <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Latest version:</div>
                    <div class="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      v{props.updateInfo.latestVersion}
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Update */}
              <div class="mb-6">
                <h3 class="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📦</span> How to Update
                </h3>
                <div class="mb-3 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <p class="text-sm flex items-start gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>✅</span>
                    <span>
                      <strong>Safe Update:</strong> The install script works on Windows, macOS, and Linux. 
                      It will automatically detect your OS and architecture, download the correct binary, and install it. 
                      Your settings and cluster connections are preserved. After installation, restart KubeGraf to use the new version.
                    </span>
                  </p>
                </div>
                <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Run this command in your terminal when you're ready:
                </p>
                <div class="flex items-center gap-2 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <code
                    class="flex-1 font-mono text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    curl -sSL https://kubegraf.io/install.sh | bash
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    Copy
                  </button>
                </div>
                <div class="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <p class="text-xs" style={{ color: 'var(--text-muted)' }}>
                    <strong>What happens:</strong>
                  </p>
                  <ul class="text-xs mt-1.5 ml-4 list-disc" style={{ color: 'var(--text-muted)' }}>
                    <li>Script detects your OS (Windows/macOS/Linux) and architecture</li>
                    <li>Downloads the latest version from GitHub releases</li>
                    <li>Installs to <code>/usr/local/bin</code> (may require sudo on Linux/macOS)</li>
                    <li>Preserves all your settings and cluster connections</li>
                    <li>Restart KubeGraf manually to use the new version</li>
                  </ul>
                  <p class="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>
                    💡 <strong>Tip:</strong> If KubeGraf is currently running, stop it first, run the install command, then start it again.
                  </p>
                </div>
                <div class="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <p class="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    <strong>Alternative (GitHub Raw):</strong>
                  </p>
                  <code class="text-xs font-mono block" style={{ color: 'var(--text-primary)' }}>
                    curl -sSL https://raw.githubusercontent.com/kubegraf/kubegraf/main/docs/install.sh | bash
                  </code>
                </div>
                <p class="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  Or visit:{' '}
                  <a
                    href={props.updateInfo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline hover:opacity-80"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {props.updateInfo.htmlUrl}
                  </a>
                  {' '}to download manually
                </p>
              </div>
            </div>

            {/* Footer */}
            <div
              class="px-6 py-4 border-t flex items-center justify-between gap-3"
              style={{ 'border-color': 'var(--border-color)' }}
            >
              <div class="flex items-center gap-3">
                <Show when={canApplyUpdate(props.updateInfo)}>
                  <UpdateApplyButton
                    updateInfo={props.updateInfo}
                    onSuccess={() => {
                      // Show additional success message
                      addNotification(
                        `✨ KubeGraf is updating to v${props.updateInfo.latestVersion}. The application will restart shortly.`,
                        'success'
                      );
                      // Update will restart the app, so we can close the modal
                      // The app will restart and version will be refreshed automatically
                      props.onClose();
                    }}
                    onError={(error) => {
                      console.error('Update failed:', error);
                      addNotification(`Update failed: ${error}`, 'error');
                    }}
                  />
                </Show>
              </div>
              <div class="flex items-center gap-3">
                <button
                  onClick={props.onClose}
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Remind Me Later
                </button>
                <button
                  onClick={handleInstallClick}
                  class="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{
                    background: 'var(--accent-primary)',
                  }}
                >
                  View on GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default UpdateModal;

