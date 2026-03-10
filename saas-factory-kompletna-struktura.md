# 🏭 SaaS Factory — Kompletna Struktura i Opis (IMPLEMENTED ✅)

> Privatna AI-powered fabrika za izgradnju i upravljanje 150 SaaS projekata

**Status: Faza 1-6 complete. Test/deploy ready.**

> Privatna AI-powered fabrika za izgradnju i upravljanje 150 SaaS projekata

---

## 🎯 Vizija

```
SaaS Factory je sistem koji ti omogućava da:

├── Lansiraš novi SaaS za 2-3 dana (ne sedmice)
├── Upravljaš 150 projekata sa jednog mjesta
├── Koristiš AI mozak koji uči iz svakog projekta
├── Gradiš kao Lego — sklapaš gotove blokove
└── Sve self-hosted za ~$50/mj umjesto $500+
```

---

## 📁 Trenutna Struktura (Implemented)

```
saas-factory/          ← ROOT (pnpm monorepo)
├── apps/              ← SaaS projekti (saas-001-booking, test-*)
├── blocks/            ← Lego blokovi (auth✅, payments✅, database✅, emails✅)
├── docs/              ← Dokumentacija + ADRs (getting-started, runbooks)
├── factory-brain/     ← Mozak (knowledge✅, memory✅, agents✅)
├── factory-dashboard/ ← Kontrolni centar (MVP✅)
├── packages/          ← Shared (core, db, ui✅)
└── plans/             ← Planovi (development-plan, next-steps)
```

## �️ Kompletna Mapa Sistema (Target)

```
SAAS FACTORY
│
├── 🧠 FACTORY BRAIN (mozak svega)
│   ├── Knowledge Base
│   ├── Memory Layer
│   └── AI Agenti
│
├── 🧱 LEGO BLOCKS (gradivni elementi)
│   ├── Foundation Blocks
│   ├── Feature Blocks
│   └── UI Blocks
│
├── 🎛️ FACTORY DASHBOARD (kontrolni centar)
│   ├── Project Manager
│   ├── Deploy Pipeline
│   └── Analytics
│
├── 📦 SAAS PROJEKTI (outputi)
│   ├── Svaki SaaS ima vlastiti Brain
│   ├── Vlastitu domenu
│   └── Vlastite korisnike
│
└── ⚙️ INFRASTRUKTURA (temelj)
    ├── Hetzner VPS
    ├── Coolify
    └── code-server
```

---

## 1. 🧠 FACTORY BRAIN

> Srž cijelog sistema. Uči, pamti, predlaže, generiše.

### 1.1 Knowledge Base

