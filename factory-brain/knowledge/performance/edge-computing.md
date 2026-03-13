# Edge Computing: Vercel Edge Patterns & Strategies

## Edge Computing Fundamentals

### What is Edge Computing?
```
Traditional Architecture:
Browser ────────────────→ Origin Server (1000 miles away)
         ←──────── 500ms latency ─────────

Edge Computing Architecture:
Browser ──→ Edge Node (10 miles away) ──→ Origin Server
         ←─ 50ms ─┘ cache hit: done
                   ├─ cache miss → Origin
```

### Edge Node Characteristics
```typescript
interface EdgeNode {
  // Location: Distributed globally
  locations: "200+ data centers worldwide",
  
  // Capabilities
  capabilities: [
    "Execute JavaScript/WebAssembly",
    "Modify requests/responses",
    "Cache content",
    "Route traffic",
    "Validate requests",
  ],
  
  // Latency from user
  latency: "< 50ms (vs 100-300ms origin)",
  
  // Execution model
  execution: "Serverless (no infrastructure))",
  
  // Providers
  providers: [
    "Vercel (Edge Functions)",
    "Cloudflare (Workers)",
    "AWS (CloudFront Lambda@Edge)",
    "Fastly (VCL)",
  ],
}
```

---

## Vercel Edge Patterns

### Pattern 1: Authentication at Edge

```typescript
// Problem: Authentication adds latency
// Solution: Move auth checks to edge

// Traditional: Browser → API → Auth Server → Check DB → Return
// Duration: 200-400ms

// Edge Pattern: Browser → Edge (auth check) → Cache ✓ or Origin
// Duration: 50-100ms

// pages/api/protected.ts (Edge Runtime)
export const config = {
  runtime: 'edge',
};

interface UserContext {
  userId: string;
  permissions: string[];
  tenantId: string;
}

export default async function handler(request: Request): Promise<Response> {
  // Extract auth token from cookie
  const token = getCookieValue(request, 'auth_token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify token signature (no DB call!)
  const user = verifyToken(token);

  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  // User verified! Proceed with request
  const context: UserContext = {
    userId: user.id,
    permissions: user.permissions,
    tenantId: user.tenant_id,
  };

  // Call origin API with auth context
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'X-User-Id': context.userId,
      'X-Tenant-Id': context.tenantId,
    },
  });

  return response;
}

// Key insight: Token verification uses only signature (JWT),
// no database lookup needed → extremely fast
```

### Pattern 2: Request Routing at Edge

```typescript
// Problem: Route different users to different endpoints
// Solution: Route at edge before origin

// pages/api/routes.ts
export const config = {
  runtime: 'edge',
};

interface UserRoute {
  userId: string;
  originEndpoint: string;
  region: string;
}

export default async function handler(request: Request): Promise<Response> {
  const userId = getUserIdFromToken(request);

  // Look up user routing rules
  // (can be cached in KV store for speed)
  const route = await getRouteForUser(userId);

  // Route to appropriate origin
  if (route.region === 'us') {
    return fetchFromOrigin('https://us.api.example.com', request);
  } else if (route.region === 'eu') {
    return fetchFromOrigin('https://eu.api.example.com', request);
  } else if (route.region === 'ap') {
    return fetchFromOrigin('https://ap.api.example.com', request);
  }
}

// Use case: Multi-region deployment
// Stripe uses this pattern:
// - US users → US endpoint (faster)
// - EU users → EU endpoint (GDPR compliant data residency)
// - AP users → AP endpoint (lower latency)

// All routing decided at edge (50ms)
// Instead of user hitting wrong origin (300ms + redirect)
```

### Pattern 3: Request Modification at Edge

