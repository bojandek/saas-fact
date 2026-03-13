# DDIA Patterns: Designing Data-Intensive Applications (Martin Kleppmann)

## Core Concepts from DDIA

### Storage Models & Tradeoffs

```typescript
interface StorageModelComparison {
  // 1. Relational (SQL)
  relational: {
    structure: "Tables with schemas (rows & columns)",
    strengths: [
      "ACID guaranteed",
      "Complex queries (JOINs)",
      "Normalizes data (single source of truth)",
    ],
    weaknesses: [
      "Schema inflexible",
      "Scaling writes is hard (need replication)",
      "Complex transactions across shards",
    ],
    examples: ["PostgreSQL", "MySQL", "Oracle"],
    use_case: "Transactional systems (e-commerce, banking)",
  },

  // 2. Key-Value (NoSQL)
  keyValue: {
    structure: "Simple key->value mapping",
    strengths: [
      "Extremely fast (memory access)",
      "Scales horizontally (sharding)",
      "No schema overhead",
    ],
    weaknesses: [
      "No complex queries",
      "Limited transactions",
      "Manual denormalization",
    ],
    examples: ["Redis", "Memcached", "DynamoDB"],
    use_case: "Cache, sessions, counters",
  },

  // 3. Document (NoSQL)
  document: {
    structure: "JSON-like documents with flexible schema",
    strengths: [
      "Flexible schema",
      "Scales horizontally",
      "Query within documents",
    ],
    weaknesses: [
      "Denormalization (duplicate data)",
      "Weak transaction support",
      "Hard to normalize",
    ],
    examples: ["MongoDB", "CouchDB", "Firebase"],
    use_case: "Content management, user profiles",
  },

  // 4. Column-Family (OLAP)
  columnFamily: {
    structure: "Column-oriented storage (instead of row-oriented)",
    strengths: [
      "Fast aggregations (sum, avg)",
      "Compression (similar values stored together)",
      "Handles billions of rows",
    ],
    weaknesses: [
      "Slow for single-row lookups",
      "Complex to query",
      "Not for transactional workloads",
    ],
    examples: ["Parquet", "ORC", "ClickHouse"],
    use_case: "Analytics, data warehousing",
  },
}
```

### Consistency Models (CAP Theorem)

```typescript
interface ConsistencyPatterns {
  // CAP Theorem: Pick 2 of 3
  // C = Consistency (all reads see same data)
  // A = Availability (system always responds)
  // P = Partition tolerance (survives network split)

  strongConsistency: {
    model: "All replicas have identical data",
    guarantee: "Read after write = see deterministic result",
    cost: "Lower availability (waits for all replicas)",
    example: "PostgreSQL with synchronous replication",
    
    implementation: `
// Write waits for quorum acknowledgment
async function write(data: T): Promise<WriteResult> {
  const replicas = [replica1, replica2, replica3];
  
  // Wait for majority (2/3) to acknowledge
  const acks = await Promise.all(
    replicas.map(r => r.writeAsync(data))
  );
  
  const successful = acks.filter(a => a.success).length;
  
  if (successful >= Math.ceil(replicas.length / 2)) {
    return { success: true, committed: true };
  } else {
    throw new Error("Write failed, not enough replicas");
  }
}
    `,
  },

  eventualConsistency: {
    model: "Replicas eventually have same data (may be delayed)",
    guarantee: "Read might see stale data temporarily",
    benefit: "Higher availability (responds immediately)",
    example: "DynamoDB, Cassandra, Redis cluster",
    
    implementation: `
// Write returns immediately (async replication)
async function write(data: T): Promise<WriteResult> {
  // Write to local replica
  await localReplica.write(data);
  
  // Return immediately (don't wait for other replicas)
  
  // Background: Replicate to other nodes
  replicateToOtherNodes(data)
    .catch(err => retryLater(err)); // Retry if fails
  
  return { success: true, committed: true };
}

