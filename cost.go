// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kubegraf/kubegraf/cost/pricing"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CloudProvider represents detected cloud platform
type CloudProvider string

const (
	CloudGCP           CloudProvider = "gcp"
	CloudAWS           CloudProvider = "aws"
	CloudAzure         CloudProvider = "azure"
	CloudIBM           CloudProvider = "ibm"
	CloudOracle        CloudProvider = "oracle"
	CloudDigitalOcean  CloudProvider = "digitalocean"
	CloudAlibaba       CloudProvider = "alibaba"
	CloudLinode        CloudProvider = "linode"
	CloudVultr         CloudProvider = "vultr"
	CloudOVH           CloudProvider = "ovh"
	CloudHetzner       CloudProvider = "hetzner"
	CloudKind          CloudProvider = "kind"
	CloudMinikube      CloudProvider = "minikube"
	CloudDockerDesktop CloudProvider = "docker-desktop"
	CloudK3s           CloudProvider = "k3s"
	CloudK3d           CloudProvider = "k3d"
	CloudRancher       CloudProvider = "rancher"
	CloudOpenShift     CloudProvider = "openshift"
	CloudUnknown       CloudProvider = "unknown"
)

// CloudInfo contains detected cloud platform information
type CloudInfo struct {
	Provider    CloudProvider `json:"provider"`
	Region      string        `json:"region"`
	DisplayName string        `json:"displayName"`
	IsSpot      bool          `json:"isSpot"`
	ConsoleUrl  string        `json:"consoleUrl,omitempty"` // Direct link to cloud console
}

// CostEstimator provides cost estimation for Kubernetes resources
type CostEstimator struct {
	app       *App
	pricing   *pricing.PricingTable
	currency  string
	cloudInfo *CloudInfo
}

// Legacy pricing functions - now delegate to pricing package
func GCPPricingTable(region string) *pricing.PricingTable {
	return pricing.GCPPricingTable(region)
}

func AWSPricingTable(region string) *pricing.PricingTable {
	return pricing.AWSPricingTable(region)
}

func AzurePricingTable(region string) *pricing.PricingTable {
	return pricing.AzurePricingTable(region)
}

func DefaultPricingTable() *pricing.PricingTable {
	return pricing.DefaultPricingTable()
}

// ResourceCost represents the estimated cost for a resource
type ResourceCost struct {
	Resource    string  `json:"resource"`
	Namespace   string  `json:"namespace"`
	Kind        string  `json:"kind"`
	CPUCores    float64 `json:"cpuCores"`
	MemoryGB    float64 `json:"memoryGB"`
	StorageGB   float64 `json:"storageGB"`
	HourlyCost  float64 `json:"hourlyCost"`
	DailyCost   float64 `json:"dailyCost"`
	MonthlyCost float64 `json:"monthlyCost"`
	Breakdown   string  `json:"breakdown"`
}

// NamespaceCost represents aggregated cost for a namespace
type NamespaceCost struct {
	Namespace    string         `json:"namespace"`
	PodCount     int            `json:"podCount"`
	TotalCPU     float64        `json:"totalCpu"`
	TotalMemory  float64        `json:"totalMemory"`
	TotalStorage float64        `json:"totalStorage"`
	HourlyCost   float64        `json:"hourlyCost"`
	DailyCost    float64        `json:"dailyCost"`
	MonthlyCost  float64        `json:"monthlyCost"`
	TopResources []ResourceCost `json:"topResources"`
}

// ClusterCost represents the total cluster cost
type ClusterCost struct {
	NodeCount      int             `json:"nodeCount"`
	TotalCPU       float64         `json:"totalCpu"`
	TotalMemory    float64         `json:"totalMemory"`
	TotalStorage   float64         `json:"totalStorage"`
	HourlyCost     float64         `json:"hourlyCost"`
	DailyCost      float64         `json:"dailyCost"`
	MonthlyCost    float64         `json:"monthlyCost"`
	NamespaceCosts []NamespaceCost `json:"namespaceCosts"`
	// Cloud platform information
	Cloud *CloudInfo `json:"cloud,omitempty"`
	// Pricing information
	Pricing *PricingInfo `json:"pricing,omitempty"`
	// Cost optimization recommendations
	Recommendations []CostRecommendation `json:"recommendations,omitempty"`
}

// PricingInfo contains the pricing rates being used
type PricingInfo struct {
	Provider           string  `json:"provider"`
	Region             string  `json:"region"`
	CPUPerCoreHour     float64 `json:"cpuPerCoreHour"`
	MemoryPerGBHour    float64 `json:"memoryPerGBHour"`
	StoragePerGBMonth  float64 `json:"storagePerGBMonth"`
	SpotNodesCount     int     `json:"spotNodesCount"`
	OnDemandNodesCount int     `json:"onDemandNodesCount"`
}

