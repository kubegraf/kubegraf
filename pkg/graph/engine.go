// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package graph

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

const (
	// resyncPeriod is how often the informer resyncs its cache with the API server.
	resyncPeriod = 30 * time.Second
	// maxEventAge is how long K8s events are retained in the graph event buffer.
	maxEventAge = 2 * time.Hour
	// maxEvents is the maximum number of events held in memory.
	maxEvents = 2000
	// mutationBatchWindow is the debounce window for batching graph mutations.
	mutationBatchWindow = 50 * time.Millisecond
)

// Engine is the Kubegraf live topology graph engine.
//
// It maintains an in-memory, continuously-updated causal model of a Kubernetes
// cluster by watching all relevant resource types via SharedInformerFactory.
// The graph is the foundation for causal inference — not the LLM.
//
// Thread safety: all public methods acquire appropriate locks.
type Engine struct {
	mu sync.RWMutex

	// nodes is the primary node store: NodeID → *GraphNode
	nodes map[string]*GraphNode
	// edges is the edge store: EdgeID → *GraphEdge
	edges map[string]*GraphEdge
	// outEdges is the adjacency list for forward traversal: NodeID → []EdgeID
	outEdges map[string][]string
	// inEdges is the reverse adjacency list for upstream traversal: NodeID → []EdgeID
	inEdges map[string][]string

	// events is the rolling K8s event buffer (capped at maxEvents)
	events []GraphEvent
	evMu   sync.RWMutex

	// lastAnalysis caches recent causal chain results to avoid redundant computation
	lastAnalysis map[string]*CausalChain
	analysisMu   sync.RWMutex

	client  kubernetes.Interface
	factory informers.SharedInformerFactory
	stopCh  chan struct{}
	started bool
}

// NewEngine creates a new topology graph engine backed by the given K8s client.
// Call Start() to begin watching resources.
func NewEngine(client kubernetes.Interface) *Engine {
	return &Engine{
		nodes:        make(map[string]*GraphNode),
		edges:        make(map[string]*GraphEdge),
		outEdges:     make(map[string][]string),
		inEdges:      make(map[string][]string),
		events:       make([]GraphEvent, 0, maxEvents),
		lastAnalysis: make(map[string]*CausalChain),
		client:       client,
		stopCh:       make(chan struct{}),
	}
}

