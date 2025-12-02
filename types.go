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
	"sync"
	"time"

	"github.com/rivo/tview"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Unicode status icons (k9s + argo-rollouts style)
const (
	IconOK          = "✔"
	IconBad         = "✖"
	IconWarning     = "⚠"
	IconProgressing = "◌"
	IconPaused      = "॥"
	IconUnknown     = "?"
	IconPending     = "◷"

	// Resource icons
	IconPod        = "🎯"
	IconDeployment = "🚀"
	IconService    = "🌐"
	IconIngress    = "🚪"
	IconConfigMap  = "⚙️"
	IconSecret     = "🔐"

	// Relationship indicator
	IconArrow = "►"
)

// Resource types
const (
	ResourcePod         = "Pods"
	ResourceDeployment  = "Deployments"
	ResourceStatefulSet = "StatefulSets"
	ResourceDaemonSet   = "DaemonSets"
	ResourceService     = "Services"
	ResourceIngress     = "Ingresses"
	ResourceConfigMap   = "ConfigMaps"
	ResourceSecret      = "Secrets"
	ResourceCronJob     = "CronJobs"
	ResourceJob         = "Jobs"
	ResourceNodes       = "Nodes"
	ResourceMap         = "ResourceMap"
)

// App represents the main application
type App struct {
	app             *tview.Application
	pages           *tview.Pages
	table           *tview.Table
	tabBar          *tview.TextView
	statusBar       *tview.TextView
	metricsBar      *tview.TextView
	eventBar        *tview.TextView
	helpBar         *tview.TextView
	yamlView        *tview.TextView
	clientset       *kubernetes.Clientset
	metricsClient   *metricsclientset.Clientset
	config          *rest.Config
	namespace       string
	cluster         string
	currentTab      int
	tabs            []string
	selectedRow     int
	events          []Event
	eventsMux       sync.Mutex
	stopCh          chan struct{}
	ctx             context.Context
	cancel          context.CancelFunc
	tableData       *TableData
	isInitialized   bool
	connected       bool
	connectionError string
	// Multi-cluster support
	contextManager *ContextManager
	// Vulnerability scanning
	vulnerabilityScanner *VulnerabilityScanner
	// Anomaly detection
	anomalyDetector *AnomalyDetector
	// ML Recommendations
	mlRecommender *MLRecommender
}

// TableData holds the current table information
type TableData struct {
	Headers []string
	Rows    [][]string
	RowIDs  []string // Full resource paths for operations
	mx      sync.RWMutex
}

// Event represents a Kubernetes event
type Event struct {
	Time      time.Time
	Type      string
	Reason    string
	Object    string
	Message   string
	Namespace string
}

// ResourceNode represents a node in the resource relationship tree
type ResourceNode struct {
	Type     string            // Resource type (Pod, Service, etc.)
	Name     string            // Resource name
	Status   string            // Resource status
	Icon     string            // Icon for the resource
	Color    string            // Color for display
	Children []*ResourceNode   // Child nodes
	Metadata map[string]string // Additional metadata
}

// ClusterContext represents a Kubernetes cluster context with its clients
type ClusterContext struct {
	Name          string                      // Context name from kubeconfig
	Clientset     *kubernetes.Clientset       // Kubernetes API client
	MetricsClient *metricsclientset.Clientset // Metrics API client
	Config        *rest.Config                // REST config for this context
	Connected     bool                        // Connection status
	Error         string                      // Connection error if any
	ServerVersion string                      // Kubernetes server version
}

// ContextManager manages multiple cluster contexts
type ContextManager struct {
	Contexts       map[string]*ClusterContext // All available contexts
	CurrentContext string                     // Currently active context
	ContextOrder   []string                   // Ordered list of context names
	mu             sync.RWMutex               // Mutex for thread-safe access
}
