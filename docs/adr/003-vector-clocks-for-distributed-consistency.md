# ADR 003: Vector Clocks for Distributed Consistency

## Context

In a multi-region architecture, maintaining consistency across regions requires:
1. Detecting concurrent writes that conflict
2. Total ordering of causally-related events
3. Detecting network partitions
4. Merging diverged state safely

## Options Considered

### Option 1: Vector Clocks (Chosen)
- Each region maintains a logical clock
- On write: increment own region's clock
- Propagate vector with every write event
- Compare vectors to detect causal relationships

**Pros**:
- Detects causality perfectly
- Works across network partitions
- Proven in distributed systems

**Cons**:
- Vector size grows with region count
- Requires metadata on every write

### Option 2: Last-Write-Wins (LWW)
- Use timestamps to resolve conflicts
- Latest timestamp wins

**Rejected**: Loses data (discards earlier writes), not deterministic

### Option 3: Consensus-Based (Raft)
- Wait for majority agreement on ordering
- Strong consistency

**Rejected**: Breaks under network partition (unavailable)

## Decision

**We choose Option 1: Vector Clocks**

Rationale:
1. **Handles Partitions**: Read-available under network splits  
2. **Causality Tracking**: Knows which events causally related
3. **Deterministic Conflict Resolution**: Same resolution across all nodes
4. **Proven**: Used by Riak, Dynamo, Cassandra

## Implementation

### Vector Clock Structure

```typescript
interface VectorClock {
  us_east_1: number;
  eu_west_1: number;
  ap_southeast_1: number;
}
```

### Clock Operations

**Increment on Write**:
```typescript
// Region: us-east-1
vector_clock.us_east_1 += 1
// Result: [3, 7, 2] → [4, 7, 2]
```

**Merge on Replication**:
```typescript
// Compare incoming from EU with local
local = [4, 7, 2]
incoming = [3, 10, 2]

merged = [
  Math.max(4, 3),   // us_east_1: 4
  Math.max(7, 10),  // eu_west_1: 10
  Math.max(2, 2)    // ap_southeast_1: 2
]
// Result: [4, 10, 2]
```

### Conflict Detection

```typescript
function compareVectorClocks(
  v1: VectorClock, 
  v2: VectorClock
): 'before' | 'after' | 'concurrent' {
  let hasGreater = false;
  let hasLess = false;
  
  for (const region in v1) {
    if (v1[region] > v2[region]) hasGreater = true;
    if (v1[region] < v2[region]) hasLess = true;
  }
  
  if (hasGreater && hasLess) return 'concurrent';  // CONFLICT
  if (hasGreater) return 'after';
  if (hasLess) return 'before';
  return 'after';  // equal
}
```

### Conflict Resolution Strategy

When concurrent writes detected → merge using application-specific logic:
- **Last-Modified-Wins**: Use highest timestamp
- **Custom Merge**: Application-defined (e.g., union of sets)
- **Manual Resolution**: Flag for human review

Example for booking conflicts:
```typescript
if (vClock1 < vClock2) {
  state = stateFromRegion2; // v2 causally after v1
} else if (vClock1 > vClock2) {
  state = stateFromRegion1;
} else {
  // Concurrent - merge
  state = mergeBookingStates(s1, s2);
}
```

### Monitoring

**Track**:
- Concurrent write rate (should be < 0.1%)
- Conflicts resolved per minute
- Max vector clock values

**Alert**:
- Concurrent writes > 5% (indicates network issues)
- Any unresolved conflicts (manual intervention needed)

## Trade-offs

### Metadata Overhead
- 24 bytes per write (3 regions × 8 bytes)
- Acceptable for consistency guarantees

### Complexity
- Requires application logic for merge
- Testing  conflict scenarios difficult
- Operational understanding needed

### Third-Region Strategy

If 3 regions not needed immediately:
1. Start with 2 regions only
2. Can expand to 3 by backfilling vectors
3. Growth cost minimal (8 bytes per new region)

## Validation

### Test Scenarios
- [ ] Write same key in 2 regions simultaneously
- [ ] Verify both histories preserved
- [ ] Test merge determines correct winner
- [ ] Verify causally-ordered writes merge correctly
- [ ] Network partition test

### Success Criteria
- Concurrent events detected > 99% of time
- No silent data loss (all conflicting values preserved)
- Merge deterministic (same result on replay)

## Related

- [`replication-coordinator.ts`](blocks/db/src/replication-coordinator.ts:20-25) - Vector clock implementation
- [`ADR-001: Postgres Streaming Replication`](001-postgres-multi-region-streaming-replication.md)

---

**Decision Date**: 2026-03-12
**Status**: ACCEPTED
**Owner**: Database Team
**Review Date**: 2026-06-12
