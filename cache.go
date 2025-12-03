package main

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

// CacheBackend represents the cache storage backend
type CacheBackend string

const (
	CacheBackendRedis CacheBackend = "redis"
	CacheBackendLRU   CacheBackend = "lru"
)

// CacheEntry represents a cached item with expiration
type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// Cache provides a unified caching interface
type Cache struct {
	backend CacheBackend
	redis   *redis.Client
	lru     *LRUCache
	ctx     context.Context
}

// LRUCache is an in-memory LRU cache implementation
type LRUCache struct {
	mu       sync.RWMutex
	items    map[string]*CacheEntry
	maxSize  int
	keyOrder []string // Track access order for LRU eviction
}

// NewCache creates a new cache instance
func NewCache(backend CacheBackend, redisAddr string) (*Cache, error) {
	ctx := context.Background()
	cache := &Cache{
		backend: backend,
		ctx:     ctx,
	}

	switch backend {
	case CacheBackendRedis:
		rdb := redis.NewClient(&redis.Options{
			Addr:         redisAddr,
			Password:     "", // No password by default
			DB:           0,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  3 * time.Second,
			WriteTimeout: 3 * time.Second,
		})

		// Test connection
		_, err := rdb.Ping(ctx).Result()
		if err != nil {
			// Fallback to LRU if Redis unavailable
			fmt.Printf("⚠️  Redis unavailable, falling back to LRU cache: %v\n", err)
			cache.backend = CacheBackendLRU
			cache.lru = NewLRUCache(10000) // 10k items max
		} else {
			cache.redis = rdb
			fmt.Println("✅ Connected to Redis cache")
		}

	case CacheBackendLRU:
		cache.lru = NewLRUCache(10000) // 10k items max
		fmt.Println("✅ Using in-memory LRU cache (10,000 items)")
	}

	return cache, nil
}

// NewLRUCache creates a new LRU cache
func NewLRUCache(maxSize int) *LRUCache {
	return &LRUCache{
		items:    make(map[string]*CacheEntry),
		maxSize:  maxSize,
		keyOrder: make([]string, 0, maxSize),
	}
}

// Get retrieves a value from cache
func (c *Cache) Get(key string) (interface{}, bool) {
	switch c.backend {
	case CacheBackendRedis:
		return c.getFromRedis(key)
	case CacheBackendLRU:
		return c.lru.Get(key)
	}
	return nil, false
}

// Set stores a value in cache with TTL
func (c *Cache) Set(key string, value interface{}, ttl time.Duration) error {
	switch c.backend {
	case CacheBackendRedis:
		return c.setInRedis(key, value, ttl)
	case CacheBackendLRU:
		c.lru.Set(key, value, ttl)
		return nil
	}
	return fmt.Errorf("unknown cache backend: %s", c.backend)
}

// Delete removes a value from cache
func (c *Cache) Delete(key string) error {
	switch c.backend {
	case CacheBackendRedis:
		return c.redis.Del(c.ctx, key).Err()
	case CacheBackendLRU:
		c.lru.Delete(key)
		return nil
	}
	return nil
}

// Clear removes all cached items
func (c *Cache) Clear() error {
	switch c.backend {
	case CacheBackendRedis:
		return c.redis.FlushDB(c.ctx).Err()
	case CacheBackendLRU:
		c.lru.Clear()
		return nil
	}
	return nil
}

// Redis operations
func (c *Cache) getFromRedis(key string) (interface{}, bool) {
	val, err := c.redis.Get(c.ctx, key).Result()
	if err == redis.Nil {
		return nil, false
	} else if err != nil {
		fmt.Printf("Redis GET error: %v\n", err)
		return nil, false
	}

	var data interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		fmt.Printf("Redis unmarshal error: %v\n", err)
		return nil, false
	}

	return data, true
}

func (c *Cache) setInRedis(key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}

	return c.redis.Set(c.ctx, key, data, ttl).Err()
}

// LRU Cache operations
func (lru *LRUCache) Get(key string) (interface{}, bool) {
	lru.mu.RLock()
	defer lru.mu.RUnlock()

	entry, exists := lru.items[key]
	if !exists {
		return nil, false
	}

	// Check expiration
	if time.Now().After(entry.ExpiresAt) {
		delete(lru.items, key)
		return nil, false
	}

	// Update access order (move to front)
	lru.moveToFront(key)

	return entry.Data, true
}

func (lru *LRUCache) Set(key string, value interface{}, ttl time.Duration) {
	lru.mu.Lock()
	defer lru.mu.Unlock()

	// Evict if at capacity
	if len(lru.items) >= lru.maxSize {
		lru.evictOldest()
	}

	entry := &CacheEntry{
		Data:      value,
		ExpiresAt: time.Now().Add(ttl),
	}

	lru.items[key] = entry
	lru.keyOrder = append(lru.keyOrder, key)
}

func (lru *LRUCache) Delete(key string) {
	lru.mu.Lock()
	defer lru.mu.Unlock()

	delete(lru.items, key)
	lru.removeFromOrder(key)
}

func (lru *LRUCache) Clear() {
	lru.mu.Lock()
	defer lru.mu.Unlock()

	lru.items = make(map[string]*CacheEntry)
	lru.keyOrder = make([]string, 0, lru.maxSize)
}

func (lru *LRUCache) moveToFront(key string) {
	// Remove from current position
	for i, k := range lru.keyOrder {
		if k == key {
			lru.keyOrder = append(lru.keyOrder[:i], lru.keyOrder[i+1:]...)
			break
		}
	}
	// Add to front
	lru.keyOrder = append(lru.keyOrder, key)
}

func (lru *LRUCache) removeFromOrder(key string) {
	for i, k := range lru.keyOrder {
		if k == key {
			lru.keyOrder = append(lru.keyOrder[:i], lru.keyOrder[i+1:]...)
			break
		}
	}
}

func (lru *LRUCache) evictOldest() {
	if len(lru.keyOrder) == 0 {
		return
	}
	oldestKey := lru.keyOrder[0]
	delete(lru.items, oldestKey)
	lru.keyOrder = lru.keyOrder[1:]
}

// Cache key helpers
func CacheKey(namespace, resource string) string {
	return fmt.Sprintf("%s:%s:%d", resource, namespace, time.Now().Unix()/30) // 30s bucket
}

func CacheKeyExact(resource string, params ...string) string {
	key := resource
	for _, p := range params {
		key += ":" + p
	}
	return key
}

// TTL constants
const (
	TTLPods        = 30 * time.Second
	TTLServices    = 30 * time.Second
	TTLDeployments = 30 * time.Second
	TTLNodes       = 60 * time.Second
	TTLEvents      = 10 * time.Second
	TTLConfigMaps  = 60 * time.Second
	TTLSecrets     = 60 * time.Second
	TTLIngresses   = 30 * time.Second
	TTLCerts       = 60 * time.Second
)
