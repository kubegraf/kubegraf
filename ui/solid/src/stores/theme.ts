import { createSignal, createEffect } from 'solid-js';

export type ThemeName =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'nord'
  | 'ocean'
  | 'terminal'
  | 'terminal-pro'
  | 'github-dark';

export interface Theme {
  name: ThemeName;
  label: string;
  icon: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgCard: string;
    bgNavbar: string;
    bgInput: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    borderColor: string;
    borderLight: string;
    accentPrimary: string;
    accentSecondary: string;
    accentGradient: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: 'Dark (Legacy)',
    icon: 'moon',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgCard: 'rgba(30, 41, 59, 0.8)',
      bgNavbar: 'rgba(15, 23, 42, 0.95)',
      bgInput: 'rgba(30, 41, 59, 0.8)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      borderColor: 'rgba(100, 116, 139, 0.3)',
      borderLight: 'rgba(100, 116, 139, 0.5)',
      accentPrimary: '#06b6d4',
      accentSecondary: '#3b82f6',
      accentGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
      successColor: '#22c55e',
      warningColor: '#f59e0b',
      errorColor: '#ef4444',
    },
  },
  light: {
    name: 'light',
    // Polar Light — primary light theme
    label: 'Polar Light',
    icon: 'sun',
    colors: {
      // Backgrounds: soft neutral, no pure white at page level
      bgPrimary: '#F7F8FA', // primary background
      bgSecondary: '#E5E7EB', // secondary surfaces / table headers
      bgTertiary: '#D1D5DB',
      // Panels / cards: near-white panels with subtle borders instead of heavy shadows
      bgCard: '#FFFFFF',
      bgNavbar: '#F9FAFB',
      bgInput: '#FFFFFF',
      // Text: neutral ink on light background
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      // Borders: light slate instead of strong outlines
      borderColor: 'rgba(15, 23, 42, 0.08)',
      borderLight: 'rgba(15, 23, 42, 0.14)',
      // Accent: Slate blue
      accentPrimary: '#4F46E5',
      accentSecondary: '#6366F1',
      accentGradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
      // Status colors tuned for light background
      successColor: '#16A34A',
      warningColor: '#D97706',
      errorColor: '#DC2626',
    },
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    icon: 'stars',
    colors: {
      bgPrimary: '#030712',
      bgSecondary: '#111827',
      bgTertiary: '#1f2937',
      bgCard: 'rgba(17, 24, 39, 0.9)',
      bgNavbar: 'rgba(3, 7, 18, 0.98)',
      bgInput: 'rgba(17, 24, 39, 0.9)',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
      textMuted: '#6b7280',
      borderColor: 'rgba(75, 85, 99, 0.4)',
      borderLight: 'rgba(75, 85, 99, 0.6)',
      accentPrimary: '#8b5cf6',
      accentSecondary: '#a855f7',
      accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      successColor: '#10b981',
      warningColor: '#f59e0b',
      errorColor: '#f43f5e',
    },
  },
  nord: {
    name: 'nord',
    // Solar Dusk — warm, low-fatigue dark
    label: 'Solar Dusk',
    icon: 'sunset',
    colors: {
      // Dark brown / slate mix
      bgPrimary: '#111827',
      bgSecondary: '#1F2933',
      bgTertiary: '#292524',
      bgCard: 'rgba(17, 24, 39, 0.96)',
      bgNavbar: 'rgba(15, 23, 42, 0.98)',
      bgInput: 'rgba(31, 41, 51, 0.96)',
      textPrimary: '#F9FAFB',
      textSecondary: '#E5E7EB',
      textMuted: '#9CA3AF',
      // Softer, warmer borders
      borderColor: 'rgba(120, 53, 15, 0.4)',
      borderLight: 'rgba(180, 83, 9, 0.6)',
      // Warm amber accents
      accentPrimary: '#F59E0B',
      accentSecondary: '#F97316',
      accentGradient: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
      successColor: '#22C55E',
      warningColor: '#F59E0B',
      errorColor: '#F97373',
    },
  },
  ocean: {
    name: 'ocean',
    // Aurora Blue — modern SaaS / demo theme
    label: 'Aurora Blue',
    icon: 'wave',
    colors: {
      // Deep blue base with subtle gradient-ready surfaces
      bgPrimary: '#020617',
      bgSecondary: '#02081F',
      bgTertiary: '#0B1120',
      bgCard: 'rgba(15, 23, 42, 0.96)',
      bgNavbar: 'rgba(2, 6, 23, 0.98)',
      bgInput: 'rgba(15, 23, 42, 0.96)',
      textPrimary: '#E5F2FF',
      textSecondary: '#9CA3AF',
      textMuted: '#6B7280',
      borderColor: 'rgba(37, 99, 235, 0.4)',
      borderLight: 'rgba(59, 130, 246, 0.6)',
      // Neon blue / cyan highlights
      accentPrimary: '#22D3EE',
      accentSecondary: '#38BDF8',
      accentGradient: 'linear-gradient(135deg, #22D3EE 0%, #38BDF8 40%, #6366F1 100%)',
      successColor: '#22C55E',
      warningColor: '#FACC15',
      errorColor: '#FB7185',
    },
  },
  terminal: {
    name: 'terminal',
    label: 'Terminal',
    icon: 'terminal',
    colors: {
      bgPrimary: '#000000',
      bgSecondary: '#1a1a1a',
      bgTertiary: '#2d2d2d',
      bgCard: 'rgba(26, 26, 26, 0.95)',
      bgNavbar: 'rgba(0, 0, 0, 0.98)',
      bgInput: 'rgba(26, 26, 26, 0.9)',
      textPrimary: '#ffffff',
      textSecondary: '#e5e5e5',
      textMuted: '#999999',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderLight: 'rgba(255, 255, 255, 0.15)',
      accentPrimary: '#007aff',
      accentSecondary: '#5ac8fa',
      accentGradient: 'linear-gradient(135deg, #007aff 0%, #5ac8fa 100%)',
      successColor: '#34c759',
      warningColor: '#ff9500',
      errorColor: '#ff3b30',
    },
  },
  'terminal-pro': {
    name: 'terminal-pro',
    label: 'Terminal Pro',
    icon: 'terminal',
    colors: {
      // Slightly refined terminal aesthetic: deep charcoal with subtle blue-green accents
      bgPrimary: '#020617',
      bgSecondary: '#050816',
      bgTertiary: '#0B1220',
      bgCard: 'rgba(3, 7, 18, 0.96)',
      bgNavbar: 'rgba(3, 7, 18, 0.98)',
      bgInput: 'rgba(15, 23, 42, 0.96)',
      textPrimary: '#E5E7EB',
      textSecondary: '#9CA3AF',
      textMuted: '#6B7280',
      borderColor: 'rgba(31, 41, 55, 0.7)',
      borderLight: 'rgba(55, 65, 81, 0.9)',
      accentPrimary: '#22C55E',
      accentSecondary: '#0EA5E9',
      accentGradient: 'linear-gradient(135deg, #22C55E 0%, #0EA5E9 50%, #6366F1 100%)',
      successColor: '#22C55E',
      warningColor: '#FACC15',
      errorColor: '#FB7185',
    },
  },
  'github-dark': {
    name: 'github-dark',
    label: 'GitHub Dark',
    icon: 'github',
    colors: {
      bgPrimary: '#0d1117',
      bgSecondary: '#161b22',
      bgTertiary: '#21262d',
      bgCard: 'rgba(13, 17, 23, 0.9)',
      bgNavbar: 'rgba(13, 17, 23, 0.98)',
      bgInput: 'rgba(13, 17, 23, 0.9)',
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      borderColor: 'rgba(48, 54, 61, 0.4)',
      borderLight: 'rgba(48, 54, 61, 0.6)',
      accentPrimary: '#58a6ff',
      accentSecondary: '#79c0ff',
      accentGradient: 'linear-gradient(135deg, #58a6ff 0%, #79c0ff 100%)',
      successColor: '#3fb950',
      warningColor: '#d29922',
      errorColor: '#f85149',
    },
  },
};

