// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package plugins

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

// Plugin represents a KubeGraf plugin
type Plugin interface {
	// Metadata returns plugin information
	Metadata() PluginMetadata

	// Initialize is called when the plugin is loaded
	Initialize(ctx context.Context, api PluginAPI) error

	// Shutdown is called when the plugin is unloaded
	Shutdown() error
}

// PluginMetadata contains plugin information
type PluginMetadata struct {
	Name        string   `json:"name" yaml:"name"`
	Version     string   `json:"version" yaml:"version"`
	Description string   `json:"description" yaml:"description"`
	Author      string   `json:"author" yaml:"author"`
	Homepage    string   `json:"homepage" yaml:"homepage"`
	License     string   `json:"license" yaml:"license"`
	Keywords    []string `json:"keywords" yaml:"keywords"`
	Provides    []string `json:"provides" yaml:"provides"` // Feature types: column, action, view, hook
}

// PluginAPI provides access to KubeGraf functionality
type PluginAPI interface {
	// GetNamespace returns the current namespace
	GetNamespace() string

	// GetClusterName returns the current cluster name
	GetClusterName() string

	// ExecuteKubectl runs a kubectl command and returns output
	ExecuteKubectl(args ...string) (string, error)

	// GetResource fetches a Kubernetes resource as JSON
	GetResource(kind, namespace, name string) (map[string]interface{}, error)

	// ListResources lists Kubernetes resources
	ListResources(kind, namespace string) ([]map[string]interface{}, error)

	// RegisterColumn adds a custom column to resource tables
	RegisterColumn(resourceKind string, column ColumnDefinition) error

	// RegisterAction adds a custom action for resources
	RegisterAction(resourceKind string, action ActionDefinition) error

	// RegisterView adds a custom view/tab
	RegisterView(view ViewDefinition) error

	// RegisterHook adds a hook for resource events
	RegisterHook(hook HookDefinition) error

	// ShowNotification displays a notification to the user
	ShowNotification(level, message string)

	// Log logs a message
	Log(level, message string)
}

// ColumnDefinition defines a custom column
type ColumnDefinition struct {
	Name     string                                             `json:"name" yaml:"name"`
	Header   string                                             `json:"header" yaml:"header"`
	Width    int                                                `json:"width" yaml:"width"`
	Priority int                                                `json:"priority" yaml:"priority"`
	GetValue func(resource map[string]interface{}) (string, error) `json:"-"`
	// For external plugins, use command instead
	Command string   `json:"command" yaml:"command"`
	Args    []string `json:"args" yaml:"args"`
}

// ActionDefinition defines a custom action
type ActionDefinition struct {
	Name        string   `json:"name" yaml:"name"`
	Description string   `json:"description" yaml:"description"`
	Shortcut    string   `json:"shortcut" yaml:"shortcut"`
	Icon        string   `json:"icon" yaml:"icon"`
	Command     string   `json:"command" yaml:"command"`
	Args        []string `json:"args" yaml:"args"`
	Confirm     bool     `json:"confirm" yaml:"confirm"`
	// For Go plugins
	Execute func(ctx context.Context, resource map[string]interface{}) error `json:"-"`
}

// ViewDefinition defines a custom view
type ViewDefinition struct {
	Name        string `json:"name" yaml:"name"`
	Title       string `json:"title" yaml:"title"`
	Icon        string `json:"icon" yaml:"icon"`
	Description string `json:"description" yaml:"description"`
	// For external plugins
	Command string   `json:"command" yaml:"command"`
	Args    []string `json:"args" yaml:"args"`
	// For Go plugins
	Render func(ctx context.Context) (string, error) `json:"-"`
}

// HookDefinition defines a hook for resource events
type HookDefinition struct {
	Name       string   `json:"name" yaml:"name"`
	Events     []string `json:"events" yaml:"events"` // created, updated, deleted
	Resources  []string `json:"resources" yaml:"resources"`
	Command    string   `json:"command" yaml:"command"`
	Args       []string `json:"args" yaml:"args"`
	// For Go plugins
	OnEvent func(ctx context.Context, event HookEvent) error `json:"-"`
}

// HookEvent represents a resource event
type HookEvent struct {
	Type      string                 `json:"type"`
	Resource  string                 `json:"resource"`
	Namespace string                 `json:"namespace"`
	Name      string                 `json:"name"`
	Object    map[string]interface{} `json:"object"`
}

// PluginManager manages plugin lifecycle
type PluginManager struct {
	plugins     map[string]*LoadedPlugin
	pluginDir   string
	api         PluginAPI
	mu          sync.RWMutex
	columns     map[string][]ColumnDefinition
	actions     map[string][]ActionDefinition
	views       []ViewDefinition
	hooks       []HookDefinition
}

// LoadedPlugin represents a loaded plugin
type LoadedPlugin struct {
	Metadata PluginMetadata
	Path     string
	Type     string // "builtin", "go", "exec"
	Plugin   Plugin // For Go plugins
	Process  *exec.Cmd // For external plugins
}

