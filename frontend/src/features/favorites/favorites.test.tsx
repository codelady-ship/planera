import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { router } from '../../../vitest.setup'
import { setSessionUser } from '@/features/auth/use-session'
import { FavoriteButton } from './favorite-button'
import { FavoritesList } from './favorites-list'
import { resetFavorites } from './use-favorites'

const client = vi.hoisted(() => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/api/client', () => client)

const ELVIN = {
  slug: 'elvin-barber',
  name: 'Elvin Məmmədov',
  title: 'Bərbər',
  category: 'gozellik',
  categoryName: 'Gözəllik və baxım',
  city: 'Bakı',
  rating: 4.8,
  reviewCount: 12,
  priceFrom: 15,
  initials: 'EM',
  nextSlot: null,
}

describe('favourites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFavorites()
  })
  afterEach(() => setSessionUser(null))

  test('a visitor is sent to the login page', () => {
    setSessionUser(null)
    render(<FavoriteButton slug="elvin-barber" />)
    fireEvent.click(
      screen.getByRole('button', { name: 'Sevimlilərə əlavə et' }),
    )
    expect(router.push).toHaveBeenCalledWith(
      '/login?next=/providers/elvin-barber',
    )
    expect(client.api).not.toHaveBeenCalled()
  })

  test('a signed-in user toggles the heart and the API follows', async () => {
    setSessionUser({
      id: 2,
      email: 'musteri@planera.az',
      fullName: 'Aynur Qasımova',
      phone: null,
      role: 'CUSTOMER',
      providerSlug: null,
    })
    client.api.mockImplementation(async (path: string) =>
      path === '/me/favorites' ? [ELVIN] : undefined,
    )
    render(<FavoriteButton slug="elvin-barber" />)

    const button = await screen.findByRole('button', {
      name: 'Sevimlilərdən çıxar',
    })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)
    expect(
      screen.getByRole('button', { name: 'Sevimlilərə əlavə et' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() =>
      expect(client.api).toHaveBeenCalledWith('/me/favorites/elvin-barber', {
        method: 'DELETE',
      }),
    )
  })

  test('the account tab lists the favourites with a booking link', async () => {
    setSessionUser({
      id: 2,
      email: 'musteri@planera.az',
      fullName: 'Aynur Qasımova',
      phone: null,
      role: 'CUSTOMER',
      providerSlug: null,
    })
    client.api.mockResolvedValue([ELVIN])
    render(<FavoritesList />)

    expect(await screen.findByText('Elvin Məmmədov')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Randevu götür' })).toHaveAttribute(
      'href',
      '/book/elvin-barber',
    )
  })

  test('an empty list points to the search', async () => {
    client.api.mockResolvedValue([])
    render(<FavoritesList />)
    expect(
      await screen.findByText('Hələ sevimli mütəxəssis yoxdur.'),
    ).toBeInTheDocument()
  })
})
