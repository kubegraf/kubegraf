// Source metadata and trust signals for Marketplace apps
// This is intentionally lightweight and curated, not a full provenance system.

import type { LegacyApp } from './adapters';

export interface AppSourceMetadata {
  publisher: string;
  helmRepo: string;
  chartName: string;
  chartVersion?: string;
  appVersion?: string;
  officialDocsUrl?: string;
  githubUrl?: string;
  chartDigest?: string;
  verified: boolean;
  verifiedBy?: string;
  trustLabel: string;    // e.g. "Verified publisher" | "Community source"
  integrityNote: string; // Human-readable integrity/provenance summary
}

// Simple curated index keyed by "<repo>::<chartName>" for well-known charts.
const CURATED_SOURCES: Record<string, Partial<AppSourceMetadata>> = {
  'https://kubernetes.github.io/ingress-nginx::ingress-nginx': {
    publisher: 'Kubernetes SIGs',
    officialDocsUrl: 'https://kubernetes.github.io/ingress-nginx/',
    githubUrl: 'https://github.com/kubernetes/ingress-nginx',
  },
  'https://prometheus-community.github.io/helm-charts::kube-prometheus-stack': {
    publisher: 'prometheus-community',
    officialDocsUrl: 'https://prometheus.io/',
    githubUrl: 'https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack',
  },
  'https://grafana.github.io/helm-charts::grafana': {
    publisher: 'Grafana Labs',
    officialDocsUrl: 'https://grafana.com/docs/',
    githubUrl: 'https://github.com/grafana/helm-charts',
  },
  'https://charts.bitnami.com/bitnami::postgresql': {
    publisher: 'Bitnami',
    officialDocsUrl: 'https://www.postgresql.org/',
    githubUrl: 'https://github.com/bitnami/charts',
  },
  'https://charts.bitnami.com/bitnami::mysql': {
    publisher: 'Bitnami',
    officialDocsUrl: 'https://www.mysql.com/',
    githubUrl: 'https://github.com/bitnami/charts',
  },
};

// Helm repositories we treat as "verified" publishers (trusted allowlist).
const VERIFIED_REPO_ALLOWLIST = new Set<string>([
  'https://kubernetes.github.io/ingress-nginx',
  'https://prometheus-community.github.io/helm-charts',
  'https://grafana.github.io/helm-charts',
  'https://charts.bitnami.com/bitnami',
]);

function buildKey(app: LegacyApp): string {
  return `${app.chartRepo}::${app.chartName}`;
}

export function getAppSourceMetadata(app: LegacyApp): AppSourceMetadata {
  const key = buildKey(app);
  const curated = CURATED_SOURCES[key] || {};

  const helmRepo = app.chartRepo || curated.helmRepo || '';
  const chartName = app.chartName || curated.chartName || app.name;

  const publisher =
    curated.publisher ||
    // If we later extend LegacyApp with maintainer, use that as a fallback:
    // app.maintainer ||
    app.displayName ||
    'Community source';

  const verified = helmRepo ? VERIFIED_REPO_ALLOWLIST.has(helmRepo) : false;
  const trustLabel = verified ? 'Verified publisher' : 'Community source';

  const integrityNote = verified
    ? "Repository is on KubeGraf's verified allowlist; chart is installed from an HTTPS Helm repo."
    : 'Source is treated as a community chart; chart is installed from its Helm repo without additional verification.';

  return {
    publisher,
    helmRepo,
    chartName,
    chartVersion: app.version,
    appVersion: app.version,
    officialDocsUrl: curated.officialDocsUrl,
    githubUrl: curated.githubUrl,
    chartDigest: curated.chartDigest,
    verified,
    verifiedBy: verified ? 'repo allowlist + curated index' : undefined,
    trustLabel,
    integrityNote,
  };
}