// DetectCloudProvider detects the cloud platform from node information
// generateConsoleUrl generates a direct console URL for the cloud provider
func (c *CostEstimator) generateConsoleUrl(cloudInfo *CloudInfo, contextName string) {
	if cloudInfo == nil {
		return
	}

	switch cloudInfo.Provider {
	case CloudGCP:
		// GKE Console: https://console.cloud.google.com/kubernetes/clusters/details/{region}/{cluster}?project={project}
		// Or login: https://accounts.google.com/signin/v2/identifier?continue=https://console.cloud.google.com/kubernetes/clusters
		// Parse context: gke_project_region_cluster
		parts := strings.Split(contextName, "_")
		if len(parts) >= 4 {
			project := parts[1]
			region := cloudInfo.Region
			clusterName := parts[3]
			if region != "" && clusterName != "" {
				cloudInfo.ConsoleUrl = fmt.Sprintf("https://console.cloud.google.com/kubernetes/clusters/details/%s/%s?project=%s", region, clusterName, project)
			} else if project != "" {
				// Fallback to clusters list
				cloudInfo.ConsoleUrl = fmt.Sprintf("https://console.cloud.google.com/kubernetes/clusters?project=%s", project)
			} else {
				// Fallback to login page
				cloudInfo.ConsoleUrl = "https://accounts.google.com/signin/v2/identifier?continue=https://console.cloud.google.com/kubernetes/clusters"
			}
		} else if len(parts) >= 2 {
			project := parts[1]
			cloudInfo.ConsoleUrl = fmt.Sprintf("https://console.cloud.google.com/kubernetes/clusters?project=%s", project)
		} else {
			cloudInfo.ConsoleUrl = "https://accounts.google.com/signin/v2/identifier?continue=https://console.cloud.google.com/kubernetes/clusters"
		}
	case CloudAWS:
		// EKS Console: https://console.aws.amazon.com/eks/home?region={region}#/clusters/{cluster}
		// Or login: https://signin.aws.amazon.com/console
		parts := strings.Split(contextName, "/")
		clusterName := parts[len(parts)-1]
		region := cloudInfo.Region
		if region != "" && clusterName != "" && clusterName != contextName {
			cloudInfo.ConsoleUrl = fmt.Sprintf("https://console.aws.amazon.com/eks/home?region=%s#/clusters/%s", region, clusterName)
		} else if region != "" {
			cloudInfo.ConsoleUrl = fmt.Sprintf("https://console.aws.amazon.com/eks/home?region=%s", region)
		} else {
			cloudInfo.ConsoleUrl = "https://signin.aws.amazon.com/console"
		}
	case CloudAzure:
		// AKS Console: https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.ContainerService%2FmanagedClusters
		// Or login: https://portal.azure.com
		cloudInfo.ConsoleUrl = "https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.ContainerService%2FmanagedClusters"
	case CloudIBM, CloudOracle, CloudDigitalOcean, CloudAlibaba, CloudLinode, CloudVultr, CloudOVH, CloudHetzner:
		// Other cloud providers - no console URL for now
		cloudInfo.ConsoleUrl = ""
	case CloudKind, CloudMinikube, CloudDockerDesktop, CloudK3d, CloudK3s, CloudRancher, CloudOpenShift, CloudUnknown:
		// Local clusters and unknown - no console URL
		cloudInfo.ConsoleUrl = ""
	default:
		// No console URL for other providers
		cloudInfo.ConsoleUrl = ""
	}
}

