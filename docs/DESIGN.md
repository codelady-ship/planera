# Dizayn Sistemi

Sadə, müasir, mobil-first interfeys. Qradient yoxdur, bənövşəyi-mavi qarışığı
yoxdur, emoji yoxdur (ikonlar: `lucide-react`).

## Rəng palitrası

| Token | Dəyər | İstifadə |
|---|---|---|
| `--brand-white` | `#FFFFFF` | Kartlar, açıq fon |
| `--brand-ink` | `#111111` | Əsas mətn, primary düymə |
| `--brand-sand` | `#F7F6F3` | Səhifə fonu, hero |
| `--brand-coral` | `#FF6B35` | Vurğu / CTA ("Randevu götür"), üzərində mətn qara |
| `--brand-forest` | `#1F7A4D` | Uğur / təsdiqlənmiş status, üzərində mətn ağ |

Status rəngləri: gözləyir — ink, təsdiqlənib — forest, ləğv edilib — destructive.

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
