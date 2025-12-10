// Copyright 2025 KubeGraf Contributors
// Event filtering utilities

/**
 * Get event filter from sessionStorage
 */
export function getEventFilter(): { resource: string; namespace: string; kind: string } | null {
  const resource = sessionStorage.getItem('kubegraf-event-filter-resource');
  const namespace = sessionStorage.getItem('kubegraf-event-filter-namespace');
  const kind = sessionStorage.getItem('kubegraf-event-filter-kind');
  
  if (resource && namespace && kind) {
    return { resource, namespace, kind };
  }
  
  return null;
}

/**
 * Clear event filter from sessionStorage
 */
export function clearEventFilter(): void {
  sessionStorage.removeItem('kubegraf-event-filter-resource');
  sessionStorage.removeItem('kubegraf-event-filter-namespace');
  sessionStorage.removeItem('kubegraf-event-filter-kind');
}

/**
 * Check if an event matches the filter
 */
export function matchesEventFilter(
  eventResource: string,
  eventNamespace: string,
  eventKind?: string
): boolean {
  const filter = getEventFilter();
  if (!filter) return false;
  
  // Check if resource name matches (could be partial match)
  // For pods, resource name might be "pod-name" or "pod-name/container-name"
  const resourceMatch = eventResource.includes(filter.resource) || 
                       filter.resource.includes(eventResource) ||
                       eventResource.split('/')[0] === filter.resource ||
                       filter.resource.split('/')[0] === eventResource;
  
  // Check namespace match
  const namespaceMatch = eventNamespace === filter.namespace;
  
  // Check kind match if provided
  const kindMatch = !eventKind || !filter.kind || eventKind === filter.kind || eventKind.toLowerCase() === filter.kind.toLowerCase();
  
  return resourceMatch && namespaceMatch && kindMatch;
}

