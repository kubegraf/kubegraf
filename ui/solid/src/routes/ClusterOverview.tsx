import { Component, For, Show, createMemo, onMount, createEffect } from 'solid-js';
import { clusterStatus, podsResource, deploymentsResource, servicesResource, nodesResource, refetchPods, refetchDeployments, refetchServices, refetchNodes } from '../stores/cluster';
import { setCurrentView } from '../stores/ui';

const ClusterOverview: Component = () => {
  // Trigger data fetch when component mounts and when cluster connects
  // Resources will automatically fetch when cluster is connected via resourceTrigger
  // Only manually refetch if cluster is connected but resources haven't loaded yet
  createEffect(() => {
    const connected = clusterStatus().connected;
    if (connected) {
      // Small delay to ensure cluster is ready, then check if we need to refetch
      const timeoutId = setTimeout(() => {
        const pods = podsResource();
        const deployments = deploymentsResource();
        const services = servicesResource();
        const nodes = nodesResource();
        
        // Only refetch if cluster is connected but we don't have data yet
        if (!pods && !podsResource.loading && !podsResource.error) {
          console.log('[ClusterOverview] Cluster connected but no pods data, refetching...');
          refetchPods();
        }
        if (!deployments && !deploymentsResource.loading && !deploymentsResource.error) {
          refetchDeployments();
        }
        if (!services && !servicesResource.loading && !servicesResource.error) {
          refetchServices();
        }
        if (!nodes && !nodesResource.loading && !nodesResource.error) {
          refetchNodes();
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  });

  // Debug: Log resource states
  createEffect(() => {
    const pods = podsResource();
    const deployments = deploymentsResource();
    const services = servicesResource();
    const nodes = nodesResource();
    
    console.log('[ClusterOverview] Resource states:', {
      podsLoading: podsResource.loading,
      podsError: podsResource.error,
      podsData: pods?.length || 0,
      podsSample: pods?.slice(0, 2).map((p: any) => ({ name: p.name, namespace: p.namespace, status: p.status })) || [],
      deploymentsLoading: deploymentsResource.loading,
      deploymentsError: deploymentsResource.error,
      deploymentsData: deployments?.length || 0,
      servicesLoading: servicesResource.loading,
      servicesData: services?.length || 0,
      nodesLoading: nodesResource.loading,
      nodesData: nodes?.length || 0,
      connected: clusterStatus().connected,
    });
    
    // If we have errors, log them
    if (podsResource.error) {
      console.error('[ClusterOverview] Pods fetch error:', podsResource.error);
    }
    if (deploymentsResource.error) {
      console.error('[ClusterOverview] Deployments fetch error:', deploymentsResource.error);
    }
  });

  // Derive cluster metrics from shared cluster resources so this view stays in sync
  const clusterMetrics = createMemo(() => {
    const pods = podsResource() || [];
    const deployments = deploymentsResource() || [];
    const services = servicesResource() || [];
    const nodes = nodesResource() || [];

    // Calculate statistics
    const podStats = {
      total: pods.length,
      running: pods.filter((p: any) => p.status === 'Running').length,
      pending: pods.filter((p: any) => p.status === 'Pending').length,
      failed: pods.filter((p: any) => p.status === 'Failed' || p.status === 'Error').length,
    };

    const deploymentStats = {
      total: deployments.length,
      ready: deployments.filter((d: any) => {
        if (!d.ready) return 0;
        const [ready, total] = String(d.ready).split('/').map(Number);
        return ready === total && total > 0;
      }).length,
      notReady: deployments.filter((d: any) => {
        if (!d.ready) return 0;
        const [ready, total] = String(d.ready).split('/').map(Number);
        return ready !== total || total === 0;
      }).length,
    };

    const nodeStats = {
      total: nodes.length,
      ready: nodes.filter((n: any) => n.status === 'Ready').length,
      notReady: nodes.filter((n: any) => n.status !== 'Ready').length,
    };

    return {
      pods: podStats,
      deployments: deploymentStats,
      services: { total: services.length },
      nodes: nodeStats,
    };
  });

  const healthScore = createMemo(() => {
    const metrics = clusterMetrics();
    if (!metrics) return 0;

    let score = 0;
    let total = 0;

    // Pod health (40% weight)
    if (metrics.pods.total > 0) {
      const podHealth = (metrics.pods.running / metrics.pods.total) * 100;
      score += podHealth * 0.4;
      total += 0.4;
    }

    // Deployment health (30% weight)
    if (metrics.deployments.total > 0) {
      const depHealth = (metrics.deployments.ready / metrics.deployments.total) * 100;
      score += depHealth * 0.3;
      total += 0.3;
    }

    // Node health (30% weight)
    if (metrics.nodes.total > 0) {
      const nodeHealth = (metrics.nodes.ready / metrics.nodes.total) * 100;
      score += nodeHealth * 0.3;
      total += 0.3;
    }

    return total > 0 ? Math.round(score / total) : 0;
  });

  const getHealthColor = (score: number) => {
    if (score >= 90) return { color: 'var(--success-color)' };
    if (score >= 70) return { color: 'var(--warning-color)' };
    return { color: 'var(--error-color)' };
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 90) return { 
      background: 'rgba(34, 197, 94, 0.1)', 
      borderColor: 'rgba(34, 197, 94, 0.3)',
      border: '1px solid rgba(34, 197, 94, 0.3)'
    };
    if (score >= 70) return { 
      background: 'rgba(245, 158, 11, 0.1)', 
      borderColor: 'rgba(245, 158, 11, 0.3)',
      border: '1px solid rgba(245, 158, 11, 0.3)'
    };
    return { 
      background: 'rgba(239, 68, 68, 0.1)', 
      borderColor: 'rgba(239, 68, 68, 0.3)',
      border: '1px solid rgba(239, 68, 68, 0.3)'
    };
  };

  return (
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Cluster Overview</h1>
        <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {clusterStatus().connected ? 'Real-time cluster health and resource summary' : 'Connect to a cluster to see overview'}
        </p>
      </div>

      <Show
        when={clusterStatus().connected}
        fallback={
          <div class="text-center py-12">
            <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>No cluster connected</p>
          </div>
        }
      >
        {(() => {
          const pods = podsResource();
          const deployments = deploymentsResource();
          const services = servicesResource();
          const nodes = nodesResource();
          
          const isLoading = (podsResource.loading && !pods) || 
                           (deploymentsResource.loading && !deployments) || 
                           (servicesResource.loading && !services) || 
                           (nodesResource.loading && !nodes);
          
          const hasError = podsResource.error || deploymentsResource.error || servicesResource.error || nodesResource.error;
          const metrics = clusterMetrics();
          
          // Show loading only if we don't have any data yet
          if (isLoading && !pods && !deployments && !services && !nodes) {
            return (
              <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ 'border-color': 'var(--accent-primary)' }}></div>
                <p class="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading cluster metrics...</p>
                {hasError && (
                  <p class="mt-2 text-xs" style={{ color: 'var(--error-color)' }}>
                    Some resources failed to load. Showing available data...
                  </p>
                )}
              </div>
            );
          }
          
          // Show error message if we have errors but no data
          if (hasError && !pods && !deployments && !services && !nodes) {
            return (
              <div class="text-center py-12">
                <p class="text-sm" style={{ color: 'var(--error-color)' }}>Failed to load cluster metrics</p>
                <button 
                  onClick={() => {
                    refetchPods();
                    refetchDeployments();
                    refetchServices();
                    refetchNodes();
                  }}
                  class="mt-4 px-4 py-2 rounded-lg text-sm"
                  style={{ 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Retry
                </button>
              </div>
            );
          }
          
          // If we have some data, show it even if some resources are still loading
          if (!metrics) {
            return (
              <div class="text-center py-12">
                <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>No cluster data available</p>
              </div>
            );
          }
          
          const score = healthScore();
          
          return (
            <>
              {/* Health Score Card */}
              <div class="mb-6 p-6 rounded-lg" style={{ ...getHealthBgColor(score), border: getHealthBgColor(score).border || '1px solid var(--border-color)' }}>
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cluster Health Score</h2>
                    <p class="text-sm" style={{ color: 'var(--text-secondary)' }}>Overall cluster health indicator</p>
                  </div>
                  <div class="text-right">
                    <div class="text-4xl font-bold" style={getHealthColor(score)}>
                      {score}%
                    </div>
                    <div class="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Health</div>
                  </div>
                </div>
              </div>

              {/* Resource Cards Grid */}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Pods Card */}
                <div class="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pods</h3>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{metrics.pods.total}</div>
                  <div class="text-xs space-y-1">
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Running:</span>
                      <span style={{ color: 'var(--success-color)' }}>{metrics.pods.running}</span>
                    </div>
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Pending:</span>
                      <span style={{ color: 'var(--warning-color)' }}>{metrics.pods.pending}</span>
                    </div>
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Failed:</span>
                      <span style={{ color: 'var(--error-color)' }}>{metrics.pods.failed}</span>
                    </div>
                  </div>
                </div>

                {/* Deployments Card */}
                <div class="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Deployments</h3>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{metrics.deployments.total}</div>
                  <div class="text-xs space-y-1">
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Ready:</span>
                      <span style={{ color: 'var(--success-color)' }}>{metrics.deployments.ready}</span>
                    </div>
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Not Ready:</span>
                      <span style={{ color: 'var(--error-color)' }}>{metrics.deployments.notReady}</span>
                    </div>
                  </div>
                </div>

                {/* Services Card */}
                <div class="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Services</h3>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{metrics.services.total}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Total services</div>
                </div>

                {/* Nodes Card */}
                <div class="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Nodes</h3>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div class="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{metrics.nodes.total}</div>
                  <div class="text-xs space-y-1">
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Ready:</span>
                      <span style={{ color: 'var(--success-color)' }}>{metrics.nodes.ready}</span>
                    </div>
                    <div class="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Not Ready:</span>
                      <span style={{ color: 'var(--error-color)' }}>{metrics.nodes.notReady}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div class="rounded-lg p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <h3 class="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button 
                    onClick={() => setCurrentView('pods')}
                    class="px-3 py-2 rounded text-sm text-center transition-colors cursor-pointer"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    View Pods
                  </button>
                  <button 
                    onClick={() => setCurrentView('deployments')}
                    class="px-3 py-2 rounded text-sm text-center transition-colors cursor-pointer"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    View Deployments
                  </button>
                  <button 
                    onClick={() => setCurrentView('services')}
                    class="px-3 py-2 rounded text-sm text-center transition-colors cursor-pointer"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    View Services
                  </button>
                  <button 
                    onClick={() => setCurrentView('nodes')}
                    class="px-3 py-2 rounded text-sm text-center transition-colors cursor-pointer"
                    style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: 'var(--text-primary)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                  >
                    View Nodes
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </Show>
    </div>
  );
};

export default ClusterOverview;


