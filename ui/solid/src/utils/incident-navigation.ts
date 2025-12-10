// Copyright 2025 KubeGraf Contributors
// Incident navigation utilities

import { setNamespace } from '../stores/cluster';
import { setCurrentView, addNotification } from '../stores/ui';
import { setNamespaces } from '../stores/globalStore';
import { Incident } from '../services/api';

/**
 * Navigate to a specific pod in the Pods view
 */
export function navigateToPod(incident: Incident): void {
  if (incident.resourceKind !== 'Pod') {
    addNotification('This incident is not related to a Pod', 'warning');
    return;
  }

  // Parse pod name from resourceName (format: "pod-name/container-name" or just "pod-name")
  const parts = incident.resourceName.split('/');
  const podName = parts[0];
  const namespace = incident.namespace || 'default';

  // Set namespace in both stores
  setNamespace(namespace);
  // Set namespace filter in globalStore so Pods view filters to this namespace
  setNamespaces([namespace]);

  // Navigate to pods view
  setCurrentView('pods');

  // Store pod name in sessionStorage for highlighting
  sessionStorage.setItem('kubegraf-highlight-pod', podName);
  sessionStorage.setItem('kubegraf-pod-namespace', namespace);

  addNotification(`Navigating to pod: ${podName} in namespace ${namespace}`, 'info');
}

/**
 * Open pod logs for an incident
 */
export function openPodLogs(incident: Incident, onOpenLogs?: (podName: string, namespace: string) => void): void {
  if (incident.resourceKind !== 'Pod') {
    addNotification('This incident is not related to a Pod', 'warning');
    return;
  }

  // Parse pod name from resourceName
  const parts = incident.resourceName.split('/');
  const podName = parts[0];
  const namespace = incident.namespace || 'default';

  // Set namespace in both stores
  setNamespace(namespace);
  // Set namespace filter in globalStore so Pods view filters to this namespace
  setNamespaces([namespace]);

  // Navigate to pods view
  setCurrentView('pods');

  // Store pod info for logs modal - use a flag to trigger logs opening
  sessionStorage.setItem('kubegraf-open-logs-pod', podName);
  sessionStorage.setItem('kubegraf-open-logs-namespace', namespace);
  sessionStorage.setItem('kubegraf-open-logs-flag', 'true'); // Flag to trigger logs modal

  // Call the callback if provided
  if (onOpenLogs) {
    onOpenLogs(podName, namespace);
  }

  addNotification(`Opening logs for pod: ${podName}`, 'info');
}

/**
 * Navigate to Events view and filter by resource
 */
export function navigateToEvent(incident: Incident): void {
  const resourceName = incident.resourceName;
  const namespace = incident.namespace || 'default';
  const resourceKind = incident.resourceKind || 'Pod';

  // Parse pod name from resourceName (format: "pod-name/container-name" or just "pod-name")
  const parts = resourceName.split('/');
  const podName = parts[0];

  // Set namespace in both stores
  setNamespace(namespace);
  // Set namespace filter in globalStore so MonitoredEvents view filters to this namespace
  setNamespaces([namespace]);

  // Navigate to events view (MonitoredEvents)
  setCurrentView('monitoredevents');

  // Store event filter info in sessionStorage
  sessionStorage.setItem('kubegraf-event-filter-resource', podName);
  sessionStorage.setItem('kubegraf-event-filter-namespace', namespace);
  sessionStorage.setItem('kubegraf-event-filter-kind', resourceKind);

  addNotification(`Viewing events for ${resourceKind}: ${podName} in namespace ${namespace}`, 'info');
}