// Start initialises the SharedInformerFactory and begins watching all resource types.
// This method is non-blocking; watchers run in background goroutines.
func (e *Engine) Start() {
	if e.started {
		return
	}
	e.started = true

	e.factory = informers.NewSharedInformerFactory(e.client, resyncPeriod)

	// --- Pod informer ---
	podInformer := e.factory.Core().V1().Pods().Informer()
	podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onPod(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onPod(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeletePod(obj) },
	})

	// --- Node informer ---
	nodeInformer := e.factory.Core().V1().Nodes().Informer()
	nodeInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onNode(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onNode(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteNode(obj) },
	})

	// --- Deployment informer ---
	deployInformer := e.factory.Apps().V1().Deployments().Informer()
	deployInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onDeployment(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onDeployment(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteDeployment(obj) },
	})

	// --- ReplicaSet informer ---
	rsInformer := e.factory.Apps().V1().ReplicaSets().Informer()
	rsInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onReplicaSet(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onReplicaSet(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- StatefulSet informer ---
	stsInformer := e.factory.Apps().V1().StatefulSets().Informer()
	stsInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onStatefulSet(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onStatefulSet(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- DaemonSet informer ---
	dsInformer := e.factory.Apps().V1().DaemonSets().Informer()
	dsInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onDaemonSet(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onDaemonSet(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- Service informer ---
	svcInformer := e.factory.Core().V1().Services().Informer()
	svcInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onService(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onService(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- Ingress informer ---
	ingInformer := e.factory.Networking().V1().Ingresses().Informer()
	ingInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onIngress(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onIngress(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- PVC informer ---
	pvcInformer := e.factory.Core().V1().PersistentVolumeClaims().Informer()
	pvcInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onPVC(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onPVC(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- ConfigMap informer ---
	cmInformer := e.factory.Core().V1().ConfigMaps().Informer()
	cmInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onConfigMap(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onConfigMap(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- Namespace informer ---
	nsInformer := e.factory.Core().V1().Namespaces().Informer()
	nsInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onNamespace(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onNamespace(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- Job informer ---
	jobInformer := e.factory.Batch().V1().Jobs().Informer()
	jobInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onJob(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onJob(obj) },
		DeleteFunc: func(obj interface{}) { e.onDeleteResource(obj) },
	})

	// --- Event informer (K8s Events — the incident signal source) ---
	evtInformer := e.factory.Core().V1().Events().Informer()
	evtInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
		AddFunc:    func(obj interface{}) { e.onEvent(obj) },
		UpdateFunc: func(_, obj interface{}) { e.onEvent(obj) },
	})

	// Start all informers and wait for initial cache sync
	e.factory.Start(e.stopCh)

	go func() {
		log.Println("[graph] Waiting for informer caches to sync...")
		synced := e.factory.WaitForCacheSync(e.stopCh)
		for informerType, ok := range synced {
			if !ok {
				log.Printf("[graph] WARNING: cache for %v never synced", informerType)
			}
		}

		// After initial sync, rebuild all edges from current state
		e.rebuildAllEdges()
		log.Printf("[graph] Topology graph ready: %d nodes", e.NodeCount())
	}()
}

// Stop shuts down all informers and stops graph updates.
func (e *Engine) Stop() {
	if e.stopCh != nil {
		close(e.stopCh)
	}
}

// NodeCount returns the current number of nodes in the graph.
func (e *Engine) NodeCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.nodes)
}

// EdgeCount returns the current number of edges in the graph.
func (e *Engine) EdgeCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.edges)
}

// GetNode retrieves a node by its ID.
func (e *Engine) GetNode(id string) (*GraphNode, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	n, ok := e.nodes[id]
	return n, ok
}

// FindNode finds a node by Kind, Namespace, Name.
func (e *Engine) FindNode(kind NodeKind, namespace, name string) (*GraphNode, bool) {
	return e.GetNode(NodeID(kind, namespace, name))
}

// Snapshot returns a point-in-time snapshot of the full topology graph.
func (e *Engine) Snapshot() *GraphSnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()

	nodes := make([]*GraphNode, 0, len(e.nodes))
	for _, n := range e.nodes {
		nodes = append(nodes, n)
	}
	edges := make([]*GraphEdge, 0, len(e.edges))
	for _, edge := range e.edges {
		edges = append(edges, edge)
	}
	return &GraphSnapshot{
		Nodes:      nodes,
		Edges:      edges,
		SnapshotAt: time.Now(),
		NodeCount:  len(nodes),
		EdgeCount:  len(edges),
	}
}

// QuerySubgraph returns a filtered subgraph based on the query parameters.
func (e *Engine) QuerySubgraph(q SubgraphQuery) *GraphSnapshot {
	e.mu.RLock()
	defer e.mu.RUnlock()

	depth := q.Depth
	if depth <= 0 {
		depth = 2
	}

	// Determine the set of node IDs to include
	included := make(map[string]bool)

	if q.FocusNodeID != "" {
		// BFS from focus node in both directions
		e.bfsCollect(q.FocusNodeID, depth, included)
		e.bfsCollectReverse(q.FocusNodeID, depth, included)
	} else {
		for id := range e.nodes {
			included[id] = true
		}
	}

	// Apply kind and namespace filters
	nodes := make([]*GraphNode, 0)
	for id := range included {
		n, ok := e.nodes[id]
		if !ok {
			continue
		}
		if len(q.NodeKinds) > 0 && !containsKind(q.NodeKinds, n.Kind) {
			continue
		}
		if q.Namespace != "" && n.Namespace != q.Namespace {
			continue
		}
		nodes = append(nodes, n)
	}

	// Include only edges where both endpoints are in the included set
	edges := make([]*GraphEdge, 0)
	for _, edge := range e.edges {
		if included[edge.From] && included[edge.To] {
			edges = append(edges, edge)
		}
	}

	return &GraphSnapshot{
		Nodes:      nodes,
		Edges:      edges,
		SnapshotAt: time.Now(),
		NodeCount:  len(nodes),
		EdgeCount:  len(edges),
	}
}

// RecentEvents returns K8s events within the given time window for a node.
// Pass empty nodeID to get all recent events.
func (e *Engine) RecentEvents(nodeID string, since time.Time) []GraphEvent {
	e.evMu.RLock()
	defer e.evMu.RUnlock()

	result := make([]GraphEvent, 0)
	for _, ev := range e.events {
		if ev.Timestamp.Before(since) {
			continue
		}
		if nodeID != "" && ev.NodeID != nodeID {
			continue
		}
		result = append(result, ev)
	}
	return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: node upsert helpers
// ─────────────────────────────────────────────────────────────────────────────

func (e *Engine) upsertNode(n *GraphNode) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.nodes[n.ID] = n
}

func (e *Engine) deleteNode(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.nodes, id)
	// Remove all edges touching this node
	for _, eid := range e.outEdges[id] {
		edge := e.edges[eid]
		if edge != nil {
			e.removeInEdge(edge.To, eid)
		}
		delete(e.edges, eid)
	}
	delete(e.outEdges, id)
	for _, eid := range e.inEdges[id] {
		edge := e.edges[eid]
		if edge != nil {
			e.removeOutEdge(edge.From, eid)
		}
		delete(e.edges, eid)
	}
	delete(e.inEdges, id)
}

func (e *Engine) addEdge(edge *GraphEdge) {
	// Caller must hold e.mu.Lock()
	if _, exists := e.edges[edge.ID]; exists {
		return
	}
	if _, fromOK := e.nodes[edge.From]; !fromOK {
		return
	}
	if _, toOK := e.nodes[edge.To]; !toOK {
		return
	}
	e.edges[edge.ID] = edge
	e.outEdges[edge.From] = append(e.outEdges[edge.From], edge.ID)
	e.inEdges[edge.To] = append(e.inEdges[edge.To], edge.ID)
}

func (e *Engine) removeOutEdge(nodeID, edgeID string) {
	outs := e.outEdges[nodeID]
	for i, id := range outs {
		if id == edgeID {
			e.outEdges[nodeID] = append(outs[:i], outs[i+1:]...)
			return
		}
	}
}

func (e *Engine) removeInEdge(nodeID, edgeID string) {
	ins := e.inEdges[nodeID]
	for i, id := range ins {
		if id == edgeID {
			e.inEdges[nodeID] = append(ins[:i], ins[i+1:]...)
			return
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: informer event handlers
// ─────────────────────────────────────────────────────────────────────────────

func (e *Engine) onPod(obj interface{}) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return
	}

	status := podStatus(pod)
	conditions := make(map[string]bool)
	for _, c := range pod.Status.Conditions {
		conditions[string(c.Type)] = c.Status == corev1.ConditionTrue
	}

	restartCount := int64(0)
	for _, cs := range pod.Status.ContainerStatuses {
		restartCount += int64(cs.RestartCount)
	}

	n := &GraphNode{
		ID:              NodeID(KindPod, pod.Namespace, pod.Name),
		Kind:            KindPod,
		Name:            pod.Name,
		Namespace:       pod.Namespace,
		Labels:          pod.Labels,
		Status:          status,
		Phase:           string(pod.Status.Phase),
		Conditions:      conditions,
		ResourceVersion: pod.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       pod.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"node_name":     pod.Spec.NodeName,
			"restart_count": restartCount,
			"ip":            pod.Status.PodIP,
		},
	}
	e.upsertNode(n)

	// Rebuild edges for this pod
	e.mu.Lock()
	e.rebuildPodEdges(pod)
	e.mu.Unlock()
}

func (e *Engine) onDeletePod(obj interface{}) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return
	}
	e.deleteNode(NodeID(KindPod, pod.Namespace, pod.Name))
}

func (e *Engine) onNode(obj interface{}) {
	node, ok := obj.(*corev1.Node)
	if !ok {
		return
	}

	conditions := make(map[string]bool)
	status := StatusHealthy
	for _, c := range node.Status.Conditions {
		val := c.Status == corev1.ConditionTrue
		conditions[string(c.Type)] = val
		if c.Type == corev1.NodeReady && !val {
			status = StatusFailed
		}
		if (c.Type == corev1.NodeDiskPressure || c.Type == corev1.NodeMemoryPressure) && val {
			status = StatusDegraded
		}
	}

	n := &GraphNode{
		ID:              NodeID(KindNode, "", node.Name),
		Kind:            KindNode,
		Name:            node.Name,
		Labels:          node.Labels,
		Status:          status,
		Conditions:      conditions,
		ResourceVersion: node.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       node.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"zone":             node.Labels["topology.kubernetes.io/zone"],
			"instance_type":    node.Labels["node.kubernetes.io/instance-type"],
			"kernel_version":   node.Status.NodeInfo.KernelVersion,
			"os_image":         node.Status.NodeInfo.OSImage,
			"allocatable_cpu":  node.Status.Allocatable.Cpu().String(),
			"allocatable_mem":  node.Status.Allocatable.Memory().String(),
		},
	}
	e.upsertNode(n)
}

func (e *Engine) onDeleteNode(obj interface{}) {
	node, ok := obj.(*corev1.Node)
	if !ok {
		return
	}
	e.deleteNode(NodeID(KindNode, "", node.Name))
}

func (e *Engine) onDeployment(obj interface{}) {
	d, ok := obj.(*appsv1.Deployment)
	if !ok {
		return
	}

	status := StatusHealthy
	if d.Status.UnavailableReplicas > 0 {
		status = StatusDegraded
	}
	if d.Status.ReadyReplicas == 0 && d.Status.Replicas > 0 {
		status = StatusFailed
	}

	n := &GraphNode{
		ID:              NodeID(KindDeployment, d.Namespace, d.Name),
		Kind:            KindDeployment,
		Name:            d.Name,
		Namespace:       d.Namespace,
		Labels:          d.Labels,
		Status:          status,
		ResourceVersion: d.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       d.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"desired_replicas":     d.Status.Replicas,
			"ready_replicas":       d.Status.ReadyReplicas,
			"unavailable_replicas": d.Status.UnavailableReplicas,
			"selector":             d.Spec.Selector.MatchLabels,
		},
	}
	e.upsertNode(n)
}

func (e *Engine) onDeleteDeployment(obj interface{}) {
	d, ok := obj.(*appsv1.Deployment)
	if !ok {
		return
	}
	e.deleteNode(NodeID(KindDeployment, d.Namespace, d.Name))
}

func (e *Engine) onReplicaSet(obj interface{}) {
	rs, ok := obj.(*appsv1.ReplicaSet)
	if !ok {
		return
	}
	status := StatusHealthy
	if rs.Status.ReadyReplicas == 0 && rs.Status.Replicas > 0 {
		status = StatusDegraded
	}
	n := &GraphNode{
		ID:              NodeID(KindReplicaSet, rs.Namespace, rs.Name),
		Kind:            KindReplicaSet,
		Name:            rs.Name,
		Namespace:       rs.Namespace,
		Labels:          rs.Labels,
		Status:          status,
		ResourceVersion: rs.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       rs.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"desired_replicas": rs.Status.Replicas,
			"ready_replicas":   rs.Status.ReadyReplicas,
		},
	}
	e.upsertNode(n)

	// OWNS edge: ownerReferences → Deployment owns this RS
	e.mu.Lock()
	for _, ref := range rs.OwnerReferences {
		if ref.Kind == "Deployment" {
			ownerID := NodeID(KindDeployment, rs.Namespace, ref.Name)
			e.addEdge(&GraphEdge{
				ID:     EdgeID(ownerID, EdgeOwns, n.ID),
				From:   ownerID,
				To:     n.ID,
				Kind:   EdgeOwns,
				Weight: 1.0,
			})
		}
	}
	e.mu.Unlock()
}

