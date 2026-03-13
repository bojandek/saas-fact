# Martin Fowler Enterprise Patterns: PEAS, Event Sourcing & More

## Overview
Martin Fowler's "Enterprise Application Architecture Patterns" catalog decades of enterprise wisdom. These patterns solve real problems at scale: state management, persistence, communication, and domain modeling.

Key insight: **Enterprise systems fail not from technology, but from poor separation of concerns and unclear domain models.**

## Core Architectural Patterns

### PEAS: Presentation-Entities-Access-Service Layer

```
Traditional Monolith:
├─ Controllers (HTTP)
├─ Model (everything)
└─ Database

Problems:
├─ Where does business logic go? (Model gets huge)
├─ How to test without database? (Tightly coupled)
├─ How to reuse logic? (Entangled with HTTP)
└─ How to support multiple clients? (HTTP-centric)

PEAS (Layered Architecture):
┌─────────────────────┐
│  Presentation       │ (Controllers, API, UI)
├─────────────────────┤
│  Application        │ (Use cases, orchestration)
├─────────────────────┤
│  Domain/Business    │ (Business logic, rules)
├─────────────────────┤
│  Infrastructure     │ (Database, external APIs)
└─────────────────────┘

Benefits:
├─ Business logic independent of framework
├─ Testable without database (mock dependencies)
├─ Reusable across clients (CLI, API, SDK)
└─ Clear dependencies (always point downward)
```

### Layered Architecture Implementation

```typescript
// Layer 1: Presentation (HTTP Controllers)
@Controller('/users')
export class UserController {
  constructor(private createUserService: CreateUserService) {}
  
  @Post()
  async create(@Body() dto: CreateUserDTO) {
    const result = await this.createUserService.execute(dto);
    return { id: result.id, email: result.email };
  }
}

// Layer 2: Application Services (Use Cases)
@Injectable()
export class CreateUserService {
  constructor(
    private userRepository: UserRepository,
    private sendWelcomeEmail: SendWelcomeEmailService,
  ) {}
  
  async execute(dto: CreateUserDTO): Promise<User> {
    // Orchestrate the use case
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) throw new UserAlreadyExistsError();
    
    const user = await this.userRepository.create({
      email: dto.email,
      password: await hashPassword(dto.password),
    });
    
    await this.sendWelcomeEmail.execute(user.email);
    
    return user;
  }
}

// Layer 3: Domain (Business Logic)
export class User {
  // Pure business rules
  
  constructor(
    public id: UUID,
    public email: string,
    private hashedPassword: string,
  ) {}
  
  // Business method: Verify password
  verifyPassword(plainPassword: string): boolean {
    return bcrypt.compare(plainPassword, this.hashedPassword);
  }
  
  // Business method: Is account active?
  isActive(): boolean {
    return this.status === 'active';
  }
  
  // Can this user perform action X?
  canPerformAction(action: string): boolean {
    // Business rule logic
    if (action === 'admin' && this.role !== 'admin') return false;
    if (!this.isActive()) return false;
    return true;
  }
}

// Layer 4: Infrastructure (Persistence)
@Injectable()
export class PostgresUserRepository implements UserRepository {
  constructor(private db: Database) {}
  
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return row ? this.mapToDomain(row) : null;
  }
  
  async create(data: UserCreationData): Promise<User> {
    const row = await this.db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
      [data.email, data.password]
    );
    return this.mapToDomain(row);
  }
  
  private mapToDomain(row: any): User {
    return new User(row.id, row.email, row.password_hash);
  }
}
```

### Rules Annotation:
- **Presentation layer** depends on Application
- **Application layer** depends on Domain
- **Domain layer** depends on nothing (pure business logic)
- **Infrastructure layer** implements Domain contracts (interfaces)

## Event Sourcing

### Core Concept

```
Traditional (State Storage):
├─ Current state stored in database
├─ History discarded (overwritten)
└─ Problem: Lost audit trail, can't replay

Event Sourcing:
├─ Only events stored (immutable log)
├─ Current state derived from events
├─ History = complete audit trail
└─ Can replay to debug, derive reports, create read models
```

### Event Log

```typescript
// Events are immutable facts of what happened
interface Event {
  eventId: UUID;
  aggregateId: UUID;              // Which entity
  eventType: string;              // What happened
  eventData: Record<string, any>;  // Details
  timestamp: number;              // When
  version: number;                // Event sequence number
  userId?: UUID;                  // Who did it
}

// Example: Account opened
{
  eventId: '550e8400-e29b-41d4-a716-446655440001',
  aggregateId: 'user-123',        // User 123
  eventType: 'AccountOpened',     // What happened
  eventData: {
    email: 'alice@example.com',
    name: 'Alice',
    plan: 'starter'
  },
  timestamp: 1704067200000,
  version: 1,
  userId: 'system'
}

// Example: Subscription upgraded
{
  eventId: '550e8400-e29b-41d4-a716-446655440002',
  aggregateId: 'user-123',
  eventType: 'PlanUpgraded',
  eventData: {
    from: 'starter',
    to: 'pro',
    reason: 'manual_request'
  },
  timestamp: 1704153600000,
  version: 2,
  userId: 'user-123'
}

// Example: Subscription downgraded
{
  eventId: '550e8400-e29b-41d4-a716-446655440003',
  aggregateId: 'user-123',
  eventType: 'PlanDowngraded',
  eventData: {
    from: 'pro',
    to: 'starter',
    reason: 'cost_cutting'
  },
  timestamp: 1704240000000,
  version: 3,
  userId: 'user-123'
}
```

