import { Component, createSignal, createResource, For, Show, createMemo } from 'solid-js';
import { api } from '../services/api';
import { setCurrentView } from '../stores/ui';

// Modern SVG Icons
const CpuIcon = () => (
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);

const MemoryIcon = () => (
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="8" x2="7" y2="16" />
    <line x1="11" y1="8" x2="11" y2="16" />
    <line x1="15" y1="8" x2="15" y2="16" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const PodIcon = () => (
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const NodeIcon = () => (
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ShieldIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const AlertIcon = () => (
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  icon: Component;
  onClick?: () => void;
}

const MetricCard: Component<MetricCardProps> = (props) => (
  <div
    class="card p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
    onClick={props.onClick}
    style={{ 'border-left': `4px solid ${props.color}` }}
  >
    <div class="flex items-start justify-between">
      <div>
        <div class="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{props.label}</div>
        <div class="text-3xl font-bold mt-2" style={{ color: props.color }}>{props.value}</div>
        <Show when={props.subtext}>
          <div class="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{props.subtext}</div>
        </Show>
      </div>
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: `${props.color}20`, color: props.color }}
      >
        {props.icon({})}
      </div>
    </div>
  </div>
);

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  details?: string;
}

const Dashboard: Component = () => {
  const [metrics] = createResource(api.getMetrics);
  const [pods] = createResource(() => api.getPods('_all'));
  const [deployments] = createResource(() => api.getDeployments('_all'));
  const [services] = createResource(() => api.getServices('_all'));
  const [nodes] = createResource(api.getNodes);
  const [events] = createResource(api.getEvents);

  // Calculate stats
  const runningPods = () => (pods() || []).filter((p: any) => p.status === 'Running').length;
  const totalPods = () => (pods() || []).length;
  const healthyNodes = () => (nodes() || []).filter((n: any) => n.status === 'Ready').length;
  const totalNodes = () => (nodes() || []).length;
  const recentEvents = () => (events() || []).slice(0, 10);

  // Real security analysis based on pod data
  const securityChecks = createMemo((): SecurityCheck[] => {
    const podList = pods() || [];
    const checks: SecurityCheck[] = [];

    // Check for pods without security context
    const podsWithoutSecurityContext = podList.filter((p: any) => !p.securityContext);
    if (podsWithoutSecurityContext.length > 0) {
      checks.push({
        name: 'Security Context Missing',
        status: 'fail',
        severity: 'critical',
        count: podsWithoutSecurityContext.length,
        details: `${podsWithoutSecurityContext.length} pods have no security context defined`,
      });
    } else if (podList.length > 0) {
      checks.push({
        name: 'Security Context',
        status: 'pass',
        severity: 'critical',
        details: 'All pods have security context configured',
      });
    }

    // Check for pods running as root
    const podsRunningAsRoot = podList.filter((p: any) =>
      p.securityContext?.runAsRoot === true ||
      (!p.securityContext?.runAsNonRoot && !p.securityContext?.runAsUser)
    );
    if (podsRunningAsRoot.length > 0) {
      checks.push({
        name: 'Running as Root',
        status: 'fail',
        severity: 'critical',
        count: podsRunningAsRoot.length,
        details: `${podsRunningAsRoot.length} pods may run as root user`,
      });
    } else if (podList.length > 0) {
      checks.push({
        name: 'Non-Root User',
        status: 'pass',
        severity: 'critical',
        details: 'All pods run as non-root',
      });
    }

    // Check for privileged containers
    const privilegedPods = podList.filter((p: any) => p.privileged === true);
    if (privilegedPods.length > 0) {
      checks.push({
        name: 'Privileged Containers',
        status: 'fail',
        severity: 'critical',
        count: privilegedPods.length,
        details: `${privilegedPods.length} containers running in privileged mode`,
      });
    } else if (podList.length > 0) {
      checks.push({
        name: 'No Privileged Containers',
        status: 'pass',
        severity: 'critical',
        details: 'No privileged containers detected',
      });
    }

    // Check for resource limits
    const podsWithoutLimits = podList.filter((p: any) => !p.resources?.limits);
    if (podsWithoutLimits.length > 0) {
      checks.push({
        name: 'Resource Limits Missing',
        status: 'warning',
        severity: 'high',
        count: podsWithoutLimits.length,
        details: `${podsWithoutLimits.length} pods without resource limits`,
      });
    } else if (podList.length > 0) {
      checks.push({
        name: 'Resource Limits',
        status: 'pass',
        severity: 'high',
        details: 'All pods have resource limits configured',
      });
    }

    // Check for read-only root filesystem
    const podsWithWritableRootfs = podList.filter((p: any) =>
      p.securityContext?.readOnlyRootFilesystem !== true
    );
    if (podsWithWritableRootfs.length > 0 && podList.length > 0) {
      checks.push({
        name: 'Writable Root Filesystem',
        status: 'warning',
        severity: 'medium',
        count: podsWithWritableRootfs.length,
        details: `${podsWithWritableRootfs.length} pods have writable root filesystem`,
      });
    }

    // Default checks if no pods
    if (podList.length === 0) {
      checks.push({
        name: 'No Pods to Analyze',
        status: 'warning',
        severity: 'low',
        details: 'No pods found for security analysis',
      });
    }

    return checks;
  });

  // Calculate security score
  const securityScore = createMemo(() => {
    const checks = securityChecks();
    if (checks.length === 0) return 100;

    const weights = { critical: 25, high: 15, medium: 10, low: 5 };
    let totalWeight = 0;
    let passedWeight = 0;

    checks.forEach(check => {
      const weight = weights[check.severity];
      totalWeight += weight;
      if (check.status === 'pass') passedWeight += weight;
      else if (check.status === 'warning') passedWeight += weight * 0.5;
    });

    return totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;
  });

  // AI Insights based on cluster state
  const getInsights = () => {
    const insights: Array<{
      type: string;
      title: string;
      message: string;
      details?: string[];
      navigateTo?: string;
      actionLabel?: string;
    }> = [];
    const podList = pods() || [];
    const nodeList = nodes() || [];
    const m = metrics();

    // Check for pending pods
    const pendingPods = podList.filter((p: any) => p.status === 'Pending');
    if (pendingPods.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Pending Pods Detected',
        message: `${pendingPods.length} pods are in Pending state.`,
        details: pendingPods.slice(0, 3).map((p: any) => `${p.namespace}/${p.name}`),
        navigateTo: 'pods',
        actionLabel: 'View Pods',
      });
    }

    // Check for failed pods
    const failedPods = podList.filter((p: any) =>
      p.status === 'Failed' || p.status === 'Error' || p.status === 'CrashLoopBackOff'
    );
    if (failedPods.length > 0) {
      insights.push({
        type: 'error',
        title: 'Failed Pods Alert',
        message: `${failedPods.length} pods are failing. Immediate attention recommended.`,
        details: failedPods.slice(0, 3).map((p: any) => `${p.namespace}/${p.name} (${p.status})`),
        navigateTo: 'pods',
        actionLabel: 'View Failed Pods',
      });
    }

    // Check node health
    const unhealthyNodes = nodeList.filter((n: any) => n.status !== 'Ready');
    if (unhealthyNodes.length > 0) {
      insights.push({
        type: 'error',
        title: 'Node Health Issue',
        message: `${unhealthyNodes.length} nodes are not ready.`,
        details: unhealthyNodes.slice(0, 3).map((n: any) => n.name),
        navigateTo: 'nodes',
        actionLabel: 'View Nodes',
      });
    }

    // Resource warnings
    const cpuVal = m?.cpu != null ? (typeof m.cpu === 'object' ? m.cpu.percentage : Number(m.cpu)) : null;
    const memVal = m?.memory != null ? (typeof m.memory === 'object' ? m.memory.percentage : Number(m.memory)) : null;

    if (cpuVal && cpuVal > 80) {
      insights.push({
        type: 'warning',
        title: 'High CPU Usage',
        message: `Cluster CPU at ${cpuVal.toFixed(1)}%. Consider scaling or optimizing workloads.`,
      });
    }

    if (memVal && memVal > 85) {
      insights.push({
        type: 'warning',
        title: 'High Memory Usage',
        message: `Cluster memory at ${memVal.toFixed(1)}%. Consider adding capacity.`,
      });
    }

    // Security insights - more detailed
    const criticalSecurityIssues = securityChecks().filter(c => c.status === 'fail' && c.severity === 'critical');
    if (criticalSecurityIssues.length > 0) {
      insights.push({
        type: 'error',
        title: 'Critical Security Issues',
        message: `${criticalSecurityIssues.length} critical security findings require immediate attention.`,
        details: criticalSecurityIssues.map(c => `${c.name}${c.count ? ` (${c.count} affected)` : ''}`),
        navigateTo: 'security',
        actionLabel: 'View Security Details',
      });
    }

    // High severity security warnings
    const highSecurityIssues = securityChecks().filter(c => c.status === 'fail' && c.severity === 'high');
    if (highSecurityIssues.length > 0 && criticalSecurityIssues.length === 0) {
      insights.push({
        type: 'warning',
        title: 'Security Warnings',
        message: `${highSecurityIssues.length} high-severity security findings detected.`,
        details: highSecurityIssues.map(c => c.name),
        navigateTo: 'security',
        actionLabel: 'View Security Details',
      });
    }

    // Positive insight
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        title: 'Cluster Healthy',
        message: 'All systems operating normally. No issues detected.',
      });
    }

    return insights;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success-color)';
    if (score >= 60) return 'var(--warning-color)';
    return 'var(--error-color)';
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Cluster overview and health monitoring</p>
      </div>

      {/* Metrics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="CPU Usage"
          value={metrics()?.cpu != null ? `${typeof metrics()!.cpu === 'object' ? metrics()!.cpu.percentage?.toFixed(1) : Number(metrics()!.cpu).toFixed(1)}%` : '--'}
          subtext="Cluster average"
          color="#06b6d4"
          icon={CpuIcon}
        />
        <MetricCard
          label="Memory Usage"
          value={metrics()?.memory != null ? `${typeof metrics()!.memory === 'object' ? metrics()!.memory.percentage?.toFixed(1) : Number(metrics()!.memory).toFixed(1)}%` : '--'}
          subtext="Cluster average"
          color="#8b5cf6"
          icon={MemoryIcon}
        />
        <MetricCard
          label="Running Pods"
          value={`${runningPods()}/${totalPods()}`}
          subtext={`${totalPods() > 0 ? ((runningPods() / totalPods()) * 100).toFixed(0) : 0}% healthy`}
          color="#22c55e"
          icon={PodIcon}
          onClick={() => setCurrentView('pods')}
        />
        <MetricCard
          label="Nodes"
          value={`${healthyNodes()}/${totalNodes()}`}
          subtext={healthyNodes() === totalNodes() ? 'All healthy' : 'Some unhealthy'}
          color={healthyNodes() === totalNodes() ? '#22c55e' : '#f59e0b'}
          icon={NodeIcon}
          onClick={() => setCurrentView('nodes')}
        />
      </div>

      {/* Resource Overview */}
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Resource Overview</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => setCurrentView('pods')}
          >
            <div class="text-3xl font-bold" style={{ color: '#06b6d4' }}>{totalPods()}</div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pods</div>
          </div>
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => setCurrentView('deployments')}
          >
            <div class="text-3xl font-bold" style={{ color: '#3b82f6' }}>{(deployments() || []).length}</div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Deployments</div>
          </div>
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => setCurrentView('services')}
          >
            <div class="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{(services() || []).length}</div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Services</div>
          </div>
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => setCurrentView('nodes')}
          >
            <div class="text-3xl font-bold" style={{ color: '#22c55e' }}>{totalNodes()}</div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Nodes</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            AI Insights & Recommendations
          </h2>
          <div class="space-y-3">
            <For each={getInsights()}>
              {(insight) => (
                <div
                  class="p-4 rounded-lg border"
                  style={{
                    background: insight.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                               insight.type === 'warning' ? 'rgba(245, 158, 11, 0.1)' :
                               insight.type === 'success' ? 'rgba(34, 197, 94, 0.1)' :
                               'rgba(6, 182, 212, 0.1)',
                    'border-color': insight.type === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                                   insight.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                                   insight.type === 'success' ? 'rgba(34, 197, 94, 0.3)' :
                                   'rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <div class="flex items-start gap-3">
                    <div style={{
                      color: insight.type === 'error' ? 'var(--error-color)' :
                             insight.type === 'warning' ? 'var(--warning-color)' :
                             insight.type === 'success' ? 'var(--success-color)' :
                             'var(--accent-primary)'
                    }}>
                      {insight.type === 'error' ? <AlertIcon /> :
                       insight.type === 'warning' ? <AlertIcon /> :
                       insight.type === 'success' ? <CheckIcon /> : <ShieldIcon />}
                    </div>
                    <div class="flex-1">
                      <div class="font-medium" style={{
                        color: insight.type === 'error' ? 'var(--error-color)' :
                               insight.type === 'warning' ? 'var(--warning-color)' :
                               insight.type === 'success' ? 'var(--success-color)' :
                               'var(--accent-primary)'
                      }}>
                        {insight.title}
                      </div>
                      <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {insight.message}
                      </div>
                      {/* Details list */}
                      <Show when={insight.details && insight.details.length > 0}>
                        <ul class="mt-2 text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                          <For each={insight.details}>
                            {(detail) => (
                              <li class="flex items-center gap-2">
                                <span class="w-1 h-1 rounded-full" style={{
                                  background: insight.type === 'error' ? 'var(--error-color)' :
                                             insight.type === 'warning' ? 'var(--warning-color)' :
                                             'var(--accent-primary)'
                                }} />
                                {detail}
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                      {/* Action button */}
                      <Show when={insight.navigateTo && insight.actionLabel}>
                        <button
                          onClick={() => setCurrentView(insight.navigateTo!)}
                          class="mt-3 px-3 py-1.5 text-xs font-medium rounded-md transition-all hover:opacity-80"
                          style={{
                            background: insight.type === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                                       insight.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' :
                                       'rgba(6, 182, 212, 0.2)',
                            color: insight.type === 'error' ? 'var(--error-color)' :
                                  insight.type === 'warning' ? 'var(--warning-color)' :
                                  'var(--accent-primary)',
                            border: `1px solid ${insight.type === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                                                insight.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                                                'rgba(6, 182, 212, 0.3)'}`
                          }}
                        >
                          {insight.actionLabel} →
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Security Overview */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => setCurrentView('security')}>
            <ShieldIcon />
            Security Overview
            <svg class="w-4 h-4 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </h2>
          <div class="space-y-4">
            {/* Security Score */}
            <div class="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Security Score</span>
              <span class="text-2xl font-bold" style={{ color: getScoreColor(securityScore()) }}>
                {securityScore()}/100
              </span>
            </div>

            {/* Security Checks */}
            <div class="space-y-2">
              <For each={securityChecks()}>
                {(check) => (
                  <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <div class="flex items-center gap-2">
                      <span class={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        check.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        check.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        check.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {check.severity.toUpperCase()}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>{check.name}</span>
                      <Show when={check.count}>
                        <span class="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          {check.count}
                        </span>
                      </Show>
                    </div>
                    <span class={`flex items-center gap-1 text-sm ${
                      check.status === 'pass' ? 'text-green-400' :
                      check.status === 'fail' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {check.status === 'pass' ? <CheckIcon /> :
                       check.status === 'fail' ? <XIcon /> : <AlertIcon />}
                      {check.status === 'pass' ? 'Pass' : check.status === 'fail' ? 'Fail' : 'Warning'}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Events</h2>
          <Show when={recentEvents().length > 0} fallback={
            <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>No recent events</div>
          }>
            <div class="space-y-2 max-h-64 overflow-auto">
              <For each={recentEvents()}>
                {(event: any) => (
                  <div class="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <span class={`mt-0.5 ${
                      event.type === 'Warning' ? 'text-yellow-400' :
                      event.type === 'Normal' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {event.type === 'Warning' ? <AlertIcon /> :
                       event.type === 'Normal' ? <CheckIcon /> : <XIcon />}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {event.reason}: {event.object}
                      </div>
                      <div class="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {event.message}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
      </div>
    </div>
  );
};

export default Dashboard;
