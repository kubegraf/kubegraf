package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"sync"
	"sync/atomic"
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

// LRUCache is an in-memory LRU cache implementation with metrics
type LRUCache struct {
	mu       sync.RWMutex
	items    map[string]*CacheEntry
	maxSize  int
	keyOrder []string // Track access order for LRU eviction

	// Metrics (atomic for lock-free reads)
	hits      uint64
	misses    uint64
	evictions uint64
	sets      uint64
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
			cache.lru = NewLRUCache(calculateOptimalCacheSize())
		} else {
			cache.redis = rdb
			fmt.Println("✅ Connected to Redis cache")
		}

	case CacheBackendLRU:
		cacheSize := calculateOptimalCacheSize()
		cache.lru = NewLRUCache(cacheSize)
		estimatedMemory := (cacheSize * 10) / 1024 // Rough estimate: 10KB per item
		fmt.Printf("✅ Using in-memory LRU cache (%s items, ~%d MB estimated memory)\n", formatNumber(cacheSize), estimatedMemory)
	}

	return cache, nil
}

// calculateOptimalCacheSize determines cache size based on available memory and env config
// Production-ready: scales with system resources
func calculateOptimalCacheSize() int {
	// Check for explicit configuration
	if envSize := os.Getenv("KUBEGRAF_CACHE_SIZE"); envSize != "" {
		if size, err := strconv.Atoi(envSize); err == nil && size > 0 {
			return size
		}
	}

	// Auto-calculate based on available memory
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// Use 5% of total system memory for cache, or min 100MB, max 2GB
	// Assuming ~10KB per cached item on average
	availableMemory := m.Sys // System memory allocated to Go
	targetCacheMemory := availableMemory / 20 // 5% of allocated memory

	// Min: 100MB (10,000 items), Max: 2GB (200,000 items)
	minCacheMemory := uint64(100 * 1024 * 1024)   // 100 MB
	maxCacheMemory := uint64(2 * 1024 * 1024 * 1024) // 2 GB

	if targetCacheMemory < minCacheMemory {
		targetCacheMemory = minCacheMemory
	}
	if targetCacheMemory > maxCacheMemory {
		targetCacheMemory = maxCacheMemory
	}

	// Convert to item count (10KB per item)
	itemCount := int(targetCacheMemory / 10240)

	// Round to nearest 10,000 for cleaner numbers
	itemCount = (itemCount / 10000) * 10000
	if itemCount < 10000 {
		itemCount = 10000
	}

	return itemCount
}

// formatNumber adds commas for readability (e.g., "100,000")
func formatNumber(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	s := fmt.Sprintf("%d", n)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}

// NewLRUCache creates a new LRU cache with metrics
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

// LRU Cache operations with metrics tracking
func (lru *LRUCache) Get(key string) (interface{}, bool) {
	lru.mu.RLock()
	defer lru.mu.RUnlock()

	entry, exists := lru.items[key]
	if !exists {
		atomic.AddUint64(&lru.misses, 1)
		return nil, false
	}

	// Check expiration
	if time.Now().After(entry.ExpiresAt) {
		delete(lru.items, key)
		atomic.AddUint64(&lru.misses, 1)
		return nil, false
	}

	// Update access order (move to front)
	lru.moveToFront(key)
	atomic.AddUint64(&lru.hits, 1)

	return entry.Data, true
}

func (lru *LRUCache) Set(key string, value interface{}, ttl time.Duration) {
	lru.mu.Lock()
	defer lru.mu.Unlock()

	// Evict if at capacity
	if len(lru.items) >= lru.maxSize {
		lru.evictOldest()
		atomic.AddUint64(&lru.evictions, 1)
	}

	entry := &CacheEntry{
		Data:      value,
		ExpiresAt: time.Now().Add(ttl),
	}

	lru.items[key] = entry
	lru.keyOrder = append(lru.keyOrder, key)
	atomic.AddUint64(&lru.sets, 1)
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

// GetStats returns cache statistics (production monitoring)
func (c *Cache) GetStats() map[string]interface{} {
	stats := make(map[string]interface{})

	switch c.backend {
	case CacheBackendLRU:
		return c.lru.GetStats()
	case CacheBackendRedis:
		stats["backend"] = "redis"
		stats["connected"] = c.redis != nil
		// Add Redis stats if available
		if c.redis != nil {
			if info, err := c.redis.Info(c.ctx).Result(); err == nil {
				stats["redis_info"] = info
			}
		}
	}

	return stats
}

// GetStats returns LRU cache statistics
func (lru *LRUCache) GetStats() map[string]interface{} {
	lru.mu.RLock()
	defer lru.mu.RUnlock()

	hits := atomic.LoadUint64(&lru.hits)
	misses := atomic.LoadUint64(&lru.misses)
	total := hits + misses
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(hits) / float64(total) * 100
	}

	return map[string]interface{}{
		"backend":         "lru",
		"max_size":        lru.maxSize,
		"current_size":    len(lru.items),
		"utilization_pct": float64(len(lru.items)) / float64(lru.maxSize) * 100,
		"hits":            hits,
		"misses":          misses,
		"hit_rate_pct":    hitRate,
		"evictions":       atomic.LoadUint64(&lru.evictions),
		"sets":            atomic.LoadUint64(&lru.sets),
		"estimated_memory_mb": (len(lru.items) * 10) / 1024, // 10KB per item
	}
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
