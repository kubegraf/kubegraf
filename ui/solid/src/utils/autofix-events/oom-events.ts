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
 * Supports both v2 incidents (pattern-based) and legacy incidents (type-based)
 */
export function filterOOMEvents(incidents: Incident[]): OOMEvent[] {
  return incidents
    .filter(inc => {
      // Check v2 pattern field first (case-insensitive)
      if (inc.pattern) {
        const patternUpper = inc.pattern.toUpperCase();
        return patternUpper === 'OOM_PRESSURE' || 
               patternUpper === 'OOM' ||
               patternUpper.includes('OOM');
      }
      // Fallback to legacy type field
      const type = (inc.type || '').toLowerCase();
      return type === 'oom' || type === 'oomkilled' || type.includes('oom');
    })
    .map(inc => {
      // Use v2 resource structure if available, otherwise fallback to legacy fields
      const resourceName = inc.resource?.name || inc.resourceName || '';
      const namespace = inc.resource?.namespace || inc.namespace || 'default';
      
      const parts = resourceName.split('/');
      const podName = parts[0] || resourceName;
      const containerName = parts.length > 1 ? parts[1] : undefined;

      return {
        id: inc.id || `${namespace}-${podName}`,
        type: 'oom' as const,
        resource: resourceName,
        namespace,
        podName,
        containerName,
        severity: (inc.severity === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        timestamp: inc.lastSeen || inc.firstSeen,
        message: inc.message || inc.description || `Pod ${podName} was OOM killed`,
        count: inc.occurrences || inc.count || 1,
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

