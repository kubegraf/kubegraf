/**
 * Container Status Calculation Utilities
 * 
 * Provides functions to calculate container status summaries
 * including ready counts for all container types.
 */

import { ContainerInfo, ContainerStatusSummary, ContainerType } from './containerTypes';

/**
 * Calculates container status summary from container info array
 */
export function calculateContainerStatus(containers: ContainerInfo[]): ContainerStatusSummary {
  const summary: ContainerStatusSummary = {
    total: containers.length,
    ready: 0,
    main: { total: 0, ready: 0 },
    init: { total: 0, ready: 0 },
    sidecar: { total: 0, ready: 0 },
  };

  containers.forEach(container => {
    // Count by type
    summary[container.type].total++;
    if (container.ready) {
      summary.ready++;
      summary[container.type].ready++;
    }
  });

  return summary;
}

/**
 * Formats container status as "ready/total" string
 */
export function formatContainerStatus(summary: ContainerStatusSummary): string {
  return `${summary.ready}/${summary.total}`;
}

/**
 * Formats container status with type breakdown
 * Example: "2/2 (main: 1/1, sidecar: 1/1)"
 */
export function formatContainerStatusDetailed(summary: ContainerStatusSummary): string {
  const parts: string[] = [];
  
  if (summary.main.total > 0) {
    parts.push(`main: ${summary.main.ready}/${summary.main.total}`);
  }
  if (summary.init.total > 0) {
    parts.push(`init: ${summary.init.ready}/${summary.init.total}`);
  }
  if (summary.sidecar.total > 0) {
    parts.push(`sidecar: ${summary.sidecar.ready}/${summary.sidecar.total}`);
  }

  const breakdown = parts.length > 0 ? ` (${parts.join(', ')})` : '';
  return `${summary.ready}/${summary.total}${breakdown}`;
}

/**
 * Gets status color class based on container status
 */
export function getContainerStatusColor(summary: ContainerStatusSummary): string {
  if (summary.ready === summary.total && summary.total > 0) {
    return 'text-green-400'; // All ready
  }
  if (summary.ready === 0) {
    return 'text-red-400'; // None ready
  }
  return 'text-yellow-400'; // Partially ready
}

/**
 * Groups containers by type
 */
export function groupContainersByType(containers: ContainerInfo[]): {
  main: ContainerInfo[];
  init: ContainerInfo[];
  sidecar: ContainerInfo[];
} {
  return {
    main: containers.filter(c => c.type === 'main'),
    init: containers.filter(c => c.type === 'init'),
    sidecar: containers.filter(c => c.type === 'sidecar'),
  };
}


