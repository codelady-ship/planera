'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { addMonths, dateNames, formatMonth, monthGrid } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * Month grid where only days with free slots can be picked (#31). `active`
 * is null while those days load.
 */
export function MonthCalendar({
  month,
  active,
  selected,
  minMonth,
  maxMonth,
  onSelect,
  onMonthChange,
}: {
  month: string
  active: string[] | null
  selected: string | null
  minMonth: string
  maxMonth: string
  onSelect: (date: string) => void
  onMonthChange: (month: string) => void
}) {
  const t = useTranslations('calendar')
  const locale = useLocale()
  const open = new Set(active ?? [])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('previousMonth')}
          disabled={month <= minMonth}
          onClick={() => onMonthChange(addMonths(month, -1))}
        >
          <ChevronLeft />
        </Button>
        <p className="font-medium" aria-live="polite">
          {formatMonth(month, locale)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('nextMonth')}
          disabled={month >= maxMonth}
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {dateNames(locale).weekdaysShort.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {active === null ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-1" role="grid">
          {monthGrid(month).map((date, i) =>
            date === null ? (
              <span key={`pad-${i}`} />
            ) : (
              <button
                key={date}
                type="button"
                disabled={!open.has(date)}
                aria-pressed={selected === date}
                aria-label={date}
                onClick={() => onSelect(date)}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg text-sm transition-colors',
                  'disabled:cursor-not-allowed disabled:text-muted-foreground/50',
                  open.has(date) &&
                    'bg-secondary font-medium text-secondary-foreground hover:bg-cta hover:text-cta-foreground',
                  selected === date &&
                    'bg-cta text-cta-foreground hover:bg-cta',
                )}
              >
                {Number(date.slice(8))}
              </button>
            ),
          )}
        </div>
      )}
      {active !== null && active.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('noDays')}</p>
      )}
    </div>
  )
}

/** Free start times of the chosen day. */
export function SlotGrid({
  slots,
  selected,
  onSelect,
}: {
  slots: string[] | null
  selected: string | null
  onSelect: (time: string) => void
}) {
  const t = useTranslations('calendar')
  if (slots === null) return <Skeleton className="h-40 w-full" />
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noSlots')}</p>
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((time) => (
        <Button
          key={time}
          variant={selected === time ? 'default' : 'outline'}
          aria-pressed={selected === time}
          className={cn(
            'h-10',
            selected === time && 'bg-cta text-cta-foreground hover:bg-cta/90',
          )}
          onClick={() => onSelect(time)}
        >
          {time}
        </Button>
      ))}
    </div>
  )
}
