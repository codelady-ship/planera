'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  BellOff,
  BellRing,
  Clock,
  LoaderCircle,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  disablePush,
  enablePush,
  getPushStatus,
  needsHomeScreen,
  sendTestPush,
  type PushStatus,
} from '@/features/pwa/push'
import { VoiceSettings } from '@/features/diary/voice-settings'
import {
  checkNativePermission,
  isNativeApp,
  requestNativePermission,
  sendNativeTest,
} from '@/features/mobile/native-alarms'
import { api } from '@/lib/api/client'
import type { NotificationSettings as Settings } from '@/lib/api/types'

/** Reminder offsets a user may pick (#57); the API refuses any other value. */
export const REMINDER_OPTIONS = [
  { value: 1440, label: '1 gün əvvəl' },
  { value: 60, label: '1 saat əvvəl' },
  { value: 15, label: '15 dəqiqə əvvəl' },
  { value: 0, label: 'Randevu saatında' },
] as const

/** Push notifications for this browser (#55) and reminder times (#57). */
export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading')
  const [homeScreen, setHomeScreen] = useState(false)
  const [native, setNative] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // The Android / iOS app uses local alarms instead of Web Push (#65).
    const load = isNativeApp()
      ? checkNativePermission().then((p) => {
          if (active) setNative(true)
          return (
            p === 'granted' ? 'on' : p === 'denied' ? 'denied' : 'off'
          ) as PushStatus
        })
      : getPushStatus()
    load.then((s) => {
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
      if (native) {
        const permission = await requestNativePermission()
        setStatus(permission === 'granted' ? 'on' : 'denied')
        return permission === 'granted'
          ? 'Alarm bildirişləri bu cihazda açıldı.'
          : 'İcazə verilmədi. Telefonun ayarlarından Randevum üçün bildirişlərə icazə verin.'
      }
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
      if (native) {
        await sendNativeTest()
        return 'Test alarmı 3 saniyəyə gələcək.'
      }
      const delivered = await sendTestPush()
      return delivered > 0
        ? 'Test bildirişi göndərildi.'
        : 'Bildiriş çatmadı. Bildirişləri bağlayıb yenidən açın.'
    })

  if (status === 'loading') return <Skeleton className="h-40 rounded-xl" />

  return (
    <div className="flex max-w-md flex-col gap-4">
      <section
        aria-labelledby="notifications-title"
        className="flex flex-col gap-4 rounded-xl border bg-card p-5"
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
              Bu cihazda bildirişlər
            </h2>
            <p className="text-sm text-muted-foreground">
              {status === 'on' &&
                'Açıqdır. Randevudan əvvəl xatırlatma bu cihaza gələcək.'}
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
                {!native && (
                  <Button variant="ghost" onClick={disable} disabled={busy}>
                    <BellOff aria-hidden />
                    Bağla
                  </Button>
                )}
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

      <ReminderTimes />
      <VoiceSettings />
    </div>
  )
}

/** Which reminders to send; stored on the account, so every device agrees. */
function ReminderTimes() {
  const [offsets, setOffsets] = useState<number[] | null>(null)
  const [saved, setSaved] = useState<number[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    api<Settings>('/me/notification-settings')
      .then((s) => {
        if (!active) return
        setOffsets(s.reminderOffsets ?? [])
        setSaved(s.reminderOffsets ?? [])
      })
      .catch((e: unknown) => {
        if (!active) return
        setMessage(e instanceof Error ? e.message : 'Ayarları yükləmək olmadı')
      })
    return () => {
      active = false
    }
  }, [])

  function toggle(value: number, checked: boolean) {
    setOffsets((current) => {
      const rest = (current ?? []).filter((v) => v !== value)
      return checked ? [...rest, value].sort((a, b) => b - a) : rest
    })
    setMessage(null)
  }

  async function save() {
    if (!offsets) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await api<Settings>('/me/notification-settings', {
        method: 'PUT',
        body: JSON.stringify({ reminderOffsets: offsets }),
      })
      setOffsets(result.reminderOffsets)
      setSaved(result.reminderOffsets)
      setMessage(
        result.reminderOffsets.length === 0
          ? 'Xatırlatmalar söndürüldü.'
          : 'Xatırlatma vaxtları yadda saxlanıldı.',
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Yadda saxlamaq olmadı')
    } finally {
      setBusy(false)
    }
  }

  const dirty =
    offsets !== null &&
    saved !== null &&
    (offsets.length !== saved.length || offsets.some((v, i) => v !== saved[i]))

  return (
    <section
      aria-labelledby="reminder-times-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Clock className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <h2 id="reminder-times-title" className="font-medium">
            Xatırlatma vaxtları
          </h2>
          <p className="text-sm text-muted-foreground">
            Hər randevu üçün seçilmiş vaxtlarda bildiriş gəlir. Heç biri
            seçilməyəndə xatırlatma göndərilmir.
          </p>
        </div>
      </div>

      {offsets === null ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="flex flex-col gap-3">
          {REMINDER_OPTIONS.map((option) => (
            <Label key={option.value} className="gap-3 py-1 font-normal">
              <Checkbox
                checked={offsets.includes(option.value)}
                onCheckedChange={(checked) => toggle(option.value, checked)}
                disabled={busy}
              />
              {option.label}
            </Label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy || !dirty}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          Yadda saxla
        </Button>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </section>
  )
}
