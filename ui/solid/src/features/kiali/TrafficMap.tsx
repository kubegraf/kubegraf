// Copyright 2025 KubeGraf Contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0

import { Component, createSignal, createResource, createEffect, For, Show } from 'solid-js';
import { api } from '../../services/api';
import { namespace } from '../../stores/cluster';
import * as d3 from 'd3';

interface ServiceNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  namespace: string;
  type: 'service' | 'pod' | 'deployment';
  status?: string;
  endpoints?: number;
}

interface TrafficLink extends d3.SimulationLinkDatum<ServiceNode> {
  source: string | ServiceNode;
  target: string | ServiceNode;
  protocol?: string;
  port?: number;
}

const TrafficMap: Component = () => {
  const [services] = createResource(
    () => namespace(),
    async (ns) => {
      const svcs = await api.getServices(ns === '_all' ? undefined : ns);
      const pods = await api.getPods(ns === '_all' ? undefined : ns);
      const deployments = await api.getDeployments(ns === '_all' ? undefined : ns);
      
      return { services: svcs || [], pods: pods || [], deployments: deployments || [] };
    }
  );

  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let simulation: d3.Simulation<ServiceNode, TrafficLink> | null = null;

  const setupVisualization = () => {
    if (!svgRef || !services() || !containerRef) return;

    const data = services();
    if (!data || data.services.length === 0) return;

    // Clear previous
    d3.select(svgRef).selectAll('*').remove();
    if (simulation) simulation.stop();

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

    // Build nodes from services
    const nodes: ServiceNode[] = data.services.map((svc: any) => ({
      id: `service-${svc.namespace}-${svc.name}`,
      name: svc.name,
      namespace: svc.namespace || 'default',
      type: 'service',
      status: 'running',
      endpoints: svc.endpoints?.length || 0,
      x: Math.random() * width,
      y: Math.random() * height,
    }));

    // Add deployment nodes
    data.deployments.forEach((dep: any) => {
      nodes.push({
        id: `deployment-${dep.namespace}-${dep.name}`,
        name: dep.name,
        namespace: dep.namespace || 'default',
        type: 'deployment',
        status: dep.status || 'unknown',
        x: Math.random() * width,
        y: Math.random() * height,
      });
    });

    // Build links - connect services to their pods/deployments
    const links: TrafficLink[] = [];
    data.services.forEach((svc: any) => {
      const svcId = `service-${svc.namespace}-${svc.name}`;
      
      // Find pods that match service selectors
      if (svc.selectors) {
        data.pods.forEach((pod: any) => {
          if (pod.namespace === svc.namespace) {
            let matches = true;
            for (const [key, value] of Object.entries(svc.selectors)) {
              if (pod.labels?.[key] !== value) {
                matches = false;
                break;
              }
            }
            if (matches) {
              const podId = `pod-${pod.namespace}-${pod.name}`;
              // Add pod node if not exists
              if (!nodes.find(n => n.id === podId)) {
                nodes.push({
                  id: podId,
                  name: pod.name,
                  namespace: pod.namespace,
                  type: 'pod',
                  status: pod.status,
                  x: Math.random() * width,
                  y: Math.random() * height,
                });
              }
              links.push({
                source: svcId,
                target: podId,
                protocol: 'TCP',
                port: svc.ports?.[0]?.port || 80,
              });
            }
          }
        });
      }

      // Connect to deployments
      data.deployments.forEach((dep: any) => {
        if (dep.namespace === svc.namespace && dep.labels) {
          let matches = true;
          if (svc.selectors) {
            for (const [key, value] of Object.entries(svc.selectors)) {
              if (dep.labels[key] !== value) {
                matches = false;
                break;
              }
            }
          }
          if (matches) {
            const depId = `deployment-${dep.namespace}-${dep.name}`;
            links.push({
              source: svcId,
              target: depId,
              protocol: 'TCP',
            });
          }
        }
      });
    });

    // Create simulation
    simulation = d3.forceSimulation<ServiceNode>(nodes)
      .force('link', d3.forceLink<TrafficLink, ServiceNode>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Add arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(d3.drag<SVGGElement, ServiceNode>()
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

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d) => d.type === 'service' ? 20 : d.type === 'deployment' ? 15 : 12)
      .attr('fill', (d) => {
        if (d.type === 'service') return '#06b6d4';
        if (d.type === 'deployment') return '#3b82f6';
        return '#ec4899';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels
    node.append('text')
      .text(d => d.name)
      .attr('dx', (d) => d.type === 'service' ? 25 : 20)
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('fill', 'var(--text-primary)')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  };

  // Setup visualization when data is ready
  createEffect(() => {
    if (services() && !services.loading) {
      setTimeout(() => setupVisualization(), 100);
    }
  });

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Traffic Map</h2>
          <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Service mesh traffic visualization • Services → Pods → Deployments
          </p>
        </div>
        <button
          onClick={() => setupVisualization()}
          class="px-3 py-2 rounded-lg text-sm hover:bg-[var(--bg-tertiary)]"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          Reset Layout
        </button>
      </div>

      <Show when={services.loading}>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: 'var(--text-muted)' }}>Loading traffic data...</p>
          </div>
        </div>
      </Show>

      <Show when={!services.loading && services()}>
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
        <div class="flex items-center gap-6 p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" style={{ background: '#06b6d4' }} />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Services</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" style={{ background: '#3b82f6' }} />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Deployments</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded-full" style={{ background: '#ec4899' }} />
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Pods</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" style={{ color: '#94a3b8' }}>
              <line x1="0" y1="0" x2="20" y2="0" stroke="currentColor" stroke-width="2" />
            </svg>
            <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>Traffic Flow</span>
          </div>
        </div>
      </Show>

      <Show when={!services.loading && services() && services()!.services.length === 0}>
        <div class="flex items-center justify-center h-64">
          <p style={{ color: 'var(--text-muted)' }}>No services found in this namespace</p>
        </div>
      </Show>
    </div>
  );
};

export default TrafficMap;

