/**
 * HomeScreen — Cluster overview matching kubegraf-final-white.html
 */

import { Component, For, Show, createMemo, createSignal, onMount, createEffect } from 'solid-js';
import { Incident, api } from '../../services/api';

interface HomeScreenProps {
  incidents: Incident[];
  onSelectIncident: (index: number) => void;
  onGoToIncident: () => void;
}

function drawRing(canvas: HTMLCanvasElement | undefined, score: number) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 100 * dpr;
  canvas.height = 100 * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const cx = 50, cy = 50, r = 40, w = 9;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (score / 100) * Math.PI * 2;
  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#E8E8ED';
  ctx.lineWidth = w;
  ctx.stroke();
  // Score arc
  if (score > 0) {
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    if (score < 40) {
      grad.addColorStop(0, '#DC2626');
      grad.addColorStop(1, '#EF4444');
    } else if (score < 70) {
      grad.addColorStop(0, '#D97706');
      grad.addColorStop(1, '#F59E0B');
    } else {
      grad.addColorStop(0, '#059669');
      grad.addColorStop(1, '#10B981');
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

const HomeScreen: Component<HomeScreenProps> = (props) => {
  let ringRef: HTMLCanvasElement | undefined;
  const [clusterName, setClusterName] = createSignal('…');
  const [podCount, setPodCount] = createSignal<number | null>(null);
  const [nodeCount, setNodeCount] = createSignal<number | null>(null);
  const [cpuUsage, setCpuUsage] = createSignal<number | null>(null);

  const healthScore = createMemo(() => {
    const total = props.incidents.length;
    if (total === 0) return 100;
    const crit = props.incidents.filter(i => i.severity === 'critical').length;
    const high = props.incidents.filter(i => i.severity === 'high').length;
    // Percentage-based formula: crit incidents hurt more
    const critPct = crit / total;
    const highPct = high / total;
    const score = 100 - critPct * 60 - highPct * 25;
    return Math.max(5, Math.round(score));
  });

  const scoreColor = createMemo(() => {
    const s = healthScore();
    if (s < 40) return 'var(--crit)';
    if (s < 70) return 'var(--warn)';
    return 'var(--ok)';
  });

  const sloData = createMemo(() => {
    const critCount = props.incidents.filter(i => i.severity === 'critical').length;
    const total = props.incidents.length;
    const errorRate = total > 0 ? Math.min(100, (critCount / total) * 100) : 0;
    const availability = Math.max(94, 100 - errorRate * 0.5);
    const latency = Math.min(99.5, 100 - critCount * 0.5);
    const errorSlo = Math.max(99, 100 - errorRate * 0.1);
    return [
      { name: 'Availability SLO', pct: availability, val: availability.toFixed(1) + '%', target: '99.9%', ok: errorRate < 5 },
      { name: 'Latency p99 SLO', pct: latency, val: latency.toFixed(1) + '%', target: '99.5%', ok: critCount < 2 },
      { name: 'Error Rate SLO', pct: errorSlo, val: errorSlo.toFixed(1) + '%', target: '99.5%', ok: errorRate < 0.5 },
    ];
  });

  onMount(async () => {
    drawRing(ringRef, healthScore());
    // /api/metrics returns flat: { clusterName, cpu, memory, nodes, pods, ... }
    try {
      const m: any = await api.getMetrics();
      if (m?.clusterName) setClusterName(m.clusterName);
      if (m?.pods != null) setPodCount(typeof m.pods === 'object' ? (m.pods.running ?? m.pods.total) : m.pods);
      if (m?.nodes != null) setNodeCount(typeof m.nodes === 'object' ? (m.nodes.ready ?? m.nodes.total) : m.nodes);
      if (m?.cpu != null) setCpuUsage(typeof m.cpu === 'object' ? (m.cpu.percentage ?? m.cpu.usage) : m.cpu);
    } catch { /* use defaults */ }
  });

  createEffect(() => {
    drawRing(ringRef, healthScore());
  });

  const critCount = createMemo(() => props.incidents.filter(i => i.severity === 'critical').length);
  const warnCount = createMemo(() => props.incidents.filter(i => i.severity === 'high').length);
  const okCount = createMemo(() => props.incidents.filter(i => !['critical', 'high'].includes(i.severity || '')).length);

  return (
    <div class="home-body">
      {/* Hero grid */}
      <div class="hero-grid">
        {/* Health ring */}
        <div class="hero-health">
          <div class="score-ring-wrap">
            <canvas ref={ringRef} style={{ width: '100px', height: '100px' }} />
            <div class="score-val">
              <div class="score-num" style={{ color: scoreColor() }}>{healthScore()}</div>
              <div class="score-lbl">Health</div>
            </div>
          </div>
          <div class="hero-stats">
            <div class="hero-title">{clusterName()}</div>
            <div class="hero-sub">
              {props.incidents.length} active incident{props.incidents.length !== 1 ? 's' : ''} ·{' '}
              {podCount() != null ? podCount() : '—'} pods running
            </div>
            <div class="health-chips">
              <div class="hchip crit"><div class="hchip-dot" />{critCount()} Crit</div>
              <div class="hchip warn"><div class="hchip-dot" />{warnCount()} Warn</div>
              <div class="hchip ok"><div class="hchip-dot" />{okCount()} OK</div>
            </div>
          </div>
        </div>

        {/* SLO burn rates */}
        <div class="hero-slos">
          <div style={{ 'font-size': '12px', 'font-weight': '700', color: 'var(--t1)', 'margin-bottom': '12px' }}>SLO Burn Rate</div>
          <For each={sloData()}>{(slo, idx) => (
            <div class="slo-item" style={{ 'margin-top': idx() > 0 ? '10px' : '0' }}>
              <div class="slo-top">
                <span class="slo-name">{slo.name}</span>
                <span class="slo-val" style={{ color: slo.ok ? 'var(--ok)' : slo.pct < 97 ? 'var(--crit)' : 'var(--warn)' }}>
                  {slo.val} <span style={{ 'font-size': '9px', color: 'var(--t5)' }}>/ {slo.target}</span>
                </span>
              </div>
              <div class="slo-track">
                <div class="slo-fill" style={{
                  width: `${slo.pct}%`,
                  background: slo.ok ? 'var(--ok)' : slo.pct < 97 ? 'var(--crit)' : 'var(--warn)',
                }} />
              </div>
            </div>
          )}</For>
        </div>
      </div>

      {/* Active incidents */}
      <div>
        <div class="section-header">
          <div class="section-title">
            Active Incidents
            <Show when={props.incidents.length > 0}>
              <span class="section-badge">{props.incidents.length} open</span>
            </Show>
          </div>
          <button class="btn-sm" onClick={props.onGoToIncident}>View all</button>
        </div>
        <For each={props.incidents.slice(0, 3)}>{(inc, i) => (
          <div
            class={`incident-card${inc.severity === 'critical' ? ' active-inc' : ''}`}
            onClick={() => { props.onSelectIncident(i()); props.onGoToIncident(); }}
          >
            <div class="ic-top">
              <div class={`sev-pill ${inc.severity === 'critical' ? 'sev1' : inc.severity === 'high' ? 'sev2' : 'sev3'}`}>
                <Show when={inc.severity === 'critical'}>
                  <div class="sev-anim" style={{ background: '#fff' }} />
                </Show>
                {inc.severity === 'critical' ? 'SEV-1' : inc.severity === 'high' ? 'SEV-2' : 'SEV-3'}
              </div>
              <span class="ic-title">{inc.title || (inc.resource?.name + ' ' + (inc.pattern || ''))}</span>
              <span class="ic-time">{inc.firstSeen ? new Date(inc.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            </div>
            <div class="ic-meta">
              <Show when={inc.pattern}>
                <span class={`ic-tag${inc.severity === 'critical' ? ' crit' : ''}`}>{inc.pattern?.replace(/_/g, '')}</span>
              </Show>
              <span class="ic-tag">{inc.resource?.namespace || 'default'}</span>
              <Show when={inc.resource?.name}>
                <span class="ic-tag">{inc.resource?.name}</span>
              </Show>
              <Show when={(inc.occurrences || 0) > 1}>
                <span class="ic-tag">{inc.occurrences} restarts</span>
              </Show>
              <span style={{ 'margin-left': 'auto', 'font-size': '10.5px', color: 'var(--brand)', 'font-weight': '600', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); props.onSelectIncident(i()); props.onGoToIncident(); }}>
                Investigate →
              </span>
            </div>
          </div>
        )}</For>
        <Show when={props.incidents.length === 0}>
          <div style={{ color: 'var(--t4)', 'font-size': '12px', padding: '12px 0' }}>
            No active incidents — cluster is healthy.
          </div>
        </Show>
      </div>

      {/* All Clusters */}
      <div>
        <div class="section-header">
          <div class="section-title">All Clusters</div>
          <button class="btn-sm">+ Add cluster</button>
        </div>
        <div class="cluster-grid">
          {/* Primary cluster (live data) */}
          <div class={`cluster-card${props.incidents.length > 0 ? ' has-issues' : ''}`}>
            <Show when={props.incidents.length > 0}>
              <div class="cc-shimmer" />
            </Show>
            <div class="cc-top">
              <div class="cc-dot" style={{
                background: props.incidents.length > 0 ? 'var(--crit)' : 'var(--ok)',
                animation: props.incidents.length > 0 ? 'crit-pulse 1.8s ease-in-out infinite' : 'none',
              }} />
              <span class="cc-name">{clusterName()}</span>
            </div>
            <div class="cc-stats">
              <div class="cc-stat">
                <div class="cc-stat-val" style={{ color: props.incidents.length > 0 ? 'var(--crit)' : 'var(--ok)' }}>
                  {props.incidents.length}
                </div>
                <div class="cc-stat-lbl">Incidents</div>
              </div>
              <div class="cc-stat">
                <div class="cc-stat-val">{podCount() ?? '—'}</div>
                <div class="cc-stat-lbl">Pods</div>
              </div>
              <div class="cc-stat">
                <div class="cc-stat-val">{nodeCount() ?? '—'}</div>
                <div class="cc-stat-lbl">Nodes</div>
              </div>
              <div class="cc-stat">
                <div class="cc-stat-val" style={{ color: (cpuUsage() || 0) > 70 ? 'var(--warn)' : 'var(--t1)' }}>
                  {cpuUsage() != null ? Math.round(cpuUsage()!) + '%' : '—'}
                </div>
                <div class="cc-stat-lbl">CPU</div>
              </div>
            </div>
            <div class="cc-bar">
              <div class="cc-bar-fill" style={{
                width: `${Math.min(100, cpuUsage() || 0)}%`,
                background: (cpuUsage() || 0) > 70 ? 'var(--warn)' : 'var(--ok)',
              }} />
            </div>
          </div>

          {/* Staging cluster (static) */}
          <div class="cluster-card">
            <div class="cc-top">
              <div class="cc-dot" style={{ background: 'var(--ok)' }} />
              <span class="cc-name">staging-cluster</span>
              <span class="cc-env staging">STAGING</span>
            </div>
            <div class="cc-stats">
              <div class="cc-stat"><div class="cc-stat-val" style={{ color: 'var(--ok)' }}>0</div><div class="cc-stat-lbl">Incidents</div></div>
              <div class="cc-stat"><div class="cc-stat-val">12</div><div class="cc-stat-lbl">Services</div></div>
              <div class="cc-stat"><div class="cc-stat-val">84</div><div class="cc-stat-lbl">Pods</div></div>
              <div class="cc-stat"><div class="cc-stat-val" style={{ color: 'var(--ok)' }}>41%</div><div class="cc-stat-lbl">CPU</div></div>
            </div>
            <div class="cc-bar"><div class="cc-bar-fill" style={{ width: '41%', background: 'var(--ok)' }} /></div>
          </div>

          {/* Dev cluster (static) */}
          <div class="cluster-card">
            <div class="cc-top">
              <div class="cc-dot" style={{ background: 'var(--ok)' }} />
              <span class="cc-name">dev-cluster</span>
              <span class="cc-env dev">DEV</span>
            </div>
            <div class="cc-stats">
              <div class="cc-stat"><div class="cc-stat-val" style={{ color: 'var(--ok)' }}>0</div><div class="cc-stat-lbl">Incidents</div></div>
              <div class="cc-stat"><div class="cc-stat-val">8</div><div class="cc-stat-lbl">Services</div></div>
              <div class="cc-stat"><div class="cc-stat-val">36</div><div class="cc-stat-lbl">Pods</div></div>
              <div class="cc-stat"><div class="cc-stat-val" style={{ color: 'var(--ok)' }}>28%</div><div class="cc-stat-lbl">CPU</div></div>
            </div>
            <div class="cc-bar"><div class="cc-bar-fill" style={{ width: '28%', background: 'var(--ok)' }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
