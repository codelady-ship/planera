import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AgendaItem } from '@/lib/api/types'
import { todayInBaku } from '@/lib/dates'
import { AgendaView, UNDO_MS } from './agenda-view'

const client = vi.hoisted(() => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/api/client', () => client)
vi.mock('./speech', () => ({
  speak: vi.fn(),
  noteAlarmText: (when: string, time: string, title: string) =>
    `Sizin ${when} saat ${time}-da qeydiniz var: ${title}`,
}))

const today = todayInBaku()
const ITEMS: AgendaItem[] = [
  {
    type: 'NOTE',
    id: 5,
    startsAt: `${today}T05:00:00Z`,
    date: today,
    time: '09:00',
    title: 'İdman',
    subtitle: null,
    status: 'ACTIVE',
  },
  {
    type: 'APPOINTMENT',
    id: 1,
    startsAt: `${today}T08:00:00Z`,
    date: today,
    time: '12:00',
    title: 'Elvin Məmmədov',
    subtitle: 'Saç kəsimi',
    status: 'CONFIRMED',
  },
]

function mockApi() {
  client.api.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path.startsWith('/me/agenda')) return ITEMS
    if (init?.method === 'DELETE') return undefined
    return { id: 5 }
  })
}

describe('AgendaView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi()
  })
  afterEach(() => vi.useRealTimers())

  test('lists notes and appointments under their day', async () => {
    render(<AgendaView />)

    expect(await screen.findByText('İdman')).toBeInTheDocument()
    expect(screen.getByText('Saç kəsimi')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /^Bu gün, / }),
    ).toBeInTheDocument()
    // Only notes can be edited or deleted here.
    expect(screen.getAllByRole('button', { name: 'Sil' })).toHaveLength(1)
  })

  test('deleting hides the note and removes it after the undo window', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<AgendaView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bəli, sil' }))

    await waitFor(() =>
      expect(client.api).toHaveBeenCalledWith('/me/reminders/5', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      }),
    )
    expect(screen.queryByText('İdman')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Geri al' })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS + 10)
    })
    expect(client.api).toHaveBeenCalledWith('/me/reminders/5', {
      method: 'DELETE',
    })
    expect(
      screen.queryByRole('button', { name: 'Geri al' }),
    ).not.toBeInTheDocument()
  })

  test('undo restores the note instead of deleting it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<AgendaView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Bəli, sil' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Geri al' }))

    await waitFor(() =>
      expect(client.api).toHaveBeenCalledWith('/me/reminders/5', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' }),
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS + 10)
    })
    expect(client.api).not.toHaveBeenCalledWith('/me/reminders/5', {
      method: 'DELETE',
    })
    expect(await screen.findByText('İdman')).toBeInTheDocument()
  })
})
