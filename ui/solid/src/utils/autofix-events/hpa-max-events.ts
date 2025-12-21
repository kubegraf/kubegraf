// Copyright 2025 KubeGraf Contributors
// HPA Max event utilities

import { Incident } from '../../services/api';

export interface HPAMaxEvent {
  id: string;
  type: 'hpa_max';
  resource: string;
  namespace: string;
  deploymentName: string;
  severity: 'critical' | 'warning';
  timestamp: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  durationMinutes: number;
  currentReplicas: number;
  maxReplicas: number;
}

/**
 * Filter incidents for HPA Max events (HPA running at max level for past 5 mins)
 */
export function filterHPAMaxEvents(incidents: Incident[]): HPAMaxEvent[] {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000);

  return incidents
    .filter(inc => {
      // Check v2 pattern field first
      let isHPA = false;
      if (inc.pattern) {
        // HPA-related patterns (if any exist in v2)
        isHPA = inc.pattern.includes('HPA') || inc.pattern.includes('AUTOSCALER');
      } else {
        // Fallback to legacy type field
        isHPA = inc.type === 'hpa_max' || inc.type === 'hpa_scaled';
      }
      
      // Also check message/description
      const message = (inc.message || inc.description || '').toLowerCase();
      isHPA = isHPA || message.includes('hpa') || message.includes('horizontal pod autoscaler');

      if (!isHPA) return false;

      // Check if it's been at max for at least 5 minutes
      const lastSeen = new Date(inc.lastSeen || inc.firstSeen).getTime();
      const firstSeen = new Date(inc.firstSeen).getTime();
      const durationMinutes = (lastSeen - firstSeen) / (60 * 1000);

      // Must be at max for at least 5 minutes
      return durationMinutes >= 5;
    })
    .map(inc => {
      // Use v2 resource structure if available, otherwise fallback to legacy fields
      const resourceName = inc.resource?.name || inc.resourceName || '';
      const namespace = inc.resource?.namespace || inc.namespace || 'default';
      
      const parts = resourceName.split('/');
      const deploymentName = parts[0] || resourceName;

      const lastSeen = new Date(inc.lastSeen || inc.firstSeen).getTime();
      const firstSeen = new Date(inc.firstSeen).getTime();
      const durationMinutes = (lastSeen - firstSeen) / (60 * 1000);

      // Extract replica info from message if available
      const message = inc.message || inc.description || '';
      const replicaMatch = message.match(/(\d+)\s*(?:replicas|pods)/i);
      const maxReplicas = replicaMatch ? parseInt(replicaMatch[1]) : 0;

      return {
        id: inc.id || `${namespace}-${deploymentName}`,
        type: 'hpa_max' as const,
        resource: resourceName,
        namespace,
        deploymentName,
        severity: (inc.severity === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        timestamp: inc.lastSeen || inc.firstSeen,
        message: message || `HPA for ${deploymentName} is at maximum replicas`,
        count: inc.occurrences || inc.count || 1,
        firstSeen: inc.firstSeen,
        lastSeen: inc.lastSeen,
        durationMinutes: Math.round(durationMinutes * 10) / 10,
        currentReplicas: maxReplicas,
        maxReplicas,
      };
    });
}

/**
 * Get HPA Max event summary
 */
export function getHPAMaxEventSummary(events: HPAMaxEvent[]): {
  total: number;
  critical: number;
  warning: number;
  uniqueDeployments: number;
  avgDurationMinutes: number;
} {
  const uniqueDeployments = new Set(events.map(e => `${e.namespace}/${e.deploymentName}`));
  const avgDuration = events.length > 0
    ? events.reduce((sum, e) => sum + e.durationMinutes, 0) / events.length
    : 0;

  return {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning: events.filter(e => e.severity === 'warning').length,
    uniqueDeployments: uniqueDeployments.size,
    avgDurationMinutes: Math.round(avgDuration * 10) / 10,
  };
}

