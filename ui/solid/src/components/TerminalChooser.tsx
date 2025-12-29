import { Component, createSignal, For, onMount, Show } from 'solid-js';
import { api } from '../services/api';

interface Shell {
  name: string;
  display: string;
  path: string;
  priority: number;
  recommended: boolean;
  description: string;
}

interface TerminalChooserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (shell: Shell) => void;
}

const TerminalChooser: Component<TerminalChooserProps> = (props) => {
  const [shells, setShells] = createSignal<Shell[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      setLoading(true);
      const response = await api.getAvailableShells();
      const availableShells = response.shells || [];

      // Sort by priority (lower number = higher priority)
      availableShells.sort((a: Shell, b: Shell) => a.priority - b.priority);

      setShells(availableShells);
      setError(null);
    } catch (err) {
      console.error('Failed to load shells:', err);
      setError('Failed to load available shells. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  const handleShellSelect = (shell: Shell) => {
    // Save preference to localStorage
    localStorage.setItem('preferred-shell', JSON.stringify(shell));
    props.onSelect(shell);
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={props.onClose}
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Choose Terminal Shell
            </h2>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Select your preferred shell for terminal operations. This choice will be saved for future sessions.
            </p>

            <Show when={loading()}>
              <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600 dark:text-gray-400">Loading available shells...</span>
              </div>
            </Show>

            <Show when={error()}>
              <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p class="text-sm text-red-800 dark:text-red-200">{error()}</p>
              </div>
            </Show>

            <Show when={!loading() && !error()}>
              <div class="space-y-2">
                <For each={shells()}>
                  {(shell) => (
                    <button
                      class={`w-full p-4 text-left border rounded-lg transition-all hover:shadow-md ${
                        shell.recommended
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => handleShellSelect(shell)}
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-gray-900 dark:text-white">
                              {shell.display}
                            </span>
                            <Show when={shell.recommended}>
                              <span class="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded">
                                Recommended
                              </span>
                            </Show>
                          </div>
                          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {shell.description}
                          </p>
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-500 font-mono">
                            {shell.path}
                          </p>
                        </div>
                        <svg
                          class="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>
                  )}
                </For>
              </div>

              {/* Warning for Windows users */}
              <Show when={shells().length > 0}>
                <div class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div class="flex gap-3">
                    <svg
                      class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div class="flex-1">
                      <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Windows Terminal Limitations
                      </p>
                      <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                        Interactive shell features are limited on Windows. You'll use command execution mode
                        instead of a full terminal emulator. This is a Windows platform limitation.
                      </p>
                    </div>
                  </div>
                </div>
              </Show>
            </Show>
          </div>

          {/* Footer */}
          <div class="mt-6 flex justify-end">
            <button
              onClick={props.onClose}
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default TerminalChooser;
