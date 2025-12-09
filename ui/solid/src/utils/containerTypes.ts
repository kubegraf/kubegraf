/**
 * Container Types and Interfaces
 * 
 * Defines types for different container types in Kubernetes pods:
 * - Main containers (regular containers)
 * - Init containers (run before main containers)
 * - Sidecar containers (run alongside main containers)
 */

export type ContainerType = 'main' | 'init' | 'sidecar';

export interface ContainerInfo {
  name: string;
  type: ContainerType;
  image: string;
  ready?: boolean;
  state?: 'Running' | 'Waiting' | 'Terminated';
  restartCount?: number;
  containerID?: string;
  startedAt?: string;
  reason?: string;
  message?: string;
  exitCode?: number;
}

export interface ContainerStatusSummary {
  total: number;
  ready: number;
  main: {
    total: number;
    ready: number;
  };
  init: {
    total: number;
    ready: number;
  };
  sidecar: {
    total: number;
    ready: number;
  };
}

/**
 * Determines if a container is a sidecar based on common naming patterns
 * or annotations. This is a heuristic since Kubernetes doesn't explicitly
 * mark sidecars - they're just additional containers.
 */
export function isSidecarContainer(containerName: string, allContainers: string[]): boolean {
  // Common sidecar naming patterns
  const sidecarPatterns = [
    /sidecar/i,
    /proxy/i,
    /envoy/i,
    /istio/i,
    /linkerd/i,
    /fluentd/i,
    /fluent-bit/i,
    /log-agent/i,
    /metrics/i,
    /monitoring/i,
  ];

  // Check if name matches sidecar patterns
  if (sidecarPatterns.some(pattern => pattern.test(containerName))) {
    return true;
  }

  // If there are multiple containers and this isn't the first/main one,
  // it might be a sidecar (heuristic)
  if (allContainers.length > 1 && containerName !== allContainers[0]) {
    // Additional check: if it's not obviously a main container
    const mainPatterns = [/app/i, /server/i, /web/i, /api/i, /backend/i, /frontend/i];
    if (!mainPatterns.some(pattern => pattern.test(containerName))) {
      return true;
    }
  }

  return false;
}

