/**
 * WorkspacePanels — Rail button content panels for the Intelligence Workspace
 *
 * Each panel renders in grid-column 3 when its rail button is active.
 * Panels: Workloads (WRK), Metrics (MET), Nodes (NOD), Topology (MAP),
 *         GitOps (GIT), Cost (CST), Settings (SET)
 */

import { Component, createSignal, createEffect, onMount, onCleanup, Show, For, createMemo } from 'solid-js';
import { Incident, api, fetchAPI } from '../../services/api';
import {
  connectMetrics,
  disconnectMetrics,
  latestPoint,
  getCpuSparkline,
  getMemSparkline,
} from '../../stores/metricsStore';

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
    // Give WS a moment to connect
    setTimeout(() => setLoading(false), 1500);
    // Fetch pods for top consumers
    api.getPods().then(p => setPods(Array.isArray(p) ? p : [])).catch(() => {});
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
   GitOpsPanel (GIT)
   ============================================ */
export const GitOpsPanel: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [helm, setHelm] = createSignal<any[]>([]);
  const [argo, setArgo] = createSignal<any[]>([]);
  const [flux, setFlux] = createSignal<any[]>([]);
  const [helmErr, setHelmErr] = createSignal('');
  const [argoErr, setArgoErr] = createSignal('');
  const [fluxErr, setFluxErr] = createSignal('');
  const [openSections, setOpenSections] = createSignal<Record<string, boolean>>({ helm: true, argo: true, flux: true });

  const fetchAll = async () => {
    setLoading(true);
    const [h, a, f] = await Promise.allSettled([
      api.getHelmReleases(),
      api.getArgoCDApps(),
      api.getFluxResources(),
    ]);
    if (h.status === 'fulfilled') { setHelm(Array.isArray(h.value) ? h.value : []); setHelmErr(''); }
    else setHelmErr('Not installed');
    if (a.status === 'fulfilled') { setArgo(Array.isArray(a.value) ? a.value : []); setArgoErr(''); }
    else setArgoErr('Not installed');
    if (f.status === 'fulfilled') { setFlux(Array.isArray(f.value) ? f.value : []); setFluxErr(''); }
    else setFluxErr('Not installed');
    setLoading(false);
  };

  onMount(fetchAll);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const GitOpsSection: Component<{
    title: string;
    sectionKey: string;
    items: any[];
    errMsg: string;
  }> = (sp) => (
    <div class="panel-section">
      <div class="panel-section-header" onClick={() => toggleSection(sp.sectionKey)}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: openSections()[sp.sectionKey] ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
          <path d="M3 1l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" />
        </svg>
        <span class="panel-section-title">{sp.title}</span>
        <span class="ns-count">{sp.errMsg ? '—' : sp.items.length}</span>
      </div>
      <Show when={openSections()[sp.sectionKey]}>
        <Show when={!sp.errMsg} fallback={
          <div style={{ padding: '8px 16px', 'font-size': '11.5px', color: 'var(--t4)' }}>{sp.errMsg}</div>
        }>
          <Show when={sp.items.length > 0} fallback={
            <div style={{ padding: '8px 16px', 'font-size': '11.5px', color: 'var(--t4)' }}>No resources found</div>
          }>
            <table class="panel-table">
              <thead>
                <tr><th>Name</th><th>Namespace</th><th>Status</th><th>Version</th></tr>
              </thead>
              <tbody>
                <For each={sp.items}>
                  {(item) => (
                    <tr>
                      <td class="panel-cell-name">{item.name || item.metadata?.name || '—'}</td>
                      <td>{item.namespace || item.metadata?.namespace || '—'}</td>
                      <td><StatusBadge status={item.status || item.health?.status || item.conditions?.[0]?.type || 'Unknown'} /></td>
                      <td>{item.version || item.chart?.version || item.spec?.source?.targetRevision || '—'}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </Show>
      </Show>
    </div>
  );

  return (
    <div class="panel">
      <PanelHeader title="GitOps" subtitle="Helm, Argo CD & Flux" onRefresh={fetchAll} loading={loading()} />
      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <GitOpsSection title="Helm Releases" sectionKey="helm" items={helm()} errMsg={helmErr()} />
          <GitOpsSection title="Argo CD Apps" sectionKey="argo" items={argo()} errMsg={argoErr()} />
          <GitOpsSection title="Flux Resources" sectionKey="flux" items={flux()} errMsg={fluxErr()} />
        </Show>
      </div>
    </div>
  );
};

/* ============================================
   CostPanel (CST)
   ============================================ */
export const CostPanel: Component = () => {
  const [loading, setLoading] = createSignal(true);
  const [costData, setCostData] = createSignal<any>(null);
  const [error, setError] = createSignal('');

  const fetchCost = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getClusterCost();
      setCostData(data);
    } catch (e: any) {
      setError('Cost analysis not available');
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchCost);

  return (
    <div class="panel">
      <PanelHeader title="Cost Analysis" subtitle="Cluster cost breakdown" onRefresh={fetchCost} loading={loading()} />
      <div class="panel-scroll">
        <Show when={!loading()} fallback={<PanelLoading />}>
          <Show when={!error()} fallback={<PanelEmpty message={error()} />}>
            <Show when={costData()}>
              {(data) => {
                const d = data();
                const total = d.totalCost ?? d.total ?? 0;
                const namespaces = d.namespaces || d.breakdown || [];
                return (
                  <>
                    <div class="panel-summary-grid">
                      <PanelCard label="Total Cost" value={`$${Number(total).toFixed(2)}`} color="teal" />
                      <PanelCard label="Namespaces" value={namespaces.length} color="blue" />
                      <PanelCard label="Top NS" value={namespaces[0]?.name || namespaces[0]?.namespace || '—'} color="amber" />
                    </div>
                    <Show when={namespaces.length > 0}>
                      <table class="panel-table">
                        <thead>
                          <tr><th>Namespace</th><th>CPU Cost</th><th>Mem Cost</th><th>Total</th><th>% Cluster</th></tr>
                        </thead>
                        <tbody>
                          <For each={namespaces}>
                            {(ns: any) => {
                              const nsCost = ns.totalCost ?? ns.total ?? 0;
                              const pct = total > 0 ? ((nsCost / total) * 100).toFixed(1) : '0';
                              return (
                                <tr>
                                  <td class="panel-cell-name">{ns.name || ns.namespace}</td>
                                  <td>${Number(ns.cpuCost ?? 0).toFixed(2)}</td>
                                  <td>${Number(ns.memoryCost ?? ns.memCost ?? 0).toFixed(2)}</td>
                                  <td>${Number(nsCost).toFixed(2)}</td>
                                  <td>{pct}%</td>
                                </tr>
                              );
                            }}
                          </For>
                        </tbody>
                      </table>
                    </Show>
                  </>
                );
              }}
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
            <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t3)' }}>1.0.0</span>
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
