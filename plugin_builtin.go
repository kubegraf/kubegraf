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
	"os/exec"
	"strings"
)

// =============================================================================
// Helm Plugin
// =============================================================================

// HelmPlugin provides Helm chart management capabilities
type HelmPlugin struct {
	manifest *PluginManifest
	app      *App
	state    PluginState
	config   map[string]any
}

// NewHelmPlugin creates a new Helm plugin
func NewHelmPlugin(manifest *PluginManifest, app *App) (*HelmPlugin, error) {
	if manifest == nil {
		manifest = &PluginManifest{
			Name:        "helm",
			Version:     "1.0.0",
			Description: "Helm chart management for Kubernetes",
			Author:      "KubeGraf",
			Icon:        "⎈",
			Capabilities: []PluginCapability{
				CapabilityKubernetesRead,
				CapabilityKubernetesWrite,
				CapabilityNetworkAccess,
			},
			Hooks: []PluginHook{
				HookOnDeploymentView,
				HookOnResourceAction,
			},
			Commands: []PluginCommand{
				{Name: "helm:list", Description: "List Helm releases", Returns: "[]HelmRelease"},
				{Name: "helm:install", Description: "Install a Helm chart", Args: []CommandArg{
					{Name: "chart", Type: "string", Required: true},
					{Name: "release", Type: "string", Required: true},
					{Name: "namespace", Type: "string", Required: false, Default: "default"},
					{Name: "values", Type: "object", Required: false},
				}},
				{Name: "helm:upgrade", Description: "Upgrade a Helm release"},
				{Name: "helm:rollback", Description: "Rollback a Helm release"},
				{Name: "helm:uninstall", Description: "Uninstall a Helm release"},
				{Name: "helm:history", Description: "Show release history"},
				{Name: "helm:values", Description: "Get release values"},
				{Name: "helm:status", Description: "Get release status"},
				{Name: "helm:search", Description: "Search Helm repositories"},
			},
			UIExtensions: []UIExtension{
				{Type: "sidebar", Location: "main", Label: "Helm Releases", Icon: "⎈", Order: 100},
				{Type: "panel", Location: "deployment-detail", Label: "Helm Info", Component: "helm-info"},
			},
		}
	}

	return &HelmPlugin{
		manifest: manifest,
		app:      app,
		state:    PluginStateUnloaded,
	}, nil
}

func (p *HelmPlugin) GetManifest() *PluginManifest { return p.manifest }
func (p *HelmPlugin) GetState() PluginState        { return p.state }

func (p *HelmPlugin) Initialize(ctx context.Context, config map[string]any) error {
	p.state = PluginStateLoading
	p.config = config

	// Check if helm is installed
	if _, err := exec.LookPath("helm"); err != nil {
		p.state = PluginStateError
		return fmt.Errorf("helm CLI not found in PATH")
	}

	p.state = PluginStateActive
	return nil
}

func (p *HelmPlugin) Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error) {
	switch command {
	case "helm:list":
		return p.listReleases(ctx, args)
	case "helm:install":
		return p.installChart(ctx, args)
	case "helm:upgrade":
		return p.upgradeRelease(ctx, args)
	case "helm:rollback":
		return p.rollbackRelease(ctx, args)
	case "helm:uninstall":
		return p.uninstallRelease(ctx, args)
	case "helm:history":
		return p.releaseHistory(ctx, args)
	case "helm:values":
		return p.releaseValues(ctx, args)
	case "helm:status":
		return p.releaseStatus(ctx, args)
	case "helm:search":
		return p.searchCharts(ctx, args)
	default:
		return &PluginResult{Success: false, Error: fmt.Sprintf("unknown command: %s", command)}, nil
	}
}

func (p *HelmPlugin) HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	// Handle lifecycle hooks
	return nil
}

func (p *HelmPlugin) Shutdown(ctx context.Context) error {
	p.state = PluginStateUnloaded
	return nil
}

// PluginHelmRelease represents a Helm release (for plugin system)
type PluginHelmRelease struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Revision   string `json:"revision"`
	Updated    string `json:"updated"`
	Status     string `json:"status"`
	Chart      string `json:"chart"`
	AppVersion string `json:"app_version"`
}

