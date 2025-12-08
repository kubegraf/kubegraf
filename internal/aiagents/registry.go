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

package aiagents

import (
	"context"
	"sync"
	"time"
)

// Registry manages all registered AI agents
type Registry struct {
	agents map[string]AgentInterface
	mu     sync.RWMutex
}

// NewRegistry creates a new agent registry
func NewRegistry() *Registry {
	return &Registry{
		agents: make(map[string]AgentInterface),
	}
}

// Register adds an agent to the registry
func (r *Registry) Register(agent AgentInterface) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.agents[agent.ID()] = agent
	return nil
}

// Unregister removes an agent from the registry
func (r *Registry) Unregister(agentID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if agent, exists := r.agents[agentID]; exists {
		agent.Disconnect()
		delete(r.agents, agentID)
	}
}

// Get retrieves an agent by ID
func (r *Registry) Get(agentID string) (AgentInterface, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agent, exists := r.agents[agentID]
	return agent, exists
}

// List returns all registered agents
func (r *Registry) List() []AgentInterface {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agents := make([]AgentInterface, 0, len(r.agents))
	for _, agent := range r.agents {
		agents = append(agents, agent)
	}
	return agents
}

// GetEnabled returns all enabled agents
func (r *Registry) GetEnabled() []AgentInterface {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agents := make([]AgentInterface, 0)
	for _, agent := range r.agents {
		if agent.GetConfig().Enabled && agent.IsConnected() {
			agents = append(agents, agent)
		}
	}
	return agents
}

// HealthCheck performs health checks on all agents
func (r *Registry) HealthCheck(ctx context.Context) {
	r.mu.RLock()
	agents := make([]AgentInterface, 0, len(r.agents))
	for _, agent := range r.agents {
		agents = append(agents, agent)
	}
	r.mu.RUnlock()

	for _, agent := range agents {
		config := agent.GetConfig()
		if !config.Enabled {
			continue
		}

		checkCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		err := agent.HealthCheck(checkCtx)
		cancel()

		config.LastCheck = time.Now()
		if err != nil {
			config.Status = AgentStatusError
			config.Error = err.Error()
		} else if agent.IsConnected() {
			config.Status = AgentStatusConnected
			config.Error = ""
		} else {
			config.Status = AgentStatusDisconnected
		}
	}
}

// globalRegistry is the global agent registry instance
var globalRegistry *Registry
var registryOnce sync.Once

// GetRegistry returns the global agent registry
func GetRegistry() *Registry {
	registryOnce.Do(func() {
		globalRegistry = NewRegistry()
	})
	return globalRegistry
}

