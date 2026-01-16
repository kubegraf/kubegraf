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
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/kubegraf/kubegraf/internal/cluster"
	"github.com/kubegraf/kubegraf/internal/database"
	"k8s.io/client-go/tools/clientcmd"
)

// EnhancedClusterManager extends ClusterService with sources, health checking, and state management
type EnhancedClusterManager struct {
	*ClusterService
	db           *database.Database
	healthChecker *cluster.HealthChecker
	mu           sync.RWMutex
	kubegrafDir  string
	cacheCleanupFunc func() error // Callback to clear cache on cluster switch
}

// NewEnhancedClusterManager creates a new enhanced cluster manager
func NewEnhancedClusterManager(app *App, db *database.Database) (*EnhancedClusterManager, error) {
	if db == nil {
		return nil, fmt.Errorf("database is required for enhanced cluster manager")
	}

	fmt.Printf("🔧 Initializing Enhanced Cluster Manager...\n")

	// Initialize base cluster service
	baseService := NewClusterService(app, db)
	if baseService == nil {
		return nil, fmt.Errorf("failed to create base cluster service")
	}
	fmt.Printf("✅ Base cluster service created\n")

	// Get .kubegraf directory
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	kubegrafDir := filepath.Join(home, ".kubegraf")
	if err := os.MkdirAll(kubegrafDir, 0o755); err != nil {
		return nil, fmt.Errorf("failed to create .kubegraf directory: %w", err)
	}
	fmt.Printf("✅ KubeGraf directory: %s\n", kubegrafDir)

	// Create health checker (check every 30 seconds)
	healthChecker := cluster.NewHealthChecker(30 * time.Second)
	if healthChecker == nil {
		return nil, fmt.Errorf("failed to create health checker")
	}
	fmt.Printf("✅ Health checker created\n")

	ecm := &EnhancedClusterManager{
		ClusterService: baseService,
		db:             db,
		healthChecker: healthChecker,
		kubegrafDir:    kubegrafDir,
	}

	// Start health checker
	healthChecker.Start()
	fmt.Printf("✅ Health checker started\n")

	// Initialize default source if it doesn't exist
	if err := ecm.ensureDefaultSource(); err != nil {
		fmt.Printf("⚠️  Failed to ensure default source: %v\n", err)
		// Don't fail - default source might not exist
	} else {
		fmt.Printf("✅ Default source ensured\n")
	}

	// Also discover from existing kubeconfig discovery and add as sources if not already present
	if err := ecm.discoverAndAddKubeconfigSources(); err != nil {
		fmt.Printf("⚠️  Failed to discover kubeconfig sources: %v\n", err)
		// Don't fail - discovery might not find anything
	} else {
		fmt.Printf("✅ Kubeconfig sources discovered\n")
	}

	// Discover and register clusters
	if err := ecm.refreshClusterCatalog(); err != nil {
		// Log but don't fail - clusters may not be available yet
		fmt.Printf("⚠️  Failed to refresh cluster catalog: %v\n", err)
	} else {
		fmt.Printf("✅ Cluster catalog refreshed\n")
	}

	fmt.Printf("✅ Enhanced Cluster Manager initialized successfully\n")
	return ecm, nil
}

// DiscoverAndAddKubeconfigSources is the public method to discover and add kubeconfig sources
func (ecm *EnhancedClusterManager) DiscoverAndAddKubeconfigSources() error {
	return ecm.discoverAndAddKubeconfigSources()
}

// RefreshClusterCatalog is the public method to refresh the cluster catalog
func (ecm *EnhancedClusterManager) RefreshClusterCatalog() error {
	return ecm.refreshClusterCatalog()
}

