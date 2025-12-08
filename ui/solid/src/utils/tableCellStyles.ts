/**
 * Table cell styles utility
 * Provides consistent styling for resource table cells matching Ingresses style
 */

/**
 * Get the standard table cell style matching Ingresses
 * @param fontSize - Current font size from component state
 * @param textColor - Text color (default: '#0ea5e9' sky blue)
 * @returns Style object for table cells
 */
export function getTableCellStyle(fontSize: number, textColor: string = '#0ea5e9') {
  return {
    padding: '0 8px',
    'text-align': 'left' as const,
    color: textColor,
    'font-weight': '900',
    'font-size': `${fontSize}px`,
    height: `${Math.max(24, fontSize * 1.7)}px`,
    'line-height': `${Math.max(24, fontSize * 1.7)}px`,
    border: 'none',
  };
}

/**
 * Get the standard table header style matching Ingresses
 * @param fontSize - Current font size from component state
 * @returns Style object for table headers
 */
export function getTableHeaderStyle(fontSize: number) {
  return {
    padding: '0 8px',
    'text-align': 'left' as const,
    'font-weight': '900',
    color: '#0ea5e9',
    'font-size': `${fontSize}px`,
    border: 'none',
  };
}

/**
 * Get the standard table row style matching Ingresses
 * @param fontSize - Current font size from component state
 * @returns Style object for table rows
 */
export function getTableRowStyle(fontSize: number) {
  return {
    height: `${Math.max(24, fontSize * 1.7)}px`,
    'line-height': `${Math.max(24, fontSize * 1.7)}px`,
  };
}

/**
 * Standard text color used in Ingresses (sky blue)
 */
export const STANDARD_TEXT_COLOR = '#0ea5e9';

