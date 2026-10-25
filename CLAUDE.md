# Randevum

Universal onlayn randevu platforması və şəxsi gündəlik asistenti. Şüar: "Vaxtını seç, rahatlığını yaşa." Müştəri xidmət göstərəni (bərbər, həkim,
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
- **UI-da qradient və bənövşəyi-mavi qarışıqları qadağandır.** Qradient yalnız loqonun özündədir (`docs/brand`); düymə, fon və kartlar düz rəngdir.
- **İnterfeys dili: Azərbaycan dili.** Qiymətlər AZN, vaxt zonası `Asia/Baku`.
- **Brend:** ad həmişə `Randevum` (böyük R ilə). Loqo və ikonlar: `docs/brand`, `frontend/public/brand`.
- Mobil-first: hər səhifə 360px enində rahat işləməlidir.
- Dizayn tokenləri və rəng palitrası: [docs/DESIGN.md](./docs/DESIGN.md).

## Texnoloji Stack

**Frontend** (`/frontend`) — Vercel-ə deploy olunur

- Next.js (App Router) + React + TypeScript (strict)
- TailwindCSS + shadcn/ui + lucide-react
- ESLint + Prettier, Vitest + React Testing Library

**Backend** (`/backend`)

- Java 21 + Spring Boot 4.x (WebMVC, Data JPA, Security, Validation, Actuator)
- PostgreSQL 16 + Flyway miqrasiyaları
- JWT (access/refresh), rollar: `ADMIN`, `PROVIDER`, `CUSTOMER`
- JUnit 5 + Testcontainers
- Arxitektura: `controller` / `service` / `repository` / `entity` / `dto`

**DevOps**

- Docker Compose (postgres, backend) lokal mühit üçün
- GitHub Actions CI (hər PR və `main` push)

## Repo Strukturu

```
randevum/
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
- PR təsvirində `Closes #<issue>` olur, CI yaşıl olduqdan sonra merge (merge commit, stacked PR-lar üçün).
- Layihə 7 gündə hazırlanır: hər gün bir milestone (`Gün N`) bağlanır və `main` Vercel-ə deploy olunur. Plan: BACKLOG.md.

## Mobil və Bildirişlər (yol xəritəsi)

- Gün 6: PWA (quraşdırılan sayt) + Web Push xatırlatmaları
- Gün 6: şəxsi qeydlər: əvvəl təqvimdən tarix, sonra saat seçilir (danışıqdan
  tarix/saat təxmin edilmir), sonra qeyd yazılır və ya səslə deyilir (Web Speech
  API, `az-AZ`, səs yalnız mətnə çevrilir); seçilmiş vaxtda alarm və bildiriş.
  Alarm bir səs tonu ilə (kişi və ya qadın, ayarlarda seçilir) oxuyur: "Sizin
  {saat} {tarix} tarixində qeydiniz var: {qeyd}". Qeydlər redaktə və silinə bilir.
- Gün 7: Capacitor ilə **Android və iOS** tətbiqi (eyni kod): lokal bildirişlər,
  əsl alarm, Siri / Google Assistant qısayolları. Mac olmadığı üçün iOS
  GitHub Actions macOS runner-də build olunur; real iPhone-a qurmaq (TestFlight)
  Apple Developer hesabı tələb edir. O vaxta qədər iPhone-da PWA işləyir.
