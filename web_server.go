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
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/UserExistsError/conpty"
	"github.com/creack/pty/v2"
	"github.com/gorilla/websocket"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"

	k8sruntime "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"

	"github.com/kubegraf/kubegraf/internal/cache"
	"github.com/kubegraf/kubegraf/internal/cluster"
	"github.com/kubegraf/kubegraf/internal/database"
	"github.com/kubegraf/kubegraf/internal/security"
	"github.com/kubegraf/kubegraf/internal/telemetry"
	"github.com/kubegraf/kubegraf/internal/uilogger"
	"github.com/kubegraf/kubegraf/mcp/server"
	"github.com/kubegraf/kubegraf/pkg/capabilities"
	"github.com/kubegraf/kubegraf/pkg/incidents"
	"github.com/kubegraf/kubegraf/pkg/instrumentation"
	windowsterminal "github.com/kubegraf/kubegraf/pkg/terminal/windows"
)

var (
	NewDatabase     = database.NewDatabase
	NewCache        = cache.NewCache
	CacheBackendLRU = cache.CacheBackendLRU
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// toKubectlYAML converts a Kubernetes object to YAML format matching kubectl output
// It sets the TypeMeta (Kind/APIVersion) and removes managed fields for cleaner output
func toKubectlYAML(obj k8sruntime.Object, gvk schema.GroupVersionKind) ([]byte, error) {
	// Set the TypeMeta on the object so it appears in the YAML
	obj.GetObjectKind().SetGroupVersionKind(gvk)

	// Use sigs.k8s.io/yaml which properly handles JSON struct tags
	return yaml.Marshal(obj)
}

// runKubectlDescribe runs kubectl describe and returns the output
// resourceType: pod, deployment, service, statefulset, daemonset, cronjob, job, ingress, configmap, node
func runKubectlDescribe(resourceType, name, namespace string) (string, error) {
	var cmd *exec.Cmd
	if namespace != "" {
		cmd = exec.Command("kubectl", "describe", resourceType, name, "-n", namespace)
	} else {
		// For cluster-scoped resources like nodes
		cmd = exec.Command("kubectl", "describe", resourceType, name)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("kubectl describe failed: %s - %v", string(output), err)
	}
	return string(output), nil
}

// formatAge converts a duration to human-readable format (e.g., "5d", "3h", "45m")
func formatAge(d time.Duration) string {
	if d < 0 {
		d = -d
	}

	days := int(d.Hours() / 24)
	hours := int(d.Hours()) % 24
	minutes := int(d.Minutes()) % 60
	seconds := int(d.Seconds()) % 60

	if days > 0 {
		if hours > 0 {
			return fmt.Sprintf("%dd %dh", days, hours)
		}
		return fmt.Sprintf("%dd", days)
	}
	if hours > 0 {
		if minutes > 0 {
			return fmt.Sprintf("%dh %dm", hours, minutes)
		}
		return fmt.Sprintf("%dh", hours)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm", minutes)
	}
	return fmt.Sprintf("%ds", seconds)
}

// PortForwardSession tracks an active port-forward session
type PortForwardSession struct {
	ID             string    `json:"id"`
	Type           string    `json:"type"` // "pod" or "service"
	Name           string    `json:"name"`
	Namespace      string    `json:"namespace"`
	ClusterContext string    `json:"clusterContext"` // Cluster context for isolation
	LocalPort      int       `json:"localPort"`
	RemotePort     int       `json:"remotePort"`
	StartedAt      time.Time `json:"startedAt"`
	stopChan       chan struct{}
	readyChan      chan struct{}
}

// WebEvent represents a Kubernetes event for web UI
type WebEvent struct {
	Time      time.Time `json:"time"`
	Type      string    `json:"type"`
	Reason    string    `json:"reason"`
	Object    string    `json:"object"`
	Kind      string    `json:"kind"`
	Message   string    `json:"message"`
	Namespace string    `json:"namespace"`
	Count     int32     `json:"count"`
	Source    string    `json:"source"`
}

// WebServer handles the web UI
type WebServer struct {
	app          *App
	clients      map[*websocket.Conn]bool
	mu           sync.Mutex
	portForwards map[string]*PortForwardSession
	pfMu         sync.Mutex
	events       []WebEvent
	eventsMu     sync.RWMutex
	stopCh       chan struct{}
	// Cost cache - caches results for 5 minutes to avoid slow API calls
	// Keyed by cluster context to prevent cross-cluster cache hits
	costCache     map[string]*ClusterCost // key: context name, value: cached cost
	costCacheTime map[string]time.Time    // key: context name, value: cache time
	costCacheMu   sync.RWMutex
	// Custom apps cache - caches list of deployed custom apps for 30 seconds
	// Keyed by cluster context to prevent cross-cluster cache hits
	customAppsCache     map[string][]CustomAppInfo // key: context name, value: cached apps list
	customAppsCacheTime map[string]time.Time       // key: context name, value: cache time
	customAppsCacheMu   sync.RWMutex
	// Event monitor integration
	eventMonitorStarted bool
	// Execution streaming state (for live command execution panel)
	execMu       sync.RWMutex
	executions   map[string]*ExecutionRecord
	execLogs     map[string][]ExecutionLogLine
	execLogLimit int
	// MCP Server for AI agents
	mcpServer *server.MCPServer
	// Production upgrades
	cache          *cache.Cache
	db             *database.Database
	iam            *IAM
	clusterService *ClusterService
	// State management for continuity tracking
	stateManager *StateManager
	// Incident cache for faster incident detail responses
	incidentCache *IncidentCache
	// Snapshot cache for instant incident snapshots
	snapshotCache *incidents.SnapshotCache
	// Confidence learner for on-device learning
	confidenceLearner *incidents.ConfidenceLearner
	// Cluster manager for multi-cluster support
	clusterManager *cluster.ClusterManager
	// Performance instrumentation store
	perfStore instrumentation.PerformanceStore
	// Security features
	sessionTokenManager *security.SessionTokenManager
	ephemeralMode       *security.EphemeralMode
	secureMode          *security.SecureMode
}

// NewWebServer creates a new web server
func NewWebServer(app *App) *WebServer {
	ws := &WebServer{
		app:           app,
		clients:       make(map[*websocket.Conn]bool),
		portForwards:  make(map[string]*PortForwardSession),
		events:        make([]WebEvent, 0, 500),
		stopCh:        make(chan struct{}),
		costCache:            make(map[string]*ClusterCost),
		costCacheTime:        make(map[string]time.Time),
		customAppsCache:      make(map[string][]CustomAppInfo),
		customAppsCacheTime:   make(map[string]time.Time),
		executions:    make(map[string]*ExecutionRecord),
		execLogs:      make(map[string][]ExecutionLogLine),
		execLogLimit:  500,
		incidentCache: NewIncidentCache(),
		snapshotCache: incidents.NewSnapshotCache(1000, 5*time.Minute), // Cache 1000 snapshots for 5 minutes
	}
	// Initialize MCP server for AI agents
	ws.mcpServer = server.NewMCPServer(app)
	// Register default tools with the MCP server
	if err := ws.mcpServer.RegisterDefaultTools(); err != nil {
		fmt.Printf("⚠️  Failed to register MCP tools: %v\n", err)
	}

	// Initialize security features
	ws.sessionTokenManager = security.NewSessionTokenManager()
	ws.sessionTokenManager.StartCleanup()
	ws.ephemeralMode = security.NewEphemeralMode()
	ws.secureMode = security.NewSecureMode("") // Will be set below

	// Initialize database, cache, and IAM for production upgrades
	homeDir, err := os.UserHomeDir()
	if err != nil {
		// Fallback to current directory
		homeDir = "."
	}

	// Create .kubegraf directory if it doesn't exist
	kubegrafDir := filepath.Join(homeDir, ".kubegraf")
	if err := os.MkdirAll(kubegrafDir, 0755); err != nil {
		fmt.Printf("⚠️  Failed to create .kubegraf directory: %v\n", err)
	}

	// Update secure mode with kubegraf dir
	ws.secureMode = security.NewSecureMode(kubegrafDir)

	// Get or create master key (machine-based, no user interaction)
	masterKey, err := security.GetOrCreateMasterKey(kubegrafDir)
	if err != nil {
		fmt.Printf("⚠️  Failed to get master key: %v\n", err)
		// Fallback to environment variable
		encKey := os.Getenv("KUBEGRAF_ENCRYPTION_KEY")
		if encKey == "" {
			encKey = "default-encryption-key-change-in-production"
		}
		masterKey = []byte(encKey)
	}

	// Convert master key to string for database (first 32 bytes or pad)
	encryptionKey := string(masterKey)
	if len(encryptionKey) < 32 {
		// Pad if needed
		padding := make([]byte, 32-len(encryptionKey))
		encryptionKey = encryptionKey + string(padding)
	} else if len(encryptionKey) > 32 {
		encryptionKey = encryptionKey[:32]
	}

	// Initialize database
	normalDbPath := filepath.Join(kubegrafDir, "db.sqlite")
	dbPath := ws.ephemeralMode.GetDBPath(normalDbPath)
	db, err := NewDatabase(dbPath, encryptionKey)
	if err != nil {
		// Silent failure for production
	} else {
		ws.db = db
		// Initialize cluster service if database is available
		if ws.db != nil {
			ws.clusterService = NewClusterService(app, ws.db)

			// Initialize backup configuration
			backupDir = filepath.Join(kubegrafDir, "backups")
			backupInterval = 6 * time.Hour
			backupEnabled = true

			// Start automatic database backups
			ctx, cancel := context.WithCancel(context.Background())
			backupCancel = cancel
			go func() {
				if err := ws.db.AutoBackup(ctx, backupDir, backupInterval); err != nil {
					// Silent failure for backup service
				}
			}()
		}
	}

	// Initialize cache (use LRU backend by default)
	cache, err := NewCache(CacheBackendLRU, "")
	if err != nil {
		// Silent failure for production
	} else {
		ws.cache = cache
	}

	// Initialize IAM (enabled by default)
	iamEnabled := true
	if ws.db != nil {
		ws.iam = NewIAM(ws.db, iamEnabled)
	}

	// Initialize state manager for continuity tracking
	stateMgr, err := NewStateManager()
	if err != nil {
		fmt.Printf("⚠️  Failed to initialize state manager: %v\n", err)
	} else {
		ws.stateManager = stateMgr
	}

	return ws
}

// Start starts the web server
func (ws *WebServer) Start(port int) error {
	// Read state on startup (last_seen_at) - silently
	if ws.stateManager != nil {
		ws.stateManager.ReadState()
	}

	// Get the embedded web UI filesystem
	webFS, err := GetWebFS()
	if err != nil {
		return fmt.Errorf("failed to get web filesystem: %v", err)
	}

	// Serve static files with SPA routing (must be registered last)
	staticHandler := ws.handleStaticFiles(webFS)
	http.HandleFunc("/api/status", ws.handleConnectionStatus)
	http.HandleFunc("/api/updates/check", ws.handleCheckUpdates)
	http.HandleFunc("/api/updates/install", ws.handleInstallUpdate)
	// New update endpoints
	http.HandleFunc("/api/update/check", ws.handleCheckUpdates)
	http.HandleFunc("/api/update/auto-check", ws.handleAutoCheckUpdates)
	http.HandleFunc("/api/metrics", ws.handleMetrics)
	http.HandleFunc("/api/namespaces", ws.handleNamespaces)
	http.HandleFunc("/api/pods", ws.handlePods)
	http.HandleFunc("/api/pods/metrics", ws.handlePodMetrics)
	http.HandleFunc("/api/deployments", ws.handleDeployments)
	http.HandleFunc("/api/statefulsets", ws.handleStatefulSets)
	http.HandleFunc("/api/daemonsets", ws.handleDaemonSets)
	http.HandleFunc("/api/services", ws.handleServices)
	http.HandleFunc("/api/ingresses", ws.handleIngresses)
	http.HandleFunc("/api/configmaps", ws.handleConfigMaps)
	http.HandleFunc("/api/secrets", ws.handleSecrets)
	http.HandleFunc("/api/cronjobs", ws.handleCronJobs)
	http.HandleFunc("/api/jobs", ws.handleJobs)
	http.HandleFunc("/api/pdbs", ws.handlePDBs)
	http.HandleFunc("/api/hpas", ws.handleHPAs)
	http.HandleFunc("/api/nodes", ws.handleNodes)
	http.HandleFunc("/api/topology", ws.handleTopology)
	http.HandleFunc("/api/resourcemap", ws.handleResourceMap)
	http.HandleFunc("/ws", ws.handleWebSocket)

	// Multi-cluster context endpoints
	http.HandleFunc("/api/contexts", ws.handleContexts)
	http.HandleFunc("/api/contexts/current", ws.handleCurrentContext)
	http.HandleFunc("/api/contexts/switch", ws.handleSwitchContext)

	// Capabilities endpoint
	http.HandleFunc("/api/capabilities", ws.handleCapabilities)

	// Cluster manager endpoints
	// Legacy cluster endpoints (keep for backward compatibility)
	http.HandleFunc("/api/clusters", ws.handleClusters)
	http.HandleFunc("/api/clusters/connect", ws.handleClusterConnect)
	http.HandleFunc("/api/clusters/disconnect", ws.handleClusterDisconnect)
	http.HandleFunc("/api/clusters/status", ws.handleClusterStatus)

	// New cluster manager endpoints (fast, pre-warmed)
	http.HandleFunc("/api/clusters/list", ws.handleListClustersNew)
	http.HandleFunc("/api/clusters/namespaces", ws.handleGetClusterNamespacesNew)
	http.HandleFunc("/api/clusters/pods", ws.handleGetClusterPodsNew)
	http.HandleFunc("/api/clusters/events", ws.handleGetClusterEventsNew)
	http.HandleFunc("/api/clusters/refresh", ws.handleRefreshClusters)

	// File dialog endpoint
	http.HandleFunc("/api/file/dialog", ws.handleFileDialog)

	// Workspace context endpoint
	http.HandleFunc("/api/workspace/context", ws.handleWorkspaceContext)

	// Real-time events endpoint
	http.HandleFunc("/api/events", ws.handleEvents)

	// Live execution history endpoints for the execution panel
	http.HandleFunc("/api/executions", ws.handleExecutionList)
	http.HandleFunc("/api/executions/logs", ws.handleExecutionLogs)

	// Apps marketplace endpoints
	http.HandleFunc("/api/apps", ws.handleApps)
	http.HandleFunc("/api/apps/installed", ws.handleInstalledApps)
	http.HandleFunc("/api/apps/install", ws.handleInstallApp)
	http.HandleFunc("/api/apps/uninstall", ws.handleUninstallApp)
	http.HandleFunc("/api/apps/local-clusters", ws.handleLocalClusters)
	http.HandleFunc("/api/apps/local-clusters/delete", ws.handleDeleteLocalCluster)
	
	// Custom app deployment endpoints
	http.HandleFunc("/api/custom-apps/preview", ws.handleCustomAppPreview)
	http.HandleFunc("/api/custom-apps/deploy", ws.handleCustomAppDeploy)
	http.HandleFunc("/api/custom-apps/list", ws.handleCustomAppList)
	http.HandleFunc("/api/custom-apps/get", ws.handleCustomAppGet)
	http.HandleFunc("/api/custom-apps/update", ws.handleCustomAppUpdate)
	http.HandleFunc("/api/custom-apps/restart", ws.handleCustomAppRestart)
	http.HandleFunc("/api/custom-apps/delete", ws.handleCustomAppDelete)

	// Impact analysis endpoint
	http.HandleFunc("/api/impact", ws.handleImpactAnalysis)

	// Operations endpoints
	http.HandleFunc("/api/pod/details", ws.handlePodDetails)
	http.HandleFunc("/api/pod/yaml", ws.handlePodYAML)
	http.HandleFunc("/api/pod/update", ws.handlePodUpdate)
	http.HandleFunc("/api/pod/describe", ws.handlePodDescribe)
	http.HandleFunc("/api/pod/exec", ws.handlePodExec)
	http.HandleFunc("/api/pod/terminal", ws.handlePodTerminalWS)
	http.HandleFunc("/api/pod/logs", ws.handlePodLogs)
	http.HandleFunc("/api/local/terminal", ws.handleLocalTerminalWS)
	http.HandleFunc("/api/terminal/shells", ws.handleGetAvailableShells)
	http.HandleFunc("/api/terminal/preferences", ws.handleGetTerminalPreferences)
	http.HandleFunc("/api/execution/stream", ws.handleExecutionStream)

	// Telemetry consent APIs
	http.HandleFunc("/api/telemetry/status", ws.handleTelemetryStatus)
	http.HandleFunc("/api/telemetry/consent", ws.handleTelemetryConsent)

	// UI Logger APIs (frontend logs to backend)
	http.HandleFunc("/api/ui-logs/write", ws.handleUILogWrite)
	http.HandleFunc("/api/ui-logs/stats", ws.handleUILogStats)
	http.HandleFunc("/terminal", ws.handleLocalTerminalPage)
	http.HandleFunc("/api/pod/restart", ws.handlePodRestart)
	http.HandleFunc("/api/pod/delete", ws.handlePodDelete)
	http.HandleFunc("/api/deployment/details", ws.handleDeploymentDetails)
	http.HandleFunc("/api/deployment/yaml", ws.handleDeploymentYAML)
	http.HandleFunc("/api/deployment/update", ws.handleDeploymentUpdate)
	http.HandleFunc("/api/deployment/describe", ws.handleDeploymentDescribe)
	http.HandleFunc("/api/deployment/restart", ws.handleDeploymentRestart)
	http.HandleFunc("/api/deployment/scale", ws.handleDeploymentScale)
	http.HandleFunc("/api/deployment/delete", ws.handleDeploymentDelete)
	http.HandleFunc("/api/statefulset/details", ws.handleStatefulSetDetails)
	http.HandleFunc("/api/statefulset/yaml", ws.handleStatefulSetYAML)
	http.HandleFunc("/api/statefulset/update", ws.handleStatefulSetUpdate)
	http.HandleFunc("/api/statefulset/describe", ws.handleStatefulSetDescribe)
	http.HandleFunc("/api/statefulset/restart", ws.handleStatefulSetRestart)
	http.HandleFunc("/api/statefulset/scale", ws.handleStatefulSetScale)
	http.HandleFunc("/api/statefulset/delete", ws.handleStatefulSetDelete)
	http.HandleFunc("/api/daemonset/details", ws.handleDaemonSetDetails)
	http.HandleFunc("/api/daemonset/yaml", ws.handleDaemonSetYAML)
	http.HandleFunc("/api/daemonset/update", ws.handleDaemonSetUpdate)
	http.HandleFunc("/api/daemonset/describe", ws.handleDaemonSetDescribe)
	http.HandleFunc("/api/daemonset/restart", ws.handleDaemonSetRestart)
	http.HandleFunc("/api/daemonset/delete", ws.handleDaemonSetDelete)

	// Workload cross-navigation endpoints
	http.HandleFunc("/api/workloads/", ws.handleWorkloadRoutes)

	// Bulk operations by namespace
	http.HandleFunc("/api/deployments/bulk/restart", ws.handleBulkDeploymentRestart)
	http.HandleFunc("/api/deployments/bulk/delete", ws.handleBulkDeploymentDelete)
	http.HandleFunc("/api/statefulsets/bulk/restart", ws.handleBulkStatefulSetRestart)
	http.HandleFunc("/api/statefulsets/bulk/delete", ws.handleBulkStatefulSetDelete)
	http.HandleFunc("/api/daemonsets/bulk/restart", ws.handleBulkDaemonSetRestart)
	http.HandleFunc("/api/daemonsets/bulk/delete", ws.handleBulkDaemonSetDelete)

	// Namespace CRUD operations
	http.HandleFunc("/api/namespace/details", ws.handleNamespaceDetails)
	http.HandleFunc("/api/namespace/yaml", ws.handleNamespaceYAML)
	http.HandleFunc("/api/namespace/update", ws.handleNamespaceUpdate)
	http.HandleFunc("/api/namespace/describe", ws.handleNamespaceDescribe)
	http.HandleFunc("/api/namespace/delete", ws.handleNamespaceDelete)
	http.HandleFunc("/api/cronjob/details", ws.handleCronJobDetails)
	http.HandleFunc("/api/cronjob/yaml", ws.handleCronJobYAML)
	http.HandleFunc("/api/cronjob/update", ws.handleCronJobUpdate)
	http.HandleFunc("/api/cronjob/describe", ws.handleCronJobDescribe)
	http.HandleFunc("/api/cronjob/delete", ws.handleCronJobDelete)
	http.HandleFunc("/api/job/details", ws.handleJobDetails)
	http.HandleFunc("/api/job/yaml", ws.handleJobYAML)
	http.HandleFunc("/api/job/update", ws.handleJobUpdate)
	http.HandleFunc("/api/job/describe", ws.handleJobDescribe)
	http.HandleFunc("/api/job/delete", ws.handleJobDelete)
	http.HandleFunc("/api/pdb/details", ws.handlePDBDetails)
	http.HandleFunc("/api/pdb/yaml", ws.handlePDBYAML)
	http.HandleFunc("/api/pdb/update", ws.handlePDBUpdate)
	http.HandleFunc("/api/pdb/describe", ws.handlePDBDescribe)
	http.HandleFunc("/api/pdb/delete", ws.handlePDBDelete)
	http.HandleFunc("/api/hpa/details", ws.handleHPADetails)
	http.HandleFunc("/api/hpa/yaml", ws.handleHPAYAML)
	http.HandleFunc("/api/hpa/update", ws.handleHPAUpdate)
	http.HandleFunc("/api/hpa/describe", ws.handleHPADescribe)
	http.HandleFunc("/api/hpa/delete", ws.handleHPADelete)
	http.HandleFunc("/api/service/details", ws.handleServiceDetails)
	http.HandleFunc("/api/service/yaml", ws.handleServiceYAML)
	http.HandleFunc("/api/service/update", ws.handleServiceUpdate)
	http.HandleFunc("/api/service/describe", ws.handleServiceDescribe)
	http.HandleFunc("/api/service/delete", ws.handleServiceDelete)
	http.HandleFunc("/api/ingress/details", ws.handleIngressDetails)
	http.HandleFunc("/api/ingress/yaml", ws.handleIngressYAML)
	http.HandleFunc("/api/ingress/update", ws.handleIngressUpdate)
	http.HandleFunc("/api/ingress/describe", ws.handleIngressDescribe)
	http.HandleFunc("/api/ingress/delete", ws.handleIngressDelete)
	http.HandleFunc("/api/networkpolicies", ws.handleNetworkPolicies)
	http.HandleFunc("/api/networkpolicy/details", ws.handleNetworkPolicyDetails)
	http.HandleFunc("/api/networkpolicy/yaml", ws.handleNetworkPolicyYAML)
	http.HandleFunc("/api/networkpolicy/update", ws.handleNetworkPolicyUpdate)
	http.HandleFunc("/api/networkpolicy/describe", ws.handleNetworkPolicyDescribe)
	http.HandleFunc("/api/networkpolicy/delete", ws.handleNetworkPolicyDelete)
	http.HandleFunc("/api/configmap/details", ws.handleConfigMapDetails)
	http.HandleFunc("/api/configmap/yaml", ws.handleConfigMapYAML)
	http.HandleFunc("/api/configmap/update", ws.handleConfigMapUpdate)
	http.HandleFunc("/api/configmap/describe", ws.handleConfigMapDescribe)
	http.HandleFunc("/api/configmap/delete", ws.handleConfigMapDelete)
	http.HandleFunc("/api/secret/details", ws.handleSecretDetails)
	http.HandleFunc("/api/secret/yaml", ws.handleSecretYAML)
	http.HandleFunc("/api/secret/update", ws.handleSecretUpdate)
	http.HandleFunc("/api/secret/describe", ws.handleSecretDescribe)
	http.HandleFunc("/api/secret/delete", ws.handleSecretDelete)
	http.HandleFunc("/api/certificates", ws.handleCertificates)
	// http.HandleFunc("/api/certificate/yaml", ws.handleCertificateYAML) // TODO: implement
	// http.HandleFunc("/api/certificate/update", ws.handleCertificateUpdate) // TODO: implement
	// http.HandleFunc("/api/certificate/describe", ws.handleCertificateDescribe) // TODO: implement
	// http.HandleFunc("/api/certificate/delete", ws.handleCertificateDelete) // TODO: implement
	http.HandleFunc("/api/node/details", ws.handleNodeDetails)
	http.HandleFunc("/api/node/yaml", ws.handleNodeYAML)
	http.HandleFunc("/api/node/describe", ws.handleNodeDescribe)

	// Port-forward endpoints
	http.HandleFunc("/api/portforward/start", ws.handlePortForwardStart)
	http.HandleFunc("/api/portforward/stop", ws.handlePortForwardStop)
	http.HandleFunc("/api/portforward/list", ws.handlePortForwardList)

	// Authentication endpoints
	http.HandleFunc("/api/auth/login", ws.handleLogin)
	http.HandleFunc("/api/auth/logout", ws.handleLogout)
	http.HandleFunc("/api/auth/register", ws.handleRegister)
	http.HandleFunc("/api/auth/me", ws.handleGetCurrentUser)

	// Database backup endpoints
	http.HandleFunc("/api/database/backup/status", ws.handleBackupStatus)
	http.HandleFunc("/api/database/backup/config", ws.handleBackupConfig)
	http.HandleFunc("/api/database/backup/now", ws.handleBackupNow)
	http.HandleFunc("/api/database/backup/list", ws.handleBackupList)
	http.HandleFunc("/api/database/backup/restore", ws.handleBackupRestore)

	// Continuity tracking endpoint
	http.HandleFunc("/api/continuity/summary", ws.handleContinuitySummary)

	// Security analysis endpoint
	http.HandleFunc("/api/security", ws.handleSecurityAnalysis)

	// Plugin endpoints - Helm
	http.HandleFunc("/api/plugins/helm/releases", ws.handleHelmReleases)
	http.HandleFunc("/api/plugins/helm/release", ws.handleHelmReleaseDetails)
	http.HandleFunc("/api/plugins/helm/history", ws.handleHelmReleaseHistory)
	http.HandleFunc("/api/plugins/helm/rollback", ws.handleHelmRollback)

	// Plugin endpoints - Kustomize (resources managed by kustomize)
	http.HandleFunc("/api/plugins/kustomize/resources", ws.handleKustomizeResources)

	// Plugin endpoints - ArgoCD
	http.HandleFunc("/api/plugins/argocd/apps", ws.handleArgoCDApps)
	http.HandleFunc("/api/plugins/argocd/app", ws.handleArgoCDAppDetails)
	http.HandleFunc("/api/plugins/argocd/sync", ws.handleArgoCDSync)
	http.HandleFunc("/api/plugins/argocd/refresh", ws.handleArgoCDRefresh)

	// Plugin endpoints - Flux
	http.HandleFunc("/api/plugins/flux/resources", ws.handleFluxResources)

	// Kiali integration endpoints
	http.HandleFunc("/api/integrations/kiali/status", ws.handleKialiStatus)
	http.HandleFunc("/api/integrations/kiali/install", ws.handleKialiInstall)
	http.HandleFunc("/api/integrations/kiali/versions", ws.handleKialiVersions)
	http.HandleFunc("/api/kiali/proxy/", ws.handleKialiProxy)
	http.HandleFunc("/api/kiali/proxy", ws.handleKialiProxy)

	// Traffic metrics endpoint for live traffic visualization
	http.HandleFunc("/api/traffic/metrics", ws.handleTrafficMetrics)

	// MLflow integration endpoints
	http.HandleFunc("/api/mlflow/status", ws.handleMLflowStatus)
	http.HandleFunc("/api/mlflow/install", ws.handleMLflowInstall)
	http.HandleFunc("/api/mlflow/versions", ws.handleMLflowVersions)
	http.HandleFunc("/api/mlflow/upgrade", ws.handleMLflowUpgrade)
	http.HandleFunc("/api/mlflow/proxy/", ws.ProxyMLflowAPI)
	http.HandleFunc("/api/mlflow/proxy", ws.ProxyMLflowAPI)

	// ML Training Jobs endpoints
	http.HandleFunc("/api/ml/jobs/create", ws.handleMLJobCreate)
	http.HandleFunc("/api/ml/jobs/list", ws.handleMLJobList)
	http.HandleFunc("/api/ml/jobs/get", ws.handleMLJobGet)
	http.HandleFunc("/api/ml/jobs/delete", ws.handleMLJobDelete)
	http.HandleFunc("/api/ml/jobs/logs", ws.handleMLJobLogs)
	http.HandleFunc("/api/ml/jobs/logs/ws", ws.handleMLJobLogsWS)

	// ML workloads endpoints (legacy/compatibility paths)
	http.HandleFunc("/api/trainingjobs", ws.handleTrainingJobs)
	http.HandleFunc("/api/inferenceservices", ws.handleInferenceServices)

	// Inference Services endpoints
	http.HandleFunc("/api/inference/create", ws.handleInferenceCreate)
	http.HandleFunc("/api/inference/list", ws.handleInferenceList)
	http.HandleFunc("/api/inference/get", ws.handleInferenceGet)
	http.HandleFunc("/api/inference/delete", ws.handleInferenceDelete)
	http.HandleFunc("/api/inference/test", ws.handleInferenceTest)
	http.HandleFunc("/api/inference/status", ws.handleInferenceGet)

	// Feast Feature Store endpoints
	http.HandleFunc("/api/feast/status", ws.handleFeastStatus)
	http.HandleFunc("/api/feast/install", ws.handleFeastInstall)

	// GPU Metrics endpoints
	http.HandleFunc("/api/gpu/status", ws.handleGPUStatus)
	http.HandleFunc("/api/gpu/nodes", ws.handleGPUNodes)
	http.HandleFunc("/api/gpu/metrics", ws.handleGPUMetrics)
	http.HandleFunc("/api/gpu/install", ws.handleGPUInstall)

	// Initialize AutoFix rules (silently)
	initAutoFixRules()

	// Advanced features - AI, Diagnostics, Cost, Drift
	ws.RegisterAdvancedHandlers()

	// Accuracy testing
	ws.RegisterAccuracyHandlers()

	// Event monitoring
	ws.RegisterEventHandlers()

	// History/Timeline replay API
	ws.RegisterHistoryHandlers()

	// MCP (Model Context Protocol) Server for AI agents
	if ws.mcpServer != nil {
		http.HandleFunc("/api/mcp", ws.mcpServer.HandleRequest)
	}

	// Connectors
	ws.RegisterConnectorHandlers()

	// SRE Agent
	ws.RegisterSREAgentHandlers()

	// Access Control
	ws.RegisterAccessControlHandlers()

	// Custom Resources
	ws.RegisterCustomResourcesHandlers()

	// Incidents endpoint (legacy)
	http.HandleFunc("/api/incidents", ws.handleIncidents)

	// Initialize Incident Intelligence system
	ws.RegisterIncidentIntelligenceRoutes()

	// Performance instrumentation endpoints
	http.HandleFunc("/api/v2/perf/summary", ws.handlePerfSummary)
	http.HandleFunc("/api/v2/perf/recent", ws.handlePerfRecent)
	http.HandleFunc("/api/v2/perf/clear", ws.handlePerfClear)
	http.HandleFunc("/api/v2/perf/ui", ws.handlePerfUI)

	// Incidents V2 endpoint (full incident intelligence with diagnosis, recommendations, fixes)
	// Wrap with performance middleware if enabled
	if ws.perfStore != nil {
		http.HandleFunc("/api/v2/incidents/summary", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleIncidentsV2Summary))
		http.HandleFunc("/api/v2/incidents/patterns", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleIncidentsV2Patterns))
		http.HandleFunc("/api/v2/incidents/refresh", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleIncidentsV2Refresh))
		// Learning endpoints
		http.HandleFunc("/api/v2/learning/status", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleLearningStatus))
		http.HandleFunc("/api/v2/learning/reset", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleLearningReset))
		http.HandleFunc("/api/v2/incidents/", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleIncidentV2ByID))
		http.HandleFunc("/api/v2/incidents", instrumentation.PerformanceMiddleware(ws.perfStore, ws.handleIncidentsV2))
	} else {
		http.HandleFunc("/api/v2/incidents/summary", ws.handleIncidentsV2Summary)
		http.HandleFunc("/api/v2/incidents/patterns", ws.handleIncidentsV2Patterns)
		http.HandleFunc("/api/v2/incidents/refresh", ws.handleIncidentsV2Refresh)
		// Learning endpoints (must be registered before the catch-all /api/v2/incidents/ route)
		http.HandleFunc("/api/v2/learning/status", ws.handleLearningStatus)
		http.HandleFunc("/api/v2/learning/reset", ws.handleLearningReset)
		http.HandleFunc("/api/v2/incidents/", ws.handleIncidentV2ByID)
		http.HandleFunc("/api/v2/incidents", ws.handleIncidentsV2)
	}

	// Fix action endpoints (safe remediation actions)
	// NOTE: These routes are now handled via /api/v2/incidents/{id}/fix-preview and /api/v2/incidents/{id}/fix-apply
	// Keeping fix-preview for backward compatibility, but fix-apply is handled by handleIncidentV2ByID
	http.HandleFunc("/api/v2/incidents/fix-preview", ws.handleFixPreview)
	// Removed: http.HandleFunc("/api/v2/incidents/fix-apply", ws.handleFixApply)
	// This route is now handled by handleIncidentV2ByID -> handleFixApplyV2

	// Auto-remediation endpoints
	http.HandleFunc("/api/v2/auto-remediation/status", ws.handleAutoRemediationStatus)
	http.HandleFunc("/api/v2/auto-remediation/enable", ws.handleAutoRemediationEnable)
	http.HandleFunc("/api/v2/auto-remediation/disable", ws.handleAutoRemediationDisable)
	http.HandleFunc("/api/v2/auto-remediation/decisions", ws.handleAutoRemediationDecisions)

	// Learning endpoints
	http.HandleFunc("/api/v2/learning/clusters", ws.handleLearningClusters)
	http.HandleFunc("/api/v2/learning/patterns", ws.handleLearningPatterns)
	http.HandleFunc("/api/v2/learning/trends", ws.handleLearningTrends)
	http.HandleFunc("/api/v2/learning/similar", ws.handleLearningSimilar)

	// Runbooks endpoints
	http.HandleFunc("/api/v2/runbooks", ws.handleRunbooks)

	// Feedback endpoint
	http.HandleFunc("/api/v2/feedback", ws.handleFeedback)

	// Brain endpoints (real cluster data)
	http.HandleFunc("/api/brain/timeline", ws.handleBrainTimeline)
	http.HandleFunc("/api/brain/oom-insights", ws.handleBrainOOMInsights)
	http.HandleFunc("/api/brain/summary", ws.handleBrainSummary)

	// Brain ML Insights endpoints
	http.HandleFunc("/api/brain/ml/timeline", ws.handleBrainMLTimeline)
	http.HandleFunc("/api/brain/ml/predictions", ws.handleBrainMLPredictions)
	http.HandleFunc("/api/brain/ml/summary", ws.handleBrainMLSummary)

	// Session token validation endpoint
	http.HandleFunc("/api/auth/validate-token", ws.handleValidateSessionToken)

	// Realtime metrics streaming (CPU/Memory)
	http.HandleFunc("/ws/metrics", ws.handleMetricsWebSocket)
	http.HandleFunc("/api/metrics/snapshot", ws.handleMetricsSnapshot)
	http.HandleFunc("/api/metrics/status", ws.handleMetricsStatus)

	// Phase 1 features (Change Intelligence, Explain Pod, Multi-Cluster, Knowledge Sharing)
	ws.registerPhase1Routes()

	// Static files and SPA routing (must be last to not override API routes)
	http.HandleFunc("/", staticHandler)

	// Check if port is available, if not find next available port
	actualPort := port
	fmt.Printf("🔍 Checking port %d availability...\n", port)

	// Bind to localhost only for security (127.0.0.1 and ::1)
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		// Try IPv6 localhost
		listener, err = net.Listen("tcp", fmt.Sprintf("[::1]:%d", port))
		if err != nil {
			// Port is in use, find next available port
			fmt.Printf("⚠️  Port %d is in use, searching for available port...\n", port)
			actualPort, err = findAvailablePortLocalhost(port)
			if err != nil {
				return fmt.Errorf("failed to find available port: %v", err)
			}
			fmt.Printf("✅ Found available port: %d\n", actualPort)
		}
	}
	if listener != nil {
		listener.Close()
	}

	addr := fmt.Sprintf("127.0.0.1:%d", actualPort)
	fmt.Printf("🚀 Starting HTTP server on %s (localhost only)...\n", addr)

	// Open browser automatically
	url := fmt.Sprintf("http://localhost:%d", actualPort)
	go func() {
		time.Sleep(500 * time.Millisecond) // Small delay to ensure server is ready
		openBrowser(url)
	}()

	// Pre-warm the cost cache in background (waits for cluster connection)
	go ws.prewarmCostCache()

	// Show startup banner
	ws.showStartupBanner(actualPort)

	// Start update polling in background (checks every 4 hours)
	go ws.startUpdatePolling()

	// Start broadcasting updates
	go ws.broadcastUpdates()

	// Start watching Kubernetes events for real-time stream (waits for cluster connection)
	go ws.watchKubernetesEvents()

	// Start realtime metrics collector
	go ws.startMetricsCollector()

	fmt.Printf("✅ Server starting, listening on %s\n", addr)

	// Create server with localhost binding
	server := &http.Server{
		Addr:    addr,
		Handler: nil,
	}

	return server.ListenAndServe()
}

