'use client'

import { useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarOff, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api/client'
import type { AvailabilityView, DaySchedule, TimeOff } from '@/lib/api/types'
import { dateNames, formatDateLong, todayInBaku } from '@/lib/dates'
import { PanelHeading } from './panel-shell'
import { Field } from './services-manager'
import { useApi } from './use-api'

type Interval = { start: string; end: string }
/** Index 0 is Monday, like ISO day 1. */
type Week = Interval[][]

export type WeekError = 'startBeforeEnd' | 'overlap'

const hhmm = (time: string) => time.slice(0, 5)

function toWeek(weekly: DaySchedule[]): Week {
  return Array.from({ length: 7 }, (_, i) =>
    (weekly.find((d) => d.day === i + 1)?.intervals ?? []).map((x) => ({
      start: hhmm(x.start),
      end: hhmm(x.end),
    })),
  )
}

/**
 * The same rules as AvailabilityService.replaceWeekly: every interval
 * starts before it ends and intervals of a day do not overlap. Returns the
 * first problem per day (index 0 = Monday) as a message key.
 */
export function validateWeek(week: Week): Record<number, WeekError> {
  const errors: Record<number, WeekError> = {}
  week.forEach((intervals, day) => {
    const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 0; i < sorted.length; i++) {
      const { start, end } = sorted[i]
      if (!start || !end || start >= end) {
        errors[day] = 'startBeforeEnd'
        return
      }
      if (i > 0 && start < sorted[i - 1].end) {
        errors[day] = 'overlap'
        return
      }
    }
  })
  return errors
}

/** Monday-first weekday names in the page language, capitalised. */
function useDayNames() {
  const locale = useLocale()
  const { weekdays } = dateNames(locale)
  return Array.from({ length: 7 }, (_, day) => {
    const name = weekdays[(day + 1) % 7]
    return name.charAt(0).toUpperCase() + name.slice(1)
  })
}

/** Weekly hours and days off (#40). */
export function ScheduleEditor() {
  const t = useTranslations('schedule')
  const { data, error, reload } = useApi<AvailabilityView>(
    '/provider/availability',
  )
  return (
    <>
      <PanelHeading title={t('title')} description={t('description')} />
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
          <WeeklyHours initial={toWeek(data.weekly)} onSaved={reload} />
          <DaysOff items={data.timeOff} onChanged={reload} />
        </div>
      )}
    </>
  )
}

function WeeklyHours({
  initial,
  onSaved,
}: {
  initial: Week
  onSaved: () => void
}) {
  const t = useTranslations('schedule')
  const dayNames = useDayNames()
  const [week, setWeek] = useState<Week>(initial)
  const [errors, setErrors] = useState<Record<number, WeekError>>({})
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()
  const [busy, setBusy] = useState(false)

  const update = (day: number, intervals: Interval[]) =>
    setWeek(week.map((d, i) => (i === day ? intervals : d)))

  async function save() {
    const found = validateWeek(week)
    setErrors(found)
    setMessage(undefined)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await api('/provider/availability', {
        method: 'PUT',
        body: JSON.stringify({
          rules: week.flatMap((intervals, i) =>
            intervals.map((x) => ({ day: i + 1, start: x.start, end: x.end })),
          ),
        }),
      })
      setMessage({ ok: true, text: t('saved') })
      onSaved()
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('weeklyHours')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col divide-y">
          {week.map((intervals, day) => (
            <li key={day} className="flex flex-col gap-2 py-3 sm:flex-row">
              <span className="w-36 shrink-0 pt-1.5 font-medium">
                {dayNames[day]}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                {intervals.length === 0 && (
                  <span className="pt-1.5 text-sm text-muted-foreground">
                    {t('dayOff')}
                  </span>
                )}
                {intervals.map((x, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      step={900}
                      aria-label={t('start', { day: dayNames[day] })}
                      value={x.start}
                      className="w-28"
                      onChange={(e) =>
                        update(
                          day,
                          intervals.map((y, j) =>
                            j === i ? { ...y, start: e.target.value } : y,
                          ),
                        )
                      }
                    />
                    <span aria-hidden>-</span>
                    <Input
                      type="time"
                      step={900}
                      aria-label={t('end', { day: dayNames[day] })}
                      value={x.end}
                      className="w-28"
                      onChange={(e) =>
                        update(
                          day,
                          intervals.map((y, j) =>
                            j === i ? { ...y, end: e.target.value } : y,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={t('removeInterval')}
                      onClick={() =>
                        update(
                          day,
                          intervals.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                ))}
                {errors[day] && (
                  <p className="text-xs text-destructive">{t(errors[day])}</p>
                )}
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    const last = intervals.at(-1)
                    update(day, [
                      ...intervals,
                      last
                        ? {
                            start: last.end,
                            end: last.end < '18:00' ? '18:00' : '',
                          }
                        : { start: '09:00', end: '18:00' },
                    ])
                  }}
                >
                  <Plus aria-hidden />
                  {intervals.length ? t('addInterval') : t('makeWorkDay')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {message && (
          <p
            role="status"
            className={
              message.ok ? 'text-sm text-success' : 'text-sm text-destructive'
            }
          >
            {message.text}
          </p>
        )}
        <Button size="lg" className="h-11" disabled={busy} onClick={save}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          {t('saveSchedule')}
        </Button>
      </CardContent>
    </Card>
  )
}

function DaysOff({
  items,
  onChanged,
}: {
  items: TimeOff[]
  onChanged: () => void
}) {
  const t = useTranslations('schedule')
  const locale = useLocale()
  const today = todayInBaku()
  const [startsOn, setStartsOn] = useState(today)
  const [endsOn, setEndsOn] = useState(today)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!startsOn || !endsOn || endsOn < startsOn) {
      setError(t('endBeforeStart'))
      return
    }
    setBusy(true)
    try {
      await api('/provider/time-off', {
        method: 'POST',
        body: JSON.stringify({
          startsOn,
          endsOn,
          reason: reason.trim() || null,
        }),
      })
      setReason('')
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    setError(null)
    try {
      await api(`/provider/time-off/${id}`, { method: 'DELETE' })
      onChanged()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>{t('daysOff')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarOff aria-hidden className="size-4" />
            {t('noDaysOff')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.startsOn === item.endsOn
                      ? formatDateLong(item.startsOn, locale)
                      : `${formatDateLong(item.startsOn, locale)} - ${formatDateLong(item.endsOn, locale)}`}
                  </p>
                  {item.reason && (
                    <p className="text-muted-foreground">{item.reason}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t('removeDayOff')}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="flex flex-col gap-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('startsOn')} id="t-start">
              <Input
                id="t-start"
                type="date"
                min={today}
                value={startsOn}
                onChange={(e) => {
                  setStartsOn(e.target.value)
                  if (endsOn < e.target.value) setEndsOn(e.target.value)
                }}
              />
            </Field>
            <Field label={t('endsOn')} id="t-end">
              <Input
                id="t-end"
                type="date"
                min={startsOn}
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('reason')} id="t-reason">
            <Input
              id="t-reason"
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
            {t('addDayOff')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
