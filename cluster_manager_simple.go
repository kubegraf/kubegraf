// Copyright 2025 KubeGraf Contributors
package main

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// ClusterInfo represents a cluster's information for the UI
type ClusterInfo struct {
	Name           string `json:"name"`
	ContextName    string `json:"contextName"`
	KubeconfigPath string `json:"kubeconfigPath"`
	IsActive       bool   `json:"isActive"`
	IsReachable    bool   `json:"isReachable"`
	Error          string `json:"error,omitempty"`
}

// SimpleClusterManager provides minimal cluster management
// Based on industry standards: Lens, Headlamp, Komodor patterns
type SimpleClusterManager struct {
	mu             sync.RWMutex
	kubeconfigPath string
	clusters       map[string]*ClusterInfo
	contexts       map[string]*api.Context
	clientsets     map[string]kubernetes.Interface
	metricsClients map[string]metricsclientset.Interface
	configs        map[string]*rest.Config
	currentContext string
}

// NewSimpleClusterManager creates a new simple cluster manager
func NewSimpleClusterManager(kubeconfigPath string) (*SimpleClusterManager, error) {
	scm := &SimpleClusterManager{
		kubeconfigPath: kubeconfigPath,
		clusters:       make(map[string]*ClusterInfo),
		contexts:       make(map[string]*api.Context),
		clientsets:     make(map[string]kubernetes.Interface),
		metricsClients: make(map[string]metricsclientset.Interface),
		configs:        make(map[string]*rest.Config),
	}

	if err := scm.loadContexts(); err != nil {
		return nil, fmt.Errorf("failed to load contexts: %w", err)
	}

	return scm, nil
}

// loadContexts reads kubeconfig and loads all contexts
func (scm *SimpleClusterManager) loadContexts() error {
	config, err := clientcmd.LoadFromFile(scm.kubeconfigPath)
	if err != nil {
		return err
	}

	scm.mu.Lock()
	defer scm.mu.Unlock()

	// Load all contexts
	for name, ctx := range config.Contexts {
		scm.contexts[name] = ctx
		scm.clusters[name] = &ClusterInfo{
			Name:           getDisplayName(name),
			ContextName:    name,
			KubeconfigPath: scm.kubeconfigPath,
			IsActive:       false,
		}
	}

	// Set the current context from kubeconfig (industry standard pattern)
	// Similar to how Headlamp, Lens, and k9s detect the active context
	if config.CurrentContext != "" {
		if _, exists := scm.contexts[config.CurrentContext]; exists {
			scm.currentContext = config.CurrentContext
			if cluster, ok := scm.clusters[config.CurrentContext]; ok {
				cluster.IsActive = true
			}
		}
	}

	return nil
}

// ListClusters returns all cluster information
func (scm *SimpleClusterManager) ListClusters() []*ClusterInfo {
	scm.mu.RLock()
	defer scm.mu.RUnlock()

	var clusters []*ClusterInfo
	for _, cluster := range scm.clusters {
		clusterCopy := *cluster
		clusters = append(clusters, &clusterCopy)
	}
	return clusters
}

// GetCurrentCluster returns the currently active cluster
func (scm *SimpleClusterManager) GetCurrentCluster() *ClusterInfo {
	scm.mu.RLock()
	defer scm.mu.RUnlock()

	if scm.currentContext == "" {
		return nil
	}

	if cluster, exists := scm.clusters[scm.currentContext]; exists {
		clusterCopy := *cluster
		return &clusterCopy
	}
	return nil
}

// SwitchCluster switches to a different cluster by context name
// This is the key simplification: in-memory swap only
func (scm *SimpleClusterManager) SwitchCluster(contextName string) error {
	scm.mu.Lock()
	defer scm.mu.Unlock()

	// Verify context exists
	if _, exists := scm.contexts[contextName]; !exists {
		return fmt.Errorf("context %s not found", contextName)
	}

	// Mark previous cluster as inactive
	for _, cluster := range scm.clusters {
		cluster.IsActive = false
	}

	// Build clientset if not exists (lazy loading)
	if _, exists := scm.clientsets[contextName]; !exists {
		if err := scm.buildClientsetForContext(contextName); err != nil {
			scm.clusters[contextName].IsReachable = false
			scm.clusters[contextName].Error = err.Error()
			return fmt.Errorf("failed to connect to cluster: %w", err)
		}
	}

	// Mark as active
	scm.currentContext = contextName
	scm.clusters[contextName].IsActive = true
	scm.clusters[contextName].IsReachable = true
	scm.clusters[contextName].Error = ""

	return nil
}

// buildClientsetForContext creates a clientset for a specific context
func (scm *SimpleClusterManager) buildClientsetForContext(contextName string) error {
	// Load kubeconfig with explicit context
	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: scm.kubeconfigPath}
	configOverrides := &clientcmd.ConfigOverrides{CurrentContext: contextName}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	restConfig, err := kubeConfig.ClientConfig()
	if err != nil {
		return fmt.Errorf("failed to build config: %w", err)
	}

	// Create Kubernetes clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("failed to create clientset: %w", err)
	}

	// Create metrics clientset (optional, best effort)
	var metricsClient metricsclientset.Interface
	metricsClient, err = metricsclientset.NewForConfig(restConfig)
	if err != nil {
		// Metrics not available is not fatal
		fmt.Printf("Metrics client not available for %s: %v\n", contextName, err)
	}

	scm.clientsets[contextName] = clientset
	scm.metricsClients[contextName] = metricsClient
	scm.configs[contextName] = restConfig

	return nil
}

