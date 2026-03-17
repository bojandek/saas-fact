# Memory Usage - Brz Početak 🧠

## Odgovor na Tvoje Pitanje

> Memorija sada stalno radi i zna gde je stigla. Kad otvorim novi chat, šta trebam pozvati? Koji fajl?

**Odgovor:** Koristi [`factory-brain/src/memory-session.ts`](factory-brain/src/memory-session.ts) - to je tvoja integracijska točka!

---

## Kako Funkcioniše - 3 Koraka

### 1️⃣ **App Startup** (Jedan put, na početku)

```typescript
// app.ts ili middleware.ts - na startu aplikacije
import { initializeMemory } from '@saas-factory/factory-brain/memory-session'

async function setupApp() {
  // Startup
  await initializeMemory('user-123-session')  // Čuva memoriju per user
  console.log('🧠 Brain je spreman!')
}

setupApp()
```

**Što se dešava:**
- ✅ Učitava prethodnu memoriju (ako postoji)
- ✅ Restituira sve naučene obrasce
- ✅ Sprema se za rad
- ✅ Logger prikazuje: "Memory restored with: 150 interactions, 0.82 confidence, 73% learning..."

---

### 2️⃣ **Novi Chat - Pitaj Brain-u**

```typescript
// Bilo gde u vašoj aplikaciji
import { askBrain, feedbackToBrain } from '@saas-factory/factory-brain/memory-session'

// Pitaj brain
const decision = await askBrain(
  'Trebam novi feature - kako ga strukturirati?',
  {
    project: 'booking-app',
    scale: '100k users',
    deadline: '2 weeks'
  }
)

console.log('🤖 Brain kaže:', decision.recommendation)
console.log('💪 Sigurnost:', decision.confidence)  // 0.87 = vrlo sigurno
console.log('🧠 Razmišljanje:', decision.reasoning)
```

**Rezultat:**
```
🤖 Brain kaže: Koristi microservices sa event sourcing
💪 Sigurnost: 0.87
🧠 Razmišljanje: Analiza X → Obraci Y → Pravila Z
```

---

### 3️⃣ **Prati Brain - Daj Feedback**

```typescript
// Nakon što si implementirao preporuku
import { feedbackToBrain } from '@saas-factory/factory-brain/memory-session'

const decisionId = decision.id

if (implementation_worked) {
  await feedbackToBrain(
    decisionId,
    'Microservices sa event sourcing',
    'positive',
    'Odličnog, skalabilno i brzo'
  )
} else {
  await feedbackToBrain(
    decisionId,
    'Microservices sa event sourcing',
    'negative',
    'Bilo je previše kompleksno za tim'
  )
}

// Brain se učio - sada zna bolje naslednji put!
```

---

## Praktični Primjeri: Različiti Chatovi

### Primer 1: Isti User, Novi Dan

**Dan 1 - Chat #1:**
```typescript
const decision1 = await askBrain('Kako strukturirati database?')
// Brain: Sigurnost 0.30 (prvi put)

await feedbackToBrain(id1, action1, 'positive', 'Radi odlično')
```

**Dan 2 - Chat #2 (Novi chat sesija):**
```typescript
await initializeMemory('user-123-session')  // Učitava dan 1 nauke

const decision2 = await askBrain('Trebam novi multi-tenant sistem...')
// Brain: Sigurnost 0.67 (pamti dan 1!)
// Brain: Automatski preporučuje RLS jer je to učio

await feedbackToBrain(id2, action2, 'positive', '✅ Opet radi!')
```

**Dan 30:**
```typescript
await initializeMemory('user-123-session')  // 30 dana nauke

const decision30 = await askBrain('Nova feature...')
// Brain: Sigurnost 0.87 (expert mode!)
// Brain: Preporučuje 3 pattern sa svim detaljima
```

---

## Sve Dostupne Funkcije

```typescript
import {
  // Inicijalizacija
  initializeMemory,
  getMemory,
  cleanupMemory,
  
  // Glavne akcije
  askBrain,                        // Pitaj brain za odluku
  feedbackToBrain,                 // Daj feedback (crucial!)
  teachBrain,                      // Nauči novi pattern
  updatePatternEffectiveness,      // Pojačaj/Oslaби pattern
  updateBrainContext,              // Ažuriraj context
  
  // Monitoring
  getBrainStatus,                  // Vidi koliko je brain naučio
  
  // Types
  BrainDecision,
  BrainInsights
} from '@saas-factory/factory-brain/memory-session'
```

---

## Kompletan Primer: SaaS Booking App

