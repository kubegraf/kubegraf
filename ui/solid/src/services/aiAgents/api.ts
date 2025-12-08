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

import type { AgentConfig, AgentRequest, AgentResponse, AgentListResponse } from './types';

const API_BASE = '/api/ai/agents';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${errorText}`);
  }

  return response.json();
}

export const aiAgentsAPI = {
  /**
   * List all registered AI agents
   */
  listAgents: (): Promise<AgentListResponse> => fetchAPI<AgentListResponse>(''),

  /**
   * Get details for a specific agent
   */
  getAgent: (agentId: string): Promise<AgentConfig> => 
    fetchAPI<AgentConfig>(`/get?id=${encodeURIComponent(agentId)}`),

  /**
   * Send a query to a specific agent
   */
  queryAgent: (agentId: string, request: AgentRequest): Promise<AgentResponse> =>
    fetchAPI<AgentResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        ...request,
      }),
    }),

  /**
   * Register a new AI agent
   */
  registerAgent: (config: Partial<AgentConfig>): Promise<{ success: boolean; agent: AgentConfig }> =>
    fetchAPI<{ success: boolean; agent: AgentConfig }>('/register', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  /**
   * Perform health check on an agent
   */
  healthCheck: (agentId: string): Promise<{ status: string; connected: boolean; error?: string }> =>
    fetchAPI<{ status: string; connected: boolean; error?: string }>('/health', {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),

  /**
   * Discover available AI agents
   */
  discoverAgents: (): Promise<{ success: boolean; agents: AgentConfig[] }> =>
    fetchAPI<{ success: boolean; agents: AgentConfig[] }>('/discover', {
      method: 'POST',
    }),
};

