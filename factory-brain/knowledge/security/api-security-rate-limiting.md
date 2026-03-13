# API Security & Rate Limiting: Protecting Your SaaS Backend

## API Security Fundamentals

### Common API Vulnerabilities (OWASP)

```typescript
interface APIVulnerabilities {
  // 1. Broken Authentication
  broken_auth: {
    problem: "Weak/missing authentication on endpoints",
    example: "GET /api/admin/users (no API key required)",
    fix: [
      "Require API key on all endpoints",
      "Use JWT with expiration",
      "Implement OAuth 2.0",
      "Validate scope/permissions",
    ],
  },

  // 2. Broken Authorization
  broken_authz: {
    problem: "User can access data they shouldn't",
    example: "GET /api/users/456 (user 123 can see user 456's data)",
    fix: [
      "Check ownership before returning data",
      "Use row-level security",
      "Validate tenant_id matches user's tenant",
    ],
  },

  // 3. Injection Attacks
  injection: {
    problem: "Unsanitized input leads to SQL/NoSQL injection",
    example: `
// DANGEROUS:
const user = await db.query("SELECT * FROM users WHERE email = '" + email + "'");

// Attacker inputs: ' OR '1'='1
// Result: Returns all users!
    `,
    fix: [
      "Use parameterized queries (prepared statements)",
      "Never concatenate SQL strings",
      "Use ORMs that handle escaping",
    ],
  },

  // 4. Excessive Data Exposure
  data_exposure: {
    problem: "API returns more data than needed",
    example: `
GET /api/users/123 returns:
{
  id: 123,
  email: "user@example.com",
  password_hash: "bcrypt...", // ❌ Shouldn't send this!
  stripe_api_key: "sk_live_...", // ❌ Never send secrets!
  ssn: "123-45-6789" // ❌ What?
}
    `,
    fix: [
      "Only return fields needed by client",
      "Use DTO (Data Transfer Object) pattern",
      "Never return secrets/sensitive data",
      "Use field-level filtering",
    ],
  },

  // 5. Missing Rate Limiting
  missing_ratelimit: {
    problem: "Attacker can brute-force or DoS",
    example: "Attacker sends 100k requests/min to password endpoint",
    fix: [
      "Implement rate limiting per user/IP",
      "Use exponential backoff on failures",
      "Block after N failures",
    ],
  },

  // 6. Security Misconfiguration
  misconfiguration: {
    examples: [
      "CORS too permissive (allow *)",
      "Debug mode enabled in production",
      "Directory listing enabled",
      "Unused endpoints still active",
      "Default credentials not changed",
    ],
  },

  // 7. Man-in-the-Middle (MITM)
  mitm: {
    problem: "Data transmitted unencrypted",
    fix: [
      "Always use HTTPS",
      "Set HSTS header",
      "Enforce TLS 1.2+",
      "Pin certificates",
    ],
  },
}
```

---

## Rate Limiting Strategies

### Strategy 1: Token Bucket Algorithm

```typescript
// Most common rate limiting algorithm
// - Bucket starts full (N tokens)
// - Each request consumes 1 token
// - Tokens refill at rate (e.g., 100/second)
// - Reject request if no tokens available

interface TokenBucket {
  capacity: number;           // Max tokens in bucket
  refill_rate: number;        // Tokens per second
  current_tokens: number;     // Current available tokens
  last_refill: Date;

  async canConsume(tokens: number = 1): Promise<boolean> {
    // Refill tokens based on time elapsed
    const now = new Date();
    const elapsed = (now.getTime() - this.last_refill.getTime()) / 1000;
    const tokensToAdd = elapsed * this.refill_rate;

    this.current_tokens = Math.min(
      this.capacity,
      this.current_tokens + tokensToAdd
    );
    this.last_refill = now;

    // Check if enough tokens
    if (this.current_tokens >= tokens) {
      this.current_tokens -= tokens;
      return true;
    }

    return false;
  }
}

// Implementation: Redis-based (distributed)
export async function rateLimitTokenBucket(
  userId: string,
  limit: number = 100,
  window: number = 60 // seconds
) {
  const key = `rate_limit:${userId}`;

  // INCR: Increment counter
  const count = await redis.incr(key);

  if (count === 1) {
    // First request in window, set expiry
    await redis.expire(key, window);
  }

  if (count > limit) {
    return {
      allowed: false,
      retry_after: await redis.ttl(key),
    };
  }

  return { allowed: true };
}
```

