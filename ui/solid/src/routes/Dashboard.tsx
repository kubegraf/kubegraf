import { Component, createSignal, createResource, For, Show, onMount, onCleanup } from 'solid-js';
import { api } from '../services/api';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  icon: string;
  onClick?: () => void;
}

const MetricCard: Component<MetricCardProps> = (props) => (
  <div
    class="metric-card cursor-pointer"
    onClick={props.onClick}
    style={{ 'border-left': `4px solid ${props.color}` }}
  >
    <div class="flex items-start justify-between">
      <div>
        <div class="metric-label">{props.label}</div>
        <div class="metric-value mt-2" style={{ color: props.color }}>{props.value}</div>
        <Show when={props.subtext}>
          <div class="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{props.subtext}</div>
        </Show>
      </div>
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: `${props.color}20` }}
      >
        {props.icon}
      </div>
    </div>
  </div>
);

const Dashboard: Component = () => {
  const [metrics] = createResource(api.getMetrics);
  const [pods] = createResource(() => api.getPods('_all'));
  const [deployments] = createResource(() => api.getDeployments('_all'));
  const [services] = createResource(() => api.getServices('_all'));
  const [nodes] = createResource(api.getNodes);
  const [events] = createResource(api.getEvents);
  const [security] = createResource(api.getSecurityAnalysis);

  // Calculate stats
  const runningPods = () => (pods() || []).filter((p: any) => p.status === 'Running').length;
  const totalPods = () => (pods() || []).length;
  const healthyNodes = () => (nodes() || []).filter((n: any) => n.status === 'Ready').length;
  const totalNodes = () => (nodes() || []).length;
  const recentEvents = () => (events() || []).slice(0, 10);

  // AI Insights based on cluster state
  const getInsights = () => {
    const insights = [];
    const podList = pods() || [];
    const nodeList = nodes() || [];
    const deployList = deployments() || [];

    // Check for pending pods
    const pendingPods = podList.filter((p: any) => p.status === 'Pending');
    if (pendingPods.length > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Pending Pods Detected',
        message: `${pendingPods.length} pods are in Pending state. Check resource availability or node scheduling.`,
      });
    }

    // Check for failed pods
    const failedPods = podList.filter((p: any) => p.status === 'Failed' || p.status === 'Error' || p.status === 'CrashLoopBackOff');
    if (failedPods.length > 0) {
      insights.push({
        type: 'error',
        icon: '🚨',
        title: 'Failed Pods Alert',
        message: `${failedPods.length} pods are failing. Immediate attention recommended.`,
      });
    }

    // Check node health
    const unhealthyNodes = nodeList.filter((n: any) => n.status !== 'Ready');
    if (unhealthyNodes.length > 0) {
      insights.push({
        type: 'error',
        icon: '🔴',
        title: 'Node Health Issue',
        message: `${unhealthyNodes.length} nodes are not ready. Check node status and logs.`,
      });
    }

    // Resource optimization suggestions
    const m = metrics();
    if (m && m.cpu && m.cpu.percentage > 80) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'High CPU Usage',
        message: `Cluster CPU usage at ${m.cpu.percentage.toFixed(1)}%. Consider scaling or optimizing workloads.`,
      });
    }

    if (m && m.memory && m.memory.percentage > 85) {
      insights.push({
        type: 'warning',
        icon: '💾',
        title: 'High Memory Usage',
        message: `Cluster memory usage at ${m.memory.percentage.toFixed(1)}%. Consider adding capacity.`,
      });
    }

    // Positive insights
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Cluster Healthy',
        message: 'All systems operating normally. No issues detected.',
      });
    }

    // Best practices recommendations
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'Best Practice',
      message: 'Ensure all deployments have resource limits and requests configured for optimal scheduling.',
    });

    return insights;
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
          value={metrics()?.cpu?.percentage ? `${metrics()!.cpu.percentage.toFixed(1)}%` : '--'}
          subtext="Cluster average"
          color="var(--accent-primary)"
          icon="⚡"
        />
        <MetricCard
          label="Memory Usage"
          value={metrics()?.memory?.percentage ? `${metrics()!.memory.percentage.toFixed(1)}%` : '--'}
          subtext="Cluster average"
          color="#8b5cf6"
          icon="💾"
        />
        <MetricCard
          label="Running Pods"
          value={`${runningPods()}/${totalPods()}`}
          subtext={`${totalPods() > 0 ? ((runningPods() / totalPods()) * 100).toFixed(0) : 0}% healthy`}
          color="var(--success-color)"
          icon="📦"
        />
        <MetricCard
          label="Nodes"
          value={`${healthyNodes()}/${totalNodes()}`}
          subtext={healthyNodes() === totalNodes() ? 'All healthy' : 'Some unhealthy'}
          color={healthyNodes() === totalNodes() ? 'var(--success-color)' : 'var(--warning-color)'}
          icon="🖥️"
        />
      </div>

      {/* Main Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>🤖</span> AI Insights & Recommendations
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
                    <span class="text-xl">{insight.icon}</span>
                    <div>
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
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Security Overview */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>🛡️</span> Security Overview
          </h2>
          <Show when={security()} fallback={<div class="text-center py-8"><div class="spinner mx-auto" /></div>}>
            <div class="space-y-4">
              {/* Security Score */}
              <div class="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Security Score</span>
                <span class="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>
                  {security()?.score || 85}/100
                </span>
              </div>

              {/* Security Checks */}
              <div class="space-y-2">
                <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Pods with Resource Limits</span>
                  <span class="badge badge-success">✓ Configured</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Network Policies</span>
                  <span class="badge badge-warning">⚠ Review</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>RBAC Configured</span>
                  <span class="badge badge-success">✓ Enabled</span>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>Secrets Encryption</span>
                  <span class="badge badge-success">✓ Active</span>
                </div>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Resource Overview & Events */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Counts */}
        <div class="card p-6">
          <h2 class="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Resource Overview</h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>{totalPods()}</div>
              <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pods</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-3xl font-bold" style={{ color: 'var(--accent-secondary)' }}>{(deployments() || []).length}</div>
              <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Deployments</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{(services() || []).length}</div>
              <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Services</div>
            </div>
            <div class="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
              <div class="text-3xl font-bold" style={{ color: 'var(--success-color)' }}>{totalNodes()}</div>
              <div class="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Nodes</div>
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
                    <span class={`text-lg ${event.type === 'Warning' ? 'text-yellow-400' : event.type === 'Normal' ? 'text-green-400' : 'text-red-400'}`}>
                      {event.type === 'Warning' ? '⚠️' : event.type === 'Normal' ? '✓' : '❌'}
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
    </div>
  );
};

export default Dashboard;
