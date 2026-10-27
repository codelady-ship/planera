'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { usePathname, useRouter } from '@/i18n/navigation'
import type { Category } from '@/lib/api/types'

export const CITIES = ['Bakı', 'Sumqayıt', 'Gəncə', 'Lənkəran', 'Şəki']

const SELECT =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/**
 * Search filters (#29). Every change rewrites the URL query, so a filtered
 * list can be shared, bookmarked and restored with the back button.
 */
export function SearchFilters({ categories }: { categories: Category[] }) {
  const t = useTranslations('search')
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    router.push(`${pathname}?${next}`, { scroll: false })
  }

  const fields = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-q">{t('query')}</Label>
        <Input
          id="f-q"
          key={params.get('q') ?? ''}
          defaultValue={params.get('q') ?? ''}
          placeholder={t('queryPlaceholder')}
          className="h-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter') update('q', e.currentTarget.value.trim())
          }}
          onBlur={(e) => {
            const value = e.currentTarget.value.trim()
            if (value !== (params.get('q') ?? '')) update('q', value)
          }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-category">{t('category')}</Label>
        <select
          id="f-category"
          className={SELECT}
          value={params.get('category') ?? ''}
          onChange={(e) => update('category', e.target.value)}
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-city">{t('city')}</Label>
        <select
          id="f-city"
          className={SELECT}
          value={params.get('city') ?? ''}
          onChange={(e) => update('city', e.target.value)}
        >
          <option value="">{t('allCities')}</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-price">{t('maxPrice')}</Label>
        <select
          id="f-price"
          className={SELECT}
          value={params.get('maxPrice') ?? ''}
          onChange={(e) => update('maxPrice', e.target.value)}
        >
          <option value="">{t('anyPrice')}</option>
          {[20, 30, 50, 100].map((p) => (
            <option key={p} value={p}>
              {t('upTo', { price: p })}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="f-sort">{t('sort')}</Label>
        <select
          id="f-sort"
          className={SELECT}
          value={params.get('sort') ?? 'rating'}
          onChange={(e) => update('sort', e.target.value)}
        >
          <option value="rating">{t('byRating')}</option>
          <option value="price">{t('byPrice')}</option>
        </select>
      </div>
      {params.size > 0 && (
        <Button variant="outline" onClick={() => router.push(pathname)}>
          {t('reset')}
        </Button>
      )}
    </div>
  )

  return (
    <>
      <aside className="hidden w-64 shrink-0 md:block">{fields}</aside>
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="outline" size="lg" className="h-10 md:hidden" />
          }
        >
          <SlidersHorizontal aria-hidden />
          {t('filters')}
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('filters')}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{fields}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
