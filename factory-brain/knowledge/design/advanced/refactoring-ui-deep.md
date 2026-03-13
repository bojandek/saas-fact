# Refactoring UI Deep Dive: Visual Hierarchy Rules

## Overview
Adam Wathan & Steve Schoger's "Refactoring UI" distills decades of design experience into systematic rules. This isn't design theory—it's a framework for making interfaces that feel professional without hiring expensive designers.

## Core Principle: Hierarchy First

Design is about **prioritization**. Your job is determining what matters and making that obvious.

### Visual Hierarchy Ladder
```
1. Size            (Biggest: Most important)
2. Color           (Attention: What draws eye)
3. Weight          (Bold vs Regular: Emphasis)
4. Contrast        (Dark vs Light: Distinction)
5. Proximity       (Grouped items: Relationships)
6. Whitespace      (Breathing room: Calmness)
```

## Rule 1: Don't Use Gray Text on Colored Backgrounds

### Wrong ❌
```
<div style={{ background: '#3B82F6' }}>
  <span style={{ color: '#9CA3AF' }}>
    Secondary text  (gray on blue: unreadable)
  </span>
</div>
```

### Right ✓
```
<div style={{ background: '#3B82F6' }}>
  {/* Reduce opacity, not lightness */}
  <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
    Secondary text  (white with opacity)
  </span>
</div>
```

**Why**: Gray shifts color appearance. White + opacity looks better.

## Rule 2: Oversized Headlines Don't Need Contrast

### Wrong ❌
```
<h1 style={{ fontSize: '48px', color: '#1F2937', fontWeight: 700 }}>
  Huge Bold Text  (too much contrast, feels aggressive)
</h1>
```

### Right ✓
```
<h1 style={{ fontSize: '48px', color: '#6B7280', fontWeight: 700 }}>
  Huge Bold Text  (medium gray, size creates hierarchy)
</h1>
</h1>
```

**Why**: Size alone creates priority. Darkening it adds unnecessary contrast.

## Rule 3: Emphasize by De-emphasizing

Hierarchy works through contrast. To make important stuff pop:

### Pattern: Badge System
```jsx
const BadgePattern = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {/* Approach 1: Bold the important part */}
    <div>
      <span style={{ fontWeight: 700 }}>$9</span>
      <span style={{ color: '#6B7280', fontSize: '12px' }}>/month</span>
    </div>
    
    {/* Approach 2: Make secondary smaller */}
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '16px', fontWeight: 600 }}>Pro Plan</span>
      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Renews monthly</span>
    </div>
  </div>
);
```

## Rule 4: Labels Don't Make Good Primary Action

### Wrong ❌
```jsx
<div>
  <label htmlFor="email">Email</label>
  <input type="email" />
  <button style={{ background: '#E5E7EB', color: '#374151' }}>
    Subscribe
  </button>
</div>
```

### Right ✓
```jsx
<div>
  <input 
    type="email" 
    placeholder="your@email.com"
    style={{ borderBottom: '1px solid #E5E7EB' }}
  />
  <button style={{ background: '#3B82F6', color: 'white' }}>
    Subscribe
  </button>
</div>
```

**Why**: 
- Labels are secondary information (where to put data)
- Placeholder guides you (what kind of data)
- Button gets all visual weight

## Rule 5: Weaken Everything That's Not Important

The opposite of "make it bold"—reduce visual weight of supporting information.

### Form Example
```jsx
const FormWithHierarchy = () => (
  <form>
    <div>
      <input 
        placeholder="Full name"
        style={{
          fontSize: '16px',
          padding: '12px',
          border: '1px solid #E5E7EB',
        }}
      />
    </div>
    
    {/* Weak secondary text */}
    <div style={{ 
      fontSize: '12px', 
      color: '#9CA3AF', 
      marginTop: '4px',
      fontWeight: 400
    }}>
      We'll use this to send your receipt
    </div>
    
    <button style={{
      fontSize: '14px',
      fontWeight: 600,
      background: '#000',
      color: 'white',
      padding: '12px 24px',
      marginTop: '16px'
    }}>
      Continue
    </button>
  </form>
);
```

