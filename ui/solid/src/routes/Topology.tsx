import { Component, onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import * as d3 from 'd3';
import { podsResource, deploymentsResource, servicesResource, nodesResource, namespace } from '../stores/cluster';

interface TopologyNode {
  id: string;
  type: 'node' | 'pod' | 'deployment' | 'service';
  name: string;
  namespace?: string;
  status?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface TopologyLink {
  source: string | TopologyNode;
  target: string | TopologyNode;
  type: string;
}

const Topology: Component = () => {
  let svgRef: SVGSVGElement | undefined;
  let simulation: d3.Simulation<TopologyNode, TopologyLink> | null = null;
  const [selectedNode, setSelectedNode] = createSignal<TopologyNode | null>(null);

  const nodeColors: Record<string, string> = {
    node: '#06b6d4',     // cyan
    pod: '#22c55e',      // green
    deployment: '#3b82f6', // blue
    service: '#a855f7',   // purple
  };

  const nodeIcons: Record<string, string> = {
    node: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2',
    pod: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    deployment: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    service: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
  };

  function buildGraph(): { nodes: TopologyNode[], links: TopologyLink[] } {
    const nodes: TopologyNode[] = [];
    const links: TopologyLink[] = [];
    const nodeMap = new Map<string, TopologyNode>();

    // Add cluster nodes
    (nodesResource() || []).forEach(n => {
      const node: TopologyNode = {
        id: `node-${n.name}`,
        type: 'node',
        name: n.name,
        status: n.status,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Add deployments
    (deploymentsResource() || []).forEach(d => {
      const node: TopologyNode = {
        id: `deployment-${d.namespace}-${d.name}`,
        type: 'deployment',
        name: d.name,
        namespace: d.namespace,
        status: d.ready,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Add services
    (servicesResource() || []).forEach(s => {
      const node: TopologyNode = {
        id: `service-${s.namespace}-${s.name}`,
        type: 'service',
        name: s.name,
        namespace: s.namespace,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Add pods and create links
    (podsResource() || []).forEach(p => {
      const podNode: TopologyNode = {
        id: `pod-${p.namespace}-${p.name}`,
        type: 'pod',
        name: p.name,
        namespace: p.namespace,
        status: p.status,
      };
      nodes.push(podNode);
      nodeMap.set(podNode.id, podNode);

      // Link to node
      if (p.node) {
        const nodeId = `node-${p.node}`;
        if (nodeMap.has(nodeId)) {
          links.push({
            source: podNode.id,
            target: nodeId,
            type: 'runs-on',
          });
        }
      }

      // Link pods to deployments with matching names
      const depId = `deployment-${p.namespace}-${p.name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '')}`;
      if (nodeMap.has(depId)) {
        links.push({
          source: depId,
          target: podNode.id,
          type: 'manages',
        });
      }
    });

    return { nodes, links };
  }

  function renderGraph() {
    if (!svgRef) return;

    const { nodes, links } = buildGraph();
    const width = svgRef.clientWidth || 800;
    const height = svgRef.clientHeight || 600;

    // Clear previous
    d3.select(svgRef).selectAll('*').remove();

    const svg = d3.select(svgRef)
      .attr('viewBox', [0, 0, width, height] as any);

    // Add zoom behavior
    const g = svg.append('g');
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }) as any);

    // Create simulation
    simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[] as TopologyNode[])
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'graph-link')
      .attr('stroke', '#0f3460')
      .attr('stroke-width', 2);

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .call(d3.drag<SVGGElement, TopologyNode>()
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
          d.fx = null;
          d.fy = null;
        }) as any);

    // Node circles
    node.append('circle')
      .attr('r', (d) => d.type === 'node' ? 30 : 20)
      .attr('fill', (d) => nodeColors[d.type])
      .attr('fill-opacity', 0.2)
      .attr('stroke', (d) => nodeColors[d.type])
      .attr('stroke-width', 2);

    // Node icons (as simple text for now)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', (d) => nodeColors[d.type])
      .attr('font-size', '10px')
      .text((d) => d.type[0].toUpperCase());

    // Node labels
    node.append('text')
      .attr('y', (d) => d.type === 'node' ? 45 : 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '10px')
      .text((d) => d.name.length > 20 ? d.name.slice(0, 18) + '...' : d.name);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  onMount(() => {
    renderGraph();
    window.addEventListener('resize', renderGraph);
  });

  onCleanup(() => {
    simulation?.stop();
    window.removeEventListener('resize', renderGraph);
  });

  // Re-render when data changes
  createEffect(() => {
    podsResource();
    deploymentsResource();
    servicesResource();
    nodesResource();
    renderGraph();
  });

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Topology</h1>
          <p class="text-gray-400 mt-1">
            Interactive cluster visualization - {namespace() === '_all' ? 'All Namespaces' : namespace()}
          </p>
        </div>
        <div class="flex items-center gap-4">
          {/* Legend */}
          <div class="flex items-center gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-cyan-500"></span>
              <span class="text-gray-400">Node</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-green-500"></span>
              <span class="text-gray-400">Pod</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-blue-500"></span>
              <span class="text-gray-400">Deployment</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-purple-500"></span>
              <span class="text-gray-400">Service</span>
            </div>
          </div>
          <button
            onClick={renderGraph}
            class="flex items-center gap-2 px-4 py-2 bg-k8s-blue rounded-lg hover:bg-k8s-blue/80 transition-colors text-white"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Graph container */}
      <div class="bg-k8s-card border border-k8s-border rounded-xl overflow-hidden relative" style={{ height: '600px' }}>
        <svg ref={svgRef} class="w-full h-full" />

        {/* Selected node info */}
        {selectedNode() && (
          <div class="absolute top-4 right-4 bg-k8s-dark border border-k8s-border rounded-lg p-4 min-w-64">
            <div class="flex items-center justify-between mb-3">
              <span class={`px-2 py-1 rounded text-xs font-medium ${
                selectedNode()!.type === 'node' ? 'bg-cyan-500/20 text-cyan-400' :
                selectedNode()!.type === 'pod' ? 'bg-green-500/20 text-green-400' :
                selectedNode()!.type === 'deployment' ? 'bg-blue-500/20 text-blue-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {selectedNode()!.type}
              </span>
              <button onClick={() => setSelectedNode(null)} class="text-gray-400 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 class="text-white font-semibold mb-2">{selectedNode()!.name}</h3>
            {selectedNode()!.namespace && (
              <p class="text-gray-400 text-sm">Namespace: {selectedNode()!.namespace}</p>
            )}
            {selectedNode()!.status && (
              <p class="text-gray-400 text-sm">Status: {selectedNode()!.status}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Topology;
