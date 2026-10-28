'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { HeartOff } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProviderResultCard } from '@/features/search/provider-result-card'
import { Link } from '@/i18n/navigation'
import { api } from '@/lib/api/client'
import type { ProviderSummary } from '@/lib/api/types'
import { useFavorites } from './use-favorites'

/** The account tab (#46): favourite providers as catalog cards, each with a booking button. */
export function FavoritesList() {
  const t = useTranslations('favorites')
  const { isFavorite } = useFavorites()
  const [items, setItems] = useState<ProviderSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<ProviderSummary[]>('/me/favorites')
      .then((list) => active && setItems(list))
      .catch((e: unknown) => {
        if (!active) return
        setError(e instanceof Error ? e.message : t('loadFailed'))
        setItems([])
      })
    return () => {
      active = false
    }
  }, [t])

  if (items === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )
  }
  // A heart unticked on this tab drops the card right away.
  const shown = items.filter((p) => isFavorite(p.slug))
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
        <HeartOff className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">{t('empty')}</p>
        <Link href="/search" className={buttonVariants()}>
          {t('find')}
        </Link>
      </div>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {shown.map((provider) => (
        <li key={provider.slug}>
          <ProviderResultCard provider={provider} />
        </li>
      ))}
    </ul>
  )
}
