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

package cluster

import (
	"fmt"
	"path/filepath"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

// LoadedContext represents a loaded Kubernetes context with its configuration
type LoadedContext struct {
	Name        string
	ClusterName string
	SourceFile  string
	RestConfig  *rest.Config
	RawContext  *api.Context // Store raw context for reference
}

// LoadContextsFromFiles loads all contexts from the given kubeconfig file paths
func LoadContextsFromFiles(paths []string) ([]LoadedContext, error) {
	var allContexts []LoadedContext
	seenContexts := make(map[string]bool) // Track context names to avoid duplicates

	for _, path := range paths {
		// Load kubeconfig file
		config, err := clientcmd.LoadFromFile(path)
		if err != nil {
			// Skip files that can't be loaded (might be invalid or inaccessible)
			continue
		}

		// Extract all contexts from this file
		for contextName, context := range config.Contexts {
			// Skip if we've already seen this context name
			if seenContexts[contextName] {
				continue
			}
			seenContexts[contextName] = true

			// Build rest.Config for this context
			restConfig, err := buildRestConfigForContext(path, contextName)
			if err != nil {
				// Skip contexts that can't be configured
				continue
			}

			// Get cluster name
			clusterName := ""
			if context.Cluster != "" {
				clusterName = context.Cluster
			}

			loadedContext := LoadedContext{
				Name:        contextName,
				ClusterName: clusterName,
				SourceFile:  path,
				RestConfig:  restConfig,
				RawContext:  context,
			}

			allContexts = append(allContexts, loadedContext)
		}
	}

	return allContexts, nil
}

// buildRestConfigForContext builds a rest.Config for a specific context
func buildRestConfigForContext(kubeconfigPath, contextName string) (*rest.Config, error) {
	// Use clientcmd to build config with explicit context
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to build config: %w", err)
	}

	// Override context if specified
	if contextName != "" {
		loadingRules := &clientcmd.ClientConfigLoadingRules{
			ExplicitPath: kubeconfigPath,
		}
		overrides := &clientcmd.ConfigOverrides{
			CurrentContext: contextName,
		}
		clientConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, overrides)
		config, err = clientConfig.ClientConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to build config for context %s: %w", contextName, err)
		}
	}

	return config, nil
}

// CreateClientset creates a Kubernetes clientset from a rest.Config
func CreateClientset(config *rest.Config) (*kubernetes.Clientset, error) {
	return kubernetes.NewForConfig(config)
}

// GetContextMetadata returns metadata about contexts without loading full configs
func GetContextMetadata(paths []string) ([]ContextMetadata, error) {
	var metadata []ContextMetadata
	seenContexts := make(map[string]bool)

	for _, path := range paths {
		config, err := clientcmd.LoadFromFile(path)
		if err != nil {
			continue
		}

		for contextName, context := range config.Contexts {
			if seenContexts[contextName] {
				continue
			}
			seenContexts[contextName] = true

			clusterName := ""
			if context.Cluster != "" {
				clusterName = context.Cluster
			}

			// Get absolute path for display
			absPath, _ := filepath.Abs(path)

			metadata = append(metadata, ContextMetadata{
				Name:        contextName,
				ClusterName: clusterName,
				SourceFile:  absPath,
			})
		}
	}

	return metadata, nil
}

// ContextMetadata represents metadata about a context (safe to store)
type ContextMetadata struct {
	Name        string `json:"name"`
	ClusterName string `json:"cluster_name"`
	SourceFile  string `json:"source_file"`
}

