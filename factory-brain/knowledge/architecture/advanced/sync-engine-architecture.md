# Sync Engine Architecture: Optimistic UI & Offline-First

## Overview
Modern SaaS applications demand offline-first architecture where users can work without internet, and sync happens automatically when reconnected. This requires sophisticated state management, conflict resolution, and optimistic UI patterns.

Companies like Slack, Figma, and Notion pioneered this. Users expect seamless experience across offline/online states.

## The Problem: Traditional Approach

### Round-Trip Architecture (Naive)

```
User action:
├─ 1. Send request to server
├─ 2. Wait for response (500ms - 2s)
├─ 3. Update UI when confirmed
└─ User experience: Sluggish, laggy, unresponsive

Network issues:
├─ Request fails → Show error
├─ User: "Reload and try again?"
├─ Work lost
└─ Frustration

Offline:
├─ Nothing works
├─ App completely unusable
└─ Sync required to continue
```

### Modern Approach: Optimistic UI + Offline-First

```
User action:
├─ 1. Update UI immediately (optimistic)
├─ 2. Queue action locally
├─ 3. Send to server asynchronously
├─ 4. Reconcile if conflict
└─ User experience: Instant, smooth, delightful

Network issues:
├─ Action queued locally
├─ Retry automatically
├─ User continues working
└─ Sync when network returns

Offline:
├─ Full functionality
├─ All features work
├─ Seamless online transition
└─ No context switching
```

## Architecture Layers

### Layer 1: Local State (Client)

```typescript
interface LocalState {
  // Current data
  data: {
    documents: Document[];
    settings: UserSettings;
  };
  
  // Pending changes (not yet synced)
  pending: {
    create: Array<{ id: UUID; data: any; version: number }>;
    update: Array<{ id: UUID; delta: any; version: number }>;
    delete: Array<{ id: UUID; version: number }>;
  };
  
  // Sync state
  sync: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: timestamp;
    conflicts: Array<{ id: UUID; local: any; server: any }>;
  };
}

// Persistent storage (IndexedDB, SQLite, etc.)
const persistToStorage = async (state: LocalState) => {
  await db.transaction(async (tx) => {
    await tx.put('app_state', state);
    await tx.put('pending_operations', state.pending);
  });
};
```

### Layer 2: Optimistic Updates

```typescript
// User performs action (offline or online)
const updateDocument = async (docId: UUID, updates: Partial<Document>) => {
  // 1. Generate temporary ID for tracking
  const operationId = generateUUID();
  
  // 2. Update local state immediately (optimistic)
  const optimisticState = {
    ...state,
    documents: state.documents.map(d =>
      d.id === docId ? { ...d, ...updates } : d
    ),
    pending: {
      ...state.pending,
      update: [
        ...state.pending.update,
        {
          id: docId,
          delta: updates,
          version: state.documents.find(d => d.id === docId)?.version || 0,
          operationId,
          timestamp: Date.now(),
        }
      ]
    }
  };
  
  // 3. Update UI immediately (user sees change)
  updateUI(optimisticState);
  persistToStorage(optimisticState);
  
  // 4. Send to server (non-blocking)
  const result = await syncEngine.sendOperation({
    type: 'update',
    documentId: docId,
    delta: updates,
    operationId,
  }).catch(error => {
    // Network error, retry automatically
    syncEngine.enqueueRetry({ docId, operationId });
  });
  
  // 5. Reconcile if conflict
  if (result.conflict) {
    handleConflict(docId, result);
  }
};
```

### Layer 3: Sync Engine

