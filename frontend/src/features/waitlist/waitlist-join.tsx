'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BellPlus, CircleCheck, LoaderCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { useSession } from '@/features/auth/use-session'
import { Link } from '@/i18n/navigation'
import { api } from '@/lib/api/client'
import type { WaitlistEntry } from '@/lib/api/types'

/**
 * Shown under an empty slot list (#45): the customer asks to be told when
 * the day frees up. A visitor is sent to the login page first.
 */
export function WaitlistJoin({
  slug,
  serviceId,
  date,
  loginHref,
}: {
  slug: string
  serviceId: number
  date: string
  loginHref: string
}) {
  const t = useTranslations('waitlist')
  const { status, user } = useSession()
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      await api<WaitlistEntry>('/me/waitlist', {
        method: 'POST',
        body: JSON.stringify({ slug, serviceId, date }),
      })
      setJoined(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failed'))
    } finally {
      setBusy(false)
    }
  }

  if (joined) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border bg-card p-4 text-sm"
      >
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
        {t('joined')}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{t('offer')}</p>
      {status === 'ready' && !user ? (
        <Link
          href={loginHref}
          className={buttonVariants({ variant: 'outline' })}
        >
          <BellPlus aria-hidden />
          {t('loginToJoin')}
        </Link>
      ) : (
        <Button variant="outline" onClick={join} disabled={busy}>
          {busy ? (
            <LoaderCircle className="animate-spin" aria-hidden />
          ) : (
            <BellPlus aria-hidden />
          )}
          {t('join')}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
