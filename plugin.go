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
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

// PluginCapability defines what a plugin can do
type PluginCapability string

const (
	CapabilityKubernetesRead  PluginCapability = "kubernetes:read"
	CapabilityKubernetesWrite PluginCapability = "kubernetes:write"
	CapabilityNetworkAccess   PluginCapability = "network:access"
	CapabilityFileRead        PluginCapability = "file:read"
	CapabilityFileWrite       PluginCapability = "file:write"
	CapabilityUIExtension     PluginCapability = "ui:extension"
)

// PluginHook defines when a plugin should be triggered
type PluginHook string

const (
	HookOnStartup         PluginHook = "on_startup"
	HookOnResourceView    PluginHook = "on_resource_view"
	HookOnResourceAction  PluginHook = "on_resource_action"
	HookOnDeploymentView  PluginHook = "on_deployment_view"
	HookOnNamespaceChange PluginHook = "on_namespace_change"
	HookOnContextSwitch   PluginHook = "on_context_switch"
)

// PluginManifest defines the plugin configuration
type PluginManifest struct {
	Name         string             `yaml:"name" json:"name"`
	Version      string             `yaml:"version" json:"version"`
	Description  string             `yaml:"description" json:"description"`
	Author       string             `yaml:"author" json:"author"`
	Icon         string             `yaml:"icon" json:"icon"`
	Entrypoint   string             `yaml:"entrypoint" json:"entrypoint"`
	Capabilities []PluginCapability `yaml:"capabilities" json:"capabilities"`
	Hooks        []PluginHook       `yaml:"hooks" json:"hooks"`
	Commands     []PluginCommand    `yaml:"commands" json:"commands"`
	UIExtensions []UIExtension      `yaml:"ui_extensions" json:"ui_extensions"`
	Config       map[string]any     `yaml:"config" json:"config"`
}

// PluginCommand defines a command that a plugin exposes
type PluginCommand struct {
	Name        string            `yaml:"name" json:"name"`
	Description string            `yaml:"description" json:"description"`
	Args        []CommandArg      `yaml:"args" json:"args"`
	Returns     string            `yaml:"returns" json:"returns"`
	Metadata    map[string]string `yaml:"metadata" json:"metadata"`
}

// CommandArg defines an argument for a plugin command
type CommandArg struct {
	Name        string `yaml:"name" json:"name"`
	Type        string `yaml:"type" json:"type"`
	Required    bool   `yaml:"required" json:"required"`
	Default     any    `yaml:"default" json:"default"`
	Description string `yaml:"description" json:"description"`
}

// UIExtension defines a UI extension point
type UIExtension struct {
	Type       string `yaml:"type" json:"type"` // sidebar, toolbar, panel, menu
	Location   string `yaml:"location" json:"location"`
	Component  string `yaml:"component" json:"component"`
	Label      string `yaml:"label" json:"label"`
	Icon       string `yaml:"icon" json:"icon"`
	Order      int    `yaml:"order" json:"order"`
}

// PluginState represents the current state of a plugin
type PluginState string

const (
	PluginStateUnloaded PluginState = "unloaded"
	PluginStateLoading  PluginState = "loading"
	PluginStateActive   PluginState = "active"
	PluginStateError    PluginState = "error"
	PluginStateDisabled PluginState = "disabled"
)

// Plugin interface that all plugins must implement
type Plugin interface {
	// GetManifest returns the plugin manifest
	GetManifest() *PluginManifest

	// Initialize sets up the plugin
	Initialize(ctx context.Context, config map[string]any) error

	// Execute runs a plugin command
	Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error)

	// HandleHook responds to a lifecycle hook
	HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error

	// Shutdown cleans up the plugin
	Shutdown(ctx context.Context) error

	// GetState returns the current plugin state
	GetState() PluginState
}

// PluginResult represents the result of a plugin command execution
type PluginResult struct {
	Success bool           `json:"success"`
	Data    any            `json:"data,omitempty"`
	Error   string         `json:"error,omitempty"`
	Actions []PluginAction `json:"actions,omitempty"`
}

// PluginAction represents an action the plugin wants the host to perform
type PluginAction struct {
	Type    string         `json:"type"` // refresh, navigate, notify, modal
	Payload map[string]any `json:"payload"`
}

// PluginManager manages all loaded plugins
type PluginManager struct {
	plugins     map[string]Plugin
	manifests   map[string]*PluginManifest
	pluginDir   string
	mu          sync.RWMutex
	hookHandlers map[PluginHook][]string // Maps hooks to plugin names
	app         *App
}

// NewPluginManager creates a new plugin manager
func NewPluginManager(pluginDir string, app *App) *PluginManager {
	return &PluginManager{
		plugins:      make(map[string]Plugin),
		manifests:    make(map[string]*PluginManifest),
		pluginDir:    pluginDir,
		hookHandlers: make(map[PluginHook][]string),
		app:          app,
	}
}