### Strategy 2: Sliding Window

```typescript
// Tracks requests in moving time window
// Example: 100 requests per 60-second window (sliding)

interface SlidingWindow {
  // More accurate than fixed window
  // Prevents burst attacks at boundary

  example: `
Fixed window problem:
- User has 100 requests/min limit
- Uses all 100 at 00:59:00-00:59:59
- Window resets at 01:00:00
- User gets another 100 at 01:00:00-01:00:01
- Result: 200 requests in 2 seconds!

Sliding window prevents this by moving the window boundary.
  `,

  implementation: `
// Redis ZSET-based sliding window
const windowSize = 60; // 60 seconds

export async function slidingWindowRateLimit(
  userId: string,
  limit: number = 100
) {
  const key = \`rate_limit:sw:\${userId}\`;
  const now = Date.now();
  const windowStart = now - windowSize * 1000;

  // Remove old requests outside window
  await redis.zremrangebyscore(key, '-inf', windowStart);

  // Count requests in window
  const requestCount = await redis.zcard(key);

  if (requestCount >= limit) {
    return { allowed: false };
  }

  // Add current request
  await redis.zadd(key, now, \`\${now}-\${Math.random()}\`);
  await redis.expire(key, windowSize);

  return { allowed: true };
}
  `,
}
```

### Strategy 3: Leaky Bucket

```typescript
// Requests queued, processed at fixed rate
// Smooths traffic spikes

interface LeakyBucket {
  max_queue: number;
  leak_rate: number; // requests per second

  use_case: "Smooth out traffic spikes",
  advantage: "Fairness (consistent processing rate)",
  disadvantage: "Higher latency (queuing)",
}
```

---

## Rate Limiting Implementation

### Basic Express Middleware

```typescript
// express-rate-limit
import rateLimit from 'express-rate-limit';

// Per-user rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  keyGenerator: (req, res) => req.user.id, // By user ID
  skip: (req, res) => req.user.isAdmin,    // Skip for admins
  message: 'Too many requests, please try again later',
  standardHeaders: true,     // Return RateLimit-* headers
  legacyHeaders: false,      // Disable X-RateLimit-* headers
});

app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 5,                    // 5 attempts per minute
  keyGenerator: (req, res) => req.body.email,
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

### Advanced: Multi-Level Rate Limiting

```typescript
// Different limits for different user tiers
import { Redis } from 'ioredis';

const redis = new Redis();

interface RateLimitConfig {
  tier: 'free' | 'pro' | 'enterprise';
  requests_per_minute: number;
  requests_per_hour: number;
  burst_size: number;
}

const limits: Record<string, RateLimitConfig> = {
  free: {
    tier: 'free',
    requests_per_minute: 10,
    requests_per_hour: 100,
    burst_size: 2,
  },
  pro: {
    tier: 'pro',
    requests_per_minute: 1000,
    requests_per_hour: 50000,
    burst_size: 100,
  },
  enterprise: {
    tier: 'enterprise',
    requests_per_minute: 10000,
    requests_per_hour: 1000000,
    burst_size: 1000,
  },
};

export async function advancedRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  const config = limits[user.tier];

  const key = `rate_limit:${user.id}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60); // 60-second window
  }

  if (count > config.requests_per_minute) {
    res.status(429).json({
      error: 'Too many requests',
      retry_after: await redis.ttl(key),
    });
    return;
  }

  // Set headers
  res.setHeader('X-RateLimit-Limit', config.requests_per_minute);
  res.setHeader('X-RateLimit-Remaining', config.requests_per_minute - count);
  res.setHeader('X-RateLimit-Reset', await redis.ttl(key));

  next();
}
```

### IP-Based Rate Limiting (For Unauthenticated)

```typescript
// Rate limit by IP address
export async function ipBasedRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress;
  const key = `rate_limit:ip:${ip}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  // Stricter limit for IPs
  const limit = 100;

  if (count > limit) {
    res.status(429).json({ error: 'Too many requests from this IP' });
    return;
  }

  next();
}

// Apply to public endpoint
app.post('/api/public/form', ipBasedRateLimit, handleForm);
```