func (c *CostEstimator) DetectCloudProvider(ctx context.Context) (*CloudInfo, error) {
	contextName := c.app.cluster
	// First try to detect from context name and server URL (most reliable)
	if cloudInfo := c.detectFromContextAndServer(); cloudInfo != nil {
		// Still need to check nodes for spot instance detection and additional info
		nodes, err := c.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
		if err == nil && len(nodes.Items) > 0 {
			node := nodes.Items[0]
			// Detect if this is a spot instance
			if node.Labels["cloud.google.com/gke-spot"] == "true" ||
				node.Labels["cloud.google.com/gke-preemptible"] == "true" ||
				node.Labels["eks.amazonaws.com/capacityType"] == "SPOT" ||
				node.Labels["node-lifecycle"] == "spot" ||
				node.Labels["kubernetes.azure.com/scalesetpriority"] == "spot" {
				cloudInfo.IsSpot = true
			}
		}
		// Generate console URL
		c.generateConsoleUrl(cloudInfo, contextName)
		return cloudInfo, nil
	}

	nodes, err := c.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	if len(nodes.Items) == 0 {
		return &CloudInfo{Provider: CloudUnknown, DisplayName: "Unknown"}, nil
	}

	// Check the first node's providerID
	node := nodes.Items[0]
	providerID := node.Spec.ProviderID

	cloudInfo := &CloudInfo{}

	// Parse providerID to detect cloud
	// GCP: gce://project-id/zone/instance-name
	// AWS: aws:///region/instance-id
	// Azure: azure:///subscriptions/...
	// IBM: ibm://...
	// Oracle: oci://... or oracle://...
	// DigitalOcean: digitalocean://...
	// Alibaba: alicloud://...
	// Linode: linode://...
	// Vultr: vultr://...
	// OVH: openstack://... (with OVH labels)
	// Hetzner: hcloud://...
	switch {
	case strings.HasPrefix(providerID, "gce://"):
		cloudInfo.Provider = CloudGCP
		cloudInfo.DisplayName = "Google Cloud Platform"
		// Parse region from providerID: gce://project/zone/instance
		parts := strings.Split(providerID, "/")
		if len(parts) >= 4 {
			zone := parts[3]
			// Extract region from zone (e.g., europe-north1-b -> europe-north1)
			if idx := strings.LastIndex(zone, "-"); idx > 0 {
				cloudInfo.Region = zone[:idx]
			} else {
				cloudInfo.Region = zone
			}
		}
	case strings.HasPrefix(providerID, "aws://"):
		cloudInfo.Provider = CloudAWS
		cloudInfo.DisplayName = "Amazon Web Services"
		// Parse region from providerID: aws:///region/instance-id
		parts := strings.Split(providerID, "/")
		if len(parts) >= 4 {
			cloudInfo.Region = parts[3]
		}
	case strings.HasPrefix(providerID, "azure://"):
		cloudInfo.Provider = CloudAzure
		cloudInfo.DisplayName = "Microsoft Azure"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "ibm://") || strings.HasPrefix(providerID, "ibmcloud://"):
		cloudInfo.Provider = CloudIBM
		cloudInfo.DisplayName = "IBM Cloud"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "oci://") || strings.HasPrefix(providerID, "oracle://"):
		cloudInfo.Provider = CloudOracle
		cloudInfo.DisplayName = "Oracle Cloud"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "digitalocean://"):
		cloudInfo.Provider = CloudDigitalOcean
		cloudInfo.DisplayName = "DigitalOcean"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "alicloud://") || strings.HasPrefix(providerID, "alibaba://"):
		cloudInfo.Provider = CloudAlibaba
		cloudInfo.DisplayName = "Alibaba Cloud"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "linode://"):
		cloudInfo.Provider = CloudLinode
		cloudInfo.DisplayName = "Linode"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "vultr://"):
		cloudInfo.Provider = CloudVultr
		cloudInfo.DisplayName = "Vultr"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "hcloud://"):
		cloudInfo.Provider = CloudHetzner
		cloudInfo.DisplayName = "Hetzner Cloud"
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "openstack://"):
		// Could be OVH or other OpenStack providers
		if _, ok := node.Labels["ovh.com/server-id"]; ok {
			cloudInfo.Provider = CloudOVH
			cloudInfo.DisplayName = "OVH Cloud"
		} else {
			cloudInfo.Provider = CloudUnknown
			cloudInfo.DisplayName = "OpenStack"
		}
		cloudInfo.Region = node.Labels["topology.kubernetes.io/region"]
	case strings.HasPrefix(providerID, "kind://"):
		cloudInfo.Provider = CloudKind
		cloudInfo.DisplayName = "Kind"
		cloudInfo.Region = "local"
	case strings.HasPrefix(providerID, "k3s://"):
		// K3d uses k3s under the hood, but nodes have k3d- prefix
		if strings.HasPrefix(node.Name, "k3d-") {
			cloudInfo.Provider = CloudK3d
			cloudInfo.DisplayName = "K3d"
		} else {
			cloudInfo.Provider = CloudK3s
			cloudInfo.DisplayName = "K3s"
		}
		cloudInfo.Region = "local"
	default:
		// Check node labels for additional detection
		cloudInfo = c.detectFromLabels(&node)
	}

	// Detect if this is a spot instance
	// GKE: cloud.google.com/gke-spot=true or gke-spot in node pool name
	// AWS: eks.amazonaws.com/capacityType=SPOT or node-lifecycle=spot
	// Azure: kubernetes.azure.com/scalesetpriority=spot
	if node.Labels["cloud.google.com/gke-spot"] == "true" {
		cloudInfo.IsSpot = true
	} else if node.Labels["eks.amazonaws.com/capacityType"] == "SPOT" {
		cloudInfo.IsSpot = true
	} else if node.Labels["node-lifecycle"] == "spot" {
		cloudInfo.IsSpot = true
	} else if node.Labels["kubernetes.azure.com/scalesetpriority"] == "spot" {
		cloudInfo.IsSpot = true
	}

	// Generate console URL
	c.generateConsoleUrl(cloudInfo, contextName)

	return cloudInfo, nil
}