func (e *Engine) onStatefulSet(obj interface{}) {
	sts, ok := obj.(*appsv1.StatefulSet)
	if !ok {
		return
	}
	status := StatusHealthy
	if sts.Status.ReadyReplicas == 0 && sts.Status.Replicas > 0 {
		status = StatusFailed
	} else if sts.Status.ReadyReplicas < sts.Status.Replicas {
		status = StatusDegraded
	}
	n := &GraphNode{
		ID:              NodeID(KindStatefulSet, sts.Namespace, sts.Name),
		Kind:            KindStatefulSet,
		Name:            sts.Name,
		Namespace:       sts.Namespace,
		Labels:          sts.Labels,
		Status:          status,
		ResourceVersion: sts.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       sts.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"desired_replicas": sts.Status.Replicas,
			"ready_replicas":   sts.Status.ReadyReplicas,
		},
	}
	e.upsertNode(n)
}

func (e *Engine) onDaemonSet(obj interface{}) {
	ds, ok := obj.(*appsv1.DaemonSet)
	if !ok {
		return
	}
	status := StatusHealthy
	if ds.Status.NumberMisscheduled > 0 {
		status = StatusDegraded
	}
	if ds.Status.NumberReady == 0 && ds.Status.DesiredNumberScheduled > 0 {
		status = StatusFailed
	}
	n := &GraphNode{
		ID:              NodeID(KindDaemonSet, ds.Namespace, ds.Name),
		Kind:            KindDaemonSet,
		Name:            ds.Name,
		Namespace:       ds.Namespace,
		Labels:          ds.Labels,
		Status:          status,
		ResourceVersion: ds.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       ds.CreationTimestamp.Time,
	}
	e.upsertNode(n)
}

