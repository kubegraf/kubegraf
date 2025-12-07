// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp, InstalledInstance } from './types';

export interface ClusterInfo {
  name: string;
  type: 'local' | 'remote' | 'cloud';
  status: 'connected' | 'disconnected' | 'error';
  context?: string;
  namespace?: string;
}

export interface MultiClusterInstall {
  app: MarketplaceApp;
  clusters: ClusterInstallTarget[];
}

export interface ClusterInstallTarget {
  clusterName: string;
  namespace: string;
  values?: Record<string, any>;
}

/**
 * Clustering utilities for multi-cluster deployments
 */
export class ClusterManager {
  /**
   * Get available clusters
   */
  static async getAvailableClusters(): Promise<ClusterInfo[]> {
    try {
      const response = await fetch('/api/clusters');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.clusters || [];
    } catch {
      return [];
    }
  }

  /**
   * Check if app supports multi-cluster
   */
  static supportsMultiCluster(app: MarketplaceApp): boolean {
    return app.clusterSupport?.multi === true;
  }

  /**
   * Get recommended namespaces for app in cluster
   */
  static getRecommendedNamespaces(app: MarketplaceApp, clusterName?: string): string[] {
    if (!app.clusterSupport) {
      return ['default'];
    }

    // If cluster-specific namespace mapping exists, use it
    // Otherwise, use default namespaces
    return app.clusterSupport.namespaces || ['default'];
  }

  /**
   * Validate cluster installation target
   */
  static validateInstallTarget(
    app: MarketplaceApp,
    clusterName: string,
    namespace: string
  ): { valid: boolean; error?: string } {
    if (!this.supportsMultiCluster(app) && clusterName) {
      return {
        valid: false,
        error: `${app.displayName} does not support multi-cluster deployments`,
      };
    }

    const recommended = this.getRecommendedNamespaces(app, clusterName);
    if (recommended.length > 0 && !recommended.includes(namespace)) {
      return {
        valid: false,
        error: `Recommended namespace for ${app.displayName} is one of: ${recommended.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Group installed instances by cluster
   */
  static groupByCluster(instances: InstalledInstance[]): Map<string, InstalledInstance[]> {
    const grouped = new Map<string, InstalledInstance[]>();

    for (const instance of instances) {
      const cluster = instance.clusterName || 'default';
      if (!grouped.has(cluster)) {
        grouped.set(cluster, []);
      }
      grouped.get(cluster)!.push(instance);
    }

    return grouped;
  }

  /**
   * Get instances for app across all clusters
   */
  static getAppInstancesAcrossClusters(
    appName: string,
    instances: InstalledInstance[]
  ): InstalledInstance[] {
    return instances.filter(inst => 
      inst.releaseName === appName || inst.chart.includes(appName)
    );
  }

  /**
   * Check if app is installed in cluster
   */
  static isInstalledInCluster(
    appName: string,
    clusterName: string,
    instances: InstalledInstance[]
  ): boolean {
    return instances.some(inst =>
      (inst.releaseName === appName || inst.chart.includes(appName)) &&
      (inst.clusterName === clusterName || (!inst.clusterName && clusterName === 'default'))
    );
  }
}