func (p *HelmPlugin) listReleases(ctx context.Context, args map[string]any) (*PluginResult, error) {
	namespace := ""
	if ns, ok := args["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	cmdArgs := []string{"list", "--output", "json"}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	} else {
		cmdArgs = append(cmdArgs, "--all-namespaces")
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	var releases []PluginHelmRelease
	if err := json.Unmarshal(output, &releases); err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: releases}, nil
}

func (p *HelmPlugin) installChart(ctx context.Context, args map[string]any) (*PluginResult, error) {
	chart, _ := args["chart"].(string)
	release, _ := args["release"].(string)
	namespace, _ := args["namespace"].(string)

	if chart == "" || release == "" {
		return &PluginResult{Success: false, Error: "chart and release are required"}, nil
	}

	if namespace == "" {
		namespace = "default"
	}

	cmdArgs := []string{"install", release, chart, "-n", namespace}

	// Add values if provided
	if values, ok := args["values"].(map[string]any); ok {
		for k, v := range values {
			cmdArgs = append(cmdArgs, "--set", fmt.Sprintf("%s=%v", k, v))
		}
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{
		Success: true,
		Data:    string(output),
		Actions: []PluginAction{
			{Type: "refresh", Payload: map[string]any{"resource": "deployments"}},
			{Type: "notify", Payload: map[string]any{"message": fmt.Sprintf("Installed %s", release), "type": "success"}},
		},
	}, nil
}

func (p *HelmPlugin) upgradeRelease(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	chart, _ := args["chart"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"upgrade", release}
	if chart != "" {
		cmdArgs = append(cmdArgs, chart)
	}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *HelmPlugin) rollbackRelease(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	revision, _ := args["revision"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"rollback", release}
	if revision != "" {
		cmdArgs = append(cmdArgs, revision)
	}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *HelmPlugin) uninstallRelease(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"uninstall", release}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *HelmPlugin) releaseHistory(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"history", release, "--output", "json"}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *HelmPlugin) releaseValues(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"get", "values", release, "--output", "json"}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *HelmPlugin) releaseStatus(ctx context.Context, args map[string]any) (*PluginResult, error) {
	release, _ := args["release"].(string)
	namespace, _ := args["namespace"].(string)

	if release == "" {
		return &PluginResult{Success: false, Error: "release is required"}, nil
	}

	cmdArgs := []string{"status", release, "--output", "json"}
	if namespace != "" {
		cmdArgs = append(cmdArgs, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *HelmPlugin) searchCharts(ctx context.Context, args map[string]any) (*PluginResult, error) {
	query, _ := args["query"].(string)
	repo, _ := args["repo"].(string)

	var cmdArgs []string
	if repo != "" {
		cmdArgs = []string{"search", "repo", repo}
	} else {
		cmdArgs = []string{"search", "hub", query}
	}
	cmdArgs = append(cmdArgs, "--output", "json")

	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

// =============================================================================
// Kustomize Plugin
// =============================================================================

// KustomizePlugin provides Kustomize overlay management
type KustomizePlugin struct {
	manifest *PluginManifest
	app      *App
	state    PluginState
	config   map[string]any
}

// NewKustomizePlugin creates a new Kustomize plugin
func NewKustomizePlugin(manifest *PluginManifest, app *App) (*KustomizePlugin, error) {
	if manifest == nil {
		manifest = &PluginManifest{
			Name:        "kustomize",
			Version:     "1.0.0",
			Description: "Kustomize overlay management",
			Author:      "KubeGraf",
			Icon:        "🔧",
			Capabilities: []PluginCapability{
				CapabilityKubernetesRead,
				CapabilityFileRead,
			},
			Commands: []PluginCommand{
				{Name: "kustomize:build", Description: "Build Kustomize overlay"},
				{Name: "kustomize:diff", Description: "Show diff between overlays"},
				{Name: "kustomize:validate", Description: "Validate Kustomize configuration"},
			},
		}
	}

	return &KustomizePlugin{
		manifest: manifest,
		app:      app,
		state:    PluginStateUnloaded,
	}, nil
}

func (p *KustomizePlugin) GetManifest() *PluginManifest { return p.manifest }
func (p *KustomizePlugin) GetState() PluginState        { return p.state }

func (p *KustomizePlugin) Initialize(ctx context.Context, config map[string]any) error {
	p.state = PluginStateLoading
	p.config = config

	// Check if kustomize or kubectl is available
	if _, err := exec.LookPath("kustomize"); err != nil {
		if _, err := exec.LookPath("kubectl"); err != nil {
			p.state = PluginStateError
			return fmt.Errorf("neither kustomize nor kubectl found in PATH")
		}
	}

	p.state = PluginStateActive
	return nil
}

func (p *KustomizePlugin) Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error) {
	switch command {
	case "kustomize:build":
		return p.build(ctx, args)
	case "kustomize:diff":
		return p.diff(ctx, args)
	case "kustomize:validate":
		return p.validate(ctx, args)
	default:
		return &PluginResult{Success: false, Error: fmt.Sprintf("unknown command: %s", command)}, nil
	}
}

func (p *KustomizePlugin) HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	return nil
}

func (p *KustomizePlugin) Shutdown(ctx context.Context) error {
	p.state = PluginStateUnloaded
	return nil
}

func (p *KustomizePlugin) build(ctx context.Context, args map[string]any) (*PluginResult, error) {
	path, _ := args["path"].(string)
	if path == "" {
		path = "."
	}

	// Try kustomize first, fall back to kubectl
	var cmd *exec.Cmd
	if _, err := exec.LookPath("kustomize"); err == nil {
		cmd = exec.CommandContext(ctx, "kustomize", "build", path)
	} else {
		cmd = exec.CommandContext(ctx, "kubectl", "kustomize", path)
	}

	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *KustomizePlugin) diff(ctx context.Context, args map[string]any) (*PluginResult, error) {
	path, _ := args["path"].(string)
	if path == "" {
		return &PluginResult{Success: false, Error: "path is required"}, nil
	}

	cmd := exec.CommandContext(ctx, "kubectl", "diff", "-k", path)
	output, _ := cmd.CombinedOutput()

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *KustomizePlugin) validate(ctx context.Context, args map[string]any) (*PluginResult, error) {
	path, _ := args["path"].(string)
	if path == "" {
		return &PluginResult{Success: false, Error: "path is required"}, nil
	}

	cmd := exec.CommandContext(ctx, "kubectl", "apply", "-k", path, "--dry-run=client", "-o", "yaml")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: "Validation successful"}, nil
}