```typescript
// ============================================
// 1. APP STARTUP (obaviti jednom)
// ============================================
import { initializeMemory } from '@saas-factory/factory-brain/memory-session'

export async function setupApp(userId: string) {
  console.log('🚀 Startam app za korisnika:', userId)
  await initializeMemory(`${userId}-session`)
  console.log('✅ Brain je spreman!')
}

// ============================================
// 2. NOVI CHAT - ARCHITECTURE HELPER
// ============================================
import { askBrain, feedbackToBrain, getBrainStatus } from '@saas-factory/factory-brain/memory-session'

export async function helpArchitect(prompt: string) {
  // Prvo, vidi status brain-a
  const status = await getBrainStatus()
  console.log(`Brain je ${status.learning_progress}% osposobljen`)
  
  // Pitaj brain
  const decision = await askBrain(prompt, {
    project: 'booking-app',
    users: '100k',
    team: 'backend-5-people',
    budget: 'moderate'
  })
  
  console.log('\n🤖 RECOMMENDATION:')
  console.log('  Action:', decision.recommendation)
  console.log('  Confidence:', `${(decision.confidence * 100).toFixed(0)}%`)
  console.log('  Reasoning:', decision.reasoning)
  console.log('  Based on:', decision.sources.join(', '))
  
  return decision
}

// ============================================
// 3. IMPLEMENTACIJA + FEEDBACK
// ============================================
export async function implementAndFeedback(decision, success: boolean) {
  const feedback = success ? 'positive' : 'negative'
  const note = success 
    ? '✅ Implementacija je bila brza i čista'
    : '❌ Bilo je previše kompleksno'
  
  await feedbackToBrain(
    decision.id,
    decision.recommendation,
    feedback,
    note
  )
  
  console.log(`Brain je dobio feedback: ${feedback}`)
}

// ============================================
// 4. KORIŠĆENJE
// ============================================

// Startup app
await setupApp('user-456')

// Chat #1: Architecture question
const decision1 = await helpArchitect('Trebam booking sistem za 100k korisnika...')
// Brain: "Koristi monolith sa PostgreSQL RLS" (Confidence: 0.45)

// Implementiramo...
const success1 = true // Odličnog je radilo
await implementAndFeedback(decision1, success1)

// Chat #2: Tomorrow, novi feature
const decision2 = await helpArchitect('Trebam analytics...')
// Brain: "Koristi monolith sa PostgreSQL RLS" (Confidence: 0.78)
// Brain se ZAPAMTIO šta je radilo juče!

const success2 = true
await implementAndFeedback(decision2, success2)

// Chat #3: 30 days later
const decision3 = await helpArchitect('Trebam email sistema...')
// Brain: "Koristi monolith sa PostgreSQL RLS + Resend..." (Confidence: 0.87)
// Brain je EXPERT nakon 30 dana!
```

---

## Fajlovi Koje Trebas Znati

```
factory-brain/
├── src/
│   ├── always-on-memory.ts          ← Core engine (internals)
│   ├── memory-session.ts             ← ⭐ KORISTI OVO - Integration API
│   ├── rag.ts                        ← Knowledge base linking
│   ├── memory.ts                     ← Legacy memory system
│   └── agents.ts                     ← AI agents
├── ALWAYS_ON_MEMORY_GUIDE.md        ← Detalja i arhitektura
└── MEMORY_USAGE_QUICK_START.md      ← OVO ← Tržiš si ovde
```

**Za korišćenje:** Koristi samo `memory-session.ts`
**Za razumevanje:** Čitaj `ALWAYS_ON_MEMORY_GUIDE.md`

---

## Šta Se Automatski Dešava

```
FIRST OPEN (Dan 1):
├─ Učitaj staru memoriju (ako je korisnik vraćen)
├─ Inicijalizuj brain
└─ Spremi za rad

EACH QUESTION:
├─ Pronađi relevantne obrasce
├─ Primeni pravila
├─ Генериши razmišljanje
└─ Vrati recommendation sa confidencom

EACH FEEDBACK:
├─ Ažuriraj pattern effectiveness
├─ Pojačaj/Oslaби pravila
└─ Snimi u bazu (persistence)

EVERY 5 MINUTES (Auto):
├─ Analiziraj poslednje 20 koraka
├─ Ukloni slabe obrasce
├─ Optimizuj pravila
└─ Snimi stanje

USER LOGOUT:
└─ Snimi sve (cleanup)
```

---

## Best Practices

### ✅ Uradi Ovo

```typescript
// 1. Inicijalizuj na startup
await initializeMemory(sessionId)

// 2. Uvek daj feedback
await feedbackToBrain(id, action, 'positive', 'Radi!')

// 3. Pravilno ažuriraj context
await updateBrainContext('team_size', 5)

// 4. Koristi isto sessionId za istu osobu
const sessionId = `user-${userId}`
```

### ❌ Nemoj Ovo

```typescript
// ❌ Inicijalizuj više puta
await initializeMemory('session')
await initializeMemory('session')  // LOŠE

// ❌ Preskoči feedback
const decision = await askBrain('...')
// Nisi dao feedback → Brain se ne uči

// ❌ Koristi random sessionId
const sessionId = Math.random()  // LOŠE - svaki put novi

// ❌ Ignoruj confidence
if (decision.confidence < 0.3) {
  // Trebao si biti upozoren!
}
```

---

## Resumé

**Odgovor na tvoje pitanje:**

> Memoriјa stalno radi i zna gde je stigla. Kad otvorim novi chat, šta trebam pozvati?

**Odgovor:**

1. **Na startu:** `await initializeMemory('user-123')`
2. **U chatu:** `const decision = await askBrain('pitanje')`
3. **After doing it:** `await feedbackToBrain(id, action, 'positive')`

**Fajl za korišćenje:** [`factory-brain/src/memory-session.ts`](factory-brain/src/memory-session.ts)

**Rezultat:** Brain se učio svakim danom i postaje sve bolji 🧠📈