// discoverAndAddKubeconfigSources discovers kubeconfig files and adds them as sources
func (ecm *EnhancedClusterManager) discoverAndAddKubeconfigSources() error {
	// Use existing discovery to find kubeconfig files
	paths, err := cluster.DiscoverKubeConfigs()
	if err != nil {
		return fmt.Errorf("failed to discover kubeconfigs: %w", err)
	}

	existingSources, err := ecm.db.ListClusterSources()
	if err != nil {
		return fmt.Errorf("failed to list existing sources: %w", err)
	}

	// Create a map of existing source paths
	existingPaths := make(map[string]bool)
	for _, source := range existingSources {
		if source.Path != "" {
			existingPaths[source.Path] = true
		}
	}

	// Add discovered paths as file sources if not already present
	for _, path := range paths {
		expandedPath := ecm.expandPath(path)
		if expandedPath == "" {
			continue
		}

		// Check if this path already exists as a source
		if existingPaths[expandedPath] {
			continue
		}

		// Generate a name from the path
		name := filepath.Base(expandedPath)
		if name == "config" {
			// For default config, use "default" name
			name = "default"
		} else {
			// Remove extension
			if ext := filepath.Ext(name); ext != "" {
				name = name[:len(name)-len(ext)]
			}
		}

		source := &database.ClusterSource{
			Name:      name,
			Type:      "file",
			Path:      expandedPath,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := ecm.db.UpsertClusterSource(source); err != nil {
			fmt.Printf("⚠️  Failed to add source for %s: %v\n", expandedPath, err)
			continue
		}
	}

	return nil
}

// ensureDefaultSource ensures the default kubeconfig source exists
func (ecm *EnhancedClusterManager) ensureDefaultSource() error {
	sources, err := ecm.db.ListClusterSources()
	if err != nil {
		return err
	}

	// Check if default source already exists
	for _, source := range sources {
		if source.Type == "default" && source.Name == "default" {
			return nil
		}
	}

	// Create default source - check if file exists first
	home, err := os.UserHomeDir()
	if err != nil {
		// If we can't get home dir, skip default source creation
		return nil
	}
	
	defaultPath := filepath.Join(home, ".kube", "config")
	
	// Only create default source if the file exists
	if _, err := os.Stat(defaultPath); err != nil {
		// Default kubeconfig doesn't exist, skip
		return nil
	}

	source := &database.ClusterSource{
		Name:      "default",
		Type:      "default",
		Path:      defaultPath,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	return ecm.db.UpsertClusterSource(source)
}

// refreshClusterCatalog discovers clusters from all sources and updates the catalog
func (ecm *EnhancedClusterManager) refreshClusterCatalog() error {
	sources, err := ecm.db.ListClusterSources()
	if err != nil {
		return err
	}

	// Use context name as the key for deduplication (same context = same cluster)
	allClusters := make(map[string]*database.EnhancedClusterEntry)
	// Track which source we prefer for each context (prefer default source, then first found)
	sourcePriority := make(map[string]int)
	for i, source := range sources {
		priority := i
		// Give default source highest priority
		if source.Type == "default" {
			priority = -1
		}
		sourcePriority[source.Name] = priority
	}

	// Process each source
	for _, source := range sources {
		clusters, err := ecm.discoverClustersFromSource(source)
		if err != nil {
			// Log but continue with other sources
			fmt.Printf("⚠️  Failed to discover clusters from source %s: %v\n", source.Name, err)
			continue
		}

		for _, cluster := range clusters {
			// Use context name as the deduplication key
			existing, exists := allClusters[cluster.ContextName]
			if !exists {
				// First time seeing this context, use it
				allClusters[cluster.ContextName] = cluster
			} else {
				// Context already exists, prefer the one from higher priority source
				existingPriority := sourcePriority[ecm.getSourceName(existing.SourceID)]
				currentPriority := sourcePriority[source.Name]
				if currentPriority < existingPriority {
					// Current source has higher priority, replace
					allClusters[cluster.ContextName] = cluster
				}
				// Otherwise keep the existing one
			}
		}
	}

	// Get all existing clusters from database
	existingClusters, err := ecm.db.ListEnhancedClusters()
	if err == nil {
		// Build a set of valid cluster IDs (context names)
		validContexts := make(map[string]bool)
		for _, cluster := range allClusters {
			validContexts[cluster.ContextName] = true
		}

		// Remove clusters that are no longer valid (context not found in any source)
		for _, existing := range existingClusters {
			if !validContexts[existing.ContextName] {
				// This context is no longer in any source, but we'll keep it for now
				// (user might have manually added it or it's from a disconnected source)
				continue
			}
		}
	}

	// Update database with discovered clusters (this will upsert based on cluster_id)
	for _, cluster := range allClusters {
		if err := ecm.db.UpsertEnhancedCluster(cluster); err != nil {
			fmt.Printf("⚠️  Failed to upsert cluster %s: %v\n", cluster.ClusterID, err)
			continue
		}

		// Register with health checker if we have a client
		ecm.registerClusterForHealthCheck(cluster)
	}

	// Clean up duplicate clusters (same context name but different cluster IDs)
	// This handles the migration from old cluster ID format to new one
	if err := ecm.cleanupDuplicateClusters(); err != nil {
		fmt.Printf("⚠️  Failed to cleanup duplicate clusters: %v\n", err)
	}

	return nil
}

// cleanupDuplicateClusters removes duplicate clusters with the same context name
func (ecm *EnhancedClusterManager) cleanupDuplicateClusters() error {
	allClusters, err := ecm.db.ListEnhancedClusters()
	if err != nil {
		return err
	}

	// Group clusters by context name
	contextGroups := make(map[string][]*database.EnhancedClusterEntry)
	for _, cluster := range allClusters {
		contextGroups[cluster.ContextName] = append(contextGroups[cluster.ContextName], cluster)
	}

	// For each context, keep only one cluster (prefer the one with the correct cluster ID)
	for contextName, clusters := range contextGroups {
		if len(clusters) <= 1 {
			continue
		}

		// Find the cluster with the correct cluster ID (based on context name only)
		expectedClusterID := ecm.generateClusterIDFromContext(contextName)
		var keepCluster *database.EnhancedClusterEntry
		var clustersToDelete []*database.EnhancedClusterEntry

		for _, cluster := range clusters {
			if cluster.ClusterID == expectedClusterID {
				keepCluster = cluster
			} else {
				clustersToDelete = append(clustersToDelete, cluster)
			}
		}

		// If we found the correct one, delete the others
		if keepCluster != nil {
			for _, toDelete := range clustersToDelete {
				fmt.Printf("🗑️  Removing duplicate cluster: %s (old ID: %s, keeping ID: %s)\n", 
					contextName, toDelete.ClusterID, keepCluster.ClusterID)
				if err := ecm.db.DeleteEnhancedClusterByClusterID(toDelete.ClusterID); err != nil {
					fmt.Printf("⚠️  Failed to delete duplicate cluster %s: %v\n", toDelete.ClusterID, err)
				}
			}
		} else if len(clusters) > 1 {
			// None have the correct ID, keep the first one and update its ID
			keepCluster = clusters[0]
			keepCluster.ClusterID = expectedClusterID
			if err := ecm.db.UpsertEnhancedCluster(keepCluster); err != nil {
				fmt.Printf("⚠️  Failed to update cluster ID for %s: %v\n", contextName, err)
			}

			// Mark others for deletion
			clustersToDelete = clusters[1:]
			for _, toDelete := range clustersToDelete {
				fmt.Printf("🗑️  Removing duplicate cluster: %s (old ID: %s)\n", 
					contextName, toDelete.ClusterID)
				if err := ecm.db.DeleteEnhancedClusterByClusterID(toDelete.ClusterID); err != nil {
					fmt.Printf("⚠️  Failed to delete duplicate cluster %s: %v\n", toDelete.ClusterID, err)
				}
			}
		}
	}

	return nil
}

// getSourceName is a helper to get source name from source ID
func (ecm *EnhancedClusterManager) getSourceName(sourceID *int) string {
	if sourceID == nil {
		return ""
	}
	source, err := ecm.db.GetClusterSourceByID(*sourceID)
	if err != nil {
		return ""
	}
	return source.Name
}

// discoverClustersFromSource discovers clusters from a kubeconfig source
func (ecm *EnhancedClusterManager) discoverClustersFromSource(source *database.ClusterSource) ([]*database.EnhancedClusterEntry, error) {
	var kubeconfigPath string

	switch source.Type {
	case "default":
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}
		kubeconfigPath = filepath.Join(home, ".kube", "config")
	case "file":
		kubeconfigPath = source.Path
	case "inline":
		kubeconfigPath = source.ContentPath
	default:
		return nil, fmt.Errorf("unknown source type: %s", source.Type)
	}

	// Check if file exists
	if _, err := os.Stat(kubeconfigPath); err != nil {
		return nil, fmt.Errorf("kubeconfig file not found: %w", err)
	}

	// Load kubeconfig
	config, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	clusters := make([]*database.EnhancedClusterEntry, 0)

	// Extract all contexts
	for contextName := range config.Contexts {
		// Generate cluster ID based on context name only (for deduplication)
		clusterID := ecm.generateClusterIDFromContext(contextName)
		clusterName := ecm.guessClusterName(kubeconfigPath, contextName)
		provider := ecm.guessProvider(kubeconfigPath, contextName)
		environment := ecm.guessEnvironment(contextName, provider)

		cluster := &database.EnhancedClusterEntry{
			ClusterID:      clusterID,
			Name:            clusterName,
			ContextName:     contextName,
			SourceID:        &source.ID,
			Provider:        provider,
			Environment:     environment,
			KubeconfigPath: kubeconfigPath,
			Status:          "UNKNOWN",
			Connected:       false,
			Active:          false,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		clusters = append(clusters, cluster)
	}

	return clusters, nil
}

// generateClusterID generates a stable cluster ID from source ID and context name
// DEPRECATED: Use generateClusterIDFromContext for deduplication
func (ecm *EnhancedClusterManager) generateClusterID(sourceID int, contextName string) string {
	input := fmt.Sprintf("%d:%s", sourceID, contextName)
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:])[:16] // Use first 16 chars
}