// detectFromLabels detects cloud/local provider from node labels when providerID is not set
func (c *CostEstimator) detectFromLabels(node *corev1.Node) *CloudInfo {
	cloudInfo := &CloudInfo{
		Provider:    CloudUnknown,
		DisplayName: "Unknown",
		Region:      "unknown",
	}

	nodeName := node.Name
	labels := node.Labels

	// Check for local Kubernetes distributions by node name patterns
	switch {
	// K3d clusters have nodes named like "k3d-mycluster-server-0" or "k3d-mycluster-agent-0"
	case strings.HasPrefix(nodeName, "k3d-"):
		cloudInfo.Provider = CloudK3d
		cloudInfo.DisplayName = "K3d"
		cloudInfo.Region = "local"
	// Kind clusters have nodes named like "kind-control-plane" or "kind-worker"
	case strings.Contains(nodeName, "kind-"):
		cloudInfo.Provider = CloudKind
		cloudInfo.DisplayName = "Kind"
		cloudInfo.Region = "local"
	// Minikube nodes
	case strings.Contains(nodeName, "minikube"):
		cloudInfo.Provider = CloudMinikube
		cloudInfo.DisplayName = "Minikube"
		cloudInfo.Region = "local"
	// Docker Desktop
	case strings.Contains(nodeName, "docker-desktop"):
		cloudInfo.Provider = CloudDockerDesktop
		cloudInfo.DisplayName = "Docker Desktop"
		cloudInfo.Region = "local"
	// K3s clusters often have labels
	case labels["k3s.io/hostname"] != "" || labels["node.kubernetes.io/instance-type"] == "k3s":
		cloudInfo.Provider = CloudK3s
		cloudInfo.DisplayName = "K3s"
		cloudInfo.Region = "local"
	// Rancher clusters
	case labels["cattle.io/os"] != "" || labels["rke.cattle.io/machine"] != "":
		cloudInfo.Provider = CloudRancher
		cloudInfo.DisplayName = "Rancher"
		cloudInfo.Region = labels["topology.kubernetes.io/region"]
	// OpenShift clusters
	case labels["node.openshift.io/os_id"] != "" || labels["kubernetes.io/os"] == "linux" && labels["node-role.kubernetes.io/master"] == "":
		if _, ok := labels["node.openshift.io/os_id"]; ok {
			cloudInfo.Provider = CloudOpenShift
			cloudInfo.DisplayName = "OpenShift"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		}
	}

	// If still unknown, check for cloud provider labels
	if cloudInfo.Provider == CloudUnknown {
		switch {
		case labels["eks.amazonaws.com/nodegroup"] != "":
			cloudInfo.Provider = CloudAWS
			cloudInfo.DisplayName = "Amazon Web Services"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["cloud.google.com/gke-nodepool"] != "":
			cloudInfo.Provider = CloudGCP
			cloudInfo.DisplayName = "Google Cloud Platform"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["kubernetes.azure.com/cluster"] != "":
			cloudInfo.Provider = CloudAzure
			cloudInfo.DisplayName = "Microsoft Azure"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["ibm-cloud.kubernetes.io/worker-id"] != "":
			cloudInfo.Provider = CloudIBM
			cloudInfo.DisplayName = "IBM Cloud"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["oci.oraclecloud.com/fault-domain"] != "":
			cloudInfo.Provider = CloudOracle
			cloudInfo.DisplayName = "Oracle Cloud"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["doks.digitalocean.com/node-pool"] != "":
			cloudInfo.Provider = CloudDigitalOcean
			cloudInfo.DisplayName = "DigitalOcean"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["alibabacloud.com/nodepool-id"] != "":
			cloudInfo.Provider = CloudAlibaba
			cloudInfo.DisplayName = "Alibaba Cloud"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		case labels["lke.linode.com/pool-id"] != "":
			cloudInfo.Provider = CloudLinode
			cloudInfo.DisplayName = "Linode"
			cloudInfo.Region = labels["topology.kubernetes.io/region"]
		default:
			cloudInfo.DisplayName = "On-Premise"
		}
	}

	return cloudInfo
}

