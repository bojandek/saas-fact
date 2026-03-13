# Backend Profiling: Brendan Gregg Techniques & Real-World Optimization

## Profiling Fundamentals (Brendan Gregg Framework)

### The Performance Stack (Brendan Gregg)
```
┌─────────────────────────────────────┐
│          Application Layer           │
│  (Business Logic, Queries, Requests) │
├─────────────────────────────────────┤
│        System Library Layer          │
│  (malloc, memcpy, filesystem)        │
├─────────────────────────────────────┤
│          Kernel Layer                │
│  (CPU scheduling, I/O, memory)       │
├─────────────────────────────────────┤
│       Hardware Layer                 │
│  (CPU, Memory, Disk, Network)        │
└─────────────────────────────────────┘

Performance issues can occur at any layer.
Profiling helps identify WHERE the bottleneck is.
```

### 60 Second Profiling (Brendan Gregg's Checklist)
```
1. uptime              - System load average (1, 5, 15 minutes)
2. dmesg -T | tail     - Last system logs (OOM kills, thermal throttling)
3. vmstat 1            - Virtual memory stats (CPU, I/O)
4. mpstat -P ALL 1     - Per-CPU statistics
5. pidstat 1           - Per-process stats
6. iostat -xz 1        - Disk I/O
7. free -m             - Memory usage
8. sar -n DEV 1        - Network I/O
9. sar -n TCP,ETCP 1   - TCP statistics
10. top                - Overall system view
```

### The Method: USE (Utilization, Saturation, Errors)
```typescript
interface USEMethod {
  // For each system resource:

  // U = Utilization: How busy is the resource? (0-100%)
  utilization: {
    cpu_usage: 45,           // 45% utilized
    disk_usage: 72,          // 72% disk space used
    memory_usage: 68,        // 68% RAM used
    network_bandwidth: 25,   // 25% of capacity
  },

  // S = Saturation: How much waiting/queueing?
  saturation: {
    cpu_run_queue: 2,        // 2 threads waiting for CPU
    disk_queue_depth: 5,     // 5 I/O ops queued
    network_drops: 0,        // Packets dropped due to buffer full
  },

  // E = Errors: What's failing?
  errors: {
    tcp_retransmits: 0,
    disk_errors: 0,
    memory_allocation_failures: 0,
  },

  // Interpretation
  good: "High utilization (75-90%), low saturation (< 2), zero errors",
  bad: "High saturation (> 5), errors present → Bottleneck exists",
}

// Example analysis:
// CPU: 95% utilization, 8 threads waiting (high saturation)
// → CPU is the bottleneck, need to optimize CPU usage

// Disk: 20% utilization, 50 I/O ops queued (high saturation)
// → Disk I/O is the bottleneck, need faster disk or better I/O patterns
```

---

## Profiling Tools & Techniques

### Tool 1: flamegraph (CPU Profile)
```typescript
// Visualize where CPU time is spent

// Generate flamegraph
// Linux:
$ perf record -F 99 -p PID -- sleep 30
$ perf script > out.perf
$ ./flamegraph.pl --color=js out.perf > out.svg

// macOS (DTrace):
$ sample -n PID -o out.txt

// Output visualization:
//           ┌──────────────────────────────────────┐
//           │ main                                 │ 100%
//           ├──────────┬─────────────┬──────────────┤
//           │ query    │ json_encode │ gc           │
//           │ 50%      │ 30%         │ 20%          │
//           │    ┌──┬──┤  ┌────┬────┤              │
//           │ db │ .│ │ .. parse encode            │
//           │    └──┴──┘  └────┴────┘              │
//           └──────────────────────────────────────┘

// Reading flamegraphs:
// - Width = proportion of time
// - Height = call depth
// - Find the widest bars (hottest functions)
// - Drill down (click) to see callees

interface FlameGraph {
  interpretation: "Read left-to-right, bottom-to-top",
  
  // If large flat-topped functions (wide bars):
  → "These functions are the CPU bottleneck, optimize them",
  
  // If deep stacks:
  → "Call depth is high, consider inlining or caching",
  
  // If saw-tooth pattern:
  → "GC (garbage collection) frequently running, reduce allocations",
}
```

