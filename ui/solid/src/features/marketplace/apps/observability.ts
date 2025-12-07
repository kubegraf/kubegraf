// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const observabilityApps: MarketplaceApp[] = [
  {
    name: 'prometheus',
    displayName: 'Prometheus',
    description: 'Monitoring system and time series database for metrics',
    category: 'observability',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '25.8.0',
    chartRepo: 'https://prometheus-community.github.io/helm-charts',
    chartName: 'prometheus',
    tags: ['metrics', 'monitoring', 'alerting'],
    maintainer: 'Prometheus Community',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['monitoring', 'prometheus'],
    },
  },
  {
    name: 'grafana',
    displayName: 'Grafana',
    description: 'Analytics & monitoring dashboards for all your metrics',
    category: 'observability',
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    version: '7.0.19',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'grafana',
    tags: ['dashboards', 'visualization', 'metrics'],
    maintainer: 'Grafana Labs',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['monitoring', 'grafana'],
    },
  },
  {
    name: 'loki',
    displayName: 'Loki',
    description: 'Like Prometheus, but for logs - scalable log aggregation',
    category: 'observability',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    version: '5.41.4',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'loki-stack',
    tags: ['logs', 'aggregation', 'storage'],
    maintainer: 'Grafana Labs',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['monitoring', 'loki'],
    },
  },
  {
    name: 'tempo',
    displayName: 'Tempo',
    description: 'High-scale distributed tracing backend',
    category: 'observability',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    version: '1.7.1',
    chartRepo: 'https://grafana.github.io/helm-charts',
    chartName: 'tempo',
    tags: ['tracing', 'distributed-tracing', 'opentelemetry'],
    maintainer: 'Grafana Labs',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['monitoring', 'tempo'],
    },
  },
  {
    name: 'kube-prometheus-stack',
    displayName: 'Kube Prometheus Stack',
    description: 'Full Prometheus + Grafana + Alertmanager observability stack',
    category: 'observability',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '55.5.0',
    chartRepo: 'https://prometheus-community.github.io/helm-charts',
    chartName: 'kube-prometheus-stack',
    tags: ['full-stack', 'prometheus', 'grafana', 'alertmanager'],
    maintainer: 'Prometheus Community',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['monitoring'],
    },
  },
];


