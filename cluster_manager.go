package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/kubegraf/kubegraf/internal/database"
)

// Re-export ClusterEntry for convenience
type ClusterEntry = database.ClusterEntry

// ClusterConnectRequest represents the payload used for connect requests
type ClusterConnectRequest struct {
	Name           string `json:"name"`
	Provider       string `json:"provider"`
	KubeconfigPath string `json:"kubeconfigPath"`
	MakeDefault    bool   `json:"makeDefault"`
}

// ClusterStatusPayload describes the runtime cluster status returned to the UI
type ClusterStatusPayload struct {
	Connected      bool       `json:"connected"`
	Cluster        string     `json:"cluster"`
	Provider       string     `json:"provider"`
	DefaultCluster string     `json:"defaultCluster,omitempty"`
	LastUsed       *time.Time `json:"lastUsed,omitempty"`
	Error          string     `json:"error,omitempty"`
}

// DiscoveredKubeconfig represents an auto-discovered kubeconfig file
type DiscoveredKubeconfig struct {
	Name           string   `json:"name"`
	Path           string   `json:"path"`
	Provider       string   `json:"provider"`
	Contexts       []string `json:"contexts"`
	DefaultContext string   `json:"defaultContext"`
	Active         bool     `json:"active"`
}

// ClusterService orchestrates cluster discovery and connection management
type ClusterService struct {
	app        *App
	db         *database.Database
	activePath string
	mu         sync.Mutex
}

// RuntimeClusterContext describes the contexts currently loaded into the app
type RuntimeClusterContext struct {
	Name           string `json:"name"`
	Provider       string `json:"provider"`
	KubeconfigPath string `json:"kubeconfigPath,omitempty"`
	Connected      bool   `json:"connected"`
	Current        bool   `json:"current"`
	Error          string `json:"error,omitempty"`
	ServerVersion  string `json:"serverVersion,omitempty"`
}

// NewClusterService creates a new cluster service and ensures the active kubeconfig path exists
func NewClusterService(app *App, db *database.Database) *ClusterService {
	service := &ClusterService{app: app, db: db}
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	dir := filepath.Join(home, ".kubegraf")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		fmt.Printf("⚠️  Failed to prepare cluster directory: %v\n", err)
	}
	service.activePath = filepath.Join(dir, "active-kubeconfig")

	// REMOVED: Automatic KUBECONFIG override
	// Now respects user's actual kubeconfig (~/.kube/config or $KUBECONFIG)
	// This follows industry standard (Headlamp, Lens, k9s pattern)
	// active-kubeconfig is still used by Connect() for explicit connections

	return service
}

// Connect validates the kubeconfig, writes it to the active location, and reloads the app
func (cs *ClusterService) Connect(req ClusterConnectRequest) (*ClusterEntry, error) {
	if cs.app == nil {
		return nil, fmt.Errorf("application not initialized")
	}
	if cs.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	cs.mu.Lock()
	defer cs.mu.Unlock()

	kubeconfigPath := cs.resolveKubeconfigPath(req)
	if kubeconfigPath == "" {
		return nil, fmt.Errorf("kubeconfig path is required")
	}

	kubeconfigPath = cs.expandPath(kubeconfigPath)
	if _, err := os.Stat(kubeconfigPath); err != nil {
		return nil, fmt.Errorf("kubeconfig not found: %w", err)
	}

	configData, err := os.ReadFile(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("read kubeconfig: %w", err)
	}

	// Validate the kubeconfig by building a clientset
	restConfig, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("load kubeconfig: %w", err)
	}
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("create clientset: %w", err)
	}
	if _, err := clientset.ServerVersion(); err != nil {
		return nil, fmt.Errorf("connect to cluster: %w", err)
	}

	if err := os.WriteFile(cs.activePath, configData, 0o600); err != nil {
		return nil, fmt.Errorf("write active kubeconfig: %w", err)
	}
	_ = os.Setenv("KUBECONFIG", cs.activePath)

	if err := cs.app.ConnectWithKubeconfig(cs.activePath); err != nil {
		return nil, fmt.Errorf("reload cluster contexts: %w", err)
	}

	entry := cs.buildClusterEntry(req, kubeconfigPath)
	now := time.Now()
	entry.Connected = true
	entry.LastUsed = &now
	entry.Error = ""

	if err := cs.db.ClearClusterConnections(); err != nil {
		fmt.Printf("⚠️  Failed to reset cluster statuses: %v\n", err)
	}
	if req.MakeDefault {
		if err := cs.db.SetDefaultCluster(entry.Name); err != nil {
			fmt.Printf("⚠️  Failed to set default cluster: %v\n", err)
		}
	} else {
		// Preserve previous default if request didn't opt-in
		if stored, err := cs.db.GetClusterByName(entry.Name); err == nil {
			entry.IsDefault = stored.IsDefault
		}
	}

	if err := cs.db.UpsertCluster(entry); err != nil {
		return nil, fmt.Errorf("save cluster: %w", err)
	}

	return entry, nil
}