// generateClusterIDFromContext generates a stable cluster ID from context name only
// This ensures the same context from different sources gets the same cluster ID
func (ecm *EnhancedClusterManager) generateClusterIDFromContext(contextName string) string {
	hash := sha256.Sum256([]byte(contextName))
	return hex.EncodeToString(hash[:])[:16] // Use first 16 chars
}

// guessEnvironment guesses the environment from context name and provider
// Uses heuristics based on common naming patterns:
// - prod/production → prod
// - staging/stage/uat/test → staging (UAT is typically a staging-like environment)
// - dev/development → dev
// - local/kind/minikube/k3d → local
// - Defaults to "unknown" if no pattern matches (more honest than guessing)
func (ecm *EnhancedClusterManager) guessEnvironment(contextName, provider string) string {
	lower := strings.ToLower(contextName)
	
	// Production environments
	if strings.Contains(lower, "prod") || strings.Contains(lower, "production") {
		return "prod"
	}
	
	// Staging/UAT/Test environments (UAT = User Acceptance Testing, typically staging-like)
	if strings.Contains(lower, "staging") || strings.Contains(lower, "stage") ||
		strings.Contains(lower, "uat") || strings.Contains(lower, "test") ||
		strings.Contains(lower, "qa") || strings.Contains(lower, "preprod") ||
		strings.Contains(lower, "pre-prod") {
		return "staging"
	}
	
	// Development environments
	if strings.Contains(lower, "dev") || strings.Contains(lower, "development") {
		return "dev"
	}
	
	// Local environments
	if strings.Contains(lower, "local") || strings.Contains(lower, "kind") ||
		strings.Contains(lower, "minikube") || strings.Contains(lower, "k3d") {
		return "local"
	}
	
	// Unknown - don't guess, let user know we couldn't determine
	return "unknown"
}