// detectFromContextAndServer detects cloud provider from context name and server URL
func (c *CostEstimator) detectFromContextAndServer() *CloudInfo {
	contextName := c.app.cluster // Current context name
	serverURL := ""
	if c.app.config != nil {
		serverURL = c.app.config.Host
	}

	cloudInfo := &CloudInfo{}

	// Parse region from context name for GKE (format: gke_project_region_cluster)
	parseGKERegion := func(name string) string {
		parts := strings.Split(name, "_")
		if len(parts) >= 3 {
			return parts[2] // region is the third part
		}
		return ""
	}

	// Parse region from context name for EKS (format: arn:aws:eks:region:account:cluster/name)
	parseEKSRegion := func(name string) string {
		if strings.Contains(name, ":eks:") {
			parts := strings.Split(name, ":")
			for i, p := range parts {
				if p == "eks" && i+1 < len(parts) {
					return parts[i-1] // region is before eks
				}
			}
		}
		return ""
	}

	// Check context name patterns first (most reliable)
	switch {
	// GKE: gke_project_region_cluster
	case strings.HasPrefix(contextName, "gke_"):
		cloudInfo.Provider = CloudGCP
		cloudInfo.DisplayName = "Google Cloud Platform"
		cloudInfo.Region = parseGKERegion(contextName)
		return cloudInfo

	// EKS: arn:aws:eks:region:account:cluster/name or eks_region_cluster
	case strings.Contains(contextName, ":eks:") || strings.HasPrefix(contextName, "eks_"):
		cloudInfo.Provider = CloudAWS
		cloudInfo.DisplayName = "Amazon Web Services"
		cloudInfo.Region = parseEKSRegion(contextName)
		return cloudInfo

	// AKS: usually contains aks or azure
	case strings.Contains(strings.ToLower(contextName), "aks") || strings.Contains(strings.ToLower(contextName), "azure"):
		cloudInfo.Provider = CloudAzure
		cloudInfo.DisplayName = "Microsoft Azure"
		return cloudInfo

	// K3d: k3d-clustername
	case strings.HasPrefix(contextName, "k3d-"):
		cloudInfo.Provider = CloudK3d
		cloudInfo.DisplayName = "K3d"
		cloudInfo.Region = "local"
		return cloudInfo

	// Kind: kind-clustername
	case strings.HasPrefix(contextName, "kind-"):
		cloudInfo.Provider = CloudKind
		cloudInfo.DisplayName = "Kind"
		cloudInfo.Region = "local"
		return cloudInfo

	// Minikube
	case strings.Contains(strings.ToLower(contextName), "minikube"):
		cloudInfo.Provider = CloudMinikube
		cloudInfo.DisplayName = "Minikube"
		cloudInfo.Region = "local"
		return cloudInfo

	// Docker Desktop
	case strings.Contains(strings.ToLower(contextName), "docker-desktop"):
		cloudInfo.Provider = CloudDockerDesktop
		cloudInfo.DisplayName = "Docker Desktop"
		cloudInfo.Region = "local"
		return cloudInfo

	// Rancher
	case strings.Contains(strings.ToLower(contextName), "rancher"):
		cloudInfo.Provider = CloudRancher
		cloudInfo.DisplayName = "Rancher"
		return cloudInfo

	// OpenShift
	case strings.Contains(strings.ToLower(contextName), "openshift"):
		cloudInfo.Provider = CloudOpenShift
		cloudInfo.DisplayName = "OpenShift"
		return cloudInfo
	}

	// Check server URL patterns
	if serverURL != "" {
		switch {
		// GKE: *.gke.goog
		case strings.Contains(serverURL, ".gke.goog"):
			cloudInfo.Provider = CloudGCP
			cloudInfo.DisplayName = "Google Cloud Platform"
			return cloudInfo

		// EKS: *.eks.amazonaws.com
		case strings.Contains(serverURL, ".eks.amazonaws.com"):
			cloudInfo.Provider = CloudAWS
			cloudInfo.DisplayName = "Amazon Web Services"
			return cloudInfo

		// AKS: *.azmk8s.io
		case strings.Contains(serverURL, ".azmk8s.io"):
			cloudInfo.Provider = CloudAzure
			cloudInfo.DisplayName = "Microsoft Azure"
			return cloudInfo

		// Local cluster: localhost, 127.0.0.1, 0.0.0.0
		case strings.Contains(serverURL, "localhost") ||
			strings.Contains(serverURL, "127.0.0.1") ||
			strings.Contains(serverURL, "0.0.0.0"):
			// Local cluster detected, but we don't know which type yet
			// Return nil to let node-based detection figure it out
			return nil
		}
	}

	// No match found, let node-based detection handle it
	return nil
}

// NewCostEstimator creates a new cost estimator
func NewCostEstimator(app *App) *CostEstimator {
	return &CostEstimator{
		app:      app,
		pricing:  pricing.DefaultPricingTable(),
		currency: "USD",
	}
}

// NewCostEstimatorWithDetection creates a cost estimator with automatic cloud detection
func NewCostEstimatorWithDetection(ctx context.Context, app *App) *CostEstimator {
	c := &CostEstimator{
		app:      app,
		pricing:  DefaultPricingTable(),
		currency: "USD",
	}

	// Detect cloud provider
	cloudInfo, err := c.DetectCloudProvider(ctx)
	if err == nil && cloudInfo != nil {
		c.cloudInfo = cloudInfo

		// Set appropriate pricing table based on detected cloud using new pricing package
		providerName := string(cloudInfo.Provider)
		c.pricing = pricing.GetPricingTable(providerName, cloudInfo.Region)
	}

	return c
}

// SetPricing allows custom pricing to be set
func (c *CostEstimator) SetPricing(p *pricing.PricingTable) {
	c.pricing = p
}

// EstimatePodCost calculates the estimated cost of a pod
func (c *CostEstimator) EstimatePodCost(ctx context.Context, namespace, name string) (*ResourceCost, error) {
	pod, err := c.app.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	var totalCPU, totalMemory float64
	for _, container := range pod.Spec.Containers {
		// Use requests if set, otherwise limits
		cpu := container.Resources.Requests.Cpu()
		if cpu.IsZero() {
			cpu = container.Resources.Limits.Cpu()
		}
		mem := container.Resources.Requests.Memory()
		if mem.IsZero() {
			mem = container.Resources.Limits.Memory()
		}

		totalCPU += float64(cpu.MilliValue()) / 1000
		totalMemory += float64(mem.Value()) / (1024 * 1024 * 1024)
	}

	// Calculate storage from volumes
	var totalStorage float64
	for _, vol := range pod.Spec.Volumes {
		if vol.PersistentVolumeClaim != nil {
			pvc, err := c.app.clientset.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, vol.PersistentVolumeClaim.ClaimName, metav1.GetOptions{})
			if err == nil {
				storage := pvc.Spec.Resources.Requests.Storage()
				totalStorage += float64(storage.Value()) / (1024 * 1024 * 1024)
			}
		}
	}

	hourlyCost := c.calculateHourlyCost(totalCPU, totalMemory, totalStorage)

	return &ResourceCost{
		Resource:    name,
		Namespace:   namespace,
		Kind:        "Pod",
		CPUCores:    totalCPU,
		MemoryGB:    totalMemory,
		StorageGB:   totalStorage,
		HourlyCost:  hourlyCost,
		DailyCost:   hourlyCost * 24,
		MonthlyCost: hourlyCost * 730, // Average hours per month
		Breakdown:   c.formatBreakdown(totalCPU, totalMemory, totalStorage),
	}, nil
}

