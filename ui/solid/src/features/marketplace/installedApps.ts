import type { InstalledInstance } from './types';
import { installStatusTracker } from './install-status';

/**
 * Raw installed Helm release returned by `/api/apps/installed`
 * (see backend `apps.go`).
 */
export interface InstalledHelmRelease {
  name: string;
  namespace: string;
  status?: string;
  version?: string; // app version
  chart?: string; // chart name + version (e.g. "ingress-nginx-4.9.0")
}

export function chartBaseName(chart?: string): string {
  if (!chart) return '';
  // Helm list returns `chart` like "<chartName>-<chartVersion>".
  // We only need a best-effort base name match; keep it simple and robust.
  const lower = chart.toLowerCase();
  // Strip the last "-<version>" segment if present.
  const idx = lower.lastIndexOf('-');
  if (idx <= 0) return lower;
  return lower.slice(0, idx);
}

export function matchesAppRelease(app: { name: string; chartName: string }, rel: InstalledHelmRelease): boolean {
  if (!rel) return false;
  const relName = (rel.name || '').toLowerCase();
  const appName = (app.name || '').toLowerCase();
  if (relName === appName) return true;

  const relChart = (rel.chart || '').toLowerCase();
  const appChart = (app.chartName || '').toLowerCase();
  if (!relChart || !appChart) return false;

  // Prefer exact base-name match; fallback to contains as a last resort.
  if (chartBaseName(relChart) === appChart) return true;
  return relChart.includes(appChart);
}

export function toInstalledInstance(rel: InstalledHelmRelease): InstalledInstance {
  const statusInfo = installStatusTracker.getStatus(rel.name, rel.namespace);
  return {
    namespace: rel.namespace,
    chart: rel.chart || '',
    version: rel.version || '',
    releaseName: rel.name,
    status: statusInfo?.status || 'installed',
  };
}

export function getInstalledInstancesForApp(
  app: { name: string; chartName: string },
  installed: InstalledHelmRelease[]
): InstalledInstance[] {
  const instances = (installed || [])
    .filter((r) => matchesAppRelease(app, r))
    .map((r) => toInstalledInstance(r));

  // Stable ordering: namespace then release
  return instances.sort((a, b) => {
    const ns = a.namespace.localeCompare(b.namespace);
    if (ns !== 0) return ns;
    return a.releaseName.localeCompare(b.releaseName);
  });
}

export function getInstalledNamespaces(instances: InstalledInstance[]): string[] {
  const set = new Set<string>();
  for (const i of instances || []) {
    if (i.namespace) set.add(i.namespace);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function formatInstalledNamespaces(instances: InstalledInstance[], maxShown = 2): string {
  const namespaces = getInstalledNamespaces(instances);
  if (namespaces.length === 0) return '';
  if (namespaces.length <= maxShown) return namespaces.join(', ');
  const shown = namespaces.slice(0, maxShown).join(', ');
  return `${shown} (+${namespaces.length - maxShown})`;
}