```typescript
// Problem: All requests identical, hard to personalize
// Solution: Modify requests at edge based on user

// pages/api/personalized.ts
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const user = getUserFromToken(request);

  // Modify request based on user
  const modifiedRequest = new Request(request, {
    headers: {
      // Add personalization headers
      'X-User-Segment': getSegment(user),          // 'premium' or 'free'
      'X-Experiment': getExperiment(user),         // 'control' or 'variant'
      'X-Locale': user.locale,                     // Language preference
      'X-Currency': getCurrencyForUser(user),      // Display currency
    },
  });

  // Forward to origin with extra context
  const response = await fetch(
    'https://api.example.com' + request.pathname,
    modifiedRequest
  );

  return response;
}

// Origin receives context without extra work
// Origin can:
// - Serve different pricing for premium users
// - Show different experiments
// - Display content in user's language
// - All determined at edge before reaching origin

// Example: Notion's edge pattern
function modifyForLocalization(request: Request, user: User): Request {
  const locale = user.locale || 'en-US';
  
  return new Request(request, {
    headers: {
      'X-Accept-Language': locale,
      'X-Timezone': user.timezone,
    },
  });
}
```

### Pattern 4: Response Modification at Edge

```typescript
// Problem: Origin returns generic response, doesn't know about user
// Solution: Modify response at edge for personalization

// pages/api/personalize-response.ts
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const user = getUserFromToken(request);

  // Fetch from origin
  const response = await fetch('https://api.example.com' + request.pathname);
  const data = await response.json();

  // Modify response based on user
  const personalized = {
    ...data,
    // Add user-specific data
    user_tier: user.tier,
    features_unlocked: getUnlockedFeatures(user.tier),
    recommendations: generateRecommendations(user),
    
    // Remove data user shouldn't see
    _internal_fields: undefined, // Remove admin fields
  };

  return new Response(JSON.stringify(personalized), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store', // Don't cache personalized data
    },
  });
}

// Example: E-commerce product listing
export async function personalizePricing(
  products: Product[],
  user: User
): Promise<Product[]> {
  return products.map((product) => ({
    ...product,
    price: user.tier === 'premium' ? product.premium_price : product.price,
    discount: user.region === 'eu' ? 0.1 : 0, // Regional discount
    available: !isBlockedCountry(user.country, product),
  }));
}
```

### Pattern 5: Middleware at Edge

```typescript
// Problem: Need security/performance checks before origin
// Solution: All requests go through edge middleware

// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};

export default async function middleware(request: NextRequest) {
  // Security checks
  if (isBot(request)) {
    return new Response('Access Denied', { status: 403 });
  }

  if (isRateLimited(request)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  // Route based on headers
  const country = getCountryFromRequest(request);
  if (country === 'CN') {
    return NextResponse.redirect(new URL('/geo-blocked', request.url));
  }

  // Add context headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-Request-Id', generateRequestId());
  requestHeaders.set('X-Country', country);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Runs on EVERY request at edge layer
// Protects origin from:
// - Bot traffic
// - DDoS/rate limiting
// - Geolocation restrictions
// - Logging & telemetry
```

---

## Edge KV Store Pattern (Caching at Edge)

```typescript
// Problem: Auth lookups require database
// Solution: Cache auth data in edge KV store

// Vercel KV (Redis-compatible at edge)
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

interface CachedAuthToken {
  userId: string;
  permissions: string[];
  expiresAt: number;
}

export default async function handler(request: Request): Promise<Response> {
  const token = getCookieValue(request, 'auth_token');

  // Try KV store first (extreme speed)
  let cachedAuth = await kv.get<CachedAuthToken>(`auth:${token}`);

  if (!cachedAuth) {
    // Not in cache, verify and cache
    const verified = verifyToken(token);
    
    if (verified) {
      // Cache for 1 hour
      await kv.setex(
        `auth:${token}`,
        3600,
        JSON.stringify(verified)
      );
      
      cachedAuth = verified;
    } else {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  // User authenticated!
  return fetchFromOrigin(request, cachedAuth);
}

// Performance:
// First request: 200ms (verify + cache)
// Subsequent: 10ms (KV hit)
// Miss within hour: 10ms (KV hit)
// After expiry: 200ms (re-verify + cache refresh)

// Real-world example: Stripe webhooks
export async function validateWebhookSignature(
  request: Request
): Promise<boolean> {
  // Cache public key at edge
  const publicKey = await kv.get('stripe:public_key');

  if (!publicKey) {
    // Fetch from origin, cache
    const key = await fetchStripePublicKey();
    await kv.set('stripe:public_key', key, { ex: 86400 }); // 24 hours
  }

  return verifyWebhookSignature(request, publicKey);
}
```

---

## Performance Gains from Edge

