/**
 * Performance Utilities
 * Optimizations for large datasets and complex computations
 */

import { createMemo, Accessor } from 'solid-js';

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate-limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize expensive computations with custom equality check
 */
export function createDeepMemo<T>(
  fn: () => T,
  options?: { equals?: (prev: T, next: T) => boolean }
): Accessor<T> {
  return createMemo(fn, undefined, options);
}

/**
 * Virtual list helper for rendering large lists efficiently
 */
export interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): {
  visibleItems: () => { item: T; index: number }[];
  totalHeight: () => number;
  scrollTop: () => number;
  setScrollTop: (value: number) => void;
} {
  let scrollTop = 0;
  const { itemHeight, containerHeight, overscan = 3 } = options;

  const setScrollTop = (value: number) => {
    scrollTop = Math.max(0, Math.min(value, items.length * itemHeight - containerHeight));
  };

  const getScrollTop = () => scrollTop;

  const visibleItems = createMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const startIndex = Math.max(0, start - overscan);
    const endIndex = Math.min(items.length, end + overscan);

    return items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i,
    }));
  });

  const totalHeight = () => items.length * itemHeight;

  return {
    visibleItems,
    totalHeight,
    scrollTop: getScrollTop,
    setScrollTop,
  };
}

/**
 * Batch updates helper to reduce re-renders
 */
export function batchUpdates<T>(updates: Array<() => void>): void {
  // SolidJS automatically batches updates within the same execution context
  // This is a wrapper for clarity and future compatibility
  for (const update of updates) {
    update();
  }
}

/**
 * Lazy component loader with timeout
 */
export async function lazyWithTimeout<T>(
  importFn: () => Promise<T>,
  timeout: number = 10000
): Promise<T> {
  return Promise.race([
    importFn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Component load timeout')), timeout)
    ),
  ]);
}

/**
 * Performance monitoring hook
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Measure execution time of a function
   */
  measure<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);

    // Keep only last 100 measurements
    const measurements = this.metrics.get(label)!;
    if (measurements.length > 100) {
      measurements.shift();
    }

    return result;
  }

  /**
   * Get average execution time for a label
   */
  getAverage(label: string): number {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) return 0;

    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }

  /**
   * Get performance report
   */
  getReport(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const report: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    this.metrics.forEach((measurements, label) => {
      if (measurements.length === 0) return;

      const sum = measurements.reduce((acc, val) => acc + val, 0);
      const avg = sum / measurements.length;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);

      report[label] = { avg, min, max, count: measurements.length };
    });

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Log performance report to console
   */
  logReport(): void {
    const report = this.getReport();
    console.table(report);
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Cache manager for expensive computations
 */
export class CacheManager<K, V> {
  private cache: Map<K, { value: V; timestamp: number }> = new Map();
  private maxAge: number;
  private maxSize: number;

  constructor(options: { maxAge?: number; maxSize?: number } = {}) {
    this.maxAge = options.maxAge || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    // Enforce max size
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: K[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

/**
 * Memoized function with cache
 */
export function memoize<Args extends any[], Result>(
  fn: (...args: Args) => Result,
  options: { maxAge?: number; maxSize?: number; keyFn?: (...args: Args) => string } = {}
): (...args: Args) => Result {
  const cache = new CacheManager<string, Result>(options);
  const keyFn = options.keyFn || ((...args: Args) => JSON.stringify(args));

  return (...args: Args): Result => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, options);
}

/**
 * Request idle callback wrapper
 */
export function requestIdleTask(
  callback: () => void,
  options?: { timeout?: number }
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return window.setTimeout(callback, 1) as any;
  }
}

/**
 * Cancel idle callback
 */
export function cancelIdleTask(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}

/**
 * Scale confidence from 0-1 API range to 0-100 percentage
 */
export function scaleConfidence(raw: number): number {
  return raw > 0 && raw <= 1 ? raw * 100 : raw;
}

/**
 * Deep equality check for objects
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Shallow equality check for objects
 */
export function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}
