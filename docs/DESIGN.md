# Dizayn Sistemi

Sadə, müasir, mobil-first interfeys. UI-da qradient yoxdur, bənövşəyi-mavi
qarışığı yoxdur, emoji yoxdur (ikonlar: `lucide-react`).

## Brend

- Ad: **Planera**. Şüar: **Vaxtını seç, rahatlığını yaşa.**
- Fayllar: `docs/brand/` (mənbə və kəsilmiş variantlar), `frontend/public/brand/`.
  - `planera-logo.png` — wordmark + şüar (footer, sənədlər)
  - `planera-wordmark.png` — yalnız wordmark (header)
  - `planera-mark.png` — saatlı R (favicon, tətbiq ikonu, PWA)
- Loqodakı göy-firuzəyi qradient yalnız loqonun özündə qalır. UI elementləri
  aşağıdakı düz rənglərdən istifadə edir.

## Rəng palitrası (loqodan)

| Token | Dəyər | İstifadə |
|---|---|---|
| `--brand-navy` | `#072968` | Primary düymə, başlıqlar, tünd bölmələr; üzərində mətn ağ |
| `--brand-blue` | `#1D5FE0` | CTA ("Randevu götür", "Axtar"); üzərində mətn ağ |
| `--brand-teal` | `#00C3BD` | Dekorativ vurğu, ikon fonları; üzərində mətn navy |
| `--brand-teal-dark` | `#00807C` | Uğur / təsdiqlənmiş status; üzərində mətn ağ |
| `--brand-ink` | `#0F1B33` | Əsas mətn |
| `--brand-mist` | `#F4F7FB` | Səhifə fonu |
| `--brand-white` | `#FFFFFF` | Kartlar |

Status rəngləri: gözləyir — navy, təsdiqlənib — teal-dark, ləğv edilib — destructive.

## Tipoqrafiya

- Şrift: `Geist` (Next.js ilə gəlir), ehtiyat `system-ui, sans-serif`.
- Başlıqlar: 600 qalınlıq, sıx sətir aralığı. Mətn: 16px, 1.5 sətir aralığı.

## Komponentlər

- shadcn/ui: `button`, `card`, `input`, `badge`, `calendar`, `dialog`, `sheet`.
- Radius: `0.75rem` (kartlar), düymələr `rounded-full` deyil, `rounded-lg`.
- Boş saat düymələri: kontur düymə, seçiləndə ink fon + ağ mətn.

## Səhifələr

1. Ana səhifə — axtarış (xidmət, şəhər, tarix), kateqoriyalar, populyar xidmət göstərənlər, "Necə işləyir?"
2. Axtarış — filtrlər (kateqoriya, şəhər, qiymət, reytinq, tarix, boş saat)
3. Xidmət göstərənin profili — xidmətlər, qiymət/müddət, qrafik, rəylər
4. Randevu götürmə — 4 addım: xidmət, tarix, saat, təsdiq
5. Şəxsi kabinet — qarşıdakı / keçmiş / ləğv edilmiş randevular
6. Admin paneli — təqvim, randevular, xidmətlər, qrafik, statistika
