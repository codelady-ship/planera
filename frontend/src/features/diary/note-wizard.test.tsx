import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { PersonalNote } from '@/lib/api/types'
import { addDays, todayInBaku } from '@/lib/dates'
import { NoteWizard } from './note-wizard'

const client = vi.hoisted(() => ({
  api: vi.fn(),
  ApiError: class ApiError extends Error {},
}))
vi.mock('@/lib/api/client', () => client)

const tomorrow = addDays(todayInBaku(), 1)

describe('NoteWizard', () => {
  beforeEach(() => vi.clearAllMocks())

  test('date, time, text and reminders in order; going back keeps the choices', async () => {
    client.api.mockResolvedValue({ id: 9 })
    const onSaved = vi.fn()
    render(<NoteWizard onClose={() => {}} onSaved={onSaved} />)

    expect(screen.getByText('Tarix seçilməyib')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: tomorrow }))

    // Step 2: the time.
    fireEvent.click(screen.getByRole('button', { name: 'Saat 15' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dəqiqə 30' }))
    expect(screen.getByText('15:30')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))

    // Step 3: the text; back and forward keeps it.
    fireEvent.change(screen.getByLabelText('Qeyd'), {
      target: { value: 'Həkimə getmək' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }))
    expect(screen.getByRole('button', { name: 'Saat 15' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))
    expect(screen.getByLabelText('Qeyd')).toHaveValue('Həkimə getmək')
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))

    // Step 4: at the time by default, plus an hour before.
    expect(
      screen.getByRole('checkbox', { name: 'Qeyd saatında' }),
    ).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('checkbox', { name: '1 saat əvvəl' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(client.api).toHaveBeenCalledWith('/me/reminders', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Həkimə getmək',
        note: null,
        date: tomorrow,
        time: '15:30',
        reminderOffsets: [60, 0],
        source: 'MANUAL',
      }),
    })
  })

  test('editing opens with the existing values and patches', async () => {
    const existing: PersonalNote = {
      id: 4,
      title: 'İdman',
      note: 'Zal',
      date: tomorrow,
      time: '08:00',
      startsAt: `${tomorrow}T04:00:00Z`,
      reminderOffsets: [15, 0],
      source: 'VOICE',
      status: 'ACTIVE',
    }
    client.api.mockResolvedValue(existing)
    render(
      <NoteWizard initial={existing} onClose={() => {}} onSaved={() => {}} />,
    )

    expect(screen.getByText('Qeydi redaktə et')).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))
    expect(screen.getByLabelText('Qeyd')).toHaveValue('İdman')
    fireEvent.click(screen.getByRole('button', { name: 'Davam et' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() =>
      expect(client.api).toHaveBeenCalledWith(
        '/me/reminders/4',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
  })
})