// prewarmCostCache calculates cluster cost in background and caches the result
func (ws *WebServer) prewarmCostCache() {
	// Wait for cluster connection
	for i := 0; i < 60; i++ {
		if ws.app.clientset != nil && ws.app.connected {
			break
		}
		time.Sleep(1 * time.Second)
	}

	if ws.app.clientset == nil || !ws.app.connected {
		return
	}

	currentContext := ws.app.GetCurrentContext()
	if currentContext == "" {
		return
	}

	estimator := NewCostEstimator(ws.app)
	ctx := context.Background()

	cost, err := estimator.EstimateClusterCost(ctx)
	if err != nil {
		return
	}

	ws.costCacheMu.Lock()
	ws.costCache[currentContext] = cost
	ws.costCacheTime[currentContext] = time.Now()
	ws.costCacheMu.Unlock()
}

// showStartupBanner displays a startup message with the web server port
func (ws *WebServer) showStartupBanner(port int) {
	fmt.Printf("🌐 Web UI running at: http://localhost:%d\n", port)
	fmt.Println("🔄 Auto-updates enabled")
	fmt.Println()
	// Note: Browser opening is handled in Start() method to avoid duplicate tabs
}

// openBrowser opens a URL in the default browser (cross-platform)
func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
	return cmd.Start() // Use Start() instead of Run() to not block
}

// handleStaticFiles serves static files from the embedded filesystem
// It implements SPA routing: serves static files if they exist, otherwise serves index.html
func (ws *WebServer) handleStaticFiles(webFS fs.FS) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(webFS))

	return func(w http.ResponseWriter, r *http.Request) {
		// IMPORTANT: Skip API routes - they should be handled by API handlers
		// This prevents serving index.html for API endpoints
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/ws") {
			// This shouldn't happen if API routes are registered correctly,
			// but if it does, return 404 instead of serving index.html
			http.NotFound(w, r)
			return
		}

		// Clean the path
		upath := r.URL.Path
		if !strings.HasPrefix(upath, "/") {
			upath = "/" + upath
		}
		upath = path.Clean(upath)

		// Try to serve the file directly
		if upath != "/" {
			// Check if file exists in embedded FS
			filePath := strings.TrimPrefix(upath, "/")
			if _, err := fs.Stat(webFS, filePath); err == nil {
				// Add cache-busting headers for JavaScript and CSS files
				// Hash-named files (e.g., index-DTTyubyh.js) can be cached aggressively
				// HTML files should not be cached
				if strings.HasSuffix(filePath, ".js") || strings.HasSuffix(filePath, ".css") {
					if strings.Contains(filePath, "-") && (strings.Contains(filePath, "/assets/") || strings.HasPrefix(filePath, "assets/")) {
						// Hashed assets - cache for 1 year
						w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
					} else {
						// Non-hashed JS/CSS - no cache
						w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
						w.Header().Set("Pragma", "no-cache")
						w.Header().Set("Expires", "0")
					}
				} else if strings.HasSuffix(filePath, ".html") {
					// HTML files - no cache
					w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
					w.Header().Set("Pragma", "no-cache")
					w.Header().Set("Expires", "0")
				}
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Serve index.html for SPA routing (root path or file not found)
		indexContent, err := fs.ReadFile(webFS, "index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		// No cache for index.html
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		w.Write(indexContent)
	}
}

// handleConnectionStatus returns the cluster connection status

// handleCheckUpdates checks for available updates

// handleInstallUpdate downloads and installs the latest version

// handleMetrics returns cluster metrics

// handleTopology returns topology data for visualization

// handleWebSocket handles WebSocket connections for real-time updates
func (ws *WebServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	ws.mu.Lock()
	ws.clients[conn] = true
	ws.mu.Unlock()

	// Remove client on disconnect
	defer func() {
		ws.mu.Lock()
		delete(ws.clients, conn)
		ws.mu.Unlock()
	}()

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// broadcastUpdates sends periodic updates to all connected clients
func (ws *WebServer) broadcastUpdates() {
	// Wait for cluster connection before starting updates
	for i := 0; i < 60; i++ {
		if ws.app.clientset != nil && ws.app.connected {
			break
		}
		time.Sleep(1 * time.Second)
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		metrics := ws.getClusterMetrics()

		ws.mu.Lock()
		for client := range ws.clients {
			err := client.WriteJSON(map[string]interface{}{
				"type": "metrics",
				"data": metrics,
			})
			if err != nil {
				client.Close()
				delete(ws.clients, client)
			}
		}
		ws.mu.Unlock()
	}
}

// handleEvents returns historical events via REST API

// watchKubernetesEvents watches for Kubernetes events and broadcasts them to WebSocket clients

// broadcastEvent sends an event to all connected WebSocket clients
func (ws *WebServer) broadcastEvent(event WebEvent) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	msg := map[string]interface{}{
		"type": "event",
		"data": event,
	}

	for client := range ws.clients {
		if err := client.WriteJSON(msg); err != nil {
			client.Close()
			delete(ws.clients, client)
		}
	}
}

// broadcastMonitoredEvent sends a monitored event to all connected WebSocket clients
func (ws *WebServer) broadcastMonitoredEvent(event MonitoredEvent) {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	msg := map[string]interface{}{
		"type": "monitored_event",
		"data": event,
	}

	for client := range ws.clients {
		if err := client.WriteJSON(msg); err != nil {
			client.Close()
			delete(ws.clients, client)
		}
	}
}

// ImpactNode represents a node in the impact analysis tree
type ImpactNode struct {
	Type       string        `json:"type"`
	Name       string        `json:"name"`
	Namespace  string        `json:"namespace"`
	Severity   string        `json:"severity"` // "critical", "high", "medium", "low"
	Impact     string        `json:"impact"`   // Description of impact
	Children   []*ImpactNode `json:"children,omitempty"`
	Dependents int           `json:"dependents"`
}

// ImpactAnalysis represents the full impact analysis result
type ImpactAnalysis struct {
	Resource        string        `json:"resource"`
	ResourceType    string        `json:"resourceType"`
	Namespace       string        `json:"namespace"`
	TotalImpacted   int           `json:"totalImpacted"`
	CriticalCount   int           `json:"criticalCount"`
	HighCount       int           `json:"highCount"`
	MediumCount     int           `json:"mediumCount"`
	LowCount        int           `json:"lowCount"`
	ImpactedNodes   []*ImpactNode `json:"impactedNodes"`
	Summary         string        `json:"summary"`
	Recommendations []string      `json:"recommendations"`
}

// handleImpactAnalysis analyzes the impact of deleting or modifying a resource
// func (ws *WebServer) handleImpactAnalysis(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
// 	w.Header().Set("Access-Control-Allow-Origin", "*")
//
// 	resourceType := r.URL.Query().Get("type")
// 	resourceName := r.URL.Query().Get("name")
// 	namespace := r.URL.Query().Get("namespace")
//
// 	if namespace == "" || namespace == "All Namespaces" {
// 		namespace = ws.app.namespace
// 	}
//
// 	if resourceType == "" || resourceName == "" {
// 		http.Error(w, "Missing required parameters: type and name", http.StatusBadRequest)
// 		return
// 	}
//
// 	var analysis *ImpactAnalysis
// 	var err error
//
// 	switch strings.ToLower(resourceType) {
// 	case "service":
// 		analysis, err = ws.analyzeServiceImpact(resourceName, namespace)
// 	case "configmap":
// 		analysis, err = ws.analyzeConfigMapImpact(resourceName, namespace)
// 	case "secret":
// 		analysis, err = ws.analyzeSecretImpact(resourceName, namespace)
// 	case "deployment":
// 		analysis, err = ws.analyzeDeploymentImpact(resourceName, namespace)
// 	case "pod":
// 		analysis, err = ws.analyzePodImpact(resourceName, namespace)
// 	case "node":
// 		analysis, err = ws.analyzeNodeImpact(resourceName)
// 	default:
// 		http.Error(w, fmt.Sprintf("Impact analysis not supported for resource type: %s", resourceType), http.StatusBadRequest)
// 		return
// 	}
//
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(analysis)
// }
//
// analyzeServiceImpact analyzes what depends on a Service
// func (ws *WebServer) analyzeServiceImpact(name, namespace string) (*ImpactAnalysis, error) {
// 	service, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        name,
// 		ResourceType:    "Service",
// 		Namespace:       namespace,
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find Ingresses that route to this service
// 	ingresses, _ := ws.app.clientset.NetworkingV1().Ingresses(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, ing := range ingresses.Items {
// 		for _, rule := range ing.Spec.Rules {
// 			if rule.HTTP != nil {
// 				for _, path := range rule.HTTP.Paths {
// 					if path.Backend.Service != nil && path.Backend.Service.Name == name {
// 						node := &ImpactNode{
// 							Type:      "Ingress",
// 							Name:      ing.Name,
// 							Namespace: ing.Namespace,
// 							Severity:  "critical",
// 							Impact:    fmt.Sprintf("Ingress %s routes traffic to this service via path %s", ing.Name, path.Path),
// 						}
// 						analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 						analysis.CriticalCount++
// 					}
// 				}
// 			}
// 		}
// 	}
//
// 	// Find Pods that this service selects (would lose endpoint)
// 	if len(service.Spec.Selector) > 0 {
// 		pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
// 			LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: service.Spec.Selector}),
// 		})
// 		for _, pod := range pods.Items {
// 			node := &ImpactNode{
// 				Type:      "Pod",
// 				Name:      pod.Name,
// 				Namespace: pod.Namespace,
// 				Severity:  "medium",
// 				Impact:    "Pod will lose service endpoint and external access",
// 			}
// 			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 			analysis.MediumCount++
// 		}
// 	}
//
// 	// Calculate totals
// 	analysis.TotalImpacted = len(analysis.ImpactedNodes)
// 	analysis.Summary = fmt.Sprintf("Deleting Service '%s' will affect %d resource(s): %d critical, %d high, %d medium, %d low",
// 		name, analysis.TotalImpacted, analysis.CriticalCount, analysis.HighCount, analysis.MediumCount, analysis.LowCount)
//
// 	if analysis.CriticalCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Update Ingress configurations before deleting this Service")
// 	}
// 	if analysis.MediumCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Ensure pods have alternative network access or are not required")
// 	}
//
// 	return analysis, nil
// }
//
// analyzeConfigMapImpact analyzes what depends on a ConfigMap
// func (ws *WebServer) analyzeConfigMapImpact(name, namespace string) (*ImpactAnalysis, error) {
// 	_, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        name,
// 		ResourceType:    "ConfigMap",
// 		Namespace:       namespace,
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find Deployments that use this ConfigMap
// 	deployments, _ := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, dep := range deployments.Items {
// 		usesConfigMap := false
// 		var usageType string
//
// 		// Check volume mounts
// 		for _, vol := range dep.Spec.Template.Spec.Volumes {
// 			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
// 				usesConfigMap = true
// 				usageType = "volume mount"
// 				break
// 			}
// 		}
//
// 		// Check env references
// 		if !usesConfigMap {
// 			for _, container := range dep.Spec.Template.Spec.Containers {
// 				for _, env := range container.EnvFrom {
// 					if env.ConfigMapRef != nil && env.ConfigMapRef.Name == name {
// 						usesConfigMap = true
// 						usageType = "environment variables"
// 						break
// 					}
// 				}
// 				if usesConfigMap {
// 					break
// 				}
// 			}
// 		}
//
// 		if usesConfigMap {
// 			node := &ImpactNode{
// 				Type:      "Deployment",
// 				Name:      dep.Name,
// 				Namespace: dep.Namespace,
// 				Severity:  "critical",
// 				Impact:    fmt.Sprintf("Deployment uses this ConfigMap as %s - pods may fail to start", usageType),
// 			}
// 			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 			analysis.CriticalCount++
// 		}
// 	}
//
// 	// Check StatefulSets
// 	statefulsets, _ := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, sts := range statefulsets.Items {
// 		for _, vol := range sts.Spec.Template.Spec.Volumes {
// 			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
// 				node := &ImpactNode{
// 					Type:      "StatefulSet",
// 					Name:      sts.Name,
// 					Namespace: sts.Namespace,
// 					Severity:  "critical",
// 					Impact:    "StatefulSet uses this ConfigMap - pods may fail to start",
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				analysis.CriticalCount++
// 				break
// 			}
// 		}
// 	}
//
// 	// Check DaemonSets
// 	daemonsets, _ := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, ds := range daemonsets.Items {
// 		for _, vol := range ds.Spec.Template.Spec.Volumes {
// 			if vol.ConfigMap != nil && vol.ConfigMap.Name == name {
// 				node := &ImpactNode{
// 					Type:      "DaemonSet",
// 					Name:      ds.Name,
// 					Namespace: ds.Namespace,
// 					Severity:  "critical",
// 					Impact:    "DaemonSet uses this ConfigMap - pods may fail to start on all nodes",
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				analysis.CriticalCount++
// 				break
// 			}
// 		}
// 	}
//
// 	analysis.TotalImpacted = len(analysis.ImpactedNodes)
// 	analysis.Summary = fmt.Sprintf("Deleting ConfigMap '%s' will affect %d workload(s)", name, analysis.TotalImpacted)
//
// 	if analysis.CriticalCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Update workloads to remove ConfigMap references before deletion")
// 		analysis.Recommendations = append(analysis.Recommendations, "Consider creating a replacement ConfigMap with updated values first")
// 	}
//
// 	return analysis, nil
// }
//
// analyzeSecretImpact analyzes what depends on a Secret
// func (ws *WebServer) analyzeSecretImpact(name, namespace string) (*ImpactAnalysis, error) {
// 	_, err := ws.app.clientset.CoreV1().Secrets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        name,
// 		ResourceType:    "Secret",
// 		Namespace:       namespace,
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find Deployments that use this Secret
// 	deployments, _ := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, dep := range deployments.Items {
// 		usesSecret := false
// 		var usageType string
//
// 		for _, vol := range dep.Spec.Template.Spec.Volumes {
// 			if vol.Secret != nil && vol.Secret.SecretName == name {
// 				usesSecret = true
// 				usageType = "volume mount"
// 				break
// 			}
// 		}
//
// 		if !usesSecret {
// 			for _, container := range dep.Spec.Template.Spec.Containers {
// 				for _, env := range container.EnvFrom {
// 					if env.SecretRef != nil && env.SecretRef.Name == name {
// 						usesSecret = true
// 						usageType = "environment variables"
// 						break
// 					}
// 				}
// 				// Check individual env vars
// 				for _, env := range container.Env {
// 					if env.ValueFrom != nil && env.ValueFrom.SecretKeyRef != nil && env.ValueFrom.SecretKeyRef.Name == name {
// 						usesSecret = true
// 						usageType = "environment variable"
// 						break
// 					}
// 				}
// 				if usesSecret {
// 					break
// 				}
// 			}
// 		}
//
// 		// Check imagePullSecrets
// 		if !usesSecret {
// 			for _, ips := range dep.Spec.Template.Spec.ImagePullSecrets {
// 				if ips.Name == name {
// 					usesSecret = true
// 					usageType = "image pull secret"
// 					break
// 				}
// 			}
// 		}
//
// 		if usesSecret {
// 			node := &ImpactNode{
// 				Type:      "Deployment",
// 				Name:      dep.Name,
// 				Namespace: dep.Namespace,
// 				Severity:  "critical",
// 				Impact:    fmt.Sprintf("Deployment uses this Secret as %s - pods may fail to start or authenticate", usageType),
// 			}
// 			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 			analysis.CriticalCount++
// 		}
// 	}
//
// 	// Find ServiceAccounts that reference this secret
// 	serviceAccounts, _ := ws.app.clientset.CoreV1().ServiceAccounts(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, sa := range serviceAccounts.Items {
// 		for _, secretRef := range sa.Secrets {
// 			if secretRef.Name == name {
// 				node := &ImpactNode{
// 					Type:      "ServiceAccount",
// 					Name:      sa.Name,
// 					Namespace: sa.Namespace,
// 					Severity:  "high",
// 					Impact:    "ServiceAccount references this Secret - authentication may fail",
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				analysis.HighCount++
// 				break
// 			}
// 		}
// 		for _, ips := range sa.ImagePullSecrets {
// 			if ips.Name == name {
// 				node := &ImpactNode{
// 					Type:      "ServiceAccount",
// 					Name:      sa.Name,
// 					Namespace: sa.Namespace,
// 					Severity:  "high",
// 					Impact:    "ServiceAccount uses this Secret for image pulls - containers may fail to pull images",
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				analysis.HighCount++
// 				break
// 			}
// 		}
// 	}
//
// 	analysis.TotalImpacted = len(analysis.ImpactedNodes)
// 	analysis.Summary = fmt.Sprintf("Deleting Secret '%s' will affect %d resource(s)", name, analysis.TotalImpacted)
//
// 	if analysis.CriticalCount > 0 || analysis.HighCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Ensure no workloads require this Secret before deletion")
// 		analysis.Recommendations = append(analysis.Recommendations, "Consider rotating Secret with a new one before deleting the old")
// 	}
//
// 	return analysis, nil
// }
//
// analyzeDeploymentImpact analyzes what depends on a Deployment
// func (ws *WebServer) analyzeDeploymentImpact(name, namespace string) (*ImpactAnalysis, error) {
// 	deployment, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        name,
// 		ResourceType:    "Deployment",
// 		Namespace:       namespace,
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find Services that select this Deployment's pods
// 	services, _ := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, svc := range services.Items {
// 		if len(svc.Spec.Selector) > 0 {
// 			if matchesSelector(svc.Spec.Selector, deployment.Spec.Template.Labels) {
// 				node := &ImpactNode{
// 					Type:      "Service",
// 					Name:      svc.Name,
// 					Namespace: svc.Namespace,
// 					Severity:  "critical",
// 					Impact:    "Service selects this Deployment's pods - endpoints will be removed",
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				analysis.CriticalCount++
// 			}
// 		}
// 	}
//
// 	// Find HPA targeting this deployment
// 	hpas, _ := ws.app.clientset.AutoscalingV1().HorizontalPodAutoscalers(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, hpa := range hpas.Items {
// 		if hpa.Spec.ScaleTargetRef.Kind == "Deployment" && hpa.Spec.ScaleTargetRef.Name == name {
// 			node := &ImpactNode{
// 				Type:      "HorizontalPodAutoscaler",
// 				Name:      hpa.Name,
// 				Namespace: hpa.Namespace,
// 				Severity:  "medium",
// 				Impact:    "HPA targets this Deployment - autoscaling will be orphaned",
// 			}
// 			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 			analysis.MediumCount++
// 		}
// 	}
//
// 	// Add running pods info
// 	pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
// 		LabelSelector: metav1.FormatLabelSelector(deployment.Spec.Selector),
// 	})
// 	runningPods := 0
// 	for _, pod := range pods.Items {
// 		if pod.Status.Phase == v1.PodRunning {
// 			runningPods++
// 		}
// 	}
// 	if runningPods > 0 {
// 		node := &ImpactNode{
// 			Type:       "Pod",
// 			Name:       fmt.Sprintf("%d running pods", runningPods),
// 			Namespace:  namespace,
// 			Severity:   "high",
// 			Impact:     "All running pods will be terminated",
// 			Dependents: runningPods,
// 		}
// 		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 		analysis.HighCount++
// 	}
//
// 	analysis.TotalImpacted = len(analysis.ImpactedNodes)
// 	analysis.Summary = fmt.Sprintf("Deleting Deployment '%s' will affect %d resource(s) including %d running pods",
// 		name, analysis.TotalImpacted, runningPods)
//
// 	if analysis.CriticalCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Update Service selectors before deleting this Deployment")
// 	}
// 	if runningPods > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Consider scaling down to 0 replicas first to gracefully terminate pods")
// 	}
//
// 	return analysis, nil
// }
//
// analyzePodImpact analyzes what depends on a Pod
// func (ws *WebServer) analyzePodImpact(name, namespace string) (*ImpactAnalysis, error) {
// 	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        name,
// 		ResourceType:    "Pod",
// 		Namespace:       namespace,
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find Services that select this Pod
// 	services, _ := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	for _, svc := range services.Items {
// 		if len(svc.Spec.Selector) > 0 {
// 			if matchesSelector(svc.Spec.Selector, pod.Labels) {
// 				// Check if this is the only pod for this service
// 				pods, _ := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{
// 					LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{MatchLabels: svc.Spec.Selector}),
// 				})
// 				severity := "low"
// 				impact := "Pod is one of multiple endpoints for this Service"
// 				if len(pods.Items) <= 1 {
// 					severity = "critical"
// 					impact = "This is the only pod for this Service - service will have no endpoints"
// 				}
//
// 				node := &ImpactNode{
// 					Type:      "Service",
// 					Name:      svc.Name,
// 					Namespace: svc.Namespace,
// 					Severity:  severity,
// 					Impact:    impact,
// 				}
// 				analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 				if severity == "critical" {
// 					analysis.CriticalCount++
// 				} else {
// 					analysis.LowCount++
// 				}
// 			}
// 		}
// 	}
//
// 	// Check if pod is managed by a controller
// 	for _, ownerRef := range pod.OwnerReferences {
// 		if ownerRef.Controller != nil && *ownerRef.Controller {
// 			node := &ImpactNode{
// 				Type:      ownerRef.Kind,
// 				Name:      ownerRef.Name,
// 				Namespace: namespace,
// 				Severity:  "low",
// 				Impact:    fmt.Sprintf("Pod will be recreated by %s controller", ownerRef.Kind),
// 			}
// 			analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 			analysis.LowCount++
// 		}
// 	}
//
// 	analysis.TotalImpacted = len(analysis.ImpactedNodes)
// 	analysis.Summary = fmt.Sprintf("Deleting Pod '%s' will affect %d resource(s)", name, analysis.TotalImpacted)
//
// 	if analysis.CriticalCount > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Ensure other pods are available for the Service before deleting")
// 	}
// 	if len(pod.OwnerReferences) == 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "This is an orphan pod - it will not be recreated after deletion")
// 	}
//
// 	return analysis, nil
// }
//
// analyzeNodeImpact analyzes what would be affected by a Node being unavailable
// func (ws *WebServer) analyzeNodeImpact(nodeName string) (*ImpactAnalysis, error) {
// 	_, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, nodeName, metav1.GetOptions{})
// 	if err != nil {
// 		return nil, err
// 	}
//
// 	analysis := &ImpactAnalysis{
// 		Resource:        nodeName,
// 		ResourceType:    "Node",
// 		Namespace:       "cluster-wide",
// 		ImpactedNodes:   []*ImpactNode{},
// 		Recommendations: []string{},
// 	}
//
// 	// Find all pods running on this node
// 	pods, _ := ws.app.clientset.CoreV1().Pods("").List(ws.app.ctx, metav1.ListOptions{
// 		FieldSelector: fmt.Sprintf("spec.nodeName=%s", nodeName),
// 	})
//
// 	deploymentPods := make(map[string]int)
// 	statefulsetPods := make(map[string]int)
// 	daemonsetPods := make(map[string]int)
// 	standalonePods := []string{}
//
// 	for _, pod := range pods.Items {
// 		hasController := false
// 		for _, ownerRef := range pod.OwnerReferences {
// 			if ownerRef.Controller != nil && *ownerRef.Controller {
// 				hasController = true
// 				switch ownerRef.Kind {
// 				case "ReplicaSet":
// 					// Find the deployment
// 					rs, err := ws.app.clientset.AppsV1().ReplicaSets(pod.Namespace).Get(ws.app.ctx, ownerRef.Name, metav1.GetOptions{})
// 					if err == nil {
// 						for _, rsOwner := range rs.OwnerReferences {
// 							if rsOwner.Kind == "Deployment" {
// 								key := fmt.Sprintf("%s/%s", pod.Namespace, rsOwner.Name)
// 								deploymentPods[key]++
// 							}
// 						}
// 					}
// 				case "StatefulSet":
// 					key := fmt.Sprintf("%s/%s", pod.Namespace, ownerRef.Name)
// 					statefulsetPods[key]++
// 				case "DaemonSet":
// 					key := fmt.Sprintf("%s/%s", pod.Namespace, ownerRef.Name)
// 					daemonsetPods[key]++
// 				}
// 				break
// 			}
// 		}
// 		if !hasController {
// 			standalonePods = append(standalonePods, fmt.Sprintf("%s/%s", pod.Namespace, pod.Name))
// 		}
// 	}
//
// 	// Add deployment impacts
// 	for key, count := range deploymentPods {
// 		parts := strings.Split(key, "/")
// 		node := &ImpactNode{
// 			Type:       "Deployment",
// 			Name:       parts[1],
// 			Namespace:  parts[0],
// 			Severity:   "medium",
// 			Impact:     fmt.Sprintf("%d pod(s) will be rescheduled to other nodes", count),
// 			Dependents: count,
// 		}
// 		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 		analysis.MediumCount++
// 	}
//
// 	// Add statefulset impacts
// 	for key, count := range statefulsetPods {
// 		parts := strings.Split(key, "/")
// 		node := &ImpactNode{
// 			Type:       "StatefulSet",
// 			Name:       parts[1],
// 			Namespace:  parts[0],
// 			Severity:   "high",
// 			Impact:     fmt.Sprintf("%d pod(s) will need rescheduling - may require manual intervention for PVs", count),
// 			Dependents: count,
// 		}
// 		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 		analysis.HighCount++
// 	}
//
// 	// Add daemonset impacts
// 	for key := range daemonsetPods {
// 		parts := strings.Split(key, "/")
// 		node := &ImpactNode{
// 			Type:      "DaemonSet",
// 			Name:      parts[1],
// 			Namespace: parts[0],
// 			Severity:  "low",
// 			Impact:    "DaemonSet pod will not run on this node while unavailable",
// 		}
// 		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 		analysis.LowCount++
// 	}
//
// 	// Add standalone pod impacts
// 	if len(standalonePods) > 0 {
// 		node := &ImpactNode{
// 			Type:       "Pod (standalone)",
// 			Name:       fmt.Sprintf("%d pods", len(standalonePods)),
// 			Namespace:  "various",
// 			Severity:   "critical",
// 			Impact:     "Standalone pods will be lost permanently - no controller to reschedule",
// 			Dependents: len(standalonePods),
// 		}
// 		analysis.ImpactedNodes = append(analysis.ImpactedNodes, node)
// 		analysis.CriticalCount++
// 	}
//
// 	analysis.TotalImpacted = len(pods.Items)
// 	analysis.Summary = fmt.Sprintf("Node '%s' hosts %d pod(s) from %d workload(s)",
// 		nodeName, len(pods.Items), len(analysis.ImpactedNodes))
//
// 	if len(standalonePods) > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Migrate standalone pods to Deployments before draining node")
// 	}
// 	if len(statefulsetPods) > 0 {
// 		analysis.Recommendations = append(analysis.Recommendations, "Verify PersistentVolumes are accessible from other nodes")
// 	}
// 	analysis.Recommendations = append(analysis.Recommendations, "Use 'kubectl drain' for graceful workload migration")
//
// 	return analysis, nil
// }

// getClusterMetrics collects cluster metrics
func (ws *WebServer) getClusterMetrics() map[string]interface{} {
	metrics := map[string]interface{}{
		"timestamp":   time.Now().Unix(),
		"cpu":         45.0 + float64(time.Now().Unix()%20),
		"memory":      62.0 + float64(time.Now().Unix()%15),
		"pods":        12,
		"nodes":       5,
		"clusterName": ws.app.cluster,
		"namespace":   ws.app.namespace,
	}

	// Wait for clientset to be initialized
	if ws.app.clientset == nil {
		return metrics
	}

	// Get actual node count
	nodes, err := ws.app.clientset.CoreV1().Nodes().List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		metrics["nodes"] = len(nodes.Items)
	}

	// Get actual pod count
	pods, err := ws.app.clientset.CoreV1().Pods(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		metrics["pods"] = len(pods.Items)
	}

	return metrics
}

