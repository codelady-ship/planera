import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { InstallBanner } from './install-banner'

function mockMatchMedia(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('standalone') ? standalone : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function mockUserAgent(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
}

// Node 22+ ships its own localStorage stub that shadows jsdom's, so the
// tests bring a small in-memory one.
function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
}

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

const DAY = 24 * 60 * 60 * 1000

describe('InstallBanner', () => {
  beforeEach(() => {
    mockLocalStorage()
    mockMatchMedia(false)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('shows the Safari steps on iPhone and can be dismissed for two weeks', () => {
    mockUserAgent(IPHONE)
    render(<InstallBanner />)
    expect(
      screen.getByText('Planera-nı ana ekrana əlavə et'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ana ekrana əlavə et')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Quraşdır' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bağla' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(
      Number(window.localStorage.getItem('rv_install_dismissed_until')),
    ).toBeGreaterThan(Date.now() + 13 * DAY)
  })

  test('stays hidden on Android until the browser offers to install', async () => {
    mockUserAgent(ANDROID)
    render(<InstallBanner />)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    fireEvent(window, event)

    const button = await screen.findByRole('button', { name: 'Quraşdır' })
    fireEvent.click(button)
    expect(prompt).toHaveBeenCalledOnce()
    await vi.waitFor(() =>
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument(),
    )
  })

  test('renders nothing when already installed', () => {
    mockUserAgent(IPHONE)
    mockMatchMedia(true)
    render(<InstallBanner />)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
