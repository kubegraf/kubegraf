// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const localClusterApps: MarketplaceApp[] = [
  {
    name: 'k3d',
    displayName: 'k3d - Local Kubernetes',
    description: 'Lightweight wrapper to run k3s in Docker. Perfect for local development and testing.',
    category: 'local-cluster',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    version: 'Latest',
    chartRepo: 'local-cluster',
    chartName: 'k3d',
    tags: ['local', 'development', 'docker', 'k3s'],
    maintainer: 'Rancher',
    sourceCitation: 'k3d Official Documentation - https://k3d.io',
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ['default'],
    },
  },
  {
    name: 'kind',
    displayName: 'kind - Kubernetes in Docker',
    description: 'Run local Kubernetes clusters using Docker container nodes. Great for CI/CD and development.',
    category: 'local-cluster',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    version: 'Latest',
    chartRepo: 'local-cluster',
    chartName: 'kind',
    tags: ['local', 'development', 'docker', 'ci-cd'],
    maintainer: 'Kubernetes SIGs',
    sourceCitation: 'kind Official Documentation - https://kind.sigs.k8s.io',
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ['default'],
    },
  },
  {
    name: 'minikube',
    displayName: 'Minikube - Local Kubernetes',
    description: 'Run Kubernetes locally. Minikube runs a single-node Kubernetes cluster inside a VM on your laptop.',
    category: 'local-cluster',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    version: 'Latest',
    chartRepo: 'local-cluster',
    chartName: 'minikube',
    tags: ['local', 'development', 'vm', 'single-node'],
    maintainer: 'Kubernetes',
    sourceCitation: 'Minikube Official Documentation - https://minikube.sigs.k8s.io',
    clusterSupport: {
      single: true,
      multi: false,
      namespaces: ['default'],
    },
  },
];