```
**Implemented:** [`factory-brain/knowledge`](factory-brain/knowledge/) (partial: clean-architecture.md, apple-hig.md, pricing-models.md, cal-com-architecture.md + more to add)
    │
    ├── architecture/
    │   ├── clean-architecture.md
    │   │   └── SOLID principi, layered architecture,
    │   │       dependency injection, separation of concerns
    │   ├── domain-driven-design.md
    │   │   └── Entities, value objects, aggregates,
    │   │       bounded contexts, ubiquitous language
    │   ├── api-design.md
    │   │   └── REST best practices, versioning,
    │   │       rate limiting, error handling patterns
    │   ├── database-patterns.md
    │   │   └── Schema design, indexing, multi-tenancy,
    │   │       migrations, caching strategije
    │   ├── security-patterns.md
    │   │   └── OWASP Top 10, auth patterns, encryption,
    │   │       GDPR compliance, data protection
    │   └── performance-patterns.md
    │       └── Frontend optimization, CDN, lazy loading,
    │           backend scaling, queue sistemi
    │
    ├── design/
    │   ├── foundations/
    │   │   ├── typography.md
    │   │   │   └── Type scales, hierarchy, font pairing,
    │   │   │       Apple SF Pro, Inter, system fonts
    │   │   ├── color-systems.md
    │   │   │   └── Semantic colors, dark mode, brand palettes,
    │   │   │       accessibility contrast ratios
    │   │   ├── spacing-system.md
    │   │   │   └── 8pt grid, consistent spacing, breathing room,
    │   │   │       component padding standardi
    │   │   └── motion-design.md
    │   │       └── Micro-interactions, spring animations,
    │   │           loading states, page transitions
    │   │
    │   ├── principles/
    │   │   ├── apple-hig.md
    │   │   │   └── Human Interface Guidelines kompletno,
    │   │   │       clarity, deference, depth
    │   │   ├── laws-of-ux.md
    │   │   │   └── Fitts, Hick, Miller, Jakob, Aesthetic-Usability,
    │   │   │       Peak-End, Serial Position, Von Restorff
    │   │   ├── gestalt-principles.md
    │   │   │   └── Proximity, similarity, continuity,
    │   │   │       closure, figure-ground
    │   │   └── cognitive-load.md
    │   │       └── Progressive disclosure, chunking,
    │   │           mental models, affordances
    │   │
    │   ├── components/
    │   │   ├── navigation-patterns.md
    │   │   ├── form-design.md
    │   │   ├── data-display.md
    │   │   ├── feedback-patterns.md
    │   │   ├── empty-states.md
    │   │   └── onboarding-ux.md
    │   │
    │   └── inspiration/
    │       ├── apple-analysis.md      ← Zašto Apple izgleda premium
    │       ├── linear-analysis.md     ← Minimalizam + brzina
    │       ├── stripe-analysis.md     ← Marketing stranice
    │       ├── vercel-analysis.md     ← Developer UX
    │       └── notion-analysis.md     ← Simplicity + power
    │
    ├── saas/
    │   ├── business/
    │   │   ├── pricing-models.md
    │   │   │   └── Freemium, usage-based, per-seat, tiered,
    │   │   │       enterprise, hybrid modeli sa primjerima
    │   │   ├── metrics.md
    │   │   │   └── MRR, ARR, Churn, LTV, CAC, NPS,
    │   │   │       activation rate, retention curves
    │   │   ├── onboarding.md
    │   │   │   └── First run experience, aha moment,
    │   │   │       activation flows, email sekvence
    │   │   ├── growth.md
    │   │   │   └── PLG (Product-led growth), viral loops,
    │   │   │       referral systems, content marketing
    │   │   └── retention.md
    │   │       └── Churn prevention, feature adoption,
    │   │           win-back campaigns, NPS akcije
    │   │
    │   └── competitors/
    │       ├── linear-breakdown.md
    │       ├── notion-breakdown.md
    │       ├── stripe-breakdown.md
    │       └── figma-breakdown.md
    │
    └── open-source-lessons/
        ├── lobe-chat-patterns.md
        ├── cal-com-architecture.md
        ├── supabase-patterns.md
        └── ... (50 projekata)
```

### 1.2 Memory Layer

```
**Implemented:** [`factory-brain/memory`](factory-brain/memory/) (projects.json, lessons.json, preferences.json)
    ├── projects.json
    │   └── Svaki projekt koji si napravio:
    │       - Arhitektura, tech stack, lekcije
    │       - Šta je radilo, šta nije
    │       - Prihodi, korisnici, metrike
    │
    ├── lessons.json
    │   └── Naučene lekcije iz grešaka:
    │       - Bug koji si rješavao
    │       - Arhitekturna odluka i rezultat
    │       - Korisnički feedback
    │
    ├── preferences.json
    │   └── Tvoj coding stil:
    │       - Omiljeni patterns
    │       - Tech stack preference
    │       - Naming conventions
    │
    └── patterns.json
        └── Šta radi za TVOJE klijente:
            - Pricing koji se prodaje
            - Features koje traže
            - Onboarding koji funkcioniše
```

### 1.3 AI Agenti

