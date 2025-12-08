// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, createSignal, Show } from 'solid-js';
import { registerAgent, refreshAgents } from '../../stores/aiAgents';
import type { AgentType } from '../../services/aiAgents/types';

interface AgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AgentConfigModal: Component<AgentConfigModalProps> = (props) => {
  const [name, setName] = createSignal('');
  const [type, setType] = createSignal<AgentType>('custom');
  const [endpoint, setEndpoint] = createSignal('');
  const [apiKey, setApiKey] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const agentTypes: { value: AgentType; label: string; icon: string }[] = [
    { value: 'codex', label: 'OpenAI Codex', icon: '💻' },
    { value: 'cursor', label: 'Cursor AI', icon: '🖱️' },
    { value: 'custom', label: 'Custom API', icon: '🔧' },
    { value: 'ollama', label: 'Ollama (Local)', icon: '🦙' },
    { value: 'openai', label: 'OpenAI', icon: '🤖' },
    { value: 'claude', label: 'Claude', icon: '🧠' },
  ];

  const getDefaultEndpoint = (agentType: AgentType): string => {
    switch (agentType) {
      case 'codex':
        return 'https://api.openai.com/v1/completions';
      case 'cursor':
        return 'http://localhost:3001/api/chat';
      case 'ollama':
        return 'http://localhost:11434/api/generate';
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'claude':
        return 'https://api.anthropic.com/v1/messages';
      default:
        return 'http://localhost:8080/api/chat';
    }
  };

  const handleTypeChange = (newType: AgentType) => {
    setType(newType);
    if (!endpoint()) {
      setEndpoint(getDefaultEndpoint(newType));
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerAgent({
        name: name(),
        type: type(),
        endpoint: endpoint(),
        apiKey: apiKey() || undefined,
        description: description(),
        enabled: true,
        icon: type(),
      });

      await refreshAgents();
      props.onClose();
      
      // Reset form
      setName('');
      setEndpoint('');
      setApiKey('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={props.onClose}
      >
        <div
          class="bg-k8s-card border border-k8s-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-white">Add AI Agent</h2>
              <button
                onClick={props.onClose}
                class="p-2 rounded-lg hover:bg-k8s-border/50 transition-colors text-gray-400 hover:text-white"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} class="space-y-4">
              <Show when={error()}>
                <div class="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error()}
                </div>
              </Show>

              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  required
                  class="w-full bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2 text-white focus:border-k8s-blue focus:outline-none"
                  placeholder="e.g., My Codex Agent"
                />
              </div>

              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Agent Type *
                </label>
                <select
                  value={type()}
                  onChange={(e) => handleTypeChange(e.currentTarget.value as AgentType)}
                  required
                  class="w-full bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2 text-white focus:border-k8s-blue focus:outline-none"
                >
                  <For each={agentTypes}>
                    {(agentType) => (
                      <option value={agentType.value}>
                        {agentType.icon} {agentType.label}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  API Endpoint *
                </label>
                <input
                  type="url"
                  value={endpoint()}
                  onInput={(e) => setEndpoint(e.currentTarget.value)}
                  required
                  class="w-full bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2 text-white focus:border-k8s-blue focus:outline-none"
                  placeholder="https://api.example.com/v1/chat"
                />
                <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Full URL to the agent's API endpoint
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKey()}
                  onInput={(e) => setApiKey(e.currentTarget.value)}
                  class="w-full bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2 text-white focus:border-k8s-blue focus:outline-none"
                  placeholder="sk-..."
                />
                <p class="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Leave empty if not required or if using environment variables
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Description
                </label>
                <textarea
                  value={description()}
                  onInput={(e) => setDescription(e.currentTarget.value)}
                  rows={3}
                  class="w-full bg-k8s-dark border border-k8s-border rounded-lg px-4 py-2 text-white focus:border-k8s-blue focus:outline-none resize-none"
                  placeholder="Brief description of this agent..."
                />
              </div>

              <div class="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="px-4 py-2 rounded-lg border border-k8s-border hover:bg-k8s-border/50 transition-colors text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting()}
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting() ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default AgentConfigModal;

