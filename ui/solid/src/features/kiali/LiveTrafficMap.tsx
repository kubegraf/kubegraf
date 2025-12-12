// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { Component, createSignal, createResource, createEffect, onCleanup, For, Show } from 'solid-js';
import * as d3 from 'd3';

interface TrafficNode {
  id: string;
  name: string;
  namespace: string;
  type: 'service' | 'pod' | 'deployment';
  status: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  requestRate: number;
  errorRate: number;
  latency: number;
  labels?: Record<string, string>;
}

interface TrafficEdge {
  source: string;
  target: string;
  protocol: string;
  port: number;
  requestRate: number;
  errorRate: number;
  latency: number;
  trafficType: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
}

interface TrafficMetrics {
  nodes: TrafficNode[];
  edges: TrafficEdge[];
  timestamp: string;
}

const LiveTrafficMap: Component = () => {
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [refreshInterval, setRefreshInterval] = createSignal(5000); // 5 seconds

  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let simulation: d3.Simulation<TrafficNode, TrafficEdge> | null = null;
  let animationFrame: number | null = null;
  let trafficAnimation: any = null;

  // Fetch traffic metrics - simplified to fetch all namespaces
  const [trafficData, { refetch, loading, error: trafficError }] = createResource(
    async () => {
      console.log('[LiveTrafficMap] Fetching traffic metrics');

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const url = `/api/traffic/metrics`;
        console.log('[LiveTrafficMap] Fetch URL:', url);

        const response = await fetch(url, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        console.log('[LiveTrafficMap] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('[LiveTrafficMap] Response error:', errorText);
          throw new Error(`Failed to fetch traffic metrics (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('[LiveTrafficMap] Received data:', {
          nodeCount: data?.nodes?.length || 0,
          edgeCount: data?.edges?.length || 0,
          timestamp: data?.timestamp
        });

        // Always return valid structure
        return {
          nodes: data?.nodes || [],
          edges: data?.edges || [],
          timestamp: data?.timestamp || new Date().toISOString(),
        } as TrafficMetrics;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('[LiveTrafficMap] Error fetching traffic metrics:', err);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out after 60 seconds. Please check if the cluster is accessible.');
        }
        throw err;
      }
    }
  );

  // Auto-refresh
  let refreshTimer: number | null = null;
  createEffect(() => {
    if (autoRefresh()) {
      refreshTimer = setInterval(() => {
        refetch();
      }, refreshInterval()) as unknown as number;
    } else if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  });

  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'healthy': return '#22c55e';
      case 'degraded': return '#f59e0b';
      case 'unhealthy': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getNodeColor = (node: TrafficNode): string => {
    if (node.type === 'service') return '#06b6d4';
    if (node.type === 'deployment') return '#3b82f6';
    return getHealthColor(node.health);
  };

  const getEdgeWidth = (edge: TrafficEdge): number => {
    // Width based on request rate (min 1, max 8)
    if (edge.requestRate === 0) return 1;
    return Math.min(8, Math.max(1, Math.log10(edge.requestRate + 1) * 2));
  };

  const getEdgeColor = (edge: TrafficEdge): string => {
    return getHealthColor(edge.health);
  };

  const setupVisualization = () => {
    if (!svgRef || !trafficData() || !containerRef) return;

    const data = trafficData()!;
    if (!data || data.nodes.length === 0) return;

    // Clear previous
    d3.select(svgRef).selectAll('*').remove();
    if (simulation) simulation.stop();
    if (animationFrame) cancelAnimationFrame(animationFrame);

    const width = containerRef.clientWidth || 1000;
    const height = 600;

    const svg = d3.select(svgRef)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare nodes
    const nodes: TrafficNode[] = data.nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    // Prepare edges
    const edges: TrafficEdge[] = data.edges.map(e => ({
      ...e,
      source: nodes.find(n => n.id === e.source) || e.source,
      target: nodes.find(n => n.id === e.target) || e.target,
    }));

    // Create simulation
    simulation = d3.forceSimulation<TrafficNode>(nodes)
      .force('link', d3.forceLink<TrafficEdge, TrafficNode>(edges)
        .id(d => d.id)
        .distance(100)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Add arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', d => getEdgeColor(d))
      .attr('stroke-width', d => getEdgeWidth(d))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)')
      .style('filter', 'drop-shadow(0px 0px 2px rgba(0,0,0,0.3))');

    // Add traffic flow animation (circles moving along edges)
    const trafficCircles = g.append('g')
      .selectAll('circle')
      .data(edges.filter(e => e.requestRate > 0))
      .enter()
      .append('circle')
      .attr('r', 3)
      .attr('fill', d => getEdgeColor(d))
      .attr('opacity', 0.8)
      .style('filter', 'drop-shadow(0px 0px 3px currentColor)');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, TrafficNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation?.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation?.alphaTarget(0);
          d.fx = undefined;
          d.fy = undefined;
        })
      );

    // Add circles for nodes with health indicator
    node.append('circle')
      .attr('r', d => d.type === 'service' ? 22 : d.type === 'deployment' ? 18 : 15)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => getHealthColor(d.health))
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))');

    // Add health indicator ring
    node.append('circle')
      .attr('r', d => (d.type === 'service' ? 22 : d.type === 'deployment' ? 18 : 15) + 3)
      .attr('fill', 'none')
      .attr('stroke', d => getHealthColor(d.health))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.health === 'degraded' ? '4,4' : 'none')
      .attr('opacity', d => d.health === 'unhealthy' ? 1 : 0.5);

    // Add labels with metrics
    node.append('text')
      .text(d => d.name)
      .attr('dx', d => (d.type === 'service' ? 28 : 24))
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', 'var(--text-primary)')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)');

    // Add metrics text
    node.append('text')
      .text(d => {
        if (d.requestRate > 0) {
          return `${d.requestRate.toFixed(1)} req/s`;
        }
        return '';
      })
      .attr('dx', d => (d.type === 'service' ? 28 : 24))
      .attr('dy', 18)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-muted)')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);

      // Animate traffic flow
      trafficCircles.each(function(d: any) {
        const source = d.source;
        const target = d.target;
        if (typeof source === 'object' && typeof target === 'object') {
          const progress = (Date.now() / 2000) % 1; // 2 second cycle
          const x = source.x + (target.x - source.x) * progress;
          const y = source.y + (target.y - source.y) * progress;
          d3.select(this)
            .attr('cx', x)
            .attr('cy', y);
        }
      });
    });

    // Animate traffic flow continuously
    const animate = () => {
      if (trafficCircles.size() > 0) {
        trafficCircles.each(function(d: any) {
          const source = d.source;
          const target = d.target;
          if (typeof source === 'object' && typeof target === 'object') {
            const progress = (Date.now() / (2000 / Math.max(1, d.requestRate / 10))) % 1;
            const x = source.x + (target.x - source.x) * progress;
            const y = source.y + (target.y - source.y) * progress;
            d3.select(this)
              .attr('cx', x)
              .attr('cy', y);
          }
        });
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
  };

  // Setup visualization when data is ready
  createEffect(() => {
    const data = trafficData();
    if (data && data.nodes && data.nodes.length > 0) {
      console.log('[LiveTrafficMap] Data ready, setting up visualization');
      setTimeout(() => setupVisualization(), 100);
    }
  });

  onCleanup(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (simulation) simulation.stop();
  });

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Live Traffic Map</h2>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time service mesh traffic visualization • Animated flow • Health indicators
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh()}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              class="w-4 h-4"
            />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Auto-refresh</span>
          </label>
          <button
            onClick={() => refetch()}
            class="px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Refresh
          </button>
          <button
            onClick={() => setupVisualization()}
            class="px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            Reset Layout
          </button>
        </div>
      </div>

      {loading() && (
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: 'var(--text-muted)' }}>Loading live traffic data...</p>
            <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              This may take a few seconds...
            </p>
          </div>
        </div>
      )}

      {!loading() && trafficError() && (
        <div class="flex items-center justify-center h-64">
          <div class="text-center p-4 rounded-lg max-w-md" style={{ background: 'var(--bg-secondary)' }}>
            <div class="text-red-500 mb-2 text-2xl">⚠️</div>
            <p class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Failed to load traffic data</p>
            <p class="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {trafficError()?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              class="px-4 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading() && !trafficError() && trafficData() && (
        <>
          <div
            ref={containerRef}
            class="rounded-lg border overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              minHeight: '600px',
            }}
          >
            <svg ref={svgRef} class="w-full h-full" />
          </div>

          {/* Legend */}
          <div class="flex items-center gap-6 p-4 rounded-lg flex-wrap" style={{ background: 'var(--bg-secondary)' }}>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full" style={{ background: '#06b6d4' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Services</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Deployments</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full" style={{ background: '#22c55e' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Healthy Pods</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full border-2" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Degraded</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full" style={{ background: '#ef4444' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Unhealthy</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4" style={{ color: '#22c55e' }}>
                <line x1="0" y1="0" x2="20" y2="0" stroke="currentColor" stroke-width="3" />
              </svg>
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Traffic Flow</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full animate-pulse" style={{ background: '#06b6d4' }} />
              <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Live Traffic</span>
            </div>
          </div>

          {/* Stats */}
          <div class="grid grid-cols-3 gap-4">
            <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {trafficData()!.nodes.length}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Nodes</div>
            </div>
            <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {trafficData()!.edges.length}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Connections</div>
            </div>
            <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {trafficData()!.edges.reduce((sum, e) => sum + e.requestRate, 0).toFixed(1)}
              </div>
              <div class="text-sm" style={{ color: 'var(--text-muted)' }}>Total RPS</div>
            </div>
          </div>
        </>
      )}

      {!loading() && !trafficError() && trafficData() && trafficData()!.nodes.length === 0 && (
        <div class="flex items-center justify-center h-64">
          <p style={{ color: 'var(--text-muted)' }}>No traffic data found in this namespace</p>
        </div>
      )}
    </div>
  );
};

export default LiveTrafficMap;

