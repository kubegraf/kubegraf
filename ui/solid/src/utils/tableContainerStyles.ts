/**
 * Table container styles utility
 * Provides consistent styling for table containers that respect theme
 */

/**
 * Get the standard table container style matching theme
 * @returns Style object for table containers
 */
export function getTableContainerStyle() {
  return {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    margin: '0',
    padding: '0',
  };
}

/**
 * Get the standard table container style for terminal-style tables (black background)
 * Use this only when you specifically need the black terminal look
 * @returns Style object for terminal-style table containers
 */
export function getTerminalTableContainerStyle() {
  return {
    background: '#000000',
    border: '1px solid var(--border-color)',
    'border-radius': '4px',
    margin: '0',
    padding: '0',
  };
}

/**
 * Get theme-aware table background color
 * @returns CSS variable for table background
 */
export function getTableBackground(): string {
  return 'var(--bg-primary)';
}

