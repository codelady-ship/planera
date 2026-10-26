'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalendarClock, Clock, LoaderCircle, Star, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MonthCalendar, SlotGrid } from '@/features/booking/month-calendar'
import { useAvailableDates, useSlots } from '@/features/booking/use-slots'
import { ApiError, api } from '@/lib/api/client'
import type { Appointment } from '@/lib/api/types'
import {
  addMonths,
  formatDateLong,
  formatDuration,
  formatPrice,
  todayInBaku,
} from '@/lib/dates'
import { ReviewDialog } from './review-dialog'
import { StatusBadge } from './status-badge'

/** One appointment in the account list, with cancel and reschedule (#32). */
export function AppointmentCard({
  appointment,
  onChange,
}: {
  appointment: Appointment
  onChange: () => void
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/providers/${appointment.providerSlug}`}
              className="font-medium hover:underline"
            >
              {appointment.providerName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {appointment.serviceName}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            {formatDateLong(appointment.date)}, {appointment.time}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" aria-hidden />
            {formatDuration(appointment.durationMinutes)}
          </span>
          <span className="font-medium">{formatPrice(appointment.price)}</span>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {appointment.code}
        </p>
        {appointment.cancellable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMoveOpen(true)}>
              <CalendarClock aria-hidden />
              Vaxtını dəyiş
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <X aria-hidden />
              Ləğv et
            </Button>
          </div>
        )}
        {appointment.reviewable && (
          <div>
            <Button variant="outline" onClick={() => setReviewOpen(true)}>
              <Star aria-hidden />
              Rəy yaz
            </Button>
          </div>
        )}
      </CardContent>

      {reviewOpen && (
        <ReviewDialog
          appointment={appointment}
          onClose={() => setReviewOpen(false)}
          onDone={onChange}
        />
      )}

      <CancelDialog
        appointment={appointment}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onDone={onChange}
      />
      {moveOpen && (
        <RescheduleDialog
          appointment={appointment}
          onClose={() => setMoveOpen(false)}
          onDone={onChange}
        />
      )}
    </Card>
  )
}

function CancelDialog({
  appointment,
  open,
  onOpenChange,
  onDone,
}: {
  appointment: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      await api(`/appointments/${appointment.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: null }),
      })
      onOpenChange(false)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ləğv etmək olmadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Randevunu ləğv edirsiniz?</AlertDialogTitle>
          <AlertDialogDescription>
            {appointment.providerName}, {formatDateLong(appointment.date)}{' '}
            {appointment.time}. Bu əməliyyatı geri qaytarmaq olmur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>İmtina</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={cancel}>
            {busy && <LoaderCircle className="animate-spin" aria-hidden />}
            Bəli, ləğv et
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function RescheduleDialog({
  appointment,
  onClose,
  onDone,
}: {
  appointment: Appointment
  onClose: () => void
  onDone: () => void
}) {
  const today = todayInBaku()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const slug = appointment.providerSlug
  const dates = useAvailableDates(slug, appointment.serviceId, month)
  const slots = useSlots(slug, appointment.serviceId, date, version)

  async function save() {
    if (!date || !time) return
    setBusy(true)
    setError(null)
    try {
      await api(`/appointments/${appointment.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ date, time }),
      })
      onClose()
      onDone()
    } catch (e) {
      if (e instanceof ApiError && e.problem.status === 409) {
        setTime(null)
        setVersion((v) => v + 1)
      }
      setError(e instanceof Error ? e.message : 'Vaxtı dəyişmək olmadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni vaxt seçin</DialogTitle>
        </DialogHeader>
        <MonthCalendar
          month={month}
          active={dates}
          selected={date}
          minMonth={today.slice(0, 7)}
          maxMonth={addMonths(today.slice(0, 7), 3)}
          onSelect={(d) => {
            setDate(d)
            setTime(null)
          }}
          onMonthChange={setMonth}
        />
        {date && <SlotGrid slots={slots} selected={time} onSelect={setTime} />}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          size="lg"
          className="h-11"
          disabled={!date || !time || busy}
          onClick={save}
        >
          {busy && <LoaderCircle className="animate-spin" aria-hidden />}
          Yadda saxla
        </Button>
      </DialogContent>
    </Dialog>
  )
}
