// Copyright 2025 KubeGraf Contributors
// Utility for navigating to Security Insights with specific filters

import { setCurrentView } from '../stores/ui';

/**
 * Maps security check names from Dashboard to Security Insights categories/severities
 */
export const securityCheckToCategory: Record<string, string> = {
  'Security Context Missing': 'security',
  'Running as Root': 'security',
  'Privileged Containers': 'security',
  'No Privileged Containers': 'security',
  'Resource Limits Missing': 'configuration',
  'Writable Root Filesystem': 'security',
};

/**
 * Maps security check names to diagnostic rule IDs for precise filtering
 */
export const securityCheckToRule: Record<string, string> = {
  'Security Context Missing': 'SEC001', // This might need adjustment based on actual rule IDs
  'Running as Root': 'SEC002',
  'Privileged Containers': 'SEC003',
  'Resource Limits Missing': 'CFG001', // Configuration category
  'Writable Root Filesystem': 'SEC004',
};

/**
 * Navigate to Security Insights page with appropriate filter
 */
export function navigateToSecurityCheck(checkName: string, severity?: string) {
  // Set the view to security
  setCurrentView('security');
  
  // Store filter information in sessionStorage for the Security page to pick up
  const filter = {
    category: securityCheckToCategory[checkName] || 'security',
    severity: severity || 'critical',
    checkName: checkName,
  };
  
  sessionStorage.setItem('securityFilter', JSON.stringify(filter));
  
  // Trigger a custom event to notify Security page to apply filter
  window.dispatchEvent(new CustomEvent('securityFilterChange', { detail: filter }));
}

