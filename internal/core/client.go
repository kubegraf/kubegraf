// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package core

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// ClientManager manages Kubernetes clients and context switching
type ClientManager struct {
	mu sync.RWMutex

	config       *api.Config
	currentCtx   string
	restConfig   *rest.Config
	clientset    *kubernetes.Clientset
	dynamicClient dynamic.Interface

	kubeconfig string
}

// NewClientManager creates a new client manager
func NewClientManager() (*ClientManager, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("get home dir: %w", err)
		}
		kubeconfig = filepath.Join(home, ".kube", "config")
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("load kubeconfig: %w", err)
	}

	cm := &ClientManager{
		config:     config,
		currentCtx: config.CurrentContext,
		kubeconfig: kubeconfig,
	}

	if err := cm.buildClients(); err != nil {
		return nil, err
	}

	return cm, nil
}

// buildClients builds the Kubernetes clients
func (cm *ClientManager) buildClients() error {
	restConfig, err := clientcmd.NewDefaultClientConfig(*cm.config, &clientcmd.ConfigOverrides{
		CurrentContext: cm.currentCtx,
	}).ClientConfig()
	if err != nil {
		return fmt.Errorf("build rest config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("build clientset: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("build dynamic client: %w", err)
	}

	cm.restConfig = restConfig
	cm.clientset = clientset
	cm.dynamicClient = dynamicClient

	return nil
}

// GetClientset returns the Kubernetes clientset
func (cm *ClientManager) GetClientset() *kubernetes.Clientset {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.clientset
}

// GetDynamicClient returns the dynamic client
func (cm *ClientManager) GetDynamicClient() dynamic.Interface {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.dynamicClient
}

// GetRestConfig returns the rest config
func (cm *ClientManager) GetRestConfig() *rest.Config {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.restConfig
}

// GetCurrentContext returns the current context name
func (cm *ClientManager) GetCurrentContext() string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.currentCtx
}

// ListContexts returns all available context names
func (cm *ClientManager) ListContexts() []string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	contexts := make([]string, 0, len(cm.config.Contexts))
	for name := range cm.config.Contexts {
		contexts = append(contexts, name)
	}
	return contexts
}

// SwitchContext switches to a different context
func (cm *ClientManager) SwitchContext(ctx context.Context, contextName string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if _, exists := cm.config.Contexts[contextName]; !exists {
		return fmt.Errorf("context %q not found", contextName)
	}

	cm.currentCtx = contextName
	return cm.buildClients()
}

// GetNamespaces returns all namespaces
func (cm *ClientManager) GetNamespaces(ctx context.Context) ([]string, error) {
	clientset := cm.GetClientset()
	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	names := make([]string, len(namespaces.Items))
	for i, ns := range namespaces.Items {
		names[i] = ns.Name
	}
	return names, nil
}
