import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { setSessionUser } from '@/features/auth/use-session'
import { WaitlistJoin } from './waitlist-join'
import { WaitlistList } from './waitlist-list'

const client = vi.hoisted(() => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/api/client', () => client)

const USER = {
  id: 2,
  email: 'musteri@planera.az',
  fullName: 'Aynur Qasımova',
  phone: null,
  role: 'CUSTOMER' as const,
  providerSlug: null,
}

describe('waitlist', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => setSessionUser(null))

  test('a visitor gets a login link instead of the button', () => {
    setSessionUser(null)
    render(
      <WaitlistJoin
        slug="elvin-barber"
        serviceId={1}
        date="2026-10-30"
        loginHref="/login?next=/book/elvin-barber"
      />,
    )
    expect(
      screen.getByRole('link', { name: 'Daxil olub siyahıya qoşulun' }),
    ).toHaveAttribute('href', '/login?next=/book/elvin-barber')
  })

  test('a customer joins the day and sees the confirmation', async () => {
    setSessionUser(USER)
    client.api.mockResolvedValue({ id: 5 })
    render(
      <WaitlistJoin
        slug="elvin-barber"
        serviceId={1}
        date="2026-10-30"
        loginHref="/login"
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Gözləmə siyahısına qoşul' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Siyahıya qoşuldunuz',
    )
    expect(client.api).toHaveBeenCalledWith('/me/waitlist', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'elvin-barber',
        serviceId: 1,
        date: '2026-10-30',
      }),
    })
  })

  test('the account lists the days and lets the customer leave', async () => {
    setSessionUser(USER)
    client.api.mockImplementation(async (path: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? undefined
        : [
            {
              id: 5,
              providerSlug: 'elvin-barber',
              providerName: 'Elvin Məmmədov',
              serviceId: 1,
              serviceName: 'Saç kəsimi',
              date: '2026-10-30',
            },
          ],
    )
    render(<WaitlistList />)

    expect(await screen.findByText('Elvin Məmmədov')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Çıx' }))
    await waitFor(() =>
      expect(client.api).toHaveBeenCalledWith('/me/waitlist/5', {
        method: 'DELETE',
      }),
    )
    expect(screen.queryByText('Elvin Məmmədov')).not.toBeInTheDocument()
  })
})
