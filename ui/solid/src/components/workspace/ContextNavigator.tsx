/**
 * ContextNavigator — Komodor-style sidebar matching kubegraf-final-white.html
 */

import { Component, For, Show, createSignal, createMemo } from 'solid-js';
import { Incident } from '../../services/api';
import { currentContext } from '../../stores/cluster';

interface ContextNavigatorProps {
  incidents: Incident[];
  currentIndex: number;
  onSelectIncident: (index: number) => void;
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  severity: string[];
  pattern: string[];
  namespace: string[];
  status: string[];
  searchQuery: string;
}

function timeSince(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 0) return 'just now';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function sevOrder(inc: Incident): number {
  switch (inc.severity) {
    case 'critical': return 0;
    case 'high':     return 1;
    case 'medium':   return 2;
    default:         return 3;
  }
}

const ContextNavigator: Component<ContextNavigatorProps> = (props) => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [activeSeverity, setActiveSeverity] = createSignal<string | null>(null);

  // SLO derived from incidents
  const sloData = createMemo(() => {
    const critCount = props.incidents.filter(i => i.severity === 'critical').length;
    const total = props.incidents.length;
    const errorRate = total > 0 ? Math.min(100, (critCount / total) * 100) : 0;
    const availability = Math.max(94, 100 - errorRate * 0.5);
    const latencyPct = Math.min(99.5, 100 - critCount * 0.5);
    return [
      {
        name: 'Availability',
        pct: availability,
        val: availability.toFixed(1) + '%',
        target: '99.9%',
        ok: errorRate < 5,
        meta: `Target 99.9% · ${errorRate < 5 ? 'On track' : 'Error budget burning fast'}`,
      },
      {
        name: 'Latency p99',
        pct: latencyPct,
        val: latencyPct.toFixed(1) + '%',
        target: '99.5%',
        ok: critCount < 2,
        meta: `Target 99.5% · ${critCount < 2 ? 'Healthy' : 'Degrading'}`,
      },
    ];
  });

  const counts = createMemo(() => {
    const c = { critical: 0, high: 0, ok: 0 };
    props.incidents.forEach((i) => {
      if (i.severity === 'critical') c.critical++;
      else if (i.severity === 'high') c.high++;
      else c.ok++;
    });
    return c;
  });

  const filteredIncidents = createMemo(() => {
    let list = [...props.incidents];
    const q = searchQuery().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          i.resource?.name?.toLowerCase().includes(q) ||
          i.pattern?.toLowerCase().includes(q) ||
          i.resource?.namespace?.toLowerCase().includes(q)
      );
    }
    const sev = activeSeverity();
    if (sev) {
      list = list.filter((i) => i.severity === sev);
    }
    list.sort((a, b) => {
      const so = sevOrder(a) - sevOrder(b);
      if (so !== 0) return so;
      return new Date(b.firstSeen || 0).getTime() - new Date(a.firstSeen || 0).getTime();
    });
    return list;
  });

  const isDemo = (inc: Incident) => inc.metadata?.['is_demo'] === true;

  const realIncidents = createMemo(() => filteredIncidents().filter(i => !isDemo(i)));
  const demoIncidents = createMemo(() => filteredIncidents().filter(i => isDemo(i)));

  const grouped = createMemo(() => {
    const map = new Map<string, { incident: Incident; originalIndex: number }[]>();
    realIncidents().forEach((inc) => {
      const ns = inc.resource?.namespace || 'default';
      const origIdx = props.incidents.indexOf(inc);
      if (!map.has(ns)) map.set(ns, []);
      map.get(ns)!.push({ incident: inc, originalIndex: origIdx });
    });
    return map;
  });

  const getStatusDot = (inc: Incident): string => {
    if (inc.severity === 'critical') return 'crit';
    if (inc.severity === 'high') return 'warn';
    return 'ok';
  };

  const getNameClass = (inc: Incident): string => {
    if (inc.severity === 'critical') return 'svc-name crit';
    if (inc.severity === 'high') return 'svc-name warn';
    return 'svc-name';
  };

  const handleChipClick = (sev: string | null) => {
    setActiveSeverity(sev === activeSeverity() ? null : sev);
    if (props.onFilterChange) {
      props.onFilterChange({
        severity: sev ? [sev] : [],
        pattern: [],
        namespace: [],
        status: [],
        searchQuery: searchQuery(),
      });
    }
  };

  return (
    <aside class="sidebar" role="navigation" aria-label="Incident list">
      {/* Cluster selector */}
      <div class="sb-head">
        <div class="cluster-sel">
          <div class="live-dot" />
          <span class="cluster-name">{currentContext() || 'prod-cluster-01'}</span>

          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="sb-search">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            class="sb-input"
            placeholder="Filter services..."
            value={searchQuery()}
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value);
              if (props.onFilterChange) {
                props.onFilterChange({
                  severity: activeSeverity() ? [activeSeverity()!] : [],
                  pattern: [],
                  namespace: [],
                  status: [],
                  searchQuery: e.currentTarget.value,
                });
              }
            }}
          />
        </div>
      </div>

      {/* SLO Status */}
      <div class="sb-head" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '8px' }}>
          <span style={{ 'font-size': '9.5px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.5px' }}>SLO Status</span>
          <span style={{ 'font-size': '9.5px', color: 'var(--crit)', 'font-weight': '700' }}>
            {counts().critical > 0 ? 'Burning fast' : 'On track'}
          </span>
        </div>
        <For each={sloData()}>{(slo, idx) => (
          <div class="slo-item" style={{ 'margin-bottom': idx() < sloData().length - 1 ? '8px' : '0' }}>
            <div class="slo-top">
              <span class="slo-name">{slo.name}</span>
              <span class="slo-val" style={{ color: slo.ok ? 'var(--ok)' : slo.pct < 97 ? 'var(--crit)' : 'var(--warn)' }}>{slo.val}</span>
            </div>
            <div class="slo-track">
              <div class="slo-fill" style={{
                width: `${slo.pct}%`,
                background: slo.ok ? 'var(--ok)' : slo.pct < 97 ? 'var(--crit)' : 'var(--warn)',
              }} />
            </div>
            <div class="slo-meta">{slo.meta}</div>
          </div>
        )}</For>
      </div>

      {/* Health chips */}
      <div class="sb-head" style={{ padding: '8px 12px' }}>
        <div class="health-chips">
          <div class={`hchip crit ${activeSeverity() === 'critical' ? '' : ''}`} onClick={() => handleChipClick('critical')} style={{ cursor: 'pointer' }}>
            <div class="hchip-dot" />
            {counts().critical} Critical
          </div>
          <div class="hchip warn" onClick={() => handleChipClick('high')} style={{ cursor: 'pointer' }}>
            <div class="hchip-dot" />
            {counts().high} Warn
          </div>
          <div class="hchip ok" onClick={() => handleChipClick(null)} style={{ cursor: 'pointer' }}>
            <div class="hchip-dot" />
            {counts().ok} OK
          </div>
        </div>
      </div>

      {/* Service list */}
      <div class="sb-scroll">
        <For each={Array.from(grouped().entries())}>
          {([namespace, items]) => (
            <>
              <div class="ns-label">
                {namespace}
                <span class="ns-count">{items.length}</span>
              </div>
              <For each={items}>
                {(item) => {
                  const isSelected = item.originalIndex === props.currentIndex;
                  const dotClass = getStatusDot(item.incident);
                  const nameClass = getNameClass(item.incident);
                  const restarts = item.incident.occurrences || 0;
                  return (
                    <div
                      class={`svc-row${isSelected ? ' sel' : ''}`}
                      onClick={() => props.onSelectIncident(item.originalIndex)}
                    >
                      <div class="svc-tree-line">
                        <div class={`status-dot ${dotClass}`} style={{ 'margin-top': '11px' }} />
                      </div>
                      <div class="svc-inner">
                        <span class={nameClass}>
                          {item.incident.resource?.name || item.incident.title || 'unknown'}
                        </span>
                        <span class="svc-kind">{item.incident.resource?.kind || 'Deploy'}</span>
                        <Show when={restarts > 1}>
                          <span class="svc-restarts">{restarts}x</span>
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
            </>
          )}
        </For>

        <Show when={realIncidents().length === 0 && demoIncidents().length === 0}>
          <div style={{ padding: '32px 16px', 'text-align': 'center', color: 'var(--t4)', 'font-size': '12px' }}>
            {searchQuery() ? `No matches for "${searchQuery()}"` : 'No active incidents'}
          </div>
        </Show>

        {/* Demo section */}
        <Show when={demoIncidents().length > 0}>
          <div class="ns-label" style={{
            'margin-top': realIncidents().length > 0 ? '8px' : '0',
            background: 'rgba(139, 92, 246, 0.07)',
            color: 'var(--t4)',
            'border-top': realIncidents().length > 0 ? '1px solid var(--border)' : 'none',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style={{ 'margin-right': '4px', opacity: '.6' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Demo
            <span class="ns-count" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#7C3AED' }}>{demoIncidents().length}</span>
          </div>
          <For each={demoIncidents()}>
            {(inc) => {
              const origIdx = props.incidents.indexOf(inc);
              const isSelected = origIdx === props.currentIndex;
              const dotClass = getStatusDot(inc);
              const nameClass = getNameClass(inc);
              const restarts = inc.occurrences || 0;
              return (
                <div
                  class={`svc-row${isSelected ? ' sel' : ''}`}
                  style={{ opacity: '0.75' }}
                  onClick={() => props.onSelectIncident(origIdx)}
                >
                  <div class="svc-tree-line">
                    <div class={`status-dot ${dotClass}`} style={{ 'margin-top': '11px' }} />
                  </div>
                  <div class="svc-inner">
                    <span class={nameClass}>
                      {inc.resource?.name || inc.title || 'unknown'}
                    </span>
                    <span class="svc-kind" style={{ color: '#7C3AED', 'font-size': '8.5px' }}>DEMO</span>
                    <Show when={restarts > 1}>
                      <span class="svc-restarts">{restarts}x</span>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </Show>
      </div>
    </aside>
  );
};

export default ContextNavigator;
