/**
 * MLInsightsPanel — Intelligence Workspace screen
 * Embeds the ML Recommendations engine inline in the workspace,
 * styled with workspace CSS variables so it feels native to the shell.
 * Data comes from /api/ml/recommendations (same as AI/ML Insights page).
 */

import { Component, createSignal, createResource, For, Show, createMemo } from 'solid-js';
import { api } from '../../services/api';
import { addNotification } from '../../stores/ui';

/* ─── Types ─────────────────────────────────────────────────── */
interface MLRec {
  id: string;
  resource: string;    // e.g. "Deployment/payment-service"
  namespace: string;
  metric: string;      // "cpu" | "memory"
  currentValue: number;
  recommendedValue: number;
  confidence: number;  // 0–1
  reason: string;
  createdAt: string;
}

interface MetricsStats {
  totalSamples: number;
  minRequired: number;
  progress: number;       // 0–100
  hasEnoughData: boolean;
  remainingNeeded: number;
}

interface RecsResponse {
  recommendations: MLRec[];
  total: number;
  error?: string;
  metricsStats?: MetricsStats;
}

/* ─── Helpers ───────────────────────────────────────────────── */
const confColor = (c: number) =>
  c >= 0.8 ? 'var(--ok)' : c >= 0.6 ? 'var(--warn)' : 'var(--crit)';

const metricIcon = (m: string) => m === 'memory' ? '💾' : '⚡';

