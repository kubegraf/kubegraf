// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const kubernetesEssentialsApps: MarketplaceApp[] = [
  {
    name: 'nginx-ingress',
    displayName: 'NGINX Ingress',
    description: 'Ingress controller for Kubernetes using NGINX as a reverse proxy',
    category: 'kubernetes-essentials',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    version: '4.9.0',
    chartRepo: 'https://kubernetes.github.io/ingress-nginx',
    chartName: 'ingress-nginx',
    tags: ['ingress', 'networking', 'load-balancer'],
    maintainer: 'Kubernetes',
    sourceCitation: 'Helm Chart: https://kubernetes.github.io/ingress-nginx | Official: https://kubernetes.github.io/ingress-nginx',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['ingress-nginx', 'default'],
    },
  },
  {
    name: 'argocd',
    displayName: 'Argo CD',
    description: 'Declarative GitOps continuous delivery tool for Kubernetes',
    category: 'kubernetes-essentials',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    version: '5.51.0',
    chartRepo: 'https://argoproj.github.io/argo-helm',
    chartName: 'argo-cd',
    tags: ['gitops', 'cicd', 'deployment'],
    maintainer: 'Argo Project',
    sourceCitation: 'Helm Chart: https://argoproj.github.io/argo-helm | Official: https://argo-cd.readthedocs.io',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['argocd'],
    },
  },
  {
    name: 'fluxcd',
    displayName: 'Flux CD',
    description: 'GitOps toolkit for continuous and progressive delivery',
    category: 'kubernetes-essentials',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    version: '2.12.0',
    chartRepo: 'https://fluxcd-community.github.io/helm-charts',
    chartName: 'flux2',
    tags: ['gitops', 'cicd'],
    maintainer: 'Flux Project',
    sourceCitation: 'Helm Chart: https://fluxcd-community.github.io/helm-charts | Official: https://fluxcd.io',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['flux-system'],
    },
  },
];



