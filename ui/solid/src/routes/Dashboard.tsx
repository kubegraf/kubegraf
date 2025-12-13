import { Component, createSignal, createResource, For, Show, createMemo, onMount, createEffect } from 'solid-js';
import { api } from '../services/api';
import { setCurrentView } from '../stores/ui';
import { navigateToSecurityCheck } from '../utils/security-navigation';
import { currentContext, refreshTrigger, nodesResource } from '../stores/cluster';

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

// Enhanced circular progress component with multiple rings and animations
const CircularProgress: Component<{ percentage: number; color: string; size?: number; label?: string }> = (props) => {
  const size = props.size || 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (props.percentage / 100) * circumference;

  // Color variants for multi-ring effect
  const getColorStops = () => {
    if (props.color === '#06b6d4') return { start: '#22d3ee', end: '#0891b2', glow: '#06b6d4' };
    if (props.color === '#8b5cf6') return { start: '#a78bfa', end: '#7c3aed', glow: '#8b5cf6' };
    return { start: props.color, end: props.color, glow: props.color };
  };

  const colors = getColorStops();

  return (
    <div class="relative flex items-center justify-center" style={{ width: `${size + 40}px`, height: `${size + 40}px` }}>
      {/* Outer glow ring */}
      <div
        class="absolute inset-0 rounded-full opacity-30 blur-xl animate-pulse"
        style={{
          background: `radial-gradient(circle, ${colors.glow}40 0%, transparent 70%)`,
        }}
      />

      {/* Main gauge container */}
      <div class="relative" style={{ width: `${size}px`, height: `${size}px` }}>
        <svg class="transform -rotate-90 absolute inset-0" width={size} height={size}>
          <defs>
            {/* Main gradient */}
            <linearGradient id={`grad-main-${props.color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color={colors.start} />
              <stop offset="100%" stop-color={colors.end} />
            </linearGradient>
            {/* Shimmer effect */}
            <linearGradient id={`grad-shimmer-${props.color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color={colors.start} stop-opacity="0.3" />
              <stop offset="50%" stop-color="#ffffff" stop-opacity="0.8" />
              <stop offset="100%" stop-color={colors.end} stop-opacity="0.3" />
              <animate attributeName="x1" values="-100%;200%" dur="3s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0%;300%" dur="3s" repeatCount="indefinite" />
            </linearGradient>
            {/* Glow filter */}
            <filter id={`glow-${props.color.replace('#', '')}`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background track with subtle glow */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            stroke-width={strokeWidth}
            fill="none"
            opacity="0.5"
          />

          {/* Inner decorative ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 20}
            stroke={`${colors.glow}20`}
            stroke-width="2"
            fill="none"
            stroke-dasharray="4 4"
            class="animate-spin-slow"
            style={{ "animation-duration": "20s" }}
          />

          {/* Main progress arc with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#grad-main-${props.color.replace('#', '')})`}
            stroke-width={strokeWidth}
            fill="none"
            stroke-dasharray={circumference}
            stroke-dashoffset={offset}
            stroke-linecap="round"
            class="transition-all duration-[2000ms] ease-out"
            filter={`url(#glow-${props.color.replace('#', '')})`}
          />

          {/* Shimmer overlay on progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#grad-shimmer-${props.color.replace('#', '')})`}
            stroke-width={strokeWidth - 2}
            fill="none"
            stroke-dasharray={circumference}
            stroke-dashoffset={offset}
            stroke-linecap="round"
            opacity="0.6"
          />
        </svg>

        {/* Center content with icon and percentage */}
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          {/* Animated percentage */}
          <div class="text-4xl font-black tracking-tight mb-1"
               style={{
                 color: props.color,
                 'text-shadow': `0 0 20px ${colors.glow}60, 0 0 40px ${colors.glow}30`,
               }}>
            {props.percentage.toFixed(1)}
            <span class="text-2xl">%</span>
          </div>

          {/* Status indicator */}
          <div class="flex items-center gap-1.5 mt-1">
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: props.percentage > 80 ? '#ef4444' : props.percentage > 60 ? '#f59e0b' : '#22c55e',
                'box-shadow': `0 0 8px ${props.percentage > 80 ? '#ef4444' : props.percentage > 60 ? '#f59e0b' : '#22c55e'}`,
              }}
            />
            <span class="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {props.percentage > 80 ? 'High' : props.percentage > 60 ? 'Moderate' : 'Normal'}
            </span>
          </div>
        </div>

        {/* Corner decorative elements */}
        <div class="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
             style={{ background: colors.start, opacity: 0.6 }} />
        <div class="absolute bottom-2 left-2 w-2 h-2 rounded-full animate-pulse"
             style={{
               background: colors.end,
               opacity: 0.6,
               'animation-delay': '0.5s'
             }} />
      </div>
    </div>
  );
};

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

// Mini line chart component for time-series data
const MiniLineChart: Component<{
  data: number[];
  color: string;
  label: string;
  height?: number;
}> = (props) => {
  const height = props.height || 120;
  const width = 400;
  const padding = 20;

  const points = () => {
    const data = props.data;
    if (!data || data.length === 0) return '';

    const maxVal = Math.max(...data, 100);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    return data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');
  };

  const gradientId = `gradient-area-${props.color.replace('#', '')}`;

  return (
    <div class="relative" style={{ width: '100%', height: `${height}px` }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color={props.color} stop-opacity="0.4" />
            <stop offset="100%" stop-color={props.color} stop-opacity="0.05" />
          </linearGradient>
          <filter id={`glow-line-${props.color.replace('#', '')}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding}
              stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4 4" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2}
              stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4 4" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding}
              stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4 4" />

        {/* Area fill */}
        <Show when={points()}>
          <polygon
            points={`${padding},${height - padding} ${points()} ${width - padding},${height - padding}`}
            fill={`url(#${gradientId})`}
          />
        </Show>

        {/* Line with glow */}
        <Show when={points()}>
          <polyline
            points={points()}
            fill="none"
            stroke={props.color}
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            filter={`url(#glow-line-${props.color.replace('#', '')})`}
            class="transition-all duration-500"
          />
        </Show>

        {/* Data points */}
        <Show when={points()}>
          <For each={props.data.slice(-10)}>
            {(value, i) => {
              const data = props.data;
              const maxVal = Math.max(...data, 100);
              const minVal = Math.min(...data, 0);
              const range = maxVal - minVal || 1;
              const x = padding + ((data.length - 10 + i()) / (data.length - 1)) * (width - padding * 2);
              const y = height - padding - ((value - minVal) / range) * (height - padding * 2);

              return (
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={props.color}
                  class="animate-pulse"
                  style={{ 'animation-duration': '2s', 'animation-delay': `${i() * 0.1}s` }}
                >
                  <title>{value.toFixed(1)}%</title>
                </circle>
              );
            }}
          </For>
        </Show>
      </svg>

      {/* Label */}
      <div class="absolute bottom-1 left-1 text-xs font-medium px-2 py-1 rounded"
           style={{
             background: `${props.color}20`,
             color: props.color,
             border: `1px solid ${props.color}40`
           }}>
        {props.label}
      </div>
    </div>
  );
};

const Dashboard: Component = () => {
  // View toggle state - 'gauges' or 'charts'
  const [metricView, setMetricView] = createSignal<'gauges' | 'charts' | 'both'>('both');

  // Historical data storage for charts
  const [cpuHistory, setCpuHistory] = createSignal<number[]>([]);
  const [memoryHistory, setMemoryHistory] = createSignal<number[]>([]);

  // Refresh all resources when cluster changes
  const [metrics, { refetch: refetchMetrics }] = createResource(
    () => {
      const ctx = currentContext();
      const refresh = refreshTrigger();
      return { context: ctx, refresh };
    },
    async () => {
      try {
        const data = await api.getMetrics();
        console.log('Dashboard: Metrics fetched:', data);

        // Update history when new metrics arrive
        if (data?.cpu != null && data?.memory != null) {
          const cpuVal = typeof data.cpu === 'object' && 'percentage' in data.cpu
            ? data.cpu.percentage
            : Number(data.cpu);
          const memVal = typeof data.memory === 'object' && 'percentage' in data.memory
            ? data.memory.percentage
            : Number(data.memory);

          setCpuHistory(prev => [...prev.slice(-29), cpuVal]); // Keep last 30 points
          setMemoryHistory(prev => [...prev.slice(-29), memVal]);
        }

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
        console.log('Dashboard: Cost fetched:', cost);
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
  
  // Debug: Log cost resource state
  createEffect(() => {
    console.log('Dashboard: Cost resource state:', {
      loading: clusterCost.loading,
      error: clusterCost.error,
      hasData: !!clusterCost(),
      data: clusterCost(),
      context: currentContext(),
      refresh: refreshTrigger(),
    });
  });

  // Debug: Log metrics resource state
  createEffect(() => {
    console.log('Dashboard: Metrics resource state:', {
      loading: metrics.loading,
      error: metrics.error,
      hasData: !!metrics(),
      data: metrics(),
      context: currentContext(),
      refresh: refreshTrigger(),
    });
  });

  // Trigger initial fetch on mount and set up auto-refresh for real-time graphs
  onMount(() => {
    console.log('Dashboard: Component mounted, refetching metrics and cost');
    refetchMetrics();
    // Also try to fetch cost if not already loading
    if (!clusterCost.loading && !clusterCost()) {
      refetchCost();
    }

    // Auto-refresh metrics every 5 seconds for live graphs
    const refreshInterval = setInterval(() => {
      refetchMetrics();
    }, 5000);

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

      {/* Resource Usage Visualization - Enhanced */}
      <div class="card p-8 relative overflow-hidden">
        {/* Gradient background overlay */}
        <div class="absolute inset-0 opacity-5 pointer-events-none"
             style={{
               background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
             }} />

        {/* Animated background particles */}
        <div class="absolute top-4 right-4 w-32 h-32 rounded-full opacity-10 blur-3xl animate-pulse"
             style={{ background: '#06b6d4', 'animation-duration': '3s' }} />
        <div class="absolute bottom-4 left-4 w-32 h-32 rounded-full opacity-10 blur-3xl animate-pulse"
             style={{ background: '#8b5cf6', 'animation-duration': '4s', 'animation-delay': '1s' }} />

        <div class="relative z-10">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{
                     background: 'linear-gradient(135deg, #06b6d420 0%, #8b5cf620 100%)',
                     border: '1px solid rgba(139, 92, 246, 0.2)',
                   }}>
                <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="url(#iconGradient)" stroke-width="2">
                  <defs>
                    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#06b6d4" />
                      <stop offset="100%" stop-color="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Cluster Resource Usage
                </h2>
                <p class="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Real-time monitoring of cluster resources
                </p>
              </div>
            </div>

            {/* View Toggle Buttons */}
            <div class="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setMetricView('gauges')}
                class={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  metricView() === 'gauges' ? 'shadow-sm' : ''
                }`}
                style={{
                  background: metricView() === 'gauges' ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' : 'transparent',
                  color: metricView() === 'gauges' ? '#fff' : 'var(--text-secondary)',
                }}
                title="Circular gauges view"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                Gauges
              </button>
              <button
                onClick={() => setMetricView('charts')}
                class={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  metricView() === 'charts' ? 'shadow-sm' : ''
                }`}
                style={{
                  background: metricView() === 'charts' ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' : 'transparent',
                  color: metricView() === 'charts' ? '#fff' : 'var(--text-secondary)',
                }}
                title="Line charts view"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18" />
                  <path d="M18 17l-4-4-4 4-4-4" />
                </svg>
                Charts
              </button>
              <button
                onClick={() => setMetricView('both')}
                class={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  metricView() === 'both' ? 'shadow-sm' : ''
                }`}
                style={{
                  background: metricView() === 'both' ? 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' : 'transparent',
                  color: metricView() === 'both' ? '#fff' : 'var(--text-secondary)',
                }}
                title="Both gauges and charts"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Both
              </button>
            </div>
          </div>

          {/* Circular Gauges */}
          <Show when={metricView() === 'gauges' || metricView() === 'both'}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12 py-6">
              {/* CPU Gauge */}
              <div class="flex flex-col items-center">
              <Show
                when={!metrics.loading && !metrics.error && metrics()?.cpu != null}
                fallback={
                  <div class="flex flex-col items-center justify-center h-64">
                    <div class="spinner mb-3" style={{ width: '32px', height: '32px' }} />
                    <div class="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      {metrics.loading ? 'Loading metrics...' : 'No data available'}
                    </div>
                  </div>
                }
              >
                <CircularProgress
                  percentage={(() => {
                    const cpu = metrics()?.cpu;
                    if (typeof cpu === 'object' && 'percentage' in cpu) {
                      return cpu.percentage;
                    }
                    return Number(cpu) || 0;
                  })()}
                  color="#06b6d4"
                />
                <div class="mt-6 text-center">
                  <div class="flex items-center gap-2 justify-center mb-2">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ background: '#06b6d420' }}>
                      <CpuIcon />
                    </div>
                    <span class="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>CPU Usage</span>
                  </div>
                  <div class="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Average across all nodes
                  </div>
                </div>
              </Show>
            </div>

            {/* Memory Gauge */}
            <div class="flex flex-col items-center">
              <Show
                when={!metrics.loading && !metrics.error && metrics()?.memory != null}
                fallback={
                  <div class="flex flex-col items-center justify-center h-64">
                    <div class="spinner mb-3" style={{ width: '32px', height: '32px' }} />
                    <div class="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      {metrics.loading ? 'Loading metrics...' : 'No data available'}
                    </div>
                  </div>
                }
              >
                <CircularProgress
                  percentage={(() => {
                    const memory = metrics()?.memory;
                    if (typeof memory === 'object' && 'percentage' in memory) {
                      return memory.percentage;
                    }
                    return Number(memory) || 0;
                  })()}
                  color="#8b5cf6"
                />
                <div class="mt-6 text-center">
                  <div class="flex items-center gap-2 justify-center mb-2">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ background: '#8b5cf620' }}>
                      <MemoryIcon />
                    </div>
                    <span class="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Memory Usage</span>
                  </div>
                  <div class="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Average across all nodes
                  </div>
                </div>
              </Show>
            </div>
            </div>
          </Show>

          {/* Time-series graphs */}
          <Show when={metricView() === 'charts' || metricView() === 'both'}>
            <div class={metricView() === 'both' ? 'mt-8 pt-8 border-t' : 'py-6'} style={{ 'border-color': 'rgba(255,255,255,0.08)' }}>
            <h3 class="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18" />
                <path d="M18 17l-4-4-4 4-4-4" />
              </svg>
              Resource Trends (Last 30 data points)
              <span class="text-xs px-2 py-1 rounded-full ml-auto" style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}>
                Live • 5s refresh
              </span>
            </h3>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPU Trend Chart */}
              <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style={{ background: '#06b6d4' }} />
                    <span class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Usage History</span>
                  </div>
                  <Show when={cpuHistory().length > 0}>
                    <span class="text-xs font-mono px-2 py-1 rounded" style={{
                      background: '#06b6d420',
                      color: '#06b6d4',
                      border: '1px solid #06b6d440'
                    }}>
                      {cpuHistory()[cpuHistory().length - 1]?.toFixed(1)}%
                    </span>
                  </Show>
                </div>
                <Show
                  when={cpuHistory().length > 0}
                  fallback={
                    <div class="flex items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
                      <div class="text-center">
                        <div class="spinner mb-2" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                        <div class="text-xs">Collecting data...</div>
                      </div>
                    </div>
                  }
                >
                  <MiniLineChart
                    data={cpuHistory()}
                    color="#06b6d4"
                    label="CPU %"
                    height={140}
                  />
                </Show>
              </div>

              {/* Memory Trend Chart */}
              <div class="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style={{ background: '#8b5cf6' }} />
                    <span class="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Memory Usage History</span>
                  </div>
                  <Show when={memoryHistory().length > 0}>
                    <span class="text-xs font-mono px-2 py-1 rounded" style={{
                      background: '#8b5cf620',
                      color: '#8b5cf6',
                      border: '1px solid #8b5cf640'
                    }}>
                      {memoryHistory()[memoryHistory().length - 1]?.toFixed(1)}%
                    </span>
                  </Show>
                </div>
                <Show
                  when={memoryHistory().length > 0}
                  fallback={
                    <div class="flex items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
                      <div class="text-center">
                        <div class="spinner mb-2" style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                        <div class="text-xs">Collecting data...</div>
                      </div>
                    </div>
                  }
                >
                  <MiniLineChart
                    data={memoryHistory()}
                    color="#8b5cf6"
                    label="Memory %"
                    height={140}
                  />
                </Show>
              </div>
            </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Metrics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
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