// =============================================================================
// ArgoCD Plugin
// =============================================================================

// ArgoCDPlugin provides ArgoCD integration
type ArgoCDPlugin struct {
	manifest   *PluginManifest
	app        *App
	state      PluginState
	config     map[string]any
	serverAddr string
}

// NewArgoCDPlugin creates a new ArgoCD plugin
func NewArgoCDPlugin(manifest *PluginManifest, app *App) (*ArgoCDPlugin, error) {
	if manifest == nil {
		manifest = &PluginManifest{
			Name:        "argocd",
			Version:     "1.0.0",
			Description: "ArgoCD GitOps integration",
			Author:      "KubeGraf",
			Icon:        "🔄",
			Capabilities: []PluginCapability{
				CapabilityKubernetesRead,
				CapabilityNetworkAccess,
			},
			Commands: []PluginCommand{
				{Name: "argocd:list", Description: "List ArgoCD applications"},
				{Name: "argocd:sync", Description: "Sync an application"},
				{Name: "argocd:status", Description: "Get application status"},
				{Name: "argocd:diff", Description: "Show application diff"},
				{Name: "argocd:rollback", Description: "Rollback application"},
			},
			UIExtensions: []UIExtension{
				{Type: "sidebar", Location: "main", Label: "GitOps", Icon: "🔄", Order: 101},
			},
		}
	}

	return &ArgoCDPlugin{
		manifest: manifest,
		app:      app,
		state:    PluginStateUnloaded,
	}, nil
}

func (p *ArgoCDPlugin) GetManifest() *PluginManifest { return p.manifest }
func (p *ArgoCDPlugin) GetState() PluginState        { return p.state }

func (p *ArgoCDPlugin) Initialize(ctx context.Context, config map[string]any) error {
	p.state = PluginStateLoading
	p.config = config

	// Get ArgoCD server address from config
	if server, ok := config["server"].(string); ok {
		p.serverAddr = server
	}

	// Check if argocd CLI is available
	if _, err := exec.LookPath("argocd"); err != nil {
		p.state = PluginStateError
		return fmt.Errorf("argocd CLI not found in PATH")
	}

	p.state = PluginStateActive
	return nil
}