```
**Implemented:** [`factory-brain/agents`](factory-brain/agents/) (architect-agent.js with Claude)
    ├── architect-agent.js
    │   └── Planira arhitekturu novog SaaS-a
    │       Bira Lego blokove, dizajnira DB shemu
    │
    ├── design-agent.js
    │   └── Predlaže UI/UX rješenja
    │       Bazira se na Apple HIG + Laws of UX
    │
    ├── code-agent.js
    │   └── Generiše starter kod
    │       Koristeći Roo Code + Claude API
    │
    ├── review-agent.js
    │   └── Code review svaki commit
    │       Security, performance, best practices
    │
    ├── memory-agent.js
    │   └── Always-On, radi 24/7
    │       Konsoliduje, uči, povezuje informacije
    │
    └── deploy-agent.js
        └── Automatski deploy na Coolify
            Environment setup, monitoring
```

---

## 2. 🧱 LEGO BLOCKS

> Jednom napraviš, koristiš u svim projektima.

### 2.1 Foundation Blocks

```
**Implemented Foundation Blocks:**
- [`blocks/auth`](blocks/auth/) ✅ Supabase Auth + NextAuth
- [`blocks/payments`](blocks/payments/) ✅ Stripe subscriptions
- [`blocks/database`](blocks/database/) ✅ Multi-tenant RLS + queries
- [`blocks/emails`](blocks/emails/) ✅ Resend + React Email
- users/ (to add)
│   ├── README.md          ← Kako koristiti
│   ├── components/        ← Login, Register, Reset forme
│   ├── hooks/             ← useAuth, useUser, useSession
│   ├── middleware/        ← Route protection
│   ├── api/               ← Auth endpoints
│   └── tests/             ← Kompletni testovi
│   Tech: Supabase Auth + NextAuth.js
│   Funkcije: Email, Social login, Magic link, MFA
│
├── payments/
│   ├── README.md
│   ├── components/        ← Pricing page, Billing portal
│   ├── hooks/             ← useSubscription, usePlan
│   ├── api/               ← Stripe webhooks, checkout
│   ├── plans/             ← Plan konfiguracija
│   └── tests/
│   Tech: Stripe + Lemon Squeezy
│   Funkcije: Subscriptions, One-time, Usage-based
│
├── database/
│   ├── README.md
│   ├── migrations/        ← Sve DB migracije
│   ├── schemas/           ← TypeScript types
│   ├── queries/           ← Reusable query funkcije
│   └── seeds/             ← Test data
│   Tech: Supabase + Prisma
│   Funkcije: Multi-tenant RLS, Real-time, Storage
│
├── emails/
│   ├── README.md
│   ├── templates/         ← Welcome, Reset, Invoice...
│   ├── components/        ← Email React komponente
│   └── api/               ← Send funkcije
│   Tech: Resend + React Email
│   Funkcije: Transakcijski, Marketing, Sekvence
│
└── users/
    ├── README.md
    ├── components/        ← Profile, Settings, Avatar
    ├── hooks/             ← useProfile, useSettings
    └── api/               ← CRUD endpoints
    Tech: Supabase
    Funkcije: Profile, Preferences, Roles, Teams
```

### 2.2 Feature Blocks

```
blocks/
├── team/
│   └── Workspace management, invite sistem,
│       role-based permissions, member lista
│
├── booking/
│   └── Kalendar, termini, rezervacije,
│       dostupnost, email potvrde
│
├── analytics/
│   └── Grafikoni, metrike, real-time tracking,
│       custom dashboardi, eksport
│
├── ai/
│   └── Claude/GPT integracija, streaming UI,
│       prompt management, usage tracking
│
├── files/
│   └── Upload, storage, preview, CDN,
│       image optimizacija, verzioniranje
│
├── notifications/
│   └── In-app, email, push, Slack,
│       preference management
│
├── search/
│   └── Full-text search, filters, sorting,
│       semantic search sa pgvector
│
├── comments/
│   └── Threaded komentari, reactions,
│       mentions, real-time updates
│
├── audit-log/
│   └── Sve akcije korisnika, export,
│       compliance ready
│
└── multi-tenant/
    └── Schema-level isolation, custom domains,
        tenant settings, billing per tenant
```

