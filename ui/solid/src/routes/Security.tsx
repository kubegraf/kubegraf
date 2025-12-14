import { Component, For, Show, createResource, createSignal, createEffect, onMount, onCleanup, createMemo } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';
import { settings } from '../stores/settings';
import { LoadingSpinner } from '../components/Loading';
import DiagnosticsControls from '../components/DiagnosticsControls';

interface Finding {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  resource: string;
  namespace: string;
  message: string;
  remediation: string;
  category: string;
}

interface DiagnosticsSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byCategory: Record<string, number>;
}

const Security: Component = () => {
  // Check for filter from Dashboard navigation
  const [initialFilter] = createSignal(() => {
    try {
      const stored = sessionStorage.getItem('securityFilter');
      if (stored) {
        const filter = JSON.parse(stored);
        sessionStorage.removeItem('securityFilter'); // Clear after reading
        return filter;
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  });

  const [selectedCategory, setSelectedCategory] = createSignal<string>(initialFilter()?.category || '');
  const [selectedSeverity, setSelectedSeverity] = createSignal<string>(initialFilter()?.severity || '');
  const [diagnosticsPage, setDiagnosticsPage] = createSignal<number>(1);
  const [vulnPage, setVulnPage] = createSignal<number>(1);
  const [diagnosticsProgress, setDiagnosticsProgress] = createSignal<string>('');
  const [lastDiagnosticsRun, setLastDiagnosticsRun] = createSignal<Date | null>(null);
  const itemsPerPage = 10;

  // Listen for filter changes from Dashboard
  onMount(() => {
    const handleFilterChange = (event: CustomEvent) => {
      const filter = event.detail;
      if (filter.category) setSelectedCategory(filter.category);
      if (filter.severity) setSelectedSeverity(filter.severity);
    };
    window.addEventListener('securityFilterChange', handleFilterChange as EventListener);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('securityFilterChange', handleFilterChange as EventListener);
    };
  });

  // Check if features are enabled
  const isDiagnosticsEnabled = () => {
    return settings().enableDiagnostics;
  };

  const isCVEEnabled = () => {
    return settings().enableCVEVulnerabilities;
  };

  const isSecurityChecksEnabled = () => {
    return settings().enableSecurityChecks;
  };

  const [categories] = createResource(api.getDiagnosticsCategories);

  const [diagnostics, { refetch }] = createResource(
    () => ({ ns: namespace(), cat: selectedCategory(), enabled: isDiagnosticsEnabled() }),
    async (params) => {
      if (!params.enabled) {
        return { findings: [], summary: { total: 0, critical: 0, warning: 0, info: 0, byCategory: {} }, total: 0 };
      }
      setDiagnosticsPage(1); // Reset page on filter change
      setDiagnosticsProgress('Initializing diagnostics...');
      const ns = params.ns === '_all' ? undefined : params.ns;
      const cat = params.cat || undefined;
      try {
        setDiagnosticsProgress(cat ? `Running ${cat} checks in parallel...` : 'Running all diagnostic checks in parallel...');
        // Add timeout to frontend request (45 seconds to match backend, with early timeout for better UX)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        try {
          const result = await api.runDiagnostics(ns, cat);
          clearTimeout(timeoutId);
          setDiagnosticsProgress('');
          setLastDiagnosticsRun(new Date());
          return result;
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            setDiagnosticsProgress('');
            // Return empty results instead of throwing to prevent infinite loading
            return { findings: [], summary: { total: 0, critical: 0, warning: 0, info: 0, byCategory: {} }, total: 0 };
          }
          throw fetchError;
        }
      } catch (error: any) {
        setDiagnosticsProgress('');
        // Return empty results instead of throwing to prevent infinite loading
        console.error('Diagnostics error:', error);
        return { findings: [], summary: { total: 0, critical: 0, warning: 0, info: 0, byCategory: {} }, total: 0 };
      }
    }
  );

  // Track scan trigger - use a counter that increments to force refetch
  const [scanKey, setScanKey] = createSignal(0);

  // Initialize vulnerabilities resource - fetches when key or severity changes
  const [vulnerabilities, { refetch: refetchVulns }] = createResource(
    () => {
      const sev = selectedSeverity();
      const key = scanKey();
      // Return a value that changes to trigger fetch
      return key > 0 ? { severity: sev, key } : null;
    },
    async (params) => {
      try {
        console.log('[Security] Fetching vulnerabilities with params:', params);
        const startTime = Date.now();
        const result = await api.scanVulnerabilities(params.severity || undefined);
        const duration = Date.now() - startTime;
        console.log(`[Security] Vulnerabilities fetched in ${duration}ms:`, result?.vulnerabilities?.length || 0, 'vulnerabilities');
        console.log('[Security] Result structure:', {
          hasVulnerabilities: !!result?.vulnerabilities,
          vulnArray: Array.isArray(result?.vulnerabilities),
          vulnLength: result?.vulnerabilities?.length,
          hasStats: !!result?.stats,
          hasLastRefresh: !!result?.lastRefresh,
          resultKeys: result ? Object.keys(result) : []
        });
        // Reset to page 1 when vulnerabilities change
        setVulnPage(1);
        // Ensure we always return a valid structure
        const response = {
          vulnerabilities: Array.isArray(result?.vulnerabilities) ? result.vulnerabilities : [],
          stats: result?.stats || {},
          lastRefresh: result?.lastRefresh || null
        };
        console.log('[Security] Returning response:', {
          vulnCount: response.vulnerabilities.length,
          hasStats: !!response.stats,
          hasLastRefresh: !!response.lastRefresh
        });
        return response;
      } catch (error) {
        console.error('[Security] Failed to scan vulnerabilities:', error);
        // Return empty result instead of throwing to prevent UI from breaking
        return { vulnerabilities: [], stats: {}, lastRefresh: null };
      }
    }
  );

  const [vulnStats] = createResource(api.getVulnerabilityStats);

  // Compute paginated diagnostics findings
  const paginatedDiagnostics = createMemo(() => {
    const data = diagnostics();
    if (!data || !Array.isArray(data.findings) || data.findings.length === 0) {
      return { list: [], totalPages: 0, startIdx: 0, endIdx: 0, total: 0 };
    }
    const allFindings = data.findings;
    const totalPages = Math.ceil(allFindings.length / itemsPerPage);
    const currentPage = diagnosticsPage();
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return {
      list: allFindings.slice(startIdx, endIdx),
      totalPages,
      startIdx,
      endIdx,
      total: allFindings.length
    };
  });

  // Compute paginated vulnerabilities
  const paginatedVulnerabilities = createMemo(() => {
    const data = vulnerabilities();
    console.log('[Security] paginatedVulnerabilities memo - data:', {
      hasData: !!data,
      hasVulnerabilities: !!data?.vulnerabilities,
      isArray: Array.isArray(data?.vulnerabilities),
      length: data?.vulnerabilities?.length || 0
    });
    if (!data || !Array.isArray(data.vulnerabilities) || data.vulnerabilities.length === 0) {
      console.log('[Security] paginatedVulnerabilities - returning empty');
      return { list: [], totalPages: 0, startIdx: 0, endIdx: 0, total: 0 };
    }
    const vulnList = data.vulnerabilities;
    const totalPages = Math.ceil(vulnList.length / itemsPerPage);
    const currentPage = vulnPage();
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const result = {
      list: vulnList.slice(startIdx, endIdx),
      totalPages,
      startIdx,
      endIdx,
      total: vulnList.length
    };
    console.log('[Security] paginatedVulnerabilities - result:', result);
    return result;
  });

  // Trigger initial scan on mount
  onMount(() => {
    console.log('[Security] Component mounted, triggering initial scan');
    setScanKey(1); // Trigger initial fetch
  });

  // Debug: Log resource state changes
  createEffect(() => {
    const data = vulnerabilities();
    const paginated = paginatedVulnerabilities();
    console.log('[Security] Vulnerabilities resource state:', {
      loading: vulnerabilities.loading,
      error: vulnerabilities.error,
      hasData: !!data,
      vulnCount: data?.vulnerabilities?.length || 0,
      scanKey: scanKey(),
      selectedSeverity: selectedSeverity(),
      paginatedTotal: paginated.total,
      paginatedListLength: paginated.list.length,
      dataStructure: data ? {
        hasVulnerabilities: !!data.vulnerabilities,
        vulnArrayLength: data.vulnerabilities?.length,
        isArray: Array.isArray(data.vulnerabilities),
        hasStats: !!data.stats,
        hasLastRefresh: !!data.lastRefresh
      } : null
    });
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--error-color)';
      case 'warning': return 'var(--warning-color)';
      case 'info': return 'var(--accent-primary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'info': return 'rgba(6, 182, 212, 0.1)';
      default: return 'var(--bg-tertiary)';
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'info': return 'rgba(6, 182, 212, 0.3)';
      default: return 'var(--border-color)';
    }
  };

  const calculateScore = () => {
    const summary = diagnostics()?.summary as DiagnosticsSummary;
    if (!summary || summary.total === 0) return 100;
    // Improved scoring: critical issues are severe, warnings moderate, info minor
    const criticalWeight = summary.critical * 25;  // Each critical = -25 points
    const warningWeight = summary.warning * 8;    // Each warning = -8 points
    const infoWeight = summary.info * 1;          // Each info = -1 point (minor impact)
    const score = Math.max(0, 100 - criticalWeight - warningWeight - infoWeight);
    return Math.round(score);
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Security & Diagnostics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Cluster health checks, security posture, vulnerability scanning, and best practices analysis</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const data = diagnostics();
              if (data) {
                const report = {
                  timestamp: new Date().toISOString(),
                  summary: data.summary,
                  findings: data.findings,
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kubegraf-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            title="Export diagnostic report"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
          <DiagnosticsControls
            onRun={() => {
              refetch().then(() => {
                setLastDiagnosticsRun(new Date());
              }).catch(err => {
                console.error('Diagnostics run failed:', err);
              });
            }}
            isRunning={diagnostics.loading}
            lastRunTime={lastDiagnosticsRun()}
          />
        </div>
      </div>

      {/* Score Overview */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="card p-6">
          <div class="text-center">
            <div class="text-5xl font-bold mb-2" style={{
              color: calculateScore() >= 80 ? 'var(--success-color)' :
                     calculateScore() >= 60 ? 'var(--warning-color)' : 'var(--error-color)'
            }}>
              {calculateScore()}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>Health Score</div>
            <div class="mt-4 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                class="h-full rounded-full transition-all"
                style={{
                  width: `${calculateScore()}%`,
                  background: calculateScore() >= 80 ? 'var(--success-color)' :
                             calculateScore() >= 60 ? 'var(--warning-color)' : 'var(--error-color)',
                }}
              />
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="text-center">
            <div class="text-3xl font-bold" style={{ color: 'var(--error-color)' }}>
              {diagnostics()?.summary?.critical || 0}
            </div>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Critical Issues</div>
          </div>
        </div>

        <div class="card p-6">
          <div class="text-center">
            <div class="text-3xl font-bold" style={{ color: 'var(--warning-color)' }}>
              {diagnostics()?.summary?.warning || 0}
            </div>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Warnings</div>
          </div>
        </div>

        <div class="card p-6">
          <div class="text-center">
            <div class="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              {diagnostics()?.summary?.info || 0}
            </div>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>Info</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div class="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setSelectedCategory('')}
          class="px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            background: selectedCategory() === '' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: selectedCategory() === '' ? 'white' : 'var(--text-secondary)',
          }}
        >
          All Categories
        </button>
        <For each={categories() || []}>
          {(cat: any) => (
            <button
              onClick={() => setSelectedCategory(cat.id)}
              class="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background: selectedCategory() === cat.id ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectedCategory() === cat.id ? 'white' : 'var(--text-secondary)',
              }}
            >
              {cat.name}
              <Show when={diagnostics()?.summary?.byCategory?.[cat.id]}>
                <span class="ml-1 opacity-70">({diagnostics()?.summary?.byCategory?.[cat.id]})</span>
              </Show>
            </button>
          )}
        </For>
        <div class="flex-1" />
        {/* Quick filter for single replica issues */}
        <Show when={diagnostics() && (diagnostics()?.findings || []).some((f: Finding) => f.rule === 'REL005')}>
          <button
            onClick={() => {
              // Filter to show only REL005 (single replica) findings
              const allFindings = diagnostics()?.findings || [];
              const singleReplicaFindings = allFindings.filter((f: Finding) => f.rule === 'REL005');
              if (selectedCategory() === 'reliability' && singleReplicaFindings.length > 0) {
                // If already on reliability, just scroll to first finding
                document.querySelector('[data-rule="REL005"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                setSelectedCategory('reliability');
                setTimeout(() => {
                  document.querySelector('[data-rule="REL005"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
              }
            }}
            class="px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2"
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'var(--warning-color)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
            title="Show single replica workloads"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Single Replica Issues
            <span class="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(245, 158, 11, 0.3)' }}>
              {(diagnostics()?.findings || []).filter((f: Finding) => f.rule === 'REL005').length}
            </span>
          </button>
        </Show>
      </div>

        {/* Findings List */}
        <Show when={isDiagnosticsEnabled()}>
          <div class="card p-6">
            <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Findings ({diagnostics()?.total || 0})
            </h3>

        <Show when={diagnostics.loading}>
          <div class="text-center py-8">
            <LoadingSpinner size="lg" showText={true} text={diagnosticsProgress() || 'Running diagnostics in parallel...'} />
            <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Optimized with parallel execution and caching
            </p>
          </div>
        </Show>

        <Show when={!diagnostics.loading && (diagnostics()?.findings?.length || 0) === 0}>
          <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            <svg class="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg">All checks passed!</p>
            <p class="text-sm">No issues found in the selected scope.</p>
          </div>
        </Show>

        {/* Always use pagination for diagnostics */}
        <Show when={!diagnostics.loading && paginatedDiagnostics().total > 0}>
          <div class="space-y-3">
            <For each={paginatedDiagnostics().list}>
              {(finding: Finding) => (
                <div
                  data-rule={finding.rule}
                  class="p-4 rounded-lg border"
                  style={{
                    background: getSeverityBg(finding.severity),
                    'border-color': getSeverityBorder(finding.severity),
                  }}
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-3 flex-1">
                      <div class="mt-0.5">
                        {finding.severity === 'critical' ? (
                          <svg class="w-5 h-5" style={{ color: 'var(--error-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : finding.severity === 'warning' ? (
                          <svg class="w-5 h-5" style={{ color: 'var(--warning-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg class="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-medium" style={{ color: 'var(--text-primary)' }}>{finding.rule}</span>
                          <span class="px-2 py-0.5 rounded text-xs" style={{
                            background: getSeverityBg(finding.severity),
                            color: getSeverityColor(finding.severity),
                            border: `1px solid ${getSeverityBorder(finding.severity)}`
                          }}>
                            {finding.severity}
                          </span>
                          <span class="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            {finding.category}
                          </span>
                        </div>
                        <div class="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{finding.message}</div>
                        <div class="text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span class="font-mono">{finding.resource}</span>
                          {finding.namespace && <span> in {finding.namespace}</span>}
                        </div>
                        <Show when={finding.remediation}>
                          <div class="mt-2 text-xs flex items-start gap-1" style={{ color: 'var(--accent-primary)' }}>
                            <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{finding.remediation}</span>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Pagination Controls - Always show when there are findings */}
          <div class="flex items-center justify-between mt-6 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing {paginatedDiagnostics().startIdx + 1}-{Math.min(paginatedDiagnostics().endIdx, paginatedDiagnostics().total)} of {paginatedDiagnostics().total} findings
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={() => setDiagnosticsPage(Math.max(1, diagnosticsPage() - 1))}
                disabled={diagnosticsPage() === 1}
                class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: diagnosticsPage() === 1 ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                  color: diagnosticsPage() === 1 ? 'var(--text-muted)' : 'white' 
                }}
              >
                Previous
              </button>
              <div class="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginatedDiagnostics().totalPages) }, (_, i) => {
                  const totalPages = paginatedDiagnostics().totalPages;
                  const currentPage = diagnosticsPage();
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      onClick={() => setDiagnosticsPage(pageNum)}
                      class={`px-3 py-1.5 rounded text-sm transition-colors ${
                        pageNum === currentPage ? 'font-bold' : ''
                      }`}
                      style={{
                        background: pageNum === currentPage ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: pageNum === currentPage ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setDiagnosticsPage(Math.min(paginatedDiagnostics().totalPages, diagnosticsPage() + 1))}
                disabled={diagnosticsPage() === paginatedDiagnostics().totalPages}
                class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: diagnosticsPage() === paginatedDiagnostics().totalPages ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                  color: diagnosticsPage() === paginatedDiagnostics().totalPages ? 'var(--text-muted)' : 'white' 
                }}
              >
                Next
              </button>
            </div>
          </div>
        </Show>
          </div>
        </Show>

        <Show when={!isDiagnosticsEnabled()}>
          <div class="card p-6">
            <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p class="text-lg mb-2">Diagnostics are disabled</p>
              <p class="text-sm">Enable Diagnostics in Settings to run health checks</p>
            </div>
          </div>
        </Show>

      {/* High Availability Section */}
      <Show when={isSecurityChecksEnabled()}>
        <div class="card p-6 mt-6">
          <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            High Availability (HA) Recommendations
          </h3>
          <div class="space-y-4">
            <div class="p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              'border-color': 'var(--warning-color)' 
            }}>
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--warning-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div class="flex-1">
                  <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Single Replica Workloads</h4>
                  <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Deployments and StatefulSets with only 1 replica are at high risk. At least 2 replicas are recommended for production workloads to ensure high availability.
                  </p>
                  <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                    <p><strong>Check:</strong> REL005 - Single Replica Deployment/StatefulSet</p>
                    <p><strong>Impact:</strong> No redundancy - single point of failure</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(6, 182, 212, 0.1)', 
              'border-color': 'var(--accent-primary)' 
            }}>
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="flex-1">
                  <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Pod Anti-Affinity</h4>
                  <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Multi-replica workloads should use podAntiAffinity to spread pods across different nodes, preventing all replicas from being on the same node.
                  </p>
                  <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                    <p><strong>Check:</strong> REL007 - No Anti-Affinity</p>
                    <p><strong>Recommendation:</strong> Add podAntiAffinity rules to pod templates</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg border-l-4" style={{ 
              background: 'rgba(6, 182, 212, 0.1)', 
              'border-color': 'var(--accent-primary)' 
            }}>
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div class="flex-1">
                  <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Pod Disruption Budget (PDB)</h4>
                  <p class="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    PodDisruptionBudgets ensure that a minimum number of pods remain available during voluntary disruptions (node drains, cluster upgrades, etc.).
                  </p>
                  <div class="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                    <p><strong>Check:</strong> REL006 - Missing PDB</p>
                    <p><strong>Recommendation:</strong> Create PDBs for all production workloads with 2+ replicas</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Best Practices Summary</h4>
              <ul class="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <li>• Use at least 2 replicas for production workloads</li>
                <li>• Configure podAntiAffinity to spread pods across nodes</li>
                <li>• Create PodDisruptionBudgets for multi-replica workloads</li>
                <li>• Consider using topologySpreadConstraints for advanced placement</li>
                <li>• Monitor pod distribution across nodes regularly</li>
              </ul>
            </div>
          </div>
        </div>
      </Show>

      {/* Best Practices */}
      <div class="card p-6 mt-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Security Best Practices
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Pod Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Run containers as non-root user</li>
              <li>- Use read-only root filesystem</li>
              <li>- Drop all capabilities and add only needed ones</li>
              <li>- Use Pod Security Standards</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Network Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Implement NetworkPolicies</li>
              <li>- Use TLS for all communications</li>
              <li>- Restrict egress traffic</li>
              <li>- Use service mesh for mTLS</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Access Control</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Use RBAC with least privilege</li>
              <li>- Avoid cluster-admin bindings</li>
              <li>- Use dedicated service accounts</li>
              <li>- Enable audit logging</li>
            </ul>
          </div>
          <div class="p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <h4 class="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Image Security</h4>
            <ul class="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>- Scan images for vulnerabilities</li>
              <li>- Use trusted base images</li>
              <li>- Sign and verify images</li>
              <li>- Keep images up to date</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Vulnerabilities Section */}
      <Show when={isCVEEnabled()}>
          <div class="card p-6 mt-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                CVE Vulnerabilities (NIST NVD)
              </h3>
              <div class="flex items-center gap-2">
            <select
              value={selectedSeverity()}
              onChange={(e) => setSelectedSeverity(e.currentTarget.value)}
              class="px-3 py-1.5 rounded text-sm"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <button
              onClick={() => api.refreshVulnerabilities().then(() => refetchVulns())}
              class="px-3 py-1.5 rounded text-sm transition-colors"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              title="Refresh NVD data"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={async () => {
                console.log('[Security] Scan Cluster button clicked');
                // Clear severity filter and trigger scan
                setSelectedSeverity('');
                setScanKey(prev => prev + 1); // This will trigger the resource to refetch
                // Also manually refetch to ensure it happens
                setTimeout(() => {
                  console.log('[Security] Manually refetching vulnerabilities');
                  refetchVulns();
                }, 50);
              }}
              class="px-3 py-1.5 rounded text-sm transition-colors"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              Scan Cluster
            </button>
              </div>
            </div>

        {/* Stats - Show loading or data */}
        <Show when={vulnStats.loading} fallback={
          <Show when={vulnStats()}>
            {(stats: any) => (
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats().total || 0}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Total CVEs</div>
                </div>
                <div class="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                  <div class="text-2xl font-bold" style={{ color: 'var(--error-color)' }}>{stats().critical || 0}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Critical</div>
                </div>
                <div class="p-3 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <div class="text-2xl font-bold" style={{ color: 'var(--warning-color)' }}>{stats().high || 0}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>High</div>
                </div>
                <div class="p-3 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                  <div class="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>{stats().medium || 0}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>Medium</div>
                </div>
                <div class="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats().cveCount || 0}</div>
                  <div class="text-xs" style={{ color: 'var(--text-secondary)' }}>CVE Cache</div>
                </div>
              </div>
            )}
          </Show>
        }>
          <div class="text-center py-4" style={{ color: 'var(--text-secondary)' }}>Loading vulnerability stats...</div>
        </Show>

        {/* Vulnerability List with Pagination */}
        <Show when={vulnerabilities.loading}>
          <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <LoadingSpinner size="lg" showText={true} text="Scanning cluster for vulnerabilities..." />
            <p class="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>This may take a few moments</p>
          </div>
        </Show>

        <Show when={vulnerabilities.error}>
          <div class="text-center py-8" style={{ color: 'var(--error-color)' }}>
            <p class="mb-2">Error scanning for vulnerabilities</p>
            <p class="text-xs" style={{ color: 'var(--text-muted)' }}>{String(vulnerabilities.error)}</p>
            <button
              onClick={() => {
                setScanKey(prev => prev + 1);
                setTimeout(() => refetchVulns(), 50);
              }}
              class="mt-4 px-4 py-2 rounded text-sm transition-colors"
              style={{ background: 'var(--accent-primary)', color: 'white' }}
            >
              Retry Scan
            </button>
          </div>
        </Show>

        {/* Debug info */}
        {(() => {
          const data = vulnerabilities();
          const paginated = paginatedVulnerabilities();
          console.log('[Security] Render check - vulnerabilities:', {
            loading: vulnerabilities.loading,
            error: vulnerabilities.error,
            hasData: !!data,
            vulnCount: data?.vulnerabilities?.length || 0,
            paginatedTotal: paginated.total,
            shouldShowList: !vulnerabilities.loading && !vulnerabilities.error && paginated.total > 0
          });
          return null;
        })()}

        <Show when={!vulnerabilities.loading && !vulnerabilities.error && vulnerabilities() && (vulnerabilities()?.vulnerabilities || []).length === 0}>
          <div class="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <svg class="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="mb-2">No vulnerabilities found matching the selected criteria.</p>
            <p class="text-xs" style={{ color: 'var(--text-muted)' }}>Click "Scan Cluster" to scan for vulnerabilities.</p>
          </div>
        </Show>

        <Show when={!vulnerabilities.loading && !vulnerabilities.error && paginatedVulnerabilities().total > 0}>
          <div class="space-y-3">
            <For each={paginatedVulnerabilities().list}>
              {(vuln: any) => (
                <div
                  class="p-4 rounded-lg border"
                  style={{
                    background: vuln.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' :
                               vuln.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.1)' :
                               'rgba(6, 182, 212, 0.1)',
                    'border-color': vuln.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' :
                                  vuln.severity === 'HIGH' ? 'rgba(245, 158, 11, 0.3)' :
                                  'rgba(6, 182, 212, 0.3)',
                  }}
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{vuln.cveId}</span>
                        <span class="px-2 py-0.5 rounded text-xs font-medium" style={{
                          background: vuln.severity === 'CRITICAL' ? 'var(--error-color)' :
                                     vuln.severity === 'HIGH' ? 'var(--warning-color)' :
                                     'var(--accent-primary)',
                          color: 'white',
                        }}>
                          {vuln.severity}
                        </span>
                        <span class="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          CVSS: {vuln.cvssScore?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                      <div class="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{vuln.description}</div>
                      <div class="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        <span class="font-mono">{vuln.affectedImage}</span>
                        {vuln.namespace && <span> in {vuln.namespace}/{vuln.podName}</span>}
                        {vuln.containerName && <span> ({vuln.containerName})</span>}
                      </div>
                      <Show when={vuln.remediation}>
                        <div class="mt-2 text-xs flex items-start gap-1" style={{ color: 'var(--accent-primary)' }}>
                          <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{vuln.remediation}</span>
                        </div>
                      </Show>
                      <Show when={vuln.references && vuln.references.length > 0}>
                        <div class="mt-2 flex flex-wrap gap-2">
                          <For each={vuln.references.slice(0, 3)}>
                            {(ref: string) => (
                              <a
                                href={ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs px-2 py-1 rounded"
                                style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
                              >
                                Reference
                              </a>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Vulnerability Pagination */}
          <div class="flex items-center justify-between mt-6 pt-4 border-t" style={{ 'border-color': 'var(--border-color)' }}>
            <div class="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing {paginatedVulnerabilities().startIdx + 1}-{Math.min(paginatedVulnerabilities().endIdx, paginatedVulnerabilities().total)} of {paginatedVulnerabilities().total} vulnerabilities
            </div>
            <div class="flex items-center gap-2">
              <button
                onClick={() => setVulnPage(Math.max(1, vulnPage() - 1))}
                disabled={vulnPage() === 1}
                class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: vulnPage() === 1 ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                  color: vulnPage() === 1 ? 'var(--text-muted)' : 'white' 
                }}
              >
                Previous
              </button>
              <div class="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginatedVulnerabilities().totalPages) }, (_, i) => {
                  const totalPages = paginatedVulnerabilities().totalPages;
                  const currentPage = vulnPage();
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      onClick={() => setVulnPage(pageNum)}
                      class={`px-3 py-1.5 rounded text-sm transition-colors ${
                        pageNum === currentPage ? 'font-bold' : ''
                      }`}
                      style={{
                        background: pageNum === currentPage ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: pageNum === currentPage ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setVulnPage(Math.min(paginatedVulnerabilities().totalPages, vulnPage() + 1))}
                disabled={vulnPage() === paginatedVulnerabilities().totalPages}
                class="px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: vulnPage() === paginatedVulnerabilities().totalPages ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                  color: vulnPage() === paginatedVulnerabilities().totalPages ? 'var(--text-muted)' : 'white' 
                }}
              >
                Next
              </button>
            </div>
          </div>
        </Show>

        <Show when={vulnerabilities() && vulnerabilities()?.lastRefresh}>
          <div class="mt-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Last NVD refresh: {new Date(vulnerabilities()?.lastRefresh || '').toLocaleString()}
          </div>
        </Show>
          </div>
        </Show>

      <Show when={!isCVEEnabled()}>
          <div class="card p-6 mt-6">
            <div class="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-lg mb-2">CVE Vulnerabilities are disabled</p>
              <p class="text-sm">Enable CVE Vulnerabilities (NIST NVD) in Settings to scan for vulnerabilities</p>
            </div>
          </div>
        </Show>
    </div>
  );
};

export default Security;
