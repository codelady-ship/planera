import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { TimePicker } from './time-picker'

describe('TimePicker', () => {
  test('two wheels: tapping a row picks it, minutes keep the hour', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TimePicker value={null} onChange={onChange} />)

    expect(screen.getByRole('listbox', { name: 'Saat' })).toBeInTheDocument()
    expect(screen.getAllByRole('option', { name: /^Dəqiqə/ })).toHaveLength(12)

    fireEvent.click(screen.getByRole('option', { name: 'Saat 15' }))
    expect(onChange).toHaveBeenLastCalledWith('15:00')

    rerender(<TimePicker value="15:00" onChange={onChange} />)
    expect(screen.getByRole('option', { name: 'Saat 15' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.click(screen.getByRole('option', { name: 'Dəqiqə 30' }))
    expect(onChange).toHaveBeenLastCalledWith('15:30')
  })

  test('scrolling a wheel to a row picks that row once it settles', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<TimePicker value="15:00" onChange={onChange} />)

    const minutes = screen.getByRole('listbox', { name: 'Dəqiqə' })
    // Row height is 44px: row 6 is "30".
    Object.defineProperty(minutes, 'scrollTop', {
      value: 6 * 44,
      writable: true,
    })
    fireEvent.scroll(minutes)
    vi.advanceTimersByTime(200)

    expect(onChange).toHaveBeenLastCalledWith('15:30')
    vi.useRealTimers()
  })
})
