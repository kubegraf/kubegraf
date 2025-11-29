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
	// Initialize context manager
	a.contextManager = &ContextManager{
		Contexts:     make(map[string]*ClusterContext),
		ContextOrder: []string{},
	}

	// Load kubeconfig
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	// Get raw config to access all contexts
	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		return fmt.Errorf("failed to get raw config: %w", err)
	}

	// Store current context
	a.contextManager.CurrentContext = rawConfig.CurrentContext
	a.cluster = rawConfig.CurrentContext

	// Load all available contexts
	for contextName := range rawConfig.Contexts {
		a.contextManager.ContextOrder = append(a.contextManager.ContextOrder, contextName)

		// Create config for this context
		contextConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
			loadingRules,
			&clientcmd.ConfigOverrides{CurrentContext: contextName},
		)

		config, err := contextConfig.ClientConfig()
		if err != nil {
			// Store context with error
			a.contextManager.Contexts[contextName] = &ClusterContext{
				Name:      contextName,
				Connected: false,
				Error:     err.Error(),
			}
			continue
		}

		// Create clientset for this context
		clientset, err := kubernetes.NewForConfig(config)
		if err != nil {
			a.contextManager.Contexts[contextName] = &ClusterContext{
				Name:      contextName,
				Config:    config,
				Connected: false,
				Error:     err.Error(),
			}
			continue
		}

		// Create metrics client for this context
		metricsClient, _ := metricsclientset.NewForConfig(config)

		// Get server version to verify connection
		serverVersion := ""
		if versionInfo, err := clientset.Discovery().ServerVersion(); err == nil {
			serverVersion = versionInfo.GitVersion
		}

		// Store the context
		a.contextManager.Contexts[contextName] = &ClusterContext{
			Name:          contextName,
			Clientset:     clientset,
			MetricsClient: metricsClient,
			Config:        config,
			Connected:     true,
			ServerVersion: serverVersion,
		}
	}

	// Set up the current context's clients as the active ones
	if currentCtx, ok := a.contextManager.Contexts[a.contextManager.CurrentContext]; ok && currentCtx.Connected {
		a.clientset = currentCtx.Clientset
		a.metricsClient = currentCtx.MetricsClient
		a.config = currentCtx.Config
		a.connected = true
	} else {
		// Fall back to default loading if current context failed
		config, err := kubeConfig.ClientConfig()
		if err != nil {
			a.connected = false
			a.connectionError = err.Error()
		} else {
			a.config = config
			clientset, err := kubernetes.NewForConfig(config)
			if err != nil {
				a.connected = false
				a.connectionError = err.Error()
			} else {
				a.clientset = clientset
				a.metricsClient, _ = metricsclientset.NewForConfig(config)
				a.connected = true
			}
		}
	}

	// Setup UI
	a.setupUI()

	return nil
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

// Run starts the application
func (a *App) Run() error {
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
