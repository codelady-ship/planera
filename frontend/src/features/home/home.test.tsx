import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { formatNextSlot } from './format'
import { HeroSearch } from './hero-search'
import { TOP_PROVIDERS } from './mock-data'
import { ProviderCard } from './top-providers'

describe('formatNextSlot', () => {
  test('uses relative day names', () => {
    expect(formatNextSlot('2026-10-25T09:00', '2026-10-25')).toBe(
      'bu gün 09:00',
    )
    expect(formatNextSlot('2026-10-26T11:30', '2026-10-25')).toBe('sabah 11:30')
    expect(formatNextSlot('2026-10-28T10:00', '2026-10-25')).toBe(
      'çərşənbə 10:00',
    )
  })
})

describe('HeroSearch', () => {
  test('submits service, city and date to the search page', () => {
    render(<HeroSearch />)
    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('action', '/search')
    expect(within(form).getByPlaceholderText(/xidməti/i)).toHaveAttribute(
      'name',
      'q',
    )
    expect(within(form).getByRole('combobox')).toHaveValue('Bakı')
    expect(within(form).getByRole('button', { name: 'Axtar' })).toBeVisible()
  })
})

describe('ProviderCard', () => {
  test('shows price, rating, next slot and a booking link', () => {
    const provider = TOP_PROVIDERS[0]
    render(<ProviderCard provider={provider} today="2026-10-25" />)
    expect(screen.getByText(provider.name)).toBeInTheDocument()
    expect(screen.getByText('4.9')).toBeInTheDocument()
    expect(screen.getByText(/15 AZN/)).toBeInTheDocument()
    expect(screen.getByText(/sabah 11:30/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Randevu götür' })).toHaveAttribute(
      'href',
      `/providers/${provider.slug}`,
    )
  })
})