// buildTopologyData builds topology data for D3.js visualization
func (ws *WebServer) buildTopologyData(namespace string) map[string]interface{} {
	nodes := []map[string]interface{}{}
	links := []map[string]interface{}{}

	// Use empty string for all namespaces
	ns := namespace
	if ns == "" {
		ns = "" // Empty string lists from all namespaces in Kubernetes API
	}

	// Get deployments
	deployments, err := ws.app.clientset.AppsV1().Deployments(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, dep := range deployments.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("deployment-%s-%s", dep.Namespace, dep.Name),
				"name":      dep.Name,
				"type":      "deployment",
				"namespace": dep.Namespace,
				"group":     1,
			})
		}
	}

	// Get statefulsets
	statefulsets, err := ws.app.clientset.AppsV1().StatefulSets(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, sts := range statefulsets.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("statefulset-%s-%s", sts.Namespace, sts.Name),
				"name":      sts.Name,
				"type":      "statefulset",
				"namespace": sts.Namespace,
				"group":     1,
			})
		}
	}

	// Get daemonsets
	daemonsets, err := ws.app.clientset.AppsV1().DaemonSets(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, ds := range daemonsets.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("daemonset-%s-%s", ds.Namespace, ds.Name),
				"name":      ds.Name,
				"type":      "daemonset",
				"namespace": ds.Namespace,
				"group":     1,
			})
		}
	}

	// Get services
	services, err := ws.app.clientset.CoreV1().Services(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, svc := range services.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("service-%s-%s", svc.Namespace, svc.Name),
				"name":      svc.Name,
				"type":      "service",
				"namespace": svc.Namespace,
				"group":     2,
			})

			// Link services to deployments
			if deployments != nil {
				for _, dep := range deployments.Items {
					if dep.Namespace == svc.Namespace && matchesSelector(svc.Spec.Selector, dep.Spec.Template.Labels) {
						links = append(links, map[string]interface{}{
							"source": fmt.Sprintf("service-%s-%s", svc.Namespace, svc.Name),
							"target": fmt.Sprintf("deployment-%s-%s", dep.Namespace, dep.Name),
							"value":  1,
						})
					}
				}
			}

			// Link services to statefulsets
			if statefulsets != nil {
				for _, sts := range statefulsets.Items {
					if sts.Namespace == svc.Namespace && matchesSelector(svc.Spec.Selector, sts.Spec.Template.Labels) {
						links = append(links, map[string]interface{}{
							"source": fmt.Sprintf("service-%s-%s", svc.Namespace, svc.Name),
							"target": fmt.Sprintf("statefulset-%s-%s", sts.Namespace, sts.Name),
							"value":  1,
						})
					}
				}
			}

			// Link services to daemonsets
			if daemonsets != nil {
				for _, ds := range daemonsets.Items {
					if ds.Namespace == svc.Namespace && matchesSelector(svc.Spec.Selector, ds.Spec.Template.Labels) {
						links = append(links, map[string]interface{}{
							"source": fmt.Sprintf("service-%s-%s", svc.Namespace, svc.Name),
							"target": fmt.Sprintf("daemonset-%s-%s", ds.Namespace, ds.Name),
							"value":  1,
						})
					}
				}
			}
		}
	}

	// Get ingresses
	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, ing := range ingresses.Items {
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("ingress-%s-%s", ing.Namespace, ing.Name),
				"name":      ing.Name,
				"type":      "ingress",
				"namespace": ing.Namespace,
				"group":     3,
			})

			// Link ingresses to services
			for _, rule := range ing.Spec.Rules {
				if rule.HTTP != nil {
					for _, path := range rule.HTTP.Paths {
						svcName := path.Backend.Service.Name
						links = append(links, map[string]interface{}{
							"source": fmt.Sprintf("ingress-%s-%s", ing.Namespace, ing.Name),
							"target": fmt.Sprintf("service-%s-%s", ing.Namespace, svcName),
							"value":  1,
						})
					}
				}
			}
		}
	}

	// Get configmaps (limit to avoid clutter)
	configmaps, err := ws.app.clientset.CoreV1().ConfigMaps(ns).List(ws.app.ctx, metav1.ListOptions{})
	if err == nil {
		for _, cm := range configmaps.Items {
			// Skip kube-system configmaps to reduce clutter
			if cm.Namespace == "kube-system" {
				continue
			}
			nodes = append(nodes, map[string]interface{}{
				"id":        fmt.Sprintf("configmap-%s-%s", cm.Namespace, cm.Name),
				"name":      cm.Name,
				"type":      "configmap",
				"namespace": cm.Namespace,
				"group":     4,
			})
		}
	}

	return map[string]interface{}{
		"nodes": nodes,
		"links": links,
	}
}

// matchesSelector checks if labels match selector
// func matchesSelector(selector, labels map[string]string) bool {
// 	if len(selector) == 0 {
// 		return false
// 	}
// 	for k, v := range selector {
// 		if labels[k] != v {
// 			return false
// 		}
// 	}
// 	return true
// }

// handleConfigMaps returns configmap list
// func (ws *WebServer) handleConfigMaps(w http.ResponseWriter, r *http.Request) {
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
// 	configmaps, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
//
// 	cmList := []map[string]interface{}{}
// 	for _, cm := range configmaps.Items {
// 		cmList = append(cmList, map[string]interface{}{
// 			"name":      cm.Name,
// 			"data":      len(cm.Data),
// 			"age":       formatAge(time.Since(cm.CreationTimestamp.Time)),
// 			"namespace": cm.Namespace,
// 		})
// 	}
//
// 	json.NewEncoder(w).Encode(cmList)
// }

// // handleSecrets returns secrets list
// func (ws *WebServer) handleSecrets(w http.ResponseWriter, r *http.Request) {
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
// 	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
//
// 	secretList := []map[string]interface{}{}
// 	for _, secret := range secrets.Items {
// 		secretList = append(secretList, map[string]interface{}{
// 			"name":      secret.Name,
// 			"type":      string(secret.Type),
// 			"data":      len(secret.Data),
// 			"age":       formatAge(time.Since(secret.CreationTimestamp.Time)),
// 			"namespace": secret.Namespace,
// 		})
// 	}
//
// 	json.NewEncoder(w).Encode(secretList)
// }

// handleResourceMap returns enhanced topology data

// handlePodDetails returns detailed information about a specific pod
// func (ws *WebServer) handlePodDetails(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	name := r.URL.Query().Get("name")
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Pod name is required",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Get pod
// 	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	// Build containers info
// 	containers := []map[string]interface{}{}
// 	for _, c := range pod.Spec.Containers {
// 		containerInfo := map[string]interface{}{
// 			"name":  c.Name,
// 			"image": c.Image,
// 		}
//
// 		// Find container status
// 		for _, cs := range pod.Status.ContainerStatuses {
// 			if cs.Name == c.Name {
// 				containerInfo["ready"] = cs.Ready
// 				containerInfo["restartCount"] = cs.RestartCount
// 				containerInfo["containerID"] = cs.ContainerID
//
// 				// State information
// 				if cs.State.Running != nil {
// 					containerInfo["state"] = "Running"
// 					containerInfo["startedAt"] = cs.State.Running.StartedAt.String()
// 				} else if cs.State.Waiting != nil {
// 					containerInfo["state"] = "Waiting"
// 					containerInfo["reason"] = cs.State.Waiting.Reason
// 					containerInfo["message"] = cs.State.Waiting.Message
// 				} else if cs.State.Terminated != nil {
// 					containerInfo["state"] = "Terminated"
// 					containerInfo["reason"] = cs.State.Terminated.Reason
// 					containerInfo["exitCode"] = cs.State.Terminated.ExitCode
// 				}
// 				break
// 			}
// 		}
//
// 		containers = append(containers, containerInfo)
// 	}
//
// 	// Build volumes info
// 	volumes := []map[string]interface{}{}
// 	for _, v := range pod.Spec.Volumes {
// 		volumeInfo := map[string]interface{}{
// 			"name": v.Name,
// 		}
// 		if v.ConfigMap != nil {
// 			volumeInfo["type"] = "ConfigMap"
// 			volumeInfo["source"] = v.ConfigMap.Name
// 		} else if v.Secret != nil {
// 			volumeInfo["type"] = "Secret"
// 			volumeInfo["source"] = v.Secret.SecretName
// 		} else if v.PersistentVolumeClaim != nil {
// 			volumeInfo["type"] = "PVC"
// 			volumeInfo["source"] = v.PersistentVolumeClaim.ClaimName
// 		} else if v.EmptyDir != nil {
// 			volumeInfo["type"] = "EmptyDir"
// 		} else {
// 			volumeInfo["type"] = "Other"
// 		}
// 		volumes = append(volumes, volumeInfo)
// 	}
//
// 	// Build conditions
// 	conditions := []map[string]interface{}{}
// 	for _, c := range pod.Status.Conditions {
// 		conditions = append(conditions, map[string]interface{}{
// 			"type":    string(c.Type),
// 			"status":  string(c.Status),
// 			"reason":  c.Reason,
// 			"message": c.Message,
// 		})
// 	}
//
// 	// Get events
// 	events, _ := ws.app.clientset.CoreV1().Events(ws.app.namespace).List(ws.app.ctx, metav1.ListOptions{
// 		FieldSelector: fmt.Sprintf("involvedObject.name=%s", name),
// 	})
//
// 	eventList := []map[string]interface{}{}
// 	for _, e := range events.Items {
// 		eventList = append(eventList, map[string]interface{}{
// 			"type":    e.Type,
// 			"reason":  e.Reason,
// 			"message": e.Message,
// 			"count":   e.Count,
// 			"age":     formatAge(time.Since(e.LastTimestamp.Time)),
// 		})
// 	}
//
// 	// Generate YAML (using kubectl-style format)
// 	pod.ManagedFields = nil
// 	yamlData, _ := toKubectlYAML(pod, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Pod"})
//
// 	// Get real-time metrics if available
// 	var podMetrics map[string]interface{}
// 	if ws.app.metricsClient != nil {
// 		if metrics, err := ws.app.metricsClient.MetricsV1beta1().PodMetricses(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{}); err == nil {
// 			// Calculate total CPU and memory
// 			var totalCPU, totalMemory int64
// 			containerMetrics := []map[string]interface{}{}
//
// 			for _, cm := range metrics.Containers {
// 				cpuMillis := cm.Usage.Cpu().MilliValue()
// 				memoryBytes := cm.Usage.Memory().Value()
// 				totalCPU += cpuMillis
// 				totalMemory += memoryBytes
//
// 				containerMetrics = append(containerMetrics, map[string]interface{}{
// 					"name":        cm.Name,
// 					"cpuMillis":   cpuMillis,
// 					"cpu":         fmt.Sprintf("%dm", cpuMillis),
// 					"memoryBytes": memoryBytes,
// 					"memory":      fmt.Sprintf("%.2fMi", float64(memoryBytes)/(1024*1024)),
// 				})
// 			}
//
// 			podMetrics = map[string]interface{}{
// 				"totalCPU":         fmt.Sprintf("%dm", totalCPU),
// 				"totalCPUMillis":   totalCPU,
// 				"totalMemory":      fmt.Sprintf("%.2fMi", float64(totalMemory)/(1024*1024)),
// 				"totalMemoryBytes": totalMemory,
// 				"containers":       containerMetrics,
// 				"timestamp":        metrics.Timestamp.String(),
// 			}
// 		}
// 	}
//
// 	// Build response
// 	details := map[string]interface{}{
// 		"success":    true,
// 		"name":       pod.Name,
// 		"namespace":  pod.Namespace,
// 		"status":     string(pod.Status.Phase),
// 		"ip":         pod.Status.PodIP,
// 		"node":       pod.Spec.NodeName,
// 		"qos":        string(pod.Status.QOSClass),
// 		"created":    pod.CreationTimestamp.String(),
// 		"age":        formatAge(time.Since(pod.CreationTimestamp.Time)),
// 		"labels":     pod.Labels,
// 		"containers": containers,
// 		"volumes":    volumes,
// 		"conditions": conditions,
// 		"events":     eventList,
// 		"yaml":       string(yamlData),
// 		"metrics":    podMetrics,
// 	}
//
// 	json.NewEncoder(w).Encode(details)
// }

// handlePodExec handles pod exec - serves web terminal for GET, executes commands for POST
func (ws *WebServer) handlePodExec(w http.ResponseWriter, r *http.Request) {
	// For GET requests, serve the web terminal HTML page
	if r.Method == "GET" {
		name := r.URL.Query().Get("name")
		namespace := r.URL.Query().Get("namespace")
		container := r.URL.Query().Get("container")
		if namespace == "" {
			namespace = ws.app.namespace
		}

		// Serve web terminal HTML
		terminalHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal - %s</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0d1117;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #161b22;
            padding: 12px 16px;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header h1 {
            color: #58a6ff;
            font-size: 14px;
            font-weight: 600;
        }
        .header .pod-info {
            color: #8b949e;
            font-size: 12px;
        }
        .header .status {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
        }
        .header .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%%;
            background: #f85149;
        }
        .header .status-dot.connected {
            background: #3fb950;
        }
        #terminal {
            flex: 1;
            padding: 8px;
        }
        .xterm { height: 100%%; }
    </style>
</head>
<body>
    <div class="header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
            <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <h1>Terminal</h1>
        <span class="pod-info">%s/%s</span>
        <div class="status">
            <span class="status-dot" id="statusDot"></span>
            <span id="statusText">Connecting...</span>
        </div>
    </div>
    <div id="terminal"></div>

    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.min.js"></script>
    <script>
        const podName = %q;
        const namespace = %q;
        const container = %q;

        const term = new Terminal({
            theme: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                cursor: '#58a6ff',
                cursorAccent: '#0d1117',
                selection: 'rgba(88, 166, 255, 0.3)',
                black: '#484f58',
                red: '#ff7b72',
                green: '#3fb950',
                yellow: '#d29922',
                blue: '#58a6ff',
                magenta: '#bc8cff',
                cyan: '#39c5cf',
                white: '#b1bac4',
            },
            fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            cursorBlink: true,
            cursorStyle: 'bar',
        });

        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(document.getElementById('terminal'));
        fitAddon.fit();

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        // Connect via WebSocket
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(wsProtocol + '//' + location.host + '/api/pod/terminal?name=' + podName + '&namespace=' + namespace + '&container=' + container);

        ws.onopen = () => {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
            term.write('\r\n\x1b[32mConnected to ' + podName + '\x1b[0m\r\n\r\n');

            // Send initial resize
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
            term.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
        };

        ws.onerror = (error) => {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Error';
            term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        };

        // Send input to server
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data: data }));
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        });
    </script>
