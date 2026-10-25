const WEEKDAYS = [
  'bazar',
  'bazar ertəsi',
  'çərşənbə axşamı',
  'çərşənbə',
  'cümə axşamı',
  'cümə',
  'şənbə',
]

export function formatPrice(azn: number): string {
  return `${azn} AZN`
}

/**
 * Formats a local Asia/Baku date-time ("2026-10-26T11:30") relative to
 * `today` ("2026-10-25"): "bu gün 11:30", "sabah 11:30" or "çərşənbə 11:30".
 * Works on the plain strings so the result does not depend on the viewer's
 * time zone.
 */
export function formatNextSlot(slot: string, today: string): string {
  const [date, time] = slot.split('T')
  const days = Math.round(
    (Date.parse(`${date}T00:00Z`) - Date.parse(`${today}T00:00Z`)) / 86_400_000,
  )
  if (days === 0) return `bu gün ${time}`
  if (days === 1) return `sabah ${time}`
  const weekday = WEEKDAYS[new Date(`${date}T00:00Z`).getUTCDay()]
  return `${weekday} ${time}`
}
