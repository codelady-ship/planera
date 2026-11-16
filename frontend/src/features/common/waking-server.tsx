'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { slowCount, subscribeSlow } from '@/lib/api/slow-requests'

/**
 * Bottom notice while a browser API call has taken longer than 3 s: the free
 * API host may be waking up from sleep (first request up to about a minute).
 */
export function WakingServerNotice() {
  const t = useTranslations('common')
  const count = useSyncExternalStore(subscribeSlow, slowCount, () => 0)
  if (count === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
    >
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      <span>{t('wakingServer')}</span>
    </div>
  )
}

/**
 * The same message for server-rendered sections: placed in a Suspense
 * fallback, it stays invisible and fades in only if loading passes 3 s.
 */
export function WakingServerHint() {
  const t = useTranslations('common')
  return (
    <p
      role="status"
      className="waking-hint col-span-full flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      <span>{t('wakingServer')}</span>
    </p>
  )
}