</body>
</html>`, name, namespace, name, name, namespace, container)
		w.Header().Set("Content-Type", "text/html")
		w.Write([]byte(terminalHTML))
		return
	}

	// POST: Execute a single command and return output
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Pod       string `json:"pod"`
		Container string `json:"container"`
		Command   string `json:"command"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid request: " + err.Error(),
		})
		return
	}

	// Parse command into shell arguments
	cmdArgs := []string{"/bin/sh", "-c", req.Command}

	// Create exec request
	execReq := ws.app.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(req.Pod).
		Namespace(ws.app.namespace).
		SubResource("exec").
		VersionedParams(&v1.PodExecOptions{
			Container: req.Container,
			Command:   cmdArgs,
			Stdin:     false,
			Stdout:    true,
			Stderr:    true,
			TTY:       false,
		}, scheme.ParameterCodec)

	// Execute command
	exec, err := remotecommand.NewSPDYExecutor(ws.app.config, "POST", execReq.URL())
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to create executor: " + err.Error(),
		})
		return
	}

	var stdout, stderr bytes.Buffer
	err = exec.StreamWithContext(ws.app.ctx, remotecommand.StreamOptions{
		Stdout: &stdout,
		Stderr: &stderr,
	})

	output := strings.TrimSpace(stdout.String())
	if stderr.Len() > 0 {
		output += "\n" + strings.TrimSpace(stderr.String())
	}

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
			"output":  output,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"output":  output,
	})
}

// handlePodTerminalWS handles WebSocket connections for interactive terminal
func (ws *WebServer) handlePodTerminalWS(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	container := r.URL.Query().Get("container")

	if name == "" {
		http.Error(w, "Pod name is required", http.StatusBadRequest)
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Upgrade to WebSocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Create exec request for interactive shell
	execReq := ws.app.clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(name).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&v1.PodExecOptions{
			Container: container,
			Command:   []string{"/bin/sh"},
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(ws.app.config, "POST", execReq.URL())
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\nFailed to create executor: %v\r\n", err)))
		return
	}

	// Create pipes for stdin/stdout
	stdinReader, stdinWriter := io.Pipe()
	stdoutReader, stdoutWriter := io.Pipe()

	// Terminal size handler
	termSize := &TerminalSize{width: 80, height: 24}

	// Start the exec stream in a goroutine
	go func() {
		err := exec.StreamWithContext(ws.app.ctx, remotecommand.StreamOptions{
			Stdin:             stdinReader,
			Stdout:            stdoutWriter,
			Stderr:            stdoutWriter,
			Tty:               true,
			TerminalSizeQueue: termSize,
		})
		if err != nil {
			stdoutWriter.CloseWithError(err)
		} else {
			stdoutWriter.Close()
		}
	}()

	// Read from stdout and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := stdoutReader.Read(buf)
			if err != nil {
				// Shell exited, close the WebSocket connection
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[33mShell exited\x1b[0m\r\n"))
				conn.Close()
				return
			}
			if n > 0 {
				conn.WriteMessage(websocket.TextMessage, buf[:n])
			}
		}
	}()

	// Read from WebSocket and write to stdin
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Parse message
		var msg struct {
			Type string `json:"type"`
			Data string `json:"data"`
			Cols uint16 `json:"cols"`
			Rows uint16 `json:"rows"`
		}
		if err := json.Unmarshal(message, &msg); err != nil {
			// Treat as raw input
			stdinWriter.Write(message)
			continue
		}

		switch msg.Type {
		case "input":
			stdinWriter.Write([]byte(msg.Data))
		case "resize":
			termSize.SetSize(msg.Cols, msg.Rows)
		}
	}

	stdinWriter.Close()
}

// handleLocalTerminalPage serves the local terminal HTML page (similar to pod terminal)
func (ws *WebServer) handleLocalTerminalPage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	terminalHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Terminal</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0d1117;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #161b22;
            padding: 12px 16px;
            border-bottom: 1px solid #30363d;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header h1 {
            color: #58a6ff;
            font-size: 14px;
            font-weight: 600;
        }
        .header .status {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
        }
        .header .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%%;
            background: #f85149;
        }
        .header .status-dot.connected {
            background: #3fb950;
        }
        #terminal {
            flex: 1;
            padding: 8px;
        }
        .xterm { height: 100%%; }
    </style>
</head>
<body>
    <div class="header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2">
            <path d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <h1>Local Terminal</h1>
        <div class="status">
            <span class="status-dot" id="statusDot"></span>
            <span id="statusText">Connecting...</span>
        </div>
    </div>
    <div id="terminal"></div>

    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.min.js"></script>
    <script>
        const term = new Terminal({
            theme: {
                background: '#0d1117',
                foreground: '#c9d1d9',
                cursor: '#58a6ff',
                cursorAccent: '#0d1117',
                selection: 'rgba(88, 166, 255, 0.3)',
                black: '#484f58',
                red: '#ff7b72',
                green: '#3fb950',
                yellow: '#d29922',
                blue: '#58a6ff',
                magenta: '#bc8cff',
                cyan: '#39c5cf',
                white: '#b1bac4',
            },
            fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            cursorBlink: true,
            cursorStyle: 'bar',
        });

        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(webLinksAddon);
        term.open(document.getElementById('terminal'));
        fitAddon.fit();

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        // Connect via WebSocket
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(wsProtocol + '//' + location.host + '/api/local/terminal');

        ws.onopen = () => {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
            term.write('\r\n\x1b[32mConnected to local terminal\x1b[0m\r\n\r\n');

            // Send initial resize
            ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
            term.write(event.data);
        };

        ws.onclose = () => {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
            term.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');
        };

        ws.onerror = (error) => {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Error';
            term.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        };

        // Send input to server
        term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data: data }));
            }
        });

        // Handle resize
        window.addEventListener('resize', () => {
            fitAddon.fit();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
        });
    </script>
