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

import { createSignal, createResource } from 'solid-js';
import { aiAgentsAPI } from '../services/aiAgents/api';
import type { AgentConfig, AgentRequest, AgentResponse } from '../services/aiAgents/types';

// State
const [agents, setAgents] = createSignal<AgentConfig[]>([]);
const [selectedAgentId, setSelectedAgentId] = createSignal<string | null>(null);
const [isLoading, setIsLoading] = createSignal(false);

// Fetch agents list
const [agentsResource, { refetch: refetchAgents }] = createResource(async () => {
  try {
    const response = await aiAgentsAPI.listAgents();
    setAgents(response.agents);
    return response.agents;
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return [];
  }
});

/**
 * Get all available agents
 */
function getAgents(): AgentConfig[] {
  return agents();
}

/**
 * Get enabled and connected agents
 */
function getAvailableAgents(): AgentConfig[] {
  return agents().filter(agent => agent.enabled && agent.connected);
}

/**
 * Get selected agent
 */
function getSelectedAgent(): AgentConfig | null {
  const id = selectedAgentId();
  if (!id) return null;
  return agents().find(a => a.id === id) || null;
}

/**
 * Select an agent
 */
function selectAgent(agentId: string | null) {
  setSelectedAgentId(agentId);
}

/**
 * Query the selected agent
 */
async function queryAgent(message: string, context?: Record<string, any>): Promise<AgentResponse> {
  const agentId = selectedAgentId();
  if (!agentId) {
    throw new Error('No agent selected');
  }

  setIsLoading(true);
  try {
    const request: AgentRequest = {
      message,
      context,
      maxTokens: 2000,
    };

    const response = await aiAgentsAPI.queryAgent(agentId, request);
    return response;
  } finally {
    setIsLoading(false);
  }
}

/**
 * Register a new agent
 */
async function registerAgent(config: Partial<AgentConfig>): Promise<AgentConfig> {
  const response = await aiAgentsAPI.registerAgent(config);
  await refetchAgents();
  return response.agent;
}

/**
 * Perform health check on an agent
 */
async function healthCheck(agentId: string): Promise<void> {
  await aiAgentsAPI.healthCheck(agentId);
  await refetchAgents();
}

/**
 * Discover new agents
 */
async function discoverAgents(): Promise<AgentConfig[]> {
  const response = await aiAgentsAPI.discoverAgents();
  await refetchAgents();
  return response.agents;
}

/**
 * Refresh agents list
 */
async function refreshAgents(): Promise<void> {
  await refetchAgents();
}

export {
  agents,
  selectedAgentId,
  isLoading,
  agentsResource,
  getAgents,
  getAvailableAgents,
  getSelectedAgent,
  selectAgent,
  queryAgent,
  registerAgent,
  healthCheck,
  discoverAgents,
  refreshAgents,
};