### Deriving Current State

```typescript
class User {
  // Reconstruct current state from events
  static fromEvents(events: Event[]): User {
    let user = new User();
    
    // Replay all events
    events.forEach(event => {
      switch (event.eventType) {
        case 'AccountOpened':
          user.email = event.eventData.email;
          user.name = event.eventData.name;
          user.plan = event.eventData.plan;
          user.createdAt = event.timestamp;
          break;
          
        case 'PlanUpgraded':
          user.previousPlan = user.plan;
          user.plan = event.eventData.to;
          user.upgradedAt = event.timestamp;
          break;
          
        case 'PlanDowngraded':
          user.previousPlan = user.plan;
          user.plan = event.eventData.to;
          user.downgradedAt = event.timestamp;
          break;
          
        case 'AccountSuspended':
          user.status = 'suspended';
          user.suspendedAt = event.timestamp;
          break;
      }
    });
    
    return user;
  }
}

// Usage
const events = await eventStore.getEvents('user-123');
const user = User.fromEvents(events);

// Now `user` has complete snapshot derived from history
```

### Benefits

```
Audit Trail:
├─ Every change recorded with timestamp and user
├─ Can answer: "Who changed what when?"
├─ Regulatory compliance (GDPR, HIPAA, SOX)
└─ Fraud detection, accountability

Debugging:
├─ Replay events to understand state
├─ Reproduce bugs exactly
├─ Add logging without code changes
└─ Temporal debugging ("What was state on Day 5?")

Read Models:
├─ Derive multiple views from same events
├─ User view (read), Admin view (read), Analytics view
├─ Update any time (eventually consistent)
└─ Optimize each for its queries

Time Travel:
├─ Query state at any point in time
├─ "What was user plan on March 1?"
├─ Reconstruct states without storage bloat
```

## CQRS: Command-Query Responsibility Segregation

### Core Pattern

```
Traditional (Unified Model):
├─ Write: Update entity in database
├─ Read: Query same entity
└─ Problem: Write optimization ≠ read optimization

CQRS (Separated):
├─ Write (Command): Update event store
├─ Read (Query): Read from optimized read models
└─ Eventual consistency: Read catches up after write
```

### Architecture

```
          Commands (Writes)
                 ↓
        ┌─────────────────┐
        │  Event Handler  │
        │  (Validates)    │
        └────────┬────────┘
                 ↓
        ┌─────────────────┐
        │  Event Store    │ (Append-only log)
        │ (Source of Truth)│
        └────────┬────────┘
                 ↓
        ┌─────────────────┐
        │ Event Projector │ (Updates read models)
        └────────┬────────┘
                 ↓
    ┌────────┬──────────┬──────────┐
    ↓        ↓          ↓          ↓
Read Model  Read Model  Read Model  Read Model
(User View) (Admin View)(Analytics)(Billing)
    ↓        ↓          ↓          ↓
 Select*    Select*    Select*    Select*
    ↑        ↑          ↑          ↑
    └────────┴──────────┴──────────┘
                ↑
            Queries (Reads)
```

### Implementation

```typescript
// Command: Create subscription
const createSubscription = async (
  userId: UUID,
  planId: string
) => {
  // 1. Validate command
  const user = await userRepository.findById(userId);
  if (!user) throw new UserNotFoundError();
  
  const plan = await planRepository.findById(planId);
  if (!plan) throw new PlanNotFoundError();
  
  // 2. Create event (record what happened)
  const event = {
    eventId: generateUUID(),
    aggregateId: userId,
    eventType: 'SubscriptionCreated',
    eventData: {
      planId,
      billingCycle: plan.billingCycle,
      price: plan.price,
      startDate: new Date(),
    },
    timestamp: Date.now(),
    version: user.version + 1,
    userId,
  };
  
  // 3. Append to event store (writes are sequential, ordered)
  await eventStore.append(event);
  
  // 4. Return immediately (don't wait for read model update)
  return { subscriptionId: generateUUID() };
};

// Query: Get user subscriptions
const getUserSubscriptions = async (userId: UUID) => {
  // Read from optimized read model (fast, denormalized)
  const subscriptions = await readModel.users_subscriptions
    .query()
    .where({ userId })
    .orderBy('createdAt', 'DESC');
  
  return subscriptions;
};

// Projecter: Async process that updates read models
eventStore.on('SubscriptionCreated', async (event) => {
  // Update read model when event occurs
  await readModel.users_subscriptions.create({
    userId: event.aggregateId,
    planId: event.eventData.planId,
    startDate: event.eventData.startDate,
    createdAt: event.timestamp,
  });
});
```

## Repository Pattern

### Purpose

