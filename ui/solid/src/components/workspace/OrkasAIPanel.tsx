/**
 * OrkasAIPanel — Global Orkas AI assistant
 *
 * Tabs: Ask · Commands · Knowledge
 *
 * Commands tab shows:
 *  - Keyboard shortcuts for the workspace
 *  - Natural-language AI prompts organised by K8s resource category
 *  - kubectl quick-reference commands (click to copy)
 *
 * When the optional `incident` prop is provided the Ask tab is pre-seeded with
 * incident context and the suggestion chips become incident-specific.
 */

import { Component, createSignal, createEffect, createMemo, For, Show, onMount, onCleanup } from 'solid-js';
import { marked } from 'marked';
import { wsService } from '../../services/websocket';

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

/** Minimal incident context passed from IntelligentWorkspace */
export interface IncidentContext {
  id?: string;
  title?: string;
  severity?: string;
  pattern?: string;
  resource?: { kind: string; name: string; namespace?: string };
  namespace?: string;
}

interface OrkasAIPanelProps {
  /** When provided, the Ask tab is pre-seeded with this incident's context */
  incident?: IncidentContext | null;
}

// ── All Orkas AI calls go through the Go proxy ───────────────────────────────
const ORKA = '/api/orka';

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
const KEYBOARD_SHORTCUTS = [
  { keys: ['j', '↓'],      action: 'Next incident' },
  { keys: ['k', '↑'],      action: 'Previous incident' },
  { keys: ['Enter'],        action: 'Open selected incident' },
  { keys: ['Esc'],          action: 'Close workspace / cancel' },
  { keys: ['Tab'],          action: 'Move focus between panels' },
  { keys: ['Ctrl+/'],       action: 'Open Orkas AI panel' },
];

// ── Natural language AI prompts (by K8s category) ────────────────────────────
interface NLCommand { category: string; q: string; }

const NL_COMMANDS: NLCommand[] = [
  // Pods
  { category: 'Pods', q: 'List all pods in CrashLoopBackOff' },
  { category: 'Pods', q: 'Show pods that are not in Running state' },
  { category: 'Pods', q: 'List OOMKilled pods across all namespaces' },
  { category: 'Pods', q: 'Which pods have the highest restart count?' },
  { category: 'Pods', q: 'Show pods in Pending state and why they are stuck' },
  { category: 'Pods', q: 'List pods exceeding their CPU or memory limits' },
  { category: 'Pods', q: 'Show resource requests and limits for all pods' },
  { category: 'Pods', q: 'Which pods are evicted and why?' },
  { category: 'Pods', q: 'Show init container failures' },
  { category: 'Pods', q: 'List pods with no liveness or readiness probes' },
  // Deployments
  { category: 'Deployments', q: 'List deployments with unavailable replicas' },
  { category: 'Deployments', q: 'Show rollout history for all deployments' },
  { category: 'Deployments', q: 'Which deployments have 0 ready pods?' },
  { category: 'Deployments', q: 'Show deployment resource limits and requests' },
  { category: 'Deployments', q: 'List deployments with recent image changes' },
  { category: 'Deployments', q: 'How do I rollback a deployment?' },
  { category: 'Deployments', q: 'Show deployments with missing readiness probes' },
  { category: 'Deployments', q: 'Which deployments are in a degraded state?' },
  // Services
  { category: 'Services', q: 'Show services with no ready endpoints' },
  { category: 'Services', q: 'List all LoadBalancer services and their external IPs' },
  { category: 'Services', q: 'Which service is exposing port 443?' },
  { category: 'Services', q: 'Show endpoints for all services in this namespace' },
  { category: 'Services', q: 'Which services have mismatched label selectors?' },
  { category: 'Services', q: 'List ClusterIP services that have no pods behind them' },
  // Nodes
  { category: 'Nodes', q: 'Which nodes are under memory pressure?' },
  { category: 'Nodes', q: 'Show node disk pressure and eviction events' },
  { category: 'Nodes', q: 'List nodes with NotReady status' },
  { category: 'Nodes', q: 'Show node capacity vs allocatable resources' },
  { category: 'Nodes', q: 'Which node is running the most pods?' },
  { category: 'Nodes', q: 'Show node taints and tolerations' },
  { category: 'Nodes', q: 'Which nodes have the highest CPU utilization?' },
  { category: 'Nodes', q: 'Show node conditions and recent events' },
  // Events
  { category: 'Events', q: 'Show recent warning events cluster-wide' },
  { category: 'Events', q: 'List FailedScheduling events and reasons' },
  { category: 'Events', q: 'Show ImagePullBackOff events in the last hour' },
  { category: 'Events', q: 'List BackOff events across all namespaces' },
  { category: 'Events', q: 'Show all events for a specific namespace' },
  { category: 'Events', q: 'What are the most recent error events?' },
  { category: 'Events', q: 'List node eviction events' },
  // StatefulSets
  { category: 'StatefulSets', q: 'List StatefulSets with unready pods' },
  { category: 'StatefulSets', q: 'Show StatefulSet rollout status' },
  { category: 'StatefulSets', q: 'Which StatefulSets have PVC binding issues?' },
  { category: 'StatefulSets', q: 'Show StatefulSet pod ordinal readiness' },
  // DaemonSets
  { category: 'DaemonSets', q: 'List DaemonSets with pods not scheduled on all nodes' },
  { category: 'DaemonSets', q: 'Show DaemonSet rollout status' },
  { category: 'DaemonSets', q: 'Which DaemonSets are missing pods on certain nodes?' },
  // HPA & Scaling
  { category: 'HPA & Scaling', q: 'Show HPA status and current/target replicas' },
  { category: 'HPA & Scaling', q: 'Why is HPA not scaling up?' },
  { category: 'HPA & Scaling', q: 'Which HPAs are at max replicas?' },
  { category: 'HPA & Scaling', q: 'Show HPA metrics and scale triggers' },
  { category: 'HPA & Scaling', q: 'Are there resource quota limits blocking scale-up?' },
  // Storage
  { category: 'Storage', q: 'List PVCs in Pending state' },
  { category: 'Storage', q: 'Show PVCs approaching storage capacity' },
  { category: 'Storage', q: 'Which pods are using a specific PVC?' },
  { category: 'Storage', q: 'List PVs that are not bound to any PVC' },
  { category: 'Storage', q: 'Show storage class details and provisioners' },
  { category: 'Storage', q: 'Which pods have ReadWriteOnce PVC conflicts?' },
  // Network
  { category: 'Network', q: 'Show network policies for this namespace' },
  { category: 'Network', q: 'Which network policies could be blocking traffic?' },
  { category: 'Network', q: 'List ingresses and their backends' },
  { category: 'Network', q: 'Show ingresses with no matching service' },
  { category: 'Network', q: 'Are there conflicting ingress rules?' },
  // ConfigMaps & Secrets
  { category: 'Config', q: 'Show ConfigMaps that are not mounted by any pod' },
  { category: 'Config', q: 'List pods using a specific ConfigMap' },
  { category: 'Config', q: 'Which secrets are expiring soon?' },
  { category: 'Config', q: 'Show recently changed ConfigMaps' },
  // RBAC
  { category: 'RBAC', q: 'Who can delete pods in this namespace?' },
  { category: 'RBAC', q: 'Show RBAC permissions for a service account' },
  { category: 'RBAC', q: 'List ClusterRoles with admin or wildcard privileges' },
  { category: 'RBAC', q: 'Which service accounts have cluster-admin access?' },
  { category: 'RBAC', q: 'Show RoleBindings for a specific user' },
  // Resource Quotas
  { category: 'Quotas', q: 'Show namespace resource quota usage' },
  { category: 'Quotas', q: 'Which namespaces are close to their resource quota limit?' },
  { category: 'Quotas', q: 'Show LimitRange defaults for this namespace' },
  // Jobs & CronJobs
  { category: 'Jobs', q: 'List failed Jobs and their exit codes' },
  { category: 'Jobs', q: 'Show CronJobs that missed their last schedule' },
  { category: 'Jobs', q: 'Which CronJobs are running longer than expected?' },
  // Troubleshooting
  { category: 'Troubleshooting', q: 'Analyze overall cluster health' },
  { category: 'Troubleshooting', q: 'What are the top resource-consuming pods?' },
  { category: 'Troubleshooting', q: 'How do I fix ImagePullBackOff?' },
  { category: 'Troubleshooting', q: 'How do I fix CrashLoopBackOff?' },
  { category: 'Troubleshooting', q: 'Why is my pod stuck in Terminating state?' },
  { category: 'Troubleshooting', q: 'Why is a pod in CreateContainerConfigError?' },
  { category: 'Troubleshooting', q: 'How do I debug a network connectivity issue between pods?' },
  { category: 'Troubleshooting', q: 'What is causing high memory usage across the cluster?' },
  { category: 'Troubleshooting', q: 'Show recent cluster-wide incidents' },
  { category: 'Troubleshooting', q: 'What changed in the last 30 minutes that could cause this?' },
];

