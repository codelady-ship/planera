import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NotificationSettings } from './notification-settings'

const push = vi.hoisted(() => ({
  getPushStatus: vi.fn(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  sendTestPush: vi.fn(),
  needsHomeScreen: vi.fn().mockReturnValue(false),
}))

const client = vi.hoisted(() => ({ api: vi.fn() }))
const native = vi.hoisted(() => ({
  isNativeApp: vi.fn().mockReturnValue(false),
  checkNativePermission: vi.fn(),
  requestNativePermission: vi.fn(),
  sendNativeTest: vi.fn(),
}))

vi.mock('@/features/pwa/push', () => push)
vi.mock('@/lib/api/client', () => client)
vi.mock('@/features/mobile/native-alarms', () => native)

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    push.needsHomeScreen.mockReturnValue(false)
    client.api.mockResolvedValue({ reminderOffsets: [60, 15, 0] })
  })

  test('offers to turn notifications on and reports success', async () => {
    push.getPushStatus.mockResolvedValue('off')
    push.enablePush.mockResolvedValue('on')
    render(<NotificationSettings />)

    const button = await screen.findByRole('button', {
      name: 'Bildirişləri aç',
    })
    fireEvent.click(button)

    expect(push.enablePush).toHaveBeenCalledOnce()
    expect(
      (await screen.findAllByRole('status')).map((s) => s.textContent),
    ).toContain('Bildirişlər bu cihazda açıldı.')
    expect(
      screen.getByRole('button', { name: 'Test bildirişi göndər' }),
    ).toBeInTheDocument()
  })

  test('sends a test notification when already on', async () => {
    push.getPushStatus.mockResolvedValue('on')
    push.sendTestPush.mockResolvedValue(1)
    render(<NotificationSettings />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Test bildirişi göndər' }),
    )
    expect(
      (await screen.findAllByRole('status')).map((s) => s.textContent),
    ).toContain('Test bildirişi göndərildi.')
  })

  test('in the native app the button asks for local alarm permission', async () => {
    native.isNativeApp.mockReturnValue(true)
    native.checkNativePermission.mockResolvedValue('prompt')
    native.requestNativePermission.mockResolvedValue('granted')
    render(<NotificationSettings />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Bildirişləri aç' }),
    )
    expect(native.requestNativePermission).toHaveBeenCalledOnce()
    expect(push.enablePush).not.toHaveBeenCalled()
    expect(
      (await screen.findAllByRole('status')).map((s) => s.textContent),
    ).toContain('Alarm bildirişləri bu cihazda açıldı.')
    expect(
      screen.queryByRole('button', { name: 'Bağla' }),
    ).not.toBeInTheDocument()
    native.isNativeApp.mockReturnValue(false)
  })

  test('explains the home screen step on an iPhone browser', async () => {
    push.getPushStatus.mockResolvedValue('unsupported')
    push.needsHomeScreen.mockReturnValue(true)
    render(<NotificationSettings />)

    expect(await screen.findByText(/ana ekrana əlavə edin/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bildirişləri aç' }),
    ).not.toBeInTheDocument()
  })

  test('loads the reminder times and saves a changed selection', async () => {
    push.getPushStatus.mockResolvedValue('off')
    render(<NotificationSettings />)

    const day = await screen.findByRole('checkbox', { name: '1 gün əvvəl' })
    const hour = screen.getByRole('checkbox', { name: '1 saat əvvəl' })
    expect(day).toHaveAttribute('aria-checked', 'false')
    expect(hour).toHaveAttribute('aria-checked', 'true')
    const save = screen.getByRole('button', { name: 'Yadda saxla' })
    expect(save).toBeDisabled()

    fireEvent.click(day)
    fireEvent.click(hour)
    expect(save).toBeEnabled()

    client.api.mockResolvedValueOnce({ reminderOffsets: [1440, 15, 0] })
    fireEvent.click(save)

    expect(
      (await screen.findAllByRole('status')).map((s) => s.textContent),
    ).toContain('Xatırlatma vaxtları yadda saxlanıldı.')
    expect(client.api).toHaveBeenLastCalledWith('/me/notification-settings', {
      method: 'PUT',
      body: JSON.stringify({ reminderOffsets: [1440, 15, 0] }),
    })
    expect(save).toBeDisabled()
  })
})