</body>
</html>`)
	w.Header().Set("Content-Type", "text/html")
	w.Write([]byte(terminalHTML))
}

// getAvailableWindowsShells detects all available shells on Windows and returns them in priority order
func getAvailableWindowsShells() []struct {
	name     string
	display  string
	args     []string
	path     string
	priority int
} {
	var shells []struct {
		name     string
		display  string
		args     []string
		path     string
		priority int
	}

	// Check for shells in priority order (lower priority number = higher priority)
	shellCandidates := []struct {
		name     string
		display  string
		args     []string
		priority int
	}{
		{"pwsh.exe", "PowerShell Core (pwsh)", []string{"-NoLogo", "-NoProfile", "-NoExit"}, 1},
		{"powershell.exe", "PowerShell", []string{"-NoLogo", "-NoProfile", "-NoExit"}, 2},
		{"wsl.exe", "WSL (Windows Subsystem for Linux)", []string{"-e", "bash", "-i"}, 3},
		{"bash.exe", "Git Bash", []string{"--login", "-i"}, 4},
		{"git-bash.exe", "Git Bash (alternative)", []string{"--login", "-i"}, 5},
		{"cmd.exe", "Command Prompt (cmd)", []string{"/K"}, 6},
	}

	for _, candidate := range shellCandidates {
		if path, err := exec.LookPath(candidate.name); err == nil {
			shells = append(shells, struct {
				name     string
				display  string
				args     []string
				path     string
				priority int
			}{
				name:     candidate.name,
				display:  candidate.display,
				args:     candidate.args,
				path:     path,
				priority: candidate.priority,
			})
		}
	}

	// Also check for Git Bash in common installation locations
	foundBash := false
	for _, shell := range shells {
		if shell.name == "bash.exe" || shell.name == "git-bash.exe" {
			foundBash = true
			break
		}
	}

	if !foundBash {
		gitBashPaths := []string{
			"C:\\Program Files\\Git\\bin\\bash.exe",
			"C:\\Program Files (x86)\\Git\\bin\\bash.exe",
			os.Getenv("LOCALAPPDATA") + "\\Programs\\Git\\bin\\bash.exe",
		}
		for _, gitPath := range gitBashPaths {
			if gitPath != "" {
				if _, err := os.Stat(gitPath); err == nil {
					shells = append(shells, struct {
						name     string
						display  string
						args     []string
						path     string
						priority int
					}{
						name:     "bash.exe",
						display:  "Git Bash",
						args:     []string{"--login", "-i"},
						path:     gitPath,
						priority: 4,
					})
					break
				}
			}
		}
	}

	// Sort by priority
	for i := 0; i < len(shells)-1; i++ {
		for j := i + 1; j < len(shells); j++ {
			if shells[i].priority > shells[j].priority {
				shells[i], shells[j] = shells[j], shells[i]
			}
		}
	}

	return shells
}

// handleGetAvailableShells returns list of available shells for the current platform
func (ws *WebServer) handleGetAvailableShells(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	type ShellInfo struct {
		Name        string `json:"name"`
		Display     string `json:"display"`
		Path        string `json:"path"`
		Priority    int    `json:"priority"`
		Recommended bool   `json:"recommended"`
		Description string `json:"description"`
	}

	var shells []ShellInfo

	if runtime.GOOS == "windows" {
		// Use new shell detection module
		availableShells := windowsterminal.GetAvailableShells()
		for _, shell := range availableShells {
			shells = append(shells, ShellInfo{
				Name:        shell.Path, // Use path as name for backwards compatibility
				Display:     shell.Name,
				Path:        shell.Path,
				Priority:    shell.Priority,
				Recommended: shell.Recommended,
				Description: shell.Description,
			})
		}
	} else {
		// Unix-like systems
		shellCandidates := []struct {
			name    string
			display string
		}{
			{"zsh", "Zsh"},
			{"bash", "Bash"},
			{"sh", "Sh"},
		}

		priority := 1
		for _, candidate := range shellCandidates {
			if path, err := exec.LookPath(candidate.name); err == nil {
				shells = append(shells, ShellInfo{
					Name:        candidate.name,
					Display:     candidate.display,
					Path:        path,
					Priority:    priority,
					Recommended: priority == 1, // First shell is recommended
					Description: fmt.Sprintf("%s shell", candidate.display),
				})
				priority++
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"shells": shells,
	})
}

// handleGetTerminalPreferences returns user's terminal preferences
func (ws *WebServer) handleGetTerminalPreferences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get preferred shell from query parameter or use default
	preferredShell := r.URL.Query().Get("shell")
	if preferredShell == "" {
		// Return default (first available recommended shell)
		if runtime.GOOS == "windows" {
			if shell := windowsterminal.GetPreferredShell(); shell != nil {
				preferredShell = shell.Path
			} else {
				preferredShell = "powershell.exe"
			}
		} else {
			preferredShell = "/bin/zsh"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"preferredShell": preferredShell,
	})
}

// handleCapabilities returns the current feature capabilities
func (ws *WebServer) handleCapabilities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(capabilities.GetCapabilities())
}

// handleTrainingJobs returns empty array for now (ML feature placeholder)
func (ws *WebServer) handleTrainingJobs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "100"
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": []interface{}{},
		"total": 0,
	})
}

// handleInferenceServices returns empty array for now (ML feature placeholder)
func (ws *WebServer) handleInferenceServices(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "100"
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": []interface{}{},
		"total": 0,
	})
}

// handleLocalTerminalWS handles WebSocket connections for local system terminal
func (ws *WebServer) handleLocalTerminalWS(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Check for Windows and use ConPTY-based approach
	if runtime.GOOS == "windows" {
		ws.handleWindowsConPTYTerminal(conn, r)
		return
	}

	// Unix-like systems: use PTY
	// Determine shell to use - prefer zsh on macOS, then bash, then sh
	shell := "/bin/zsh"
	shellArgs := []string{"-i"} // Interactive mode

	// Check if zsh exists, if not try bash
	if _, err := exec.LookPath("zsh"); err != nil {
		if _, err := exec.LookPath("bash"); err == nil {
			shell = "/bin/bash"
			shellArgs = []string{"-i"}
		} else {
			shell = "/bin/sh"
			shellArgs = []string{} // sh doesn't support -i the same way
		}
	}

	// Create local shell command
	cmd := exec.Command(shell, shellArgs...)
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)
	cmd.Dir = os.Getenv("HOME") // Start in home directory

	// Create PTY (pseudo-terminal) - this is crucial for interactive shells
	ptmx, err := pty.Start(cmd)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\nFailed to start PTY: %v\r\n", err)))
		return
	}
	defer func() {
		ptmx.Close()
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		cmd.Wait()
	}()

	// Set initial terminal size
	pty.Setsize(ptmx, &pty.Winsize{
		Rows: 24,
		Cols: 80,
	})

	// Use a channel to signal when the connection should close
	done := make(chan bool, 1)

	// Read from PTY and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			// Check if we should stop
			select {
			case <-done:
				return
			default:
			}

			n, err := ptmx.Read(buf)
			if err != nil {
				if err == io.EOF {
					// EOF doesn't necessarily mean the shell exited
					// Check if the process is still running
					if cmd.Process != nil {
						// Process might still be alive, wait a bit and check
						time.Sleep(100 * time.Millisecond)
						// Try to read again - if process is dead, cmd.Wait() will handle it
						continue
					}
					// Process is nil, shell definitely exited
					return
				}
				// Non-EOF error - log it but don't necessarily close
				select {
				case <-done:
					return
				default:
					// Try to write error, but don't block if connection is closed
					conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31m[PTY read error: %v]\x1b[0m\r\n", err)))
					// For non-EOF errors, we should probably close
					return
				}
			}
			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					// Connection closed by client
					done <- true
					return
				}
			}
		}
	}()

	// Wait for command to finish in a goroutine
	go func() {
		err := cmd.Wait()
		select {
		case <-done:
			return
		default:
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33m[Shell exited: %v]\x1b[0m\r\n", err)))
			} else {
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[33m[Shell exited]\x1b[0m\r\n"))
			}
			done <- true
			conn.Close()
		}
	}()

	// Read from WebSocket and write to PTY
	for {
		select {
		case <-done:
			// Connection is closing
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				done <- true
				break
			}

			// Parse message
			var msg struct {
				Type string `json:"type"`
				Data string `json:"data"`
				Cols uint16 `json:"cols"`
				Rows uint16 `json:"rows"`
			}
			if err := json.Unmarshal(message, &msg); err != nil {
				// Treat as raw input - write directly to PTY
				if _, err := ptmx.Write(message); err != nil {
					log.Printf("Error writing to PTY: %v (process may have exited)", err)
					// Don't close immediately - let cmd.Wait() handle it
					// Just break the read loop
					break
				}
				continue
			}

			switch msg.Type {
			case "input":
				// Write input data to PTY
				if _, err := ptmx.Write([]byte(msg.Data)); err != nil {
					log.Printf("Error writing to PTY: %v (process may have exited)", err)
					// Don't close immediately - let cmd.Wait() handle it
					// Just break the read loop
					break
				}
			case "resize":
				// Resize PTY terminal
				if err := pty.Setsize(ptmx, &pty.Winsize{
					Rows: msg.Rows,
					Cols: msg.Cols,
				}); err != nil {
					log.Printf("Error resizing PTY: %v", err)
				}
			}
		}
	}
}

// handleWindowsConPTYTerminal handles WebSocket connections for Windows terminal using ConPTY
func (ws *WebServer) handleWindowsConPTYTerminal(conn *websocket.Conn, r *http.Request) {
	// Get preferred shell from query parameter
	preferredShell := r.URL.Query().Get("shell")

	// Determine shell to use
	var shellPath string
	var shellArgs []string

	if preferredShell != "" {
		// User specified a shell preference
		shellPath = preferredShell
		// Use shell detection to get proper args
		if shell := windowsterminal.GetShellByPath(preferredShell); shell != nil {
			shellArgs = shell.Args
		} else {
			// Fallback args based on shell type
			if strings.Contains(preferredShell, "pwsh") || strings.Contains(preferredShell, "powershell") {
				shellArgs = []string{"-NoLogo"}
			} else if strings.Contains(preferredShell, "cmd") {
				shellArgs = []string{"/K"}
			}
		}
	} else {
		// Auto-detect best available shell
		if shell := windowsterminal.GetPreferredShell(); shell != nil {
			shellPath = shell.Path
			shellArgs = shell.Args
		} else {
			// Fallback to PowerShell
			shellPath = "powershell.exe"
			shellArgs = []string{"-NoLogo"}
		}
	}

	// Get home directory for working directory
	homeDir := os.Getenv("USERPROFILE")
	if homeDir == "" {
		homeDir = "C:\\"
	}

	// Create ConPTY with default size
	cpty, err := conpty.New(80, 24)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to create ConPTY: %v\x1b[0m\r\n", err)))
		log.Printf("ConPTY creation failed: %v", err)
		return
	}
	defer cpty.Close()

	// Build command with args
	cmdArgs := append(shellArgs)

	// Spawn shell process in ConPTY
	pid, _, err := cpty.Spawn(
		shellPath,
		cmdArgs,
		&conpty.ConPtyOptions{
			WorkDir: homeDir,
			Env:     os.Environ(),
		},
	)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to spawn shell: %v\x1b[0m\r\n", err)))
		log.Printf("Shell spawn failed: %v", err)
		return
	}

	log.Printf("Started Windows terminal with ConPTY: shell=%s, pid=%d", shellPath, pid)

	// Use channels to signal when the connection should close
	done := make(chan bool, 1)
	processExited := make(chan bool, 1)

	// Monitor process exit
	go func() {
		// Wait for process to exit
		// Note: ConPTY doesn't provide a built-in wait, so we need to poll or use Windows API
		// For now, we'll rely on EOF from output reading
		<-processExited
		done <- true
	}()

	// Read from ConPTY output and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
			}

			n, err := cpty.Read(buf)
			if err != nil {
				if err == io.EOF {
					log.Printf("ConPTY output EOF - process likely exited")
					processExited <- true
					return
				}
				log.Printf("ConPTY read error: %v", err)
				processExited <- true
				return
			}

			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					log.Printf("WebSocket write error: %v", err)
					done <- true
					return
				}
			}
		}
	}()

	// Read from WebSocket and write to ConPTY
	for {
		select {
		case <-done:
			log.Printf("Terminal session closing")
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				done <- true
				return
			}

			// Parse message
			var msg struct {
				Type string `json:"type"`
				Data string `json:"data"`
				Cols uint16 `json:"cols"`
				Rows uint16 `json:"rows"`
			}
			if err := json.Unmarshal(message, &msg); err != nil {
				// Treat as raw input - write directly to ConPTY
				if _, err := cpty.Write(message); err != nil {
					log.Printf("Error writing to ConPTY: %v", err)
					done <- true
					return
				}
				continue
			}

			switch msg.Type {
			case "input":
				// Write input data to ConPTY
				if _, err := cpty.Write([]byte(msg.Data)); err != nil {
					log.Printf("Error writing to ConPTY: %v", err)
					done <- true
					return
				}
			case "resize":
				// Resize ConPTY terminal
				if err := cpty.Resize(msg.Cols, msg.Rows); err != nil {
					log.Printf("Error resizing ConPTY: %v", err)
				} else {
					log.Printf("Terminal resized to %dx%d", msg.Cols, msg.Rows)
				}
			}
		}
	}
}

// handleWindowsTerminalWS handles terminal WebSocket connections on Windows
// DEPRECATED: This pipe-based approach is fundamentally broken on Windows.
// PowerShell buffers output when stdout is a pipe, causing no prompt display.
// This function is kept for backwards compatibility but should not be used.
// Use execution-based terminal approach instead (via ExecutionPanel).
func (ws *WebServer) handleWindowsTerminalWS(conn *websocket.Conn, r *http.Request) {
	// Get preferred shell from query parameter
	preferredShell := r.URL.Query().Get("shell")

	// Determine shell to use
	var shell string
	var shellArgs []string

	if preferredShell != "" {
		// User specified a shell preference
		shell = preferredShell
		switch preferredShell {
		case "pwsh.exe", "powershell.exe":
			shellArgs = []string{"-NoLogo", "-NoProfile", "-NoExit"}
		case "cmd.exe":
			shellArgs = []string{"/K"}
		case "wsl.exe":
			shellArgs = []string{"-e", "bash", "-i"}
		case "bash.exe", "git-bash.exe":
			shellArgs = []string{"--login", "-i"}
		default:
			shellArgs = []string{}
		}
	} else {
		// Auto-detect best available shell
		shells := getAvailableWindowsShells()
		if len(shells) > 0 {
			shell = shells[0].path
			shellArgs = shells[0].args
		} else {
			// Fallback to PowerShell
			shell = "powershell.exe"
			shellArgs = []string{"-NoLogo", "-NoProfile", "-NoExit"}
		}
	}

	// Get home directory for working directory
	homeDir := os.Getenv("USERPROFILE")
	if homeDir == "" {
		homeDir = "C:\\"
	}

	// Create command
	cmd := exec.Command(shell, shellArgs...)
	cmd.Dir = homeDir
	cmd.Env = os.Environ()

	// Create pipes for stdin/stdout/stderr
	stdin, err := cmd.StdinPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to create stdin pipe: %v\x1b[0m\r\n", err)))
		return
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to create stdout pipe: %v\x1b[0m\r\n", err)))
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to create stderr pipe: %v\x1b[0m\r\n", err)))
		return
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[31mFailed to start shell: %v\x1b[0m\r\n", err)))
		return
	}

	defer func() {
		stdin.Close()
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
		cmd.Wait()
	}()

	// Send initial prompt/welcome message based on shell type
	initialMsg := ""
	if strings.Contains(shell, "powershell") || strings.Contains(shell, "pwsh") {
		// PowerShell: Send a command to display welcome and prompt
		initialMsg = "Write-Host 'KubeGraf Terminal Ready' -ForegroundColor Green; $host.UI.RawUI.WindowTitle = 'KubeGraf Terminal'\r\n"
	} else if strings.Contains(shell, "cmd") {
		// CMD: Send echo command
		initialMsg = "@echo KubeGraf Terminal Ready\r\n"
	}

	if initialMsg != "" {
		// Write initial command to stdin to trigger output
		go func() {
			time.Sleep(500 * time.Millisecond)
			stdin.Write([]byte(initialMsg))
		}()
	}

	// Use a channel to signal when the connection should close
	done := make(chan bool, 1)

	// Read from stdout and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
			}

			n, err := stdout.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("stdout read error: %v", err)
				}
				done <- true
				return
			}
			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					done <- true
					return
				}
			}
		}
	}()

	// Read from stderr and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			select {
			case <-done:
				return
			default:
			}

			n, err := stderr.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("stderr read error: %v", err)
				}
				return
			}
			if n > 0 {
				if err := conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
					done <- true
					return
				}
			}
		}
	}()

	// Wait for command to finish
	go func() {
		err := cmd.Wait()
		select {
		case <-done:
			return
		default:
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("\r\n\x1b[33m[Shell exited: %v]\x1b[0m\r\n", err)))
			} else {
				conn.WriteMessage(websocket.TextMessage, []byte("\r\n\x1b[33m[Shell exited]\x1b[0m\r\n"))
			}
			done <- true
			conn.Close()
		}
	}()

	// Read from WebSocket and write to stdin
	for {
		select {
		case <-done:
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				done <- true
				return
			}

			// Parse message
			var msg struct {
				Type string `json:"type"`
				Data string `json:"data"`
				Cols uint16 `json:"cols"`
				Rows uint16 `json:"rows"`
			}
			if err := json.Unmarshal(message, &msg); err != nil {
				// Treat as raw input
				if _, err := stdin.Write(message); err != nil {
					log.Printf("Error writing to stdin: %v", err)
					return
				}
				continue
			}

			switch msg.Type {
			case "input":
				// Write input data to stdin
				if _, err := stdin.Write([]byte(msg.Data)); err != nil {
					log.Printf("Error writing to stdin: %v", err)
					return
				}
			case "resize":
				// Windows pipe-based terminals don't support resize
				// Just acknowledge the resize message
				log.Printf("Terminal resize requested: %dx%d (not supported in pipe mode)", msg.Cols, msg.Rows)
			}
		}
	}
}

// TerminalSize implements remotecommand.TerminalSizeQueue
type TerminalSize struct {
	width, height uint16
	resizeChan    chan remotecommand.TerminalSize
	once          sync.Once
}

func (t *TerminalSize) Next() *remotecommand.TerminalSize {
	t.once.Do(func() {
		t.resizeChan = make(chan remotecommand.TerminalSize, 1)
		// Send initial size
		t.resizeChan <- remotecommand.TerminalSize{Width: t.width, Height: t.height}
	})
	size, ok := <-t.resizeChan
	if !ok {
		return nil
	}
	return &size
}

func (t *TerminalSize) SetSize(width, height uint16) {
	t.width = width
	t.height = height
	if t.resizeChan != nil {
		select {
		case t.resizeChan <- remotecommand.TerminalSize{Width: width, Height: height}:
		default:
		}
	}
}

// handlePodLogs returns logs from a pod container (with optional streaming)
func (ws *WebServer) handlePodLogs(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	container := r.URL.Query().Get("container")
	tailStr := r.URL.Query().Get("tail")
	follow := r.URL.Query().Get("follow") == "true"

	if name == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Pod name is required",
		})
		return
	}

	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Parse tail lines
	tailLines := int64(100)
	if tailStr != "" {
		if parsed, err := strconv.ParseInt(tailStr, 10, 64); err == nil {
			tailLines = parsed
		}
	}

	// Get pod logs
	opts := &v1.PodLogOptions{
		TailLines: &tailLines,
		Follow:    follow,
	}
	if container != "" {
		opts.Container = container
	}

	req := ws.app.clientset.CoreV1().Pods(namespace).GetLogs(name, opts)
	podLogs, err := req.Stream(ws.app.ctx)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Failed to get logs: " + err.Error(),
		})
		return
	}
	defer podLogs.Close()

	if follow {
		// Stream logs using Server-Sent Events
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming not supported", http.StatusInternalServerError)
			return
		}

		reader := bufio.NewReader(podLogs)
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				if err == io.EOF {
					// Wait a bit and continue for follow mode
					time.Sleep(100 * time.Millisecond)
					continue
				}
				break
			}
			// Send as SSE event
			fmt.Fprintf(w, "data: %s\n\n", strings.TrimRight(line, "\n"))
			flusher.Flush()
		}
	} else {
		// Return all logs at once as JSON
		w.Header().Set("Content-Type", "application/json")
		buf := new(bytes.Buffer)
		_, err = io.Copy(buf, podLogs)
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Failed to read logs: " + err.Error(),
			})
			return
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"logs": buf.String(),
		})
	}
}

// handlePodRestart restarts a pod by deleting it
func (ws *WebServer) handlePodRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Pod name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s restarted successfully (will be recreated by controller)", name),
	})
}

// handlePodDelete deletes a pod
func (ws *WebServer) handlePodDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Pod name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Pod %s deleted successfully", name),
	})
}

// handleDeploymentRestart restarts a deployment by adding restart annotation using Patch
func (ws *WebServer) handleDeploymentRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Get deployment first to check current annotations
	dep, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Prepare annotations map - merge with existing annotations
	annotations := make(map[string]string)
	if dep.Spec.Template.Annotations != nil {
		for k, v := range dep.Spec.Template.Annotations {
			annotations[k] = v
		}
	}
	// Add restart annotation
	annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	// Create patch with proper JSON encoding
	patchData := map[string]interface{}{
		"spec": map[string]interface{}{
			"template": map[string]interface{}{
				"metadata": map[string]interface{}{
					"annotations": annotations,
				},
			},
		},
	}
	patchBytes, err := json.Marshal(patchData)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to create patch: %v", err),
		})
		return
	}

	_, err = ws.app.clientset.AppsV1().Deployments(namespace).Patch(
		ws.app.ctx,
		name,
		types.StrategicMergePatchType,
		patchBytes,
		metav1.PatchOptions{},
	)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s restarted successfully - pods will restart shortly", name),
	})
}

// handleDeploymentScale scales a deployment to the specified number of replicas
func (ws *WebServer) handleDeploymentScale(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	replicasStr := r.URL.Query().Get("replicas")
	if replicasStr == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Replicas parameter is required",
		})
		return
	}

	replicas, err := strconv.Atoi(replicasStr)
	if err != nil || replicas < 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid replicas value (must be a non-negative integer)",
		})
		return
	}

	// Get deployment
	dep, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Update replicas
	dep.Spec.Replicas = func() *int32 {
		r := int32(replicas)
		return &r
	}()

	_, err = ws.app.clientset.AppsV1().Deployments(namespace).Update(ws.app.ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s scaled to %d replicas", name, replicas),
	})
}

// handleDeploymentDelete deletes a deployment
func (ws *WebServer) handleDeploymentDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.AppsV1().Deployments(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Deployment %s deleted successfully", name),
	})
}

// handleServiceDelete deletes a service
func (ws *WebServer) handleServiceDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Service name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().Services(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Service %s deleted successfully", name),
	})
}

// handleIngressDelete deletes an ingress
func (ws *WebServer) handleIngressDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" && r.Method != "DELETE" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Ingress name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.NetworkingV1().Ingresses(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Ingress %s deleted successfully", name),
	})
}

// handleConfigMapDelete deletes a ConfigMap
func (ws *WebServer) handleConfigMapDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" && r.Method != "DELETE" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ConfigMap name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().ConfigMaps(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("ConfigMap %s deleted successfully", name),
	})
}

// handleSecretDescribe returns kubectl describe output for a secret
func (ws *WebServer) handleSecretDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Secret name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("secret", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleSecretDelete deletes a secret
func (ws *WebServer) handleSecretDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" && r.Method != "DELETE" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Secret name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.CoreV1().Secrets(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Secret %s deleted successfully", name),
	})
}

// handleDeploymentDetails returns detailed information about a deployment
func (ws *WebServer) handleDeploymentDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	dep, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(dep.Spec.Selector)

	// Get ReplicaSets for this deployment
	replicaSets := []map[string]interface{}{}
	if rss, err := ws.app.clientset.AppsV1().ReplicaSets(dep.Namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: selector,
	}); err == nil {
		for _, rs := range rss.Items {
			// Check if ReplicaSet is owned by this Deployment
			for _, ownerRef := range rs.OwnerReferences {
				if ownerRef.Kind == "Deployment" && ownerRef.Name == dep.Name {
					replicas := int32(1)
					if rs.Spec.Replicas != nil {
						replicas = *rs.Spec.Replicas
					}
					replicaSets = append(replicaSets, map[string]interface{}{
						"name":      rs.Name,
						"ready":     fmt.Sprintf("%d/%d", rs.Status.ReadyReplicas, replicas),
						"replicas":  replicas,
						"age":       formatAge(time.Since(rs.CreationTimestamp.Time)),
					})
					break
				}
			}
		}
	}

	// Get Pods for this deployment
	pods := []map[string]interface{}{}
	if podList, err := ws.app.clientset.CoreV1().Pods(dep.Namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: selector,
	}); err == nil {
		for _, pod := range podList.Items {
			// Calculate total restarts
			restarts := int32(0)
			for _, cs := range pod.Status.ContainerStatuses {
				restarts += cs.RestartCount
			}
			for _, ics := range pod.Status.InitContainerStatuses {
				restarts += ics.RestartCount
			}
			
			pods = append(pods, map[string]interface{}{
				"name":      pod.Name,
				"status":    string(pod.Status.Phase),
				"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
				"restarts":  restarts,
				"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
				"ip":        pod.Status.PodIP,
				"node":      pod.Spec.NodeName,
			})
		}
	}

	// Format conditions
	conditions := []map[string]interface{}{}
	for _, cond := range dep.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    cond.Type,
			"status":  string(cond.Status),
			"reason":  cond.Reason,
			"message": cond.Message,
			"lastTransitionTime": cond.LastTransitionTime.Format(time.RFC3339),
		})
	}

	replicas := int32(1)
	if dep.Spec.Replicas != nil {
		replicas = *dep.Spec.Replicas
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        dep.Name,
		"namespace":   dep.Namespace,
		"ready":       fmt.Sprintf("%d/%d", dep.Status.ReadyReplicas, replicas),
		"available":  fmt.Sprintf("%d/%d", dep.Status.AvailableReplicas, replicas),
		"updated":     dep.Status.UpdatedReplicas,
		"replicas":    replicas,
		"strategy":    string(dep.Spec.Strategy.Type),
		"selector":    selector,
		"labels":      dep.Labels,
		"annotations": dep.Annotations,
		"age":         formatAge(time.Since(dep.CreationTimestamp.Time)),
		"createdAt":   dep.CreationTimestamp.Format(time.RFC3339),
		"conditions":  conditions,
		"replicaSets": replicaSets,
		"pods":        pods,
	})
}

// handleServiceDetails returns detailed information about a service
func (ws *WebServer) handleServiceDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Service name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	svc, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format ports as string
	portsList := []string{}
	portsDetails := []map[string]interface{}{}
	for _, port := range svc.Spec.Ports {
		portStr := fmt.Sprintf("%d/%s", port.Port, port.Protocol)
		if port.NodePort != 0 {
			portStr += fmt.Sprintf(":%d", port.NodePort)
		}
		portsList = append(portsList, portStr)

		// Extract target port value
		targetPortValue := int32(port.Port)
		if port.TargetPort.Type == intstr.Int {
			targetPortValue = port.TargetPort.IntVal
		}

		portsDetails = append(portsDetails, map[string]interface{}{
			"name":       port.Name,
			"port":       port.Port,
			"targetPort": targetPortValue,
			"protocol":   string(port.Protocol),
			"nodePort":   port.NodePort,
		})
	}
	portsStr := strings.Join(portsList, ", ")
	if portsStr == "" {
		portsStr = "-"
	}

	// Get endpoints
	endpoints, err := ws.app.clientset.CoreV1().Endpoints(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	endpointsList := []map[string]interface{}{}
	if err == nil && endpoints != nil {
		for _, subset := range endpoints.Subsets {
			addresses := []string{}
			for _, addr := range subset.Addresses {
				for _, port := range subset.Ports {
					addresses = append(addresses, fmt.Sprintf("%s:%d", addr.IP, port.Port))
				}
			}
			if len(addresses) > 0 {
				endpointsList = append(endpointsList, map[string]interface{}{
					"name":      endpoints.Name,
					"addresses": addresses,
				})
			}
		}
	}

	// Format labels
	labels := map[string]string{}
	for k, v := range svc.Labels {
		labels[k] = v
	}

	// Format annotations
	annotations := map[string]string{}
	for k, v := range svc.Annotations {
		annotations[k] = v
	}

	// Format selector
	selectorMap := map[string]string{}
	for k, v := range svc.Spec.Selector {
		selectorMap[k] = v
	}

	// Get IP families
	ipFamilies := []string{}
	if len(svc.Spec.IPFamilies) > 0 {
		for _, ipf := range svc.Spec.IPFamilies {
			ipFamilies = append(ipFamilies, string(ipf))
		}
	}

	// Get cluster IPs
	clusterIPs := []string{}
	if svc.Spec.ClusterIP != "" && svc.Spec.ClusterIP != "None" {
		clusterIPs = append(clusterIPs, svc.Spec.ClusterIP)
	}
	if len(svc.Spec.ClusterIPs) > 0 {
		clusterIPs = append(clusterIPs, svc.Spec.ClusterIPs...)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"name":             svc.Name,
		"namespace":        svc.Namespace,
		"created":          formatAge(time.Since(svc.CreationTimestamp.Time)),
		"createdTimestamp": svc.CreationTimestamp.Format(time.RFC3339),
		"labels":           labels,
		"annotations":      annotations,
		"finalizers":       svc.Finalizers,
		"selector":         selectorMap,
		"type":             string(svc.Spec.Type),
		"sessionAffinity":  string(svc.Spec.SessionAffinity),
		"clusterIP":        svc.Spec.ClusterIP,
		"clusterIPs":       clusterIPs,
		"ipFamilies":       ipFamilies,
		"ipFamilyPolicy": func() string {
			if svc.Spec.IPFamilyPolicy != nil {
				return string(*svc.Spec.IPFamilyPolicy)
			}
			return ""
		}(),
		"externalIPs":  svc.Spec.ExternalIPs,
		"ports":        portsStr,
		"portsDetails": portsDetails,
		"endpoints":    endpointsList,
	})
}

// handleIngressDetails returns detailed information about an ingress
func (ws *WebServer) handleIngressDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Ingress name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	ing, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format hosts as string
	hosts := []string{}
	for _, rule := range ing.Spec.Rules {
		if rule.Host != "" {
			hosts = append(hosts, rule.Host)
		}
	}
	hostsStr := strings.Join(hosts, ", ")
	if hostsStr == "" {
		hostsStr = "*"
	}

	className := ""
	if ing.Spec.IngressClassName != nil {
		className = *ing.Spec.IngressClassName
	}

	// Format rules with paths and services
	rules := []map[string]interface{}{}
	services := []map[string]interface{}{}
	serviceMap := make(map[string]bool)
	
	for _, rule := range ing.Spec.Rules {
		ruleData := map[string]interface{}{
			"host":  rule.Host,
			"paths": []map[string]interface{}{},
		}
		
		if rule.HTTP != nil {
			for _, path := range rule.HTTP.Paths {
				pathData := map[string]interface{}{
					"path":     path.Path,
					"pathType": string(*path.PathType),
				}
				
				if path.Backend.Service != nil {
					pathData["service"] = map[string]interface{}{
						"name": path.Backend.Service.Name,
						"port": path.Backend.Service.Port.Number,
					}
					
					// Add service to services list if not already added
					serviceKey := fmt.Sprintf("%s/%s", namespace, path.Backend.Service.Name)
					if !serviceMap[serviceKey] {
						services = append(services, map[string]interface{}{
							"name":      path.Backend.Service.Name,
							"namespace": namespace,
							"port":      path.Backend.Service.Port.Number,
						})
						serviceMap[serviceKey] = true
					}
				}
				
				ruleData["paths"] = append(ruleData["paths"].([]map[string]interface{}), pathData)
			}
		}
		
		rules = append(rules, ruleData)
	}
	
	// Handle default backend
	if ing.Spec.DefaultBackend != nil && ing.Spec.DefaultBackend.Service != nil {
		serviceKey := fmt.Sprintf("%s/%s", namespace, ing.Spec.DefaultBackend.Service.Name)
		if !serviceMap[serviceKey] {
			services = append(services, map[string]interface{}{
				"name":      ing.Spec.DefaultBackend.Service.Name,
				"namespace": namespace,
				"port":      ing.Spec.DefaultBackend.Service.Port.Number,
			})
		}
	}

	// Format TLS
	tlsHosts := []string{}
	for _, tls := range ing.Spec.TLS {
		tlsHosts = append(tlsHosts, strings.Join(tls.Hosts, ", "))
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        ing.Name,
		"namespace":   ing.Namespace,
		"hosts":       hostsStr,
		"class":       className,
		"rules":       rules,
		"services":    services,
		"tlsHosts":    tlsHosts,
		"labels":      ing.Labels,
		"annotations": ing.Annotations,
		"age":         formatAge(time.Since(ing.CreationTimestamp.Time)),
		"createdAt":   ing.CreationTimestamp.Format(time.RFC3339),
	})
}

// handleConfigMapDetails returns detailed information about a configmap
func (ws *WebServer) handleConfigMapDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ConfigMap name is required",
		})
		return
	}

	cm, err := ws.app.clientset.CoreV1().ConfigMaps(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format keys as string
	keys := []string{}
	for key := range cm.Data {
		keys = append(keys, key)
	}
	for key := range cm.BinaryData {
		keys = append(keys, key+" (binary)")
	}
	keysStr := strings.Join(keys, ", ")
	if keysStr == "" {
		keysStr = "-"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        cm.Name,
		"namespace":   cm.Namespace,
		"keys":        keysStr,
		"data":        cm.Data,
		"binaryData":  cm.BinaryData,
		"labels":      cm.Labels,
		"annotations": cm.Annotations,
		"age":         formatAge(time.Since(cm.CreationTimestamp.Time)),
		"createdAt":   cm.CreationTimestamp.Format(time.RFC3339),
	})
}

// handlePodYAML returns the YAML definition of a pod
func (ws *WebServer) handlePodYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Pod name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	pod, err := ws.app.clientset.CoreV1().Pods(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	pod.ManagedFields = nil

	yamlData, err := toKubectlYAML(pod, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Pod"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Failed to marshal YAML: " + err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleResourceUpdate is a generic handler for updating resources from YAML
func (ws *WebServer) handleResourceUpdate(w http.ResponseWriter, r *http.Request, resourceType string, updateFunc func(yamlData []byte, namespace string) error) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("%s name is required", resourceType),
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// Read YAML from request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to read request body: %v", err),
		})
		return
	}
	defer r.Body.Close()

	// Update the resource
	if err := updateFunc(body, namespace); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("%s %s updated successfully", resourceType, name),
	})
}

// handlePodUpdate updates a pod from YAML
func (ws *WebServer) handlePodUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "pod", func(yamlData []byte, namespace string) error {
		var pod v1.Pod
		if err := yaml.Unmarshal(yamlData, &pod); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.CoreV1().Pods(namespace).Update(ws.app.ctx, &pod, metav1.UpdateOptions{})
		return err
	})
}

// handlePodDescribe returns the describe output for a pod using kubectl describe
func (ws *WebServer) handlePodDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Pod name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("pod", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleDeploymentYAML returns the YAML representation of a deployment
func (ws *WebServer) handleDeploymentYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "deployment name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	deployment, err := ws.app.clientset.AppsV1().Deployments(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	deployment.ManagedFields = nil

	yamlData, err := toKubectlYAML(deployment, schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "Deployment"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleDeploymentUpdate updates a deployment from YAML
func (ws *WebServer) handleDeploymentUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "deployment", func(yamlData []byte, namespace string) error {
		var dep appsv1.Deployment
		if err := yaml.Unmarshal(yamlData, &dep); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.AppsV1().Deployments(namespace).Update(ws.app.ctx, &dep, metav1.UpdateOptions{})
		return err
	})
}

// handleDeploymentDescribe returns kubectl describe output for a deployment
func (ws *WebServer) handleDeploymentDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Deployment name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("deployment", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleServiceYAML returns the YAML representation of a service
func (ws *WebServer) handleServiceYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "service name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	service, err := ws.app.clientset.CoreV1().Services(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	service.ManagedFields = nil

	yamlData, err := toKubectlYAML(service, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Service"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleServiceUpdate updates a service from YAML
func (ws *WebServer) handleServiceUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "service", func(yamlData []byte, namespace string) error {
		var svc corev1.Service
		if err := yaml.Unmarshal(yamlData, &svc); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.CoreV1().Services(namespace).Update(ws.app.ctx, &svc, metav1.UpdateOptions{})
		return err
	})
}

// handleServiceDescribe returns kubectl describe output for a service
func (ws *WebServer) handleServiceDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Service name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if !r.URL.Query().Has("namespace") {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("service", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleIngressYAML returns the YAML representation of an ingress
func (ws *WebServer) handleIngressYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ingress name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	ingress, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	ingress.ManagedFields = nil

	yamlData, err := toKubectlYAML(ingress, schema.GroupVersionKind{Group: "networking.k8s.io", Version: "v1", Kind: "Ingress"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleIngressUpdate updates an ingress from YAML
func (ws *WebServer) handleIngressUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "ingress", func(yamlData []byte, namespace string) error {
		var ing networkingv1.Ingress
		if err := yaml.Unmarshal(yamlData, &ing); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.NetworkingV1().Ingresses(namespace).Update(ws.app.ctx, &ing, metav1.UpdateOptions{})
		return err
	})
}

// handleIngressDescribe returns kubectl describe output for an ingress
func (ws *WebServer) handleIngressDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Ingress name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("ingress", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleNetworkPolicyYAML returns the YAML representation of a network policy
func (ws *WebServer) handleNetworkPolicyYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "network policy name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	np, err := ws.app.clientset.NetworkingV1().NetworkPolicies(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	np.ManagedFields = nil

	yamlData, err := toKubectlYAML(np, schema.GroupVersionKind{Group: "networking.k8s.io", Version: "v1", Kind: "NetworkPolicy"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleNetworkPolicyDescribe returns kubectl describe output for a network policy
func (ws *WebServer) handleNetworkPolicyDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Network policy name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("networkpolicy", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleNetworkPolicyUpdate updates a network policy from YAML
func (ws *WebServer) handleNetworkPolicyUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "networkpolicy", func(yamlData []byte, namespace string) error {
		var np networkingv1.NetworkPolicy
		if err := yaml.Unmarshal(yamlData, &np); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.NetworkingV1().NetworkPolicies(namespace).Update(ws.app.ctx, &np, metav1.UpdateOptions{})
		return err
	})
}

// handleNetworkPolicyDelete deletes a network policy
func (ws *WebServer) handleNetworkPolicyDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "DELETE" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Network policy name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.NetworkingV1().NetworkPolicies(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Network policy %s deleted successfully", name),
	})
}

// handleNetworkPolicyDetails returns detailed information about a network policy
func (ws *WebServer) handleNetworkPolicyDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Network policy name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	np, err := ws.app.clientset.NetworkingV1().NetworkPolicies(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format pod selector
	selector := map[string]string{}
	for k, v := range np.Spec.PodSelector.MatchLabels {
		selector[k] = v
	}

	// Format ingress rules
	ingressRules := []map[string]interface{}{}
	for _, rule := range np.Spec.Ingress {
		ingressRule := map[string]interface{}{
			"ports": []map[string]interface{}{},
			"from":  []map[string]interface{}{},
		}
		for _, port := range rule.Ports {
			portMap := map[string]interface{}{}
			if port.Protocol != nil {
				portMap["protocol"] = string(*port.Protocol)
			}
			if port.Port != nil {
				if port.Port.Type == intstr.Int {
					portMap["port"] = port.Port.IntVal
				} else {
					portMap["port"] = port.Port.StrVal
				}
			}
			ingressRule["ports"] = append(ingressRule["ports"].([]map[string]interface{}), portMap)
		}
		for _, from := range rule.From {
			fromMap := map[string]interface{}{}
			if from.PodSelector != nil {
				fromMap["podSelector"] = from.PodSelector.MatchLabels
			}
			if from.NamespaceSelector != nil {
				fromMap["namespaceSelector"] = from.NamespaceSelector.MatchLabels
			}
			if from.IPBlock != nil {
				fromMap["ipBlock"] = map[string]interface{}{
					"cidr":   from.IPBlock.CIDR,
					"except": from.IPBlock.Except,
				}
			}
			ingressRule["from"] = append(ingressRule["from"].([]map[string]interface{}), fromMap)
		}
		ingressRules = append(ingressRules, ingressRule)
	}

	// Format egress rules
	egressRules := []map[string]interface{}{}
	for _, rule := range np.Spec.Egress {
		egressRule := map[string]interface{}{
			"ports": []map[string]interface{}{},
			"to":    []map[string]interface{}{},
		}
		for _, port := range rule.Ports {
			portMap := map[string]interface{}{}
			if port.Protocol != nil {
				portMap["protocol"] = string(*port.Protocol)
			}
			if port.Port != nil {
				if port.Port.Type == intstr.Int {
					portMap["port"] = port.Port.IntVal
				} else {
					portMap["port"] = port.Port.StrVal
				}
			}
			egressRule["ports"] = append(egressRule["ports"].([]map[string]interface{}), portMap)
		}
		for _, to := range rule.To {
			toMap := map[string]interface{}{}
			if to.PodSelector != nil {
				toMap["podSelector"] = to.PodSelector.MatchLabels
			}
			if to.NamespaceSelector != nil {
				toMap["namespaceSelector"] = to.NamespaceSelector.MatchLabels
			}
			if to.IPBlock != nil {
				toMap["ipBlock"] = map[string]interface{}{
					"cidr":   to.IPBlock.CIDR,
					"except": to.IPBlock.Except,
				}
			}
			egressRule["to"] = append(egressRule["to"].([]map[string]interface{}), toMap)
		}
		egressRules = append(egressRules, egressRule)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"name":             np.Name,
		"namespace":        np.Namespace,
		"created":          formatAge(time.Since(np.CreationTimestamp.Time)),
		"createdTimestamp": np.CreationTimestamp.Format(time.RFC3339),
		"labels":           np.Labels,
		"annotations":      np.Annotations,
		"podSelector":      selector,
		"policyTypes":      np.Spec.PolicyTypes,
		"ingress":          ingressRules,
		"egress":           egressRules,
	})
}

// handleConfigMapYAML returns the YAML representation of a configmap
func (ws *WebServer) handleConfigMapYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "configmap name required",
		})
		return
	}
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	configMap, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	configMap.ManagedFields = nil

	yamlData, err := toKubectlYAML(configMap, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "ConfigMap"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleSecretDetails returns detailed information about a secret
func (ws *WebServer) handleSecretDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Secret name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	secret, err := ws.app.clientset.CoreV1().Secrets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format keys as string
	keys := []string{}
	for key := range secret.Data {
		keys = append(keys, key)
	}
	for key := range secret.StringData {
		keys = append(keys, key+" (string)")
	}
	keysStr := strings.Join(keys, ", ")
	if keysStr == "" {
		keysStr = "-"
	}

	// Note: We don't return the actual secret data for security reasons
	// The data is base64 encoded and should only be accessed via YAML endpoint with proper auth

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        secret.Name,
		"namespace":   secret.Namespace,
		"type":        string(secret.Type),
		"keys":        keysStr,
		"dataKeys":    len(secret.Data),
		"stringKeys":  len(secret.StringData),
		"labels":      secret.Labels,
		"annotations": secret.Annotations,
		"age":         formatAge(time.Since(secret.CreationTimestamp.Time)),
		"createdAt":   secret.CreationTimestamp.Format(time.RFC3339),
	})
}

// handleSecretYAML returns the YAML representation of a secret
func (ws *WebServer) handleSecretYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "secret name required",
		})
		return
	}
	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	secret, err := ws.app.clientset.CoreV1().Secrets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	secret.ManagedFields = nil

	yamlData, err := toKubectlYAML(secret, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Secret"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleSecretUpdate updates a secret from YAML
func (ws *WebServer) handleSecretUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "secret", func(yamlData []byte, namespace string) error {
		var secret v1.Secret
		if err := yaml.Unmarshal(yamlData, &secret); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.CoreV1().Secrets(namespace).Update(ws.app.ctx, &secret, metav1.UpdateOptions{})
		return err
	})
}

// handleConfigMapUpdate updates a configmap from YAML
func (ws *WebServer) handleConfigMapUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "configmap", func(yamlData []byte, namespace string) error {
		var cm v1.ConfigMap
		if err := yaml.Unmarshal(yamlData, &cm); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).Update(ws.app.ctx, &cm, metav1.UpdateOptions{})
		return err
	})
}

// handleConfigMapDescribe returns kubectl describe output for a configmap
func (ws *WebServer) handleConfigMapDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "ConfigMap name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("configmap", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleCertificates returns certificate list (cert-manager CRD)
// func (ws *WebServer) handleCertificates(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Handle "_all" namespace
// 	queryNs := namespace
// 	if namespace == "_all" {
// 		queryNs = ""
// 	}
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode([]map[string]interface{}{})
// 		return
// 	}
//
// 	certGVR := schema.GroupVersionResource{
// 		Group:    "cert-manager.io",
// 		Version:  "v1",
// 		Resource: "certificates",
// 	}
//
// 	certList, err := dynamicClient.Resource(certGVR).Namespace(queryNs).List(ws.app.ctx, metav1.ListOptions{})
//
// 	if err != nil {
// 		// cert-manager may not be installed
// 		json.NewEncoder(w).Encode([]map[string]interface{}{})
// 		return
// 	}
//
// 	certs := []map[string]interface{}{}
// 	for _, cert := range certList.Items {
// 		metadata := cert.Object["metadata"].(map[string]interface{})
// 		spec := cert.Object["spec"].(map[string]interface{})
//
// 		name := metadata["name"].(string)
// 		ns := metadata["namespace"].(string)
//
// 		// Get creation time for age
// 		creationTimeStr, _ := metadata["creationTimestamp"].(string)
// 		var age string
// 		if creationTime, err := time.Parse(time.RFC3339, creationTimeStr); err == nil {
// 			age = formatAge(time.Since(creationTime))
// 		}
//
// 		// Get secret name
// 		secretName, _ := spec["secretName"].(string)
//
// 		// Get issuer ref
// 		var issuer string
// 		if issuerRef, ok := spec["issuerRef"].(map[string]interface{}); ok {
// 			issuerName, _ := issuerRef["name"].(string)
// 			issuerKind, _ := issuerRef["kind"].(string)
// 			if issuerKind == "" {
// 				issuerKind = "Issuer"
// 			}
// 			issuer = fmt.Sprintf("%s/%s", issuerKind, issuerName)
// 		}
//
// 		// Get DNS names
// 		var dnsNames []string
// 		if dns, ok := spec["dnsNames"].([]interface{}); ok {
// 			for _, d := range dns {
// 				if s, ok := d.(string); ok {
// 					dnsNames = append(dnsNames, s)
// 				}
// 			}
// 		}
//
// 		// Get status
// 		status := "Unknown"
// 		var notBefore, notAfter, renewalTime string
// 		if statusObj, ok := cert.Object["status"].(map[string]interface{}); ok {
// 			if conditions, ok := statusObj["conditions"].([]interface{}); ok {
// 				for _, cond := range conditions {
// 					if c, ok := cond.(map[string]interface{}); ok {
// 						if c["type"] == "Ready" {
// 							if c["status"] == "True" {
// 								status = "Ready"
// 							} else if c["status"] == "False" {
// 								status = "Failed"
// 							} else {
// 								status = "Pending"
// 							}
// 							break
// 						}
// 					}
// 				}
// 			}
// 			if nb, ok := statusObj["notBefore"].(string); ok {
// 				notBefore = nb
// 			}
// 			if na, ok := statusObj["notAfter"].(string); ok {
// 				notAfter = na
// 			}
// 			if rt, ok := statusObj["renewalTime"].(string); ok {
// 				renewalTime = rt
// 			}
// 		}
//
// 		certs = append(certs, map[string]interface{}{
// 			"name":        name,
// 			"namespace":   ns,
// 			"secretName":  secretName,
// 			"issuer":      issuer,
// 			"status":      status,
// 			"notBefore":   notBefore,
// 			"notAfter":    notAfter,
// 			"renewalTime": renewalTime,
// 			"dnsNames":    dnsNames,
// 			"age":         age,
// 		})
// 	}
//
// 	json.NewEncoder(w).Encode(certs)
// }
//
// // handleCertificateYAML returns the YAML representation of a certificate
// func (ws *WebServer) handleCertificateYAML(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	name := r.URL.Query().Get("name")
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Certificate name is required",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if namespace == "" {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	certGVR := schema.GroupVersionResource{
// 		Group:    "cert-manager.io",
// 		Version:  "v1",
// 		Resource: "certificates",
// 	}
//
// 	cert, err := dynamicClient.Resource(certGVR).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	// Remove managed fields for cleaner YAML
// 	delete(cert.Object["metadata"].(map[string]interface{}), "managedFields")
//
// 	yamlData, err := yaml.Marshal(cert.Object)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success": true,
// 		"yaml":    string(yamlData),
// 	})
// }
//
// // handleCertificateUpdate updates a certificate from YAML
// func (ws *WebServer) handleCertificateUpdate(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if r.Method != "POST" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Method not allowed",
// 		})
// 		return
// 	}
//
// 	name := r.URL.Query().Get("name")
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Certificate name is required",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if namespace == "" {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Read YAML from request body
// 	body, err := io.ReadAll(r.Body)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   fmt.Sprintf("Failed to read request body: %v", err),
// 		})
// 		return
// 	}
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	certGVR := schema.GroupVersionResource{
// 		Group:    "cert-manager.io",
// 		Version:  "v1",
// 		Resource: "certificates",
// 	}
//
// 	// Unmarshal YAML to unstructured object
// 	var cert unstructured.Unstructured
// 	if err := yaml.Unmarshal(body, &cert); err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   fmt.Sprintf("Failed to unmarshal YAML: %v", err),
// 		})
// 		return
// 	}
//
// 	// Update the certificate
// 	_, err = dynamicClient.Resource(certGVR).Namespace(namespace).Update(ws.app.ctx, &cert, metav1.UpdateOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success": true,
// 		"message": fmt.Sprintf("Certificate %s updated successfully", name),
// 	})
// }
//
// // handleCertificateDescribe returns kubectl describe output for a certificate
// func (ws *WebServer) handleCertificateDescribe(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	name := r.URL.Query().Get("name")
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Certificate name is required",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if namespace == "" {
// 		namespace = ws.app.namespace
// 	}
//
// 	describe, err := runKubectlDescribe("certificate.cert-manager.io", name, namespace)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":  true,
// 		"describe": describe,
// 	})
// }
//
// // handleCertificateDelete deletes a certificate
// func (ws *WebServer) handleCertificateDelete(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if r.Method != "DELETE" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Method not allowed",
// 		})
// 		return
// 	}
//
// 	name := r.URL.Query().Get("name")
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Certificate name is required",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
// 	if namespace == "" {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	certGVR := schema.GroupVersionResource{
// 		Group:    "cert-manager.io",
// 		Version:  "v1",
// 		Resource: "certificates",
// 	}
//
// 	err = dynamicClient.Resource(certGVR).Namespace(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success": true,
// 		"message": fmt.Sprintf("Certificate %s deleted successfully", name),
// 	})
// }

// handleCronJobs returns cronjob list
// func (ws *WebServer) handleCronJobs(w http.ResponseWriter, r *http.Request) {
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
// 	cronjobs, err := ws.app.clientset.BatchV1().CronJobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
//
// 	cjList := []map[string]interface{}{}
// 	for _, cj := range cronjobs.Items {
// 		// Get last schedule time
// 		lastSchedule := "Never"
// 		if cj.Status.LastScheduleTime != nil {
// 			lastSchedule = formatAge(time.Since(cj.Status.LastScheduleTime.Time)) + " ago"
// 		}
//
// 		// Get active jobs count
// 		activeJobs := len(cj.Status.Active)
//
// 		cjList = append(cjList, map[string]interface{}{
// 			"name":         cj.Name,
// 			"schedule":     cj.Spec.Schedule,
// 			"suspend":      cj.Spec.Suspend != nil && *cj.Spec.Suspend,
// 			"active":       activeJobs,
// 			"lastSchedule": lastSchedule,
// 			"age":          formatAge(time.Since(cj.CreationTimestamp.Time)),
// 			"namespace":    cj.Namespace,
// 		})
// 	}
//
// 	json.NewEncoder(w).Encode(cjList)
// }

// handleJobs returns job list
// func (ws *WebServer) handleJobs(w http.ResponseWriter, r *http.Request) {
// 	namespace := r.URL.Query().Get("namespace")
// 	if !r.URL.Query().Has("namespace") {
// 		namespace = ws.app.namespace
// 	}
// 	jobs, err := ws.app.clientset.BatchV1().Jobs(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
//
// 	jobList := []map[string]interface{}{}
// 	for _, job := range jobs.Items {
// 		// Determine status
// 		status := "Running"
// 		if job.Status.Succeeded > 0 {
// 			status = "Complete"
// 		} else if job.Status.Failed > 0 {
// 			status = "Failed"
// 		}
//
// 		// Get completions
// 		completions := "?"
// 		if job.Spec.Completions != nil {
// 			completions = fmt.Sprintf("%d", *job.Spec.Completions)
// 		}
//
// 		// Get duration
// 		duration := "-"
// 		if job.Status.CompletionTime != nil {
// 			duration = formatAge(job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time))
// 		} else if job.Status.StartTime != nil {
// 			duration = formatAge(time.Since(job.Status.StartTime.Time))
// 		}
//
// 		jobList = append(jobList, map[string]interface{}{
// 			"name":        job.Name,
// 			"status":      status,
// 			"completions": fmt.Sprintf("%d/%s", job.Status.Succeeded, completions),
// 			"duration":    duration,
// 			"age":         formatAge(time.Since(job.CreationTimestamp.Time)),
// 			"namespace":   job.Namespace,
// 		})
// 	}
//
// 	json.NewEncoder(w).Encode(jobList)
// }

// handleStatefulSetDetails returns detailed information about a statefulset
func (ws *WebServer) handleStatefulSetDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	ss, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(ss.Spec.Selector)

	// Format service name
	serviceName := ss.Spec.ServiceName
	if serviceName == "" {
		serviceName = "-"
	}

	// Get Pods for this statefulset
	pods := []map[string]interface{}{}
	if podList, err := ws.app.clientset.CoreV1().Pods(ss.Namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: selector,
	}); err == nil {
		for _, pod := range podList.Items {
			// Calculate total restarts
			restarts := int32(0)
			for _, cs := range pod.Status.ContainerStatuses {
				restarts += cs.RestartCount
			}
			for _, ics := range pod.Status.InitContainerStatuses {
				restarts += ics.RestartCount
			}
			
			pods = append(pods, map[string]interface{}{
				"name":      pod.Name,
				"status":    string(pod.Status.Phase),
				"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
				"restarts":  restarts,
				"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
				"ip":        pod.Status.PodIP,
				"node":      pod.Spec.NodeName,
			})
		}
	}

	// Format conditions
	conditions := []map[string]interface{}{}
	for _, cond := range ss.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    cond.Type,
			"status":  string(cond.Status),
			"reason":  cond.Reason,
			"message": cond.Message,
			"lastTransitionTime": cond.LastTransitionTime.Format(time.RFC3339),
		})
	}

	replicas := int32(1)
	if ss.Spec.Replicas != nil {
		replicas = *ss.Spec.Replicas
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        ss.Name,
		"namespace":   ss.Namespace,
		"ready":       fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, replicas),
		"available":  fmt.Sprintf("%d/%d", ss.Status.ReadyReplicas, replicas),
		"replicas":   replicas,
		"serviceName": serviceName,
		"selector":    selector,
		"labels":      ss.Labels,
		"annotations": ss.Annotations,
		"age":         formatAge(time.Since(ss.CreationTimestamp.Time)),
		"createdAt":   ss.CreationTimestamp.Format(time.RFC3339),
		"conditions":  conditions,
		"pods":        pods,
	})
}

// handleStatefulSetYAML returns the YAML representation of a statefulset
func (ws *WebServer) handleStatefulSetYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "statefulset name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	statefulSet, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	statefulSet.ManagedFields = nil

	yamlData, err := toKubectlYAML(statefulSet, schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "StatefulSet"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleStatefulSetUpdate updates a statefulset from YAML
func (ws *WebServer) handleStatefulSetUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "statefulset", func(yamlData []byte, namespace string) error {
		var ss appsv1.StatefulSet
		if err := yaml.Unmarshal(yamlData, &ss); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Update(ws.app.ctx, &ss, metav1.UpdateOptions{})
		return err
	})
}

// handleStatefulSetDescribe returns kubectl describe-style output for a statefulset
func (ws *WebServer) handleStatefulSetDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("statefulset", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleStatefulSetRestart restarts a statefulset by adding restart annotation using Patch
func (ws *WebServer) handleStatefulSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	// For StatefulSets, delete pods directly (they'll be recreated by StatefulSet controller)
	// This is more reliable than the annotation method for StatefulSets
	pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Find pods belonging to this StatefulSet by checking owner references and name prefix
	var podsToDelete []string
	for _, pod := range pods.Items {
		// Check if pod belongs to this StatefulSet
		belongsToStatefulSet := false

		// Method 1: Check owner references
		for _, ownerRef := range pod.OwnerReferences {
			if ownerRef.Kind == "StatefulSet" && ownerRef.Name == name {
				belongsToStatefulSet = true
				break
			}
		}

		// Method 2: Check name prefix (StatefulSet pods follow pattern: <statefulset-name>-<ordinal>)
		if !belongsToStatefulSet && strings.HasPrefix(pod.Name, name+"-") {
			belongsToStatefulSet = true
		}

		if belongsToStatefulSet {
			podsToDelete = append(podsToDelete, pod.Name)
		}
	}

	if len(podsToDelete) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("No pods found for StatefulSet %s", name),
		})
		return
	}

	// Delete pods (they'll be recreated by StatefulSet controller in order)
	var deleteErrors []string
	for _, podName := range podsToDelete {
		err = ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, podName, metav1.DeleteOptions{})
		if err != nil {
			deleteErrors = append(deleteErrors, fmt.Sprintf("pod %s: %v", podName, err))
			log.Printf("Warning: Failed to delete pod %s: %v", podName, err)
		}
	}

	if len(deleteErrors) > 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Some pods failed to delete: %s", strings.Join(deleteErrors, "; ")),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("StatefulSet %s restart initiated - %d pod(s) deleted, will be recreated by StatefulSet controller", name, len(podsToDelete)),
	})
}

// handleStatefulSetScale scales a statefulset to the specified number of replicas
func (ws *WebServer) handleStatefulSetScale(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	replicasStr := r.URL.Query().Get("replicas")
	if replicasStr == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Replicas parameter is required",
		})
		return
	}

	replicas, err := strconv.Atoi(replicasStr)
	if err != nil || replicas < 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Invalid replicas value (must be a non-negative integer)",
		})
		return
	}

	// Get statefulset
	ss, err := ws.app.clientset.AppsV1().StatefulSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Update replicas
	ss.Spec.Replicas = func() *int32 {
		r := int32(replicas)
		return &r
	}()

	_, err = ws.app.clientset.AppsV1().StatefulSets(namespace).Update(ws.app.ctx, ss, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("StatefulSet %s scaled to %d replicas", name, replicas),
	})
}

// handleStatefulSetDelete deletes a statefulset
func (ws *WebServer) handleStatefulSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "StatefulSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.AppsV1().StatefulSets(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("StatefulSet %s deleted successfully", name),
	})
}

// handleDaemonSetDetails returns detailed information about a daemonset
func (ws *WebServer) handleDaemonSetDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	ds, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(ds.Spec.Selector)

	// Get Pods for this daemonset
	pods := []map[string]interface{}{}
	if podList, err := ws.app.clientset.CoreV1().Pods(ds.Namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: selector,
	}); err == nil {
		for _, pod := range podList.Items {
			// Calculate total restarts
			restarts := int32(0)
			for _, cs := range pod.Status.ContainerStatuses {
				restarts += cs.RestartCount
			}
			for _, ics := range pod.Status.InitContainerStatuses {
				restarts += ics.RestartCount
			}
			
			pods = append(pods, map[string]interface{}{
				"name":      pod.Name,
				"status":    string(pod.Status.Phase),
				"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
				"restarts":  restarts,
				"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
				"ip":        pod.Status.PodIP,
				"node":      pod.Spec.NodeName,
			})
		}
	}

	// Format conditions
	conditions := []map[string]interface{}{}
	for _, cond := range ds.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    cond.Type,
			"status":  string(cond.Status),
			"reason":  cond.Reason,
			"message": cond.Message,
			"lastTransitionTime": cond.LastTransitionTime.Format(time.RFC3339),
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        ds.Name,
		"namespace":   ds.Namespace,
		"desired":     ds.Status.DesiredNumberScheduled,
		"current":     ds.Status.CurrentNumberScheduled,
		"ready":       fmt.Sprintf("%d/%d", ds.Status.NumberReady, ds.Status.DesiredNumberScheduled),
		"available":   ds.Status.NumberAvailable,
		"replicas":    ds.Status.DesiredNumberScheduled,
		"selector":    selector,
		"labels":      ds.Labels,
		"annotations": ds.Annotations,
		"age":         formatAge(time.Since(ds.CreationTimestamp.Time)),
		"createdAt":   ds.CreationTimestamp.Format(time.RFC3339),
		"conditions":  conditions,
		"pods":        pods,
	})
}

// handleDaemonSetYAML returns the YAML representation of a daemonset
func (ws *WebServer) handleDaemonSetYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "daemonset name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	daemonSet, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	daemonSet.ManagedFields = nil

	yamlData, err := toKubectlYAML(daemonSet, schema.GroupVersionKind{Group: "apps", Version: "v1", Kind: "DaemonSet"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleDaemonSetUpdate updates a daemonset from YAML
func (ws *WebServer) handleDaemonSetUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "daemonset", func(yamlData []byte, namespace string) error {
		var ds appsv1.DaemonSet
		if err := yaml.Unmarshal(yamlData, &ds); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Update(ws.app.ctx, &ds, metav1.UpdateOptions{})
		return err
	})
}

// handleDaemonSetDescribe returns kubectl describe-style output for a daemonset
func (ws *WebServer) handleDaemonSetDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("daemonset", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleDaemonSetRestart restarts a daemonset by updating a restart annotation
func (ws *WebServer) handleDaemonSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	// Get daemonset
	ds, err := ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Add restart annotation to trigger pod restart
	if ds.Spec.Template.Annotations == nil {
		ds.Spec.Template.Annotations = make(map[string]string)
	}
	ds.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	_, err = ws.app.clientset.AppsV1().DaemonSets(ws.app.namespace).Update(ws.app.ctx, ds, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("DaemonSet %s restarted successfully", name),
	})
}

// handleDaemonSetDelete deletes a daemonset
func (ws *WebServer) handleDaemonSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "DaemonSet name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	err := ws.app.clientset.AppsV1().DaemonSets(namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("DaemonSet %s deleted successfully", name),
	})
}

// handleCronJobDetails returns detailed information about a cronjob
func (ws *WebServer) handleCronJobDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "CronJob name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	cj, err := ws.app.clientset.BatchV1().CronJobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string (from job template)
	selector := ""
	if cj.Spec.JobTemplate.Spec.Selector != nil {
		selector = metav1.FormatLabelSelector(cj.Spec.JobTemplate.Spec.Selector)
	}

	// Get last schedule time
	lastSchedule := "Never"
	if cj.Status.LastScheduleTime != nil {
		lastSchedule = cj.Status.LastScheduleTime.Time.Format(time.RFC3339)
	}

	// Get next schedule time (approximate)
	nextSchedule := "Unknown"
	if cj.Status.LastScheduleTime != nil {
		// This is a simplified calculation
		nextSchedule = time.Now().Format(time.RFC3339) + " (approximate)"
	}

	// Get suspend status
	suspended := false
	if cj.Spec.Suspend != nil {
		suspended = *cj.Spec.Suspend
	}

	// Get active jobs
	activeJobs := []map[string]interface{}{}
	for _, jobRef := range cj.Status.Active {
		activeJobs = append(activeJobs, map[string]interface{}{
			"name":      jobRef.Name,
			"namespace": jobRef.Namespace,
		})
	}

	// Get Pods for this cronjob (via active jobs)
	pods := []map[string]interface{}{}
	if selector != "" {
		if podList, err := ws.app.clientset.CoreV1().Pods(cj.Namespace).List(ws.app.ctx, metav1.ListOptions{
			LabelSelector: selector,
		}); err == nil {
			for _, pod := range podList.Items {
				// Check if pod is owned by one of the active jobs
				for _, ownerRef := range pod.OwnerReferences {
					if ownerRef.Kind == "Job" {
						for _, jobRef := range cj.Status.Active {
							if ownerRef.Name == jobRef.Name {
								restarts := int32(0)
								for _, cs := range pod.Status.ContainerStatuses {
									restarts += cs.RestartCount
								}
								for _, ics := range pod.Status.InitContainerStatuses {
									restarts += ics.RestartCount
								}
								
								pods = append(pods, map[string]interface{}{
									"name":      pod.Name,
									"status":    string(pod.Status.Phase),
									"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
									"restarts":  restarts,
									"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
									"ip":        pod.Status.PodIP,
									"node":      pod.Spec.NodeName,
								})
								break
							}
						}
					}
				}
			}
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":           true,
		"name":              cj.Name,
		"namespace":        cj.Namespace,
		"schedule":          cj.Spec.Schedule,
		"suspend":           suspended,
		"active":            len(cj.Status.Active),
		"activeJobs":        activeJobs,
		"lastSchedule":      lastSchedule,
		"nextSchedule":      nextSchedule,
		"concurrencyPolicy": string(cj.Spec.ConcurrencyPolicy),
		"selector":          selector,
		"labels":            cj.Labels,
		"annotations":       cj.Annotations,
		"age":               formatAge(time.Since(cj.CreationTimestamp.Time)),
		"createdAt":         cj.CreationTimestamp.Format(time.RFC3339),
		"pods":              pods,
	})
}

// handleCronJobYAML returns the YAML representation of a cronjob
func (ws *WebServer) handleCronJobYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "cronjob name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	cronJob, err := ws.app.clientset.BatchV1().CronJobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	cronJob.ManagedFields = nil

	yamlData, err := toKubectlYAML(cronJob, schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "CronJob"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleCronJobUpdate updates a cronjob from YAML
func (ws *WebServer) handleCronJobUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "cronjob", func(yamlData []byte, namespace string) error {
		var cj batchv1.CronJob
		if err := yaml.Unmarshal(yamlData, &cj); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.BatchV1().CronJobs(namespace).Update(ws.app.ctx, &cj, metav1.UpdateOptions{})
		return err
	})
}

// handleCronJobDescribe returns kubectl describe output for a cronjob
func (ws *WebServer) handleCronJobDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "CronJob name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("cronjob", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleCronJobDelete deletes a cronjob
func (ws *WebServer) handleCronJobDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "CronJob name is required",
		})
		return
	}

	err := ws.app.clientset.BatchV1().CronJobs(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("CronJob %s deleted successfully", name),
	})
}

// handleJobDetails returns detailed information about a job
func (ws *WebServer) handleJobDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Job name is required",
		})
		return
	}
	if namespace == "" {
		namespace = ws.app.namespace
	}

	job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Format selector as string
	selector := metav1.FormatLabelSelector(job.Spec.Selector)

	// Determine status
	status := "Running"
	if job.Status.Succeeded > 0 {
		status = "Complete"
	} else if job.Status.Failed > 0 {
		status = "Failed"
	}

	// Get completions
	completions := "?"
	if job.Spec.Completions != nil {
		completions = fmt.Sprintf("%d", *job.Spec.Completions)
	}

	// Get parallelism
	parallelism := int32(1)
	if job.Spec.Parallelism != nil {
		parallelism = *job.Spec.Parallelism
	}

	// Get duration
	duration := "-"
	if job.Status.CompletionTime != nil {
		duration = formatAge(job.Status.CompletionTime.Time.Sub(job.Status.StartTime.Time))
	} else if job.Status.StartTime != nil {
		duration = formatAge(time.Since(job.Status.StartTime.Time))
	}

	// Get Pods for this job
	pods := []map[string]interface{}{}
	if podList, err := ws.app.clientset.CoreV1().Pods(job.Namespace).List(ws.app.ctx, metav1.ListOptions{
		LabelSelector: selector,
	}); err == nil {
		for _, pod := range podList.Items {
			// Calculate total restarts
			restarts := int32(0)
			for _, cs := range pod.Status.ContainerStatuses {
				restarts += cs.RestartCount
			}
			for _, ics := range pod.Status.InitContainerStatuses {
				restarts += ics.RestartCount
			}
			
			pods = append(pods, map[string]interface{}{
				"name":      pod.Name,
				"status":    string(pod.Status.Phase),
				"ready":     fmt.Sprintf("%d/%d", len(pod.Status.ContainerStatuses), len(pod.Spec.Containers)),
				"restarts":  restarts,
				"age":       formatAge(time.Since(pod.CreationTimestamp.Time)),
				"ip":        pod.Status.PodIP,
				"node":      pod.Spec.NodeName,
			})
		}
	}

	// Format conditions
	conditions := []map[string]interface{}{}
	for _, cond := range job.Status.Conditions {
		conditions = append(conditions, map[string]interface{}{
			"type":    cond.Type,
			"status":  string(cond.Status),
			"reason":  cond.Reason,
			"message": cond.Message,
			"lastTransitionTime": cond.LastTransitionTime.Format(time.RFC3339),
		})
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        job.Name,
		"namespace":   job.Namespace,
		"status":      status,
		"completions": fmt.Sprintf("%d/%s", job.Status.Succeeded, completions),
		"parallelism": parallelism,
		"duration":    duration,
		"active":      job.Status.Active,
		"succeeded":   job.Status.Succeeded,
		"failed":      job.Status.Failed,
		"selector":    selector,
		"labels":      job.Labels,
		"annotations": job.Annotations,
		"age":         formatAge(time.Since(job.CreationTimestamp.Time)),
		"createdAt":   job.CreationTimestamp.Format(time.RFC3339),
		"conditions":  conditions,
		"pods":        pods,
	})
}

// handleJobYAML returns the YAML representation of a job
func (ws *WebServer) handleJobYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "job name required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	job, err := ws.app.clientset.BatchV1().Jobs(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	job.ManagedFields = nil

	yamlData, err := toKubectlYAML(job, schema.GroupVersionKind{Group: "batch", Version: "v1", Kind: "Job"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleJobUpdate updates a job from YAML
func (ws *WebServer) handleJobUpdate(w http.ResponseWriter, r *http.Request) {
	ws.handleResourceUpdate(w, r, "job", func(yamlData []byte, namespace string) error {
		var job batchv1.Job
		if err := yaml.Unmarshal(yamlData, &job); err != nil {
			return fmt.Errorf("failed to unmarshal YAML: %w", err)
		}
		_, err := ws.app.clientset.BatchV1().Jobs(namespace).Update(ws.app.ctx, &job, metav1.UpdateOptions{})
		return err
	})
}

// handleJobDescribe returns kubectl describe output for a job
func (ws *WebServer) handleJobDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Job name is required",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		namespace = ws.app.namespace
	}

	describe, err := runKubectlDescribe("job", name, namespace)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleJobDelete deletes a job
func (ws *WebServer) handleJobDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Job name is required",
		})
		return
	}

	// Delete with propagation policy to clean up pods
	propagationPolicy := metav1.DeletePropagationBackground
	err := ws.app.clientset.BatchV1().Jobs(ws.app.namespace).Delete(ws.app.ctx, name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Job %s deleted successfully", name),
	})
}

// handleNodeDetails returns detailed information about a node
func (ws *WebServer) handleNodeDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	node, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Get node status
	status := "Unknown"
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady {
			if condition.Status == v1.ConditionTrue {
				status = "Ready"
			} else {
				status = "NotReady"
			}
			break
		}
	}

	// Get node roles
	roles := []string{}
	for label := range node.Labels {
		if strings.Contains(label, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(label, "node-role.kubernetes.io/")
			roles = append(roles, role)
		}
	}
	if len(roles) == 0 {
		roles = append(roles, "worker")
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":          true,
		"name":             node.Name,
		"status":           status,
		"roles":            strings.Join(roles, ","),
		"version":          node.Status.NodeInfo.KubeletVersion,
		"osImage":          node.Status.NodeInfo.OSImage,
		"kernelVersion":    node.Status.NodeInfo.KernelVersion,
		"containerRuntime": node.Status.NodeInfo.ContainerRuntimeVersion,
		"cpu":              node.Status.Capacity.Cpu().String(),
		"memory":           node.Status.Capacity.Memory().String(),
		"pods":             node.Status.Capacity.Pods().String(),
		"conditions":       node.Status.Conditions,
		"addresses":        node.Status.Addresses,
		"labels":           node.Labels,
		"annotations":      node.Annotations,
	})
}

// handleNodeYAML returns the YAML representation of a node
func (ws *WebServer) handleNodeYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	node, err := ws.app.clientset.CoreV1().Nodes().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// Remove managed fields for cleaner YAML
	node.ManagedFields = nil

	yamlData, err := toKubectlYAML(node, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Node"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleNodeDescribe returns kubectl describe output for a node
func (ws *WebServer) handleNodeDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Node name is required",
		})
		return
	}

	// Nodes are cluster-scoped, no namespace needed
	describe, err := runKubectlDescribe("node", name, "")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleNamespaces returns list of all namespaces

// handleContexts returns list of all available kubeconfig contexts

// findAvailablePort finds an available port starting from the given port

// SecurityFinding represents a security recommendation
// type SecurityFinding struct {
// 	Severity    string `json:"severity"`    // critical, high, medium, low
// 	Category    string `json:"category"`    // security-context, network-policy, ingress-ports, etc.
// 	Resource    string `json:"resource"`    // resource type (Pod, Deployment, Ingress, etc.)
// 	Name        string `json:"name"`        // resource name
// 	Namespace   string `json:"namespace"`   // namespace
// 	Title       string `json:"title"`       // short description
// 	Description string `json:"description"` // detailed description
// 	Remediation string `json:"remediation"` // how to fix
// }
//
// // handleSecurityAnalysis performs security best practices analysis
// func (ws *WebServer) handleSecurityAnalysis(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	findings := []SecurityFinding{}
// 	namespace := r.URL.Query().Get("namespace")
// 	if namespace == "" {
// 		namespace = ws.app.namespace
// 	}
//
// 	// Use empty string for all namespaces
// 	listNamespace := namespace
// 	if namespace == "_all" {
// 		listNamespace = ""
// 	}
//
// 	// 1. Check Pods for missing SecurityContext
// 	pods, err := ws.app.clientset.CoreV1().Pods(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err == nil {
// 		for _, pod := range pods.Items {
// 			// Skip completed/failed pods
// 			if pod.Status.Phase == v1.PodSucceeded || pod.Status.Phase == v1.PodFailed {
// 				continue
// 			}
//
// 			hasSecurityContext := false
// 			runAsNonRoot := false
// 			readOnlyRootFS := false
// 			privileged := false
// 			allowPrivilegeEscalation := true // default is true
//
// 			// Check pod-level security context
// 			if pod.Spec.SecurityContext != nil {
// 				hasSecurityContext = true
// 				if pod.Spec.SecurityContext.RunAsNonRoot != nil && *pod.Spec.SecurityContext.RunAsNonRoot {
// 					runAsNonRoot = true
// 				}
// 			}
//
// 			// Check container-level security contexts
// 			for _, container := range pod.Spec.Containers {
// 				if container.SecurityContext != nil {
// 					hasSecurityContext = true
// 					if container.SecurityContext.RunAsNonRoot != nil && *container.SecurityContext.RunAsNonRoot {
// 						runAsNonRoot = true
// 					}
// 					if container.SecurityContext.ReadOnlyRootFilesystem != nil && *container.SecurityContext.ReadOnlyRootFilesystem {
// 						readOnlyRootFS = true
// 					}
// 					if container.SecurityContext.Privileged != nil && *container.SecurityContext.Privileged {
// 						privileged = true
// 					}
// 					if container.SecurityContext.AllowPrivilegeEscalation != nil && !*container.SecurityContext.AllowPrivilegeEscalation {
// 						allowPrivilegeEscalation = false
// 					}
// 				}
// 			}
//
// 			// Finding: No SecurityContext at all
// 			if !hasSecurityContext {
// 				findings = append(findings, SecurityFinding{
// 					Severity:    "critical",
// 					Category:    "security-context",
// 					Resource:    "Pod",
// 					Name:        pod.Name,
// 					Namespace:   pod.Namespace,
// 					Title:       "Missing SecurityContext",
// 					Description: "Pod has no SecurityContext defined. This is a critical security risk as containers run with default privileges.",
// 					Remediation: "Add a SecurityContext to the pod or container spec with runAsNonRoot: true, readOnlyRootFilesystem: true, and allowPrivilegeEscalation: false",
// 				})
// 			} else {
// 				// Check individual security settings
// 				if !runAsNonRoot {
// 					findings = append(findings, SecurityFinding{
// 						Severity:    "high",
// 						Category:    "security-context",
// 						Resource:    "Pod",
// 						Name:        pod.Name,
// 						Namespace:   pod.Namespace,
// 						Title:       "Container may run as root",
// 						Description: "Pod does not enforce runAsNonRoot. Containers could run as root user, increasing attack surface.",
// 						Remediation: "Set securityContext.runAsNonRoot: true in the pod or container spec",
// 					})
// 				}
//
// 				if privileged {
// 					findings = append(findings, SecurityFinding{
// 						Severity:    "critical",
// 						Category:    "security-context",
// 						Resource:    "Pod",
// 						Name:        pod.Name,
// 						Namespace:   pod.Namespace,
// 						Title:       "Privileged container detected",
// 						Description: "Container is running in privileged mode. This grants full access to the host system.",
// 						Remediation: "Remove privileged: true from the container securityContext unless absolutely necessary",
// 					})
// 				}
//
// 				if allowPrivilegeEscalation {
// 					findings = append(findings, SecurityFinding{
// 						Severity:    "medium",
// 						Category:    "security-context",
// 						Resource:    "Pod",
// 						Name:        pod.Name,
// 						Namespace:   pod.Namespace,
// 						Title:       "Privilege escalation allowed",
// 						Description: "Container allows privilege escalation. Processes could gain more privileges than their parent.",
// 						Remediation: "Set securityContext.allowPrivilegeEscalation: false",
// 					})
// 				}
//
// 				if !readOnlyRootFS {
// 					findings = append(findings, SecurityFinding{
// 						Severity:    "low",
// 						Category:    "security-context",
// 						Resource:    "Pod",
// 						Name:        pod.Name,
// 						Namespace:   pod.Namespace,
// 						Title:       "Root filesystem is writable",
// 						Description: "Container filesystem is writable. Attackers could modify files if container is compromised.",
// 						Remediation: "Set securityContext.readOnlyRootFilesystem: true and use emptyDir volumes for writable paths",
// 					})
// 				}
// 			}
// 		}
// 	}
//
// 	// 2. Check for missing NetworkPolicies
// 	// Get all namespaces that have pods
// 	namespacesWithPods := make(map[string]bool)
// 	if pods != nil {
// 		for _, pod := range pods.Items {
// 			namespacesWithPods[pod.Namespace] = true
// 		}
// 	}
//
// 	// Check which namespaces have NetworkPolicies
// 	networkPolicies, err := ws.app.clientset.NetworkingV1().NetworkPolicies(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
// 	namespacesWithNetPol := make(map[string]bool)
// 	if err == nil {
// 		for _, np := range networkPolicies.Items {
// 			namespacesWithNetPol[np.Namespace] = true
// 		}
// 	}
//
// 	// Report namespaces without NetworkPolicies
// 	for ns := range namespacesWithPods {
// 		if !namespacesWithNetPol[ns] {
// 			// Skip system namespaces
// 			if ns == "kube-system" || ns == "kube-public" || ns == "kube-node-lease" {
// 				continue
// 			}
// 			findings = append(findings, SecurityFinding{
// 				Severity:    "high",
// 				Category:    "network-policy",
// 				Resource:    "Namespace",
// 				Name:        ns,
// 				Namespace:   ns,
// 				Title:       "No NetworkPolicy defined",
// 				Description: "Namespace has no NetworkPolicy. All pods can communicate with any other pod in the cluster by default.",
// 				Remediation: "Create NetworkPolicies to restrict ingress and egress traffic. Start with a default-deny policy.",
// 			})
// 		}
// 	}
//
// 	// 3. Check Ingresses for insecure ports
// 	ingresses, err := ws.app.clientset.NetworkingV1().Ingresses(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err == nil {
// 		insecurePorts := map[int32]string{
// 			80:   "HTTP (unencrypted)",
// 			8080: "Common HTTP alternative (unencrypted)",
// 			8000: "Common development port",
// 			3000: "Common development port",
// 		}
//
// 		for _, ing := range ingresses.Items {
// 			// Check if TLS is configured
// 			hasTLS := len(ing.Spec.TLS) > 0
//
// 			for _, rule := range ing.Spec.Rules {
// 				if rule.HTTP != nil {
// 					for _, path := range rule.HTTP.Paths {
// 						port := path.Backend.Service.Port.Number
// 						if portDesc, isInsecure := insecurePorts[port]; isInsecure {
// 							severity := "medium"
// 							if port == 80 || port == 8080 {
// 								severity = "high"
// 							}
// 							findings = append(findings, SecurityFinding{
// 								Severity:    severity,
// 								Category:    "ingress-ports",
// 								Resource:    "Ingress",
// 								Name:        ing.Name,
// 								Namespace:   ing.Namespace,
// 								Title:       fmt.Sprintf("Using port %d (%s)", port, portDesc),
// 								Description: fmt.Sprintf("Ingress routes traffic to port %d. Using default or well-known ports can be a security risk.", port),
// 								Remediation: "Consider using non-standard ports and ensure TLS termination is configured",
// 							})
// 						}
// 					}
// 				}
// 			}
//
// 			// Check for missing TLS
// 			if !hasTLS {
// 				findings = append(findings, SecurityFinding{
// 					Severity:    "high",
// 					Category:    "ingress-tls",
// 					Resource:    "Ingress",
// 					Name:        ing.Name,
// 					Namespace:   ing.Namespace,
// 					Title:       "No TLS configured",
// 					Description: "Ingress does not have TLS configured. Traffic may be transmitted unencrypted.",
// 					Remediation: "Configure TLS in the Ingress spec with a valid certificate",
// 				})
// 			}
// 		}
// 	}
//
// 	// 4. Check Services for NodePort exposure
// 	services, err := ws.app.clientset.CoreV1().Services(listNamespace).List(ws.app.ctx, metav1.ListOptions{})
// 	if err == nil {
// 		for _, svc := range services.Items {
// 			if svc.Spec.Type == v1.ServiceTypeNodePort {
// 				findings = append(findings, SecurityFinding{
// 					Severity:    "medium",
// 					Category:    "service-exposure",
// 					Resource:    "Service",
// 					Name:        svc.Name,
// 					Namespace:   svc.Namespace,
// 					Title:       "NodePort service exposed",
// 					Description: "Service is exposed via NodePort, making it accessible on all cluster nodes.",
// 					Remediation: "Consider using LoadBalancer or Ingress with proper access controls instead of NodePort",
// 				})
// 			}
//
// 			if svc.Spec.Type == v1.ServiceTypeLoadBalancer {
// 				// Check if external traffic policy is set to Local
// 				if svc.Spec.ExternalTrafficPolicy != v1.ServiceExternalTrafficPolicyTypeLocal {
// 					findings = append(findings, SecurityFinding{
// 						Severity:    "low",
// 						Category:    "service-exposure",
// 						Resource:    "Service",
// 						Name:        svc.Name,
// 						Namespace:   svc.Namespace,
// 						Title:       "External traffic policy not optimized",
// 						Description: "LoadBalancer service uses Cluster external traffic policy. Client source IP is not preserved.",
// 						Remediation: "Set externalTrafficPolicy: Local to preserve client source IP for security logging",
// 					})
// 				}
// 			}
// 		}
// 	}
//
// 	// Calculate summary statistics
// 	summary := map[string]int{
// 		"critical": 0,
// 		"high":     0,
// 		"medium":   0,
// 		"low":      0,
// 		"total":    len(findings),
// 	}
//
// 	for _, f := range findings {
// 		summary[f.Severity]++
// 	}
//
// 	// Calculate security score (0-100)
// 	// Weight: critical=40, high=25, medium=10, low=5
// 	totalWeight := summary["critical"]*40 + summary["high"]*25 + summary["medium"]*10 + summary["low"]*5
// 	maxScore := 100
// 	score := maxScore - totalWeight
// 	if score < 0 {
// 		score = 0
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":  true,
// 		"findings": findings,
// 		"summary":  summary,
// 		"score":    score,
// 	})
// }

// HelmRelease represents a Helm release
// type HelmRelease struct {
// 	Name       string `json:"name"`
// 	Namespace  string `json:"namespace"`
// 	Revision   int    `json:"revision"`
// 	Status     string `json:"status"`
// 	Chart      string `json:"chart"`
// 	AppVersion string `json:"appVersion"`
// 	Updated    string `json:"updated"`
// }
//
// // handleHelmReleases returns all Helm releases in the cluster
// func (ws *WebServer) handleHelmReleases(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
//
// 	var releases []HelmRelease
//
// 	// Helm stores releases as secrets with owner=helm label
// 	listOptions := metav1.ListOptions{
// 		LabelSelector: "owner=helm",
// 	}
//
// 	var secrets *v1.SecretList
// 	var err error
//
// 	if namespace == "" || namespace == "All Namespaces" {
// 		secrets, err = ws.app.clientset.CoreV1().Secrets("").List(ws.app.ctx, listOptions)
// 	} else {
// 		secrets, err = ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
// 	}
//
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	// Parse Helm secrets to extract release information
// 	releaseMap := make(map[string]*HelmRelease)
//
// 	for _, secret := range secrets.Items {
// 		// Get release name from label
// 		releaseName := secret.Labels["name"]
// 		if releaseName == "" {
// 			continue
// 		}
//
// 		// Get status from label
// 		status := secret.Labels["status"]
// 		if status == "" {
// 			status = "unknown"
// 		}
//
// 		// Get version/revision
// 		versionStr := secret.Labels["version"]
// 		version := 1
// 		if versionStr != "" {
// 			if v, err := strconv.Atoi(versionStr); err == nil {
// 				version = v
// 			}
// 		}
//
// 		key := fmt.Sprintf("%s/%s", secret.Namespace, releaseName)
//
// 		// Keep only the latest revision
// 		if existing, ok := releaseMap[key]; ok {
// 			if version > existing.Revision {
// 				releaseMap[key] = &HelmRelease{
// 					Name:      releaseName,
// 					Namespace: secret.Namespace,
// 					Revision:  version,
// 					Status:    status,
// 					Chart:     extractChartName(secret.Data),
// 					Updated:   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
// 				}
// 			}
// 		} else {
// 			releaseMap[key] = &HelmRelease{
// 				Name:      releaseName,
// 				Namespace: secret.Namespace,
// 				Revision:  version,
// 				Status:    status,
// 				Chart:     extractChartName(secret.Data),
// 				Updated:   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
// 			}
// 		}
// 	}
//
// 	// Convert map to slice
// 	for _, release := range releaseMap {
// 		releases = append(releases, *release)
// 	}
//
// 	// Sort by namespace then name
// 	sort.Slice(releases, func(i, j int) bool {
// 		if releases[i].Namespace != releases[j].Namespace {
// 			return releases[i].Namespace < releases[j].Namespace
// 		}
// 		return releases[i].Name < releases[j].Name
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":  true,
// 		"releases": releases,
// 		"count":    len(releases),
// 	})
// }
//
// // extractChartName tries to extract chart name from Helm secret data
// func extractChartName(data map[string][]byte) string {
// 	// Helm 3 stores release data in a "release" key, gzip compressed and base64 encoded
// 	// For simplicity, we'll just return a placeholder
// 	// Full implementation would decode and decompress the data
// 	return "chart"
// }
//
// // handleHelmReleaseDetails returns details for a specific Helm release
// func (ws *WebServer) handleHelmReleaseDetails(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	name := r.URL.Query().Get("name")
// 	namespace := r.URL.Query().Get("namespace")
//
// 	if name == "" || namespace == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name and namespace are required",
// 		})
// 		return
// 	}
//
// 	// Get all secrets for this release
// 	listOptions := metav1.ListOptions{
// 		LabelSelector: fmt.Sprintf("owner=helm,name=%s", name),
// 	}
//
// 	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	var history []map[string]interface{}
// 	for _, secret := range secrets.Items {
// 		versionStr := secret.Labels["version"]
// 		version := 1
// 		if versionStr != "" {
// 			if v, err := strconv.Atoi(versionStr); err == nil {
// 				version = v
// 			}
// 		}
//
// 		history = append(history, map[string]interface{}{
// 			"revision":  version,
// 			"status":    secret.Labels["status"],
// 			"updated":   secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
// 			"createdAt": secret.CreationTimestamp,
// 		})
// 	}
//
// 	// Sort by revision descending
// 	sort.Slice(history, func(i, j int) bool {
// 		return history[i]["revision"].(int) > history[j]["revision"].(int)
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":   true,
// 		"name":      name,
// 		"namespace": namespace,
// 		"history":   history,
// 	})
// }
//
// // handleHelmReleaseHistory returns the full history for a Helm release
// func (ws *WebServer) handleHelmReleaseHistory(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	name := r.URL.Query().Get("name")
// 	namespace := r.URL.Query().Get("namespace")
//
// 	if name == "" || namespace == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name and namespace are required",
// 		})
// 		return
// 	}
//
// 	// Get all secrets for this release
// 	listOptions := metav1.ListOptions{
// 		LabelSelector: fmt.Sprintf("owner=helm,name=%s", name),
// 	}
//
// 	secrets, err := ws.app.clientset.CoreV1().Secrets(namespace).List(ws.app.ctx, listOptions)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	var history []map[string]interface{}
// 	for _, secret := range secrets.Items {
// 		versionStr := secret.Labels["version"]
// 		version := 1
// 		if versionStr != "" {
// 			if v, err := strconv.Atoi(versionStr); err == nil {
// 				version = v
// 			}
// 		}
//
// 		// Get chart info from secret data
// 		chart := "unknown"
// 		appVersion := ""
// 		description := ""
//
// 		// Try to decode the release data
// 		if releaseData, ok := secret.Data["release"]; ok {
// 			// Helm stores release data as base64 + gzip + protobuf
// 			// For simplicity, we'll just get what we can from labels
// 			_ = releaseData
// 		}
//
// 		history = append(history, map[string]interface{}{
// 			"revision":    version,
// 			"status":      secret.Labels["status"],
// 			"chart":       chart,
// 			"appVersion":  appVersion,
// 			"description": description,
// 			"updated":     secret.CreationTimestamp.Format("2006-01-02 15:04:05"),
// 			"createdAt":   secret.CreationTimestamp,
// 		})
// 	}
//
// 	// Sort by revision descending
// 	sort.Slice(history, func(i, j int) bool {
// 		return history[i]["revision"].(int) > history[j]["revision"].(int)
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":   true,
// 		"name":      name,
// 		"namespace": namespace,
// 		"history":   history,
// 		"total":     len(history),
// 	})
// }
//
// // handleHelmRollback rolls back a Helm release to a specific revision
// func (ws *WebServer) handleHelmRollback(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if r.Method != "POST" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Method not allowed",
// 		})
// 		return
// 	}
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	// Parse request body
// 	var req struct {
// 		Name      string `json:"name"`
// 		Namespace string `json:"namespace"`
// 		Revision  int    `json:"revision"`
// 	}
//
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Invalid request body: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	if req.Name == "" || req.Namespace == "" || req.Revision == 0 {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name, namespace, and revision are required",
// 		})
// 		return
// 	}
//
// 	// Execute helm rollback command
// 	cmd := exec.Command("helm", "rollback", req.Name, strconv.Itoa(req.Revision), "-n", req.Namespace)
// 	output, err := cmd.CombinedOutput()
//
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   fmt.Sprintf("Rollback failed: %s - %s", err.Error(), string(output)),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":  true,
// 		"message":  fmt.Sprintf("Successfully rolled back %s to revision %d", req.Name, req.Revision),
// 		"output":   string(output),
// 		"name":     req.Name,
// 		"revision": req.Revision,
// 	})
// }
//
// // KustomizeResource represents a resource managed by Kustomize
// type KustomizeResource struct {
// 	Kind      string            `json:"kind"`
// 	Name      string            `json:"name"`
// 	Namespace string            `json:"namespace"`
// 	Age       string            `json:"age"`
// 	Labels    map[string]string `json:"labels"`
// }
//
// // handleKustomizeResources returns resources managed by Kustomize
// func (ws *WebServer) handleKustomizeResources(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.clientset == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
//
// 	var resources []KustomizeResource
//
// 	// Query deployments with kustomize managed-by label
// 	deploymentListOptions := metav1.ListOptions{
// 		LabelSelector: "app.kubernetes.io/managed-by=kustomize",
// 	}
//
// 	var deployments interface{}
// 	var err error
//
// 	if namespace == "" || namespace == "All Namespaces" {
// 		deployments, err = ws.app.clientset.AppsV1().Deployments("").List(ws.app.ctx, deploymentListOptions)
// 	} else {
// 		deployments, err = ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, deploymentListOptions)
// 	}
//
// 	if err == nil {
// 		if depList, ok := deployments.(*appsv1.DeploymentList); ok {
// 			for _, dep := range depList.Items {
// 				resources = append(resources, KustomizeResource{
// 					Kind:      "Deployment",
// 					Name:      dep.Name,
// 					Namespace: dep.Namespace,
// 					Age:       formatAge(time.Since(dep.CreationTimestamp.Time)),
// 					Labels:    dep.Labels,
// 				})
// 			}
// 		}
// 	}
//
// 	// Query services with kustomize managed-by label
// 	if namespace == "" || namespace == "All Namespaces" {
// 		svcList, err := ws.app.clientset.CoreV1().Services("").List(ws.app.ctx, deploymentListOptions)
// 		if err == nil {
// 			for _, svc := range svcList.Items {
// 				resources = append(resources, KustomizeResource{
// 					Kind:      "Service",
// 					Name:      svc.Name,
// 					Namespace: svc.Namespace,
// 					Age:       formatAge(time.Since(svc.CreationTimestamp.Time)),
// 					Labels:    svc.Labels,
// 				})
// 			}
// 		}
// 	} else {
// 		svcList, err := ws.app.clientset.CoreV1().Services(namespace).List(ws.app.ctx, deploymentListOptions)
// 		if err == nil {
// 			for _, svc := range svcList.Items {
// 				resources = append(resources, KustomizeResource{
// 					Kind:      "Service",
// 					Name:      svc.Name,
// 					Namespace: svc.Namespace,
// 					Age:       formatAge(time.Since(svc.CreationTimestamp.Time)),
// 					Labels:    svc.Labels,
// 				})
// 			}
// 		}
// 	}
//
// 	// Query ConfigMaps with kustomize managed-by label
// 	if namespace == "" || namespace == "All Namespaces" {
// 		cmList, err := ws.app.clientset.CoreV1().ConfigMaps("").List(ws.app.ctx, deploymentListOptions)
// 		if err == nil {
// 			for _, cm := range cmList.Items {
// 				resources = append(resources, KustomizeResource{
// 					Kind:      "ConfigMap",
// 					Name:      cm.Name,
// 					Namespace: cm.Namespace,
// 					Age:       formatAge(time.Since(cm.CreationTimestamp.Time)),
// 					Labels:    cm.Labels,
// 				})
// 			}
// 		}
// 	} else {
// 		cmList, err := ws.app.clientset.CoreV1().ConfigMaps(namespace).List(ws.app.ctx, deploymentListOptions)
// 		if err == nil {
// 			for _, cm := range cmList.Items {
// 				resources = append(resources, KustomizeResource{
// 					Kind:      "ConfigMap",
// 					Name:      cm.Name,
// 					Namespace: cm.Namespace,
// 					Age:       formatAge(time.Since(cm.CreationTimestamp.Time)),
// 					Labels:    cm.Labels,
// 				})
// 			}
// 		}
// 	}
//
// 	// Sort by namespace then kind then name
// 	sort.Slice(resources, func(i, j int) bool {
// 		if resources[i].Namespace != resources[j].Namespace {
// 			return resources[i].Namespace < resources[j].Namespace
// 		}
// 		if resources[i].Kind != resources[j].Kind {
// 			return resources[i].Kind < resources[j].Kind
// 		}
// 		return resources[i].Name < resources[j].Name
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":   true,
// 		"resources": resources,
// 		"count":     len(resources),
// 	})
// }
//
// // ArgoCDApp represents an ArgoCD Application
// type ArgoCDApp struct {
// 	Name       string `json:"name"`
// 	Namespace  string `json:"namespace"`
// 	Project    string `json:"project"`
// 	SyncStatus string `json:"syncStatus"`
// 	Health     string `json:"health"`
// 	RepoURL    string `json:"repoURL"`
// 	Path       string `json:"path"`
// 	Revision   string `json:"revision"`
// 	Cluster    string `json:"cluster"`
// 	Age        string `json:"age"`
// }
//
// // handleArgoCDApps returns ArgoCD Applications
// func (ws *WebServer) handleArgoCDApps(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.config == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   false,
// 			"error":     "Not connected to cluster",
// 			"installed": false,
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   false,
// 			"error":     err.Error(),
// 			"installed": false,
// 		})
// 		return
// 	}
//
// 	// ArgoCD Application GVR
// 	appGVR := schema.GroupVersionResource{
// 		Group:    "argoproj.io",
// 		Version:  "v1alpha1",
// 		Resource: "applications",
// 	}
//
// 	var apps []ArgoCDApp
// 	var appList *unstructured.UnstructuredList
//
// 	if namespace == "" || namespace == "All Namespaces" {
// 		appList, err = dynamicClient.Resource(appGVR).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
// 	} else {
// 		appList, err = dynamicClient.Resource(appGVR).Namespace(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 	}
//
// 	if err != nil {
// 		// Check if ArgoCD is not installed
// 		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "no matches") {
// 			json.NewEncoder(w).Encode(map[string]interface{}{
// 				"success":   true,
// 				"apps":      []ArgoCDApp{},
// 				"count":     0,
// 				"installed": false,
// 				"message":   "ArgoCD is not installed in this cluster",
// 			})
// 			return
// 		}
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   false,
// 			"error":     err.Error(),
// 			"installed": false,
// 		})
// 		return
// 	}
//
// 	for _, item := range appList.Items {
// 		spec, _, _ := unstructured.NestedMap(item.Object, "spec")
// 		status, _, _ := unstructured.NestedMap(item.Object, "status")
//
// 		syncStatus := "Unknown"
// 		health := "Unknown"
//
// 		if syncStatusMap, ok := status["sync"].(map[string]interface{}); ok {
// 			if s, ok := syncStatusMap["status"].(string); ok {
// 				syncStatus = s
// 			}
// 		}
//
// 		if healthMap, ok := status["health"].(map[string]interface{}); ok {
// 			if h, ok := healthMap["status"].(string); ok {
// 				health = h
// 			}
// 		}
//
// 		project := "default"
// 		if p, ok := spec["project"].(string); ok {
// 			project = p
// 		}
//
// 		repoURL := ""
// 		path := ""
// 		revision := ""
// 		if source, ok := spec["source"].(map[string]interface{}); ok {
// 			if r, ok := source["repoURL"].(string); ok {
// 				repoURL = r
// 			}
// 			if p, ok := source["path"].(string); ok {
// 				path = p
// 			}
// 			if rev, ok := source["targetRevision"].(string); ok {
// 				revision = rev
// 			}
// 		}
//
// 		cluster := ""
// 		if dest, ok := spec["destination"].(map[string]interface{}); ok {
// 			if s, ok := dest["server"].(string); ok {
// 				cluster = s
// 			} else if n, ok := dest["name"].(string); ok {
// 				cluster = n
// 			}
// 		}
//
// 		creationTime := item.GetCreationTimestamp()
//
// 		apps = append(apps, ArgoCDApp{
// 			Name:       item.GetName(),
// 			Namespace:  item.GetNamespace(),
// 			Project:    project,
// 			SyncStatus: syncStatus,
// 			Health:     health,
// 			RepoURL:    repoURL,
// 			Path:       path,
// 			Revision:   revision,
// 			Cluster:    cluster,
// 			Age:        formatAge(time.Since(creationTime.Time)),
// 		})
// 	}
//
// 	// Sort by namespace then name
// 	sort.Slice(apps, func(i, j int) bool {
// 		if apps[i].Namespace != apps[j].Namespace {
// 			return apps[i].Namespace < apps[j].Namespace
// 		}
// 		return apps[i].Name < apps[j].Name
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":   true,
// 		"apps":      apps,
// 		"count":     len(apps),
// 		"installed": true,
// 	})
// }
//
// // handleArgoCDAppDetails returns details for a specific ArgoCD Application
// func (ws *WebServer) handleArgoCDAppDetails(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.config == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	name := r.URL.Query().Get("name")
// 	namespace := r.URL.Query().Get("namespace")
//
// 	if name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name is required",
// 		})
// 		return
// 	}
//
// 	// Default to argocd namespace if not specified
// 	if namespace == "" {
// 		namespace = "argocd"
// 	}
//
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	appGVR := schema.GroupVersionResource{
// 		Group:    "argoproj.io",
// 		Version:  "v1alpha1",
// 		Resource: "applications",
// 	}
//
// 	app, err := dynamicClient.Resource(appGVR).Namespace(namespace).Get(ws.app.ctx, name, metav1.GetOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	// Get detailed info
// 	spec, _, _ := unstructured.NestedMap(app.Object, "spec")
// 	status, _, _ := unstructured.NestedMap(app.Object, "status")
//
// 	// Extract sync history
// 	var syncHistory []map[string]interface{}
// 	if history, found, _ := unstructured.NestedSlice(status, "history"); found {
// 		for _, h := range history {
// 			if hMap, ok := h.(map[string]interface{}); ok {
// 				syncHistory = append(syncHistory, map[string]interface{}{
// 					"id":         hMap["id"],
// 					"revision":   hMap["revision"],
// 					"deployedAt": hMap["deployedAt"],
// 					"source":     hMap["source"],
// 				})
// 			}
// 		}
// 	}
//
// 	// Extract resource status
// 	var resources []map[string]interface{}
// 	if res, found, _ := unstructured.NestedSlice(status, "resources"); found {
// 		for _, r := range res {
// 			if rMap, ok := r.(map[string]interface{}); ok {
// 				resources = append(resources, map[string]interface{}{
// 					"kind":      rMap["kind"],
// 					"name":      rMap["name"],
// 					"namespace": rMap["namespace"],
// 					"status":    rMap["status"],
// 					"health":    rMap["health"],
// 				})
// 			}
// 		}
// 	}
//
// 	// Get conditions
// 	var conditions []map[string]interface{}
// 	if conds, found, _ := unstructured.NestedSlice(status, "conditions"); found {
// 		for _, c := range conds {
// 			if cMap, ok := c.(map[string]interface{}); ok {
// 				conditions = append(conditions, map[string]interface{}{
// 					"type":    cMap["type"],
// 					"status":  cMap["status"],
// 					"message": cMap["message"],
// 				})
// 			}
// 		}
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":      true,
// 		"name":         app.GetName(),
// 		"namespace":    app.GetNamespace(),
// 		"spec":         spec,
// 		"status":       status,
// 		"history":      syncHistory,
// 		"resources":    resources,
// 		"conditions":   conditions,
// 		"historyCount": len(syncHistory),
// 	})
// }
//
// // handleArgoCDSync triggers a sync for an ArgoCD Application
// func (ws *WebServer) handleArgoCDSync(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if r.Method != "POST" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Method not allowed",
// 		})
// 		return
// 	}
//
// 	if ws.app.config == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	// Parse request body
// 	var req struct {
// 		Name      string `json:"name"`
// 		Namespace string `json:"namespace"`
// 		Prune     bool   `json:"prune"`
// 	}
//
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Invalid request body: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	if req.Name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name is required",
// 		})
// 		return
// 	}
//
// 	// Default to argocd namespace if not specified
// 	if req.Namespace == "" {
// 		req.Namespace = "argocd"
// 	}
//
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	appGVR := schema.GroupVersionResource{
// 		Group:    "argoproj.io",
// 		Version:  "v1alpha1",
// 		Resource: "applications",
// 	}
//
// 	// Get current app
// 	app, err := dynamicClient.Resource(appGVR).Namespace(req.Namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Failed to get application: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	// Set operation to trigger sync
// 	operation := map[string]interface{}{
// 		"sync": map[string]interface{}{
// 			"prune": req.Prune,
// 		},
// 	}
// 	unstructured.SetNestedMap(app.Object, operation, "operation")
//
// 	// Update the application to trigger sync
// 	_, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Update(ws.app.ctx, app, metav1.UpdateOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Failed to trigger sync: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success": true,
// 		"message": fmt.Sprintf("Sync triggered for %s", req.Name),
// 		"name":    req.Name,
// 	})
// }
//
// // handleArgoCDRefresh triggers a refresh for an ArgoCD Application
// func (ws *WebServer) handleArgoCDRefresh(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if r.Method != "POST" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Method not allowed",
// 		})
// 		return
// 	}
//
// 	if ws.app.config == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Not connected to cluster",
// 		})
// 		return
// 	}
//
// 	// Parse request body
// 	var req struct {
// 		Name      string `json:"name"`
// 		Namespace string `json:"namespace"`
// 		Hard      bool   `json:"hard"`
// 	}
//
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Invalid request body: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	if req.Name == "" {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "name is required",
// 		})
// 		return
// 	}
//
// 	// Default to argocd namespace if not specified
// 	if req.Namespace == "" {
// 		req.Namespace = "argocd"
// 	}
//
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   err.Error(),
// 		})
// 		return
// 	}
//
// 	appGVR := schema.GroupVersionResource{
// 		Group:    "argoproj.io",
// 		Version:  "v1alpha1",
// 		Resource: "applications",
// 	}
//
// 	// Get current app
// 	app, err := dynamicClient.Resource(appGVR).Namespace(req.Namespace).Get(ws.app.ctx, req.Name, metav1.GetOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Failed to get application: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	// Update refresh annotation to trigger refresh
// 	annotations := app.GetAnnotations()
// 	if annotations == nil {
// 		annotations = make(map[string]string)
// 	}
//
// 	if req.Hard {
// 		annotations["argocd.argoproj.io/refresh"] = "hard"
// 	} else {
// 		annotations["argocd.argoproj.io/refresh"] = "normal"
// 	}
// 	app.SetAnnotations(annotations)
//
// 	// Update the application to trigger refresh
// 	_, err = dynamicClient.Resource(appGVR).Namespace(req.Namespace).Update(ws.app.ctx, app, metav1.UpdateOptions{})
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success": false,
// 			"error":   "Failed to trigger refresh: " + err.Error(),
// 		})
// 		return
// 	}
//
// 	refreshType := "normal"
// 	if req.Hard {
// 		refreshType = "hard"
// 	}
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":     true,
// 		"message":     fmt.Sprintf("Refresh (%s) triggered for %s", refreshType, req.Name),
// 		"name":        req.Name,
// 		"refreshType": refreshType,
// 	})
// }
//
// // FluxResource represents a Flux resource (Kustomization, HelmRelease, GitRepository, etc.)
// type FluxResource struct {
// 	Kind      string `json:"kind"`
// 	Name      string `json:"name"`
// 	Namespace string `json:"namespace"`
// 	Ready     string `json:"ready"`
// 	Status    string `json:"status"`
// 	Age       string `json:"age"`
// 	SourceRef string `json:"sourceRef,omitempty"`
// 	Revision  string `json:"revision,omitempty"`
// }
//
// // handleFluxResources returns Flux resources
// func (ws *WebServer) handleFluxResources(w http.ResponseWriter, r *http.Request) {
// 	w.Header().Set("Content-Type", "application/json")
//
// 	if ws.app.config == nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   false,
// 			"error":     "Not connected to cluster",
// 			"installed": false,
// 		})
// 		return
// 	}
//
// 	namespace := r.URL.Query().Get("namespace")
//
// 	// Create dynamic client for CRD access
// 	dynamicClient, err := dynamic.NewForConfig(ws.app.config)
// 	if err != nil {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   false,
// 			"error":     err.Error(),
// 			"installed": false,
// 		})
// 		return
// 	}
//
// 	var resources []FluxResource
// 	fluxInstalled := false
//
// 	// Flux CRD definitions
// 	fluxCRDs := []struct {
// 		group    string
// 		version  string
// 		resource string
// 		kind     string
// 	}{
// 		{"kustomize.toolkit.fluxcd.io", "v1", "kustomizations", "Kustomization"},
// 		{"helm.toolkit.fluxcd.io", "v2", "helmreleases", "HelmRelease"},
// 		{"source.toolkit.fluxcd.io", "v1", "gitrepositories", "GitRepository"},
// 		{"source.toolkit.fluxcd.io", "v1", "helmrepositories", "HelmRepository"},
// 		{"source.toolkit.fluxcd.io", "v1", "ocirepositories", "OCIRepository"},
// 	}
//
// 	for _, crd := range fluxCRDs {
// 		gvr := schema.GroupVersionResource{
// 			Group:    crd.group,
// 			Version:  crd.version,
// 			Resource: crd.resource,
// 		}
//
// 		var list *unstructured.UnstructuredList
// 		if namespace == "" || namespace == "All Namespaces" {
// 			list, err = dynamicClient.Resource(gvr).Namespace("").List(ws.app.ctx, metav1.ListOptions{})
// 		} else {
// 			list, err = dynamicClient.Resource(gvr).Namespace(namespace).List(ws.app.ctx, metav1.ListOptions{})
// 		}
//
// 		if err != nil {
// 			// CRD not found, skip
// 			continue
// 		}
//
// 		fluxInstalled = true
//
// 		for _, item := range list.Items {
// 			ready := "Unknown"
// 			statusMsg := ""
// 			revision := ""
// 			sourceRef := ""
//
// 			// Get status conditions
// 			if status, ok := item.Object["status"].(map[string]interface{}); ok {
// 				if conditions, ok := status["conditions"].([]interface{}); ok {
// 					for _, cond := range conditions {
// 						if condMap, ok := cond.(map[string]interface{}); ok {
// 							if condType, _ := condMap["type"].(string); condType == "Ready" {
// 								if condStatus, _ := condMap["status"].(string); condStatus == "True" {
// 									ready = "True"
// 								} else {
// 									ready = "False"
// 								}
// 								if msg, _ := condMap["message"].(string); msg != "" {
// 									statusMsg = msg
// 									// Truncate long messages
// 									if len(statusMsg) > 50 {
// 										statusMsg = statusMsg[:47] + "..."
// 									}
// 								}
// 								break
// 							}
// 						}
// 					}
// 				}
//
// 				// Get last applied revision
// 				if rev, ok := status["lastAppliedRevision"].(string); ok {
// 					revision = rev
// 				} else if rev, ok := status["artifact"].(map[string]interface{}); ok {
// 					if r, ok := rev["revision"].(string); ok {
// 						revision = r
// 					}
// 				}
// 			}
//
// 			// Get source reference for Kustomizations and HelmReleases
// 			if spec, ok := item.Object["spec"].(map[string]interface{}); ok {
// 				if sr, ok := spec["sourceRef"].(map[string]interface{}); ok {
// 					kind, _ := sr["kind"].(string)
// 					name, _ := sr["name"].(string)
// 					sourceRef = fmt.Sprintf("%s/%s", kind, name)
// 				}
// 			}
//
// 			creationTime := item.GetCreationTimestamp()
//
// 			resources = append(resources, FluxResource{
// 				Kind:      crd.kind,
// 				Name:      item.GetName(),
// 				Namespace: item.GetNamespace(),
// 				Ready:     ready,
// 				Status:    statusMsg,
// 				Age:       formatAge(time.Since(creationTime.Time)),
// 				SourceRef: sourceRef,
// 				Revision:  revision,
// 			})
// 		}
// 	}
//
// 	if !fluxInstalled {
// 		json.NewEncoder(w).Encode(map[string]interface{}{
// 			"success":   true,
// 			"resources": []FluxResource{},
// 			"count":     0,
// 			"installed": false,
// 			"message":   "Flux is not installed in this cluster",
// 		})
// 		return
// 	}
//
// 	// Sort by kind then namespace then name
// 	sort.Slice(resources, func(i, j int) bool {
// 		if resources[i].Kind != resources[j].Kind {
// 			return resources[i].Kind < resources[j].Kind
// 		}
// 		if resources[i].Namespace != resources[j].Namespace {
// 			return resources[i].Namespace < resources[j].Namespace
// 		}
// 		return resources[i].Name < resources[j].Name
// 	})
//
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"success":   true,
// 		"resources": resources,
// 		"count":     len(resources),
// 		"installed": true,
// 	})
// }

// findAvailablePortLocalhost finds an available port on localhost only
func findAvailablePortLocalhost(startPort int) (int, error) {
	for port := startPort; port < startPort+100; port++ {
		// Try IPv4 localhost
		listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err == nil {
			listener.Close()
			return port, nil
		}
		// Try IPv6 localhost
		listener, err = net.Listen("tcp", fmt.Sprintf("[::1]:%d", port))
		if err == nil {
			listener.Close()
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available port found in range %d-%d", startPort, startPort+100)
}

// handleValidateSessionToken validates the initial session token and creates a session cookie
func (ws *WebServer) handleValidateSessionToken(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	token := r.URL.Query().Get("token")
	if token == "" {
		// Try from POST body
		var req struct {
			Token string `json:"token"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil {
			token = req.Token
		}
	}

	if token == "" {
		http.Error(w, "token required", http.StatusBadRequest)
		return
	}

	// Validate and consume token
	if !ws.sessionTokenManager.ValidateAndConsumeToken(token) {
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Generate session ID for cookie
	sessionID := fmt.Sprintf("kubegraf_session_%d", time.Now().UnixNano())

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "kubegraf_session",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
		MaxAge:   86400, // 24 hours
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Session token validated",
	})
}

