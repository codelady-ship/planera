'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
)

/**
 * Hour and minute as two button grids (#60): 24-hour clock, five-minute
 * steps, big touch targets. The value is "HH:mm" or null until both are set.
 */
export function TimePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (time: string) => void
}) {
  const hour = value ? value.slice(0, 2) : null
  const minute = value ? value.slice(3, 5) : null

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Saat</legend>
        <div className="grid grid-cols-6 gap-2">
          {HOURS.map((h) => (
            <Button
              key={h}
              variant={hour === h ? 'default' : 'outline'}
              aria-pressed={hour === h}
              aria-label={`Saat ${h}`}
              className={cn(
                'h-11',
                hour === h && 'bg-cta text-cta-foreground hover:bg-cta/90',
              )}
              onClick={() => onChange(`${h}:${minute ?? '00'}`)}
            >
              {h}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2" disabled={hour === null}>
        <legend className="text-sm font-medium">
          Dəqiqə
          {hour === null && (
            <span className="ml-2 font-normal text-muted-foreground">
              (əvvəlcə saatı seçin)
            </span>
          )}
        </legend>
        <div className="grid grid-cols-6 gap-2">
          {MINUTES.map((m) => (
            <Button
              key={m}
              variant={minute === m ? 'default' : 'outline'}
              aria-pressed={minute === m}
              aria-label={`Dəqiqə ${m}`}
              className={cn(
                'h-11',
                minute === m && 'bg-cta text-cta-foreground hover:bg-cta/90',
              )}
              onClick={() => hour && onChange(`${hour}:${m}`)}
            >
              {m}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
