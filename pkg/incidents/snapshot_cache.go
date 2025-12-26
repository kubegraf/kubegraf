// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package incidents

import (
	"container/list"
	"sync"
	"time"
)

// SnapshotCache provides LRU caching for incident snapshots
type SnapshotCache struct {
	mu       sync.RWMutex
	items    map[string]*list.Element
	lru      *list.List
	maxSize  int
	ttl      time.Duration
}

// cacheItem wraps a snapshot with metadata
type cacheItem struct {
	fingerprint string
	snapshot    *IncidentSnapshot
	expiresAt   time.Time
}

// NewSnapshotCache creates a new snapshot cache
func NewSnapshotCache(maxSize int, ttl time.Duration) *SnapshotCache {
	return &SnapshotCache{
		items:   make(map[string]*list.Element),
		lru:     list.New(),
		maxSize: maxSize,
		ttl:     ttl,
	}
}

// Get retrieves a snapshot from cache if it exists and is not expired
func (c *SnapshotCache) Get(fingerprint string) (*IncidentSnapshot, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	elem, ok := c.items[fingerprint]
	if !ok {
		return nil, false
	}

	item := elem.Value.(*cacheItem)
	
	// Check expiration
	if time.Now().After(item.expiresAt) {
		c.mu.RUnlock()
		c.mu.Lock()
		// Double-check after acquiring write lock
		elem, ok = c.items[fingerprint]
		if ok && elem.Value.(*cacheItem).expiresAt.Before(time.Now()) {
			c.removeElement(elem)
		}
		c.mu.Unlock()
		c.mu.RLock()
		return nil, false
	}

	// Move to front (most recently used)
	c.mu.RUnlock()
	c.mu.Lock()
	c.lru.MoveToFront(elem)
	c.mu.Unlock()
	c.mu.RLock()

	return item.snapshot, true
}

// Put stores a snapshot in the cache
func (c *SnapshotCache) Put(fingerprint string, snapshot *IncidentSnapshot) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if already exists
	if elem, ok := c.items[fingerprint]; ok {
		// Update existing
		item := elem.Value.(*cacheItem)
		item.snapshot = snapshot
		item.expiresAt = time.Now().Add(c.ttl)
		c.lru.MoveToFront(elem)
		return
	}

	// Add new item
	item := &cacheItem{
		fingerprint: fingerprint,
		snapshot:    snapshot,
		expiresAt:   time.Now().Add(c.ttl),
	}
	elem := c.lru.PushFront(item)
	c.items[fingerprint] = elem

	// Evict if over capacity
	if c.lru.Len() > c.maxSize {
		back := c.lru.Back()
		if back != nil {
			c.removeElement(back)
		}
	}
}

// removeElement removes an element from the cache
func (c *SnapshotCache) removeElement(elem *list.Element) {
	item := elem.Value.(*cacheItem)
	delete(c.items, item.fingerprint)
	c.lru.Remove(elem)
}

// Clear removes all items from the cache
func (c *SnapshotCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*list.Element)
	c.lru = list.New()
}

// Size returns the current number of items in the cache
func (c *SnapshotCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lru.Len()
}

