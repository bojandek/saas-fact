# CI/CD Pipeline Setup

## 🚀 Overview

Ovo su GitHub Actions workflows za saas-factory:

| Workflow | Trigger | Što radi |
|----------|---------|---------|
| **test.yml** | Push & PR na main/develop | Lint → Type Check → Tests → Coverage |
| **build.yml** | Push & PR na main/develop | Build sve packages, cache artifacts |
| **deploy.yml** | Push na main branch | Trigger Coolify webhook za deployment |

---

## 🔧 Setup Instructions

### 1. GitHub Secrets Setup

Prije nego što workflows počnu da se izvršavaju, trebas dodati secret u GitHub repo:

**Settings → Secrets and variables → Actions → New repository secret**

```
COOLIFY_WEBHOOK=https://your-coolify-instance.com/webhooks/github/{webhook-id}
```

**Kako dobiti Coolify webhook:**
1. Odi u Coolify → Project → Settings
2. Pronađi "GitHub Webhooks" sekciju
3. Kopiruj webhook URL

### 2. Verstificiraj workflow fajlove

```bash
# Na lokalnoj mašini
cd .github/workflows
ls -la
```

Trebao bi da vidiš:
- `test.yml`
- `build.yml`
- `deploy.yml`

### 3. Commituј i pushah fajlove

```bash
git add .github/workflows/
git commit -m "feat: Add GitHub Actions CI/CD pipeline"
git push origin main
```

---

## 📊 Workflow Detaljno

### test.yml
Pokreće se na **svaki push** i **pull request**:
- Instala pnpm dependencies
- Pokreće `pnpm lint` - ESLint
- Pokreće `pnpm type-check` - TypeScript
- Pokreće `pnpm test` - Vitest
- Uploaduje coverage report na Codecov

**Status badge za README:**
```markdown
[![test](https://github.com/YOUR_ORG/saas-fact/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_ORG/saas-fact/actions/workflows/test.yml)
```

### build.yml
Pokreće se na **push i PR**:
- Instala dependencies
- Pokreće `pnpm build`
- Cuva build artifacts na 5 dana

### deploy.yml
Pokreće se **SAMO na push na main** (AFTER tests pass):
- Šalje POST request na Coolify webhook
- Coolify automatski triggeruje deployment

---

## ⚙️ Turbo Caching

Workflows koriste pnpm cache za brže build-ove. Ako trebas da očistiš cache:

**GitHub UI → Actions → Clear all caches**

Ili koristi CLI:
```bash
gh actions-cache delete "..." -R YOUR_ORG/saas-fact
```

---

## 🐛 Troubleshooting

### Workflow ne počinje
- ✅ Proveri da li su fajlovi u `.github/workflows/`
- ✅ Proveri YAML syntax (validiraj sa [yamllint.com](https://www.yamllint.com))
- ✅ Proveri git fajlove su committed i pushed

### Deploy workflow ne triggeruje Coolify
- ✅ Proveri `COOLIFY_WEBHOOK` secret je podešen
- ✅ Proveri webhook URL je validan (test sa `curl`)
- ✅ Proveri GitHub Actions ima pristup internetu

### Tests padaju
- ✅ Pokreni lokalno: `pnpm test`
- ✅ Proveri `.env` file-ove - Actions nemaju pristup
- ✅ Koristi `secrets` za sensitive env vars

---

## 🔄 Next Steps

1. **Dodaj eslint & prettier** ako već nemaš
2. **Setup Codecov** za coverage tracking
3. **Dodaj E2E tests** workflow (Playwright)
4. **Setup branch protection** - zahtjevaj successful checks prije merge-a

---

## 📝 Branch Protection Rules

Koristi GitHub → Settings → Branches → Add rule

```
Branch name pattern: main
✓ Require a pull request before merging
✓ Require status checks to pass before merging
  - Lint
  - Type check
  - Tests
  - Build
✓ Require branches to be up to date before merging
```

---

Sada su sve tvoje GitHub Actions workflows pokrenut! 🎉
