/**
 * SafeFixPanel — Intelligence Workspace screen
 * Embeds the AutoFix engine (rules + recent actions) inline in the workspace,
 * styled with workspace CSS variables so it feels native to the shell.
 */

import { Component, createSignal, createResource, For, Show, createEffect, onCleanup } from 'solid-js';
import { api, type AutoFixRule, type AutoFixRuleSettings } from '../../services/api';
import { addNotification } from '../../stores/ui';

interface AutoFixAction {
  id: string;
  timestamp: string;
  type: string;
  resource: string;
  namespace: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
}

const TYPE_COLOR: Record<string, string> = {
  oom:      'var(--crit)',
  hpa_max:  'var(--blue)',
  security: 'var(--warn)',
  drift:    '#a855f7',
};

const TYPE_LABEL: Record<string, string> = {
  oom:      'OOM',
  hpa_max:  'HPA Max',
  security: 'Security',
  drift:    'Drift',
};

const STATUS_COLOR: Record<string, string> = {
  success: 'var(--ok)',
  failed:  'var(--crit)',
  pending: 'var(--warn)',
};

/* ─── Toggle pill ───────────────────────────────────────────── */
const Toggle: Component<{
  value: boolean;
  disabled?: boolean;
  title?: string;
  onChange: () => void;
}> = (props) => (
  <div
    onClick={() => !props.disabled && props.onChange()}
    title={props.title}
    style={{
      width: '28px', height: '16px', 'border-radius': '8px',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      background: props.value ? 'var(--ok)' : 'var(--b2)',
      position: 'relative', transition: 'background 0.2s',
      opacity: props.disabled ? '0.4' : '1',
      'flex-shrink': '0',
    }}
  >
    <div style={{
      position: 'absolute', top: '2px',
      left: props.value ? '13px' : '2px',
      width: '12px', height: '12px', 'border-radius': '50%',
      background: '#fff', transition: 'left 0.2s',
    }} />
  </div>
);

