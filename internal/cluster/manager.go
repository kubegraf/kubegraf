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
	"context"
	"fmt"
	"sync"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

// ClusterManager manages in-memory Kubernetes clients and pre-warmed resources
type ClusterManager struct {
	mu        sync.RWMutex
	clients   map[string]*kubernetes.Clientset
	contexts  map[string]LoadedContext
	informers map[string]informers.SharedInformerFactory
	stopChs   map[string]chan struct{}

	// Pre-warmed caches
	namespacesCache  map[string][]corev1.Namespace
	podsCache        map[string]map[string][]corev1.Pod
	eventsCache      map[string][]corev1.Event
	nodesCache       map[string][]corev1.Node
	deploymentsCache map[string]map[string][]appsv1.Deployment

	// Cache timestamps for freshness tracking
	cacheTimestamps map[string]time.Time
}

// NewClusterManager creates a new cluster manager with pre-warmed resources
func NewClusterManager(contexts []LoadedContext) (*ClusterManager, error) {
	cm := &ClusterManager{
		clients:          make(map[string]*kubernetes.Clientset),
		contexts:         make(map[string]LoadedContext),
		informers:        make(map[string]informers.SharedInformerFactory),
		stopChs:          make(map[string]chan struct{}),
		namespacesCache:  make(map[string][]corev1.Namespace),
		podsCache:        make(map[string]map[string][]corev1.Pod),
		eventsCache:      make(map[string][]corev1.Event),
		nodesCache:       make(map[string][]corev1.Node),
		deploymentsCache: make(map[string]map[string][]appsv1.Deployment),
		cacheTimestamps:  make(map[string]time.Time),
	}

	// Initialize clients and start informers for each context
	for _, ctx := range contexts {
		clientset, err := CreateClientset(ctx.RestConfig)
		if err != nil {
			// Log error but continue with other contexts
			continue
		}

		// Test cluster connectivity before starting informers
		// This prevents reflector errors for unreachable clusters
		versionCh := make(chan error, 1)
		go func() {
			_, err := clientset.Discovery().ServerVersion()
			versionCh <- err
		}()
		
		select {
		case err := <-versionCh:
			if err != nil {
				// Cluster is unreachable, skip informers but keep clientset for manual queries
				cm.clients[ctx.Name] = clientset
				cm.contexts[ctx.Name] = ctx
				continue
			}
		case <-time.After(3 * time.Second):
			// Timeout - cluster is unreachable, skip informers
			cm.clients[ctx.Name] = clientset
			cm.contexts[ctx.Name] = ctx
			continue
		}

		cm.clients[ctx.Name] = clientset
		cm.contexts[ctx.Name] = ctx

		// Start informers only for reachable clusters (non-blocking)
		cm.startInformers(ctx.Name, clientset)

		// Pre-warm resources in background
		go cm.preWarmResources(ctx.Name, clientset)
	}

	return cm, nil
}

// startInformers starts shared informers for a cluster
func (cm *ClusterManager) startInformers(contextName string, clientset *kubernetes.Clientset) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Create shared informer factory
	factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
	stopCh := make(chan struct{})

	cm.informers[contextName] = factory
	cm.stopChs[contextName] = stopCh

	// Start informers for key resources
	podInformer := factory.Core().V1().Pods().Informer()
	eventInformer := factory.Core().V1().Events().Informer()
	nodeInformer := factory.Core().V1().Nodes().Informer()
	deploymentInformer := factory.Apps().V1().Deployments().Informer()

	// Set up event handlers to update cache
	podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			if pod, ok := obj.(*corev1.Pod); ok {
				cm.updatePodCache(contextName, pod)
			}
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			if pod, ok := newObj.(*corev1.Pod); ok {
				cm.updatePodCache(contextName, pod)
			}
		},
		DeleteFunc: func(obj interface{}) {
			if pod, ok := obj.(*corev1.Pod); ok {
				cm.removePodCache(contextName, pod)
			}
		},
	})

	eventInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			if event, ok := obj.(*corev1.Event); ok {
				cm.updateEventCache(contextName, event)
			}
		},
	})

	nodeInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			if node, ok := obj.(*corev1.Node); ok {
				cm.updateNodeCache(contextName, node)
			}
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			if node, ok := newObj.(*corev1.Node); ok {
				cm.updateNodeCache(contextName, node)
			}
		},
	})

	deploymentInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc: func(obj interface{}) {
			if deployment, ok := obj.(*appsv1.Deployment); ok {
				cm.updateDeploymentCache(contextName, deployment)
			}
		},
		UpdateFunc: func(oldObj, newObj interface{}) {
			if deployment, ok := newObj.(*appsv1.Deployment); ok {
				cm.updateDeploymentCache(contextName, deployment)
			}
		},
		DeleteFunc: func(obj interface{}) {
			if deployment, ok := obj.(*appsv1.Deployment); ok {
				cm.removeDeploymentCache(contextName, deployment)
			}
		},
	})

	// Start all informers
	factory.Start(stopCh)

	// Don't wait for cache sync - let informers sync in background
	// This prevents blocking on unreachable clusters
	// Informers will work fine without initial sync, they'll just start empty
	go func() {
		// Try to sync in background, but don't block
		factory.WaitForCacheSync(stopCh)
	}()
}

