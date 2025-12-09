// Copyright 2025 KubeGraf Contributors
// Pod selection and highlighting utilities

/**
 * Get pod name to highlight from sessionStorage
 */
export function getHighlightedPod(): { podName: string; namespace: string } | null {
  const podName = sessionStorage.getItem('kubegraf-highlight-pod');
  const namespace = sessionStorage.getItem('kubegraf-pod-namespace');
  
  if (podName && namespace) {
    return { podName, namespace };
  }
  
  return null;
}

/**
 * Clear highlighted pod from sessionStorage
 */
export function clearHighlightedPod(): void {
  sessionStorage.removeItem('kubegraf-highlight-pod');
  sessionStorage.removeItem('kubegraf-pod-namespace');
}

/**
 * Get pod name to open logs for from sessionStorage
 */
export function getPodForLogs(): { podName: string; namespace: string } | null {
  const podName = sessionStorage.getItem('kubegraf-open-logs-pod');
  const namespace = sessionStorage.getItem('kubegraf-open-logs-namespace');
  
  if (podName && namespace) {
    return { podName, namespace };
  }
  
  return null;
}

/**
 * Clear pod logs info from sessionStorage
 */
export function clearPodLogs(): void {
  sessionStorage.removeItem('kubegraf-open-logs-pod');
  sessionStorage.removeItem('kubegraf-open-logs-namespace');
}

/**
 * Check if a pod should be highlighted
 */
export function shouldHighlightPod(podName: string, namespace: string): boolean {
  const highlighted = getHighlightedPod();
  return highlighted?.podName === podName && highlighted?.namespace === namespace;
}

