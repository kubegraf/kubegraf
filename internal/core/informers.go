// Copyright 2025 KubeGraf Contributors

package core

import (
	"context"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

// InformerStore wraps shared informers with caching
type InformerStore struct {
	factory   informers.SharedInformerFactory
	clientset *kubernetes.Clientset
	stopCh    chan struct{}
	started   bool
	mu        sync.RWMutex
}

// NewInformerStore creates a new informer store
func NewInformerStore(clientset *kubernetes.Clientset) *InformerStore {
	factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
	return &InformerStore{
		factory:   factory,
		clientset: clientset,
		stopCh:    make(chan struct{}),
	}
}

// Start starts all informers
func (is *InformerStore) Start() {
	is.mu.Lock()
	defer is.mu.Unlock()

	if is.started {
		return
	}

	is.factory.Start(is.stopCh)
	is.factory.WaitForCacheSync(is.stopCh)
	is.started = true
}

// Stop stops all informers
func (is *InformerStore) Stop() {
	is.mu.Lock()
	defer is.mu.Unlock()

	if !is.started {
		return
	}

	close(is.stopCh)
	is.started = false
}

// GetPods returns all pods in the given namespace
func (is *InformerStore) GetPods(namespace string) ([]*corev1.Pod, error) {
	lister := is.factory.Core().V1().Pods().Lister()

	if namespace == "" || namespace == "all" {
		// Get pods from all namespaces
		pods, err := lister.List(labels.Everything())
		if err != nil {
			return nil, err
		}
		return pods, nil
	}

	// Get pods from specific namespace
	pods, err := lister.Pods(namespace).List(labels.Everything())
	if err != nil {
		return nil, err
	}
	return pods, nil
}

// GetEvents returns events for a resource
func (is *InformerStore) GetEvents(ctx context.Context, namespace, name string) ([]corev1.Event, error) {
	events, err := is.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: "involvedObject.name=" + name,
	})
	if err != nil {
		return nil, err
	}
	return events.Items, nil
}

// WatchPods adds an event handler for pod changes
func (is *InformerStore) WatchPods(handler cache.ResourceEventHandlerFuncs) {
	informer := is.factory.Core().V1().Pods().Informer()
	informer.AddEventHandler(handler)
}
