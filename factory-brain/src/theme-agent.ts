import { getLLMClient, CLAUDE_MODELS } from './llm/client'
import { WarRoomOrchestrator, AgentContext } from './war-room-orchestrator'
import { logger } from './utils/logger'

export interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
  };
  borderRadius: string; // e.g., '0', '0.25rem', '0.5rem', '1rem', '9999px'
  style: 'minimalist' | 'corporate' | 'playful' | 'cyberpunk' | 'elegant' | 'brutalism' | string;
  mode: 'light' | 'dark' | 'system';
}

const PREDEFINED_THEMES: Record<string, ThemeConfig> = {
  minimalist: {
    name: 'Minimalist',
    description: 'Clean, lots of whitespace, monochrome with one accent color.',
    colors: {
      primary: '#000000',
      secondary: '#f3f4f6',
      accent: '#3b82f6',
      background: '#ffffff',
      foreground: '#0f172a',
      muted: '#f8fafc',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
    },
    typography: { fontFamily: 'Inter, sans-serif', headingFontFamily: 'Inter, sans-serif' },
    borderRadius: '0.25rem',
    style: 'minimalist',
    mode: 'light',
  },
  corporate: {
    name: 'Corporate',
    description: 'Professional, trustworthy, usually blue/navy dominant.',
    colors: {
      primary: '#1e3a8a',
      secondary: '#eff6ff',
      accent: '#2563eb',
      background: '#ffffff',
      foreground: '#1e293b',
      muted: '#f1f5f9',
      mutedForeground: '#475569',
      border: '#cbd5e1',
    },
    typography: { fontFamily: 'Roboto, sans-serif', headingFontFamily: 'Roboto, sans-serif' },
    borderRadius: '0.375rem',
    style: 'corporate',
    mode: 'light',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Dark mode, neon colors, high contrast.',
    colors: {
      primary: '#fef08a',
      secondary: '#1e1b4b',
      accent: '#22d3ee',
      background: '#020617',
      foreground: '#f8fafc',
      muted: '#0f172a',
      mutedForeground: '#94a3b8',
      border: '#1e293b',
    },
    typography: { fontFamily: 'Space Grotesk, sans-serif', headingFontFamily: 'Space Grotesk, sans-serif' },
    borderRadius: '0',
    style: 'cyberpunk',
    mode: 'dark',
  }
};

export class ThemeAgent {
  private llm = getLLMClient();
  private orchestrator?: WarRoomOrchestrator;

  constructor(orchestrator?: WarRoomOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async generateTheme(
    saasDescription: string, 
    requestedStyle?: string, 
    requestedColor?: string
  ): Promise<ThemeConfig> {
    if (this.orchestrator) {
      await this.orchestrator.sendMessage({
        sender: 'Theme Agent',
        recipient: 'Orchestrator',
        type: 'info',
        content: `Generating design system for: ${saasDescription}. Style: ${requestedStyle || 'auto'}, Color: ${requestedColor || 'auto'}`,
      });
    }

    // If a predefined theme matches exactly, use it as a base
    if (requestedStyle && PREDEFINED_THEMES[requestedStyle.toLowerCase()]) {
      const baseTheme = { ...PREDEFINED_THEMES[requestedStyle.toLowerCase()] };
      if (requestedColor) {
        baseTheme.colors.primary = requestedColor;
      }
      return baseTheme;
    }

    const prompt = `You are an expert UI/UX Designer creating a design system for a new SaaS application.
    
SaaS Description: ${saasDescription}
Requested Style: ${requestedStyle || 'Determine the best style based on the description'}
Requested Primary Color: ${requestedColor || 'Determine the best color based on the description'}

Generate a complete design system (ThemeConfig) in JSON format.
Ensure the colors have good contrast and accessibility.
Use valid CSS color values (hex preferred).

Output JSON structure:
{
  "name": "Theme Name",
  "description": "Short description of the visual vibe",
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "foreground": "#hex",
    "muted": "#hex",
    "mutedForeground": "#hex",
    "border": "#hex"
  },
  "typography": {
    "fontFamily": "font name, sans-serif",
    "headingFontFamily": "font name, sans-serif"
  },
  "borderRadius": "0.5rem",
  "style": "minimalist|corporate|playful|cyberpunk|elegant|brutalism",
  "mode": "light|dark"
}`;

    const response = await this.llm.chat({
      model: CLAUDE_MODELS.HAIKU,
      messages: [
        { role: "system", content: "You are an expert UI/UX designer. Output ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const themeJson = response.content;
    if (!themeJson) {
      throw new Error("Failed to generate theme.");
    }

    try {
      const theme: ThemeConfig = JSON.parse(themeJson);
      if (this.orchestrator) {
        await this.orchestrator.sendMessage({
          sender: 'Theme Agent',
          recipient: 'Orchestrator',
          type: 'response',
          content: `Generated ${theme.name} theme (${theme.mode} mode, primary: ${theme.colors.primary})`,
          payload: theme,
        });
      }
      return theme;
    } catch (e) {
      logger.error("Failed to parse generated theme JSON:", themeJson, e);
      // Fallback to minimalist
      return PREDEFINED_THEMES.minimalist;
    }
  }
}
