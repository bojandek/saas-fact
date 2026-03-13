# HTTP/2, HTTP/3, Connection Reuse & Protocol Optimization

## HTTP/2 Protocol Deep Dive

### Binary Framing & Multiplexing
**Core Advantage**: Multiple requests/responses simultaneously over single connection

```
HTTP/1.1 (Waterfall):
Request 1 ──────► Response 1
                 Request 2 ──────► Response 2
                                  Request 3 ──────► Response 3

HTTP/2 (Multiplexed):
Request 1 ──┐
Request 2 ──┼──► Complex interleaved streams ──► Response 1
Request 3 ──┘                                      Response 2
                                                   Response 3
```

### Implementation for SaaS

#### Enable HTTP/2 on Vercel (Automatic)
```typescript
// pages/api/users.ts
// Automatically served over HTTP/2 on Vercel
export default async function handler(req: Request, res: NextResponse) {
  return NextResponse.json({ users: [] });
}
```

#### Enable HTTP/2 on Node.js
```typescript
import spdy from 'spdy';
import fs from 'fs';

const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt'),
};

// Create HTTP/2 server (HTTPS required)
spdy.createSecureServer(options, app).listen(3000);
```

#### Vercel Edge Functions (HTTP/3)
```typescript
// Maximizes connection benefits
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Runs on edge, HTTP/3 ready
  return new Response('Hello World');
}
```

---

## Connection Reuse & Keep-Alive

### TCP Connection Lifecycle
```
Client → SYN ──────────────→ Server
         ←── SYN-ACK ────── 
         ACK ──────────────→ (3-way handshake: ~200-500ms)

Data Exchange (reused multiple times!)
         Request ───────────→
         ←────── Response ───

Connection remains open (Keep-Alive timeout: 30-120s)
```

### Optimizing TCP Connections

#### Keep-Alive Headers
```typescript
// Next.js API route
export default async function handler(req, res) {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=100'); // 5s timeout, max 100 reqs
  
  return res.status(200).json({ data: [] });
}
```

#### Connection Pooling in Node.js
```typescript
import http from 'http';

const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,        // 50 concurrent connections
  maxFreeSockets: 10,    // 10 free sockets in pool
  timeout: 60000,        // 60s socket timeout
  keepAliveDuration: 1000, // 1s between keep-alive packets
});

// Use agent for all external API calls
const response = await fetch('https://api.stripe.com/...', {
  agent: agent,
});
```

#### Database Connection Pooling
```typescript
// Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Configure connection pool
prisma.$connect().then(() => {
  // Default: max 2 connections
  // Each concurrent request reuses connections
});
```

---

## Request/Response Prioritization

### HTTP/2 Stream Dependencies & Weight
```typescript
// Simulate priority queue for critical requests
interface PrioritizedRequest {
  priority: 'critical' | 'high' | 'normal' | 'low';
  streamId: number;
  weight: number; // 1-256, higher = more bandwidth
}

// Critical requests (Auth, Payment)
const authRequest: PrioritizedRequest = {
  priority: 'critical',
  streamId: 1,
  weight: 256, // Maximum priority
};

// Background analytics (Low priority)
const analyticsRequest: PrioritizedRequest = {
  priority: 'low',
  streamId: 63,
  weight: 1, // Minimum priority
};
```

### Practical Prioritization Strategy
```typescript
// SaaS Dashboard Loading

// PHASE 1: Critical (weight 200)
1. Authentication status
2. User permissions
3. Main dashboard data

// PHASE 2: High Priority (weight 150)
4. Charts/analytics
5. Recent activity
6. Notifications

// PHASE 3: Normal (weight 100)
7. Recommendations
8. Related items

// PHASE 4: Low (weight 50)
9. Analytics tracking
10. Advertising pixels
```

### Push Resources (Proactive)
```typescript
// Push critical resources before client requests
export default async function handler(req, res) {
  // Link header for server push (HTTP/2)
  res.setHeader(
    'Link',
    '</css/styles.css>; rel=preload; as=style, ' +
    '</js/app.js>; rel=preload; as=script'
  );
  
  return res.status(200).send(html);
}
```

---

## Compression & Transfer Optimization

### Gzip vs Brotli
```typescript
// Next.js automatic compression (gzip + brotli)
// Vercel uses brotli for modern browsers

// Manual configuration for APIs
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // 1-11 (higher = smaller but slower)
}));

// Brotli for even better compression
import { createBrotliCompress } from 'zlib';

// For responses > 1KB, brotli provides ~20% better compression
```