func (e *Engine) onService(obj interface{}) {
	svc, ok := obj.(*corev1.Service)
	if !ok {
		return
	}
	n := &GraphNode{
		ID:              NodeID(KindService, svc.Namespace, svc.Name),
		Kind:            KindService,
		Name:            svc.Name,
		Namespace:       svc.Namespace,
		Labels:          svc.Labels,
		Status:          StatusHealthy,
		ResourceVersion: svc.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       svc.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"cluster_ip":  svc.Spec.ClusterIP,
			"type":        string(svc.Spec.Type),
			"selector":    svc.Spec.Selector,
		},
	}
	e.upsertNode(n)

	// Build EXPOSES edges from Service → matching Pods
	e.mu.Lock()
	e.rebuildServiceEdges(svc)
	e.mu.Unlock()
}

func (e *Engine) onIngress(obj interface{}) {
	ing, ok := obj.(*networkingv1.Ingress)
	if !ok {
		return
	}
	n := &GraphNode{
		ID:              NodeID(KindIngress, ing.Namespace, ing.Name),
		Kind:            KindIngress,
		Name:            ing.Name,
		Namespace:       ing.Namespace,
		Labels:          ing.Labels,
		Status:          StatusHealthy,
		ResourceVersion: ing.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       ing.CreationTimestamp.Time,
	}
	e.upsertNode(n)

	// ROUTES_TO: Ingress → Service
	e.mu.Lock()
	for _, rule := range ing.Spec.Rules {
		if rule.HTTP == nil {
			continue
		}
		for _, path := range rule.HTTP.Paths {
			if path.Backend.Service == nil {
				continue
			}
			svcID := NodeID(KindService, ing.Namespace, path.Backend.Service.Name)
			e.addEdge(&GraphEdge{
				ID:   EdgeID(n.ID, EdgeRoutesTo, svcID),
				From: n.ID,
				To:   svcID,
				Kind: EdgeRoutesTo,
				Weight: 1.0,
				Metadata: map[string]string{"host": rule.Host, "path": path.Path},
			})
		}
	}
	e.mu.Unlock()
}

