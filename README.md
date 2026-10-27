# Planera

**Canlı sayt:** https://randevum-seven.vercel.app

Universal onlayn randevu platforması: xidmət göstərəni tap, boş saatı seç,
randevunu bir neçə kliklə götür.

- Frontend: Next.js + TypeScript + TailwindCSS + shadcn/ui (`/frontend`)
- Backend: Java 21 + Spring Boot 4 + PostgreSQL 16 (`/backend`)
- Dillər: Azərbaycan (əsas, `/`), İngilis (`/en`) və Rus (`/ru`); seçim başlıqdakı dil menyusundan, API xəta mesajları `Accept-Language` ilə eyni dildə

Şüar: **Vaxtını seç, rahatlığını yaşa.**

Plan və həftəlik bölgü: [BACKLOG.md](./BACKLOG.md). Qaydalar: [CLAUDE.md](./CLAUDE.md).

## Arxitektura

```mermaid
flowchart LR
    subgraph Client["Müştəri cihazı"]
        B["Brauzer / PWA<br/>(Next.js səhifələri, service worker)"]
        M["Android / iOS tətbiqi<br/>(Capacitor WebView + lokal alarm)"]
    end
    subgraph Vercel["Vercel"]
        N["Next.js (App Router)<br/>SSR, keş, /api/backend gateway<br/>httpOnly cookie-də JWT"]
    end
    subgraph Render["Render (Frankfurt)"]
        A["Spring Boot API<br/>controller / service / repository"]
        R[("Redis<br/>boş saat keşi, kilid, rate limit")]
        J["Xatırlatma job-u<br/>(hər dəqiqə, skip locked)"]
    end
    D[("PostgreSQL 16 (Render)<br/>Flyway miqrasiyaları")]
    P["Push servisləri<br/>(FCM / APNs / Mozilla)"]

    B -->|HTTPS| N
    M -->|server.url| N
    N -->|Bearer JWT| A
    A --> R
    A --> D
    J --> D
    J -->|VAPID, RFC 8291| P
    P -.->|Web Push| B
```

- Brauzer API-yə birbaşa müraciət etmir: hər sorğu saytın `/api/backend` keçidindən keçir, token httpOnly cookie-dən əlavə olunur.
- Eyni vaxta iki randevu həm service qatında (Redis kilidi), həm bazada (`appointments_no_overlap` exclusion constraint) bloklanır.
- Xatırlatmalar (`reminders` cədvəli) randevuya və ya şəxsi qeydə baxır; job sətirləri `for update skip locked` ilə götürür, ona görə bir neçə instansiyada da bir dəfə göndərilir.

## Ekran şəkilləri

| Ana səhifə | Axtarış | Mütəxəssis | Randevu | Giriş |
|---|---|---|---|---|
| ![Ana səhifə](docs/screenshots/home.png) | ![Axtarış](docs/screenshots/search.png) | ![Mütəxəssis səhifəsi](docs/screenshots/provider.png) | ![Randevu götürmə](docs/screenshots/booking.png) | ![Giriş](docs/screenshots/login.png) |

Gecə rejimi header-dəki düymə ilə (sistem / gündüz / gecə), 360px enində mobil-first.

## API sənədi

- OpenAPI: `https://randevum-api-uu30.onrender.com/v3/api-docs`
- Swagger UI (yalnız oxuma, "Try it out" bağlıdır): `https://randevum-api-uu30.onrender.com/swagger-ui.html`
- Lokalda: `http://localhost:8080/swagger-ui.html`. Qorunan endpoint-lər üçün `POST /api/auth/login` cavabındakı `accessToken` Bearer kimi göndərilir.

## Lokal işə salma

```bash
git clone https://github.com/codelady-ship/planera.git
cd planera

# Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev

# Backend və PostgreSQL (http://localhost:8080) - Docker lazımdır
docker compose up --build
```

## GitHub Codespaces (Docker lazım deyil)

Repo səhifəsində **Code > Codespaces > Create codespace on main**. Mühitdə Java 21, Node 22 və Docker hazırdır. PostgreSQL və Redis hər açılışda avtomatik qalxır (`postStartCommand`):

