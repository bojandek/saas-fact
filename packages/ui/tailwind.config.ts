import type { Config } from 'tailwindcss';
import { colors, typography, spacing, borderRadius, shadows } from './src/design-tokens';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      primary: colors.primary,
      'primary-light': colors.primaryLight,
      'primary-dark': colors.primaryDark,
      secondary: colors.secondary,
      tertiary: colors.tertiary,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
      info: colors.info,
      white: '#FFFFFF',
      black: '#000000',
      
      // Light mode
      'bg-light': colors.light.background,
      'surface-light': colors.light.surface,
      'border-light': colors.light.border,
      'text-light-primary': colors.light.text.primary,
      'text-light-secondary': colors.light.text.secondary,
      'text-light-tertiary': colors.light.text.tertiary,
      'text-light-quaternary': colors.light.text.quaternary,
      
      // Dark mode
      'bg-dark': colors.dark.background,
      'surface-dark': colors.dark.surface,
      'border-dark': colors.dark.border,
      'text-dark-primary': colors.dark.text.primary,
      'text-dark-secondary': colors.dark.text.secondary,
      'text-dark-tertiary': colors.dark.text.tertiary,
      'text-dark-quaternary': colors.dark.text.quaternary,
    },
    
    fontSize: {
      display: [typography.display.size, { lineHeight: `${typography.display.lineHeight}` }],
      title: [typography.title.size, { lineHeight: `${typography.title.lineHeight}` }],
      headline: [typography.headline.size, { lineHeight: `${typography.headline.lineHeight}` }],
      body: [typography.body.size, { lineHeight: `${typography.body.lineHeight}` }],
      caption: [typography.caption.size, { lineHeight: `${typography.caption.lineHeight}` }],
    },
    
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    } as Record<string, string>,
    
    spacing: {
      xs: spacing.xs,
      sm: spacing.sm,
      md: spacing.md,
      lg: spacing.lg,
      xl: spacing.xl,
      '2xl': spacing['2xl'],
      '3xl': spacing['3xl'],
      '4xl': spacing['4xl'],
    },
    
    boxShadow: {
      none: shadows.elevation0,
      sm: shadows.elevation1,
      md: shadows.elevation2,
      lg: shadows.elevation3,
      xl: shadows.elevation4,
    },
    
    borderRadius: {
      sm: borderRadius.sm,
      md: borderRadius.md,
      lg: borderRadius.lg,
      xl: borderRadius.xl,
      full: borderRadius.full,
    },
    
    extend: {},
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config;