func (p *ArgoCDPlugin) Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error) {
	switch command {
	case "argocd:list":
		return p.listApps(ctx, args)
	case "argocd:sync":
		return p.syncApp(ctx, args)
	case "argocd:status":
		return p.appStatus(ctx, args)
	case "argocd:diff":
		return p.appDiff(ctx, args)
	case "argocd:rollback":
		return p.rollbackApp(ctx, args)
	default:
		return &PluginResult{Success: false, Error: fmt.Sprintf("unknown command: %s", command)}, nil
	}
}

func (p *ArgoCDPlugin) HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	return nil
}

func (p *ArgoCDPlugin) Shutdown(ctx context.Context) error {
	p.state = PluginStateUnloaded
	return nil
}

func (p *ArgoCDPlugin) listApps(ctx context.Context, args map[string]any) (*PluginResult, error) {
	cmd := exec.CommandContext(ctx, "argocd", "app", "list", "-o", "json")
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *ArgoCDPlugin) syncApp(ctx context.Context, args map[string]any) (*PluginResult, error) {
	appName, _ := args["app"].(string)
	if appName == "" {
		return &PluginResult{Success: false, Error: "app name is required"}, nil
	}

	cmd := exec.CommandContext(ctx, "argocd", "app", "sync", appName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *ArgoCDPlugin) appStatus(ctx context.Context, args map[string]any) (*PluginResult, error) {
	appName, _ := args["app"].(string)
	if appName == "" {
		return &PluginResult{Success: false, Error: "app name is required"}, nil
	}

	cmd := exec.CommandContext(ctx, "argocd", "app", "get", appName, "-o", "json")
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *ArgoCDPlugin) appDiff(ctx context.Context, args map[string]any) (*PluginResult, error) {
	appName, _ := args["app"].(string)
	if appName == "" {
		return &PluginResult{Success: false, Error: "app name is required"}, nil
	}

	cmd := exec.CommandContext(ctx, "argocd", "app", "diff", appName)
	output, _ := cmd.CombinedOutput()

	return &PluginResult{Success: true, Data: string(output)}, nil
}

func (p *ArgoCDPlugin) rollbackApp(ctx context.Context, args map[string]any) (*PluginResult, error) {
	appName, _ := args["app"].(string)
	revisionStr, _ := args["revision"].(string)

	if appName == "" {
		return &PluginResult{Success: false, Error: "app name is required"}, nil
	}

	cmdArgs := []string{"app", "rollback", appName}
	if revisionStr != "" {
		cmdArgs = append(cmdArgs, revisionStr)
	}

	cmd := exec.CommandContext(ctx, "argocd", cmdArgs...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return &PluginResult{Success: false, Error: string(output)}, nil
	}

	return &PluginResult{Success: true, Data: string(output)}, nil
}

// =============================================================================
// WASM Plugin (Placeholder for Extism integration)
// =============================================================================

// WASMPlugin represents a WebAssembly plugin loaded via Extism
type WASMPlugin struct {
	manifest *PluginManifest
	wasmPath string
	state    PluginState
	// In production, this would use github.com/extism/go-sdk
	// plugin   *extism.Plugin
}

// NewWASMPlugin creates a new WASM plugin
func NewWASMPlugin(manifest *PluginManifest, wasmPath string) (*WASMPlugin, error) {
	return &WASMPlugin{
		manifest: manifest,
		wasmPath: wasmPath,
		state:    PluginStateUnloaded,
	}, nil
}

func (p *WASMPlugin) GetManifest() *PluginManifest { return p.manifest }
func (p *WASMPlugin) GetState() PluginState        { return p.state }

func (p *WASMPlugin) Initialize(ctx context.Context, config map[string]any) error {
	p.state = PluginStateLoading

	// In production, load the WASM module:
	// manifest := extism.Manifest{Wasm: []extism.Wasm{extism.WasmFile{Path: p.wasmPath}}}
	// plugin, err := extism.NewPlugin(ctx, manifest, extism.PluginConfig{}, nil)
	// if err != nil {
	//     p.state = PluginStateError
	//     return err
	// }
	// p.plugin = plugin

	p.state = PluginStateActive
	return nil
}

func (p *WASMPlugin) Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error) {
	// In production:
	// input, _ := json.Marshal(map[string]any{"command": command, "args": args})
	// _, output, err := p.plugin.Call(command, input)
	// if err != nil {
	//     return &PluginResult{Success: false, Error: err.Error()}, nil
	// }
	// var result PluginResult
	// json.Unmarshal(output, &result)
	// return &result, nil

	return &PluginResult{
		Success: false,
		Error:   "WASM plugin execution requires Extism SDK (github.com/extism/go-sdk)",
	}, nil
}

