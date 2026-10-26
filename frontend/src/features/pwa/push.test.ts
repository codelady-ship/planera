import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  deviceLabel,
  disablePush,
  enablePush,
  getPushStatus,
  urlBase64ToUint8Array,
} from './push'

const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('urlBase64ToUint8Array', () => {
  test('decodes a VAPID key without padding', () => {
    const bytes = urlBase64ToUint8Array(
      'BAoEL5HIQMTiUgReNfYCOlWy-ylIJsfTQT0mhEjmi64-n0sqDjQzEUFRtXEoeY6A6SjzxQTsbOHs5JyB34Qxs_g',
    )
    expect(bytes).toHaveLength(65)
    expect(bytes[0]).toBe(4)
  })
})

describe('deviceLabel', () => {
  test('names the platform and browser', () => {
    expect(deviceLabel(ANDROID)).toBe('Android Chrome')
    expect(
      deviceLabel(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iPhone Safari')
    expect(
      deviceLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
      ),
    ).toBe('Windows Edge')
  })
})

describe('push subscription flow', () => {
  const subscription = {
    endpoint: 'https://push.example/abc',
    toJSON: () => ({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p', auth: 'a' },
    }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
  const pushManager = {
    getSubscription: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(subscription),
  }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID)
    vi.stubGlobal('PushManager', function PushManager() {})
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({ pushManager }),
        register: vi.fn(),
      },
    })
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/push/public-key')) {
        return Response.json({ publicKey: 'BAoE' })
      }
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      return Response.json({ id: 1, device: 'Android Chrome' }, { status: 201 })
    })
    vi.stubGlobal('fetch', fetchMock)
    pushManager.getSubscription.mockResolvedValue(null)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    // @ts-expect-error test cleanup of the stubbed property
    delete navigator.serviceWorker
  })

  test('status is off before subscribing and on afterwards', async () => {
    expect(await getPushStatus()).toBe('off')
    pushManager.getSubscription.mockResolvedValue(subscription)
    expect(await getPushStatus()).toBe('on')
  })

  test('enabling asks permission, subscribes with the server key and stores the device', async () => {
    expect(await enablePush()).toBe('on')

    expect(Notification.requestPermission).toHaveBeenCalledOnce()
    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    )
    const post = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === 'POST',
    )!
    expect(post[0]).toBe('/api/backend/me/push-subscriptions')
    expect(JSON.parse(String((post[1] as RequestInit).body))).toEqual({
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p', auth: 'a' },
      device: 'Android Chrome',
    })
  })

  test('a refused permission subscribes nothing', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('denied')
    expect(await enablePush()).toBe('denied')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })

  test('disabling deletes the device on the server, then in the browser', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription)
    expect(await disablePush()).toBe('off')

    const del = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === 'DELETE',
    )!
    expect(del[0]).toBe(
      '/api/backend/me/push-subscriptions?endpoint=https%3A%2F%2Fpush.example%2Fabc',
    )
    expect(subscription.unsubscribe).toHaveBeenCalledOnce()
  })
})
