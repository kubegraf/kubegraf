// Copyright 2025 KubeGraf Contributors
// Drift event utilities

import { Incident } from '../../services/api';

export interface DriftEvent {
  id: string;
  type: 'drift';
  resource: string;
  namespace: string;
  resourceName: string;
  resourceKind: string;
  severity: 'critical' | 'warning';
  timestamp: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  driftType: 'configuration' | 'resource' | 'annotation' | 'label' | 'other';
}

/**
 * Filter incidents for Drift events
 */
export function filterDriftEvents(incidents: Incident[]): DriftEvent[] {
  return incidents
    .filter(inc => {
      const type = inc.type?.toLowerCase() || '';
      const message = inc.message?.toLowerCase() || '';

      // Check for drift-related types
      return type === 'drift' ||
             type === 'configuration_drift' ||
             type === 'resource_drift' ||
             message.includes('drift') ||
             message.includes('configuration mismatch') ||
             message.includes('differs from expected') ||
             message.includes('out of sync') ||
             message.includes('does not match');
    })
    .map(inc => {
      const message = inc.message?.toLowerCase() || '';
      let driftType: DriftEvent['driftType'] = 'other';

      if (message.includes('configuration') || message.includes('config')) {
        driftType = 'configuration';
      } else if (message.includes('resource')) {
        driftType = 'resource';
      } else if (message.includes('annotation')) {
        driftType = 'annotation';
      } else if (message.includes('label')) {
        driftType = 'label';
      }

      return {
        id: inc.id || `${inc.namespace}-${inc.resourceName}`,
        type: 'drift' as const,
        resource: inc.resourceName,
        namespace: inc.namespace || 'default',
        resourceName: inc.resourceName,
        resourceKind: inc.resourceKind || 'Unknown',
        severity: (inc.severity === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        timestamp: inc.lastSeen || inc.firstSeen,
        message: inc.message || `Configuration drift detected for ${inc.resourceName}`,
        count: inc.count || 1,
        firstSeen: inc.firstSeen,
        lastSeen: inc.lastSeen,
        driftType,
      };
    });
}

/**
 * Get Drift event summary
 */
export function getDriftEventSummary(events: DriftEvent[]): {
  total: number;
  critical: number;
  warning: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  events.forEach(e => {
    byType[e.driftType] = (byType[e.driftType] || 0) + 1;
  });

  return {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning: events.filter(e => e.severity === 'warning').length,
    byType,
  };
}

