// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from './types';
import { kubernetesEssentialsApps } from './apps/kubernetes-essentials';
import { observabilityApps } from './apps/observability';
import { securityApps } from './apps/security';
import { serviceMeshApps } from './apps/service-mesh';
import { machineLearningApps } from './apps/machine-learning';
import { databaseApps } from './apps/database';
import { localClusterApps } from './apps/local-cluster';

/**
 * Complete marketplace catalog combining all categories
 */
export const marketplaceCatalog: MarketplaceApp[] = [
  ...kubernetesEssentialsApps,
  ...observabilityApps,
  ...securityApps,
  ...serviceMeshApps,
  ...machineLearningApps,
  ...databaseApps,
  ...localClusterApps,
];

/**
 * Get apps by category
 */
export const getAppsByCategory = (category: string): MarketplaceApp[] => {
  return marketplaceCatalog.filter(app => app.category === category);
};

/**
 * Get app by name
 */
export const getAppByName = (name: string): MarketplaceApp | undefined => {
  return marketplaceCatalog.find(app => app.name === name);
};

/**
 * Search apps by query
 */
export const searchApps = (query: string): MarketplaceApp[] => {
  const lowerQuery = query.toLowerCase();
  return marketplaceCatalog.filter(app =>
    app.name.toLowerCase().includes(lowerQuery) ||
    app.displayName.toLowerCase().includes(lowerQuery) ||
    app.description.toLowerCase().includes(lowerQuery) ||
    app.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

