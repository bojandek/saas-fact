# Figma Collaboration Patterns: Real-Time Collaboration Mechanics

## Overview
Figma revolutionized design by making it inherently collaborative. Understanding their real-time sync architecture and UX patterns is critical for building modern collaborative tools.

## Real-Time Collaboration Architecture

### Client-Server Sync Model
```mermaid
User A ─→ Local State ─→ Multiplexer ─→ Server
                              ↓
User B ─→ Local State ─→ Multiplexer ←── WebSocket
                              ↓
                         Operation Queue
                              ↓
                    Persistent Store (Database)
```

### Operation Model (Operational Transformation)
Figma uses **Conflict-free Replicated Data Type (CRDT)** principles:

```typescript
// Every operation has metadata
interface Operation {
  id: UUID;              // Unique operation ID
  clientId: UUID;        // Who created it
  timestamp: number;     // Local timestamp
  type: 'create' | 'update' | 'delete' | 'move';
  targetId: UUID;        // What it affects
  delta: Record<string, any>; // What changed
  parentOp?: UUID;       // For dependency tracking
}

// Server transforms concurrent operations
const transform = (op1: Op, op2: Op): [Op, Op] => {
  if (op1.timestamp < op2.timestamp) {
    return [op1, transformAgainst(op2, op1)];
  }
  return [transformAgainst(op1, op2), op2];
};
```

### Consistency Model
```
Strong Consistency (within milliseconds):
1. User makes change locally
2. Change is sent to server
3. Server acknowledges with operation number
4. Server broadcasts to other clients
5. All clients apply same operation in same order
6. Result: Perfect eventual consistency
```

## Presence & Awareness

### Cursor Tracking
```typescript
interface UserPresence {
  userId: UUID;
  cursorX: number;
  cursorY: number;
  cursorZ: number;          // Layer depth at cursor
  selectedNodeIds: UUID[];
  color: string;            // User's cursor color
  lastUpdate: timestamp;
}

// Broadcast presence at 30fps (not 60fps for bandwidth)
const PRESENCE_UPDATE_INTERVAL = 33; // 30fps
let lastPresenceUpdate = Date.now();

const onMouseMove = (e: MouseEvent) => {
  if (Date.now() - lastPresenceUpdate < PRESENCE_UPDATE_INTERVAL) return;
  
  broadcastPresence({
    cursorX: e.clientX,
    cursorY: e.clientY,
    cursorZ: getCurrentZoom(),
    selectedNodeIds: getSelectedNodes(),
  });
  
  lastPresenceUpdate = Date.now();
};
```

### Selection Awareness
```jsx
// When user A selects nodes, user B sees it highlighted
const CollaborativeCanvas = () => {
  const [remoteSelections, setRemoteSelections] = useState({});
  
  useEffect(() => {
    const unsubscribe = presence.onPresenceChange((userId, presence) => {
      setRemoteSelections(prev => ({
        ...prev,
        [userId]: presence.selectedNodeIds
      }));
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <Canvas
      nodes={document.nodes}
      localSelection={localSelection}
      remoteSelections={remoteSelections}
    >
      {/* Render highlights for remote selections */}
      {Object.entries(remoteSelections).map(([userId, nodeIds]) => (
        <SelectionOverlay 
          key={userId}
          nodeIds={nodeIds}
          color={getUserColor(userId)}
        />
      ))}
    </Canvas>
  );
};
```

### Comment Threading
```typescript
interface Comment {
  id: UUID;
  authorId: UUID;
  content: string;
  resolvedAt?: timestamp;
  
  // Spatial metadata
  screenshotUrl: string;
  location: {
    x: number;
    y: number;
    zoom: number;
    nodeId?: UUID;
  };
  
  // Threading
  parentCommentId?: UUID;
  replies: Comment[];
  

  // Collaboration
  mentions: UUID[];
  reactions: Record<string, UUID[]>;
}

// Notifications for mentioned users
const commentStream = comments
  .subscribe(comment => {
    if (comment.mentions.includes(currentUserId)) {
      notify(`@${currentUser.name} mentioned you in a comment`);
    }
  });
```

