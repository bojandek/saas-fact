# Deployment Vodiči za SaaS Factory

Ovaj dokument sadrži sve potrebne informacije za uspješno postavljanje i deployanje vaših SaaS aplikacija generiranih putem SaaS Factory Orchestratora.

## 🚀 Brzi Start: 5-minutni Deploy

Slijedite ove korake za najbrži put do produkcije:

1.  **Supabase Postavke**: Kreirajte novi Supabase projekt i konfigurirajte bazu podataka.
2.  **Stripe Postavke**: Postavite Stripe račun za plaćanja i pretplate.
3.  **Resend Postavke**: Konfigurirajte Resend za slanje transakcijskih e-mailova.
4.  **Coolify Integracija**: Povežite vaš GitHub repozitorij s Coolifyjem i postavite automatski deploy.
5.  **DNS Konfiguracija**: Postavite DNS zapise za vašu domenu.
6.  **Testiranje**: Provjerite funkcionalnost aplikacije nakon deploya.

## 📖 Detaljni Vodiči

### 1. Lokalno Postavljanje (Development Setup)

Za lokalni razvoj, slijedite upute u `apps/saas-001-booking/SETUP.md` (ili odgovarajućem `SETUP.md` za vašu generiranu aplikaciju). Ovaj vodič pokriva:

-   Instalaciju ovisnosti (`pnpm install`)
-   Konfiguraciju `.env` varijabli (Supabase URL/Anon Key, Stripe Secret Key, Resend API Key)
-   Pokretanje razvojnog servera (`pnpm dev`)

### 2. Produkcijski Deploy (Production Deployment)

Detaljan vodič za postavljanje produkcijskog okruženja. Pokriva:

-   **Supabase**: Produkcijske postavke, RLS konfiguracija, migracije baze podataka.
-   **Stripe**: Konfiguracija webhooks-a, produkcijski API ključevi.
-   **Coolify**: Postavljanje servera, Docker konfiguracija, CI/CD pipeline.
-   **Sigurnost**: SSL certifikati, varijable okoline.

### 3. Prije Deploya (Pre-Deployment Checklist)

Obavezno prođite kroz ovu listu prije svakog produkcijskog deploya:

-   [ ] Svi testovi su prošli (`pnpm test`)
-   [ ] TypeScript provjera je uspješna (`pnpm type-check`)
-   [ ] Linting je prošao (`pnpm lint`)
-   [ ] Sve varijable okoline su ispravno postavljene u produkcijskom okruženju.
-   [ ] RLS politike su aktivne i testirane.
-   [ ] Webhook-ovi su konfigurirani i testirani.
-   [ ] Backup strategija je postavljena.

### 4. GitHub Actions Workflow Setup

Upute za konfiguraciju GitHub Actions workflow-a za automatsko testiranje, buildanje i deploy na Coolify.

## 💡 Savjeti za Uspješan Deploy

-   **Testirajte rano i često**: Koristite QA Agenta za generiranje testova.
-   **Pratite logove**: Redovito provjeravajte logove na Coolifyju i Supabaseu.
-   **Sigurnost na prvom mjestu**: Nikada ne pohranjujte osjetljive podatke direktno u kod.

---

**Sretno s lansiranjem!** 🚀
