import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Home from '../page'

test('renders the home page sections', () => {
  render(<Home />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    /randevunu bir neçə kliklə/,
  )
  expect(screen.getByRole('search')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Populyar kateqoriyalar' }),
  ).toBeInTheDocument()
  expect(
    screen.getAllByRole('link', { name: 'Randevu götür' }).length,
  ).toBeGreaterThan(0)
  expect(
    screen.getByRole('heading', { name: 'Necə işləyir?' }),
  ).toBeInTheDocument()
})
