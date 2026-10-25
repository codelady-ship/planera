# Randevum - Backlog

GitHub Issues əsaslı backlog: **14 Epic** və **54 Sub-issue** (native parent/sub-issue iyerarxiyası). Layihə **7 gündə** hazırlanır (25-31 oktyabr 2026): hər gün bir milestone (`Gün 1` ... `Gün 7`) bağlanır və `main` Vercel-ə deploy olunur. Bir həftəyə sığmayan işlər `Sonra (v1.1)` milestone-undadır.

Repo: [codelady-ship/randevum](https://github.com/codelady-ship/randevum/issues)

## İş axını

1. Issue seçilir, branch açılır: `feat/<issue>-qisa-ad`
2. PR açılır, təsvirdə `Closes #<issue>`
3. CI yaşıl olduqdan sonra squash merge
4. Günün sonunda milestone bağlanır

## 7 günlük plan

| Gün | Tarix | Məqsəd |
|---|---|---|
| 1 | 25 okt | Təməl, brend, CI və Vercel deploy |
| 2 | 26 okt | Verilənlər bazası və kataloq API-ləri |
| 3 | 27 okt | İş qrafiki, boş saatlar və randevu mexanizmi |
| 4 | 28 okt | Auth və müştəri səhifələri |
| 5 | 29 okt | İnteqrasiya, admin panel və production deploy (Neon + Render) |
| 6 | 30 okt | PWA, push bildirişlər, şəxsi qeydlər, rəylər |
| 7 | 31 okt | Android və iOS tətbiqi (Capacitor; iOS GitHub Actions macOS-da), alarm, Siri/Assistant, sənədləşmə |
| Sonra | v1.1 | E-poçt bildirişləri (#43), gözləmə siyahısı (#45), sevimlilər (#46), mağazalara yayım (#67) |

## Epic Xülasəsi

| Epic | Issue | Gün | Sub-issue | Labels |
|---|---|---|---|---|
| 1. Layihə Təməli və Dizayn Sistemi | [#1](https://github.com/codelady-ship/randevum/issues/1) | 1 | 6 | epic, frontend, backend, design, devops |
| 2. Verilənlər Bazası və Entity Qatı | [#7](https://github.com/codelady-ship/randevum/issues/7) | 2 | 4 | epic, backend, database |
| 3. Kateqoriya, Xidmət Göstərən və Xidmət API-ləri | [#12](https://github.com/codelady-ship/randevum/issues/12) | 2 | 3 | epic, backend |
| 4. İş Qrafiki və Boş Vaxtların Hesablanması | [#16](https://github.com/codelady-ship/randevum/issues/16) | 3 | 3 | epic, backend, booking |
| 5. Randevu Yaratma, Dəyişmə və Ləğv | [#20](https://github.com/codelady-ship/randevum/issues/20) | 3 | 3 | epic, backend, booking |
| 6. Autentifikasiya və Rollar (RBAC) | [#24](https://github.com/codelady-ship/randevum/issues/24) | 4 | 3 | epic, auth, backend, frontend |
| 7. Müştəri Səhifələri | [#28](https://github.com/codelady-ship/randevum/issues/28) | 4 | 4 | epic, frontend, design |
| 8. İnteqrasiya, Testlər və Təhlükəsizlik | [#33](https://github.com/codelady-ship/randevum/issues/33) | 5 | 3 | epic, frontend, backend |
| 9. Admin və Provider Paneli | [#37](https://github.com/codelady-ship/randevum/issues/37) | 5 | 4 | epic, admin-panel, frontend, backend |
| 10. Rəylər, Bildirişlər və Gözləmə Siyahısı | [#42](https://github.com/codelady-ship/randevum/issues/42) | 6 | 4 | epic, backend, frontend |
| 11. Production Deploy | [#47](https://github.com/codelady-ship/randevum/issues/47) | 5 | 4 | epic, devops |
| 12. PWA və Push Bildirişləri | [#53](https://github.com/codelady-ship/randevum/issues/53) | 6 | 4 | epic, frontend, backend |
| 13. Şəxsi Qeydlər və Səsli Asistent | [#58](https://github.com/codelady-ship/randevum/issues/58) | 6 | 5 | epic, frontend, backend |
| 14. Mobil Tətbiq: Capacitor, Alarm və Siri | [#63](https://github.com/codelady-ship/randevum/issues/63) | 7 | 4 | epic, frontend, devops |

## Detallı Backlog

### EPIC 1 - Layihə Təməli və Dizayn Sistemi (#1 · Gün 1)

| # | Sub-issue | Labels |
|---|---|---|
| #2 | 1.1 Monorepo strukturu və CI | devops |
| #3 | 1.2 Next.js frontend skeleti, shadcn/ui və dizayn tokenləri | frontend, design |
| #4 | 1.3 Ana səhifə (mock data ilə) | frontend, design |
| #5 | 1.4 Spring Boot backend skeleti | backend |
| #6 | 1.5 Vercel deploy (frontend) | devops, frontend |
| #52 | 1.6 Randevum brendi: ad, loqo, ikonlar və rəng palitrası | frontend, design |

### EPIC 2 - Verilənlər Bazası və Entity Qatı (#7 · Gün 2)

| # | Sub-issue | Labels |
|---|---|---|
| #8 | 2.1 Flyway və əsas cədvəllər: users, categories, provider_profiles, service_offerings | database, backend |
| #9 | 2.2 availability_rules, appointments, reviews cədvəlləri və double-booking constraint | database, backend, booking |
| #10 | 2.3 JPA entity və repository qatı | backend, database |
| #11 | 2.4 Demo seed data | database |

### EPIC 3 - Kateqoriya, Xidmət Göstərən və Xidmət API-ləri (#12 · Gün 2)

| # | Sub-issue | Labels |
|---|---|---|
| #13 | 3.1 Kateqoriya API | backend |
| #14 | 3.2 Provider profili və axtarış API | backend |
| #15 | 3.3 Xidmət (ServiceOffering) CRUD | backend |

### EPIC 4 - İş Qrafiki və Boş Vaxtların Hesablanması (#16 · Gün 3)

| # | Sub-issue | Labels |
|---|---|---|
| #17 | 4.1 Availability qaydaları API | backend, booking |
| #18 | 4.2 SlotCalculationService | backend, booking |
| #19 | 4.3 Boş saatlar endpoint-i | backend, booking |

### EPIC 5 - Randevu Yaratma, Dəyişmə və Ləğv (#20 · Gün 3)

| # | Sub-issue | Labels |
|---|---|---|
| #21 | 5.1 Randevu yaratma (race condition qoruması) | backend, booking |
| #22 | 5.2 Randevunun ləğvi və vaxtının dəyişdirilməsi | backend, booking |
| #23 | 5.3 Randevu statusları və tarixçə | backend, booking |

### EPIC 6 - Autentifikasiya və Rollar (RBAC) (#24 · Gün 4)

| # | Sub-issue | Labels |
|---|---|---|
| #25 | 6.1 Qeydiyyat və login (JWT access/refresh) | auth, backend |
| #26 | 6.2 Rol əsaslı icazələr | auth, backend |
| #27 | 6.3 Frontend auth axını | auth, frontend |

### EPIC 7 - Müştəri Səhifələri (#28 · Gün 4)

| # | Sub-issue | Labels |
|---|---|---|
| #29 | 7.1 Axtarış səhifəsi və filtrlər | frontend |
| #30 | 7.2 Xidmət göstərənin profil səhifəsi | frontend, design |
| #31 | 7.3 Randevu götürmə - 4 addım | frontend, booking |
| #32 | 7.4 Şəxsi kabinet | frontend |

### EPIC 8 - İnteqrasiya, Testlər və Təhlükəsizlik (#33 · Gün 5)

| # | Sub-issue | Labels |
|---|---|---|
| #34 | 8.1 API client və mock-dan real API-yə keçid | frontend |
| #35 | 8.2 End-to-end randevu axını testi | frontend, backend |
| #36 | 8.3 Təhlükəsizlik: CORS, validation, rate limit | backend |

### EPIC 9 - Admin və Provider Paneli (#37 · Gün 5)

| # | Sub-issue | Labels |
|---|---|---|
| #38 | 9.1 Panel layout və naviqasiya | admin-panel, frontend |
| #39 | 9.2 Təqvim görünüşü və randevuların idarəsi | admin-panel, frontend, booking |
| #40 | 9.3 Xidmət və iş qrafiki idarəsi | admin-panel, frontend |
| #41 | 9.4 Statistika | admin-panel, backend, frontend |

### EPIC 10 - Rəylər, Bildirişlər və Gözləmə Siyahısı (#42 · Gün 6)

| # | Sub-issue | Labels |
|---|---|---|
| #43 | 10.1 E-poçt bildirişləri | backend |
| #44 | 10.2 Müştəri rəyləri | backend, frontend |
| #45 | 10.3 Gözləmə siyahısı | backend, frontend, booking |
| #46 | 10.4 Sevimli xidmət göstərənlər | frontend, backend |

### EPIC 11 - Production Deploy (#47 · Gün 5)

| # | Sub-issue | Labels |
|---|---|---|
| #48 | 11.1 Production PostgreSQL (Neon) | devops, database |
| #49 | 11.2 Backend deploy (Render / Railway, Docker) | devops, backend |
| #50 | 11.3 Vercel production konfiqurasiyası | devops, frontend |
| #51 | 11.4 Sənədləşmə və demo | devops |


### EPIC 12 - PWA və Push Bildirişləri (#53 · Gün 6)

| # | Sub-issue | Labels |
|---|---|---|
| #54 | 12.1 PWA: manifest, service worker və quraşdırma | frontend |
| #55 | 12.2 Web Push: VAPID, abunəlik və göndərmə servisi | backend, frontend |
| #56 | 12.3 Randevu xatırlatmaları (scheduler) | backend, booking |
| #57 | 12.4 Bildiriş ayarları | frontend |

### EPIC 13 - Şəxsi Qeydlər və Səsli Asistent (#58 · Gün 6)

| # | Sub-issue | Labels |
|---|---|---|
| #59 | 13.1 Şəxsi qeydlər (PersonalReminder) API | backend, database |
| #60 | 13.2 Yeni qeyd axını: təqvim, sonra saat seçimi | frontend |
| #61 | 13.3 Qeyd: yazılı və ya səsli (danışıq yalnız mətnə çevrilir) | frontend, design |
| #62 | 13.4 Səsli alarm: kişi/qadın səsi ilə xatırlatma | backend, frontend |
| #68 | 13.5 Gündəlik: qeydləri redaktə et və sil | frontend |

### EPIC 14 - Mobil Tətbiq: Capacitor, Alarm və Siri (#63 · Gün 7)

| # | Sub-issue | Labels |
|---|---|---|
| #64 | 14.1 Capacitor qurulumu: Android və iOS | frontend, devops |
| #65 | 14.2 Lokal bildirişlər və əsl alarm | frontend |
| #66 | 14.3 Siri və Google Assistant qısayolları | frontend |
| #67 | 14.4 Mağazalara yayımlama | devops |
