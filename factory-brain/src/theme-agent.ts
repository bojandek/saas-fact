/**
 * ThemeAgent — Apple-Level Design System Generator
 *
 * Generates a complete, production-ready design system for each SaaS app.
 * Draws from embedded expert knowledge:
 *   - Apple Human Interface Guidelines (HIG)
 *   - Linear.app design methodology
 *   - Vercel dashboard patterns
 *   - Refactoring UI (Wathan & Schoger)
 *   - Gestalt principles applied to SaaS
 *
 * Usage:
 *   const agent = new ThemeAgent(orchestrator)
 *   const theme = await agent.generateTheme('A gym CRM', 'corporate', '#1e3a8a')
 */
import fs from 'fs/promises'
import path from 'path'
import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { WarRoomOrchestrator } from './war-room-orchestrator'
import { logger } from './utils/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  name: string
  description: string
  colors: {
    primary: string
    primaryHover: string
    secondary: string
    accent: string
    background: string
    surface: string
    foreground: string
    muted: string
    mutedForeground: string
    border: string
    success: string
    warning: string
    danger: string
  }
  typography: {
    fontFamily: string
    headingFontFamily: string
    baseSize: string
    scaleRatio: string
  }
  spacing: {
    unit: string
    scale: string[]
  }
  borderRadius: string
  shadows: {
    sm: string
    md: string
    lg: string
  }
  style: 'minimalist' | 'corporate' | 'playful' | 'cyberpunk' | 'elegant' | 'brutalism' | string
  mode: 'light' | 'dark' | 'system'
  tailwindExtend: Record<string, unknown>
}

// ─── Expert Design Knowledge (embedded — no Supabase required) ────────────────

const APPLE_DESIGN_PRINCIPLES = `
## Apple Human Interface Guidelines — Core Principles for SaaS

### 1. Clarity
- One primary action per screen. Never compete for attention.
- Clear information hierarchy: Title → Key Metric → Actions → Details
- Typography-driven layout. Let content breathe.

### 2. Deference (Content over Chrome)
- Minimal UI chrome (borders, shadows, decorations)
- Maximum whitespace — Apple uses 8pt grid (4, 8, 16, 24, 32, 48, 64, 96px)
- Subtle shadows (not bold): box-shadow: 0 1px 3px rgba(0,0,0,0.1)
- Clean backgrounds: #FFFFFF or #F2F2F7

### 3. Depth through Layering
- Layer 0 (ground): Navigation bar — solid, no shadow
- Layer 1 (raised): Cards — subtle shadow (0 1px 3px rgba(0,0,0,0.08))
- Layer 2 (floating): Modals, popovers — stronger shadow

### 4. Apple Color System
- Primary action: ONE strong color (iPhone blue: #007AFF)
- Secondary: Muted gray (#F2F2F7)
- Success: #34C759, Warning: #FF9500, Danger: #FF3B30
- Text hierarchy: Primary #000000, Secondary #3C3C43 (70%), Tertiary #8E8E93 (50%)

### 5. Typography Scale (SF Pro / Inter equivalent)
- Display: 34px / 700 / -0.5px letter-spacing
- Title: 22px / 600
- Headline: 17px / 600
- Body: 16px / 400
- Caption: 13px / 400 / tertiary color
`

const REFACTORING_UI_RULES = `
## Refactoring UI — Critical Rules (Wathan & Schoger)

### Hierarchy First
Visual hierarchy ladder (most to least important):
1. Size (biggest = most important)
2. Color (draws eye)
3. Weight (bold vs regular)
4. Contrast (dark vs light)
5. Proximity (grouped = related)
6. Whitespace (breathing room)

### Rule: Never use gray on colored backgrounds
Wrong: gray text on blue background
Right: white text with reduced opacity (rgba(255,255,255,0.7))

### Rule: Oversized headlines don't need dark color
Big text creates hierarchy through size alone. Use medium gray (#6B7280) for large headings.

### Rule: Limit your color palette
- 1 primary brand color (5 shades: 50, 100, 300, 500, 700, 900)
- 1 accent color (for highlights, links)
- Grays (6 shades from #F9FAFB to #111827)
- Semantic: success, warning, danger

### Rule: Use shadows, not borders
Borders add visual noise. Shadows create depth without clutter.
card: box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)

### Rule: Don't use a border-radius that's too large
- Small elements (badges, inputs): 4-6px
- Cards: 8-12px
- Modals: 12-16px
- Buttons: 6-8px (never pill-shaped for primary actions)
`

