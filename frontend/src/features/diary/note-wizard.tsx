'use client'

import { useState } from 'react'
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
import { useSpeechInput } from './use-speech-input'

const STEPS = ['Tarix', 'Saat', 'Qeyd', 'Xatırlatma']

/** Notes can be planned three months ahead, like bookings. */
const HORIZON_MONTHS = 3
const HORIZON_DAYS = 92

export const NOTE_REMINDER_OPTIONS = [
  { value: 0, label: 'Qeyd saatında' },
  { value: 15, label: '15 dəqiqə əvvəl' },
  { value: 60, label: '1 saat əvvəl' },
  { value: 1440, label: '1 gün əvvəl' },
] as const

/**
 * New or edited note (#60, #61, #68): date on the calendar, then the time,
 * then the text (typed or dictated), then the reminders. Going back keeps
 * every choice; the chosen date and time stay visible at the top.
 */
export function NoteWizard({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PersonalNote
  onClose: () => void
  onSaved: (note: PersonalNote) => void
}) {
  const today = todayInBaku()
  const [step, setStep] = useState(0)
  const [date, setDate] = useState<string | null>(initial?.date ?? null)
  const [time, setTime] = useState<string | null>(initial?.time ?? null)
  const [title, setTitle] = useState(initial?.title ?? '')
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
            : 'Yadda saxlamaq olmadı',
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
          <DialogTitle>
            {initial ? 'Qeydi redaktə et' : 'Yeni qeyd'}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-4" aria-hidden />
              {date ? formatDateLong(date) : 'Tarix seçilməyib'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-4" aria-hidden />
              {time ?? 'Saat seçilməyib'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <ol className="grid grid-cols-4 gap-2" aria-label="Addımlar">
          {STEPS.map((label, i) => (
            <li
              key={label}
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
              {i + 1}. {label}
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

        {step === 1 && <TimePickerStep value={time} onChange={setTime} />}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="note-title">Qeyd</Label>
              <Input
                id="note-title"
                value={title}
                maxLength={200}
                placeholder="Məsələn: həkimə getmək"
                className="h-11"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="note-text">Ətraflı (istəyə bağlı)</Label>
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
                    {speech.listening ? 'Dayandır' : 'Səslə de'}
                  </Button>
                )}
              </div>
              <Textarea
                id="note-text"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Yazın və ya mikrofona deyin; danışıq yalnız mətnə çevrilir"
              />
              {speech.listening && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {interim ? `Eşidilir: ${interim}` : 'Dinlənilir...'}
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
              Bildiriş nə vaxt gəlsin? Heç biri seçilməyəndə yalnız gündəlikdə
              qalır.
            </p>
            {NOTE_REMINDER_OPTIONS.map((option) => (
              <Label key={option.value} className="gap-3 py-1 font-normal">
                <Checkbox
                  checked={offsets.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggleOffset(option.value, checked)
                  }
                />
                {option.label}
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
            Geri
          </Button>
          {step < 3 ? (
            <Button
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Davam et
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              disabled={busy || !date || !time || !title.trim()}
              onClick={save}
            >
              {busy && <LoaderCircle className="animate-spin" aria-hidden />}
              Yadda saxla
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TimePickerStep({
  value,
  onChange,
}: {
  value: string | null
  onChange: (time: string) => void
}) {
  // Lazy import keeps this file readable; the picker is its own component.
  return <TimePicker value={value} onChange={onChange} />
}

import { TimePicker } from './time-picker'
