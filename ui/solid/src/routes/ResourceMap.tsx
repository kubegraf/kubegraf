import { Component, createSignal, createResource, onMount, onCleanup, Show } from 'solid-js';
import { api } from '../services/api';

interface TopologyNode {
  id: string;
  type: string;
  name: string;
  namespace?: string;
  status?: string;
}

interface TopologyLink {
  source: string;
  target: string;
  type: string;
}

const ResourceMap: Component = () => {
  const [topology] = createResource(api.getTopology);
  const [selectedNode, setSelectedNode] = createSignal<TopologyNode | null>(null);
  const [zoom, setZoom] = createSignal(1);
  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  // Simple force-directed layout simulation
  const getNodePositions = () => {
    const nodes = topology()?.nodes || [];
    const width = containerRef?.clientWidth || 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Group nodes by type
    const groups: Record<string, TopologyNode[]> = {};
    nodes.forEach((node: TopologyNode) => {
      if (!groups[node.type]) groups[node.type] = [];
      groups[node.type].push(node);
    });

    const positions: Record<string, { x: number; y: number }> = {};
    const typeOrder = ['node', 'deployment', 'statefulset', 'daemonset', 'service', 'pod', 'configmap', 'secret'];

    let ringIndex = 0;
    typeOrder.forEach((type) => {
      const typeNodes = groups[type] || [];
      if (typeNodes.length === 0) return;

      const radius = 100 + ringIndex * 120;
      typeNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / typeNodes.length - Math.PI / 2;
        positions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      });
      ringIndex++;
    });

    return positions;
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      node: '#22c55e',
      deployment: '#3b82f6',
      statefulset: '#8b5cf6',
      daemonset: '#f59e0b',
      service: '#06b6d4',
      pod: '#ec4899',
      configmap: '#84cc16',
      secret: '#ef4444',
      ingress: '#14b8a6',
    };
    return colors[type] || '#6b7280';
  };

  const getNodeIcon = (type: string) => {
    const icons: Record<string, string> = {
      node: '🖥️',
      deployment: '📦',
      statefulset: '🗄️',
      daemonset: '👹',
      service: '🌐',
      pod: '🫛',
      configmap: '⚙️',
      secret: '🔐',
      ingress: '🚪',
    };
    return icons[type] || '❓';
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resource Map</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visual topology of cluster resources</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            class="p-2 rounded-lg"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <span class="px-3 py-1 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {Math.round(zoom() * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            class="p-2 rounded-lg"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div class="card p-4">
        <div class="flex flex-wrap gap-4">
          {['node', 'deployment', 'statefulset', 'daemonset', 'service', 'pod', 'configmap', 'secret'].map((type) => (
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style={{ background: getNodeColor(type) }} />
              <span class="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topology View */}
      <div class="card p-0 overflow-hidden" ref={containerRef}>
        <Show
          when={!topology.loading}
          fallback={
            <div class="h-[600px] flex items-center justify-center">
              <div class="spinner" />
            </div>
          }
        >
          <Show
            when={(topology()?.nodes || []).length > 0}
            fallback={
              <div class="h-[600px] flex items-center justify-center flex-col gap-4" style={{ color: 'var(--text-muted)' }}>
                <svg class="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p>No topology data available</p>
                <p class="text-sm">Resource mapping will appear once cluster is connected</p>
              </div>
            }
          >
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              style={{ background: 'var(--bg-primary)' }}
            >
              <g transform={`scale(${zoom()})`}>
                {/* Links */}
                {(topology()?.links || []).map((link: TopologyLink) => {
                  const positions = getNodePositions();
                  const source = positions[link.source];
                  const target = positions[link.target];
                  if (!source || !target) return null;
                  return (
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="var(--border-color)"
                      stroke-width="1"
                      stroke-opacity="0.5"
                    />
                  );
                })}

                {/* Nodes */}
                {(topology()?.nodes || []).map((node: TopologyNode) => {
                  const positions = getNodePositions();
                  const pos = positions[node.id];
                  if (!pos) return null;
                  return (
                    <g
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedNode(node)}
                    >
                      <circle
                        r="24"
                        fill={getNodeColor(node.type)}
                        fill-opacity="0.2"
                        stroke={getNodeColor(node.type)}
                        stroke-width="2"
                      />
                      <text
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="16"
                      >
                        {getNodeIcon(node.type)}
                      </text>
                      <text
                        y="40"
                        text-anchor="middle"
                        fill="var(--text-secondary)"
                        font-size="10"
                      >
                        {node.name.length > 20 ? node.name.slice(0, 17) + '...' : node.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </Show>
        </Show>
      </div>

      {/* Selected Node Info */}
      <Show when={selectedNode()}>
        <div class="card p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>{getNodeIcon(selectedNode()!.type)}</span>
              {selectedNode()!.name}
            </h3>
            <button onClick={() => setSelectedNode(null)} style={{ color: 'var(--text-muted)' }}>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Type</div>
              <div class="font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{selectedNode()!.type}</div>
            </div>
            <Show when={selectedNode()!.namespace}>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Namespace</div>
                <div class="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedNode()!.namespace}</div>
              </div>
            </Show>
            <Show when={selectedNode()!.status}>
              <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div class="text-xs" style={{ color: 'var(--text-muted)' }}>Status</div>
                <div><span class="badge badge-success">{selectedNode()!.status}</span></div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ResourceMap;
