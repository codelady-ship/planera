import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { CategoryGrid } from '@/features/home/category-grid'

// The catalog sections are async Server Components; their data comes from
// the API and is tested through the components themselves.
vi.mock('@/lib/api/catalog', () => ({
  getCategories: async () => [],
  getTopProviders: async () => ({ providers: [], today: '2026-10-25' }),
}))

test('renders the static home page sections', async () => {
  const { default: Home } = await import('../[locale]/page')
  render(
    await Home({
      params: Promise.resolve({ locale: 'az' }),
    } as PageProps<'/[locale]'>),
  )
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    /randevunu bir neçə kliklə/,
  )
  // Light and night wordmarks; CSS shows one of them (#93).
  expect(screen.getAllByRole('img', { name: 'Planera' })).toHaveLength(2)
  expect(screen.getByText('Vaxtını seç, rahatlığını yaşa.')).toBeInTheDocument()
  expect(screen.getByRole('search')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Necə işləyir?' }),
  ).toBeInTheDocument()
}, 15000)

test('lists the categories from the API with their provider counts', () => {
  render(
    <CategoryGrid
      categories={[
        {
          slug: 'gozellik',
          name: 'Gözəllik və baxım',
          description: 'Bərbər, salon',
          providerCount: 3,
        },
      ]}
    />,
  )
  expect(
    screen.getByRole('heading', { name: 'Populyar kateqoriyalar' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: /Gözəllik və baxım/ }),
  ).toHaveAttribute('href', '/search?category=gozellik')
  expect(screen.getByText('3 mütəxəssis')).toBeInTheDocument()
})
