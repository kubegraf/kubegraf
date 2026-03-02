// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

package cache

import (
	"testing"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// NewLRUCache
// ─────────────────────────────────────────────────────────────────────────────

func TestNewLRUCache_NotNil(t *testing.T) {
	c := NewLRUCache(100)
	if c == nil {
		t.Fatal("NewLRUCache returned nil")
	}
}

func TestNewLRUCache_EmptyOnCreate(t *testing.T) {
	c := NewLRUCache(100)
	_, ok := c.Get("missing")
	if ok {
		t.Error("new cache should have no entries")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Get / Set
// ─────────────────────────────────────────────────────────────────────────────

func TestLRUCache_SetThenGet(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("key1", "value1", time.Minute)
	val, ok := c.Get("key1")
	if !ok {
		t.Fatal("Get should return true for existing key")
	}
	if val != "value1" {
		t.Errorf("Get = %v, want value1", val)
	}
}

func TestLRUCache_MissReturnsNil(t *testing.T) {
	c := NewLRUCache(100)
	val, ok := c.Get("nonexistent")
	if ok || val != nil {
		t.Error("Get for nonexistent key should return nil, false")
	}
}

func TestLRUCache_Expiry(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("exp-key", "val", 1*time.Millisecond)
	time.Sleep(5 * time.Millisecond)
	_, ok := c.Get("exp-key")
	if ok {
		t.Error("expired entry should not be returned")
	}
}

func TestLRUCache_OverwriteKey(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("k", "first", time.Minute)
	c.Set("k", "second", time.Minute)
	val, ok := c.Get("k")
	if !ok {
		t.Fatal("key should exist")
	}
	if val != "second" {
		t.Errorf("expected second, got %v", val)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

func TestLRUCache_Delete(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("key", "val", time.Minute)
	c.Delete("key")
	_, ok := c.Get("key")
	if ok {
		t.Error("deleted key should not be returned")
	}
}

func TestLRUCache_DeleteNonExistent_NoError(t *testing.T) {
	c := NewLRUCache(100)
	// Should not panic
	c.Delete("nothing")
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear
// ─────────────────────────────────────────────────────────────────────────────

func TestLRUCache_Clear(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("a", 1, time.Minute)
	c.Set("b", 2, time.Minute)
	c.Clear()
	_, ok := c.Get("a")
	if ok {
		t.Error("Clear should remove all entries")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Eviction at capacity
// ─────────────────────────────────────────────────────────────────────────────

func TestLRUCache_Eviction(t *testing.T) {
	c := NewLRUCache(3)
	c.Set("a", 1, time.Minute)
	c.Set("b", 2, time.Minute)
	c.Set("c", 3, time.Minute)
	// Adding a 4th entry should evict the oldest (a)
	c.Set("d", 4, time.Minute)

	stats := c.GetStats()
	evictions, _ := stats["evictions"].(uint64)
	if evictions == 0 {
		t.Error("expected at least one eviction")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// GetStats
// ─────────────────────────────────────────────────────────────────────────────

func TestLRUCache_GetStats_Keys(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("x", "y", time.Minute)
	c.Get("x")
	c.Get("missing")

	stats := c.GetStats()
	for _, key := range []string{"backend", "max_size", "current_size", "hits", "misses", "hit_rate_pct", "evictions", "sets"} {
		if _, ok := stats[key]; !ok {
			t.Errorf("GetStats missing key %q", key)
		}
	}
}

func TestLRUCache_GetStats_Backend(t *testing.T) {
	c := NewLRUCache(100)
	stats := c.GetStats()
	if stats["backend"] != "lru" {
		t.Errorf("backend = %v, want lru", stats["backend"])
	}
}

func TestLRUCache_GetStats_HitRate(t *testing.T) {
	c := NewLRUCache(100)
	c.Set("k", "v", time.Minute)
	c.Get("k")    // hit
	c.Get("miss") // miss

	stats := c.GetStats()
	hitRate, _ := stats["hit_rate_pct"].(float64)
	if hitRate <= 0 || hitRate > 100 {
		t.Errorf("hit_rate_pct = %f, want 0 < rate <= 100", hitRate)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// formatNumber
// ─────────────────────────────────────────────────────────────────────────────

func TestFormatNumber_Small(t *testing.T) {
	if got := formatNumber(999); got != "999" {
		t.Errorf("formatNumber(999) = %q, want 999", got)
	}
}

func TestFormatNumber_Thousands(t *testing.T) {
	got := formatNumber(1000)
	if got != "1,000" {
		t.Errorf("formatNumber(1000) = %q, want 1,000", got)
	}
}

func TestFormatNumber_Millions(t *testing.T) {
	got := formatNumber(1000000)
	if got != "1,000,000" {
		t.Errorf("formatNumber(1000000) = %q, want 1,000,000", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CacheKeyExact
// ─────────────────────────────────────────────────────────────────────────────

func TestCacheKeyExact_ContainsResource(t *testing.T) {
	key := CacheKeyExact("pods", "default")
	if key == "" {
		t.Error("CacheKeyExact should not return empty string")
	}
}

func TestCacheKeyExact_DifferentParams_DifferentKeys(t *testing.T) {
	k1 := CacheKeyExact("pods", "ns-a")
	k2 := CacheKeyExact("pods", "ns-b")
	if k1 == k2 {
		t.Error("different params should produce different keys")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// TTL constants sanity
// ─────────────────────────────────────────────────────────────────────────────

func TestTTLConstants_Positive(t *testing.T) {
	ttls := []time.Duration{TTLPods, TTLServices, TTLDeployments, TTLNodes, TTLEvents, TTLConfigMaps, TTLSecrets, TTLIngresses, TTLCerts}
	for i, ttl := range ttls {
		if ttl <= 0 {
			t.Errorf("TTL[%d] = %v, want positive", i, ttl)
		}
	}
}
