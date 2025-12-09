// Copyright 2025 KubeGraf Contributors
// OOM (Out of Memory) event utilities

import { Incident } from '../../services/api';

export interface OOMEvent {
  id: string;
  type: 'oom';
  resource: string;
  namespace: string;
  podName: string;
  containerName?: string;
  severity: 'critical' | 'warning';
  timestamp: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Filter incidents for OOM events
 */
export function filterOOMEvents(incidents: Incident[]): OOMEvent[] {
  return incidents
    .filter(inc => inc.type === 'oom' || inc.type === 'oomkilled')
    .map(inc => {
      const parts = inc.resourceName.split('/');
      const podName = parts[0] || inc.resourceName;
      const containerName = parts.length > 1 ? parts[1] : undefined;

      return {
        id: inc.id || `${inc.namespace}-${podName}`,
        type: 'oom' as const,
        resource: inc.resourceName,
        namespace: inc.namespace || 'default',
        podName,
        containerName,
        severity: (inc.severity === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        timestamp: inc.lastSeen || inc.firstSeen,
        message: inc.message || `Pod ${podName} was OOM killed`,
        count: inc.count || 1,
        firstSeen: inc.firstSeen,
        lastSeen: inc.lastSeen,
      };
    });
}

/**
 * Get OOM event summary
 */
export function getOOMEventSummary(events: OOMEvent[]): {
  total: number;
  critical: number;
  warning: number;
  uniquePods: number;
} {
  const uniquePods = new Set(events.map(e => `${e.namespace}/${e.podName}`));
  return {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning: events.filter(e => e.severity === 'warning').length,
    uniquePods: uniquePods.size,
  };
}

