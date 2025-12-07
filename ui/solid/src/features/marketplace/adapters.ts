// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp, InstalledInstance as MarketplaceInstalledInstance } from './types';

/**
 * Legacy App interface (for backward compatibility with Apps.tsx)
 */
export interface LegacyApp {
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon: string;
  version: string;
  chartRepo: string;
  chartName: string;
  installedInstances?: LegacyInstalledInstance[];
  isCustom?: boolean;
}

export interface LegacyInstalledInstance {
  namespace: string;
  chart: string;
  version: string;
  releaseName: string;
}

/**
 * Convert MarketplaceApp to LegacyApp for backward compatibility
 */
export function marketplaceAppToLegacyApp(marketplaceApp: MarketplaceApp): LegacyApp {
  return {
    name: marketplaceApp.name,
    displayName: marketplaceApp.displayName,
    description: marketplaceApp.description,
    category: marketplaceApp.category,
    icon: marketplaceApp.icon,
    version: marketplaceApp.version,
    chartRepo: marketplaceApp.chartRepo,
    chartName: marketplaceApp.chartName,
    installedInstances: marketplaceApp.installedInstances?.map(inst => ({
      namespace: inst.namespace,
      chart: inst.chart,
      version: inst.version,
      releaseName: inst.releaseName,
    })),
    isCustom: marketplaceApp.isCustom,
  };
}

/**
 * Convert LegacyApp to MarketplaceApp
 */
export function legacyAppToMarketplaceApp(legacyApp: LegacyApp): MarketplaceApp {
  return {
    name: legacyApp.name,
    displayName: legacyApp.displayName,
    description: legacyApp.description,
    category: legacyApp.category as any,
    icon: legacyApp.icon,
    version: legacyApp.version,
    chartRepo: legacyApp.chartRepo,
    chartName: legacyApp.chartName,
    installedInstances: legacyApp.installedInstances?.map(inst => ({
      namespace: inst.namespace,
      chart: inst.chart,
      version: inst.version,
      releaseName: inst.releaseName,
    })),
    isCustom: legacyApp.isCustom,
  };
}

/**
 * Map old category names to new category IDs
 */
export function mapLegacyCategoryToNew(category: string): string {
  const categoryMap: Record<string, string> = {
    'Networking': 'kubernetes-essentials',
    'CI/CD': 'kubernetes-essentials',
    'Observability': 'observability',
    'Security': 'security',
    'Data': 'database',
    'ML Apps': 'machine-learning',
    'Local Cluster': 'kubernetes-essentials',
  };
  
  return categoryMap[category] || category.toLowerCase().replace(/\s+/g, '-');
}