// Read might return stale data temporarily
async function read(key: string): Promise<T | null> {
  const value = await localReplica.read(key);
  return value; // May be older than recently written
}
    `,
  },

  readYourWrites: {
    concept: "After you write, you're guaranteed to read your own write",
    usefulness: "Essential for user-facing apps",
    mechanism: "Route user's reads to node where they just wrote",
    
    implementation: `
// Store user's last write version
interface UserSession {
  userId: string;
  lastWriteVersion: number;
  lastWriteNode: "us-east-1" | "eu-west-1";
}

async function read(userId: string, key: string): Promise<T> {
  const session = await getSession(userId);
  
  // Route to node where they just wrote
  const node = session.lastWriteNode;
  
  const value = await node.read(key);
  return value; // Guaranteed to see their write
}
    `,
  },

  monotonicReads: {
    concept: "If read A happens before read B, version(A) <= version(B)",
    problem: "User moves between replicas with stale data",
    solution: "Sticky sessions or logical timestamps",
  },
}
```

---

## Replication Patterns

### Single-Leader Replication
```typescript
interface SingleLeaderReplication {
  // Primary leader handles all writes
  // Followers are read-only

  architecture: {
    leader: {
      role: "Accept writes, replicate to followers",
      examples: ["PostgreSQL primary", "MySQL primary", "Redis master"],
    },
    followers: {
      role: "Read-only replicas",
      examples: ["PostgreSQL replica", "MySQL replica", "Redis slave"],
    },
  },

  // Replication can be synchronous (strong consistency) or async (eventual consistency)
  synchronousReplication: {
    guarantee: "Leader waits for replica acknowledgment",
    consistency: "Strong (all reads see same data)",
    availability: "Lower (if replica down, writes block)",
    
    implementation: `
WRITE operation on leader:
  1. Write to leader WAL (write-ahead log)
  2. Parse replication log
  3. Send changes to followers (blocks here!)
  4. Wait for followers to acknowledge
  5. Acknowledge write to client
  
  Followers:
  1. Receive change
  2. Apply to local database
  3. Send acknowledgment back
    `,
  },

  asynchronousReplication: {
    guarantee: "Leader doesn't wait for replicas",
    consistency: "Eventual (replicas lag behind)",
    availability: "Higher (always responds quickly)",
    
    implementation: `
WRITE operation on leader:
  1. Write to leader
  2. Acknowledge to client (immediately!)
  3. Background: Replicate to followers (async)
  
  Followers:
  1. Receive changes continuously
  2. Apply to local database
  3. May lag by seconds or milliseconds
    `,
  },

  // Handle leader failure (failover)
  failover: {
    problem: "What if leader crashes?",
    
    solution: "Promote one follower to new leader",
    
    challenges: [
      "Follower may not have all leader's writes (data loss)",
      "Split-brain: both leader and old leader think they're primary",
      "Choose which follower to promote (stale follower loses?)",
    ],
    
    implementation: `
// Failover orchestration
export async function handleLeaderFailure() {
  const followers = await getFollowers();
  
  // Pick follower with most recent data
  const newLeader = followers.reduce((prev, curr) => 
    curr.replication_offset > prev.replication_offset ? curr : prev
  );
  
  // Promote new leader
  await newLeader.promoteToLeader();
  
  // Redirect all writes to new leader
  await updateLeaderConfig(newLeader);
  
  // Reconfigure other followers to replicate from new leader
  for (const follower of followers.filter(f => f !== newLeader)) {
    await follower.replicateFrom(newLeader);
  }
}
    `,
  },
}
```

### Multi-Leader Replication (Active-Active)
```typescript
interface MultiLeaderReplication {
  // Multiple nodes accept writes
  // Better availability, but conflicts possible

  advantages: [
    "Multiple datacenters can accept writes locally",
    "Doesn't block on remote datacenters",
    "Automatic failover (any leader can handle writes)",
  ],

  challenges: [
    "Write conflicts (same data written at multiple leaders)",
    "Conflict resolution is complex",
    "Higher latency (must sync between leaders)",
  ],

  conflictResolution: {
    // When two leaders receive conflicting writes

    lastWriteWins: {
      approach: "Keep write with highest timestamp",
      problem: "Data loss (discard one write silently)",
      use_case: "Acceptable only for non-critical data",
    },

    mergeConflicts: {
      approach: "Execute custom merge logic",
      example: `
