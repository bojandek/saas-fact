# 🏢 SaaS Factory - Complete SaaS Boilerplate

**The fastest way to launch a production-ready SaaS app.**

✨ **Built with:** Next.js 14 + TypeScript + Tailwind + Supabase + Stripe + Resend  
🔐 **Features:** Multi-tenant auth, payments, emails, database, CI/CD  
🚀 **Status:** Production-ready, tested, documented

---

## 🎯 What You Get

### 🔐 **Authentication Block** (blocks/auth/)
- Supabase Auth integration
- Email/password signup & login
- Multi-tenant support
- Session management
- Protected routes middleware

### 🗄️ **Database Block** (blocks/database/)
- Complete schema (users, tenants, subscriptions)
- Type-safe query helpers
- Multi-tenant isolation
- Proper error handling

### 💳 **Payments Block** (blocks/payments/)
- Stripe integration
- Subscription checkout
- Webhook-based DB sync
- Customer management

### 📧 **Emails Block** (blocks/emails/)
- Resend email service
- HTML email templates
- Welcome & password reset emails
- Easy to extend

### 🎨 **Complete App** (apps/saas-001-booking/)
- Landing page
- Auth pages (login/register)
- Protected dashboard
- Billing management
- Settings page
- API endpoints

### 📦 **Monorepo Setup**
- Turbo for fast builds
- pnpm workspaces
- Shared packages (core, db, ui)
- Path aliases

### 🔄 **CI/CD Pipeline**
- GitHub Actions configured
- Automated tests
- Docker builds
- Auto-deploy to Coolify

### 📚 **Complete Documentation**
- SETUP.md - Local development
- FINAL_DEPLOYMENT_GUIDE.md - 5-step production deploy
- PRODUCTION_DEPLOYMENT.md - Detailed production guide
- DEPLOYMENT_CHECKLIST.md - Pre-deployment checklist
- API documentation (OpenAPI + TypeDoc)

---

## 🚀 Quick Start (5 minutes)

### 1. Clone & Install
```bash
git clone https://github.com/bojandek/saas-fact.git
cd saas-fact
pnpm install
```

### 2. Setup Environment
```bash
# Navigate to app
cd apps/saas-001-booking

# Create environment file
cp .env.example .env.local

# Add test credentials (see SETUP.md)
```

### 3. Start Development
```bash
pnpm dev
# Visit http://localhost:3000
```

### 4. Test the Flow
- Register new account
- Login
- View dashboard
- (Optional) Test Stripe with test keys

---

## 📦 Project Structure

```
saas-fact/
├── apps/
│   ├── saas-001-booking/          # Main Next.js app (hair salon booking)
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (auth)/            # Auth routes (login, register)
│   │   │   ├── (dashboard)/       # Protected dashboard
│   │   │   ├── api/               # API routes (checkout, webhooks)
│   │   │   ├── billing/           # Subscription management
│   │   │   └── settings/          # Account settings
│   │   ├── SETUP.md               # Local setup guide
│   │   ├── COMPLETION_SUMMARY.md  # What was built
│   │   └── .env.example
│   │
│   └── saas-002-cms/              # (Optional) CMS app skeleton
│
├── blocks/                         # Reusable business logic
│   ├── auth/                       # Supabase Auth + UI components
│   ├── database/                   # Queries + types
│   ├── payments/                   # Stripe integration
│   └── emails/                     # Resend integration
│
├── packages/                       # Shared packages
│   ├── core/                       # Core utilities
│   ├── db/                         # Database utilities
│   └── ui/                         # UI components
│
├── factory-brain/                  # AI agents & knowledge base
├── factory-dashboard/              # Admin dashboard
├── docs/                           # Documentation
│   ├── openapi.yaml               # API spec
│   └── API.md                     # API guide
│
├── .github/workflows/              # GitHub Actions
│   ├── test.yml                   # Run tests
│   ├── build.yml                  # Build Docker
│   ├── deploy.yml                 # Deploy to Coolify
│   └── docs.yml                   # Generate docs
│
├── Dockerfile                      # Production Docker image
├── FINAL_DEPLOYMENT_GUIDE.md       # 5-step production deploy ⭐
├── PRODUCTION_DEPLOYMENT.md        # Detailed production guide
└── README.md                       # This file
```

