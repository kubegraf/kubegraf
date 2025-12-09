// Copyright 2025 KubeGraf Contributors
// Security event utilities

import { Incident } from '../../services/api';

export interface SecurityEvent {
  id: string;
  type: 'security';
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
  securityType: 'policy_violation' | 'rbac_violation' | 'network_policy' | 'pod_security' | 'other';
}

/**
 * Filter incidents for Security events
 */
export function filterSecurityEvents(incidents: Incident[]): SecurityEvent[] {
  return incidents
    .filter(inc => {
      const type = inc.type?.toLowerCase() || '';
      const message = inc.message?.toLowerCase() || '';
      const resourceKind = inc.resourceKind?.toLowerCase() || '';

      // Check for security-related types
      return type === 'security' ||
             type === 'security_policy' ||
             type === 'rbac_violation' ||
             type === 'network_policy' ||
             message.includes('security') ||
             message.includes('policy violation') ||
             message.includes('rbac') ||
             message.includes('unauthorized') ||
             message.includes('forbidden') ||
             message.includes('network policy') ||
             resourceKind === 'networkpolicy' ||
             resourceKind === 'securitypolicy';
    })
    .map(inc => {
      const message = inc.message?.toLowerCase() || '';
      let securityType: SecurityEvent['securityType'] = 'other';

      if (message.includes('policy violation') || message.includes('security policy')) {
        securityType = 'policy_violation';
      } else if (message.includes('rbac') || message.includes('unauthorized') || message.includes('forbidden')) {
        securityType = 'rbac_violation';
      } else if (message.includes('network policy')) {
        securityType = 'network_policy';
      } else if (message.includes('pod security')) {
        securityType = 'pod_security';
      }

      return {
        id: inc.id || `${inc.namespace}-${inc.resourceName}`,
        type: 'security' as const,
        resource: inc.resourceName,
        namespace: inc.namespace || 'default',
        resourceName: inc.resourceName,
        resourceKind: inc.resourceKind || 'Unknown',
        severity: (inc.severity === 'critical' ? 'critical' : 'warning') as 'critical' | 'warning',
        timestamp: inc.lastSeen || inc.firstSeen,
        message: inc.message || `Security issue detected for ${inc.resourceName}`,
        count: inc.count || 1,
        firstSeen: inc.firstSeen,
        lastSeen: inc.lastSeen,
        securityType,
      };
    });
}

/**
 * Get Security event summary
 */
export function getSecurityEventSummary(events: SecurityEvent[]): {
  total: number;
  critical: number;
  warning: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  events.forEach(e => {
    byType[e.securityType] = (byType[e.securityType] || 0) + 1;
  });

  return {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warning: events.filter(e => e.severity === 'warning').length,
    byType,
  };
}

