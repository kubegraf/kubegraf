/**
 * WorkloadScreen — Full parity with sidebar Workloads section
 * Kinds: Deployment · StatefulSet · DaemonSet · Pod · Job · CronJob · HPA
 * Tabs per item: Overview | YAML | Events | Scale (Deployment/STS) | Logs (Pod)
 */

import {
  Component, createSignal, createMemo, createEffect,
  onMount, For, Show, onCleanup, untrack,
} from 'solid-js';
import { Incident, api } from '../../services/api';

type SevFilter  = 'critical' | 'warning' | 'all';
type KindTab    = 'all' | 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'Pod' | 'Job' | 'CronJob' | 'HPA';
type DetailTab  = 'overview' | 'yaml' | 'events' | 'scale' | 'logs';

interface WorkloadScreenProps {
  onViewIncident?: () => void;
  onSelectWorkloadIncident?: (name: string, ns: string) => void;
  incidents?: Incident[];
}

// ── Kind colour map ───────────────────────────────────────
const KIND_COLOR: Record<string, string> = {
  Deployment:   '#3B82F6',
  StatefulSet:  '#0891B2',
  DaemonSet:    '#0D9488',
  Pod:          '#7C3AED',
  Job:          '#D97706',
  CronJob:      '#CA8A04',
  HPA:          '#059669',
};

