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

vi.mock('@/features/pwa/push', () => push)

describe('NotificationSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  test('offers to turn notifications on and reports success', async () => {
    push.getPushStatus.mockResolvedValue('off')
    push.enablePush.mockResolvedValue('on')
    render(<NotificationSettings />)

    const button = await screen.findByRole('button', {
      name: 'Bildirişləri aç',
    })
    fireEvent.click(button)

    expect(push.enablePush).toHaveBeenCalledOnce()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bildirişlər bu cihazda açıldı.',
    )
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
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Test bildirişi göndərildi.',
    )
  })

  test('explains the home screen step on an iPhone browser', async () => {
    push.getPushStatus.mockResolvedValue('unsupported')
    push.needsHomeScreen.mockReturnValue(true)
    render(<NotificationSettings />)

    expect(await screen.findByText(/ana ekrana əlavə edin/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
