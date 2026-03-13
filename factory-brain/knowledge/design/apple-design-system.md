# Apple Design System — Premium SaaS Templates

*How Apple designs UI/UX + How to apply to SaaS applications*

---

## Part 1: Core Design Principles

### 1. Clarity
```
Apple principle: "Consistency maintains visual coherence across the interface."

For SaaS:
✓ One primary action per page (strong CTA)
✓ Predictable navigation paths
✓ Clear information hierarchy
✗ NO competing visual elements
✗ NO confusing micro-interactions

Example:
❌ Dashboard with 10 different colored widgets fighting for attention
✅ Dashboard with clear hierarchy: Title → Key metric → Actions → Details
```

### 2. Deference (Content over Chrome)
```
UI should get out of the way. Content should shine.

Principles:
- Minimal chrome (borders, shadows, decorations)
- Maximum white space
- Typography-driven layout
- Subtle shadows (not bold)
- Clean backgrounds (white or neutral)

Colors:
- Primary action: One strong color (Apple: light blue)
- Secondary: Muted gray
- Destructive: Red
- Success: Green
- Warning: Orange
- Background: White or off-white (#F5F5F5)
```

### 3. Depth (Layered Interface)
```
Create visual hierarchy through:
- Layering (cards, modals, popovers)
- Shadows (subtle, not harsh)
- Transparency / Blur
- Scale (larger = more important)
- Color (bolder = more important)

Apple Example:
┌────────────────────────┐
│ Top bar (solid white)  │ ← Layer 0 (groundplane)
├────────────────────────┤
│ ┌──────────────────┐   │
│ │ Card (shadow)    │   │ ← Layer 1 (raised)
│ └──────────────────┘   │
│                        │
│ ┌──────────────────┐   │
│ │ Modal (overlay)  │   │ ← Layer 2 (floating)
│ └──────────────────┘   │
└────────────────────────┘
```

---

## Part 2: Design Tokens (Tailwind CSS)

### Color Palette
```typescript
// Apple-inspired colors
export const COLORS = {
  // Primary
  primary: '#007AFF',      // iPhone blue
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D5',

  // Secondary
  secondary: '#5AC8FA',    // Light blue
  tertiary: '#FF9500',     // Orange

  // Semantic
  success: '#34C759',      // Green
  warning: '#FF9500',      // Orange
  danger: '#FF3B30',       // Red
  information: '#00b4db',  // Blue

  // Neutral (grayscale)
  background: '#FFFFFF',
  surface: '#F2F2F7',      // iOS light gray
  border: '#E5E5EA',
  text: {
    primary: '#000000',    // 100%
    secondary: '#3C3C43',  // ~70%
    tertiary: '#8E8E93',   // ~50%
    quarternary: '#C7C7CC' // ~30%
  }
}

// Use in Tailwind
// bg-apple-primary text-apple-text-primary
```

### Typography Scale
```
macOS/iOS uses consistent type hierarchy:

Display (large headers)
- Size: 28-34px
- Weight: 700 (bold)
- Line height: 1.2
- Letter spacing: -0.5px

Title (Section headers)
- Size: 22px
- Weight: 600
- Line height: 1.3

Headline
- Size: 17px
- Weight: 600
- Line height: 1.4

Body
- Size: 16px
- Weight: 400
- Line height: 1.5

Caption
- Size: 13px
- Weight: 400
- Line height: 1.4
- Color: tertiary text
```

### Spacing Scale (8pt grid)
```
Apple uses 8px base unit:

xs:  4px (rare)
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
4xl: 96px

// Example: Card padding
padding: 16px (md) → comfortable, not cramped
margin-bottom: 24px (lg) → breathing room between sections
```

### Shadows (Depth)
```
Apple shadows are subtle:

// Elevation 0 (ground level)
box-shadow: none

// Elevation 1 (raised, hover state)
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)

// Elevation 2 (floating, drawer)
box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)

// Elevation 3 (modal, popover)
box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)

// Elevation 4 (top-level modal)
box-shadow: 0 15px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05)

Key: Subtle, not harsh or dark
```

---

## Part 3: Component Library (Apple Pattern)

### Button Hierarchy
```typescript
// Primary Button (main action)
<button className="
  bg-apple-primary text-white
  px-16 py-10 rounded-lg
  font-semibold text-base
  hover:bg-apple-primary-dark
  active:scale-95
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200
">
  Get Started
</button>

// Secondary Button (alternative action)
<button className="
  bg-apple-surface text-apple-text-primary
  px-16 py-10 rounded-lg
  font-semibold text-base
  hover:bg-gray-200
  active:scale-95
  border border-transparent
  transition-all duration-200
">
  View Pricing
</button>

// Tertiary Link (lowest priority)
<button className="
  bg-transparent text-apple-primary
  px-16 py-10 rounded-lg
  font-semibold text-base
  hover:bg-transparent hover:text-apple-primary-dark
  active:text-apple-primary-dark
  transition-all duration-200
">
  Learn More
</button>
```

