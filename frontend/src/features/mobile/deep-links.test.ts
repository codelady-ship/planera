import { beforeEach, describe, expect, test, vi } from 'vitest'

const app = vi.hoisted(() => ({
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
}))
const native = vi.hoisted(() => ({
  isNativeApp: vi.fn().mockReturnValue(true),
}))
vi.mock('@capacitor/app', () => ({ App: app }))
vi.mock('./native-alarms', () => native)

import { listenForDeepLinks, pathForDeepLink } from './deep-links'

describe('deep links', () => {
  beforeEach(() => vi.clearAllMocks())

  test('the new-note link opens the diary wizard with the text prefilled', () => {
    expect(pathForDeepLink('randevum://reminder/new')).toBe(
      '/account?tab=agenda&new=1',
    )
    expect(
      pathForDeepLink(
        'randevum://reminder/new?text=h%C9%99kim%C9%99%20getm%C9%99k',
      ),
    ).toBe('/account?tab=agenda&new=1&text=h%C9%99kim%C9%99+getm%C9%99k')
    expect(pathForDeepLink('randevum://agenda')).toBe('/account?tab=agenda')
  })

  test('other links are ignored', () => {
    expect(pathForDeepLink('https://randevum-seven.vercel.app/')).toBeNull()
    expect(pathForDeepLink('randevum://settings')).toBeNull()
    expect(pathForDeepLink('not a url')).toBeNull()
  })

  test('the launch link and later links both open the diary', async () => {
    let handler: (event: { url: string }) => void = () => {}
    app.addListener.mockImplementation(
      async (_: string, fn: typeof handler) => {
        handler = fn
        return { remove: vi.fn() }
      },
    )
    app.getLaunchUrl.mockResolvedValue({
      url: 'randevum://reminder/new?text=idman',
    })
    const open = vi.fn()
    await listenForDeepLinks(open)
    expect(open).toHaveBeenCalledWith('/account?tab=agenda&new=1&text=idman')
    handler({ url: 'randevum://agenda' })
    expect(open).toHaveBeenLastCalledWith('/account?tab=agenda')
  })
})
