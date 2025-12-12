// Namespace helper utilities
// This file provides utilities for namespace selection and detection

import { selectedNamespaces } from '../stores/globalStore';
import { namespace } from '../stores/cluster';

/**
 * Gets the current namespace parameter for API calls
 * Returns undefined for "all namespaces", single namespace string, or first namespace if multiple selected
 */
export function getNamespaceParam(): string | undefined {
  const namespaces = selectedNamespaces();
  if (namespaces.length === 0) return undefined; // All namespaces
  if (namespaces.length === 1) return namespaces[0];
  // For multiple namespaces, return first one (backend may need update for multiple)
  return namespaces[0];
}

/**
 * Gets the display name for current namespace selection
 */
export function getNamespaceDisplayName(): string {
  const namespaces = selectedNamespaces();
  if (namespaces.length === 0) return 'All Namespaces';
  if (namespaces.length === 1) return namespaces[0];
  return `${namespaces.length} namespaces`;
}

/**
 * Checks if a specific namespace is currently selected
 */
export function isNamespaceSelected(ns: string): boolean {
  const selected = selectedNamespaces();
  return selected.includes(ns);
}

/**
 * Checks if we're viewing all namespaces
 */
export function isAllNamespacesSelected(): boolean {
  const selected = selectedNamespaces();
  return selected.length === 0;
}

