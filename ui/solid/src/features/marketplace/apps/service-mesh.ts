// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const serviceMeshApps: MarketplaceApp[] = [
  {
    name: 'istio',
    displayName: 'Istio Service Mesh',
    description: 'Connect, secure, control, and observe services across your cluster',
    category: 'service-mesh',
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    version: '1.20.0',
    chartRepo: 'https://istio-release.storage.googleapis.com/charts',
    chartName: 'istiod',
    tags: ['service-mesh', 'networking', 'security'],
    maintainer: 'Istio',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['istio-system'],
    },
  },
  {
    name: 'kiali',
    displayName: 'Kiali',
    description: 'Service mesh observability console for Istio. Visualize service topology, health, and traffic flow',
    category: 'service-mesh',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '1.73.0',
    chartRepo: 'https://kiali.org/helm-charts',
    chartName: 'kiali-server',
    tags: ['observability', 'istio', 'service-mesh', 'topology'],
    maintainer: 'Kiali',
    documentation: 'https://kiali.io/docs/',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['istio-system', 'kiali-operator'],
    },
  },
  {
    name: 'cilium',
    displayName: 'Cilium CNI',
    description: 'eBPF-based networking, observability, and security for Kubernetes',
    category: 'service-mesh',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    version: '1.14.5',
    chartRepo: 'https://helm.cilium.io/',
    chartName: 'cilium',
    tags: ['cni', 'ebpf', 'networking', 'security'],
    maintainer: 'Cilium',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['kube-system'],
    },
  },
];


