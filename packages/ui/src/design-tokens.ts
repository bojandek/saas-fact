/**
 * Design Tokens — Apple-inspired color system for all SaaS apps
 * Use these throughout projects for consistency
 */

export const colors = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',

  // Secondary
  secondary: '#5AC8FA',
  tertiary: '#FF9500',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#00b4db',

  // Neutral - Light Mode
  light: {
    background: '#FFFFFF',
    surface: '#F2F2F7',
    border: '#E5E5EA',
    text: {
      primary: '#000000',
      secondary: '#3C3C43',
      tertiary: '#8E8E93',
      quaternary: '#C7C7CC',
    },
  },

  // Neutral - Dark Mode
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    border: '#38383A',
    text: {
      primary: '#FFFFFF',
      secondary: '#A2A2A7',
      tertiary: '#86868B',
      quaternary: '#545456',
    },
  },
}

export const typography = {
  display: {
    size: '28px',
    weight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  title: {
    size: '22px',
    weight: 600,
    lineHeight: 1.3,
  },
  headline: {
    size: '17px',
    weight: 600,
    lineHeight: 1.4,
  },
  body: {
    size: '16px',
    weight: 400,
    lineHeight: 1.5,
  },
  caption: {
    size: '13px',
    weight: 400,
    lineHeight: 1.4,
  },
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
}

export const shadows = {
  elevation0: 'none',
  elevation1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  elevation2: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
  elevation3: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
  elevation4: '0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)',
}

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
}

export const animations = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1.0, 1)',
  },
}
