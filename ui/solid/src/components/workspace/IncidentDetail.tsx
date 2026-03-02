/**
 * IncidentDetail — Exact match to kubegraf-final-white.html prototype
 */

import { Component, Show, For, createSignal, createMemo, createEffect, untrack, onMount, onCleanup } from 'solid-js';
import { Incident, api } from '../../services/api';
import { currentContext } from '../../stores/cluster';
import { addNotification } from '../../stores/ui';
import { RCAReportGenerator } from './rcaReportGenerator';

interface IncidentDetailProps {
  incident: Incident | null;
  allIncidents?: Incident[];
  isLoading?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onResolve?: () => void;
  onSelectRelated?: (id: string) => void;
  onClose?: () => void;
  canNavigatePrevious?: boolean;
  canNavigateNext?: boolean;
  currentIndex?: number;
  totalIncidents?: number;
}

const DPR = () => window.devicePixelRatio || 1;

// Deterministic pseudo-random sequence seeded by a string — ensures charts look
// identical across renders/resizes instead of flickering with Math.random().
function deterministicSeq(seed: string, count: number, scale: number): number[] {
  const result: number[] = [];
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (((h << 5) + h) ^ seed.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) >>> 0; // LCG
    result.push((h / 0xFFFFFFFF - 0.5) * scale);
  }
  return result;
}

