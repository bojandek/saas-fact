# Software Architecture Patterns — Complete Reference

*From: Domain-Driven Design, Clean Architecture, Microservices Patterns, SOLID Principles*

---

## Part 1: Architecture Patterns

### 1. Monolithic Architecture
```
Single application, single database
┌─────────────────┐
│ API Gateway     │
├─────────────────┤
│ Auth Service    │
│ Payment Service │
│ Booking Service │
│ Reports Service │
├─────────────────┤
│ Shared Database │
└─────────────────┘
```

**Pros:**
- Simple to build
- Easy to test
- Single deployment

**Cons:**
- Hard to scale independently
- Technology lock-in
- Deployment risk (one bug breaks everything)

**Best for:** Startups, small teams, <50k users

---

### 2. Microservices Architecture
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Auth MS  │  │Payment MS│  │BookingMS │  │Reports MS│
│ (Node)   │  │ (Python) │  │(Go)      │  │(Java)    │
└─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘
      │             │             │             │
┌─────▼─────┬───────▼────┬────────▼───┬────────▼───┐
│Auth DB    │Payment DB │Booking DB│Reports DB│
└───────────┴───────────┴──────────┴─────────┘

API Gateway routes requests to appropriate service
```

**Pros:**
- Independent scaling
- Technology flexibility
- Team autonomy

**Cons:**
- Complex (distributed system problems)
- Network latency
- Data consistency challenges
- Operational overhead

**Best for:** Large teams, >100k users, multiple tech stacks needed

---

### 3. Serverless Architecture
```
┌─────────────────────────┐
│ API Gateway (AWS)       │
└────────┬────────────────┘
         │
    ┌────┴────────────────┐
    │                     │
┌───▼───┐          ┌──────▼────┐
│Lambda │          │Lambda      │
│Func 1 │          │Function 2  │
└───┬───┘          └──────┬─────┘
    │                     │
┌───▼─────────────────────▼───┐
│ DynamoDB / RDS              │
└─────────────────────────────┘
```

**Pros:**
- Pay only for CPU time used
- Auto-scaling (infinite)
- No server management

**Cons:**
- Cold start latency (200-500ms first invocation)
- Limited execution time (15 min AWS Lambda)
- Vendor lock-in
- Debugging harder

**Best for:** Event-driven, variable load, spike workloads

---

## Part 2: Design Patterns

### 1. Repository Pattern
```typescript
// Decouple data access from business logic
interface Repository<T> {
  findById(id: string): Promise<T>
  findAll(): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
}

// Implementation swappable
class SQLUserRepository implements Repository<User> { }
class MongoUserRepository implements Repository<User> { }
```

### 2. Dependency Injection
```typescript
// Without DI (hard to test)
class PaymentService {
  private stripe = new Stripe() // Tightly coupled
  processPayment() { }
}

// With DI (testable)
class PaymentService {
  constructor(private stripe: StripeProvider) { }
  processPayment() { }
}

// In tests
test('payment', () => {
  const mockStripe = new MockStripeProvider()
  const service = new PaymentService(mockStripe)
  // Easy to test!
})
```

### 3. Strategy Pattern
```typescript
// Different payment strategies
interface PaymentStrategy {
  process(amount: number): Promise<void>
}

class StripeStrategy implements PaymentStrategy {
  async process(amount: number) { }
}

class PaypalStrategy implements PaymentStrategy {
  async process(amount: number) { }
}

// Usage
const strategy = amount > 10000 ? new PaypalStrategy() : new StripeStrategy()
await strategy.process(amount)
```

### 4. Factory Pattern
```typescript
class SaaSFactory {
  createSaaS(type: 'booking' | 'crm' | 'cms') {
    switch (type) {
      case 'booking':
        return new BookingSaaS([authBlock, paymentBlock, calendarBlock])
      case 'crm':
        return new CRMSaaS([authBlock, paymentBlock, contactsBlock])
      case 'cms':
        return new CMSSaaS([authBlock, paymentBlock, contentBlock])
    }
  }
}
```

### 5. Observer Pattern (Event-Driven)
```typescript
class EventBus {
  private listeners: Map<string, Function[]> = new Map()

  subscribe(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(handler)
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(handler => handler(data))
  }
}

// Usage
eventBus.subscribe('user.created', async (user) => {
  await sendWelcomeEmail(user)
})

eventBus.emit('user.created', newUser)
```

---

## Part 3: SOLID Principles

### S — Single Responsibility Principle
```typescript
// ❌ BAD: UserService does too much
class UserService {
  createUser() { }      // Responsibility 1
  sendEmail() { }       // Responsibility 2
  uploadAvatar() { }    // Responsibility 3
  logActivity() { }     // Responsibility 4
}

// ✅ GOOD: Each class has one reason to change
class UserService {
  createUser() { }
}
class EmailService {
  sendEmail() { }
}
class StorageService {
  uploadAvatar() { }
}
class AuditService {
  logActivity() { }
}
```

### O — Open/Closed Principle
```typescript
// ❌ BAD: Adding new payment method requires modifying class
class PaymentProcessor {
  process(type: string, amount: number) {
    if (type === 'stripe') stripe.charge()
    if (type === 'paypal') paypal.charge()
    if (type === 'new') { // Must modify class!
      newService.charge()
    }
  }
}

// ✅ GOOD: Open for extension, closed for modification
interface PaymentProvider {
  charge(amount: number): Promise<void>
}

class PaymentProcessor {
  constructor(private provider: PaymentProvider) { }
  process(amount: number) {
    return this.provider.charge(amount) // Works with any provider
  }
}
```

### L — Liskov Substitution Principle
```typescript
// ❌ BAD: Square isn't truly a Rectangle
class Rectangle {
  setWidth(w: number) { this.width = w }
  setHeight(h: number) { this.height = h }
}

