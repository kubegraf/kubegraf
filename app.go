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
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// NewApp creates a new application instance
func NewApp(namespace string) *App {
	ctx, cancel := context.WithCancel(context.Background())

	return &App{
		namespace:  namespace,
		events:     make([]Event, 0, 1000),
		stopCh:     make(chan struct{}),
		ctx:        ctx,
		cancel:     cancel,
		tableData:  &TableData{},
		tabs:       []string{ResourcePod, ResourceDeployment, ResourceStatefulSet, ResourceDaemonSet, ResourceService, ResourceIngress, ResourceConfigMap, ResourceSecret, ResourceCronJob, ResourceJob, ResourceNodes, ResourceMap},
		currentTab: 0, // Default to Pods
	}
}

// Initialize sets up the application
func (a *App) Initialize() error {
	if err := a.loadContexts(clientcmd.NewDefaultClientConfigLoadingRules(), &clientcmd.ConfigOverrides{}); err != nil {
		return err
	}

	// Initialize vulnerability scanner
	a.vulnerabilityScanner = NewVulnerabilityScanner(a)
	a.vulnerabilityScanner.StartBackgroundRefresh(a.ctx)

	// Initialize anomaly detector
	a.anomalyDetector = NewAnomalyDetector(a)

	// Initialize ML recommender
	a.mlRecommender = NewMLRecommender(a)

	// Initialize event monitor
	a.eventMonitor = NewEventMonitor(a)

	// Initialize connector manager
	a.connectorManager = NewConnectorManager(a)

	// Initialize SRE Agent
	a.sreAgent = NewSREAgent(a)

	// Start monitoring (will wait for cluster connection)
	a.eventMonitor.Start(a.ctx)

	// Setup UI - only for TUI mode, not for web mode
	// Web mode doesn't need TUI components
	// This will be called separately when running TUI mode

	return nil
}

// loadContexts configures the app's cluster contexts using the provided loading rules
func (a *App) loadContexts(loadingRules *clientcmd.ClientConfigLoadingRules, configOverrides *clientcmd.ConfigOverrides) error {
	// Initialize context manager fresh each time
	a.contextManager = &ContextManager{
		Contexts:     make(map[string]*ClusterContext),
		ContextOrder: []string{},
	}

	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		return fmt.Errorf("failed to get raw config: %w", err)
	}

	if len(rawConfig.Contexts) == 0 {
		return fmt.Errorf("no Kubernetes contexts found")
	}

	a.contextManager.CurrentContext = rawConfig.CurrentContext
	a.cluster = rawConfig.CurrentContext

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	contextChan := make(chan struct {
		name    string
		context *ClusterContext
	}, len(rawConfig.Contexts))

	for contextName := range rawConfig.Contexts {
		a.contextManager.ContextOrder = append(a.contextManager.ContextOrder, contextName)

		go func(name string) {
			contextConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
				loadingRules,
				&clientcmd.ConfigOverrides{CurrentContext: name},
			)

			config, err := contextConfig.ClientConfig()
			if err != nil {
				contextChan <- struct {
					name    string
					context *ClusterContext
				}{
					name: name,
					context: &ClusterContext{
						Name:      name,
						Connected: false,
						Error:     err.Error(),
					},
				}
				return
			}

			clientset, err := kubernetes.NewForConfig(config)
			if err != nil {
				contextChan <- struct {
					name    string
					context *ClusterContext
				}{
					name: name,
					context: &ClusterContext{
						Name:      name,
						Config:    config,
						Connected: false,
						Error:     err.Error(),
					},
				}
				return
			}

			metricsClient, _ := metricsclientset.NewForConfig(config)

			serverVersion := ""
			versionChan := make(chan string, 1)
			go func() {
				if versionInfo, err := clientset.Discovery().ServerVersion(); err == nil {
					versionChan <- versionInfo.GitVersion
				} else {
					versionChan <- ""
				}
			}()

			select {
			case serverVersion = <-versionChan:
			case <-time.After(2 * time.Second):
				serverVersion = ""
			}

			contextChan <- struct {
				name    string
				context *ClusterContext
			}{
				name: name,
				context: &ClusterContext{
					Name:          name,
					Clientset:     clientset,
					MetricsClient: metricsClient,
					Config:        config,
					Connected:     true,
					ServerVersion: serverVersion,
				},
			}
		}(contextName)
	}

	collected := 0
	for collected < len(rawConfig.Contexts) {
		select {
		case result := <-contextChan:
			a.contextManager.Contexts[result.name] = result.context
			collected++
		case <-ctx.Done():
			for _, contextName := range a.contextManager.ContextOrder {
				if _, exists := a.contextManager.Contexts[contextName]; !exists {
					a.contextManager.Contexts[contextName] = &ClusterContext{
						Name:      contextName,
						Connected: false,
						Error:     "Connection timeout",
					}
				}
			}
			break
		}
	}

	if currentCtx, ok := a.contextManager.Contexts[a.contextManager.CurrentContext]; ok && currentCtx.Connected {
		a.clientset = currentCtx.Clientset
		a.metricsClient = currentCtx.MetricsClient
		a.config = currentCtx.Config
		a.connected = true
		a.connectionError = ""
		return nil
	}

	config, err := kubeConfig.ClientConfig()
	if err != nil {
		a.connected = false
		a.connectionError = err.Error()
		return err
	}

	a.config = config
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		a.connected = false
		a.connectionError = err.Error()
		return err
	}

	a.clientset = clientset
	a.metricsClient, _ = metricsclientset.NewForConfig(config)
	a.connected = true
	a.connectionError = ""
	return nil
}

