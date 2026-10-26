import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { TimePicker } from './time-picker'

describe('TimePicker', () => {
  test('hour first, then minutes in five-minute steps', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TimePicker value={null} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Dəqiqə 30' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Saat 15' }))
    expect(onChange).toHaveBeenLastCalledWith('15:00')

    rerender(<TimePicker value="15:00" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dəqiqə 30' }))
    expect(onChange).toHaveBeenLastCalledWith('15:30')
    expect(screen.getAllByRole('button', { name: /^Dəqiqə/ })).toHaveLength(12)
  })
})
