/**
 * WorkloadScreen — Live workload table from Kubernetes API
 * Fetches real deployments, statefulsets, daemonsets and pod metrics.
 * Highlights critical/warning workloads based on active incidents.
 */

import { Component, createSignal, createMemo, onMount, For, Show } from 'solid-js';
import { Incident, api } from '../../services/api';

type Filter = 'critical' | 'warning' | 'all';

interface WorkloadScreenProps {
  onViewIncident?: () => void;
  incidents?: Incident[];
}

const WorkloadScreen: Component<WorkloadScreenProps> = (props) => {
  const [activeFilter, setActiveFilter] = createSignal<Filter>('all');
  const [loading, setLoading] = createSignal(true);
  const [workloads, setWorkloads] = createSignal<any[]>([]);
  const [podMetrics, setPodMetrics] = createSignal<Record<string, { cpu: string; memory: string }>>({});
  const [sortByRestarts, setSortByRestarts] = createSignal(true);
  const [nsFilter, setNsFilter] = createSignal('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deploys, sts, ds, metrics] = await Promise.allSettled([
        api.getDeployments(),
        api.getStatefulSets(),
        api.getDaemonSets(),
        api.getPodMetrics(),
      ]);

      const items: any[] = [];
      const addItems = (result: PromiseSettledResult<any[]>, kind: string) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          result.value.forEach((r: any) => items.push({ ...r, _kind: kind }));
        }
      };
      addItems(deploys, 'Deployment');
      addItems(sts, 'StatefulSet');
      addItems(ds, 'DaemonSet');

      if (metrics.status === 'fulfilled') {
        setPodMetrics(metrics.value || {});
      }
      setWorkloads(items);
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchData);

  // Map incident resource names → most severe incident severity
  const incidentSeverityMap = createMemo(() => {
    const map = new Map<string, string>();
    (props.incidents || []).forEach(inc => {
      if (inc.resource?.name) {
        const existing = map.get(inc.resource.name);
        const rank = (s: string | undefined) => s === 'critical' ? 2 : s === 'high' ? 1 : 0;
        if (!existing || rank(inc.severity) > rank(existing)) {
          map.set(inc.resource.name, inc.severity || 'medium');
        }
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

  const enriched = createMemo(() => {
    return workloads().map(w => {
      const name = w.name || w.metadata?.name || '—';
      const ns = w.namespace || w.metadata?.namespace || '—';
      const status = w.status || w.phase || 'Unknown';
      const restarts: number = w.restartCount ?? w.restarts ?? 0;
      const age = w.age || '—';
      const sev = getSeverity(name, status);
      // Replica string
      const ready = w.readyReplicas ?? w.availableReplicas ?? null;
      const desired = w.replicas ?? w.desiredReplicas ?? null;
      const replicas = ready !== null && desired !== null
        ? `${ready}/${desired}`
        : ready !== null ? `${ready}` : desired !== null ? `0/${desired}` : '—';
      // Metrics from podMetrics — try exact match then prefix match
      const pm = podMetrics();
      const mKey = Object.keys(pm).find(k => k === name || k.startsWith(name + '-'));
      const metrics = mKey ? pm[mKey] : null;
      return { ...w, _name: name, _ns: ns, _status: status, _restarts: restarts, _age: age, _sev: sev, _replicas: replicas, _metrics: metrics };
    });
  });

  const namespaces = createMemo(() => {
    const nsSet = new Set<string>();
    enriched().forEach(w => { if (w._ns !== '—') nsSet.add(w._ns); });
    return ['All', ...Array.from(nsSet).sort()];
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
      warning: all.filter(w => w._sev === 'warning').length,
      all: all.length,
    };
  });

  // Namespace cycle button
  const cycleNamespace = () => {
    const nsList = namespaces();
    const cur = nsFilter();
    const idx = nsList.indexOf(cur);
    setNsFilter(nsList[(idx + 1) % nsList.length]);
  };

  return (
    <div class="wl-body">
      {/* Toolbar */}
      <div class="wl-toolbar">
        <div
          class={`filter-btn ${activeFilter() === 'critical' ? 'on' : ''}`}
          onClick={() => setActiveFilter('critical')}
        >
          <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: 'currentColor' }} />
          Critical ({counts().critical})
        </div>
        <div
          class={`filter-btn ${activeFilter() === 'warning' ? 'on' : ''}`}
          onClick={() => setActiveFilter('warning')}
        >
          Warning ({counts().warning})
        </div>
        <div
          class={`filter-btn ${activeFilter() === 'all' ? 'on' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({counts().all})
        </div>
        <div style={{ flex: '1' }} />
        <button class="btn ghost" style={{ 'font-size': '11px' }} onClick={() => setSortByRestarts(!sortByRestarts())}>
          Sort: {sortByRestarts() ? 'Restarts' : 'Name'}
        </button>
        <button class="btn ghost" style={{ 'font-size': '11px' }} onClick={cycleNamespace}>
          Namespace: {nsFilter()}
        </button>
        <button class="btn ghost" style={{ 'font-size': '11px' }} onClick={fetchData}>↺</button>
      </div>

      <Show when={loading()}>
        <div style={{ padding: '24px', color: 'var(--t4)', 'font-size': '12px' }}>Loading workloads…</div>
      </Show>

      <Show when={!loading()}>
        <table class="wl-table">
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            <For each={filtered()}>{(w) => {
              const isCrit = w._sev === 'critical';
              const isWarn = w._sev === 'warning';
              return (
                <tr class={isCrit ? 'crit-row' : ''} onClick={isCrit ? props.onViewIncident : undefined}>
                  <td>
                    <div class="wl-name">
                      <div style={{
                        width: '7px', height: '7px', 'border-radius': '50%',
                        background: isCrit ? 'var(--crit)' : isWarn ? 'var(--warn)' : 'var(--ok)',
                        'flex-shrink': '0',
                        animation: isCrit ? 'crit-pulse 1.8s ease-in-out infinite' : 'none',
                      }} />
                      {w._name}
                      <span class="wl-ns">{w._ns}</span>
                    </div>
                  </td>
                  <td><span style={{ 'font-size': '10px', color: 'var(--t4)', 'font-weight': '500' }}>{w._kind}</span></td>
                  <td>
                    <span class={`wl-status ${isCrit ? 'crit' : isWarn ? 'warn' : 'ok'}`}>
                      ● {w._status}
                    </span>
                  </td>
                  <td>
                    <span class={`wl-replicas${isCrit ? ' bad' : ''}`}>{w._replicas}</span>
                  </td>
                  <td>
                    <span class={`wl-restarts${w._restarts >= 5 ? ' high' : ''}`}>{w._restarts}</span>
                  </td>
                  <td>
                    <Show when={w._metrics?.cpu} fallback={<span class="wl-cpu">—</span>}>
                      <span class="wl-cpu">{w._metrics?.cpu}</span>
                    </Show>
                  </td>
                  <td>
                    <Show when={w._metrics?.memory} fallback={<span class="wl-mem">—</span>}>
                      <span class="wl-mem">{w._metrics?.memory}</span>
                    </Show>
                  </td>
                  <td><span class="age-tag">{w._age}</span></td>
                  <td><span class="action-dots">···</span></td>
                </tr>
              );
            }}</For>
          </tbody>
        </table>
        <Show when={filtered().length === 0}>
          <div style={{ color: 'var(--t4)', 'font-size': '12px', padding: '12px 16px' }}>
            {loading() ? 'Loading…' : 'No workloads found.'}
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default WorkloadScreen;
