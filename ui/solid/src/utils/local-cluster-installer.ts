// Copyright 2025 KubeGraf Contributors
// Local cluster installation utilities

/**
 * Validate cluster name
 * - Must start with 'kubegraf-'
 * - Can contain lowercase letters, numbers, and hyphens
 * - Must be 3-50 characters total
 */
export function validateClusterName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: 'Cluster name is required' };
  }

  if (!name.startsWith('kubegraf-')) {
    return { valid: false, error: 'Cluster name must start with "kubegraf-"' };
  }

  if (name.length < 10 || name.length > 50) {
    return { valid: false, error: 'Cluster name must be between 10 and 50 characters' };
  }

  const suffix = name.substring(9); // After 'kubegraf-'
  if (!/^[a-z0-9-]+$/.test(suffix)) {
    return {
      valid: false,
      error: 'Cluster name suffix can only contain lowercase letters, numbers, and hyphens',
    };
  }

  return { valid: true };
}

/**
 * Generate a default cluster name with timestamp
 */
export function generateDefaultClusterName(): string {
  const timestamp = Date.now().toString(36);
  return `kubegraf-${timestamp}`;
}

/**
 * Check if an app is a local cluster installer
 */
export function isLocalClusterApp(appName: string): boolean {
  return ['k3d', 'kind', 'minikube'].includes(appName);
}