```typescript
class SyncEngine {
  private queue: Operation[] = [];
  private isOnline = navigator.onLine;
  private retryBackoff = 1000; // Start at 1 second
  
  constructor() {
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }
  
  async sendOperation(op: Operation): Promise<SyncResult> {
    if (this.isOnline) {
      // Try to send immediately
      return this.send(op);
    } else {
      // Queue for retry
      this.enqueueRetry(op);
      return { queued: true };
    }
  }
  
  private async send(op: Operation): Promise<SyncResult> {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op),
      });
      
      if (response.ok) {
        const result = await response.json();
        this.markOperationSynced(op.operationId);
        this.retryBackoff = 1000; // Reset backoff
        return result;
      } else if (response.status === 409) {
        // Conflict
        const conflict = await response.json();
        return { conflict };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.enqueueRetry(op);
      throw error;
    }
  }
  
  private enqueueRetry(op: Operation) {
    this.queue.push(op);
    setTimeout(() => this.flushQueue(), this.retryBackoff);
    this.retryBackoff = Math.min(this.retryBackoff * 2, 30000); // Exponential backoff
  }
  
  private async flushQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const op = this.queue[0];
      try {
        await this.send(op);
        this.queue.shift();
      } catch (error) {
        // Stop processing, wait for network
        break;
      }
    }
  }
  
  private onOnline() {
    this.isOnline = true;
    this.retryBackoff = 1000;
    this.flushQueue();
  }
  
  private onOffline() {
    this.isOnline = false;
  }
}
```

## Conflict Resolution

### Types of Conflicts

```
Scenario 1: Edit Conflict
├─ Local: Change text to "Hello"
├─ Server: Already changed text to "Hi"
├─ Result: Merge or let user choose

Scenario 2: Delete Conflict
├─ Local: Delete document
├─ Server: Someone else edited document
├─ Result: Keep deleted state (local wins)

Scenario 3: Order Conflict
├─ Local: Reorder items [A, B, C] → [B, A, C]
├─ Server: Delete A, reorder [B, C] → [C, B]
├─ Result: Apply both (B, C) then reorder
```

### Resolution Strategy: Last-Write-Wins (LWW)

```typescript
interface ConflictResolution {
  clientTimestamp: number;
  serverTimestamp: number;
  clientVersion: number;
  serverVersion: number;
  resolution: 'client' | 'server' | 'merge';
}

// Simplest: Timestamp wins
const resolveConflict = (local: Operation, server: Operation) => {
  if (local.timestamp > server.timestamp) {
    return local; // Client version wins
  } else {
    return server; // Server version wins
  }
};
```

### Resolution Strategy: Operational Transform (OT)

```typescript
// More sophisticated: Transform operations

// Client operation: Insert "X" at position 5
const clientOp = { type: 'insert', position: 5, text: 'X' };

// Server operation: Delete from position 3, length 2
const serverOp = { type: 'delete', position: 3, length: 2 };

// Transform client op against server op
// Result: Insert "X" at position 3 (adjusted for deletion)
const transformed = transformInsertAgainstDelete(clientOp, serverOp);

// Apply both: Delete 2, then insert at adjusted position
// Outcome: Intuitive merge
```

### Resolution Strategy: CRDT (Conflict-free Replicated Data Type)

```typescript
// Best: CRDT (like Yjs, Automerge)

// Unique identifier for each character
// Survives reordering, deletion, concurrent edits

// Local: Insert "X" → Position(5, "X", clientId=A, clock=1)
// Server: Insert "Y" → Position(3, "Y", clientId=B, clock=1)
// Merge: Both present, ordered by (clock, clientId)
// Result: "Y" at 3, "X" at 5 (deterministic)

// Benefits:
// ✓ Merges automatically
// ✓ No conflict resolution needed
// ✓ Works across multiple clients
// ✓ Offline-first native
```

## Offline-First Data Storage

### Layer 1: Cache-First (Ephemeral)

```typescript
// Memory cache (fastest, lost on reload)
class MemoryCache {
  private data = new Map<string, any>();
  
  get(key: string) {
    return this.data.get(key);
  }
  
  set(key: string, value: any) {
    this.data.set(key, value);
  }
}

// Use for: UI state, recent queries, session data
```

### Layer 2: Local Storage (Simple)

```typescript
// localStorage (persistent, limited 5-10MB)
const cache = {
  getUser: () => JSON.parse(localStorage.getItem('user') || '{}'),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  clear: () => localStorage.clear(),
};

// Use for: User preferences, small documents, settings
```

