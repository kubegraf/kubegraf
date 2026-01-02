// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License")

package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// KubeConfig manages Kubernetes configuration and clients
type KubeConfig struct {
	config     *api.Config
	restConfig *rest.Config
	clientset  *kubernetes.Clientset
	context    string
	namespace  string
}

// LoadKubeConfig loads kubeconfig and creates clients
func LoadKubeConfig(contextName, namespace string) (*KubeConfig, error) {
	// Determine kubeconfig path
	kubeconfigPath := os.Getenv("KUBECONFIG")
	if kubeconfigPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("get home dir: %w", err)
		}
		kubeconfigPath = filepath.Join(home, ".kube", "config")
	}

	// Load kubeconfig
	config, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("load kubeconfig: %w", err)
	}

	// Determine context
	if contextName == "" {
		contextName = config.CurrentContext
	}
	if contextName == "" {
		return nil, fmt.Errorf("no context specified and no current-context in kubeconfig")
	}

	// Determine namespace
	if namespace == "" {
		// Try to get namespace from context
		if ctx, exists := config.Contexts[contextName]; exists && ctx.Namespace != "" {
			namespace = ctx.Namespace
		} else {
			namespace = "default"
		}
	}

	// Build REST config
	restConfig, err := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	}).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("build rest config: %w", err)
	}

	// Create clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("create clientset: %w", err)
	}

	return &KubeConfig{
		config:     config,
		restConfig: restConfig,
		clientset:  clientset,
		context:    contextName,
		namespace:  namespace,
	}, nil
}

// GetClientset returns the Kubernetes clientset
func (kc *KubeConfig) GetClientset() *kubernetes.Clientset {
	return kc.clientset
}

// GetRESTConfig returns the REST config
func (kc *KubeConfig) GetRESTConfig() *rest.Config {
	return kc.restConfig
}

// GetContext returns the current context name
func (kc *KubeConfig) GetContext() string {
	return kc.context
}

// GetNamespace returns the current namespace
func (kc *KubeConfig) GetNamespace() string {
	return kc.namespace
}

// PrintContextInfo prints current context and namespace
func (kc *KubeConfig) PrintContextInfo() {
	fmt.Printf("Context: %s | Namespace: %s\n", kc.context, kc.namespace)
}