// LoadPlugins discovers and loads all plugins from the plugin directory
func (pm *PluginManager) LoadPlugins(ctx context.Context) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Create plugin directory if it doesn't exist
	if err := os.MkdirAll(pm.pluginDir, 0755); err != nil {
		return fmt.Errorf("failed to create plugin directory: %w", err)
	}

	// Scan for plugin directories
	entries, err := os.ReadDir(pm.pluginDir)
	if err != nil {
		return fmt.Errorf("failed to read plugin directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pluginPath := filepath.Join(pm.pluginDir, entry.Name())
		manifestPath := filepath.Join(pluginPath, "manifest.yaml")

		// Check if manifest exists
		if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
			continue
		}

		// Load the manifest
		manifest, err := pm.loadManifest(manifestPath)
		if err != nil {
			fmt.Printf("Warning: Failed to load plugin manifest %s: %v\n", entry.Name(), err)
			continue
		}

		// Create and initialize the plugin based on type
		plugin, err := pm.createPlugin(manifest, pluginPath)
		if err != nil {
			fmt.Printf("Warning: Failed to create plugin %s: %v\n", manifest.Name, err)
			continue
		}

		// Initialize the plugin
		if err := plugin.Initialize(ctx, manifest.Config); err != nil {
			fmt.Printf("Warning: Failed to initialize plugin %s: %v\n", manifest.Name, err)
			continue
		}

		// Register the plugin
		pm.plugins[manifest.Name] = plugin
		pm.manifests[manifest.Name] = manifest

		// Register hooks
		for _, hook := range manifest.Hooks {
			pm.hookHandlers[hook] = append(pm.hookHandlers[hook], manifest.Name)
		}

		fmt.Printf("✓ Loaded plugin: %s v%s\n", manifest.Name, manifest.Version)
	}

	return nil
}

// loadManifest loads a plugin manifest from a YAML file
func (pm *PluginManager) loadManifest(path string) (*PluginManifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var manifest PluginManifest
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}

	return &manifest, nil
}

// createPlugin creates a plugin instance based on the manifest
func (pm *PluginManager) createPlugin(manifest *PluginManifest, pluginPath string) (Plugin, error) {
	// Check if it's a WASM plugin
	wasmPath := filepath.Join(pluginPath, manifest.Entrypoint)
	if filepath.Ext(manifest.Entrypoint) == ".wasm" {
		return NewWASMPlugin(manifest, wasmPath)
	}

	// Check if it's a native Go plugin (built-in)
	switch manifest.Name {
	case "helm":
		return NewHelmPlugin(manifest, pm.app)
	case "kustomize":
		return NewKustomizePlugin(manifest, pm.app)
	case "argocd":
		return NewArgoCDPlugin(manifest, pm.app)
	default:
		return nil, fmt.Errorf("unknown plugin type: %s", manifest.Name)
	}
}

// ExecuteCommand executes a command on a specific plugin
func (pm *PluginManager) ExecuteCommand(ctx context.Context, pluginName, command string, args map[string]any) (*PluginResult, error) {
	pm.mu.RLock()
	plugin, ok := pm.plugins[pluginName]
	pm.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("plugin not found: %s", pluginName)
	}

	return plugin.Execute(ctx, command, args)
}

// TriggerHook triggers a hook on all plugins that handle it
func (pm *PluginManager) TriggerHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	pm.mu.RLock()
	handlers := pm.hookHandlers[hook]
	pm.mu.RUnlock()

	for _, pluginName := range handlers {
		pm.mu.RLock()
		plugin := pm.plugins[pluginName]
		pm.mu.RUnlock()

		if plugin != nil {
			if err := plugin.HandleHook(ctx, hook, data); err != nil {
				fmt.Printf("Warning: Plugin %s hook %s failed: %v\n", pluginName, hook, err)
			}
		}
	}

	return nil
}

// GetPlugins returns all loaded plugins
func (pm *PluginManager) GetPlugins() map[string]*PluginManifest {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	result := make(map[string]*PluginManifest)
	for name, manifest := range pm.manifests {
		result[name] = manifest
	}
	return result
}

// GetPlugin returns a specific plugin
func (pm *PluginManager) GetPlugin(name string) (Plugin, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	plugin, ok := pm.plugins[name]
	return plugin, ok
}

// UnloadPlugin unloads a specific plugin
func (pm *PluginManager) UnloadPlugin(ctx context.Context, name string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	plugin, ok := pm.plugins[name]
	if !ok {
		return fmt.Errorf("plugin not found: %s", name)
	}

	if err := plugin.Shutdown(ctx); err != nil {
		return err
	}

	delete(pm.plugins, name)
	delete(pm.manifests, name)

	// Remove from hook handlers
	for hook, handlers := range pm.hookHandlers {
		var newHandlers []string
		for _, h := range handlers {
			if h != name {
				newHandlers = append(newHandlers, h)
			}
		}
		pm.hookHandlers[hook] = newHandlers
	}

	return nil
}

// Shutdown shuts down all plugins
func (pm *PluginManager) Shutdown(ctx context.Context) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for name, plugin := range pm.plugins {
		if err := plugin.Shutdown(ctx); err != nil {
			fmt.Printf("Warning: Failed to shutdown plugin %s: %v\n", name, err)
		}
	}

	pm.plugins = make(map[string]Plugin)
	pm.manifests = make(map[string]*PluginManifest)
	pm.hookHandlers = make(map[PluginHook][]string)

	return nil
}

// ToJSON serializes plugin info to JSON
func (pm *PluginManager) ToJSON() ([]byte, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	type PluginInfo struct {
		Manifest *PluginManifest `json:"manifest"`
		State    PluginState     `json:"state"`
	}

	info := make(map[string]PluginInfo)
	for name, manifest := range pm.manifests {
		plugin := pm.plugins[name]
		info[name] = PluginInfo{
			Manifest: manifest,
			State:    plugin.GetState(),
		}
	}

	return json.Marshal(info)
}