// Get initial theme from localStorage or default to 'dark'
function getInitialTheme(): ThemeName {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kubegraf-theme') as ThemeName;
    if (saved && themes[saved]) {
      return saved;
    }
  }
  return 'dark';
}

const [currentTheme, setCurrentThemeInternal] = createSignal<ThemeName>(getInitialTheme());

// Apply theme CSS variables to document
function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName];
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });

  // Set data-theme attribute for CSS selectors
  document.body.setAttribute('data-theme', themeName);

  // Save to localStorage
  localStorage.setItem('kubegraf-theme', themeName);
}

// Set theme and apply it
export function setTheme(themeName: ThemeName) {
  setCurrentThemeInternal(themeName);
  applyTheme(themeName);
}

// Cycle through themes
// Recommended visible theme lineup
export const visibleThemes: ThemeName[] = [
  // Primary / default
  'midnight',      // Midnight (default dark)
  'light',         // Polar Light
  // Power users
  'terminal',      // Terminal (classic)
  'terminal-pro',  // Terminal Pro (refined)
  // Optional / experimental
  'ocean',         // Aurora Blue
  'nord',          // Solar Dusk
];

export function cycleTheme() {
  const themeOrder: ThemeName[] = visibleThemes;
  const currentIndex = themeOrder.indexOf(currentTheme());
  const nextIndex = (currentIndex + 1) % themeOrder.length;
  setTheme(themeOrder[nextIndex]);
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  applyTheme(currentTheme());
}

export { currentTheme };
export const getTheme = () => themes[currentTheme()];
