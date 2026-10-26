import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ProviderReviews } from './provider-reviews'

describe('ProviderReviews', () => {
  test('shows stars, the short name, the date and the comment', () => {
    render(
      <ProviderReviews
        reviewCount={214}
        reviews={[
          {
            id: 1,
            rating: 4,
            comment: 'Səliqəli iş',
            customerName: 'Aynur Q.',
            createdAt: '2026-10-20T06:00:00Z',
          },
        ]}
      />,
    )
    expect(screen.getByRole('img', { name: '4 / 5 ulduz' })).toBeInTheDocument()
    expect(screen.getByText('Aynur Q.')).toBeInTheDocument()
    expect(screen.getByText('Səliqəli iş')).toBeInTheDocument()
    expect(
      screen.getByText(/Son 1 rəy göstərilir, cəmi 214/),
    ).toBeInTheDocument()
  })

  test('explains how the first review is written when there is none', () => {
    render(<ProviderReviews reviewCount={0} reviews={[]} />)
    expect(screen.getByText(/Hələ rəy yoxdur/)).toBeInTheDocument()
  })
})