### Layer 3: IndexedDB (Full-Scale)

```typescript
// IndexedDB (persistent, unlimited, queryable)
class LocalDatabase {
  private db: IDBDatabase;
  
  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('app', 1);
      
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('documents', { keyPath: 'id' });
        db.createObjectStore('pending', { keyPath: 'operationId' });
      };
      
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
    });
  }
  
  async getDocuments(filter?: Predicate<Document>) {
    const tx = this.db.transaction('documents');
    const store = tx.objectStore('documents');
    
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(
          filter 
            ? req.result.filter(filter)
            : req.result
        );
      };
    });
  }
  
  async saveDocument(doc: Document) {
    const tx = this.db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    store.put(doc);
    
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }
}

// Use for: Full document database, search, complex queries
```

### Layer 4: SQLite (Web)

```typescript
// SQLite (for PWAs, Electron, etc.)
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const db = new SQL.Database();

// Create tables
db.run(`
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    version INTEGER,
    updatedAt INTEGER
  )
`);

// Query
const results = db.exec(`
  SELECT * FROM documents 
  WHERE updatedAt > ? 
  ORDER BY updatedAt DESC
`, [timestamp]);

// Sync: Export database, upload to cloud
const data = db.export();
const blob = new Blob([data], { type: 'application/x-sqlite3' });
await uploadToCloud(blob);
```

## Sync Strategies

### Pull-Only (Simple)

```
Poll server every 5 seconds:
├─ GET /api/documents/since?timestamp=123456
├─ Server returns: {"documents": [...], "expiredOperations": [...]}
├─ Client merges updates
└─ Conflict resolution: Server version wins (simplest)

Use when:
├─ Few concurrent users
├─ Conflicts rare
├─ Simplicity > performance
```

### Push-Only (Reactive)

```
Client sends all changes:
├─ User action → Send to server
├─ Server processes
├─ Server broadcasts to all clients
├─ Requires WebSocket

Use when:
├─ Need real-time collaboration
├─ All changes matter
├─ Can handle order (last write wins)
```

### Bi-Directional (CRDT)

```
Both directions simultaneously:
├─ Client sends to server
├─ Server sends to other clients
├─ All clients receive all updates
├─ Merge using CRDT

Use when:
├─ Full offline support needed
├─ Real-time collaboration
├─ Conflicts must merge, not overwrite
```

## Practical Implementation Pattern

### Sync Engine with Retry

```typescript
class RobustSyncEngine {
  private operations: Operation[] = [];
  private isOnline = true;
  private isSyncing = false;
  
  // Persistent queue (survives app restart)
  private persistentQueue = new LocalDatabase('pending');
  
  async init() {
    // Load pending operations from storage
    const pending = await this.persistentQueue.getAll();
    this.operations = pending;
    
    // Start sync loop
    this.startSyncLoop();
    
    // Listen for connectivity changes
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
  }
  
  async queueOperation(op: Operation) {
    // 1. Apply optimistically
    applyOperationToUI(op);
    
    // 2. Save to persistent queue
    const opWithId = { ...op, operationId: generateUUID() };
    await this.persistentQueue.add(opWithId);
    this.operations.push(opWithId);
    
    // 3. Trigger sync (if online)
    this.syncIfReady();
  }
  
  private async syncIfReady() {
    if (!this.isOnline || this.isSyncing) {
      return; // Wait for better conditions
    }
    
    this.isSyncing = true;
    
    try {
      // Batch operations (don't send individually)
      const batch = this.operations.slice(0, 50);
      
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ operations: batch }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Remove synced operations
        this.operations = this.operations.filter(
          op => !result.syncedIds.includes(op.operationId)
        );
        await this.persistentQueue.deleteMany(result.syncedIds);
        
        // Handle conflicts
        if (result.conflicts.length > 0) {
          this.handleConflicts(result.conflicts);
        }
      }
    } catch (error) {
      // Retry next iteration
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  private startSyncLoop() {
    setInterval(() => this.syncIfReady(), 5000); // Try every 5 seconds
  }
  
  private onOnline() {
    this.isOnline = true;
    this.syncIfReady(); // Sync immediately
  }
  
  private onOffline() {
    this.isOnline = false;
  }
  
  private handleConflicts(conflicts: Conflict[]) {
    conflicts.forEach(conflict => {
      // Notify UI: "Your changes conflicted with server"
      notifyUser({
        type: 'conflict',
        resourceId: conflict.id,
        clientVersion: conflict.local,
        serverVersion: conflict.remote,
      });
      
      // UI can choose resolution
      // Or automatically merge using CRDT if available
    });
  }
}
```