// handleWithSessionToken wraps a handler with session token validation for initial access
func (ws *WebServer) handleWithSessionToken(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if user already has a valid session cookie
		cookie, err := r.Cookie("kubegraf_session")
		if err == nil && cookie != nil && cookie.Value != "" {
			// User has session cookie, allow access
			next(w, r)
			return
		}

		// Check for token in query parameter (initial access)
		token := r.URL.Query().Get("token")
		if token != "" {
			// Validate token
			if ws.sessionTokenManager.ValidateAndConsumeToken(token) {
				// Generate session ID
				sessionID := fmt.Sprintf("kubegraf_session_%d", time.Now().UnixNano())

				// Set session cookie
				http.SetCookie(w, &http.Cookie{
					Name:     "kubegraf_session",
					Value:    sessionID,
					Path:     "/",
					HttpOnly: true,
					Secure:   false,
					SameSite: http.SameSiteStrictMode,
					MaxAge:   86400,
				})

				// Redirect to remove token from URL
				redirectURL := r.URL.Path
				if r.URL.RawQuery != "" {
					// Remove token from query
					values := r.URL.Query()
					values.Del("token")
					if len(values) > 0 {
						redirectURL += "?" + values.Encode()
					}
				}
				http.Redirect(w, r, redirectURL, http.StatusFound)
				return
			}
		}

		// For localhost access, be more lenient - allow access but set a session cookie
		// This provides security while maintaining good UX
		host := r.Host
		if strings.HasPrefix(host, "127.0.0.1") || strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "[::1]") {
			// Generate session ID for localhost access
			sessionID := fmt.Sprintf("kubegraf_session_%d", time.Now().UnixNano())

			// Set session cookie
			http.SetCookie(w, &http.Cookie{
				Name:     "kubegraf_session",
				Value:    sessionID,
				Path:     "/",
				HttpOnly: true,
				Secure:   false,
				SameSite: http.SameSiteStrictMode,
				MaxAge:   86400,
			})

			// Allow access for localhost
			next(w, r)
			return
		}

		// For non-localhost access, require token
		http.Error(w, "Unauthorized: Valid session token required. Please access the app using the URL provided when starting the server.", http.StatusUnauthorized)
	}
}

