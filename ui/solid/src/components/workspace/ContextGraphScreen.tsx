/**
 * ContextGraphScreen — Exact match to kubegraf-final-white.html prototype
 * 9 nodes with rx/ry relative positioning, bezier edges, edge labels, light legend
 */

import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';

interface GraphNode {
  id: string;
  lbl: string;
  sub: string;
  s: 'crit' | 'warn' | 'ok';
  icon: string;
  rx: number;
  ry: number;
  r: number;
}

interface GraphEdge {
  f: string;
  t: string;
  s: 'crit' | 'warn' | 'ok';
  lbl: string;
}

interface NodeInfo {
  lbl: string;
  sub: string;
  kind: string;
  ns: string;
  rep: string;
  rst: string;
  sColor: string;
}

const GNODES: GraphNode[] = [
  { id: 'checkout', lbl: 'checkout-api', sub: 'OOMKilled 0/3', s: 'crit', icon: 'C', rx: .12, ry: .50, r: 28 },
  { id: 'payment',  lbl: 'payment-proc', sub: 'CrashLoop',     s: 'crit', icon: 'P', rx: .32, ry: .20, r: 21 },
  { id: 'hpa',      lbl: 'hpa-ctrl',     sub: 'maxReplicas',   s: 'crit', icon: 'H', rx: .32, ry: .80, r: 17 },
  { id: 'apigw',    lbl: 'api-gateway',  sub: '503 errors',    s: 'warn', icon: 'G', rx: .57, ry: .50, r: 21 },
  { id: 'auth',     lbl: 'auth-svc',     sub: 'Degraded',      s: 'warn', icon: 'A', rx: .78, ry: .22, r: 17 },
  { id: 'order',    lbl: 'order-svc',    sub: 'Degraded',      s: 'warn', icon: 'O', rx: .78, ry: .50, r: 17 },
  { id: 'stripe',   lbl: 'stripe-gw',    sub: 'Degraded',      s: 'warn', icon: '$', rx: .78, ry: .78, r: 17 },
  { id: 'prom',     lbl: 'prometheus',   sub: 'Healthy',       s: 'ok',   icon: 'P', rx: .32, ry: .96, r: 13 },
  { id: 'ingress',  lbl: 'ingress',      sub: 'Healthy',       s: 'ok',   icon: 'I', rx: .57, ry: .09, r: 14 },
];

const GEDGES: GraphEdge[] = [
  { f: 'checkout', t: 'payment', s: 'crit', lbl: 'causes' },
  { f: 'checkout', t: 'hpa',     s: 'crit', lbl: 'triggers' },
  { f: 'payment',  t: 'apigw',   s: 'crit', lbl: 'cascades' },
  { f: 'checkout', t: 'prom',    s: 'ok',   lbl: 'scraped' },
  { f: 'apigw',    t: 'auth',    s: 'warn', lbl: 'routes' },
  { f: 'apigw',    t: 'order',   s: 'warn', lbl: 'routes' },
  { f: 'apigw',    t: 'stripe',  s: 'warn', lbl: 'routes' },
  { f: 'ingress',  t: 'apigw',   s: 'warn', lbl: 'fwds' },
];

const GS = {
  crit: { stroke: '#DC2626', fill: 'rgba(220,38,38,.10)', glow: 'rgba(220,38,38,.20)', ico: '#DC2626' },
  warn: { stroke: '#D97706', fill: 'rgba(217,119,6,.10)', glow: 'rgba(217,119,6,.18)', ico: '#D97706' },
  ok:   { stroke: '#059669', fill: 'rgba(5,150,105,.10)', glow: 'rgba(5,150,105,.15)', ico: '#059669' },
};

const ES = {
  crit: { c: '#DC2626', d: [8, 4] as number[], w: 2 },
  warn: { c: '#D97706', d: [6, 4] as number[], w: 1.5 },
  ok:   { c: '#059669', d: [4, 5] as number[], w: 1.2 },
};

const DPR = () => window.devicePixelRatio || 1;

function nodePos(n: GraphNode, W: number, H: number) {
  return { x: n.rx * W, y: n.ry * H };
}