// EstimateNamespaceCost calculates the total cost for a namespace
func (c *CostEstimator) EstimateNamespaceCost(ctx context.Context, namespace string) (*NamespaceCost, error) {
	pods, err := c.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	nsCost := &NamespaceCost{
		Namespace: namespace,
		PodCount:  len(pods.Items),
	}

	var resourceCosts []ResourceCost
	for _, pod := range pods.Items {
		cost, err := c.EstimatePodCost(ctx, namespace, pod.Name)
		if err != nil {
			continue
		}
		resourceCosts = append(resourceCosts, *cost)
		nsCost.TotalCPU += cost.CPUCores
		nsCost.TotalMemory += cost.MemoryGB
		nsCost.TotalStorage += cost.StorageGB
		nsCost.HourlyCost += cost.HourlyCost
	}

	nsCost.DailyCost = nsCost.HourlyCost * 24
	nsCost.MonthlyCost = nsCost.HourlyCost * 730

	// Sort by cost and take top 10
	if len(resourceCosts) > 10 {
		// Simple bubble sort for top 10 (good enough for small lists)
		for i := 0; i < 10; i++ {
			for j := i + 1; j < len(resourceCosts); j++ {
				if resourceCosts[j].HourlyCost > resourceCosts[i].HourlyCost {
					resourceCosts[i], resourceCosts[j] = resourceCosts[j], resourceCosts[i]
				}
			}
		}
		resourceCosts = resourceCosts[:10]
	}
	nsCost.TopResources = resourceCosts

	return nsCost, nil
}