// ── kubectl quick reference ──────────────────────────────────────────────────
interface KubectlCmd { category: string; cmd: string; desc: string; }

const KUBECTL_COMMANDS: KubectlCmd[] = [
  // Pods
  { category: 'Pods', cmd: 'kubectl get pods -n <namespace>', desc: 'List pods in namespace' },
  { category: 'Pods', cmd: 'kubectl get pods --all-namespaces', desc: 'List pods across all namespaces' },
  { category: 'Pods', cmd: 'kubectl get pods -o wide -n <namespace>', desc: 'List pods with node/IP info' },
  { category: 'Pods', cmd: 'kubectl get pods --field-selector=status.phase!=Running', desc: 'Non-running pods' },
  { category: 'Pods', cmd: 'kubectl describe pod <pod> -n <namespace>', desc: 'Describe pod in detail' },
  { category: 'Pods', cmd: 'kubectl logs <pod> -n <namespace>', desc: 'View pod logs' },
  { category: 'Pods', cmd: 'kubectl logs <pod> -n <namespace> --previous', desc: 'Logs from previous container' },
  { category: 'Pods', cmd: 'kubectl logs <pod> -n <namespace> -f', desc: 'Stream pod logs' },
  { category: 'Pods', cmd: 'kubectl exec -it <pod> -n <namespace> -- sh', desc: 'Shell into pod' },
  { category: 'Pods', cmd: 'kubectl delete pod <pod> -n <namespace>', desc: 'Delete pod (restart it)' },
  { category: 'Pods', cmd: 'kubectl top pods -n <namespace>', desc: 'Pod CPU/memory usage' },
  { category: 'Pods', cmd: 'kubectl top pods -n <namespace> --sort-by=cpu', desc: 'Sort pods by CPU usage' },
  { category: 'Pods', cmd: 'kubectl top pods -n <namespace> --sort-by=memory', desc: 'Sort pods by memory usage' },
  { category: 'Pods', cmd: 'kubectl get pod <pod> -n <namespace> -o yaml', desc: 'Full pod YAML spec' },
  // Deployments
  { category: 'Deployments', cmd: 'kubectl get deployments -n <namespace>', desc: 'List deployments' },
  { category: 'Deployments', cmd: 'kubectl describe deployment <name> -n <namespace>', desc: 'Deployment details' },
  { category: 'Deployments', cmd: 'kubectl rollout status deployment/<name> -n <namespace>', desc: 'Rollout progress' },
  { category: 'Deployments', cmd: 'kubectl rollout history deployment/<name> -n <namespace>', desc: 'Rollout history' },
  { category: 'Deployments', cmd: 'kubectl rollout undo deployment/<name> -n <namespace>', desc: 'Rollback deployment' },
  { category: 'Deployments', cmd: 'kubectl rollout undo deployment/<name> --to-revision=2 -n <namespace>', desc: 'Rollback to specific revision' },
  { category: 'Deployments', cmd: 'kubectl scale deployment <name> --replicas=3 -n <namespace>', desc: 'Scale deployment' },
  { category: 'Deployments', cmd: 'kubectl set image deployment/<name> app=image:tag -n <namespace>', desc: 'Update container image' },
  { category: 'Deployments', cmd: 'kubectl rollout restart deployment/<name> -n <namespace>', desc: 'Rolling restart' },
  { category: 'Deployments', cmd: 'kubectl get deployment <name> -n <namespace> -o yaml', desc: 'Deployment YAML' },
  // Services
  { category: 'Services', cmd: 'kubectl get services -n <namespace>', desc: 'List services' },
  { category: 'Services', cmd: 'kubectl describe service <name> -n <namespace>', desc: 'Service details' },
  { category: 'Services', cmd: 'kubectl get endpoints -n <namespace>', desc: 'Service endpoints' },
  { category: 'Services', cmd: 'kubectl get endpoints <name> -n <namespace>', desc: 'Specific service endpoints' },
  { category: 'Services', cmd: 'kubectl get svc -o wide --all-namespaces', desc: 'All services with selectors' },
  // Nodes
  { category: 'Nodes', cmd: 'kubectl get nodes', desc: 'List all nodes' },
  { category: 'Nodes', cmd: 'kubectl get nodes -o wide', desc: 'Nodes with IP / OS info' },
  { category: 'Nodes', cmd: 'kubectl describe node <name>', desc: 'Node capacity, conditions, events' },
  { category: 'Nodes', cmd: 'kubectl top nodes', desc: 'Node CPU/memory usage' },
  { category: 'Nodes', cmd: 'kubectl cordon <node>', desc: 'Mark node unschedulable' },
  { category: 'Nodes', cmd: 'kubectl uncordon <node>', desc: 'Re-enable scheduling on node' },
  { category: 'Nodes', cmd: 'kubectl drain <node> --ignore-daemonsets --delete-emptydir-data', desc: 'Evict all pods from node' },
  { category: 'Nodes', cmd: 'kubectl taint node <node> key=value:NoSchedule', desc: 'Add node taint' },
  { category: 'Nodes', cmd: 'kubectl get nodes --show-labels', desc: 'Nodes with labels' },
  // Events
  { category: 'Events', cmd: 'kubectl get events -n <namespace> --sort-by=.lastTimestamp', desc: 'Events sorted by time' },
  { category: 'Events', cmd: 'kubectl get events --field-selector type=Warning', desc: 'Warning events only' },
  { category: 'Events', cmd: 'kubectl get events -n <namespace> | grep -i error', desc: 'Filter error events' },
  { category: 'Events', cmd: 'kubectl get events --all-namespaces --sort-by=.lastTimestamp | tail -30', desc: 'Recent events cluster-wide' },
  { category: 'Events', cmd: 'kubectl get events -n <namespace> --field-selector reason=BackOff', desc: 'BackOff events' },
  { category: 'Events', cmd: 'kubectl get events -n <namespace> --field-selector reason=FailedScheduling', desc: 'Scheduling failures' },
  // StatefulSets
  { category: 'StatefulSets', cmd: 'kubectl get statefulsets -n <namespace>', desc: 'List StatefulSets' },
  { category: 'StatefulSets', cmd: 'kubectl describe statefulset <name> -n <namespace>', desc: 'StatefulSet details' },
  { category: 'StatefulSets', cmd: 'kubectl rollout status statefulset/<name> -n <namespace>', desc: 'StatefulSet rollout' },
  { category: 'StatefulSets', cmd: 'kubectl rollout restart statefulset/<name> -n <namespace>', desc: 'Restart StatefulSet' },
  { category: 'StatefulSets', cmd: 'kubectl scale statefulset <name> --replicas=3 -n <namespace>', desc: 'Scale StatefulSet' },
  // DaemonSets
  { category: 'DaemonSets', cmd: 'kubectl get daemonsets -n <namespace>', desc: 'List DaemonSets' },
  { category: 'DaemonSets', cmd: 'kubectl describe daemonset <name> -n <namespace>', desc: 'DaemonSet details' },
  { category: 'DaemonSets', cmd: 'kubectl rollout status daemonset/<name> -n <namespace>', desc: 'DaemonSet rollout status' },
  { category: 'DaemonSets', cmd: 'kubectl rollout restart daemonset/<name> -n <namespace>', desc: 'Rolling restart DaemonSet' },
  // HPA
  { category: 'HPA', cmd: 'kubectl get hpa -n <namespace>', desc: 'List HPAs' },
  { category: 'HPA', cmd: 'kubectl describe hpa <name> -n <namespace>', desc: 'HPA details and metrics' },
  { category: 'HPA', cmd: 'kubectl get hpa -n <namespace> -o yaml', desc: 'HPA YAML (full spec)' },
  // Storage
  { category: 'Storage', cmd: 'kubectl get pv', desc: 'List PersistentVolumes' },
  { category: 'Storage', cmd: 'kubectl get pvc -n <namespace>', desc: 'List PersistentVolumeClaims' },
  { category: 'Storage', cmd: 'kubectl describe pvc <name> -n <namespace>', desc: 'PVC binding details' },
  { category: 'Storage', cmd: 'kubectl get storageclass', desc: 'List storage classes' },
  { category: 'Storage', cmd: 'kubectl describe storageclass <name>', desc: 'Storage class details' },
  // ConfigMaps & Secrets
  { category: 'Config', cmd: 'kubectl get configmaps -n <namespace>', desc: 'List ConfigMaps' },
  { category: 'Config', cmd: 'kubectl describe configmap <name> -n <namespace>', desc: 'ConfigMap data' },
  { category: 'Config', cmd: "kubectl get secret <name> -n <namespace> -o jsonpath='{.data}'", desc: 'Secret data (base64)' },
  { category: 'Config', cmd: 'kubectl get configmap <name> -n <namespace> -o yaml', desc: 'ConfigMap YAML' },
  // Namespaces
  { category: 'Namespaces', cmd: 'kubectl get namespaces', desc: 'List namespaces' },
  { category: 'Namespaces', cmd: 'kubectl describe namespace <ns>', desc: 'Namespace details' },
  { category: 'Namespaces', cmd: 'kubectl create namespace <ns>', desc: 'Create namespace' },
  { category: 'Namespaces', cmd: 'kubectl get all -n <namespace>', desc: 'All resources in namespace' },
  // RBAC
  { category: 'RBAC', cmd: 'kubectl get clusterroles', desc: 'List ClusterRoles' },
  { category: 'RBAC', cmd: 'kubectl get rolebindings -n <namespace>', desc: 'List RoleBindings' },
  { category: 'RBAC', cmd: 'kubectl get clusterrolebindings', desc: 'List ClusterRoleBindings' },
  { category: 'RBAC', cmd: 'kubectl describe clusterrole <name>', desc: 'ClusterRole permissions' },
  { category: 'RBAC', cmd: 'kubectl auth can-i list pods -n <namespace>', desc: 'Check own permissions' },
  { category: 'RBAC', cmd: 'kubectl auth can-i delete pods --as=system:serviceaccount:<ns>:<sa>', desc: 'Check SA permissions' },
  // Quotas & Limits
  { category: 'Quotas', cmd: 'kubectl get resourcequota -n <namespace>', desc: 'Resource quotas' },
  { category: 'Quotas', cmd: 'kubectl describe resourcequota -n <namespace>', desc: 'Quota usage breakdown' },
  { category: 'Quotas', cmd: 'kubectl get limitrange -n <namespace>', desc: 'Default limits/requests' },
  // Jobs
  { category: 'Jobs', cmd: 'kubectl get jobs -n <namespace>', desc: 'List Jobs' },
  { category: 'Jobs', cmd: 'kubectl describe job <name> -n <namespace>', desc: 'Job details' },
  { category: 'Jobs', cmd: 'kubectl get cronjobs -n <namespace>', desc: 'List CronJobs' },
  { category: 'Jobs', cmd: 'kubectl describe cronjob <name> -n <namespace>', desc: 'CronJob schedule & history' },
  // Network
  { category: 'Network', cmd: 'kubectl get networkpolicies -n <namespace>', desc: 'List NetworkPolicies' },
  { category: 'Network', cmd: 'kubectl describe networkpolicy <name> -n <namespace>', desc: 'NetworkPolicy rules' },
  { category: 'Network', cmd: 'kubectl get ingresses -n <namespace>', desc: 'List Ingresses' },
  { category: 'Network', cmd: 'kubectl describe ingress <name> -n <namespace>', desc: 'Ingress routing rules' },
];

