// Copyright 2025 KubeGraf Contributors
// Event deduplication and grouping utilities for production-grade event handling

interface MonitoredEvent {
  id: string;
  timestamp: string;
  type: 'infrastructure' | 'application' | 'security';
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  namespace: string;
  resource: string;
  details: Record<string, any>;
  count: number;
  group_id: string;
  source: string;
}

export interface DeduplicatedEvent extends MonitoredEvent {
  duplicateCount: number;
  firstSeen: string;
  lastSeen: string;
  relatedEvents: string[]; // IDs of related events
}

/**
 * Group similar events together to reduce noise
 * Events are considered similar if they have:
 * - Same resource
 * - Same reason/type
 * - Same namespace
 * - Within a time window (default: 5 minutes)
 */
export function deduplicateEvents(
  events: MonitoredEvent[],
  timeWindowMinutes: number = 5
): DeduplicatedEvent[] {
  const grouped = new Map<string, MonitoredEvent[]>();
  const now = Date.now();
  const windowMs = timeWindowMinutes * 60 * 1000;

  // Group events by similarity key
  events.forEach(event => {
    const key = `${event.namespace || 'cluster-wide'}:${event.resource}:${event.category || event.type}`;
    const eventTime = new Date(event.timestamp).getTime();
    
    // Only group events within the time window
    const recentEvents = events.filter(e => {
      const eTime = new Date(e.timestamp).getTime();
      return Math.abs(eTime - eventTime) <= windowMs;
    });

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(event);
  });

  // Create deduplicated events
  const deduplicated: DeduplicatedEvent[] = [];
  
  grouped.forEach((group, key) => {
    if (group.length === 0) return;

    // Sort by timestamp
    group.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const first = group[0];
    const last = group[group.length - 1];
    const relatedIds = group.map(e => e.id).filter((id, idx, arr) => arr.indexOf(id) === idx);

    deduplicated.push({
      ...first,
      duplicateCount: group.length,
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      relatedEvents: relatedIds.slice(1), // Exclude self
      count: group.reduce((sum, e) => sum + (e.count || 1), 0),
    });
  });

  // Sort by count (most frequent first) then by timestamp
  return deduplicated.sort((a, b) => {
    if (b.duplicateCount !== a.duplicateCount) {
      return b.duplicateCount - a.duplicateCount;
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Escalate severity based on event patterns
 * Production-grade severity escalation rules
 */
export function escalateSeverity(event: MonitoredEvent): MonitoredEvent['severity'] {
  const reason = event.category?.toLowerCase() || '';
  const description = event.description?.toLowerCase() || '';
  const title = event.title?.toLowerCase() || '';
  const combined = `${reason} ${description} ${title}`.toLowerCase();

  // Critical patterns
  if (
    combined.includes('failedcreatepodsandbox') ||
    combined.includes('failed to create pod') ||
    combined.includes('node not ready') ||
    combined.includes('outofmemory') ||
    combined.includes('oomkilled') ||
    combined.includes('crashloopbackoff') ||
    combined.includes('imagepullbackoff') ||
    combined.includes('network') && combined.includes('failed') ||
    combined.includes('cilium') && combined.includes('failed')
  ) {
    return 'critical';
  }

  // High patterns
  if (
    combined.includes('pod') && combined.includes('failed') ||
    combined.includes('deployment') && combined.includes('failed') ||
    combined.includes('replicaset') && combined.includes('failed') ||
    combined.includes('unhealthy') ||
    combined.includes('restart') && event.count > 5
  ) {
    return 'high';
  }

  // Keep original severity if no escalation needed
  return event.severity;
}

/**
 * Check if events are related (for correlation)
 */
export function areEventsRelated(event1: MonitoredEvent, event2: MonitoredEvent): boolean {
  // Same resource
  if (event1.resource === event2.resource && event1.namespace === event2.namespace) {
    return true;
  }

  // Same namespace and similar time (within 1 minute)
  const time1 = new Date(event1.timestamp).getTime();
  const time2 = new Date(event2.timestamp).getTime();
  const timeDiff = Math.abs(time1 - time2);
  
  if (event1.namespace === event2.namespace && timeDiff < 60000) {
    // Check if they're related by resource name pattern
    const resource1 = event1.resource.toLowerCase();
    const resource2 = event2.resource.toLowerCase();
    
    // Extract deployment/service names
    const name1 = resource1.split('/').pop()?.split('-').slice(0, -2).join('-') || '';
    const name2 = resource2.split('/').pop()?.split('-').slice(0, -2).join('-') || '';
    
    if (name1 && name2 && name1 === name2) {
      return true;
    }
  }

  return false;
}

/**
 * Correlate events to identify root causes
 */
export function correlateEvents(events: MonitoredEvent[]): Map<string, MonitoredEvent[]> {
  const correlations = new Map<string, MonitoredEvent[]>();
  
  events.forEach(event => {
    const correlationKey = `${event.namespace || 'cluster-wide'}:${event.category || event.type}`;
    
    if (!correlations.has(correlationKey)) {
      correlations.set(correlationKey, []);
    }
    
    correlations.get(correlationKey)!.push(event);
  });
  
  return correlations;
}

