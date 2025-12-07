import { Component, createSignal, createResource, createEffect, on, Show, For, onMount, onCleanup, createMemo } from 'solid-js';
import { api } from '../services/api';
import {
  selectedNamespaces,
  setGlobalLoading,
} from '../stores/globalStore';
import { createCachedResource } from '../utils/resourceCache';
import Modal from '../components/Modal';
import TrafficMap from '../features/kiali/TrafficMap';
import LiveTrafficMap from '../features/kiali/LiveTrafficMap';
import * as d3 from 'd3';

interface TopologyNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  name: string;
  namespace?: string;
  status?: string;
}

interface TopologyLink extends d3.SimulationLinkDatum<TopologyNode> {
  source: string | TopologyNode;
  target: string | TopologyNode;
  value?: number;
}

const ResourceMap: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'resource' | 'traffic' | 'live'>('resource');
  
  // Determine namespace parameter from global store (same pattern as Services/Ingresses)
  const getNamespaceParam = (): string | undefined => {
    const namespaces = selectedNamespaces();
    if (namespaces.length === 0) return undefined; // All namespaces
    if (namespaces.length === 1) return namespaces[0];
    // For multiple namespaces, backend should handle it via query params
    // For now, pass first namespace (backend may need to be updated to handle multiple)
    return namespaces[0];
  };

  // CACHED RESOURCE - Uses globalStore and cache (same pattern as Services/Ingresses)
  const topologyCache = createCachedResource<any>(
    'topology',
    async () => {
      setGlobalLoading(true);
      try {
        const namespaceParam = getNamespaceParam();
        console.log('[ResourceMap] Fetching topology with namespace:', namespaceParam);
        const topology = await api.getTopology(namespaceParam);
        console.log('[ResourceMap] Fetched topology:', topology);
        console.log('[ResourceMap] Nodes count:', topology?.nodes?.length || 0);
        console.log('[ResourceMap] Links count:', topology?.links?.length || 0);
        return topology;
      } catch (error) {
        console.error('[ResourceMap] Error fetching topology:', error);
        throw error;
      } finally {
        setGlobalLoading(false);
      }
    },
    {
      ttl: 15000, // 15 seconds
      backgroundRefresh: true,
    }
  );

  // Get topology from cache
  const topology = createMemo(() => {
    const data = topologyCache.data();
    console.log('[ResourceMap] Current topology data from cache:', data);
    return data;
  });
  
  // Refetch function for updates
  const refetch = () => topologyCache.refetch();
  
  // Initial load on mount
  onMount(() => {
    if (!topologyCache.data()) {
      topologyCache.refetch();
    }
  });

  const [selectedNode, setSelectedNode] = createSignal<TopologyNode | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);

  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let simulation: d3.Simulation<TopologyNode, TopologyLink> | null = null;

  const nodeColors: Record<string, string> = {
    node: '#22c55e',
    deployment: '#3b82f6',
    statefulset: '#8b5cf6',
    daemonset: '#f59e0b',
    service: '#06b6d4',
    pod: '#ec4899',
    configmap: '#84cc16',
    secret: '#ef4444',
    ingress: '#14b8a6',
    replicaset: '#6366f1',
    job: '#f97316',
    cronjob: '#a855f7',
  };

  const nodeIcons: Record<string, string> = {
    node: '\uf233',      // server
    deployment: '\uf466', // box
    statefulset: '\uf1c0', // database
    daemonset: '\uf6e2', // spider
    service: '\uf0ac',   // globe
    pod: '\uf21a',       // ship
    configmap: '\uf013', // cog
    secret: '\uf023',    // lock
    ingress: '\uf090',   // sign-in
    replicaset: '\uf24d', // clone
    job: '\uf0ae',       // tasks
    cronjob: '\uf017',   // clock
  };

  // Setup D3 visualization
  const setupVisualization = () => {
    if (!svgRef || !topology()) return;

    const topo = topology();
    if (!topo?.nodes || topo.nodes.length === 0) return;

    // Clear previous
    d3.select(svgRef).selectAll('*').remove();
    if (simulation) simulation.stop();

    const width = containerRef?.clientWidth || 1000;
    const height = 650;

    // Create SVG structure
    const svg = d3.select(svgRef)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Prepare data
    const nodes: TopologyNode[] = topo.nodes.map((n: TopologyNode) => ({ ...n }));
    const links: TopologyLink[] = topo.links.map((l: any) => ({
      source: l.source,
      target: l.target,
      value: l.value || 1,
    }));

    // Create force simulation
    simulation = d3.forceSimulation<TopologyNode>(nodes)
      .force('link', d3.forceLink<TopologyNode, TopologyLink>(links)
        .id(d => d.id)
        .distance(120)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    // Add arrow marker definitions
    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#06b6d4')
      .style('opacity', 0.8);

    // Gradient for links
    const gradient = defs.append('linearGradient')
      .attr('id', 'linkGradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.6);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6').attr('stop-opacity', 0.6);

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', 'url(#linkGradient)')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, TopologyNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node outer ring (hover effect)
    node.append('circle')
      .attr('class', 'node-ring')
      .attr('r', 45)
      .attr('fill', d => nodeColors[d.type] || '#6b7280')
      .attr('fill-opacity', 0)
      .attr('stroke', d => nodeColors[d.type] || '#6b7280')
      .attr('stroke-width', 0)
      .attr('stroke-dasharray', '4 4');

    // Node main circle
    node.append('circle')
      .attr('class', 'node-circle')
      .attr('r', 32)
      .attr('fill', d => `${nodeColors[d.type] || '#6b7280'}20`)
      .attr('stroke', d => nodeColors[d.type] || '#6b7280')
      .attr('stroke-width', 2.5);

    // Node inner circle
    node.append('circle')
      .attr('r', 22)
      .attr('fill', d => `${nodeColors[d.type] || '#6b7280'}30`);

    // Type icon (using text emoji for simplicity)
    const emojiIcons: Record<string, string> = {
      node: '🖥️',
      deployment: '📦',
      statefulset: '🗄️',
      daemonset: '👹',
      service: '🌐',
      pod: '🫛',
      configmap: '⚙️',
      secret: '🔐',
      ingress: '🚪',
      replicaset: '📋',
      job: '⚡',
      cronjob: '⏰',
    };

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '20px')
      .text(d => emojiIcons[d.type] || '❓');

    // Node name label
    node.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', 48)
      .attr('font-size', '10px')
      .attr('fill', 'var(--text-primary)')
      .attr('font-weight', '500')
      .text(d => d.name.length > 18 ? d.name.slice(0, 15) + '...' : d.name);

    // Type badge
    node.append('rect')
      .attr('x', -20)
      .attr('y', 55)
      .attr('width', 40)
      .attr('height', 14)
      .attr('rx', 7)
      .attr('fill', d => nodeColors[d.type] || '#6b7280')
      .attr('fill-opacity', 0.9);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 65)
      .attr('font-size', '8px')
      .attr('fill', 'white')
      .attr('font-weight', '600')
      .text(d => d.type.toUpperCase().slice(0, 6));

    // Hover effects
    node
      .on('mouseenter', function(event, d) {
        // Highlight this node
        d3.select(this).select('.node-circle')
          .attr('filter', 'url(#glow)')
          .attr('stroke-width', 3.5);
        d3.select(this).select('.node-ring')
          .attr('fill-opacity', 0.1)
          .attr('stroke-width', 2);

        // Highlight connected links
        link
          .attr('stroke-opacity', l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return src === d.id || tgt === d.id ? 1 : 0.1;
          })
          .attr('stroke-width', l => {
            const src = typeof l.source === 'object' ? l.source.id : l.source;
            const tgt = typeof l.target === 'object' ? l.target.id : l.target;
            return src === d.id || tgt === d.id ? 3 : 1;
          });

        // Fade non-connected nodes
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach(l => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          if (src === d.id) connectedIds.add(tgt as string);
          if (tgt === d.id) connectedIds.add(src as string);
        });

        node.attr('opacity', n => connectedIds.has(n.id) ? 1 : 0.3);
      })
      .on('mouseleave', function() {
        // Reset node
        d3.select(this).select('.node-circle')
          .attr('filter', null)
          .attr('stroke-width', 2.5);
        d3.select(this).select('.node-ring')
          .attr('fill-opacity', 0)
          .attr('stroke-width', 0);

        // Reset links
        link
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 2);

        // Reset node opacity
        node.attr('opacity', 1);
      });

    // Track drag state to prevent click after drag
    let wasDragged = false;

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, TopologyNode, TopologyNode>) {
      wasDragged = false;
      if (!event.active) simulation?.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, TopologyNode, TopologyNode>) {
      wasDragged = true;
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, TopologyNode, TopologyNode>) {
      if (!event.active) simulation?.alphaTarget(0);
      // Keep node fixed at dropped position
      // Uncomment next 2 lines to release nodes after drag:
      // event.subject.fx = null;
      // event.subject.fy = null;
    }

    // Click handler - only fire if not dragged
    node.on('click', function(event, d) {
      if (wasDragged) {
        wasDragged = false;
        return;
      }
      event.stopPropagation();
      setSelectedNode(d);
      setShowDetails(true);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      // Update link paths with curves
      link.attr('d', (d: any) => {
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;

        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.8; // Arc radius

        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      // Update node positions
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.9);
    svg.call(zoom.transform, initialTransform);
  };

  // Get connected nodes for details modal
  const getConnectedNodes = (nodeId: string) => {
    const topo = topology();
    if (!topo?.links) return [];

    const connected: TopologyNode[] = [];
    const nodeMap = new Map(topo.nodes.map((n: TopologyNode) => [n.id, n]));

    topo.links.forEach((link: any) => {
      if (link.source === nodeId || (typeof link.source === 'object' && link.source.id === nodeId)) {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const targetNode = nodeMap.get(targetId);
        if (targetNode) connected.push(targetNode);
      }
      if (link.target === nodeId || (typeof link.target === 'object' && link.target.id === nodeId)) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const sourceNode = nodeMap.get(sourceId);
        if (sourceNode) connected.push(sourceNode);
      }
    });

    return connected;
  };

  // Setup when topology changes
  createEffect(on(() => [topology(), svgRef], () => {
    if (svgRef && topology()) {
      console.log('[ResourceMap] Topology data changed, setting up visualization');
      setupVisualization();
    }
  }));

  // Handle window resize
  onMount(() => {
    const handleResize = () => setupVisualization();
    window.addEventListener('resize', handleResize);
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
      if (simulation) simulation.stop();
    });
  });

  // Get stats
  const getStats = () => {
    const topo = topology();
    if (!topo?.nodes) return {};
    return topo.nodes.reduce((acc: Record<string, number>, n: TopologyNode) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
  };

  const emojiIcons: Record<string, string> = {
    node: '🖥️',
    deployment: '📦',
    statefulset: '🗄️',
    daemonset: '👹',
    service: '🌐',
    pod: '🫛',
    configmap: '⚙️',
    secret: '🔐',
    ingress: '🚪',
    replicaset: '📋',
    job: '⚡',
    cronjob: '⏰',
  };

  return (
    <div class="space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resource Map</h1>
          <p style={{ color: 'var(--text-secondary)' }}>D3.js force-directed graph • Drag nodes • Scroll to zoom • Hover to highlight</p>
        </div>
        
        {/* Tabs */}
        <div class="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
          <button
            onClick={() => setActiveTab('resource')}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab() === 'resource' ? 'bg-[var(--accent-primary)] text-black' : 'text-[var(--text-secondary)]'
            }`}
          >
            Resource Map
          </button>
          <button
            onClick={() => setActiveTab('traffic')}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab() === 'traffic' ? 'bg-[var(--accent-primary)] text-black' : 'text-[var(--text-secondary)]'
            }`}
          >
            Traffic Map
          </button>
          <button
            onClick={() => setActiveTab('live')}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab() === 'live' ? 'bg-[var(--accent-primary)] text-black' : 'text-[var(--text-secondary)]'
            }`}
          >
            Live Traffic
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.classList.add('refreshing');
              setTimeout(() => btn.classList.remove('refreshing'), 500);
              refetch();
            }}
            class="icon-btn"
            style={{ background: 'var(--bg-secondary)' }}
            title="Refresh"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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

      {/* Content based on active tab */}
      <Show when={activeTab() === 'traffic'}>
        <TrafficMap />
      </Show>
      <Show when={activeTab() === 'live'}>
        <LiveTrafficMap />
      </Show>

      <Show when={activeTab() === 'resource'}>
        {/* Stats */}
        <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <For each={Object.entries(getStats())}>
          {([type, count]) => (
            <div class="card p-3 flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: `${nodeColors[type]}20`, color: nodeColors[type] }}
              >
                {emojiIcons[type] || '❓'}
              </div>
              <div>
                <div class="text-xl font-bold" style={{ color: nodeColors[type] }}>{count as number}</div>
                <div class="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{type}s</div>
              </div>
            </div>
          )}
        </For>
        <div class="card p-3 flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <svg class="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <div class="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>{(topology()?.links || []).length}</div>
            <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Connections</div>
          </div>
        </div>
      </div>

      {/* Error display */}
      <Show when={topologyCache.error()}>
        <div class="card p-4 mb-4" style={{ background: 'var(--error-bg)', border: '1px solid var(--error-color)' }}>
          <div class="flex items-center gap-2">
            <span style={{ color: 'var(--error-color)' }}>❌</span>
            <span style={{ color: 'var(--error-color)' }}>
              Error loading topology: {topologyCache.error()?.message || 'Unknown error'}
            </span>
          </div>
        </div>
      </Show>

      {/* Graph Container */}
      <div
        ref={containerRef}
        class="card overflow-hidden relative"
        style={{ height: '650px' }}
      >
        <Show
          when={!topologyCache.loading() || topologyCache.data() !== undefined}
          fallback={
            <div class="h-full flex items-center justify-center">
              <div class="spinner" />
            </div>
          }
        >
          <Show
            when={topology() && topology()?.nodes && topology()?.nodes?.length > 0}
            fallback={
              <div class="h-full flex items-center justify-center flex-col gap-4" style={{ color: 'var(--text-muted)' }}>
                <svg class="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p class="text-lg">No resources found</p>
                <p class="text-sm">
                  {topologyCache.error() 
                    ? 'Error loading topology data' 
                    : topology() 
                      ? 'Select a namespace with deployments and services' 
                      : 'Loading topology data...'}
                </p>
                {topology() && topology()?.nodes && topology()?.nodes?.length === 0 && (
                  <p class="text-xs opacity-70">The selected namespace(s) may not have any resources</p>
                )}
              </div>
            }
          >
            <svg
              ref={svgRef}
              style={{ width: '100%', height: '100%', background: 'var(--bg-primary)' }}
            />
          </Show>
        </Show>

        {/* Legend */}
        <div
          class="absolute bottom-4 left-4 p-3 rounded-lg text-xs"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <div class="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Legend</div>
          <div class="grid grid-cols-3 gap-x-4 gap-y-1">
            <For each={Object.entries(emojiIcons).slice(0, 6)}>
              {([type, icon]) => (
                <div class="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span class="capitalize" style={{ color: 'var(--text-muted)' }}>{type}</span>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Instructions */}
        <div
          class="absolute bottom-4 right-4 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          🖱️ Drag nodes • Scroll to zoom • Click for details
        </div>
      </div>

      {/* Details Modal */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`${selectedNode()?.type}: ${selectedNode()?.name}`} size="lg">
        <Show when={selectedNode()}>
          <div class="space-y-4">
            {/* Node info */}
            <div class="flex items-center gap-4 p-4 rounded-lg" style={{ background: `${nodeColors[selectedNode()!.type]}15` }}>
              <div
                class="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${nodeColors[selectedNode()!.type]}25` }}
              >
                {emojiIcons[selectedNode()!.type] || '❓'}
              </div>
              <div>
                <div class="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedNode()!.name}</div>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium uppercase"
                    style={{ background: nodeColors[selectedNode()!.type], color: 'white' }}
                  >
                    {selectedNode()!.type}
                  </span>
                  <span class="text-sm" style={{ color: 'var(--text-muted)' }}>
                    in {selectedNode()!.namespace || (selectedNamespaces().length === 0 ? 'all namespaces' : selectedNamespaces().join(', '))}
                  </span>
                </div>
              </div>
            </div>

            {/* Connected Resources */}
            <div>
              <h4 class="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connected Resources ({getConnectedNodes(selectedNode()!.id).length})
              </h4>
              <div class="grid gap-2 max-h-64 overflow-auto">
                <For each={getConnectedNodes(selectedNode()!.id)}>
                  {(connectedNode) => (
                    <div
                      class="p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-transform"
                      style={{ background: 'var(--bg-tertiary)' }}
                      onClick={() => setSelectedNode(connectedNode)}
                    >
                      <div
                        class="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ background: `${nodeColors[connectedNode.type]}20` }}
                      >
                        {emojiIcons[connectedNode.type] || '❓'}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-medium truncate" style={{ color: 'var(--accent-primary)' }}>{connectedNode.name}</div>
                        <div class="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{connectedNode.type}</div>
                      </div>
                      <svg class="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </For>
                <Show when={getConnectedNodes(selectedNode()!.id).length === 0}>
                  <div class="p-4 text-center text-sm rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    No connected resources
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </Show>
      </Modal>
      </Show>
    </div>
  );
};

export default ResourceMap;
