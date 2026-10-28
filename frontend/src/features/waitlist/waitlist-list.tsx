'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { api } from '@/lib/api/client'
import type { WaitlistEntry } from '@/lib/api/types'
import { formatDateLong } from '@/lib/dates'

/** The days the customer waits for (#45), under the upcoming appointments; hidden when empty. */
export function WaitlistList() {
  const t = useTranslations('waitlist')
  const locale = useLocale()
  const [items, setItems] = useState<WaitlistEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<WaitlistEntry[]>('/me/waitlist')
      .then((list) => active && setItems(list))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function leave(entry: WaitlistEntry) {
    setError(null)
    try {
      await api(`/me/waitlist/${entry.id}`, { method: 'DELETE' })
      setItems((list) => list.filter((e) => e.id !== entry.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failed'))
    }
  }

  if (items.length === 0) return null
  return (
    <section
      aria-labelledby="waitlist-title"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <h2 id="waitlist-title" className="flex items-center gap-2 font-medium">
        <BellRing className="size-4" aria-hidden />
        {t('title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('listHint')}</p>
      <ul className="flex flex-col gap-2">
        {items.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0">
              <Link
                href={`/providers/${entry.providerSlug}`}
                className="font-medium hover:underline"
              >
                {entry.providerName}
              </Link>
              <span className="block text-muted-foreground">
                {entry.serviceName}, {formatDateLong(entry.date, locale)}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('leave')}
              onClick={() => leave(entry)}
            >
              <X aria-hidden />
              {t('leave')}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