/* ─── Main panel ────────────────────────────────────────────── */
const SafeFixPanel: Component = () => {
  const [toggling,       setToggling]       = createSignal<string | null>(null);
  const [globalToggling, setGlobalToggling] = createSignal(false);
  const [selectedType,   setSelectedType]   = createSignal<string>('all');

  /* ── API resources ── */
  const [rules,   { refetch: refetchRules   }] = createResource<AutoFixRule[]>(async () => {
    try { return await api.getAutoFixRules(); }
    catch { return []; }
  });

  const [enabled, { refetch: refetchEnabled }] = createResource<boolean>(async () => {
    try { return await api.getAutoFixEnabled(); }
    catch { return false; }
  });

  const [actions, { refetch: refetchActions }] = createResource<AutoFixAction[]>(async () => {
    try { return (await api.getAutoFixActions()) as AutoFixAction[]; }
    catch { return []; }
  });

  /* ── Auto-refresh every 60 s ── */
  createEffect(() => {
    const id = setInterval(() => {
      refetchRules();
      refetchActions();
    }, 60_000);
    onCleanup(() => clearInterval(id));
  });

  /* ── Handlers ── */
  const handleToggleGlobal = async () => {
    setGlobalToggling(true);
    try {
      const next = !(enabled() ?? false);
      await api.setAutoFixEnabled(next);
      refetchEnabled();
      addNotification(`AutoFix ${next ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: any) {
      addNotification(e?.message || 'Failed to update', 'error');
    } finally {
      setGlobalToggling(false);
    }
  };

  const handleToggleRule = async (rule: AutoFixRule) => {
    setToggling(rule.id);
    try {
      await api.toggleAutoFixRule(rule.id, !rule.enabled, rule.settings);
      refetchRules();
      addNotification(`${rule.name} ${!rule.enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: any) {
      addNotification(e?.message || 'Failed to update rule', 'error');
    } finally {
      setToggling(null);
    }
  };

  const isEnabled = () => enabled() ?? false;

  const filteredRules = () => {
    const all = rules() || [];
    if (selectedType() === 'all') return all;
    return all.filter(r => r.type === selectedType());
  };

  const filteredActions = () => {
    const all = (actions() || []).slice(0, 10);
    if (selectedType() === 'all') return all;
    return all.filter(a => a.type === selectedType());
  };

  /* ── Summary counts (from rules triggerCount) ── */
  const ruleSummary = () => (rules() || []).map(r => ({
    type: r.type,
    label: TYPE_LABEL[r.type] || r.type,
    color: TYPE_COLOR[r.type] || 'var(--t3)',
    enabled: r.enabled && isEnabled(),
    triggers: r.triggerCount,
  }));

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '12px 16px 10px',
        'border-bottom': '1px solid var(--b1)',
        display: 'flex', 'align-items': 'center', gap: '10px',
        'flex-shrink': '0',
      }}>
        <div style={{ flex: '1' }}>
          <div style={{ 'font-size': '13px', 'font-weight': '700', color: 'var(--t1)', 'letter-spacing': '0.01em' }}>
            SafeFix Engine
          </div>
          <div style={{ 'font-size': '11px', color: 'var(--t4)', 'margin-top': '2px' }}>
            Automated remediation · OOM · HPA · Security · Drift
          </div>
        </div>

        {/* Global toggle */}
        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px' }}>
          <span style={{ 'font-size': '10.5px', color: 'var(--t4)' }}>AutoFix</span>
          <Toggle
            value={isEnabled()}
            disabled={globalToggling()}
            title={isEnabled() ? 'Click to disable AutoFix globally' : 'Click to enable AutoFix globally'}
            onChange={handleToggleGlobal}
          />
        </div>

        {/* Refresh */}
        <button
          class="btn ghost"
          style={{ 'font-size': '11px', padding: '4px 8px' }}
          onClick={() => { refetchRules(); refetchActions(); refetchEnabled(); }}
          title="Refresh"
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M2 8a10 10 0 0118-2.3M22 16a10 10 0 01-18 2.3"/>
            <path d="M22 4v6h-6M2 20v-6h6"/>
          </svg>
        </button>
      </div>

      {/* ── Summary badges (one per rule type) ── */}
      <div style={{
        padding: '8px 14px',
        'border-bottom': '1px solid var(--b1)',
        display: 'flex', gap: '6px', 'flex-wrap': 'wrap',
        'flex-shrink': '0',
        background: 'var(--bg2)',
      }}>
        <For each={ruleSummary()}>
          {(s) => (
            <div
              onClick={() => setSelectedType(prev => prev === s.type ? 'all' : s.type)}
              style={{
                display: 'flex', 'align-items': 'center', gap: '5px',
                padding: '4px 9px', 'border-radius': '12px', cursor: 'pointer',
                border: `1px solid ${selectedType() === s.type ? s.color : 'var(--b1)'}`,
                background: selectedType() === s.type
                  ? `color-mix(in srgb, ${s.color} 12%, transparent)`
                  : 'var(--bg1)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: '7px', height: '7px', 'border-radius': '50%',
                background: s.enabled ? s.color : 'var(--t5)',
                'flex-shrink': '0',
              }} />
              <span style={{ 'font-size': '10.5px', 'font-weight': '600', color: s.enabled ? s.color : 'var(--t5)' }}>
                {s.label}
              </span>
              <span style={{ 'font-size': '10px', color: 'var(--t5)', 'font-family': 'var(--mono)' }}>
                {s.triggers}×
              </span>
            </div>
          )}
        </For>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: '1', overflow: 'auto', padding: '12px 14px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>

        {/* Rules section */}
        <section>
          <div style={{
            'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
            'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
          }}>
            Rules
          </div>
          <Show when={rules.loading}>
            <div style={{ color: 'var(--t5)', 'font-size': '12px', 'text-align': 'center', padding: '16px 0' }}>Loading…</div>
          </Show>
          <Show when={!rules.loading}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px' }}>
              <For each={filteredRules()}>
                {(rule) => (
                  <div style={{
                    padding: '9px 12px',
                    background: 'var(--bg2)',
                    'border-radius': '6px',
                    border: '1px solid var(--b1)',
                    display: 'flex', 'align-items': 'center', gap: '10px',
                  }}>
                    {/* Type badge */}
                    <span style={{
                      'font-size': '9.5px', 'font-weight': '700', 'letter-spacing': '0.04em',
                      color: TYPE_COLOR[rule.type] || 'var(--t3)',
                      background: `color-mix(in srgb, ${TYPE_COLOR[rule.type] || 'var(--t3)'} 12%, transparent)`,
                      padding: '2px 7px', 'border-radius': '4px',
                      'flex-shrink': '0', 'min-width': '52px', 'text-align': 'center',
                    }}>
                      {TYPE_LABEL[rule.type] || rule.type.toUpperCase()}
                    </span>

                    {/* Info */}
                    <div style={{ flex: '1', 'min-width': '0' }}>
                      <div style={{
                        'font-size': '11.5px', 'font-weight': '600', color: 'var(--t2)',
                        'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis',
                      }}>
                        {rule.name}
                      </div>
                      <div style={{ 'font-size': '10px', color: 'var(--t5)', 'margin-top': '1px' }}>
                        {rule.triggerCount} trigger{rule.triggerCount !== 1 ? 's' : ''}
                        {rule.lastTriggered
                          ? ` · Last ${new Date(rule.lastTriggered).toLocaleDateString()}`
                          : ' · Never triggered'}
                      </div>
                    </div>

                    {/* Toggle */}
                    <Toggle
                      value={rule.enabled && isEnabled()}
                      disabled={!isEnabled() || toggling() === rule.id}
                      title={
                        !isEnabled()
                          ? 'Enable AutoFix globally first'
                          : rule.enabled ? 'Click to disable' : 'Click to enable'
                      }
                      onChange={() => handleToggleRule(rule)}
                    />
                  </div>
                )}
              </For>
              <Show when={filteredRules().length === 0}>
                <div style={{ color: 'var(--t5)', 'font-size': '12px', 'text-align': 'center', padding: '10px 0' }}>
                  No rules for selected type
                </div>
              </Show>
            </div>
          </Show>
        </section>

        {/* Recent Actions section */}
        <section>
          <div style={{
            'font-size': '10px', 'font-weight': '700', 'letter-spacing': '0.08em',
            'text-transform': 'uppercase', color: 'var(--t4)', 'margin-bottom': '8px',
            display: 'flex', 'align-items': 'center', gap: '6px',
          }}>
            Recent Actions
            <Show when={actions.loading}>
              <div style={{
                width: '10px', height: '10px', 'border-radius': '50%',
                border: '2px solid var(--b2)', 'border-top-color': 'var(--brand)',
                animation: 'spin 0.8s linear infinite',
              }} />
            </Show>
          </div>

          <Show when={!actions.loading && filteredActions().length === 0}>
            <div style={{
              color: 'var(--t5)', 'font-size': '12px', 'text-align': 'center',
              padding: '20px 0', border: '1px dashed var(--b1)', 'border-radius': '6px',
            }}>
              No remediation actions yet
            </div>
          </Show>

          <Show when={!actions.loading && filteredActions().length > 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px' }}>
              <For each={filteredActions()}>
                {(action) => (
                  <div style={{
                    padding: '8px 11px',
                    background: 'var(--bg2)',
                    'border-radius': '5px',
                    border: '1px solid var(--b1)',
                    'border-left': `3px solid ${STATUS_COLOR[action.status] || 'var(--b2)'}`,
                  }}>
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '7px', 'margin-bottom': '3px' }}>
                      <span style={{
                        'font-size': '9px', 'font-weight': '700', 'letter-spacing': '0.06em',
                        'text-transform': 'uppercase',
                        color: STATUS_COLOR[action.status] || 'var(--t4)',
                        'flex-shrink': '0',
                      }}>
                        {action.status}
                      </span>
                      <span style={{
                        'font-size': '11px', 'font-weight': '600', color: 'var(--t2)',
                        flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap',
                      }}>
                        {action.resource}
                      </span>
                      <span style={{ 'font-size': '10px', color: 'var(--t5)', 'flex-shrink': '0' }}>
                        {new Date(action.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'font-family': 'var(--mono)' }}>
                      {action.namespace} · {action.message}
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </section>

      </div>
    </div>
  );
};

export default SafeFixPanel;