// Disconnect clears the active kubeconfig and marks clusters as disconnected
func (cs *ClusterService) Disconnect() (*ClusterStatusPayload, error) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	if cs.db != nil {
		if err := cs.db.ClearClusterConnections(); err != nil {
			return nil, err
		}
	}

	if err := os.Remove(cs.activePath); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("remove active kubeconfig: %w", err)
	}
	_ = os.Unsetenv("KUBECONFIG")

	cs.app.clientset = nil
	cs.app.metricsClient = nil
	cs.app.config = nil
	cs.app.connected = false
	cs.app.cluster = ""
	cs.app.connectionError = "Cluster disconnected"

	return cs.Status(), nil
}

// Status returns the current runtime and persisted status
func (cs *ClusterService) Status() *ClusterStatusPayload {
	status := &ClusterStatusPayload{
		Connected: cs.app.connected,
		Cluster:   cs.app.cluster,
		Error:     cs.app.connectionError,
	}

	if cs.db != nil {
		if entries, err := cs.db.ListClusters(); err == nil {
			for _, entry := range entries {
				if entry.Connected {
					status.Cluster = entry.Name
					status.Provider = entry.Provider
					status.LastUsed = entry.LastUsed
					status.Connected = true
					status.Error = entry.Error
					break
				}
				if entry.IsDefault {
					status.DefaultCluster = entry.Name
				}
			}
		}
	}

	return status
}

// List returns stored clusters together with discovered kubeconfigs
func (cs *ClusterService) List() ([]*ClusterEntry, []DiscoveredKubeconfig, error) {
	if cs.db == nil {
		return nil, cs.Discover(), nil
	}
	clusters, err := cs.db.ListClusters()
	if err != nil {
		return nil, nil, err
	}
	return clusters, cs.Discover(), nil
}

// RuntimeContexts returns the contexts currently available in memory
func (cs *ClusterService) RuntimeContexts() []RuntimeClusterContext {
	if cs.app == nil || cs.app.contextManager == nil {
		return nil
	}

	cs.app.contextManager.mu.RLock()
	defer cs.app.contextManager.mu.RUnlock()

	basePath := cs.resolveRuntimeKubeconfigPath()
	contexts := make([]RuntimeClusterContext, 0, len(cs.app.contextManager.ContextOrder))
	for _, name := range cs.app.contextManager.ContextOrder {
		ctx := cs.app.contextManager.Contexts[name]
		if ctx == nil {
			continue
		}
		contexts = append(contexts, RuntimeClusterContext{
			Name:           name,
			Provider:       cs.guessProvider(basePath, name),
			KubeconfigPath: basePath,
			Connected:      ctx.Connected && ctx.Clientset != nil,
			Current:        name == cs.app.contextManager.CurrentContext,
			Error:          ctx.Error,
			ServerVersion:  ctx.ServerVersion,
		})
	}
	return contexts
}

// Discover performs lightweight kubeconfig discovery on the local machine
func (cs *ClusterService) Discover() []DiscoveredKubeconfig {
	paths := cs.candidatePaths()
	results := make([]DiscoveredKubeconfig, 0, len(paths))
	found := make(map[string]bool)

	for _, candidate := range paths {
		clean := cs.expandPath(candidate)
		if clean == "" || found[clean] {
			continue
		}
		config, err := clientcmd.LoadFromFile(clean)
		if err != nil {
			continue
		}
		contexts := make([]string, 0, len(config.Contexts))
		for name := range config.Contexts {
			contexts = append(contexts, name)
		}
		sort.Strings(contexts)
		entry := DiscoveredKubeconfig{
			Name:           cs.guessClusterName(clean, config.CurrentContext),
			Path:           clean,
			Provider:       cs.guessProvider(clean, config.CurrentContext),
			Contexts:       contexts,
			DefaultContext: config.CurrentContext,
			Active:         cs.isActivePath(clean),
		}
		results = append(results, entry)
		found[clean] = true
	}

	sort.Slice(results, func(i, j int) bool {
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})
	return results
}

