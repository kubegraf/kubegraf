/**
 * Shared utility for resource table font defaults
 * All resource tables should use 14px and Monaco as default
 */

export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_FONT_FAMILY = 'Monaco';

/**
 * Get initial font size from localStorage or return default
 * @param resourceType - The resource type (e.g., 'pods', 'deployments')
 * @returns Font size in pixels
 */
export function getInitialFontSize(resourceType: string): number {
  const saved = localStorage.getItem(`${resourceType}-font-size`);
  return saved ? parseInt(saved) : DEFAULT_FONT_SIZE;
}

/**
 * Get initial font family from localStorage or return default
 * @param resourceType - The resource type (e.g., 'pods', 'deployments')
 * @returns Font family name
 */
export function getInitialFontFamily(resourceType: string): string {
  const saved = localStorage.getItem(`${resourceType}-font-family`);
  return saved || DEFAULT_FONT_FAMILY;
}

/**
 * Map font family option to actual font-family CSS value
 * @param family - Font family option name
 * @returns CSS font-family value
 */
export function getFontFamilyCSS(family: string): string {
  switch (family) {
    case 'Monospace': return '"Courier New", Monaco, monospace';
    case 'System-ui': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'Monaco': return 'Monaco, "Lucida Console", monospace';
    case 'Consolas': return 'Consolas, "Courier New", monospace';
    case 'Courier': return '"Courier New", Courier, monospace';
    default: return 'Monaco, "Lucida Console", monospace';
  }
}

/**
 * Save font size to localStorage
 * @param resourceType - The resource type (e.g., 'pods', 'deployments')
 * @param size - Font size in pixels
 */
export function saveFontSize(resourceType: string, size: number): void {
  localStorage.setItem(`${resourceType}-font-size`, size.toString());
}

/**
 * Save font family to localStorage
 * @param resourceType - The resource type (e.g., 'pods', 'deployments')
 * @param family - Font family name
 */
export function saveFontFamily(resourceType: string, family: string): void {
  localStorage.setItem(`${resourceType}-font-family`, family);
}

