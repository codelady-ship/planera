'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowLeft,
  CalendarCheck,
  CircleCheck,
  Clock,
  LoaderCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/use-session'
import { ApiError, api } from '@/lib/api/client'
import type { Appointment, ProviderDetail } from '@/lib/api/types'
import {
  addMonths,
  formatDateLong,
  formatDuration,
  formatPrice,
  todayInBaku,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { MonthCalendar, SlotGrid } from './month-calendar'
import { useAvailableDates, useSlots } from './use-slots'

const STEPS = ['Xidmət', 'Tarix', 'Saat', 'Təsdiq']

/** Bookings open 90 days ahead (SlotService.HORIZON_DAYS). */
const HORIZON_MONTHS = 3

/**
 * Four-step booking (#31): service, day, time, confirmation. The choices live
 * in the URL (?service=&date=&time=), so going back, reloading or a detour
 * through the login page never loses them.
 */
export function BookingWizard({ provider }: { provider: ProviderDetail }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { status, user } = useSession()

  const service =
    provider.services.find((s) => String(s.id) === params.get('service')) ??
    null
  const date = service ? params.get('date') : null
  const time = date ? params.get('time') : null
  const step = !service ? 0 : !date ? 1 : !time ? 2 : 3

  const today = todayInBaku()
  const [month, setMonth] = useState((date ?? today).slice(0, 7))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [booked, setBooked] = useState<Appointment | null>(null)

  const slug = provider.summary.slug
  const activeDates = useAvailableDates(slug, service?.id ?? null, month)
  const slots = useSlots(slug, service?.id ?? null, date, slotsVersion)

  function go(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    setError(null)
    setAlternatives([])
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  function back() {
    if (step === 3) go({ time: null })
    else if (step === 2) go({ date: null, time: null })
    else if (step === 1) go({ service: null, date: null, time: null })
  }

  async function confirm() {
    if (!service || !date || !time) return
    setBusy(true)
    setError(null)
    try {
      const appointment = await api<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: service.id,
          date,
          time,
          note: note.trim() || null,
        }),
      })
      setBooked(appointment)
    } catch (e) {
      if (e instanceof ApiError && e.problem.status === 401) {
        router.push(loginHref)
        return
      }
      if (e instanceof ApiError && e.problem.status === 409) {
        setAlternatives(e.problem.alternatives ?? [])
        setSlotsVersion((v) => v + 1)
      }
      setError(
        e instanceof Error ? e.message : 'Xəta baş verdi, yenidən cəhd edin.',
      )
    } finally {
      setBusy(false)
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(`${pathname}?${params}`)}`

  if (booked) return <Confirmation appointment={booked} />

  return (
    <div className="flex flex-col gap-6">
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

      {step > 0 && (
        <Button variant="ghost" className="self-start" onClick={back}>
          <ArrowLeft aria-hidden />
          Geri
        </Button>
      )}

      {step === 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Xidməti seçin</h2>
          <ul className="flex flex-col gap-2">
            {provider.services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go({ service: String(s.id) })}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left hover:border-cta"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{s.name}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-3.5" aria-hidden />
                      {formatDuration(s.durationMinutes)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPrice(s.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Tarixi seçin</h2>
          <MonthCalendar
            month={month}
            active={activeDates}
            selected={date}
            minMonth={today.slice(0, 7)}
            maxMonth={addMonths(today.slice(0, 7), HORIZON_MONTHS)}
            onSelect={(d) => go({ date: d, time: null })}
            onMonthChange={setMonth}
          />
        </section>
      )}

      {step === 2 && date && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Saatı seçin
            <span className="block text-sm font-normal text-muted-foreground">
              {formatDateLong(date)}
            </span>
          </h2>
          <SlotGrid
            slots={slots}
            selected={time}
            onSelect={(t) => go({ time: t })}
          />
        </section>
      )}

      {step === 3 && service && date && time && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Təsdiq</h2>
          <Card>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Mütəxəssis</dt>
                <dd>{provider.summary.name}</dd>
                <dt className="text-muted-foreground">Xidmət</dt>
                <dd>{service.name}</dd>
                <dt className="text-muted-foreground">Tarix</dt>
                <dd>{formatDateLong(date)}</dd>
                <dt className="text-muted-foreground">Saat</dt>
                <dd>{time}</dd>
                <dt className="text-muted-foreground">Müddət</dt>
                <dd>{formatDuration(service.durationMinutes)}</dd>
                <dt className="text-muted-foreground">Qiymət</dt>
                <dd className="font-medium">{formatPrice(service.price)}</dd>
              </dl>
              <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Ləğv qaydası: randevuya {provider.cancellationHours} saatdan çox
                qalana qədər pulsuz ləğv edə və ya vaxtını dəyişə bilərsiniz.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Qeyd (istəyə bağlı)</Label>
            <textarea
              id="note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-lg border border-input bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {error && (
            <div role="alert" className="flex flex-col gap-3">
              <p className="text-sm text-destructive">{error}</p>
              {alternatives.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">Bu gün üçün boş saatlar:</p>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        onClick={() => go({ time: t })}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'ready' && !user ? (
            <Link
              href={loginHref}
              className={buttonVariants({ size: 'lg', className: 'h-11' })}
            >
              Daxil olub təsdiqləyin
            </Link>
          ) : (
            <Button
              size="lg"
              className="h-11 bg-cta text-cta-foreground hover:bg-cta/90"
              disabled={busy || status === 'loading'}
              onClick={confirm}
            >
              {busy && <LoaderCircle className="animate-spin" aria-hidden />}
              Randevunu təsdiqlə
            </Button>
          )}
        </section>
      )}
    </div>
  )
}

function Confirmation({ appointment }: { appointment: Appointment }) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CircleCheck className="mx-auto size-12 text-success" aria-hidden />
        <CardTitle className="text-xl">Randevunuz qəbul olundu</CardTitle>
        <p className="text-sm text-muted-foreground">
          Randevu nömrəsi:{' '}
          <span className="font-mono font-medium text-foreground">
            {appointment.code}
          </span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Xidmət</dt>
          <dd>{appointment.serviceName}</dd>
          <dt className="text-muted-foreground">Tarix</dt>
          <dd>{formatDateLong(appointment.date)}</dd>
          <dt className="text-muted-foreground">Saat</dt>
          <dd>{appointment.time}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <Badge className="bg-success text-success-foreground">
              Təsdiqlənib
            </Badge>
          </dd>
        </dl>
        <Link href="/account" className={buttonVariants({ size: 'lg' })}>
          <CalendarCheck aria-hidden />
          Randevularım
        </Link>
      </CardContent>
    </Card>
  )
}
