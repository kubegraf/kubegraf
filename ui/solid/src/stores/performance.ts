// Copyright 2025 KubeGraf Contributors
// SPDX-License-Identifier: Apache-2.0

import { createSignal, createEffect } from 'solid-js';
import { api } from '../services/api';

export interface PerformanceSpan {
  requestId: string;
  route: string;
  method: string;
  handlerTotalMs: number;
  upstreamK8sCalls: number;
  upstreamK8sTotalMs: number;
  dbMs: number;
  cacheHit: boolean;
  incidentPattern?: string;
  cluster?: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface PerformanceSummary {
  route: string;
  method: string;
  count: number;
  p50: number;
  p90: number;
  p99: number;
  cacheHitRate: number;
  avgUpstreamK8sCalls: number;
  avgUpstreamK8sMs: number;
  avgDBMs: number;
  lastUpdated: string;
}

export interface UIPerformanceMetric {
  page: string;
  action: string;
  ms: number;
  incidentId?: string;
  requestId?: string;
  timestamp: number;
}

class PerformanceStore {
  private uiMetrics: UIPerformanceMetric[] = [];
  private maxUIMetrics = 200;

  // Record UI performance metric
  recordUIMetric(metric: Omit<UIPerformanceMetric, 'timestamp'>) {
    const fullMetric: UIPerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    this.uiMetrics.push(fullMetric);
    if (this.uiMetrics.length > this.maxUIMetrics) {
      this.uiMetrics = this.uiMetrics.slice(-this.maxUIMetrics);
    }

    // Optionally send to backend (local only)
    api.postPerfUI(fullMetric).catch((err) => {
      console.debug('[Perf] Failed to send UI metric:', err);
    });
  }

  // Get recent UI metrics
  getRecentUIMetrics(count = 50): UIPerformanceMetric[] {
    return this.uiMetrics.slice(-count);
  }

  // Clear UI metrics
  clearUIMetrics() {
    this.uiMetrics = [];
  }
}

export const performanceStore = new PerformanceStore();

// Performance tracking utilities
export class PerformanceTracker {
  private startTime: number;
  private page: string;
  private action: string;
  private incidentId?: string;
  private requestId?: string;

  constructor(page: string, action: string, incidentId?: string, requestId?: string) {
    this.page = page;
    this.action = action;
    this.incidentId = incidentId;
    this.requestId = requestId;
    this.startTime = performance.now();
  }

  end() {
    const ms = performance.now() - this.startTime;
    performanceStore.recordUIMetric({
      page: this.page,
      action: this.action,
      ms,
      incidentId: this.incidentId,
      requestId: this.requestId,
    });
    return ms;
  }
}

// Helper to track modal open to paint
export function trackModalOpen(incidentId?: string, requestId?: string): () => void {
  const tracker = new PerformanceTracker('incident_modal', 'open_to_paint', incidentId, requestId);
  return () => tracker.end();
}

// Helper to track tab load
export function trackTabLoad(tabName: string, incidentId?: string, requestId?: string, cached = false): () => void {
  const action = cached ? `${tabName}_cached_load` : `${tabName}_first_load`;
  const tracker = new PerformanceTracker('incident_modal', action, incidentId, requestId);
  return () => tracker.end();
}

// Helper to track snapshot fetch
export function trackSnapshotFetch(incidentId?: string, requestId?: string): () => void {
  const tracker = new PerformanceTracker('incident_modal', 'snapshot_fetch', incidentId, requestId);
  return () => tracker.end();
}

// Helper to track incident list load
export function trackIncidentListLoad(): () => void {
  const tracker = new PerformanceTracker('incidents_page', 'list_load');
  return () => tracker.end();
}

