/**
 * Container Table Utilities
 * 
 * Utilities for generating container table data including IDX mapping
 */

import { ContainerInfo, ContainerType } from './containerTypes';

export interface ContainerTableRow {
  idx: string; // I1, I2, M1, M2, etc.
  name: string;
  type: ContainerType;
  status: string;
  restarts: number;
  cpu: string;
  memory: string;
  age: string;
  ports: string;
  container: ContainerInfo;
}

/**
 * Generates IDX for containers based on type and index
 * Init containers: I1, I2, I3...
 * Main containers: M1, M2, M3...
 */
export function generateContainerIdx(type: ContainerType, index: number): string {
  const prefix = type === 'init' ? 'I' : 'M';
  return `${prefix}${index + 1}`;
}

/**
 * Formats container status for display
 */
export function formatContainerStatus(container: ContainerInfo): string {
  if (container.ready) {
    return container.state || 'Running';
  }
  if (container.state) {
    return container.state;
  }
  return 'Pending';
}

/**
 * Gets status color class
 */
export function getStatusColorClass(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower === 'running') {
    return 'text-green-400';
  }
  if (statusLower === 'waiting' || statusLower === 'pending') {
    return 'text-yellow-400';
  }
  if (statusLower === 'terminated' || statusLower === 'failed' || statusLower === 'error') {
    return 'text-red-400';
  }
  return 'text-gray-400';
}

/**
 * Formats ports array to string
 */
export function formatPorts(ports: number[] | string[] | undefined): string {
  if (!ports || ports.length === 0) return '-';
  return ports.join(', ');
}

/**
 * Calculates container age from startedAt timestamp
 */
export function calculateContainerAge(startedAt: string | undefined): string {
  if (!startedAt) return '-';
  
  try {
    const started = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - started.getTime();
    
    if (diffMs < 0) return '0s';
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (minutes < 60) {
      return `${minutes}m`;
    }
    if (hours < 24) {
      return `${hours}h`;
    }
    return `${days}d`;
  } catch {
    return '-';
  }
}

/**
 * Converts containers to table rows with IDX
 */
export function containersToTableRows(
  containers: ContainerInfo[],
  containerMetrics?: Record<string, { cpu: string; memory: string }>,
  containerPorts?: Record<string, number[]>
): ContainerTableRow[] {
  const initContainers: ContainerInfo[] = [];
  const mainContainers: ContainerInfo[] = [];
  
  // Separate containers by type
  containers.forEach(container => {
    if (container.type === 'init') {
      initContainers.push(container);
    } else {
      mainContainers.push(container);
    }
  });
  
  const rows: ContainerTableRow[] = [];
  
  // Add init containers first
  initContainers.forEach((container, index) => {
    const idx = generateContainerIdx('init', index);
    const metrics = containerMetrics?.[container.name];
    const ports = containerPorts?.[container.name];
    
    rows.push({
      idx,
      name: container.name,
      type: container.type,
      status: formatContainerStatus(container),
      restarts: container.restartCount || 0,
      cpu: metrics?.cpu || '-',
      memory: metrics?.memory || '-',
      age: calculateContainerAge(container.startedAt),
      ports: formatPorts(ports),
      container,
    });
  });
  
  // Add main containers
  mainContainers.forEach((container, index) => {
    const idx = generateContainerIdx('main', index);
    const metrics = containerMetrics?.[container.name];
    const ports = containerPorts?.[container.name];
    
    rows.push({
      idx,
      name: container.name,
      type: container.type,
      status: formatContainerStatus(container),
      restarts: container.restartCount || 0,
      cpu: metrics?.cpu || '-',
      memory: metrics?.memory || '-',
      age: calculateContainerAge(container.startedAt),
      ports: formatPorts(ports),
      container,
    });
  });
  
  return rows;
}