### Compression Decision Tree
```
File Type → Decision → Level
┌─ JSON APIs
│  └─ Always compress, level 6
├─ HTML pages
│  └─ Always compress, brotli level 11
├─ Images (PNG, JPG, WebP)
│  └─ Already compressed, skip
├─ Videos
│  └─ Already compressed, skip
└─ CSS/JS
   └─ Always compress, brotli level 11
```

---

## Connection Pooling Across Services

### Stripe API Optimization
```typescript
import Stripe from 'stripe';

// Reuse Stripe client (connection pooling)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: new Stripe.createFetchHttpClient(),
  timeout: 30000,
  maxNetworkRetries: 3,
});

// All requests reuse HTTP/2 connections
const charge = await stripe.charges.create({...});
const customer = await stripe.customers.retrieve(...);
```

### Database Query Optimization
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  errorFormat: 'pretty',
});

// Batch queries to reduce roundtrips
const [users, orders, payments] = await Promise.all([
  prisma.user.findMany(),
  prisma.order.findMany(),
  prisma.payment.findMany(),
]);

// Connection pooling handled by Prisma automatically
```

### Multi-Service Aggregation
```typescript
// Gather data from multiple services efficiently
async function getCompleteDashboard(userId: string) {
  const [userData, stripeData, analyticsData] = await Promise.allSettled([
    // Reuses DB connection
    prisma.user.findUnique({ where: { id: userId } }),
    
    // Reuses Stripe HTTP/2 connection
    stripe.customers.retrieve(stripeCustomerId),
    
    // Reuses analytics API connection
    analyticsClient.getDashboard(userId),
  ]);

  return { userData, stripeData, analyticsData };
}
```

---

## HTTP/3 & QUIC Protocol

### Advantages Over HTTP/2
```
HTTP/2 Limitations:
├─ TCP Head-of-Line Blocking (packet loss freezes stream)
├─ Requires TLS 1.2+ (full TLS handshake)
└─ Handshake: TCP 3-way + TLS full = 3+ roundtrips

HTTP/3 (QUIC) Benefits:
├─ Loss-independent streams (packet loss on Stream A doesn't block Stream B)
├─ 0-RTT resumption (cached connection = instant connection)
├─ Connection ID (survives IP changes, WiFi→cellular)
└─ Built-in encryption (QUIC layer includes encryption)
```

### Current Support
```typescript
// Vercel automatically serves HTTP/3 to compatible browsers
// No configuration needed in application code

// Chrome, Edge, Firefox modern versions support QUIC
// Fallback to HTTP/2 for older browsers (automatic)
```

---

## Performance Metrics Comparison

### Latency Impact
```
HTTP/1.1 (6 connections):
Request latency: ~200ms TCP handshake + ~100ms HTTPS + ~50ms app

HTTP/2 (1 connection):
Request latency: ~200ms TCP handshake + ~100ms HTTPS (once) + ~20ms per request

HTTP/3 (QUIC):
Cached connection: ~0ms handshake + ~20ms per request
New connection: ~50ms QUIC handshake + ~20ms per request
```

### Real-World Impact on SaaS Dashboard
```
HTTP/1.1: 5 HTML, 20 CSS/JS chunks, 30 API calls = ~3-5s load
HTTP/2:   Same requests = ~1.5-2s load
HTTP/3:   Same requests with cache = ~0.8-1.2s load
```

---

## SaaS-Specific Strategies

### Real-Time Features (WebSockets)
```typescript
// WebSockets benefit from HTTP/2 persistent connections
import { Server } from 'socket.io';

const io = new Server(server, {
  transports: ['websocket', 'polling'], // Prefer WebSocket
  upgradeTimeout: 10000,
});

io.on('connection', (socket) => {
  // Connection reuses TCP/TLS from HTTP/2
  socket.on('data', (msg) => {
    io.emit('broadcast', msg);
  });
});
```

### SaaS Checkout Optimization
```typescript
// Preload critical resources
<Head>
  <link rel="preconnect" href="https://api.stripe.com" />
  <link rel="dns-prefetch" href="https://js.stripe.com" />
</Head>

// Benefits from HTTP/2 multiplexing:
// 1. Stripe.js
// 2. Stripe Elements library
// 3. Font resources
// All loaded simultaneously with lower latency
```

---

## Resources

- [HTTP/2 Specification (RFC 7540)](https://tools.ietf.org/html/rfc7540)
- [HTTP/3 Specification (RFC 9000 - QUIC)](https://tools.ietf.org/html/rfc9000)
- [Vercel Edge Network](https://vercel.com/docs/concepts/network/edge-network)
- [Node.js HTTP/2 Documentation](https://nodejs.org/api/http2.html)