## Rule 6: Use Spacing, Not Lines, for Separation

### Wrong ❌
```jsx
<div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px' }}>
  Section 1
</div>
```

### Right ✓
```jsx
<div style={{ paddingBottom: '24px', marginBottom: '24px' }}>
  Section 1
</div>
```

**Why**: Whitespace is faster to parse than visual lines.

## Rule 7: Use Shadows Sparingly, Intentionally

Shadows suggest elevation and depth. Overuse = visual noise.

### Correct Shadow Hierarchy
```typescript
// Don't use shadows on everything
const ELEVATIONS = {
  none: 'none',                          // Base elements
  
  subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
  // e.g., card hover states
  
  small: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  // e.g., floating elements, dropdowns
  
  medium: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
  // e.g., modals, drawers
  
  large: '0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.05)',
  // e.g., popups floating above everything
};

// Usage
<Card style={{ boxShadow: ELEVATIONS.subtle }}>
  Content
</Card>
```

## Rule 8: Color Confidence

### Saturation Positioning
Most UI uses **desaturated colors**:

```
Pure (250, 243, 117) - Web apps: #F5F703 ← Too saturated
  ↓
Natural (249, 115, 22) - Web apps: #EA580C ← Good
  ↓
Desaturated (107, 114, 128) - Web apps: #6B7280 ← Good for neutral
```

### Color Roles
```
Primary Color:     Main action, key branding (use sparingly)
Secondary Color:   Alternative actions (less visual weight)
Neutral Colors:    Text, backgrounds, borders (majority of design)
Status Colors:     Green (success), Red (error), Yellow (warning)
                   Use sparingly - let neutral be neutral
```

### Color Application
```jsx
const ColorSystem = () => (
  <div>
    {/* Primary: Only critical actions */}
    <button style={{ background: '#3B82F6', color: 'white' }}>
      Save Changes
    </button>
    
    {/* Secondary: Alternative actions */}
    <button style={{ 
      background: '#F3F4F6', 
      color: '#1F2937',
      border: '1px solid #D1D5DB'
    }}>
      Cancel
    </button>
    
    {/* Neutral: Backgrounds, text */}
    <div style={{ background: '#F9FAFB' }}>
      <p style={{ color: '#6B7280' }}>
        Supporting information
      </p>
    </div>
    
    {/* Status: Only when needed */}
    <div style={{ background: '#FEE2E2', color: '#991B1B' }}>
      Error message
    </div>
  </div>
);
```

## Rule 9: Contrast is Context-Dependent

Same color works differently in different contexts.

### Example: Button Text
```
- Button on light background:  #1F2937 (dark gray) works
- Button on dark background:   #FFFFFF (white) works
- Button on colored background: rgba(255, 255, 255, 0.9) works
```

## Rule 10: Typography is 95% of Design

### Font Size Hierarchy
```
11px  ← Captions, minimal text
12px  ← Helper text, small UI
13px  ← Body text for dense UIs
14px  ← Default body text
16px  ← Large body, mobile default
18px  ← Section headings
20px  ← Page titles
24px  ← Hero headings
32px  ← Large titles
48px+ ← Marketing headlines
```

### Line Height Strategy
```
Captions:     Line height 1.2 (12px × 1.2 = 14.4px tight)
Body Text:    Line height 1.5 (16px × 1.5 = 24px readable)
Headings:     Line height 1.1-1.3 (depends on size)
```

### Font Weight Best Practices
```
Regular (400):    Body text, secondary information
Medium (500):     Form labels, component text
Semibold (600):   Card titles, highlights, emphasis
Bold (700):       Headlines, primary information
```

### Letter Spacing
```
- Don't use letter spacing for readability (never helps)
- Use only for ALL CAPS text (tighten: -0.05em)
- Or for titles (loosen slightly: 0.02em)
```

## Rule 11: Consistency Beats Perfection

Define your rules and stick to them:

```typescript
// Design token system
const TOKENS = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  
  border: {
    radius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
    width: '1px',
    color: '#E5E7EB',
  },
  
  typography: {
    body: {
      size: '14px',
      lineHeight: '1.5',
      weight: 400,
    },
    heading: {
      size: '20px',
      lineHeight: '1.2',
      weight: 600,
    },
  },
};

// Every component uses these
<Card style={{
  borderRadius: TOKENS.border.radius.md,
  padding: TOKENS.spacing.lg,
}}>
  <h3 style={{
    fontSize: TOKENS.typography.heading.size,
    fontWeight: TOKENS.typography.heading.weight,
  }}>
    Title
  </h3>
  <p style={{
    fontSize: TOKENS.typography.body.size,
    lineHeight: TOKENS.typography.body.lineHeight,
  }}>
    Content
  </p>
</Card>
```

## Rule 12: Dark Mode is Contrast Inverted

### Naive ❌
```
Light mode:   #000000 text on #FFFFFF background
Dark mode:    #FFFFFF text on #000000 background (too harsh)
```

### Correct ✓
```
Light mode:   #1F2937 text on #FFFFFF background
Dark mode:    #F3F4F6 text on #111827 background (softer)
```

## Common Mistakes & Fixes

### Mistake 1: Everything is Important
```jsx
// Wrong: All buttons look equal
<div>
  <button style={{ background: '#3B82F6' }}>Save</button>
  <button style={{ background: '#3B82F6' }}>Cancel</button>
  <button style={{ background: '#3B82F6' }}>Delete</button>
</div>

// Right: Clear hierarchy
<div>
  <button style={{ background: '#3B82F6', color: 'white' }}>Save</button>
  <button style={{ background: '#F3F4F6', color: '#374151' }}>Cancel</button>
  <button style={{ background: 'transparent', color: '#DC2626' }}>Delete</button>
</div>
```

### Mistake 2: Not Enough Whitespace
```jsx
// Wrong: Cramped
<div style={{ display: 'flex', gap: '4px' }}>
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
  <Badge>Tag 3</Badge>
</div>

// Right: Breathing room
<div style={{ display: 'flex', gap: '12px' }}>
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
  <Badge>Tag 3</Badge>
</div>
```

### Mistake 3: Unnecessary Colors
```jsx
// Wrong: Colorful chaos
<status-badge status="pending" style={{ background: '#FBBF24' }} />
<status-badge status="active" style={{ background: '#34D399' }} />
<status-badge status="error" style={{ background: '#F87171' }} />

// Right: Neutral + accent
<status-badge status="pending" style={{ background: '#FEF3C7', color: '#92400E' }} />
<status-badge status="active" style={{ background: '#DCFCE7', color: '#166534' }} />
<status-badge status="error" style={{ background: '#FEE2E2', color: '#991B1B' }} />
```

## Implementation Checklist

- [ ] Define typography scale (8 sizes max)
- [ ] Create color palette (12-15 colors including neutrals)
- [ ] Set spacing scale (xs, sm, md, lg, xl)
- [ ] Border radius system (3-4 values)
- [ ] Shadow system (3-4 elevation levels)
- [ ] Component hierarchy (primary, secondary, tertiary buttons)
- [ ] Form styling (labels, placeholders, validation, help text)
- [ ] Responsive breakpoints (mobile, tablet, desktop)
- [ ] Dark mode tokens (inverted contrast, not inverted colors)
- [ ] Accessibility contrast (WCAG AA minimum)

## Lessons for Your SaaS

1. **Hierarchy solves design problems**: Before adding color, check size & weight
2. **Whitespace is your friend**: More space = calmer, more intentional
3. **Consistency > perfection**: Defined rules beat taste-driven decisions
4. **Text appearance > text color**: Typography hierarchy beats color
5. **Reduce not enhance**: Remove visual noise, not add it
6. **Status colors should be muted**: Let information breathe
7. **Form design matters**: Most interaction happens in forms

## Next Steps

1. Audit current UI for hierarchy violations
2. Create design token system
3. Refactor components to use tokens
4. Document typography scale
5. Test with real users (does hierarchy match their mental model?)