// ============ Bulk Operations ============

// handleBulkDeploymentRestart restarts all deployments in a namespace
func (ws *WebServer) handleBulkDeploymentRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	deployments, err := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	restarted := []string{}
	failed := []map[string]string{}
	restartTime := time.Now().Format(time.RFC3339)

	for _, dep := range deployments.Items {
		annotations := make(map[string]string)
		if dep.Spec.Template.Annotations != nil {
			for k, v := range dep.Spec.Template.Annotations {
				annotations[k] = v
			}
		}
		annotations["kubectl.kubernetes.io/restartedAt"] = restartTime

		patchData := map[string]interface{}{
			"spec": map[string]interface{}{
				"template": map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": annotations,
					},
				},
			},
		}
		patchBytes, _ := json.Marshal(patchData)

		_, err := ws.app.clientset.AppsV1().Deployments(namespace).Patch(
			ws.app.ctx,
			dep.Name,
			types.StrategicMergePatchType,
			patchBytes,
			metav1.PatchOptions{},
		)
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  dep.Name,
				"error": err.Error(),
			})
		} else {
			restarted = append(restarted, dep.Name)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"restarted": restarted,
		"failed":    failed,
		"total":     len(deployments.Items),
		"message":   fmt.Sprintf("Restarted %d/%d deployments in namespace %s", len(restarted), len(deployments.Items), namespace),
	})
}