// All categories for filter chips
const NL_CATEGORIES  = [...new Set(NL_COMMANDS.map(c => c.category))];
const KB_CATEGORIES  = [...new Set(KUBECTL_COMMANDS.map(c => c.category))];
const ALL_CATEGORIES = [...new Set([...NL_CATEGORIES, ...KB_CATEGORIES])];

// Default (cluster-wide) suggestions shown when no incident context
const CLUSTER_SUGGESTIONS = [
  'List pods in CrashLoopBackOff across all namespaces',
  'Show deployments with unavailable replicas',
  'What nodes are under memory or disk pressure?',
  'Check recent warning events cluster-wide',
  'Show services with no ready endpoints',
  'Analyze overall cluster health',
];

const OrkasAIPanel: Component<OrkasAIPanelProps> = (props) => {
  // ── Navigation ───────────────────────────────────────────────────────────
  const [tab, setTab] = createSignal<'ask' | 'commands' | 'knowledge'>('ask');

  // ── Status ───────────────────────────────────────────────────────────────
  const [orkaStatus, setOrkaStatus] = createSignal<'checking' | 'online' | 'offline'>('checking');
  const [k8sCtx, setK8sCtx] = createSignal<K8sCtxInfo | null>(null);
  const [models, setModels] = createSignal<ModelInfo[]>([]);

  // ── Ask ───────────────────────────────────────────────────────────────────
  const [messages, setMessages] = createSignal<OrkaMessage[]>([]);
  const [input, setInput] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [sessionId] = createSignal(crypto.randomUUID());
  const [expandedSteps, setExpandedSteps] = createSignal<Set<number>>(new Set());
  let msgEnd: HTMLDivElement | undefined;

  // ── Commands tab ─────────────────────────────────────────────────────────
  const [cmdSearch, setCmdSearch] = createSignal('');
  const [cmdCategory, setCmdCategory] = createSignal('All');
  const [cmdSection, setCmdSection] = createSignal<'nl' | 'kubectl' | 'shortcuts'>('shortcuts');
  const [copiedCmd, setCopiedCmd] = createSignal('');

  // ── Knowledge ────────────────────────────────────────────────────────────
  const [ingestTitle, setIngestTitle] = createSignal('');
  const [ingestType, setIngestType] = createSignal('runbook');
  const [ingestContent, setIngestContent] = createSignal('');
  const [ingestLoading, setIngestLoading] = createSignal(false);
  const [ingestMsg, setIngestMsg] = createSignal('');

  // ── Live incident badge (graph_incident WS push) ─────────────────────────
  const [liveBadge, setLiveBadge] = createSignal(0);

  // Reset messages & badge when the incident context changes
  createEffect(() => {
    const _ = props.incident;
    setMessages([]);
    setInput('');
  });

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

    const unsub = wsService.subscribe((msg) => {
      if (msg.type === 'graph_incident' && msg.data) setLiveBadge(b => b + 1);
    });
    onCleanup(unsub);
  });

  // ── Ask ───────────────────────────────────────────────────────────────────
  const buildContextPrefix = () => {
    const inc = props.incident;
    if (!inc) return '';
    const res = inc.resource;
    const resStr = res ? `${res.kind}/${res.namespace ? res.namespace + '/' : ''}${res.name}` : '';
    return `[Incident context: ${inc.severity || 'unknown'} | "${inc.title || 'Unknown'}" | ${resStr}${inc.pattern ? ` | pattern: ${inc.pattern}` : ''}]\n\n`;
  };

  const send = async (q: string) => {
    if (!q.trim() || loading()) return;
    setTab('ask');
    setMessages(m => [...m, { role: 'user', content: q }]);
    setInput('');

    // If AI is known offline, skip the network call and explain immediately
    if (orkaStatus() === 'offline') {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Orkas AI is not connected. Full AI capabilities — cluster Q&A, incident analysis, and auto-fix — will be available soon.\n\nIn the meantime, use the **Commands** tab for kubectl quick-reference and AI prompt templates.',
      }]);
      return;
    }

    const prefixed = buildContextPrefix() + q;
    setLoading(true);
    try {
      const r = await fetch(`${ORKA}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prefixed, session_id: sessionId(), namespace: props.incident?.resource?.namespace || props.incident?.namespace }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setMessages(m => [...m, {
        role: 'assistant', content: d.answer,
        confidence: d.confidence, model: d.model_used,
        latencyMs: d.latency_ms, reasoningSteps: d.reasoning_steps,
      }]);
    } catch (e) {
      setOrkaStatus('offline');
      setMessages(m => [...m, { role: 'assistant', content: 'Could not reach Orkas AI. Check that the AI service is running, or try again later.' }]);
    } finally { setLoading(false); }
  };

  createEffect(() => { messages(); setTimeout(() => msgEnd?.scrollIntoView({ behavior: 'smooth' }), 80); });

  // ── Commands tab helpers ──────────────────────────────────────────────────
  const filteredNL = createMemo(() => {
    const search = cmdSearch().toLowerCase();
    const cat = cmdCategory();
    return NL_COMMANDS.filter(c =>
      (cat === 'All' || c.category === cat) &&
      (!search || c.q.toLowerCase().includes(search) || c.category.toLowerCase().includes(search))
    );
  });

  const filteredKubectl = createMemo(() => {
    const search = cmdSearch().toLowerCase();
    const cat = cmdCategory();
    return KUBECTL_COMMANDS.filter(c =>
      (cat === 'All' || c.category === cat) &&
      (!search || c.cmd.toLowerCase().includes(search) || c.desc.toLowerCase().includes(search) || c.category.toLowerCase().includes(search))
    );
  });

  // Group by category for display
  const groupedNL = createMemo(() => {
    const groups: Record<string, NLCommand[]> = {};
    for (const c of filteredNL()) {
      (groups[c.category] ||= []).push(c);
    }
    return groups;
  });

  const groupedKubectl = createMemo(() => {
    const groups: Record<string, KubectlCmd[]> = {};
    for (const c of filteredKubectl()) {
      (groups[c.category] ||= []).push(c);
    }
    return groups;
  });

  const copyKubectl = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(c => c === cmd ? '' : c), 1800);
    });
  };

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
      setIngestMsg(`Added ${d.chunks_created} chunks to knowledge base`);
      setIngestContent(''); setIngestTitle('');
    } catch (e) { setIngestMsg(`Failed: ${e instanceof Error ? e.message : e}`); }
    finally { setIngestLoading(false); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleSteps = (i: number) => setExpandedSteps(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const md = (s: string) => { try { return marked.parse(s, { async: false }) as string; } catch { return s; } };
  const confColor = (c: number) => c >= 0.8 ? 'var(--ok)' : c >= 0.5 ? 'var(--warn)' : 'var(--crit)';
  const confLabel = (c: number) => c >= 0.8 ? 'High' : c >= 0.5 ? 'Medium' : 'Low';
  const ctxShort = () => k8sCtx()?.context?.split('_').pop() ?? k8sCtx()?.context ?? '—';
  const primaryModel = () => models().length > 0 ? `${models()[0].provider} · ${models()[0].model}` : null;

  const suggestions = () => {
    const inc = props.incident;
    if (!inc || !inc.resource) return CLUSTER_SUGGESTIONS;
    const name = inc.resource.name;
    const ns = inc.resource.namespace || '';
    const kind = (inc.resource.kind || 'pod').toLowerCase();
    return [
      `Why is ${name} ${inc.severity === 'critical' ? 'critical' : 'failing'}?`,
      `What is the root cause of ${(inc.pattern || 'this issue').replace(/_/g, ' ')}?`,
      `Show kubectl commands to fix ${name}${ns ? ` in ${ns}` : ''}`,
      `What is the blast radius of this incident?`,
      `Show recent events for ${kind}/${name}`,
      `How do I prevent ${(inc.pattern || 'this pattern').replace(/_/g, ' ')} in future?`,
    ];
  };

  const sevColor = () => {
    const s = (props.incident?.severity || '').toLowerCase();
    return s === 'critical' ? 'var(--crit)' : s === 'high' ? 'var(--warn)' : s === 'medium' ? 'var(--t4)' : 'var(--brand)';
  };

  // Shared style tokens
  const S = {
    chip: (active: boolean) => ({
      padding: '3px 10px', 'border-radius': 'var(--r99)', cursor: 'pointer', 'font-size': '10.5px',
      'font-weight': '600', border: `1px solid ${active ? 'var(--brand)' : 'var(--b1)'}`,
      background: active ? 'var(--brandDim)' : 'var(--s2)', color: active ? 'var(--brand)' : 'var(--t4)',
      transition: 'all .12s', 'font-family': 'var(--font)', 'white-space': 'nowrap' as const,
    }),
    sectionBtn: (active: boolean) => ({
      flex: '1', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px',
      'font-size': '11px', 'font-weight': '600', color: active ? 'var(--brand)' : 'var(--t4)',
      'border-bottom': active ? '2px solid var(--brand)' : '2px solid transparent',
      transition: 'color .15s', 'font-family': 'var(--font)',
    }),
  };

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
              {k8sCtx()!.connected ? 'K8s' : 'K8s offline'}
            </span>
          </Show>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: orkaStatus() === 'online' ? 'var(--ok)' : orkaStatus() === 'offline' ? 'var(--warn)' : 'var(--t5)' }} />
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>
              {orkaStatus() === 'online' ? 'Connected' : orkaStatus() === 'offline' ? 'Not connected' : '…'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Coming Soon notice ── */}
      <div style={{ padding: '7px 16px', background: 'linear-gradient(90deg, color-mix(in srgb, var(--brand) 18%, transparent) 0%, color-mix(in srgb, var(--brand) 8%, transparent) 100%)', 'border-bottom': '1px solid color-mix(in srgb, var(--brand) 35%, transparent)', 'border-left': '3px solid var(--brand)', display: 'flex', 'align-items': 'center', gap: '7px', 'flex-shrink': '0' }}>
        <span style={{ 'font-size': '14px', 'line-height': '1' }}>✦</span>
        <span style={{ 'font-size': '11.5px', color: 'var(--brand)', 'font-weight': '700', 'letter-spacing': '0.01em' }}>Full AI capabilities will be available soon</span>
        <span style={{ 'font-size': '10px', color: 'var(--t4)', 'margin-left': '2px' }}>— incident analysis, auto-fix &amp; more</span>
      </div>

      {/* ── Context info strip ── */}
      <Show when={k8sCtx() || primaryModel()}>
        <div style={{ padding: '5px 16px', background: 'var(--s2)', 'border-bottom': '1px solid var(--b1)', display: 'flex', gap: '14px', 'flex-wrap': 'wrap', 'flex-shrink': '0' }}>
          <Show when={k8sCtx()?.context}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>ctx: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{ctxShort()}</span></span>
          </Show>
          <Show when={k8sCtx()?.namespace}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>ns: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{k8sCtx()!.namespace}</span></span>
          </Show>
          <Show when={primaryModel()}>
            <span style={{ 'font-size': '10px', color: 'var(--t5)' }}>model: <span style={{ color: 'var(--t3)', 'font-family': 'var(--mono)' }}>{primaryModel()}</span></span>
          </Show>
        </div>
      </Show>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', 'flex-shrink': '0', background: 'var(--s1)', 'border-bottom': '1px solid var(--b1)' }}>
        {(['ask', 'commands', 'knowledge'] as const).map(t => (
          <button
            onClick={() => { setTab(t); if (t === 'ask') setLiveBadge(0); }}
            style={{ flex: '1', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 4px', 'font-size': '11.5px', 'font-weight': '600', color: tab() === t ? 'var(--brand)' : 'var(--t4)', 'border-bottom': tab() === t ? '2px solid var(--brand)' : '2px solid transparent', transition: 'color .15s', 'font-family': 'var(--font)', position: 'relative' }}
          >
            {t === 'ask' ? 'Ask' : t === 'commands' ? 'Commands' : 'Knowledge'}
            <Show when={t === 'ask' && liveBadge() > 0}>
              <span style={{ position: 'absolute', top: '5px', right: '4px', background: 'var(--crit)', color: '#fff', 'border-radius': '99px', 'font-size': '9px', 'font-weight': '700', padding: '0 4px', 'min-width': '14px', 'text-align': 'center', 'line-height': '14px' }}>
                {liveBadge()}
              </span>
            </Show>
          </button>
        ))}
      </div>

      {/* ════════════════════ TAB: ASK ════════════════════ */}
      <Show when={tab() === 'ask'}>
        <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px 16px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
          <Show when={messages().length === 0}>
            <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', flex: '1', padding: '24px 0 12px' }}>
              <Show when={!props.incident}>
                <img src="/orkas-logo.png" alt="" style={{ height: '44px', 'margin-bottom': '8px' }} />
                <div style={{ 'font-weight': '700', color: 'var(--t1)', 'font-size': '14px', 'margin-bottom': '4px' }}>Orkas AI</div>
                <div style={{ 'font-size': '11px', color: 'var(--t4)', 'text-align': 'center', 'max-width': '270px', 'line-height': '1.6', 'margin-bottom': '6px' }}>
                  Ask anything about your cluster — pods, nodes, deployments, events, and more.
                </div>
                <div style={{ 'font-size': '10.5px', color: 'var(--brand)', 'text-align': 'center', 'max-width': '260px', 'margin-bottom': '18px', 'line-height': '1.5', padding: '6px 10px', background: 'var(--brandDim)', 'border-radius': 'var(--r8)', border: '1px solid var(--brand)25' }}>
                  ✦ Full AI capabilities — incident analysis, auto-fix &amp; more — will be available soon
                </div>
              </Show>
              <Show when={props.incident}>
                <div style={{ 'font-weight': '600', color: 'var(--t2)', 'font-size': '12px', 'margin-bottom': '14px', 'text-align': 'center' }}>
                  Suggested questions for this incident
                </div>
              </Show>
              {/* Tip to open Commands tab */}
              <div style={{ width: '100%', 'margin-bottom': '10px', padding: '6px 10px', background: 'var(--s2)', 'border-radius': 'var(--r8)', border: '1px solid var(--b1)', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                <span style={{ 'font-size': '11px' }}>⌨</span>
                <span style={{ 'font-size': '10.5px', color: 'var(--t4)' }}>
                  See all commands &amp; shortcuts in the{' '}
                  <button onClick={() => setTab('commands')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', 'font-size': '10.5px', 'font-weight': '600', padding: '0', 'font-family': 'var(--font)' }}>Commands</button>
                  {' '}tab
                </span>
              </div>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '5px', width: '100%' }}>
                <For each={suggestions()}>{s => (
                  <button onClick={() => send(s)} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '7px 12px', cursor: 'pointer', 'text-align': 'left', 'font-size': '11.5px', color: 'var(--t3)', 'font-family': 'var(--font)' }}>{s}</button>
                )}</For>
              </div>
            </div>
          </Show>

          <For each={messages()}>{(msg, idx) => (
            <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px' }}>
              <div style={{ 'max-width': '92%', background: msg.role === 'user' ? 'var(--brand)' : 'var(--s1)', color: msg.role === 'user' ? '#fff' : 'var(--t1)', border: msg.role === 'user' ? 'none' : '1px solid var(--b1)', 'border-radius': msg.role === 'user' ? 'var(--r12) var(--r12) var(--r4) var(--r12)' : 'var(--r12) var(--r12) var(--r12) var(--r4)', padding: '9px 13px', 'font-size': '12.5px', 'line-height': '1.6' }}>
                <Show when={msg.role === 'assistant'} fallback={<span>{msg.content}</span>}>
                  <div class="orka-md" innerHTML={md(msg.content)} />
                </Show>
              </div>
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

          <Show when={loading()}>
            <div style={{ display: 'flex', gap: '6px', 'align-items': 'center', padding: '10px 14px', background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', width: 'fit-content' }}>
              <For each={[0, 150, 300]}>{d => <div style={{ width: '6px', height: '6px', 'border-radius': '50%', background: 'var(--brand)', animation: 'orkaBounce 1s ease-in-out infinite', 'animation-delay': `${d}ms` }} />}</For>
              <span style={{ 'font-size': '12px', color: 'var(--t4)', 'margin-left': '4px' }}>Thinking…</span>
            </div>
          </Show>
          <div ref={msgEnd} />
        </div>

        <form onSubmit={e => { e.preventDefault(); send(input().trim()); }} style={{ padding: '10px 14px', 'border-top': '1px solid var(--b1)', background: 'var(--s1)', 'flex-shrink': '0' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={input()} onInput={e => setInput(e.currentTarget.value)}
              placeholder={props.incident ? `Ask about ${props.incident.resource?.name || 'this incident'}…` : 'Ask about pods, deployments, events…'}
              disabled={loading()}
              style={{ flex: '1', background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '8px 12px', 'font-size': '12.5px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--font)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
            />
            <button type="submit" disabled={loading() || !input().trim()} style={{ background: 'var(--brand)', border: 'none', 'border-radius': 'var(--r8)', padding: '8px 16px', cursor: 'pointer', color: '#fff', 'font-size': '12px', 'font-weight': '600', opacity: loading() || !input().trim() ? '0.45' : '1', 'font-family': 'var(--font)', 'flex-shrink': '0' }}>Ask</button>
          </div>
        </form>
      </Show>

      {/* ════════════════════ TAB: COMMANDS ════════════════════ */}
      <Show when={tab() === 'commands'}>
        <div style={{ flex: '1', display: 'flex', 'flex-direction': 'column', overflow: 'hidden' }}>

          {/* Search bar */}
          <div style={{ padding: '10px 14px', 'border-bottom': '1px solid var(--b1)', 'flex-shrink': '0' }}>
            <input
              type="text"
              value={cmdSearch()}
              onInput={e => setCmdSearch(e.currentTarget.value)}
              placeholder="Search commands…"
              style={{ width: '100%', background: 'var(--s3)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', padding: '7px 12px', 'font-size': '12px', color: 'var(--t1)', outline: 'none', 'font-family': 'var(--font)', 'box-sizing': 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
            />
          </div>

          {/* Section switcher */}
          <div style={{ display: 'flex', 'flex-shrink': '0', background: 'var(--s2)', 'border-bottom': '1px solid var(--b1)' }}>
            {(['shortcuts', 'nl', 'kubectl'] as const).map(s => (
              <button onClick={() => setCmdSection(s)} style={S.sectionBtn(cmdSection() === s)}>
                {s === 'shortcuts' ? '⌨ Shortcuts' : s === 'nl' ? '✦ AI Prompts' : '$ kubectl'}
              </button>
            ))}
          </div>

          {/* Category chips — hide for shortcuts */}
          <Show when={cmdSection() !== 'shortcuts'}>
            <div style={{ padding: '8px 14px', 'border-bottom': '1px solid var(--b1)', display: 'flex', gap: '5px', 'flex-wrap': 'wrap', 'flex-shrink': '0', 'overflow-x': 'auto' }}>
              <button onClick={() => setCmdCategory('All')} style={S.chip(cmdCategory() === 'All')}>All</button>
              <For each={cmdSection() === 'nl' ? NL_CATEGORIES : KB_CATEGORIES}>{cat => (
                <button onClick={() => setCmdCategory(cmdCategory() === cat ? 'All' : cat)} style={S.chip(cmdCategory() === cat)}>{cat}</button>
              )}</For>
            </div>
          </Show>

          {/* ── SHORTCUTS SECTION ── */}
          <Show when={cmdSection() === 'shortcuts'}>
            <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px' }}>
              {/* Workspace shortcuts */}
              <div style={{ 'margin-bottom': '18px' }}>
                <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '8px' }}>Workspace Navigation</div>
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', overflow: 'hidden' }}>
                  <For each={KEYBOARD_SHORTCUTS}>{(sc, i) => (
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', padding: '9px 14px', 'border-bottom': i() < KEYBOARD_SHORTCUTS.length - 1 ? '1px solid var(--b1)' : 'none' }}>
                      <div style={{ display: 'flex', gap: '4px', 'flex-shrink': '0' }}>
                        <For each={sc.keys}>{k => (
                          <kbd style={{ background: 'var(--s3)', border: '1px solid var(--b2)', 'border-radius': 'var(--r4)', padding: '2px 7px', 'font-family': 'var(--mono)', 'font-size': '11px', color: 'var(--t2)', 'white-space': 'nowrap' }}>{k}</kbd>
                        )}</For>
                      </div>
                      <span style={{ 'font-size': '12px', color: 'var(--t3)' }}>{sc.action}</span>
                    </div>
                  )}</For>
                </div>
              </div>

              {/* Incident detail tabs */}
              <div style={{ 'margin-bottom': '18px' }}>
                <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '8px' }}>Incident Detail Tabs</div>
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', overflow: 'hidden' }}>
                  {[
                    { tab: 'Overview', desc: 'AI hypotheses, timeline, blast radius, MTTR' },
                    { tab: 'Logs', desc: 'Container and system logs for this resource' },
                    { tab: 'Events', desc: 'Kubernetes events for this pod/deployment' },
                    { tab: 'Metrics', desc: 'CPU and memory usage charts' },
                    { tab: 'Config', desc: 'Pod spec, env vars, volume mounts' },
                    { tab: 'YAML', desc: 'Full resource YAML with live edit + apply' },
                    { tab: 'AI Hypotheses', desc: 'Confirmed root cause + ruling hypotheses' },
                  ].map((item, i, arr) => (
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', padding: '8px 14px', 'border-bottom': i < arr.length - 1 ? '1px solid var(--b1)' : 'none' }}>
                      <span style={{ 'font-size': '11px', 'font-weight': '600', color: 'var(--brand)', background: 'var(--brandDim)', 'border-radius': 'var(--r4)', padding: '1px 7px', 'white-space': 'nowrap', 'flex-shrink': '0' }}>{item.tab}</span>
                      <span style={{ 'font-size': '11.5px', color: 'var(--t3)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel tabs */}
              <div style={{ 'margin-bottom': '18px' }}>
                <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '8px' }}>Right Panel Actions</div>
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', overflow: 'hidden' }}>
                  {[
                    { tab: 'Fix', desc: 'Safe fix commands, feedback (✅❌⚠️), Mark Resolved' },
                    { tab: 'Runbook', desc: 'AI-generated steps — click Run to execute & see output' },
                    { tab: 'Chat', desc: 'Orkas AI chat scoped to this incident' },
                    { tab: 'Retro', desc: 'RCA report — export as PDF or .md' },
                  ].map((item, i, arr) => (
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', padding: '8px 14px', 'border-bottom': i < arr.length - 1 ? '1px solid var(--b1)' : 'none' }}>
                      <span style={{ 'font-size': '11px', 'font-weight': '600', color: 'var(--ok)', background: 'var(--okBg)', 'border-radius': 'var(--r4)', padding: '1px 7px', 'white-space': 'nowrap', 'flex-shrink': '0' }}>{item.tab}</span>
                      <span style={{ 'font-size': '11.5px', color: 'var(--t3)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rail icons */}
              <div style={{ 'margin-bottom': '4px' }}>
                <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '8px' }}>Rail Navigation</div>
                <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r8)', overflow: 'hidden' }}>
                  {[
                    { icon: '⊞', screen: 'Home', desc: 'Cluster health overview & incident list' },
                    { icon: '⚠', screen: 'Incidents', desc: 'All incidents with filters & navigator' },
                    { icon: '◫', screen: 'Workloads', desc: 'Pods, deployments, statefulsets' },
                    { icon: '⬡', screen: 'Context Graph', desc: 'Live service topology canvas' },
                    { icon: '▤', screen: 'Metrics', desc: 'Cluster-wide resource metrics' },
                    { icon: '⎇', screen: 'GitOps', desc: 'GitOps sync and deployments' },
                    { icon: '◈', screen: 'Cost', desc: 'Resource cost analysis' },
                    { icon: '✦', screen: 'Orkas AI', desc: 'Global AI assistant (this panel)' },
                    { icon: '⊕', screen: 'Safe Fix', desc: 'Safe remediation actions' },
                    { icon: '◉', screen: 'ML Insights', desc: 'Learning engine insights' },
                    { icon: '▦', screen: 'Knowledge Bank', desc: 'Feature weights & cause priors' },
                  ].map((item, i, arr) => (
                    <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', padding: '7px 14px', 'border-bottom': i < arr.length - 1 ? '1px solid var(--b1)' : 'none' }}>
                      <span style={{ 'font-size': '13px', 'flex-shrink': '0', width: '18px', 'text-align': 'center', color: 'var(--t3)' }}>{item.icon}</span>
                      <span style={{ 'font-size': '11px', 'font-weight': '600', color: 'var(--t2)', 'white-space': 'nowrap', 'flex-shrink': '0', 'min-width': '90px' }}>{item.screen}</span>
                      <span style={{ 'font-size': '11px', color: 'var(--t4)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Show>

          {/* ── AI PROMPTS SECTION ── */}
          <Show when={cmdSection() === 'nl'}>
            <div style={{ flex: '1', 'overflow-y': 'auto', padding: '12px 14px', display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              <div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'line-height': '1.5' }}>
                Click any prompt to send it to the AI. These work as natural language — the AI understands your cluster context.
              </div>
              <For each={Object.entries(groupedNL())}>{([cat, cmds]) => (
                <div>
                  <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '6px', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                    {cat}
                    <span style={{ 'font-size': '9px', 'font-weight': '600', background: 'var(--s3)', color: 'var(--t5)', padding: '1px 5px', 'border-radius': 'var(--r99)' }}>{cmds.length}</span>
                  </div>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '3px' }}>
                    <For each={cmds}>{c => (
                      <button
                        onClick={() => send(c.q)}
                        style={{ background: 'var(--s1)', border: '1px solid var(--b1)', 'border-radius': 'var(--r6)', padding: '7px 10px', cursor: 'pointer', 'text-align': 'left', 'font-size': '11.5px', color: 'var(--t3)', 'font-family': 'var(--font)', display: 'flex', 'align-items': 'center', gap: '8px', transition: 'border-color .12s, background .12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--brandDim)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--b1)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--s1)'; }}
                      >
                        <span style={{ 'font-size': '10px', color: 'var(--brand)', 'flex-shrink': '0' }}>✦</span>
                        {c.q}
                      </button>
                    )}</For>
                  </div>
                </div>
              )}</For>
              <Show when={filteredNL().length === 0}>
                <div style={{ 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px', 'padding-top': '24px' }}>No prompts match "{cmdSearch()}"</div>
              </Show>
            </div>
          </Show>

          {/* ── KUBECTL SECTION ── */}
          <Show when={cmdSection() === 'kubectl'}>
            <div style={{ flex: '1', 'overflow-y': 'auto', padding: '12px 14px', display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
              <div style={{ 'font-size': '10.5px', color: 'var(--t4)', 'line-height': '1.5' }}>
                Click any command to copy it. Replace <code style={{ background: 'var(--s3)', padding: '1px 4px', 'border-radius': '3px', 'font-family': 'var(--mono)', 'font-size': '10px' }}>&lt;placeholder&gt;</code> with your resource names.
              </div>
              <For each={Object.entries(groupedKubectl())}>{([cat, cmds]) => (
                <div>
                  <div style={{ 'font-size': '10px', 'font-weight': '700', color: 'var(--t5)', 'text-transform': 'uppercase', 'letter-spacing': '.08em', 'margin-bottom': '6px', display: 'flex', 'align-items': 'center', gap: '6px' }}>
                    {cat}
                    <span style={{ 'font-size': '9px', 'font-weight': '600', background: 'var(--s3)', color: 'var(--t5)', padding: '1px 5px', 'border-radius': 'var(--r99)' }}>{cmds.length}</span>
                  </div>
                  <div style={{ display: 'flex', 'flex-direction': 'column', gap: '3px' }}>
                    <For each={cmds}>{c => (
                      <button
                        onClick={() => copyKubectl(c.cmd)}
                        style={{ background: 'var(--s1)', border: `1px solid ${copiedCmd() === c.cmd ? 'var(--ok)' : 'var(--b1)'}`, 'border-radius': 'var(--r6)', padding: '7px 10px', cursor: 'pointer', 'text-align': 'left', 'font-family': 'var(--font)', display: 'flex', 'flex-direction': 'column', gap: '2px', transition: 'border-color .12s, background .12s' }}
                        onMouseEnter={e => { if (copiedCmd() !== c.cmd) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--s2)'; } }}
                        onMouseLeave={e => { if (copiedCmd() !== c.cmd) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--b1)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--s1)'; } }}
                      >
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '6px', 'justify-content': 'space-between' }}>
                          <code style={{ 'font-family': 'var(--mono)', 'font-size': '10.5px', color: copiedCmd() === c.cmd ? 'var(--ok)' : 'var(--t2)', 'flex': '1', 'word-break': 'break-all' }}>{c.cmd}</code>
                          <span style={{ 'font-size': '9.5px', color: copiedCmd() === c.cmd ? 'var(--ok)' : 'var(--t5)', 'flex-shrink': '0', 'font-weight': '600' }}>
                            {copiedCmd() === c.cmd ? '✓ Copied' : '⎘'}
                          </span>
                        </div>
                        <span style={{ 'font-size': '10.5px', color: 'var(--t4)' }}>{c.desc}</span>
                      </button>
                    )}</For>
                  </div>
                </div>
              )}</For>
              <Show when={filteredKubectl().length === 0}>
                <div style={{ 'text-align': 'center', color: 'var(--t5)', 'font-size': '12px', 'padding-top': '24px' }}>No commands match "{cmdSearch()}"</div>
              </Show>
            </div>
          </Show>
        </div>
      </Show>

      {/* ════════════════════ TAB: KNOWLEDGE ════════════════════ */}
      <Show when={tab() === 'knowledge'}>
        <div style={{ flex: '1', 'overflow-y': 'auto', padding: '14px', display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
          <div style={{ 'font-size': '12px', color: 'var(--t3)', 'line-height': '1.6' }}>
            Add runbooks, past incident notes, or docs to the Orkas AI knowledge base. This improves RCA and fix quality through RAG retrieval.
          </div>
          <div style={{ 'font-size': '10.5px', color: 'var(--brand)', padding: '6px 10px', background: 'var(--brandDim)', 'border-radius': 'var(--r8)', border: '1px solid var(--brand)25' }}>
            ✦ Full knowledge-base RAG retrieval will be available soon via Orkas AI
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
              <div style={{ 'font-size': '11.5px', padding: '7px 10px', 'border-radius': 'var(--r6)', background: ingestMsg().startsWith('Added') ? 'var(--okBg)' : 'var(--critBg)', color: ingestMsg().startsWith('Added') ? 'var(--ok)' : 'var(--crit)' }}>{ingestMsg()}</div>
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
