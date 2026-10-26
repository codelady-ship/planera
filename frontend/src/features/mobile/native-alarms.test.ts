import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AgendaItem } from '@/lib/api/types'
import { todayInBaku } from '@/lib/dates'

const capacitor = vi.hoisted(() => ({ native: false, platform: 'web' }))
const plugin = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  createChannel: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  addListener: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => capacitor.native,
    getPlatform: () => capacitor.platform,
  },
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: plugin,
}))

import {
  alarmSentence,
  listenForAlarmTaps,
  requestNativePermission,
  syncNativeAlarms,
  toNotification,
} from './native-alarms'

const today = todayInBaku()
const inOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString()

const NOTE: AgendaItem = {
  type: 'NOTE',
  id: 5,
  startsAt: inOneHour,
  date: today,
  time: '15:00',
  title: 'həkimə getmək',
  subtitle: null,
  status: 'ACTIVE',
}
const APPOINTMENT: AgendaItem = {
  type: 'APPOINTMENT',
  id: 1,
  startsAt: inOneHour,
  date: today,
  time: '12:00',
  title: 'Elvin Məmmədov',
  subtitle: 'Saç kəsimi',
  status: 'CONFIRMED',
}

describe('native alarms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capacitor.native = true
    capacitor.platform = 'android'
    plugin.checkPermissions.mockResolvedValue({ display: 'granted' })
    plugin.requestPermissions.mockResolvedValue({ display: 'granted' })
    plugin.getPending.mockResolvedValue({
      notifications: [{ id: 100_010 }, { id: 7 }],
    })
    plugin.schedule.mockResolvedValue({ notifications: [] })
  })

  test('sentences follow the alarm wording', () => {
    expect(alarmSentence(NOTE)).toBe(
      'Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək',
    )
    expect(alarmSentence(APPOINTMENT)).toBe(
      'Sizin bu gün saat 12:00-da Elvin Məmmədov ilə randevunuz var: Saç kəsimi',
    )
  })

  test('only future, active items become exact notifications', () => {
    const n = toNotification(NOTE)!
    expect(n.id).toBe(100_010)
    expect(n.schedule).toEqual({
      at: new Date(inOneHour),
      allowWhileIdle: true,
    })
    expect(n.extra).toEqual({ url: '/account', say: alarmSentence(NOTE) })
    expect(toNotification({ ...NOTE, status: 'DONE' })).toBeNull()
    expect(
      toNotification({ ...NOTE, startsAt: '2020-01-01T00:00:00Z' }),
    ).toBeNull()
    expect(toNotification({ ...APPOINTMENT, status: 'CANCELLED' })).toBeNull()
  })

  test("sync replaces the app's own pending alarms, leaving others alone", async () => {
    expect(await syncNativeAlarms([NOTE, APPOINTMENT])).toBe(2)
    expect(plugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 100_010 }],
    })
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({ id: 100_010 }),
        expect.objectContaining({ id: 100_003 }),
      ],
    })
  })

  test('nothing happens on the web or without permission', async () => {
    capacitor.native = false
    expect(await syncNativeAlarms([NOTE])).toBe(0)
    capacitor.native = true
    plugin.checkPermissions.mockResolvedValue({ display: 'denied' })
    expect(await syncNativeAlarms([NOTE])).toBe(0)
    expect(plugin.schedule).not.toHaveBeenCalled()
  })

  test('the permission request also creates the Android channel', async () => {
    expect(await requestNativePermission()).toBe('granted')
    expect(plugin.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'randevum-alarms', importance: 5 }),
    )
  })

  test('a tapped alarm opens the diary with the sentence to read', async () => {
    let handler: (action: {
      notification: { extra?: unknown }
    }) => void = () => {}
    plugin.addListener.mockImplementation(
      async (_: string, fn: typeof handler) => {
        handler = fn
        return { remove: vi.fn() }
      },
    )
    const open = vi.fn()
    await listenForAlarmTaps(open)
    handler({ notification: { extra: { url: '/account', say: 'Salam' } } })
    expect(open).toHaveBeenCalledWith('/account?say=Salam')
  })
})