```bash
docker compose up -d postgres redis        # avtomatik; PostgreSQL :5433, Redis :6379
cd backend && ./gradlew bootRun --args="--spring.profiles.active=dev"   # API :8080, demo data ilə
cd backend && ./gradlew check              # Testcontainers testləri daxil
cd frontend && npm run dev                 # sayt :3000
```

## Layihə necə qurulub (istifadə olunan komandalar)

```bash
# Frontend
npx create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd frontend && npx shadcn@latest init

# Backend (Spring Initializr)
curl https://start.spring.io/starter.zip -d type=gradle-project -d language=java \
  -d javaVersion=21 -d groupId=az.planera -d artifactId=backend \
  -d dependencies=web,data-jpa,postgresql,flyway,validation,security,actuator,testcontainers -o backend.zip
```

## Demo hesablar

Bütün demo hesabların şifrəsi: `Planera123`

| Rol | E-poçt |
|---|---|
| Admin | admin@planera.az |
| Müştəri | musteri@planera.az |
| Mütəxəssis | elvin-barber@planera.az (və digər `<slug>@planera.az`) |

## Deploy

### Frontend (Vercel)

- **Production:** https://randevum-seven.vercel.app
- Vercel layihəsi `randevum`, Root Directory: `frontend`, Node 22.
- `main`-ə hər merge avtomatik production deploy edir; hər PR öz preview linkini alır.
- **PWA:** sayt telefona quraşdırıla bilir (`src/app/manifest.ts`, `public/sw.js`, offline səhifə `/offline`). Android Chrome "Quraşdır" düyməsi göstərir; iPhone-da banner Safari-nin "Paylaş -> Ana ekrana əlavə et" addımlarını izah edir (iOS-da push yalnız quraşdırılmış PWA-da işləyir). İkonlar `public/icons`-dadır, `node scripts/pwa-icons.mjs` ilə brend işarəsindən yenidən yaradılır. Service worker API cavablarını keşləmir; `sw.js` dəyişəndə `VERSION` sabitini artırın.

### Backend (Render, Docker)

`render.yaml` Blueprint üç resurs yaradır: `planera-db` (PostgreSQL 16), `planera-redis` (Key Value) və `planera-api` (`backend/Dockerfile`), hamısı Frankfurt, pulsuz plan. Bazanın host, port, ad, istifadəçi və şifrəsi Blueprint-də `fromDatabase` ilə API-yə avtomatik bağlanır; heç bir bağlantı məlumatı əl ilə yazılmır.

1. https://render.com - GitHub ilə daxil ol.
2. https://render.com/deploy?repo=https://github.com/codelady-ship/planera -> Blueprint adı `planera` -> Deploy Blueprint. Pulsuz planda bir Key Value və bir PostgreSQL ola bilər; köhnə `planera-redis` / `planera-db` qalıbsa əvvəl silin.
3. Web Push üçün yalnız `VAPID_PRIVATE_KEY` dashboard-da yazılır (public açar `render.yaml`-dadır, eyni cütün gizli yarısı: `npx web-push generate-vapid-keys`). Boş qalsa API hər açılışda təsadüfi cüt yaradır və köhnə abunəliklər işləmir.
4. Yoxlama: `https://<servis>.onrender.com/api/health`. İlk açılışda Flyway cədvəlləri və demo datanı yaradır.

- **Production API:** https://randevum-api-uu30.onrender.com
- Vercel-də `API_URL` bu ünvana baxır; brauzer API-yə birbaşa yox, saytın `/api/backend` keçidi ilə müraciət edir.

Qeydlər: pulsuz plan 15 dəqiqə istifadəsiz qalanda yatır (ilk sorğu ~1 dəq). Render-in pulsuz PostgreSQL-i yaradıldıqdan 30 gün sonra silinir (dashboard xəbərdarlıq edir); daimi baza üçün Neon və ya ödənişli plan: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` dəyişənləri dashboard-da yazılanda `planera-db` əvəzinə o baza işlənir (`jdbc:postgresql://<host>/<db>?sslmode=require`). API boş bağlantıları 2 dəqiqəyə bağlayır. `backend/` xaricindəki dəyişikliklər backend deploy-unu işə salmır.

