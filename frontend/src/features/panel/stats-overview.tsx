'use client'

import type { LucideIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarCheck, CalendarDays, Percent, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/use-session'
import type { Stats } from '@/lib/api/types'
import { dateNames, formatDateLong, formatPrice } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PanelHeading } from './panel-shell'
import { panelPaths } from './paths'
import { useApi } from './use-api'

/** Overview (#41): this week's numbers and the most booked services. */
export function StatsOverview() {
  const t = useTranslations('panel')
  const locale = useLocale()
  const { user } = useSession()
  const { data, error } = useApi<Stats>(
    user ? panelPaths(user.role).stats : null,
  )

  return (
    <>
      <PanelHeading
        title={t('overview')}
        description={
          user?.role === 'ADMIN' ? t('thisWeekAll') : t('thisWeekYours')
        }
      />
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              icon={CalendarCheck}
              label={t('today')}
              value={String(data.todayCount)}
              hint={formatDateLong(data.today, locale)}
            />
            <Tile
              icon={CalendarDays}
              label={t('thisWeek')}
              value={String(data.weekCount)}
              hint={t('appointmentsHint')}
            />
            <Tile
              icon={Wallet}
              label={t('weekRevenue')}
              value={formatPrice(data.weekRevenue)}
              hint={t('revenueHint')}
            />
            <Tile
              icon={Percent}
              label={t('cancelRate')}
              value={`${data.cancellationRate}%`}
              hint={t('cancelHint')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeekChart stats={data} />
            <PopularServices stats={data} />
          </div>
        </div>
      )}
    </>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon aria-hidden className="size-4" />
          {label}
        </span>
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </CardContent>
    </Card>
  )
}

/** Flat bars, one per weekday; today is the teal one. */
function WeekChart({ stats }: { stats: Stats }) {
  const t = useTranslations('panel')
  const locale = useLocale()
  const weekdays = dateNames(locale).weekdaysShort
  const max = Math.max(1, ...stats.week.map((d) => d.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('weekChart')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol
          className="flex h-48 items-end gap-2"
          aria-label={t('weekChartLabel')}
        >
          {stats.week.map((day, i) => (
            <li
              key={day.date}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-xs font-medium tabular-nums">
                {day.count}
              </span>
              <span
                className={cn(
                  'w-full max-w-10 rounded-t-md',
                  day.date === stats.today ? 'bg-success' : 'bg-primary',
                )}
                style={{ height: `${(day.count / max) * 100}%`, minHeight: 2 }}
              />
              <span className="text-xs text-muted-foreground">
                {weekdays[i]}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function PopularServices({ stats }: { stats: Stats }) {
  const t = useTranslations('panel')
  const max = Math.max(1, ...stats.popularServices.map((s) => s.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('popular')}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.popularServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noRecent')}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {stats.popularServices.map((service) => (
              <li key={service.name} className="flex flex-col gap-1">
                <span className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{service.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {service.count}
                  </span>
                </span>
                <span className="h-2 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(service.count / max) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('last30')}</p>
      </CardContent>
    </Card>
  )
}
