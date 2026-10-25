# randevu

Universal onlayn randevu platforması: xidmət göstərəni tap, boş saatı seç,
randevunu bir neçə kliklə götür.

- Frontend: Next.js + TypeScript + TailwindCSS + shadcn/ui (`/frontend`)
- Backend: Java 21 + Spring Boot 3 + PostgreSQL 16 (`/backend`)

Plan və həftəlik bölgü: [BACKLOG.md](./BACKLOG.md). Qaydalar: [CLAUDE.md](./CLAUDE.md).

## Lokal işə salma

```bash
git clone https://github.com/codelady-ship/randevu.git
cd randevu

# Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev

# Backend və PostgreSQL (http://localhost:8080) - Docker lazımdır
docker compose up --build
```

## Layihə necə qurulub (istifadə olunan komandalar)

```bash
# Frontend
npx create-next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd frontend && npx shadcn@latest init

# Backend (Spring Initializr)
curl https://start.spring.io/starter.zip -d type=gradle-project -d language=java \
  -d javaVersion=21 -d groupId=az.randevu -d artifactId=backend \
  -d dependencies=web,data-jpa,postgresql,flyway,validation,security,actuator -o backend.zip
```

## Deploy

`frontend/` Vercel-ə qoşulub (Root Directory: `frontend`). `main`-ə hər merge
avtomatik production deploy edir.
