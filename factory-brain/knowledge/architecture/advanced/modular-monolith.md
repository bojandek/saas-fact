# Modular Monolith Architecture: The Shopify Model

## Philosophy: Best of Both Worlds

### Monolith vs Microservices Tradeoff
```
Pure Monolith:
✓ Simple deployment
✓ Easier debugging
✓ Strong consistency
✗ Hard to scale
✗ Tightly coupled

Pure Microservices:
✓ Independent scaling
✓ Technology flexibility
✗ Network latency
✗ Complex debugging
✗ Distributed transactions

Modular Monolith (Goldilocks):
✓ Simple deployment (monolith)
✓ Independent scaling (modules)
✓ Technology flexibility (per module language)
✓ Easy debugging (structured code)
✓ Strong consistency (shared DB if needed)
```

### Shopify's Architecture Evolution
```
2006: Pure Monolith (Rails)
  └─ Single codebase, single database
  └─ Issue: Scaling challenges at 100k+ merchants

2010-2015: Transition to Modular Monolith
  ├─ Core: Orders, Products, Customers (monolith)
  ├─ Module: Analytics (can scale separately)
  ├─ Module: Inventory Management (can scale separately)
  ├─ Module: Payments (can scale separately)
  └─ Shared infrastructure, coordinated releases

2015+: Selective Microservices
  ├─ Monolith core (80% of revenue)
  ├─ Microservices where needed (payments, analytics)
  └─ Internal service mesh for resilience
```

---

## Core Principles of Modular Monolith

### 1. Module Boundaries (Clear Contracts)
```typescript
// Define clear module interfaces
interface Module {
  name: string;
  publicAPI: {
    exports: string[];    // What this module exposes
    depends_on: string[]; // What this module needs
  };
  internalAPI: {
    // Only accessible within module
  };
}

// Example: Order Module
const orderModule: Module = {
  name: "OrderModule",
  publicAPI: {
    exports: [
      "Order.create()",
      "Order.toFulfilled()",
      "Order.refund()",
    ],
    depends_on: [
      "PaymentModule.charge()",
      "InventoryModule.reserve()",
      "ShippingModule.quote()",
    ],
  },
};

// Example: Payment Module
const paymentModule: Module = {
  name: "PaymentModule",
  publicAPI: {
    exports: [
      "Payment.charge()",
      "Payment.refund()",
    ],
    depends_on: [
      "StripeProvider",
      "Logger",
    ],
  },
};
```

### 2. No Direct Database Access Between Modules
```typescript
// ❌ WRONG: Direct database coupling
// OrderService queries Payment table directly
const order = await db.orders.findById(orderId);
const payments = await db.payments.find({ orderId }); // WRONG!

// ✅ CORRECT: Module interface contract
const order = await OrderModule.getOrder(orderId);
const payments = await PaymentModule.getPaymentsForOrder(orderId);
// PaymentModule controls how payments are stored

// This allows:
// 1. PaymentModule to migrate database schema
// 2. PaymentModule to add caching
// 3. PaymentModule to scale separately (read replicas)
```

### 3. Module Ownership & Teams
```typescript
interface ModuleOwnership {
  module: string;
  owner_team: string;
  contact: string;
  on_call: string;
  sla: string;
}

// Shopify-like structure
const moduleTeams = [
  {
    module: "OrderModule",
    owner_team: "Order Processing",
    on_call: "order-team@shopify.com",
    sla: "P1: 1 hour response",
  },
  {
    module: "PaymentModule",
    owner_team: "Payments Infra",
    on_call: "payments-team@shopify.com",
    sla: "P1: 15 min response (revenue critical)",
  },
  {
    module: "AnalyticsModule",
    owner_team: "Analytics",
    on_call: "analytics-team@shopify.com",
    sla: "P1: 4 hour response (non-blocking)",
  },
];
```

---

## Modular Monolith Architecture Patterns

