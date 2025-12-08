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

import { Component, For, Show, createSignal, onMount } from 'solid-js';
import { getAgents, selectedAgentId, selectAgent, discoverAgents, refreshAgents } from '../../stores/aiAgents';

interface AgentSelectorProps {
  onAgentChange?: (agentId: string) => void;
}

const AgentSelector: Component<AgentSelectorProps> = (props) => {
  const allAgents = getAgents;
  const currentAgentId = selectedAgentId;
  const [isDiscovering, setIsDiscovering] = createSignal(false);

  onMount(() => {
    discoverAgents().then(() => refreshAgents());
  });

  const handleAgentChange = (agentId: string) => {
    selectAgent(agentId);
    props.onAgentChange?.(agentId);
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    try {
      await discoverAgents();
      await refreshAgents();
    } catch (error) {
      console.error('Failed to discover agents:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'codex': return '💻';
      case 'cursor': return '🖱️';
      case 'custom': return '🔧';
      case 'ollama': return '🦙';
      case 'openai': return '🤖';
      case 'claude': return '🧠';
      default: return '✨';
    }
  };

  return (
    <div class="flex items-center gap-1.5">
      <select
        value={currentAgentId() || ''}
        onChange={(e) => handleAgentChange(e.target.value)}
        class="bg-k8s-dark border border-k8s-border rounded px-2 py-1.5 text-sm text-gray-300 focus:border-k8s-blue focus:outline-none cursor-pointer min-w-[160px] h-[32px]"
        style="font-size: 14px; line-height: 1.5;"
      >
        <option value="" style="font-size: 14px;">Select Agent</option>
        <For each={allAgents()}>
          {(agent) => (
            <option value={agent.id} style="font-size: 14px;">
              {getAgentIcon(agent.type)} {agent.name.length > 25 ? agent.name.substring(0, 25) + '...' : agent.name}
            </option>
          )}
        </For>
      </select>
      <Show when={allAgents().length === 0}>
        <button
          onClick={handleDiscover}
          disabled={isDiscovering()}
          class="px-2 py-1 rounded text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 hover:text-purple-200 disabled:opacity-50 h-[28px]"
          title="Discover agents"
        >
          {isDiscovering() ? '...' : '🔍'}
        </button>
      </Show>
    </div>
  );
};

export default AgentSelector;
