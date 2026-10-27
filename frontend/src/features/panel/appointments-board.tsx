'use client'

import { useState } from 'react'
import {
  Ban,
  CalendarX,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Phone,
  UserX,
  type LucideIcon,
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/features/account/status-badge'
import { useSession } from '@/features/auth/use-session'
import { api } from '@/lib/api/client'
import type {
  AppointmentStatus,
  PanelAppointment,
  UserRole,
} from '@/lib/api/types'
import {
  WEEKDAYS_SHORT,
  addDays,
  formatDateLong,
  formatDateShort,
  formatPrice,
  todayInBaku,
  weekStart,
} from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PanelHeading } from './panel-shell'
import { panelPaths } from './paths'
import { useApi } from './use-api'

type View = 'day' | 'week'

const ACTIONS: Partial<
  Record<
    AppointmentStatus,
    { status: AppointmentStatus; label: string; icon: LucideIcon }[]
  >
> = {
  PENDING: [
    { status: 'CONFIRMED', label: 'Təsdiq et', icon: Check },
    { status: 'CANCELLED', label: 'Ləğv et', icon: Ban },
  ],
  CONFIRMED: [
    { status: 'COMPLETED', label: 'Tamamlandı', icon: CheckCheck },
    { status: 'NO_SHOW', label: 'Gəlmədi', icon: UserX },
    { status: 'CANCELLED', label: 'Ləğv et', icon: Ban },
  ],
}

/** Day and week calendar with status changes (#39). */
export function AppointmentsBoard() {
  const { user } = useSession()
  return user ? <Board role={user.role} /> : null
}