// handleBulkDeploymentDelete deletes all deployments in a namespace
func (ws *WebServer) handleBulkDeploymentDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	deployments, err := ws.app.clientset.AppsV1().Deployments(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	deleted := []string{}
	failed := []map[string]string{}

	for _, dep := range deployments.Items {
		err := ws.app.clientset.AppsV1().Deployments(namespace).Delete(ws.app.ctx, dep.Name, metav1.DeleteOptions{})
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  dep.Name,
				"error": err.Error(),
			})
		} else {
			deleted = append(deleted, dep.Name)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"deleted": deleted,
		"failed":  failed,
		"total":   len(deployments.Items),
		"message": fmt.Sprintf("Deleted %d/%d deployments in namespace %s", len(deleted), len(deployments.Items), namespace),
	})
}

// handleBulkStatefulSetRestart restarts all statefulsets in a namespace
func (ws *WebServer) handleBulkStatefulSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	statefulsets, err := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	restarted := []string{}
	failed := []map[string]string{}

	for _, ss := range statefulsets.Items {
		// For StatefulSets, delete pods to trigger restart
		pods, err := ws.app.clientset.CoreV1().Pods(namespace).List(ws.app.ctx, metav1.ListOptions{})
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  ss.Name,
				"error": err.Error(),
			})
			continue
		}

		podsDeleted := 0
		for _, pod := range pods.Items {
			for _, ownerRef := range pod.OwnerReferences {
				if ownerRef.Kind == "StatefulSet" && ownerRef.Name == ss.Name {
					err := ws.app.clientset.CoreV1().Pods(namespace).Delete(ws.app.ctx, pod.Name, metav1.DeleteOptions{})
					if err == nil {
						podsDeleted++
					}
					break
				}
			}
		}

		if podsDeleted > 0 {
			restarted = append(restarted, ss.Name)
		} else {
			failed = append(failed, map[string]string{
				"name":  ss.Name,
				"error": "No pods found to restart",
			})
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"restarted": restarted,
		"failed":    failed,
		"total":     len(statefulsets.Items),
		"message":   fmt.Sprintf("Restarted %d/%d statefulsets in namespace %s", len(restarted), len(statefulsets.Items), namespace),
	})
}

// handleBulkStatefulSetDelete deletes all statefulsets in a namespace
func (ws *WebServer) handleBulkStatefulSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	statefulsets, err := ws.app.clientset.AppsV1().StatefulSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	deleted := []string{}
	failed := []map[string]string{}

	for _, ss := range statefulsets.Items {
		err := ws.app.clientset.AppsV1().StatefulSets(namespace).Delete(ws.app.ctx, ss.Name, metav1.DeleteOptions{})
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  ss.Name,
				"error": err.Error(),
			})
		} else {
			deleted = append(deleted, ss.Name)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"deleted": deleted,
		"failed":  failed,
		"total":   len(statefulsets.Items),
		"message": fmt.Sprintf("Deleted %d/%d statefulsets in namespace %s", len(deleted), len(statefulsets.Items), namespace),
	})
}

// handleBulkDaemonSetRestart restarts all daemonsets in a namespace
func (ws *WebServer) handleBulkDaemonSetRestart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	daemonsets, err := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	restarted := []string{}
	failed := []map[string]string{}
	restartTime := time.Now().Format(time.RFC3339)

	for _, ds := range daemonsets.Items {
		annotations := make(map[string]string)
		if ds.Spec.Template.Annotations != nil {
			for k, v := range ds.Spec.Template.Annotations {
				annotations[k] = v
			}
		}
		annotations["kubectl.kubernetes.io/restartedAt"] = restartTime

		patchData := map[string]interface{}{
			"spec": map[string]interface{}{
				"template": map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": annotations,
					},
				},
			},
		}
		patchBytes, _ := json.Marshal(patchData)

		_, err := ws.app.clientset.AppsV1().DaemonSets(namespace).Patch(
			ws.app.ctx,
			ds.Name,
			types.StrategicMergePatchType,
			patchBytes,
			metav1.PatchOptions{},
		)
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  ds.Name,
				"error": err.Error(),
			})
		} else {
			restarted = append(restarted, ds.Name)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"restarted": restarted,
		"failed":    failed,
		"total":     len(daemonsets.Items),
		"message":   fmt.Sprintf("Restarted %d/%d daemonsets in namespace %s", len(restarted), len(daemonsets.Items), namespace),
	})
}

// handleBulkDaemonSetDelete deletes all daemonsets in a namespace
func (ws *WebServer) handleBulkDaemonSetDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	if namespace == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace is required",
		})
		return
	}

	daemonsets, err := ws.app.clientset.AppsV1().DaemonSets(namespace).List(ws.app.ctx, metav1.ListOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	deleted := []string{}
	failed := []map[string]string{}

	for _, ds := range daemonsets.Items {
		err := ws.app.clientset.AppsV1().DaemonSets(namespace).Delete(ws.app.ctx, ds.Name, metav1.DeleteOptions{})
		if err != nil {
			failed = append(failed, map[string]string{
				"name":  ds.Name,
				"error": err.Error(),
			})
		} else {
			deleted = append(deleted, ds.Name)
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"deleted": deleted,
		"failed":  failed,
		"total":   len(daemonsets.Items),
		"message": fmt.Sprintf("Deleted %d/%d daemonsets in namespace %s", len(deleted), len(daemonsets.Items), namespace),
	})
}

// ============ Namespace CRUD Operations ============

// handleNamespaceDetails returns detailed information about a namespace
func (ws *WebServer) handleNamespaceDetails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name is required",
		})
		return
	}

	ns, err := ws.app.clientset.CoreV1().Namespaces().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"name":        ns.Name,
		"status":      string(ns.Status.Phase),
		"labels":      ns.Labels,
		"annotations": ns.Annotations,
		"age":         formatAge(time.Since(ns.CreationTimestamp.Time)),
		"createdAt":   ns.CreationTimestamp.Time.Format(time.RFC3339),
	})
}

// handleNamespaceYAML returns the YAML representation of a namespace
func (ws *WebServer) handleNamespaceYAML(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name is required",
		})
		return
	}

	ns, err := ws.app.clientset.CoreV1().Namespaces().Get(ws.app.ctx, name, metav1.GetOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	ns.ManagedFields = nil
	yamlData, err := toKubectlYAML(ns, schema.GroupVersionKind{Group: "", Version: "v1", Kind: "Namespace"})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"yaml":    string(yamlData),
	})
}

// handleNamespaceUpdate updates a namespace
func (ws *WebServer) handleNamespaceUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name is required",
		})
		return
	}

	// Read YAML from request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to read request body: %v", err),
		})
		return
	}

	var ns v1.Namespace
	if err := yaml.Unmarshal(body, &ns); err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Failed to unmarshal YAML: %v", err),
		})
		return
	}

	// Ensure the name matches
	if ns.Name != name {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name in YAML does not match the name parameter",
		})
		return
	}

	_, err = ws.app.clientset.CoreV1().Namespaces().Update(ws.app.ctx, &ns, metav1.UpdateOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Namespace %s updated successfully", name),
	})
}

// handleNamespaceDescribe returns kubectl describe output for a namespace
func (ws *WebServer) handleNamespaceDescribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name is required",
		})
		return
	}

	describe, err := runKubectlDescribe("namespace", name, "")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"describe": describe,
	})
}

// handleNamespaceDelete deletes a namespace
func (ws *WebServer) handleNamespaceDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != "POST" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Method not allowed",
		})
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Namespace name is required",
		})
		return
	}

	err := ws.app.clientset.CoreV1().Namespaces().Delete(ws.app.ctx, name, metav1.DeleteOptions{})
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Namespace %s deleted successfully", name),
	})
}

// handleTelemetryStatus returns the current telemetry decision status
func (ws *WebServer) handleTelemetryStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	config, err := telemetry.LoadConfig()
	if err != nil {
		// Error loading config, treat as first run
		json.NewEncoder(w).Encode(map[string]interface{}{
			"decided": false,
			"enabled": false,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"decided": config.Telemetry.Decided,
		"enabled": config.Telemetry.Enabled,
	})
}

// handleTelemetryConsent handles the user's telemetry consent decision
func (ws *WebServer) handleTelemetryConsent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		Enabled bool `json:"enabled"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Save the decision
	if err := telemetry.RecordDecision(request.Enabled); err != nil {
		http.Error(w, fmt.Sprintf("Failed to save decision: %v", err), http.StatusInternalServerError)
		return
	}

	// If user opted in, send the install event
	if request.Enabled {
		telemetry.SendInstallEvent(version)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"enabled": request.Enabled,
	})
}

// ============ UI Logger Handlers ============

// handleUILogWrite handles frontend logs sent to backend
// POST /api/ui-logs/write
func (ws *WebServer) handleUILogWrite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get or initialize UI logger
	uiLogger := uilogger.GetInstance()
	if uiLogger == nil {
		// Initialize if not already done
		var err error
		uiLogger, err = uilogger.Initialize()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to initialize logger: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Parse request body - can be single log or array of logs
	var requestBody json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Try to parse as array first
	var entries []uilogger.LogEntry
	if err := json.Unmarshal(requestBody, &entries); err != nil {
		// If array parsing fails, try single entry
		var entry uilogger.LogEntry
		if err := json.Unmarshal(requestBody, &entry); err != nil {
			http.Error(w, "Invalid log entry format", http.StatusBadRequest)
			return
		}
		entries = []uilogger.LogEntry{entry}
	}

	// Write logs
	if err := uiLogger.WriteLogs(entries); err != nil {
		http.Error(w, fmt.Sprintf("Failed to write logs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(entries),
	})
}

// handleUILogStats returns statistics about UI logs
// GET /api/ui-logs/stats
func (ws *WebServer) handleUILogStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get or initialize UI logger
	uiLogger := uilogger.GetInstance()
	if uiLogger == nil {
		// Initialize if not already done
		var err error
		uiLogger, err = uilogger.Initialize()
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to initialize logger: %v", err), http.StatusInternalServerError)
			return
		}
	}

	// Get stats
	stats, err := uiLogger.GetLogStats()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get stats: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