## Multiplayer Undo/Redo

### Challenge
In single-player: Undo/Redo = stack reversion. In multiplayer: complex state management.

```typescript
// Figma's approach: Per-user undo stacks
class UndoManager {
  private undoStack: Operation[] = [];
  private redoStack: Operation[] = [];
  
  // User A's undo doesn't affect user B's work
  undo() {
    const op = this.undoStack.pop();
    if (!op) return;
    
    // Create inverse operation
    const inverse = this.createInverse(op);
    
    // Send to server with special flag
    server.sendOperation({
      ...inverse,
      isUndo: true,
      originalOpId: op.id,
    });
    
    this.redoStack.push(op);
  }
  
  // Server merges undo carefully
  handleIncomingUndo(op: Operation) {
    // Remove the original operation's effect
    // Re-apply all operations after it
    // This is called "operational transformation for undo"
    
    const indexOfOriginal = history.indexOf(op.originalOpId);
    
    // Transform all subsequent ops like original disappeared
    const subsequentOps = history.slice(indexOfOriginal + 1);
    history = history.slice(0, indexOfOriginal);
    
    subsequentOps.forEach(subOp => {
      const transformed = transform(inverse(op), subOp);
      history.push(transformed);
    });
  }
}
```

### UI Pattern: Undo Awareness
```jsx
const UndoButton = () => {
  const { canUndo, undoCount, lastUndone } = useUndoState();
  
  return (
    <button 
      disabled={!canUndo}
      title={`Undo ${lastUndone?.action || 'last action'}`}
    >
      ↶ Undo {undoCount > 0 && `(${undoCount})`}
    </button>
  );
};
```

## Conflict Resolution Patterns

### When Users Edit Same Object
```
Time: --|----A---+-----B-----+-----C---→

A: Changes color to red (t=2)
B: Changes text to "Hello" (t=3)
C: Changes size to 100 (t=4)

Server operates object as:
{ color: 'red' (A), text: 'Hello' (B), size: 100 (C) }
= { color: 'red', text: 'Hello', size: 100 }

Result: Non-conflicting attributes merge.
Conflicting attributes? Last-write-wins by server timestamp.
```

### Nested Conflicts
```typescript
// What if both users move same group?
interface MoveOp {
  nodeId: UUID;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// A: moves from (0,0) to (100, 100)
// B: moves from (0,0) to (50, 50)
// Both based on (0,0)

// Server's transformation:
// Apply A first: node now at (100, 100)
// B's op transforms: move from (100, 100) to (150, 150)
// Result: node at (150, 150)
// Visual: Appears as if B's relative movement was preserved
```

## Notification System

### Smart Notifications
```typescript
interface Notification {
  id: UUID;
  type: 'edit' | 'comment' | 'mention' | 'share';
  actor: User;
  timestamp: number;
  
  // Grouping
  groupKey: string;  // e.g., "edit:page-id:minute"
  count: number;     // "Alice and 3 others edited..."
  
  // UI
  avatar: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Smart grouping: Don't spam
const notificationQueue = new Map<string, Notification[]>();

const addNotification = (notif: Notification) => {
  const key = notif.groupKey;
  const existing = notificationQueue.get(key);
  
  if (existing) {
    // Increment count instead of new notification
    existing[0].count++;
    existing[0].timestamp = notif.timestamp;
  } else {
    notificationQueue.set(key, [notif]);
    setTimeout(() => {
      showNotification(notificationQueue.get(key)[0]);
      notificationQueue.delete(key);
    }, 1000); // Debounce 1 second
  }
};
```

## Offline & Reconnection