func (e *Engine) onPVC(obj interface{}) {
	pvc, ok := obj.(*corev1.PersistentVolumeClaim)
	if !ok {
		return
	}
	status := StatusHealthy
	if pvc.Status.Phase == corev1.ClaimPending {
		status = StatusPending
	} else if pvc.Status.Phase == corev1.ClaimLost {
		status = StatusFailed
	}
	n := &GraphNode{
		ID:              NodeID(KindPVC, pvc.Namespace, pvc.Name),
		Kind:            KindPVC,
		Name:            pvc.Name,
		Namespace:       pvc.Namespace,
		Labels:          pvc.Labels,
		Status:          status,
		Phase:           string(pvc.Status.Phase),
		ResourceVersion: pvc.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       pvc.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"storage_class": pvc.Spec.StorageClassName,
			"capacity":      pvc.Status.Capacity.Storage().String(),
		},
	}
	e.upsertNode(n)

	// CLAIMS: PVC → PV
	if pvc.Spec.VolumeName != "" {
		pvID := NodeID(KindPersistentVolume, "", pvc.Spec.VolumeName)
		e.mu.Lock()
		e.addEdge(&GraphEdge{
			ID:     EdgeID(n.ID, EdgeClaims, pvID),
			From:   n.ID,
			To:     pvID,
			Kind:   EdgeClaims,
			Weight: 1.0,
		})
		e.mu.Unlock()
	}
}

func (e *Engine) onConfigMap(obj interface{}) {
	cm, ok := obj.(*corev1.ConfigMap)
	if !ok {
		return
	}
	// Skip system configmaps
	if strings.HasPrefix(cm.Name, "kube-") {
		return
	}
	n := &GraphNode{
		ID:              NodeID(KindConfigMap, cm.Namespace, cm.Name),
		Kind:            KindConfigMap,
		Name:            cm.Name,
		Namespace:       cm.Namespace,
		Labels:          cm.Labels,
		Status:          StatusHealthy,
		ResourceVersion: cm.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       cm.CreationTimestamp.Time,
	}
	e.upsertNode(n)
}

func (e *Engine) onNamespace(obj interface{}) {
	ns, ok := obj.(*corev1.Namespace)
	if !ok {
		return
	}
	status := StatusHealthy
	if ns.Status.Phase == corev1.NamespaceTerminating {
		status = StatusFailed
	}
	n := &GraphNode{
		ID:        NodeID(KindNamespace, "", ns.Name),
		Kind:      KindNamespace,
		Name:      ns.Name,
		Labels:    ns.Labels,
		Status:    status,
		UpdatedAt: time.Now(),
		CreatedAt: ns.CreationTimestamp.Time,
	}
	e.upsertNode(n)
}

