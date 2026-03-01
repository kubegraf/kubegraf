/**
 * OrkasAIPanel — Global Orkas AI assistant
 *
 * Tabs: Ask · Knowledge
 *
 * "Ask" covers both free-form chat (/ask) and cluster analysis (/k8s/analyze).
 * They are the same interaction: type a question, get an answer. No separate
 * Cluster tab needed — context metadata lives in the info strip below the header.
 *
 * Incident-specific AI (Fix, RCA, per-incident chat) lives exclusively in
 * IncidentDetail's right panel — zero duplication here.
 */

import { Component, createSignal, For, Show, onMount, createEffect } from 'solid-js';
import { marked } from 'marked';

interface OrkaMessage {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  model?: string;
  latencyMs?: number;
  reasoningSteps?: Array<{ step: number; action: string; tool?: string; observation?: string }>;
}

interface K8sCtxInfo {
  context?: string;
  cluster?: string;
  namespace?: string;
  connected: boolean;
}

interface ModelInfo {
  role: string;
  provider: string;
  model: string;
}

const ORKA = 'http://localhost:8000';

// Combined suggestions — cluster analysis presets merged with general Q&A
const SUGGESTIONS = [
  'Analyze overall cluster health',
  'List pods in CrashLoopBackOff across all namespaces',
  'Show deployments with unavailable replicas',
  'What nodes are under memory or disk pressure?',
  'Check recent warning events cluster-wide',
  'Show services with no ready endpoints',
];