---

## 🔑 Key Features

### ✅ Complete Auth Flow
```
Register → Create tenant → Email verification → Login → Dashboard
```

### ✅ Payment Integration
```
Dashboard → Billing → Stripe Checkout → Webhook → DB Update
```

### ✅ Multi-Tenant Architecture
```
Each user → belongs to → Tenant (organization)
Tenant → has many → Subscriptions
User → has many → Sessions
```

### ✅ Type Safety
```typescript
// All types auto-inferred from Zod schemas
const formData: TFormData = await form.validate()
const user: User = await db.getUserById(id)
```

### ✅ Protected Routes
```typescript
// Middleware validates session + tenant_id
// Automatically redirects unauthenticated users to login
// Sets headers with user metadata
```

### ✅ Webhook Integration
```
Stripe Event → Verify Signature → Process → Update Supabase
```

---

## 📋 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, CVA |
| **Forms** | React Hook Form, Zod |
| **Auth** | Supabase Auth |
| **Database** | Supabase PostgreSQL |
| **Payments** | Stripe API |
| **Emails** | Resend API |
| **Testing** | Vitest, React Testing Library |
| **Monorepo** | Turbo, pnpm workspaces |
| **CI/CD** | GitHub Actions |
| **Deployment** | Docker, Coolify |
| **Docs** | TypeDoc, OpenAPI |

---

## 🎓 Learning Paths

### 👶 **Beginner** (Start here)
1. Read this README
2. Run locally (see "Quick Start")
3. Read SETUP.md
4. Test registration flow
5. Test login flow

### 👨‍💻 **Intermediate**
1. Review blocks/auth/src/ code
2. Review blocks/database/src/ code
3. Check API routes in apps/saas-001-booking/app/api/
4. Review GitHub Actions workflows
5. Add new database table + queries

### 🚀 **Advanced**
1. Read PRODUCTION_DEPLOYMENT.md
2. Setup production Supabase project
3. Setup production Stripe account
4. Deploy using FINAL_DEPLOYMENT_GUIDE.md
5. Monitor in production
6. Add new features

---

## 📖 Documentation

### For Development
- **[SETUP.md](apps/saas-001-booking/SETUP.md)** - Local dev setup (Supabase, Stripe, Resend)
- **[COMPLETION_SUMMARY.md](apps/saas-001-booking/COMPLETION_SUMMARY.md)** - What was built
- **[docs/API.md](docs/API.md)** - API endpoints
- **[docs/openapi.yaml](docs/openapi.yaml)** - OpenAPI spec