### Tool 2: Allocation Profile (Memory)
```typescript
// Identify memory allocations and leaks

// Node.js allocation profile
import { Profiler } from 'v8-profiler-next';

export async function profileMemory() {
  const profiler = new Profiler('heap');
  profiler.startProfiling('myProfile', true);

  // Run your code
  await runYourApplication();

  profiler.stopProfiling('myProfile');
  const profile = profiler.takeSnapshot('mySnapshot');

  // Analyze snapshot
  const statistics = profile.getNodeStatistics();
  
  // Results show:
  // - Which objects consume most memory
  // - How many objects of each type
  // - Retained size (what would be freed if deleted)
  
  return statistics;
}

// Example output (Top memory consumers):
const memoryReport = {
  "Array": { count: 50000, size_mb: 120 }, // Large array allocation
  "Object": { count: 100000, size_mb: 80 }, // Many objects
  "Buffer": { count: 10000, size_mb: 200 }, // Large buffers (likely issue!)
  "String": { count: 500000, size_mb: 50 },
};

// Action: Large Buffer (200MB) likely bug
// → Investigate where buffers come from
// → Add pooling if possible
// → Or reduce buffer size
```

### Tool 3: Latency Profile (Distributed Tracing)
```typescript
// Identify slow operations across services

import { trace } from '@opentelemetry/api';

export const tracer = trace.getTracer('myapp-tracer');

interface LatencyProfile {
  // Trace request end-to-end
  request_flow: [
    "Frontend sends request: T+0ms",
    "  Network latency: T+50ms",
    "Load balancer: T+52ms",
    "  App auth check: T+70ms (18ms in auth service)",
    "  Database query: T+120ms (50ms in query)",
    "  Response serialization: T+130ms (10ms JSON)",
    "Frontend receives: T+180ms (50ms network)",
  ],

  // Total request time breakdown:
  // Network:          100ms (50 + 50)
  // Backend service:   60ms (18 + 50 + 10 - overlaps)
  // Identify: Database query is 50ms (bottleneck!)
}

export async function profileRequestLatency(request: Request) {
  const rootSpan = tracer.startSpan('request');
  
  try {
    // Auth span
    const authSpan = tracer.startSpan('auth', { parent: rootSpan });
    await authenticateUser();
    authSpan.end();

    // Database span
    const dbSpan = tracer.startSpan('database', { parent: rootSpan });
    const data = await queryDatabase();
    dbSpan.end();

    // Serialization span
    const serializeSpan = tracer.startSpan('serialize', { parent: rootSpan });
    const result = JSON.stringify(data);
    serializeSpan.end();

    return result;
  } finally {
    rootSpan.end();
  }
}

// Output: Timeline showing which operations are slow
```

---

## Real-World Optimization Patterns

### Pattern 1: Query Optimization (Using EXPLAIN)
```typescript
// Problem: Database queries are slow

// Find slow queries
// 1. Enable slow query log
const slowQueryLog = {
  mysql: "SET GLOBAL slow_query_log = ON;",
  postgres: "log_min_duration_statement = 1000;", // 1s
};

// 2. Analyze slow queries
// MySQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@gmail.com%';

// Output shows:
// - Full table scan (should use index!)
// - 1,000,000 rows scanned
// - 2 seconds to execute
//→ Add index on email column

// 3. Fix: Add index
ALTER TABLE users ADD INDEX idx_email (email);

// Re-run:
EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@gmail.com%';
// Now: Uses index, 100ms (20x faster!)

interface QueryOptimizationSteps {
  step1: "Identify slow queries (EXPLAIN)",
  step2: "Add missing indexes",
  step3: "Rewrite queries to use indexes",
  step4: "Consider denormalization or caching",
  step5: "Monitor query performance",
}

// Implementation in Node.js
export async function optimizeSlowQueries() {
  // Track query performance
  db.on('query', (query, duration) => {
    if (duration > 1000) {
      // Log slow query
      logger.warn('Slow query detected', {
        query: query.sql,
        duration_ms: duration,
        stack: new Error().stack,
      });

      // Alert if critical
      if (duration > 5000) {
        alertOps(`Critical slow query: ${duration}ms`);
      }
    }
  });
}
```