// registerClusterForHealthCheck registers a cluster with the health checker
func (ecm *EnhancedClusterManager) registerClusterForHealthCheck(clusterEntry *database.EnhancedClusterEntry) {
	// Use LoadContextsFromFiles to get the rest config
	contexts, err := cluster.LoadContextsFromFiles([]string{clusterEntry.KubeconfigPath})
	if err != nil {
		return
	}

	// Find the matching context
	var matchedContext *cluster.LoadedContext
	for i := range contexts {
		if contexts[i].Name == clusterEntry.ContextName {
			matchedContext = &contexts[i]
			break
		}
	}

	if matchedContext == nil {
		return
	}

	// Create clientset
	clientset, err := cluster.CreateClientset(matchedContext.RestConfig)
	if err != nil {
		return
	}

	ecm.healthChecker.RegisterCluster(clusterEntry.ClusterID, clientset, matchedContext.RestConfig)
}

// SelectCluster sets a cluster as active
func (ecm *EnhancedClusterManager) SelectCluster(clusterID string) error {
	cluster, err := ecm.db.GetEnhancedClusterByClusterID(clusterID)
	if err != nil {
		return fmt.Errorf("cluster not found: %w", err)
	}

	fmt.Printf("🔄 Switching to cluster: %s (context: %s)\n", cluster.Name, cluster.ContextName)

	// Ensure cluster is registered with health checker before selecting
	ecm.registerClusterForHealthCheck(cluster)

	// Set as active in database
	if err := ecm.db.SetActiveCluster(clusterID); err != nil {
		return fmt.Errorf("failed to set active cluster: %w", err)
	}

	// Connect directly without using ClusterService.Connect to avoid database conflict
	// Read kubeconfig and write to active path
	configData, err := os.ReadFile(cluster.KubeconfigPath)
	if err != nil {
		return fmt.Errorf("read kubeconfig: %w", err)
	}

	// Write to active kubeconfig path
	activePath := filepath.Join(ecm.kubegrafDir, "active-kubeconfig")
	if err := os.WriteFile(activePath, configData, 0o600); err != nil {
		return fmt.Errorf("write active kubeconfig: %w", err)
	}
	_ = os.Setenv("KUBECONFIG", activePath)

	// Set cluster context for cache key isolation (CRITICAL for multi-cluster)
	_ = os.Setenv("KUBEGRAF_CURRENT_CLUSTER", cluster.ContextName)
	fmt.Printf("🏷️  Set KUBEGRAF_CURRENT_CLUSTER=%s\n", cluster.ContextName)

	// CRITICAL: Clear cache when switching clusters to prevent stale data
	if ecm.cacheCleanupFunc != nil {
		fmt.Printf("🧹 Clearing cache for cluster switch...\n")
		if err := ecm.cacheCleanupFunc(); err != nil {
			fmt.Printf("⚠️  Failed to clear cache: %v\n", err)
		} else {
			fmt.Printf("✅ Cache cleared\n")
		}
	}

	// Connect app with the kubeconfig and reload all contexts
	if ecm.ClusterService != nil && ecm.ClusterService.app != nil {
		fmt.Printf("🔌 Reloading kubeconfig contexts...\n")
		if err := ecm.ClusterService.app.ConnectWithKubeconfig(activePath); err != nil {
			return fmt.Errorf("reload cluster contexts: %w", err)
		}
		fmt.Printf("✅ Contexts reloaded\n")

		// Now switch to the specific context within the loaded kubeconfig
		if cluster.ContextName != "" {
			fmt.Printf("🎯 Switching to context: %s\n", cluster.ContextName)
			if err := ecm.ClusterService.app.SwitchContext(cluster.ContextName); err != nil {
				// If SwitchContext fails, try to connect directly
				fmt.Printf("⚠️  SwitchContext failed: %v, attempting direct connection...\n", err)

				// Update app state directly
				ecm.ClusterService.app.cluster = cluster.Name
				ecm.ClusterService.app.connected = false // Set to false initially
				ecm.ClusterService.app.connectionError = "Connecting..."

				// Try to initialize with this context
				if ecm.ClusterService.app.contextManager != nil {
					ecm.ClusterService.app.contextManager.CurrentContext = cluster.ContextName
				}
			} else {
				fmt.Printf("✅ Switched to context: %s\n", cluster.ContextName)
			}
		}
	}

	// Update status to CONNECTING
	ecm.db.UpdateClusterStatus(clusterID, "CONNECTING", "", 0, 0)

	// Perform immediate health check synchronously for better UX
	fmt.Printf("🏥 Performing health check...\n")
	_ = ecm.healthChecker.CheckCluster(clusterID)

	// Update database with health check result
	state := ecm.healthChecker.GetStatus(clusterID)
	ecm.db.UpdateClusterStatus(clusterID, string(state.Status), state.LastError,
		state.ConsecutiveFailures, state.ConsecutiveSuccesses)
	fmt.Printf("✅ Health check complete - Status: %s\n", state.Status)

	// Also trigger async health check for continuous monitoring
	go func() {
		time.Sleep(2 * time.Second)
		_ = ecm.healthChecker.CheckCluster(clusterID)
		// Update database after async check too
		asyncState := ecm.healthChecker.GetStatus(clusterID)
		ecm.db.UpdateClusterStatus(clusterID, string(asyncState.Status), asyncState.LastError,
			asyncState.ConsecutiveFailures, asyncState.ConsecutiveSuccesses)
	}()

	return nil
}

