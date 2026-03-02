/**
 * WorkspacePanels — Rail button content panels for the Intelligence Workspace
 *
 * Each panel renders in grid-column 3 when its rail button is active.
 * Panels: Workloads (WRK), Metrics (MET), Nodes (NOD), Topology (MAP),
 *         GitOps (GIT), Cost (CST), Settings (SET)
 */

import { Component, createSignal, createEffect, createResource, onMount, onCleanup, Show, For, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Incident, api, fetchAPI } from '../../services/api';
import {
  connectMetrics,
  disconnectMetrics,
  latestPoint,
  getCpuSparkline,
  getMemSparkline,
} from '../../stores/metricsStore';
import { currentContext } from '../../stores/cluster';
import Modal from '../Modal';
import HelmReleaseDeleteModal from '../HelmReleaseDeleteModal';
import ConfirmationModal from '../ConfirmationModal';
import DescribeModal from '../DescribeModal';
import YAMLViewer from '../YAMLViewer';
import YAMLEditor from '../YAMLEditor';

/* ============================================
   Shared Sub-components
   ============================================ */

const PanelHeader: Component<{
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
}> = (props) => (
  <div class="panel-header">
    <div>
      <h2 class="panel-title">{props.title}</h2>
      <Show when={props.subtitle}>
        <span class="panel-subtitle">{props.subtitle}</span>
      </Show>
    </div>
    <Show when={props.onRefresh}>
      <button
        class="btn btn-ghost btn-sm"
        onClick={props.onRefresh}
        disabled={props.loading}
        title="Refresh"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 8a6 6 0 0111.5-2.3M14 8a6 6 0 01-11.5 2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {props.loading ? 'Loading…' : 'Refresh'}
      </button>
    </Show>
  </div>
);

const StatusBadge: Component<{ status: string; class?: string }> = (props) => {
  const color = () => {
    const s = (props.status || '').toLowerCase();
    if (['healthy', 'ready', 'running', 'synced', 'deployed', 'available', 'true'].includes(s)) return 'g';
    if (['degraded', 'warning', 'pending', 'progressing', 'unknown'].includes(s)) return 'a';
    return 'r';
  };
  return <span class={`ep-badge ${color()} ${props.class || ''}`}>{props.status}</span>;
};

const PanelLoading: Component = () => (
  <div class="workspace-loading">
    <div class="loading-spinner" />
    <span>Loading…</span>
  </div>
);

const PanelEmpty: Component<{ message: string }> = (props) => (
  <div class="workspace-empty">
    <h3>{props.message}</h3>
  </div>
);

const PanelCard: Component<{
  label: string;
  value: string | number;
  color?: string;
}> = (props) => (
  <div class={`icard ${props.color || 'teal'}`}>
    <div class="icard-lbl">{props.label}</div>
    <div class={`icard-val ${props.color || 'teal'}`}>{props.value}</div>
  </div>
);

/* ============================================
   WorkloadPanel (WRK)
   ============================================ */
