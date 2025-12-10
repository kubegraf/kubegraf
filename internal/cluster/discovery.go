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
	"os"
	"path/filepath"
	"strings"
)

// DiscoverKubeConfigs discovers kubeconfig files from standard locations
func DiscoverKubeConfigs() ([]string, error) {
	var paths []string
	seen := make(map[string]bool)

	// Helper to add path if not seen
	addPath := func(path string) {
		if path != "" && !seen[path] {
			if info, err := os.Stat(path); err == nil && !info.IsDir() {
				paths = append(paths, path)
				seen[path] = true
			}
		}
	}

	// 1. $KUBECONFIG environment variable (can contain multiple paths separated by :)
	if kubeconfig := os.Getenv("KUBECONFIG"); kubeconfig != "" {
		for _, path := range strings.Split(kubeconfig, ":") {
			expanded := expandPath(path)
			addPath(expanded)
		}
	}

	// 2. $HOME/.kube/config (default location)
	homeDir, err := os.UserHomeDir()
	if err == nil {
		defaultConfig := filepath.Join(homeDir, ".kube", "config")
		addPath(defaultConfig)

		// 3. $HOME/.kube/*.yaml
		kubeDir := filepath.Join(homeDir, ".kube")
		if entries, err := os.ReadDir(kubeDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".yaml") {
					path := filepath.Join(kubeDir, entry.Name())
					addPath(path)
				}
			}
		}

		// 4. $HOME/.kube/config.d/*.yaml
		configDDir := filepath.Join(homeDir, ".kube", "config.d")
		if entries, err := os.ReadDir(configDDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".yaml") {
					path := filepath.Join(configDDir, entry.Name())
					addPath(path)
				}
			}
		}

		// 5. Additional files from ~/.kubegraf/state.json
		kubegrafState := filepath.Join(homeDir, ".kubegraf", "state.json")
		if customPaths, err := loadCustomKubeconfigPaths(kubegrafState); err == nil {
			for _, path := range customPaths {
				expanded := expandPath(path)
				addPath(expanded)
			}
		}
	}

	return paths, nil
}

// expandPath expands ~ and environment variables in a path
func expandPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, path[2:])
		}
	}
	return os.ExpandEnv(path)
}

// loadCustomKubeconfigPaths loads additional kubeconfig paths from state.json
func loadCustomKubeconfigPaths(statePath string) ([]string, error) {
	// This is a simple implementation - in production you might want to use a JSON parser
	// For now, we'll just return empty - the state.json structure can be extended later
	return []string{}, nil
}

