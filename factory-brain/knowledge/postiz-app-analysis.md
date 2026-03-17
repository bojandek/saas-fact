# Postiz-app Arhitektura i Funkcionalnosti

Analiza `gitroomhq/postiz-app` repozitorija otkriva modernu, skalabilnu arhitekturu za SaaS aplikacije, posebno fokusiranu na upravljanje društvenim mrežama.

## Ključne Tehnologije
- **Monorepo**: Koristi `pnpm workspaces` i `Nx` za upravljanje višestrukim aplikacijama i bibliotekama.
- **Backend**: NestJS (Node.js framework) sa Prisma ORM-om.
- **Frontend**: Next.js sa Tailwind CSS-om.
- **Baza podataka**: PostgreSQL.
- **Infrastruktura**: Docker, Redis (vjerojatno za queueing), i integracije s raznim API-jima društvenih mreža.

## Arhitektura Baze Podataka (Prisma)
- **Multi-tenancy**: Implementirano kroz `Organization` model. Svaki korisnik (`User`) može biti dio jedne ili više organizacija putem `UserOrganization` tablice (Role-based access control).
- **Integracije**: `Integration` model upravlja OAuth tokenima i povezivanjem s platformama kao što su LinkedIn, Twitter, Instagram, itd.
- **Postovi i Zakazivanje**: `Post` model s podrškom za različite statuse (draft, scheduled, posted) i `Sets` za grupiranje povezanih objava.
- **Pretplate i Naplata**: `Subscription` model povezan s organizacijom, podržava različite razine (`SubscriptionTier`) i periode naplate.
- **Media Management**: Centralizirani `Media` model za upravljanje slikama i videozapisima po organizaciji.

## Inovativne Funkcionalnosti
- **AI Copilot**: Integracija za pomoć pri pisanju objava.
- **Analytics**: Praćenje performansi objava kroz različite kanale.
- **Social Media Agency Mode**: Poseban mod za upravljanje klijentima kao agencija.
- **Webhooks**: Podrška za vanjske integracije i automatizaciju.

## Primjenjivost na SaaS Factory
- **Social Media Block**: Možemo izvući logiku za OAuth integracije i zakazivanje objava kao novi blok.
- **Advanced Multi-tenancy**: Postiz-ov model organizacija i uloga je napredniji od našeg trenutnog i može poslužiti kao nadogradnja.
- **Media Library Block**: Centralizirano upravljanje medijima s podrškom za organizacije.