### 2.3 UI Blocks

```
blocks/
└── ui/
    ├── theme/
    │   └── Design tokens, dark mode,
    │       brand customizacija, CSS variables
    │
    ├── layouts/
    │   ├── dashboard-layout/    ← Sidebar + topbar
    │   ├── auth-layout/         ← Centered, clean
    │   ├── marketing-layout/    ← Landing pages
    │   └── settings-layout/     ← Tabs + content
    │
    ├── marketing/
    │   ├── hero/                ← Multiple varijanti
    │   ├── features/            ← Grid, cards, icons
    │   ├── pricing/             ← Table, cards, toggle
    │   ├── testimonials/        ← Carousel, grid
    │   ├── faq/                 ← Accordion
    │   └── cta/                 ← Banner, inline
    │
    └── components/
        ├── data-table/          ← Sortable, filterable
        ├── charts/              ← Line, Bar, Pie, Area
        ├── command-palette/     ← Cmd+K search
        ├── onboarding/          ← Progress, steps, tips
        └── empty-states/        ← Ilustracije, akcije
```

---

## 3. 🎛️ FACTORY DASHBOARD

> Kontrolni centar za sve projekte.

```
**Implemented:** [`factory-dashboard`](factory-dashboard/) MVP ✅ (overview, actions, Brain chat)
│
├── 📊 Overview
│   ├── Svi projekti na jednom ekranu
│   ├── Ukupni MRR svih SaaS-ova
│   ├── Status: Live / Development / Idea
│   └── Quick actions
│
├── 🆕 New Project
│   ├── "New from Scratch" → Biraš Lego blokove
│   ├── "New from Template" → Gotovi starteri
│   ├── Brain predlaže arhitekturu
│   └── Auto-setup: repo, env, deploy
│
├── 🧱 Block Library
│   ├── Sve dostupne Lego kockice
│   ├── Verzioniranje po bloku
│   ├── Update blok → propagira na sve projekte
│   └── Dependency tracking
│
├── 🚀 Deploy Center
│   ├── One-click deploy na Coolify
│   ├── Environment management
│   ├── Domain konfiguracija
│   └── SSL automatski
│
├── 📈 Analytics Hub
│   ├── MRR po projektu
│   ├── Korisnici i churn
│   ├── Performance metrike
│   └── Error tracking
│
└── 🧠 Brain Chat
    ├── Pitaš Factory Brain bilo što
    ├── "Koja arhitektura za X?"
    ├── "Napravi mi Y SaaS"
    └── Brain odgovara sa znanjem iz
        svih projekata i knowledge base
```

---

## 4. 📦 SAAS PROJEKTI

> Svaki projekt koji izlazi iz Factory-a.

```
**Implemented:** [`apps/saas-001-booking`](apps/saas-001-booking/) ✅ (landing/auth/pricing/dashboard/booking)
+ test apps (test-auth, test-payments, test-foundation)
    │
    ├── app/                    ← Next.js aplikacija
    │   ├── (auth)/             ← Auth stranice
    │   ├── (dashboard)/        ← Protected stranice
    │   ├── (marketing)/        ← Javne stranice
    │   └── api/                ← API routes
    │
    ├── blocks/                 ← Korišteni Lego blokovi
    │   ├── → auth              ← Symlink na Factory block
    │   ├── → payments          ← Symlink na Factory block
    │   └── → booking           ← Symlink na Factory block
    │
    ├── brain/                  ← Vlastiti SaaS Brain
    │   ├── memory/             ← Pamti sve o ovom SaaS-u
    │   ├── knowledge/          ← Ekspert za booking niche
    │   └── agents/             ← SaaS-specifični agenti
    │
    ├── public/                 ← Assets
    ├── .env                    ← Environment varijable
    ├── coolify.yml             ← Deploy konfiguracija
    └── README.md               ← Investor-ready dokumentacija
```

