import { Capacitor } from '@capacitor/core'
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications'
import { appointmentAlarmText, noteAlarmText } from '@/features/diary/speech'
import { currentLocale } from '@/i18n/current'
import type { Locale } from '@/i18n/routing'
import type { AgendaItem } from '@/lib/api/types'
import { dateNames, formatDateLong, todayInBaku } from '@/lib/dates'

// Native alarms (#65): inside the Android / iOS app the agenda is turned
// into local notifications that fire at the exact time, with sound, even
// when the app is closed. The web site keeps Web Push and the in-page alarm.

export const CHANNEL_ID = 'planera-alarms'
/** Reserved id range so the app's alarms never collide with other plugins. */
const ID_BASE = 100_000
const HORIZON_MS = 30 * 24 * 60 * 60 * 1000

/** Notification titles and the Android channel in the page language (#94). */
const TEXTS: Record<
  Locale,
  { note: string; appointment: string; channel: string; channelText: string }
> = {
  az: {
    note: 'Qeyd xatırlatması',
    appointment: 'Randevu xatırlatması',
    channel: 'Xatırlatmalar',
    channelText: 'Randevu və qeyd alarmları',
  },
  en: {
    note: 'Note reminder',
    appointment: 'Appointment reminder',
    channel: 'Reminders',
    channelText: 'Appointment and note alarms',
  },
  ru: {
    note: 'Напоминание о заметке',
    appointment: 'Напоминание о записи',
    channel: 'Напоминания',
    channelText: 'Будильники записей и заметок',
  },
}

/** The sample sentence of the test alarm, like the voice settings use. */
const SAMPLE_TITLE: Record<Locale, string> = {
  az: 'həkimə getmək',
  en: 'visit the doctor',
  ru: 'сходить к врачу',
}

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export type NativePermission = 'granted' | 'denied' | 'prompt'

export async function checkNativePermission(): Promise<NativePermission> {
  const { display } = await LocalNotifications.checkPermissions()
  return display === 'granted'
    ? 'granted'
    : display === 'denied'
      ? 'denied'
      : 'prompt'
}

/** Asks only when called from a button press (#55 rule applies here too). */
export async function requestNativePermission(
  locale: Locale = currentLocale(),
): Promise<NativePermission> {
  const { display } = await LocalNotifications.requestPermissions()
  if (display === 'granted' && Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: TEXTS[locale].channel,
      description: TEXTS[locale].channelText,
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    })
  }
  return display === 'granted' ? 'granted' : 'denied'
}

/** The sentence the notification shows and the app reads aloud on tap (#62). */
export function alarmSentence(
  item: AgendaItem,
  today = todayInBaku(),
  locale: Locale = currentLocale(),
) {
  const when =
    item.date === today
      ? dateNames(locale).today
      : formatDateLong(item.date, locale)
  return item.type === 'NOTE'
    ? noteAlarmText(when, item.time, item.title, locale)
    : appointmentAlarmText(
        when,
        item.time,
        item.title,
        item.subtitle ?? '',
        locale,
      )
}

export function toNotification(
  item: AgendaItem,
  now = Date.now(),
  locale: Locale = currentLocale(),
): LocalNotificationSchema | null {
  const at = new Date(item.startsAt).getTime()
  if (at <= now || at - now > HORIZON_MS) return null
  if (item.type === 'NOTE' && item.status !== 'ACTIVE') return null
  if (
    item.type === 'APPOINTMENT' &&
    item.status !== 'CONFIRMED' &&
    item.status !== 'PENDING'
  )
    return null
  const sentence = alarmSentence(item, todayInBaku(), locale)
  return {
    id: ID_BASE + (item.type === 'NOTE' ? 2 * item.id : 2 * item.id + 1),
    title:
      item.type === 'NOTE' ? TEXTS[locale].note : TEXTS[locale].appointment,
    body: sentence,
    schedule: { at: new Date(at), allowWhileIdle: true },
    channelId: CHANNEL_ID,
    sound: 'default',
    smallIcon: 'ic_stat_planera',
    extra: { url: '/account', say: sentence },
  }
}

/**
 * Replaces the app's pending alarms with the current agenda. Called after
 * every load of the diary, so edits, deletions and new notes are reflected.
 */
export async function syncNativeAlarms(
  items: AgendaItem[],
  locale: Locale = currentLocale(),
) {
  if (!isNativeApp()) return 0
  if ((await checkNativePermission()) !== 'granted') return 0
  const { notifications: pending } = await LocalNotifications.getPending()
  const ours = pending.filter((n) => n.id >= ID_BASE)
  if (ours.length > 0) {
    await LocalNotifications.cancel({
      notifications: ours.map((n) => ({ id: n.id })),
    })
  }
  const notifications = items
    .map((item) => toNotification(item, Date.now(), locale))
    .filter((n): n is LocalNotificationSchema => n !== null)
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications })
  }
  return notifications.length
}

/** A notification a few seconds from now, so the user hears the sound and sees the icon. */
export async function sendNativeTest(locale: Locale = currentLocale()) {
  const sentence = noteAlarmText(
    dateNames(locale).today,
    '15:00',
    SAMPLE_TITLE[locale],
    locale,
  )
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_BASE - 1,
        title: 'Planera',
        body: sentence,
        schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
        channelId: CHANNEL_ID,
        sound: 'default',
        smallIcon: 'ic_stat_planera',
        extra: { url: '/account', say: sentence },
      },
    ],
  })
}

/** A tapped alarm opens the diary and has the sentence read aloud. */
export async function listenForAlarmTaps(open: (url: string) => void) {
  if (!isNativeApp()) return () => {}
  const handle = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    ({ notification }) => {
      const extra = (notification.extra ?? {}) as { url?: string; say?: string }
      const target = new URL(extra.url ?? '/account', 'https://planera.app')
      if (extra.say) target.searchParams.set('say', extra.say)
      open(target.pathname + target.search)
    },
  )
  return () => void handle.remove()
}
