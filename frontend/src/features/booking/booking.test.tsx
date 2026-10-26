import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../../vitest.setup'
import { setSessionUser } from '@/features/auth/use-session'
import type { ProviderDetail } from '@/lib/api/types'
import { formatDateLong, monthGrid } from '@/lib/dates'
import { BookingWizard } from './booking-wizard'

const PROVIDER: ProviderDetail = {
  summary: {
    slug: 'elvin-barber',
    name: 'Elvin Məmmədov',
    title: 'Bərbər',
    category: 'gozellik',
    categoryName: 'Gözəllik və baxım',
    city: 'Bakı',
    rating: 4.9,
    reviewCount: 214,
    priceFrom: 10,
    initials: 'EM',
    nextSlot: null,
  },
  bio: null,
  address: null,
  phone: null,
  cancellationHours: 2,
  reviews: [],
  services: [
    {
      id: 1,
      name: 'Saç kəsimi',
      description: null,
      price: 15,
      durationMinutes: 30,
    },
    {
      id: 2,
      name: 'Saqqal dizaynı',
      description: null,
      price: 10,
      durationMinutes: 20,
    },
  ],
  schedule: [],
}

function at(search: string) {
  window.history.replaceState(null, '', `/book/elvin-barber${search}`)
}

describe('BookingWizard', () => {
  beforeEach(() => {
    vi.mocked(router.replace).mockClear()
    vi.mocked(router.push).mockClear()
    setSessionUser(null)
  })

  it('starts with the services and keeps the choice in the URL', () => {
    at('')
    render(<BookingWizard provider={PROVIDER} />)

    fireEvent.click(screen.getByRole('button', { name: /Saqqal dizaynı/ }))

    expect(router.replace).toHaveBeenCalledWith('/?service=2', {
      scroll: false,
    })
  })

  it('shows price, duration and the cancellation rule before confirming', () => {
    at('?service=1&date=2026-10-27&time=10:00')
    render(<BookingWizard provider={PROVIDER} />)

    expect(screen.getByText('15 AZN')).toBeInTheDocument()
    expect(screen.getByText('30 dəq')).toBeInTheDocument()
    expect(screen.getByText(/2 saatdan/)).toBeInTheDocument()
    // Signed out: confirming goes through the login page and comes back.
    expect(
      screen.getByRole('link', { name: 'Daxil olub təsdiqləyin' }),
    ).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent('/?service=1&date=2026-10-27&time=10%3A00')}`,
    )
  })

  it('going back clears only the last step', () => {
    at('?service=1&date=2026-10-27&time=10:00')
    render(<BookingWizard provider={PROVIDER} />)

    fireEvent.click(screen.getByRole('button', { name: 'Geri' }))

    expect(router.replace).toHaveBeenCalledWith('/?service=1&date=2026-10-27', {
      scroll: false,
    })
  })

  it('offers the alternatives when the time was just taken', async () => {
    setSessionUser({
      id: 2,
      email: 'musteri@planera.az',
      fullName: 'Aynur Qasımova',
      phone: null,
      role: 'CUSTOMER',
      providerSlug: null,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/backend/appointments'
          ? Response.json(
              {
                status: 409,
                detail: 'Bu vaxt artıq tutulub. Başqa vaxt seçin.',
                alternatives: ['10:30', '11:00'],
              },
              { status: 409 },
            )
          : Response.json({ slots: [], dates: [] }),
      ),
    )
    at('?service=1&date=2026-10-27&time=10:00')
    render(<BookingWizard provider={PROVIDER} />)

    fireEvent.click(screen.getByRole('button', { name: 'Randevunu təsdiqlə' }))

    expect(
      await screen.findByText('Bu vaxt artıq tutulub. Başqa vaxt seçin.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '11:00' }))
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/?service=1&date=2026-10-27&time=11%3A00',
        { scroll: false },
      ),
    )
  })

  it('shows the appointment code after booking', async () => {
    setSessionUser({
      id: 2,
      email: 'musteri@planera.az',
      fullName: 'Aynur Qasımova',
      phone: null,
      role: 'CUSTOMER',
      providerSlug: null,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          {
            id: 9,
            code: 'RV-2026-000123',
            serviceName: 'Saç kəsimi',
            date: '2026-10-27',
            time: '10:00',
            status: 'CONFIRMED',
          },
          { status: 201 },
        ),
      ),
    )
    at('?service=1&date=2026-10-27&time=10:00')
    render(<BookingWizard provider={PROVIDER} />)

    fireEvent.click(screen.getByRole('button', { name: 'Randevunu təsdiqlə' }))

    expect(await screen.findByText('RV-2026-000123')).toBeInTheDocument()
    expect(screen.getByText('Randevunuz qəbul olundu')).toBeInTheDocument()
  })
})

describe('date helpers', () => {
  it('builds a Monday-first month grid', () => {
    const grid = monthGrid('2026-10') // 1 October 2026 is a Thursday
    expect(grid.slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(grid.length % 7).toBe(0)
    expect(grid.filter(Boolean)).toHaveLength(31)
  })

  it('formats dates in Azerbaijani', () => {
    expect(formatDateLong('2026-10-27')).toBe('27 oktyabr, çərşənbə axşamı')
  })
})