```
Goal: Decouple business logic from persistence mechanism

Without Repository:
├─ Services call database directly
├─ Hard to test (mock database)
├─ Tied to specific database (hard to migrate)
└─ Business logic mixed with query logic

With Repository:
├─ Repository abstracts persistence
├─ Services call repository interface
├─ Easy to mock (test without database)
├─ Can change database without changing services
```

### Implementation

```typescript
// 1. Define interface (business code sees this)
interface UserRepository {
  findById(id: UUID): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findActive(): Promise<User[]>;
  save(user: User): Promise<void>;
  delete(id: UUID): Promise<void>;
}

// 2. Implement for specific database
class PostgresUserRepository implements UserRepository {
  constructor(private db: Database) {}
  
  async findById(id: UUID): Promise<User> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    if (!row) throw new NotFoundError();
    return this.toDomain(row);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return row ? this.toDomain(row) : null;
  }
  
  private toDomain(row: any): User {
    return new User(row.id, row.email, row.name);
  }
}

// 3. Use in service (depends on interface, not implementation)
class CreateUserService {
  constructor(private userRepository: UserRepository) {}
  
  async execute(email: string, name: string) {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new UserAlreadyExistsError();
    
    const user = new User(generateUUID(), email, name);
    await this.userRepository.save(user);
    return user;
  }
}

// 4. Inject concrete implementation
const userRepository = new PostgresUserRepository(db);
const createUserService = new CreateUserService(userRepository);

// 5. For testing, inject mock
class MemoryUserRepository implements UserRepository {
  private users = new Map<UUID, User>();
  
  async findById(id: UUID): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new NotFoundError();
    return user;
  }
  
  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}

// Test
const testRepository = new MemoryUserRepository();
const service = new CreateUserService(testRepository);
await service.execute('test@example.com', 'Test User');
// No database needed!
```

## Other Key Patterns

### Active Record (ORM)

```typescript
// Entities know how to persist themselves

class User {
  static async find(id: UUID) {
    return db.query(...);
  }
  
  async save() {
    await db.update(...);
  }
  
  async delete() {
    await db.delete(...);
  }
}

// Usage
const user = await User.find('123');
user.email = 'new@example.com';
await user.save();

Pros:
├─ Simple for CRUD
└─ Less boilerplate

Cons:
├─ Business logic hidden in model
├─ Hard to test
├─ Tight coupling to database
```

### Data Mapper (Separation)

```typescript
// Entities are pure business objects
class User {
  constructor(public id: UUID, public email: string) {}
}

// Separate mapper handles persistence
class UserMapper {
  static fromDatabase(row: any): User {
    return new User(row.id, row.email);
  }
  
  static toDatabase(user: User) {
    return { id: user.id, email: user.email };
  }
}

Pros:
├─ Clean domain model
├─ Easy to test
└─ Flexible persistence

Cons:
├─ More boilerplate
└─ Need mapper layer
```

### Aggregate Pattern

```typescript
// Aggregate: Cluster of related entities with one root

class Order {
  id: UUID;
  items: OrderItem[];      // Can only modify through Order
  customer: Customer;      // Reference (not embed)
  
  addItem(product: Product, quantity: number) {
    // Business logic here
    if (this.isShipped()) throw new OrderShippedError();
    this.items.push(new OrderItem(product, quantity));
  }
  
  canShip(): boolean {
    return this.items.length > 0 && this.payment.verified;
  }
}

Rules:
├─ Modify aggregate only through root
├─ Reference other aggregates by ID (not embed)
├─ One aggregate = one transaction
└─ External consistency (eventual consistency between aggregates)
```

## Lessons for Your SaaS

1. **Layered architecture**: Business logic separate from frameworks
2. **Domain-driven design**: Model your domain explicitly
3. **Repository pattern**: Decouple business from persistence
4. **Event sourcing**: Complete audit trail, replay capability
5. **CQRS**: Optimize reads and writes separately
6. **Eventual consistency**: Accept slight delays in reads for better scalability
7. **Aggregate pattern**: Clear boundaries for transactions
8. **Testing**: Mock repositories, no database needed

## Pattern Selection Guide

```
When to use what:

Large, complex domain?
├─ Use DDD (Domain-Driven Design)
├─ Use Event Sourcing
└─ Use CQRS for scale

Need audit trail?
├─ Use Event Sourcing
└─ Use DDD + Aggregates

Need multiple read views?
├─ Use CQRS
├─ Use Event Sourcing
└─ Project to multiple databases

Strong consistency required?
├─ Use PEAS layered architecture
├─ Use traditional repositories
└─ Single transactional database

Rapid prototyping?
├─ Use Active Record
├─ Use layered architecture
└─ Choose DDD later for complexity
```

## Implementation Timeline

1. **Week 1**: Implement PEAS layering (presentation → domain)
2. **Week 2**: Implement repository pattern (business-agnostic)
3. **Week 3**: Add domain logic tests (no database)
4. **Week 4**: Consider event sourcing (for audit)
5. **Week 5**: Add CQRS if scaling (reads separate from writes)

Enterprise patterns are tools, not requirements. Use them as complexity grows, not from day one.
