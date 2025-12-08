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

export type AgentType = 'codex' | 'cursor' | 'custom' | 'ollama' | 'openai' | 'claude';

export type AgentStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  endpoint: string;
  apiKey?: string; // Optional, not always exposed
  headers?: Record<string, string>;
  timeout?: number;
  enabled: boolean;
  description: string;
  icon: string;
  lastCheck?: string;
  error?: string;
  connected: boolean;
}

export interface AgentRequest {
  message: string;
  context?: Record<string, any>;
  model?: string;
  maxTokens?: number;
  stream?: boolean;
}

export interface AgentResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface AgentListResponse {
  agents: AgentConfig[];
}

