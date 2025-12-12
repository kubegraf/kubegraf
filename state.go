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

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"sigs.k8s.io/yaml"
)

// State represents the application state stored on disk
type State struct {
	LastSeenAt string `json:"last_seen_at" yaml:"last_seen_at"`
}

// StateManager manages reading and writing application state
type StateManager struct {
	statePath string
}

// NewStateManager creates a new state manager
func NewStateManager() (*StateManager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	kubegrafDir := filepath.Join(homeDir, ".kubegraf")
	statePath := filepath.Join(kubegrafDir, "state.yaml")

	// Ensure directory exists
	if err := os.MkdirAll(kubegrafDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create kubegraf directory: %w", err)
	}

	return &StateManager{
		statePath: statePath,
	}, nil
}

// ReadState reads the state from disk
// Returns the state with last_seen_at defaulting to now-1h if missing
func (sm *StateManager) ReadState() (*State, error) {
	state := &State{}

	// Check if state file exists
	if _, err := os.Stat(sm.statePath); os.IsNotExist(err) {
		// File doesn't exist, return default state (now - 1 hour)
		now := time.Now()
		oneHourAgo := now.Add(-1 * time.Hour)
		state.LastSeenAt = oneHourAgo.Format(time.RFC3339)
		return state, nil
	}

	// Read existing state file
	data, err := os.ReadFile(sm.statePath)
	if err != nil {
		// If read fails, return default state
		now := time.Now()
		oneHourAgo := now.Add(-1 * time.Hour)
		state.LastSeenAt = oneHourAgo.Format(time.RFC3339)
		return state, nil
	}

	// Parse YAML
	if err := yaml.Unmarshal(data, state); err != nil {
		// If parse fails, return default state
		now := time.Now()
		oneHourAgo := now.Add(-1 * time.Hour)
		state.LastSeenAt = oneHourAgo.Format(time.RFC3339)
		return state, nil
	}

	// If last_seen_at is empty, default to now - 1 hour
	if state.LastSeenAt == "" {
		now := time.Now()
		oneHourAgo := now.Add(-1 * time.Hour)
		state.LastSeenAt = oneHourAgo.Format(time.RFC3339)
	}

	return state, nil
}

// WriteState writes the state to disk
func (sm *StateManager) WriteState(state *State) error {
	// Marshal to YAML
	data, err := yaml.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	// Write to file atomically
	tmpPath := sm.statePath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write state file: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tmpPath, sm.statePath); err != nil {
		return fmt.Errorf("failed to rename state file: %w", err)
	}

	return nil
}

// UpdateLastSeenAt updates the last_seen_at timestamp to now
func (sm *StateManager) UpdateLastSeenAt() error {
	state := &State{
		LastSeenAt: time.Now().Format(time.RFC3339),
	}
	return sm.WriteState(state)
}

// GetLastSeenAtTime parses and returns the last_seen_at time
func (sm *StateManager) GetLastSeenAtTime() (time.Time, error) {
	state, err := sm.ReadState()
	if err != nil {
		return time.Time{}, err
	}

	if state.LastSeenAt == "" {
		now := time.Now()
		return now.Add(-1 * time.Hour), nil
	}

	return time.Parse(time.RFC3339, state.LastSeenAt)
}


