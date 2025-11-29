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
	// Load kubeconfig
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	config, err := kubeConfig.ClientConfig()
	if err != nil {
		return fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	// Save config for later use
	a.config = config

	// Create clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create clientset: %w", err)
	}
	a.clientset = clientset

	// Create metrics client
	metricsClient, err := metricsclientset.NewForConfig(config)
	if err == nil {
		a.metricsClient = metricsClient
	}

	// Get current context
	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		return fmt.Errorf("failed to get raw config: %w", err)
	}
	a.cluster = rawConfig.CurrentContext

	// Setup UI
	a.setupUI()

	return nil
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
