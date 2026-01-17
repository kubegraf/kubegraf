import { Component, createSignal, createResource, For, Show, createMemo, onMount, createEffect, onCleanup } from 'solid-js';
import { api } from '../services/api';
import { setCurrentView } from '../stores/ui';
import { navigateToSecurityCheck } from '../utils/security-navigation';
import { currentContext, refreshTrigger, nodesResource } from '../stores/cluster';
import { 
  latestPoint, 
  points, 
  status as metricsStatus,
  getCpuSparkline,
  getMemSparkline,
  getStatusColor,
  getStatusLevel,
  connectMetrics,
  disconnectMetrics
} from '../stores/metricsStore';
import CpuMemChart from '../components/metrics/CpuMemChart';
import Sparkline from '../components/metrics/Sparkline';
import MetricsStatusBanner from '../components/metrics/MetricsStatusBanner';

// Modern SVG Icons
const PodIcon = () => (
  // Official Kubernetes Pod icon style
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.9 3.85L12 11.9 5.1 8.03 12 4.18zM5 9.48l6 3.35v6.7l-6-3.35v-6.7zm8 10.05v-6.7l6-3.35v6.7l-6 3.35z"/>
  </svg>
);

const NodeIcon = () => (
  // Official Kubernetes Node/Server icon style
  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h16v4H4v-4z"/>
    <circle cx="6" cy="6" r="1"/>
    <circle cx="6" cy="12" r="1"/>
    <circle cx="6" cy="18" r="1"/>
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
  percentage?: number; // For circular progress
}

