// Copyright 2025 KubeGraf Contributors

import { InstallStatus, InstalledInstance, MarketplaceApp } from './types';

export interface InstallStatusInfo {
  status: InstallStatus;
  progress?: number;
  message?: string;
  error?: string;
  installedAt?: string;
  updatedAt?: string;
}

/**
 * Track installation status for apps
 */
class InstallStatusTracker {
  private statuses: Map<string, InstallStatusInfo> = new Map();

  /**
   * Get installation status for an app instance
   */
  getStatus(appName: string, namespace: string, clusterName?: string): InstallStatusInfo | undefined {
    const key = this.getKey(appName, namespace, clusterName);
    return this.statuses.get(key);
  }

  /**
   * Set installation status
   */
  setStatus(
    appName: string,
    namespace: string,
    status: InstallStatus,
    progress?: number,
    message?: string,
    error?: string,
    clusterName?: string
  ): void {
    const key = this.getKey(appName, namespace, clusterName);
    const now = new Date().toISOString();
    
    const existing = this.statuses.get(key);
    this.statuses.set(key, {
      status,
      progress,
      message,
      error,
      installedAt: status === 'installed' && !existing?.installedAt ? now : existing?.installedAt,
      updatedAt: now,
    });
  }

  /**
   * Update installation progress
   */
  updateProgress(
    appName: string,
    namespace: string,
    progress: number,
    message?: string,
    clusterName?: string
  ): void {
    const key = this.getKey(appName, namespace, clusterName);
    const existing = this.statuses.get(key);
    if (existing) {
      this.statuses.set(key, {
        ...existing,
        progress,
        message,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Mark installation as complete
   */
  markInstalled(
    appName: string,
    namespace: string,
    message?: string,
    clusterName?: string
  ): void {
    this.setStatus(appName, namespace, 'installed', 100, message, undefined, clusterName);
  }

  /**
   * Mark installation as failed
   */
  markFailed(
    appName: string,
    namespace: string,
    error: string,
    clusterName?: string
  ): void {
    this.setStatus(appName, namespace, 'failed', 0, undefined, error, clusterName);
  }

  /**
   * Clear status
   */
  clearStatus(appName: string, namespace: string, clusterName?: string): void {
    const key = this.getKey(appName, namespace, clusterName);
    this.statuses.delete(key);
  }

  /**
   * Get all statuses for an app across namespaces/clusters
   */
  getAllStatuses(appName: string): InstallStatusInfo[] {
    const results: InstallStatusInfo[] = [];
    for (const [key, status] of this.statuses.entries()) {
      if (key.startsWith(`${appName}:`)) {
        results.push(status);
      }
    }
    return results;
  }

  /**
   * Generate unique key for app instance
   */
  private getKey(appName: string, namespace: string, clusterName?: string): string {
    return clusterName 
      ? `${appName}:${namespace}:${clusterName}`
      : `${appName}:${namespace}`;
  }

  /**
   * Sync with installed instances from backend
   */
  syncWithInstalled(installed: InstalledInstance[]): void {
    for (const instance of installed) {
      const status: InstallStatus = instance.status || 'installed';
      this.setStatus(
        instance.releaseName,
        instance.namespace,
        status,
        status === 'installed' ? 100 : undefined,
        `Installed version ${instance.version}`,
        undefined,
        instance.clusterName
      );
    }
  }
}

export const installStatusTracker = new InstallStatusTracker();