const WorkloadScreen: Component<WorkloadScreenProps> = (props) => {

  /* ─── table signals ──────────────────────────────────── */
  const [kindTab,       setKindTab]       = createSignal<KindTab>('all');
  const [sevFilter,     setSevFilter]     = createSignal<SevFilter>('all');
  const [searchQuery,   setSearchQuery]   = createSignal('');
  const [nsFilter,      setNsFilter]      = createSignal('All');
  const [sortBy,        setSortBy]        = createSignal<'restarts' | 'name' | 'age'>('restarts');
  const [loading,       setLoading]       = createSignal(true);
  const [refreshing,    setRefreshing]    = createSignal(false);

  // raw data per kind
  const [workloads,     setWorkloads]     = createSignal<any[]>([]);
  const [jobs,          setJobs]          = createSignal<any[]>([]);
  const [cronJobs,      setCronJobs]      = createSignal<any[]>([]);
  const [hpas,          setHpas]          = createSignal<any[]>([]);
  const [podMetrics,    setPodMetrics]    = createSignal<Record<string, { cpu: string; memory: string }>>({});

  /* ─── detail panel signals ───────────────────────────── */
  const [selected,      setSelected]      = createSignal<any | null>(null);
  const [detailTab,     setDetailTab]     = createSignal<DetailTab>('overview');

  // YAML
  const [yamlContent,   setYamlContent]   = createSignal('');
  const [yamlEdited,    setYamlEdited]    = createSignal('');
  const [yamlLoading,   setYamlLoading]   = createSignal(false);
  const [yamlEditing,   setYamlEditing]   = createSignal(false);
  const [yamlSaving,    setYamlSaving]    = createSignal(false);
  const [yamlMsg,       setYamlMsg]       = createSignal('');

  // Events
  const [wlEvents,      setWlEvents]      = createSignal<any[]>([]);
  const [eventsLoading, setEventsLoading] = createSignal(false);

  // Logs (Pods only)
  const [podLogs,       setPodLogs]       = createSignal('');
  const [logsLoading,   setLogsLoading]   = createSignal(false);

  // Scale
  const [scaleInput,    setScaleInput]    = createSignal(1);
  const [scaling,       setScaling]       = createSignal(false);
  const [scaleMsg,      setScaleMsg]      = createSignal('');

  // Actions
  const [actioning,     setActioning]     = createSignal('');
  const [deleteTarget,  setDeleteTarget]  = createSignal<any | null>(null);
  const [actionToast,   setActionToast]   = createSignal<{ msg: string; ok: boolean } | null>(null);

  const toast = (msg: string, ok: boolean) => {
    setActionToast({ msg, ok });
    setTimeout(() => setActionToast(null), 3000);
  };

  /* ─── fetch all kinds ────────────────────────────────── */
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [pods, deploys, sts, ds, jobsRes, cronRes, hpaRes, metricsRes] =
        await Promise.allSettled([
          api.getPods(),
          api.getDeployments(),
          api.getStatefulSets(),
          api.getDaemonSets(),
          api.getJobs(),
          api.getCronJobs(),
          api.getHPAs(),
          api.getPodMetrics(),
        ]);

      const items: any[] = [];
      const addItems = (r: PromiseSettledResult<any[]>, kind: string) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value))
          r.value.forEach((x: any) => items.push({ ...x, _kind: kind }));
      };
      addItems(deploys, 'Deployment');
      addItems(sts,     'StatefulSet');
      addItems(ds,      'DaemonSet');
      addItems(pods,    'Pod');
      setWorkloads(items);

      if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value))
        setJobs(jobsRes.value.map((x: any) => ({ ...x, _kind: 'Job' })));
      if (cronRes.status === 'fulfilled' && Array.isArray(cronRes.value))
        setCronJobs(cronRes.value.map((x: any) => ({ ...x, _kind: 'CronJob' })));
      if (hpaRes.status === 'fulfilled' && Array.isArray(hpaRes.value))
        setHpas(hpaRes.value.map((x: any) => ({ ...x, _kind: 'HPA' })));
      if (metricsRes.status === 'fulfilled') setPodMetrics(metricsRes.value || {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  onMount(fetchData);

  /* ─── reset detail when selection changes ────────────── */
  createEffect(() => {
    const w = selected();
    setDetailTab('overview');
    setYamlContent(''); setYamlEdited(''); setYamlEditing(false); setYamlMsg('');
    setWlEvents([]); setEventsLoading(false);
    setPodLogs(''); setLogsLoading(false);
    setScaleMsg('');
    if (w) {
      const parts = (w._replicas || '').split('/');
      const desired = parseInt(parts[parts.length - 1] || parts[0] || '1');
      setScaleInput(isNaN(desired) ? 1 : desired);
    }
  });

  /* ─── YAML fetch ─────────────────────────────────────── */
  createEffect(() => {
    if (detailTab() !== 'yaml') return;
    const w = selected();
    if (!w) return;
    if (untrack(yamlLoading) || untrack(yamlContent)) return;
    setYamlLoading(true);
    const call =
      w._kind === 'Deployment'  ? api.getDeploymentYAML(w._name, w._ns)
      : w._kind === 'StatefulSet' ? api.getStatefulSetYAML(w._name, w._ns)
      : w._kind === 'DaemonSet'   ? api.getDaemonSetYAML(w._name, w._ns)
      : w._kind === 'Pod'         ? api.getPodYAML(w._name, w._ns)
      : w._kind === 'Job'         ? api.getJobYAML(w._name, w._ns)
      : w._kind === 'CronJob'     ? api.getCronJobYAML(w._name, w._ns)
      : w._kind === 'HPA'         ? api.getHPAYAML(w._name, w._ns)
      : Promise.resolve({ yaml: '' });
    call.then((r: any) => {
      const raw = typeof r === 'string' ? r : (r?.yaml || '');
      setYamlContent(raw); setYamlEdited(raw);
    }).catch(() => setYamlContent(`# Could not load YAML for ${w._name}`))
      .finally(() => setYamlLoading(false));
  });

  /* ─── Events fetch ───────────────────────────────────── */
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
          const n = (e.involvedObject?.name || e.name || '').toLowerCase();
          return n === w._name.toLowerCase() || n.startsWith(base.toLowerCase());
        });
        setWlEvents(filtered.length ? filtered : all.slice(0, 30));
      })
      .catch(() => setWlEvents([]))
      .finally(() => setEventsLoading(false));
  });

  /* ─── Logs fetch (Pod only) ──────────────────────────── */
  createEffect(() => {
    if (detailTab() !== 'logs') return;
    const w = selected();
    if (!w || w._kind !== 'Pod') return;
    if (untrack(logsLoading) || untrack(podLogs)) return;
    setLogsLoading(true);
    // Try api.getPodLogs; fall back gracefully
    const logsCall = (api as any).getPodLogs
      ? (api as any).getPodLogs(w._name, w._ns, undefined, 200)
      : Promise.reject(new Error('not available'));
    logsCall
      .then((r: any) => {
        const raw = typeof r === 'string' ? r : (r?.logs || r?.log || JSON.stringify(r, null, 2));
        setPodLogs(raw || '(no logs)');
      })
      .catch(() => setPodLogs(`# Logs not available\n# kubectl logs ${w._name} -n ${w._ns} --tail=200`))
      .finally(() => setLogsLoading(false));
  });

  /* ─── Incident severity map ──────────────────────────── */
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
    const s = (status || '').toLowerCase();
    if (s.includes('oomkilled') || s.includes('crashloop') || s.includes('error') || s === 'failed') return 'critical';
    if (s.includes('degraded') || s.includes('pending') || s === 'unknown') return 'warning';
    return 'ok';
  };

  /* ─── Enrich workloads (Deployment/STS/DS/Pod) ───────── */
  const enrichedWorkloads = createMemo(() => workloads().map(w => {
    const name     = w.name || w.metadata?.name || '—';
    const ns       = w.namespace || w.metadata?.namespace || '—';
    const status   = w.status || w.phase || 'Unknown';
    const restarts: number = w.restartCount ?? w.restarts ?? 0;
    const age      = w.age || '—';
    const sev      = getSeverity(name, status);
    const ready    = w.readyReplicas ?? w.availableReplicas ?? null;
    const desired  = w.replicas ?? w.desiredReplicas ?? null;
    const replicas = ready !== null && desired !== null ? `${ready}/${desired}`
      : ready !== null ? `${ready}` : desired !== null ? `0/${desired}` : '—';
    const pm    = podMetrics();
    const mKey  = Object.keys(pm).find(k => k === name || k.startsWith(name + '-'));
    const metrics = mKey ? pm[mKey] : null;
    const image = w.image || w.images?.[0] || w.spec?.template?.spec?.containers?.[0]?.image || '—';
    return { ...w, _name: name, _ns: ns, _status: status, _restarts: restarts, _age: age, _sev: sev, _replicas: replicas, _metrics: metrics, _image: image };
  }));

  /* ─── Enrich Jobs ────────────────────────────────────── */
  const enrichedJobs = createMemo(() => jobs().map(j => {
    const name      = j.name || j.metadata?.name || '—';
    const ns        = j.namespace || j.metadata?.namespace || '—';
    const succeeded = j.succeeded ?? j.status?.succeeded ?? 0;
    const completions = j.completions ?? j.spec?.completions ?? 1;
    const status    = succeeded >= completions ? 'Complete'
      : (j.failed ?? j.status?.failed ?? 0) > 0 ? 'Failed' : 'Running';
    const sev       = status === 'Failed' ? 'critical' : status === 'Running' ? 'ok' : 'ok';
    const age       = j.age || '—';
    const replicas  = `${succeeded}/${completions}`;
    return { ...j, _kind: 'Job', _name: name, _ns: ns, _status: status, _restarts: 0, _age: age, _sev: sev as any, _replicas: replicas, _metrics: null, _image: '—', _completions: replicas, _duration: j.duration || '—' };
  }));

  /* ─── Enrich CronJobs ────────────────────────────────── */
  const enrichedCronJobs = createMemo(() => cronJobs().map(c => {
    const name     = c.name || c.metadata?.name || '—';
    const ns       = c.namespace || c.metadata?.namespace || '—';
    const schedule = c.schedule || c.spec?.schedule || '—';
    const active   = c.active ?? c.status?.active?.length ?? 0;
    const status   = active > 0 ? 'Active' : 'Idle';
    const age      = c.age || '—';
    const lastSched = c.lastScheduleTime || c.status?.lastScheduleTime;
    const lastSchedStr = lastSched ? new Date(lastSched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    return { ...c, _kind: 'CronJob', _name: name, _ns: ns, _status: status, _restarts: 0, _age: age, _sev: 'ok' as any, _replicas: `${active} active`, _metrics: null, _image: '—', _schedule: schedule, _lastScheduled: lastSchedStr };
  }));

  /* ─── Enrich HPAs ────────────────────────────────────── */
  const enrichedHPAs = createMemo(() => hpas().map(h => {
    const name     = h.name || h.metadata?.name || '—';
    const ns       = h.namespace || h.metadata?.namespace || '—';
    const current  = h.currentReplicas ?? h.status?.currentReplicas ?? 0;
    const desired  = h.desiredReplicas ?? h.status?.desiredReplicas ?? current;
    const minR     = h.minReplicas ?? h.spec?.minReplicas ?? 1;
    const maxR     = h.maxReplicas ?? h.spec?.maxReplicas ?? '—';
    const target   = h.scaleTargetRef?.name || h.spec?.scaleTargetRef?.name || '—';
    const targetKind = h.scaleTargetRef?.kind || h.spec?.scaleTargetRef?.kind || 'Deployment';
    const scaling  = current !== desired;
    const sev: 'critical'|'warning'|'ok' = scaling ? 'warning' : 'ok';
    const age      = h.age || '—';
    return { ...h, _kind: 'HPA', _name: name, _ns: ns, _status: scaling ? 'Scaling' : 'Stable', _restarts: 0, _age: age, _sev: sev, _replicas: `${current}/${desired}`, _metrics: null, _image: '—', _minR: minR, _maxR: maxR, _target: target, _targetKind: targetKind, _currentReplicas: current, _desiredReplicas: desired };
  }));

  /* ─── Combined list ──────────────────────────────────── */
  const allItems = createMemo(() => {
    const kt = kindTab();
    let list: any[] = [];
    if (kt === 'all' || kt === 'Deployment' || kt === 'StatefulSet' || kt === 'DaemonSet' || kt === 'Pod')
      list.push(...enrichedWorkloads().filter(w => kt === 'all' || w._kind === kt));
    if (kt === 'all' || kt === 'Job')      list.push(...enrichedJobs());
    if (kt === 'all' || kt === 'CronJob')  list.push(...enrichedCronJobs());
    if (kt === 'all' || kt === 'HPA')      list.push(...enrichedHPAs());
    return list;
  });

  /* ─── Namespace list ─────────────────────────────────── */
  const namespaces = createMemo(() => {
    const s = new Set<string>();
    allItems().forEach(w => { if (w._ns !== '—') s.add(w._ns); });
    return ['All', ...Array.from(s).sort()];
  });

  /* ─── Filtered + sorted ──────────────────────────────── */
  const filtered = createMemo(() => {
    let list = allItems();
    const ns = nsFilter();
    if (ns !== 'All') list = list.filter(w => w._ns === ns);

    const q = searchQuery().toLowerCase();
    if (q) list = list.filter(w => w._name.toLowerCase().includes(q) || w._ns.toLowerCase().includes(q));

    if (sevFilter() === 'critical') list = list.filter(w => w._sev === 'critical');
    else if (sevFilter() === 'warning') list = list.filter(w => w._sev === 'warning');

    if (sortBy() === 'restarts') list = [...list].sort((a, b) => b._restarts - a._restarts);
    else if (sortBy() === 'name') list = [...list].sort((a, b) => a._name.localeCompare(b._name));
    return list;
  });

  /* ─── Summary counts ─────────────────────────────────── */
  const counts = createMemo(() => {
    const all = allItems();
    return {
      critical: all.filter(w => w._sev === 'critical').length,
      warning:  all.filter(w => w._sev === 'warning').length,
      total:    all.length,
    };
  });

  /* ─── Kind tab counts ────────────────────────────────── */
  const kindCounts = createMemo(() => ({
    all:         allItems().length,
    Deployment:  enrichedWorkloads().filter(w => w._kind === 'Deployment').length,
    StatefulSet: enrichedWorkloads().filter(w => w._kind === 'StatefulSet').length,
    DaemonSet:   enrichedWorkloads().filter(w => w._kind === 'DaemonSet').length,
    Pod:         enrichedWorkloads().filter(w => w._kind === 'Pod').length,
    Job:         enrichedJobs().length,
    CronJob:     enrichedCronJobs().length,
    HPA:         enrichedHPAs().length,
  }));

  const cycleNamespace = () => {
    const list = namespaces();
    setNsFilter(list[(list.indexOf(nsFilter()) + 1) % list.length]);
  };

  /* ─── Actions ────────────────────────────────────────── */
  const doRestart = async (w: any, e: MouseEvent) => {
    e.stopPropagation();
    const key = w._name + ':restart';
    setActioning(key);
    try {
      const call =
        w._kind === 'Deployment'  ? api.restartDeployment(w._name, w._ns)
        : w._kind === 'StatefulSet' ? api.restartStatefulSet(w._name, w._ns)
        : w._kind === 'DaemonSet'   ? api.restartDaemonSet(w._name, w._ns)
        : w._kind === 'Pod'         ? api.deletePod(w._name, w._ns) // delete = restart for pod
        : Promise.reject(new Error('Cannot restart ' + w._kind));
      await call;
      toast(`✓ ${w._name} restarted`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch {
      toast(`✗ Restart failed for ${w._name}`, false);
    } finally { setActioning(''); }
  };

  const doDelete = async (w: any) => {
    setDeleteTarget(null);
    setActioning(w._name + ':delete');
    try {
      const call =
        w._kind === 'Deployment'  ? api.deleteDeployment(w._name, w._ns)
        : w._kind === 'StatefulSet' ? api.deleteStatefulSet(w._name, w._ns)
        : w._kind === 'DaemonSet'   ? api.deleteDaemonSet(w._name, w._ns)
        : w._kind === 'Pod'         ? api.deletePod(w._name, w._ns)
        : w._kind === 'Job'         ? api.deleteJob(w._name, w._ns)
        : w._kind === 'CronJob'     ? api.deleteCronJob(w._name, w._ns)
        : w._kind === 'HPA'         ? api.deleteHPA(w._name, w._ns)
        : Promise.reject(new Error('Cannot delete ' + w._kind));
      await call;
      toast(`✓ ${w._name} deleted`, true);
      if (selected()?._name === w._name) setSelected(null);
      setTimeout(() => fetchData(true), 1500);
    } catch {
      toast(`✗ Delete failed for ${w._name}`, false);
    } finally { setActioning(''); }
  };

  const doScale = async () => {
    const w = selected();
    if (!w || w._kind === 'DaemonSet' || w._kind === 'Pod' || w._kind === 'Job' || w._kind === 'CronJob' || w._kind === 'HPA') return;
    setScaling(true); setScaleMsg('');
    try {
      const call = w._kind === 'Deployment'
        ? api.scaleDeployment(w._name, w._ns, scaleInput())
        : api.scaleStatefulSet(w._name, w._ns, scaleInput());
      await call;
      setScaleMsg(`✓ Scaled to ${scaleInput()} replicas`);
      toast(`✓ ${w._name} scaled to ${scaleInput()}`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch { setScaleMsg('✗ Scale operation failed'); }
    finally { setScaling(false); }
  };

  const doSaveYaml = async () => {
    const w = selected();
    if (!w) return;
    setYamlSaving(true); setYamlMsg('');
    try {
      if (w._kind === 'Deployment') await api.updateDeployment(w._name, w._ns, yamlEdited());
      else if (w._kind === 'DaemonSet') await api.updateDaemonSet(w._name, w._ns, yamlEdited());
      else await api.applyResourceYAML(w._kind, w._name, w._ns, yamlEdited());
      setYamlContent(yamlEdited()); setYamlEditing(false);
      setYamlMsg('✓ Applied successfully');
      toast(`✓ ${w._name} updated`, true);
      setTimeout(() => fetchData(true), 1500);
    } catch (err: any) {
      setYamlMsg('✗ ' + (err?.message || 'Apply failed'));
    } finally { setYamlSaving(false); }
  };

  /* ─── YAML syntax highlight ──────────────────────────── */
  const renderYaml = (raw: string) => raw.split('\n').map((line: string) => {
    const trimmed  = line.trimStart();
    const indent   = line.length - trimmed.length;
    const isComment = trimmed.startsWith('#');
    const keyMatch  = !isComment && /^([a-zA-Z_$][^:]*):(.*)$/.exec(trimmed);
    if (keyMatch) {
      const val   = keyMatch[2];
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

  /* ─── Icon button style helper ───────────────────────── */
  const iconBtn = (danger = false) => ({
    display: 'inline-flex', 'align-items': 'center', 'justify-content': 'center',
    width: '26px', height: '26px', 'border-radius': '6px', border: 'none',
    background: 'transparent', cursor: 'pointer', transition: 'background .12s',
    color: danger ? 'var(--crit)' : 'var(--t4)',
  } as const);

  /* ─── Render ─────────────────────────────────────────── */
  const scalableKinds = new Set(['Deployment', 'StatefulSet']);
  const restartableKinds = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'Pod']);
  const canScale   = (w: any) => scalableKinds.has(w._kind);
  const canRestart = (w: any) => restartableKinds.has(w._kind);

  return (
    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ══ Kind Tabs ══════════════════════════════════════ */}
      <div style={{
        display: 'flex', 'align-items': 'center', 'flex-shrink': '0',
        background: 'var(--s1)', 'border-bottom': '1px solid var(--b1)',
        padding: '0 16px', 'overflow-x': 'auto',
      }}>
        {([ 'all', 'Deployment', 'StatefulSet', 'DaemonSet', 'Pod', 'Job', 'CronJob', 'HPA' ] as KindTab[]).map(k => {
          const count = kindCounts()[k];
          const active = kindTab() === k;
          return (
            <button
              onClick={() => setKindTab(k)}
              style={{
                display: 'flex', 'align-items': 'center', gap: '5px',
                padding: '9px 11px', background: 'none', border: 'none',
                'border-bottom': `2px solid ${active ? (KIND_COLOR[k] || 'var(--brand)') : 'transparent'}`,
                color: active ? (KIND_COLOR[k] || 'var(--brand)') : 'var(--t4)',
                cursor: 'pointer', 'font-size': '11px', 'font-weight': active ? '700' : '500',
                'white-space': 'nowrap', transition: 'all .12s', 'margin-bottom': '-1px',
              }}
            >
              {k === 'all' ? 'All' : k}
              <span style={{
                'font-size': '9px', 'font-weight': '700', padding: '0 4px',
                'border-radius': '3px', 'line-height': '14px',
                background: active ? (KIND_COLOR[k] || 'var(--brand)') + '22' : 'var(--s3)',
                color: active ? (KIND_COLOR[k] || 'var(--brand)') : 'var(--t5)',
                border: `1px solid ${active ? (KIND_COLOR[k] || 'var(--brand)') + '44' : 'var(--b1)'}`,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ══ Toolbar ════════════════════════════════════════ */}
      <div style={{
        display: 'flex', 'align-items': 'center', gap: '6px',
        padding: '8px 14px', 'flex-shrink': '0',
        background: 'var(--s1)', 'border-bottom': '1px solid var(--b1)',
        'flex-wrap': 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', 'min-width': '120px', 'max-width': '220px' }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--t5)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search name / namespace…"
            value={searchQuery()}
            onInput={e => setSearchQuery(e.currentTarget.value)}
            style={{
              width: '100%', padding: '5px 8px 5px 26px',
              background: 'var(--s2)', border: '1px solid var(--b1)',
              'border-radius': '6px', 'font-size': '11px', color: 'var(--t2)', outline: 'none',
            }}
          />
        </div>

        {/* Severity chips */}
        {([['critical','crit','var(--crit)'],['warning','warn','var(--warn)'],['all','all','var(--t3)']] as const).map(([f, cls, col]) => (
          <button
            onClick={() => setSevFilter(f as SevFilter)}
            style={{
              display: 'flex', 'align-items': 'center', gap: '4px',
              padding: '4px 9px', 'border-radius': '6px', cursor: 'pointer',
              border: `1px solid ${sevFilter() === f ? col : 'var(--b1)'}`,
              background: sevFilter() === f ? (col + '18') : 'transparent',
              color: sevFilter() === f ? col : 'var(--t4)',
              'font-size': '11px', 'font-weight': sevFilter() === f ? '700' : '500',
            }}
          >
            <Show when={f !== 'all'}>
              <div style={{ width: '5px', height: '5px', 'border-radius': '50%', background: 'currentColor' }} />
            </Show>
            {f === 'critical' ? `Critical (${counts().critical})` : f === 'warning' ? `Warn (${counts().warning})` : `All (${counts().total})`}
          </button>
        ))}

        <div style={{ flex: '1' }} />

        {/* Sort */}
        <button class="btn ghost" style={{ 'font-size': '10.5px', padding: '4px 9px' }}
          onClick={() => setSortBy(sortBy() === 'restarts' ? 'name' : sortBy() === 'name' ? 'age' : 'restarts')}>
          ↕ {sortBy() === 'restarts' ? 'Restarts' : sortBy() === 'name' ? 'Name' : 'Age'}
        </button>
        {/* NS */}
        <button class="btn ghost" style={{ 'font-size': '10.5px', padding: '4px 9px' }} onClick={cycleNamespace}>
          NS: {nsFilter()}
        </button>
        {/* Refresh */}
        <button class="btn ghost" style={{ 'font-size': '11px', opacity: refreshing() ? '0.6' : '1', padding: '4px 8px' }}
          disabled={refreshing()} onClick={() => fetchData(true)}>
          {refreshing() ? '↻' : '↺'}
        </button>
      </div>

      {/* ══ Content split ══════════════════════════════════ */}
      <div style={{ flex: '1', display: 'flex', overflow: 'hidden' }}>

        {/* ── Table pane ── */}
        <div style={{ flex: selected() ? '0 0 52%' : '1', overflow: 'auto', transition: 'flex .2s ease', 'min-width': '0' }}>

          <Show when={loading()}>
            <div style={{ padding: '32px 16px', color: 'var(--t4)', 'font-size': '12px', 'text-align': 'center' }}>
              Loading workloads…
            </div>
          </Show>

          <Show when={!loading()}>
            <table class="wl-table" style={{ 'border-radius': '0', border: 'none' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <Show when={kindTab() === 'all'}><th>Kind</th></Show>
                  <th>Namespace</th>
                  <th>Status</th>
                  <th>{kindTab() === 'HPA' ? 'Min/Max' : kindTab() === 'Job' ? 'Completions' : 'Replicas'}</th>
                  <Show when={kindTab() !== 'HPA' && kindTab() !== 'Job' && kindTab() !== 'CronJob'}>
                    <th>Restarts</th>
                    <th>CPU</th>
                    <th>Mem</th>
                  </Show>
                  <Show when={kindTab() === 'CronJob'}><th>Schedule</th><th>Last Run</th></Show>
                  <Show when={kindTab() === 'HPA'}><th>Target</th></Show>
                  <th>Age</th>
                  <th style={{ 'text-align': 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filtered()}>{(w) => {
                  const isCrit = w._sev === 'critical';
                  const isWarn = w._sev === 'warning';
                  const isSel  = selected()?._name === w._name && selected()?._ns === w._ns;
                  const isAct  = actioning().startsWith(w._name + ':');
                  const kColor = KIND_COLOR[w._kind] || 'var(--t5)';
                  return (
                    <tr
                      class={isCrit ? 'crit-row' : ''}
                      style={{ background: isSel ? 'var(--brandDim)' : undefined }}
                      onClick={() => setSelected(isSel ? null : w)}
                    >
                      {/* Name */}
                      <td>
                        <div class="wl-name">
                          <div style={{
                            width: '6px', height: '6px', 'border-radius': '50%', 'flex-shrink': '0',
                            background: isCrit ? 'var(--crit)' : isWarn ? 'var(--warn)' : 'var(--ok)',
                            animation: isCrit ? 'crit-pulse 1.8s ease-in-out infinite' : 'none',
                          }} />
                          <span style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{w._name}</span>
                          <span class="wl-ns">{w._ns}</span>
                        </div>
                      </td>
                      {/* Kind (only in All tab) */}
                      <Show when={kindTab() === 'all'}>
                        <td><span style={{ 'font-size': '9.5px', 'font-weight': '700', color: kColor, background: kColor + '18', padding: '1px 5px', 'border-radius': '3px', 'font-family': 'var(--mono)' }}>{w._kind}</span></td>
                      </Show>
                      {/* Namespace */}
                      <td style={{ 'font-size': '11px', color: 'var(--t4)', 'max-width': '100px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{w._ns}</td>
                      {/* Status */}
                      <td><span class={`wl-status ${isCrit ? 'crit' : isWarn ? 'warn' : 'ok'}`}>● {w._status}</span></td>
                      {/* Replicas / Completions / Min-Max */}
                      <td>
                        <Show when={kindTab() === 'HPA'}>
                          <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t3)' }}>{w._minR}–{w._maxR}</span>
                        </Show>
                        <Show when={kindTab() !== 'HPA'}>
                          <span class={`wl-replicas${isCrit ? ' bad' : ''}`}>{w._replicas}</span>
                        </Show>
                      </td>
                      {/* Restarts / CPU / Mem (not for HPA/Job/CronJob) */}
                      <Show when={kindTab() !== 'HPA' && kindTab() !== 'Job' && kindTab() !== 'CronJob'}>
                        <td><span class={`wl-restarts${w._restarts >= 5 ? ' high' : ''}`}>{w._restarts}</span></td>
                        <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{w._metrics?.cpu || '—'}</span></td>
                        <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '11px' }}>{w._metrics?.memory || '—'}</span></td>
                      </Show>
                      {/* CronJob: schedule + last run */}
                      <Show when={kindTab() === 'CronJob'}>
                        <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t4)' }}>{w._schedule}</span></td>
                        <td><span style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t5)' }}>{w._lastScheduled}</span></td>
                      </Show>
                      {/* HPA: target */}
                      <Show when={kindTab() === 'HPA'}>
                        <td><span style={{ 'font-size': '11px', color: 'var(--brand)' }}>{w._targetKind}/{w._target}</span></td>
                      </Show>
                      {/* Age */}
                      <td><span class="age-tag">{w._age}</span></td>
                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '1px', 'justify-content': 'flex-end' }} onClick={e => e.stopPropagation()}>
                          <Show when={(isCrit || isWarn) && props.onSelectWorkloadIncident}>
                            <button title="View incident" style={iconBtn()}
                              onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--s3)'; (e.currentTarget as any).style.color = 'var(--brand)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background = ''; (e.currentTarget as any).style.color = 'var(--t4)'; }}
                              onClick={() => props.onSelectWorkloadIncident!(w._name, w._ns)}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </button>
                          </Show>
                          <Show when={canRestart(w)}>
                            <button title="Restart" disabled={isAct} style={{ ...iconBtn(), opacity: isAct ? '0.5' : '1' }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--s3)'; (e.currentTarget as any).style.color = 'var(--ok)'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background = ''; (e.currentTarget as any).style.color = 'var(--t4)'; }}
                              onClick={e => doRestart(w, e)}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                            </button>
                          </Show>
                          <button title="Delete" disabled={isAct} style={{ ...iconBtn(true), opacity: isAct ? '0.5' : '1' }}
                            onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--critBg)'; }}
                            onMouseLeave={e => { (e.currentTarget as any).style.background = ''; }}
                            onClick={e => { e.stopPropagation(); setDeleteTarget(w); }}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }}</For>
              </tbody>
            </table>
            <Show when={filtered().length === 0}>
              <div style={{ color: 'var(--t4)', 'font-size': '12px', padding: '24px', 'text-align': 'center' }}>
                {searchQuery() ? `No results for "${searchQuery()}"` : 'No workloads found'}
              </div>
            </Show>
          </Show>
        </div>

        {/* ── Detail panel ── */}
        <Show when={selected()}>
          {(w) => {
            const kc = KIND_COLOR[w()._kind] || 'var(--brand)';
            const tabList = (): { id: DetailTab; label: string }[] => {
              const tabs: { id: DetailTab; label: string }[] = [
                { id: 'overview', label: 'Overview' },
                { id: 'yaml',     label: 'YAML' },
                { id: 'events',   label: 'Events' },
              ];
              if (canScale(w())) tabs.push({ id: 'scale', label: 'Scale' });
              if (w()._kind === 'Pod') tabs.push({ id: 'logs', label: 'Logs' });
              return tabs;
            };
            return (
              <div style={{ flex: '1', background: 'var(--s1)', 'border-left': '1px solid var(--b1)', display: 'flex', 'flex-direction': 'column', overflow: 'hidden', 'min-width': '0' }}>

                {/* Panel header */}
                <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '10px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0' }}>
                  <div style={{ width: '8px', height: '8px', 'border-radius': '50%', 'flex-shrink': '0', background: w()._sev === 'critical' ? 'var(--crit)' : w()._sev === 'warning' ? 'var(--warn)' : 'var(--ok)', animation: w()._sev === 'critical' ? 'crit-pulse 1.8s ease-in-out infinite' : 'none' }} />
                  <span style={{ 'font-weight': '700', 'font-size': '12.5px', color: 'var(--t1)', flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{w()._name}</span>
                  <span style={{ 'font-size': '9.5px', color: kc, background: kc + '18', padding: '2px 6px', 'border-radius': '4px', 'font-weight': '700', 'font-family': 'var(--mono)' }}>{w()._kind}</span>
                  <button class="btn ghost" style={{ 'font-size': '11px', padding: '2px 7px', 'margin-left': '2px' }} onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* Quick action bar */}
                <div style={{ display: 'flex', gap: '5px', padding: '7px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0', background: 'var(--s2)' }}>
                  <Show when={canRestart(w())}>
                    <button class="btn ghost" style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '4px' }}
                      disabled={!!actioning()} onClick={e => doRestart(w(), e)}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                      {w()._kind === 'Pod' ? 'Delete/Restart' : 'Restart'}
                    </button>
                  </Show>
                  <Show when={canScale(w())}>
                    <button class="btn ghost" style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '4px' }}
                      onClick={() => setDetailTab('scale')}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>
                      Scale
                    </button>
                  </Show>
                  <button class="btn ghost" style={{ 'font-size': '11px', padding: '4px 10px', display: 'flex', 'align-items': 'center', gap: '4px' }}
                    onClick={() => setDetailTab('yaml')}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    YAML
                  </button>
                  <Show when={(w()._sev === 'critical' || w()._sev === 'warning') && props.onSelectWorkloadIncident}>
                    <button class="btn ghost" style={{ 'font-size': '11px', padding: '4px 10px', color: 'var(--crit)', display: 'flex', 'align-items': 'center', gap: '4px' }}
                      onClick={() => props.onSelectWorkloadIncident!(w()._name, w()._ns)}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                      Incident
                    </button>
                  </Show>
                  <div style={{ flex: '1' }} />
                  <button class="btn danger" style={{ 'font-size': '11px', padding: '4px 10px' }}
                    disabled={!!actioning()} onClick={() => setDeleteTarget(w())}>Delete</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0', padding: '0 14px' }}>
                  <For each={tabList()}>{(tab) => (
                    <button style={{
                      padding: '8px 12px', 'font-size': '11.5px', background: 'none', border: 'none', cursor: 'pointer',
                      'font-weight': detailTab() === tab.id ? '700' : '500',
                      color: detailTab() === tab.id ? kc : 'var(--t4)',
                      'border-bottom': detailTab() === tab.id ? `2px solid ${kc}` : '2px solid transparent',
                      'margin-bottom': '-1px', transition: 'color .1s',
                    }} onClick={() => setDetailTab(tab.id)}>{tab.label}</button>
                  )}</For>
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
                        'border-radius': '8px', border: `1px solid ${w()._sev === 'critical' ? 'var(--critBdr)' : w()._sev === 'warning' ? 'var(--warnBdr)' : 'var(--okBdr)'}`,
                      }}>
                        <span style={{ 'font-weight': '700', 'font-size': '11px', color: w()._sev === 'critical' ? 'var(--crit)' : w()._sev === 'warning' ? 'var(--warn)' : 'var(--ok)' }}>● {w()._status}</span>
                        <span style={{ 'font-size': '11px', color: 'var(--t4)', 'margin-left': 'auto' }}>{w()._age} old</span>
                      </div>

                      {/* Key-value grid — universal + kind-specific */}
                      <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '8px' }}>
                        {/* Common fields */}
                        {[
                          { k: 'Kind',      v: w()._kind },
                          { k: 'Namespace', v: w()._ns },
                          { k: 'Age',       v: w()._age },
                          // kind-specific fields inline
                          ...(w()._kind === 'HPA' ? [
                            { k: 'Target',   v: `${w()._targetKind}/${w()._target}` },
                            { k: 'Min',      v: String(w()._minR) },
                            { k: 'Max',      v: String(w()._maxR) },
                            { k: 'Current',  v: String(w()._currentReplicas) },
                            { k: 'Desired',  v: String(w()._desiredReplicas) },
                          ] : w()._kind === 'Job' ? [
                            { k: 'Completions', v: w()._completions },
                            { k: 'Duration',    v: w()._duration },
                          ] : w()._kind === 'CronJob' ? [
                            { k: 'Schedule',    v: w()._schedule },
                            { k: 'Last Run',    v: w()._lastScheduled },
                          ] : [
                            { k: 'Replicas',  v: w()._replicas },
                            { k: 'Restarts',  v: String(w()._restarts), warn: w()._restarts >= 5 },
                            { k: 'CPU',       v: w()._metrics?.cpu  || '—' },
                            { k: 'Memory',    v: w()._metrics?.memory || '—' },
                          ]),
                        ].map(row => (
                          <div style={{ background: 'var(--s2)', 'border-radius': '6px', padding: '8px 10px' }}>
                            <div style={{ 'font-size': '9.5px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '2px' }}>{row.k}</div>
                            <div style={{ 'font-family': 'var(--mono)', 'font-size': '12px', 'font-weight': '600', color: (row as any).warn ? 'var(--crit)' : 'var(--t1)', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={row.v}>{row.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Image (non-HPA/Job/CronJob) */}
                      <Show when={w()._image && w()._image !== '—'}>
                        <div style={{ background: 'var(--s2)', 'border-radius': '6px', padding: '8px 10px' }}>
                          <div style={{ 'font-size': '9.5px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '3px' }}>Image</div>
                          <div style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: 'var(--t2)', 'word-break': 'break-all', 'line-height': '1.5' }}>{w()._image}</div>
                        </div>
                      </Show>

                      {/* Quick kubectl commands */}
                      <div>
                        <div style={{ 'font-size': '9.5px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '6px' }}>Quick Commands</div>
                        {[
                          { label: 'Describe', cmd: `kubectl describe ${w()._kind.toLowerCase()} ${w()._name} -n ${w()._ns}` },
                          ...(w()._kind === 'Pod' ? [
                            { label: 'Logs',    cmd: `kubectl logs ${w()._name} -n ${w()._ns} --tail=100` },
                            { label: 'Exec',    cmd: `kubectl exec -it ${w()._name} -n ${w()._ns} -- /bin/sh` },
                          ] : []),
                          ...(w()._kind === 'Deployment' || w()._kind === 'StatefulSet' ? [
                            { label: 'Rollout',  cmd: `kubectl rollout status ${w()._kind.toLowerCase()}/${w()._name} -n ${w()._ns}` },
                            { label: 'Rollback', cmd: `kubectl rollout undo ${w()._kind.toLowerCase()}/${w()._name} -n ${w()._ns}` },
                          ] : []),
                          ...(w()._kind === 'HPA' ? [
                            { label: 'Status', cmd: `kubectl get hpa ${w()._name} -n ${w()._ns} -o yaml` },
                          ] : []),
                          { label: 'Events',   cmd: `kubectl get events -n ${w()._ns} --sort-by=.lastTimestamp` },
                        ].map(item => (
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '6px 8px', 'border-radius': '5px', cursor: 'pointer', 'margin-bottom': '4px', background: 'var(--s2)' }}
                            onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--s3)'; }}
                            onMouseLeave={e => { (e.currentTarget as any).style.background = 'var(--s2)'; }}
                            onClick={() => navigator.clipboard.writeText(item.cmd).then(() => toast('✓ Copied', true))}>
                            <span style={{ 'font-size': '9.5px', color: 'var(--t5)', 'min-width': '52px', 'font-weight': '600' }}>{item.label}</span>
                            <span style={{ 'font-family': 'var(--mono)', 'font-size': '10px', color: 'var(--t3)', flex: '1', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>{item.cmd}</span>
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style={{ 'flex-shrink': '0', color: 'var(--t5)' }}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Show>

                  {/* ── YAML ── */}
                  <Show when={detailTab() === 'yaml'}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', padding: '8px 14px', 'border-bottom': '1px solid var(--b2)', 'flex-shrink': '0', background: 'var(--s2)' }}>
                        <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t4)', flex: '1' }}>{w()._kind}/{w()._name}</span>
                        <Show when={yamlMsg()}>
                          <span style={{ 'font-size': '11px', color: yamlMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>{yamlMsg()}</span>
                        </Show>
                        <Show when={!yamlEditing()}>
                          <button class="btn ghost" style={{ 'font-size': '11px', padding: '3px 10px' }}
                            onClick={() => { setYamlEdited(yamlContent()); setYamlEditing(true); setYamlMsg(''); }}>Edit</button>
                        </Show>
                        <Show when={yamlEditing()}>
                          <button class="btn ghost" style={{ 'font-size': '11px', padding: '3px 10px' }} onClick={() => { setYamlEditing(false); setYamlMsg(''); }}>Cancel</button>
                          <button class="btn primary" style={{ 'font-size': '11px', padding: '3px 10px' }} disabled={yamlSaving()} onClick={doSaveYaml}>{yamlSaving() ? 'Applying…' : 'Apply'}</button>
                        </Show>
                      </div>
                      <Show when={yamlLoading()}>
                        <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading YAML…</div>
                      </Show>
                      <Show when={!yamlLoading() && yamlEditing()}>
                        <textarea style={{ flex: '1', background: '#0D1521', color: '#E2E8F0', border: 'none', outline: 'none', padding: '12px 16px', resize: 'none', 'font-family': 'var(--mono)', 'font-size': '11.5px', 'line-height': '1.7', 'tab-size': '2' }}
                          value={yamlEdited()} onInput={e => setYamlEdited(e.currentTarget.value)} spellcheck={false} />
                      </Show>
                      <Show when={!yamlLoading() && !yamlEditing()}>
                        <div style={{ flex: '1', overflow: 'auto', background: '#0D1521', padding: '12px 16px', 'font-family': 'var(--mono)', 'font-size': '11.5px', 'line-height': '1.7', 'white-space': 'pre' }}>
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
                          No events found for <span style={{ 'font-family': 'var(--mono)', color: 'var(--t3)' }}>{w()._name}</span>.
                        </div>
                      }>
                        <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                          <thead>
                            <tr>{['Type','Reason','Message','Count','Time'].map(h =>
                              <th style={{ padding: '7px 10px', 'text-align': 'left', 'font-size': '9.5px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.5px', 'border-bottom': '1px solid var(--b1)', background: 'var(--s2)', 'white-space': 'nowrap' }}>{h}</th>
                            )}</tr>
                          </thead>
                          <tbody>
                            <For each={wlEvents()}>{(ev) => {
                              const isWarn = ev.type === 'Warning';
                              return (
                                <tr style={{ 'border-bottom': '1px solid var(--b1)' }}>
                                  <td style={{ padding: '7px 10px' }}><span style={{ 'font-size': '10px', 'font-weight': '700', color: isWarn ? 'var(--warn)' : 'var(--ok)' }}>{ev.type || 'Normal'}</span></td>
                                  <td style={{ padding: '7px 10px', 'font-family': 'var(--mono)', 'font-size': '10.5px', color: isWarn ? 'var(--warn)' : 'var(--t2)', 'white-space': 'nowrap' }}>{ev.reason || '—'}</td>
                                  <td style={{ padding: '7px 10px', 'font-size': '11px', color: 'var(--t3)', 'max-width': '220px', overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }} title={ev.message || ''}>{ev.message || '—'}</td>
                                  <td style={{ padding: '7px 10px', 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t4)', 'text-align': 'center' }}>×{ev.count || 1}</td>
                                  <td style={{ padding: '7px 10px', 'font-family': 'var(--mono)', 'font-size': '10px', color: 'var(--t5)', 'white-space': 'nowrap' }}>
                                    {ev.lastTime ? new Date(ev.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                  </td>
                                </tr>
                              );
                            }}</For>
                          </tbody>
                        </table>
                      </Show>
                    </Show>
                  </Show>

                  {/* ── Scale (Deployment/StatefulSet) ── */}
                  <Show when={detailTab() === 'scale'}>
                    <div style={{ padding: '20px 14px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}>
                      <div>
                        <div style={{ 'font-size': '12px', color: 'var(--t3)', 'margin-bottom': '14px', 'line-height': '1.5' }}>
                          Current: <strong style={{ color: 'var(--t1)' }}>{w()._replicas}</strong> replicas
                        </div>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '8px' }}>Target Replicas</div>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'margin-bottom': '16px' }}>
                          <input type="range" min="0" max="10" step="1" value={scaleInput()} onInput={e => setScaleInput(parseInt(e.currentTarget.value))} style={{ flex: '1', 'accent-color': kc }} />
                          <input type="number" min="0" max="20" value={scaleInput()} onInput={e => setScaleInput(Math.max(0, parseInt(e.currentTarget.value) || 0))} style={{ width: '54px', padding: '5px 8px', 'border-radius': '6px', border: '1px solid var(--b2)', background: 'var(--s1)', 'font-family': 'var(--mono)', 'font-size': '13px', 'font-weight': '700', color: 'var(--t1)', 'text-align': 'center' }} />
                        </div>
                        <Show when={scaleInput() === 0}>
                          <div style={{ padding: '8px 12px', background: 'var(--warnBg)', 'border-radius': '6px', 'font-size': '11.5px', color: 'var(--warn)', 'margin-bottom': '12px', border: '1px solid var(--warnBdr)' }}>
                            ⚠ Scaling to 0 will stop all pods for this workload
                          </div>
                        </Show>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
                          <button class="btn primary" style={{ 'font-size': '12px', padding: '7px 18px', 'border-color': kc, background: kc }} disabled={scaling()} onClick={doScale}>
                            {scaling() ? 'Scaling…' : `Scale to ${scaleInput()}`}
                          </button>
                          <Show when={scaleMsg()}>
                            <span style={{ 'font-size': '11.5px', color: scaleMsg().startsWith('✓') ? 'var(--ok)' : 'var(--crit)' }}>{scaleMsg()}</span>
                          </Show>
                        </div>
                      </div>
                      <div style={{ 'border-top': '1px solid var(--b1)', 'padding-top': '14px' }}>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '8px' }}>Quick Presets</div>
                        <div style={{ display: 'flex', gap: '8px', 'flex-wrap': 'wrap' }}>
                          {[0,1,2,3,5,10].map(n => (
                            <button class="btn ghost" style={{ 'font-size': '11.5px', 'font-family': 'var(--mono)', 'font-weight': '700', padding: '5px 14px' }} onClick={() => setScaleInput(n)}>{n}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ 'border-top': '1px solid var(--b1)', 'padding-top': '14px' }}>
                        <div style={{ 'font-size': '10px', color: 'var(--t5)', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '.04em', 'margin-bottom': '8px' }}>Rollback</div>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 10px', background: 'var(--s2)', 'border-radius': '6px', cursor: 'pointer' }}
                          onMouseEnter={e => { (e.currentTarget as any).style.background = 'var(--s3)'; }}
                          onMouseLeave={e => { (e.currentTarget as any).style.background = 'var(--s2)'; }}
                          onClick={() => { const n = w()._name.replace(/-[a-z0-9]+-[a-z0-9]+$/, ''); navigator.clipboard.writeText(`kubectl rollout undo ${w()._kind.toLowerCase()}/${n} -n ${w()._ns}`).then(() => toast('✓ Rollback command copied', true)); }}>
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.33"/></svg>
                          <span style={{ 'font-size': '11.5px', color: 'var(--t2)', flex: '1' }}>kubectl rollout undo …</span>
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </div>
                      </div>
                    </div>
                  </Show>

                  {/* ── Logs (Pod only) ── */}
                  <Show when={detailTab() === 'logs'}>
                    <div style={{ display: 'flex', 'flex-direction': 'column', height: '100%' }}>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', padding: '8px 14px', 'border-bottom': '1px solid var(--b2)', 'flex-shrink': '0', background: 'var(--s2)' }}>
                        <span style={{ 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t4)', flex: '1' }}>Logs — {w()._name}</span>
                        <button class="btn ghost" style={{ 'font-size': '10.5px', padding: '3px 9px' }}
                          onClick={() => { setPodLogs(''); setLogsLoading(false); setDetailTab('overview'); setTimeout(() => setDetailTab('logs'), 10); }}>
                          ↺ Reload
                        </button>
                        <button class="btn ghost" style={{ 'font-size': '10.5px', padding: '3px 9px' }}
                          onClick={() => navigator.clipboard.writeText(podLogs()).then(() => toast('✓ Logs copied', true))}>
                          Copy
                        </button>
                      </div>
                      <Show when={logsLoading()}>
                        <div style={{ padding: '24px', 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px' }}>Loading logs…</div>
                      </Show>
                      <Show when={!logsLoading()}>
                        <div style={{ flex: '1', overflow: 'auto', background: '#0D1521', padding: '12px 16px', 'font-family': 'var(--mono)', 'font-size': '11px', 'line-height': '1.7', color: '#94A3B8', 'white-space': 'pre-wrap', 'word-break': 'break-all' }}>
                          {podLogs() || '(no logs)'}
                        </div>
                      </Show>
                    </div>
                  </Show>

                </div>
              </div>
            );
          }}
        </Show>
      </div>

      {/* ══ Toast ══════════════════════════════════════════ */}
      <Show when={actionToast()}>
        {(t) => (
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '10px 16px', background: t().ok ? 'rgba(5,150,105,.95)' : 'rgba(220,38,38,.95)', color: '#fff', 'border-radius': '8px', 'font-size': '12.5px', 'font-weight': '600', 'z-index': '9999', 'box-shadow': '0 4px 12px rgba(0,0,0,.2)' }}>
            {t().msg}
          </div>
        )}
      </Show>

      {/* ══ Delete confirm ═════════════════════════════════ */}
      <Show when={deleteTarget()}>
        {(w) => (
          <div style={{ position: 'fixed', inset: '0', background: 'rgba(0,0,0,.45)', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'z-index': '2000' }}
            onClick={() => setDeleteTarget(null)}>
            <div style={{ background: 'var(--s1)', 'border-radius': '12px', padding: '24px 28px', 'max-width': '420px', width: '90%', 'box-shadow': 'var(--sh3)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ 'font-size': '16px', 'font-weight': '700', color: 'var(--t1)', 'margin-bottom': '10px' }}>Delete {w()._kind}?</div>
              <div style={{ 'font-size': '12.5px', color: 'var(--t3)', 'margin-bottom': '20px', 'line-height': '1.6' }}>
                This will permanently delete <span style={{ 'font-family': 'var(--mono)', color: 'var(--crit)', 'font-weight': '700' }}>{w()._name}</span> in namespace <span style={{ 'font-family': 'var(--mono)', color: 'var(--t1)' }}>{w()._ns}</span>. This action cannot be undone.
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