// GetClientset returns the clientset for current or specified context
func (scm *SimpleClusterManager) GetClientset(contextName ...string) (kubernetes.Interface, error) {
	scm.mu.RLock()
	defer scm.mu.RUnlock()

	ctx := scm.currentContext
	if len(contextName) > 0 {
		ctx = contextName[0]
	}

	if ctx == "" {
		return nil, fmt.Errorf("no context selected")
	}

	clientset, exists := scm.clientsets[ctx]
	if !exists {
		return nil, fmt.Errorf("clientset for context %s not initialized. Call SwitchCluster first", ctx)
	}

	return clientset, nil
}

// GetMetricsClient returns the metrics client for current context
func (scm *SimpleClusterManager) GetMetricsClient() (metricsclientset.Interface, error) {
	scm.mu.RLock()
	defer scm.mu.RUnlock()

	if scm.currentContext == "" {
		return nil, fmt.Errorf("no context selected")
	}

	metricsClient, exists := scm.metricsClients[scm.currentContext]
	if !exists || metricsClient == nil {
		return nil, fmt.Errorf("metrics client not available for current context")
	}

	return metricsClient, nil
}

// CheckClusterHealth checks if the current cluster is reachable
func (scm *SimpleClusterManager) CheckClusterHealth() error {
	scm.mu.RLock()
	currentContext := scm.currentContext
	scm.mu.RUnlock()

	if currentContext == "" {
		return fmt.Errorf("no cluster selected")
	}

	clientset, err := scm.GetClientset()
	if err != nil {
		scm.updateClusterHealth(currentContext, false, err.Error())
		return err
	}

	// Simple health check: get server version
	_, err = clientset.Discovery().ServerVersion()
	if err != nil {
		scm.updateClusterHealth(currentContext, false, err.Error())
		return fmt.Errorf("cluster health check failed: %w", err)
	}

	scm.updateClusterHealth(currentContext, true, "")
	return nil
}

// updateClusterHealth updates the health status of a cluster
func (scm *SimpleClusterManager) updateClusterHealth(contextName string, reachable bool, errorMsg string) {
	scm.mu.Lock()
	defer scm.mu.Unlock()

	if cluster, exists := scm.clusters[contextName]; exists {
		cluster.IsReachable = reachable
		if errorMsg != "" {
			cluster.Error = errorMsg
		} else {
			cluster.Error = ""
		}
	}
}

// CheckAllClustersHealth checks the health of all clusters concurrently
func (scm *SimpleClusterManager) CheckAllClustersHealth() {
	scm.mu.RLock()
	contextNames := make([]string, 0, len(scm.contexts))
	for name := range scm.contexts {
		contextNames = append(contextNames, name)
	}
	scm.mu.RUnlock()

	// Check clusters concurrently with a limit
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5) // Limit to 5 concurrent checks

	for _, contextName := range contextNames {
		wg.Add(1)
		go func(ctx string) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire
			defer func() { <-semaphore }() // Release

			// Quick health check
			loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: scm.kubeconfigPath}
			configOverrides := &clientcmd.ConfigOverrides{CurrentContext: ctx}
			kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

			restConfig, err := kubeConfig.ClientConfig()
			if err != nil {
				scm.updateClusterHealth(ctx, false, err.Error())
				return
			}

			// Set a short timeout for health checks
			restConfig.Timeout = 3 * time.Second

			clientset, err := kubernetes.NewForConfig(restConfig)
			if err != nil {
				scm.updateClusterHealth(ctx, false, err.Error())
				return
			}

			// Check if cluster is reachable
			_, err = clientset.Discovery().ServerVersion()
			if err != nil {
				scm.updateClusterHealth(ctx, false, err.Error())
			} else {
				scm.updateClusterHealth(ctx, true, "")
			}
		}(contextName)
	}

	wg.Wait()
}

// Refresh reloads contexts from kubeconfig file
func (scm *SimpleClusterManager) Refresh() error {
	scm.mu.Lock()
	defer scm.mu.Unlock()

	// Clear existing contexts but preserve active state
	currentBeforeRefresh := scm.currentContext

	// Clear maps
	scm.clusters = make(map[string]*ClusterInfo)
	scm.contexts = make(map[string]*api.Context)

	// Temporarily unlock to call loadContexts (it needs to lock)
	scm.mu.Unlock()
	err := scm.loadContexts()
	scm.mu.Lock()

	if err != nil {
		return fmt.Errorf("failed to refresh: %w", err)
	}

	// Restore active context (preserve app's selection)
	if currentBeforeRefresh != "" {
		if _, exists := scm.contexts[currentBeforeRefresh]; exists {
			scm.currentContext = currentBeforeRefresh
			if cluster, exists := scm.clusters[currentBeforeRefresh]; exists {
				cluster.IsActive = true
			}
		}
	}

	return nil
}

// getDisplayName creates a human-readable cluster name from context name
func getDisplayName(contextName string) string {
	// Return the full context name - users should see exactly what cluster they're connected to
	// This matches kubectl behavior and avoids confusion
	return contextName
}

// splitContextName splits a context name into parts
func splitContextName(contextName string) []string {
	var parts []string
	var current strings.Builder

	for _, ch := range contextName {
		if ch == '_' || ch == '-' {
			if current.Len() > 0 {
				parts = append(parts, current.String())
				current.Reset()
			}
		} else {
			current.WriteRune(ch)
		}
	}

	if current.Len() > 0 {
		parts = append(parts, current.String())
	}

	return parts
}
