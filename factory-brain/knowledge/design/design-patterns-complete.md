# Design Patterns — Code Patterns & Best Practices

*From: Gang of Four, Frontend Patterns, API Patterns, Real-world Examples*

---

## Part 1: Creational Patterns

### 1. Singleton Pattern
```typescript
class Database {
  private static instance: Database

  private constructor() { }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  query(sql: string) { }
}

// Usage
const db1 = Database.getInstance()
const db2 = Database.getInstance()
console.log(db1 === db2) // true
```

### 2. Factory Pattern
```typescript
interface Transport {
  ship(): void
}

class TruckTransport implements Transport {
  ship() { console.log('Shipped by truck') }
}

class DronTransport implements Transport {
  ship() { console.log('Shipped by drone') }
}

class TransportFactory {
  static create(type: 'truck' | 'drone'): Transport {
    if (type === 'truck') return new TruckTransport()
    return new DroneTransport()
  }
}

// Usage
const transport = TransportFactory.create('truck')
transport.ship()
```

### 3. Builder Pattern
```typescript
class BookingSaaS {
  name: string
  features: string[] = []
  pricing: string = 'monthly'
  theme: string = 'dark'

  addFeature(feature: string) {
    this.features.push(feature)
    return this
  }

  setPricing(pricing: string) {
    this.pricing = pricing
    return this
  }

  setTheme(theme: string) {
    this.theme = theme
    return this
  }

  build(): void {
    console.log(`Building ${this.name} with ${this.features.join(', ')}`)
  }
}

// Usage (fluent interface)
new BookingSaaS()
  .addFeature('calendar')
  .addFeature('payments')
  .setPricing('usage-based')
  .setTheme('light')
  .build()
```

---

## Part 2: Structural Patterns

### 1. Adapter Pattern
```typescript
// Old interface
interface LegacyPaymentGateway {
  processTransaction(amount: number): void
}

// New interface we want
interface ModernPaymentProcessor {
  pay(amount: number): Promise<string>
}

// Adapter
class PaymentAdapter implements ModernPaymentProcessor {
  constructor(private legacy: LegacyPaymentGateway) { }

  async pay(amount: number): Promise<string> {
    this.legacy.processTransaction(amount)
    return 'success'
  }
}
```

### 2. Decorator Pattern
```typescript
// Base component
interface Logger {
  log(message: string): void
}

class SimpleLogger implements Logger {
  log(message: string) { console.log(message) }
}

// Decorator adds functionality
class TimestampLogger implements Logger {
  constructor(private logger: Logger) { }

  log(message: string) {
    const timestamp = new Date().toISOString()
    this.logger.log(`[${timestamp}] ${message}`)
  }
}

// Usage
const logger = new SimpleLogger()
const decoratedLogger = new TimestampLogger(logger)
decoratedLogger.log('Hello') // [2025-03-11T...] Hello
```

### 3. Proxy Pattern
```typescript
interface UserService {
  getUser(id: string): Promise<User>
}

// Real service (expensive operation)
class RealUserService implements UserService {
  async getUser(id: string) {
    const data = await fetch(`/api/users/${id}`)
    return data.json()
  }
}

// Proxy with caching
class CachedUserService implements UserService {
  private cache = new Map<string, User>()

  constructor(private real: RealUserService) { }

  async getUser(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id)!
    }

    const user = await this.real.getUser(id)
    this.cache.set(id, user)
    return user
  }
}
```

---

## Part 3: Behavioral Patterns

### 1. Command Pattern
```typescript
interface Command {
  execute(): void
  undo(): void
}

class CreateProjectCommand implements Command {
  private projectId: string

  constructor(private name: string) { }

  execute() {
    this.projectId = createProject(this.name)
  }

  undo() {
    deleteProject(this.projectId)
  }
}

class CommandQueue {
  private commands: Command[] = []

  execute(command: Command) {
    command.execute()
    this.commands.push(command)
  }

  undo() {
    const command = this.commands.pop()
    command?.undo()
  }
}
```

