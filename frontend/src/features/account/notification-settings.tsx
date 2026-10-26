'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, LoaderCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  disablePush,
  enablePush,
  getPushStatus,
  needsHomeScreen,
  sendTestPush,
  type PushStatus,
} from '@/features/pwa/push'

/** Push notifications for this browser (#55): turn on, test, turn off. */
export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading')
  const [homeScreen, setHomeScreen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getPushStatus().then((s) => {
      if (!active) return
      setStatus(s)
      setHomeScreen(needsHomeScreen())
    })
    return () => {
      active = false
    }
  }, [])

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setMessage(null)
    try {
      setMessage(await action())
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Xəta baş verdi')
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      const next = await enablePush()
      setStatus(next)
      return next === 'on'
        ? 'Bildirişlər bu cihazda açıldı.'
        : next === 'denied'
          ? 'İcazə verilmədi. Brauzer ayarlarından bildirişlərə icazə verin.'
          : null
    })

  const disable = () =>
    run(async () => {
      setStatus(await disablePush())
      return 'Bildirişlər bu cihazda bağlandı.'
    })

  const sendTest = () =>
    run(async () => {
      const delivered = await sendTestPush()
      return delivered > 0
        ? 'Test bildirişi göndərildi.'
        : 'Bildiriş çatmadı. Bildirişləri bağlayıb yenidən açın.'
    })

  if (status === 'loading') return <Skeleton className="h-40 rounded-xl" />

  return (
    <section
      aria-labelledby="notifications-title"
      className="flex max-w-md flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {status === 'on' ? (
            <BellRing className="size-5" aria-hidden />
          ) : status === 'denied' || status === 'unsupported' ? (
            <BellOff className="size-5" aria-hidden />
          ) : (
            <Bell className="size-5" aria-hidden />
          )}
        </div>
        <div className="space-y-1">
          <h2 id="notifications-title" className="font-medium">
            Randevu xatırlatmaları
          </h2>
          <p className="text-sm text-muted-foreground">
            {status === 'on' &&
              'Bu cihazda bildirişlər açıqdır. Randevudan əvvəl xatırlatma gələcək.'}
            {status === 'off' &&
              'Randevudan əvvəl bu cihaza bildiriş gəlsin. İcazə yalnız düyməyə basanda istənir.'}
            {status === 'denied' &&
              'Bu brauzerdə bildirişlərə icazə bağlanıb. Sayt ayarlarından icazə verin, sonra yenidən açın.'}
            {status === 'unsupported' &&
              (homeScreen
                ? 'iPhone-da bildirişlər üçün əvvəlcə saytı ana ekrana əlavə edin: Paylaş, sonra "Ana ekrana əlavə et".'
                : 'Bu brauzer bildirişləri dəstəkləmir.')}
          </p>
        </div>
      </div>

      {(status === 'off' || status === 'on') && (
        <div className="flex flex-wrap gap-2">
          {status === 'off' ? (
            <Button onClick={enable} disabled={busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Bell aria-hidden />
              )}
              Bildirişləri aç
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={sendTest} disabled={busy}>
                <Send aria-hidden />
                Test bildirişi göndər
              </Button>
              <Button variant="ghost" onClick={disable} disabled={busy}>
                <BellOff aria-hidden />
                Bağla
              </Button>
            </>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  )
}
