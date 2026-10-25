// Calendar helpers on plain "YYYY-MM-DD" strings in Asia/Baku, so results
// never depend on the viewer's own time zone.

export const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
]

/** Monday first, like the calendar grid. */
export const WEEKDAYS_SHORT = ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B']

const WEEKDAYS = [
  'bazar',
  'bazar ertəsi',
  'çərşənbə axşamı',
  'çərşənbə',
  'cümə axşamı',
  'cümə',
  'şənbə',
]

/** Today in Baku as "YYYY-MM-DD". */
export function todayInBaku(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baku',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

/** "2026-10-27" -> "27 oktyabr, çərşənbə axşamı" */
export function formatDateLong(date: string): string {
  const d = utc(date)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${WEEKDAYS[d.getUTCDay()]}`
}

/** "2026-10" -> "Oktyabr 2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const name = MONTHS[m - 1]
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(year, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

/**
 * The days of a month as a Monday-first grid; null cells pad the first and
 * last week.
 */
export function monthGrid(month: string): (string | null)[] {
  const [year, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, m - 1, 1))
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const cells: (string | null)[] = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= days; day++) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7) cells.push(null)
  return cells
}

export function formatPrice(azn: number): string {
  return `${Number.isInteger(azn) ? azn : azn.toFixed(2)} AZN`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} dəq`
  return m ? `${h} saat ${m} dəq` : `${h} saat`
}

export function addDays(date: string, delta: number): string {
  const d = utc(date)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** The Monday of the week that holds `date`. */
export function weekStart(date: string): string {
  return addDays(date, -((utc(date).getUTCDay() + 6) % 7))
}

/** "2026-10-27" -> "27 okt" */
export function formatDateShort(date: string): string {
  const d = utc(date)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`
}