### Pattern 1: Bounded Contexts (Domain-Driven Design)
```typescript
// src/modules/ structure

src/
├── modules/
│   ├── orders/
│   │   ├── index.ts                    // Public API
│   │   ├── application/
│   │   │   ├── CreateOrderService.ts
│   │   │   └── OrderQueryService.ts
│   │   ├── domain/
│   │   │   ├── Order.ts
│   │   │   ├── OrderItem.ts
│   │   │   └── OrderStatus.ts
│   │   ├── infrastructure/
│   │   │   ├── OrderRepository.ts
│   │   │   └── OrderEventPublisher.ts
│   │   └── tests/
│   │       └── Order.test.ts
│   │
│   ├── payments/
│   │   ├── index.ts                    // Public API
│   │   ├── application/
│   │   │   ├── ChargeService.ts
│   │   │   └── RefundService.ts
│   │   ├── domain/
│   │   │   └── Payment.ts
│   │   ├── infrastructure/
│   │   │   ├── StripeProvider.ts
│   │   │   └── PaymentRepository.ts
│   │   └── tests/
│   │
│   ├── inventory/
│   │   ├── index.ts                    // Public API
│   │   ├── application/
│   │   ├── domain/
│   │   └── infrastructure/
│   │
│   └── analytics/
│       ├── index.ts                    // Public API
│       └── ...
│
└── shared/
    ├── types/
    ├── utils/
    ├── database/
    └── events/

// Public API for each module
// orders/index.ts
export class OrderApi {
  constructor(
    private orderService: CreateOrderService,
    private queryService: OrderQueryService,
  ) {}

  async createOrder(data): Promise<Order> {
    return this.orderService.execute(data);
  }

  async getOrder(id: string): Promise<Order> {
    return this.queryService.find(id);
  }
}

// Usage from other modules
// payments/application/ChargeService.ts
import { OrderApi } from '../../orders';

export class ChargeService {
  constructor(private orderApi: OrderApi) {}

  async charge(orderId: string): Promise<Charge> {
    const order = await this.orderApi.getOrder(orderId); // Only public API
    // Can't access order internals directly
    return this.stripe.charge(order.total);
  }
}
```

### Pattern 2: Event System (Async Communication)
```typescript
// Modules communicate asynchronously via events
interface DomainEvent {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  timestamp: Date;
  data: any;
}

// OrderModule publishes events
export class Order {
  static create(data): Order {
    const order = new Order(data);
    order.addEvent({
      aggregateId: order.id,
      aggregateType: "Order",
      eventType: "OrderCreated",
      data: order.toPrimitive(),
    });
    return order;
  }
}

// EventBus dispatches to interested modules
export class EventBus {
  private subscribers: Map<string, Function[]> = new Map();

  subscribe(eventType: string, handler: Function) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  async publish(event: DomainEvent) {
    const handlers = this.subscribers.get(event.eventType) || [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

// PaymentModule subscribes to OrderCreated
eventBus.subscribe("OrderCreated", async (event) => {
  await paymentModule.handleOrderCreated(event.data);
});

// InventoryModule subscribes to OrderCreated
eventBus.subscribe("OrderCreated", async (event) => {
  await inventoryModule.handleOrderCreated(event.data);
});

// Benefits:
// 1. No direct dependencies (orders → payments)
// 2. Easy to add new subscribers without modifying OrderModule
// 3. Can batch events for better performance
// 4. Can replay events for recovery
```

### Pattern 3: Dependency Injection & Container
```typescript
// Central service container
class ServiceContainer {
  private services: Map<string, any> = new Map();

  register(name: string, service: any) {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found`);
    }
    return service;
  }
}

// Bootstrap application
const container = new ServiceContainer();

// Register infrastructure
container.register("db", await createDatabase());
container.register("eventBus", new EventBus());
container.register("logger", new Logger());

// Register OrderModule
const orderDb = container.get("db");
const orderEventBus = container.get("eventBus");
const orderRepository = new OrderRepository(orderDb);
const orderService = new OrderService(orderRepository, orderEventBus);
container.register("OrderApi", new OrderApi(orderService));

