// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const securityApps: MarketplaceApp[] = [
  {
    name: 'cert-manager',
    displayName: 'cert-manager',
    description: 'Automatically provision and manage TLS certificates',
    category: 'security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    version: '1.13.3',
    chartRepo: 'https://charts.jetstack.io',
    chartName: 'cert-manager',
    tags: ['tls', 'certificates', 'ssl'],
    maintainer: 'Jetstack',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['cert-manager'],
    },
  },
  {
    name: 'vault',
    displayName: 'HashiCorp Vault',
    description: 'Secrets management, encryption, and privileged access',
    category: 'security',
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    version: '0.27.0',
    chartRepo: 'https://helm.releases.hashicorp.com',
    chartName: 'vault',
    tags: ['secrets', 'encryption', 'security'],
    maintainer: 'HashiCorp',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['vault'],
    },
  },
];