// ReconnectCluster triggers a reconnection attempt for a cluster
func (ecm *EnhancedClusterManager) ReconnectCluster(clusterID string) error {
	_, err := ecm.db.GetEnhancedClusterByClusterID(clusterID)
	if err != nil {
		return fmt.Errorf("cluster not found: %w", err)
	}

	// Update status to CONNECTING
	ecm.db.UpdateClusterStatus(clusterID, "CONNECTING", "", 0, 0)

	// Perform health check
	if err := ecm.healthChecker.CheckCluster(clusterID); err != nil {
		state := ecm.healthChecker.GetStatus(clusterID)
		ecm.db.UpdateClusterStatus(clusterID, string(state.Status), state.LastError,
			state.ConsecutiveFailures, state.ConsecutiveSuccesses)
		return fmt.Errorf("health check failed: %w", err)
	}

	// Update database with successful health check result
	state := ecm.healthChecker.GetStatus(clusterID)
	ecm.db.UpdateClusterStatus(clusterID, string(state.Status), state.LastError,
		state.ConsecutiveFailures, state.ConsecutiveSuccesses)

	// If health check succeeds, connect
	return ecm.SelectCluster(clusterID)
}

// GetActiveCluster returns the currently active cluster with enriched health status
func (ecm *EnhancedClusterManager) GetActiveCluster() (*database.EnhancedClusterEntry, error) {
	activeCluster, err := ecm.db.GetActiveCluster()
	if err != nil || activeCluster == nil {
		return activeCluster, err
	}

	// Enrich with health status from health checker (same as ListClusters)
	state := ecm.healthChecker.GetStatus(activeCluster.ClusterID)
	if state != nil && state.Status != cluster.StatusUnknown {
		activeCluster.Status = string(state.Status)
		activeCluster.LastChecked = &state.LastChecked
		activeCluster.LastError = state.LastError
		activeCluster.ConsecutiveFailures = state.ConsecutiveFailures
		activeCluster.ConsecutiveSuccesses = state.ConsecutiveSuccesses
	}

	return activeCluster, nil
}