func (p *WASMPlugin) HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	// Similar to Execute, call the hook handler in WASM
	return nil
}

func (p *WASMPlugin) Shutdown(ctx context.Context) error {
	// In production: p.plugin.Close()
	p.state = PluginStateUnloaded
	return nil
}

// =============================================================================
// Terraform Plugin
// =============================================================================

// TerraformPlugin provides Terraform state integration
type TerraformPlugin struct {
	manifest *PluginManifest
	app      *App
	state    PluginState
	config   map[string]any
}

// NewTerraformPlugin creates a new Terraform plugin
func NewTerraformPlugin(manifest *PluginManifest, app *App) (*TerraformPlugin, error) {
	if manifest == nil {
		manifest = &PluginManifest{
			Name:        "terraform",
			Version:     "1.0.0",
			Description: "Terraform state visualization",
			Author:      "KubeGraf",
			Icon:        "🏗️",
			Capabilities: []PluginCapability{
				CapabilityFileRead,
				CapabilityNetworkAccess,
			},
			Commands: []PluginCommand{
				{Name: "terraform:state", Description: "Show Terraform state"},
				{Name: "terraform:plan", Description: "Show Terraform plan"},
				{Name: "terraform:resources", Description: "List Terraform resources"},
			},
		}
	}

	return &TerraformPlugin{
		manifest: manifest,
		app:      app,
		state:    PluginStateUnloaded,
	}, nil
}

func (p *TerraformPlugin) GetManifest() *PluginManifest { return p.manifest }
func (p *TerraformPlugin) GetState() PluginState        { return p.state }

func (p *TerraformPlugin) Initialize(ctx context.Context, config map[string]any) error {
	p.state = PluginStateLoading
	p.config = config

	if _, err := exec.LookPath("terraform"); err != nil {
		p.state = PluginStateError
		return fmt.Errorf("terraform CLI not found in PATH")
	}

	p.state = PluginStateActive
	return nil
}

func (p *TerraformPlugin) Execute(ctx context.Context, command string, args map[string]any) (*PluginResult, error) {
	switch command {
	case "terraform:state":
		return p.showState(ctx, args)
	case "terraform:resources":
		return p.listResources(ctx, args)
	default:
		return &PluginResult{Success: false, Error: fmt.Sprintf("unknown command: %s", command)}, nil
	}
}

func (p *TerraformPlugin) HandleHook(ctx context.Context, hook PluginHook, data map[string]any) error {
	return nil
}

func (p *TerraformPlugin) Shutdown(ctx context.Context) error {
	p.state = PluginStateUnloaded
	return nil
}

func (p *TerraformPlugin) showState(ctx context.Context, args map[string]any) (*PluginResult, error) {
	dir, _ := args["dir"].(string)
	if dir == "" {
		dir = "."
	}

	cmd := exec.CommandContext(ctx, "terraform", "show", "-json")
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	return &PluginResult{Success: true, Data: json.RawMessage(output)}, nil
}

func (p *TerraformPlugin) listResources(ctx context.Context, args map[string]any) (*PluginResult, error) {
	dir, _ := args["dir"].(string)
	if dir == "" {
		dir = "."
	}

	cmd := exec.CommandContext(ctx, "terraform", "state", "list")
	cmd.Dir = dir
	output, err := cmd.Output()
	if err != nil {
		return &PluginResult{Success: false, Error: err.Error()}, nil
	}

	resources := strings.Split(strings.TrimSpace(string(output)), "\n")
	return &PluginResult{Success: true, Data: resources}, nil
}