const LINEAR_DESIGN_METHODOLOGY = `
## Linear.app Design Methodology — Modern SaaS Patterns

### Information Density vs Clarity
- Show maximum useful information without overwhelming
- Use progressive disclosure: show complexity when needed
- Tables: minimal borders (only between rows), hover highlights entire row

### Dark Mode First (for developer/power-user tools)
- Background: #0F0F0F (not pure black)
- Surface: #1A1A1A
- Border: #2A2A2A
- Text: #EDEDED (not pure white)
- Accent: #0084FF (cool blue)

### Command Palette Pattern
- Cmd+K for global search (always available)
- Keyboard-first navigation
- Vim-inspired shortcuts for power users

### Motion & Micro-interactions
- Subtle animations guide attention (not decorative)
- Status changes visualized through transitions
- Icons are functional, not decorative
- Loading states: skeleton screens, not spinners

### Component Patterns
- Buttons: subtle gray bg, slightly darker on hover, full color + indicator on active
- Forms: single column, label on top, error inline below field
- Lists: drag handles visible on hover, inline editing on double-click
`

const VERCEL_DASHBOARD_PATTERNS = `
## Vercel Dashboard — Information Architecture Patterns

### Mental Model (Navigation Hierarchy)
User → Projects → Details → Settings
Each level independently valuable, connects upward.

### Project Card Pattern (Glanceable Status)
- Identity: name, team
- Status: color-coded icon (Active/Building/Failed)
- Quick actions: primary button visible on hover
- Metadata: tags for framework, region
- Sorting: last-deployed (default), name, created, status

### Real-Time Status Indicators
- Building: animated pulse (yellow)
- Active: solid dot (green)
- Failed: solid dot (red)
- Paused: hollow dot (gray)

### Empty States
- Illustration + headline + CTA button
- Never show empty table with no guidance
- Progressive onboarding: show what's possible

### Responsive Sidebar
- Desktop: persistent sidebar (240px)
- Tablet: collapsible sidebar
- Mobile: bottom navigation or hamburger
- Active state: subtle background + left border accent
`

const GESTALT_FOR_SAAS = `
## Gestalt Principles Applied to SaaS Interfaces

### Proximity: Group related elements
- Form fields in same section: gap-2 (8px)
- Between form sections: gap-6 (24px)
- Dashboard cards in same category: gap-4 (16px)
- Between dashboard sections: gap-8 (32px)

### Similarity: Consistent visual language
- All primary actions: same button style
- All secondary actions: same ghost/outline style
- All destructive actions: same red color
- All status indicators: same dot/badge pattern

### Closure: Complete the picture
- Card borders don't need to be full rectangles — top border accent is enough
- Progress bars suggest completion even when empty
- Skeleton screens suggest content shape before loading

### Figure/Ground: Clear foreground/background separation
- Content on white/light surface
- Surface on slightly gray background (#F9FAFB)
- Modal on semi-transparent overlay (rgba(0,0,0,0.5))

### Continuity: Guide the eye
- Align elements to grid (8pt)
- Use consistent left-alignment for text
- Horizontal lists suggest "there's more"
`

// ─── Predefined Presets (instant, no LLM call needed) ─────────────────────────