// NewPluginManager creates a new plugin manager
func NewPluginManager(api PluginAPI) *PluginManager {
	homeDir, _ := os.UserHomeDir()
	pluginDir := filepath.Join(homeDir, ".kubegraf", "plugins")

	return &PluginManager{
		plugins:   make(map[string]*LoadedPlugin),
		pluginDir: pluginDir,
		api:       api,
		columns:   make(map[string][]ColumnDefinition),
		actions:   make(map[string][]ActionDefinition),
	}
}

// SetPluginDir sets the plugin directory
func (pm *PluginManager) SetPluginDir(dir string) {
	pm.pluginDir = dir
}

// LoadPlugins discovers and loads all plugins
func (pm *PluginManager) LoadPlugins(ctx context.Context) error {
	// Create plugin directory if it doesn't exist
	if err := os.MkdirAll(pm.pluginDir, 0755); err != nil {
		return fmt.Errorf("failed to create plugin directory: %w", err)
	}

	// Scan for plugins
	entries, err := os.ReadDir(pm.pluginDir)
	if err != nil {
		return fmt.Errorf("failed to read plugin directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pluginPath := filepath.Join(pm.pluginDir, entry.Name())
		if err := pm.loadPlugin(ctx, pluginPath); err != nil {
			pm.api.Log("warning", fmt.Sprintf("Failed to load plugin %s: %v", entry.Name(), err))
		}
	}

	return nil
}

// loadPlugin loads a single plugin
func (pm *PluginManager) loadPlugin(ctx context.Context, path string) error {
	// Look for plugin.yaml or plugin.json
	var metadata PluginMetadata
	var metadataPath string

	if _, err := os.Stat(filepath.Join(path, "plugin.yaml")); err == nil {
		metadataPath = filepath.Join(path, "plugin.yaml")
		data, err := os.ReadFile(metadataPath)
		if err != nil {
			return fmt.Errorf("failed to read plugin.yaml: %w", err)
		}
		if err := yaml.Unmarshal(data, &metadata); err != nil {
			return fmt.Errorf("failed to parse plugin.yaml: %w", err)
		}
	} else if _, err := os.Stat(filepath.Join(path, "plugin.json")); err == nil {
		metadataPath = filepath.Join(path, "plugin.json")
		data, err := os.ReadFile(metadataPath)
		if err != nil {
			return fmt.Errorf("failed to read plugin.json: %w", err)
		}
		if err := json.Unmarshal(data, &metadata); err != nil {
			return fmt.Errorf("failed to parse plugin.json: %w", err)
		}
	} else {
		return fmt.Errorf("no plugin metadata found")
	}

	loaded := &LoadedPlugin{
		Metadata: metadata,
		Path:     path,
		Type:     "exec", // Default to executable plugin
	}

	pm.mu.Lock()
	pm.plugins[metadata.Name] = loaded
	pm.mu.Unlock()

	pm.api.Log("info", fmt.Sprintf("Loaded plugin: %s v%s", metadata.Name, metadata.Version))

	return nil
}

// GetPlugin returns a loaded plugin by name
func (pm *PluginManager) GetPlugin(name string) (*LoadedPlugin, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	plugin, ok := pm.plugins[name]
	return plugin, ok
}

// ListPlugins returns all loaded plugins
func (pm *PluginManager) ListPlugins() []PluginMetadata {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var plugins []PluginMetadata
	for _, p := range pm.plugins {
		plugins = append(plugins, p.Metadata)
	}
	return plugins
}

// UnloadPlugin unloads a plugin
func (pm *PluginManager) UnloadPlugin(name string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	plugin, ok := pm.plugins[name]
	if !ok {
		return fmt.Errorf("plugin not found: %s", name)
	}

	// Cleanup based on plugin type
	if plugin.Plugin != nil {
		plugin.Plugin.Shutdown()
	}
	if plugin.Process != nil && plugin.Process.Process != nil {
		plugin.Process.Process.Kill()
	}

	delete(pm.plugins, name)
	return nil
}

// RegisterColumn registers a custom column
func (pm *PluginManager) RegisterColumn(resourceKind string, column ColumnDefinition) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.columns[resourceKind] = append(pm.columns[resourceKind], column)
	return nil
}

// GetColumns returns custom columns for a resource kind
func (pm *PluginManager) GetColumns(resourceKind string) []ColumnDefinition {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.columns[resourceKind]
}

// RegisterAction registers a custom action
func (pm *PluginManager) RegisterAction(resourceKind string, action ActionDefinition) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.actions[resourceKind] = append(pm.actions[resourceKind], action)
	return nil
}

// GetActions returns custom actions for a resource kind
func (pm *PluginManager) GetActions(resourceKind string) []ActionDefinition {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.actions[resourceKind]
}

// RegisterView registers a custom view
func (pm *PluginManager) RegisterView(view ViewDefinition) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.views = append(pm.views, view)
	return nil
}

// GetViews returns all custom views
func (pm *PluginManager) GetViews() []ViewDefinition {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.views
}