func (e *Engine) onJob(obj interface{}) {
	job, ok := obj.(*batchv1.Job)
	if !ok {
		return
	}
	status := StatusHealthy
	if job.Status.Failed > 0 {
		status = StatusFailed
	} else if job.Status.Active > 0 {
		status = StatusPending
	}
	n := &GraphNode{
		ID:              NodeID(KindJob, job.Namespace, job.Name),
		Kind:            KindJob,
		Name:            job.Name,
		Namespace:       job.Namespace,
		Labels:          job.Labels,
		Status:          status,
		ResourceVersion: job.ResourceVersion,
		UpdatedAt:       time.Now(),
		CreatedAt:       job.CreationTimestamp.Time,
		Metadata: map[string]interface{}{
			"active":    job.Status.Active,
			"succeeded": job.Status.Succeeded,
			"failed":    job.Status.Failed,
		},
	}
	e.upsertNode(n)
}

func (e *Engine) onDeleteResource(obj interface{}) {
	type withMeta interface {
		GetNamespace() string
		GetName() string
	}
	// Handle tombstone wrapper
	if tombstone, ok := obj.(cache.DeletedFinalStateUnknown); ok {
		obj = tombstone.Obj
	}
	type namer interface {
		GetName() string
		GetNamespace() string
	}
	if n, ok := obj.(namer); ok {
		_ = n
	}
}

