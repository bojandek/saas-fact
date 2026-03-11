# 📚 API Documentation

Kompletan pregled svih SaaS Factory blokova i API-ja.

## 🗂️ Struktura dokumentacije

```
docs/
├── openapi.yaml              # REST API spec (Swagger/OpenAPI 3.0)
├── api/                      # TypeDoc generirano (HTML)
│   ├── index.html
│   ├── auth/
│   ├── database/
│   ├── emails/
│   └── payments/
└── guides/                   # Praktični vodiči
    ├── hetzner-setup.md
    └── ...
```

## 📖 Dokumentacijske opcije

### 1. **TypeDoc - TypeScript API dokumentacija**
TypeScript kođ dokumentacija sa automatskom generacijom.

```bash
# Generiraj
pnpm docs

# Vidi lokalno
pnpm docs:serve
# Otvara http://localhost:8080
```

**Sadržaj:**
- ✅ Sve funkcije i tipovi iz blokova
- ✅ JSDoc komentari
- ✅ Type signatures
- ✅ Examples sekcije

### 2. **OpenAPI spec - REST API dokumentacija**
Swagger format za sve REST API endpoints-a.

**Datoteka:** `docs/openapi.yaml`

Vidi sa [Swagger UI](https://editor.swagger.io/):
1. Otvori https://editor.swagger.io/
2. File → Import URL
3. Unesi: `https://raw.githubusercontent.com/your-org/saas-fact/main/docs/openapi.yaml`

**Ili lokalno:**
```bash
# Instaliraj swagger-ui-express
npx http-server docs -p 8080 --open
```

### 3. **Blokovi README**
Svaki blok ima detaljni README:

- [blocks/auth/README.md](../blocks/auth/README.md) - Autentifikacija
- [blocks/database/README.md](../blocks/database/README.md) - Baza podataka
- [blocks/payments/README.md](../blocks/payments/README.md) - Stripe
- [blocks/emails/README.md](../blocks/emails/README.md) - Email servis

## 🔗 API Endpoints

| Endpoint | Metoda | Opis | Blok |
|----------|--------|------|------|
| `/api/auth/login` | POST | Prijava | Auth |
| `/api/auth/register` | POST | Registracija | Auth |
| `/api/auth/logout` | POST | Odjava | Auth |
| `/api/payments/checkout` | POST | Stripe checkout | Payments |
| `/api/payments/webhooks` | POST | Stripe webhooks | Payments |
| `/api/emails/send` | POST | Slanje email-a | Emails |

Detalje viđ u `openapi.yaml` ili TypeDoc dokumentaciji.

## 🏗️ Blokovi pregled

### 🔐 Auth Block
Supabase autentifikacija sa Next.js middleware.

**Izvozeno:**
```typescript
- useAuth()              // React Hook
- LoginForm             // Komponenta
- RegisterForm          // Komponenta
- middleware            // Route protection
```

**Okruženje:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

[Vidi dokumentaciju →](../blocks/auth/README.md)

### 🗄️ Database Block
Supabase baza sa tipovima i helper queries.

**Izvozeno:**
```typescript
- getUserById()         // Query
- getTenantBySubdomain()// Query
- createTenant()        // Query
- type Database         // Types
```

**Tabele:**
- `users` - Korisnici (multi-tenant)
- `tenants` - Firme
- `subscriptions` - Subscriptions

[Vidi dokumentaciju →](../blocks/database/README.md)

### 💳 Payments Block
Stripe integracija za subscription-e.

**Izvozeno:**
```typescript
- useSubscription()     // React Hook
- CheckoutButton       // Komponenta
- stripe               // Stripe klijent
```

**Webhook eventi:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

[Vidi dokumentaciju →](../blocks/payments/README.md)

### 📧 Emails Block
Resend + React Email za email slanje.

**Izvozeno:**
```typescript
- sendWelcomeEmail()    // Helper
- resend               // Resend klijent
- WelcomeTemplate     // React component
```

**Templates:**
- Welcome email
- Password reset
- Invoice email

[Vidi dokumentaciju →](../blocks/emails/README.md)

## 🚀 Generiranje dokumentacije

Dokumentacija se automatski generiše sa GitHub Actions na svakom push-u na `main` branch.

### Local generisanje

```bash
# Install zavisnosti
pnpm install

# Generiraj TypeDoc
pnpm docs

# Rezultat je u ./docs/api/

# Pregled u browserud
pnpm docs:serve
```

### GitHub Actions workflow

Workflow: `.github/workflows/docs.yml`

**Šta radi:**
1. ✅ Generiše TypeDoc iz TypeScript koda
2. ✅ Validira OpenAPI YAML spec
3. ✅ Uploaduje kao artifact (30 dana)
4. ✅ Deployuje na GitHub Pages (main branch)
5. ✅ Komentiše PR sa link-om

## 📊 Type Documentation

Sve ključne tipove su dokumentovane sa JSDoc:

```typescript
/**
 * Korisnički tip iz baze
 * @property id - UUID korisnika
 * @property email - Email adresa
 * @property role - user | admin | owner
 */
export type User = Database['public']['Tables']['users']['Row']

/**
 * Prijava korisnika
 * @param email - Email adresa
 * @param password - Lozinka (min 8 karaktera)
 * @returns User i Session
 * @throws InvalidCredentialsError ako su kredencijale pogrešne
 */
export async function signIn(email: string, password: string) {
  // ...
}
```

## 🔄 CI/CD Integration

### Pre-push dokumentacijska validacija
Trebalo bi da postaviš pre-commit hook za validaciju:

```bash
#!/bin/bash
# .husky/pre-commit

# Validate TypeScript
pnpm type-check

# Validate OpenAPI spec
yamllint docs/openapi.yaml
```

Setup:
```bash
pnpm add -D husky lint-staged
npx husky install
```

### GitHub Pages Deployment
Automatski se deployera na `gh-pages` branch:
- 📍 URL: `https://username.github.io/saas-fact/docs/`
- 🔄 Osvježava se na svakom push-u na main

Postavi u GitHub repo settings:
1. Settings → Pages
2. Source: `Deploy from branch`
3. Branch: `gh-pages`
4. Directory: `/ (root)`

## 📱 Korištenje OpenAPI spec-a

### OpenAPI tools
- **Swagger UI** - Interactive dokumentacija
- **Swagger Editor** - Editovanje spec-a
- **Redoc** - Lean dokumentacija
- **OpenAPI Generator** - Generiši SDK-ove

### Generating Client SDK

```bash
# From OpenAPI spec, generiši TypeScript klijent
npx openapi-generator-cli generate -i docs/openapi.yaml -g typescript-axios -o ./generated-client

# Koristi generirani SDK
import { AuthApi } from './generated-client'

const authApi = new AuthApi()
const user = await authApi.loginUser({ email, password })
```

## 🧪 Testiranje API-ja

### Sa Postman
1. Otvori Postman
2. File → Import → URL
3. Unesi: `docs/openapi.yaml`
4. Automatski generiše sve request-e

### Sa cURL
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Create checkout
curl -X POST http://localhost:3000/api/payments/checkout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_monthly_pro"}'
```

## 📚 Dodatni resursi

- [TypeDoc Docs](https://typedoc.org)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.0)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [API Documentation Best Practices](https://swagger.io/resources/articles/best-practices-in-api-documentation/)

## 🎯 Checklist prije deploymen-a

- [ ] Sve TypeScript tipovi dokumentovani sa JSDoc
- [ ] OpenAPI spec je validan (testira se u CI)
- [ ] README-ovi su ažurirani u svakom bloku
- [ ] Examples su radni i testabili
- [ ] API endpoints su zaštićeni sa autentifikacijom
- [ ] Webhook signatures su validirane
- [ ] Error responses su jasni (viđ OpenAPI)

---

Sada je dokumentacija gotova! 🎉

Generisanja se automatski sa GitHub Actions na svakom push-u.