const MetricCard: Component<MetricCardProps> = (props) => (
  <div
    class="metric-card card-hover cursor-pointer p-6"
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
  // Refresh all resources when cluster changes
  // Use storageOptions to prevent showing loading state on background refreshes
  const [metrics, { refetch: refetchMetrics }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => {
      try {
        const data = await api.getMetrics();
        return data;
      } catch (error) {
        console.error('Dashboard: Error fetching metrics:', error);
        throw error;
      }
    }
  );
  
  const [pods, { refetch: refetchPods }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getPods('_all')
  );
  
  const [deployments, { refetch: refetchDeployments }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getDeployments('_all')
  );
  
  const [services, { refetch: refetchServices }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => api.getServices('_all')
  );
  
  // Use the shared nodesResource from cluster store (already refreshes on cluster switch)
  const nodes = nodesResource;
  
  const [eventsResponse, { refetch: refetchEvents }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => {
      try {
        const response = await api.getEvents(undefined, 50); // Get up to 50 recent events
        return response?.events || [];
      } catch (error) {
        console.error('Failed to fetch events:', error);
        return [];
      }
    }
  );
  
  // Refresh cost when cluster changes or connection is established
  const [clusterCost, { refetch: refetchCost }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => {
      try {
        const cost = await api.getClusterCost();
        return cost;
      } catch (e) {
        console.error('Dashboard cost API error:', e);
        // Return null instead of throwing to prevent UI crash
        return null;
      }
    }
  );
  
  // Refetch cost when refreshTrigger changes (connection established)
  createEffect(() => {
    const trigger = refreshTrigger();
    const ctx = currentContext();
    // When trigger changes and we have a context, try to fetch cost
    if (trigger > 0 && ctx) {
      // Small delay to ensure connection is ready
      setTimeout(() => {
        // Always refetch cost when connection is established
        refetchCost();
      }, 1500);
    }
  });
  
  // Trigger initial fetch on mount and set up auto-refresh for real-time graphs
  onMount(() => {
    refetchMetrics();
    // Also try to fetch cost if not already loading
    if (!clusterCost.loading && !clusterCost()) {
      refetchCost();
    }

    // Auto-refresh metrics every 30 seconds for live graphs (silent background refresh)
    // Only refresh when tab is visible to save resources
    const refreshInterval = setInterval(() => {
      if (!document.hidden) {
        // Silently refetch without showing loading state
        refetchMetrics().catch(() => {
          // Don't show error to user for background refreshes
        });
      }
    }, 30000);

    // Cleanup on unmount
    return () => clearInterval(refreshInterval);
  });

  // Calculate stats
  const runningPods = () => {
    const podList = pods();
    if (!podList || !Array.isArray(podList)) return 0;
    return podList.filter((p: any) => p.status === 'Running').length;
  };
  const totalPods = () => {
    const podList = pods();
    return Array.isArray(podList) ? podList.length : 0;
  };
  const healthyNodes = () => {
    try {
      if (nodes.error) return 0;
      const nodeList = nodes();
      if (!nodeList || !Array.isArray(nodeList)) return 0;
      return nodeList.filter((n: any) => n.status === 'Ready' || n.readyStatus === 'Ready').length;
    } catch (err) {
      console.error('Error calculating healthy nodes:', err);
      return 0;
    }
  };
  const totalNodes = () => {
    try {
      if (nodes.error) return 0;
      const nodeList = nodes();
      return Array.isArray(nodeList) ? nodeList.length : 0;
    } catch (err) {
      console.error('Error calculating total nodes:', err);
      return 0;
    }
  };
  const recentEvents = () => {
    const eventList = eventsResponse();
    return Array.isArray(eventList) ? eventList.slice(0, 10) : [];
  };

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

      {/* Realtime Metrics Status Banner */}
      <MetricsStatusBanner />

      {/* Realtime KPI Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cluster CPU */}
        <div class="card p-4 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full" style={{ background: '#06b6d4' }} />
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Cluster CPU
              </div>
              <div class="text-3xl font-bold mt-1" style={{ color: '#06b6d4' }}>
                {latestPoint()?.cluster.cpuPct?.toFixed(1) ?? '--'}%
              </div>
            </div>
            <div 
              class="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                background: `${getStatusColor(latestPoint()?.cluster.cpuPct ?? 0)}20`,
                color: getStatusColor(latestPoint()?.cluster.cpuPct ?? 0),
              }}
            >
              {getStatusLevel(latestPoint()?.cluster.cpuPct ?? 0) === 'hot' ? '🔥 Hot' : 
               getStatusLevel(latestPoint()?.cluster.cpuPct ?? 0) === 'moderate' ? '⚡ Moderate' : 
               '✓ Normal'}
            </div>
          </div>
          <Sparkline data={getCpuSparkline(30)} color="#06b6d4" height={32} showDots />
        </div>

        {/* Cluster Memory */}
        <div class="card p-4 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full" style={{ background: '#8b5cf6' }} />
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Cluster Memory
              </div>
              <div class="text-3xl font-bold mt-1" style={{ color: '#8b5cf6' }}>
                {latestPoint()?.cluster.memPct?.toFixed(1) ?? '--'}%
              </div>
            </div>
            <div 
              class="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                background: `${getStatusColor(latestPoint()?.cluster.memPct ?? 0)}20`,
                color: getStatusColor(latestPoint()?.cluster.memPct ?? 0),
              }}
            >
              {getStatusLevel(latestPoint()?.cluster.memPct ?? 0) === 'hot' ? '🔥 Hot' : 
               getStatusLevel(latestPoint()?.cluster.memPct ?? 0) === 'moderate' ? '⚡ Moderate' : 
               '✓ Normal'}
            </div>
          </div>
          <Sparkline data={getMemSparkline(30)} color="#8b5cf6" height={32} showDots />
        </div>

        {/* Peak Node CPU */}
        <div class="card p-4 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full" style={{ background: '#f59e0b' }} />
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Peak Node CPU
              </div>
              <div class="text-3xl font-bold mt-1" style={{ color: '#f59e0b' }}>
                {latestPoint()?.peaks.cpuPct?.toFixed(1) ?? '--'}%
              </div>
            </div>
            <div 
              class="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                background: `${getStatusColor(latestPoint()?.peaks.cpuPct ?? 0)}20`,
                color: getStatusColor(latestPoint()?.peaks.cpuPct ?? 0),
              }}
            >
              {getStatusLevel(latestPoint()?.peaks.cpuPct ?? 0) === 'hot' ? '🔥 Hot' : 
               getStatusLevel(latestPoint()?.peaks.cpuPct ?? 0) === 'moderate' ? '⚡ Moderate' : 
               '✓ Normal'}
            </div>
          </div>
          <Show when={latestPoint()?.topNodes?.[0]}>
            <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Top: {latestPoint()?.topNodes?.[0]?.name}
            </div>
          </Show>
        </div>

        {/* Peak Node Memory */}
        <div class="card p-4 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full" style={{ background: '#ec4899' }} />
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Peak Node Memory
              </div>
              <div class="text-3xl font-bold mt-1" style={{ color: '#ec4899' }}>
                {latestPoint()?.peaks.memPct?.toFixed(1) ?? '--'}%
              </div>
            </div>
            <div 
              class="px-2 py-1 rounded text-xs font-medium"
              style={{ 
                background: `${getStatusColor(latestPoint()?.peaks.memPct ?? 0)}20`,
                color: getStatusColor(latestPoint()?.peaks.memPct ?? 0),
              }}
            >
              {getStatusLevel(latestPoint()?.peaks.memPct ?? 0) === 'hot' ? '🔥 Hot' : 
               getStatusLevel(latestPoint()?.peaks.memPct ?? 0) === 'moderate' ? '⚡ Moderate' : 
               '✓ Normal'}
            </div>
          </div>
          <Show when={latestPoint()?.source && latestPoint()?.source !== 'unavailable'}>
            <div class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              via {latestPoint()?.source === 'metrics_api' ? 'Metrics API' : 'Summary API'}
            </div>
          </Show>
        </div>
      </div>

      {/* Realtime CPU/Memory Chart */}
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(135deg, #06b6d420 0%, #8b5cf620 100%)',
                   border: '1px solid rgba(139, 92, 246, 0.2)',
                 }}>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="url(#realtimeGrad)" stroke-width="2">
                <defs>
                  <linearGradient id="realtimeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#06b6d4" />
                    <stop offset="100%" stop-color="#8b5cf6" />
                  </linearGradient>
                </defs>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Realtime Resource Usage
              </h2>
              <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                Live streaming metrics • Last 15 minutes
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div 
              class="w-2 h-2 rounded-full animate-pulse"
              style={{ 
                background: metricsStatus().connected ? '#22c55e' : '#ef4444',
                'box-shadow': `0 0 8px ${metricsStatus().connected ? '#22c55e' : '#ef4444'}`,
              }}
            />
            <span class="text-xs" style={{ color: 'var(--text-muted)' }}>
              {metricsStatus().connected ? 'Live' : metricsStatus().reconnecting ? 'Reconnecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
        <CpuMemChart height={200} showLegend />
      </div>

      {/* Metrics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <MetricCard
          label="Running Pods"
          value={`${runningPods()}/${totalPods()}`}
          subtext={`${totalPods() > 0 ? ((runningPods() / totalPods()) * 100).toFixed(0) : 0}% healthy`}
          color="#22c55e"
          icon={PodIcon}
          onClick={() => {
            sessionStorage.setItem('kubegraf-previous-view', 'dashboard');
            setCurrentView('pods');
          }}
        />
        <MetricCard
          label="Nodes"
          value={
            nodes.loading 
              ? '...' 
              : nodes.error 
                ? 'Error' 
                : `${healthyNodes()}/${totalNodes()}`
          }
          subtext={
            nodes.loading 
              ? 'Loading...' 
              : nodes.error
                ? 'Connection required'
              : (healthyNodes() === totalNodes() && totalNodes() > 0 ? 'All healthy' : totalNodes() === 0 ? 'No nodes' : 'Some unhealthy')
          }
          color={
            nodes.loading 
              ? '#6b7280' 
              : nodes.error
                ? '#ef4444'
              : (healthyNodes() === totalNodes() && totalNodes() > 0 ? '#22c55e' : '#f59e0b')
          }
          icon={NodeIcon}
          onClick={() => setCurrentView('nodes')}
        />
      </div>

      {/* Resource Overview */}
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Resource Overview</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => {
            sessionStorage.setItem('kubegraf-previous-view', 'dashboard');
            setCurrentView('pods');
          }}
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
            <div class="text-3xl font-bold" style={{ color: '#22c55e' }}>
              {nodes.loading ? '...' : totalNodes()}
            </div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Nodes</div>
          </div>
          <div
            class="p-4 rounded-lg text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-tertiary)' }}
            onClick={() => setCurrentView('cost')}
          >
            <div class="text-3xl font-bold" style={{ color: '#f59e0b' }}>
              {(() => {
                if (clusterCost.loading) return '...';
                if (clusterCost.error) return 'Error';
                const cost = clusterCost();
                if (!cost) return '--';
                const monthly = cost.monthlyCost;
                if (monthly == null || monthly === undefined) return '--';
                return `$${typeof monthly === 'number' ? monthly.toFixed(0) : monthly}`;
              })()}
            </div>
            <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Est. Monthly Cost</div>
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
                  <div 
                    class={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      check.status !== 'pass' && check.count ? 'cursor-pointer hover:opacity-80 hover:scale-[1.02]' : ''
                    }`}
                    style={{ 
                      background: 'var(--bg-secondary)',
                      ...(check.status !== 'pass' && check.count ? { 
                        border: '1px solid var(--accent-primary)',
                        borderOpacity: 0.3 
                      } : {})
                    }}
                    onClick={() => {
                      if (check.status !== 'pass' && check.count) {
                        navigateToSecurityCheck(check.name, check.severity);
                      }
                    }}
                    title={check.status !== 'pass' && check.count ? `Click to view ${check.count} pods with ${check.name}` : ''}
                  >
                    <div class="flex items-center gap-2 flex-1">
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
                        <span class="text-xs px-1.5 py-0.5 rounded font-medium" style={{ 
                          background: check.status === 'fail' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-tertiary)', 
                          color: check.status === 'fail' ? 'var(--error-color)' : 'var(--text-muted)' 
                        }}>
                          {check.count}
                        </span>
                      </Show>
                      <Show when={check.status !== 'pass' && check.count}>
                        <svg class="w-4 h-4 ml-auto opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
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
