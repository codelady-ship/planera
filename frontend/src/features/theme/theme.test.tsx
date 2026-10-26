import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { applyTheme, getTheme, setTheme, THEME_INIT_SCRIPT } from './theme'
import { ThemeChoice, ThemeToggle } from './theme-toggle'

function mockEnvironment(systemDark: boolean) {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: systemDark && query.includes('dark'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

describe('theme', () => {
  beforeEach(() => mockEnvironment(true))
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
  })

  test('system follows the OS, a choice is remembered and applied to <html>', () => {
    expect(getTheme()).toBe('system')
    applyTheme()
    expect(document.documentElement).toHaveClass('dark')

    setTheme('light')
    expect(getTheme()).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('light')

    setTheme('system')
    expect(localStorage.getItem('rv_theme')).toBeNull()
    expect(document.documentElement).toHaveClass('dark')
  })

  test('the toggle cycles system, day, night', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /^Rejim: Sistem/ })
    fireEvent.click(button)
    expect(
      screen.getByRole('button', { name: /^Rejim: Gündüz/ }),
    ).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
    fireEvent.click(screen.getByRole('button', { name: /^Rejim: Gündüz/ }))
    expect(
      screen.getByRole('button', { name: /^Rejim: Gecə/ }),
    ).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })

  test('the choice group marks the current theme', () => {
    setTheme('dark')
    render(<ThemeChoice />)
    expect(screen.getByRole('radio', { name: 'Gecə' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Gündüz' }))
    expect(getTheme()).toBe('light')
  })

  test('the inline script sets the class before React runs', () => {
    localStorage.setItem('rv_theme', 'dark')
    new Function(THEME_INIT_SCRIPT)()
    expect(document.documentElement).toHaveClass('dark')
  })
})