// Register PaymentModule
const paymentRepository = new PaymentRepository(orderDb);
const stripeProvider = new StripeProvider(process.env.STRIPE_KEY);
const paymentService = new PaymentService(paymentRepository, stripeProvider);
container.register("PaymentApi", new PaymentApi(paymentService));

// Register InventoryModule
const inventoryRepository = new InventoryRepository(orderDb);
const inventoryService = new InventoryService(inventoryRepository);
container.register("InventoryApi", new InventoryApi(inventoryService));

// Usage in HTTP route
app.post("/orders", async (req, res) => {
  const orderApi = container.get("OrderApi");
  const order = await orderApi.createOrder(req.body);
  res.json(order);
});
```

---

## Shopify's Real-World Patterns

### Pattern 1: Shopify's "Backend for Frontend" (BFF)
```typescript
// Shopify aggregates data from multiple modules via BFF

// clients/admin-api/
// This BFF combines data from:
// - OrderModule
// - PaymentModule
// - CustomersModule
// - ShippingModule

export class AdminBFF {
  constructor(
    private orderApi: OrderApi,
    private paymentApi: PaymentApi,
    private customersApi: CustomersApi,
    private shippingApi: ShippingApi,
  ) {}

  async getOrderDetails(orderId: string) {
    // Parallel requests to different modules
    const [order, payments, shipping] = await Promise.all([
      this.orderApi.getOrder(orderId),
      this.paymentApi.getPaymentsForOrder(orderId),
      this.shippingApi.getShippingForOrder(orderId),
    ]);

    // Combine into single response
    return {
      order,
      payments,
      shipping,
      total: order.total,
      status: this._calculateStatus(order, payments, shipping),
    };
  }

  private _calculateStatus(order, payments, shipping) {
    // Complex business logic here
    if (!payments.some((p) => p.status === "success")) {
      return "payment_pending";
    }
    if (shipping.status === "pending") {
      return "processing";
    }
    return "shipped";
  }
}

// Benefits:
// 1. Modules stay simple (don't aggregate)
// 2. BFF layer handles API contract with clients
// 3. Easy to version BFF independently
// 4. Can have different BFFs for mobile, admin, storefront
```

### Pattern 2: Shopify's "Chores" System
```typescript
// Background job processing per module

interface Chore {
  module: string;
  name: string;
  schedule: string;     // Cron format
  handler: Function;
}

const chores: Chore[] = [
  {
    module: "PaymentModule",
    name: "CheckFailedCharges",
    schedule: "*/5 * * * *", // Every 5 minutes
    handler: async () => {
      const failedCharges = await paymentRepo.findFailed();
      for (const charge of failedCharges) {
        await retryCharge(charge);
      }
    },
  },
  {
    module: "OrderModule",
    name: "CancelExpiredOrders",
    schedule: "0 */1 * * *", // Every hour
    handler: async () => {
      const expiredOrders = await orderRepo.findExpired();
      for (const order of expiredOrders) {
        await order.cancel();
      }
    },
  },
  {
    module: "InventoryModule",
    name: "SyncInventory",
    schedule: "*/15 * * * *", // Every 15 minutes
    handler: async () => {
      await inventoryModule.syncWithWarehouse();
    },
  },
];

// Chore runner (separate process)
export async function runChores() {
  for (const chore of chores) {
    schedule(chore.schedule, chore.handler);
  }
}
```

---

## Scaling the Modular Monolith

### Phase 1: Monolith (0-$1M ARR)
```
Single process, single database
├─ All modules in same binary
├─ Horizontal scaling: multiple instances + load balancer
└─ Sufficient for early SaaS
```

### Phase 2: Read Replicas ($1M-$10M ARR)
```
├─ Monolith for writes
├─ Read replicas for queries
├─ Each module can read from replica
└─ Example: AnalyticsModule queries read replica only
```

### Phase 3: Module Extraction ($10M+ ARR)
```
Selectively extract modules that need independent scaling

Before:
Monolith
├─ Orders
├─ Payments
├─ Analytics
└─ Inventory

