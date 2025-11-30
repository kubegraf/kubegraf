import { Component, For, Show, createResource, createSignal } from 'solid-js';
import { api } from '../services/api';
import { namespace } from '../stores/cluster';

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
  const [selectedCategory, setSelectedCategory] = createSignal<string>('');

  const [categories] = createResource(api.getDiagnosticsCategories);

  const [diagnostics, { refetch }] = createResource(
    () => ({ ns: namespace(), cat: selectedCategory() }),
    async (params) => {
      const ns = params.ns === '_all' ? undefined : params.ns;
      const cat = params.cat || undefined;
      return api.runDiagnostics(ns, cat);
    }
  );

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
    const criticalWeight = summary.critical * 20;
    const warningWeight = summary.warning * 5;
    return Math.max(0, 100 - criticalWeight - warningWeight);
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Security & Diagnostics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Cluster health checks, security posture, and best practices analysis</p>
        </div>
        <button
          onClick={() => refetch()}
          class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Run Diagnostics
        </button>
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
      <div class="flex gap-2 flex-wrap">
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
      </div>

      {/* Findings List */}
      <div class="card p-6">
        <h3 class="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Findings ({diagnostics()?.total || 0})
        </h3>

        <Show when={diagnostics.loading}>
          <div class="text-center py-8">
            <div class="spinner mx-auto mb-4" />
            <p style={{ color: 'var(--text-muted)' }}>Running diagnostics...</p>
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

        <div class="space-y-3">
          <For each={diagnostics()?.findings || []}>
            {(finding: Finding) => (
              <div
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
      </div>

      {/* Best Practices */}
      <div class="card p-6">
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
    </div>
  );
};

export default Security;