## UI Patterns

### Optimistic Updates Feedback

```jsx
const DocumentEditor = ({ doc }) => {
  const [localDoc, setLocalDoc] = useState(doc);
  const [syncState, setSyncState] = useState('synced');
  
  const handleChange = (updates) => {
    // Update immediately (optimistic)
    setLocalDoc({ ...localDoc, ...updates });
    setSyncState('syncing');
    
    // Send to server
    syncEngine.queueOperation({
      type: 'update',
      id: doc.id,
      delta: updates,
    }).then(() => {
      setSyncState('synced');
    }).catch(() => {
      setSyncState('error');
    });
  };
  
  return (
    <div>
      <textarea 
        value={localDoc.title}
        onChange={e => handleChange({ title: e.target.value })}
      />
      
      {/* Visual feedback */}
      {syncState === 'syncing' && <Icon spin />}
      {syncState === 'error' && <Icon broke />}
      {syncState === 'synced' && <Icon check />}
    </div>
  );
};
```

### Conflict Resolution UI

```jsx
const ConflictResolution = ({ conflict, onResolve }) => {
  return (
    <div>
      <h3>Conflict Detected</h3>
      <p>This document was edited elsewhere.</p>
      
      <div className="comparison">
        <div>
          <h4>Your Changes</h4>
          <pre>{JSON.stringify(conflict.local, null, 2)}</pre>
          <button onClick={() => onResolve('local')}>Keep Mine</button>
        </div>
        
        <div>
          <h4>Server Version</h4>
          <pre>{JSON.stringify(conflict.remote, null, 2)}</pre>
          <button onClick={() => onResolve('server')}>Use Server</button>
        </div>
      </div>
      
      <button onClick={() => onResolve('merge')}>Merge Both</button>
    </div>
  );
};
```

## Lessons for Your SaaS

1. **Optimistic updates**: Update UI before server confirmation (make it instant)
2. **Persistent queues**: Survive app crash, continue syncing
3. **Exponential backoff**: Reduce server load during outages
4. **Conflict resolution**: Choose based on use case (LWW, CRDT, custom merge)
5. **Offline-first thinking**: Design as if offline is normal
6. **IndexedDB not localStorage**: For any reasonable data size
7. **Sync transparency**: Show user sync state (syncing, error, synced)
8. **Batching**: Send multiple operations together, not individually

## Technology Stack

```
Frontend:
├─ Yjs or Automerge (CRDT)
├─ TanStack Query (data fetching + caching)
├─ Zustand or Jotai (state management)
├─ IndexedDB (persistence)
└─ Service Worker (offline capability)

Backend:
├─ Node.js + Express
├─ Redis (session + conflict resolution)
├─ PostgreSQL (source of truth)
├─ WebSockets (push updates)
└─ Event sourcing (maintain history)
```

## Implementation Timeline

1. **Week 1**: Set up optimistic UI + queue
2. **Week 2**: Implement IndexedDB + persistence
3. **Week 3**: Build sync engine + retry logic
4. **Week 4**: Add conflict resolution (LWW)
5. **Week 5**: Integrate CRDT (Yjs)
6. **Week 6**: Test offline scenarios deeply
7. **Week 7**: Monitor + optimize sync latency
