# randevu

Universal onlayn randevu platforması. Müştəri xidmət göstərəni (bərbər, həkim,
müəllim, konsultant və s.) tapır, xidməti seçir, yalnız boş saatlar arasından
vaxt götürür və randevunu öz kabinetindən idarə edir. Xidmət göstərən və admin
öz paneldə xidmətləri, iş qrafikini və randevuları idarə edir.

Referenslər: Calendly (randevu mexanizmi), SimplyBook.me (xidmət və əməkdaş
idarəetməsi), Booksy (profil və rəylər), Fresha (axtarış və kateqoriyalar).
Heç biri kopyalanmır, hər birindən konkret həll götürülür.

## Layihə Qaydaları (MƏCBURİ)

Bu qaydalar hər GitHub issue-nun sonuna footer kimi əlavə olunub:

- **Emoji QADAĞANDIR** — issue, commit, UI və sənədlərdə. Vizual işarələr üçün
  YALNIZ `lucide-react` ikonları. `scripts/check-no-emoji.mjs` CI-da yoxlayır.
- **UI kitabxanası: shadcn/ui** (`base-nova` stili, Base UI əsasında). Əvvəlcə shadcn komponenti,
  qarşılığı yoxdursa custom komponent.
- **Qradient və bənövşəyi-mavi qarışıqları qadağandır.**
- **İnterfeys dili: Azərbaycan dili.** Qiymətlər AZN, vaxt zonası `Asia/Baku`.
- Mobil-first: hər səhifə 360px enində rahat işləməlidir.
- Dizayn tokenləri və rəng palitrası: [docs/DESIGN.md](./docs/DESIGN.md).

## Texnoloji Stack

**Frontend** (`/frontend`) — Vercel-ə deploy olunur

- Next.js (App Router) + React + TypeScript (strict)
- TailwindCSS + shadcn/ui + lucide-react
- ESLint + Prettier, Vitest + React Testing Library

**Backend** (`/backend`)

- Java 21 + Spring Boot 3.x (Web, Data JPA, Security, Validation)
- PostgreSQL 16 + Flyway miqrasiyaları
- JWT (access/refresh), rollar: `ADMIN`, `PROVIDER`, `CUSTOMER`
- JUnit 5 + Testcontainers
- Arxitektura: `controller` / `service` / `repository` / `entity` / `dto`

**DevOps**

- Docker Compose (postgres, backend) lokal mühit üçün
- GitHub Actions CI (hər PR və `main` push)

## Repo Strukturu

```
randevu/
├── frontend/          # Next.js tətbiqi (müştəri saytı + admin panel)
├── backend/           # Spring Boot API
├── docs/              # DESIGN.md və digər sənədlər
├── scripts/           # check-no-emoji.mjs
├── docker-compose.yml
├── BACKLOG.md         # Epic / issue / həftə planı
└── CLAUDE.md
```

## Əsas Entity-lər

`User`, `ProviderProfile`, `Category`, `ServiceOffering`, `Availability`,
`Appointment`, `Review`.

`Availability` boş saatların siyahısı deyil, iş saatları, fasilələr və istirahət
günləri qaydalarıdır. Konkret boş vaxtlar bu qaydalar və mövcud randevular
əsasında hesablanır. Eyni vaxta iki randevunun düşməsinin qarşısı həm service
qatında, həm də verilənlər bazası səviyyəsində (constraint) alınır.

## İş Axını

- Hər iş GitHub issue ilə başlayır; branch adı `feat/<issue>-qisa-ad`.
- PR təsvirində `Closes #<issue>` olur, CI yaşıl olduqdan sonra squash merge.
- Hər həftə bir milestone (`Həftə N`) bağlanır və `main` Vercel-ə deploy olunur.