### Example: Pricing Page Personalization
```
Traditional Request Flow (300-400ms):
1. Browser requests /pricing
2. Server loads HTML (50ms)
3. Server fetches user data from DB (100ms)
4. Server calculates discount (20ms)
5. Server generates personalized HTML (30ms)
6. Browser sends to user (100ms)
Total: 300ms

Edge-Enhanced Flow (100-150ms):
1. Browser requests /pricing (with auth token)
2. Edge validates token (JWT check: 5ms)
3. Edge fetches from KV store cached pricing (5ms)
4. Edge personalizes response (JWT claim lookup: < 1ms)
5. Edge returns to browser (Edge is geographically close: 50ms)
6. Browser shows cached + personalized = instant
Total: 60ms + network = ~100-150ms (66% faster!)
```

### Example: Multi-Region Deployment
```
Without edge routing:
US user → EU origin (300ms latency) → redirect to US origin → retry (600ms total)

With edge routing:
US user → Edge node reads routing decision (KV: 5ms) → US origin (50ms) = 55ms total
10.8x faster!
```

---

## Vercel Edge Configuration

```typescript
// next.config.js
module.exports = {
  experimental: {
    // Enable edge runtime for all API routes
    runtime: 'edge',
  },

  headers: async () => {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
};

// Individual function override
export const config = {
  runtime: 'edge',
  // Regions to deploy to
  regions: ['iad1', 'sfo1', 'lhr1'], // US, SF, London
};
```

---

## Vercel Edge vs CloudFlare Workers vs Lambda@Edge

```typescript
interface EdgeComparison {
  vercel_edge: {
    language: 'JavaScript/TypeScript',
    environment: 'Isolated (Deno)',
    startup_time: '< 5ms',
    memory_limit: '128MB',
    best_for: 'Next.js apps, request routing',
    pricing: 'Included in Vercel Pro',
  },

  cloudflare_workers: {
    language: 'JavaScript/WebAssembly',
    environment: 'Fastest (V8)',
    startup_time: '< 1ms',
    memory_limit: '128MB',
    best_for: 'Any HTTP logic, multi-CDN',
    pricing: '10M requests/month free',
  },

  lambda_at_edge: {
    language: 'Node.js, Python, Java',
    environment: 'Isolated (Lambda)',
    startup_time: '100ms',
    memory_limit: '128-3GB',
    best_for: 'CloudFront integration',
    pricing: '0.60 per million requests + compute',
  },
}

// Choice decision tree:
// Next.js app? → Vercel Edge
// Heavy compute/ML? → Lambda@Edge (more resources)
// Multi-provider? → Cloudflare Workers
// Simple logic? → Cloudflare Workers (free tier)
```

---

## SaaS-Specific Edge Patterns

### Pattern: Tenant Routing at Edge

```typescript
// SaaS with multi-tenant architecture

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  // Extract tenant ID from subdomain or path
  const tenantId = extractTenantId(request);

  // Route to tenant-specific origin
  const tenantOrigin = await getTenantOrigin(tenantId);

  // Add tenant context
  const headers = new Headers();
  headers.set('X-Tenant-Id', tenantId);
  headers.set('X-Request-Id', generateRequestId());

  return fetch(tenantOrigin + request.pathname, {
    method: request.method,
    headers: headers,
    body: request.body,
  });
}

// Benefit: Each tenant feels like separate app
// Reality: All share same infrastructure, routed at edge
```

### Pattern: Real-Time Invalidation

```typescript
// Problem: Cache gets stale after mutations
// Solution: Invalidate at edge when data changes

import { kv } from '@vercel/kv';

export async function invalidatePricingCache(pricingId: string) {
  // When admin updates pricing, invalidate edge cache
  await kv.del(`pricing:${pricingId}`);
  
  // Also invalidate computed cache
  await kv.del(`computed:pricing-list`);
}

// Any new request now gets fresh data
// Both edge and origin stay in sync
```

---

## Resources

- [Vercel Edge Functions Doc](https://vercel.com/docs/functions/edge-functions)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [AWS Lambda@Edge](https://aws.amazon.com/lambda/edge/)
- [Edge Computing Best Practices](https://www.cloudflare.com/learning/cdn/)