### Pattern 2: Memory Optimization (Pooling & Caches)
```typescript
// Problem: Too many object allocations

// Solution 1: Object pooling
class BufferPool {
  private pool: Buffer[] = [];

  acquire(size: number): Buffer {
    // Reuse from pool instead of allocating new
    const buffer = this.pool.pop() || Buffer.alloc(size);
    return buffer;
  }

  release(buffer: Buffer) {
    // Return to pool for reuse
    this.pool.push(buffer);
  }
}

// Usage
const pool = new BufferPool();

async function processRequest(data: Buffer) {
  const workBuffer = pool.acquire(1024 * 1024); // 1MB

  try {
    // Use workBuffer
    await doWork(workBuffer);
  } finally {
    // Return to pool
    pool.release(workBuffer);
  }
}

// Benefit: Reduce GC pressure, 10-50x faster

// Solution 2: Cache frequently used results
const resultCache = new Map<string, any>();

export async function getCachedUserData(userId: string) {
  // Check cache first
  if (resultCache.has(userId)) {
    return resultCache.get(userId);
  }

  // Fetch if not cached
  const user = await db.users.findById(userId);
  
  // Cache for 5 minutes
  resultCache.set(userId, user);
  setTimeout(() => resultCache.delete(userId), 5 * 60 * 1000);

  return user;
}

// Benefit: Avoid repeated database queries
```

### Pattern 3: CPU Optimization (Hot Path)
```typescript
// Problem: Part of code called millions of times (hot path)

// Slow version (generic, flexible)
function parseJSON(data: string, reviver?: (k: string, v: any) => any) {
  // Flexible but slow
  return JSON.parse(data, reviver);
}

// Fast version (specialized, no flexibility)
function parseUserJSON(data: string): User {
  // Can use faster parsing for known shape
  const obj = JSON.parse(data);
  return {
    id: obj.id, // Direct field access
    name: obj.name,
    email: obj.email,
  };
}

// Or use binary format (Protocol Buffers, MessagePack)
export async function optimizeHotPath() {
  // Benchmark both
  const iterations = 1000000;

  // JSON version
  console.time('JSON');
  for (let i = 0; i < iterations; i++) {
    JSON.parse('{"id":1,"name":"test"}');
  }
  console.timeEnd('JSON');
  // JSON: 2000ms

  // Specialized version
  console.time('Specialized');
  for (let i = 0; i < iterations; i++) {
    const obj = JSON.parse('{"id":1,"name":"test"}');
    const user = { id: obj.id, name: obj.name };
  }
  console.timeEnd('Specialized');
  // Specialized: 1500ms (25% faster)

  // MessagePack version
  console.time('MessagePack');
  const packed = msgpack.encode({ id: 1, name: 'test' });
  for (let i = 0; i < iterations; i++) {
    msgpack.decode(packed);
  }
  console.timeEnd('MessagePack');
  // MessagePack: 300ms (6.7x faster!)
}

// Profiling guided optimization
// 1. Flamegraph shows parseJSON is 30% of time
// 2. Switch to MessagePack (6.7x faster)
// 3. Overall application 30% * 85% faster = 25% faster overall
```

### Pattern 4: I/O Optimization (Batching & Caching)
```typescript
// Problem: Too many individual I/O operations

// Slow: 1000 individual queries
for (const userId of userIds) {
  const user = await db.users.findById(userId); // 1000 DB calls!
}

// Fast: Batch query
const users = await db.users.findByIds(userIds); // 1 DB call!

// Or use database batching
export async function batchDatabaseQueries(userIds: string[]) {
  const users = await db.query(`
    SELECT * FROM users 
    WHERE id = ANY($1)
  `, [userIds]);

  return users; // Single query instead of N queries
}

// Or cache results
const userCache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

export async function getCachedUsers(userIds: string[]) {
  const cached: User[] = [];
  const uncached: string[] = [];

  // Check cache
  for (const userId of userIds) {
    const cached = userCache.get<User>(userId);
    if (cached) {
      cached.push(cached);
    } else {
      uncached.push(userId);
    }
  }

  // Fetch uncached
  if (uncached.length > 0) {
    const fresh = await db.users.findByIds(uncached);
    fresh.forEach((u) => userCache.set(u.id, u));
    cached.push(...fresh);
  }

  return cached;
}

// Benefit: Reduce database load 10-100x
```