// SetDefault marks the provided cluster as default
func (cs *ClusterService) SetDefault(name string) error {
	if cs.db == nil {
		return fmt.Errorf("database not available")
	}
	return cs.db.SetDefaultCluster(name)
}

func (cs *ClusterService) resolveKubeconfigPath(req ClusterConnectRequest) string {
	if req.KubeconfigPath != "" {
		return req.KubeconfigPath
	}
	if req.Name == "" || cs.db == nil {
		return ""
	}
	if entry, err := cs.db.GetClusterByName(req.Name); err == nil {
		return entry.KubeconfigPath
	}
	return ""
}

func (cs *ClusterService) expandPath(p string) string {
	p = os.ExpandEnv(strings.TrimSpace(p))
	if p == "" {
		return ""
	}
	if strings.HasPrefix(p, "~") {
		home, err := os.UserHomeDir()
		if err == nil {
			return filepath.Join(home, strings.TrimPrefix(p, "~"))
		}
	}
	return filepath.Clean(p)
}

func (cs *ClusterService) isActivePath(path string) bool {
	active := cs.expandPath(cs.activePath)
	clean := cs.expandPath(path)
	return active != "" && clean == active
}

func (cs *ClusterService) guessClusterName(path, context string) string {
	if context != "" {
		return context
	}
	base := filepath.Base(path)
	if idx := strings.LastIndex(base, "."); idx > 0 {
		base = base[:idx]
	}
	return base
}

func (cs *ClusterService) guessProvider(path, context string) string {
	probe := strings.ToLower(path + " " + context)
	switch {
	case strings.Contains(probe, "gke"):
		return "gke"
	case strings.Contains(probe, "eks"):
		return "eks"
	case strings.Contains(probe, "aks"):
		return "aks"
	case strings.Contains(probe, "kind"):
		return "kind"
	case strings.Contains(probe, "minikube"):
		return "minikube"
	case strings.Contains(probe, "k3d") || strings.Contains(probe, "k3s"):
		return "k3s"
	case strings.Contains(probe, "docker"):
		return "docker-desktop"
	default:
		return "generic"
	}
}

func (cs *ClusterService) candidatePaths() []string {
	paths := make([]string, 0)
	home, err := os.UserHomeDir()
	if err == nil {
		paths = append(paths, filepath.Join(home, ".kube", "config"))
		kubeDir := filepath.Join(home, ".kube")
		_ = filepath.WalkDir(kubeDir, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() {
				return nil
			}
			if strings.HasSuffix(d.Name(), ".yaml") || strings.HasSuffix(d.Name(), ".yml") || strings.HasSuffix(d.Name(), ".config") {
				paths = append(paths, path)
			}
			return nil
		})
	}

	if env := os.Getenv("KUBECONFIG"); env != "" {
		for _, part := range strings.Split(env, string(os.PathListSeparator)) {
			if part != "" {
				paths = append(paths, part)
			}
		}
	}

	if runtime.GOOS == "windows" {
		if env := os.Getenv("USERPROFILE"); env != "" {
			paths = append(paths, filepath.Join(env, ".kube", "config"))
		}
	}

	return paths
}

func (cs *ClusterService) buildClusterEntry(req ClusterConnectRequest, kubeconfigPath string) *ClusterEntry {
	name := req.Name
	if name == "" {
		name = cs.guessClusterName(kubeconfigPath, "")
	}
	provider := req.Provider
	if provider == "" {
		provider = cs.guessProvider(kubeconfigPath, name)
	}

	return &ClusterEntry{
		Name:           name,
		Provider:       provider,
		KubeconfigPath: kubeconfigPath,
		IsDefault:      req.MakeDefault,
	}
}

func (cs *ClusterService) resolveRuntimeKubeconfigPath() string {
	if cs.activePath != "" {
		if _, err := os.Stat(cs.activePath); err == nil {
			return cs.activePath
		}
	}

	if env := os.Getenv("KUBECONFIG"); env != "" {
		for _, part := range strings.Split(env, string(os.PathListSeparator)) {
			exp := cs.expandPath(part)
			if exp == "" {
				continue
			}
			if _, err := os.Stat(exp); err == nil {
				return exp
			}
		}
		parts := strings.Split(env, string(os.PathListSeparator))
		if len(parts) > 0 {
			return cs.expandPath(parts[0])
		}
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".kube", "config")
}