### Card Component
```typescript
export function Card({ title, description, action, icon, variant = 'default' }) {
  const variants = {
    default: 'bg-white border border-apple-border',
    elevated: 'bg-white shadow-elevation-1',
    surface: 'bg-apple-surface border border-apple-border',
  }

  return (
    <div className={`
      ${variants[variant]}
      rounded-xl p-lg
      transition-all duration-200
      hover:shadow-elevation-2
    `}>
      {icon && (
        <div className="mb-md text-2xl">
          {icon}
        </div>
      )}
      
      {title && (
        <h3 className="text-headline font-semibold mb-sm text-apple-text-primary">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-body text-apple-text-secondary mb-md">
          {description}
        </p>
      )}
      
      {action && (
        <button className="text-body font-semibold text-apple-primary hover:text-apple-primary-dark">
          {action}
        </button>
      )}
    </div>
  )
}
```

### Form Elements
```typescript
// Apple-style input
<input className="
  bg-apple-surface
  border border-apple-border
  rounded-lg
  px-md py-sm
  text-body text-apple-text-primary
  placeholder:text-apple-text-tertiary
  focus:outline-none
  focus:ring-2 focus:ring-apple-primary focus:ring-offset-0
  hover:border-apple-text-secondary
  transition-colors duration-200
" />

// Apple-style Switch (toggle)
<input type="checkbox" className="
  w-12 h-7
  rounded-full
  bg-apple-text-quarternary
  checked:bg-apple-success
  relative
  cursor-pointer
  transition-colors duration-200
" />

// Apple-style Select
<select className="
  bg-white
  border border-apple-border
  rounded-lg
  px-md py-sm
  text-body text-apple-text-primary
  focus:outline-none
  focus:ring-2 focus:ring-apple-primary
  hover:border-apple-text-secondary
  transition-colors duration-200
">
</select>
```

---

## Part 4: Layout Patterns

### Safe Area Grid (Web equivalent)
```
Apple uses safe areas for iPhone notch/island.
For web, use consistent margins:

┌────────────────────────────────────┐
│    0px (safe edge)                 │
│  ┌──────────────────────────────┐  │ ← 16px margin
│  │ Content area                 │  │
│  │ (max-width: 1240px)          │  │
│  └──────────────────────────────┘  │
│    0px (safe edge)                 │
└────────────────────────────────────┘

// Tailwind
<div className="px-4 md:px-8 lg:px-16 max-w-5xl mx-auto">
  {/* Content */}
</div>
```

### Hero Section (Premium)
```typescript
export function HeroSection() {
  return (
    <section className="
      bg-white
      py-32 md:py-48
      px-4
    ">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="
          text-5xl md:text-6xl lg:text-7xl
          font-bold
          text-apple-text-primary
          mb-6
          tracking-tight
        ">
          Imagine what you'll create
        </h1>
        
        <p className="
          text-2xl md:text-3xl
          text-apple-text-secondary
          mb-12
          leading-relaxed
        ">
          Powerful tools designed to work beautifully together.
        </p>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="bg-apple-primary text-white px-8 py-3 rounded-lg font-semibold">
            Get Started
          </button>
          <button className="border border-apple-border bg-white text-apple-text-primary px-8 py-3 rounded-lg font-semibold">
            Watch Video
          </button>
        </div>
      </div>
    </section>
  )
}
```

### Feature Grid (3-column)
```typescript
export function FeaturesGrid() {
  const features = [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Optimized for performance in every detail'
    },
    // ... more features
  ]

  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16">
          Feature-rich. Always growing.
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="
              text-center
              p-8
              rounded-xl
              hover:bg-apple-surface
              transition-colors duration-200
            ">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-apple-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Part 5: Dark Mode

```typescript
// Apple supports light & dark modes seamlessly
export const darkModeColors = {
  background: '#000000',
  surface: '#1C1C1E',
  border: '#38383A',
  text: {
    primary: '#FFFFFF',
    secondary: '#A2A2A7',
    tertiary: '#86868B',
    quarternary: '#545456'
  }
}

// Tailwind dark mode
<div className="
  bg-white dark:bg-black
  text-apple-text-primary dark:text-white
  border border-apple-border dark:border-gray-800
">
</div>

