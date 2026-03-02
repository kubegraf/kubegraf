/**
 * KnowledgeBankPanel — Intelligence Workspace screen
 * Displays the learning engine status (feature weights, cause priors, sample size)
 * and provides Export / Import controls for the Knowledge Bank.
 */

import { Component, createResource, createSignal, For, Show } from 'solid-js';
import { api } from '../../services/api';

/* ─── helpers ────────────────────────────────────────────── */

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
};

const pct = (w: number) => `${Math.round(Math.max(0, Math.min(1, w)) * 100)}%`;

const WEIGHT_COLOR = (w: number) =>
  w >= 0.7 ? 'var(--ok)' : w >= 0.4 ? 'var(--warn)' : w < 0 ? 'var(--crit)' : 'var(--blue)';

/* ─── main panel ────────────────────────────────────────── */

const KnowledgeBankPanel: Component = () => {
  const [importing, setImporting] = createSignal(false);
  const [importMsg, setImportMsg] = createSignal('');
  const [resetConfirm, setResetConfirm] = createSignal(false);
  const [resetting, setResetting] = createSignal(false);

  const [status, { refetch }] = createResource(async () => {
    try { return await api.getLearningStatus(); }
    catch { return null; }
  });

  /* ── Export ── */
  const handleExport = () => {
    const a = document.createElement('a');
    a.href = '/api/knowledge/export';
    a.download = `kubegraf-knowledge-bank-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  /* ── Import ── */
  const handleImport = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const body = JSON.parse(text);
      const res = await fetch('/api/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setImportMsg('✓ Knowledge Bank imported successfully');
        refetch();
      } else {
        setImportMsg(`✗ Import failed: ${json.error || res.statusText}`);
      }
    } catch (err: any) {
      setImportMsg(`✗ ${err?.message || 'Import failed'}`);
    } finally {
      setImporting(false);
      input.value = '';
    }
  };

  /* ── Reset ── */
  const handleReset = async () => {
    if (!resetConfirm()) { setResetConfirm(true); return; }
    setResetting(true);
    setResetConfirm(false);
    try {
      await api.resetLearning();
      setImportMsg('✓ Learning engine reset to factory defaults');
      refetch();
    } catch (err: any) {
      setImportMsg(`✗ ${err?.message || 'Reset failed'}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px 10px', 'border-bottom': '1px solid var(--b1)',
        display: 'flex', 'align-items': 'center', gap: '10px', 'flex-shrink': '0',
      }}>
        <div style={{ flex: '1' }}>
          <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--t1)', 'letter-spacing': '0.01em' }}>
            Knowledge Bank
          </div>
          <div style={{ 'font-size': '11px', color: 'var(--t4)', 'margin-top': '2px' }}>
            Learning engine · Feature weights · Cause priors
          </div>
        </div>

        {/* Refresh */}
        <button
          class="btn ghost"
          style={{ 'font-size': '11px', padding: '4px 8px' }}
          onClick={() => refetch()}
          title="Refresh"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M2 8a10 10 0 0118-2.3M22 16a10 10 0 01-18 2.3"/>
            <path d="M22 4v6h-6M2 20v-6h6"/>
          </svg>
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: '1', overflow: 'auto', padding: '12px 14px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>

        {/* Loading */}
        <Show when={status.loading}>
          <div style={{ color: 'var(--t5)', 'font-size': '12px', 'text-align': 'center', padding: '32px 0' }}>
            Loading learning status…
          </div>
        </Show>

        <Show when={!status.loading}>
          {/* Stats summary */}
          <Show when={status()}>
            {(s) => (
              <div style={{
                display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px',
              }}>
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  'border-radius': '8px', padding: '10px 12px',
                }}>
                  <div style={{ 'font-size': '22px', 'font-weight': '700', color: 'var(--brand)', 'font-family': 'var(--mono)' }}>
                    {s().sampleSize ?? 0}
                  </div>
                  <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-top': '2px' }}>Training samples</div>
                </div>
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  'border-radius': '8px', padding: '10px 12px',
                }}>
                  <div style={{ 'font-size': '22px', 'font-weight': '700', color: 'var(--ok)', 'font-family': 'var(--mono)' }}>
                    {(s().featureWeights || []).length}
                  </div>
                  <div style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-top': '2px' }}>Learned signals</div>
                </div>
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--b1)',
                  'border-radius': '8px', padding: '10px 12px', 'grid-column': '1 / -1',
                }}>
                  <div style={{ 'font-size': '10px', color: 'var(--t5)' }}>Last updated</div>
                  <div style={{ 'font-size': '11.5px', color: 'var(--t2)', 'margin-top': '2px', 'font-family': 'var(--mono)' }}>
                    {fmtDate(s().lastUpdated)}
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Feature weights */}
          <Show when={status() && (status()?.featureWeights?.length ?? 0) > 0}>
            <section>
              <div style={{
                'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
                'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
              }}>
                Feature Weights
                <span style={{ 'font-size': '9px', color: 'var(--t5)', 'margin-left': '6px', 'font-weight': '400', 'text-transform': 'none', 'letter-spacing': 'normal' }}>
                  · higher = stronger signal
                </span>
              </div>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px' }}>
                <For each={(status()?.featureWeights || []).slice(0, 12)}>
                  {(fw) => (
                    <div style={{
                      display: 'flex', 'align-items': 'center', gap: '8px',
                      padding: '6px 10px', background: 'var(--bg2)',
                      'border-radius': '5px', border: '1px solid var(--b1)',
                    }}>
                      <div style={{ flex: '1', 'min-width': '0' }}>
                        <div style={{
                          'font-size': '11px', color: 'var(--t2)', 'font-family': 'var(--mono)',
                          overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap',
                        }}>
                          {fw.key}
                        </div>
                      </div>
                      <div style={{ 'min-width': '120px' }}>
                        <div style={{
                          height: '4px', background: 'var(--b2)', 'border-radius': '2px', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: pct(Math.abs(fw.weight)),
                            background: WEIGHT_COLOR(fw.weight),
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                      <div style={{
                        'font-size': '10.5px', 'font-weight': '600',
                        color: WEIGHT_COLOR(fw.weight),
                        'font-family': 'var(--mono)', 'min-width': '42px', 'text-align': 'right',
                      }}>
                        {fw.weight >= 0 ? '+' : ''}{fw.weight.toFixed(3)}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* Cause priors */}
          <Show when={status() && (status()?.causePriors?.length ?? 0) > 0}>
            <section>
              <div style={{
                'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
                'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
              }}>
                Cause Priors
                <span style={{ 'font-size': '9px', color: 'var(--t5)', 'margin-left': '6px', 'font-weight': '400', 'text-transform': 'none', 'letter-spacing': 'normal' }}>
                  · learned base-rate per root-cause type
                </span>
              </div>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px' }}>
                <For each={(status()?.causePriors || []).slice(0, 10)}>
                  {(cp) => (
                    <div style={{
                      display: 'flex', 'align-items': 'center', gap: '8px',
                      padding: '6px 10px', background: 'var(--bg2)',
                      'border-radius': '5px', border: '1px solid var(--b1)',
                    }}>
                      <div style={{
                        width: '7px', height: '7px', 'border-radius': '50%',
                        background: `hsl(${Math.round(cp.prior * 120)}, 60%, 55%)`,
                        'flex-shrink': '0',
                      }} />
                      <div style={{ flex: '1', 'font-size': '11px', color: 'var(--t2)', 'font-family': 'var(--mono)' }}>
                        {cp.causeKey.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        'font-size': '10.5px', 'font-weight': '600',
                        color: 'var(--t3)', 'font-family': 'var(--mono)',
                      }}>
                        {Math.round(cp.prior * 100)}%
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* Top improving signals */}
          <Show when={(status()?.topImprovingSignals?.length ?? 0) > 0}>
            <section>
              <div style={{
                'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
                'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
              }}>
                Top Improving Signals
              </div>
              <div style={{ display: 'flex', gap: '6px', 'flex-wrap': 'wrap' }}>
                <For each={status()?.topImprovingSignals || []}>
                  {(sig) => (
                    <span style={{
                      padding: '3px 9px', 'border-radius': '12px',
                      background: 'rgba(34,197,94,.1)', color: 'var(--ok)',
                      border: '1px solid rgba(34,197,94,.25)',
                      'font-size': '10.5px', 'font-family': 'var(--mono)',
                    }}>
                      {sig}
                    </span>
                  )}
                </For>
              </div>
            </section>
          </Show>

          {/* No data state */}
          <Show when={!status()}>
            <div style={{
              color: 'var(--t5)', 'font-size': '12px', 'text-align': 'center',
              padding: '32px 16px', border: '1px dashed var(--b1)', 'border-radius': '8px',
            }}>
              Learning engine has no data yet.<br />
              <span style={{ 'font-size': '11px' }}>Submit incident feedback to start training.</span>
            </div>
          </Show>
        </Show>

        {/* ── Export / Import / Reset ── */}
        <section>
          <div style={{
            'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
            'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
          }}>
            Data Management
          </div>

          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            {/* Export */}
            <button
              class="btn ghost"
              style={{ display: 'flex', 'align-items': 'center', gap: '7px', 'font-size': '11.5px', padding: '9px 12px', 'justify-content': 'flex-start', width: '100%', 'border-radius': '6px' }}
              onClick={handleExport}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Knowledge Bank (JSON)
            </button>

            {/* Import */}
            <label
              style={{
                display: 'flex', 'align-items': 'center', gap: '7px',
                'font-size': '11.5px', padding: '9px 12px',
                background: 'var(--bg1)', border: '1px solid var(--b1)',
                'border-radius': '6px', cursor: importing() ? 'wait' : 'pointer',
                color: 'var(--t2)', 'font-weight': '500',
                opacity: importing() ? '0.7' : '1',
              }}
              title="Import a previously exported Knowledge Bank JSON"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {importing() ? 'Importing…' : 'Import Knowledge Bank (JSON)'}
              <input
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                disabled={importing()}
                onChange={handleImport}
              />
            </label>

            {/* Reset */}
            <button
              class="btn ghost"
              style={{
                display: 'flex', 'align-items': 'center', gap: '7px',
                'font-size': '11.5px', padding: '9px 12px', 'justify-content': 'flex-start',
                width: '100%', 'border-radius': '6px',
                color: resetConfirm() ? 'var(--crit)' : 'var(--t4)',
                'border-color': resetConfirm() ? 'rgba(220,38,38,.4)' : undefined,
              }}
              disabled={resetting()}
              onClick={handleReset}
              title="Reset all learned weights and priors to factory defaults"
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              {resetting() ? 'Resetting…' : resetConfirm() ? '⚠ Confirm: Reset learning data?' : 'Reset Learning Engine'}
            </button>
          </div>

          {/* Status message */}
          <Show when={importMsg()}>
            <div style={{
              'margin-top': '8px', padding: '7px 10px',
              background: importMsg().startsWith('✓') ? 'rgba(34,197,94,.08)' : 'rgba(220,38,38,.08)',
              border: `1px solid ${importMsg().startsWith('✓') ? 'rgba(34,197,94,.3)' : 'rgba(220,38,38,.3)'}`,
              'border-radius': '5px', 'font-size': '11px',
              color: importMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)',
            }}>
              {importMsg()}
            </div>
          </Show>
        </section>

        {/* How feedback trains the model */}
        <section>
          <div style={{
            'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
            'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
          }}>
            How Training Works
          </div>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--b1)',
            'border-radius': '8px', padding: '12px 14px',
            'font-size': '11px', color: 'var(--t4)', 'line-height': '1.7',
          }}>
            <div style={{ 'margin-bottom': '8px', color: 'var(--t3)', 'font-weight': '600' }}>Feedback → Learning pipeline</div>
            <div>1. You submit feedback (✅ / ❌ / ⚠️) on a fix in the Incident Fix tab</div>
            <div>2. The engine records the outcome against the incident's feature vector</div>
            <div>3. Feature weights are updated via gradient descent</div>
            <div>4. Cause priors are adjusted based on confirmed / rejected root causes</div>
            <div style={{ 'margin-top': '8px', color: 'var(--brand)', 'font-size': '10.5px' }}>
              Export your Knowledge Bank before cluster migrations or to share across teams.
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default KnowledgeBankPanel;
