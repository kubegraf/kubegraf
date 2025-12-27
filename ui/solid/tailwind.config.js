/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base surfaces (Sidebar v2 theme) - use CSS variables for theme support
        bg: {
          app: 'var(--bg-primary, #0b0f14)',
          panel: 'var(--bg-card, #0f1520)',
          panelAlt: 'var(--bg-tertiary, #131b2b)',
          sidebar: 'var(--bg-secondary, #0a0f1a)',
          hover: 'var(--bg-tertiary, #111827)',
          surface: 'var(--bg-secondary, #1e293b)',
        },
        // Borders & dividers - use CSS variables for theme support
        border: {
          subtle: 'var(--border-color, #1f2937)',
          strong: 'var(--border-light, #334155)',
        },
        // Text - use CSS variables for theme support
        text: {
          primary: 'var(--text-primary, #e5e7eb)',
          secondary: 'var(--text-secondary, #9ca3af)',
          muted: 'var(--text-muted, #6b7280)',
        },
        // Brand / intelligence
        brand: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          blue: '#38bdf8',
        },
        // Status
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          info: '#3b82f6',
        },
        // Glow overlays
        glow: {
          cyan: 'rgba(34,211,238,0.35)',
          violet: 'rgba(139,92,246,0.35)',
          danger: 'rgba(239,68,68,0.35)',
        },
        // Neutral dark theme as per project rules (keep for backward compatibility)
        neutral: {
          dark: '#0f172a',
          darker: '#020617',
          card: '#1e293b',
          border: '#334155',
          hover: '#475569',
          glass: 'rgba(30, 41, 59, 0.7)',
        },
        // Kubernetes-blue accents
        k8s: {
          blue: '#326ce5',
          dark: '#0f172a',
          darker: '#020617',
          card: '#1e293b',
          border: '#334155',
          hover: '#475569',
        },
        // Neon gradients for highlights
        neon: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#d946ef',
        },
        // Design system colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 14s ease-in-out infinite',
        'float-medium': 'float-medium 18s ease-in-out infinite',
        'float-slow-delayed': 'float-slow-delayed 20s ease-in-out infinite 2s',
        'intro-pop': 'intro-pop 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.5s infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        // Sidebar v2 animations
        slideIn: 'slideIn 160ms cubic-bezier(0.4,0,0.2,1)',
        fadeIn: 'fadeIn 120ms ease-out',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-16px) translateX(8px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(10px) translateX(-6px)' },
        },
        'float-slow-delayed': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-16px) translateX(8px)' },
        },
        'intro-pop': {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(12px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)' },
          'to': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in': {
          'from': { opacity: '0', transform: 'translateX(100%)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        // Sidebar v2 keyframes
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(59, 130, 246, 0.1)',
        'card-hover': '0 20px 40px -15px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.3)',
        // Sidebar v2 shadows
        panel: '0 0 0 1px rgba(255,255,255,0.03)',
        elevated: '0 10px 30px rgba(0,0,0,0.45)',
        glowCyan: '0 0 12px rgba(34,211,238,0.35)',
        glowViolet: '0 0 14px rgba(139,92,246,0.35)',
        glowDanger: '0 0 14px rgba(239,68,68,0.35)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-neon': 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #d946ef)',
        'gradient-k8s': 'linear-gradient(90deg, #326ce5, #3b82f6)',
      },
    },
  },
  plugins: [],
};
