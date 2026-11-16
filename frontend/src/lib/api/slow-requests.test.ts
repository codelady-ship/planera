import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  SLOW_REQUEST_MS,
  slowCount,
  subscribeSlow,
  trackSlow,
} from './slow-requests'

describe('trackSlow', () => {
  afterEach(() => vi.useRealTimers())

  test('counts a request only while it is slower than the threshold', async () => {
    vi.useFakeTimers()
    const changes: number[] = []
    const unsubscribe = subscribeSlow(() => changes.push(slowCount()))
    let finish: (value: string) => void = () => {}
    const request = trackSlow(
      new Promise<string>((resolve) => (finish = resolve)),
    )

    vi.advanceTimersByTime(SLOW_REQUEST_MS - 1)
    expect(slowCount()).toBe(0)
    vi.advanceTimersByTime(1)
    expect(slowCount()).toBe(1)

    finish('ok')
    await expect(request).resolves.toBe('ok')
    expect(slowCount()).toBe(0)
    expect(changes).toEqual([1, 0])
    unsubscribe()
  })

  test('a fast request never shows the notice', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSlow(listener)
    await expect(trackSlow(Promise.resolve(42))).resolves.toBe(42)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })
})
