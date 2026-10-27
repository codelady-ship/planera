'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  CalendarClock,
  LoaderCircle,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/features/account/status-badge'
import { syncNativeAlarms } from '@/features/mobile/native-alarms'
import type { Locale } from '@/i18n/routing'
import { api } from '@/lib/api/client'
import type {
  AgendaItem,
  AppointmentStatus,
  PersonalNote,
} from '@/lib/api/types'
import { addDays, dateNames, formatDateLong, todayInBaku } from '@/lib/dates'
import { NoteWizard } from './note-wizard'
import { noteAlarmText, speak } from './speech'

const RANGE_DAYS = 30
/** How long "Geri al" stays after deleting a note (#68). */
export const UNDO_MS = 5000

/** The diary (#59, #68): appointments and personal notes by day, with new, edit and delete. */
export function AgendaView({
  openNew = false,
  initialText,
}: {
  /** Start with the new-note wizard open, e.g. from a deep link (#66). */
  openNew?: boolean
  initialText?: string
} = {}) {
  const t = useTranslations('diary')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const [items, setItems] = useState<AgendaItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<PersonalNote | 'new' | null>(
    openNew ? 'new' : null,
  )
  const [deleting, setDeleting] = useState<AgendaItem | null>(null)
  const [undo, setUndo] = useState<AgendaItem | null>(null)
  const undoTimer = useRef<number | null>(null)

  const load = useCallback(() => {
    const from = todayInBaku()
    return api<AgendaItem[]>(
      `/me/agenda?from=${from}&to=${addDays(from, RANGE_DAYS)}`,
    )
      .then((list) => {
        setItems(list)
        setError(null)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('loadFailed'))
        setItems([])
      })
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useAlarms(items, locale, t('alarmTitle'))

  async function edit(item: AgendaItem) {
    try {
      setEditing(await api<PersonalNote>(`/me/reminders/${item.id}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('openFailed'))
    }
  }

  async function remove(item: AgendaItem) {
    setDeleting(null)
    try {
      await api(`/me/reminders/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deleteFailed'))
      return
    }
    setItems((list) => (list ?? []).filter((i) => i !== item))
    setUndo(item)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => {
      undoTimer.current = null
      setUndo((current) => (current === item ? null : current))
      void api(`/me/reminders/${item.id}`, { method: 'DELETE' }).catch(() => {})
    }, UNDO_MS)
  }

  async function restore() {
    const item = undo
    if (!item) return
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = null
    setUndo(null)
    try {
      await api(`/me/reminders/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('restoreFailed'))
    }
    void load()
  }

  const today = todayInBaku()
  const tomorrow = addDays(today, 1)
  const days = groupByDay(items ?? [])

  const dayHeading = (date: string) => {
    const long = formatDateLong(date, locale)
    if (date === today) return t('dayToday', { date: long })
    if (date === tomorrow) return t('dayTomorrow', { date: long })
    return long
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('intro', { days: RANGE_DAYS })}
        </p>
        <Button onClick={() => setEditing('new')}>
          <Plus aria-hidden />
          {t('newNote')}
        </Button>
      </div>

      {undo && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
        >
          <span>{t('deleted')}</span>
          <Button variant="outline" size="sm" onClick={restore}>
            <Undo2 aria-hidden />
            {t('undo')}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {items === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          <NotebookPen className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">{t('empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map(([date, list]) => (
            <section key={date} aria-labelledby={`day-${date}`}>
              <h2 id={`day-${date}`} className="mb-2 text-sm font-semibold">
                {dayHeading(date)}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-3 rounded-xl border bg-card p-4"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      {item.type === 'NOTE' ? (
                        <NotebookPen className="size-5" aria-hidden />
                      ) : (
                        <CalendarClock className="size-5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {item.time}
                        </span>
                        <span className="font-medium">{item.title}</span>
                        {item.type === 'NOTE' ? (
                          <Badge variant="secondary" className="h-6 px-2.5">
                            {item.status === 'DONE' ? t('done') : t('note')}
                          </Badge>
                        ) : (
                          <StatusBadge
                            status={item.status as AppointmentStatus}
                          />
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-sm text-muted-foreground">
                          {item.subtitle}
                        </p>
                      )}
                      {item.type === 'NOTE' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => edit(item)}
                          >
                            <Pencil aria-hidden />
                            {t('edit')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 aria-hidden />
                            {t('delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <NoteWizard
          initial={editing === 'new' ? undefined : editing}
          initialTitle={editing === 'new' ? initialText : undefined}
          onClose={() => setEditing(null)}
          onSaved={() => void load()}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                t('deleteText', {
                  title: deleting.title,
                  date: formatDateLong(deleting.date, locale),
                  time: deleting.time,
                  seconds: UNDO_MS / 1000,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('dismiss')}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleting && remove(deleting)}
            >
              {t('deleteConfirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function groupByDay(items: AgendaItem[]): [string, AgendaItem[]][] {
  const map = new Map<string, AgendaItem[]>()
  for (const item of items) {
    const list = map.get(item.date) ?? []
    list.push(item)
    map.set(item.date, list)
  }
  return [...map.entries()]
}

/** The in-page alarm (#62): at a note's time the sentence is read aloud and shown as a notification. */
function useAlarms(items: AgendaItem[] | null, locale: Locale, title: string) {
  useEffect(() => {
    if (!items) return
    // In the Android / iOS app the same items become exact local alarms (#65).
    void syncNativeAlarms(items, locale)
    const now = Date.now()
    const today = todayInBaku()
    const timers = items
      .filter((item) => item.type === 'NOTE' && item.status === 'ACTIVE')
      .map((item) => ({ item, delay: new Date(item.startsAt).getTime() - now }))
      .filter(({ delay }) => delay >= 0 && delay <= 12 * 60 * 60 * 1000)
      .map(({ item, delay }) =>
        window.setTimeout(() => {
          const text = noteAlarmText(
            item.date === today
              ? dateNames(locale).today
              : formatDateLong(item.date, locale),
            item.time,
            item.title,
            locale,
          )
          speak(text, undefined, locale)
          void showAlarmNotification(title, text)
        }, delay),
      )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [items, locale, title])
}

async function showAlarmNotification(title: string, text: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return
  const registration = await navigator.serviceWorker?.getRegistration('/')
  if (registration) {
    await registration.showNotification(title, {
      body: text,
      icon: '/icons/icon-192.png',
      tag: 'note-alarm',
    })
  }
}

export function LoadingAgenda() {
  return <LoaderCircle className="animate-spin" aria-hidden />
}