func (e *Engine) onEvent(obj interface{}) {
	ev, ok := obj.(*corev1.Event)
	if !ok {
		return
	}
	if ev.Type != corev1.EventTypeWarning {
		return
	}

	ts := ev.LastTimestamp.Time
	if ts.IsZero() {
		ts = ev.EventTime.Time
	}
	if ts.IsZero() {
		ts = time.Now()
	}
	if time.Since(ts) > maxEventAge {
		return
	}

	// Map event to a graph node ID
	ref := ev.InvolvedObject
	var kind NodeKind
	switch ref.Kind {
	case "Pod":
		kind = KindPod
	case "Node":
		kind = KindNode
	case "Deployment":
		kind = KindDeployment
	case "ReplicaSet":
		kind = KindReplicaSet
	case "StatefulSet":
		kind = KindStatefulSet
	case "Service":
		kind = KindService
	case "PersistentVolumeClaim":
		kind = KindPVC
	case "ConfigMap":
		kind = KindConfigMap
	case "Job":
		kind = KindJob
	default:
		return
	}

	nodeID := NodeID(kind, ref.Namespace, ref.Name)

	// Update node status based on severe events
	if isEvictionEvent(ev.Reason) {
		e.mu.Lock()
		if n, ok := e.nodes[nodeID]; ok {
			n.Status = StatusEvicted
			n.UpdatedAt = time.Now()
		}
		e.mu.Unlock()
	}

	gev := GraphEvent{
		NodeID:    nodeID,
		Reason:    ev.Reason,
		Message:   ev.Message,
		Timestamp: ts,
		Count:     ev.Count,
		EventType: ev.Type,
	}

	e.evMu.Lock()
	if len(e.events) >= maxEvents {
		e.events = e.events[1:]
	}
	e.events = append(e.events, gev)
	e.evMu.Unlock()
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: edge construction helpers
// ─────────────────────────────────────────────────────────────────────────────

// rebuildPodEdges rebuilds all edges originating from a pod.
// Caller must hold e.mu.Lock().
func (e *Engine) rebuildPodEdges(pod *corev1.Pod) {
	podID := NodeID(KindPod, pod.Namespace, pod.Name)

	// SCHEDULES_ON: Pod → Node
	if pod.Spec.NodeName != "" {
		nodeID := NodeID(KindNode, "", pod.Spec.NodeName)
		e.addEdge(&GraphEdge{
			ID:     EdgeID(podID, EdgeSchedulesOn, nodeID),
			From:   podID,
			To:     nodeID,
			Kind:   EdgeSchedulesOn,
			Weight: 1.0,
		})
	}

	// OWNS: OwnerReference → Pod (Deployment/RS/StatefulSet/DaemonSet/Job)
	for _, ref := range pod.OwnerReferences {
		var ownerKind NodeKind
		switch ref.Kind {
		case "ReplicaSet":
			ownerKind = KindReplicaSet
		case "StatefulSet":
			ownerKind = KindStatefulSet
		case "DaemonSet":
			ownerKind = KindDaemonSet
		case "Job":
			ownerKind = KindJob
		}
		if ownerKind != "" {
			ownerID := NodeID(ownerKind, pod.Namespace, ref.Name)
			e.addEdge(&GraphEdge{
				ID:     EdgeID(ownerID, EdgeOwns, podID),
				From:   ownerID,
				To:     podID,
				Kind:   EdgeOwns,
				Weight: 1.0,
			})
		}
	}

	// MOUNTS: Pod → PVC
	for _, vol := range pod.Spec.Volumes {
		if vol.PersistentVolumeClaim != nil {
			pvcID := NodeID(KindPVC, pod.Namespace, vol.PersistentVolumeClaim.ClaimName)
			e.addEdge(&GraphEdge{
				ID:     EdgeID(podID, EdgeMounts, pvcID),
				From:   podID,
				To:     pvcID,
				Kind:   EdgeMounts,
				Weight: 1.0,
			})
		}

		// MOUNTS_CONFIG: Pod → ConfigMap
		if vol.ConfigMap != nil {
			cmID := NodeID(KindConfigMap, pod.Namespace, vol.ConfigMap.Name)
			e.addEdge(&GraphEdge{
				ID:     EdgeID(podID, EdgeMountsConfig, cmID),
				From:   podID,
				To:     cmID,
				Kind:   EdgeMountsConfig,
				Weight: 0.8,
			})
		}

		// MOUNTS_SECRET: Pod → Secret
		if vol.Secret != nil {
			secID := NodeID(KindSecret, pod.Namespace, vol.Secret.SecretName)
			e.addEdge(&GraphEdge{
				ID:     EdgeID(podID, EdgeMountsSecret, secID),
				From:   podID,
				To:     secID,
				Kind:   EdgeMountsSecret,
				Weight: 0.8,
			})
		}
	}

	// Infer DEPENDS_ON from env vars (DNS-style service references)
	e.inferDependsOnFromEnv(pod, podID)
}

// rebuildServiceEdges rebuilds EXPOSES edges from a service to matching pods.
// Caller must hold e.mu.Lock().
func (e *Engine) rebuildServiceEdges(svc *corev1.Service) {
	if len(svc.Spec.Selector) == 0 {
		return
	}
	svcID := NodeID(KindService, svc.Namespace, svc.Name)
	selector := labels.Set(svc.Spec.Selector).AsSelector()

	for _, n := range e.nodes {
		if n.Kind != KindPod || n.Namespace != svc.Namespace {
			continue
		}
		podLabels := labels.Set(n.Labels)
		if selector.Matches(podLabels) {
			e.addEdge(&GraphEdge{
				ID:     EdgeID(svcID, EdgeExposes, n.ID),
				From:   svcID,
				To:     n.ID,
				Kind:   EdgeExposes,
				Weight: 1.0,
			})
		}
	}
}

// rebuildAllEdges rebuilds the complete edge set from current node state.
// Called once after initial informer cache sync.
func (e *Engine) rebuildAllEdges() {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Clear all edges
	e.edges = make(map[string]*GraphEdge)
	e.outEdges = make(map[string][]string)
	e.inEdges = make(map[string][]string)

	// Rebuild using the live K8s API for accuracy
	ctx := context.Background()

	// Pods → nodes, owners, volumes
	pods, err := e.client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for i := range pods.Items {
			e.rebuildPodEdges(&pods.Items[i])
		}
	}

	// ReplicaSet → Deployment
	rsList, err := e.client.AppsV1().ReplicaSets("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, rs := range rsList.Items {
			rsID := NodeID(KindReplicaSet, rs.Namespace, rs.Name)
			for _, ref := range rs.OwnerReferences {
				if ref.Kind == "Deployment" {
					ownerID := NodeID(KindDeployment, rs.Namespace, ref.Name)
					e.addEdge(&GraphEdge{
						ID:     EdgeID(ownerID, EdgeOwns, rsID),
						From:   ownerID,
						To:     rsID,
						Kind:   EdgeOwns,
						Weight: 1.0,
					})
				}
			}
		}
	}

	// Services → Pods
	svcs, err := e.client.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for i := range svcs.Items {
			e.rebuildServiceEdges(&svcs.Items[i])
		}
	}

	// Ingresses → Services
	ings, err := e.client.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, ing := range ings.Items {
			ingID := NodeID(KindIngress, ing.Namespace, ing.Name)
			for _, rule := range ing.Spec.Rules {
				if rule.HTTP == nil {
					continue
				}
				for _, path := range rule.HTTP.Paths {
					if path.Backend.Service == nil {
						continue
					}
					svcID := NodeID(KindService, ing.Namespace, path.Backend.Service.Name)
					e.addEdge(&GraphEdge{
						ID:     EdgeID(ingID, EdgeRoutesTo, svcID),
						From:   ingID,
						To:     svcID,
						Kind:   EdgeRoutesTo,
						Weight: 1.0,
					})
				}
			}
		}
	}

	// PVCs → PVs
	pvcs, err := e.client.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{})
	if err == nil {
		for _, pvc := range pvcs.Items {
			if pvc.Spec.VolumeName != "" {
				pvcID := NodeID(KindPVC, pvc.Namespace, pvc.Name)
				pvID := NodeID(KindPersistentVolume, "", pvc.Spec.VolumeName)
				e.addEdge(&GraphEdge{
					ID:     EdgeID(pvcID, EdgeClaims, pvID),
					From:   pvcID,
					To:     pvID,
					Kind:   EdgeClaims,
					Weight: 1.0,
				})
			}
		}
	}

	log.Printf("[graph] Rebuilt edges: %d total", len(e.edges))
}