const ContextGraphScreen: Component = () => {
  let canvasRef: HTMLCanvasElement | undefined;
  let wrapRef: HTMLDivElement | undefined;
  let animId: number | undefined;
  const [nodeInfo, setNodeInfo] = createSignal<NodeInfo | null>(null);

  function initGraph() {
    const canvas = canvasRef;
    const wrap = wrapRef;
    if (!canvas || !wrap) return;
    const W = wrap.offsetWidth;
    const H = wrap.offsetHeight;
    const dpr = DPR();
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    if (animId !== undefined) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(drawGraph);
  }

  function drawGraph(ts: number) {
    const canvas = canvasRef;
    if (!canvas) return;
    const dpr = DPR();
    const T = ts / 1000;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Background dot grid
    ctx.fillStyle = 'rgba(0,0,0,.04)';
    for (let gx = 0; gx < W; gx += 30) {
      for (let gy = 0; gy < H; gy += 30) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw edges
    GEDGES.forEach(e => {
      const fn = GNODES.find(n => n.id === e.f);
      const tn = GNODES.find(n => n.id === e.t);
      if (!fn || !tn) return;
      const fp = nodePos(fn, W, H);
      const tp = nodePos(tn, W, H);
      const s = ES[e.s];
      const dx = tp.x - fp.x, dy = tp.y - fp.y;
      const cx1 = fp.x + dx * .4 + dy * .1, cy1 = fp.y + dy * .4 - dx * .1;
      const cx2 = tp.x - dx * .4 + dy * .1, cy2 = tp.y - dy * .4 - dx * .1;

      ctx.save();
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w;
      ctx.setLineDash(s.d);
      ctx.globalAlpha = .55;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, tp.x, tp.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead at target node edge
      const len = Math.hypot(tp.x - fp.x, tp.y - fp.y);
      if (len > 1) {
        const ux = (tp.x - fp.x) / len, uy = (tp.y - fp.y) / len;
        const ex = tp.x - ux * tn.r, ey = tp.y - uy * tn.r;
        const ang = Math.atan2(ey - fp.y, ex - fp.x);
        ctx.fillStyle = s.c;
        ctx.globalAlpha = .55;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8 * Math.cos(ang - .4), ey - 8 * Math.sin(ang - .4));
        ctx.lineTo(ex - 8 * Math.cos(ang + .4), ey - 8 * Math.sin(ang + .4));
        ctx.closePath();
        ctx.fill();
      }

      // Edge label pill
      const mx = (fp.x + tp.x) / 2 + dy * .06;
      const my = (fp.y + tp.y) / 2 - dx * .06;
      ctx.globalAlpha = 1;
      ctx.font = '500 8.5px Geist,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(e.lbl).width;
      ctx.fillStyle = 'rgba(244,244,246,.92)';
      ctx.shadowColor = 'rgba(0,0,0,.12)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.rect(mx - tw / 2 - 5, my - 5.5, tw + 10, 11);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = s.c + '30';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = s.c;
      ctx.globalAlpha = .85;
      ctx.fillText(e.lbl, mx, my);
      ctx.restore();
    });

    // Draw nodes
    GNODES.forEach((n, i) => {
      const { x, y } = nodePos(n, W, H);
      const s = GS[n.s];

      // Pulse for critical nodes
      if (n.s === 'crit') {
        const ph = ((T * .65 + i * .3) % 1);
        const gr = ctx.createRadialGradient(x, y, n.r, x, y, n.r + ph * n.r * 1.2);
        gr.addColorStop(0, 'rgba(248,113,113,' + (1 - ph) * .2 + ')');
        gr.addColorStop(1, 'rgba(248,113,113,0)');
        ctx.beginPath();
        ctx.arc(x, y, n.r + ph * n.r * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      }

      // Node body with glow
      ctx.save();
      ctx.shadowColor = s.glow;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(x, y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = s.fill;
      ctx.fill();
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = n.s === 'crit' ? 2.5 : 1.8;
      ctx.stroke();
      ctx.restore();

      // Icon letter
      ctx.font = 'bold ' + Math.round(n.r * .72) + 'px Geist,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = s.ico;
      ctx.fillText(n.icon, x, y);

      // Name label below node
      ctx.font = '600 9.5px Geist,sans-serif';
      ctx.fillStyle = 'rgba(24,24,28,.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.lbl, x, y + n.r + 4);

      // Sub-label (status)
      ctx.font = '500 8.5px Geist,sans-serif';
      ctx.fillStyle = s.ico;
      ctx.fillText(n.sub, x, y + n.r + 15);
    });

    animId = requestAnimationFrame(drawGraph);
  }

  const handleClick = (e: MouseEvent) => {
    const canvas = canvasRef;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dpr = DPR();
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    let hit: GraphNode | null = null;
    GNODES.forEach(n => {
      const p = nodePos(n, W, H);
      if (Math.hypot(mx - p.x, my - p.y) < n.r + 5) hit = n;
    });
    if (hit) {
      const h = hit as GraphNode;
      setNodeInfo({
        lbl: h.lbl,
        sub: h.sub,
        kind: 'Deployment',
        ns: h.rx < .5 ? 'payments-ns' : 'prod-ns',
        rep: h.s === 'crit' ? '0/3' : h.s === 'warn' ? '2/3' : '1/1',
        rst: h.s === 'crit' ? '14' : h.s === 'warn' ? '2' : '0',
        sColor: GS[h.s].ico,
      });
    } else {
      setNodeInfo(null);
    }
  };

  onMount(() => {
    setTimeout(initGraph, 80);
    window.addEventListener('resize', initGraph);
  });

  onCleanup(() => {
    if (animId !== undefined) cancelAnimationFrame(animId);
    window.removeEventListener('resize', initGraph);
  });

  return (
    <div class="graph-screen">
      {/* Toolbar */}
      <div class="graph-toolbar">
        <span style={{ 'font-size': '12.5px', 'font-weight': '700', color: 'var(--t1)' }}>
          Blast Radius — Context Graph
        </span>
        <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': '6px' }}>
          9 nodes · 8 edges
        </span>
        <div style={{ flex: '1' }} />
        <button class="btn ghost" style={{ 'font-size': '11px' }}>Simulate Cascade</button>
        <button class="btn ghost" style={{ 'font-size': '11px' }}>Export</button>
      </div>

      {/* Canvas wrap */}
      <div class="graph-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
          onClick={handleClick}
        />

        {/* Light legend — matching prototype exactly */}
        <div class="graph-legend">
          <div class="graph-legend-item">
            <div style={{ width: '8px', height: '8px', 'border-radius': '50%', border: '2px solid var(--crit)', background: 'var(--critBg)', 'flex-shrink': '0' }} />
            Failing
          </div>
          <div class="graph-legend-item">
            <div style={{ width: '8px', height: '8px', 'border-radius': '50%', border: '2px solid var(--warn)', background: 'var(--warnBg)', 'flex-shrink': '0' }} />
            Degraded
          </div>
          <div class="graph-legend-item">
            <div style={{ width: '8px', height: '8px', 'border-radius': '50%', border: '2px solid var(--ok)', background: 'var(--okBg)', 'flex-shrink': '0' }} />
            Healthy
          </div>
          <div style={{ width: '1px', height: '12px', background: 'var(--b2)' }} />
          <div class="graph-legend-item">
            <div style={{ width: '16px', height: '0', 'border-top': '2px solid var(--crit)' }} />
            Causes failure
          </div>
          <div class="graph-legend-item">
            <div style={{ width: '16px', height: '0', 'border-top': '2px dashed var(--warn)' }} />
            Cascades
          </div>
        </div>

        {/* Node info popup — light background */}
        <Show when={nodeInfo()}>
          {(info) => (
            <div class="graph-info show">
              <div class="gi-title">{info().lbl}</div>
              <div class="gi-row">
                <span class="gi-key">Status</span>
                <span class="gi-val" style={{ color: info().sColor }}>{info().sub}</span>
              </div>
              <div class="gi-row">
                <span class="gi-key">Kind</span>
                <span class="gi-val">{info().kind}</span>
              </div>
              <div class="gi-row">
                <span class="gi-key">Namespace</span>
                <span class="gi-val">{info().ns}</span>
              </div>
              <div class="gi-row">
                <span class="gi-key">Replicas</span>
                <span class="gi-val">{info().rep}</span>
              </div>
              <div class="gi-row">
                <span class="gi-key">Restarts</span>
                <span class="gi-val">{info().rst}</span>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
};

export default ContextGraphScreen;
