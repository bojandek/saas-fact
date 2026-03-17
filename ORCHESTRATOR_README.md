# SaaS Factory Orchestrator - Kompletna Uputstva

Dobrodošli u **SaaS Factory Orchestrator** – sustav koji automatski gradi vrhunske SaaS aplikacije od opisa do produkcije.

## Što je SaaS Factory Orchestrator?

Orchestrator je "mozak" koji koordinira rad osam specijaliziranih AI agenata:
1. **Nano Banana** – Generira vrhunski UI dizajn
2. **Architect Agent** – Dizajnira bazu podataka i API arhitekturu
3. **Landing Page Generator** – Kreira marketinške stranice
4. **Growth Hacker Agent** – Planira SEO, social media i email kampanje
5. **Compliance Checker** – Provjerava usklađenost s regulativama
6. **QA Agent** – Generira automatske testove
7. **Assembler Agent** – Sklapa kod u funkcionalnu aplikaciju
8. **War Room Orchestrator** – Koordinira komunikaciju između agenata

## Kako Koristiti Orchestrator?

### Korak 1: Pristup Dashboardu
Otvori `factory-dashboard` aplikaciju na lokalnoj adresi:
```bash
pnpm dev
```
Navigiraj na `/orchestrator` stranicu.

### Korak 2: Unesi Opis Tvoje Ideje
Primjer: *"Moderni CRM za male zubare s mogućnošću zakazivanja termina, upravljanja pacijentima i automatskog slanja SMS-a"*

### Korak 3: Prati Proces
Sustav će automatski:
- Generirati unikatnu paletu boja i tipografiju (Nano Banana)
- Dizajnirati SQL shemu i API rute (Architect)
- Kreirati landing page s pricing-om (Landing Page Generator)
- Planirati marketing strategiju (Growth Hacker)
- Provjeriti sigurnost i compliance (Compliance Checker)
- Napisati testove (QA Agent)
- Sklop iti kod u `apps/saas-{tvoja-ideja}` (Assembler)

### Korak 4: Pregled i Deploy
Kada je proces završen, možeš:
- Pregledati generirani kod u `apps/saas-{tvoja-ideja}`
- Pokrenuti testove: `pnpm test`
- Deployati na Coolify: `pnpm deploy`

## Primjer Workflow-a

```
Unos: "AI-powered scheduling app za frizerske salona"
    ↓
Nano Banana: Genira "Modern & Minimalist" dizajn
    ↓
Architect: Kreira tablice za `appointments`, `clients`, `services`
    ↓
Landing Page: "Book Your Perfect Hair Day" s pricing-om
    ↓
Growth Hacker: LinkedIn kampanja za frizerske salona
    ↓
Compliance: Provjerava GDPR za pacijentske podatke
    ↓
QA: Piše testove za booking flow
    ↓
Assembler: Sklapa sve u `apps/saas-hairsalon`
    ↓
Rezultat: Gotova aplikacija spremna za produkciju
```

## Napredne Opcije

### Korištenje Specifičnog Bloka
Ako želiš da tvoj SaaS koristi specifičan blok (npr. `social-media-integration`), dodaj to u opis:
*"Scheduling app s mogućnošću dijeljenja na LinkedIn i Twitter"*

Architect će automatski uključiti `social-media-integration` blok.

### Prilagođeni Dizajn
Ako imaš specifičnu boju ili stil, reci to Nano Banani:
*"Koristi tamnu temu s neonskim plavim akcentima"*

### Multi-tenant od Početka
Ako trebaš da tvoj SaaS bude multi-tenant (više klijenata), Architect će automatski koristiti `advanced-multi-tenant` blok.

## Troubleshooting

### Greška: "RAG Knowledge Base nije dostupna"
Rješenje: Osiguraj da su sve datoteke u `factory-brain/knowledge/` dostupne i da je Supabase konekcija aktivna.

### Greška: "Orchestrator ne može generirati kod"
Rješenje: Provjerite da su svi agenti (`factory-brain/src/*-agent.ts`) ispravno instalirani.

### Greška: "Deploy na Coolify nije uspio"
Rješenje: Provjerite `COOLIFY_API_KEY` u `.env` datoteci.

## Što Dalje?

Nakon što kreneš s Orchestratorom, tvoj SaaS će:
1. Biti dostupan na vlastitoj subdomeni
2. Imati aktivnu pretplatu s trial periodom
3. Biti spremna za prve korisnike
4. Automatski se skalirati s brojem korisnika

## Podrška

Ako imaš pitanja ili probleme, provjeri:
- `ORCHESTRATOR_GUIDE.md` – Detaljnija tehnička dokumentacija
- `SAAS_FACTORY_AUDIT_REPORT.md` – Sigurnosni i arhitekturni uvidi
- GitHub Issues – Prijavi bug ili zatraži novu funkcionalnost

---

**Sretno s gradnjom! 🚀🍌**