// EstimateClusterCost calculates the total cluster cost
func (c *CostEstimator) EstimateClusterCost(ctx context.Context) (*ClusterCost, error) {
	nodes, err := c.app.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Detect cloud provider if not already detected
	if c.cloudInfo == nil {
		cloudInfo, err := c.DetectCloudProvider(ctx)
		if err == nil && cloudInfo != nil {
			c.cloudInfo = cloudInfo
			// Update pricing based on detected cloud using new pricing package
			providerName := string(cloudInfo.Provider)
			c.pricing = pricing.GetPricingTable(providerName, cloudInfo.Region)
		}
	}

	clusterCost := &ClusterCost{
		NodeCount: len(nodes.Items),
		Cloud:     c.cloudInfo,
	}

	var spotNodes, onDemandNodes int

	// Calculate node costs
	for _, node := range nodes.Items {
		cpu := node.Status.Capacity.Cpu()
		mem := node.Status.Capacity.Memory()

		cpuCores := float64(cpu.MilliValue()) / 1000
		memGB := float64(mem.Value()) / (1024 * 1024 * 1024)

		clusterCost.TotalCPU += cpuCores
		clusterCost.TotalMemory += memGB

		// Check if this node is a spot instance
		isSpotNode := c.isNodeSpotInstance(&node)
		if isSpotNode {
			spotNodes++
		} else {
			onDemandNodes++
		}

		// Try to get instance type for more accurate pricing
		instanceType := node.Labels["node.kubernetes.io/instance-type"]
		if instanceType == "" {
			instanceType = node.Labels["beta.kubernetes.io/instance-type"]
		}

		// Use spot pricing if available and node is spot
		if isSpotNode {
			if price, ok := c.pricing.SpotPricing[instanceType]; ok {
				clusterCost.HourlyCost += price
				continue
			}
			// Apply spot discount to instance or resource pricing
			if price, ok := c.pricing.InstancePricing[instanceType]; ok {
				clusterCost.HourlyCost += price * (1 - c.pricing.SpotDiscount)
				continue
			}
			clusterCost.HourlyCost += c.calculateHourlyCost(cpuCores, memGB, 0) * (1 - c.pricing.SpotDiscount)
		} else {
			if price, ok := c.pricing.InstancePricing[instanceType]; ok {
				clusterCost.HourlyCost += price
			} else {
				// Fall back to resource-based pricing
				clusterCost.HourlyCost += c.calculateHourlyCost(cpuCores, memGB, 0)
			}
		}
	}

	// Add control plane cost (for managed Kubernetes services)
	controlPlaneCost := c.pricing.ControlPlaneCostPerHour
	clusterCost.HourlyCost += controlPlaneCost

	clusterCost.DailyCost = clusterCost.HourlyCost * 24
	clusterCost.MonthlyCost = clusterCost.HourlyCost * 730

	// Add pricing info
	clusterCost.Pricing = &PricingInfo{
		Provider:           c.pricing.Provider,
		Region:             c.pricing.Region,
		CPUPerCoreHour:     c.pricing.CPUPerCoreHour,
		MemoryPerGBHour:    c.pricing.MemoryPerGBHour,
		StoragePerGBMonth:  c.pricing.StoragePerGBMonth,
		SpotNodesCount:     spotNodes,
		OnDemandNodesCount: onDemandNodes,
	}

	// Get cost optimization recommendations (with timeout to avoid blocking)
	recCtx, recCancel := context.WithTimeout(ctx, 30*time.Second)
	recommendations, err := c.GetCostRecommendations(recCtx)
	recCancel()
	if err == nil {
		clusterCost.Recommendations = recommendations
	}
	// Don't fail the entire request if recommendations fail

	// Get all pods in a single call (OPTIMIZED - no per-namespace calls)
	allPods, err := c.app.clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err == nil {
		// Group pods by namespace and calculate costs
		nsMap := make(map[string]*NamespaceCost)

		for _, pod := range allPods.Items {
			ns := pod.Namespace

			// Initialize namespace if not seen
			if _, ok := nsMap[ns]; !ok {
				nsMap[ns] = &NamespaceCost{
					Namespace:    ns,
					TopResources: make([]ResourceCost, 0),
				}
			}

			nsCost := nsMap[ns]
			nsCost.PodCount++

			// Calculate pod resources directly from spec
			var podCPU, podMemory float64
			for _, container := range pod.Spec.Containers {
				cpu := container.Resources.Requests.Cpu()
				if cpu.IsZero() {
					cpu = container.Resources.Limits.Cpu()
				}
				mem := container.Resources.Requests.Memory()
				if mem.IsZero() {
					mem = container.Resources.Limits.Memory()
				}
				podCPU += float64(cpu.MilliValue()) / 1000
				podMemory += float64(mem.Value()) / (1024 * 1024 * 1024)
			}

			nsCost.TotalCPU += podCPU
			nsCost.TotalMemory += podMemory

			podHourlyCost := c.calculateHourlyCost(podCPU, podMemory, 0)
			nsCost.HourlyCost += podHourlyCost

			// Track top resources (only keep top 10 by cost)
			if podHourlyCost > 0 {
				rc := ResourceCost{
					Resource:   pod.Name,
					Namespace:  ns,
					Kind:       "Pod",
					CPUCores:   podCPU,
					MemoryGB:   podMemory,
					HourlyCost: podHourlyCost,
				}
				nsCost.TopResources = append(nsCost.TopResources, rc)
			}
		}

		// Convert map to slice and sort top resources
		for _, nsCost := range nsMap {
			nsCost.DailyCost = nsCost.HourlyCost * 24
			nsCost.MonthlyCost = nsCost.HourlyCost * 730

			// Sort and keep only top 10 resources
			if len(nsCost.TopResources) > 10 {
				for i := 0; i < 10; i++ {
					for j := i + 1; j < len(nsCost.TopResources); j++ {
						if nsCost.TopResources[j].HourlyCost > nsCost.TopResources[i].HourlyCost {
							nsCost.TopResources[i], nsCost.TopResources[j] = nsCost.TopResources[j], nsCost.TopResources[i]
						}
					}
				}
				nsCost.TopResources = nsCost.TopResources[:10]
			}

			if nsCost.HourlyCost > 0 {
				clusterCost.NamespaceCosts = append(clusterCost.NamespaceCosts, *nsCost)
			}
		}
	}

	return clusterCost, nil
}

// isNodeSpotInstance checks if a node is a spot/preemptible instance
func (c *CostEstimator) isNodeSpotInstance(node *corev1.Node) bool {
	// GKE: cloud.google.com/gke-spot=true
	if node.Labels["cloud.google.com/gke-spot"] == "true" {
		return true
	}
	// GKE preemptible (older)
	if node.Labels["cloud.google.com/gke-preemptible"] == "true" {
		return true
	}
	// AWS EKS: eks.amazonaws.com/capacityType=SPOT
	if node.Labels["eks.amazonaws.com/capacityType"] == "SPOT" {
		return true
	}
	// Generic: node-lifecycle=spot
	if node.Labels["node-lifecycle"] == "spot" {
		return true
	}
	// Azure: kubernetes.azure.com/scalesetpriority=spot
	if node.Labels["kubernetes.azure.com/scalesetpriority"] == "spot" {
		return true
	}
	// Check node pool name for "spot" keyword
	nodePool := node.Labels["cloud.google.com/gke-nodepool"]
	return strings.Contains(strings.ToLower(nodePool), "spot")
}

