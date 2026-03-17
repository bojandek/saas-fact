# SaaS Factory - Vrhunska Platforma za Gradnju SaaS Aplikacija

Dobrodošli u **SaaS Factory** – vašu autonomnu tvornicu softvera koja pretvara ideje u produkcijski spremne SaaS aplikacije, koristeći najnovije AI tehnologije i najbolje prakse u industriji.

## 🚀 Što je SaaS Factory?

SaaS Factory je monorepo sustav izgrađen s `pnpm workspaces` i `Turborepo`, dizajniran za izuzetnu skalabilnost i modularnost. Srce sustava je **Orchestrator**, inteligentni AI sustav koji koordinira rad specijaliziranih agenata kako bi automatizirao cijeli životni ciklus SaaS-a:

-   **Nano Banana UI Engine**: Generira vrhunski, unikatni UI dizajn i komponente.
-   **Architect Agent**: Dizajnira bazu podataka (SQL sheme, RLS politike) i API arhitekturu.
-   **Assembler Agent**: Sklapa kod u funkcionalnu aplikaciju koristeći Micro-Frontend arhitekturu i gotove blokove.
-   **Landing Page Generator**: Kreira marketinške stranice za vaš SaaS.
-   **Growth Hacker Agent**: Planira SEO, social media i email kampanje.
-   **Compliance Checker**: Provjerava usklađenost s regulativama (GDPR, SOC2).
-   **QA Agent**: Generira automatske Playwright testove za osiguranje kvalitete.
-   **Legal & Terms Generator**: Automatski generira pravne dokumente (ToS, Privacy Policy).
-   **War Room Orchestrator**: Koordinira komunikaciju i suradnju između svih agenata.
-   **Autonomous Learning Loop**: Sustav koji samostalno uči iz svakog generiranog SaaS-a i poboljšava svoje performanse.

## ✨ Ključne Značajke

-   **AI-Powered Development**: Od ideje do koda uz minimalnu ljudsku intervenciju.
-   **Micro-Frontend Arhitektura**: Svaki SaaS je nezavisan modul, spreman za skaliranje.
-   **Multi-Tenant Ready**: Ugrađena sigurnost i izolacija podataka (RLS).
-   **Vrhunski Dizajn**: Nano Banana osigurava Apple-level UX/UI.
-   **Automatsko Testiranje**: QA Agent garantira kvalitetu koda.
-   **Pravna Sigurnost**: Automatsko generiranje ključnih pravnih dokumenata.
-   **Kontinuirano Učenje**: Sustav postaje pametniji sa svakim novim projektom.
-   **Integracija s Coolify**: Jednostavan "One-Click Deploy" na produkciju.

## 🚀 Kako Koristiti SaaS Factory Orchestrator?

### 1. Pristup Dashboardu

Pokrenite `factory-dashboard` aplikaciju:

```bash
pnpm dev
```

Navigirajte na `/orchestrator` stranicu u vašem pregledniku.

### 2. Unesite Opis Vaše Ideje

U Orchestrator sučelju, unesite detaljan opis vašeg SaaS-a. Što je opis detaljniji, to će AI agenti generirati preciznije rezultate.

*Primjer: "Moderni CRM za male zubare s mogućnošću zakazivanja termina, upravljanja pacijentima i automatskog slanja SMS podsjetnika. Dizajn treba biti čist, profesionalan, s plavim i zelenim akcentima. Treba podržavati više lokacija ordinacija i biti GDPR usklađen."*

### 3. Pratite Proces Generiranja

Sustav će automatski proći kroz sljedeće korake, a vi možete pratiti komunikaciju agenata u "War Room" logu:

1.  **Nano Banana UI Engine**: Generira unikatnu paletu boja, tipografiju i UI komponente.
2.  **Architect Agent**: Dizajnira SQL shemu, API specifikaciju i RLS politike.
3.  **Landing Page Generator**: Kreira marketinšku stranicu s cijenama i značajkama.
4.  **Growth Hacker Agent**: Planira SEO, social media i email kampanje.
5.  **Compliance Checker**: Provjerava usklađenost s regulativama (npr. GDPR).
6.  **QA Agent**: Generira Playwright testove za ključne funkcionalnosti.
7.  **Legal & Terms Generator**: Kreira pravne dokumente (ToS, Privacy Policy).
8.  **Assembler Agent**: Sklapa sve u novu SaaS aplikaciju u `apps/saas-{vaša-ideja}`.

### 4. Pregled, Testiranje i Deploy

Nakon što je proces završen, vaša nova SaaS aplikacija je spremna:

-   **Pregled koda**: Pronađite je u `apps/saas-{vaša-ideja}`.
-   **Pokretanje testova**: `cd apps/saas-{vaša-ideja} && pnpm test`
-   **Deploy na Coolify**: Koristite integraciju za "One-Click Deploy" na vašu produkcijsku infrastrukturu.

## 🛠️ Struktura Monorepa

-   **`apps/`**: Sadrži sve generirane SaaS aplikacije (Micro-Frontends) i `factory-dashboard`.
-   **`blocks/`**: Višekratno upotrebljivi moduli (Auth, Database, Payments, Social Media Integration, Advanced Multi-Tenant, itd.).
-   **`packages/`**: Zajedničke komponente i utilsi (`ui`, `db`, `core`).
-   **`factory-brain/`**: Srce AI inteligencije, sadrži sve agente i bazu znanja (`knowledge/`).

## 📚 Baza Znanja (Factory Brain Knowledge)

`factory-brain/knowledge/` sadrži stručne dokumente koje AI agenti koriste za donošenje odluka. Ovdje su pohranjeni principi Apple dizajna, Clean Architecture, SaaS strategije, sigurnosne smjernice i znanje iz analiziranih open-source projekata.

## 🛡️ Sigurnost i Kvaliteta

SaaS Factory je izgrađen s fokusom na sigurnost i kvalitetu:

-   **Row Level Security (RLS)**: Automatska izolacija podataka između tenanta.
-   **Automatsko Testiranje**: QA Agent osigurava da je svaka generirana aplikacija funkcionalna i bez bugova.
-   **Compliance Checks**: Provjera usklađenosti s industrijskim standardima.

## 📈 Budući Razvoj

Sustav je dizajniran za kontinuirano učenje i proširenje. Kroz `Autonomous Learning Loop` i `OpenCrawl` integraciju, SaaS Factory će se stalno poboljšavati i prilagođavati najnovijim trendovima i najboljim praksama.

---

**Sretno s gradnjom vašeg sljedećeg velikog SaaS-a! 🚀🍌🧠🛡️🔥🌍**
