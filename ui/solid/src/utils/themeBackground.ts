/**
 * Theme background utility
 * Gets the background color directly from the theme store to avoid CSS variable timing issues
 */
import { currentTheme, themes } from '../stores/theme';

/**
 * Get the current theme's primary background color
 * This avoids CSS variable timing issues during component mounting
 */
export function getThemeBackground(): string {
  return themes[currentTheme()].colors.bgPrimary;
}

/**
 * Get the current theme's secondary background color
 */
export function getThemeBackgroundSecondary(): string {
  return themes[currentTheme()].colors.bgSecondary;
}

/**
 * Get the current theme's border color
 */
export function getThemeBorderColor(): string {
  return themes[currentTheme()].colors.borderColor;
}