// inferDependsOnFromEnv parses container env vars for DNS service references.
// e.g. REDIS_HOST=redis.production.svc.cluster.local → DEPENDS_ON Service/production/redis
// Caller must hold e.mu.Lock().
func (e *Engine) inferDependsOnFromEnv(pod *corev1.Pod, podID string) {
	for _, container := range pod.Spec.Containers {
		for _, env := range container.Env {
			if env.Value == "" {
				continue
			}
			// Match pattern: <name>.<namespace>.svc.cluster.local
			parts := strings.Split(env.Value, ".")
			if len(parts) >= 4 && parts[2] == "svc" {
				svcName := parts[0]
				svcNs := parts[1]
				svcID := NodeID(KindService, svcNs, svcName)
				e.addEdge(&GraphEdge{
					ID:     EdgeID(podID, EdgeDependsOn, svcID),
					From:   podID,
					To:     svcID,
					Kind:   EdgeDependsOn,
					Weight: 0.6,
					Metadata: map[string]string{"inferred_from": "env_var", "env": env.Name},
				})
			}
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: BFS helpers
// ─────────────────────────────────────────────────────────────────────────────

// bfsCollect does a forward BFS from nodeID, collecting node IDs up to depth hops.
// Caller must hold e.mu.RLock().
func (e *Engine) bfsCollect(nodeID string, depth int, visited map[string]bool) {
	if depth <= 0 || visited[nodeID] {
		return
	}
	visited[nodeID] = true
	for _, eid := range e.outEdges[nodeID] {
		edge := e.edges[eid]
		if edge != nil {
			e.bfsCollect(edge.To, depth-1, visited)
		}
	}
}

// bfsCollectReverse does a reverse BFS (upstream) from nodeID, collecting node IDs.
// Caller must hold e.mu.RLock().
func (e *Engine) bfsCollectReverse(nodeID string, depth int, visited map[string]bool) {
	if depth <= 0 || visited[nodeID] {
		return
	}
	visited[nodeID] = true
	for _, eid := range e.inEdges[nodeID] {
		edge := e.edges[eid]
		if edge != nil {
			e.bfsCollectReverse(edge.From, depth-1, visited)
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: utilities
// ─────────────────────────────────────────────────────────────────────────────

func podStatus(pod *corev1.Pod) NodeStatus {
	if pod.DeletionTimestamp != nil {
		return StatusFailed
	}
	switch pod.Status.Phase {
	case corev1.PodPending:
		return StatusPending
	case corev1.PodFailed:
		return StatusFailed
	case corev1.PodSucceeded:
		return StatusHealthy
	case corev1.PodRunning:
		for _, cs := range pod.Status.ContainerStatuses {
			if !cs.Ready {
				return StatusDegraded
			}
			if cs.RestartCount > 5 {
				return StatusDegraded
			}
		}
		return StatusHealthy
	}
	return StatusUnknown
}

func isEvictionEvent(reason string) bool {
	return reason == "Evicted" || reason == "OOMKilling"
}

func containsKind(kinds []NodeKind, kind NodeKind) bool {
	for _, k := range kinds {
		if k == kind {
			return true
		}
	}
	return false
}

// Summary returns a brief text description of the graph for debugging.
func (e *Engine) Summary() string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return fmt.Sprintf("TopologyGraph: %d nodes, %d edges", len(e.nodes), len(e.edges))
}