// ConnectWithKubeconfig reloads the application contexts from the provided kubeconfig path
func (a *App) ConnectWithKubeconfig(kubeconfigPath string) error {
	if kubeconfigPath == "" {
		return fmt.Errorf("kubeconfig path is required")
	}

	loadingRules := &clientcmd.ClientConfigLoadingRules{
		ExplicitPath: kubeconfigPath,
		Precedence:   []string{kubeconfigPath},
	}

	return a.loadContexts(loadingRules, &clientcmd.ConfigOverrides{})
}

// SwitchContext switches to a different cluster context
func (a *App) SwitchContext(contextName string) error {
	a.contextManager.mu.Lock()
	defer a.contextManager.mu.Unlock()

	ctx, ok := a.contextManager.Contexts[contextName]
	if !ok {
		return fmt.Errorf("context %s not found", contextName)
	}

	if !ctx.Connected {
		return fmt.Errorf("context %s is not connected: %s", contextName, ctx.Error)
	}

	// Update active context
	a.contextManager.CurrentContext = contextName
	a.cluster = contextName
	a.clientset = ctx.Clientset
	a.metricsClient = ctx.MetricsClient
	a.config = ctx.Config
	a.connected = true
	a.connectionError = ""

	return nil
}

// GetContexts returns a list of all available context names
func (a *App) GetContexts() []string {
	a.contextManager.mu.RLock()
	defer a.contextManager.mu.RUnlock()
	return a.contextManager.ContextOrder
}

// GetContextInfo returns information about a specific context
func (a *App) GetContextInfo(contextName string) *ClusterContext {
	a.contextManager.mu.RLock()
	defer a.contextManager.mu.RUnlock()
	return a.contextManager.Contexts[contextName]
}

// GetCurrentContext returns the name of the current context
func (a *App) GetCurrentContext() string {
	a.contextManager.mu.RLock()
	defer a.contextManager.mu.RUnlock()
	return a.contextManager.CurrentContext
}

// Run starts the application (TUI mode only)
func (a *App) Run() error {
	// Setup UI for TUI mode
	a.setupUI()

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		a.Shutdown()
		os.Exit(0)
	}()

	// Start background tasks AFTER app.Run() starts
	go func() {
		// Small delay to ensure app is fully started
		time.Sleep(100 * time.Millisecond)

		// Set input capture after app is running (CRITICAL!)
		a.table.SetInputCapture(a.handleKeyPress)
		a.app.SetInputCapture(a.handleKeyPress)

		// Mark as initialized
		a.isInitialized = true

		// Load initial resources
		a.refreshCurrentTab()
		a.updateStatusBar()

		// Start watchers
		go a.watchEvents()
		go a.updateLoop()
	}()

	// Run application (this blocks until quit)
	return a.app.Run()
}

// Shutdown gracefully shuts down the application
func (a *App) Shutdown() {
	a.cancel()
	select {
	case <-a.stopCh:
	default:
		close(a.stopCh)
	}
	a.app.Stop()
}

// GetClientset returns the Kubernetes clientset for MCP tools
func (a *App) GetClientset() interface{} {
	return a.clientset
}

// IsConnected returns whether the app is connected to a Kubernetes cluster
func (a *App) IsConnected() bool {
	return a.connected && a.clientset != nil
}
