'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
)

/** Row height in px; the column shows five rows with the chosen one in the middle. */
const ROW = 44
const VISIBLE = 5

/**
 * Hour and minute as two scrolling wheels (#60): 24-hour clock, five-minute
 * steps. Scroll (or tap) a number into the highlighted middle row to pick
 * it; the value is "HH:mm" or null until something was picked.
 */
export function TimePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (time: string) => void
}) {
  const t = useTranslations('diary')
  const hour = value ? value.slice(0, 2) : null
  const minute = value ? value.slice(3, 5) : null

  return (
    <div className="flex items-stretch justify-center gap-3">
      <Wheel
        label={t('hour')}
        items={HOURS}
        selected={hour}
        onSelect={(h) => onChange(`${h}:${minute ?? '00'}`)}
      />
      <span
        aria-hidden
        className="self-center pb-5 text-2xl font-semibold text-muted-foreground"
      >
        :
      </span>
      <Wheel
        label={t('minute')}
        items={MINUTES}
        selected={minute}
        onSelect={(m) => onChange(`${hour ?? '00'}:${m}`)}
      />
    </div>
  )
}

function Wheel({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string
  items: string[]
  selected: string | null
  onSelect: (item: string) => void
}) {
  const list = useRef<HTMLDivElement>(null)
  const settle = useRef<number | null>(null)
  const pad = (ROW * (VISIBLE - 1)) / 2

  // Bring the chosen row to the middle when the wheel opens or the value changes.
  useEffect(() => {
    const el = list.current
    if (!el || selected === null) return
    const index = items.indexOf(selected)
    if (index < 0) return
    if (Math.round(el.scrollTop / ROW) !== index) {
      el.scrollTo?.({ top: index * ROW, behavior: 'instant' })
    }
  }, [items, selected])

  function onScroll() {
    const el = list.current
    if (!el) return
    if (settle.current) window.clearTimeout(settle.current)
    // Wait for the snap to finish, then read which row sits in the middle.
    settle.current = window.setTimeout(() => {
      const index = Math.min(
        items.length - 1,
        Math.max(0, Math.round(el.scrollTop / ROW)),
      )
      if (items[index] !== selected) onSelect(items[index])
    }, 120)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative" style={{ height: ROW * VISIBLE }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-cta/40 bg-cta/10"
          style={{ height: ROW }}
        />
        <div
          ref={list}
          role="listbox"
          aria-label={label}
          onScroll={onScroll}
          className="h-full w-24 snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
          style={{ paddingTop: pad, paddingBottom: pad }}
        >
          {items.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={selected === item}
              aria-label={`${label} ${item}`}
              onClick={() => {
                onSelect(item)
                list.current?.scrollTo?.({
                  top: items.indexOf(item) * ROW,
                  behavior: 'smooth',
                })
              }}
              className={cn(
                'flex w-full snap-center items-center justify-center text-lg tabular-nums transition-colors',
                selected === item
                  ? 'font-semibold text-cta'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              style={{ height: ROW }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
