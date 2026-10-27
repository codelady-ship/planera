'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
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
import type { Locale } from '@/i18n/routing'
import { api } from '@/lib/api/client'
import type { NotificationSettings as Settings } from '@/lib/api/types'

/** Reminder offsets a user may pick (#57); the API refuses any other value. */
export const REMINDER_OPTIONS = [1440, 60, 15, 0] as const

/** Push notifications for this browser (#55) and reminder times (#57). */
export function NotificationSettings() {
  const t = useTranslations('notifications')
  const locale = useLocale() as Locale
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
      setMessage(e instanceof Error ? e.message : t('error'))
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      if (native) {
        const permission = await requestNativePermission(locale)
        setStatus(permission === 'granted' ? 'on' : 'denied')
        return permission === 'granted' ? t('nativeOn') : t('nativeDenied')
      }
      const next = await enablePush()
      setStatus(next)
      return next === 'on' ? t('on') : next === 'denied' ? t('denied') : null
    })

  const disable = () =>
    run(async () => {
      setStatus(await disablePush())
      return t('off')
    })

  const sendTest = () =>
    run(async () => {
      if (native) {
        await sendNativeTest(locale)
        return t('testNative')
      }
      const delivered = await sendTestPush()
      return delivered > 0 ? t('testSent') : t('testFailed')
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
              {t('title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {status === 'on' && t('statusOn')}
              {status === 'off' && t('statusOff')}
              {status === 'denied' && t('statusDenied')}
              {status === 'unsupported' &&
                (homeScreen ? t('homeScreen') : t('unsupported'))}
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
                {t('enable')}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={sendTest} disabled={busy}>
                  <Send aria-hidden />
                  {t('sendTest')}
                </Button>
                {!native && (
                  <Button variant="ghost" onClick={disable} disabled={busy}>
                    <BellOff aria-hidden />
                    {t('disable')}
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
  const t = useTranslations('notifications')
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
        setMessage(e instanceof Error ? e.message : t('loadFailed'))
      })
    return () => {
      active = false
    }
  }, [t])

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
          ? t('remindersOff')
          : t('remindersSaved'),
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('saveFailed'))
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
            {t('remindersTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('remindersText')}</p>
        </div>
      </div>

      {offsets === null ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="flex flex-col gap-3">
          {REMINDER_OPTIONS.map((value) => (
            <Label key={value} className="gap-3 py-1 font-normal">
              <Checkbox
                checked={offsets.includes(value)}
                onCheckedChange={(checked) => toggle(value, checked)}
                disabled={busy}
              />
              {t(`offset${value}`)}
            </Label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy || !dirty}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {t('save')}
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