After:
Monolith (80% of traffic)    MicroService (20% of traffic)
├─ Orders                    ├─ Analytics (high read rate)
├─ Payments          +       └─ Reporting
└─ Inventory

Benefits:
- Payments monolith: can scale for high concurrency
- Analytics service: can scale read-heavy workload
- Easy to extract when needed
```

### Example: Extract Analytics as Microservice
```typescript
// Before: Part of monolith
// src/modules/analytics/AnalyticsService.ts
export class AnalyticsService {
  async recordEvent(event: any) {
    await this.db.events.insert(event); // Same database
  }
}

// After: Microservice
// services/analytics/ (separate repository)
// Only receives events via EventBus (RabbitMQ/Kafka)

export class AnalyticsService {
  private eventBus: EventBus;

  async initialize() {
    // Subscribe to all events from monolith
    this.eventBus.subscribe("OrderCreated", this.recordOrderEvent);
    this.eventBus.subscribe("PaymentSucceeded", this.recordPaymentEvent);
  }

  async recordOrderEvent(event: any) {
    // Process in separate service
    await this.database.events.insert(event);
  }
}

// Monolith change: Publish events to message queue
eventBus.publish(event, { transport: "rabbitmq" });

// No code change needed in other modules!
// They still call eventBus.publish(event)
// EventBus handles routing to RabbitMQ if needed
```

---

## SaaS-Specific Implementation

### Multi-Tenancy with Modular Monolith
```typescript
// Tenant context propagated through modules
interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: string[];
}

// Express middleware sets context
app.use((req, res, next) => {
  const context = createContext(req);
  res.locals.context = context;
  next();
});

// Modules receive context
export class OrderApi {
  async getOrder(id: string, context: TenantContext) {
    // Verify tenant access
    const order = await this.orderService.find(id, context.tenantId);
    if (order.tenantId !== context.tenantId) {
      throw new Error("Access denied");
    }
    return order;
  }
}

// Usage
app.get("/orders/:id", async (req, res) => {
  const orderApi = container.get("OrderApi");
  const order = await orderApi.getOrder(
    req.params.id,
    res.locals.context
  );
  res.json(order);
});
```

### Feature Flags with Modules
```typescript
// Each module can have feature flags
export class PaymentModule {
  constructor(
    private featureFlags: FeatureFlagService,
  ) {}

  async chargeCard(payment: Payment) {
    if (await this.featureFlags.isEnabled("use-stripe-v3", payment.tenantId)) {
      return this.stripeV3.charge(payment);
    } else {
      return this.stripeV2.charge(payment);
    }
  }
}

// Independent deployment without full release
// Enable new payment processor for 10% of customers
featureFlags.enable("use-stripe-v3", {
  percentage: 0.1,
});

// Monitor for errors
// If errors > threshold, automatic rollback
```

---

## Database Schema with Modules

### Shared vs Module-Owned Tables
```sql
-- Shared tables (accessed by multiple modules)
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  customer_id UUID,
  total DECIMAL,
  created_at TIMESTAMP
);

-- Module-owned table (PaymentModule)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  order_id UUID REFERENCES orders(id),
  amount DECIMAL,
  status VARCHAR,
  stripe_charge_id VARCHAR,
  created_at TIMESTAMP
);

-- Module-owned table (InventoryModule)
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  order_id UUID REFERENCES orders(id),
  product_id UUID,
  quantity INT,
  reserved_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Pattern: Each module "owns" its tables
-- Orders module: orders table
-- Payments module: payments table
-- Inventory module: inventory_* tables
-- No cross-module direct queries
```

---

## Resources

- [Modular Monolith Pattern](https://www.shopify.engineering/)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)
- [Shopify Engineering Blog](https://shopify.engineering)
- ["Building Microservices" - Sam Newman](https://samnewman.io/books/building_microservices/)
- ["Monolith Patterns" - Kamil Grzybek](https://github.com/kgrzybek/modular-monolith-with-ddd)