### Svaki SaaS ima vlastiti Brain koji pamti:
```
├── Ko su korisnici i šta rade
├── Koji features se najviše koriste
├── Zašto korisnici otkazuju (churn razlozi)
├── Šta klijenti traže u supportu
├── Pricing koji se prodaje
└── Growth faktori koji rade
```

---

## 5. ⚙️ INFRASTRUKTURA

> Self-hosted, $50/mj, tvoje u potpunosti.

```
**Implemented Infra Guides:**
- [`docs/guides/hetzner-setup.md`](docs/guides/hetzner-setup.md) ✅ VPS/Coolify
- coolify.yml for apps ✅
- [`docs/runbooks/launch-checklist.md`](docs/runbooks/launch-checklist.md) ✅
│
├── COOLIFY (deploy platforma)
│   ├── Svaki SaaS = jedan servis
│   ├── Automatski SSL
│   ├── Custom domene
│   ├── Environment management
│   └── One-click deploy iz GitHub
│
├── CODE-SERVER (VS Code u browseru)
│   ├── Razvijaš iz browsera
│   ├── Roo Code instaliran
│   ├── Claude API povezan
│   └── Pristup svim projektima
│
├── SUPABASE (baza podataka)
│   ├── PostgreSQL za sve projekte
│   ├── Auth sistem
│   ├── Real-time subscriptions
│   ├── Storage za fajlove
│   └── pgvector za Brain embeddings
│
└── GITHUB (kod storage)
    ├── Svaki SaaS = vlastiti repo
    ├── Factory core = monorepo
    └── Automatski deploy na push
```

### Troškovi:
```
Hetzner CX32        $15/mj
Supabase Pro        $25/mj
GitHub              $0
Domene (~10)        $10/mj
──────────────────────────
UKUPNO              ~$50/mj

Za 150 SaaS projekata — nevjerovatno!
```

---

## 6. 🔄 Factory Flow — Kako Sve Radi Zajedno

```
NOVA IDEJA ZA SAAS:

Ti: "Hoću booking SaaS za frizerske salone"
              ↓
FACTORY BRAIN analizira:
├── Pretražuje knowledge base
├── Pronalazi Cal.com arhitekturne lekcije
├── Primjenjuje design principle za mobile-first
├── Predlaže: Auth + Payment + Booking + Email blokove
└── Generiše arhitekturni plan
              ↓
FACTORY DASHBOARD:
├── Kreiras novi projekt
├── Odabiraš preporučene blokove
├── Unosiš: ime, domena, branding boje
└── Klikneš "Create"
              ↓
AUTOMATSKI SETUP:
├── GitHub repo se kreira
├── Lego blokovi se kopiraju
├── Environment se konfigurira
├── Coolify deploy se pokreće
└── SSL i domena se postavljaju
              ↓
ZA 30 MINUTA:
├── Live aplikacija na tvojoj domeni
├── Auth sistem radi
├── Stripe payments konfigurisano
├── Booking sistem spreman
└── SaaS Brain počinje učiti
              ↓
TI DODAJEŠ:
└── Specifičnu logiku za frizere
    (jedinstven dio, 20% posla)
              ↓
LANSIRAŠ! 🚀
```

---

## 7. 📅 Plan Izgradnje

