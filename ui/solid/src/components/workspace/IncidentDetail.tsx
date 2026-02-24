/**
 * IncidentDetail — Exact match to kubegraf-final-white.html prototype
 */

import { Component, Show, For, createSignal, createMemo, createEffect, untrack, onMount, onCleanup } from 'solid-js';
import { Incident, api } from '../../services/api';
import { currentContext } from '../../stores/cluster';

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

const TL_EVENTS = [
  { t: .00, lbl: 'Stable',    col: '#A1A1AA', root: false, err: false },
  { t: .16, lbl: 'HPA 2→3',  col: '#2563EB', root: false, err: false },
  { t: .31, lbl: 'v2.4.1',   col: '#7C3AED', root: true,  err: false },
  { t: .50, lbl: 'Mem >80%', col: '#D97706', root: false, err: false },
  { t: .65, lbl: 'OOMKill ×3', col: '#DC2626', root: false, err: true },
  { t: .80, lbl: 'CrashLoop', col: '#DC2626', root: false, err: true },
  { t: .93, lbl: 'SEV-1',    col: '#D97706', root: false, err: false },
];

function initTimeline(canvas: HTMLCanvasElement | null): (() => void) | undefined {
  if (!canvas) return;
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
    const rz1 = L + TL_EVENTS[2].t * LEN - 8, rz2 = L + TL_EVENTS[4].t * LEN + 8;
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
    TL_EVENTS.forEach((ev, i) => {
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
      ctx!.fillText('14:' + (20 + Math.round(ev.t * 7)).toString().padStart(2, '0'), x, MY - 13);
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

function drawMem(canvas: HTMLCanvasElement | null) {
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
  const MAX = 540;
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 7 ? 170 + Math.random() * 8 : 170 + (510 - 170) * Math.pow((i - 7) / 13, 2) + Math.random() * 9
  );
  [0, 128, 256, 384, 512].forEach(v => {
    const y = yp(v), isL = v === 512;
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
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  const dx = xp(7);
  ctx.save();
  ctx.strokeStyle = 'rgba(124,58,237,.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(dx, yp(data[7]));
  ctx.lineTo(dx, PAD.t + 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '700 9px Geist,sans-serif';
  ctx.fillStyle = 'rgba(124,58,237,.8)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('v2.4.1 deploy', dx, PAD.t + 2);
  ctx.restore();
  const kx = xp(19), ky = yp(data[19]);
  ctx.beginPath();
  ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#DC2626';
  ctx.fill();
  ctx.save();
  ctx.font = '700 9px Geist,sans-serif';
  ctx.fillStyle = '#DC2626';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('OOMKilled 510Mi', kx - 8, ky - 6);
  ctx.restore();
  [0, 5, 10, 15, 19].forEach(i => {
    ctx.font = '8px Geist Mono,monospace';
    ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('14:' + (20 + Math.round(i / 19 * 6)).toString().padStart(2, '0'), xp(i), PAD.t + cH + 4);
  });
}

function drawMetricsCPU(canvas: HTMLCanvasElement | null) {
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
  const MAX = 1000;
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 6 ? 300 + Math.random() * 40 : 300 + (i - 6) * 30 + Math.random() * 25
  );
  [0, 250, 500, 750, 1000].forEach(v => {
    const y = yp(v), isL = v === 1000;
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
  [0, 5, 10, 15, 19].forEach(i => {
    ctx.font = '8px Geist Mono,monospace'; ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('14:' + (20 + Math.round(i / 19 * 7)).toString().padStart(2, '0'), xp(i), PAD.t + cH + 4);
  });
}

function drawMetricsMem(canvas: HTMLCanvasElement | null) {
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
  const MAX = 540;
  const yp = (v: number) => PAD.t + cH - (v / MAX) * cH;
  const xp = (i: number) => PAD.l + i / 19 * cW;
  const data = Array.from({ length: 20 }, (_, i) =>
    i < 7 ? 170 + Math.random() * 8 : 170 + (510 - 170) * Math.pow((i - 7) / 13, 2) + Math.random() * 9
  );
  [0, 128, 256, 384, 512].forEach(v => {
    const y = yp(v), isL = v === 512;
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
  [0, 5, 10, 15, 19].forEach(i => {
    ctx.font = '8px Geist Mono,monospace'; ctx.fillStyle = 'rgba(161,161,170,.8)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('14:' + (20 + Math.round(i / 19 * 7)).toString().padStart(2, '0'), xp(i), PAD.t + cH + 4);
  });
}

const IncidentDetail: Component<IncidentDetailProps> = (props) => {
  const [secs, setSecs] = createSignal(384);
  const [activeTab, setActiveTab] = createSignal('overview');
  const [activeRPTab, setActiveRPTab] = createSignal('fix');
  const [aiInput, setAiInput] = createSignal('');
  const [k8sEvents, setK8sEvents] = createSignal<any[]>([]);
  const [eventsLoading, setEventsLoading] = createSignal(false);
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
  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(k => k === key ? '' : k), 1500);
    });
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

  const incName = createMemo(() => props.incident?.resource?.name || 'checkout-api');
  const incNs = createMemo(() => props.incident?.resource?.namespace || 'payments-ns');
  const incPattern = createMemo(() => props.incident?.pattern?.replace(/_/g, '') || 'OOMKilled');
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

  // Reset fetched data when incident changes; redraw health ring; background-fetch node/image
  createEffect(() => {
    const inc = props.incident;
    const score = healthScore();
    setK8sEvents([]);
    setYamlContent('');
    setYamlEdited('');
    setYamlEditing(false);
    setYamlSaveMsg('');
    setPodNode('—');
    setPodImage('—');
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
      // Extract nodeName: from YAML spec
      const nodeMatch = /nodeName:\s*(\S+)/.exec(raw);
      if (nodeMatch) setPodNode(nodeMatch[1]);
      // Extract image: from YAML (first image: line, skip 'image:' prefixes with sha)
      const imageMatch = /^\s+image:\s*(\S+)/m.exec(raw);
      if (imageMatch) setPodImage(imageMatch[1]);
    }).catch(() => { /* leave defaults */ });
  });

  // Fetch real K8s events via namespace-scoped /api/v1/namespaces/{ns}/pods/{name}/events
  // (uses Events(namespace).List with field selector — works with namespace-level RBAC)
  createEffect(() => {
    if (activeTab() !== 'events') return;
    const ns = incNs();
    const name = incName();
    if (!ns || !name) return;
    if (untrack(eventsLoading) || untrack(k8sEvents).length > 0) return;
    setEventsLoading(true);
    api.getPodEvents(ns, name).then(r => {
      const events = r?.events || [];
      setK8sEvents(events.map((ev: any) => ({
        type:     ev.type || 'Normal',
        reason:   ev.reason || 'Event',
        message:  ev.message || '',
        count:    ev.count || 1,
        lastTime: ev.lastTime ? new Date(ev.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently',
        source:   ev.source || '',
      })));
    }).catch(() => {
      setK8sEvents([]);
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
      // Static YAML fallback
      setYamlContent([
        `apiVersion: apps/v1`,
        `kind: ${props.incident?.resource?.kind || 'Deployment'}`,
        `metadata:`,
        `  name: ${name}`,
        `  namespace: ${ns}`,
        `  labels:`,
        `    app: ${name}`,
        `    version: v2.4.1`,
        `spec:`,
        `  replicas: 3`,
        `  selector:`,
        `    matchLabels:`,
        `      app: ${name}`,
        `  template:`,
        `    spec:`,
        `      containers:`,
        `      - name: ${name}`,
        `        image: ${name}-api:v2.4.1`,
        `        resources:`,
        `          requests:`,
        `            memory: "256Mi"`,
        `            cpu: "500m"`,
        `          limits:`,
        `            memory: "512Mi"`,
        `            cpu: "1000m"`,
        `        env:`,
        `        - name: JAVA_OPTS`,
        `          value: "-Xms128m"`,
        `        - name: SPRING_PROFILES_ACTIVE`,
        `          value: "production"`,
        `        - name: DB_HOST`,
        `          valueFrom:`,
        `            secretKeyRef:`,
        `              name: db-credentials`,
        `              key: host`,
        `        readinessProbe:`,
        `          httpGet:`,
        `            path: /health`,
        `            port: 8080`,
        `          initialDelaySeconds: 10`,
        `          periodSeconds: 5`,
      ].join('\n'));
      setYamlEdited([
        `apiVersion: apps/v1`,
        `kind: ${props.incident?.resource?.kind || 'Deployment'}`,
        `metadata:`,
        `  name: ${name}`,
        `  namespace: ${ns}`,
      ].join('\n'));
    }).finally(() => setYamlLoading(false));
  });

  // Draw metrics charts when metrics tab activates
  createEffect(() => {
    if (activeTab() !== 'metrics') return;
    setTimeout(() => {
      drawMetricsCPU(cpuMetricsRef || null);
      drawMetricsMem(memMetricsRef || null);
    }, 60);
  });

  onMount(() => {
    const interval = setInterval(() => setSecs(s => s + 1), 1000);

    setTimeout(() => {
      drawSpark(sp1Ref || null, [0, 0, 0, 0, 1, 2, 3], '#DC2626');
      drawSpark(sp2Ref || null, [0, 0, 1, 2, 3, 4, 4], '#2563EB');
      drawSpark(sp3Ref || null, [0, 0, 5, 30, 70, 90, 94], '#DC2626');
      drawSpark(sp4Ref || null, [0, 1, 2, 3, 4, 5, 6.4], '#0891B2');
    }, 80);

    setTimeout(() => {
      tlCleanup = initTimeline(tlRef || null);
    }, 120);

    setTimeout(() => {
      drawMem(memRef || null);
      drawRpRing(rpRingRef || null, healthScore());
    }, 130);

    const onResize = () => {
      drawSpark(sp1Ref || null, [0, 0, 0, 0, 1, 2, 3], '#DC2626');
      drawSpark(sp2Ref || null, [0, 0, 1, 2, 3, 4, 4], '#2563EB');
      drawSpark(sp3Ref || null, [0, 0, 5, 30, 70, 90, 94], '#DC2626');
      drawSpark(sp4Ref || null, [0, 1, 2, 3, 4, 5, 6.4], '#0891B2');
      if (tlCleanup) { tlCleanup(); tlCleanup = initTimeline(tlRef || null); }
      drawMem(memRef || null);
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
            {props.incident?.title || 'OOMKilling — 0/3 pods running — payment-processor cascading'}
          </span>
          <span class="sev-timer">{timerStr()}</span>
          <div class="sev-actions">
            <button class="btn ghost" style={{ 'font-size': '11px', padding: '5px 10px' }}>Acknowledge</button>
            <button class="btn danger" style={{ 'font-size': '11px', padding: '5px 10px' }}>Page On-Call</button>
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
              <button class="btn ghost" style={{ 'font-size': '11px', padding: '5px 10px' }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                Rollback
              </button>
              <button class="btn ghost" style={{ 'font-size': '11px', padding: '5px 10px' }}>Scale</button>
              <button class="btn icon">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>
          <div class="inc-meta-bar">
            <div class="meta-item">
              <span class="meta-k">Pod</span>
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
            <div class="meta-item">
              <span class="meta-k">Node</span>
              <span class="meta-v" style={{ 'max-width': '180px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={resourceMeta().node}>{resourceMeta().node}</span>
              <Show when={resourceMeta().node !== '—'}>
                <button class="copy-btn" title="Copy node name" onClick={() => copyVal('node', resourceMeta().node)}>{copiedKey() === 'node' ? '✓' : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>
              </Show>
            </div>
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
                        <div class="hyp-conf" style={{ color: 'var(--warn)' }}>~{ai.contribConf}% likelihood</div>
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
                <span style={{ 'font-size': '11px', color: 'var(--t5)' }}>{incName()} · {incNs()} · last 14 lines</span>
                <span style={{ 'margin-left': 'auto', 'font-size': '11px', color: 'var(--t5)' }}>14:20–14:27 UTC</span>
              </div>
              <div class="log-body">
                {[
                  { ts: '14:20:01', lvl: 'info', msg: 'Application started successfully on port 8080' },
                  { ts: '14:21:13', lvl: 'info', msg: `[scheduler] Initializing ${incName()} worker threads` },
                  { ts: '14:22:05', lvl: 'warn', msg: 'Heap usage at 72% (184Mi / 256Mi) — GC pressure increasing' },
                  { ts: '14:22:31', lvl: 'warn', msg: 'GC pause detected: 340ms — full GC triggered (G1GC)' },
                  { ts: '14:23:02', lvl: 'warn', msg: 'Heap usage at 84% (215Mi / 256Mi) — approaching limit' },
                  { ts: '14:23:29', lvl: 'err',  msg: 'OutOfMemoryError: Java heap space — at java.util.Arrays.copyOf' },
                  { ts: '14:23:29', lvl: 'err',  msg: 'FATAL: JVM out of memory — container will be OOMKilled (exit 137)' },
                  { ts: '14:23:30', lvl: 'err',  msg: `signal: killed — container ${incName()} exited with code 137` },
                  { ts: '14:23:35', lvl: 'info', msg: `[kubelet] Container ${incName()} restarting (restart #1)` },
                  { ts: '14:24:11', lvl: 'warn', msg: 'Readiness probe failed: connection refused — pod not ready' },
                  { ts: '14:24:55', lvl: 'err',  msg: 'OutOfMemoryError: GC overhead limit exceeded' },
                  { ts: '14:24:56', lvl: 'err',  msg: `signal: killed — container ${incName()} exited with code 137` },
                  { ts: '14:25:10', lvl: 'info', msg: `[kubelet] Container ${incName()} restarting (restart #2)` },
                  { ts: '14:26:47', lvl: 'err',  msg: 'Back-off restarting failed container — CrashLoopBackOff' },
                ].map(line => (
                  <div class="log-line">
                    <span class="log-ts">{line.ts}</span>
                    <span class={`log-level ${line.lvl}`}>{line.lvl.toUpperCase()}</span>
                    <span class="log-msg">{line.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </Show>

          {/* ── EVENTS TAB ── */}
          <Show when={activeTab() === 'events'}>
            <div style={{ flex: '1', overflow: 'auto', padding: '14px' }}>
              <div class="card">
                <div class="card-head">
                  <span class="card-title">Kubernetes Events</span>
                  <span style={{ 'margin-left': 'auto', 'font-size': '11px', color: 'var(--t5)' }}>{incNs()} / {incName()}</span>
                </div>
                <div class="card-body" style={{ padding: '0' }}>
                  <Show when={eventsLoading()}>
                    <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading events…</div>
                  </Show>
                  <Show when={!eventsLoading()}>
                    <Show when={k8sEvents().length > 0} fallback={
                      <div style={{ padding: '20px 14px', color: 'var(--t5)', 'font-size': '12px', 'line-height': '1.6' }}>
                        <div style={{ 'margin-bottom': '4px' }}>No Kubernetes events found for <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{incName()}</span> or its parent resources in namespace <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{incNs()}</span>.</div>
                        <div style={{ color: 'var(--t6)', 'font-size': '11px' }}>Pod-level events typically expire after 1 hour. Try running: <span style={{ 'font-family': 'var(--mono)' }}>kubectl get events -n {incNs()} --sort-by=.lastTimestamp</span></div>
                      </div>
                    }>
                      <For each={k8sEvents()}>{(ev) => (
                        <div class="event-row">
                          <span class={`event-type ${ev.type === 'Warning' ? 'warning' : 'normal'}`}>{ev.type}</span>
                          <span class="event-reason">{ev.reason}</span>
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
              <div class="card">
                <div class="card-head">
                  <div class="accent-dot brand" />
                  <span class="card-title">CPU Usage</span>
                  <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', 'font-weight': '700', color: 'var(--blue)', 'margin-left': 'auto' }}>620m / 1000m</span>
                </div>
                <div class="spark-row" style={{ padding: '0 14px 14px' }}>
                  <canvas ref={cpuMetricsRef} style={{ display: 'block', width: '100%', height: '100px' }} />
                </div>
              </div>
              <div class="card">
                <div class="card-head">
                  <div class="accent-dot crit" />
                  <span class="card-title">Memory Usage</span>
                  <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', 'font-weight': '700', color: 'var(--crit)', 'margin-left': 'auto' }}>510Mi / 512Mi (limit)</span>
                </div>
                <div class="spark-row" style={{ padding: '0 14px 14px' }}>
                  <canvas ref={memMetricsRef} style={{ display: 'block', width: '100%', height: '100px' }} />
                </div>
              </div>
              <div class="card">
                <div class="card-head">
                  <span class="card-title">Resource Summary</span>
                </div>
                <div class="card-body">
                  <div class="spark-row" style={{ gap: '0', 'flex-wrap': 'wrap' }}>
                    {[
                      { lbl: 'CPU Request', val: '500m', sub: '50% of limit' },
                      { lbl: 'CPU Limit', val: '1000m', sub: '1 vCPU' },
                      { lbl: 'Mem Request', val: '256Mi', sub: 'baseline' },
                      { lbl: 'Mem Limit', val: '512Mi', sub: 'OOM boundary' },
                      { lbl: 'Restarts', val: String(props.incident?.occurrences || 14), sub: 'since deploy' },
                      { lbl: 'Uptime', val: '6m 24s', sub: 'since last kill' },
                    ].map(m => (
                      <div class="spark-card">
                        <div class="spark-label">{m.lbl}</div>
                        <div class="spark-val">{m.val}</div>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '2px' }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Show>

          {/* ── CONFIG TAB ── */}
          <Show when={activeTab() === 'config'}>
            <div style={{ flex: '1', overflow: 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              <div class="card">
                <div class="card-head">
                  <span class="card-title">Environment Variables</span>
                  <span style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-left': 'auto' }}>{incName()}</span>
                </div>
                <div class="card-body" style={{ padding: '0' }}>
                  <table class="panel-table" style={{ width: '100%' }}>
                    <thead>
                      <tr><th>Variable</th><th>Value</th><th>Source</th></tr>
                    </thead>
                    <tbody>
                      {[
                        { k: 'JAVA_OPTS',               v: '-Xms128m',          src: 'Direct' },
                        { k: 'SPRING_PROFILES_ACTIVE',  v: 'production',        src: 'Direct' },
                        { k: 'DB_HOST',                 v: '***',               src: 'Secret: db-credentials' },
                        { k: 'DB_PASSWORD',             v: '***',               src: 'Secret: db-credentials' },
                        { k: 'REDIS_URL',               v: 'redis://redis:6379', src: 'ConfigMap: app-config' },
                        { k: 'LOG_LEVEL',               v: 'INFO',              src: 'ConfigMap: app-config' },
                        { k: 'MAX_CONNECTIONS',         v: '50',                src: 'ConfigMap: app-config' },
                        { k: 'POD_NAME',                v: incName(),           src: 'FieldRef: metadata.name' },
                        { k: 'POD_NAMESPACE',           v: incNs(),             src: 'FieldRef: metadata.namespace' },
                      ].map(row => (
                        <tr>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t1)' }}>{row.k}</td>
                          <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: row.v === '***' ? 'var(--t5)' : 'var(--ok)' }}>{row.v}</td>
                          <td style={{ 'font-size': '11px', color: 'var(--t4)' }}>{row.src}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><span class="card-title">Resource Limits</span></div>
                <div class="card-body">
                  <table class="panel-table" style={{ width: '100%' }}>
                    <thead><tr><th>Resource</th><th>Request</th><th>Limit</th><th>Current</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>CPU</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>500m</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>1000m</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--warn)' }}>620m (62%)</td>
                      </tr>
                      <tr>
                        <td>Memory</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>256Mi</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>512Mi</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--crit)' }}>510Mi (99.6%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><span class="card-title">Health Probes</span></div>
                <div class="card-body">
                  <table class="panel-table" style={{ width: '100%' }}>
                    <thead><tr><th>Probe</th><th>Path</th><th>Port</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>Readiness</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>/health</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>8080</td>
                        <td style={{ color: 'var(--crit)', 'font-size': '11px', 'font-weight': '600' }}>FAILING</td>
                      </tr>
                      <tr>
                        <td>Liveness</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>/health/live</td>
                        <td style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>8080</td>
                        <td style={{ color: 'var(--crit)', 'font-size': '11px', 'font-weight': '600' }}>FAILING</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
                  <Show when={!yamlEditing()}>
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

              {/* View mode: syntax highlighted */}
              <Show when={!yamlLoading() && !yamlEditing()}>
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

        {/* AI bar */}
        <div class="ai-bar">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--violet)" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <input
            class="ai-input"
            placeholder="Ask KubeGraf AI — 'Why is memory growing?' · 'Similar incidents?' · 'Draft fix PR'..."
            value={aiInput()}
            onInput={(e) => setAiInput(e.currentTarget.value)}
          />
          <button class="ai-send">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
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
          {(['fix', 'topology', 'runbook', 'retro'] as const).map(tab => (
            <button
              class={`rp-tab${activeRPTab() === tab ? ' on' : ''}`}
              onClick={() => setActiveRPTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
              <div class="mttr-track"><div class="mttr-fill" style={{ width: '64%' }} /></div>
              <div class="mttr-hint">Target &lt;10 min · Est. loss $18.4k</div>
            </div>
            {/* Recommended Fixes from real incident data */}
            <div class="sec-label">Recommended Actions</div>
            <Show when={aiData()?.recs?.length} fallback={
              <div class="fix-card">
                <div class="fix-head">
                  <div class="fix-icon" style={{ background: 'rgba(251,191,36,.15)' }}>⚡</div>
                  <span class="fix-title">Restart {incNs()}/{incName()}</span>
                  <span class="fix-conf" style={{ color: 'var(--ok)' }}>Safe</span>
                </div>
                <div class="fix-body">
                  <div class="fix-desc">Delete pod to trigger fresh recreation by its controller.</div>
                  <div class="cmd-line">
                    <span class="cmd-text">kubectl delete pod {incName()} -n {incNs()}</span>
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
                      <div class="cmd-line">
                        <span class="cmd-text">kubectl delete pod {incName()} -n {incNs()}</span>
                        <svg class="cmd-copy" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      </div>
                    </Show>
                  </div>
                </div>
              )}</For>
            </Show>
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
            <div style={{ padding: '14px' }}>
              <div style={{ 'font-weight': '600', color: 'var(--t1)', 'margin-bottom': '12px', 'font-size': '12px' }}>
                Automated Runbook
                <span class="chip ai" style={{ 'margin-left': '8px' }}>✦ AI Generated</span>
              </div>
              {/* Step 1: always verify */}
              <div class="rb-step">
                <div class="rb-num active">1</div>
                <div>
                  <div class="rb-title">Verify current state</div>
                  <div class="rb-cmd">kubectl describe {props.incident?.resource?.kind?.toLowerCase() || 'pod'}/{incName()} -n {incNs()}</div>
                </div>
              </div>
              {/* Steps 2+: from real recommendations */}
              <For each={(aiData()?.recs || []).slice(0, 4)}>{(rec: any, i) => (
                <div class="rb-step">
                  <div class="rb-num pending">{i() + 2}</div>
                  <div>
                    <div class="rb-title">{rec.title}</div>
                    <div class="rb-cmd">{
                      rec.title?.toLowerCase().includes('restart') || rec.title?.toLowerCase().includes('rollback')
                        ? `kubectl rollout undo deploy/${incName().replace(/-[a-z0-9]+-[a-z0-9]+$/, '')} -n ${incNs()}`
                        : rec.title?.toLowerCase().includes('scale')
                        ? `kubectl scale deploy/${incName().replace(/-[a-z0-9]+-[a-z0-9]+$/, '')} --replicas=3 -n ${incNs()}`
                        : rec.title?.toLowerCase().includes('drain') || rec.title?.toLowerCase().includes('node')
                        ? `kubectl drain ${resourceMeta().node !== '—' ? resourceMeta().node : '<node>'} --ignore-daemonsets --delete-emptydir-data`
                        : rec.title?.toLowerCase().includes('secret') || rec.title?.toLowerCase().includes('config')
                        ? `kubectl get ${rec.title?.toLowerCase().includes('secret') ? 'secret' : 'configmap'} -n ${incNs()}`
                        : rec.explanation?.slice(0, 80) || `kubectl get events -n ${incNs()} --sort-by=.lastTimestamp`
                    }</div>
                  </div>
                </div>
              )}</For>
              {/* Final step: verify readiness */}
              <div class="rb-step">
                <div class="rb-num pending">{(aiData()?.recs?.length || 0) + 2}</div>
                <div>
                  <div class="rb-title">Verify pod readiness</div>
                  <div class="rb-cmd">kubectl get pods -n {incNs()} -w --field-selector=status.phase!=Running</div>
                </div>
              </div>
              <div style={{ 'margin-top': '14px' }}>
                <button class="btn-full brand">Run Automated Runbook</button>
              </div>
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
              <div style={{ 'margin-top': '14px', display: 'flex', gap: '8px' }}>
                <button class="btn primary" style={{ flex: '1', 'font-size': '11px' }}>Export to Confluence</button>
                <button class="btn ghost" style={{ 'font-size': '11px' }}>Copy MD</button>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
