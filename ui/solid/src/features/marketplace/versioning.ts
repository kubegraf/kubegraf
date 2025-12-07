// Copyright 2025 KubeGraf Contributors

import { MarketplaceApp } from './types';

export interface VersionInfo {
  current: string;
  latest: string;
  available: string[];
  changelog?: string;
  upgradeAvailable: boolean;
}

/**
 * Version management utilities
 */
export class VersionManager {
  /**
   * Compare two version strings
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  static compareVersions(v1: string, v2: string): number {
    // Handle "Latest" special case
    if (v1 === 'Latest' && v2 === 'Latest') return 0;
    if (v1 === 'Latest') return 1;
    if (v2 === 'Latest') return -1;

    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  /**
   * Check if upgrade is available
   */
  static isUpgradeAvailable(current: string, latest: string): boolean {
    return this.compareVersions(current, latest) < 0;
  }

  /**
   * Get version info for an app
   */
  static getVersionInfo(app: MarketplaceApp, installedVersion?: string): VersionInfo {
    const current = installedVersion || app.version;
    const latest = app.version;
    const upgradeAvailable = installedVersion 
      ? this.isUpgradeAvailable(installedVersion, latest)
      : false;

    return {
      current,
      latest,
      available: [latest, ...this.getAvailableVersions(app)],
      upgradeAvailable,
    };
  }

  /**
   * Get available versions for an app (mock - in real implementation, fetch from chart repo)
   */
  private static getAvailableVersions(app: MarketplaceApp): string[] {
    // In a real implementation, this would fetch from the Helm chart repository
    // For now, return a mock list based on the current version
    const baseVersion = app.version.split('.');
    const versions: string[] = [];
    
    // Generate some mock versions
    for (let i = 0; i < 3; i++) {
      const patch = parseInt(baseVersion[2] || '0') - i;
      if (patch >= 0) {
        versions.push(`${baseVersion[0]}.${baseVersion[1]}.${patch}`);
      }
    }

    return versions.reverse();
  }

  /**
   * Format version for display
   */
  static formatVersion(version: string): string {
    if (version === 'Latest') return 'Latest';
    return `v${version}`;
  }

  /**
   * Validate version string
   */
  static isValidVersion(version: string): boolean {
    if (version === 'Latest') return true;
    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
    return semverRegex.test(version);
  }
}