const OrkasAIPanel: Component = () => {
  // ── Navigation ───────────────────────────────────────────────────────────
  const [tab, setTab] = createSignal<'ask' | 'knowledge'>('ask');

  // ── Status ───────────────────────────────────────────────────────────────
  const [orkaStatus, setOrkaStatus] = createSignal<'checking' | 'online' | 'offline'>('checking');
  const [k8sCtx, setK8sCtx] = createSignal<K8sCtxInfo | null>(null);
  const [models, setModels] = createSignal<ModelInfo[]>([]);

  // ── Ask (Chat + Cluster merged) ───────────────────────────────────────
  const [messages, setMessages] = createSignal<OrkaMessage[]>([]);
  const [input, setInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [sessionId] = createSignal(crypto.randomUUID());
  const [expandedSteps, setExpandedSteps] = createSignal<Set<number>>(new Set());
  let msgEnd: HTMLDivElement | undefined;

  // ── Knowledge ────────────────────────────────────────────────────────────
  const [ingestTitle, setIngestTitle] = createSignal('');
  const [ingestType, setIngestType] = createSignal('runbook');
  const [ingestContent, setIngestContent] = createSignal('');
  const [ingestLoading, setIngestLoading] = createSignal(false);
  const [ingestMsg, setIngestMsg] = createSignal('');

  // ── Init ─────────────────────────────────────────────────────────────────
  onMount(async () => {
    try {
      const r = await fetch(`${ORKA}/health`, { signal: AbortSignal.timeout(3000) });
      setOrkaStatus(r.ok ? 'online' : 'offline');
    } catch { setOrkaStatus('offline'); }

    try {
      const r = await fetch(`${ORKA}/k8s/context`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) setK8sCtx(await r.json());
    } catch {}

    try {
      const r = await fetch(`${ORKA}/models`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) { const d = await r.json(); setModels(d.models || []); }
    } catch {}
  });

  // ── Ask ───────────────────────────────────────────────────────────────────
  const send = async (q: string) => {
    if (!q.trim() || loading()) return;
    setMessages(m => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const r = await fetch(`${ORKA}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, session_id: sessionId() }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setMessages(m => [...m, {
        role: 'assistant',
        content: d.answer,
        confidence: d.confidence,
        model: d.model_used,
        latencyMs: d.latency_ms,
        reasoningSteps: d.reasoning_steps,
      }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Could not reach Orkas AI'}` }]);
    } finally { setLoading(false); }
  };

  createEffect(() => { messages(); setTimeout(() => msgEnd?.scrollIntoView({ behavior: 'smooth' }), 80); });

  // ── Knowledge ────────────────────────────────────────────────────────────
  const ingest = async () => {
    if (!ingestContent().trim()) return;
    setIngestLoading(true); setIngestMsg('');
    try {
      const r = await fetch(`${ORKA}/ingest/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: ingestType(), content: ingestContent(), metadata: { title: ingestTitle() || 'Untitled' } }),
        signal: AbortSignal.timeout(30_000),
      });
      const d = await r.json();
      setIngestMsg(`✓ Added ${d.chunks_created} chunks to knowledge base`);
      setIngestContent(''); setIngestTitle('');
    } catch (e) { setIngestMsg(`✗ ${e instanceof Error ? e.message : e}`); }
    finally { setIngestLoading(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSteps = (i: number) => setExpandedSteps(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const md = (s: string) => { try { return marked.parse(s, { async: false }) as string; } catch { return s; } };
  const confColor = (c: number) => c >= 0.8 ? 'var(--ok)' : c >= 0.5 ? 'var(--warn)' : 'var(--crit)';
  const confLabel = (c: number) => c >= 0.8 ? 'High' : c >= 0.5 ? 'Medium' : 'Low';
  const ctxShort = () => k8sCtx()?.context?.split('_').pop() ?? k8sCtx()?.context ?? '—';
  const primaryModel = () => models().length > 0 ? `${models()[0].provider} · ${models()[0].model}` : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '10px 16px', 'border-bottom': '1px solid var(--b1)', background: 'var(--s1)', display: 'flex', 'align-items': 'center', gap: '10px', 'flex-shrink': '0' }}>
        <img src="/orkas-logo.png" alt="Orkas AI" style={{ height: '26px', width: 'auto', 'object-fit': 'contain', 'flex-shrink': '0' }} />
        <div>
          <div style={{ 'font-weight': '700', color: 'var(--t1)', 'font-size': '13px' }}>Orkas AI</div>
          <div style={{ 'font-size': '10px', color: 'var(--t5)' }}>Infrastructure Intelligence</div>
        </div>
        <div style={{ 'margin-left': 'auto', display: 'flex', 'align-items': 'center', gap: '8px' }}>
          <Show when={k8sCtx()}>
            <span style={{ 'font-size': '10px', padding: '2px 7px', 'border-radius': 'var(--r99)', background: k8sCtx()!.connected ? 'var(--okBg)' : 'var(--critBg)', color: k8sCtx()!.connected ? 'var(--ok)' : 'var(--crit)', border: `1px solid ${k8sCtx()!.connected ? 'var(--okBdr)' : 'var(--critBdr)'}`, 'font-weight': '600' }}>
              {k8sCtx()!.connected ? '⬡ K8s' : '✗ K8s'}
            </span>
          </Show>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: orkaStatus() === 'online' ? 'var(--ok)' : orkaStatus() === 'offline' ? 'var(--crit)' : 'var(--warn)' }} />
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>
              {orkaStatus() === 'online' ? 'Connected' : orkaStatus() === 'offline' ? 'Offline' : '…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Context info strip (replaces Cluster tab metadata) ── */}
      <Show when={k8sCtx() || primaryModel()}>
        <div style={{ padding: '5px 16px', background: 'var(--s2)', 'border-bottom': '1px solid var(--b1)', display: 'flex', gap: '14px', 'flex-wrap': 'wrap', 'flex-shrink': '0' }}>
          <Show when={k8sCtx()?.context}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>
              ctx: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{ctxShort()}</span>
            </span>
          </Show>
          <Show when={k8sCtx()?.namespace}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>
              ns: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{k8sCtx()!.namespace}</span>
            </span>
          </Show>
          <Show when={primaryModel()}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>
              model: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{primaryModel()}</span>
            </span>
          </Show>
        </div>
      </Show>

      {/* ── Tab bar (2 tabs only) ── */}
      <div style={{ display: 'flex', 'flex-shrink': '0', background: 'var(--s1)', 'border-bottom': '1px solid var(--b1)' }}>
        {(['ask', 'knowledge'] as const).map(t => (
          <button
            onClick={() => setTab(t)}
            style={{
              flex: '1', background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 4px', 'font-size': '11.5px', 'font-weight': '600',
              color: tab() === t ? 'var(--brand)' : 'var(--t4)',
              'border-bottom': tab() === t ? '2px solid var(--brand)' : '2px solid transparent',
              transition: 'color .15s', 'font-family': 'var(--font)',
            }}
          >
            {t === 'ask' ? 'Ask' : 'Knowledge'}
          </button>
        ))}
      </div>

      {/* ════════════════════ TAB: ASK ════════════════════ */}
      <Show when={tab() === 'ask'}>
        {/* Message list */}
        <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px 16px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>

          {/* Empty state */}
          <Show when={messages().length === 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', flex: '1', padding: '24px 0 12px' }}>
              <img src="/orkas-logo.png" alt="" style={{ height: '52px', 'margin-bottom': '10px' }} />
              <div style={{ 'font-weight': '700', color: 'var(--t1)', 'font-size': '14px', 'margin-bottom': '4px' }}>Orkas AI</div>
              <div style={{ 'font-size': '11.5px', color: 'var(--t4)', 'text-align': 'center', 'max-width': '280px', 'line-height': '1.6', 'margin-bottom': '20px' }}>
                Ask anything about your cluster — pods, nodes, deployments, events, and more.
              </div>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px', width: '100%' }}>
                <For each={SUGGESTIONS}>{s => (
                  <button onClick={() => send(s)} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '7px 12px', cursor: 'pointer', 'text-align': 'left', 'font-size': '11.5px', color: 'var(--t3)', 'font-family': 'var(--font)' }}>
                    {s}
                  </button>
                )}</For>
              </div>
            </div>
          </Show>

          {/* Message bubbles */}
          <For each={messages()}>{(msg, idx) => (
            <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
              <div style={{ 'max-width': '92%', background: msg.role === 'user' ? 'var(--brand)' : 'var(--s1)', color: msg.role === 'user' ? '#fff' : 'var(--t1)', border: msg.role === 'user' ? 'none' : '1px solid var(--b1)', 'border-radius': msg.role === 'user' ? 'var(--r12) var(--r12) var(--r4) var(--r12)' : 'var(--r12) var(--r12) var(--r12) var(--r4)', padding: '9px 13px', 'font-size': '12.5px', 'line-height': '1.6' }}>
                <Show when={msg.role === 'assistant'} fallback={<span>{msg.content}</span>}>
                  <div class="orka-md" innerHTML={md(msg.content)} />
                </Show>
              </div>
              {/* Meta row */}
              <Show when={msg.role === 'assistant' && (msg.confidence !== undefined || msg.model)}>
                <div style={{ display: 'flex', gap: '8px', 'align-items': 'center', 'flex-wrap': 'wrap', padding: '0 2px' }}>
                  <Show when={msg.confidence !== undefined}>
                    <span style={{ 'font-size': '10px', 'font-weight': '700', padding: '1px 6px', 'border-radius': 'var(--r99)', background: `${confColor(msg.confidence!)}18`, color: confColor(msg.confidence!), border: `1px solid ${confColor(msg.confidence!)}30` }}>
                      {confLabel(msg.confidence!)} · {Math.round(msg.confidence! * 100)}%
                    </span>
                  </Show>
                  <Show when={msg.model === 'direct'}><span style={{ 'font-size': '10px', color: 'var(--t5)' }}>direct · no LLM</span></Show>
                  <Show when={msg.model && msg.model !== 'direct'}><span style={{ 'font-size': '10px', color: 'var(--t5)' }}>{msg.model}</span></Show>
                  <Show when={msg.latencyMs}><span style={{ 'font-size': '10px', color: 'var(--t5)' }}>{msg.latencyMs! < 1000 ? `${Math.round(msg.latencyMs!)}ms` : `${(msg.latencyMs! / 1000).toFixed(1)}s`}</span></Show>
                  <Show when={msg.reasoningSteps?.length}>
                    <button onClick={() => toggleSteps(idx())} style={{ 'font-size': '10px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', 'font-family': 'var(--font)' }}>
                      {expandedSteps().has(idx()) ? '▲ hide' : `▼ ${msg.reasoningSteps!.length} steps`}
                    </button>
                  </Show>
                </div>
              </Show>
              {/* Reasoning steps */}
              <Show when={msg.role === 'assistant' && expandedSteps().has(idx()) && msg.reasoningSteps?.length}>
                <div style={{ 'max-width': '92%', background: 'var(--s2)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '10px 12px', display: 'flex', 'flex-direction': 'column', gap: '6px' }}>
                  <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t4)', 'text-transform': 'uppercase', 'letter-spacing': '.06em' }}>Reasoning</div>
                  <For each={msg.reasoningSteps}>{step => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ 'font-size': '9.5px', 'font-weight': '700', color: 'var(--brand)', background: 'var(--brandDim)', 'border-radius': 'var(--r4)', padding: '1px 5px', 'flex-shrink': '0' }}>{step.step}</span>
                      <div>
                        <span style={{ 'font-size': '11.5px', color: 'var(--t2)' }}>{step.action}</span>
                        <Show when={step.tool}><span style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-left': '5px', 'font-family': 'var(--mono)' }}>[{step.tool}]</span></Show>
                        <Show when={step.observation}><div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'margin-top': '1px' }}>{step.observation}</div></Show>
                      </div>
                    </div>
                  )}</For>
                </div>
              </Show>
            </div>
          )}</For>

          {/* Thinking indicator */}
          <Show when={loading()}>
            <div style={{ display: 'flex', gap: '6px', 'align-items': 'center', padding: '10px 14px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', width: 'fit-content' }}>
              <For each={[0, 150, 300]}>{d => <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: 'var(--brand)', animation: 'orkaBounce 1s ease-in-out infinite', 'animation-delay': `${d}ms` }} />}</For>
              <span style={{ 'font-size': '12px', color: 'var(--t4)', 'margin-left': '4px' }}>Thinking…</span>
            </div>
          </Show>
          <div ref={msgEnd} />
        </div>

        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); send(input().trim()); }} style={{ padding: '10px 14px', 'border-top': '1px solid var(--b1)', background: 'var(--s1)', 'flex-shrink': '0' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text" value={input()} onInput={e => setInput(e.currentTarget.value)}
              placeholder="Ask Orkas AI anything about your cluster…" disabled={loading()}
              style={{ flex: '1', background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '8px 12px', 'font-size': '12.5px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--font)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
            />
            <button type="submit" disabled={loading() || !input().trim()} style={{ background: 'var(--brand)', border: 'none', 'border-radius': 'var(--r8)', padding: '8px 16px', cursor: 'pointer', color: '#fff', 'font-size': '12px', 'font-weight': '600', opacity: loading() || !input().trim() ? '0.45' : '1', 'font-family': 'var(--font)', 'flex-shrink': '0' }}>
              Ask
            </button>
          </div>
        </form>
      </Show>

      {/* ════════════════════ TAB: KNOWLEDGE ════════════════════ */}
      <Show when={tab() === 'knowledge'}>
        <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
          <div style={{ 'font-size': '12px', color: 'var(--t3)', 'line-height': '1.6' }}>
            Add runbooks, past incident notes, or docs to the Orkas AI knowledge base. This improves RCA and fix quality through RAG retrieval.
          </div>
          <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '12px 14px', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <input type="text" value={ingestTitle()} onInput={e => setIngestTitle(e.currentTarget.value)} placeholder="Title (e.g. Redis OOM Runbook)"
              style={{ background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', padding: '7px 10px', 'font-size': '11.5px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--font)' }}
            />
            <select value={ingestType()} onChange={e => setIngestType(e.currentTarget.value)} style={{ background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', padding: '7px 10px', 'font-size': '11.5px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--font)' }}>
              <option value="runbook">Runbook</option>
              <option value="kubernetes">Kubernetes Manifest</option>
              <option value="terraform">Terraform Config</option>
              <option value="generic">Generic Document</option>
            </select>
            <textarea value={ingestContent()} onInput={e => setIngestContent(e.currentTarget.value)}
              placeholder="Paste your runbook, manifest, or documentation here…" rows={10}
              style={{ background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', padding: '8px 10px', 'font-size': '11.5px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--mono)', resize: 'vertical' }}
            />
            <button onClick={ingest} disabled={ingestLoading() || !ingestContent().trim()} style={{ background: 'var(--brand)', border: 'none', 'border-radius': 'var(--r6)', padding: '9px', cursor: 'pointer', color: '#fff', 'font-size': '12px', 'font-weight': '600', 'font-family': 'var(--font)', opacity: ingestLoading() || !ingestContent().trim() ? '0.5' : '1' }}>
              {ingestLoading() ? 'Ingesting…' : '+ Add to Knowledge Base'}
            </button>
            <Show when={ingestMsg()}>
              <div style={{ 'font-size': '11.5px', padding: '7px 10px', 'border-radius': 'var(--r6)', background: ingestMsg().startsWith('✓') ? 'var(--okBg)' : 'var(--critBg)', color: ingestMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>{ingestMsg()}</div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Shared styles */}
      <style>{`
        @keyframes orkaBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        .orka-md{font-size:12px;line-height:1.7;color:var(--t2)}
        .orka-md p{margin:0 0 8px}.orka-md p:last-child{margin:0}
        .orka-md table{border-collapse:collapse;width:100%;margin:8px 0;font-size:11px}
        .orka-md th,.orka-md td{border:1px solid var(--b2);padding:4px 8px;text-align:left}
        .orka-md th{background:var(--s3);font-weight:600;color:var(--t2)}.orka-md td{color:var(--t3)}
        .orka-md code{background:var(--s3);padding:1px 5px;border-radius:4px;font-family:var(--mono);font-size:10.5px}
        .orka-md pre{background:#0D1117;padding:10px 12px;border-radius:var(--r8);margin:8px 0;overflow-x:auto}
        .orka-md pre code{background:none;padding:0;color:#67e8f9}
        .orka-md ul,.orka-md ol{padding-left:18px;margin:5px 0}.orka-md li{margin:3px 0}
        .orka-md strong{color:var(--t1);font-weight:600}
        .orka-md h2{font-size:13px;font-weight:600;color:var(--t1);margin:10px 0 5px}
        .orka-md h3{font-size:12px;font-weight:600;color:var(--t1);margin:8px 0 4px}
        .orka-md blockquote{border-left:3px solid var(--brand);padding-left:10px;color:var(--t4);margin:6px 0}
      `}</style>
    </div>
  );
};

export default OrkasAIPanel;