---

## Monitoring & Observability

### Instrument Your Application
```typescript
// Add instrumentation to identify bottlenecks

import { performance } from 'perf_hooks';

export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(label: string) {
    this.marks.set(label, performance.now());
  }

  measure(label: string, startLabel: string, endLabel?: string) {
    const start = this.marks.get(startLabel);
    const end = this.marks.get(endLabel || label) || performance.now();

    const duration = end - start!;

    // Log if slow
    if (duration > 100) {
      logger.warn('Slow operation', { operation: label, duration_ms: duration });
    }

    metrics.histogram('operation_duration_ms', duration, {
      operation: label,
    });

    return duration;
  }
}

// Usage
const monitor = new PerformanceMonitor();

export async function processRequest(req: Request) {
  monitor.mark('request_start');

  monitor.mark('auth_start');
  await authenticate(req);
  monitor.measure('auth', 'auth_start');

  monitor.mark('db_start');
  const data = await queryDatabase();
  monitor.measure('db', 'db_start');

  monitor.mark('serialize_start');
  const result = JSON.stringify(data);
  monitor.measure('serialize', 'serialize_start');

  monitor.measure('request', 'request_start');

  return result;
}

// Output datadog/prometheus metrics
// Shows: Auth (5ms), DB (50ms), Serialization (10ms), Total (65ms)
```

### Alerting on Performance Degradation
```typescript
export function setupPerformanceAlerts() {
  // Alert if p95 latency increases > 20%
  metrics.on('latency_p95', (current, baseline) => {
    const increase = (current - baseline) / baseline;

    if (increase > 0.2) {
      alertOps(`Performance degradation: p95 latency +${(increase * 100).toFixed(1)}%`);
    }
  });

  // Alert if error rate increases
  metrics.on('error_rate', (current) => {
    if (current > 0.01) {
      // > 1% errors
      alertOps(`Error rate high: ${(current * 100).toFixed(2)}%`);
    }
  });

  // Alert if memory increasing
  metrics.on('memory_growth', (bytesDelta) => {
    if (bytesDelta > 100 * 1024 * 1024) {
      // > 100MB growth in 5 minutes
      alertOps('Memory leak suspected');
    }
  });
}
```

---

## Optimization Roadmap

### Priority 1: Identify Bottleneck (Profiling)
```
1. Flamegraph (CPU profile) - 5 minutes
2. Latency trace (request breakdown) - 10 minutes
3. Memory profile - 5 minutes
4. I/O statistics - 5 minutes
→ Identified bottleneck
```

### Priority 2: Optimize (With Measurement)
```
1. Before optimization: Measure baseline
2. Make targeted optimization
3. After optimization: Measure again
4. Calculate improvement (should be 2x-10x for hotspot)
5. Deploy & monitor in production
6. Next optimization
```

### Example: Real-World Optimization
```
Baseline:
- Request latency: 500ms (p95)
- Database queries: 200ms
- JSON parsing: 100ms
- Redis cache misses: 100ms (network)

Optimization 1: Add Redis caching
- Request latency: 350ms (30% improvement)
  Database queries: 50ms (cached)

Optimization 2: Batch database queries
- Request latency: 300ms (14% improvement)
  Database: 30ms (batched)

Optimization 3: Use MessagePack instead of JSON
- Request latency: 270ms (10% improvement)
  JSON parsing: 20ms

Total: 500ms → 270ms (46% faster!)
```

---

## Resources

- [Brendan Gregg's Site](http://www.brendangregg.com/) - Definitive profiling guide
- [Linux Performance](http://www.brendangregg.com/linuxperf.html) - Comprehensive tools guide
- [Flamegraph](http://www.brendangregg.com/flamegraphs.html) - How to generate & read
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance/)
- [Clinic.js](https://clinicjs.org/) - Node.js profiler
- [V8 Profiler](https://v8.dev/docs/profile) - JavaScript profiler
