'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  LoaderCircle,
  Mic,
  MicOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MonthCalendar } from '@/features/booking/month-calendar'
import { ApiError, api } from '@/lib/api/client'
import type { NoteSource, PersonalNote } from '@/lib/api/types'
import {
  addDays,
  addMonths,
  formatDateLong,
  monthGrid,
  todayInBaku,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { TimePicker } from './time-picker'
import { useSpeechInput } from './use-speech-input'

const STEPS = ['stepDate', 'stepTime', 'stepNote', 'stepReminder'] as const

/** Notes can be planned three months ahead, like bookings. */
const HORIZON_MONTHS = 3
const HORIZON_DAYS = 92

/** Reminder offsets for a note (#60), in the order they are shown. */
export const NOTE_REMINDER_OPTIONS = [0, 15, 60, 1440] as const

/**
 * New or edited note (#60, #61, #68): date on the calendar, then the time,
 * then the text (typed or dictated), then the reminders. Going back keeps
 * every choice; the chosen date and time stay visible at the top.
 */
export function NoteWizard({
  initial,
  initialTitle,
  onClose,
  onSaved,
}: {
  initial?: PersonalNote
  /** Text dictated to Siri or the Assistant (#66); the date and time are still chosen here. */
  initialTitle?: string
  onClose: () => void
  onSaved: (note: PersonalNote) => void
}) {
  const t = useTranslations('diary')
  const locale = useLocale()
  const today = todayInBaku()
  const [step, setStep] = useState(0)
  const [date, setDate] = useState<string | null>(initial?.date ?? null)
  const [time, setTime] = useState<string | null>(initial?.time ?? null)
  const [title, setTitle] = useState(initial?.title ?? initialTitle ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [offsets, setOffsets] = useState<number[]>(
    initial?.reminderOffsets ?? [0],
  )
  const [source, setSource] = useState<NoteSource>(initial?.source ?? 'MANUAL')
  const [month, setMonth] = useState((initial?.date ?? today).slice(0, 7))
  const [interim, setInterim] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const speech = useSpeechInput((text, final) => {
    if (final) {
      setNote((current) => (current ? `${current} ${text}` : text))
      setInterim('')
      setSource('VOICE')
    } else {
      setInterim(text)
    }
  })

  // Every day from today to the horizon can be picked; past days are off.
  const lastDay = addDays(today, HORIZON_DAYS)
  const activeDates = monthGrid(month).filter(
    (d): d is string => d !== null && d >= today && d <= lastDay,
  )

  const canContinue =
    step === 0
      ? date !== null
      : step === 1
        ? time !== null
        : title.trim() !== ''

  async function save() {
    if (!date || !time || !title.trim()) return
    setBusy(true)
    setError(null)
    const body = {
      title: title.trim(),
      note: note.trim() || null,
      date,
      time,
      reminderOffsets: offsets,
      source,
    }
    try {
      const saved = initial
        ? await api<PersonalNote>(`/me/reminders/${initial.id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await api<PersonalNote>('/me/reminders', {
            method: 'POST',
            body: JSON.stringify(body),
          })
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (Object.values(e.problem.errors ?? {})[0] ?? e.message)
          : e instanceof Error
            ? e.message
            : t('saveFailed'),
      )
    } finally {
      setBusy(false)
    }
  }

  function toggleOffset(value: number, checked: boolean) {
    setOffsets((current) => {
      const rest = current.filter((v) => v !== value)
      return checked ? [...rest, value].sort((a, b) => b - a) : rest
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t('editTitle') : t('newNote')}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden />
              {date ? formatDateLong(date, locale) : t('noDate')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-4" aria-hidden />
              {time ?? t('noTime')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ol className="grid grid-cols-4 gap-2" aria-label={t('steps')}>
          {STEPS.map((key, i) => (
            <li
              key={key}
              aria-current={i === step ? 'step' : undefined}
              className={cn(
                'flex flex-col gap-1.5 text-xs font-medium',
                i <= step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 rounded-full',
                  i < step ? 'bg-success' : i === step ? 'bg-cta' : 'bg-muted',
                )}
              />
              {i + 1}. {t(key)}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <MonthCalendar
            month={month}
            active={activeDates}
            selected={date}
            minMonth={today.slice(0, 7)}
            maxMonth={addMonths(today.slice(0, 7), HORIZON_MONTHS)}
            onSelect={(d) => {
              setDate(d)
              setStep(1)
            }}
            onMonthChange={setMonth}
          />
        )}

        {step === 1 && <TimePicker value={time} onChange={setTime} />}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="note-title">{t('titleLabel')}</Label>
              <Input
                id="note-title"
                value={title}
                maxLength={200}
                placeholder={t('titlePlaceholder')}
                className="h-11"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="note-text">{t('details')}</Label>
                {speech.supported && (
                  <Button
                    type="button"
                    variant={speech.listening ? 'default' : 'outline'}
                    size="sm"
                    aria-pressed={speech.listening}
                    onClick={speech.listening ? speech.stop : speech.start}
                  >
                    {speech.listening ? (
                      <MicOff aria-hidden />
                    ) : (
                      <Mic aria-hidden />
                    )}
                    {speech.listening ? t('stop') : t('dictate')}
                  </Button>
                )}
              </div>
              <Textarea
                id="note-text"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('notePlaceholder')}
              />
              {speech.listening && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {interim ? t('hearing', { text: interim }) : t('listening')}
                </p>
              )}
              {speech.error && (
                <p role="alert" className="text-sm text-destructive">
                  {speech.error}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {t('reminderQuestion')}
            </p>
            {NOTE_REMINDER_OPTIONS.map((value) => (
              <Label key={value} className="gap-3 py-1 font-normal">
                <Checkbox
                  checked={offsets.includes(value)}
                  onCheckedChange={(checked) => toggleOffset(value, checked)}
                />
                {t(`offset${value}`)}
              </Label>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft aria-hidden />
            {t('back')}
          </Button>
          {step < 3 ? (
            <Button
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              {t('continue')}
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              disabled={busy || !date || !time || !title.trim()}
              onClick={save}
            >
              {busy && <LoaderCircle className="animate-spin" aria-hidden />}
              {t('save')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
