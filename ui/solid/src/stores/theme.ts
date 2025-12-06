import { createSignal, createEffect } from 'solid-js';

export type ThemeName = 'dark' | 'light' | 'midnight' | 'nord' | 'ocean' | 'terminal' | 'github-dark';

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
    label: 'Dark',
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
    label: 'Light',
    icon: 'sun',
    colors: {
      bgPrimary: '#f8fafc',
      bgSecondary: '#e2e8f0',
      bgTertiary: '#cbd5e1',
      bgCard: 'rgba(255, 255, 255, 0.95)',
      bgNavbar: 'rgba(248, 250, 252, 0.95)',
      bgInput: 'rgba(255, 255, 255, 0.9)',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      borderColor: 'rgba(148, 163, 184, 0.4)',
      borderLight: 'rgba(148, 163, 184, 0.6)',
      accentPrimary: '#0891b2',
      accentSecondary: '#2563eb',
      accentGradient: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
      successColor: '#16a34a',
      warningColor: '#d97706',
      errorColor: '#dc2626',
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
    label: 'Nord',
    icon: 'snowflake',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#3b4252',
      bgTertiary: '#434c5e',
      bgCard: 'rgba(46, 52, 64, 0.9)',
      bgNavbar: 'rgba(46, 52, 64, 0.98)',
      bgInput: 'rgba(46, 52, 64, 0.9)',
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      textMuted: '#81a1c1',
      borderColor: 'rgba(129, 161, 193, 0.3)',
      borderLight: 'rgba(129, 161, 193, 0.5)',
      accentPrimary: '#81a1c1',
      accentSecondary: '#5e81ac',
      accentGradient: 'linear-gradient(135deg, #81a1c1 0%, #5e81ac 100%)',
      successColor: '#a3be8c',
      warningColor: '#ebcb8b',
      errorColor: '#bf616a',
    },
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    icon: 'wave',
    colors: {
      bgPrimary: '#0c1929',
      bgSecondary: '#132f4c',
      bgTertiary: '#1a4971',
      bgCard: 'rgba(19, 47, 76, 0.9)',
      bgNavbar: 'rgba(12, 25, 41, 0.98)',
      bgInput: 'rgba(19, 47, 76, 0.9)',
      textPrimary: '#ffffff',
      textSecondary: '#b2bac2',
      textMuted: '#8b949e',
      borderColor: 'rgba(48, 98, 139, 0.5)',
      borderLight: 'rgba(48, 98, 139, 0.7)',
      accentPrimary: '#29b6f6',
      accentSecondary: '#4fc3f7',
      accentGradient: 'linear-gradient(135deg, #29b6f6 0%, #4fc3f7 100%)',
      successColor: '#66bb6a',
      warningColor: '#ffa726',
      errorColor: '#ef5350',
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
export function cycleTheme() {
  const themeOrder: ThemeName[] = ['dark', 'light', 'midnight', 'nord', 'ocean', 'terminal', 'github-dark'];
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