// Both leaders write to same document
Leader1: document.color = "red"    (timestamp: 1000)
Leader2: document.color = "blue"   (timestamp: 1001)

// Conflict detected
merge((currVersion, incomingVersion) => {
  // Could merge: keep both as array
  return {
    color: [currVersion.color, incomingVersion.color],
    conflictAt: new Date(),
  };
})
      `,
    },

    customLogic: {
      approach: "Use application-specific logic",
      example: `
const userA = { name: "Alice", email: "alice@example.com" };
const userB = { name: "Alice", email: "alice.new@example.com" };

// Don't blindly pick one
// Instead: merge intelligently
const merged = {
  name: userA.name || userB.name, // Both same
  email: userB.email, // Newer timestamp
  updated_at: Math.max(userA.updated_at, userB.updated_at),
};
      `,
    },
  },

  useCases: [
    "Multiple datacenters (each has leader)",
    "Offline-first applications (mobile app is local leader)",
    "Collaborative editing (Google Docs: each device is leader)",
  ],
}
```

### Leaderless Replication (Quorum Reads/Writes)
```typescript
interface LeaderlessReplication {
  // All replicas are equal (no primary)
  // Client routes to multiple replicas in parallel

  architecture: {
    client: "Routes all requests to multiple replicas",
    replicas: ["All are equal, no hierarchy"],
  },

  quorumModel: {
    // Write quorum: client waits for W replicas to acknowledge
    // Read quorum: client reads from R replicas, takes majority vote

    parameter_w: {
      // Number of replicas that must acknowledge write
      explanation: "If W=2 out of 3, write succeeds when 2 ack",
      consistency: "Higher W → stronger consistency",
      availability: "Lower W → higher availability",
    },

    parameter_r: {
      // Number of replicas to read from
      explanation: "If R=2 out of 3, read waits for 2 responses",
      goal: "If R + W > N, quorum had overlap (see latest write)",
    },

    examples: [
      { name: "Strong consistency", w: 3, r: 1, n: 3 }, // All must ack
      { name: "Balanced", w: 2, r: 2, n: 3 },           // Quorum overlap
      { name: "High availability", w: 1, r: 3, n: 3 },  // Read all
    ],
  },

  implementation: `