// RegisterHook registers an event hook
func (pm *PluginManager) RegisterHook(hook HookDefinition) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.hooks = append(pm.hooks, hook)
	return nil
}

// TriggerHooks triggers hooks for an event
func (pm *PluginManager) TriggerHooks(ctx context.Context, event HookEvent) {
	pm.mu.RLock()
	hooks := pm.hooks
	pm.mu.RUnlock()

	for _, hook := range hooks {
		// Check if hook matches the event
		eventMatch := false
		for _, e := range hook.Events {
			if e == event.Type || e == "*" {
				eventMatch = true
				break
			}
		}
		if !eventMatch {
			continue
		}

		resourceMatch := false
		for _, r := range hook.Resources {
			if r == event.Resource || r == "*" {
				resourceMatch = true
				break
			}
		}
		if !resourceMatch {
			continue
		}

		// Execute hook
		if hook.OnEvent != nil {
			go hook.OnEvent(ctx, event)
		} else if hook.Command != "" {
			go pm.executeHookCommand(ctx, hook, event)
		}
	}
}

// executeHookCommand executes a hook command
func (pm *PluginManager) executeHookCommand(ctx context.Context, hook HookDefinition, event HookEvent) {
	eventJSON, _ := json.Marshal(event)

	args := make([]string, len(hook.Args))
	for i, arg := range hook.Args {
		// Replace placeholders
		arg = strings.ReplaceAll(arg, "{{.Type}}", event.Type)
		arg = strings.ReplaceAll(arg, "{{.Resource}}", event.Resource)
		arg = strings.ReplaceAll(arg, "{{.Namespace}}", event.Namespace)
		arg = strings.ReplaceAll(arg, "{{.Name}}", event.Name)
		arg = strings.ReplaceAll(arg, "{{.Event}}", string(eventJSON))
		args[i] = arg
	}

	cmd := exec.CommandContext(ctx, hook.Command, args...)
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("KUBEGRAF_EVENT_TYPE=%s", event.Type),
		fmt.Sprintf("KUBEGRAF_EVENT_RESOURCE=%s", event.Resource),
		fmt.Sprintf("KUBEGRAF_EVENT_NAMESPACE=%s", event.Namespace),
		fmt.Sprintf("KUBEGRAF_EVENT_NAME=%s", event.Name),
	)

	if err := cmd.Run(); err != nil {
		pm.api.Log("error", fmt.Sprintf("Hook %s failed: %v", hook.Name, err))
	}
}

// InstallPlugin installs a plugin from a URL or path
func (pm *PluginManager) InstallPlugin(ctx context.Context, source string) error {
	// Determine source type
	if strings.HasPrefix(source, "https://") || strings.HasPrefix(source, "http://") {
		return pm.installFromURL(ctx, source)
	} else if strings.HasPrefix(source, "github.com/") {
		return pm.installFromGitHub(ctx, source)
	}
	return pm.installFromPath(ctx, source)
}

// installFromURL downloads and installs a plugin
func (pm *PluginManager) installFromURL(ctx context.Context, url string) error {
	// Implementation would download and extract plugin
	return fmt.Errorf("URL installation not yet implemented")
}

// installFromGitHub clones a plugin from GitHub
func (pm *PluginManager) installFromGitHub(ctx context.Context, repo string) error {
	parts := strings.Split(repo, "/")
	if len(parts) < 3 {
		return fmt.Errorf("invalid GitHub repo format: %s", repo)
	}

	pluginName := parts[len(parts)-1]
	targetDir := filepath.Join(pm.pluginDir, pluginName)

	cmd := exec.CommandContext(ctx, "git", "clone", "https://"+repo, targetDir)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}

	return pm.loadPlugin(ctx, targetDir)
}

// installFromPath copies a plugin from a local path
func (pm *PluginManager) installFromPath(ctx context.Context, path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("path not found: %s", path)
	}

	if !info.IsDir() {
		return fmt.Errorf("path must be a directory: %s", path)
	}

	pluginName := filepath.Base(path)
	targetDir := filepath.Join(pm.pluginDir, pluginName)

	// Copy directory
	cmd := exec.CommandContext(ctx, "cp", "-r", path, targetDir)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to copy plugin: %w", err)
	}

	return pm.loadPlugin(ctx, targetDir)
}

// UninstallPlugin removes a plugin
func (pm *PluginManager) UninstallPlugin(name string) error {
	pm.mu.Lock()
	plugin, ok := pm.plugins[name]
	if !ok {
		pm.mu.Unlock()
		return fmt.Errorf("plugin not found: %s", name)
	}

	// Cleanup
	if plugin.Plugin != nil {
		plugin.Plugin.Shutdown()
	}
	delete(pm.plugins, name)
	pm.mu.Unlock()

	// Remove plugin directory
	return os.RemoveAll(plugin.Path)
}

// SearchPlugins searches the plugin registry (placeholder)
func (pm *PluginManager) SearchPlugins(ctx context.Context, query string) ([]PluginMetadata, error) {
	// This would connect to a plugin registry
	// For now, return empty list
	return nil, nil
}
