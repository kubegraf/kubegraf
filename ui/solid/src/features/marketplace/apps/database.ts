// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const databaseApps: MarketplaceApp[] = [
  {
    name: 'postgresql',
    displayName: 'PostgreSQL',
    description: 'Advanced open-source relational database with JSON support and ACID compliance',
    category: 'database',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    version: '16.2.0',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'postgresql',
    tags: ['database', 'sql', 'rdbms', 'postgres'],
    maintainer: 'Bitnami',
    sourceCitation: 'Helm Chart: https://charts.bitnami.com/bitnami | PostgreSQL: https://www.postgresql.org',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['default', 'database', 'postgresql'],
    },
  },
  {
    name: 'mysql',
    displayName: 'MySQL',
    description: 'Popular open-source relational database management system',
    category: 'database',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    version: '10.6.0',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'mysql',
    tags: ['database', 'sql', 'rdbms', 'mysql'],
    maintainer: 'Bitnami',
    sourceCitation: 'Helm Chart: https://charts.bitnami.com/bitnami | MySQL: https://www.mysql.com',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['default', 'database', 'mysql'],
    },
  },
  {
    name: 'memcached',
    displayName: 'Memcached',
    description: 'High-performance distributed memory caching system',
    category: 'database',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    version: '6.4.0',
    chartRepo: 'https://charts.bitnami.com/bitnami',
    chartName: 'memcached',
    tags: ['cache', 'memory', 'key-value', 'memcached'],
    maintainer: 'Bitnami',
    sourceCitation: 'Helm Chart: https://charts.bitnami.com/bitnami | Memcached: https://memcached.org',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['default', 'database', 'cache', 'memcached'],
    },
  },
];



