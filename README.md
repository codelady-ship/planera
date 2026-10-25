# Randevum

**Canlı sayt:** https://randevum-seven.vercel.app

Universal onlayn randevu platforması: xidmət göstərəni tap, boş saatı seç,
randevunu bir neçə kliklə götür.

- Frontend: Next.js + TypeScript + TailwindCSS + shadcn/ui (`/frontend`)
- Backend: Java 21 + Spring Boot 4 + PostgreSQL 16 (`/backend`)

Şüar: **Vaxtını seç, rahatlığını yaşa.**

Plan və həftəlik bölgü: [BACKLOG.md](./BACKLOG.md). Qaydalar: [CLAUDE.md](./CLAUDE.md).

## Lokal işə salma

```bash
git clone https://github.com/codelady-ship/randevum.git
cd randevum

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
  -d javaVersion=21 -d groupId=az.randevum -d artifactId=backend \
  -d dependencies=web,data-jpa,postgresql,flyway,validation,security,actuator,testcontainers -o backend.zip
```

## Demo hesablar

Bütün demo hesabların şifrəsi: `Randevum123`

| Rol | E-poçt |
|---|---|
| Admin | admin@randevum.az |
| Müştəri | musteri@randevum.az |
| Mütəxəssis | elvin-barber@randevum.az (və digər `<slug>@randevum.az`) |

## Deploy

### Frontend (Vercel)

- **Production:** https://randevum-seven.vercel.app
- Vercel layihəsi `randevum`, Root Directory: `frontend`, Node 22.
- `main`-ə hər merge avtomatik production deploy edir; hər PR öz preview linkini alır.

### Backend (Render, Docker)

`render.yaml` Blueprint üç servis yaradır: `randevum-api` (`backend/Dockerfile`), `randevum-db` (PostgreSQL 16) və `randevum-redis` (Key Value).

1. https://render.com - GitHub ilə daxil ol.
2. New -> Blueprint -> `codelady-ship/randevum` reposunu seç -> Apply.
3. Yoxlama: `https://<servis>.onrender.com/api/health`.

- **Production API:** https://randevum-api-uu30.onrender.com
- Vercel-də `API_URL` bu ünvana baxır; brauzer API-yə birbaşa yox, saytın `/api/backend` keçidi ilə müraciət edir.

Qeydlər: pulsuz plan 15 dəqiqə istifadəsiz qalanda yatır (ilk sorğu ~1 dəq); pulsuz PostgreSQL 30 gün sonra bitir, uzunmüddətli üçün Neon (#48) - onda `SPRING_DATASOURCE_URL` dəyişənini Neon-un JDBC URL-i ilə ver. `backend/` xaricindəki dəyişikliklər backend deploy-unu işə salmır.

## Təhlükəsizlik (OWASP əsas yoxlamaları)

| Risk | Necə qorunur |
|---|---|
| Broken Access Control | Hər endpoint-də rol yoxlaması (`@PreAuthorize`); mütəxəssis yalnız öz məlumatına çatır (profil tokendən tapılır), başqasının randevusu 403 qaytarır. |
| Cryptographic Failures | Şifrələr BCrypt ilə; JWT HS256, açar ən azı 32 bayt (`JWT_SECRET`); tokenlər brauzerdə yalnız httpOnly cookie-də saxlanır. |
| Injection | Bütün sorğular JPA parametrləri ilə; giriş məlumatı Bean Validation ilə yoxlanır (400 + sahə xətaları). |
| Insecure Design | Eyni vaxta iki randevu həm service qatında (Redis lock), həm bazada (exclusion constraint) bloklanır. |
| Security Misconfiguration | CORS default olaraq bağlıdır (`CORS_ALLOWED_ORIGINS`), Actuator-da yalnız `health` açıqdır, xətalar vahid ProblemDetail formatındadır (stack trace yoxdur). |
| Identification and Authentication Failures | Login: e-poçt üzrə dəqiqədə 5 cəhd; access token 15 dəq, refresh token 14 gün və rotasiya olunur, təkrar istifadə olunan refresh token istifadəçinin bütün sessiyalarını ləğv edir. |
| Rate limit | Randevu yaratma: müştəri üzrə dəqiqədə 10, gündə 20 (429 + `Retry-After`). |
| Logging | Şifrə, token və şəxsi qeydlər loglanmır; secret-lər yalnız env dəyişənlərindədir, `.env*` git-ə düşmür. |