class Square extends Rectangle {
  setWidth(w: number) { this.width = this.height = w } // Breaks contract!
}

const rect: Rectangle = new Square()
rect.setWidth(5)
rect.setHeight(10)
console.log(rect.area) // Expected 50, got 100

// ✅ GOOD: Use composition instead
class Shape { }
class Rectangle extends Shape { }
class Square extends Shape { }
```

### I — Interface Segregation Principle
```typescript
// ❌ BAD: Fat interface
interface UserService {
  createUser(): void
  deleteUser(): void
  hashPassword(): void
  sendEmail(): void
  uploadFile(): void
}

// ✅ GOOD: Small, focused interfaces
interface UserCreator {
  createUser(): void
}
interface UserDeleter {
  deleteUser(): void
}
interface PasswordHasher {
  hashPassword(): void
}
```

### D — Dependency Inversion Principle
```typescript
// ❌ BAD: High-level depends on low-level
class PaymentService {
  constructor(private stripe: Stripe) { } // Concrete class
}

// ✅ GOOD: Both depend on abstraction
interface PaymentProvider {
  charge(amount: number): Promise<void>
}

class PaymentService {
  constructor(private provider: PaymentProvider) { } // Interface
}
```

---

## Part 4: DDD (Domain-Driven Design)

### Core Concepts

```
┌─────────────────────────────────────┐
│ Domain (Business Logic)             │
├─────────────────────────────────────┤
│ Entities (objects with identity)    │
│ Value Objects (amount, date, etc)   │
│ Aggregates (clusters of entities)   │
│ Services (domain logic)             │
│ Repositories (data access)          │
└─────────────────────────────────────┘
```

### Example: Booking Domain
```typescript
// Value Object (no identity, immutable)
class TimeSlot {
  constructor(
    readonly start: Date,
    readonly end: Date,
    readonly capacity: number
  ) {
    if (start >= end) throw new Error('Invalid time slot')
  }

  duration(): number {
    return (this.end.getTime() - this.start.getTime()) / 1000 / 60
  }
}

// Entity (has identity)
class Resource {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly availability: TimeSlot[]
  ) { }
}

// Aggregate (cluster of related objects)
class Booking {
  constructor(
    readonly id: string,
    readonly resource: Resource,
    readonly timeSlot: TimeSlot,
    readonly customer: Customer
  ) { }

  book() {
    if (!this.resource.isAvailable(this.timeSlot)) {
      throw new Error('Time slot not available')
    }
    // Book operation
  }
}

// Repository (data access)
interface BookingRepository {
  save(booking: Booking): Promise<void>
  findById(id: string): Promise<Booking>
}

// Service (domain logic)
class BookingService {
  constructor(private bookingRepo: BookingRepository) { }

  async bookResource(
    resourceId: string,
    timeSlot: TimeSlot,
    customer: Customer
  ): Promise<Booking> {
    const resource = await this.getResource(resourceId)
    const booking = new Booking(
      generateId(),
      resource,
      timeSlot,
      customer
    )
    booking.book()
    await this.bookingRepo.save(booking)
    return booking
  }
}
```

---

## Part 5: Scaling Patterns

### Database Scaling
```
1. Vertical Scaling (bigger server)
   ├─ Works until you hit hardware limits
   └─ ~$100k/year per server

2. Horizontal Scaling (more servers)
   ├─ Read replicas (for SELECT queries)
   └─ Sharding (split data by key)

3. Caching
   ├─ Redis in-memory cache
   ├─ Cache-aside pattern
   └─ 10x performance improvement

4. Database optimization
   ├─ Proper indexing
   ├─ Query optimization
   └─ Connection pooling
```

### API Scaling
```
1. Load Balancing
   ├─ Round-robin
   ├─ Least connections
   └─ IP hash

2. Horizontal Scaling
   ├─ Stateless services
   ├─ Auto-scaling groups
   └─ Kubernetes for orchestration

3. Rate Limiting
   ├─ Protect API from abuse
   ├─ Fair usage for all customers
   └─ Tiered by plan

4. CDN for Static Content
   ├─ Global edge nodes
   ├─ Reduce latency
   └─ Reduce origin server load
```

---

## Part 6: Error Handling

### Layered Approach
```typescript
class APIErrorHandler {
  handleError(error: Error) {
    // Layer 1: Validation errors (400)
    if (error instanceof ValidationError) {
      return { status: 400, message: 'Invalid input' }
    }

    // Layer 2: Authentication errors (401)
    if (error instanceof AuthenticationError) {
      return { status: 401, message: 'Not authenticated' }
    }

    // Layer 3: Permission errors (403)
    if (error instanceof PermissionError) {
      return { status: 403, message: 'Not authorized' }
    }

    // Layer 4: Business logic errors (422)
    if (error instanceof BusinessLogicError) {
      return { status: 422, message: error.message }
    }

    // Layer 5: Unknown errors (500)
    logger.error(error)
    return { status: 500, message: 'Internal server error' }
  }
}
```

---

## Part 7: Performance Optimization

```
Profile → Identify Bottleneck → Optimize → Measure

Common bottlenecks:
1. Database queries (N+1 problem, missing indexes)
   Solution: Query optimization, caching, denormalization

2. API latency (slow external services)
   Solution: Async processing, queue, timeout, fallback

3. Frontend rendering (too many DOM updates)
   Solution: Virtualization, lazy loading, code splitting

4. Memory leaks (unreleased objects)
   Solution: Profiling, proper cleanup, connection pooling
```

---

*Architecture is not about picking the "best" pattern.*  
*It's about choosing patterns appropriate for your current scale and constraints.*  
*Be willing to evolve architecture as the system grows.*
