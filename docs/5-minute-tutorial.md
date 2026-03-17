# 🚀 Od ideje do deploya za 5 minuta

Dobrodošli u **SaaS Factory**! Ovaj vodič će vam pokazati kako da pretvorite običnu tekstualnu ideju u potpuno funkcionalan, deployan SaaS proizvod u manje od 5 minuta.

SaaS Factory nije samo generator koda — to je **autonomna fabrika** sa 6 specijalizovanih AI agenata koji rade zajedno kako bi dizajnirali, napisali, testirali i deployali vašu aplikaciju.

---

## 🛠️ Preduslovi

Prije nego što počnemo, provjerite da li imate:
1. Pokrenut **SaaS Factory Dashboard** (`pnpm dev` u root direktoriju)
2. Konfigurisan **Supabase** (za bazu podataka i autentifikaciju)
3. Konfigurisan **Coolify** (za one-click deploy)
4. Važeći **OpenAI API ključ** u `.env` fajlu

---

## ⏱️ Korak 1: Unos ideje (Minuta 0:00 - 0:30)

1. Otvorite SaaS Factory Dashboard na `http://localhost:3000`
2. Kliknite na **"New Project"** ili idite na **Orchestrator** tab.
3. U polje "SaaS Description" unesite svoju ideju. Što detaljnije, to bolje!

> **💡 Primjer dobre ideje:**
> *"Želim SaaS za frizerske salone. Treba mi sistem za online rezervaciju termina, upravljanje zaposlenima (frizerima) i njihovim smjenama, te jednostavan CRM za praćenje klijenata i njihovih prethodnih frizura. Aplikacija treba imati tamnu temu sa zlatnim akcentima."*

4. Unesite ime aplikacije (npr. `salon-sync`) i kliknite **"Start War Room"**.

---

## 🧠 Korak 2: War Room Orchestrator (Minuta 0:30 - 2:30)

Sada preuzimaju AI agenti. U War Room-u ćete vidjeti kako agenti paralelno rade na vašem projektu:

1. **Architect Agent** dizajnira SQL shemu (sa RLS multi-tenancy politikama) i API rute.
2. **Growth Hacker Agent** analizira tržište i kreira strategiju monetizacije.
3. **Compliance Agent** provjerava GDPR/CCPA usklađenost (posebno važno jer čuvamo podatke klijenata).
4. **Legal Agent** generiše Terms of Service i Privacy Policy.

Sve ovo se dešava **istovremeno** zahvaljujući našem paralelnom Job Queue sistemu.

---

## 🎨 Korak 3: Nano Banana UI Engine (Minuta 2:30 - 3:30)

Kada je arhitektura spremna, **Nano Banana Engine** preuzima kontrolu nad frontendom:

1. Generiše se prilagođena tema (u našem slučaju: tamna pozadina, zlatni akcenti).
2. LLM-driven generator kreira specifične React komponente (npr. `CalendarBookingWidget`, `StylistShiftTable`).
3. **Assembler Agent** uzima sve ove komponente, spaja ih sa arhitekturom i kreira Next.js aplikaciju.

---

## 🧪 Korak 4: QA i Testiranje (Minuta 3:30 - 4:00)

Prije nego što kod ode u produkciju, **QA Agent** piše i pokreće testove:
- Unit testovi za kritične funkcije (npr. provjera preklapanja termina)
- Playwright E2E testovi za korisnički tok (odabir termina → potvrda)

Ako test padne, **Autonomous Learning Loop** automatski vraća grešku Assembler agentu da je popravi, i pamti to rješenje za buduće projekte!

---

## 🚀 Korak 5: One-Click Deploy (Minuta 4:00 - 5:00)

Kada je sve zeleno, dolazimo do finalnog koraka:

1. U Deploy koraku, vidjet ćete **One-Click Deploy** komponentu.
2. Vaš kod je već pushan na GitHub repozitorij koji ste konfigurisali.
3. Kliknite **"Deploy to Production"**.
4. Gledajte real-time logove dok Coolify preuzima kod, gradi Docker image i pokreće kontejner.
5. Kada se pojavi zeleni bedž **"Live"**, kliknite na link!

🎉 **Čestitamo! Vaš SaaS je live, siguran (RLS), testiran i spreman za prve korisnike.**

---

## 📈 Šta dalje?

- **Always-On Memory:** Idite na `/memory` tab da vidite šta je sistem naučio iz vašeg projekta.
- **Market Simulation:** Koristite MiroFish blok da simulirate kako će 1000 AI agenata (potencijalnih korisnika) reagovati na vaš novi SaaS.
- **Monetizacija:** Podesite Stripe webhooke prema uputama koje je generisao Architect Agent.