function Board({ role }: { role: UserRole }) {
  const paths = panelPaths(role)
  const today = todayInBaku()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(today)
  const [selected, setSelected] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<PanelAppointment | null>(null)
  const [error, setError] = useState<string | null>(null)

  const from = view === 'day' ? date : weekStart(date)
  const to = view === 'day' ? date : addDays(from, 6)
  const {
    data,
    error: loadError,
    mutate,
  } = useApi<PanelAppointment[]>(paths.appointments(from, to))

  // The new status shows at once; a refused change puts the old one back.
  async function change(item: PanelAppointment, status: AppointmentStatus) {
    const id = item.appointment.id
    const previous = item.appointment.status
    const setStatus = (s: AppointmentStatus) =>
      mutate((list) =>
        list.map((x) =>
          x.appointment.id === id
            ? { ...x, appointment: { ...x.appointment, status: s } }
            : x,
        ),
      )
    setError(null)
    setStatus(status)
    try {
      await api(paths.status(id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    } catch (e) {
      setStatus(previous)
      setError((e as Error).message)
    }
  }

  function act(item: PanelAppointment, status: AppointmentStatus) {
    if (status === 'CANCELLED') setCancelling(item)
    else void change(item, status)
  }

  const step = view === 'day' ? 1 : 7
  const selectedItem = data?.find((x) => x.appointment.id === selected)

  return (
    <>
      <PanelHeading
        title="Randevular"
        description={
          role === 'ADMIN' ? 'Bütün mütəxəssislərin randevuları' : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Gün</TabsTrigger>
            <TabsTrigger value="week">Həftə</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Əvvəlki"
            onClick={() => setDate(addDays(date, -step))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant="outline" onClick={() => setDate(today)}>
            Bu gün
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Növbəti"
            onClick={() => setDate(addDays(date, step))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <span className="font-medium">
          {view === 'day'
            ? formatDateLong(date)
            : `${formatDateShort(from)} - ${formatDateShort(to)}`}
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}

      {loadError ? (
        <p className="text-destructive">{loadError}</p>
      ) : !data ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : view === 'day' ? (
        <DayList items={data} role={role} onAction={act} />
      ) : (
        <WeekGrid
          from={from}
          today={today}
          items={data}
          onSelect={(item) => setSelected(item.appointment.id)}
        />
      )}

      <Dialog
        open={selectedItem !== undefined}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <AppointmentDetails
              item={selectedItem}
              role={role}
              onAction={act}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Randevunu ləğv edirsiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling &&
                `${cancelling.customerName}, ${formatDateLong(cancelling.appointment.date)} ${cancelling.appointment.time}. Vaxt yenidən boş olacaq.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İmtina</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelling) void change(cancelling, 'CANCELLED')
                setCancelling(null)
              }}
            >
              Ləğv et
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
      <CalendarX aria-hidden className="size-8" />
      Bu tarixdə randevu yoxdur.
    </div>
  )
}

function DayList({
  items,
  role,
  onAction,
}: {
  items: PanelAppointment[]
  role: UserRole
  onAction: (item: PanelAppointment, status: AppointmentStatus) => void
}) {
  if (items.length === 0) return <Empty />
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.appointment.id} className="rounded-xl border bg-card p-4">
          <AppointmentDetails item={item} role={role} onAction={onAction} />
        </li>
      ))}
    </ol>
  )
}

function endTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function AppointmentDetails({
  item,
  role,
  onAction,
}: {
  item: PanelAppointment
  role: UserRole
  onAction: (item: PanelAppointment, status: AppointmentStatus) => void
}) {
  const a = item.appointment
  const actions = ACTIONS[a.status] ?? []
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold tabular-nums">
            {a.time} - {endTime(a.time, a.durationMinutes)}
          </p>
          <p className="font-medium">{a.serviceName}</p>
          <p className="text-sm text-muted-foreground">
            {item.customerName}
            {role === 'ADMIN' && ` · ${a.providerName}`}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{a.code}</span>
        <span>{formatPrice(a.price)}</span>
        {item.customerPhone && (
          <a
            href={`tel:${item.customerPhone}`}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Phone aria-hidden className="size-3.5" />
            {item.customerPhone}
          </a>
        )}
      </div>
      {a.note && <p className="rounded-lg bg-muted p-2 text-sm">{a.note}</p>}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              variant={
                action.status === 'CANCELLED'
                  ? 'outline'
                  : action.status === 'NO_SHOW'
                    ? 'secondary'
                    : 'default'
              }
              onClick={() => onAction(item, action.status)}
            >
              <action.icon aria-hidden />
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

function WeekGrid({
  from,
  today,
  items,
  onSelect,
}: {
  from: string
  today: string
  items: PanelAppointment[]
  onSelect: (item: PanelAppointment) => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day, i) => {
        const dayItems = items.filter((x) => x.appointment.date === day)
        return (
          <section
            key={day}
            className={cn(
              'flex flex-col gap-2 rounded-xl border bg-card p-2',
              day === today && 'border-primary',
            )}
          >
            <h2 className="px-1 text-sm font-medium">
              {WEEKDAYS_SHORT[i]}{' '}
              <span className="text-muted-foreground">
                {formatDateShort(day)}
              </span>
            </h2>
            {dayItems.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">Boşdur</p>
            ) : (
              dayItems.map((item) => {
                const a = item.appointment
                const inactive =
                  a.status === 'CANCELLED' || a.status === 'NO_SHOW'
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(item)}
                    className={cn(
                      'flex flex-col rounded-lg border-l-4 bg-muted/60 px-2 py-1.5 text-left text-xs hover:bg-muted',
                      a.status === 'PENDING' && 'border-l-chart-4',
                      a.status === 'CONFIRMED' && 'border-l-success',
                      a.status === 'COMPLETED' && 'border-l-primary',
                      inactive && 'border-l-transparent opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        a.status === 'CANCELLED' && 'line-through',
                      )}
                    >
                      {a.time}
                    </span>
                    <span className="truncate">{a.serviceName}</span>
                    <span className="truncate text-muted-foreground">
                      {item.customerName}
                    </span>
                  </button>
                )
              })
            )}
          </section>
        )
      })}
    </div>
  )
}