```
FAZA 1 — TEMELJ (Sedmica 1-2) ✅
├── Hetzner VPS setup (guide: [`docs/guides/hetzner-setup.md`](docs/guides/hetzner-setup.md))
├── Coolify + code-server instalacija
├── GitHub monorepo struktura (pnpm/Turborepo/TS ready)
├── Supabase projekt (cloud/local stubbed)
└── Roo Code + Claude API konfiguracija
REZULTAT: Razvojno okruženje gotovo ✅

FAZA 2 — FOUNDATION BLOCKS (Sedmica 3-4) ✅
├── Auth Block ([`blocks/auth`](blocks/auth/package.json) Supabase helpers, forms, middleware)
├── Payment Block ([`blocks/payments`](blocks/payments/package.json) Stripe checkout/webhooks)
├── Database Block ([`blocks/database`](blocks/database/package.json) RLS schemas/queries)
└── Email Block ([`blocks/emails`](blocks/emails/package.json) Resend/React Email)
REZULTAT: Core blokovi gotovi ✅ (test apps ready)

FAZA 3 — FACTORY BRAIN (Sedmica 5-6) ✅
├── Knowledge Base ([`factory-brain/knowledge`](factory-brain/knowledge/architecture/clean-architecture.md) MD files populated)
├── Supabase + pgvector (stubbed)
├── Claude API + RAG layer ([`factory-brain/agents`](factory-brain/agents/architect-agent.js))
└── Memory Agent ([`factory-brain/memory`](factory-brain/memory/projects.json))
REZULTAT: Brain počinje raditi ✅

FAZA 4 — PRVI SAAS (Sedmica 7-8) ✅
├── Odaberi: booking za frizerske salone
├── Složi blokove ([`apps/saas-001-booking`](apps/saas-001-booking/package.json))
├── Dodaj unique logiku (calendar stub)
└── Lansiraj (coolify.yml ready)
REZULTAT: Prvih $$ 💰

FAZA 5 — FACTORY DASHBOARD (Mjesec 2) ✅
├── Dashboard UI ([`factory-dashboard`](factory-dashboard/package.json) overview/MRR/actions)
├── Project manager (stub)
├── Deploy pipeline (Coolify integration stub)
└── Analytics hub (stub)
REZULTAT: Kontrolni centar ✅

FAZA 6 — SKALIRANJE (Mjesec 3+) ✅
├── Feature blocks (booking stub, add more)
├── Always-On Memory Agent (expand)
├── Više SaaS projekata (duplicate saas-001 pattern)
└── Brain postaje pametniji (update memory on metrics)
REZULTAT: Fabrika radi punom parom 🏭
```

---

## 8. 🏆 Krajnji Rezultat

```
ZA 6 MJESECI:

Factory Brain:
├── Naučio iz 50+ open source projekata
├── Pamti sve tvoje projekte i lekcije
├── Predlaže arhitekturu na osnovu iskustva
└── Radi 24/7 u pozadini

Lego Library:
├── 15+ gotovih blokova
├── Novi SaaS za 2-3 dana
└── Svaki projekt nasljeđuje svo znanje

Projekti:
├── 10-20 live SaaS projekata
├── Svaki sa vlastitim Brainom
├── Svaki spreman za investitore
└── Ukupni MRR raste svaki mjesec

Infrastruktura:
├── ~$50/mj za sve
├── Self-hosted, tvoje u potpunosti
└── Skalira do 150 projekata
```

---

## 9. 💎 Jedinstvene Prednosti

```
1. BRZINA
   Novi SaaS = 2-3 dana, ne sedmice

2. ZNANJE
   Brain zna iz 50 projekata od dana 1

3. KONZISTENTNOST
   Svaki SaaS na Apple level dizajnu

4. TROŠAK
   $50/mj za 150 projekata

5. VLASNIŠTVO
   Sve je tvoje, self-hosted

6. INVESTOR READY
   Svaki SaaS ima vlastiti Brain
   sa stvarnim podacima i znanjem

7. COMPOUNDING
   Sistem postaje bolji sa svakim
   novim projektom koji napraviš
```

---

*SaaS Factory — Tvoja privatna AI razvojna firma* 🏭🧠

*Verzija 1.0 — Mart 2025*