// Leaderless write (Dynamo-style)
async function write(key: string, value: T): Promise<WriteResult> {
  const replicas = [node1, node2, node3];
  const W = 2; // Quorum size
  
  const results = await Promise.allSettled(
    replicas.map(r => r.write(key, value))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  
  if (successful >= W) {
    return { success: true };
  } else {
    throw new Error("Write failed, insufficient replicas");
  }
}

// Leaderless read (Dynamo-style)
async function read(key: string): Promise<T> {
  const replicas = [node1, node2, node3];
  const R = 2; // Read quorum size
  
  const results = await Promise.race([
    Promise.all(
      replicas.map(r => r.read(key))
    ).then(vals => vals.slice(0, R))
  ]);
  
  // All R results should be identical (or repair if not)
  return results[0];
}
  `,

  repair: {
    concept: "If replicas diverge, repair via read repair or anti-entropy",
    
    readRepair: `
// During read, if replicas differ:
const values = await Promise.all(replicas.map(r => r.read(key)));

// Multiple versions received
if (values.some(v => v !== values[0])) {
  // Conflict: pick latest by timestamp
  const latest = values.reduce((prev, curr) =>
    curr.timestamp > prev.timestamp ? curr : prev
  );
  
  // Write latest back to replicas
  for (const r of replicas) {
    r.updateIfOlder(key, latest);
  }
}
    `,

    antiEntropy: `
// Background process: scan entire database and repair
async function antiEntropy() {
  for (const replica of replicas) {
    const data = await replica.getAllData();
    
    for (const [key, value] of data) {
      // Check if other replicas have same version
      for (const otherReplica of replicas.filter(r => r !== replica)) {
        const otherValue = await otherReplica.read(key);
        
        if (otherValue?.version < value.version) {
          // Other replica is behind, update it
          await otherReplica.write(key, value);
        }
      }
    }
  }
}
    `,
  },
}
```

---

## Partitioning (Sharding) Strategies

```typescript
interface PartitioningStrategies {
  // Partition = shard data across multiple nodes

  // Strategy 1: Range-based Partitioning
  rangePartitioning: {
    approach: "Assign ranges of keys to different partitions",
    example: `
User IDs 1-1000 → Shard 1
User IDs 1001-2000 → Shard 2
User IDs 2001-3000 → Shard 3
    `,
    pros: ["Simple routing", "Easy range queries"],
    cons: ["Uneven load (some ranges more popular)", "Hotspots"],
  },

  // Strategy 2: Hash-based Partitioning
  hashPartitioning: {
    approach: "Hash key to get partition number",
    example: `
hash(userId) % 3 = which partition
    `,
    pros: ["Even distribution", "Prevents hotspots"],
    cons: ["Can't do range queries", "Rebalancing is complex"],

    implementation: `
function getPartition(userId: string, partitionCount: number): number {
  return hash(userId) % partitionCount;
}

async function getUser(userId: string): Promise<User> {
  const partition = getPartition(userId, 3);
  const node = partitions[partition];
  return await node.read(userId);
}
    `,
  },

  // Strategy 3: Directory-based Partitioning
  directoryPartitioning: {
    approach: "Lookup key in routing directory",
    example: `
Directory lookup:
userId 500 → Shard 1
userId 815 → Shard 2
    `,
    pros: ["Can rebalance without rehashing", "Flexible"],
    cons: ["Directory lookup latency", "Single point of failure"],
  },

  // Problem: Adding new partitions requires rebalancing
  rebalancing: {
    challenge: "Moving data between partitions is expensive",
    solution: "Fixed number of partitions (created upfront)",
    
    strategy: `
// Create many more partitions than nodes
// Partitions 1-100: Shard A (handles 1-25)
// Partitions 26-50: Shard B (handles 26-50)

// When adding new shard C:
// Move Partitions 51-75 from Shard A to C
// Don't rehash all keys, just redistribute partitions
    `,
  },

  // Cross-partition queries
  secondaryIndexes: {
    problem: "Need to search by non-partition key",
    example: `
Partitioned by: user_id
Need to search by: email

Solution 1: Scattered query (query all partitions)
Solution 2: Global secondary index (expensive to maintain)
    `,
  },
}
```

---

## Transaction Patterns

```typescript
interface TransactionPatterns {
  // ACID transactions guarantee

  atomicity: {
    definition: "All or nothing - entire transaction succeeds or fails",
    implementation: "Write-ahead logging (WAL)",
    assurance: "If crash during transaction, rollback on recovery",
  },

  consistency: {
    definition: "Database stays valid (constraints satisfied)",
    responsibility: "Application must write valid data",
  },

  isolation: {
    definition: "Concurrent transactions don't interfere",
    isolationLevels: [
      "Read Uncommitted: Can see dirty reads",
      "Read Committed: Only see committed writes",
      "Repeatable Read: Same data read multiple times",
      "Serializable: Transactions totally isolated",
    ],

    readRepeat_Example: `
// Repeatable Read problem (phantom reads)

// Transaction A reads all users with age > 30
SELECT * FROM users WHERE age > 30; // Returns 5 users

// Transaction B inserts new user with age 31
INSERT INTO users (name, age) VALUES ('Bob', 31);

// Transaction A reads users > 30 again
SELECT * FROM users WHERE age > 30; // NOW returns 6 users!

// Problem: Phantom reads (new rows appeared)
// Solution: Use Serializable isolation level
    `,

    implementation: `
// Two-phase locking (pessimistic)
// Acquire locks on read, hold until transaction end

async function transaction() {
  const conn = await pool.getConnection();
  
  try {
    const users1 = await conn.query('SELECT * FROM users WHERE age > 30 FOR UPDATE');
    
    // Locks acquired on matched rows
    // No other transaction can modify these rows
    
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }
}
    `,
  },

  duration_: {
    definition: "Durability - once committed, survives crashes",
    implementation: "Write to persistent storage (disk) before ack",
    cost: "Disk I/O is slow (10ms per write)",
    optimization: "Batch multiple transactions (group commit)",
  },

  // Distributed transactions (multiple databases)
  distributedTransactions: {
    challenge: "Atomicity across multiple databases",
    
    twoPhaseCommit: {
      protocol: "Coordinator asks all participants if ready to commit",
      
      implementation: `
Phase 1: Prepare
  Coordinator asks: "Can you commit?"
  Participants lock resources, respond YES or NO

Phase 2: Commit/Abort
  If all YES → Commit on all
  If any NO → Abort on all
      `,
      
      problem: "Coordinator failure leaves participants locked",
      timeoutIssue: "Must wait before retrying (may be long)",
    },

    saga: {
      alternative: "Series of local transactions with compensating transactions",
      
      implementation: `
// Order → Payment → Inventory → Shipping
// If Shipping fails, compensate:
// ShippingRollback → InventoryRollback → PaymentRefund

async function orderSaga(order: Order) {
  try {
    await paymentSvc.charge(order.amount);
    await inventorySvc.reserve(order.items);
    await shippingSvc.ship(order);
  } catch (e) {
    // Compensate (reverse previous steps)
    await paymentSvc.refund(order.amount);
    await inventorySvc.release(order.items);
    throw e;
  }
}
      `,
      
      benefit: "More resilient, no long-term locks",
      tradeoff: "Manual compensations, no atomicity guarantee",
    },
  },
}
```

---

## Consensus Algorithms for Distributed Systems

```typescript
interface ConsensusAlgorithms {
  // How do distributed systems agree on value?

  // Algorithm 1: Raft (used by etcd, Consul)
  raft: {
    phases: [
      "Leader election",
      "Log replication",
      "Safety guarantees",
    ],

    leaderElection: {
      description: "Nodes vote for leader",
      timeout: "Random 150-300ms to prevent split votes",
      guarantee: "Only one leader per term",
    },

    logReplication: {
      description: "Leader appends entries to followers",
      guarantee: "If committed on leader, persists despite failures",
      implementation: `
Leader receives write request
  1. Add entry to local log (uncommitted)
  2. Replicate to followers
  3. Wait for majority ack (including self)
  4. Mark as committed
  5. Apply to state machine
  6. Respond to client
      `,
    },

    safety_: {
      guarantee: "Once committed, value can't be lost",
      mechanism: "Leader must have all committed entries from previous terms",
    },

    useCases: ["etcd", "Consul", "cockroachdb"],
  },

  // Algorithm 2: Paxos (theoretically sound, complex)
  paxos: {
    description: "More complex than Raft, same guarantees",
    phases: ["Prepare", "Promise", "Accept"],
    useCases: ["Google Chubby", "Apache Zookeeper"],
  },

  // Example: SaaS service using Consensus
  useCase: `
Leader election for primary database:
  3 database replicas elect leader via Raft
  
  1. Database A becomes leader (wins election)
  2. Handles all writes
  3. If A crashes, new election happens automatically
  4. Database B becomes new leader (assumes leadership)
  5. No split-brain (only one leader at a time)
  6. Automatic failover (no human intervention)
    `,
}
```

---

## Resources

- ["Designing Data-Intensive Applications" - Martin Kleppmann](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491902141/)
- [Raft Consensus Algorithm](https://raft.github.io/)
- [Consistency Models](https://jepsen.io/) - Jepsen testing for consistency
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [DynamoDB Consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