/* ─── Main panel ─────────────────────────────────────────────── */
const MLInsightsPanel: Component = () => {
  const [applying,  setApplying]  = createSignal<string | null>(null);
  const [applyMsg,  setApplyMsg]  = createSignal<{ id: string; ok: boolean; text: string } | null>(null);
  const [metricFilter, setMetricFilter] = createSignal<'all' | 'cpu' | 'memory'>('all');

  /* ── Fetch ── */
  const [data, { refetch }] = createResource<RecsResponse>(async () => {
    try {
      return await api.getMLRecommendations() as RecsResponse;
    } catch (e: any) {
      return { recommendations: [], total: 0, error: e?.message || 'Failed to load ML recommendations' };
    }
  });

  /* ── Derived ── */
  const allRecs = createMemo<MLRec[]>(() => {
    const d = data();
    if (!d || !Array.isArray(d.recommendations)) return [];
    return d.recommendations as MLRec[];
  });

  const recs = createMemo(() => {
    const f = metricFilter();
    if (f === 'all') return allRecs();
    return allRecs().filter(r => r.metric === f);
  });

  const stats = createMemo<MetricsStats | null>(() => data()?.metricsStats ?? null);

  const highConfCount = createMemo(() => allRecs().filter(r => r.confidence >= 0.8).length);
  const cpuCount      = createMemo(() => allRecs().filter(r => r.metric === 'cpu').length);
  const memCount      = createMemo(() => allRecs().filter(r => r.metric === 'memory').length);

  /* ── Apply ── */
  const handleApply = async (rec: MLRec) => {
    if (!confirm(
      `Apply ML recommendation for ${rec.resource} in ${rec.namespace}?\n\n` +
      `${rec.metric.toUpperCase()}: ${rec.currentValue} → ${rec.recommendedValue}\n\n` +
      `Reason: ${rec.reason}`
    )) return;

    setApplying(rec.id);
    setApplyMsg(null);

    try {
      const result = await api.applyRecommendation(rec.id);
      if (result?.success) {
        setApplyMsg({ id: rec.id, ok: true, text: result.message || 'Applied successfully' });
        addNotification(`Applied recommendation for ${rec.resource}`, 'success');
        refetch();
      } else {
        setApplyMsg({ id: rec.id, ok: false, text: result?.error || 'Failed to apply' });
        addNotification(result?.error || 'Failed to apply recommendation', 'error');
      }
    } catch (e: any) {
      setApplyMsg({ id: rec.id, ok: false, text: e?.message || 'Error applying recommendation' });
      addNotification(e?.message || 'Error', 'error');
    } finally {
      setApplying(null);
      setTimeout(() => setApplyMsg(v => v?.id === rec.id ? null : v), 4000);
    }
  };

  /* ── Export ── */
  const handleExport = () => {
    const d = data();
    if (!d?.recommendations?.length) {
      addNotification('No recommendations to export', 'warning');
      return;
    }
    const blob = new Blob(
      [JSON.stringify({
        exportDate: new Date().toISOString(),
        totalRecommendations: d.total,
        metricsStats: d.metricsStats,
        recommendations: d.recommendations,
      }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml-recs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('Recommendations exported', 'success');
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px 10px',
        'border-bottom': '1px solid var(--b1)',
        display: 'flex', 'align-items': 'center', gap: '8px',
        'flex-shrink': '0',
      }}>
        <div style={{ flex: '1' }}>
          <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--t1)', 'letter-spacing': '0.01em' }}>
            ML Insights
          </div>
          <div style={{ 'font-size': '11px', color: 'var(--t4)', 'margin-top': '2px' }}>
            Resource right-sizing from historical metrics
          </div>
        </div>

        <Show when={allRecs().length > 0}>
          <button
            class="btn ghost"
            style={{ 'font-size': '11px', padding: '4px 8px' }}
            onClick={handleExport}
            title="Export as JSON"
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M7 19H5a2 2 0 01-2-2V5a2 2 0 012-2h9l7 7v9a2 2 0 01-2 2H7z"/>
            </svg>
          </button>
        </Show>

        <button
          class="btn ghost"
          style={{ 'font-size': '11px', padding: '4px 8px' }}
          onClick={() => refetch()}
          disabled={data.loading}
          title="Refresh"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M2 8a10 10 0 0118-2.3M22 16a10 10 0 01-18 2.3"/>
            <path d="M22 4v6h-6M2 20v-6h6"/>
          </svg>
        </button>
      </div>

      {/* ── Stats row ── */}
      <Show when={!data.loading && allRecs().length > 0}>
        <div style={{
          padding: '8px 14px',
          'border-bottom': '1px solid var(--b1)',
          display: 'flex', gap: '6px',
          'flex-shrink': '0',
          background: 'var(--bg2)',
        }}>
          {/* All */}
          <div
            onClick={() => setMetricFilter('all')}
            style={{
              flex: '1', padding: '6px 8px', 'border-radius': '6px', cursor: 'pointer',
              border: `1px solid ${metricFilter() === 'all' ? 'var(--brand)' : 'var(--b1)'}`,
              background: metricFilter() === 'all' ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--bg1)',
              'text-align': 'center',
            }}
          >
            <div style={{ 'font-size': '15px', 'font-weight': '700', color: 'var(--brand)' }}>
              {allRecs().length}
            </div>
            <div style={{ 'font-size': '9.5px', color: 'var(--t5)' }}>All</div>
          </div>

          {/* CPU */}
          <div
            onClick={() => setMetricFilter(metricFilter() === 'cpu' ? 'all' : 'cpu')}
            style={{
              flex: '1', padding: '6px 8px', 'border-radius': '6px', cursor: 'pointer',
              border: `1px solid ${metricFilter() === 'cpu' ? 'var(--blue)' : 'var(--b1)'}`,
              background: metricFilter() === 'cpu' ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'var(--bg1)',
              'text-align': 'center',
            }}
          >
            <div style={{ 'font-size': '15px', 'font-weight': '700', color: 'var(--blue)' }}>
              {cpuCount()}
            </div>
            <div style={{ 'font-size': '9.5px', color: 'var(--t5)' }}>⚡ CPU</div>
          </div>

          {/* Memory */}
          <div
            onClick={() => setMetricFilter(metricFilter() === 'memory' ? 'all' : 'memory')}
            style={{
              flex: '1', padding: '6px 8px', 'border-radius': '6px', cursor: 'pointer',
              border: `1px solid ${metricFilter() === 'memory' ? 'var(--warn)' : 'var(--b1)'}`,
              background: metricFilter() === 'memory' ? 'color-mix(in srgb, var(--warn) 10%, transparent)' : 'var(--bg1)',
              'text-align': 'center',
            }}
          >
            <div style={{ 'font-size': '15px', 'font-weight': '700', color: 'var(--warn)' }}>
              {memCount()}
            </div>
            <div style={{ 'font-size': '9.5px', color: 'var(--t5)' }}>💾 Memory</div>
          </div>

          {/* High Confidence */}
          <div style={{
            flex: '1', padding: '6px 8px', 'border-radius': '6px',
            border: '1px solid var(--b1)', background: 'var(--bg1)',
            'text-align': 'center',
          }}>
            <div style={{ 'font-size': '15px', 'font-weight': '700', color: 'var(--ok)' }}>
              {highConfCount()}
            </div>
            <div style={{ 'font-size': '9.5px', color: 'var(--t5)' }}>≥80% conf</div>
          </div>
        </div>
      </Show>

      {/* ── Body ── */}
      <div style={{ flex: '1', overflow: 'auto', padding: '12px 14px' }}>

        {/* Loading */}
        <Show when={data.loading}>
          <div style={{ 'text-align': 'center', padding: '32px 0', color: 'var(--t4)', 'font-size': '12px' }}>
            <div style={{
              width: '20px', height: '20px', 'border-radius': '50%',
              border: '2px solid var(--b2)', 'border-top-color': 'var(--brand)',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 10px',
            }} />
            Analysing cluster metrics…
          </div>
        </Show>

        {/* Error */}
        <Show when={!data.loading && data()?.error}>
          <div style={{
            padding: '10px 12px', 'border-radius': '6px', 'margin-bottom': '12px',
            border: '1px solid color-mix(in srgb, var(--crit) 30%, transparent)',
            background: 'color-mix(in srgb, var(--crit) 8%, transparent)',
            'font-size': '11.5px', color: 'var(--crit)',
          }}>
            {data()?.error}
            <div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'margin-top': '5px' }}>
              Tip: Run anomaly detection first to collect metrics history.
            </div>
          </div>
        </Show>

        {/* Metrics progress (not enough data yet) */}
        <Show when={!data.loading && !data()?.error && stats() && !stats()!.hasEnoughData}>
          {() => {
            const s = stats()!;
            const pct = Math.min(100, s.progress || 0);
            return (
              <div style={{
                padding: '12px 14px', 'border-radius': '8px',
                border: '1px solid var(--b1)', background: 'var(--bg2)',
                'margin-bottom': '14px',
              }}>
                <div style={{ 'font-size': '12px', 'font-weight': '600', color: 'var(--t2)', 'margin-bottom': '8px' }}>
                  Collecting metrics history…
                </div>
                <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '5px' }}>
                  <span style={{ 'font-size': '11px', color: 'var(--t4)' }}>Samples collected</span>
                  <span style={{ 'font-size': '11px', 'font-family': 'var(--mono)', color: 'var(--t2)' }}>
                    {(s.totalSamples || 0).toLocaleString()} / {s.minRequired}
                  </span>
                </div>
                <div style={{ height: '5px', background: 'var(--b1)', 'border-radius': '3px', overflow: 'hidden', 'margin-bottom': '6px' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: 'linear-gradient(90deg, var(--brand), color-mix(in srgb, var(--brand) 60%, var(--ok)))',
                    'border-radius': '3px', transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ 'font-size': '10px', color: 'var(--t5)' }}>
                  {s.remainingNeeded} more sample{s.remainingNeeded !== 1 ? 's' : ''} needed ·
                  Background collection runs every 5 min
                </div>
              </div>
            );
          }}
        </Show>

        {/* No recommendations (but enough data) */}
        <Show when={!data.loading && !data()?.error && recs().length === 0 && stats()?.hasEnoughData}>
          <div style={{
            color: 'var(--t4)', 'font-size': '12px', 'text-align': 'center',
            padding: '32px 0', border: '1px dashed var(--b1)', 'border-radius': '8px',
          }}>
            <div style={{ 'font-size': '22px', 'margin-bottom': '6px' }}>✓</div>
            All resources look right-sized — no adjustments needed
          </div>
        </Show>

        {/* No data yet */}
        <Show when={!data.loading && !data()?.error && allRecs().length === 0 && !stats()?.hasEnoughData && !stats()}>
          <div style={{
            color: 'var(--t4)', 'font-size': '12px', 'text-align': 'center',
            padding: '32px 0', border: '1px dashed var(--b1)', 'border-radius': '8px',
          }}>
            <div style={{ 'font-size': '22px', 'margin-bottom': '6px' }}>🧠</div>
            <div style={{ 'font-weight': '600', color: 'var(--t3)', 'margin-bottom': '4px' }}>
              No recommendations yet
            </div>
            <div style={{ 'font-size': '11px' }}>
              Go to AI/ML Insights → run anomaly detection to collect metrics data
            </div>
          </div>
        </Show>

        {/* Recommendations list */}
        <Show when={!data.loading && recs().length > 0}>
          <div style={{
            'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
            'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
          }}>
            Recommendations ({recs().length})
          </div>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <For each={recs()}>
              {(rec) => {
                const parts = String(rec.resource || '').split('/');
                const resName = parts.length > 1 ? parts[1] : rec.resource;
                const resKind = parts.length > 1 ? parts[0] : '';
                const confPct  = Math.round((rec.confidence || 0) * 100);
                const isUp     = rec.recommendedValue > rec.currentValue;
                const msgState = () => applyMsg()?.id === rec.id ? applyMsg() : null;

                return (
                  <div style={{
                    padding: '11px 12px',
                    background: 'var(--bg2)',
                    'border-radius': '7px',
                    border: '1px solid var(--b1)',
                    'border-left': `3px solid ${confColor(rec.confidence || 0)}`,
                  }}>
                    {/* Row 1: resource name + namespace */}
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'margin-bottom': '6px' }}>
                      <span style={{ 'font-size': '13px', 'line-height': '1' }}>{metricIcon(rec.metric)}</span>
                      <span style={{
                        'font-size': '11.5px', 'font-weight': '700', color: 'var(--t1)',
                        flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap',
                      }}>
                        {resName}
                      </span>
                      <Show when={resKind}>
                        <span style={{ 'font-size': '9.5px', color: 'var(--t5)', 'flex-shrink': '0' }}>
                          {resKind}
                        </span>
                      </Show>
                      <span style={{ 'font-size': '9.5px', color: 'var(--t5)', 'font-family': 'var(--mono)', 'flex-shrink': '0' }}>
                        {rec.namespace}
                      </span>
                    </div>

                    {/* Row 2: current → recommended */}
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'margin-bottom': '7px' }}>
                      <span style={{ 'font-size': '10.5px', 'font-weight': '700', color: 'var(--t4)', 'text-transform': 'uppercase', 'font-family': 'var(--mono)' }}>
                        {rec.metric}
                      </span>
                      <span style={{ 'font-size': '12px', color: 'var(--t3)', 'font-family': 'var(--mono)' }}>
                        {rec.currentValue}
                      </span>
                      <span style={{ 'font-size': '14px', color: isUp ? 'var(--warn)' : 'var(--ok)', 'font-weight': '700' }}>
                        {isUp ? '↑' : '↓'}
                      </span>
                      <span style={{
                        'font-size': '12px', 'font-weight': '700',
                        color: isUp ? 'var(--warn)' : 'var(--ok)',
                        'font-family': 'var(--mono)',
                      }}>
                        {rec.recommendedValue}
                      </span>
                    </div>

                    {/* Row 3: confidence bar */}
                    <div style={{ 'margin-bottom': '7px' }}>
                      <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '3px' }}>
                        <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>Confidence</span>
                        <span style={{ 'font-size': '10px', 'font-weight': '700', color: confColor(rec.confidence || 0) }}>
                          {confPct}%
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--b1)', 'border-radius': '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${confPct}%`,
                          background: confColor(rec.confidence || 0),
                          'border-radius': '2px',
                        }} />
                      </div>
                    </div>

                    {/* Row 4: reason */}
                    <div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'line-height': '1.45', 'margin-bottom': '8px' }}>
                      {rec.reason}
                    </div>

                    {/* Row 5: apply */}
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                      <Show when={msgState()}>
                        {(msg) => (
                          <span style={{
                            'font-size': '10.5px',
                            color: msg().ok ? 'var(--ok)' : 'var(--crit)',
                            flex: '1',
                          }}>
                            {msg().ok ? '✓' : '✗'} {msg().text}
                          </span>
                        )}
                      </Show>
                      <Show when={!msgState()}>
                        <span style={{ flex: '1' }} />
                      </Show>
                      <button
                        class="btn primary"
                        style={{ 'font-size': '10.5px', padding: '4px 12px', 'flex-shrink': '0' }}
                        onClick={() => handleApply(rec)}
                        disabled={applying() === rec.id}
                      >
                        {applying() === rec.id ? 'Applying…' : 'Apply'}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>

      </div>
    </div>
  );
};

export default MLInsightsPanel;
