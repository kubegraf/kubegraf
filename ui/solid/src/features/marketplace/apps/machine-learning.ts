// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from '../types';

export const machineLearningApps: MarketplaceApp[] = [
  {
    name: 'mlflow',
    displayName: 'MLflow',
    description: 'Open source platform for managing the ML lifecycle, including experimentation, reproducibility, deployment, and a central model registry',
    category: 'machine-learning',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    version: '2.8.0',
    chartRepo: 'https://community-charts.github.io/helm-charts',
    chartName: 'mlflow',
    tags: ['mlops', 'experiment-tracking', 'model-registry'],
    maintainer: 'MLflow',
    documentation: 'https://mlflow.org/docs/latest/index.html',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['mlflow'],
    },
  },
  {
    name: 'feast',
    displayName: 'Feast Feature Store',
    description: 'Open source feature store for machine learning. Store, manage, and serve features for training and inference',
    category: 'machine-learning',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    version: '0.38.0',
    chartRepo: 'https://feast-charts.storage.googleapis.com',
    chartName: 'feast',
    tags: ['feature-store', 'ml', 'data'],
    maintainer: 'Feast',
    documentation: 'https://docs.feast.dev/',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['feast'],
    },
  },
  {
    name: 'kserve',
    displayName: 'KServe',
    description: 'Serverless inferencing for ML models on Kubernetes. High performance model serving with autoscaling',
    category: 'machine-learning',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    version: '0.12.0',
    chartRepo: 'https://kserve.github.io/kserve',
    chartName: 'kserve',
    tags: ['model-serving', 'inference', 'serverless'],
    maintainer: 'KServe',
    documentation: 'https://kserve.github.io/website/',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['kserve', 'kserve-system'],
    },
  },
  {
    name: 'bentoml',
    displayName: 'BentoML',
    description: 'Unified Model Serving Framework. Build, ship, and scale ML models with ease',
    category: 'machine-learning',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    version: '1.0.0',
    chartRepo: 'https://bentoml.github.io/helm-charts',
    chartName: 'bentoml',
    tags: ['model-serving', 'mlops', 'deployment'],
    maintainer: 'BentoML',
    documentation: 'https://docs.bentoml.com/',
    clusterSupport: {
      single: true,
      multi: true,
      namespaces: ['bentoml'],
    },
  },
];