### 2. Observer Pattern (React example)
```typescript
// Observer
interface Subscriber {
  update(data: any): void
}

// Subject
class UserStore {
  private subscribers: Subscriber[] = []

  subscribe(subscriber: Subscriber) {
    this.subscribers.push(subscriber)
  }

  notify(user: User) {
    this.subscribers.forEach(s => s.update(user))
  }

  setUser(user: User) {
    this.notify(user)
  }
}

// React component as observer
const store = new UserStore()

function UserComponent() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    store.subscribe({ update: setUser })
  }, [])

  return <div>{user?.name}</div>
}
```

### 3. State Pattern
```typescript
interface OrderState {
  process(): void
  ship(): void
  deliver(): void
}

class PendingState implements OrderState {
  process() { console.log('Processing...') }
  ship() { throw new Error('Cannot ship pending order') }
  deliver() { throw new Error('Cannot deliver pending order') }
}

class ProcessedState implements OrderState {
  process() { throw new Error('Already processed') }
  ship() { console.log('Shipping...') }
  deliver() { throw new Error('Not shipped yet') }
}

class Order {
  private state: OrderState = new PendingState()

  setState(state: OrderState) { this.state = state }
  process() { this.state.process() }
  ship() { this.state.ship() }
  deliver() { this.state.deliver() }
}
```

---

## Part 4: API Design Patterns

### 1. REST Principles
```
Resource-based URLs (not actions)
❌ /getUser/123
✅ /api/v1/users/123

Proper HTTP methods
GET    /users          (list)
POST   /users          (create)
GET    /users/123      (read)
PATCH  /users/123      (update)
DELETE /users/123      (delete)

Consistent response format
{
  "data": { },
  "meta": { "page": 1 },
  "error": null
}
```

### 2. Pagination Pattern
```typescript
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

app.get('/api/users', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 10, 100)
  const skip = (page - 1) * limit

  const users = await db.users
    .skip(skip)
    .limit(limit)
    .find()

  const total = await db.users.count()

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})
```

### 3. Filtering & Sorting
```typescript
// Query: /api/users?filter[role]=admin&sort=-createdAt

interface Filter {
  [key: string]: any
}

interface Sort {
  [key: string]: 'asc' | 'desc'
}

app.get('/api/users', (req, res) => {
  let query = db.users

  // Apply filters
  const filters = req.query.filter || {}
  for (const [key, value] of Object.entries(filters)) {
    query = query.where(key, value)
  }

  // Apply sorting
  const sort = req.query.sort || {}
  for (const field of Object.keys(sort)) {
    const direction = field.startsWith('-') ? 'desc' : 'asc'
    query = query.orderBy(field.replace('-', ''), direction)
  }

  const users = await query.exec()
  res.json(users)
})
```

---

## Part 5: Frontend Patterns

### 1. Container/Presentational Pattern
```typescript
// Presentational (dumb component - styling only)
function UserCard({ user, onDelete }) {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={onDelete}>Delete</button>
    </div>
  )
}

// Container (smart component - logic)
function UserCardContainer({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.getUser(userId).then(setUser)
  }, [userId])

  const handleDelete = async () => {
    await api.deleteUser(userId)
    // redirect
  }

  return <UserCard user={user} onDelete={handleDelete} />
}
```

### 2. Render Props Pattern
```typescript
// Provider component
function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  return children({
    user,
    setUser,
    logout: () => setUser(null)
  })
}

// Usage
<UserProvider>
  {({ user, logout }) => (
    user ? (
      <div>{user.name} <button onClick={logout}>logout</button></div>
    ) : (
      <LoginForm />
    )
  )}
</UserProvider>
```

### 3. Custom Hooks Pattern
```typescript
// Extract stateful logic into reusable hook
function useFetch(url) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [url])

  return { data, error, loading }
}

// Usage
function Users() {
  const { data: users, loading } = useFetch('/api/users')
  return loading ? 'Loading...' : users.map(u => <div>{u.name}</div>)
}
```

---

## Part 6: Anti-Patterns (What to Avoid)

```
❌ God Object (class doing too much)
❌ Function with 10+ parameters (use config object)
❌ Global variables (use dependency injection)
❌ Deeply nested code (extract functions)
❌ Duplicate code (DRY principle)
❌ Switch statements for types (use polymorphism)
❌ Hard-coded values (use configuration)
❌ Catching all errors silently (log errors)
```

---

*Design patterns are not laws - they're guidelines for solving common problems.*  
*Use them when they make code clearer, not because they're "clever".*