// EstimateDeploymentCost calculates cost for a deployment
func (c *CostEstimator) EstimateDeploymentCost(ctx context.Context, namespace, name string) (*ResourceCost, error) {
	deploy, err := c.app.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	var totalCPU, totalMemory float64
	for _, container := range deploy.Spec.Template.Spec.Containers {
		cpu := container.Resources.Requests.Cpu()
		if cpu.IsZero() {
			cpu = container.Resources.Limits.Cpu()
		}
		mem := container.Resources.Requests.Memory()
		if mem.IsZero() {
			mem = container.Resources.Limits.Memory()
		}

		totalCPU += float64(cpu.MilliValue()) / 1000
		totalMemory += float64(mem.Value()) / (1024 * 1024 * 1024)
	}

	// Multiply by replica count
	replicas := int32(1)
	if deploy.Spec.Replicas != nil {
		replicas = *deploy.Spec.Replicas
	}
	totalCPU *= float64(replicas)
	totalMemory *= float64(replicas)

	hourlyCost := c.calculateHourlyCost(totalCPU, totalMemory, 0)

	return &ResourceCost{
		Resource:    name,
		Namespace:   namespace,
		Kind:        "Deployment",
		CPUCores:    totalCPU,
		MemoryGB:    totalMemory,
		HourlyCost:  hourlyCost,
		DailyCost:   hourlyCost * 24,
		MonthlyCost: hourlyCost * 730,
		Breakdown:   fmt.Sprintf("%d replicas × %s", replicas, c.formatBreakdown(totalCPU/float64(replicas), totalMemory/float64(replicas), 0)),
	}, nil
}

// GetIdleResources identifies resources using less than threshold of their requests
func (c *CostEstimator) GetIdleResources(ctx context.Context, namespace string, cpuThreshold, memThreshold float64) ([]ResourceCost, error) {
	if c.app.metricsClient == nil {
		return nil, fmt.Errorf("metrics server not available")
	}

	var idleResources []ResourceCost

	pods, err := c.app.clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	podMetrics, err := c.app.metricsClient.MetricsV1beta1().PodMetricses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	// Create metrics map
	metricsMap := make(map[string]struct {
		cpuUsage int64
		memUsage int64
	})
	for _, pm := range podMetrics.Items {
		var cpuTotal, memTotal int64
		for _, container := range pm.Containers {
			cpuTotal += container.Usage.Cpu().MilliValue()
			memTotal += container.Usage.Memory().Value()
		}
		metricsMap[pm.Name] = struct {
			cpuUsage int64
			memUsage int64
		}{cpuTotal, memTotal}
	}

	for _, pod := range pods.Items {
		metrics, ok := metricsMap[pod.Name]
		if !ok {
			continue
		}

		// Calculate requested resources
		var cpuRequest, memRequest int64
		for _, container := range pod.Spec.Containers {
			cpuRequest += container.Resources.Requests.Cpu().MilliValue()
			memRequest += container.Resources.Requests.Memory().Value()
		}

		if cpuRequest == 0 || memRequest == 0 {
			continue
		}

		cpuUsagePercent := float64(metrics.cpuUsage) / float64(cpuRequest) * 100
		memUsagePercent := float64(metrics.memUsage) / float64(memRequest) * 100

		if cpuUsagePercent < cpuThreshold && memUsagePercent < memThreshold {
			cost, err := c.EstimatePodCost(ctx, namespace, pod.Name)
			if err != nil {
				continue
			}
			cost.Breakdown = fmt.Sprintf("Using %.1f%% CPU, %.1f%% Memory - potential savings: $%.2f/month",
				cpuUsagePercent, memUsagePercent, cost.MonthlyCost*0.5) // Assume 50% could be saved
			idleResources = append(idleResources, *cost)
		}
	}

	return idleResources, nil
}

// calculateHourlyCost calculates the hourly cost for given resources
func (c *CostEstimator) calculateHourlyCost(cpuCores, memoryGB, storageGB float64) float64 {
	cost := cpuCores*c.pricing.CPUPerCoreHour +
		memoryGB*c.pricing.MemoryPerGBHour +
		storageGB*c.pricing.StoragePerGBMonth/(730) // Convert monthly to hourly
	return cost
}

// formatBreakdown creates a human-readable cost breakdown
func (c *CostEstimator) formatBreakdown(cpuCores, memoryGB, storageGB float64) string {
	var parts []string
	if cpuCores > 0 {
		parts = append(parts, fmt.Sprintf("%.2f CPU ($%.3f/hr)", cpuCores, cpuCores*c.pricing.CPUPerCoreHour))
	}
	if memoryGB > 0 {
		parts = append(parts, fmt.Sprintf("%.2f GB RAM ($%.3f/hr)", memoryGB, memoryGB*c.pricing.MemoryPerGBHour))
	}
	if storageGB > 0 {
		parts = append(parts, fmt.Sprintf("%.2f GB Storage ($%.2f/mo)", storageGB, storageGB*c.pricing.StoragePerGBMonth))
	}
	return strings.Join(parts, " + ")
}

// FormatCost formats a cost value with currency symbol
func (c *CostEstimator) FormatCost(amount float64) string {
	if amount < 0.01 {
		return fmt.Sprintf("$%.4f", amount)
	}
	return fmt.Sprintf("$%.2f", amount)
}