const PREDEFINED_THEMES: Record<string, ThemeConfig> = {
  minimalist: {
    name: 'Minimalist',
    description: 'Clean whitespace, monochrome with single accent. Inspired by Apple HIG.',
    colors: {
      primary: '#000000',
      primaryHover: '#1f2937',
      secondary: '#f3f4f6',
      accent: '#3b82f6',
      background: '#ffffff',
      surface: '#f9fafb',
      foreground: '#0f172a',
      muted: '#f8fafc',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      headingFontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      baseSize: '16px',
      scaleRatio: '1.25',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0.375rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      lg: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    },
    style: 'minimalist',
    mode: 'light',
    tailwindExtend: {},
  },
  corporate: {
    name: 'Corporate',
    description: 'Professional navy blue, trustworthy, enterprise-grade. Vercel dashboard patterns.',
    colors: {
      primary: '#1e3a8a',
      primaryHover: '#1e40af',
      secondary: '#eff6ff',
      accent: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      foreground: '#1e293b',
      muted: '#f1f5f9',
      mutedForeground: '#475569',
      border: '#e2e8f0',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
    },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
      headingFontFamily: '"Inter", "Roboto", sans-serif',
      baseSize: '16px',
      scaleRatio: '1.25',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0.5rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      lg: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    },
    style: 'corporate',
    mode: 'light',
    tailwindExtend: {},
  },
  apple: {
    name: 'Apple',
    description: 'Faithful Apple HIG implementation. iPhone blue, SF Pro typography, 8pt grid.',
    colors: {
      primary: '#007AFF',
      primaryHover: '#0051D5',
      secondary: '#F2F2F7',
      accent: '#5AC8FA',
      background: '#FFFFFF',
      surface: '#F2F2F7',
      foreground: '#000000',
      muted: '#F2F2F7',
      mutedForeground: '#8E8E93',
      border: '#E5E5EA',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
      headingFontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
      baseSize: '17px',
      scaleRatio: '1.2',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0.75rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 8px rgba(0,0,0,0.08)',
      lg: '0 8px 24px rgba(0,0,0,0.12)',
    },
    style: 'minimalist',
    mode: 'light',
    tailwindExtend: {},
  },
  linear: {
    name: 'Linear',
    description: 'Dark mode, high density, developer-first. Inspired by Linear.app.',
    colors: {
      primary: '#0084FF',
      primaryHover: '#0066CC',
      secondary: '#1A1A1A',
      accent: '#5E6AD2',
      background: '#0F0F0F',
      surface: '#1A1A1A',
      foreground: '#EDEDED',
      muted: '#1A1A1A',
      mutedForeground: '#8B8B8B',
      border: '#2A2A2A',
      success: '#4CAF50',
      warning: '#FF9800',
      danger: '#F44336',
    },
    typography: {
      fontFamily: '"Inter", -apple-system, sans-serif',
      headingFontFamily: '"Inter", -apple-system, sans-serif',
      baseSize: '14px',
      scaleRatio: '1.2',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'] },
    borderRadius: '0.375rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.3)',
      md: '0 2px 8px rgba(0,0,0,0.4)',
      lg: '0 8px 24px rgba(0,0,0,0.5)',
    },
    style: 'minimalist',
    mode: 'dark',
    tailwindExtend: {},
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Dark mode, neon yellow + cyan, zero border-radius, high contrast.',
    colors: {
      primary: '#fef08a',
      primaryHover: '#fde047',
      secondary: '#1e1b4b',
      accent: '#22d3ee',
      background: '#020617',
      surface: '#0f172a',
      foreground: '#f8fafc',
      muted: '#0f172a',
      mutedForeground: '#94a3b8',
      border: '#1e293b',
      success: '#4ade80',
      warning: '#fbbf24',
      danger: '#f87171',
    },
    typography: {
      fontFamily: '"Space Grotesk", "JetBrains Mono", monospace',
      headingFontFamily: '"Space Grotesk", sans-serif',
      baseSize: '16px',
      scaleRatio: '1.25',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0',
    shadows: {
      sm: '0 0 4px rgba(34,211,238,0.2)',
      md: '0 0 12px rgba(34,211,238,0.3)',
      lg: '0 0 24px rgba(34,211,238,0.4)',
    },
    style: 'cyberpunk',
    mode: 'dark',
    tailwindExtend: {},
  },
  elegant: {
    name: 'Elegant',
    description: 'Serif fonts, gold accents, premium feel. For luxury and high-end SaaS.',
    colors: {
      primary: '#92400e',
      primaryHover: '#78350f',
      secondary: '#fef3c7',
      accent: '#d97706',
      background: '#fffbf0',
      surface: '#fef9ee',
      foreground: '#1c1917',
      muted: '#fef3c7',
      mutedForeground: '#78716c',
      border: '#e7e5e4',
      success: '#15803d',
      warning: '#b45309',
      danger: '#b91c1c',
    },
    typography: {
      fontFamily: '"Lora", "Georgia", serif',
      headingFontFamily: '"Playfair Display", "Georgia", serif',
      baseSize: '17px',
      scaleRatio: '1.333',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0.25rem',
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 8px rgba(0,0,0,0.06)',
      lg: '0 8px 24px rgba(0,0,0,0.08)',
    },
    style: 'elegant',
    mode: 'light',
    tailwindExtend: {},
  },
  playful: {
    name: 'Playful',
    description: 'Rounded corners, vibrant purple, friendly. For education and wellness apps.',
    colors: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      secondary: '#f5f3ff',
      accent: '#ec4899',
      background: '#ffffff',
      surface: '#faf5ff',
      foreground: '#1e1b4b',
      muted: '#f5f3ff',
      mutedForeground: '#6b7280',
      border: '#e9d5ff',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    typography: {
      fontFamily: '"Nunito", "Poppins", sans-serif',
      headingFontFamily: '"Nunito", "Poppins", sans-serif',
      baseSize: '16px',
      scaleRatio: '1.25',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '1rem',
    shadows: {
      sm: '0 1px 3px rgba(124,58,237,0.08)',
      md: '0 4px 12px rgba(124,58,237,0.12)',
      lg: '0 8px 24px rgba(124,58,237,0.16)',
    },
    style: 'playful',
    mode: 'light',
    tailwindExtend: {},
  },
  brutalism: {
    name: 'Brutalism',
    description: 'Bold borders, flat colors, no shadows, raw aesthetic. For creative agencies.',
    colors: {
      primary: '#000000',
      primaryHover: '#1f2937',
      secondary: '#fef08a',
      accent: '#ef4444',
      background: '#ffffff',
      surface: '#f9fafb',
      foreground: '#000000',
      muted: '#f3f4f6',
      mutedForeground: '#374151',
      border: '#000000',
      success: '#16a34a',
      warning: '#ca8a04',
      danger: '#dc2626',
    },
    typography: {
      fontFamily: '"Space Mono", "Courier New", monospace',
      headingFontFamily: '"Space Mono", monospace',
      baseSize: '16px',
      scaleRatio: '1.25',
    },
    spacing: { unit: '4px', scale: ['4px', '8px', '16px', '24px', '32px', '48px', '64px', '96px'] },
    borderRadius: '0',
    shadows: {
      sm: '2px 2px 0px #000000',
      md: '4px 4px 0px #000000',
      lg: '6px 6px 0px #000000',
    },
    style: 'brutalism',
    mode: 'light',
    tailwindExtend: {},
  },
}

// ─── Niche → Style mapping (auto-selection when no style provided) ─────────────

const NICHE_STYLE_MAP: Record<string, string> = {
  'teretana-crm': 'corporate',
  'gym-crm': 'corporate',
  'yoga-studio': 'minimalist',
  'salon-booking': 'minimalist',
  'restaurant-management': 'elegant',
  'hotel-management': 'elegant',
  'online-store': 'minimalist',
  'subscription-box': 'playful',
  'freelancer-crm': 'minimalist',
  'law-firm-crm': 'corporate',
  'accounting-saas': 'corporate',
  'online-course-platform': 'playful',
  'tutoring-platform': 'playful',
  'clinic-management': 'corporate',
  'property-management': 'corporate',
  'hr-management': 'corporate',
  'ats-recruiting': 'corporate',
  'email-marketing': 'minimalist',
  'project-management': 'linear',
}

// ─── ThemeAgent ────────────────────────────────────────────────────────────────

export class ThemeAgent {
  private llm = getLLMClient()
  private orchestrator?: WarRoomOrchestrator
  private log = logger.child({ agent: 'ThemeAgent' })

  constructor(orchestrator?: WarRoomOrchestrator) {
    this.orchestrator = orchestrator
  }

  /**
   * Generate a complete Apple-level design system for the given SaaS.
   *
   * Priority order:
   *   1. Predefined preset (if requestedStyle matches exactly)
   *   2. Niche auto-mapping (if niche is known)
   *   3. Claude Sonnet with embedded expert knowledge (for custom styles)
   */
  async generateTheme(
    saasDescription: string,
    requestedStyle?: string,
    requestedColor?: string,
    niche?: string,
  ): Promise<ThemeConfig> {
    this.log.info({ saasDescription, requestedStyle, requestedColor, niche }, 'Generating theme')

    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'ThemeAgent',
        recipient: 'Orchestrator',
        type: 'info',
        content: `Generating Apple-level design system. Style: ${requestedStyle || 'auto'}, Color: ${requestedColor || 'auto'}`,
      })
    }

    // ── 1. Exact preset match ──────────────────────────────────────────────────
    const styleKey = requestedStyle?.toLowerCase()
    if (styleKey && PREDEFINED_THEMES[styleKey]) {
      const theme = this.applyColorOverride(PREDEFINED_THEMES[styleKey], requestedColor)
      this.log.info({ preset: styleKey }, 'Using predefined theme preset')
      return theme
    }

    // ── 2. Niche auto-mapping ──────────────────────────────────────────────────
    if (!requestedStyle && niche && NICHE_STYLE_MAP[niche]) {
      const autoStyle = NICHE_STYLE_MAP[niche]
      const theme = this.applyColorOverride(PREDEFINED_THEMES[autoStyle], requestedColor)
      this.log.info({ niche, autoStyle }, 'Auto-selected theme from niche')
      return theme
    }

    // ── 3. Claude Sonnet with expert knowledge ─────────────────────────────────
    return this.generateWithExpertKnowledge(saasDescription, requestedStyle, requestedColor)
  }

  /**
   * Uses Claude Sonnet with all embedded design expert knowledge to generate
   * a custom, Apple-quality design system.
   */
  private async generateWithExpertKnowledge(
    saasDescription: string,
    requestedStyle?: string,
    requestedColor?: string,
  ): Promise<ThemeConfig> {
    const systemPrompt = `You are a world-class UI/UX designer with expertise in:
- Apple Human Interface Guidelines
- Linear.app design methodology  
- Vercel dashboard patterns
- Refactoring UI principles (Wathan & Schoger)
- Gestalt principles applied to SaaS

Your designs are consistently described as "Apple-level" quality.
You output ONLY valid JSON, no markdown, no explanation.`

    const userPrompt = `Create a complete design system for this SaaS application.

SaaS Description: ${saasDescription}
Requested Style: ${requestedStyle || 'Choose the best style for this type of SaaS'}
Requested Primary Color: ${requestedColor || 'Choose the best color for this type of SaaS'}

## Design Expert Knowledge to Apply:

${APPLE_DESIGN_PRINCIPLES}

${REFACTORING_UI_RULES}

${LINEAR_DESIGN_METHODOLOGY}

${VERCEL_DASHBOARD_PATTERNS}

${GESTALT_FOR_SAAS}

## Requirements:
1. Colors must have WCAG AA contrast ratio (4.5:1 minimum for body text)
2. Use the 8pt spacing grid (4, 8, 16, 24, 32, 48, 64, 96px)
3. Choose fonts available on Google Fonts or system fonts
4. Shadows should be subtle (Apple-style), not harsh
5. Border-radius should match the style personality
6. The design should feel premium and production-ready

Output this exact JSON structure (no other text):
{
  "name": "Theme Name",
  "description": "One sentence describing the visual vibe",
  "colors": {
    "primary": "#hex",
    "primaryHover": "#hex (slightly darker)",
    "secondary": "#hex (light tint of primary)",
    "accent": "#hex (complementary highlight color)",
    "background": "#hex (page background)",
    "surface": "#hex (card/panel background, slightly off-white)",
    "foreground": "#hex (primary text)",
    "muted": "#hex (subtle background for inactive states)",
    "mutedForeground": "#hex (secondary text, ~50% contrast)",
    "border": "#hex (dividers, input borders)",
    "success": "#hex",
    "warning": "#hex",
    "danger": "#hex"
  },
  "typography": {
    "fontFamily": "font name, fallback",
    "headingFontFamily": "font name, fallback",
    "baseSize": "16px",
    "scaleRatio": "1.25"
  },
  "spacing": {
    "unit": "4px",
    "scale": ["4px", "8px", "16px", "24px", "32px", "48px", "64px", "96px"]
  },
  "borderRadius": "0.5rem",
  "shadows": {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
    "lg": "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)"
  },
  "style": "minimalist|corporate|playful|cyberpunk|elegant|brutalism|linear",
  "mode": "light|dark",
  "tailwindExtend": {}
}`

    try {
      const response = await this.llm.chat({
        model: CLAUDE_MODELS.SONNET,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
        temperature: 0.4,
        max_tokens: 1500,
      })

      const raw = response.content?.trim() ?? ''
      // Extract JSON if wrapped in code block
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw]
      const jsonStr = jsonMatch[1]?.trim() ?? raw

      const theme: ThemeConfig = JSON.parse(jsonStr)

      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'ThemeAgent',
          recipient: 'Orchestrator',
          type: 'response',
          content: `Generated "${theme.name}" design system (${theme.mode} mode, primary: ${theme.colors.primary})`,
          payload: theme,
        })
      }

      return theme
    } catch (e) {
      this.log.error({ e }, 'Failed to generate custom theme, falling back to apple preset')
      return PREDEFINED_THEMES.apple
    }
  }

  /** Apply a color override to a preset theme */
  private applyColorOverride(theme: ThemeConfig, color?: string): ThemeConfig {
    if (!color) return { ...theme }
    return {
      ...theme,
      colors: {
        ...theme.colors,
        primary: color,
      },
    }
  }

  /** List all available presets */
  static listPresets(): string[] {
    return Object.keys(PREDEFINED_THEMES)
  }

  /** Get a preset by name */
  static getPreset(name: string): ThemeConfig | undefined {
    return PREDEFINED_THEMES[name.toLowerCase()]
  }
}