// GetActiveClusterCached returns the active cluster with cached status (fast, no health check)
func (ecm *EnhancedClusterManager) GetActiveClusterCached() (*database.EnhancedClusterEntry, error) {
	activeCluster, err := ecm.db.GetActiveCluster()
	if err != nil || activeCluster == nil {
		return activeCluster, err
	}

	// Only enrich with in-memory health status if available
	state := ecm.healthChecker.GetStatus(activeCluster.ClusterID)
	if state != nil && state.Status != cluster.StatusUnknown {
		activeCluster.Status = string(state.Status)
		activeCluster.LastChecked = &state.LastChecked
		activeCluster.LastError = state.LastError
		activeCluster.ConsecutiveFailures = state.ConsecutiveFailures
		activeCluster.ConsecutiveSuccesses = state.ConsecutiveSuccesses
	} else if activeCluster.Status == "" {
		activeCluster.Status = "UNKNOWN"
	}

	return activeCluster, nil
}

// GetClusterStatus returns the health status of a cluster
func (ecm *EnhancedClusterManager) GetClusterStatus(clusterID string) (*cluster.ClusterHealthState, error) {
	state := ecm.healthChecker.GetStatus(clusterID)
	return state, nil
}

// AddFileSource adds a kubeconfig file source
func (ecm *EnhancedClusterManager) AddFileSource(name, path string) (*database.ClusterSource, error) {
	// Expand path
	expandedPath := ecm.expandPath(path)
	if _, err := os.Stat(expandedPath); err != nil {
		return nil, fmt.Errorf("kubeconfig file not found: %w", err)
	}

	source := &database.ClusterSource{
		Name:      name,
		Type:      "file",
		Path:      expandedPath,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := ecm.db.UpsertClusterSource(source); err != nil {
		return nil, fmt.Errorf("failed to save source: %w", err)
	}

	// Refresh cluster catalog
	if err := ecm.refreshClusterCatalog(); err != nil {
		fmt.Printf("⚠️  Failed to refresh cluster catalog: %v\n", err)
	}

	return source, nil
}

// AddInlineSource adds an inline kubeconfig source (saves to .kubegraf directory)
func (ecm *EnhancedClusterManager) AddInlineSource(name, kubeconfigContent string) (*database.ClusterSource, error) {
	// Save to .kubegraf directory with secure permissions
	sourceDir := filepath.Join(ecm.kubegrafDir, "sources")
	if err := os.MkdirAll(sourceDir, 0o700); err != nil {
		return nil, fmt.Errorf("failed to create sources directory: %w", err)
	}

	// Generate filename from name
	filename := fmt.Sprintf("%s.yaml", strings.ReplaceAll(strings.ToLower(name), " ", "_"))
	contentPath := filepath.Join(sourceDir, filename)

	// Write with secure permissions (0600)
	if err := os.WriteFile(contentPath, []byte(kubeconfigContent), 0o600); err != nil {
		return nil, fmt.Errorf("failed to save kubeconfig: %w", err)
	}

	source := &database.ClusterSource{
		Name:        name,
		Type:        "inline",
		ContentPath: contentPath,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := ecm.db.UpsertClusterSource(source); err != nil {
		// Clean up file on error
		_ = os.Remove(contentPath)
		return nil, fmt.Errorf("failed to save source: %w", err)
	}

	// Refresh cluster catalog
	if err := ecm.refreshClusterCatalog(); err != nil {
		fmt.Printf("⚠️  Failed to refresh cluster catalog: %v\n", err)
	}

	return source, nil
}

// ListSources returns all cluster sources
func (ecm *EnhancedClusterManager) ListSources() ([]*database.ClusterSource, error) {
	return ecm.db.ListClusterSources()
}

// ListClustersCached returns all clusters from database with cached status (no health check enrichment)
// This is fast and suitable for initial page load - use ListClusters for real-time status
func (ecm *EnhancedClusterManager) ListClustersCached() ([]*database.EnhancedClusterEntry, error) {
	clusters, err := ecm.db.ListEnhancedClusters()
	if err != nil {
		return nil, err
	}

	// Only enrich with in-memory health status if available (no registration, no health checks)
	for i := range clusters {
		state := ecm.healthChecker.GetStatus(clusters[i].ClusterID)
		if state != nil && state.Status != cluster.StatusUnknown {
			clusters[i].Status = string(state.Status)
			clusters[i].LastChecked = &state.LastChecked
			clusters[i].LastError = state.LastError
			clusters[i].ConsecutiveFailures = state.ConsecutiveFailures
			clusters[i].ConsecutiveSuccesses = state.ConsecutiveSuccesses
		} else if clusters[i].Status == "" {
			clusters[i].Status = "UNKNOWN"
		}
	}

	// Trigger background health checks for all clusters (non-blocking)
	go ecm.triggerBackgroundHealthChecks(clusters)

	return clusters, nil
}

// triggerBackgroundHealthChecks registers and checks all clusters in background
func (ecm *EnhancedClusterManager) triggerBackgroundHealthChecks(clusters []*database.EnhancedClusterEntry) {
	for _, c := range clusters {
		state := ecm.healthChecker.GetStatus(c.ClusterID)
		if state == nil || state.Status == cluster.StatusUnknown {
			ecm.registerClusterForHealthCheck(c)
			time.Sleep(50 * time.Millisecond) // Small delay between registrations
		}
	}
}

// ListClusters returns all clusters with their status
func (ecm *EnhancedClusterManager) ListClusters() ([]*database.EnhancedClusterEntry, error) {
	clusters, err := ecm.db.ListEnhancedClusters()
	if err != nil {
		return nil, err
	}

	// Enrich with health status and ensure all clusters are registered
	for i := range clusters {
		// Ensure cluster is registered with health checker
		state := ecm.healthChecker.GetStatus(clusters[i].ClusterID)
		if state == nil || state.Status == cluster.StatusUnknown {
			// Cluster not registered or status unknown, try to register it
			ecm.registerClusterForHealthCheck(clusters[i])
			// Get updated status after registration
			state = ecm.healthChecker.GetStatus(clusters[i].ClusterID)
			// Trigger immediate health check in background
			if state != nil {
				go func(clusterID string) {
					time.Sleep(100 * time.Millisecond) // Small delay to ensure registration is complete
					_ = ecm.healthChecker.CheckCluster(clusterID)
				}(clusters[i].ClusterID)
			}
		}

		if state != nil && state.Status != cluster.StatusUnknown {
			clusters[i].Status = string(state.Status)
			clusters[i].LastChecked = &state.LastChecked
			clusters[i].LastError = state.LastError
			clusters[i].ConsecutiveFailures = state.ConsecutiveFailures
			clusters[i].ConsecutiveSuccesses = state.ConsecutiveSuccesses
		} else {
			// If still no state or UNKNOWN, check database status or default to UNKNOWN
			if clusters[i].Status == "" {
				clusters[i].Status = "UNKNOWN"
			}
		}
	}

	return clusters, nil
}