---

## Distributed Rate Limiting (Multiple Servers)

### Redis-Based Solution

```typescript
// Single Redis instance as rate limit authority
// All servers check Redis for current count

export async function distributedRateLimit(
  userId: string,
  limit: number,
  windowMs: number
) {
  const key = `rate:${userId}`;

  // Redis INCR is atomic (thread-safe)
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }

  return {
    allowed: current <= limit,
    count: current,
    limit: limit,
    reset: await redis.ttl(key),
  };
}
```

---

## Handling Rate Limit Errors

### Graceful Degradation

```typescript
// When rate limited, return helpful response

export async function handleRateLimitError(
  req: Request,
  res: Response,
  limit: RateLimitInfo
) {
  const retryAfter = Math.ceil(limit.reset_in_seconds);

  res.status(429).json({
    error: 'Too many requests',
    status: 429,
    message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
    retry_after: retryAfter,
    reset_at: new Date(Date.now() + retryAfter * 1000).toISOString(),

    // Helpful info for debugging
    debug: {
      limit: limit.limit,
      current: limit.current,
      window: `${limit.window_ms}ms`,
      reset_in_ms: limit.reset_in_seconds * 1000,
    },
  });

  // Set standard HTTP headers
  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader('X-RateLimit-Limit', limit.limit.toString());
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Reset', limit.reset_timestamp.toString());
}
```

### Client-Side Exponential Backoff

```typescript
// Clients should implement exponential backoff

export async function apiCallWithBackoff(
  url: string,
  maxRetries: number = 5
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get('retry-after') || '60'
        );

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 2^attempt seconds
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Monitoring Rate Limits

```typescript
interface RateLimitMonitoring {
  // Track rate limit metrics
  metrics: [
    "429 responses (how many users are getting rate limited)",
    "Rate limit violations by endpoint (which endpoints being abused)",
    "Rate limit violations by user (which users exceeding limits)",
  ],

  // Implementation
  example: `
// Log rate limit violations
export async function trackRateLimitViolation(
  userId: string,
  endpoint: string,
  tier: string
) {
  metrics.increment('rate_limit.violation', {
    user_id: userId,
    endpoint: endpoint,
    tier: tier,
  });

  // Alert if user repeatedly exceeds limits
  const violations = await redis.incr(\`violations:\${userId}\`);
  
  if (violations > 10) {
    alertOps(\`Potential abuse detected: \${userId}\`);
  }
}
  `,
}
```

---

## Rate Limiting Best Practices

```typescript
interface RateLimitingBestPractices {
  // 1. Different limits for different endpoints
  endpoints: {
    "POST /api/auth/login": "5 per minute (strict for brute-force)",
    "POST /api/auth/register": "3 per minute (prevent spam)",
    "GET /api/users": "100 per minute (normal usage)",
    "POST /api/query": "1000 per hour (expensive operation)",
  },

  // 2. Tier-based limits
  tiers: {
    free: "100 requests per hour",
    pro: "10,000 requests per hour",
    enterprise: "1,000,000 requests per hour",
  },

  // 3. Burst allowance
  bursts: {
    rationale: "Allow short bursts (legitimate traffic pattern)",
    implementation: "Token bucket with higher initial capacity",
  },

  // 4. User whitelist
  whitelist: "Admins/internal services can bypass limits",

  // 5. Gradual degradation
  degradation: [
    "50% over limit: Allow (warn in response headers)",
    "100% over limit: Reject with 429",
  ],

  // 6. Clear communication
  headers: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "Retry-After",
  ],
}
```

---

## Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
- [Redis Rate Limiting](https://redis.io/articles/redis-rate-limiting-pattern/)
- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)
- [Stripe Rate Limiting](https://stripe.com/docs/rate-limiting)