### For Deployment
- **[FINAL_DEPLOYMENT_GUIDE.md](FINAL_DEPLOYMENT_GUIDE.md)** ⭐ - 5-step production deploy (START HERE)
- **[PRODUCTION_DEPLOYMENT.md](apps/saas-001-booking/PRODUCTION_DEPLOYMENT.md)** - Detailed steps
- **[DEPLOYMENT_CHECKLIST.md](apps/saas-001-booking/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
- **[.github/WORKFLOW_SETUP.md](.github/WORKFLOW_SETUP.md)** - GitHub Actions setup

### Architecture
- **[EXPERT_RECOMMENDATIONS.md](EXPERT_RECOMMENDATIONS.md)** - Design patterns & recommendations
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - What's implemented

---

## 🚀 Production Deployment

### Quick Deploy (1 hour)
Follow **[FINAL_DEPLOYMENT_GUIDE.md](FINAL_DEPLOYMENT_GUIDE.md)** - covers:
1. Supabase production setup (10 min)
2. Stripe production setup (15 min)
3. Resend production setup (5 min)
4. Coolify configuration (15 min)
5. DNS setup (10 min + wait)
6. Testing (10 min)

### Detailed Guide
See **[PRODUCTION_DEPLOYMENT.md](apps/saas-001-booking/PRODUCTION_DEPLOYMENT.md)** for:
- Step-by-step production setup
- Environment variable guide
- Webhook configuration
- Troubleshooting

### Pre-Deployment
Use **[DEPLOYMENT_CHECKLIST.md](apps/saas-001-booking/DEPLOYMENT_CHECKLIST.md)** to:
- Verify code quality
- Test payment flow
- Check security
- Validate configuration

---

## 🧪 Testing

### Run Tests
```bash
pnpm test              # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
```

### Type Check
```bash
pnpm type-check       # TypeScript check
```

### Lint
```bash
pnpm lint             # ESLint
```

### Format
```bash
pnpm format           # Prettier
```

---

## 🔄 Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/my-feature
```

### 2. Make Changes
```bash
# Code your feature
# Tests automatically run on save
pnpm test:watch
```

### 3. Test Locally
```bash
pnpm dev
# Visit http://localhost:3000
# Test your feature
```

### 4. Commit & Push
```bash
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

### 5. Create Pull Request
- Go to GitHub → Create PR
- GitHub Actions runs tests automatically
- Merge when tests pass

### 6. Auto-Deploy
- Merge PR to `main`
- GitHub Actions builds
- Auto-deploys to Coolify
- Website updates in ~2-3 minutes

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│          User's Browser                      │
│  visits https://yourdomain.com              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Next.js App        │
        │  (saas-001-booking)  │
        └──────────────┬───────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌────────┐   ┌──────────┐   ┌────────┐
    │  Auth  │   │ Database │   │Payments│
    │ Block  │   │  Block   │   │ Block  │
    └────┬───┘   └────┬─────┘   └───┬────┘
         │             │             │
    ┌────▼─────────────▼─────────────▼────┐
    │                                      │
    │    External Services               │
    │  ┌──────────────────────────────┐  │
    │  │ Supabase (Auth + Database)   │  │
    │  │ Stripe (Payments)            │  │
    │  │ Resend (Emails)              │  │
    │  └──────────────────────────────┘  │
    └──────────────────────────────────────┘
```

---

## 🆘 Getting Help

### Check Documentation First
- See [SETUP.md](apps/saas-001-booking/SETUP.md) for setup issues
- See [FINAL_DEPLOYMENT_GUIDE.md](FINAL_DEPLOYMENT_GUIDE.md) for deployment
- See [PRODUCTION_DEPLOYMENT.md](apps/saas-001-booking/PRODUCTION_DEPLOYMENT.md) for production issues

### Common Issues
- **"Can't login after signup?"** → Check Supabase project is active
- **"Stripe checkout not working?"** → Check API keys are correct
- **"Email not sending?"** → Check Resend domain is verified
- **"Deployment stuck?"** → Check GitHub Actions logs

### Get More Help
1. Check error logs (Coolify → Logs tab)
2. Check GitHub Actions output (GitHub → Actions)
3. Check Supabase logs
4. Check Stripe webhook events
5. Search documentation

---

## 📈 What's Next?

### Add More Features
1. Booking calendar in dashboard
2. Admin panel for business management
3. Email notifications for bookings
4. SMS notifications (Twilio)
5. Analytics dashboard
6. Custom branding

### Scale Infrastructure
1. Add Redis caching
2. Database backups
3. CDN for static assets
4. Load balancer setup
5. Database read replicas

### Monetize
1. Customer onboarding flow
2. Feature gating based on plan
3. Usage analytics
4. Upgrade/downgrade flows
5. Invoice management

---

## 📄 License

MIT - See LICENSE file

---

## 🎉 Credits

Built with ❤️ for SaaS founders who want to ship fast.

Powered by:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [Resend](https://resend.com)
- [Tailwind CSS](https://tailwindcss.com)

---

## 🚀 Ready to Deploy?

**Start here:** [FINAL_DEPLOYMENT_GUIDE.md](FINAL_DEPLOYMENT_GUIDE.md) ⭐

**Questions?** Check the docs or open an issue.

**Let's ship! 🚀**