export const WorkloadPanel: Component<{ currentIncident?: Incident | null }> = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [workloads, setWorkloads] = createSignal<any[]>([]);
  const [error, setError] = createSignal('');

  const fetchWorkloads = async () => {
    setLoading(true);
    setError('');
    try {
      const [pods, deploys, sts, ds] = await Promise.allSettled([
        api.getPods(),
        api.getDeployments(),
        api.getStatefulSets(),
        api.getDaemonSets(),
      ]);

      const items: any[] = [];

      const addItems = (result: PromiseSettledResult<any[]>, kind: string) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          result.value.forEach((r: any) => items.push({ ...r, _kind: kind }));
        }
      };

      addItems(pods, 'Pod');
      addItems(deploys, 'Deployment');
      addItems(sts, 'StatefulSet');
      addItems(ds, 'DaemonSet');

      setWorkloads(items);
    } catch (e: any) {
      setError(e.message || 'Failed to load workloads');
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchWorkloads);

  const summary = createMemo(() => {
    const all = workloads();
    const healthy = all.filter(w => {
      const s = (w.status || w.phase || '').toLowerCase();
      return s === 'running' || s === 'available' || s === 'ready';
    });
    const degraded = all.length - healthy.length;
    const pods = all.filter(w => w._kind === 'Pod');
    return { total: all.length, healthy: healthy.length, degraded, pods: pods.length };
  });

  const isHighlighted = (w: any) => {
    const inc = props.currentIncident;
    if (!inc?.resource) return false;
    return w.name === inc.resource.name || w.metadata?.name === inc.resource.name;
  };

  return (
    <div class="panel">
      <PanelHeader title="Workloads" subtitle={`${summary().total} resources`} onRefresh={fetchWorkloads} loading={loading()} />
      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <Show when={!error()} fallback={<PanelEmpty message={error()} />}>
            <div class="panel-summary-grid">
              <PanelCard label="Total" value={summary().total} color="teal" />
              <PanelCard label="Healthy" value={summary().healthy} color="teal" />
              <PanelCard label="Degraded" value={summary().degraded} color={summary().degraded > 0 ? 'red' : 'teal'} />
              <PanelCard label="Pods" value={summary().pods} color="blue" />
            </div>
            <Show when={workloads().length > 0} fallback={<PanelEmpty message="No workloads found" />}>
              <table class="panel-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Namespace</th>
                    <th>Status</th>
                    <th>Restarts</th>
                    <th>Age</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={workloads()}>
                    {(w) => {
                      const name = w.name || w.metadata?.name || '—';
                      const ns = w.namespace || w.metadata?.namespace || '—';
                      const status = w.status || w.phase || 'Unknown';
                      const restarts = w.restartCount ?? w.restarts ?? '—';
                      const age = w.age || '—';
                      return (
                        <tr class={isHighlighted(w) ? 'panel-row-highlight' : ''}>
                          <td class="panel-cell-name">{name}</td>
                          <td><span class="svc-kind">{w._kind}</span></td>
                          <td>{ns}</td>
                          <td><StatusBadge status={status} /></td>
                          <td>{restarts}</td>
                          <td>{age}</td>
                        </tr>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   MetricsPanel (MET)
   ============================================ */
export const MetricsPanel: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [pods, setPods] = createSignal<any[]>([]);

  onMount(() => {
    connectMetrics();
    // Fetch pods for top consumers; clear loading when done
    api.getPods()
      .then(p => setPods(Array.isArray(p) ? p : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  onCleanup(() => {
    disconnectMetrics();
  });

  const latest = () => latestPoint();

  const topConsumers = createMemo(() => {
    return pods()
      .filter(p => p.restartCount > 0 || p.restarts > 0)
      .sort((a, b) => (b.restartCount || b.restarts || 0) - (a.restartCount || a.restarts || 0))
      .slice(0, 8);
  });

  const cpuSpark = () => getCpuSparkline(20);
  const memSpark = () => getMemSparkline(20);

  const MiniSparkline: Component<{ data: number[]; color: string }> = (sp) => {
    const path = () => {
      const d = sp.data;
      if (!d || d.length < 2) return '';
      const max = Math.max(...d, 1);
      const w = 120;
      const h = 32;
      return d.map((v, i) => {
        const x = (i / (d.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      }).join(' ');
    };
    return (
      <svg width="120" height="32" viewBox="0 0 120 32">
        <path d={path()} fill="none" stroke={sp.color} stroke-width="1.5" />
      </svg>
    );
  };

  return (
    <div class="panel">
      <PanelHeader title="Metrics" subtitle="Live cluster metrics" />
      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <div class="panel-summary-grid">
            <PanelCard label="CPU %" value={latest()?.cpuPercent?.toFixed(1) ?? '—'} color={latest() && latest()!.cpuPercent > 80 ? 'red' : 'teal'} />
            <PanelCard label="Memory %" value={latest()?.memPercent?.toFixed(1) ?? '—'} color={latest() && latest()!.memPercent > 80 ? 'red' : 'teal'} />
            <PanelCard label="Pods" value={latest()?.podCount ?? '—'} color="blue" />
            <PanelCard label="Nodes" value={latest()?.nodeCount ?? '—'} color="teal" />
          </div>
          <div style={{ display: 'flex', gap: '16px', padding: '0 16px' }}>
            <div class="card" style={{ flex: '1', padding: '12px' }}>
              <div class="icard-lbl">CPU Trend</div>
              <MiniSparkline data={cpuSpark()} color="var(--brand)" />
            </div>
            <div class="card" style={{ flex: '1', padding: '12px' }}>
              <div class="icard-lbl">Memory Trend</div>
              <MiniSparkline data={memSpark()} color="var(--blue)" />
            </div>
          </div>
          <Show when={topConsumers().length > 0}>
            <div style={{ padding: '0 16px' }}>
              <div class="sec" style={{ 'margin-top': '12px' }}>
                <div class="sec-diamond" />
                <span class="sec-title">Top Consumers (by restarts)</span>
              </div>
              <table class="panel-table">
                <thead>
                  <tr><th>Pod</th><th>Namespace</th><th>Restarts</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <For each={topConsumers()}>
                    {(p) => (
                      <tr>
                        <td class="panel-cell-name">{p.name || p.metadata?.name}</td>
                        <td>{p.namespace || p.metadata?.namespace}</td>
                        <td>{p.restartCount ?? p.restarts ?? 0}</td>
                        <td><StatusBadge status={p.status || p.phase || 'Unknown'} /></td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   NodesPanel (NOD)
   ============================================ */
export const NodesPanel: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [nodes, setNodes] = createSignal<any[]>([]);
  const [error, setError] = createSignal('');

  const fetchNodes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getNodes();
      setNodes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Failed to load nodes');
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchNodes);

  const getConditionClass = (node: any) => {
    const conditions = node.conditions || node.status?.conditions || [];
    const ready = conditions.find((c: any) => c.type === 'Ready');
    if (ready?.status === 'True') return 'node-card-ready';
    const pressure = conditions.find((c: any) =>
      ['DiskPressure', 'MemoryPressure', 'PIDPressure'].includes(c.type) && c.status === 'True'
    );
    if (pressure) return 'node-card-pressure';
    return 'node-card-notready';
  };

  const getRole = (node: any) => {
    const labels = node.labels || node.metadata?.labels || {};
    if (labels['node-role.kubernetes.io/control-plane'] !== undefined ||
        labels['node-role.kubernetes.io/master'] !== undefined) return 'control-plane';
    return 'worker';
  };

  return (
    <div class="panel">
      <PanelHeader title="Nodes" subtitle={`${nodes().length} nodes`} onRefresh={fetchNodes} loading={loading()} />
      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <Show when={!error()} fallback={<PanelEmpty message={error()} />}>
            <Show when={nodes().length > 0} fallback={<PanelEmpty message="No nodes found" />}>
              <div class="panel-nodes-grid">
                <For each={nodes()}>
                  {(node) => {
                    const name = node.name || node.metadata?.name || '—';
                    const conditions = node.conditions || node.status?.conditions || [];
                    const capacity = node.capacity || node.status?.capacity || {};
                    const allocatable = node.allocatable || node.status?.allocatable || {};
                    return (
                      <div class={`node-card ${getConditionClass(node)}`}>
                        <div class="node-card-header">
                          <span class="node-card-name">{name}</span>
                          <span class="env-badge">{getRole(node)}</span>
                        </div>
                        <div class="node-card-conditions">
                          <For each={conditions}>
                            {(c: any) => (
                              <span class={`node-condition-badge ${c.status === 'True' && c.type === 'Ready' ? 'ok' : c.status === 'True' ? 'bad' : 'neutral'}`}>
                                {c.type}
                              </span>
                            )}
                          </For>
                        </div>
                        <div class="node-card-capacity">
                          <div><strong>CPU:</strong> {allocatable.cpu || capacity.cpu || '—'}</div>
                          <div><strong>Memory:</strong> {allocatable.memory || capacity.memory || '—'}</div>
                          <div><strong>Pods:</strong> {allocatable.pods || capacity.pods || '—'}</div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   TopologyPanel (MAP)
   ============================================ */
export const TopologyPanel: Component<{ currentIncident?: Incident | null }> = (props) => {
  const [loading, setLoading] = createSignal(true);
  const [topology, setTopology] = createSignal<any>(null);
  const [error, setError] = createSignal('');
  const [tooltip, setTooltip] = createSignal<{ x: number; y: number; text: string } | null>(null);
  let canvasRef: HTMLCanvasElement | undefined;
  let animFrameId = 0;

  const fetchTopology = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTopology();
      setTopology(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchTopology);

  const kindColors: Record<string, string> = {
    Service: '#1555B4',
    Deployment: '#166534',
    Pod: '#0B7285',
    Node: '#5B21B6',
    StatefulSet: '#C2410C',
    DaemonSet: '#B45309',
  };

  const draw = () => {
    const canvas = canvasRef;
    const topo = topology();
    if (!canvas || !topo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = Math.max(rect.height - 20, 400);
    }
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const nodes = topo.nodes || [];
    const links = topo.links || topo.edges || [];

    if (nodes.length === 0) return;

    // Assign positions in a grid layout
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const padX = 80;
    const padY = 60;
    const cellW = (W - 2 * padX) / Math.max(cols, 1);
    const cellH = (H - 2 * padY) / Math.max(Math.ceil(nodes.length / cols), 1);

    const posMap: Record<string, { x: number; y: number; node: any }> = {};
    nodes.forEach((n: any, i: number) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * cellW + cellW / 2;
      const y = padY + row * cellH + cellH / 2;
      const key = n.id || n.name || `node-${i}`;
      posMap[key] = { x, y, node: n };
    });

    // Draw links
    ctx.strokeStyle = 'rgba(170,180,200,0.5)';
    ctx.lineWidth = 1;
    for (const link of links) {
      const src = posMap[link.source || link.from];
      const tgt = posMap[link.target || link.to];
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    const incResource = props.currentIncident?.resource?.name || '';
    for (const key of Object.keys(posMap)) {
      const { x, y, node } = posMap[key];
      const kind = node.kind || node.type || 'Unknown';
      const name = node.name || node.id || key;
      const color = kindColors[kind] || '#5A6480';
      const isHighlighted = name === incResource || key === incResource;

      // Rounded rect
      const rw = 90;
      const rh = 32;
      ctx.fillStyle = isHighlighted ? '#FFF1F0' : '#F7F9FC';
      ctx.strokeStyle = isHighlighted ? '#C8211A' : color;
      ctx.lineWidth = isHighlighted ? 2.5 : 1.5;
      ctx.beginPath();
      const r = 6;
      ctx.moveTo(x - rw / 2 + r, y - rh / 2);
      ctx.lineTo(x + rw / 2 - r, y - rh / 2);
      ctx.quadraticCurveTo(x + rw / 2, y - rh / 2, x + rw / 2, y - rh / 2 + r);
      ctx.lineTo(x + rw / 2, y + rh / 2 - r);
      ctx.quadraticCurveTo(x + rw / 2, y + rh / 2, x + rw / 2 - r, y + rh / 2);
      ctx.lineTo(x - rw / 2 + r, y + rh / 2);
      ctx.quadraticCurveTo(x - rw / 2, y + rh / 2, x - rw / 2, y + rh / 2 - r);
      ctx.lineTo(x - rw / 2, y - rh / 2 + r);
      ctx.quadraticCurveTo(x - rw / 2, y - rh / 2, x - rw / 2 + r, y - rh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (isHighlighted) {
        ctx.shadowColor = 'rgba(200,33,26,0.35)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Text
      ctx.fillStyle = color;
      ctx.font = '600 9px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(kind.toUpperCase(), x, y - 3);
      ctx.fillStyle = '#0B0F24';
      ctx.font = '500 10px "IBM Plex Sans", sans-serif';
      const truncated = name.length > 12 ? name.slice(0, 11) + '…' : name;
      ctx.fillText(truncated, x, y + 10);
    }
  };

  createEffect(() => {
    if (!loading() && topology()) {
      // Small delay for DOM readiness
      requestAnimationFrame(draw);
    }
  });

  const handleCanvasMove = (e: MouseEvent) => {
    const canvas = canvasRef;
    const topo = topology();
    if (!canvas || !topo) { setTooltip(null); return; }
    const bRect = canvas.getBoundingClientRect();
    const mx = e.clientX - bRect.left;
    const my = e.clientY - bRect.top;

    const nodes = topo.nodes || [];
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const padX = 80;
    const padY = 60;
    const cellW = (canvas.width - 2 * padX) / Math.max(cols, 1);
    const cellH = (canvas.height - 2 * padY) / Math.max(Math.ceil(nodes.length / cols), 1);

    for (let i = 0; i < nodes.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = padX + col * cellW + cellW / 2;
      const y = padY + row * cellH + cellH / 2;
      if (Math.abs(mx - x) < 50 && Math.abs(my - y) < 20) {
        const n = nodes[i];
        setTooltip({ x: e.clientX, y: e.clientY, text: `${n.kind || 'Resource'}: ${n.name || n.id}\n${n.namespace ? 'ns: ' + n.namespace : ''}` });
        return;
      }
    }
    setTooltip(null);
  };

  onCleanup(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId);
  });

  return (
    <div class="panel">
      <PanelHeader title="Topology" subtitle="Resource relationship map" onRefresh={fetchTopology} loading={loading()} />
      <div class="panel-scroll" style={{ position: 'relative' }}>
        <Show when={!loading()} fallback={<PanelLoading />}>
          <Show when={!error()} fallback={<PanelEmpty message={error()} />}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', 'min-height': '400px', cursor: 'crosshair' }}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setTooltip(null)}
            />
            <div style={{ display: 'flex', gap: '14px', padding: '8px 16px', 'flex-wrap': 'wrap' }}>
              {Object.entries(kindColors).map(([kind, color]) => (
                <span class="leg"><span style={{ width: '10px', height: '10px', background: color, 'border-radius': '2px', display: 'inline-block' }} /> {kind}</span>
              ))}
            </div>
          </Show>
        </Show>
        <Show when={tooltip()}>
          <div style={{
            position: 'fixed',
            left: `${tooltip()!.x + 12}px`,
            top: `${tooltip()!.y - 10}px`,
            background: 'var(--code)',
            color: '#CBD5E1',
            padding: '6px 10px',
            'border-radius': '6px',
            'font-size': '11px',
            'white-space': 'pre-line',
            'z-index': '999',
            'pointer-events': 'none',
            'box-shadow': '0 4px 16px rgba(0,0,0,.3)',
          }}>{tooltip()!.text}</div>
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   GitOpsPanel (GIT) — full Plugins page equivalent
   Tabs: Overview | Helm Releases | ArgoCD Apps | Flux Resources
   ============================================ */
export const GitOpsPanel: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'overview' | 'helm' | 'argocd' | 'flux'>('overview');
  const [selectedRelease, setSelectedRelease] = createSignal<any>(null);
  const [selectedArgoApp, setSelectedArgoApp] = createSignal<any>(null);
  const [showDetails, setShowDetails] = createSignal(false);
  const [showArgoDetails, setShowArgoDetails] = createSignal(false);
  const [showHelmDescribe, setShowHelmDescribe] = createSignal(false);
  const [showArgoDescribe, setShowArgoDescribe] = createSignal(false);
  const [showHelmYAML, setShowHelmYAML] = createSignal(false);
  const [showArgoYAML, setShowArgoYAML] = createSignal(false);
  const [showArgoEdit, setShowArgoEdit] = createSignal(false);
  const [showArgoDeleteConfirm, setShowArgoDeleteConfirm] = createSignal(false);
  const [showUninstallModal, setShowUninstallModal] = createSignal(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = createSignal(false);
  const [yamlKey, setYamlKey] = createSignal<string | null>(null);
  const [openMenuHelm, setOpenMenuHelm] = createSignal<string | null>(null);
  const [openMenuArgo, setOpenMenuArgo] = createSignal<string | null>(null);
  const [menuPos, setMenuPos] = createSignal<{ top: number; left: number } | null>(null);
  const [menuHover, setMenuHover] = createSignal(false);
  const [releaseHistory, setReleaseHistory] = createSignal<any[]>([]);
  const [historyLoading, setHistoryLoading] = createSignal(false);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [actionMsg, setActionMsg] = createSignal<{ type: 'success' | 'error'; text: string } | null>(null);
  const [releaseToUninstall, setReleaseToUninstall] = createSignal<any>(null);
  const [uninstalling, setUninstalling] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [rollbackRevision, setRollbackRevision] = createSignal<number | null>(null);
  const [helmSearch, setHelmSearch] = createSignal('');
  const [argoSearch, setArgoSearch] = createSignal('');

  // createResource: re-fetches when cluster context changes or tab is active
  const [helmReleases, { refetch: refetchHelm, mutate: mutateHelm }] = createResource(
    () => (activeTab() === 'helm' || activeTab() === 'overview') ? (currentContext() || 'default') : false,
    async () => api.getHelmReleases()
  );
  const [argoCDApps, { refetch: refetchArgo, mutate: mutateArgo }] = createResource(
    () => (activeTab() === 'argocd' || activeTab() === 'overview') ? (currentContext() || 'default') : false,
    async () => api.getArgoCDApps()
  );
  const [fluxResources, { refetch: refetchFlux }] = createResource(
    () => (activeTab() === 'flux' || activeTab() === 'overview') ? (currentContext() || 'default') : false,
    async () => api.getFluxResources()
  );

  createEffect(() => {
    const ctx = currentContext();
    if (ctx) { mutateHelm(undefined); mutateArgo(undefined); }
  });

  const filteredHelm = createMemo(() => {
    const q = helmSearch().toLowerCase();
    const list = (helmReleases() as any[] | undefined) || [];
    if (!q) return list;
    return list.filter((r: any) =>
      r.name?.toLowerCase().includes(q) || r.namespace?.toLowerCase().includes(q) ||
      r.chart?.toLowerCase().includes(q) || r.status?.toLowerCase().includes(q)
    );
  });

  const filteredArgo = createMemo(() => {
    const q = argoSearch().toLowerCase();
    const list = (argoCDApps() as any[] | undefined) || [];
    if (!q) return list;
    return list.filter((a: any) =>
      a.name?.toLowerCase().includes(q) || a.namespace?.toLowerCase().includes(q) ||
      a.project?.toLowerCase().includes(q) || a.syncStatus?.toLowerCase().includes(q) ||
      a.health?.toLowerCase().includes(q)
    );
  });

  const fetchHistory = async (name: string, namespace: string) => {
    setHistoryLoading(true);
    try {
      const r = await api.getHelmReleaseHistory(name, namespace);
      setReleaseHistory(r.history || []);
    } catch { setReleaseHistory([]); }
    setHistoryLoading(false);
  };

  const handleRollback = async () => {
    const rel = selectedRelease(); const rev = rollbackRevision();
    if (!rel || !rev) return;
    setActionLoading(true); setActionMsg(null); setShowRollbackConfirm(false);
    try {
      await api.rollbackHelmRelease(rel.name, rel.namespace, rev);
      setActionMsg({ type: 'success', text: `Rolled back to revision ${rev}` });
      fetchHistory(rel.name, rel.namespace); refetchHelm();
    } catch (e: any) { setActionMsg({ type: 'error', text: e.message || 'Rollback failed' }); }
    setActionLoading(false); setRollbackRevision(null);
  };

  const handleArgoSync = async () => {
    const app = selectedArgoApp(); if (!app) return;
    setActionLoading(true); setActionMsg(null);
    try { await api.syncArgoCDApp(app.name, app.namespace); setActionMsg({ type: 'success', text: 'Sync triggered' }); refetchArgo(); }
    catch (e: any) { setActionMsg({ type: 'error', text: e.message || 'Sync failed' }); }
    setActionLoading(false);
  };

  const handleArgoRefresh = async () => {
    const app = selectedArgoApp(); if (!app) return;
    setActionLoading(true); setActionMsg(null);
    try { await api.refreshArgoCDApp(app.name, app.namespace); setActionMsg({ type: 'success', text: 'Refresh triggered' }); refetchArgo(); }
    catch (e: any) { setActionMsg({ type: 'error', text: e.message || 'Refresh failed' }); }
    setActionLoading(false);
  };

  const handleDeleteArgo = async () => {
    const app = selectedArgoApp(); if (!app) return;
    setDeleting(true);
    try {
      await api.deleteArgoCDApp(app.name, app.namespace);
      refetchArgo(); setShowArgoDeleteConfirm(false); setSelectedArgoApp(null);
      setActionMsg({ type: 'success', text: `${app.name} deleted` });
    } catch (e: any) { setActionMsg({ type: 'error', text: `Delete failed: ${e.message}` }); }
    setDeleting(false);
  };

  const confirmUninstallHelm = async () => {
    const rel = releaseToUninstall(); if (!rel) return;
    setUninstalling(true);
    try {
      await api.uninstallApp(rel.name, rel.namespace);
      refetchHelm(); setShowUninstallModal(false); setReleaseToUninstall(null);
      setActionMsg({ type: 'success', text: `${rel.name} uninstalled` });
    } catch (e: any) { setActionMsg({ type: 'error', text: `Uninstall failed: ${e.message}` }); }
    setUninstalling(false);
  };

  const openHelmDetails = (rel: any) => { setSelectedRelease(rel); setShowDetails(true); setActionMsg(null); fetchHistory(rel.name, rel.namespace); };
  const openArgoDetails = (app: any) => { setSelectedArgoApp(app); setShowArgoDetails(true); setActionMsg(null); };

  const openHelmMenu = (e: MouseEvent, rel: any) => {
    e.preventDefault(); e.stopPropagation();
    const key = `${rel.namespace}/${rel.name}`;
    if (openMenuHelm() === key) { setOpenMenuHelm(null); setMenuPos(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.max(10, rect.right - 180) });
    setOpenMenuHelm(key); setOpenMenuArgo(null); setMenuHover(false);
  };

  const openArgoMenu = (e: MouseEvent, app: any) => {
    e.preventDefault(); e.stopPropagation();
    const key = `${app.namespace}/${app.name}`;
    if (openMenuArgo() === key) { setOpenMenuArgo(null); setMenuPos(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.max(10, rect.right - 180) });
    setOpenMenuArgo(key); setOpenMenuHelm(null); setMenuHover(false);
  };

  const closeMenus = () => { setOpenMenuHelm(null); setOpenMenuArgo(null); setMenuPos(null); setMenuHover(false); };

  const currentMenuHelm = createMemo(() => {
    const k = openMenuHelm(); if (!k) return null;
    const [ns, name] = k.split('/');
    return filteredHelm().find((r: any) => r.namespace === ns && r.name === name) || null;
  });

  const currentMenuArgo = createMemo(() => {
    const k = openMenuArgo(); if (!k) return null;
    const [ns, name] = k.split('/');
    return filteredArgo().find((a: any) => a.namespace === ns && a.name === name) || null;
  });

  createEffect(() => {
    if (!openMenuHelm() && !openMenuArgo()) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (document.querySelector('[data-gitops-menu]')?.contains(t) ||
          document.querySelector('[data-gitops-btn]')?.contains(t) || menuHover()) return;
      closeMenus();
    };
    const tid = setTimeout(() => document.addEventListener('click', handler, true), 100);
    return () => { clearTimeout(tid); document.removeEventListener('click', handler, true); };
  });

  // Lazy YAML resources
  const [helmYAML] = createResource(
    () => showHelmYAML() && selectedRelease() ? `${selectedRelease()!.namespace}/${selectedRelease()!.name}` : null,
    async () => { try { const r = await api.getHelmReleaseYAML(selectedRelease()!.name, selectedRelease()!.namespace); return r.yaml || ''; } catch { return ''; } }
  );
  const [argoYAML] = createResource(
    () => showArgoYAML() && selectedArgoApp() ? `${selectedArgoApp()!.namespace}/${selectedArgoApp()!.name}` : null,
    async () => { try { const r = await api.getArgoCDAppYAML(selectedArgoApp()!.name, selectedArgoApp()!.namespace); return r.yaml || ''; } catch { return ''; } }
  );
  const [argoEditYAML] = createResource(
    () => showArgoEdit() && selectedArgoApp() && yamlKey() ? `${selectedArgoApp()!.namespace}/${selectedArgoApp()!.name}/${yamlKey()}` : null,
    async () => { try { const r = await api.getArgoCDAppYAML(selectedArgoApp()!.name, selectedArgoApp()!.namespace); return r.yaml || ''; } catch { return ''; } }
  );

  const handleSaveArgoYAML = async (yaml: string) => {
    const app = selectedArgoApp(); if (!app || !yaml.trim()) return;
    try {
      const res = await fetch('/api/plugins/argocd/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: app.name, namespace: app.namespace, yaml: yaml.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setActionMsg({ type: 'success', text: `${app.name} updated` });
      setShowArgoEdit(false); setYamlKey(null); refetchArgo();
    } catch (e: any) { setActionMsg({ type: 'error', text: e.message || 'Update failed' }); }
  };

  // Inline status badge using workspace CSS variables
  const GBadge: Component<{ status: string }> = (bp) => {
    const lo = (bp.status || '').toLowerCase();
    let bg = 'rgba(255,255,255,0.08)', color = 'var(--t2)';
    if (['deployed','synced','healthy','true','running'].includes(lo)) { bg = 'rgba(5,150,105,.15)'; color = 'var(--ok)'; }
    else if (['failed','degraded','false','error','crashloopbackoff'].includes(lo)) { bg = 'rgba(220,38,38,.15)'; color = 'var(--crit)'; }
    else if (['progressing','pending','outofsync','unknown'].includes(lo)) { bg = 'rgba(245,158,11,.15)'; color = 'var(--warn)'; }
    else if (['superseded','uninstalled'].includes(lo)) { bg = 'rgba(255,255,255,0.06)'; color = 'var(--t4)'; }
    return <span style={{ 'font-size': '10px', 'font-weight': '700', padding: '2px 7px', 'border-radius': 'var(--r99)', background: bg, color, display: 'inline-block', 'white-space': 'nowrap' }}>{bp.status}</span>;
  };

  // Shared action menu button style
  const menuItemStyle = (danger = false) => ({
    width: '100%', display: 'flex', 'align-items': 'center', gap: '8px',
    padding: '8px 14px', 'font-size': '12.5px',
    color: danger ? 'var(--crit)' : 'var(--t1)',
    background: 'transparent', border: 'none', cursor: 'pointer', 'text-align': 'left' as const,
  });

  // Plugin card icons
  const HelmIcon = () => (
    <svg viewBox="0 0 512 512" style={{ width: '32px', height: '32px', 'flex-shrink': '0' }}>
      <path fill="#0F1689" d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0z"/>
      <g fill="#fff"><circle cx="256" cy="256" r="50"/><rect x="248" y="96" width="16" height="80" rx="8"/><rect x="248" y="336" width="16" height="80" rx="8"/><rect x="96" y="248" width="80" height="16" rx="8"/><rect x="336" y="248" width="80" height="16" rx="8"/></g>
    </svg>
  );
  const ArgoCDIcon = () => (
    <svg viewBox="0 0 128 128" style={{ width: '32px', height: '32px', 'flex-shrink': '0' }}>
      <circle cx="64" cy="64" r="60" fill="#EF7B4D"/>
      <g fill="#fff"><ellipse cx="64" cy="52" rx="28" ry="24"/><circle cx="52" cy="48" r="3" fill="#1a1a1a"/><circle cx="76" cy="48" r="3" fill="#1a1a1a"/><path d="M44 76 Q34 90 28 100" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M64 80 Q64 96 64 108" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M84 76 Q94 90 100 100" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none"/></g>
    </svg>
  );
  const FluxIcon = () => (
    <svg viewBox="0 0 128 128" style={{ width: '32px', height: '32px', 'flex-shrink': '0' }}>
      <circle cx="64" cy="64" r="60" fill="#5468FF"/>
      <g fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"><path d="M24 44 Q44 28 64 44 Q84 60 104 44"/><path d="M24 64 Q44 48 64 64 Q84 80 104 64"/><path d="M24 84 Q44 68 64 84 Q84 100 104 84"/></g>
    </svg>
  );
  const KustomizeIcon = () => (
    <svg viewBox="0 0 128 128" style={{ width: '32px', height: '32px', 'flex-shrink': '0' }}>
      <circle cx="64" cy="64" r="60" fill="#326CE5"/>
      <g fill="#fff"><rect x="32" y="28" width="16" height="72" rx="2"/><polygon points="48,64 80,28 96,28 56,72 96,100 80,100"/></g>
    </svg>
  );

  const pluginCards = [
    { name: 'Helm', version: 'v3', desc: 'Package manager', icon: <HelmIcon />, tab: 'helm' as const,
      count: () => Array.isArray(helmReleases()) ? (helmReleases() as any[]).length : null, loading: () => helmReleases.loading },
    { name: 'ArgoCD', version: 'v2', desc: 'GitOps delivery', icon: <ArgoCDIcon />, tab: 'argocd' as const,
      count: () => Array.isArray(argoCDApps()) ? (argoCDApps() as any[]).length : null, loading: () => argoCDApps.loading },
    { name: 'Flux', version: 'v2', desc: 'GitOps toolkit', icon: <FluxIcon />, tab: 'flux' as const,
      count: () => Array.isArray(fluxResources()) ? (fluxResources() as any[]).length : null, loading: () => fluxResources.loading },
    { name: 'Kustomize', version: 'v5', desc: 'Config management', icon: <KustomizeIcon />, tab: null,
      count: () => null, loading: () => false },
  ];

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'helm',     label: 'Helm' },
    { id: 'argocd',   label: 'ArgoCD' },
    { id: 'flux',     label: 'Flux' },
  ] as const;

  const SearchBar: Component<{ value: string; onInput: (v: string) => void; placeholder: string; total: number; filtered: number; onRefresh: () => void; loading: boolean }> = (sp) => (
    <div style={{ padding: '10px 14px', display: 'flex', 'align-items': 'center', gap: '8px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0' }}>
      <div style={{ flex: '1', position: 'relative' }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', 'pointer-events': 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input style={{ width: '100%', 'box-sizing': 'border-box', padding: '5px 8px 5px 26px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', color: 'var(--t1)', 'font-size': '12px', outline: 'none' }}
          placeholder={sp.placeholder} value={sp.value} onInput={e => sp.onInput(e.currentTarget.value)} />
      </div>
      <span style={{ 'font-size': '10.5px', color: 'var(--t4)', 'flex-shrink': '0' }}>{sp.filtered}/{sp.total}</span>
      <button style={{ 'flex-shrink': '0', padding: '4px 9px', 'font-size': '11.5px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', color: 'var(--t2)', cursor: 'pointer', opacity: sp.loading ? '.5' : '1' }}
        onClick={sp.onRefresh} disabled={sp.loading}>↺</button>
    </div>
  );

  return (
    <div class="panel">
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0', padding: '0 12px', background: 'var(--s1)' }}>
        <For each={TABS}>
          {(tab) => (
            <button style={{
              padding: '10px 12px', 'font-size': '12px',
              'font-weight': activeTab() === tab.id ? '700' : '500',
              color: activeTab() === tab.id ? 'var(--brand)' : 'var(--t4)',
              background: 'none', border: 'none', cursor: 'pointer',
              'border-bottom': `2px solid ${activeTab() === tab.id ? 'var(--brand)' : 'transparent'}`,
              transition: 'all .15s', 'white-space': 'nowrap',
            }} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
          )}
        </For>
      </div>

      <div class="panel-scroll">

        {/* ── Overview ── */}
        <Show when={activeTab() === 'overview'}>
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'grid', 'grid-template-columns': 'repeat(2,1fr)', gap: '10px', 'margin-bottom': '14px' }}>
              <For each={pluginCards}>
                {(p) => (
                  <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r10)', padding: '12px', cursor: p.tab ? 'pointer' : 'default' }}
                    onClick={() => p.tab && setActiveTab(p.tab)}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'margin-bottom': '8px' }}>
                      {p.icon}
                      <div>
                        <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--t1)' }}>{p.name}</div>
                        <div style={{ 'font-size': '10px', color: 'var(--t4)' }}>{p.version}</div>
                      </div>
                    </div>
                    <p style={{ 'font-size': '11px', color: 'var(--t3)', 'margin-bottom': '8px' }}>{p.desc}</p>
                    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between' }}>
                      <span style={{ 'font-size': '10px', 'font-weight': '700', padding: '2px 7px', 'border-radius': 'var(--r99)', background: 'rgba(5,150,105,.15)', color: 'var(--ok)' }}>Enabled</span>
                      <Show when={!p.loading()} fallback={<span style={{ 'font-size': '10px', color: 'var(--t4)' }}>…</span>}>
                        <span style={{ 'font-size': '13px', 'font-weight': '800', color: 'var(--brand)', 'font-family': 'var(--mono)' }}>{p.count() ?? '—'}</span>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Quick stats */}
            <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r10)', padding: '12px' }}>
              <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.5px', 'margin-bottom': '10px' }}>Quick Stats</div>
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(3,1fr)', gap: '8px' }}>
                <For each={pluginCards.filter(p => p.tab)}>
                  {(p) => (
                    <button style={{ padding: '10px', 'border-radius': 'var(--r6)', 'text-align': 'center', cursor: 'pointer', background: 'rgba(255,255,255,.04)', border: '1px solid var(--b1)' }}
                      onClick={() => p.tab && setActiveTab(p.tab!)}>
                      <Show when={!p.loading()} fallback={<div style={{ 'font-size': '18px', 'font-weight': '800', color: 'var(--brand)' }}>…</div>}>
                        <div style={{ 'font-size': '20px', 'font-weight': '800', color: 'var(--brand)', 'font-family': 'var(--mono)' }}>{p.count() ?? 0}</div>
                      </Show>
                      <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-top': '2px' }}>{p.name}</div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        </Show>

        {/* ── Helm Releases ── */}
        <Show when={activeTab() === 'helm'}>
          <SearchBar
            value={helmSearch()} onInput={setHelmSearch}
            placeholder="Search releases…"
            total={(helmReleases() as any[] | undefined)?.length ?? 0}
            filtered={filteredHelm().length}
            onRefresh={refetchHelm} loading={helmReleases.loading}
          />
          <Show when={!helmReleases.loading} fallback={<PanelLoading />}>
            <table class="panel-table">
              <thead><tr>
                <th>Name</th><th>Namespace</th><th>Chart</th><th>Rev</th><th>Status</th><th>Updated</th><th></th>
              </tr></thead>
              <tbody>
                <Show when={filteredHelm().length > 0} fallback={
                  <tr><td colspan="7" style={{ padding: '24px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>
                    {helmSearch() ? `No releases match "${helmSearch()}"` : 'No Helm releases found'}
                  </td></tr>
                }>
                  <For each={filteredHelm()}>
                    {(rel: any) => (
                      <tr style={{ cursor: 'pointer' }} onClick={() => openHelmDetails(rel)}>
                        <td class="panel-cell-name">{rel.name}</td>
                        <td style={{ 'font-size': '11px' }}>{rel.namespace}</td>
                        <td style={{ 'font-size': '11px' }}>{rel.chart}</td>
                        <td style={{ 'font-size': '11px', 'font-family': 'var(--mono)' }}>{rel.revision}</td>
                        <td><GBadge status={rel.status} /></td>
                        <td style={{ 'font-size': '11px', color: 'var(--t3)' }}>{rel.updated}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button data-gitops-btn
                            style={{ padding: '3px 8px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', cursor: 'pointer', color: 'var(--t2)', 'font-size': '15px', 'line-height': '1' }}
                            onClick={e => openHelmMenu(e, rel)} title="Actions">⋮</button>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </Show>
        </Show>

        {/* ── ArgoCD Apps ── */}
        <Show when={activeTab() === 'argocd'}>
          <SearchBar
            value={argoSearch()} onInput={setArgoSearch}
            placeholder="Search ArgoCD apps…"
            total={(argoCDApps() as any[] | undefined)?.length ?? 0}
            filtered={filteredArgo().length}
            onRefresh={refetchArgo} loading={argoCDApps.loading}
          />
          <Show when={!argoCDApps.loading} fallback={<PanelLoading />}>
            <Show when={(argoCDApps() as any[] | undefined)?.length ?? 0 > 0} fallback={
              <div style={{ padding: '32px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>No ArgoCD applications found</div>
            }>
              <table class="panel-table">
                <thead><tr>
                  <th>Name</th><th>Project</th><th>Sync</th><th>Health</th><th>Age</th><th></th>
                </tr></thead>
                <tbody>
                  <For each={filteredArgo()} fallback={
                    <tr><td colspan="6" style={{ padding: '24px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>
                      {argoSearch() ? `No apps match "${argoSearch()}"` : 'No ArgoCD apps found'}
                    </td></tr>
                  }>
                    {(app: any) => (
                      <tr style={{ cursor: 'pointer' }} onClick={() => openArgoDetails(app)}>
                        <td class="panel-cell-name">{app.name}</td>
                        <td style={{ 'font-size': '11px' }}>{app.project}</td>
                        <td><GBadge status={app.syncStatus} /></td>
                        <td><GBadge status={app.health} /></td>
                        <td style={{ 'font-size': '11px' }}>{app.age}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button data-gitops-btn
                            style={{ padding: '3px 8px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', cursor: 'pointer', color: 'var(--t2)', 'font-size': '15px', 'line-height': '1' }}
                            onClick={e => openArgoMenu(e, app)} title="Actions">⋮</button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </Show>

        {/* ── Flux Resources ── */}
        <Show when={activeTab() === 'flux'}>
          <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '10px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0' }}>
            <span style={{ 'font-size': '11px', color: 'var(--t4)' }}>{(fluxResources() as any[] | undefined)?.length ?? 0} resources</span>
            <button style={{ padding: '4px 9px', 'font-size': '11.5px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', color: 'var(--t2)', cursor: 'pointer' }}
              onClick={() => refetchFlux()} disabled={fluxResources.loading}>↺ Refresh</button>
          </div>
          <Show when={!fluxResources.loading} fallback={<PanelLoading />}>
            <Show when={((fluxResources() as any[] | undefined)?.length ?? 0) > 0} fallback={
              <div style={{ padding: '32px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>No Flux resources found. Flux may not be installed.</div>
            }>
              <table class="panel-table">
                <thead><tr><th>Name</th><th>Kind</th><th>Namespace</th><th>Ready</th><th>Status</th></tr></thead>
                <tbody>
                  <For each={(fluxResources() as any[] | undefined) || []}>
                    {(res: any) => (
                      <tr>
                        <td class="panel-cell-name">{res.name}</td>
                        <td style={{ 'font-size': '11px' }}>{res.kind}</td>
                        <td style={{ 'font-size': '11px' }}>{res.namespace}</td>
                        <td><GBadge status={res.ready ? 'True' : 'False'} /></td>
                        <td style={{ 'font-size': '11px' }}>{res.status}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Show>
        </Show>

      </div>{/* end panel-scroll */}

      {/* ═══ MODALS ═══ */}

      {/* Helm Details + History */}
      <Modal isOpen={showDetails()} onClose={() => setShowDetails(false)} title={`Helm Release: ${selectedRelease()?.name}`} size="lg">
        <Show when={selectedRelease()}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            <Show when={actionMsg()}>
              <div style={{ padding: '8px 12px', 'border-radius': 'var(--r6)', 'font-size': '12.5px', background: actionMsg()?.type === 'success' ? 'rgba(5,150,105,.15)' : 'rgba(220,38,38,.15)', color: actionMsg()?.type === 'success' ? 'var(--ok)' : 'var(--crit)' }}>{actionMsg()?.text}</div>
            </Show>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
              <For each={[['Chart', selectedRelease()?.chart], ['Revision', String(selectedRelease()?.revision)], ['Namespace', selectedRelease()?.namespace], ['Status', selectedRelease()?.status], ['App Version', selectedRelease()?.appVersion || '—'], ['Updated', selectedRelease()?.updated]]}>
                {([lbl, val]) => (
                  <div style={{ background: 'rgba(255,255,255,.04)', 'border-radius': 'var(--r6)', padding: '8px 10px', border: '1px solid var(--b1)' }}>
                    <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-bottom': '2px' }}>{lbl}</div>
                    <div style={{ 'font-size': '12.5px', 'font-weight': '600', color: 'var(--t1)' }}>{val}</div>
                  </div>
                )}
              </For>
            </div>
            <div>
              <div style={{ 'font-size': '11px', 'font-weight': '700', color: 'var(--t2)', 'margin-bottom': '8px' }}>Release History</div>
              <Show when={!historyLoading()} fallback={<div style={{ padding: '12px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>Loading…</div>}>
                <Show when={releaseHistory().length > 0} fallback={<div style={{ 'font-size': '12px', color: 'var(--t4)' }}>No history available</div>}>
                  <table class="panel-table">
                    <thead><tr><th>Rev</th><th>Status</th><th>Updated</th><th>Description</th><th></th></tr></thead>
                    <tbody>
                      <For each={releaseHistory()}>
                        {(entry: any) => (
                          <tr>
                            <td style={{ 'font-family': 'var(--mono)', 'font-size': '11.5px', color: 'var(--brand)' }}>
                              {entry.revision}
                              <Show when={entry.revision === selectedRelease()?.revision}>
                                <span style={{ 'margin-left': '4px', 'font-size': '9px', background: 'rgba(5,150,105,.15)', color: 'var(--ok)', padding: '1px 5px', 'border-radius': 'var(--r99)' }}>current</span>
                              </Show>
                            </td>
                            <td><GBadge status={entry.status} /></td>
                            <td style={{ 'font-size': '11px', color: 'var(--t2)' }}>{entry.updated}</td>
                            <td style={{ 'font-size': '11px', color: 'var(--t4)', 'max-width': '140px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{entry.description || '—'}</td>
                            <td>
                              <Show when={entry.revision !== selectedRelease()?.revision}>
                                <button style={{ padding: '3px 9px', 'font-size': '11px', background: 'rgba(245,158,11,.15)', color: 'var(--warn)', border: '1px solid rgba(245,158,11,.3)', 'border-radius': 'var(--r6)', cursor: 'pointer' }}
                                  onClick={() => { setRollbackRevision(entry.revision); setShowRollbackConfirm(true); }}
                                  disabled={actionLoading()}>Rollback</button>
                              </Show>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
      </Modal>

      {/* ArgoCD Details */}
      <Modal isOpen={showArgoDetails()} onClose={() => setShowArgoDetails(false)} title={`ArgoCD: ${selectedArgoApp()?.name}`} size="lg">
        <Show when={selectedArgoApp()}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
            <Show when={actionMsg()}>
              <div style={{ padding: '8px 12px', 'border-radius': 'var(--r6)', 'font-size': '12.5px', background: actionMsg()?.type === 'success' ? 'rgba(5,150,105,.15)' : 'rgba(220,38,38,.15)', color: actionMsg()?.type === 'success' ? 'var(--ok)' : 'var(--crit)' }}>{actionMsg()?.text}</div>
            </Show>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '7px 14px', 'font-size': '12.5px', 'font-weight': '600', background: 'var(--brand)', color: '#fff', border: 'none', 'border-radius': 'var(--r6)', cursor: 'pointer', opacity: actionLoading() ? '.5' : '1' }}
                onClick={handleArgoSync} disabled={actionLoading()}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                {actionLoading() ? 'Syncing…' : 'Sync'}
              </button>
              <button style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '7px 14px', 'font-size': '12.5px', background: 'rgba(255,255,255,.06)', color: 'var(--t1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', cursor: 'pointer', opacity: actionLoading() ? '.5' : '1' }}
                onClick={handleArgoRefresh} disabled={actionLoading()}>
                ↺ {actionLoading() ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
              <For each={[['Project', selectedArgoApp()?.project], ['Namespace', selectedArgoApp()?.namespace], ['Sync Status', selectedArgoApp()?.syncStatus], ['Health', selectedArgoApp()?.health], ['Revision', selectedArgoApp()?.revision || '—'], ['Age', selectedArgoApp()?.age]]}>
                {([lbl, val]) => (
                  <div style={{ background: 'rgba(255,255,255,.04)', 'border-radius': 'var(--r6)', padding: '8px 10px', border: '1px solid var(--b1)' }}>
                    <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-bottom': '2px' }}>{lbl}</div>
                    <div style={{ 'font-size': '12.5px', 'font-weight': '600', color: 'var(--t1)' }}>{val}</div>
                  </div>
                )}
              </For>
            </div>
            <div style={{ background: 'rgba(255,255,255,.04)', 'border-radius': 'var(--r6)', padding: '8px 10px', border: '1px solid var(--b1)' }}>
              <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-bottom': '2px' }}>Repository</div>
              <div style={{ 'font-size': '11.5px', color: 'var(--t1)', 'word-break': 'break-all' }}>{selectedArgoApp()?.repoURL || '—'}</div>
            </div>
            <Show when={selectedArgoApp()?.path}>
              <div style={{ background: 'rgba(255,255,255,.04)', 'border-radius': 'var(--r6)', padding: '8px 10px', border: '1px solid var(--b1)' }}>
                <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-bottom': '2px' }}>Path</div>
                <div style={{ 'font-size': '11.5px', color: 'var(--t1)' }}>{selectedArgoApp()?.path}</div>
              </div>
            </Show>
          </div>
        </Show>
      </Modal>

      {/* Helm Rollback Confirm */}
      <ConfirmationModal
        isOpen={showRollbackConfirm()}
        onClose={() => { if (!actionLoading()) { setShowRollbackConfirm(false); setRollbackRevision(null); } }}
        title="Rollback Helm Release"
        message={`Roll back "${selectedRelease()?.name}" to revision ${rollbackRevision()}?`}
        details={selectedRelease() && rollbackRevision() ? [
          { label: 'Release', value: selectedRelease()!.name },
          { label: 'Namespace', value: selectedRelease()!.namespace },
          { label: 'Target Revision', value: String(rollbackRevision()) },
          { label: 'Current Revision', value: String(selectedRelease()!.revision) },
        ] : undefined}
        variant="warning" confirmText="Rollback" cancelText="Cancel"
        loading={actionLoading()} onConfirm={handleRollback} size="sm"
      />

      {/* Helm Uninstall */}
      <HelmReleaseDeleteModal
        isOpen={showUninstallModal()} release={releaseToUninstall()}
        onClose={() => { setShowUninstallModal(false); setReleaseToUninstall(null); }}
        onConfirm={confirmUninstallHelm} loading={uninstalling()}
      />

      {/* Helm Describe */}
      <Show when={selectedRelease()}>
        <DescribeModal isOpen={showHelmDescribe()} onClose={() => setShowHelmDescribe(false)}
          resourceType="helmrelease" name={selectedRelease()!.name} namespace={selectedRelease()!.namespace} />
      </Show>

      {/* ArgoCD Describe */}
      <Show when={selectedArgoApp()}>
        <DescribeModal isOpen={showArgoDescribe()} onClose={() => setShowArgoDescribe(false)}
          resourceType="argocdapp" name={selectedArgoApp()!.name} namespace={selectedArgoApp()!.namespace} />
      </Show>

      {/* Helm YAML Viewer */}
      <Show when={selectedRelease()}>
        <Modal isOpen={showHelmYAML()} onClose={() => setShowHelmYAML(false)} title={`Helm YAML: ${selectedRelease()!.name}`} size="xl">
          <Show when={!helmYAML.loading} fallback={<PanelLoading />}>
            <YAMLViewer yaml={helmYAML() || ''} title={selectedRelease()!.name} />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD YAML Viewer */}
      <Show when={selectedArgoApp()}>
        <Modal isOpen={showArgoYAML()} onClose={() => setShowArgoYAML(false)} title={`ArgoCD YAML: ${selectedArgoApp()!.name}`} size="xl">
          <Show when={!argoYAML.loading} fallback={<PanelLoading />}>
            <YAMLViewer yaml={argoYAML() || ''} title={selectedArgoApp()!.name} />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD YAML Editor */}
      <Show when={selectedArgoApp()}>
        <Modal isOpen={showArgoEdit()} onClose={() => { setShowArgoEdit(false); setYamlKey(null); }} title={`Edit ArgoCD: ${selectedArgoApp()!.name}`} size="xl">
          <Show when={!argoEditYAML.loading} fallback={<PanelLoading />}>
            <YAMLEditor yaml={argoEditYAML() || ''} title={selectedArgoApp()!.name} onSave={handleSaveArgoYAML} onCancel={() => { setShowArgoEdit(false); setYamlKey(null); }} />
          </Show>
        </Modal>
      </Show>

      {/* ArgoCD Delete Confirm */}
      <ConfirmationModal
        isOpen={showArgoDeleteConfirm()}
        onClose={() => { if (!deleting()) { setShowArgoDeleteConfirm(false); setSelectedArgoApp(null); } }}
        title="Delete ArgoCD Application"
        message={`Delete "${selectedArgoApp()?.name}"?`}
        details={selectedArgoApp() ? [
          { label: 'Application', value: selectedArgoApp()!.name },
          { label: 'Namespace', value: selectedArgoApp()!.namespace },
        ] : undefined}
        variant="danger" confirmText="Delete" cancelText="Cancel"
        loading={deleting()} onConfirm={handleDeleteArgo} size="sm"
      />

      {/* Helm action dropdown */}
      <Show when={openMenuHelm() && menuPos() && currentMenuHelm()}>
        <Portal>
          <div data-gitops-menu style={{ position: 'fixed', top: `${menuPos()!.top}px`, left: `${menuPos()!.left}px`, background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r10)', 'box-shadow': '0 10px 40px rgba(0,0,0,.35)', 'z-index': '9998', 'min-width': '180px', padding: '4px 0' }}
            onMouseEnter={() => setMenuHover(true)} onMouseLeave={() => setMenuHover(false)}>
            <For each={[
              { label: 'Details & History', onClick: () => { openHelmDetails(currentMenuHelm()!); closeMenus(); } },
              { label: 'View YAML', onClick: () => { setSelectedRelease(currentMenuHelm()!); setShowHelmYAML(true); closeMenus(); } },
              { label: 'Describe', onClick: () => { setSelectedRelease(currentMenuHelm()!); setShowHelmDescribe(true); closeMenus(); } },
              { label: 'Uninstall', onClick: () => { setReleaseToUninstall(currentMenuHelm()!); setShowUninstallModal(true); closeMenus(); }, danger: true },
            ]}>
              {(item) => (
                <>
                  <Show when={item.danger}><div style={{ height: '1px', background: 'var(--b1)', margin: '4px 0' }} /></Show>
                  <button style={menuItemStyle(item.danger)}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); item.onClick(); }}
                    onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(220,38,38,.1)' : 'rgba(255,255,255,.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>{item.label}</button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>

      {/* ArgoCD action dropdown */}
      <Show when={openMenuArgo() && menuPos() && currentMenuArgo()}>
        <Portal>
          <div data-gitops-menu style={{ position: 'fixed', top: `${menuPos()!.top}px`, left: `${menuPos()!.left}px`, background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r10)', 'box-shadow': '0 10px 40px rgba(0,0,0,.35)', 'z-index': '9998', 'min-width': '180px', padding: '4px 0' }}
            onMouseEnter={() => setMenuHover(true)} onMouseLeave={() => setMenuHover(false)}>
            <For each={[
              { label: 'Details', onClick: () => { openArgoDetails(currentMenuArgo()!); closeMenus(); } },
              { label: 'View YAML', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); setShowArgoYAML(true); closeMenus(); } },
              { label: 'Edit YAML', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); setYamlKey(`${Date.now()}`); setShowArgoEdit(true); closeMenus(); } },
              { label: 'Sync', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); handleArgoSync(); closeMenus(); } },
              { label: 'Refresh', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); handleArgoRefresh(); closeMenus(); } },
              { label: 'Describe', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); setShowArgoDescribe(true); closeMenus(); } },
              { label: 'Delete', onClick: () => { setSelectedArgoApp(currentMenuArgo()!); setShowArgoDeleteConfirm(true); closeMenus(); }, danger: true },
            ]}>
              {(item) => (
                <>
                  <Show when={item.danger}><div style={{ height: '1px', background: 'var(--b1)', margin: '4px 0' }} /></Show>
                  <button style={menuItemStyle(item.danger)}
                    onClick={e => { e.preventDefault(); e.stopPropagation(); item.onClick(); }}
                    onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(220,38,38,.1)' : 'rgba(255,255,255,.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>{item.label}</button>
                </>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
};

/* ============================================
   CostPanel (CST)
   ============================================ */
export const CostPanel: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [costData, setCostData] = createSignal<any>(null);
  const [idleData, setIdleData] = createSignal<any>(null);
  const [error, setError] = createSignal('');
  const [activeTab, setActiveTab] = createSignal<'overview' | 'namespaces' | 'idle'>('overview');

  const fetchCost = async () => {
    setLoading(true);
    setError('');
    try {
      const [cost, idle] = await Promise.allSettled([
        api.getClusterCost(),
        api.getIdleResources(),
      ]);
      if (cost.status === 'fulfilled') setCostData(cost.value);
      if (idle.status === 'fulfilled') setIdleData(idle.value);
    } catch (e: any) {
      setError('Cost analysis not available');
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchCost);

  const fmt$ = (v: number | undefined) => v !== undefined && v !== null ? `$${v.toFixed(2)}` : '--';
  const fmtCPU = (v: number | undefined) => {
    if (v === undefined || v === null) return '--';
    return v < 1 ? `${(v * 1000).toFixed(0)}m` : `${v.toFixed(2)} cores`;
  };
  const fmtMem = (v: number | undefined) => {
    if (v === undefined || v === null) return '--';
    return v < 1 ? `${(v * 1024).toFixed(0)} Mi` : `${v.toFixed(2)} Gi`;
  };

  const potentialSavings = () => {
    const idle = (idleData()?.idleResources || []) as any[];
    return idle.reduce((acc: number, r: any) => acc + (r.wastedCost || 0), 0) * 720;
  };

  const CloudBadge = () => {
    const p = () => costData()?.cloud?.provider;
    return (
      <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '4px 10px', background: 'var(--s3)', 'border-radius': 'var(--r8)', border: '1px solid var(--b1)', 'font-size': '11px' }}>
        <Show when={p() === 'gcp'}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 4L6 14v20l18 10 18-10V14L24 4z"/><path fill="#EA4335" d="M24 4L6 14l18 10 18-10L24 4z"/><path fill="#34A853" d="M6 34l18 10V24L6 14v20z"/><path fill="#FBBC05" d="M42 34V14L24 24v20l18-10z"/>
          </svg>
        </Show>
        <Show when={p() === 'aws'}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FF9900" d="M8 24c0-8.8 7.2-16 16-16s16 7.2 16 16-7.2 16-16 16S8 32.8 8 24z"/></svg>
        </Show>
        <Show when={p() === 'azure'}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#0089D6" d="M24 4L8 24l8 16h16l8-16L24 4z"/></svg>
        </Show>
        <Show when={!p() || p() === 'unknown'}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
        </Show>
        <span style={{ color: 'var(--t3)', 'font-weight': '600' }}>{costData()?.cloud?.displayName || 'Cloud'}</span>
        <Show when={costData()?.cloud?.region}>
          <span style={{ color: 'var(--t5)' }}>{costData()?.cloud?.region}</span>
        </Show>
      </div>
    );
  };

  return (
    <div class="panel">
      <div class="panel-header" style={{ 'flex-wrap': 'wrap', gap: '6px' }}>
        <div>
          <h2 class="panel-title">Cost Analysis</h2>
          <span class="panel-subtitle">Cluster cost estimation &amp; optimization</span>
        </div>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-left': 'auto' }}>
          <Show when={costData()}><CloudBadge /></Show>
          <button class="btn btn-ghost btn-sm" onClick={fetchCost} disabled={loading()} title="Refresh">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.5-2.3M14 8a6 6 0 01-11.5 2.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            {loading() ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <Show when={!error()} fallback={<PanelEmpty message={error()} />}>
            {/* Summary cards */}
            <Show when={costData()}>
              <div class="panel-summary-grid" style={{ 'grid-template-columns': 'repeat(2,1fr)' }}>
                <PanelCard label="Hourly" value={fmt$(costData()?.hourlyCost)} color="teal" />
                <PanelCard label="Daily" value={fmt$(costData()?.dailyCost)} color="blue" />
                <PanelCard label="Monthly Est." value={fmt$(costData()?.monthlyCost)} color="amber" />
                <PanelCard label="Potential Savings" value={fmt$(potentialSavings())} color="teal" />
              </div>
            </Show>

            {/* Tab bar */}
            <div style={{ display: 'flex', 'border-bottom': '1px solid var(--b1)', padding: '0 16px', 'margin-bottom': '0', 'flex-shrink': '0' }}>
              {(['overview', 'namespaces', 'idle'] as const).map(tab => (
                <button
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '7px 12px',
                    'font-size': '11px',
                    'font-weight': '600',
                    background: 'none',
                    border: 'none',
                    'border-bottom': `2px solid ${activeTab() === tab ? 'var(--brand)' : 'transparent'}`,
                    color: activeTab() === tab ? 'var(--brand)' : 'var(--t4)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    'margin-bottom': '-1px',
                  }}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'namespaces' ? 'By Namespace' : 'Idle Resources'}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            <Show when={activeTab() === 'overview'}>
              <Show when={costData()}>
                {/* Cost by namespace top-8 */}
                <div style={{ padding: '12px 16px 0' }}>
                  <div class="sec"><div class="sec-diamond" /><span class="sec-title">Cost by Namespace</span></div>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '6px', 'margin-top': '8px' }}>
                    <For each={(costData()?.namespaceCosts || []).slice(0, 6)}>
                      {(ns: any) => (
                        <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '8px 10px', background: 'var(--s2)', 'border-radius': 'var(--r8)', border: '1px solid var(--b1)' }}>
                          <div>
                            <div style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--t1)' }}>{ns.namespace}</div>
                            <div style={{ 'font-size': '9.5px', color: 'var(--t5)', 'font-family': 'var(--mono)' }}>
                              {ns.podCount} pods · {fmtCPU(ns.totalCpu)} CPU · {fmtMem(ns.totalMemory)} mem
                            </div>
                          </div>
                          <div style={{ 'text-align': 'right' }}>
                            <div style={{ 'font-size': '12px', 'font-weight': '700', color: 'var(--warn)' }}>{fmt$(ns.monthlyCost)}/mo</div>
                            <div style={{ 'font-size': '9.5px', color: 'var(--t5)' }}>{fmt$(ns.dailyCost)}/day</div>
                          </div>
                        </div>
                      )}
                    </For>
                    <Show when={!(costData()?.namespaceCosts?.length)}>
                      <div style={{ 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px', padding: '12px' }}>No namespace cost data</div>
                    </Show>
                  </div>
                </div>

                {/* Resource allocation + pricing */}
                <div style={{ padding: '12px 16px' }}>
                  <div class="sec"><div class="sec-diamond" /><span class="sec-title">Resource Allocation</span></div>
                  <div style={{ 'margin-top': '8px', display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', 'margin-bottom': '4px' }}>
                        <span style={{ color: 'var(--t3)' }}>CPU ({fmtCPU(costData()?.totalCpu)})</span>
                        <span style={{ color: 'var(--t5)' }}>{costData()?.nodeCount || 0} nodes</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--s4)', 'border-radius': '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '100%', background: 'var(--brand)', 'border-radius': '2px' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '11px', 'margin-bottom': '4px' }}>
                        <span style={{ color: 'var(--t3)' }}>Memory ({fmtMem(costData()?.totalMemory)})</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--s4)', 'border-radius': '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '100%', background: 'var(--blue)', 'border-radius': '2px' }} />
                      </div>
                    </div>
                  </div>
                  {/* Pricing rates */}
                  <div style={{ 'margin-top': '12px', 'padding-top': '10px', 'border-top': '1px solid var(--b1)' }}>
                    <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.5px', 'margin-bottom': '6px' }}>
                      Pricing ({costData()?.pricing?.provider || 'Generic'}{costData()?.pricing?.region ? ` · ${costData()?.pricing?.region}` : ''})
                    </div>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px', 'font-size': '11px' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span style={{ color: 'var(--t4)' }}>CPU /core/hr</span>
                        <span style={{ color: 'var(--t2)', 'font-family': 'var(--mono)' }}>${(costData()?.pricing?.cpuPerCoreHour || 0.0336).toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span style={{ color: 'var(--t4)' }}>Memory /GB/hr</span>
                        <span style={{ color: 'var(--t2)', 'font-family': 'var(--mono)' }}>${(costData()?.pricing?.memoryPerGBHour || 0.0045).toFixed(4)}</span>
                      </div>
                      <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                        <span style={{ color: 'var(--t4)' }}>Storage /GB/mo</span>
                        <span style={{ color: 'var(--t2)', 'font-family': 'var(--mono)' }}>${(costData()?.pricing?.storagePerGBMonth || 0.10).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <Show when={(costData()?.recommendations || []).length > 0}>
                  <div style={{ padding: '0 16px 12px' }}>
                    <div class="sec"><div class="sec-diamond" /><span class="sec-title">Optimization Recommendations</span></div>
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', 'margin-top': '8px' }}>
                      <For each={(costData()?.recommendations || []).slice(0, 5)}>
                        {(rec: any) => (
                          <div style={{
                            padding: '10px 12px',
                            'border-radius': 'var(--r8)',
                            border: `1px solid ${rec.impact === 'high' ? 'var(--warnBdr)' : 'var(--b1)'}`,
                            background: rec.impact === 'high' ? 'var(--warnBg)' : 'var(--s2)',
                          }}>
                            <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start', gap: '8px' }}>
                              <div style={{ flex: '1' }}>
                                <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'margin-bottom': '3px' }}>
                                  <span style={{ 'font-size': '11.5px', 'font-weight': '700', color: 'var(--t1)' }}>{rec.title}</span>
                                  <span style={{
                                    'font-size': '8.5px', 'font-weight': '800', padding: '1px 5px', 'border-radius': '3px',
                                    background: rec.impact === 'high' ? 'var(--warn)' : 'var(--brand)', color: '#fff',
                                  }}>{(rec.impact || '').toUpperCase()}</span>
                                </div>
                                <div style={{ 'font-size': '10.5px', color: 'var(--t4)' }}>{rec.description}</div>
                              </div>
                              <div style={{ 'text-align': 'right', 'flex-shrink': '0' }}>
                                <div style={{ 'font-size': '13px', 'font-weight': '800', color: 'var(--ok)' }}>{fmt$(rec.savings)}</div>
                                <div style={{ 'font-size': '9px', color: 'var(--t5)' }}>mo savings</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </Show>
            </Show>

            {/* By Namespace tab */}
            <Show when={activeTab() === 'namespaces'}>
              <table class="panel-table">
                <thead>
                  <tr><th>Namespace</th><th>Pods</th><th>CPU</th><th>Memory</th><th>Hourly</th><th>Monthly</th></tr>
                </thead>
                <tbody>
                  <Show when={(costData()?.namespaceCosts || []).length > 0} fallback={
                    <tr><td colspan="6" style={{ 'text-align': 'center', padding: '24px', color: 'var(--t5)' }}>No namespace cost data</td></tr>
                  }>
                    <For each={costData()?.namespaceCosts || []}>
                      {(ns: any) => (
                        <tr>
                          <td class="panel-cell-name" style={{ color: 'var(--brand)' }}>{ns.namespace}</td>
                          <td>{ns.podCount}</td>
                          <td style={{ 'font-family': 'var(--mono)' }}>{fmtCPU(ns.totalCpu)}</td>
                          <td style={{ 'font-family': 'var(--mono)' }}>{fmtMem(ns.totalMemory)}</td>
                          <td style={{ 'font-family': 'var(--mono)' }}>{fmt$(ns.hourlyCost)}</td>
                          <td style={{ 'font-weight': '700', color: 'var(--warn)', 'font-family': 'var(--mono)' }}>{fmt$(ns.monthlyCost)}</td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </Show>

            {/* Idle Resources tab */}
            <Show when={activeTab() === 'idle'}>
              <div style={{ padding: '12px 16px 8px', display: 'flex', 'align-items': 'center', gap: '8px', background: 'var(--okBg)', border: '1px solid var(--okBdr)', margin: '8px 16px', 'border-radius': 'var(--r8)' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--ok)', 'flex-shrink': '0' }}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <div style={{ 'font-size': '11px', 'font-weight': '700', color: 'var(--ok)' }}>Optimization Opportunities</div>
                  <div style={{ 'font-size': '10px', color: 'var(--t4)' }}>Resources using &lt;10% of requests could be scaled down</div>
                </div>
              </div>
              <table class="panel-table">
                <thead>
                  <tr><th>Resource</th><th>Namespace</th><th>Kind</th><th>CPU%</th><th>Mem%</th><th>Wasted/hr</th></tr>
                </thead>
                <tbody>
                  <Show when={(idleData()?.idleResources || []).length > 0} fallback={
                    <tr><td colspan="6" style={{ 'text-align': 'center', padding: '24px', color: 'var(--t5)' }}>
                      <div>No idle resources found</div>
                      <div style={{ 'font-size': '10px', 'margin-top': '4px' }}>All resources are being utilized efficiently</div>
                    </td></tr>
                  }>
                    <For each={idleData()?.idleResources || []}>
                      {(r: any) => {
                        const cpuPct = r.cpuRequest > 0 ? Math.min(100, (r.cpuUsage / r.cpuRequest) * 100) : 0;
                        const memPct = r.memoryRequest > 0 ? Math.min(100, (r.memoryUsage / r.memoryRequest) * 100) : 0;
                        return (
                          <tr>
                            <td class="panel-cell-name" style={{ color: 'var(--brand)' }}>{r.name}</td>
                            <td>{r.namespace}</td>
                            <td><span class="svc-kind">{r.kind}</span></td>
                            <td>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
                                <div style={{ width: '36px', height: '4px', background: 'var(--s4)', 'border-radius': '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${cpuPct}%`, background: 'var(--warn)', 'border-radius': '2px' }} />
                                </div>
                                <span style={{ 'font-size': '9.5px', color: 'var(--t4)', 'font-family': 'var(--mono)' }}>{cpuPct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
                                <div style={{ width: '36px', height: '4px', background: 'var(--s4)', 'border-radius': '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${memPct}%`, background: 'var(--blue)', 'border-radius': '2px' }} />
                                </div>
                                <span style={{ 'font-size': '9.5px', color: 'var(--t4)', 'font-family': 'var(--mono)' }}>{memPct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td style={{ 'font-weight': '700', color: 'var(--ok)', 'font-family': 'var(--mono)' }}>{fmt$(r.wastedCost)}</td>
                          </tr>
                        );
                      }}
                    </For>
                  </Show>
                </tbody>
              </table>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   SettingsPanel (SET)
   ============================================ */
export const SettingsPanel: Component<{
  incidents?: Incident[];
  onClose?: () => void;
}> = (props) => {
  const [autoRemediation, setAutoRemediation] = createSignal(false);
  const [autoRemLoading, setAutoRemLoading] = createSignal(false);
  const [learningStatus, setLearningStatus] = createSignal<any>(null);
  const [patternCount, setPatternCount] = createSignal(0);
  const [appVersion, setAppVersion] = createSignal('—');
  const [refreshInterval, setRefreshInterval] = createSignal(
    localStorage.getItem('kubegraf-refresh-interval') || '30'
  );

  onMount(async () => {
    // Load auto-remediation status
    try {
      const status = await fetchAPI<any>('/v2/auto-remediation/status');
      setAutoRemediation(status?.enabled ?? false);
    } catch { /* not available */ }

    // Load learning status
    try {
      const ls = await fetchAPI<any>('/v2/learning/status');
      setLearningStatus(ls);
    } catch { /* not available */ }

    // Load pattern count
    try {
      const patterns = await fetchAPI<any>('/v2/learning/patterns');
      setPatternCount(patterns?.count ?? patterns?.length ?? 0);
    } catch { /* not available */ }

    // Load app version from update-check endpoint
    try {
      const upd = await fetchAPI<any>('/update/check');
      const ver = upd?.currentVersion || upd?.current_version;
      if (ver) setAppVersion(ver);
    } catch { /* version unavailable */ }
  });

  const toggleAutoRemediation = async () => {
    setAutoRemLoading(true);
    const next = !autoRemediation();
    try {
      await fetchAPI<any>(`/v2/auto-remediation/${next ? 'enable' : 'disable'}`, { method: 'POST' });
      setAutoRemediation(next);
    } catch { /* ignore */ }
    setAutoRemLoading(false);
  };

  const handleRefreshChange = (val: string) => {
    setRefreshInterval(val);
    localStorage.setItem('kubegraf-refresh-interval', val);
  };

  return (
    <div class="panel">
      <PanelHeader title="Settings" subtitle="Workspace configuration" />
      <div class="panel-scroll">
        {/* Auto-Remediation */}
        <div class="settings-section">
          <div class="settings-section-title">Auto-Remediation</div>
          <div class="settings-row">
            <span>Enable automatic fixes</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={autoRemediation()}
                onChange={toggleAutoRemediation}
                disabled={autoRemLoading()}
              />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-hint">
            When enabled, high-confidence fixes will be applied automatically.
          </div>
        </div>

        {/* Intelligence */}
        <div class="settings-section">
          <div class="settings-section-title">Intelligence</div>
          <div class="settings-row">
            <span>Learning status</span>
            <StatusBadge status={learningStatus()?.status || 'active'} />
          </div>
          <div class="settings-row">
            <span>Known patterns</span>
            <span style={{ 'font-family': 'var(--mono)', 'font-size': '12px' }}>{patternCount()}</span>
          </div>
        </div>

        {/* Refresh Interval */}
        <div class="settings-section">
          <div class="settings-section-title">Refresh Interval</div>
          <div class="settings-row">
            <span>Auto-refresh every</span>
            <select
              value={refreshInterval()}
              onChange={(e) => handleRefreshChange(e.currentTarget.value)}
              style={{
                padding: '4px 8px',
                'border-radius': 'var(--r6)',
                border: '1px solid var(--b1)',
                background: 'var(--s2)',
                'font-family': 'var(--font)',
                'font-size': '12px',
              }}
            >
              <option value="10">10 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div class="settings-section">
          <div class="settings-section-title">Keyboard Shortcuts</div>
          <div class="settings-shortcut"><kbd>J</kbd> / <kbd>↓</kbd> — Next incident</div>
          <div class="settings-shortcut"><kbd>K</kbd> / <kbd>↑</kbd> — Previous incident</div>
          <div class="settings-shortcut"><kbd>Enter</kbd> — Select incident</div>
          <div class="settings-shortcut"><kbd>Escape</kbd> — Close workspace</div>
        </div>

        {/* About */}
        <div class="settings-section">
          <div class="settings-section-title">About</div>
          <div class="settings-row">
            <span>Version</span>
            <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t3)' }}>{appVersion()}</span>
          </div>
          <div class="settings-row">
            <span>Active incidents</span>
            <span style={{ 'font-family': 'var(--mono)', 'font-size': '12px' }}>{props.incidents?.length ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
