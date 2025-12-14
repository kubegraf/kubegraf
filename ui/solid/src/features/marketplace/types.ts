// Copyright 2025 KubeGraf Contributors

export interface MarketplaceApp {
  name: string;
  displayName: string;
  description: string;
  category: MarketplaceCategory;
  icon: string;
  version: string;
  chartRepo: string;
  chartName: string;
  installedInstances?: InstalledInstance[];
  isCustom?: boolean;
  tags?: string[];
  maintainer?: string;
  documentation?: string;
  clusterSupport?: ClusterSupport;
  sourceCitation?: string; // Source/reference for the app installation
}

export interface InstalledInstance {
  namespace: string;
  chart: string;
  version: string;
  releaseName: string;
  clusterName?: string;
  status?: InstallStatus;
  installedAt?: string;
}

export type MarketplaceCategory = 
  | 'kubernetes-essentials'
  | 'observability'
  | 'security'
  | 'service-mesh'
  | 'machine-learning'
  | 'database'
  | 'local-cluster';

export type InstallStatus = 
  | 'pending'
  | 'installing'
  | 'installed'
  | 'failed'
  | 'upgrading'
  | 'uninstalling';

export interface ClusterSupport {
  single: boolean;
  multi: boolean;
  namespaces: string[];
}

export interface MarketplaceCategoryInfo {
  id: MarketplaceCategory;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface MarketplaceCatalog {
  categories: MarketplaceCategoryInfo[];
  apps: MarketplaceApp[];
}

