/**
 * WorkloadScreen — Live workload table with detail panel
 * Clicking a row opens a side panel with: Overview | YAML | Events | Scale tabs
 * Inline action buttons: Restart · Delete
 */

import {
  Component, createSignal, createMemo, createEffect,
  onMount, For, Show, onCleanup, untrack,
} from 'solid-js';
import { Incident, api } from '../../services/api';

type Filter = 'critical' | 'warning' | 'all';
type DetailTab = 'overview' | 'yaml' | 'events' | 'scale';

interface WorkloadScreenProps {
  onViewIncident?: () => void;
  onSelectWorkloadIncident?: (name: string, ns: string) => void;
  incidents?: Incident[];
}

const WorkloadScreen: Component<WorkloadScreenProps> = (props) => {
  // ── Table state ──────────────────────────────────────────
  const [activeFilter, setActiveFilter] = createSignal<Filter>('all');
  const [loading, setLoading]           = createSignal(true);
  const [refreshing, setRefreshing]     = createSignal(false);
  const [workloads, setWorkloads]       = createSignal<any[]>([]);
  const [podMetrics, setPodMetrics]     = createSignal<Record<string, { cpu: string; memory: string }>>({});
  const [sortByRestarts, setSortByRestarts] = createSignal(true);
  const [nsFilter, setNsFilter]         = createSignal('All');

  // ── Detail panel state ───────────────────────────────────
  const [selected, setSelected]         = createSignal<any | null>(null);
  const [detailTab, setDetailTab]       = createSignal<DetailTab>('overview');

  // YAML tab
  const [yamlContent, setYamlContent]   = createSignal('');
  const [yamlEdited, setYamlEdited]     = createSignal('');
  const [yamlLoading, setYamlLoading]   = createSignal(false);
  const [yamlEditing, setYamlEditing]   = createSignal(false);
  const [yamlSaving, setYamlSaving]     = createSignal(false);
  const [yamlMsg, setYamlMsg]           = createSignal('');

  // Events tab
  const [wlEvents, setWlEvents]         = createSignal<any[]>([]);
  const [eventsLoading, setEventsLoading] = createSignal(false);

  // Scale tab
  const [scaleInput, setScaleInput]     = createSignal(1);
  const [scaling, setScaling]           = createSignal(false);
  const [scaleMsg, setScaleMsg]         = createSignal('');

  // Action state
  const [actioning, setActioning]       = createSignal('');
  const [deleteTarget, setDeleteTarget] = createSignal<any | null>(null);
  const [actionToast, setActionToast]   = createSignal<{ msg: string; ok: boolean } | null>(null);

  const toast = (msg: string, ok: boolean) => {
    setActionToast({ msg, ok });
    setTimeout(() => setActionToast(null), 3000);
  };

  // ── Data fetching ────────────────────────────────────────
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [deploys, sts, ds, metrics] = await Promise.allSettled([
        api.getDeployments(),
        api.getStatefulSets(),
        api.getDaemonSets(),
        api.getPodMetrics(),
      ]);
      const items: any[] = [];
      const addItems = (result: PromiseSettledResult<any[]>, kind: string) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value))
          result.value.forEach((r: any) => items.push({ ...r, _kind: kind }));
      };
      addItems(deploys, 'Deployment');
      addItems(sts, 'StatefulSet');
      addItems(ds, 'DaemonSet');
      if (metrics.status === 'fulfilled') setPodMetrics(metrics.value || {});
      setWorkloads(items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  onMount(fetchData);

  // ── Reset detail state when selected workload changes ────
  createEffect(() => {
    const w = selected();
    setDetailTab('overview');
    setYamlContent('');
    setYamlEdited('');
    setYamlEditing(false);
    setYamlMsg('');
    setWlEvents([]);
    setEventsLoading(false);
    setScaleMsg('');
    if (w) {
      const parts = (w._replicas || '').split('/');
      const desired = parseInt(parts[parts.length - 1] || parts[0] || '1');
      setScaleInput(isNaN(desired) ? 1 : desired);
    }
  });

  // ── Fetch YAML when yaml tab active ─────────────────────
  createEffect(() => {
    if (detailTab() !== 'yaml') return;
    const w = selected();
    if (!w) return;
    if (untrack(yamlLoading) || untrack(yamlContent)) return;
    setYamlLoading(true);
    const call = w._kind === 'Deployment'
      ? api.getDeploymentYAML(w._name, w._ns)
      : w._kind === 'StatefulSet'
        ? api.getStatefulSetYAML(w._name, w._ns)
        : api.getDaemonSetYAML(w._name, w._ns);
    call.then((r: any) => {
      const raw = typeof r === 'string' ? r : (r?.yaml || '');
      setYamlContent(raw);
      setYamlEdited(raw);
    }).catch(() => setYamlContent(`# Could not load YAML for ${w._name}`))
      .finally(() => setYamlLoading(false));
  });

  // ── Fetch events when events tab active ──────────────────
  createEffect(() => {
    if (detailTab() !== 'events') return;
    const w = selected();
    if (!w) return;
    if (untrack(eventsLoading) || untrack(wlEvents).length > 0) return;
    setEventsLoading(true);
    api.getEvents(w._ns === '—' ? undefined : w._ns, 200)
      .then((r: any) => {
        const all: any[] = r?.events || [];
        const base = w._name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '');
        const filtered = all.filter((e: any) => {
          const n = (e.involvedObject?.name || e.name || e.objectName || '').toLowerCase();
          return n === w._name.toLowerCase() || n.startsWith(base.toLowerCase());
        });
        setWlEvents(filtered.length ? filtered : all.slice(0, 30));
      })
      .catch(() => setWlEvents([]))
      .finally(() => setEventsLoading(false));
  });

  // ── Enrichment ───────────────────────────────────────────
  const incidentSeverityMap = createMemo(() => {
    const map = new Map<string, string>();
    (props.incidents || []).forEach(inc => {
      if (inc.resource?.name) {
        const existing = map.get(inc.resource.name);
        const rank = (s: string | undefined) => s === 'critical' ? 2 : s === 'high' ? 1 : 0;
        if (!existing || rank(inc.severity) > rank(existing))
          map.set(inc.resource.name, inc.severity || 'medium');
      }
    });
    return map;
  });

  const getSeverity = (name: string, status: string): 'critical' | 'warning' | 'ok' => {
    const sev = incidentSeverityMap().get(name);
    if (sev === 'critical') return 'critical';
    if (sev === 'high') return 'warning';
    const s = status.toLowerCase();
    if (s.includes('oomkilled') || s.includes('crashloop') || s.includes('error') || s === 'failed') return 'critical';
    if (s.includes('degraded') || s.includes('pending') || s === 'unknown') return 'warning';
    return 'ok';
  };

  const enriched = createMemo(() => workloads().map(w => {
    const name = w.name || w.metadata?.name || '—';
    const ns   = w.namespace || w.metadata?.namespace || '—';
    const status = w.status || w.phase || 'Unknown';
    const restarts: number = w.restartCount ?? w.restarts ?? 0;
    const age  = w.age || '—';
    const sev  = getSeverity(name, status);
    const ready   = w.readyReplicas ?? w.availableReplicas ?? null;
    const desired = w.replicas ?? w.desiredReplicas ?? null;
    const replicas = ready !== null && desired !== null ? `${ready}/${desired}`
      : ready !== null ? `${ready}` : desired !== null ? `0/${desired}` : '—';
    const pm = podMetrics();
    const mKey = Object.keys(pm).find(k => k === name || k.startsWith(name + '-'));
    const metrics = mKey ? pm[mKey] : null;
    // image from raw object
    const image = w.image || w.images?.[0] || w.spec?.template?.spec?.containers?.[0]?.image || '—';
    return { ...w, _name: name, _ns: ns, _status: status, _restarts: restarts, _age: age, _sev: sev, _replicas: replicas, _metrics: metrics, _image: image };
  }));

  const namespaces = createMemo(() => {
    const s = new Set<string>();
    enriched().forEach(w => { if (w._ns !== '—') s.add(w._ns); });
    return ['All', ...Array.from(s).sort()];
  });

  const filtered = createMemo(() => {
    let list = enriched();
    const ns = nsFilter();
    if (ns !== 'All') list = list.filter(w => w._ns === ns);
    if (activeFilter() === 'critical') list = list.filter(w => w._sev === 'critical');
    else if (activeFilter() === 'warning') list = list.filter(w => w._sev === 'warning');
    if (sortByRestarts()) list = [...list].sort((a, b) => b._restarts - a._restarts);
    else list = [...list].sort((a, b) => a._name.localeCompare(b._name));
    return list;
  });

  const counts = createMemo(() => {
    const all = enriched();
    return {
      critical: all.filter(w => w._sev === 'critical').length,
      warning:  all.filter(w => w._sev === 'warning').length,
      all: all.length,
    };
  });

  const cycleNamespace = () => {
    const nsList = namespaces();
    const cur = nsFilter();
    setNsFilter(nsList[(nsList.indexOf(cur) + 1) % nsList.length]);
  };

  // ── Action handlers ──────────────────────────────────────
  const doRestart = async (w: any, e: MouseEvent) => {
    e.stopPropagation();
    const key = w._name + ':restart';
    setActioning(key);
    try {
      const call = w._kind === 'Deployment'   ? api.restartDeployment(w._name, w._ns)
                 : w._kind === 'StatefulSet'  ? api.restartStatefulSet(w._name, w._ns)
                 :                              api.restartDaemonSet(w._name, w._ns);
      await call;
      toast(`✓ ${w._name} restarted`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch {
      toast(`✗ Restart failed for ${w._name}`, false);
    } finally {
      setActioning('');
    }
  };

  const doDelete = async (w: any) => {
    setDeleteTarget(null);
    setActioning(w._name + ':delete');
    try {
      const call = w._kind === 'Deployment'   ? api.deleteDeployment(w._name, w._ns)
                 : w._kind === 'StatefulSet'  ? api.deleteStatefulSet(w._name, w._ns)
                 :                              api.deleteDaemonSet(w._name, w._ns);
      await call;
      toast(`✓ ${w._name} deleted`, true);
      if (selected()?._name === w._name) setSelected(null);
      setTimeout(() => fetchData(true), 1500);
    } catch {
      toast(`✗ Delete failed for ${w._name}`, false);
    } finally {
      setActioning('');
    }
  };

  const doScale = async () => {
    const w = selected();
    if (!w || w._kind === 'DaemonSet') return;
    setScaling(true);
    setScaleMsg('');
    try {
      const call = w._kind === 'Deployment'
        ? api.scaleDeployment(w._name, w._ns, scaleInput())
        : api.scaleStatefulSet(w._name, w._ns, scaleInput());
      await call;
      setScaleMsg(`✓ Scaled to ${scaleInput()} replicas`);
      toast(`✓ ${w._name} scaled to ${scaleInput()}`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch {
      setScaleMsg('✗ Scale operation failed');
    } finally {
      setScaling(false);
    }
  };

  const doSaveYaml = async () => {
    const w = selected();
    if (!w) return;
    setYamlSaving(true);
    setYamlMsg('');
    try {
      if (w._kind === 'Deployment') {
        await api.updateDeployment(w._name, w._ns, yamlEdited());
      } else if (w._kind === 'DaemonSet') {
        await api.updateDaemonSet(w._name, w._ns, yamlEdited());
      } else {
        await api.applyResourceYAML(w._kind, w._name, w._ns, yamlEdited());
      }
      setYamlContent(yamlEdited());
      setYamlEditing(false);
      setYamlMsg('✓ Applied successfully');
      toast(`✓ ${w._name} updated`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch (err: any) {
      setYamlMsg('✗ ' + (err?.message || 'Apply failed'));
    } finally {
      setYamlSaving(false);
    }
  };

  // ── Shared styles ────────────────────────────────────────
  const iconBtn = (danger = false) => ({
    display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center',
    width: '26px', height: '26px', 'border-radius': '6px', border: 'none',
    background: 'transparent', cursor: 'pointer', transition: 'background .12s',
    color: danger ? 'var(--crit)' : 'var(--t4)',
  } as const);

  // ── YAML syntax highlighter ──────────────────────────────
  const renderYaml = (raw: string) => raw.split('\n').map((line: string) => {
    const trimmed = line.trimStart();
    const indent  = line.length - trimmed.length;
    const isComment = trimmed.startsWith('#');
    const keyMatch = !isComment && /^([a-zA-Z_$][^:]*):(.*)$/.exec(trimmed);
    if (keyMatch) {
      const val = keyMatch[2];
      const isStr = val.trimStart().startsWith('"') || val.trimStart().startsWith("'");
      return (
        <div style={{ 'min-height': '1.5em' }}>
          {indent > 0 && <span style={{ 'white-space': 'pre' }}>{' '.repeat(indent)}</span>}
          <span style={{ color: '#7DD3FC' }}>{keyMatch[1]}</span>
          <span style={{ color: 'rgba(148,163,184,.5)' }}>:</span>
          <Show when={val.trim()}>
            <span style={{ color: isStr ? '#86EFAC' : '#CBD5E1' }}>{val}</span>
          </Show>
        </div>
      );
    }
    return (
      <div style={{ 'min-height': '1.5em' }}>
        <span style={{ color: isComment ? 'rgba(148,163,184,.4)' : trimmed.startsWith('-') ? '#E2E8F0' : '#94A3B8' }}>{line}</span>
      </div>
    );
  });

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Toolbar */}
      <div class="wl-toolbar" style={{ padding: '10px 16px', 'flex-shrink': '0', background: 'var(--s1)', 'border-bottom': '1px solid var(--b1)' }}>
        <div class={`filter-btn ${activeFilter() === 'critical' ? 'on' : ''}`} onClick={() => setActiveFilter('critical')}>
          <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: 'currentColor' }} />
          Critical ({counts().critical})
        </div>
        <div class={`filter-btn ${activeFilter() === 'warning' ? 'on' : ''}`} onClick={() => setActiveFilter('warning')}>
          Warning ({counts().warning})
        </div>
        <div class={`filter-btn ${activeFilter() === 'all' ? 'on' : ''}`} onClick={() => setActiveFilter('all')}>
          All ({counts().all})
        </div>
        <div style={{ flex: '1' }} />
        <button class="btn ghost" style={{ 'font-size': '11px' }} onClick={() => setSortByRestarts(!sortByRestarts())}>
          Sort: {sortByRestarts() ? 'Restarts' : 'Name'}
        </button>
        <button class="btn ghost" style={{ 'font-size': '11px' }} onClick={cycleNamespace}>
          NS: {nsFilter()}
        </button>
        <button
          class="btn ghost"
          style={{ 'font-size': '11px', opacity: refreshing() ? '0.6' : '1' }}
          disabled={refreshing()}
          onClick={() => fetchData(true)}
        >
          {refreshing() ? '↻' : '↺'}
        </button>
      </div>

      {/* Split layout */}
      <div style={{ flex: '1', display: 'flex', overflow: 'hidden' }}>

        {/* ── Table pane ── */}
        <div style={{ flex: selected() ? '0 0 54%' : '1', overflow: 'auto', transition: 'flex .2s ease', 'min-width': '0' }}>
          <Show when={loading()}>
            <div style={{ padding: '24px', color: 'var(--t4)', 'font-size': '12px' }}>Loading workloads…</div>
          </Show>

          <Show when={!loading()}>
            <table class="wl-table" style={{ 'border-radius': '0', border: 'none' }}>
              <thead>
                <tr>
                  <th>Workload</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Replicas</th>
                  <th>Restarts</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Age</th>
                  <th style={{ 'text-align': 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filtered()}>{(w) => {
                  const isCrit    = w._sev === 'critical';
                  const isWarn    = w._sev === 'warning';
                  const isSelected = selected()?._name === w._name && selected()?._ns === w._ns;
                  const isActioning = actioning().startsWith(w._name + ':');
                  return (
                    <tr
                      class={isCrit ? 'crit-row' : ''}
                      style={{ background: isSelected ? 'var(--brandDim)' : undefined }}
                      onClick={() => setSelected(isSelected ? null : w)}
                    >
                      <td>
                        <div class="wl-name">
                          <div style={{
                            width: '7px', height: '7px', 'border-radius': '50%', 'flex-shrink': '0',
                            background: isCrit ? 'var(--crit)' : isWarn ? 'var(--warn)' : 'var(--ok)',
                            animation: isCrit ? 'crit-pulse 1.8s ease-in-out infinite' : 'none',
                          }} />
                          {w._name}
                          <span class="wl-ns">{w._ns}</span>
                        </div>
                      </td>
                      <td><span style={{ 'font-size': '10px', color: 'var(--t4)', 'font-weight': '500' }}>{w._kind}</span></td>
                      <td>
                        <span class={`wl-status ${isCrit ? 'crit' : isWarn ? 'warn' : 'ok'}`}>● {w._status}</span>
                      </td>
                      <td><span class={`wl-replicas${isCrit ? ' bad' : ''}`}>{w._replicas}</span></td>
                      <td><span class={`wl-restarts${w._restarts >= 5 ? ' high' : ''}`}>{w._restarts}</span></td>
                      <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{w._metrics?.cpu || '—'}</span></td>
                      <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{w._metrics?.memory || '—'}</span></td>
                      <td><span class="age-tag">{w._age}</span></td>
                      <td>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '2px', 'justify-content': 'flex-end' }} onClick={e => e.stopPropagation()}>
                          {/* View incident (only if has incident) */}
                          <Show when={isCrit || isWarn}>
                            <button
                              title="View incident"
                              style={iconBtn()}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s3)'; (e.currentTarget as HTMLElement).style.color = 'var(--brand)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                              onClick={() => {
                                if (props.onSelectWorkloadIncident) props.onSelectWorkloadIncident(w._name, w._ns);
                                else props.onViewIncident?.();
                              }}
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </button>
                          </Show>
                          {/* Restart */}
                          <button
                            title={`Restart ${w._kind}`}
                            disabled={isActioning}
                            style={{ ...iconBtn(), opacity: isActioning ? '0.5' : '1' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s3)'; (e.currentTarget as HTMLElement).style.color = 'var(--ok)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                            onClick={(e) => doRestart(w, e)}
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                          </button>
                          {/* Delete */}
                          <button
                            title={`Delete ${w._kind}`}
                            disabled={isActioning}
                            style={{ ...iconBtn(true), opacity: isActioning ? '0.5' : '1' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--critBg)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(w); }}
                          >
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }}</For>
              </tbody>
            </table>
            <Show when={filtered().length === 0}>
              <div style={{ color: 'var(--t4)', 'font-size': '12px', padding: '16px' }}>No workloads found.</div>
            </Show>
          </Show>
        </div>

        {/* ── Detail panel ── */}
        <Show when={selected()}>
          {(w) => (
            <div style={{
              flex: '1', background: 'var(--s1)', 'border-left': '1px solid var(--b1)',
              display: 'flex', 'flex-direction': 'column', overflow: 'hidden', 'min-width': '0',
            }}>
              {/* Panel header */}
              <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '12px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0' }}>
                <div style={{
                  width: '8px', height: '8px', 'border-radius': '50%', 'flex-shrink': '0',
                  background: w()._sev === 'critical' ? 'var(--crit)' : w()._sev === 'warning' ? 'var(--warn)' : 'var(--ok)',
                  animation: w()._sev === 'critical' ? 'crit-pulse 1.8s ease-in-out infinite' : 'none',
                }} />
                <span style={{ 'font-weight': '700', 'font-size': '13px', color: 'var(--t1)', flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{w()._name}</span>
                <span style={{ 'font-size': '10px', color: 'var(--brand)', background: 'var(--brandDim)', padding: '2px 7px', 'border-radius': '4px', 'font-weight': '600' }}>{w()._kind}</span>
                <span style={{ 'font-size': '10px', color: 'var(--t5)', 'font-family': 'var(--mono)' }}>{w()._ns}</span>
                <button class="btn ghost" style={{ 'font-size': '11px', padding: '3px 8px', 'margin-left': '2px' }} onClick={() => setSelected(null)}>✕</button>
              </div>

              {/* Quick action bar */}
              <div style={{ display: 'flex', gap: '6px', padding: '8px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0', background: 'var(--s2)' }}>
                <button
                  class="btn ghost"
                  style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '5px' }}
                  disabled={!!actioning()}
                  onClick={(e) => doRestart(w(), e)}
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                  Restart
                </button>
                <Show when={w()._kind !== 'DaemonSet'}>
                  <button
                    class="btn ghost"
                    style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '5px' }}
                    onClick={() => setDetailTab('scale')}
                  >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Scale
                  </button>
                </Show>
                <button
                  class="btn ghost"
                  style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '5px' }}
                  onClick={() => setDetailTab('yaml')}
                >
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  YAML
                </button>
                <Show when={(w()._sev === 'critical' || w()._sev === 'warning') && props.onSelectWorkloadIncident}>
                  <button
                    class="btn ghost"
                    style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '5px', color: 'var(--crit)' }}
                    onClick={() => props.onSelectWorkloadIncident!(w()._name, w()._ns)}
                  >
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    View Incident
                  </button>
                </Show>
                <div style={{ flex: '1' }} />
                <button
                  class="btn danger"
                  style={{ 'font-size': '11px', padding: '4px 10px' }}
                  disabled={!!actioning()}
                  onClick={() => setDeleteTarget(w())}
                >
                  Delete
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0', 'padding': '0 14px' }}>
                {(['overview', 'yaml', 'events', 'scale'] as const).map(tab => (
                  <button style={{
                    padding: '9px 12px', 'font-size': '11.5px', background: 'none', border: 'none', cursor: 'pointer',
                    'font-weight': detailTab() === tab ? '700' : '500',
                    color: detailTab() === tab ? 'var(--brand)' : 'var(--t4)',
                    'border-bottom': detailTab() === tab ? '2px solid var(--brand)' : '2px solid transparent',
                    'margin-bottom': '-1px', transition: 'color .1s',
                  }} onClick={() => setDetailTab(tab)}>
                    {tab === 'overview' ? 'Overview' : tab === 'yaml' ? 'YAML' : tab === 'events' ? 'Events' : 'Scale'}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <div style={{ flex: '1', overflow: 'auto' }}>

                {/* ── Overview ── */}
                <Show when={detailTab() === 'overview'}>
                  <div style={{ padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                    {/* Status banner */}
                    <div style={{
                      display: 'flex', 'align-items': 'center', gap: '10px', padding: '10px 14px',
                      background: w()._sev === 'critical' ? 'var(--critBg)' : w()._sev === 'warning' ? 'var(--warnBg)' : 'var(--okBg)',
                      'border-radius': '8px', 'border': `1px solid ${w()._sev === 'critical' ? 'var(--critBdr)' : w()._sev === 'warning' ? 'var(--warnBdr)' : 'var(--okBdr)'}`,
                    }}>
                      <span style={{
                        'font-weight': '700', 'font-size': '11px',
                        color: w()._sev === 'critical' ? 'var(--crit)' : w()._sev === 'warning' ? 'var(--warn)' : 'var(--ok)',
                      }}>● {w()._status}</span>
                      <span style={{ 'font-size': '11px', color: 'var(--t4)', 'margin-left': 'auto' }}>{w()._age} old</span>
                    </div>

                    {/* Key-value grid */}
                    <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
                      {[
                        { k: 'Kind',      v: w()._kind },
                        { k: 'Namespace', v: w()._ns },
                        { k: 'Replicas',  v: w()._replicas },
                        { k: 'Restarts',  v: String(w()._restarts), warn: w()._restarts >= 5 },
                        { k: 'CPU',       v: w()._metrics?.cpu || '—' },
                        { k: 'Memory',    v: w()._metrics?.memory || '—' },
                        { k: 'Age',       v: w()._age },
                      ].map(row => (
                        <div style={{ background: 'var(--s2)', 'border-radius': '6px', padding: '8px 10px' }}>
                          <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '2px' }}>{row.k}</div>
                          <div style={{ 'font-family': 'var(--mono)', 'font-size': '12px', 'font-weight': '600', color: (row as any).warn ? 'var(--crit)' : 'var(--t1)', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={row.v}>{row.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Image */}
                    <Show when={w()._image && w()._image !== '—'}>
                      <div style={{ background: 'var(--s2)', 'border-radius': '6px', padding: '8px 10px' }}>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '3px' }}>Image</div>
                        <div style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t2)', 'word-break': 'break-all', 'line-height': '1.5' }}>{w()._image}</div>
                      </div>
                    </Show>

                    {/* kubectl quick commands */}
                    <div>
                      <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '6px' }}>Quick Commands</div>
                      {[
                        { label: 'Describe', cmd: `kubectl describe ${w()._kind.toLowerCase()}/${w()._name} -n ${w()._ns}` },
                        { label: 'Get pods', cmd: `kubectl get pods -n ${w()._ns} -l app=${w()._name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '')}` },
                        { label: 'Logs',     cmd: `kubectl logs -n ${w()._ns} -l app=${w()._name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '')} --tail=100` },
                        { label: 'Events',   cmd: `kubectl get events -n ${w()._ns} --sort-by=.lastTimestamp` },
                      ].map(item => (
                        <div
                          style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '6px 8px', 'border-radius': '5px', cursor: 'pointer', 'margin-bottom': '4px', background: 'var(--s2)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s3)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                          onClick={() => navigator.clipboard.writeText(item.cmd).then(() => toast('✓ Copied', true))}
                        >
                          <span style={{ 'font-size': '10px', color: 'var(--t5)', 'min-width': '48px', 'font-weight': '600' }}>{item.label}</span>
                          <span style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t3)', flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{item.cmd}</span>
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style={{ 'flex-shrink': '0', color: 'var(--t5)' }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </Show>

                {/* ── YAML ── */}
                <Show when={detailTab() === 'yaml'}>
                  <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
                    {/* YAML toolbar */}
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '8px 14px', 'border-bottom': '1px solid var(--b2)', 'flex-shrink': '0', background: 'var(--s2)' }}>
                      <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t4)', flex: '1' }}>
                        {w()._kind}/{w()._name}
                      </span>
                      <Show when={yamlMsg()}>
                        <span style={{ 'font-size': '11px', color: yamlMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>{yamlMsg()}</span>
                      </Show>
                      <Show when={!yamlEditing()}>
                        <button class="btn ghost" style={{ 'font-size': '11px', padding: '3px 10px' }}
                          onClick={() => { setYamlEdited(yamlContent()); setYamlEditing(true); setYamlMsg(''); }}>
                          Edit
                        </button>
                      </Show>
                      <Show when={yamlEditing()}>
                        <button class="btn ghost" style={{ 'font-size': '11px', padding: '3px 10px' }} onClick={() => { setYamlEditing(false); setYamlMsg(''); }}>Cancel</button>
                        <button class="btn primary" style={{ 'font-size': '11px', padding: '3px 10px' }} disabled={yamlSaving()} onClick={doSaveYaml}>
                          {yamlSaving() ? 'Applying…' : 'Apply'}
                        </button>
                      </Show>
                    </div>
                    {/* YAML body */}
                    <Show when={yamlLoading()}>
                      <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading YAML…</div>
                    </Show>
                    <Show when={!yamlLoading() && yamlEditing()}>
                      <textarea
                        style={{
                          flex: '1', background: '#0D1521', color: '#E2E8F0',
                          border: 'none', outline: 'none', padding: '12px 16px',
                          resize: 'none', 'font-family': 'var(--mono)', 'font-size': '11.5px', 'line-height': '1.7',
                          'tab-size': '2',
                        }}
                        value={yamlEdited()}
                        onInput={(e) => setYamlEdited(e.currentTarget.value)}
                        spellcheck={false}
                      />
                    </Show>
                    <Show when={!yamlLoading() && !yamlEditing()}>
                      <div style={{
                        flex: '1', overflow: 'auto', background: '#0D1521',
                        padding: '12px 16px',
                        'font-family': 'var(--mono)', 'font-size': '11.5px', 'line-height': '1.7',
                        'white-space': 'pre',
                      }}>
                        {renderYaml(yamlContent() || '# No YAML loaded')}
                      </div>
                    </Show>
                  </div>
                </Show>

                {/* ── Events ── */}
                <Show when={detailTab() === 'events'}>
                  <Show when={eventsLoading()}>
                    <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading events…</div>
                  </Show>
                  <Show when={!eventsLoading()}>
                    <Show when={wlEvents().length > 0} fallback={
                      <div style={{ padding: '20px 14px', color: 'var(--t5)', 'font-size': '12px', 'line-height': '1.6' }}>
                        <div>No events found for <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{w()._name}</span>.</div>
                        <div style={{ 'font-size': '11px', 'margin-top': '4px', color: 'var(--t6)' }}>
                          Try: <span style={{ 'font-family': 'var(--mono)' }}>kubectl get events -n {w()._ns} --sort-by=.lastTimestamp</span>
                        </div>
                      </div>
                    }>
                      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                        <thead>
                          <tr>
                            {['Type', 'Reason', 'Message', 'Count', 'Time'].map(h => (
                              <th style={{ padding: '8px 12px', 'text-align': 'left', 'font-size': '9.5px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.5px', 'border-bottom': '1px solid var(--b1)', background: 'var(--s2)', 'white-space': 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <For each={wlEvents()}>{(ev) => {
                            const isWarn = ev.type === 'Warning';
                            const reason = ev.reason || ev.type || 'Event';
                            const msg    = ev.message || ev.note || '';
                            const count  = ev.count || ev.series?.count || 1;
                            const time   = ev.lastTime || ev.eventTime || ev.firstTime || '';
                            const timeStr = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
                            return (
                              <tr style={{ 'border-bottom': '1px solid var(--b1)' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{ 'font-size': '10.5px', 'font-weight': '700', color: isWarn ? 'var(--warn)' : 'var(--ok)' }}>{ev.type || 'Normal'}</span>
                                </td>
                                <td style={{ padding: '8px 12px', 'font-family': 'var(--mono)', 'font-size': '10.5px', color: isWarn ? 'var(--warn)' : 'var(--t2)', 'white-space': 'nowrap' }}>{reason}</td>
                                <td style={{ padding: '8px 12px', 'font-size': '11.5px', color: 'var(--t3)', 'max-width': '260px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={msg}>{msg}</td>
                                <td style={{ padding: '8px 12px', 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t4)', 'text-align': 'center' }}>×{count}</td>
                                <td style={{ padding: '8px 12px', 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t5)', 'white-space': 'nowrap' }}>{timeStr}</td>
                              </tr>
                            );
                          }}</For>
                        </tbody>
                      </table>
                    </Show>
                  </Show>
                </Show>

                {/* ── Scale ── */}
                <Show when={detailTab() === 'scale'}>
                  <div style={{ padding: '20px 14px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
                    <Show when={w()._kind === 'DaemonSet'} fallback={
                      <>
                        <div>
                          <div style={{ 'font-size': '12px', color: 'var(--t3)', 'margin-bottom': '14px', 'line-height': '1.5' }}>
                            Current: <strong style={{ color: 'var(--t1)' }}>{w()._replicas}</strong> replicas
                          </div>
                          <div style={{ 'font-size': '11px', color: 'var(--t5)', 'margin-bottom': '8px', 'font-weight': '600', 'text-transform': 'uppercase', 'letter-spacing': '.04em' }}>Target Replicas</div>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'margin-bottom': '16px' }}>
                            <input
                              type="range"
                              min="0" max="10" step="1"
                              value={scaleInput()}
                              onInput={(e) => setScaleInput(parseInt(e.currentTarget.value))}
                              style={{ flex: '1', 'accent-color': 'var(--brand)' }}
                            />
                            <input
                              type="number"
                              min="0" max="20"
                              value={scaleInput()}
                              onInput={(e) => setScaleInput(Math.max(0, parseInt(e.currentTarget.value) || 0))}
                              style={{
                                width: '54px', padding: '5px 8px', 'border-radius': '6px',
                                border: '1px solid var(--b2)', background: 'var(--s1)',
                                'font-family': 'var(--mono)', 'font-size': '13px', 'font-weight': '700',
                                color: 'var(--t1)', 'text-align': 'center',
                              }}
                            />
                          </div>
                          <Show when={scaleInput() === 0}>
                            <div style={{ padding: '8px 12px', background: 'var(--warnBg)', 'border-radius': '6px', 'font-size': '11.5px', color: 'var(--warn)', 'margin-bottom': '12px', 'border': '1px solid var(--warnBdr)' }}>
                              ⚠ Scaling to 0 will stop all pods for this workload
                            </div>
                          </Show>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                            <button
                              class="btn primary"
                              style={{ 'font-size': '12px', padding: '7px 18px' }}
                              disabled={scaling()}
                              onClick={doScale}
                            >
                              {scaling() ? 'Scaling…' : `Scale to ${scaleInput()}`}
                            </button>
                            <Show when={scaleMsg()}>
                              <span style={{ 'font-size': '11.5px', color: scaleMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>{scaleMsg()}</span>
                            </Show>
                          </div>
                        </div>
                        <div style={{ 'border-top': '1px solid var(--b1)', 'padding-top': '14px' }}>
                          <div style={{ 'font-size': '11px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '8px' }}>Quick Presets</div>
                          <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
                            {[0, 1, 2, 3, 5, 10].map(n => (
                              <button
                                class="btn ghost"
                                style={{ 'font-size': '11.5px', 'font-family': 'var(--mono)', 'font-weight': '700', padding: '5px 14px' }}
                                onClick={() => setScaleInput(n)}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={{ 'border-top': '1px solid var(--b1)', 'padding-top': '14px' }}>
                          <div style={{ 'font-size': '11px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '8px' }}>Rollback</div>
                          <div style={{
                            display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 10px',
                            background: 'var(--s2)', 'border-radius': '6px', cursor: 'pointer',
                          }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s3)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                            onClick={() => {
                              const depName = w()._name.replace(/-[a-z0-9]+-[a-z0-9]+$/, '');
                              navigator.clipboard.writeText(`kubectl rollout undo ${w()._kind.toLowerCase()}/${depName} -n ${w()._ns}`).then(() => toast('✓ Rollback command copied', true));
                            }}
                          >
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                            <span style={{ 'font-size': '11.5px', color: 'var(--t2)', flex: '1' }}>kubectl rollout undo …</span>
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        </div>
                      </>
                    }>
                      <div style={{ padding: '14px', background: 'var(--s2)', 'border-radius': '8px', 'font-size': '12px', color: 'var(--t4)', 'line-height': '1.6' }}>
                        DaemonSets are cluster-managed and cannot be manually scaled. They automatically run one pod per eligible node.
                      </div>
                    </Show>
                  </div>
                </Show>

              </div>
            </div>
          )}
        </Show>
      </div>

      {/* ── Toast ── */}
      <Show when={actionToast()}>
        {(t) => (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px',
            padding: '10px 16px', background: t().ok ? 'rgba(5,150,105,.95)' : 'rgba(220,38,38,.95)',
            color: '#fff', 'border-radius': '8px', 'font-size': '12.5px', 'font-weight': '600',
            'z-index': '9999', 'box-shadow': '0 4px 12px rgba(0,0,0,.2)',
          }}>
            {t().msg}
          </div>
        )}
      </Show>

      {/* ── Delete confirm dialog ── */}
      <Show when={deleteTarget()}>
        {(w) => (
          <div
            style={{ position: 'fixed', inset: '0', background: 'rgba(0,0,0,.45)', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'z-index': '2000' }}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              style={{ background: 'var(--s1)', 'border-radius': '12px', padding: '24px 28px', 'max-width': '420px', width: '90%', 'box-shadow': 'var(--sh3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ 'font-size': '16px', 'font-weight': '700', color: 'var(--t1)', 'margin-bottom': '10px' }}>
                Delete {w()._kind}?
              </div>
              <div style={{ 'font-size': '12.5px', color: 'var(--t3)', 'margin-bottom': '20px', 'line-height': '1.6' }}>
                This will permanently delete{' '}
                <span style={{ 'font-family': 'var(--mono)', color: 'var(--crit)', 'font-weight': '700' }}>{w()._name}</span>{' '}
                in namespace{' '}
                <span style={{ 'font-family': 'var(--mono)', color: 'var(--t1)' }}>{w()._ns}</span>.
                This action cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: '8px', 'justify-content': 'flex-end' }}>
                <button class="btn ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button class="btn danger" disabled={!!actioning()} onClick={() => doDelete(w())}>
                  {actioning().includes(':delete') ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default WorkloadScreen;
