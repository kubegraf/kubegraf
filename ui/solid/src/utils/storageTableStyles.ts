/**
 * Storage table styles utility
 * Provides consistent styling for Storage component tables matching Ingresses
 */
import { getThemeBackground, getThemeBorderColor } from './themeBackground';

/**
 * Get the table container style matching Ingresses
 */
export function getStorageTableContainerStyle() {
  return {
    background: getThemeBackground(),
    margin: '0',
    padding: '0',
    border: `1px solid ${getThemeBorderColor()}`,
    'border-radius': '4px',
  };
}

/**
 * Get the table style matching Ingresses
 * @param fontFamily - Font family CSS value
 */
export function getStorageTableStyle(fontFamily: string) {
  return {
    width: '100%',
    'table-layout': 'auto' as const,
    'font-family': fontFamily,
    background: getThemeBackground(),
    'border-collapse': 'collapse' as const,
    margin: '0',
    padding: '0',
  };
}