function drawSpark(canvas: HTMLCanvasElement | null, data: number[], color: string) {
  if (!canvas) return;
  const dpr = DPR();
  const W = canvas.parentElement?.offsetWidth || 180;
  const H = 26;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => ({ x: 2 + i / (data.length - 1) * (W - 4), y: H - 2 - (v - mn) / rng * (H - 4) }));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, color + '28');
  g.addColorStop(1, color + '04');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, H);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const lp = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(lp.x, lp.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Build sparkline data arrays from real incident signals rather than hardcoded values.
// Each sparkline is a 7-point trend ending at the current known value.
function buildSparkData(inc: any) {
  const occ     = inc?.occurrences || 1;
  const related = (inc?.relatedResources as any[])?.length || 0;
  const firstMs = inc?.firstSeen ? new Date(inc.firstSeen).getTime() : Date.now();
  const elMin   = Math.max(0.5, (Date.now() - firstMs) / 60000);
  const syms: any[] = (inc?.symptoms as any[]) || [];
  const errSym  = syms.find((s: any) =>
    ['NO_ENDPOINTS', 'REPLICA_UNAVAILABLE', 'UPSTREAM_FAILURE', 'HTTP_ERROR_RATE'].includes(s.type));
  const errorRate = errSym?.value != null ? Math.min(100, Math.round(errSym.value)) : null;

  // sp1: restart/occurrence trend — quadratic rise to `occ`
  const sp1 = Array.from({ length: 7 }, (_, i) => Math.round(occ * Math.pow(i / 6, 2)));
  sp1[6] = occ;

  // sp2: related services count — step up from 0
  const sp2 = Array.from({ length: 7 }, (_, i) => {
    if (related === 0) return 0;
    return i < 2 ? 0 : +(related * Math.min(1, (i - 1) / 4)).toFixed(1);
  });
  sp2[6] = related;

  // sp3: error rate trend — rises to errorRate if we have signal, else flat 0
  const sp3 = errorRate != null
    ? Array.from({ length: 7 }, (_, i) => Math.round(errorRate * Math.pow(i / 6, 1.5)))
    : [0, 0, 0, 0, 0, 0, 0];
  if (errorRate != null) sp3[6] = errorRate;

  // sp4: elapsed time in minutes — monotonically increasing
  const sp4 = Array.from({ length: 7 }, (_, i) => +(elMin * (i / 6)).toFixed(1));
  sp4[6] = +elMin.toFixed(1);

  return { sp1, sp2, sp3, sp4 };
}

function drawRpRing(canvas: HTMLCanvasElement | null, score: number) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 110 * dpr;
  canvas.height = 110 * dpr;
  canvas.style.width = '110px';
  canvas.style.height = '110px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const cx = 55, cy = 55, r = 40, lw = 8;
  const start = -Math.PI / 2;
  const end = start + (score / 100) * Math.PI * 2;
  const color = score < 30 ? '#F87171' : score < 60 ? '#FBBF24' : '#34D399';
  const trackColor = score < 30 ? 'rgba(248,113,113,.15)' : score < 60 ? 'rgba(251,191,36,.15)' : 'rgba(52,211,153,.15)';
  // track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = trackColor;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
  // score arc
  if (score > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

interface TLEvent { t: number; lbl: string; col: string; root: boolean; err: boolean; }

/** A graph engine event from /api/graph/analyze */
interface GraphEvent {
  node_id: string;
  reason: string;
  message: string;
  timestamp: string;
  count: number;
  event_type: string;
}

interface CausalChain {
  root_cause?: { kind: string; name: string; namespace?: string };
  evidence: GraphEvent[];
  confidence: number;
  pattern_matched?: string;
}

/** Convert graph engine evidence events to timeline events */
function graphEventsToTimeline(chain: CausalChain): TLEvent[] {
  const evs = chain.evidence || [];
  if (evs.length === 0) return [];

  const sorted = [...evs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const first = new Date(sorted[0].timestamp).getTime();
  const last  = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const range = Math.max(last - first, 60_000);

  const rootNodeId = chain.root_cause ? `${chain.root_cause.kind.toLowerCase()}/${chain.root_cause.namespace || ''}/${chain.root_cause.name}` : '';

  return sorted.map(ev => {
    const tPos = range > 0 ? (new Date(ev.timestamp).getTime() - first) / range : 0.5;
    const reason = ev.reason || '';
    const err    = ['BackOff', 'OOMKilling', 'Evicted', 'Failed', 'FailedMount', 'CrashLoop', 'ImagePullBackOff', 'Killing'].some(r => reason.includes(r));
    const root   = ev.node_id === rootNodeId || ev.node_id.endsWith(rootNodeId.split('/').pop() || '___');
    const col    = root ? '#7C3AED' : err ? '#DC2626' : reason.includes('Scheduled') ? '#2563EB' : '#A1A1AA';
    return { t: Math.min(0.95, Math.max(0.05, tPos * 0.9 + 0.05)), lbl: reason.slice(0, 12), col, root, err };
  });
}

function buildTimelineEvents(incident: any): TLEvent[] {
  const rawTL: any[] = (incident?.timeline) || [];
  if (rawTL.length > 0) {
    const sorted = [...rawTL].sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
    const first = new Date(sorted[0].time || Date.now()).getTime();
    const last  = new Date(sorted[sorted.length - 1].time || Date.now()).getTime();
    const range = Math.max(last - first, 60000);
    const events = sorted.map(ev => {
      const tPos = (new Date(ev.time || 0).getTime() - first) / range;
      const lbl   = (ev.event || ev.message || '').slice(0, 10);
      const s     = (ev.event || '').toLowerCase();
      const err   = s.includes('fail') || s.includes('crash') || s.includes('oom') || s.includes('error') || ev.type === 'error';
      const root  = ev.type === 'root_cause' || s.includes('root');
      const col   = root ? '#7C3AED' : err ? '#DC2626' : s.includes('deploy') ? '#7C3AED' : s.includes('scale') ? '#2563EB' : '#A1A1AA';
      return { t: Math.min(0.95, Math.max(0.05, tPos * 0.9 + 0.05)), lbl, col, root, err };
    });
    return events.length ? events : defaultTLEvents(incident);
  }
  return defaultTLEvents(incident);
}

function defaultTLEvents(incident: any): TLEvent[] {
  const pat = (incident?.pattern || '').replace(/_/g, ' ').slice(0, 10);
  const sev = incident?.severity;
  return [
    { t: 0.12, lbl: 'Stable',               col: '#A1A1AA', root: false, err: false },
    { t: 0.50, lbl: pat || 'Alert',          col: '#DC2626', root: true,  err: true  },
    { t: 0.80, lbl: sev === 'critical' ? 'SEV-1' : 'SEV-2', col: '#D97706', root: false, err: false },
  ];
}

function initTimeline(canvas: HTMLCanvasElement | null, events: TLEvent[], firstSeenMs?: number): (() => void) | undefined {
  if (!canvas || events.length === 0) return;
  const dpr = DPR();
  const W = canvas.parentElement?.offsetWidth || 600;
  const H = 88;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  let raf: number;
  function draw(ts: number) {
    const T = ts / 1000;
    ctx!.clearRect(0, 0, W, H);
    const L = 20, R = W - 20, LEN = R - L, MY = H / 2;
    const rootEvs = events.filter(e => e.root);
    const rz1 = rootEvs.length ? L + rootEvs[0].t * LEN - 8 : L + LEN * 0.25;
    const rz2 = rootEvs.length ? L + rootEvs[rootEvs.length - 1].t * LEN + 8 : L + LEN * 0.65;
    ctx!.fillStyle = 'rgba(124,58,237,.06)';
    ctx!.fillRect(rz1, 6, rz2 - rz1, H - 12);
    ctx!.save();
    ctx!.strokeStyle = 'rgba(124,58,237,.18)';
    ctx!.lineWidth = 1;
    ctx!.setLineDash([5, 4]);
    ctx!.strokeRect(rz1, 6, rz2 - rz1, H - 12);
    ctx!.setLineDash([]);
    ctx!.font = '600 8px Geist,sans-serif';
    ctx!.fillStyle = 'rgba(124,58,237,.55)';
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'top';
    ctx!.fillText('root cause', (rz1 + rz2) / 2, 9);
    ctx!.restore();
    ctx!.beginPath();
    ctx!.moveTo(L, MY);
    ctx!.lineTo(R, MY);
    ctx!.strokeStyle = 'rgba(0,0,0,.08)';
    ctx!.lineWidth = 1.5;
    ctx!.stroke();
    events.forEach((ev, i) => {
      const x = L + ev.t * LEN, ph = ((T * .7 + i * .4) % 1);
      if (ev.err) {
        const gr = ctx!.createRadialGradient(x, MY, 0, x, MY, 9 + ph * 18);
        gr.addColorStop(0, 'rgba(220,38,38,' + (1 - ph) * .15 + ')');
        gr.addColorStop(1, 'rgba(220,38,38,0)');
        ctx!.fillStyle = gr;
        ctx!.beginPath();
        ctx!.arc(x, MY, 9 + ph * 18, 0, Math.PI * 2);
        ctx!.fill();
      }
      const rr = ev.root ? 9 : ev.err ? 7 : 5;
      ctx!.beginPath();
      ctx!.arc(x, MY, rr, 0, Math.PI * 2);
      ctx!.fillStyle = ev.col;
      ctx!.fill();
      if (ev.root) { ctx!.strokeStyle = 'rgba(0,0,0,.15)'; ctx!.lineWidth = 2; ctx!.stroke(); }
      ctx!.font = '9px Geist Mono,monospace';
      ctx!.fillStyle = 'rgba(161,161,170,.9)';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'bottom';
      const rangeMs = 20 * 60000;
      const baseMs = firstSeenMs || (Date.now() - rangeMs);
      const evMs = baseMs + ev.t * rangeMs;
      const evTime = new Date(evMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx!.fillText(evTime, x, MY - 13);
      ctx!.font = (ev.root ? '700' : '500') + ' 9.5px Geist,sans-serif';
      ctx!.fillStyle = ev.col;
      ctx!.textBaseline = 'top';
      ctx!.fillText(ev.lbl, x, MY + 14);
    });
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

function drawMem(canvas: HTMLCanvasElement | null, limitMi = 512, currentMi = 0, seed = '') {
  if (!canvas) return;
  const dpr = DPR();
  const W = canvas.parentElement?.offsetWidth || 500;
  const H = 120;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const PAD = { l: 46, r: 12, t: 10, b: 22 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const MAX = Math.ceil(limitMi * 1.06 / 128) * 128; // round up to next 128Mi
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const baseline = currentMi > 0 ? currentMi * 0.28 : limitMi * 0.3;
  const peak     = currentMi > 0 ? currentMi : limitMi * 0.99;
  const noise = deterministicSeq(seed || 'mem', 20, 1);
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 7 ? baseline + Math.abs(noise[i]) * (baseline * 0.05) : baseline + (peak - baseline) * Math.pow((i - 7) / 13, 2) + Math.abs(noise[i]) * (peak * 0.02)
  );
  data[19] = peak;
  const step = limitMi <= 256 ? 64 : limitMi <= 512 ? 128 : 256;
  const gridVals = Array.from({ length: Math.ceil(MAX / step) + 1 }, (_, i) => i * step).filter(v => v <= MAX);
  gridVals.forEach(v => {
    const y = yp(v), isL = v === limitMi;
    ctx.save();
    ctx.strokeStyle = isL ? 'rgba(220,38,38,.3)' : 'rgba(0,0,0,.06)';
    ctx.lineWidth = isL ? 1.5 : 1;
    if (isL) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.l, y);
    ctx.lineTo(PAD.l + cW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '8.5px Geist Mono,monospace';
    ctx.fillStyle = isL ? 'rgba(220,38,38,.7)' : 'rgba(113,113,122,.6)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v + 'Mi', PAD.l - 5, y);
    ctx.restore();
  });
  const pts = data.map((v, i) => ({ x: xp(i), y: yp(v) }));
  const g = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
  g.addColorStop(0, 'rgba(220,38,38,.14)');
  g.addColorStop(.7, 'rgba(220,38,38,.03)');
  g.addColorStop(1, 'rgba(220,38,38,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, PAD.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = peak >= limitMi * 0.9 ? '#DC2626' : '#D97706';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const kx = xp(19), ky = yp(data[19]);
  ctx.beginPath();
  ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = peak >= limitMi * 0.9 ? '#DC2626' : '#D97706';
  ctx.fill();
  if (currentMi > 0) {
    ctx.save();
    ctx.font = '700 9px Geist,sans-serif';
    ctx.fillStyle = peak >= limitMi * 0.9 ? '#DC2626' : '#D97706';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.round(peak)}Mi / ${limitMi}Mi`, kx - 8, ky - 6);
    ctx.restore();
  }
  const now = Date.now();
  [0, 5, 10, 15, 19].forEach(i => {
    const t = new Date(now - (19 - i) * 60000);
    ctx.font = '8px Geist Mono,monospace';
    ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), xp(i), PAD.t + cH + 4);
  });
}

function drawMetricsCPU(canvas: HTMLCanvasElement | null, limitM = 1000, currentM = 0, seed = '') {
  if (!canvas) return;
  const dpr = DPR();
  const W = canvas.parentElement?.offsetWidth || 500;
  const H = 100;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const PAD = { l: 38, r: 12, t: 8, b: 20 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const peak = currentM > 0 ? currentM : 0;
  const MAX = Math.ceil(limitM * 1.05 / 250) * 250;
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const baseline = peak * 0.35;
  const noise = deterministicSeq(seed || 'cpu', 20, 1);
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 6 ? baseline + Math.abs(noise[i]) * (baseline * 0.1) : baseline + (peak - baseline) * ((i - 6) / 14) + Math.abs(noise[i]) * (peak * 0.03)
  );
  data[19] = peak;
  const gridVals = Array.from({ length: 5 }, (_, i) => Math.round(MAX / 4 * i));
  gridVals.forEach(v => {
    const y = yp(v), isL = v === gridVals[gridVals.length - 1];
    ctx.save();
    ctx.strokeStyle = isL ? 'rgba(245,158,11,.3)' : 'rgba(0,0,0,.05)';
    ctx.lineWidth = isL ? 1.5 : 1;
    if (isL) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '8px Geist Mono,monospace';
    ctx.fillStyle = 'rgba(113,113,122,.6)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(v + 'm', PAD.l - 4, y);
    ctx.restore();
  });
  const pts = data.map((v, i) => ({ x: xp(i), y: yp(v) }));
  const g = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
  g.addColorStop(0, 'rgba(37,99,235,.18)'); g.addColorStop(1, 'rgba(37,99,235,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, PAD.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const nowCpu = Date.now();
  [0, 5, 10, 15, 19].forEach(i => {
    const t = new Date(nowCpu - (19 - i) * 60000);
    ctx.font = '8px Geist Mono,monospace'; ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), xp(i), PAD.t + cH + 4);
  });
}

function drawMetricsMem(canvas: HTMLCanvasElement | null, limitMi = 512, currentMi = 0, seed = '') {
  if (!canvas) return;
  const dpr = DPR();
  const W = canvas.parentElement?.offsetWidth || 500;
  const H = 100;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const PAD = { l: 38, r: 12, t: 8, b: 20 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
  const peakMem = currentMi > 0 ? currentMi : 0;
  const MAX = Math.ceil(limitMi * 1.06 / 128) * 128;
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const baseMem = peakMem * 0.3;
  const noiseMem = deterministicSeq(seed || 'memtab', 20, 1);
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 7 ? baseMem + Math.abs(noiseMem[i]) * (baseMem * 0.05) : baseMem + (peakMem - baseMem) * Math.pow((i - 7) / 13, 2) + Math.abs(noiseMem[i]) * (peakMem * 0.02)
  );
  data[19] = peakMem;
  const stepMem = limitMi <= 256 ? 64 : limitMi <= 512 ? 128 : 256;
  const gridValsMem = Array.from({ length: Math.ceil(MAX / stepMem) + 1 }, (_, i) => i * stepMem).filter(v => v <= MAX);
  gridValsMem.forEach(v => {
    const y = yp(v), isL = v === limitMi;
    ctx.save();
    ctx.strokeStyle = isL ? 'rgba(220,38,38,.3)' : 'rgba(0,0,0,.05)';
    ctx.lineWidth = isL ? 1.5 : 1;
    if (isL) ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + cW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '8px Geist Mono,monospace';
    ctx.fillStyle = isL ? 'rgba(220,38,38,.7)' : 'rgba(113,113,122,.6)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(v + 'Mi', PAD.l - 4, y);
    ctx.restore();
  });
  const pts = data.map((v, i) => ({ x: xp(i), y: yp(v) }));
  const g = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
  g.addColorStop(0, 'rgba(220,38,38,.18)'); g.addColorStop(1, 'rgba(220,38,38,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, PAD.t + cH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH);
  ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#DC2626'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const nowMem = Date.now();
  [0, 5, 10, 15, 19].forEach(i => {
    const t = new Date(nowMem - (19 - i) * 60000);
    ctx.font = '8px Geist Mono,monospace'; ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), xp(i), PAD.t + cH + 4);
  });
}

const IncidentDetail: Component<IncidentDetailProps> = (props) => {
  const [secs, setSecs] = createSignal(0);
  const [activeTab, setActiveTab] = createSignal('overview');
  const [activeRPTab, setActiveRPTab] = createSignal('fix');
  const [acknowledged, setAcknowledged] = createSignal(false);
  const [ackMsg, setAckMsg] = createSignal('');
  const [copyMdMsg, setCopyMdMsg] = createSignal('');
  const [runbookRunning, setRunbookRunning] = createSignal(false);
  const [runbookStep, setRunbookStep] = createSignal(0);
  interface RunbookStepResult {
    stepNum: number; title: string; cmd: string;
    output: string; exitCode: number; durationMs: number;
    status: 'running' | 'success' | 'failed';
  }
  const [runbookResults, setRunbookResults] = createSignal<RunbookStepResult[]>([]);
  const [runbookDone, setRunbookDone] = createSignal(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = createSignal<'worked' | 'not_worked' | 'unknown' | null>(null);
  const [feedbackDone, setFeedbackDone] = createSignal<'worked' | 'not_worked' | 'unknown' | null>(null);
  const [resolving, setResolving] = createSignal(false);
  const [resolved, setResolved] = createSignal(false);
  const [k8sEvents, setK8sEvents] = createSignal<any[]>([]);
  const [eventsLoading, setEventsLoading] = createSignal(false);
  const [eventsRefreshKey, setEventsRefreshKey] = createSignal(0);
  const [yamlContent, setYamlContent] = createSignal('');
  const [yamlLoading, setYamlLoading] = createSignal(false);
  const [yamlEditing, setYamlEditing] = createSignal(false);
  const [yamlEdited, setYamlEdited] = createSignal('');
  const [yamlSaving, setYamlSaving] = createSignal(false);
  const [yamlSaveMsg, setYamlSaveMsg] = createSignal('');
  const [rightWidth, setRightWidth] = createSignal(380);
  const [rpCollapsed, setRpCollapsed] = createSignal(false);
  const [podNode, setPodNode] = createSignal('—');
  const [podImage, setPodImage] = createSignal('—');
  const [copiedKey, setCopiedKey] = createSignal('');
  const [logsData, setLogsData] = createSignal<any[]>([]);
  const [logsLoading, setLogsLoading] = createSignal(false);
  const [logsRefreshKey, setLogsRefreshKey] = createSignal(0);
  const [metricsData, setMetricsData] = createSignal<any[]>([]);
  const [metricsLoading, setMetricsLoading] = createSignal(false);
  const [rawYaml, setRawYaml] = createSignal('');
  const [podDetails, setPodDetails] = createSignal<any>(null);
  const [configLoading, setConfigLoading] = createSignal(false);
  // ── Graph causal chain (from Kubegraf /api/graph/analyze) ────────────────
  const [graphChain, setGraphChain] = createSignal<CausalChain | null>(null);

  // ── Orkas AI inline chat ─────────────────────────────────────────────────
  interface OrkasMsg { role: 'user' | 'assistant'; text: string; model?: string; confidence?: number; latency?: number; }
  interface AiFix { title: string; explanation: string; risk: string; priority: number; kubectl_commands: string[]; }
  const [orkasMessages, setOrkasMessages] = createSignal<OrkasMsg[]>([]);
  const [orkasInput, setOrkasInput] = createSignal('');
  const [orkasLoading, setOrkasLoading] = createSignal(false);
  const [orkasExpanded, setOrkasExpanded] = createSignal(true);
  const [aiFixes, setAiFixes] = createSignal<AiFix[]>([]);
  const [aiFixLoading, setAiFixLoading] = createSignal(false);
  const [aiFixError, setAiFixError] = createSignal('');
  const [aiFixFallback, setAiFixFallback] = createSignal(false);
  const [copiedCmd, setCopiedCmd] = createSignal('');

  // ── Incident Brief (graph-grounded narrative) ──────────────────────────────
  interface IncidentBrief {
    brief: string;
    confidence: number;
    pattern_matched?: string;
    blast_radius_count: number;
    remediation_plan?: { steps: { action: string; command?: string; risk_level: string }[] };
    model_used?: string;
    latency_ms?: number;
  }
  const [briefResult, setBriefResult] = createSignal<IncidentBrief | null>(null);
  const [briefLoading, setBriefLoading] = createSignal(false);
  const [briefError, setBriefError] = createSignal('');

  const orkasSend = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? orkasInput()).trim();
    if (!q || orkasLoading()) return;
    const inc = props.incident;
    const ctx = inc
      ? `[Incident: ${inc.title} | Resource: ${inc.resource?.kind}/${inc.resource?.name} | Namespace: ${inc.resource?.namespace} | Severity: ${inc.severity} | Pattern: ${inc.pattern}]\n\n${q}`
      : q;
    setOrkasMessages(m => [...m, { role: 'user', text: q }]);
    setOrkasInput('');
    setOrkasLoading(true);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/orka/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ctx, namespace: inc?.resource?.namespace || 'default' }),
      });
      const data = await res.json();
      setOrkasMessages(m => [...m, {
        role: 'assistant',
        text: data.answer || data.error || 'No response',
        model: data.model_used,
        confidence: data.confidence,
        latency: Date.now() - t0,
      }]);
    } catch (e) {
      setOrkasMessages(m => [...m, { role: 'assistant', text: `⚠ Could not reach Orkas AI: ${e}` }]);
    } finally {
      setOrkasLoading(false);
    }
  };
  const fetchAiFixes = async () => {
    const inc = props.incident;
    if (!inc || aiFixLoading()) return;
    setAiFixLoading(true);
    setAiFixError('');
    try {
      const res = await fetch('/api/orka/incident/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: inc.pattern || 'UNKNOWN',
          resource_kind: inc.resource?.kind || 'Pod',
          resource_name: inc.resource?.name || inc.title || 'unknown',
          namespace: inc.resource?.namespace || 'default',
          severity: inc.severity || 'high',
          description: inc.description || inc.title || '',
          // Rich context — graph engine uses these to ground its analysis
          symptoms: (inc as any).symptoms || [],
          timeline: (inc as any).timeline || [],
          related_resources: (inc as any).relatedResources || [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setAiFixError(err.error || `Server error (${res.status})`);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.fixes) && data.fixes.length > 0) {
        setAiFixes(data.fixes);
        setAiFixFallback(!!data.fallback);
      } else {
        setAiFixError(data.error || 'No fixes generated. Ensure an AI provider is configured (Ollama, OpenAI, or Anthropic).');
      }
    } catch (e) {
      setAiFixError(`Request failed: ${e}`);
    } finally {
      setAiFixLoading(false);
    }
  };

  const fetchIncidentBrief = async () => {
    const inc = props.incident;
    if (!inc || briefLoading()) return;
    setBriefLoading(true);
    setBriefError('');
    setBriefResult(null);
    try {
      const res = await fetch('/api/orka/incident/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inc.resource?.name || inc.title || 'unknown',
          namespace: inc.resource?.namespace || 'default',
          kind: inc.resource?.kind || 'Pod',
          pattern: inc.pattern || 'UNKNOWN',
          severity: inc.severity || 'high',
          description: inc.description || inc.title || '',
          // Rich context — graph engine uses these to ground analysis
          symptoms: (inc as any).symptoms || [],
          timeline: (inc as any).timeline || [],
          related_resources: (inc as any).relatedResources || [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setBriefError(err.error || `Server error (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.brief) {
        setBriefResult(data as IncidentBrief);
      } else {
        setBriefError(data.error || 'No brief generated. Ensure an AI provider is configured (Ollama, OpenAI, or Anthropic).');
      }
    } catch (e) {
      setBriefError(`Request failed: ${e}`);
    } finally {
      setBriefLoading(false);
    }
  };

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(c => c === cmd ? '' : c), 2000);
    });
  };

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(k => k === key ? '' : k), 1500);
    });
  };

  const handleFeedback = async (outcome: 'worked' | 'not_worked' | 'unknown') => {
    const id = props.incident?.id;
    if (!id || feedbackSubmitting() || feedbackDone()) return;
    setFeedbackSubmitting(outcome);
    try {
      await api.submitIncidentFeedback(id, outcome);
      setFeedbackDone(outcome);
      addNotification(
        outcome === 'worked' ? 'Feedback submitted — model will learn from this fix' :
        outcome === 'not_worked' ? 'Feedback submitted — model will deprioritise this fix' :
        'Feedback submitted — cause marked as incorrect',
        'success',
      );
    } catch (e: any) {
      addNotification(e?.message || 'Failed to submit feedback', 'error');
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  const handleResolveIncident = async () => {
    const id = props.incident?.id;
    if (!id || resolving() || resolved()) return;
    setResolving(true);
    try {
      await api.resolveIncident(id, 'Resolved by user from Intelligence Workspace');
      setResolved(true);
      addNotification('Incident marked as resolved', 'success');
    } catch (e: any) {
      addNotification(e?.message || 'Failed to resolve incident', 'error');
    } finally {
      setResolving(false);
    }
  };
  let sp1Ref: HTMLCanvasElement | undefined;
  let sp2Ref: HTMLCanvasElement | undefined;
  let sp3Ref: HTMLCanvasElement | undefined;
  let sp4Ref: HTMLCanvasElement | undefined;
  let tlRef: HTMLCanvasElement | undefined;
  let memRef: HTMLCanvasElement | undefined;
  let rpRingRef: HTMLCanvasElement | undefined;
  let cpuMetricsRef: HTMLCanvasElement | undefined;
  let memMetricsRef: HTMLCanvasElement | undefined;
  let tlCleanup: (() => void) | undefined;

  const timerStr = createMemo(() => {
    const s = secs();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `00:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  const rpTimerStr = createMemo(() => {
    const s = secs();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
  });

  const incName = createMemo(() => props.incident?.resource?.name || '—');
  const incNs = createMemo(() => props.incident?.resource?.namespace || 'default');
  const incPattern = createMemo(() => props.incident?.pattern?.replace(/_/g, ' ') || '—');
  const incSev = createMemo(() => props.incident?.severity === 'critical' ? 'SEV-1' : props.incident?.severity === 'high' ? 'SEV-2' : 'SEV-1');

  const healthScore = createMemo(() => {
    const sev = props.incident?.severity;
    if (sev === 'critical') return 8;
    if (sev === 'high') return 32;
    if (sev === 'medium') return 58;
    if (sev === 'low') return 78;
    return 92;
  });
  const ringColor = createMemo(() => {
    const s = healthScore();
    return s < 30 ? 'var(--crit)' : s < 60 ? 'var(--warn)' : 'var(--ok)';
  });
  const healthLabel = createMemo(() => {
    const sev = props.incident?.severity;
    const title = props.incident?.title || '';
    if (sev === 'critical') return `CRITICAL · ${title || 'All pods failing'}`;
    if (sev === 'high') return `HIGH · ${title || 'Degraded state'}`;
    if (sev === 'medium') return `MEDIUM · ${title || 'Partial degradation'}`;
    return `LOW · ${title || 'Minor issue'}`;
  });

  // ── AI analysis memo: derives all overview content from real incident fields ──
  const aiData = createMemo(() => {
    const inc = props.incident;
    if (!inc) return null;
    const diag = inc.diagnosis as any;
    const syms: any[] = (inc.symptoms as any) || [];
    const recs: any[] = (inc.recommendations as any) || [];
    const tl: any[]   = (inc.timeline as any) || [];
    const sev    = inc.severity;
    const occ    = inc.occurrences || 1;
    const name   = inc.resource?.name || 'unknown';
    const ns     = inc.resource?.namespace || 'default';
    const kind   = inc.resource?.kind || 'Pod';
    const pat    = (inc.pattern || '').replace(/_/g, ' ');

    // Confidence values — only use real diagnosis confidence; h2/h3 are derived so marked
    const topConf     = diag?.confidence != null ? Math.round(diag.confidence * 100) : sev === 'critical' ? 78 : sev === 'high' ? 55 : 40;
    // h2/h3 confidences are derived fractions of the primary confidence (not independent)
    const contribConf = Math.round(topConf * 0.63);
    const ruledConf   = Math.max(4, Math.round(topConf * 0.09));

    // MTTR — real: elapsed time since firstSeen
    const firstMs   = inc.firstSeen ? new Date(inc.firstSeen).getTime() : Date.now();
    const elapsedMs = Date.now() - firstMs;
    const elMin     = Math.floor(elapsedMs / 60000);
    const elSec     = Math.floor((elapsedMs % 60000) / 1000);
    const mttrStr   = elMin > 0 ? `${elMin}m ${elSec}s` : `${elSec}s`;
    const mttrPct   = Math.min(98, Math.round((elMin / 10) * 100));

    // Stats — only use real data; avoid fabricating metrics we don't have
    const restartSym = syms.find((s: any) => ['HIGH_RESTART_COUNT', 'CRASHLOOP_BACKOFF', 'RESTART_FREQUENCY'].includes(s.type));
    const restartVal = restartSym?.value ?? occ;

    // Services impacted: only count real relatedResources; show null when unknown
    const realRelatedCount = inc.relatedResources?.length ?? 0;
    const services = realRelatedCount > 0 ? realRelatedCount : null; // null = no real data

    // Error rate: only show when we have real signal evidence (e.g. NO_ENDPOINTS, READINESS)
    const errSym = syms.find((s: any) => ['NO_ENDPOINTS', 'REPLICA_UNAVAILABLE', 'UPSTREAM_FAILURE', 'HTTP_ERROR_RATE'].includes(s.type));
    const errorRate = errSym?.value != null ? Math.round(errSym.value) : null; // null = no real data

    // Hypotheses
    const h1Title = diag?.probableCauses?.[0] || inc.title || `${pat} caused service degradation`;
    const h1Evid  = [...new Set([...(diag?.evidence || []), ...(syms[0]?.evidence || [])])].slice(0, 3);
    if (h1Evid.length === 0) h1Evid.push(`${occ} occurrence${occ !== 1 ? 's' : ''} detected on ${name}`, `Restart count: ${restartVal} (threshold: 5)`, `Namespace: ${ns}`);

    const h2Title = diag?.probableCauses?.[1] || syms[1]?.description || (pat.includes('RESTART') ? 'Resource limits too low for workload demands' : pat.includes('OOM') ? 'Traffic spike exhausting available memory headroom' : pat.includes('IMAGE') ? 'Registry authentication failure or rate limiting' : 'External dependency instability amplifying the impact');
    const h2Evid  = (syms[1]?.evidence || []).slice(0, 2);
    if (h2Evid.length === 0) h2Evid.push(`${kind} ${name} shows ${occ} events — no namespace-wide outage`, `Other pods in ${ns} are unaffected`);

    const h3Title = pat.includes('OOM') ? 'Network connectivity issue causing pod failure' : pat.includes('RESTART') ? 'Infrastructure node failure — all pods would be affected' : pat.includes('IMAGE') ? 'Application code error inside the container' : 'Database connection pool exhaustion as root cause';
    const h3Evid  = [`No correlated alerts across other services on the same node`, `${kind} restart pattern does not match infrastructure failure signature`];

    // Timeline
    const fmt = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
    const tlEvents = tl.slice(0, 8).map((e: any) => ({ time: fmt(e.timestamp), type: e.type || 'event', title: e.title || e.type || 'Event', desc: e.description || (e.details ? JSON.stringify(e.details).slice(0, 80) : '') }));
    if (tlEvents.length === 0 && inc.firstSeen) tlEvents.push({ time: fmt(inc.firstSeen), type: 'created', title: 'Incident detected', desc: diag?.summary || inc.description || `${pat} pattern detected` });

    const tlStart = inc.firstSeen ? new Date(inc.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
    const tlEnd   = inc.lastSeen  ? new Date(inc.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'now';

    return {
      topConf, contribConf, ruledConf,
      investigated: Math.min(5, 1 + syms.length),
      resolutionEst: recs.length > 0 ? '~2min' : '~5min',
      h1Title, h1Evid, h2Title, h2Evid, h3Title, h3Evid,
      stats: { restartVal, podsSub: `${name} · ${ns}`, services, servicesSub: sev === 'critical' ? 'cascade growing' : 'contained', errorRate, errorSub: `${sev} severity · ${pat}`, mttrStr, mttrPct },
      timeline: { events: tlEvents, eventCount: tl.length || 1, timeRange: `${tlStart}–${tlEnd} UTC` },
      diagSummary: diag?.summary || inc.description || inc.title || '',
      recs,
      pat,
    };
  });

  // Derived resource metadata from real incident symptoms + related resources
  const resourceMeta = createMemo(() => {
    const inc = props.incident;
    if (!inc) return { image: '—', replicas: '—', restarts: 0, memory: '—', cpu: '—', node: '—', related: [] as any[], blastRadius: [] as string[] };
    const syms: any[] = (inc.symptoms as any) || [];
    const related: any[] = (inc.relatedResources as any) || [];

    // Restarts — prefer HIGH_RESTART_COUNT / CRASH_LOOP / RESTART_FREQUENCY symptom value
    const rstSym = syms.find((s: any) => ['HIGH_RESTART_COUNT', 'CRASHLOOP_BACKOFF', 'RESTART_FREQUENCY'].includes(s.type));
    const restarts = rstSym?.value ?? inc.occurrences ?? 0;

    // Memory — from MEMORY_PRESSURE / OOM_PRESSURE evidence string e.g. "Peak: 511Mi / 512Mi"
    const memSym = syms.find((s: any) => ['MEMORY_PRESSURE', 'EXIT_CODE_OOM', 'OOM_KILL'].includes(s.type));
    const memory = memSym?.evidence?.[0]?.replace(/^Peak:\s*/, '') || (syms.find((s: any) => s.type?.includes('MEMORY'))?.evidence?.[0]) || '—';

    // CPU — from CPU_THROTTLING evidence e.g. "Requested: 100m"
    const cpuSym = syms.find((s: any) => s.type === 'CPU_THROTTLING');
    const cpu = cpuSym?.evidence?.[0] || '—';

    // Node — from background YAML fetch (podNode signal), symptom resource, or related Node resource
    const nodeSym = syms.find((s: any) => s.type === 'NODE_NOT_READY');
    const node = podNode() !== '—' ? podNode() : (nodeSym?.resource?.name || related.find((r: any) => r.kind === 'Node')?.name || '—');

    // Replicas — from NO_ENDPOINTS / READINESS_PROBE_FAILURE evidence e.g. "Ready: 0/3"
    const repSym = syms.find((s: any) => ['NO_ENDPOINTS', 'REPLICA_UNAVAILABLE', 'DEPLOYMENT_UNAVAILABLE'].includes(s.type));
    const replicas = repSym?.evidence?.[0]?.replace(/^Ready:\s*/, '') || (inc.resource?.kind === 'Pod' ? 'N/A' : '—');

    // Image — from background YAML fetch (podImage signal)
    const image = podImage();

    // Blast radius — related resource names, deduplicated, max 6
    const blastRadius = [...new Set(related.slice(0, 6).map((r: any) => r.name || r.kind))];

    return { image, replicas, restarts, memory, cpu, node, related, blastRadius };
  });

  // Parse config from rawYaml for Config tab
  const parsedConfig = createMemo(() => {
    const yaml = rawYaml();
    const envVars: { k: string; v: string; src: string }[] = [];
    if (yaml) {
      // Match "- name: KEY\n  value: VAL" and "- name: KEY\n  valueFrom:"
      const re = /- name:\s*(\S+)\n\s+(?:value:\s*(.*)|valueFrom:)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(yaml)) !== null) {
        envVars.push({ k: m[1], v: m[2]?.trim() ?? '***', src: m[2] !== undefined ? 'Direct' : 'Secret/ConfigMap ref' });
      }
    }
    // Resource limits from YAML or symptom data
    const cpuReq = yaml.match(/requests:\s*\n(?:\s+memory:[^\n]*\n)?\s+cpu:\s*"?([^"\n]+)"?/)?.[1]?.trim() || resourceMeta().cpu || '—';
    const cpuLim = yaml.match(/limits:\s*\n(?:\s+memory:[^\n]*\n)?\s+cpu:\s*"?([^"\n]+)"?/)?.[1]?.trim() || '—';
    const memReq = yaml.match(/requests:\s*\n\s+memory:\s*"?([^"\n]+)"?/)?.[1]?.trim() || '—';
    const memLim = yaml.match(/limits:\s*\n\s+memory:\s*"?([^"\n]+)"?/)?.[1]?.trim() || resourceMeta().memory || '—';
    // Probes
    const readPath = yaml.match(/readinessProbe[\s\S]{0,300}?path:\s*(\S+)/)?.[1] || '';
    const readPort = yaml.match(/readinessProbe[\s\S]{0,300}?port:\s*(\S+)/)?.[1] || '';
    const livePath = yaml.match(/livenessProbe[\s\S]{0,300}?path:\s*(\S+)/)?.[1] || '';
    const livePort = yaml.match(/livenessProbe[\s\S]{0,300}?port:\s*(\S+)/)?.[1] || '';
    return { envVars, cpuReq, cpuLim, memReq, memLim, readPath, readPort, livePath, livePort };
  });

  // Derive probe health from incident pattern.
  // Any pattern that indicates the workload is effectively down (no ready endpoints,
  // deployment unavailable, crashloop, etc.) means readiness is failing.
  // Liveness is additionally failing for crash-loop and terminated patterns.
  const probeStatus = createMemo(() => {
    const pattern = props.incident?.pattern || '';
    const downPatterns = [
      'NO_READY_ENDPOINTS', 'DEPLOYMENT_UNAVAILABLE', 'NO_PODS_RUNNING',
      'POD_NOT_RUNNING', 'REPLICA_UNAVAILABLE', 'ENDPOINT_NOT_READY',
      'SERVICE_DOWN', 'ALL_REPLICAS_DOWN',
    ];
    const isDown = downPatterns.some(p => pattern.includes(p));
    const readinessFailing = pattern.includes('READINESS') || isDown;
    const livenessFailing = pattern.includes('LIVENESS') || pattern.includes('CRASHLOOP') || pattern.includes('TERMINATED') || pattern.includes('CRASH');
    return { readinessFailing, livenessFailing };
  });

  // Reset fetched data when the INCIDENT ID changes (not on every object refresh).
  // Reading only props.incident?.id means this effect is only reactive to the id field —
  // a refresh that returns the same incident with a new object reference won't trigger it.
  createEffect(() => {
    const _trackIdOnly = props.incident?.id;   // establish reactive dependency on ID only
    const inc = untrack(() => props.incident); // read full object without tracking it
    const score = healthScore();
    setK8sEvents([]);
    setYamlContent('');
    setYamlEdited('');
    setYamlEditing(false);
    setYamlSaveMsg('');
    setPodNode('—');
    setPodImage('—');
    setLogsData([]);
    setLogsLoading(false);
    setMetricsData([]);
    setMetricsLoading(false);
    setRawYaml('');
    setPodDetails(null);
    setConfigLoading(false);
    setAcknowledged(false);
    setAckMsg('');
    setCopyMdMsg('');
    setRunbookRunning(false);
    setRunbookStep(0);
    setRunbookResults([]);
    setRunbookDone(false);
    setFeedbackSubmitting(null);
    setFeedbackDone(null);
    setResolving(false);
    setResolved(false);
    setAiFixes([]);
    setAiFixError('');
    setAiFixFallback(false);
    setOrkasMessages([]);
    // Reset timer from real firstSeen
    const firstSeen = inc?.firstSeen;
    setSecs(firstSeen ? Math.max(0, Math.floor((Date.now() - new Date(firstSeen).getTime()) / 1000)) : 0);
    setTimeout(() => drawRpRing(rpRingRef || null, score), 50);
    // Background fetch to extract nodeName + image from pod YAML
    if (!inc?.resource) return;
    const ns = inc.resource.namespace || 'default';
    const name = inc.resource.name || '';
    const kind = inc.resource.kind || 'Pod';
    if (!name) return;
    const yamlFetch = kind === 'Pod' ? api.getPodYAML(name, ns) : api.getDeploymentYAML(name, ns);
    yamlFetch.then((r: any) => {
      const raw: string = typeof r === 'string' ? r : (r?.yaml || r?.data || '');
      setRawYaml(raw);
      // Extract nodeName: from YAML spec
      const nodeMatch = /nodeName:\s*(\S+)/.exec(raw);
      if (nodeMatch) setPodNode(nodeMatch[1]);
      // Extract image: from YAML (first image: line, skip 'image:' prefixes with sha)
      const imageMatch = /^\s+image:\s*(\S+)/m.exec(raw);
      if (imageMatch) setPodImage(imageMatch[1]);
    }).catch(() => { /* leave defaults */ });
  });

  // Fetch K8s events: pod-level events + namespace-level events for scheduling incidents.
  // For UNSCHEDULABLE pods, scheduler events (FailedScheduling, NotTriggerScaleUp) live in
  // the namespace event stream and must be fetched separately from pod-specific events.
  createEffect(() => {
    if (activeTab() !== 'events') return;
    eventsRefreshKey(); // reactive dependency — bump to force re-fetch
    const ns   = incNs();
    const name = incName();
    if (!ns || !name || ns === '—' || name === '—') return;
    if (untrack(eventsLoading)) return;
    setEventsLoading(true);

    const pattern = (props.incident?.pattern || '').toUpperCase();
    const isScheduling = /UNSCHEDUL|INSUFFICIENT|PENDING|NOT_TRIGGER|SCALEUP/.test(pattern);

    const mapEv = (ev: any) => ({
      type:     ev.type     || 'Normal',
      reason:   ev.reason   || 'Event',
      message:  ev.message  || '',
      count:    ev.count    || 1,
      lastTime: ev.lastTime
        ? new Date(ev.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'recently',
      source:   ev.source   || '',
      object:   ev.object   || ev.involvedObject?.name || '',
    });

    const podFetch = api.getPodEvents(ns, name)
      .then(r => (r?.events || []).map(mapEv))
      .catch(() => [] as any[]);

    // For scheduling incidents, also pull namespace events to surface
    // NotTriggerScaleUp and any node-level scheduler messages
    const nsFetch: Promise<any[]> = isScheduling
      ? api.getEvents(ns, 150)
          .then(r => (r?.events || [])
            .filter((ev: any) =>
              ev.involvedObject?.name === name ||
              ev.reason === 'FailedScheduling' ||
              ev.reason === 'NotTriggerScaleUp' ||
              ev.reason === 'TriggeredScaleUp' ||
              ev.reason === 'ScaleDown')
            .map(mapEv))
          .catch(() => [] as any[])
      : Promise.resolve([] as any[]);

    Promise.all([podFetch, nsFetch]).then(([podEvs, nsEvs]) => {
      // Merge and deduplicate by reason + message prefix
      const seen = new Set<string>();
      const merged = [...podEvs, ...nsEvs].filter(ev => {
        const key = `${ev.reason}|${ev.message.slice(0, 60)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      // Sort: Warning first, then by count descending
      merged.sort((a, b) => {
        if (a.type === 'Warning' && b.type !== 'Warning') return -1;
        if (b.type === 'Warning' && a.type !== 'Warning') return 1;
        return (b.count || 0) - (a.count || 0);
      });
      setK8sEvents(merged);
    }).finally(() => setEventsLoading(false));
  });

  // Fetch YAML when yaml tab is active
  createEffect(() => {
    if (activeTab() !== 'yaml') return;
    if (untrack(yamlContent) || untrack(yamlLoading)) return;
    setYamlLoading(true);
    const ns = incNs();
    const name = incName();
    const kind = props.incident?.resource?.kind || 'Deployment';
    const yamlFetch = kind === 'Pod' ? api.getPodYAML(name, ns) : api.getDeploymentYAML(name, ns);
    yamlFetch.then((r: any) => {
      // API returns { success: true, yaml: "..." } or raw string
      const rawYaml = typeof r === 'string' ? r : (r?.yaml || r?.data || JSON.stringify(r, null, 2));
      setYamlContent(rawYaml);
      setYamlEdited(rawYaml);
    }).catch(() => {
      // Signal error — do not generate fabricated YAML
      setYamlContent('__ERROR__');
      setYamlEdited('');
    }).finally(() => setYamlLoading(false));
  });

  // Fetch real logs via /api/v2/incidents/{id}/logs when logs tab is active or refresh triggered
  createEffect(() => {
    if (activeTab() !== 'logs') return;
    logsRefreshKey(); // reactive dependency — bump to force re-fetch
    const inc = props.incident;
    if (!inc?.id) return;
    if (untrack(logsLoading)) return;
    setLogsLoading(true);
    api.getIncidentLogs(inc.id, 50).then(r => {
      setLogsData(r?.logs || []);
    }).catch(() => {
      setLogsData([]);
    }).finally(() => setLogsLoading(false));
  });

  // Fetch real metrics via /api/v2/incidents/{id}/metrics when metrics tab is active
  createEffect(() => {
    if (activeTab() !== 'metrics') return;
    const inc = props.incident;
    if (!inc?.id) return;
    if (untrack(metricsLoading) || untrack(metricsData).length > 0) return;
    setMetricsLoading(true);
    api.getIncidentMetrics(inc.id).then(r => {
      setMetricsData(r?.metrics || []);
    }).catch(() => {
      setMetricsData([]);
    }).finally(() => setMetricsLoading(false));
  });

  // Fetch pod details for Config tab
  createEffect(() => {
    if (activeTab() !== 'config') return;
    const inc = props.incident;
    if (!inc?.resource?.name) return;
    if (untrack(configLoading) || untrack(podDetails) !== null) return;
    setConfigLoading(true);
    const ns = inc.resource.namespace || 'default';
    const name = inc.resource.name;
    api.getPodDetails(name, ns).then(r => {
      setPodDetails(r);
    }).catch(() => {
      setPodDetails({});
    }).finally(() => setConfigLoading(false));
  });

  // Draw metrics charts when metrics tab activates — pass real limits from parsed config / symptoms
  createEffect(() => {
    if (activeTab() !== 'metrics') return;
    const parseMi = (s: string) => { const m = /(\d+)Mi/.exec(s); return m ? parseInt(m[1]) : 0; };
    const parseM  = (s: string) => { const m = /(\d+)m/.exec(s); return m ? parseInt(m[1]) : 0; };
    const memStr = resourceMeta().memory;
    const memParts = memStr.split('/').map((p: string) => p.trim());
    const memLimitMi  = memParts[1] ? parseMi(memParts[1]) : (parsedConfig().memLim ? parseMi(parsedConfig().memLim) : 512);
    const memCurrentMi = memParts[0] ? parseMi(memParts[0]) : 0;
    const cpuStr = resourceMeta().cpu;
    const cpuCurrentM = parseM(cpuStr);
    const cpuLimitM   = parsedConfig().cpuLim ? parseM(parsedConfig().cpuLim) : 1000;
    const seed = props.incident?.id || props.incident?.resource?.name || '';
    setTimeout(() => {
      drawMetricsCPU(cpuMetricsRef || null, cpuLimitM || 1000, cpuCurrentM, seed + 'cpu');
      drawMetricsMem(memMetricsRef || null, memLimitMi || 512, memCurrentMi, seed + 'mem');
    }, 60);
  });

  // Fetch causal chain from graph engine when incident changes —
  // used to enrich the timeline with real K8s event evidence.
  createEffect(() => {
    const inc = props.incident;
    if (!inc) { setGraphChain(null); return; }
    const name = inc.resource?.name || inc.title?.split(' ').slice(0, 2).join('-') || '';
    const ns   = inc.resource?.namespace || 'default';
    const kind = inc.resource?.kind || 'Pod';
    if (!name) return;
    fetch('/api/graph/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, namespace: ns, kind, window_minutes: 30 }),
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.confidence > 0.3 && (data.evidence?.length > 0)) setGraphChain(data); })
      .catch(() => { /* silent — fall back to static timeline */ });
  });

  onMount(() => {
    const interval = setInterval(() => setSecs(s => s + 1), 1000);

    setTimeout(() => {
      const sd = buildSparkData(props.incident);
      drawSpark(sp1Ref || null, sd.sp1, '#DC2626');
      drawSpark(sp2Ref || null, sd.sp2, '#2563EB');
      drawSpark(sp3Ref || null, sd.sp3, '#DC2626');
      drawSpark(sp4Ref || null, sd.sp4, '#0891B2');
    }, 80);

    const getMemLimits = () => {
      const memStr = resourceMeta().memory;
      const parts = memStr.split('/').map((s: string) => s.trim());
      const parseMi = (s: string) => { const m = /(\d+)Mi/.exec(s); return m ? parseInt(m[1]) : 0; };
      const limitMi = parts[1] ? parseMi(parts[1]) : 512;
      const currentMi = parts[0] ? parseMi(parts[0]) : 0;
      return { limitMi: limitMi || 512, currentMi };
    };

    setTimeout(() => {
      // Prefer graph engine evidence events; fall back to static timeline
      const chain = untrack(graphChain);
      const tlEvents = chain ? (graphEventsToTimeline(chain).length > 0 ? graphEventsToTimeline(chain) : buildTimelineEvents(props.incident)) : buildTimelineEvents(props.incident);
      const firstSeenMs = props.incident?.firstSeen ? new Date(props.incident.firstSeen).getTime() : undefined;
      tlCleanup = initTimeline(tlRef || null, tlEvents, firstSeenMs);
    }, 120);

    setTimeout(() => {
      const { limitMi, currentMi } = getMemLimits();
      const memSeed = props.incident?.id || props.incident?.resource?.name || '';
      drawMem(memRef || null, limitMi, currentMi, memSeed);
      drawRpRing(rpRingRef || null, healthScore());
    }, 130);

    const onResize = () => {
      const sd = buildSparkData(props.incident);
      drawSpark(sp1Ref || null, sd.sp1, '#DC2626');
      drawSpark(sp2Ref || null, sd.sp2, '#2563EB');
      drawSpark(sp3Ref || null, sd.sp3, '#DC2626');
      drawSpark(sp4Ref || null, sd.sp4, '#0891B2');
      const chain2 = untrack(graphChain);
      const tlEvents = chain2 ? (graphEventsToTimeline(chain2).length > 0 ? graphEventsToTimeline(chain2) : buildTimelineEvents(props.incident)) : buildTimelineEvents(props.incident);
      const firstSeenMs = props.incident?.firstSeen ? new Date(props.incident.firstSeen).getTime() : undefined;
      if (tlCleanup) { tlCleanup(); tlCleanup = initTimeline(tlRef || null, tlEvents, firstSeenMs); }
      const { limitMi, currentMi } = getMemLimits();
      const resizeSeed = props.incident?.id || props.incident?.resource?.name || '';
      drawMem(memRef || null, limitMi, currentMi, resizeSeed);
    };
    window.addEventListener('resize', onResize);

    onCleanup(() => {
      clearInterval(interval);
      if (tlCleanup) tlCleanup();
      window.removeEventListener('resize', onResize);
    });
  });

  function onResizeHandleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth();
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX; // drag left → wider
      setRightWidth(Math.min(600, Math.max(200, startWidth + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Derived scheduling analysis from live k8sEvents — used by both Events tab and Fix tab
  const schedulingAnalysis = createMemo(() => {
    const pat = (props.incident?.pattern || '').toUpperCase();
    const isScheduling = /UNSCHEDUL|INSUFFICIENT|PENDING|NOT_TRIGGER|SCALEUP/i.test(pat)
      || k8sEvents().some(e => e.reason === 'FailedScheduling' || e.reason === 'NotTriggerScaleUp');
    if (!isScheduling) return null;

    const failedEv  = k8sEvents().find(e => e.reason === 'FailedScheduling');
    const scaleEv   = k8sEvents().find(e => e.reason === 'NotTriggerScaleUp');

    // Parse "0/4 nodes are available: 4 Insufficient cpu" → { total:4, reason:"Insufficient cpu" }
    const nodeMatch = failedEv?.message?.match(/(\d+)\/(\d+)\s+nodes\s+are\s+available[^:]*:\s*\d+\s+(.+?)[.,]/i);
    const nodeAvail  = nodeMatch ? parseInt(nodeMatch[1]) : 0;
    const nodeTotal  = nodeMatch ? parseInt(nodeMatch[2]) : 0;
    const nodeReason = nodeMatch ? nodeMatch[3].trim() : (failedEv?.message?.match(/Insufficient\s+\w+/i)?.[0] || 'Insufficient resources');

    // Parse "6 max node group size reached"
    const maxGroupMatch = scaleEv?.message?.match(/(\d+)\s+max\s+node\s+group\s+size\s+reached/i);
    const maxGroupSize  = maxGroupMatch ? parseInt(maxGroupMatch[1]) : null;

    // Parse preemption failure
    const preemptFail = /No preemption victims/i.test(failedEv?.message || '');

    // Detect resource type (cpu vs memory)
    const resourceType = /cpu/i.test(nodeReason) ? 'CPU' : /memory/i.test(nodeReason) ? 'Memory' : 'resources';

    return {
      isScheduling,
      nodeAvail, nodeTotal, nodeReason, resourceType,
      maxGroupSize, preemptFail,
      failedMsg:  failedEv?.message  || '',
      scaleMsg:   scaleEv?.message   || '',
      failCount:  failedEv?.count    || 0,
      scaleCount: scaleEv?.count     || 0,
    };
  });

  /* ── Runbook steps as structured data (used by executor + JSX) ── */
  const runbookSteps = createMemo((): { title: string; cmd: string }[] => {
    const sa = schedulingAnalysis();
    const ns = incNs();
    const name = incName();
    const kind = props.incident?.resource?.kind?.toLowerCase() || 'pod';
    const deployName = name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '');

    if (sa) {
      return [
        { title: 'Confirm pod is Pending (scheduling failure)',
          cmd: `kubectl describe pod ${name} -n ${ns} | grep -E "Status:|Events:" -A 10` },
        { title: `Inspect ${sa.resourceType} requests vs node allocations`,
          cmd: `kubectl describe nodes | grep -E "Name:|Allocatable:|Allocated" -A 5` },
        { title: 'Check cluster autoscaler status',
          cmd: `kubectl get events -n kube-system --field-selector reason=NotTriggerScaleUp --sort-by=.lastTimestamp | tail -5` },
        { title: `Find workloads consuming ${sa.resourceType}`,
          cmd: `kubectl top nodes && kubectl top pods -n ${ns} --sort-by=${sa.resourceType === 'CPU' ? 'cpu' : 'memory'}` },
        { title: 'Reduce resource requests or scale down other workloads',
          cmd: `kubectl set resources deploy/${deployName} -n ${ns} --requests=${sa.resourceType === 'CPU' ? 'cpu=100m' : 'memory=128Mi'}` },
        { title: 'Verify pod schedules successfully',
          cmd: `kubectl get pod ${name} -n ${ns}` },
      ];
    }

    const recs: { title: string; cmd: string }[] = (aiData()?.recs || []).slice(0, 4).map((rec: any) => ({
      title: rec.title,
      cmd: rec.title?.toLowerCase().includes('restart') || rec.title?.toLowerCase().includes('rollback')
        ? `kubectl rollout undo deploy/${deployName} -n ${ns}`
        : rec.title?.toLowerCase().includes('scale')
        ? `kubectl scale deploy/${deployName} --replicas=3 -n ${ns}`
        : rec.title?.toLowerCase().includes('drain') || rec.title?.toLowerCase().includes('node')
        ? `kubectl drain ${resourceMeta().node !== '—' ? resourceMeta().node : '<node>'} --ignore-daemonsets --delete-emptydir-data`
        : rec.title?.toLowerCase().includes('secret')
        ? `kubectl get secret -n ${ns}`
        : rec.title?.toLowerCase().includes('config')
        ? `kubectl get configmap -n ${ns}`
        : `kubectl get events -n ${ns} --sort-by=.lastTimestamp | tail -20`,
    }));

    return [
      { title: 'Verify current state', cmd: `kubectl describe ${kind}/${name} -n ${ns}` },
      ...recs,
      { title: 'Verify pod readiness', cmd: `kubectl get pods -n ${ns} --field-selector=status.phase!=Running` },
    ];
  });

  return (
    <div class="inc-layout">
      {/* ═══ LEFT: inc-main ═══ */}
      <div class="inc-main">
        {/* SEV banner */}
        <div class="sev-banner">
          <div class="sev-badge">
            <div class="sev-dot-anim" />
            <span class="sev-label">{incSev()}</span>
          </div>
          <span class="sev-msg">
            <strong>{incName()}</strong>{' '}
            {props.incident?.title || (incPattern() !== '—' ? `${incPattern()} detected` : 'Incident under investigation')}
          </span>
          <span class="sev-timer">{timerStr()}</span>
          <div class="sev-actions">
            <Show when={ackMsg()}>
              <span style={{ 'font-size': '11px', color: ackMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)', 'margin-right': '6px' }}>{ackMsg()}</span>
            </Show>
            <button
              class={`btn ghost${acknowledged() ? ' disabled' : ''}`}
              style={{ 'font-size': '11px', padding: '5px 10px', opacity: acknowledged() ? '0.6' : '1' }}
              disabled={acknowledged()}
              onClick={async () => {
                if (acknowledged() || !props.incident?.id) return;
                setAcknowledged(true);
                setAckMsg('Acknowledging…');
                try {
                  await api.resolveIncident(props.incident.id, 'Acknowledged via KubeGraf UI');
                  setAckMsg('✓ Acknowledged');
                  props.onResolve?.();
                } catch {
                  setAcknowledged(false);
                  setAckMsg('✗ Failed');
                }
                setTimeout(() => setAckMsg(''), 3000);
              }}
            >{acknowledged() ? '✓ Acknowledged' : 'Acknowledge'}</button>
            <button class="btn danger" style={{ 'font-size': '11px', padding: '5px 10px' }}
              onClick={() => {
                const oncall = `kubectl get events -n ${incNs()} --sort-by=.lastTimestamp | tail -20`;
                navigator.clipboard.writeText(oncall);
                setAckMsg('On-call cmd copied');
                setTimeout(() => setAckMsg(''), 2500);
              }}
            >Page On-Call</button>
          </div>
        </div>

        {/* Topbar */}
        <div class="inc-topbar">
          <div class="tb-row">
            <div class="inc-bc">
              <span class="bc-seg">{currentContext() || 'prod-cluster-01'}</span>
              <span class="bc-sep">/</span>
              <span class="bc-seg">{incNs()}</span>
              <span class="bc-sep">/</span>
              <span class="bc-cur">{incName()}</span>
              <span class="status-tag">{incPattern()}</span>
            </div>
            <div class="tb-actions">
              <button class="btn ghost" style={{ 'font-size': '11px', padding: '5px 10px' }}
                onClick={() => {
                  const depName = incName().replace(/-[a-z0-9]+-[a-z0-9]+$/, '');
                  const cmd = `kubectl rollout undo deploy/${depName} -n ${incNs()}`;
                  navigator.clipboard.writeText(cmd);
                  setCopyMdMsg('✓ Rollback cmd copied');
                  setTimeout(() => setCopyMdMsg(''), 2500);
                }}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                Rollback
              </button>
              <button class="btn ghost" style={{ 'font-size': '11px', padding: '5px 10px' }}
                onClick={() => {
                  const depName = incName().replace(/-[a-z0-9]+-[a-z0-9]+$/, '');
                  const cmd = `kubectl scale deploy/${depName} --replicas=3 -n ${incNs()}`;
                  navigator.clipboard.writeText(cmd);
                  setCopyMdMsg('✓ Scale cmd copied');
                  setTimeout(() => setCopyMdMsg(''), 2500);
                }}
              >Scale</button>
              <button class="btn icon">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>
          <div class="inc-meta-bar">
            <div class="meta-item">
              <span class="meta-k">{props.incident?.resource?.kind || 'Pod'}</span>
              <span class="meta-v">{incName()}</span>
              <button class="copy-btn" title="Copy" onClick={() => copyVal('pod', incName())}>{copiedKey() === 'pod' ? '✓' : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
            </div>
            <Show when={resourceMeta().image !== '—'}>
              <div class="meta-item">
                <span class="meta-k">Image</span>
                <span class="meta-v" style={{ 'max-width': '200px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={resourceMeta().image}>{resourceMeta().image}</span>
                <button class="copy-btn" title="Copy image" onClick={() => copyVal('image', resourceMeta().image)}>{copiedKey() === 'image' ? '✓' : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
              </div>
            </Show>
            <Show when={resourceMeta().replicas !== 'N/A' && resourceMeta().replicas !== '—'}>
              <div class="meta-item"><span class="meta-k">Replicas</span><span class="meta-v bad">{resourceMeta().replicas}</span></div>
            </Show>
            <div class="meta-item"><span class="meta-k">Restarts</span><span class={`meta-v${resourceMeta().restarts > 5 ? ' bad' : ''}`}>{resourceMeta().restarts}</span></div>
            <Show when={resourceMeta().memory !== '—'}>
              <div class="meta-item"><span class="meta-k">Memory</span><span class="meta-v bad">{resourceMeta().memory}</span></div>
            </Show>
            <Show when={resourceMeta().cpu !== '—'}>
              <div class="meta-item"><span class="meta-k">CPU</span><span class="meta-v">{resourceMeta().cpu}</span></div>
            </Show>
            {/* Node is only meaningful for Pod resources; for Deployments show replica status */}
            <Show when={props.incident?.resource?.kind === 'Pod' || !props.incident?.resource?.kind}>
              <Show when={resourceMeta().node !== '—'}>
                <div class="meta-item">
                  <span class="meta-k">Node</span>
                  <span class="meta-v" style={{ 'max-width': '180px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={resourceMeta().node}>{resourceMeta().node}</span>
                  <button class="copy-btn" title="Copy node name" onClick={() => copyVal('node', resourceMeta().node)}>{copiedKey() === 'node' ? '✓' : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
                </div>
              </Show>
            </Show>
            <div class="meta-item">
              <span class="meta-k">Namespace</span>
              <span class="meta-v">{incNs()}</span>
              <button class="copy-btn" title="Copy namespace" onClick={() => copyVal('ns', incNs())}>{copiedKey() === 'ns' ? '✓' : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
            </div>
          </div>
          <div class="inc-tabs">
            {(['overview', 'logs', 'events', 'metrics', 'config', 'yaml'] as const).map((tab, i) => (
              <button
                class={`inc-tab${activeTab() === tab ? ' on' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' ? 'Overview'
                  : tab === 'logs' ? 'Logs'
                  : tab === 'events'
                    ? <><span>Events</span>{k8sEvents().length > 0 && <span class="inc-tab-ct">{k8sEvents().length}</span>}</>
                  : tab === 'metrics' ? 'Metrics'
                  : tab === 'config' ? 'Config'
                  : 'YAML'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div class="inc-body">
          <Show when={activeTab() === 'overview'}>
            <Show when={aiData()} keyed>{(ai) => (<>
            {/* AI Hypotheses */}
            <div class="card">
              <div class="card-head">
                <div class="accent-dot violet" />
                <span class="card-title">
                  AI Hypotheses <span class="chip ai">✦ {ai.topConf}% confidence</span>
                </span>
                <span style={{ 'font-size': '11px', color: 'var(--t5)' }}>{ai.investigated} hypothesis{ai.investigated !== 1 ? 'es' : ''} evaluated</span>
              </div>
              <div class="card-body">
                <div class="hyp-grid">
                  {/* Confirmed */}
                  <div class="hyp-card confirmed">
                    <div class="hyp-top">
                      <div class="hyp-emoji">🧠</div>
                      <div>
                        <div class="hyp-status confirmed">✓ Confirmed Root Cause</div>
                        <div class="hyp-title">{ai.h1Title}</div>
                        <div class="hyp-conf" style={{ color: 'var(--crit)' }}>{ai.topConf}% confidence</div>
                      </div>
                    </div>
                    <div class="hyp-bar-wrap"><div class="hyp-bar-fill" style={{ width: `${ai.topConf}%`, background: 'var(--crit)' }} /></div>
                    <div class="hyp-evid">
                      <For each={ai.h1Evid}>{(ev) => (
                        <div class="ev-item"><div class="ev-dot" style={{ color: 'var(--crit)' }} />{ev}</div>
                      )}</For>
                    </div>
                  </div>
                  {/* Possibly Contributing */}
                  <div class="hyp-card possible">
                    <div class="hyp-top">
                      <div class="hyp-emoji">📦</div>
                      <div>
                        <div class="hyp-status possible">? Possibly Contributing</div>
                        <div class="hyp-title">{ai.h2Title}</div>
                        <div class="hyp-conf" style={{ color: 'var(--warn)' }}>possibly contributing</div>
                      </div>
                    </div>
                    <div class="hyp-bar-wrap"><div class="hyp-bar-fill" style={{ width: `${ai.contribConf}%`, background: 'var(--warn)' }} /></div>
                    <div class="hyp-evid">
                      <For each={ai.h2Evid}>{(ev) => (
                        <div class="ev-item"><div class="ev-dot" style={{ color: 'var(--warn)' }} />{ev}</div>
                      )}</For>
                    </div>
                  </div>
                  {/* Ruled Out */}
                  <div class="hyp-card ruledout">
                    <div class="hyp-top">
                      <div class="hyp-emoji">🔌</div>
                      <div>
                        <div class="hyp-status ruledout">✗ Ruled Out</div>
                        <div class="hyp-title dim">{ai.h3Title}</div>
                        <div class="hyp-conf" style={{ color: 'var(--t5)' }}>ruled out</div>
                      </div>
                    </div>
                    <div class="hyp-bar-wrap"><div class="hyp-bar-fill" style={{ width: `${ai.ruledConf}%`, background: 'var(--t5)' }} /></div>
                    <div class="hyp-evid">
                      <For each={ai.h3Evid}>{(ev) => (
                        <div class="ev-item"><div class="ev-dot" style={{ color: 'var(--t5)' }} />{ev}</div>
                      )}</For>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-ghost">{ai.stats.restartVal}</div>
                <div class="stat-lbl">{ai.pat.includes('OOM') ? 'OOMKill Events' : ai.pat.includes('IMAGE') ? 'Pull Failures' : 'Restarts'}</div>
                <div class="stat-val" style={{ color: 'var(--crit)' }}>{ai.stats.restartVal}</div>
                <div class="stat-sub">{ai.stats.podsSub}</div>
                <div class="stat-trend up">↑ {props.incident?.occurrences || 1}x occurrences</div>
                <canvas ref={sp1Ref} style={{ display: 'block', width: '100%', height: '26px', 'margin-top': '7px' }} />
              </div>
              <div class="stat-card">
                <div class="stat-ghost">{ai.stats.services ?? '—'}</div>
                <div class="stat-lbl">Related Resources</div>
                <div class="stat-val" style={{ color: ai.stats.services ? 'var(--blue)' : 'var(--t5)' }}>
                  {ai.stats.services ?? '—'}
                </div>
                <div class="stat-sub">{ai.stats.services ? ai.stats.servicesSub : 'no linked resources'}</div>
                <div class="stat-trend up">Blast radius {props.incident?.severity === 'critical' ? '↑' : '—'}</div>
                <canvas ref={sp2Ref} style={{ display: 'block', width: '100%', height: '26px', 'margin-top': '7px' }} />
              </div>
              <div class="stat-card">
                <div class="stat-ghost">{ai.stats.errorRate != null ? `${ai.stats.errorRate}%` : '—'}</div>
                <div class="stat-lbl">Error Rate</div>
                <div class="stat-val" style={{ color: ai.stats.errorRate != null ? (ai.stats.errorRate > 50 ? 'var(--crit)' : 'var(--warn)') : 'var(--t5)' }}>
                  {ai.stats.errorRate != null ? `${ai.stats.errorRate}%` : '—'}
                </div>
                <div class="stat-sub">{ai.stats.errorRate != null ? ai.stats.errorSub : 'no traffic metrics'}</div>
                <div class="stat-trend">{ai.stats.errorRate != null ? '↑ from baseline' : 'metrics unavailable'}</div>
                <canvas ref={sp3Ref} style={{ display: 'block', width: '100%', height: '26px', 'margin-top': '7px' }} />
              </div>
              <div class="stat-card">
                <div class="stat-ghost">{ai.stats.mttrStr}</div>
                <div class="stat-lbl">MTTR Elapsed</div>
                <div class="stat-val" style={{ color: 'var(--brand)' }}>{ai.stats.mttrStr}</div>
                <div class="stat-sub">Target &lt;10min</div>
                <div class="stat-trend down">↓ {ai.stats.mttrPct < 80 ? 'On track' : 'At risk'}</div>
                <canvas ref={sp4Ref} style={{ display: 'block', width: '100%', height: '26px', 'margin-top': '7px' }} />
              </div>
            </div>

            {/* Timeline */}
            <div class="card">
              <div class="card-head">
                <div class="accent-dot brand" />
                <span class="card-title">
                  Incident Timeline <span class="chip new">{ai.timeline.eventCount} event{ai.timeline.eventCount !== 1 ? 's' : ''}</span>
                </span>
                <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': 'auto' }}>{ai.timeline.timeRange}</span>
              </div>
              <div class="timeline-wrap">
                <canvas ref={tlRef} style={{ display: 'block', width: '100%', height: '88px' }} />
              </div>
              {/* Real timeline events */}
              <div style={{ padding: '0 14px 12px', display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                <For each={ai.timeline.events}>{(ev) => (
                  <div style={{ display: 'flex', gap: '10px', 'align-items': 'flex-start', 'font-size': '11.5px' }}>
                    <span style={{ 'font-family': 'var(--mono)', 'font-size': '10px', color: 'var(--t5)', 'white-space': 'nowrap', 'padding-top': '2px', 'min-width': '70px' }}>{ev.time}</span>
                    <div style={{ 'flex': '1' }}>
                      <span style={{ 'font-weight': '600', color: ev.type === 'created' ? 'var(--crit)' : ev.type === 'escalated' ? 'var(--warn)' : 'var(--t2)' }}>{ev.title}</span>
                      <Show when={ev.desc}>
                        <span style={{ color: 'var(--t4)', 'margin-left': '6px' }}>{ev.desc}</span>
                      </Show>
                    </div>
                  </div>
                )}</For>
              </div>
            </div>

            {/* Diagnosis */}
            <div class="card">
              <div class="card-head">
                <div class="accent-dot crit" />
                <span class="card-title">
                  Diagnosis Summary <span class="chip ai">✦ AI Analysis</span>
                </span>
              </div>
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ 'font-size': '12px', color: 'var(--t2)', 'line-height': '1.6', 'margin-bottom': '10px' }}>
                  {ai.diagSummary}
                </div>
                <Show when={ai.recs.length > 0}>
                  <div class="sec-label" style={{ 'margin-bottom': '8px' }}>Recommended Actions</div>
                  <For each={ai.recs.slice(0, 3)}>{(rec: any) => (
                    <div style={{ display: 'flex', gap: '8px', 'align-items': 'flex-start', padding: '6px 0', 'border-bottom': '1px solid var(--b1)', 'font-size': '12px' }}>
                      <span style={{ 'flex-shrink': '0', 'font-size': '10px', padding: '2px 6px', 'border-radius': '4px', 'font-weight': '700', background: rec.risk === 'high' ? 'var(--critBg)' : rec.risk === 'medium' ? 'var(--warnBg)' : 'rgba(5,150,105,.12)', color: rec.risk === 'high' ? 'var(--crit)' : rec.risk === 'medium' ? 'var(--warn)' : 'var(--ok)' }}>{rec.risk?.toUpperCase()}</span>
                      <div>
                        <div style={{ 'font-weight': '600', color: 'var(--t1)' }}>{rec.title}</div>
                        <div style={{ color: 'var(--t4)', 'font-size': '11px', 'margin-top': '2px' }}>{rec.explanation}</div>
                      </div>
                    </div>
                  )}</For>
                </Show>
              </div>
            </div>

            {/* Resource pressure chart */}
            <div class="card">
              <div class="card-head">
                <div class="accent-dot crit" />
                <span class="card-title">Resource Pressure — {incNs()}/{incName()}</span>
                <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', 'font-weight': '700', color: 'var(--crit)', 'margin-left': 'auto' }}>{ai.stats.restartVal} restarts</span>
              </div>
              <div class="mem-wrap">
                <canvas ref={memRef} style={{ display: 'block', width: '100%', height: '120px' }} />
              </div>
            </div>
            </>)}</Show>
          </Show>

          {/* ── LOGS TAB ── */}
          <Show when={activeTab() === 'logs'}>
            <div class="log-block" style={{ flex: '1', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}>
              <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 14px', 'border-bottom': '1px solid var(--b2)', 'flex-shrink': '0' }}>
                <span class="chip new">LIVE</span>
                <span style={{ 'font-size': '11px', color: 'var(--t5)' }}>{incName()} · {incNs()}</span>
                <Show when={logsData().length > 0}>
                  <span style={{ 'font-size': '11px', color: 'var(--t5)' }}>{logsData().length} lines</span>
                </Show>
                <button
                  class="btn ghost"
                  style={{ 'margin-left': 'auto', 'font-size': '11px', padding: '3px 8px' }}
                  disabled={logsLoading()}
                  title="Refresh logs"
                  onClick={() => { setLogsData([]); setLogsRefreshKey(k => k + 1); }}
                >
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M2 8a10 10 0 0118-2.3M22 16a10 10 0 01-18 2.3"/>
                    <path d="M22 4v6h-6M2 20v-6h6"/>
                  </svg>
                </button>
              </div>
              <div class="log-body">
                <Show when={logsLoading()}>
                  <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading logs…</div>
                </Show>
                <Show when={!logsLoading() && logsData().length === 0}>
                  <div style={{ padding: '20px 14px', color: 'var(--t5)', 'font-size': '12px', 'line-height': '1.6' }}>
                    <div>No logs available for <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{incName()}</span>.</div>
                    <div style={{ 'font-size': '11px', color: 'var(--t6)', 'margin-top': '4px' }}>
                      Logs are available for Pod-kind incidents. Try: <span style={{ 'font-family': 'var(--mono)' }}>kubectl logs -n {incNs()} {incName()}</span>
                    </div>
                  </div>
                </Show>
                <Show when={!logsLoading() && logsData().length > 0}>
                  <For each={logsData()}>{(line) => {
                    const ts = line.time ? new Date(line.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                    const lvl = (line.severity === 'critical' || line.type === 'CRASH_LOG') ? 'err'
                      : (line.severity === 'high' || line.type === 'WARN_LOG') ? 'warn'
                      : 'info';
                    return (
                      <div class="log-line">
                        <span class="log-ts">{ts}</span>
                        <span class={`log-level ${lvl}`}>{lvl.toUpperCase()}</span>
                        <span class="log-msg">{line.message || line.value || line.key || ''}</span>
                      </div>
                    );
                  }}</For>
                </Show>
              </div>
            </div>
          </Show>

          {/* ── EVENTS TAB ── */}
          <Show when={activeTab() === 'events'}>
            <div style={{ flex: '1', overflow: 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>

              {/* Scheduling root-cause banner — shown when events indicate scheduling failure */}
              <Show when={schedulingAnalysis()}>
                {(sa) => (
                  <div style={{
                    background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.25)',
                    'border-radius': '8px', padding: '12px 14px',
                    display: 'flex', 'flex-direction': 'column', gap: '8px',
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--crit)" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span style={{ 'font-size': '12px', 'font-weight': '700', color: 'var(--crit)' }}>
                        Scheduling Failure — Root Cause
                      </span>
                    </div>

                    {/* Node capacity summary */}
                    <Show when={sa().nodeTotal > 0}>
                      <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
                        <div style={{ background: 'rgba(220,38,38,.1)', 'border-radius': '6px', padding: '6px 10px', 'flex': '1', 'min-width': '140px' }}>
                          <div style={{ 'font-size': '10px', 'font-weight': '600', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.06em', 'margin-bottom': '2px' }}>Nodes Available</div>
                          <div style={{ 'font-size': '20px', 'font-weight': '700', 'font-family': 'var(--mono)', color: 'var(--crit)' }}>
                            {sa().nodeAvail}/{sa().nodeTotal}
                          </div>
                          <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '1px' }}>0 schedulable nodes</div>
                        </div>
                        <div style={{ background: 'rgba(220,38,38,.1)', 'border-radius': '6px', padding: '6px 10px', 'flex': '1', 'min-width': '140px' }}>
                          <div style={{ 'font-size': '10px', 'font-weight': '600', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.06em', 'margin-bottom': '2px' }}>Blocking Reason</div>
                          <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--warn)' }}>
                            {sa().nodeReason}
                          </div>
                          <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '1px' }}>{sa().resourceType} exhausted on all nodes</div>
                        </div>
                        <Show when={sa().maxGroupSize !== null}>
                          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', 'border-radius': '6px', padding: '6px 10px', 'flex': '1', 'min-width': '140px' }}>
                            <div style={{ 'font-size': '10px', 'font-weight': '600', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.06em', 'margin-bottom': '2px' }}>Cluster Autoscaler</div>
                            <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--warn)' }}>
                              Max size: {sa().maxGroupSize} nodes
                            </div>
                            <div style={{ 'font-size': '10px', color: 'var(--warn)', 'margin-top': '1px' }}>Scale-up blocked — limit reached</div>
                          </div>
                        </Show>
                      </div>
                    </Show>

                    <Show when={sa().preemptFail}>
                      <div style={{ 'font-size': '11px', color: 'var(--t4)', padding: '5px 8px', background: 'rgba(0,0,0,.15)', 'border-radius': '4px', 'font-family': 'var(--mono)' }}>
                        Preemption disabled — no lower-priority pods to evict on any node
                      </div>
                    </Show>

                    {/* Correlation message */}
                    <div style={{ 'font-size': '11px', color: 'var(--t3)', 'line-height': '1.6', 'border-top': '1px solid rgba(220,38,38,.15)', 'padding-top': '8px' }}>
                      <Show when={sa().maxGroupSize !== null}>
                        Pod <span style={{ 'font-family': 'var(--mono)', color: 'var(--t1)' }}>{incName()}</span> cannot be scheduled because
                        all {sa().nodeTotal} nodes have {sa().nodeReason.toLowerCase()} and the cluster autoscaler
                        cannot add new nodes — the node group is already at its maximum size of {sa().maxGroupSize}.
                        This pod will remain Pending until {sa().resourceType} is freed or the node group limit is increased.
                      </Show>
                      <Show when={sa().maxGroupSize === null}>
                        Pod <span style={{ 'font-family': 'var(--mono)', color: 'var(--t1)' }}>{incName()}</span> cannot be scheduled:
                        all {sa().nodeTotal} nodes report {sa().nodeReason.toLowerCase()}.
                        Check whether the pod's resource requests can be reduced, or free capacity on existing nodes.
                      </Show>
                    </div>
                  </div>
                )}
              </Show>

              {/* Events card */}
              <div class="card">
                <div class="card-head">
                  <span class="card-title">Kubernetes Events</span>
                  <span style={{ 'font-size': '11px', color: 'var(--t5)' }}>{incNs()} / {incName()}</span>
                  <Show when={k8sEvents().length > 0}>
                    <span style={{ 'font-size': '10px', color: 'var(--t5)', background: 'var(--s2)', padding: '1px 7px', 'border-radius': '10px' }}>
                      {k8sEvents().filter(e => e.type === 'Warning').length} warnings
                    </span>
                  </Show>
                  <button
                    class="btn ghost"
                    style={{ 'margin-left': 'auto', 'font-size': '11px', padding: '3px 8px' }}
                    disabled={eventsLoading()}
                    title="Refresh events"
                    onClick={() => { setK8sEvents([]); setEventsRefreshKey(k => k + 1); }}
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M2 8a10 10 0 0118-2.3M22 16a10 10 0 01-18 2.3"/>
                      <path d="M22 4v6h-6M2 20v-6h6"/>
                    </svg>
                  </button>
                </div>
                <div class="card-body" style={{ padding: '0' }}>
                  <Show when={eventsLoading()}>
                    <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading events…</div>
                  </Show>
                  <Show when={!eventsLoading()}>
                    <Show when={k8sEvents().length > 0} fallback={
                      <div style={{ padding: '20px 14px', color: 'var(--t5)', 'font-size': '12px', 'line-height': '1.6' }}>
                        <div style={{ 'margin-bottom': '4px' }}>No Kubernetes events found for <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{incName()}</span> in namespace <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{incNs()}</span>.</div>
                        <div style={{ color: 'var(--t6)', 'font-size': '11px' }}>Events expire after 1 hour. Try: <span style={{ 'font-family': 'var(--mono)' }}>kubectl get events -n {incNs()} --sort-by=.lastTimestamp</span></div>
                      </div>
                    }>
                      <For each={k8sEvents()}>{(ev) => (
                        <div class="event-row" style={{
                          'border-left': ev.type === 'Warning' ? '3px solid var(--crit)' : '3px solid var(--b1)',
                        }}>
                          <span class={`event-type ${ev.type === 'Warning' ? 'warning' : 'normal'}`}>{ev.type}</span>
                          <span class="event-reason" style={{ color: ev.reason === 'FailedScheduling' ? 'var(--crit)' : ev.reason === 'NotTriggerScaleUp' ? 'var(--warn)' : undefined }}>{ev.reason}</span>
                          <span class="event-msg">{ev.message}</span>
                          <span class="event-ts">×{ev.count ?? 1} · {ev.lastTime || 'recently'}</span>
                        </div>
                      )}</For>
                    </Show>
                  </Show>
                </div>
              </div>
            </div>
          </Show>

          {/* ── METRICS TAB ── */}
          <Show when={activeTab() === 'metrics'}>
            <div style={{ flex: '1', overflow: 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              <Show when={metricsLoading()}>
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading metrics…</div>
              </Show>
              <Show when={!metricsLoading()}>
                <div class="card">
                  <div class="card-head">
                    <div class="accent-dot brand" />
                    <span class="card-title">CPU Usage</span>
                    <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', 'font-weight': '700', color: 'var(--blue)', 'margin-left': 'auto' }}>
                      {metricsData().find((m: any) => m.type === 'CPU_USAGE' || m.key?.toLowerCase().includes('cpu'))?.value
                        || (resourceMeta().cpu !== '—' ? resourceMeta().cpu : '—')}
                    </span>
                  </div>
                  <div class="spark-row" style={{ padding: '0 14px 14px' }}>
                    <Show when={resourceMeta().cpu !== '—' || metricsData().some((m: any) => m.type === 'CPU_USAGE' || m.key?.toLowerCase().includes('cpu'))}
                      fallback={<div style={{ padding: '20px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '11px', 'font-style': 'italic' }}>No CPU metrics available from cluster — run: kubectl top pod {incName()} -n {incNs()}</div>}>
                      <canvas ref={cpuMetricsRef} style={{ display: 'block', width: '100%', height: '100px' }} />
                    </Show>
                  </div>
                </div>
                <div class="card">
                  <div class="card-head">
                    <div class="accent-dot crit" />
                    <span class="card-title">Memory Usage</span>
                    <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', 'font-weight': '700', color: 'var(--crit)', 'margin-left': 'auto' }}>
                      {metricsData().find((m: any) => m.type === 'MEMORY_USAGE' || m.key?.toLowerCase().includes('memory'))?.value
                        || (resourceMeta().memory !== '—' ? resourceMeta().memory : '—')}
                    </span>
                  </div>
                  <div class="spark-row" style={{ padding: '0 14px 14px' }}>
                    <Show when={resourceMeta().memory !== '—' || metricsData().some((m: any) => m.type === 'MEMORY_USAGE' || m.key?.toLowerCase().includes('memory'))}
                      fallback={<div style={{ padding: '20px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '11px', 'font-style': 'italic' }}>No memory metrics available from cluster — run: kubectl top pod {incName()} -n {incNs()}</div>}>
                      <canvas ref={memMetricsRef} style={{ display: 'block', width: '100%', height: '100px' }} />
                    </Show>
                  </div>
                </div>
                <div class="card">
                  <div class="card-head">
                    <span class="card-title">Resource Summary</span>
                    <Show when={metricsData().length === 0}>
                      <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': 'auto' }}>from incident signals</span>
                    </Show>
                  </div>
                  <div class="card-body">
                    <div class="spark-row" style={{ gap: '0', 'flex-wrap': 'wrap' }}>
                      <Show when={metricsData().length > 0} fallback={
                        <>
                          <div class="spark-card">
                            <div class="spark-label">CPU</div>
                            <div class="spark-val">{resourceMeta().cpu !== '—' ? resourceMeta().cpu : parsedConfig().cpuReq || '—'}</div>
                            <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>limit: {parsedConfig().cpuLim || '—'}</div>
                          </div>
                          <div class="spark-card">
                            <div class="spark-label">Memory</div>
                            <div class="spark-val">{resourceMeta().memory !== '—' ? resourceMeta().memory : parsedConfig().memReq || '—'}</div>
                            <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>limit: {parsedConfig().memLim || '—'}</div>
                          </div>
                          <div class="spark-card">
                            <div class="spark-label">Restarts</div>
                            <div class="spark-val">{String(resourceMeta().restarts || props.incident?.occurrences || '—')}</div>
                            <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>since deploy</div>
                          </div>
                          <div class="spark-card">
                            <div class="spark-label">Occurrences</div>
                            <div class="spark-val">{String(props.incident?.occurrences || '—')}</div>
                            <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>total events</div>
                          </div>
                        </>
                      }>
                        <For each={metricsData().slice(0, 6)}>{(m: any) => (
                          <div class="spark-card">
                            <div class="spark-label">{m.key || m.type || 'Metric'}</div>
                            <div class="spark-val">{String(m.value ?? '—')}</div>
                            <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>
                              {m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.message || ''}
                            </div>
                          </div>
                        )}</For>
                      </Show>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          {/* ── CONFIG TAB ── */}
          <Show when={activeTab() === 'config'}>
            <div style={{ flex: '1', overflow: 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              <Show when={configLoading() || (!rawYaml() && !podDetails())}>
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading configuration…</div>
              </Show>
              <Show when={!configLoading()}>
                {/* Environment Variables — from resource YAML */}
                <div class="card">
                  <div class="card-head">
                    <span class="card-title">Environment Variables</span>
                    <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': 'auto' }}>{incName()}</span>
                  </div>
                  <div class="card-body" style={{ padding: '0' }}>
                    <Show when={parsedConfig().envVars.length > 0} fallback={
                      <div style={{ padding: '16px 14px', color: 'var(--t5)', 'font-size': '12px' }}>
                        {rawYaml() ? 'No environment variables defined in spec.' : 'Load the YAML tab first to populate env vars.'}
                      </div>
                    }>
                      <table class="panel-table" style={{ width: '100%' }}>
                        <thead>
                          <tr><th>Variable</th><th>Value</th><th>Source</th></tr>
                        </thead>
                        <tbody>
                          <For each={parsedConfig().envVars}>{(row) => (
                            <tr>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t1)' }}>{row.k}</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: row.v === '***' ? 'var(--t5)' : 'var(--ok)' }}>{row.v}</td>
                              <td style={{ 'font-size': '11px', color: 'var(--t4)' }}>{row.src}</td>
                            </tr>
                          )}</For>
                        </tbody>
                      </table>
                    </Show>
                  </div>
                </div>
                {/* Resource Limits — from YAML or incident symptoms */}
                <div class="card">
                  <div class="card-head"><span class="card-title">Resource Limits</span></div>
                  <div class="card-body">
                    <table class="panel-table" style={{ width: '100%' }}>
                      <thead><tr><th>Resource</th><th>Request</th><th>Limit</th><th>Current</th></tr></thead>
                      <tbody>
                        <tr>
                          <td>CPU</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: parsedConfig().cpuReq === '—' ? 'var(--t5)' : undefined }}>{parsedConfig().cpuReq === '—' ? 'Not set' : parsedConfig().cpuReq}</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: parsedConfig().cpuLim === '—' ? 'var(--t5)' : undefined }}>{parsedConfig().cpuLim === '—' ? 'Not set' : parsedConfig().cpuLim}</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: resourceMeta().cpu !== '—' ? 'var(--t2)' : 'var(--t5)' }}>{resourceMeta().cpu !== '—' ? resourceMeta().cpu : '—'}</td>
                        </tr>
                        <tr>
                          <td>Memory</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: parsedConfig().memReq === '—' ? 'var(--t5)' : undefined }}>{parsedConfig().memReq === '—' ? 'Not set' : parsedConfig().memReq}</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: parsedConfig().memLim === '—' ? 'var(--t5)' : undefined }}>{parsedConfig().memLim === '—' ? 'Not set' : parsedConfig().memLim}</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: resourceMeta().memory !== '—' ? 'var(--crit)' : 'var(--t5)' }}>{resourceMeta().memory !== '—' ? resourceMeta().memory : '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Health Probes — from YAML */}
                <div class="card">
                  <div class="card-head"><span class="card-title">Health Probes</span></div>
                  <div class="card-body">
                    <Show when={parsedConfig().readPath || parsedConfig().livePath} fallback={
                      <div style={{ color: 'var(--t5)', 'font-size': '12px' }}>
                        {rawYaml() ? 'No probe configuration found in spec.' : 'Load the YAML tab first to populate probe config.'}
                      </div>
                    }>
                      <table class="panel-table" style={{ width: '100%' }}>
                        <thead><tr><th>Probe</th><th>Path</th><th>Port</th><th>Status</th></tr></thead>
                        <tbody>
                          <Show when={parsedConfig().readPath}>
                            <tr>
                              <td>Readiness</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{parsedConfig().readPath}</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{parsedConfig().readPort || '—'}</td>
                              <td style={{ color: probeStatus().readinessFailing ? 'var(--crit)' : 'var(--ok)', 'font-size': '11px', 'font-weight': '600' }}>
                                {probeStatus().readinessFailing ? 'FAILING' : 'OK'}
                              </td>
                            </tr>
                          </Show>
                          <Show when={parsedConfig().livePath}>
                            <tr>
                              <td>Liveness</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{parsedConfig().livePath}</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{parsedConfig().livePort || '—'}</td>
                              <td style={{ color: probeStatus().livenessFailing ? 'var(--crit)' : 'var(--ok)', 'font-size': '11px', 'font-weight': '600' }}>
                                {probeStatus().livenessFailing ? 'FAILING' : 'OK'}
                              </td>
                            </tr>
                          </Show>
                        </tbody>
                      </table>
                    </Show>
                  </div>
                </div>
                {/* Container info from pod details API */}
                <Show when={podDetails()?.containers?.length > 0}>
                  <div class="card">
                    <div class="card-head"><span class="card-title">Containers</span></div>
                    <div class="card-body" style={{ padding: '0' }}>
                      <table class="panel-table" style={{ width: '100%' }}>
                        <thead><tr><th>Name</th><th>Image</th><th>State</th><th>Restarts</th></tr></thead>
                        <tbody>
                          <For each={podDetails().containers}>{(c: any) => (
                            <tr>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{c.name}</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '10px', color: 'var(--t3)', 'max-width': '180px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={c.image}>{c.image}</td>
                              <td style={{ 'font-size': '11px', color: c.state === 'running' ? 'var(--ok)' : 'var(--crit)', 'font-weight': '600' }}>{c.state || '—'}</td>
                              <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: (c.restartCount || 0) > 5 ? 'var(--crit)' : 'var(--t2)' }}>{c.restartCount ?? '—'}</td>
                            </tr>
                          )}</For>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Show>
              </Show>
            </div>
          </Show>

          {/* ── YAML TAB ── */}
          <Show when={activeTab() === 'yaml'}>
            <div class="yaml-block" style={{ flex: '1', overflow: 'hidden', display: 'flex', 'flex-direction': 'column' }}>
              {/* Toolbar */}
              <div class="yaml-toolbar">
                <span style={{ 'font-size': '11px', color: 'var(--t4)', 'font-family': 'var(--mono)' }}>
                  {props.incident?.resource?.kind || 'Pod'} / {incName()}
                </span>
                <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': '8px' }}>{incNs()}</span>
                <div style={{ 'margin-left': 'auto', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                  <Show when={yamlSaveMsg()}>
                    <span style={{ 'font-size': '11px', color: yamlSaveMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>
                      {yamlSaveMsg()}
                    </span>
                  </Show>
                  <Show when={!yamlEditing() && yamlContent() !== '__ERROR__' && yamlContent() !== ''}>
                    <button
                      class="btn ghost"
                      style={{ 'font-size': '11px', padding: '4px 10px' }}
                      onClick={() => { setYamlEdited(yamlContent()); setYamlEditing(true); setYamlSaveMsg(''); }}
                    >
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style={{ 'margin-right': '4px' }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                  </Show>
                  <Show when={yamlEditing()}>
                    <button
                      class="btn ghost"
                      style={{ 'font-size': '11px', padding: '4px 10px' }}
                      onClick={() => { setYamlEditing(false); setYamlSaveMsg(''); }}
                    >
                      Cancel
                    </button>
                    <button
                      class="btn primary"
                      style={{ 'font-size': '11px', padding: '4px 10px' }}
                      disabled={yamlSaving()}
                      onClick={async () => {
                        setYamlSaving(true);
                        setYamlSaveMsg('');
                        try {
                          const kind = props.incident?.resource?.kind || 'Pod';
                          await api.applyResourceYAML(kind, incName(), incNs(), yamlEdited());
                          setYamlContent(yamlEdited());
                          setYamlEditing(false);
                          setYamlSaveMsg('✓ Applied successfully');
                          setTimeout(() => setYamlSaveMsg(''), 4000);
                        } catch (e: any) {
                          setYamlSaveMsg('✗ ' + (e?.message || 'Apply failed'));
                        } finally {
                          setYamlSaving(false);
                        }
                      }}
                    >
                      {yamlSaving() ? 'Applying…' : 'Apply'}
                    </button>
                  </Show>
                </div>
              </div>

              <Show when={yamlLoading()}>
                <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading YAML…</div>
              </Show>

              {/* Edit mode: textarea */}
              <Show when={!yamlLoading() && yamlEditing()}>
                <textarea
                  style={{
                    flex: '1', background: '#0D1521', color: '#E2E8F0',
                    border: '1px solid var(--brand)', outline: 'none',
                    padding: '12px 16px', resize: 'none',
                    'font-family': 'var(--mono)', 'font-size': '11.5px', 'line-height': '1.7',
                    'tab-size': '2',
                  }}
                  value={yamlEdited()}
                  onInput={(e) => setYamlEdited(e.currentTarget.value)}
                  spellcheck={false}
                />
              </Show>

              {/* Error state — YAML could not be fetched from cluster */}
              <Show when={!yamlLoading() && !yamlEditing() && yamlContent() === '__ERROR__'}>
                <div style={{ padding: '24px 16px', display: 'flex', 'flex-direction': 'column', gap: '10px', 'align-items': 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--crit)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span style={{ 'font-size': '13px', 'font-weight': '600', color: 'var(--t2)' }}>Could not load YAML from cluster</span>
                  </div>
                  <div style={{ 'font-size': '12px', color: 'var(--t4)', 'line-height': '1.6' }}>
                    The {props.incident?.resource?.kind || 'resource'} <span style={{ 'font-family': 'var(--mono)', color: 'var(--t2)' }}>{incName()}</span> could not be fetched from namespace <span style={{ 'font-family': 'var(--mono)', color: 'var(--t2)' }}>{incNs()}</span>.<br/>
                    This may mean the resource was deleted, the cluster is unreachable, or you lack read permissions.
                  </div>
                  <div style={{ 'font-size': '11px', color: 'var(--t5)', 'font-family': 'var(--mono)', background: 'var(--bg2)', padding: '8px 12px', 'border-radius': '4px', border: '1px solid var(--b1)' }}>
                    kubectl get {(props.incident?.resource?.kind || 'deployment').toLowerCase()} {incName()} -n {incNs()} -o yaml
                  </div>
                  <button
                    class="btn ghost"
                    style={{ 'font-size': '11px', padding: '5px 12px', 'margin-top': '4px' }}
                    onClick={() => { setYamlContent(''); setYamlLoading(false); }}
                  >
                    Retry
                  </button>
                </div>
              </Show>

              {/* View mode: syntax highlighted */}
              <Show when={!yamlLoading() && !yamlEditing() && yamlContent() !== '__ERROR__'}>
                <div class="yaml-body" style={{ 'white-space': 'pre' }}>
                  {(yamlContent() || '# No YAML loaded').split('\n').map((line: string) => {
                    const trimmed = line.trimStart();
                    const indent = line.length - trimmed.length;
                    const isComment = trimmed.startsWith('#');
                    // Match "key: value" lines (not list items starting with -)
                    const keyMatch = !isComment && /^([a-zA-Z_$][^:]*):(.*)$/.exec(trimmed);
                    if (keyMatch) {
                      const key = keyMatch[1];
                      const val = keyMatch[2];
                      const isStrVal = val.trimStart().startsWith('"') || val.trimStart().startsWith("'");
                      return (
                        <div class="yaml-line">
                          {indent > 0 && <span style={{ 'white-space': 'pre' }}>{' '.repeat(indent)}</span>}
                          <span class="yaml-key">{key}</span>
                          <span style={{ color: 'rgba(148,163,184,.5)' }}>:</span>
                          <Show when={val.trim()}>
                            <span class={isStrVal ? 'yaml-str' : 'yaml-val'}>{val}</span>
                          </Show>
                        </div>
                      );
                    }
                    return (
                      <div class="yaml-line">
                        <span style={{ color: isComment ? 'rgba(148,163,184,.4)' : trimmed.startsWith('-') ? '#CBD5E1' : '#94A3B8' }}>{line}</span>
                      </div>
                    );
                  })}
                </div>
              </Show>
            </div>
          </Show>
        </div>

      </div>

      {/* ═══ RESIZE HANDLE ═══ */}
      <div class="rp-resize-handle" onMouseDown={onResizeHandleMouseDown}>
        <button
          class="rp-collapse-btn"
          title={rpCollapsed() ? 'Expand panel' : 'Collapse panel'}
          onClick={(e) => { e.stopPropagation(); setRpCollapsed(c => !c); }}
        >
          {rpCollapsed() ? '‹' : '›'}
        </button>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div
        class="inc-right"
        style={{
          width: rpCollapsed() ? '0' : `${rightWidth()}px`,
          'min-width': rpCollapsed() ? '0' : undefined,
          flex: 'none',
          overflow: 'hidden',
          transition: rpCollapsed() ? 'width 0.2s ease' : undefined,
        }}
      >
        <div class="rp-tabs">
          {(['fix', 'topology', 'runbook', 'chat', 'retro'] as const).map(tab => (
            <button
              class={`rp-tab${activeRPTab() === tab ? ' on' : ''}`}
              onClick={() => setActiveRPTab(tab)}
            >
              {tab === 'chat' ? '✦ Chat' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div class="rp-body">

          {/* ── FIX TAB ── */}
          <Show when={activeRPTab() === 'fix'}>
            {/* Health ring */}
            <div class="ring-wrap">
              <canvas ref={rpRingRef} width="110" height="110" style={{ display: 'block' }} />
              <div class="ring-score" style={{ color: ringColor() }}>{healthScore()}</div>
              <div class="ring-label">Health Score / 100</div>
              <div class="ring-sub">{healthLabel()}</div>
            </div>
            {/* MTTR */}
            <div class="mttr-box">
              <div class="mttr-row">
                <span class="mttr-key">MTTR Elapsed</span>
                <span class="mttr-val">{rpTimerStr()}</span>
              </div>
              <div class="mttr-track"><div class="mttr-fill" style={{ width: `${Math.min(100, Math.round((secs() / 600) * 100))}%`, background: secs() > 600 ? 'var(--crit)' : secs() > 300 ? 'var(--warn)' : 'var(--ok)' }} /></div>
              <div class="mttr-hint">Target &lt;10 min · {incSev()} incident</div>
            </div>

            {/* Orkas AI — coming soon teaser */}
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{
                background: 'var(--brandDim)', border: '1px solid var(--brand)30',
                'border-radius': '10px', padding: '14px 14px 12px',
                display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '8px',
              }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                  <img src="/orkas-logo.png" alt="Orkas AI" style={{ height: '18px', width: 'auto' }} />
                  <span style={{ 'font-size': '12px', 'font-weight': '700', color: 'var(--brand)' }}>Orkas AI</span>
                  <span style={{ 'font-size': '9px', 'font-weight': '700', padding: '1px 7px', 'border-radius': 'var(--r99)', background: 'var(--brand)', color: '#fff', 'letter-spacing': '.04em', 'text-transform': 'uppercase' }}>Coming Soon</span>
                </div>
                <div style={{ 'font-size': '11px', color: 'var(--t3)', 'text-align': 'center', 'line-height': '1.6', 'max-width': '220px' }}>
                  Full AI capabilities will be available soon — graph-grounded fix recommendations and instant incident briefs.
                </div>
                <div style={{ display: 'flex', 'flex-direction': 'column', gap: '4px', width: '100%' }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'font-size': '10.5px', color: 'var(--t4)', opacity: '0.6' }}>
                    <img src="/orkas-logo.png" alt="" style={{ height: '11px', width: 'auto', opacity: '0.5' }} />
                    <span>Analyze &amp; Fix with Orkas AI</span>
                  </div>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'font-size': '10.5px', color: 'var(--t4)', opacity: '0.6' }}>
                    <img src="/orkas-logo.png" alt="" style={{ height: '11px', width: 'auto', opacity: '0.5' }} />
                    <span>Generate Incident Brief</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Brief result card */}
            <Show when={briefResult()}>
              {(brief) => (
                <div style={{ padding: '0 14px 14px' }}>
                  <div style={{
                    background: 'var(--violetBg)', border: '1px solid var(--violet)',
                    'border-radius': '8px', padding: '12px',
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'margin-bottom': '8px' }}>
                      <span style={{ 'font-size': '11px', 'font-weight': '600', color: 'var(--violet)' }}>✦ Incident Brief</span>
                      <Show when={brief().pattern_matched}>
                        <span class="chip ai" style={{ 'font-size': '9px', padding: '1px 5px' }}>{brief().pattern_matched}</span>
                      </Show>
                      <span style={{ 'margin-left': 'auto', 'font-size': '10px', color: 'var(--t3)' }}>
                        {Math.round((brief().confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                    <p style={{ 'font-size': '11.5px', color: 'var(--t1)', 'line-height': '1.6', margin: '0 0 8px' }}>
                      {brief().brief}
                    </p>
                    <Show when={(brief().blast_radius_count || 0) > 0}>
                      <div style={{ 'font-size': '10.5px', color: 'var(--warn)', 'margin-bottom': '8px' }}>
                        ⚠ Blast radius: {brief().blast_radius_count} affected resource{brief().blast_radius_count !== 1 ? 's' : ''}
                      </div>
                    </Show>
                    <Show when={brief().remediation_plan?.steps?.length}>
                      <div style={{ 'font-size': '10.5px', 'font-weight': '600', color: 'var(--t2)', 'margin-bottom': '4px' }}>Remediation Steps</div>
                      <For each={brief().remediation_plan!.steps}>{(step, i) => (
                        <div style={{ display: 'flex', gap: '6px', 'align-items': 'flex-start', 'margin-bottom': '6px' }}>
                          <span style={{ 'font-size': '10px', color: 'var(--t4)', 'min-width': '16px', 'padding-top': '1px' }}>{i() + 1}.</span>
                          <div style={{ flex: '1' }}>
                            <div style={{ 'font-size': '11px', color: 'var(--t1)' }}>{step.action}</div>
                            <Show when={step.command}>
                              <div
                                class="cmd-line"
                                style={{ cursor: 'pointer', 'margin-top': '3px' }}
                                onClick={() => copyCmd(step.command!)}
                                title="Click to copy"
                              >
                                <span class="cmd-text" style={{ flex: '1', 'word-break': 'break-all' }}>{step.command}</span>
                                <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                                </svg>
                                <Show when={copiedCmd() === step.command}>
                                  <span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span>
                                </Show>
                              </div>
                            </Show>
                            <span style={{
                              'font-size': '9.5px',
                              color: step.risk_level === 'high' ? 'var(--crit)' : step.risk_level === 'medium' ? 'var(--warn)' : 'var(--ok)',
                            }}>
                              {step.risk_level === 'high' ? 'High risk' : step.risk_level === 'medium' ? 'Medium risk' : 'Low risk'}
                            </span>
                          </div>
                        </div>
                      )}</For>
                    </Show>
                    <Show when={brief().model_used}>
                      <div style={{ 'font-size': '9.5px', color: 'var(--t5)', 'margin-top': '4px' }}>
                        Model: {brief().model_used}{brief().latency_ms ? ` · ${brief().latency_ms}ms` : ''}
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </Show>

            {/* AI-generated fixes */}
            <Show when={aiFixes().length > 0}>
              <div class="sec-label" style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                AI Recommendations
                <span class="chip ai" style={{ 'font-size': '9px', padding: '1px 5px' }}>
                  {aiFixFallback() ? '⚙ Pattern-based' : '✦ Orkas AI'}
                </span>
              </div>
              <Show when={aiFixFallback()}>
                <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-bottom': '8px', display: 'flex', 'align-items': 'center', gap: '5px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  AI parsing failed — showing pattern-based recommendations
                </div>
              </Show>
              <For each={aiFixes()}>{(fix, i) => (
                <div class="fix-card">
                  <div class="fix-head">
                    <div class="fix-icon" style={{ background: i() === 0 ? 'rgba(251,191,36,.15)' : i() === 1 ? 'var(--violetBg)' : i() === 2 ? 'rgba(8,145,178,.12)' : 'rgba(16,185,129,.12)' }}>
                      {i() === 0 ? '⚡' : i() === 1 ? '🔧' : i() === 2 ? '📋' : '🛡'}
                    </div>
                    <span class="fix-title">{fix.title}</span>
                    <span class="fix-conf" style={{ color: fix.risk === 'high' ? 'var(--crit)' : fix.risk === 'medium' ? 'var(--warn)' : 'var(--ok)' }}>
                      {fix.risk === 'high' ? 'Risky' : fix.risk === 'medium' ? 'Moderate' : 'Safe'}
                    </span>
                  </div>
                  <div class="fix-body">
                    <div class="fix-desc">{fix.explanation}</div>
                    <For each={fix.kubectl_commands}>{(cmd) => (
                      <div
                        class="cmd-line"
                        style={{ cursor: 'pointer', 'margin-top': '4px' }}
                        onClick={() => copyCmd(cmd)}
                        title="Click to copy"
                      >
                        <span class="cmd-text" style={{ 'flex': '1', 'word-break': 'break-all' }}>{cmd}</span>
                        <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        <Show when={copiedCmd() === cmd}>
                          <span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span>
                        </Show>
                      </div>
                    )}</For>
                  </div>
                </div>
              )}</For>
            </Show>

            {/* AI fix error banner */}
            <Show when={aiFixError() && aiFixes().length === 0}>
              <div style={{ margin: '0 14px 10px', padding: '8px 12px', background: 'var(--warnBg)', border: '1px solid var(--warnBdr)', 'border-radius': '6px', display: 'flex', 'align-items': 'flex-start', gap: '7px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2" style={{ 'flex-shrink': '0', 'margin-top': '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span style={{ 'font-size': '11px', color: 'var(--t2)', 'line-height': '1.5' }}>{aiFixError()}</span>
              </div>
            </Show>

            {/* Default fix cards when no AI fixes yet */}
            <Show when={aiFixes().length === 0}>
              {/* ── Scheduling incident: node-capacity fix cards ── */}
              <Show when={schedulingAnalysis()}>
                {(sa) => (<>
                  <div class="sec-label" style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                    Scheduling Fix Actions
                    <span class="chip" style={{ background: 'rgba(220,38,38,.12)', color: 'var(--crit)', 'font-size': '9px', padding: '1px 5px' }}>Unschedulable</span>
                  </div>

                  {/* Scheduling context summary */}
                  <div style={{ padding: '8px 10px', background: 'rgba(220,38,38,.05)', border: '1px solid rgba(220,38,38,.15)', 'border-radius': '6px', 'font-size': '11px', color: 'var(--t3)', 'line-height': '1.6', 'margin-bottom': '4px' }}>
                    <span style={{ 'font-weight': '600', color: 'var(--crit)' }}>Root cause: </span>
                    {sa().nodeTotal > 0
                      ? `All ${sa().nodeTotal} nodes have ${sa().nodeReason.toLowerCase()}${sa().maxGroupSize !== null ? ` — autoscaler at max (${sa().maxGroupSize} nodes)` : ''}.`
                      : 'No schedulable nodes available for this pod.'
                    }
                    {' '}Pod will stay Pending until {sa().resourceType} is freed or cluster capacity increases.
                  </div>

                  {/* Fix 1: Inspect pod resource requests */}
                  <div class="fix-card">
                    <div class="fix-head">
                      <div class="fix-icon" style={{ background: 'rgba(251,191,36,.15)' }}>🔍</div>
                      <span class="fix-title">Inspect pod resource requests</span>
                      <span class="fix-conf" style={{ color: 'var(--ok)' }}>Safe</span>
                    </div>
                    <div class="fix-body">
                      <div class="fix-desc">
                        Check what {sa().resourceType} this pod is requesting. If requests are higher than available node capacity, reduce them in the Deployment spec.
                      </div>
                      {[
                        `kubectl describe pod ${incName()} -n ${incNs()} | grep -A5 "Requests:"`,
                        `kubectl get pod ${incName()} -n ${incNs()} -o jsonpath='{.spec.containers[*].resources}'`,
                      ].map(cmd => (
                        <div class="cmd-line" style={{ cursor: 'pointer', 'margin-top': '4px' }} onClick={() => copyCmd(cmd)} title="Click to copy">
                          <span class="cmd-text" style={{ flex: '1', 'word-break': 'break-all' }}>{cmd}</span>
                          <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          <Show when={copiedCmd() === cmd}><span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span></Show>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fix 2: Check node capacity */}
                  <div class="fix-card">
                    <div class="fix-head">
                      <div class="fix-icon" style={{ background: 'rgba(8,145,178,.12)' }}>📊</div>
                      <span class="fix-title">Check node {sa().resourceType} capacity</span>
                      <span class="fix-conf" style={{ color: 'var(--ok)' }}>Safe</span>
                    </div>
                    <div class="fix-body">
                      <div class="fix-desc">
                        All {sa().nodeTotal} nodes report {sa().nodeReason.toLowerCase()}. Check current allocations to find where capacity went.
                      </div>
                      {[
                        `kubectl describe nodes | grep -A 6 "Allocated resources"`,
                        `kubectl top nodes`,
                        `kubectl get pods -A --field-selector=status.phase=Running -o wide | grep -v Completed`,
                      ].map(cmd => (
                        <div class="cmd-line" style={{ cursor: 'pointer', 'margin-top': '4px' }} onClick={() => copyCmd(cmd)} title="Click to copy">
                          <span class="cmd-text" style={{ flex: '1', 'word-break': 'break-all' }}>{cmd}</span>
                          <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          <Show when={copiedCmd() === cmd}><span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span></Show>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fix 3: Cluster autoscaler limit — shown when max group size is hit */}
                  <Show when={sa().maxGroupSize !== null}>
                    <div class="fix-card">
                      <div class="fix-head">
                        <div class="fix-icon" style={{ background: 'rgba(245,158,11,.12)' }}>⚠</div>
                        <span class="fix-title">Cluster autoscaler at max ({sa().maxGroupSize} nodes)</span>
                        <span class="fix-conf" style={{ color: 'var(--warn)' }}>Moderate</span>
                      </div>
                      <div class="fix-body">
                        <div class="fix-desc">
                          The node group is at its maximum size ({sa().maxGroupSize}). The autoscaler triggered {sa().scaleCount > 0 ? `×${sa().scaleCount}` : ''} but could not add nodes.
                          Options: (1) increase the max node count in your cloud provider, (2) scale down other workloads, (3) reduce this pod's resource requests.
                        </div>
                        {[
                          `kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml`,
                          `kubectl get events -n kube-system --field-selector reason=NotTriggerScaleUp --sort-by=.lastTimestamp | tail -20`,
                        ].map(cmd => (
                          <div class="cmd-line" style={{ cursor: 'pointer', 'margin-top': '4px' }} onClick={() => copyCmd(cmd)} title="Click to copy">
                            <span class="cmd-text" style={{ flex: '1', 'word-break': 'break-all' }}>{cmd}</span>
                            <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            <Show when={copiedCmd() === cmd}><span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span></Show>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Show>

                  {/* Fix 4: Reduce resource requests / right-size */}
                  <div class="fix-card">
                    <div class="fix-head">
                      <div class="fix-icon" style={{ background: 'rgba(16,185,129,.1)' }}>🔧</div>
                      <span class="fix-title">Right-size {sa().resourceType} requests</span>
                      <span class="fix-conf" style={{ color: 'var(--warn)' }}>Moderate</span>
                    </div>
                    <div class="fix-body">
                      <div class="fix-desc">
                        Patch the Deployment to reduce {sa().resourceType.toLowerCase()} requests so the pod fits on existing nodes. Use <code style={{ 'font-family': 'var(--mono)' }}>kubectl top pods</code> to size correctly.
                      </div>
                      {(() => {
                        const depName = incName().replace(/-[a-z0-9]+-[a-z0-9]+$/, '');
                        return [
                          `kubectl top pods -n ${incNs()} --sort-by=cpu`,
                          sa().resourceType === 'CPU'
                            ? `kubectl set resources deploy/${depName} -n ${incNs()} --requests=cpu=100m --limits=cpu=500m`
                            : `kubectl set resources deploy/${depName} -n ${incNs()} --requests=memory=128Mi --limits=memory=512Mi`,
                          `kubectl get events -n ${incNs()} --field-selector reason=FailedScheduling --sort-by=.lastTimestamp | tail -10`,
                        ].map(cmd => (
                          <div class="cmd-line" style={{ cursor: 'pointer', 'margin-top': '4px' }} onClick={() => copyCmd(cmd)} title="Click to copy">
                            <span class="cmd-text" style={{ flex: '1', 'word-break': 'break-all' }}>{cmd}</span>
                            <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            <Show when={copiedCmd() === cmd}><span style={{ 'font-size': '9px', color: 'var(--ok)', 'margin-left': '4px' }}>✓</span></Show>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </>)}
              </Show>

              {/* ── Non-scheduling incidents: generic fix cards ── */}
              <Show when={!schedulingAnalysis()}>
                <div class="sec-label">Quick Actions</div>
                <Show when={aiData()?.recs?.length} fallback={
                  <div class="fix-card">
                    <div class="fix-head">
                      <div class="fix-icon" style={{ background: 'rgba(251,191,36,.15)' }}>⚡</div>
                      <span class="fix-title">Restart {incNs()}/{incName()}</span>
                      <span class="fix-conf" style={{ color: 'var(--ok)' }}>Safe</span>
                    </div>
                    <div class="fix-body">
                      <div class="fix-desc">Delete pod to trigger fresh recreation by its controller.</div>
                      <div class="cmd-line" style={{ cursor: 'pointer' }} onClick={() => copyCmd(`kubectl delete pod ${incName()} -n ${incNs()}`)}>
                        <span class="cmd-text">kubectl delete pod {incName()} -n {incNs()}</span>
                        <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </div>
                      <div class="cmd-line" style={{ cursor: 'pointer', 'margin-top': '4px' }} onClick={() => copyCmd(`kubectl logs ${incName()} -n ${incNs()} --previous --tail=100`)}>
                        <span class="cmd-text">kubectl logs {incName()} -n {incNs()} --previous --tail=100</span>
                        <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </div>
                    </div>
                  </div>
                }>
                  <For each={(aiData()?.recs || []).slice(0, 3)}>{(rec: any, i) => (
                    <div class="fix-card">
                      <div class="fix-head">
                        <div class="fix-icon" style={{ background: i() === 0 ? 'rgba(251,191,36,.15)' : i() === 1 ? 'var(--violetBg)' : 'rgba(8,145,178,.12)' }}>
                          {i() === 0 ? '⚡' : i() === 1 ? '🔧' : '📋'}
                        </div>
                        <span class="fix-title">{rec.title}</span>
                        <span class="fix-conf" style={{ color: rec.risk === 'high' ? 'var(--crit)' : rec.risk === 'medium' ? 'var(--warn)' : 'var(--ok)' }}>
                          {rec.risk === 'high' ? 'Risky' : rec.risk === 'medium' ? 'Moderate' : 'Safe'}
                        </span>
                      </div>
                      <div class="fix-body">
                        <div class="fix-desc">{rec.explanation}</div>
                        <Show when={i() === 0}>
                          <div class="cmd-line" style={{ cursor: 'pointer' }} onClick={() => copyCmd(`kubectl delete pod ${incName()} -n ${incNs()}`)}>
                            <span class="cmd-text">kubectl delete pod {incName()} -n {incNs()}</span>
                            <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}</For>
                </Show>
              </Show>
            </Show>

            {/* ── Feedback & Resolution ── */}
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--b1)',
                'border-radius': '8px', padding: '12px 14px',
              }}>
                <div style={{ 'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em', 'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '10px' }}>
                  Was this fix helpful?
                </div>

                <Show when={!feedbackDone()}>
                  <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                    {/* ✅ Worked */}
                    <button
                      style={{
                        display: 'flex', 'align-items': 'center', gap: '5px',
                        padding: '6px 11px', 'border-radius': '6px', border: '1px solid var(--b1)',
                        background: feedbackSubmitting() === 'worked' ? 'rgba(34,197,94,.15)' : 'var(--bg1)',
                        color: 'var(--ok)', 'font-size': '11px', 'font-weight': '600', cursor: 'pointer',
                        opacity: feedbackSubmitting() && feedbackSubmitting() !== 'worked' ? '0.4' : '1',
                        transition: 'all 0.15s',
                      }}
                      disabled={!!feedbackSubmitting()}
                      onClick={() => handleFeedback('worked')}
                      title="Fix worked — train the model to recommend this first"
                    >
                      ✅ Worked
                    </button>
                    {/* ❌ Didn't Work */}
                    <button
                      style={{
                        display: 'flex', 'align-items': 'center', gap: '5px',
                        padding: '6px 11px', 'border-radius': '6px', border: '1px solid var(--b1)',
                        background: feedbackSubmitting() === 'not_worked' ? 'rgba(220,38,38,.12)' : 'var(--bg1)',
                        color: 'var(--crit)', 'font-size': '11px', 'font-weight': '600', cursor: 'pointer',
                        opacity: feedbackSubmitting() && feedbackSubmitting() !== 'not_worked' ? '0.4' : '1',
                        transition: 'all 0.15s',
                      }}
                      disabled={!!feedbackSubmitting()}
                      onClick={() => handleFeedback('not_worked')}
                      title="Fix didn't work — deprioritise this recommendation"
                    >
                      ❌ Didn't Work
                    </button>
                    {/* ⚠️ Incorrect Cause */}
                    <button
                      style={{
                        display: 'flex', 'align-items': 'center', gap: '5px',
                        padding: '6px 11px', 'border-radius': '6px', border: '1px solid var(--b1)',
                        background: feedbackSubmitting() === 'unknown' ? 'rgba(234,179,8,.12)' : 'var(--bg1)',
                        color: 'var(--warn)', 'font-size': '11px', 'font-weight': '600', cursor: 'pointer',
                        opacity: feedbackSubmitting() && feedbackSubmitting() !== 'unknown' ? '0.4' : '1',
                        transition: 'all 0.15s',
                      }}
                      disabled={!!feedbackSubmitting()}
                      onClick={() => handleFeedback('unknown')}
                      title="Root cause was misidentified"
                    >
                      ⚠️ Incorrect Cause
                    </button>
                  </div>
                </Show>

                <Show when={feedbackDone()}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '6px 0' }}>
                    <span style={{ 'font-size': '15px' }}>
                      {feedbackDone() === 'worked' ? '✅' : feedbackDone() === 'not_worked' ? '❌' : '⚠️'}
                    </span>
                    <div>
                      <div style={{ 'font-size': '11.5px', 'font-weight': '600', color: 'var(--t1)' }}>
                        {feedbackDone() === 'worked' ? 'Feedback recorded — model updated' :
                         feedbackDone() === 'not_worked' ? 'Feedback recorded — fix deprioritised' :
                         'Feedback recorded — cause flagged for review'}
                      </div>
                      <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>
                        The learning engine will adjust recommendations for similar incidents
                      </div>
                    </div>
                    <button
                      style={{ 'margin-left': 'auto', 'font-size': '10px', color: 'var(--t5)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                      onClick={() => setFeedbackDone(null)}
                      title="Change feedback"
                    >
                      undo
                    </button>
                  </div>
                </Show>

                {/* Mark Resolved */}
                <div style={{ 'margin-top': '10px', 'padding-top': '10px', 'border-top': '1px solid var(--b1)', display: 'flex', 'align-items': 'center', gap: '8px' }}>
                  <Show when={!resolved()}>
                    <button
                      style={{
                        flex: '1', padding: '7px 12px', 'border-radius': '6px',
                        border: '1px solid var(--b1)',
                        background: resolving() ? 'rgba(34,197,94,.08)' : 'var(--bg1)',
                        color: 'var(--t2)', 'font-size': '11.5px', 'font-weight': '600',
                        cursor: resolving() ? 'wait' : 'pointer', transition: 'all 0.15s',
                        display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '6px',
                      }}
                      disabled={resolving()}
                      onClick={handleResolveIncident}
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      {resolving() ? 'Resolving…' : 'Mark Resolved'}
                    </button>
                  </Show>
                  <Show when={resolved()}>
                    <div style={{ flex: '1', display: 'flex', 'align-items': 'center', gap: '6px', padding: '7px 0' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--ok)" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span style={{ 'font-size': '11.5px', 'font-weight': '600', color: 'var(--ok)' }}>Incident Resolved</span>
                    </div>
                  </Show>
                  <div style={{ 'font-size': '10px', color: 'var(--t5)', 'text-align': 'right', 'line-height': '1.4' }}>
                    Triggers learning update<br/>in the Knowledge Bank
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* ── TOPOLOGY TAB ── */}
          <Show when={activeRPTab() === 'topology'}>
            <div style={{ padding: '14px', 'font-size': '12px', color: 'var(--t3)' }}>
              <div style={{ 'font-weight': '600', color: 'var(--t1)', 'margin-bottom': '10px' }}>Related Resources</div>
              <Show when={resourceMeta().related.length > 0} fallback={
                <div style={{ color: 'var(--t5)', 'font-size': '11px', padding: '8px 0' }}>
                  {incSev() === 'critical' ? 'Isolated failure — no related resources detected' : 'No dependent services identified for this incident'}
                </div>
              }>
                <For each={resourceMeta().related}>{(r: any) => (
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '7px 0', 'border-bottom': '1px solid var(--b1)' }}>
                    <div style={{
                      width: '7px', height: '7px', 'border-radius': '50%', 'flex-shrink': '0',
                      background: r.kind === 'Pod' ? 'var(--crit)' : r.kind === 'Service' ? 'var(--warn)' : 'var(--blue)',
                    }} />
                    <span style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t2)', flex: '1' }}>
                      {incName()} → {r.name}
                    </span>
                    <span style={{ 'font-size': '10px', color: 'var(--t5)', background: 'var(--s2)', padding: '1px 6px', 'border-radius': '3px' }}>{r.kind}</span>
                  </div>
                )}</For>
              </Show>
              <Show when={resourceMeta().blastRadius.length > 0}>
                <div style={{ 'margin-top': '14px', 'font-weight': '600', color: 'var(--t1)', 'margin-bottom': '8px' }}>Blast Radius</div>
                <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                  <For each={resourceMeta().blastRadius}>{(name: string) => (
                    <span style={{ padding: '3px 8px', background: 'rgba(220,38,38,.1)', color: 'var(--crit)', 'border-radius': '4px', 'font-size': '11px', 'font-family': 'var(--mono)' }}>{name}</span>
                  )}</For>
                </div>
              </Show>
              <Show when={resourceMeta().related.length === 0 && resourceMeta().blastRadius.length === 0}>
                <div style={{ 'margin-top': '10px', padding: '8px', background: 'var(--s2)', 'border-radius': '6px', 'font-size': '11px', color: 'var(--t4)' }}>
                  Blast radius contained to {incNs()} namespace. No cross-service impact detected.
                </div>
              </Show>
            </div>
          </Show>

          {/* ── RUNBOOK TAB ── */}
          <Show when={activeRPTab() === 'runbook'}>
            <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>

              {/* Steps list — scrollable upper section */}
              <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px 14px 0' }}>
                <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '12px' }}>
                  <span style={{ 'font-weight': '700', color: 'var(--t1)', 'font-size': '12px' }}>Automated Runbook</span>
                  <span class="chip ai">✦ AI Generated</span>
                  <Show when={runbookDone()}>
                    <span style={{
                      'margin-left': 'auto', 'font-size': '10px', 'font-weight': '700',
                      color: runbookResults().some(r => r.status === 'failed') ? 'var(--crit)' : 'var(--ok)',
                    }}>
                      {runbookResults().some(r => r.status === 'failed')
                        ? `✗ ${runbookResults().filter(r => r.status === 'failed').length} step(s) failed`
                        : `✓ All ${runbookResults().length} steps passed`}
                    </span>
                  </Show>
                </div>

                {/* Render steps from memo — with live status badges */}
                <For each={runbookSteps()}>
                  {(step, i) => {
                    const result = () => runbookResults().find(r => r.stepNum === i() + 1);
                    const isRunning = () => runbookRunning() && runbookStep() === i() + 1;
                    const isDone   = () => !!result();
                    const isFailed = () => result()?.status === 'failed';
                    const isPending = () => !isRunning() && !isDone();
                    return (
                      <div style={{
                        display: 'flex', gap: '10px', 'margin-bottom': '8px',
                        padding: '8px 10px', 'border-radius': '6px',
                        background: isRunning() ? 'rgba(34,211,238,.05)' : isDone() ? (isFailed() ? 'rgba(220,38,38,.04)' : 'rgba(34,197,94,.04)') : 'var(--bg2)',
                        border: `1px solid ${isRunning() ? 'rgba(34,211,238,.3)' : isDone() ? (isFailed() ? 'rgba(220,38,38,.2)' : 'rgba(34,197,94,.2)') : 'var(--b1)'}`,
                        transition: 'all 0.2s',
                      }}>
                        {/* Step number / status icon */}
                        <div style={{
                          width: '22px', height: '22px', 'border-radius': '50%', 'flex-shrink': '0',
                          display: 'flex', 'align-items': 'center', 'justify-content': 'center',
                          'font-size': '10px', 'font-weight': '700',
                          background: isRunning() ? 'var(--brand)' : isDone() ? (isFailed() ? 'var(--crit)' : 'var(--ok)') : 'var(--b2)',
                          color: isRunning() || isDone() ? '#fff' : 'var(--t4)',
                          'margin-top': '1px',
                        }}>
                          <Show when={isRunning()}>
                            <div style={{
                              width: '8px', height: '8px', 'border-radius': '50%',
                              border: '2px solid rgba(255,255,255,.4)', 'border-top-color': '#fff',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                          </Show>
                          <Show when={isDone() && !isFailed()}>✓</Show>
                          <Show when={isFailed()}>✗</Show>
                          <Show when={isPending()}>{i() + 1}</Show>
                        </div>

                        {/* Content */}
                        <div style={{ flex: '1', 'min-width': '0' }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
                            <span style={{ 'font-size': '11.5px', 'font-weight': '600', color: isRunning() ? 'var(--brand)' : isDone() ? 'var(--t1)' : 'var(--t3)' }}>
                              {step.title}
                            </span>
                            <Show when={isDone()}>
                              <span style={{ 'margin-left': 'auto', 'font-size': '9.5px', color: 'var(--t5)', 'font-family': 'var(--mono)', 'flex-shrink': '0' }}>
                                {result()?.durationMs}ms
                              </span>
                            </Show>
                            <Show when={isRunning()}>
                              <span style={{ 'margin-left': 'auto', 'font-size': '9.5px', color: 'var(--brand)', 'flex-shrink': '0' }}>running…</span>
                            </Show>
                          </div>
                          <div style={{
                            'font-size': '10px', 'font-family': 'var(--mono)', color: 'var(--t5)',
                            'margin-top': '3px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap',
                          }}>
                            $ {step.cmd}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>

                {/* Run / Re-run button */}
                <div style={{ padding: '10px 0 14px' }}>
                  <button
                    class="btn-full brand"
                    disabled={runbookRunning()}
                    style={{ opacity: runbookRunning() ? '0.65' : '1', display: 'flex', 'align-items': 'center', 'justify-content': 'center', gap: '8px' }}
                    onClick={async () => {
                      if (runbookRunning()) return;
                      const steps = runbookSteps();
                      setRunbookRunning(true);
                      setRunbookDone(false);
                      setRunbookResults([]);
                      setRunbookStep(0);

                      for (let i = 0; i < steps.length; i++) {
                        const s = steps[i];
                        const stepNum = i + 1;
                        setRunbookStep(stepNum);

                        // Add "running" placeholder
                        setRunbookResults(prev => [...prev, {
                          stepNum, title: s.title, cmd: s.cmd,
                          output: '', exitCode: 0, durationMs: 0, status: 'running',
                        }]);

                        try {
                          const res = await api.execRunbookStep(s.cmd);
                          setRunbookResults(prev => prev.map(r =>
                            r.stepNum === stepNum
                              ? { ...r, output: res.output, exitCode: res.exitCode, durationMs: res.durationMs, status: res.exitCode === 0 ? 'success' : 'failed' }
                              : r,
                          ));
                        } catch (err: any) {
                          setRunbookResults(prev => prev.map(r =>
                            r.stepNum === stepNum
                              ? { ...r, output: err?.message || 'Request failed', exitCode: 1, status: 'failed' }
                              : r,
                          ));
                        }
                      }

                      setRunbookRunning(false);
                      setRunbookStep(0);
                      setRunbookDone(true);
                    }}
                  >
                    <Show when={!runbookRunning()} fallback={
                      <><div style={{ width: '11px', height: '11px', 'border-radius': '50%', border: '2px solid rgba(255,255,255,.4)', 'border-top-color': '#fff', animation: 'spin 0.7s linear infinite' }} /> Running step {runbookStep()} of {runbookSteps().length}…</>
                    }>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      {runbookDone() ? 'Re-run Runbook' : 'Run Automated Runbook'}
                    </Show>
                  </button>
                </div>
              </div>

              {/* ── Execution Summary Panel (terminal-style) ── */}
              <Show when={runbookResults().length > 0}>
                {/* Divider */}
                <div style={{ 'border-top': '1px solid var(--b1)', 'flex-shrink': '0' }} />

                <div style={{
                  'flex-shrink': '0', display: 'flex', 'flex-direction': 'column',
                  height: '280px', background: '#0D1521',
                }}>
                  {/* Panel toolbar */}
                  <div style={{
                    display: 'flex', 'align-items': 'center', gap: '8px',
                    padding: '6px 12px', background: '#111B2A',
                    'border-bottom': '1px solid rgba(255,255,255,.07)', 'flex-shrink': '0',
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', 'border-radius': '50%', background: runbookRunning() ? '#22C55E' : runbookResults().some(r => r.status === 'failed') ? '#EF4444' : '#22C55E' }} />
                      <span style={{ 'font-size': '10.5px', 'font-weight': '700', color: '#94A3B8', 'letter-spacing': '0.04em', 'text-transform': 'uppercase' }}>
                        Execution Summary
                      </span>
                    </div>
                    <Show when={runbookRunning()}>
                      <span style={{ 'font-size': '10px', color: '#34D399', 'font-family': 'var(--mono)' }}>
                        ● running
                      </span>
                    </Show>
                    <Show when={runbookDone()}>
                      <span style={{ 'font-size': '10px', color: runbookResults().some(r => r.status === 'failed') ? '#F87171' : '#34D399', 'font-family': 'var(--mono)' }}>
                        {runbookResults().some(r => r.status === 'failed') ? '✗ failed' : '✓ complete'}
                      </span>
                    </Show>
                    <div style={{ 'margin-left': 'auto', display: 'flex', gap: '6px' }}>
                      {/* Copy all output */}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px 5px', 'border-radius': '3px', 'font-size': '10px' }}
                        title="Copy all output"
                        onClick={() => {
                          const text = runbookResults().map(r =>
                            `## Step ${r.stepNum}: ${r.title}\n$ ${r.cmd}\n\n${r.output}\n\n[exit ${r.exitCode} · ${r.durationMs}ms]`
                          ).join('\n\n---\n\n');
                          navigator.clipboard.writeText(text);
                        }}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </button>
                      {/* Clear */}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px 5px', 'border-radius': '3px', 'font-size': '10px' }}
                        title="Clear output"
                        onClick={() => { setRunbookResults([]); setRunbookDone(false); }}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Scrollable output */}
                  <div
                    style={{ flex: '1', 'overflow-y': 'auto', padding: '10px 14px', 'font-family': 'var(--mono)', 'font-size': '11px', 'line-height': '1.65', color: '#94A3B8' }}
                    ref={(el) => {
                      // Auto-scroll to bottom whenever results update
                      if (el) {
                        const observer = new MutationObserver(() => { el.scrollTop = el.scrollHeight; });
                        observer.observe(el, { childList: true, subtree: true, characterData: true });
                      }
                    }}
                  >
                    <For each={runbookResults()}>
                      {(result) => (
                        <div style={{ 'margin-bottom': '18px' }}>
                          {/* Step header */}
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '4px' }}>
                            <span style={{
                              'font-size': '9px', 'font-weight': '700', 'letter-spacing': '0.06em',
                              'text-transform': 'uppercase', padding: '1px 6px', 'border-radius': '3px',
                              background: result.status === 'failed' ? 'rgba(239,68,68,.2)' : result.status === 'running' ? 'rgba(34,211,238,.15)' : 'rgba(34,197,94,.15)',
                              color: result.status === 'failed' ? '#F87171' : result.status === 'running' ? '#67E8F9' : '#4ADE80',
                            }}>
                              step {result.stepNum}
                            </span>
                            <span style={{ color: '#CBD5E1', 'font-weight': '600', 'font-size': '11px', flex: '1' }}>{result.title}</span>
                            <Show when={result.status !== 'running'}>
                              <span style={{ 'font-size': '9.5px', color: result.exitCode === 0 ? '#4ADE80' : '#F87171', 'flex-shrink': '0' }}>
                                {result.exitCode === 0 ? '✓' : '✗'} exit {result.exitCode} · {result.durationMs}ms
                              </span>
                            </Show>
                            <Show when={result.status === 'running'}>
                              <span style={{ 'font-size': '9.5px', color: '#67E8F9' }}>running…</span>
                            </Show>
                          </div>

                          {/* Command prompt line */}
                          <div style={{ color: '#64748B', 'margin-bottom': '4px' }}>
                            <span style={{ color: '#34D399' }}>$</span>{' '}
                            <span style={{ color: '#E2E8F0' }}>{result.cmd}</span>
                          </div>

                          {/* Output block */}
                          <Show when={result.output}>
                            <pre style={{
                              margin: '0', 'white-space': 'pre-wrap', 'word-break': 'break-all',
                              color: result.exitCode !== 0 ? '#FCA5A5' : '#94A3B8',
                              'border-left': `2px solid ${result.exitCode !== 0 ? 'rgba(239,68,68,.4)' : 'rgba(51,65,85,.8)'}`,
                              'padding-left': '10px', 'line-height': '1.6',
                            }}>
                              {result.output}
                            </pre>
                          </Show>

                          <Show when={result.status === 'running' && !result.output}>
                            <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', color: '#475569', 'padding-left': '10px' }}>
                              <div style={{ width: '8px', height: '8px', 'border-radius': '50%', border: '2px solid #334155', 'border-top-color': '#67E8F9', animation: 'spin 0.7s linear infinite' }} />
                              <span style={{ 'font-size': '10.5px' }}>executing…</span>
                            </div>
                          </Show>

                          {/* Separator */}
                          <div style={{ 'border-bottom': '1px solid rgba(255,255,255,.04)', 'margin-top': '12px' }} />
                        </div>
                      )}
                    </For>

                    {/* Blinking cursor when running */}
                    <Show when={runbookRunning()}>
                      <span style={{ color: '#67E8F9', animation: 'pulse 1s ease-in-out infinite' }}>▌</span>
                    </Show>
                  </div>
                </div>
              </Show>

            </div>
          </Show>

          {/* ── RETRO TAB ── */}
          <Show when={activeRPTab() === 'retro'}>
            <div style={{ padding: '14px', 'font-size': '12px' }}>
              <div style={{ 'font-weight': '600', color: 'var(--t1)', 'margin-bottom': '12px' }}>
                Post-Incident Retrospective
                <span class="chip new" style={{ 'margin-left': '8px' }}>Draft</span>
              </div>
              <Show when={aiData()} keyed>{(ai) => (<>
                {[
                  { label: 'Incident ID',   value: props.incident?.id || '—' },
                  { label: 'Severity',      value: incSev() },
                  { label: 'Duration',      value: rpTimerStr() + ' (ongoing)' },
                  { label: 'Affected Svc',  value: incName() },
                  { label: 'Namespace',     value: incNs() },
                  { label: 'Pattern',       value: (props.incident?.pattern || '').replace(/_/g, ' ') },
                  { label: 'Root Cause',    value: ai.h1Title },
                  { label: 'Impact',        value: `${ai.stats.errorRate != null ? `${ai.stats.errorRate}% error rate · ` : ''}${ai.stats.services != null ? `${ai.stats.services} related resource${ai.stats.services !== 1 ? 's' : ''} · ` : ''}${ai.stats.mttrStr} elapsed` },
                  { label: 'Detection',     value: `Automated — KubeGraf ${(props.incident?.pattern || 'Anomaly').replace(/_/g, ' ')} pattern` },
                  { label: 'Resolution',    value: ai.recs?.[0]?.title ? `${ai.recs[0].title} (pending)` : 'Investigation in progress' },
                ].map(row => (
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '2px', padding: '7px 0', 'border-bottom': '1px solid var(--b1)' }}>
                    <span style={{ 'font-size': '10px', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.06em' }}>{row.label}</span>
                    <span style={{ color: 'var(--t2)', 'font-size': '12px' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ 'margin-top': '10px', 'font-weight': '600', color: 'var(--t2)', 'margin-bottom': '6px' }}>Action Items</div>
                <For each={ai.recs.slice(0, 5)}>{(rec: any, i) => (
                  <div style={{ display: 'flex', 'align-items': 'flex-start', gap: '8px', padding: '5px 0', color: 'var(--t3)', 'font-size': '11.5px' }}>
                    <span style={{ color: 'var(--brand)', 'font-weight': '700', 'flex-shrink': '0' }}>{i() + 1}.</span>
                    <span>{rec.title}{rec.explanation ? ` — ${rec.explanation.slice(0, 60)}` : ''}</span>
                  </div>
                )}</For>
                <Show when={ai.recs.length === 0}>
                  <div style={{ color: 'var(--t5)', 'font-size': '11px', padding: '4px 0' }}>No action items generated yet — investigation ongoing.</div>
                </Show>
              </>)}</Show>
              <Show when={copyMdMsg()}>
                <div style={{ 'font-size': '11px', color: copyMdMsg().startsWith('✓') ? 'var(--ok)' : 'var(--warn)', padding: '4px 0' }}>{copyMdMsg()}</div>
              </Show>
              <div style={{ 'margin-top': '14px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                {/* Download PDF — opens print dialog (browser Save as PDF) */}
                <button
                  class="btn primary"
                  style={{ 'font-size': '11px', display: 'flex', 'align-items': 'center', gap: '7px', 'justify-content': 'center' }}
                  onClick={() => {
                    const inc = props.incident;
                    if (!inc) { setCopyMdMsg('No incident selected'); return; }
                    try {
                      const report = RCAReportGenerator.generateReport(inc);
                      RCAReportGenerator.printAsPDF(report);
                      setCopyMdMsg('✓ Print dialog opened — choose "Save as PDF"');
                    } catch (e: any) {
                      setCopyMdMsg(`✗ ${e?.message || 'Export failed'}`);
                    }
                    setTimeout(() => setCopyMdMsg(''), 5000);
                  }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Export PDF
                </button>
                {/* Download Markdown file */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    class="btn ghost"
                    style={{ flex: '1', 'font-size': '11px', display: 'flex', 'align-items': 'center', gap: '7px', 'justify-content': 'center' }}
                    onClick={() => {
                      const inc = props.incident;
                      if (!inc) { setCopyMdMsg('No incident selected'); return; }
                      try {
                        const report = RCAReportGenerator.generateReport(inc);
                        RCAReportGenerator.downloadReport(report, 'markdown');
                        setCopyMdMsg('✓ Markdown file downloaded');
                      } catch (e: any) {
                        setCopyMdMsg(`✗ ${e?.message || 'Export failed'}`);
                      }
                      setTimeout(() => setCopyMdMsg(''), 3000);
                    }}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download .md
                  </button>
                  {/* Copy MD to clipboard as fallback */}
                  <button
                    class="btn ghost"
                    style={{ 'font-size': '11px', display: 'flex', 'align-items': 'center', gap: '6px' }}
                    title="Copy Markdown to clipboard"
                    onClick={async () => {
                      const inc = props.incident;
                      if (!inc) { setCopyMdMsg('No incident selected'); return; }
                      try {
                        const report = RCAReportGenerator.generateReport(inc);
                        const md = RCAReportGenerator.exportAsMarkdown(report);
                        await navigator.clipboard.writeText(md);
                        setCopyMdMsg('✓ Markdown copied');
                      } catch {
                        setCopyMdMsg('✗ Copy failed');
                      }
                      setTimeout(() => setCopyMdMsg(''), 3000);
                    }}
                  >
                    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* ── CHAT TAB ── */}
          <Show when={activeRPTab() === 'chat'}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0' }}>

              {/* Header */}
              <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '10px' }}>
                <img src="/orkas-logo.png" alt="Orkas AI" style={{ height: '18px', width: 'auto', 'object-fit': 'contain' }} />
                <span style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--t1)', flex: '1' }}>Orkas AI Chat</span>
                <span style={{ 'font-size': '10px', color: 'var(--t5)', 'font-family': 'var(--mono)' }}>
                  {incNs()}/{incName()}
                </span>
              </div>

              {/* Quick prompts — only before first message */}
              <Show when={orkasMessages().length === 0}>
                <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '5px', 'margin-bottom': '12px' }}>
                  <For each={[
                    `Why is ${incName()} failing?`,
                    `Root cause of ${incPattern()}`,
                    `kubectl fix for ${incName()}`,
                    `Show pod logs for ${incName()}`,
                    `Events in ${incNs()}`,
                    `Blast radius of this incident`,
                  ]}>{(q) => (
                    <button
                      class="btn ghost"
                      style={{ 'font-size': '10px', padding: '3px 8px', 'border-radius': '12px' }}
                      onClick={() => orkasSend(q)}
                    >{q}</button>
                  )}</For>
                </div>
              </Show>

              {/* Messages */}
              <Show when={orkasMessages().length > 0}>
                <div style={{ 'max-height': '380px', 'overflow-y': 'auto', display: 'flex', 'flex-direction': 'column', gap: '10px', 'margin-bottom': '10px', padding: '2px 0' }}>
                  <For each={orkasMessages()}>{(msg) => (
                    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '3px', 'align-items': msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        'max-width': '90%', padding: '8px 11px',
                        'border-radius': msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                        background: msg.role === 'user' ? 'var(--brand)' : 'var(--s2)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--b1)',
                        color: msg.role === 'user' ? '#fff' : 'var(--t1)',
                        'font-size': '12px', 'line-height': '1.55',
                        'white-space': 'pre-wrap', 'word-break': 'break-word',
                      }}>{msg.text}</div>
                      <Show when={msg.role === 'assistant' && (msg.model || msg.confidence)}>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', display: 'flex', gap: '6px' }}>
                          <Show when={msg.model}><span style={{ 'font-family': 'var(--mono)' }}>{msg.model}</span></Show>
                          <Show when={msg.confidence}><span style={{ color: 'var(--ok)' }}>{Math.round(msg.confidence! * 100)}% conf</span></Show>
                          <Show when={msg.latency}><span>{msg.latency}ms</span></Show>
                        </div>
                      </Show>
                    </div>
                  )}</For>
                  <Show when={orkasLoading()}>
                    <div style={{ display: 'flex', gap: '5px', 'align-items': 'center', padding: '4px 0' }}>
                      <For each={[0, 120, 240]}>{d => <div style={{ width: '5px', height: '5px', 'border-radius': '50%', background: 'var(--brand)', animation: 'rpBounce 1s ease-in-out infinite', 'animation-delay': `${d}ms` }} />}</For>
                      <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': '2px' }}>Thinking…</span>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Input */}
              <div style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'border-top': '1px solid var(--b1)', 'padding-top': '10px', 'margin-top': '4px' }}>
                <input
                  type="text"
                  placeholder={`Ask about ${incName()}…`}
                  value={orkasInput()}
                  onInput={e => setOrkasInput(e.currentTarget.value)}
                  onKeyDown={e => { if (e.key === 'Enter') orkasSend(); }}
                  style={{ flex: '1', padding: '7px 10px', background: 'var(--s2)', border: '1px solid var(--b2)', 'border-radius': '6px', color: 'var(--t1)', 'font-size': '12px', outline: 'none', 'font-family': 'inherit' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
                />
                <button
                  class="btn primary"
                  style={{ 'font-size': '11px', padding: '7px 12px', 'white-space': 'nowrap', 'flex-shrink': '0' }}
                  onClick={() => orkasSend()}
                  disabled={!orkasInput().trim() || orkasLoading()}
                >Ask</button>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
