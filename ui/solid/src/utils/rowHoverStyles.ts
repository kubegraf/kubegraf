/**
 * Row hover styles utility
 * Provides theme-aware hover background colors for table rows
 * Matches the style used in Deployments component for consistency
 */

/**
 * Get the hover background color for a table row
 * Uses CSS variables to ensure theme compatibility (works in both light and dark themes)
 * This matches the subtle hover effect used in Deployments
 */
export function getRowHoverBackground(isSelected: boolean = false, isFailed: boolean = false, isPending: boolean = false): string {
  // Use CSS variables for theme-aware colors
  // This will automatically adapt to light/dark themes
  if (isSelected) {
    // Selected row: use secondary background (subtle highlight)
    return 'var(--bg-secondary)';
  }
  if (isFailed) {
    // Failed pods: very subtle red tint that works in both themes
    return 'rgba(239, 68, 68, 0.08)';
  }
  if (isPending) {
    // Pending/Initializing pods: very subtle yellow tint that works in both themes
    return 'rgba(251, 191, 36, 0.08)';
  }
  // Default hover: use secondary background (matches Deployments style)
  // This is subtle and works well in both light and dark themes
  return 'var(--bg-secondary)';
}