// CSS variables (better approach)
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #000000;
    --color-surface: #1C1C1E;
    --color-text-primary: #FFFFFF;
  }
}
```

---

## Part 6: Animation & Microinteractions

```typescript
// Apple animations are smooth, not jarring
// Duration: 200-500ms typically
// Easing: ease-out (starts fast, ends slow)

// Button press (tactile feedback)
<button className="
  active:scale-95 active:opacity-90
  transition-transform duration-150
">

// Hover state (inviting)
<div className="
  hover:scale-105 hover:shadow-elevation-2
  transition-all duration-200
  cursor-pointer
">

// Loading state (reassurance)
export function Loader() {
  return (
    <div className="
      w-8 h-8
      border-4 border-apple-surface
      border-t-4 border-t-apple-primary
      rounded-full
      animate-spin
    "/>
  )
}

// Smooth fade-in
export function FadeIn({ children }) {
  return (
    <div className="
      opacity-0
      animate-in fade-in
      duration-500
    ">
      {children}
    </div>
  )
}
```

---

## Part 7: Accessibility (Apple Standard)

```typescript
// Color contrast (WCAG AAA)
// Large text: minimum 4.5:1 ratio
// Normal text: minimum 7:1 ratio

// Focus states (keyboard navigation)
<button className="
  focus-visible:outline-2
  focus-visible:outline-offset-2
  focus-visible:outline-apple-primary
">

// Screen reader support
<button aria-label="Close menu" aria-pressed={isOpen}>
  <X className="w-6 h-6" />
</button>

// Semantic HTML
<header>
  <nav>...</nav>
</header>
<main>
  <article>...</article>
</main>
<footer>...</footer>

// Text alternatives
<img src="chart.png" alt="Monthly revenue chart showing 15% growth" />

// Motion preferences
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Part 8: Complete SaaS Dashboard Example (Apple Style)

```typescript
export function Dashboard() {
  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <header className="
        border-b border-apple-border
        px-6 py-4
        sticky top-0 bg-white/95 backdrop-blur
      ">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-apple-text-primary">
            Dashboard
          </h1>
          <button className="
            w-10 h-10 rounded-full
            bg-apple-surface
            hover:bg-gray-200
            transition-colors
          ">
            👤
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Revenue', value: '$45,231.89', icon: '💰' },
            { label: 'Active Users', value: '2,543', icon: '👥' },
            { label: 'Conversion', value: '12.5%', icon: '📈' },
            { label: 'Churn', value: '2.1%', icon: '📉' },
          ].map((kpi) => (
            <div key={kpi.label} className="
              bg-white
              border border-apple-border
              rounded-xl p-6
              hover:shadow-elevation-1
              transition-shadow
            ">
              <div className="text-3xl mb-2">{kpi.icon}</div>
              <p className="text-sm text-apple-text-tertiary mb-2">
                {kpi.label}
              </p>
              <p className="text-3xl font-semibold text-apple-text-primary">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="
          bg-white
          border border-apple-border
          rounded-xl p-8
        ">
          <h2 className="text-title font-semibold mb-6">
            Revenue Trend
          </h2>
          {/* Chart component here */}
        </div>
      </main>
    </div>
  )
}
```

---

## Part 9: Design Checklist for Every SaaS

```
□ Typography
  □ Clear hierarchy (Display → Title → Body → Caption)
  □ Maximum 2-3 fonts (Apple uses only 2-3)
  □ Consistent line heights (1.2 - 1.6)

□ Colors
  □ Primary color (1 main, 1 accent)
  □ Semantic colors (success, danger, warning)
  □ High contrast ratios (WCAG AAA)
  □ Dark mode support

□ Spacing
  □ 8px grid system
  □ Breathing room (not cramped)
  □ Consistent margins/padding

□ Components
  □ Button hierarchy (primary, secondary, tertiary)
  □ Form inputs with proper focus states
  □ Cards with subtle shadows
  □ Modals/dialogs with backdrop

□ Interactions
  □ Smooth animations (200-500ms)
  □ Hover states (visual feedback)
  □ Loading states (progress indication)
  □ Error states (clear messaging)

□ Layout
  □ Max-width constraint (1240px)
  □ Responsive padding
  □ Safe areas / margins

□ Accessibility
  □ Color contrast (7:1 for normal text)
  □ Keyboard navigation
  □ Screen reader support
  □ Semantic HTML
  □ Focus indicators
  □ Motion preferences honored
```

---

*Apple's design philosophy: "Simplicity is the ultimate sophistication."*

*Every element should serve a purpose. Every interaction should feel natural. Every screen should be a pleasure to use.*

*This is the standard for premium SaaS applications.*
