package cache

import (
	"sort"
	"strings"
	"sync"

	corev1 "k8s.io/api/core/v1"
)

// PodCache stores pod snapshots keyed by namespace/name.
type PodCache struct {
	mu   sync.RWMutex
	data map[string]map[string]*corev1.Pod
}

// NewPodCache returns an empty pod cache.
func NewPodCache() *PodCache {
	return &PodCache{
		data: make(map[string]map[string]*corev1.Pod),
	}
}

// Reset clears all cached pods.
func (c *PodCache) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = make(map[string]map[string]*corev1.Pod)
}

// Set inserts or updates a pod entry.
func (c *PodCache) Set(namespace string, pod *corev1.Pod) {
	if pod == nil {
		return
	}
	ns := strings.TrimSpace(namespace)
	if ns == "" {
		ns = pod.Namespace
	}
	if ns == "" || pod.Name == "" {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.data[ns]; !exists {
		c.data[ns] = make(map[string]*corev1.Pod)
	}
	c.data[ns][pod.Name] = pod.DeepCopy()
}

// Delete removes a pod by namespace/name.
func (c *PodCache) Delete(namespace, name string) {
	ns := strings.TrimSpace(namespace)
	if ns == "" || name == "" {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if pods, ok := c.data[ns]; ok {
		delete(pods, name)
		if len(pods) == 0 {
			delete(c.data, ns)
		}
	}
}

// List returns pods for the provided namespaces.
// If namespaces is empty, all pods are returned.
func (c *PodCache) List(namespaces []string) []*corev1.Pod {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if len(namespaces) == 0 {
		return c.listAllLocked()
	}

	results := make([]*corev1.Pod, 0, 64)
	for _, ns := range namespaces {
		if nsPods, ok := c.data[ns]; ok {
			for _, pod := range nsPods {
				results = append(results, pod.DeepCopy())
			}
		}
	}
	c.sortPods(results)
	return results
}

func (c *PodCache) listAllLocked() []*corev1.Pod {
	results := make([]*corev1.Pod, 0, 256)
	for _, nsPods := range c.data {
		for _, pod := range nsPods {
			results = append(results, pod.DeepCopy())
		}
	}
	c.sortPods(results)
	return results
}

func (c *PodCache) sortPods(pods []*corev1.Pod) {
	sort.Slice(pods, func(i, j int) bool {
		if pods[i].Namespace == pods[j].Namespace {
			return pods[i].Name < pods[j].Name
		}
		return pods[i].Namespace < pods[j].Namespace
	})
}
