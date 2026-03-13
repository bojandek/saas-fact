# Core Web Vitals & Performance Optimization

## Core Web Vitals Metrics (2024 Update)

### 1. Largest Contentful Paint (LCP) - Loading
**Definition**: Time when the largest visible content element is rendered to the viewport.

**Target**: < 2.5 seconds
- Good: ≤ 2.5s
- Needs improvement: 2.5s - 4s
- Poor: > 4s

**Implementation Strategy**:

#### Resource Prioritization
```typescript
// Critical Resource Hints
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://api.stripe.com">
<link rel="preload" href="/hero-image.webp" as="image">
<link rel="preload" href="/bundle.js" as="script">
```

#### Image Optimization
- Use `next/image` with `priority` prop for above-fold
- Implement responsive images with `srcSet`
- Convert to WebP with automatic fallback
- Lazy-load below-fold images
- Use `fetchpriority="high"` on critical images

```typescript
// Next.js Implementation
<Image
  src={heroImage}
  priority
  fill
  sizes="100vw"
  quality={85}
/>
```

#### Font Optimization
- Specify `font-display: swap` to prevent FOIT (Flash of Invisible Text)
- Subset fonts to only needed characters
- Use `preload` for fonts rendering above-fold
- Consider system fonts for body text (faster rendering)

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/font.woff2') format('woff2');
  font-display: swap;
}
```

#### Server-Side Rendering & Caching
- Pre-render critical pages at build time
- Use ISR (Incremental Static Regeneration) on Next.js
- Implement CDN caching with appropriate TTLs
- Use edge functions to optimize Time to First Byte (TTFB)

#### Vercel Edge Optimization
```typescript
// pages/api/data.ts with edge runtime
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Executes closest to user, minimizes TTFB
  return new Response(JSON.stringify(data), {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  });
}
```

---

### 2. Interaction to Next Paint (INP) - Responsiveness
**Definition**: Time from user interaction (click, tap, keyboard input) to visual response.

**Target**: < 200 milliseconds
- Good: ≤ 200ms
- Needs improvement: 200ms - 500ms
- Poor: > 500ms

**Root Causes & Solutions**:

#### JavaScript Blocking Renders
**Problem**: Long-running JavaScript blocks main thread

```typescript
// BEFORE: Blocking
export function UserProfile({ user }) {
  // Heavy computation on render
  const expensiveData = processLargeArray(user.data); 
  return <div>{expensiveData}</div>;
}

// AFTER: Use useTransition
import { useTransition } from 'react';

export function UserProfile({ user }) {
  const [isPending, startTransition] = useTransition();
  
  return (
    <div onClick={() => startTransition(() => {
      // Non-blocking update
      processLargeArray(user.data);
    })}>
      {isPending ? 'Loading...' : data}
    </div>
  );
}
```

#### Event Listener Optimization
```typescript
// Use passive listeners for scroll/touch
element.addEventListener('scroll', handleScroll, { passive: true });
element.addEventListener('touchmove', handleTouch, { passive: true });

// Debounce rapid events
const debouncedResize = debounce(handleResize, 150);
window.addEventListener('resize', debouncedResize);
```

#### Third-Party Script Impact
- Load analytics/tracking scripts asynchronously
- Use `defer` or `async` attributes
- Consider Web Workers for heavy computations

```html
<!-- Prevent INP degradation -->
<script async src="https://cdn.analytics.com/script.js"></script>
```

#### React Component Optimization
```typescript
// Use useDeferredValue for non-urgent updates
import { useDeferredValue } from 'react';

export function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  
  return (
    // Immediate UI update
    <div>Searching: {query}</div>
    // Deferred, non-blocking computation
    <Results query={deferredQuery} />
  );
}
```

---

### 3. Cumulative Layout Shift (CLS) - Visual Stability
**Definition**: Unexpected layout shifts that cause visual instability.

**Target**: < 0.1
- Good: ≤ 0.1
- Needs improvement: 0.1 - 0.25
- Poor: > 0.25

**Common Issues & Prevention**:

#### Unsized DOM Elements
```css
/* BEFORE: No dimensions causes shift */
img {
  max-width: 100%;
}

/* AFTER: Reserve space */
img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}
```

#### Fonts Causing Layout Shift
```css
/* Set consistent line-height to prevent FOUT/FOIT shifts */
body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  font-size-adjust: 0.5; /* Fallback font size adjustment */
}

@font-face {
  font-family: 'CustomFont';
  src: url('/font.woff2') format('woff2');
  font-display: swap;
  size-adjust: 95%; /* Prevents jump when font loads */
}
```

#### Ads & Dynamic Content
```typescript
// Reserve space for fixed-height ad container
<div style={{ height: '600px', width: '100%' }}>
  <AdComponent />
</div>

// Or use container queries
<div style={{ containerType: 'inline-size' }}>
  {/* Layout adapts without shift */}
</div>
```

#### Modals, Notifications, Toasts
```typescript
// Use fixed positioning to prevent scroll-based shifts
export function Toast({ message }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
    }}>
      {message}
    </div>
  );
}
```

---

## Monitoring & Measurement

### Web Vitals Library Integration
```typescript
// pages/_app.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric: any) {
  // Send to analytics
  if (metric.value < 2500 && metric.name === 'LCP') {
    console.log('LCP is good:', metric.value);
  }
}

getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

### Real User Monitoring (RUM)
```typescript
// Segment or custom analytics
analytics.track('core_web_vitals', {
  lcp: lcpValue,
  inp: inpValue,
  cls: clsValue,
  timestamp: Date.now(),
});
```

### Chrome DevTools
- Lighthouse audit (simulated environment)
- Performance tab (real-time recording)
- Web Vitals extension for at-a-glance metrics

---

## SaaS-Specific Optimization Strategies

### For Dashboards (High INP Risk)
- Use virtualization for large tables
- Implement pagination vs infinite scroll
- Use React.memo for chart components
- Debounce filter/search interactions

### For Checkout Flows (High LCP Risk)
- Pre-render payment form skeleton
- Use React.lazy() for modal content
- Preload Stripe.js before checkout
- Implement address autocomplete efficiently

### Tracking CLS in SaaS Apps
- Monitor toast notifications placement
- Ensure filter/sort UI doesn't reflow
- Use transition animations smoothly
- Test on mobile with network throttling

---

## Industry Benchmarks (2024)

| Industry | LCP | INP | CLS |
|----------|-----|-----|-----|
| E-commerce | 1.8s | 120ms | 0.08 |
| SaaS/Dashboard | 2.1s | 150ms | 0.05 |
| News/Publishing | 2.3s | 170ms | 0.12 |
| Social Media | 1.5s | 100ms | 0.15 |

---

## Resources & Further Reading

- [Google Web Vitals](https://web.dev/vitals/)
- [MDN Web Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Vercel Web Vitals](https://vercel.com/docs/speed-insights)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