// preWarmResources pre-warms resource caches in the background
func (cm *ClusterManager) preWarmResources(contextName string, clientset *kubernetes.Clientset) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Pre-warm namespaces
	if namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{}); err == nil {
		cm.mu.Lock()
		cm.namespacesCache[contextName] = namespaces.Items
		cm.cacheTimestamps[contextName+":namespaces"] = time.Now()
		cm.mu.Unlock()
	}

	// Pre-warm nodes
	if nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{}); err == nil {
		cm.mu.Lock()
		cm.nodesCache[contextName] = nodes.Items
		cm.cacheTimestamps[contextName+":nodes"] = time.Now()
		cm.mu.Unlock()
	}

	// Pre-warm deployments (per namespace)
	cm.mu.RLock()
	namespaces := cm.namespacesCache[contextName]
	cm.mu.RUnlock()

	for _, ns := range namespaces {
		if deployments, err := clientset.AppsV1().Deployments(ns.Name).List(ctx, metav1.ListOptions{}); err == nil {
			cm.mu.Lock()
			if cm.deploymentsCache[contextName] == nil {
				cm.deploymentsCache[contextName] = make(map[string][]appsv1.Deployment)
			}
			cm.deploymentsCache[contextName][ns.Name] = deployments.Items
			cm.mu.Unlock()
		}
	}
}

// GetClient returns the clientset for a given context name
func (cm *ClusterManager) GetClient(contextName string) (*kubernetes.Clientset, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	client, exists := cm.clients[contextName]
	if !exists {
		return nil, fmt.Errorf("context %s not found", contextName)
	}

	return client, nil
}

// GetContexts returns all loaded contexts
func (cm *ClusterManager) GetContexts() []LoadedContext {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	contexts := make([]LoadedContext, 0, len(cm.contexts))
	for _, ctx := range cm.contexts {
		contexts = append(contexts, ctx)
	}

	return contexts
}

// Refresh reloads kubeconfigs and updates the manager
func (cm *ClusterManager) Refresh() error {
	// Discover new kubeconfigs
	paths, err := DiscoverKubeConfigs()
	if err != nil {
		return fmt.Errorf("failed to discover kubeconfigs: %w", err)
	}

	// Load contexts
	contexts, err := LoadContextsFromFiles(paths)
	if err != nil {
		return fmt.Errorf("failed to load contexts: %w", err)
	}

	// Stop old informers
	cm.mu.Lock()
	for contextName, stopCh := range cm.stopChs {
		close(stopCh)
		delete(cm.informers, contextName)
		delete(cm.clients, contextName)
		delete(cm.contexts, contextName)
		delete(cm.namespacesCache, contextName)
		delete(cm.podsCache, contextName)
		delete(cm.eventsCache, contextName)
		delete(cm.nodesCache, contextName)
		delete(cm.deploymentsCache, contextName)
	}
	cm.stopChs = make(map[string]chan struct{})
	cm.mu.Unlock()

	// Reinitialize with new contexts
	for _, ctx := range contexts {
		clientset, err := CreateClientset(ctx.RestConfig)
		if err != nil {
			continue
		}

		cm.mu.Lock()
		cm.clients[ctx.Name] = clientset
		cm.contexts[ctx.Name] = ctx
		cm.mu.Unlock()

		cm.startInformers(ctx.Name, clientset)
		go cm.preWarmResources(ctx.Name, clientset)
	}

	return nil
}