## Mobil tətbiq (Capacitor, Android və iOS)

Tətbiq production saytı native WebView-da açır (`frontend/capacitor.config.ts`, `server.url`) və native plaginlərə (lokal bildiriş, alarm) körpü ilə müraciət edir. Native layihələr `frontend/android` və `frontend/ios`-dadır; ikon və splash `node scripts/mobile-assets.mjs` ilə brend işarəsindən yaradılır.

- **Android (lokal):** Android Studio ilə `frontend/android` qovluğunu açın və ya `cd frontend && npx cap sync android && cd android && ./gradlew assembleDebug`; APK `android/app/build/outputs/apk/debug/app-debug.apk`.
- **CI:** `.github/workflows/mobile.yml` hər dəyişiklikdə Android debug APK-nı artifact kimi yükləyir və iOS-u macOS runner-də simulyator üçün build edir (imzasız). Actions -> Mobile -> Run workflow ilə əl ilə də işə salınır.
- **iOS cihaz / TestFlight:** Apple Developer hesabı tələb edir (#67); o vaxta qədər iPhone-da PWA işləyir.
- Başqa ünvana baxan build üçün: `CAPACITOR_SERVER_URL=https://... npx cap sync`.

## Təhlükəsizlik (OWASP əsas yoxlamaları)

| Risk | Necə qorunur |
|---|---|
| Broken Access Control | Hər endpoint-də rol yoxlaması (`@PreAuthorize`); mütəxəssis yalnız öz məlumatına çatır (profil tokendən tapılır), başqasının randevusu 403 qaytarır. |
| Cryptographic Failures | Şifrələr BCrypt ilə; JWT HS256, açar ən azı 32 bayt (`JWT_SECRET`); tokenlər brauzerdə yalnız httpOnly cookie-də saxlanır. |
| Injection | Bütün sorğular JPA parametrləri ilə; giriş məlumatı Bean Validation ilə yoxlanır (400 + sahə xətaları). |
| Insecure Design | Eyni vaxta iki randevu həm service qatında (Redis lock), həm bazada (exclusion constraint) bloklanır. |
| Security Misconfiguration | CORS default olaraq bağlıdır (`CORS_ALLOWED_ORIGINS`), Actuator-da yalnız `health` açıqdır, xətalar vahid ProblemDetail formatındadır (stack trace yoxdur). |
| Identification and Authentication Failures | Login: e-poçt üzrə dəqiqədə 5 cəhd; access token 15 dəq, refresh token 14 gün və rotasiya olunur, təkrar istifadə olunan refresh token istifadəçinin bütün sessiyalarını ləğv edir. |
| Rate limit | Ümumi: hər müştəri (daxil olubsa hesab, yoxsa ünvan) üzrə dəqiqədə 120 sorğu; randevu yaratma: dəqiqədə 10, gündə 20; qeyd yaratma: gündə 50; bir hesabda ən çox 20 push cihazı (429 + `Retry-After`, 422). Sorğu gövdəsi 64 KB-dan böyük olanda 413. Redis düşəndə limitlər açıq qalır (fail-open). |
| Secret scan | Hər PR-da gitleaks bütün tarixçəni yoxlayır (CI `secrets` job). Açarlar yalnız Render / Vercel / GitHub Secrets-dədir; frontend-də `NEXT_PUBLIC_*` yoxdur. |
| Loops | Xatırlatma job-u sətirləri `for update skip locked` ilə götürür və eyni tranzaksiyada `sent_at` yazır (bir cəhd, təkrar yoxdur); 404/410 push abunəliyi silinir; frontend effektlərində təkrar sorğu dövrü yoxdur. |
| Database | Render PostgreSQL yalnız daxili şəbəkədən (`ipAllowList: []`) və Blueprint-in bağladığı istifadəçi/şifrə ilə açılır; bağlantı məlumatları repoda yoxdur. |
| Logging | Şifrə, token və şəxsi qeydlər loglanmır; secret-lər yalnız env dəyişənlərindədir, `.env*` git-ə düşmür. |
