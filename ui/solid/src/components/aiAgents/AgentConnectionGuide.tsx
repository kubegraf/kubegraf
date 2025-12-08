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

import { Component, Show, For, createSignal } from 'solid-js';
import type { AgentConfig } from '../../services/aiAgents/types';
import { registerAgent, refreshAgents, healthCheck } from '../../stores/aiAgents';
import { aiAgentsAPI } from '../../services/aiAgents/api';

interface AgentConnectionGuideProps {
  agent: AgentConfig | null;
  onClose?: () => void;
}

const AgentConnectionGuide: Component<AgentConnectionGuideProps> = (props) => {
  const [apiKey, setApiKey] = createSignal('');
  const [endpoint, setEndpoint] = createSignal('');
  const [isConnecting, setIsConnecting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal(false);

  const getConnectionSteps = (agent: AgentConfig) => {
    switch (agent.type) {
      case 'codex':
        return {
          title: 'Connect to OpenAI Codex',
          steps: [
            'Get your OpenAI API key from https://platform.openai.com/api-keys',
            'Enter your API key below',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: true,
          defaultEndpoint: 'https://api.openai.com/v1/completions',
        };
      case 'cursor':
        return {
          title: 'Connect to Cursor AI',
          steps: [
            'Option 1: If Cursor is running locally, ensure it\'s accessible at http://localhost:3001',
            'Option 2: Get your Cursor API endpoint and key from Cursor settings',
            'Enter the endpoint and API key (if required) below',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: true,
          defaultEndpoint: 'http://localhost:3001/api/chat',
        };
      case 'openai':
        return {
          title: 'Connect to OpenAI',
          steps: [
            'Get your OpenAI API key from https://platform.openai.com/api-keys',
            'Enter your API key below',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: true,
          defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
        };
      case 'claude':
        return {
          title: 'Connect to Claude',
          steps: [
            'Get your Anthropic API key from https://console.anthropic.com/',
            'Enter your API key below',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: true,
          defaultEndpoint: 'https://api.anthropic.com/v1/messages',
        };
      case 'ollama':
        return {
          title: 'Connect to Ollama',
          steps: [
            'Ensure Ollama is running locally: `ollama serve`',
            'Default endpoint: http://localhost:11434/api/generate',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: false,
          defaultEndpoint: 'http://localhost:11434/api/generate',
        };
      default:
        return {
          title: `Connect to ${agent.name}`,
          steps: [
            'Enter the API endpoint URL',
            'Enter API key if required',
            'Click "Connect" to test the connection',
          ],
          needsApiKey: true,
          defaultEndpoint: agent.endpoint || 'http://localhost:8080/api/chat',
        };
    }
  };

  const handleConnect = async () => {
    if (!props.agent) return;

    setIsConnecting(true);
    setError(null);
    setSuccess(false);

    try {
      const agentEndpoint = endpoint() || props.agent.endpoint || getConnectionSteps(props.agent).defaultEndpoint;
      const agentApiKey = apiKey() || props.agent.apiKey;

      // Update or register the agent
      const updatedConfig: Partial<AgentConfig> = {
        id: props.agent.id,
        name: props.agent.name,
        type: props.agent.type,
        endpoint: agentEndpoint,
        apiKey: agentApiKey,
        enabled: true,
        description: props.agent.description,
        icon: props.agent.icon,
      };

      await registerAgent(updatedConfig);
      await refreshAgents();

      // Test connection
      await healthCheck(props.agent.id);
      await refreshAgents();

      setSuccess(true);
      setTimeout(() => {
        props.onClose?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!props.agent) return null;

  const steps = getConnectionSteps(props.agent);

  return (
    <div class="p-4 bg-k8s-dark/80 rounded-lg border border-purple-500/30">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-white font-medium text-base">{steps.title}</h3>
        <Show when={props.onClose}>
          <button
            onClick={props.onClose}
            class="p-1 rounded hover:bg-k8s-border/50 text-gray-400 hover:text-white"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>
      </div>

      <div class="space-y-4">
        {/* Steps */}
        <div>
          <p class="font-medium text-gray-400 text-sm mb-2">Steps:</p>
          <ol class="list-decimal list-inside space-y-1.5 text-sm text-gray-400 ml-2">
            <For each={steps.steps}>
              {(step) => <li>{step}</li>}
            </For>
          </ol>
        </div>

        {/* Connection Form */}
        <div class="space-y-3 pt-2 border-t border-k8s-border">
          <div>
            <label class="block text-sm font-medium mb-1.5 text-gray-300">Endpoint</label>
            <input
              type="url"
              value={endpoint() || props.agent.endpoint || steps.defaultEndpoint}
              onInput={(e) => setEndpoint(e.currentTarget.value)}
              placeholder={steps.defaultEndpoint}
              class="w-full bg-k8s-dark border border-k8s-border rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <Show when={steps.needsApiKey}>
            <div>
              <label class="block text-sm font-medium mb-1.5 text-gray-300">
                API Key {props.agent.apiKey ? '(set)' : ''}
              </label>
              <input
                type="password"
                value={apiKey()}
                onInput={(e) => setApiKey(e.currentTarget.value)}
                placeholder={props.agent.apiKey ? '••••••••' : 'Enter key'}
                class="w-full bg-k8s-dark border border-k8s-border rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </Show>

          <Show when={error()}>
            <div class="p-2 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error()}
            </div>
          </Show>

          <Show when={success()}>
            <div class="p-2 rounded bg-green-500/20 border border-green-500/50 text-green-400 text-sm">
              ✓ Connected!
            </div>
          </Show>

          <button
            onClick={handleConnect}
            disabled={isConnecting()}
            class="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isConnecting() ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentConnectionGuide;