// Cache update helpers
func (cm *ClusterManager) updatePodCache(contextName string, pod *corev1.Pod) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.podsCache[contextName] == nil {
		cm.podsCache[contextName] = make(map[string][]corev1.Pod)
	}

	ns := pod.Namespace
	pods := cm.podsCache[contextName][ns]

	// Update or add pod
	found := false
	for i, p := range pods {
		if p.UID == pod.UID {
			pods[i] = *pod
			found = true
			break
		}
	}
	if !found {
		pods = append(pods, *pod)
	}
	cm.podsCache[contextName][ns] = pods
}

func (cm *ClusterManager) removePodCache(contextName string, pod *corev1.Pod) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.podsCache[contextName] == nil {
		return
	}

	ns := pod.Namespace
	pods := cm.podsCache[contextName][ns]

	for i, p := range pods {
		if p.UID == pod.UID {
			cm.podsCache[contextName][ns] = append(pods[:i], pods[i+1:]...)
			break
		}
	}
}

func (cm *ClusterManager) updateEventCache(contextName string, event *corev1.Event) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	events := cm.eventsCache[contextName]
	events = append(events, *event)

	// Keep only last 1000 events per cluster
	if len(events) > 1000 {
		events = events[len(events)-1000:]
	}
	cm.eventsCache[contextName] = events
}

func (cm *ClusterManager) updateNodeCache(contextName string, node *corev1.Node) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	nodes := cm.nodesCache[contextName]
	found := false
	for i, n := range nodes {
		if n.UID == node.UID {
			nodes[i] = *node
			found = true
			break
		}
	}
	if !found {
		nodes = append(nodes, *node)
	}
	cm.nodesCache[contextName] = nodes
}

func (cm *ClusterManager) updateDeploymentCache(contextName string, deployment *appsv1.Deployment) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.deploymentsCache[contextName] == nil {
		cm.deploymentsCache[contextName] = make(map[string][]appsv1.Deployment)
	}

	ns := deployment.Namespace
	deployments := cm.deploymentsCache[contextName][ns]

	found := false
	for i, d := range deployments {
		if d.UID == deployment.UID {
			deployments[i] = *deployment
			found = true
			break
		}
	}
	if !found {
		deployments = append(deployments, *deployment)
	}
	cm.deploymentsCache[contextName][ns] = deployments
}

func (cm *ClusterManager) removeDeploymentCache(contextName string, deployment *appsv1.Deployment) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.deploymentsCache[contextName] == nil {
		return
	}

	ns := deployment.Namespace
	deployments := cm.deploymentsCache[contextName][ns]

	for i, d := range deployments {
		if d.UID == deployment.UID {
			cm.deploymentsCache[contextName][ns] = append(deployments[:i], deployments[i+1:]...)
			break
		}
	}
}

// GetCachedNamespaces returns cached namespaces for a context
func (cm *ClusterManager) GetCachedNamespaces(contextName string) []corev1.Namespace {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.namespacesCache[contextName]
}

// GetCachedPods returns cached pods for a context and namespace
func (cm *ClusterManager) GetCachedPods(contextName, namespace string) []corev1.Pod {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	if cm.podsCache[contextName] == nil {
		return []corev1.Pod{}
	}
	return cm.podsCache[contextName][namespace]
}

// GetCachedEvents returns cached events for a context
func (cm *ClusterManager) GetCachedEvents(contextName string) []corev1.Event {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.eventsCache[contextName]
}

// GetCachedNodes returns cached nodes for a context
func (cm *ClusterManager) GetCachedNodes(contextName string) []corev1.Node {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.nodesCache[contextName]
}

// GetCachedDeployments returns cached deployments for a context and namespace
func (cm *ClusterManager) GetCachedDeployments(contextName, namespace string) []appsv1.Deployment {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	if cm.deploymentsCache[contextName] == nil {
		return []appsv1.Deployment{}
	}
	return cm.deploymentsCache[contextName][namespace]
}

