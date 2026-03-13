# Figma → Tailwind Design Sync

## Overview

This document describes how design tokens flow from Figma to production code via Tailwind CSS integration.

## Architecture

```
Figma (Design Source)
    ↓
Design Tokens Export (figma-tokens.json)
    ↓
packages/ui/src/design-tokens.ts (TypeScript)
    ↓
packages/ui/tailwind.config.ts (Tailwind CSS)
    ↓
@saas-factory/ui Components
    ↓
All SaaS Apps (apps/*, factory-dashboard)
```

## Design Tokens

Located in [`packages/ui/src/design-tokens.ts`](src/design-tokens.ts):

### Color System
```typescript
colors: {
  primary: '#007AFF',           // iOS blue
  primaryLight: '#5AC8FA',      // Light variant
  primaryDark: '#0051D5',       // Dark variant
  secondary: '#5AC8FA',
  tertiary: '#FF9500',
  
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  info: '#00b4db',
  
  light: { /* Light mode colors */ },
  dark: { /* Dark mode colors */ }
}
```

### Typography Scale
```typescript
typography: {
  display: { size: '28px', weight: 700, lineHeight: 1.2 },
  title: { size: '22px', weight: 600, lineHeight: 1.3 },
  headline: { size: '17px', weight: 600, lineHeight: 1.4 },
  body: { size: '16px', weight: 400, lineHeight: 1.5 },
  caption: { size: '13px', weight: 400, lineHeight: 1.4 }
}
```

### Spacing Scale
```typescript
spacing: {
  xs: '4px',   sm: '8px',   md: '16px',   lg: '24px',
  xl: '32px',  '2xl': '48px', '3xl': '64px', '4xl': '96px'
}
```

## Tailwind Integration

Located in [`packages/ui/tailwind.config.ts`](tailwind.config.ts):

```typescript
// Design tokens automatically mapped to Tailwind
<div className="bg-primary text-text-light-primary shadow-md rounded-lg p-md">
  Apple-inspired component
</div>
```

### Color Utilities
```html
<!-- Primary colors -->
<div className="bg-primary">Primary background</div>
<div className="text-primary-dark">Dark text</div>

<!-- Semantic colors -->
<div className="text-success">Success</div>
<div className="bg-danger">Danger</div>

<!-- Mode-aware -->
<div className="dark:bg-surface-dark dark:text-text-dark-primary">Dark mode box</div>
```

### Typography Utilities
```html
<h1 className="text-display font-bold">Display</h1>
<h2 className="text-title font-semibold">Title</h2>
<p className="text-body">Body text</p>
<span className="text-caption">Caption</span>
```

### Spacing Utilities
```html
<div className="p-md gap-lg">
  Padding medium, gap large
</div>
```

## Sync Workflow

### Step 1: Figma Export
1. Go to Figma project → Components
2. Select Design Tokens frame
3. Export → "Export as tokens.json"
4. Copy to `packages/ui/figma-tokens.json`

### Step 2: Update TypeScript Tokens
```bash
npm run tokens:sync
```
This updates `packages/ui/src/design-tokens.ts` from `figma-tokens.json`.

### Step 3: Rebuild Tailwind Config
```bash
npm run build
```
Tailwind config automatically picks up changes.

### Step 4: Test in Storybook
```bash
npm run storybook
```
View components with updated design tokens.

## Design Token Format

### figma-tokens.json
```json
{
  "colors": {
    "primary": {
      "value": "#007AFF",
      "type": "color",
      "description": "Primary brand color - iOS blue"
    }
  },
  "typography": {
    "body": {
      "fontSize": { "value": "16px", "type": "dimension" },
      "fontWeight": { "value": "400", "type": "fontWeight" },
      "lineHeight": { "value": "1.5", "type": "lineHeight" }
    }
  },
  "spacing": {
    "md": {
      "value": "16px",
      "type": "dimension"
    }
  }
}
```

## Component Development

### Using Design Tokens in Components

```tsx
// ✅ Correct - Using Tailwind classes
function Button() {
  return (
    <button className="px-md py-sm bg-primary text-white rounded-md hover:bg-primary-dark">
      Action
    </button>
  );
}

// ❌ Incorrect - Hardcoded values
function BadButton() {
  return (
    <button style={{ padding: '12px 16px', backgroundColor: '#007AFF' }}>
      Action
    </button>
  );
}
```

## Design Approval Workflow

### Stage 1: Design Review (Figma)
- Designer creates component in Figma
- Team reviews in design tools
- Approves design tokens

### Stage 2: Code Generation (Storybook)
- Tokens exported to `figma-tokens.json`
- Auto-sync to `design-tokens.ts`
- Components updated in Storybook

### Stage 3: QA (Visual Regression)
```bash
npm run test:visual
```
- Compares renders with approved baseline
- Flags visual regressions

### Stage 4: Production
- Merge to main branch
- Publish to npm
- Deploy to all apps

## Maintenance

### Adding New Design Token

1. **Figma**
   - Create new token in Figma components
   - Name with format: `category/subcategory-name` (e.g., `color/semantic-success`)

2. **Export**
   ```bash
   # Generate new figma-tokens.json
   npm run tokens:export
   ```

3. **Test**
   ```bash
   npm run storybook
   ```

4. **Deploy**
   ```bash
   npm run build
   npm run publish
   ```

### Versioning

Design token versions follow semantic versioning:
- **Major**: Breaking changes (e.g., color palette overhaul)
- **Minor**: New tokens added (e.g., new spacing value)
- **Patch**: Token value changes (e.g., primary color shade adjustment)

## Accessibility Compliance

All design tokens meet WCAG AA standards:
- ✅ Color contrast ratios ≥ 4.5:1
- ✅ Font sizes ≥ 12px
- ✅ Line heights ≥ 1.4
- ✅ Touch targets ≥ 44px

## Tools

- **Figma**: Design source of truth
- **Tailwind CSS**: Utility-first CSS generation
- **Storybook**: Component documentation & preview
- **Design Tokens JSON**: Token exchange format
- **TypeScript**: Type-safe token definitions

## Scripts

```bash
# Storybook
npm run storybook           # Start Storybook dev server
npm run build-storybook     # Build static Storybook

# Tokens
npm run tokens:sync         # Sync Figma tokens to TypeScript
npm run tokens:export       # Export to figma-tokens.json
npm run tokens:validate     # Validate token format

# Quality
npm run test:visual         # Visual regression testing
npm run a11y:audit         # Accessibility audit
npm run build              # Full build with Tailwind
```

## References

- [Tailwind CSS Configuration](https://tailwindcss.com/docs/configuration)
- [Design Tokens Community](https://www.designtokens.org/)
- [Figma Dev Mode](https://www.figma.com/dev-mode/)
- [Storybook Design System](https://storybook.js.org/docs/get-started/design-systems)