### Offline Queue
```typescript
class OfflineQueue {
  private queue: Operation[] = [];
  private isOnline = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', () => this.flush());
    window.addEventListener('offline', () => this.isOnline = false);
  }
  
  enqueue(op: Operation) {
    this.queue.push({
      ...op,
      clientTimestamp: Date.now(),
    });
    
    if (this.isOnline) {
      this.flush();
    } else {
      // Save to localStorage
      localStorage.setItem('pending-ops', JSON.stringify(this.queue));
    }
  }
  
  async flush() {
    this.isOnline = true;
    
    while (this.queue.length > 0) {
      const op = this.queue.shift();
      try {
        await server.sendOperation(op);
      } catch (e) {
        this.queue.unshift(op); // Put back
        this.isOnline = false;
        break;
      }
    }
    
    localStorage.removeItem('pending-ops');
  }
}
```

### Reconnection Sync
```typescript
const onReconnect = async () => {
  // Get server's latest state hash
  const serverChecksum = await server.getChecksum(documentId);
  const localChecksum = calculateChecksum(document);
  
  if (serverChecksum === localChecksum) {
    // No sync needed, already up-to-date
    return;
  }
  
  // Get missed operations since last sync
  const missedOps = await server.getOperationsSince(lastSyncOpId);
  
  // Apply missed operations
  missedOps.forEach(op => {
    if (op.clientId !== currentClientId) {
      applyOperation(document, op);
    }
  });
};
```

## Performance Optimizations

### Vector Data Specificity
```typescript
// Don't send entire document, send deltas
interface Delta {
  nodeId: UUID;
  changes: {
    x?: number;
    y?: number;
    fill?: Color;
    stroke?: Color;
    rotation?: number;
    // Only what changed
  };
}

// Batch multiple changes
const batchSize = 50;
const operationBatch: Operation[] = [];

const onChange = (delta: Delta) => {
  operationBatch.push(createOperation(delta));
  
  if (operationBatch.length >= batchSize) {
    server.sendOperationBatch(operationBatch);
    operationBatch.length = 0;
  }
};
```

### Viewport Awareness
```typescript
// Only sync operations in viewport (with buffer)
const BUFFER = 2000; // pixels

const filterOperationsByViewport = (ops: Operation[]) => {
  return ops.filter(op => {
    const node = document.getNode(op.targetId);
    const bounds = node.getBounds();
    
    return isBoundsInViewport(bounds, {
      x: viewport.x - BUFFER,
      y: viewport.y - BUFFER,
      width: viewport.width + BUFFER * 2,
      height: viewport.height + BUFFER * 2,
    });
  });
};
```

## Permission System

### Granular Access Control
```typescript
enum Permission {
  VIEW = 'view',      // Can see
  EDIT = 'edit',      // Can modify
  COMMENT = 'comment', // Can add comments
  SHARE = 'share',    // Can add collaborators
  DELETE = 'delete',  // Can delete
  ADMIN = 'admin',    // Can change permissions
}

interface Access {
  userId: UUID;
  permissions: Permission[];
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
}

// Operation permission check
const canPerformOperation = (userId: UUID, op: Operation): boolean => {
  const access = getAccess(userId);
  
  switch (op.type) {
    case 'create':
    case 'update':
    case 'delete':
      return access.permissions.includes(Permission.EDIT);
    case 'move':
      return access.permissions.includes(Permission.EDIT);
  }
};
```

## Lessons for Your SaaS

1. **CRDT over OT**: Simpler to implement, automatic conflict resolution
2. **Presence is awareness**: Show who's where, what they're doing
3. **Comments are spatial**: Tie feedback to specific canvas locations
4. **Undo != Local undo**: In multiplayer, undo only affects your changes
5. **Batch operations**: Don't send every keystroke, debounce 50-200ms
6. **Offline-first thinking**: Assume disconnection, sync when possible
7. **Permissions at operation level**: Server validates every change
8. **UI feedback is critical**: Users must know collaboration state

## Implementation Timeline

- Week 1: WebSocket connection + basic sync
- Week 2: CRDT data structure + conflict resolution
- Week 3: Presence + cursor tracking
- Week 4: Undo/redo + offline queue
- Week 5: Comments + notifications
- Week 6: Permission system + audit logging

## References
- Figma Engineering Blog: "Multiplayer Technology Behind Figma"
- CRDT papers (Automerge, Yjs)
- Google Docs sync architecture (OT-based)
