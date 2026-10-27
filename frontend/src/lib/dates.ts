// Calendar helpers on plain "YYYY-MM-DD" strings in Asia/Baku, so results
// never depend on the viewer's own time zone. Names come in the interface
// languages (#94); Azerbaijani is the default.

export type DateLocale = 'az' | 'en' | 'ru'

const NAMES: Record<
  DateLocale,
  {
    months: string[]
    weekdays: string[]
    weekdaysShort: string[]
    today: string
    tomorrow: string
    hour: string
    minute: string
  }
> = {
  az: {
    months: [
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
    ],
    weekdays: [
      'bazar',
      'bazar ertəsi',
      'çərşənbə axşamı',
      'çərşənbə',
      'cümə axşamı',
      'cümə',
      'şənbə',
    ],
    weekdaysShort: ['B.e', 'Ç.a', 'Ç', 'C.a', 'C', 'Ş', 'B'],
    today: 'bu gün',
    tomorrow: 'sabah',
    hour: 'saat',
    minute: 'dəq',
  },
  en: {
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    weekdays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    today: 'today',
    tomorrow: 'tomorrow',
    hour: 'h',
    minute: 'min',
  },
  ru: {
    months: [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ],
    weekdays: [
      'воскресенье',
      'понедельник',
      'вторник',
      'среда',
      'четверг',
      'пятница',
      'суббота',
    ],
    weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    today: 'сегодня',
    tomorrow: 'завтра',
    hour: 'ч',
    minute: 'мин',
  },
}

export function dateNames(locale: string = 'az') {
  return NAMES[(locale in NAMES ? locale : 'az') as DateLocale]
}

/** Lower-case month names in Azerbaijani (the default language). */
export const MONTHS = NAMES.az.months

/** Monday first, like the calendar grid. */
export const WEEKDAYS_SHORT = NAMES.az.weekdaysShort

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
export function formatDateLong(date: string, locale = 'az'): string {
  const d = utc(date)
  const n = dateNames(locale)
  return `${d.getUTCDate()} ${n.months[d.getUTCMonth()]}, ${n.weekdays[d.getUTCDay()]}`
}

/** "2026-10" -> "Oktyabr 2026" */
export function formatMonth(month: string, locale = 'az'): string {
  const [year, m] = month.split('-').map(Number)
  const name = dateNames(locale).months[m - 1]
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

/** Prices stay in AZN in every language. */
export function formatPrice(azn: number): string {
  return `${Number.isInteger(azn) ? azn : azn.toFixed(2)} AZN`
}

export function formatDuration(minutes: number, locale = 'az'): string {
  const n = dateNames(locale)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} ${n.minute}`
  return m ? `${h} ${n.hour} ${m} ${n.minute}` : `${h} ${n.hour}`
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
export function formatDateShort(date: string, locale = 'az'): string {
  const d = utc(date)
  return `${d.getUTCDate()} ${dateNames(locale).months[d.getUTCMonth()].slice(0, 3)}`
}
