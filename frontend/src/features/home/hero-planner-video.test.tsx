import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { HeroPlannerVideo } from './hero-planner-video'

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('HeroPlannerVideo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test('shows the placeholder poster while the clip is not ready', () => {
    stubReducedMotion(false)
    const { container } = render(<HeroPlannerVideo ready={false} />)
    const img = screen.getByRole('img', {
      name: 'Lövhəyə bərkidilmiş kağız gündəlik',
    })
    expect(img.getAttribute('src')).toContain('hero-planner-poster.jpg')
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByText(/Süni intellekt/)).toBeNull()
  })

  test('renders a lazy, muted, inline video with the poster first', () => {
    stubReducedMotion(false)
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const { container } = render(<HeroPlannerVideo ready />)
    const video = container.querySelector('video')!
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('poster', '/media/hero-planner-poster.jpg')
    expect(video).toHaveAttribute('preload', 'none')
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('playsinline')
    expect(video).not.toHaveAttribute('autoplay')
    // No IntersectionObserver in jsdom: the clip loads and starts at once.
    expect(container.querySelectorAll('source')).toHaveLength(2)
    expect(play).toHaveBeenCalled()
    expect(screen.getByText('Süni intellektlə yaradılmış video')).toBeVisible()

    fireEvent.ended(video)
    expect(
      screen.getByRole('button', { name: 'Videonu yenidən oynat' }),
    ).toBeVisible()
  })

  test('with reduced motion shows the final frame and never autoplays', () => {
    stubReducedMotion(true)
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    const { container } = render(<HeroPlannerVideo ready />)
    expect(container.querySelector('video')).toBeNull()
    expect(screen.getByRole('img').getAttribute('src')).toContain(
      'hero-planner-final.jpg',
    )
    expect(play).not.toHaveBeenCalled()

    // Playing stays possible on request.
    fireEvent.click(screen.getByRole('button', { name: 'Videonu oynat' }))
    expect(container.querySelector('video')).not.toBeNull()
  })

  test('supports a vertical 9:16 clip', () => {
    stubReducedMotion(false)
    render(<HeroPlannerVideo ready={false} aspect="9:16" />)
    expect(screen.getByTestId('hero-planner-video')).toHaveClass(
      'aspect-[9/16]',
    )
  })
})
