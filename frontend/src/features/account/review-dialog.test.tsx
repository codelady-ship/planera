import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Appointment } from '@/lib/api/types'
import { AppointmentCard } from './appointment-card'

const client = vi.hoisted(() => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/api/client', () => client)

const DONE: Appointment = {
  id: 7,
  code: 'RV-2026-000007',
  providerSlug: 'elvin-barber',
  providerName: 'Elvin Məmmədov',
  serviceId: 1,
  serviceName: 'Saç kəsimi',
  date: '2026-10-20',
  time: '10:00',
  durationMinutes: 30,
  startsAt: '2026-10-20T06:00:00Z',
  endsAt: '2026-10-20T06:30:00Z',
  status: 'COMPLETED',
  price: 15,
  note: null,
  cancellable: false,
  reviewable: true,
}

describe('review from the account list', () => {
  beforeEach(() => vi.clearAllMocks())

  test('a completed appointment offers a review; stars and comment are posted', async () => {
    client.api.mockResolvedValue({ id: 1, rating: 5 })
    const onChange = vi.fn()
    render(<AppointmentCard appointment={DONE} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Rəy yaz' }))
    const send = await screen.findByRole('button', { name: 'Rəyi göndər' })
    expect(send).toBeDisabled()

    fireEvent.click(screen.getByRole('radio', { name: /^4 ulduz/ }))
    expect(screen.getByText('Yaxşı')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Şərh (istəyə bağlı)'), {
      target: { value: '  Səliqəli iş  ' },
    })
    fireEvent.click(send)

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
    expect(client.api).toHaveBeenCalledWith('/appointments/7/review', {
      method: 'POST',
      body: JSON.stringify({ rating: 4, comment: 'Səliqəli iş' }),
    })
  })

  test('an already reviewed appointment has no review button', () => {
    render(
      <AppointmentCard
        appointment={{ ...DONE, reviewable: false }}
        onChange={() => {}}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Rəy yaz' }),
    ).not.toBeInTheDocument()
  })
})
