import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ScrollScene } from './scroll-scene'

function setScroll(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
}

describe('ScrollScene', () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      value: 1000,
      configurable: true,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })
    setScroll(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('is decorative and hidden from assistive technology', () => {
    render(<ScrollScene />)
    expect(screen.getByTestId('scroll-scene')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  test('writes scroll progress and advances the day number', () => {
    render(<ScrollScene />)
    const scene = screen.getByTestId('scroll-scene')
    expect(scene.style.getPropertyValue('--p')).toBe('0.0000')
    expect(scene.textContent).toContain('1')

    setScroll(500)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(scene.style.getPropertyValue('--p')).toBe('0.5000')
    expect(scene.querySelector('text')?.textContent).toBe('16')
  })

  test('stays still when the user prefers reduced motion', () => {
    // jsdom has no matchMedia; define it for this test only.
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    render(<ScrollScene />)
    setScroll(500)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(
      screen.getByTestId('scroll-scene').style.getPropertyValue('--p'),
    ).toBe('')
  })
})
