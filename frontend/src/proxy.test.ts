// @vitest-environment node
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from './proxy'

const SITE = 'https://planera-az.vercel.app'
const ENGLISH = 'en-US,en;q=0.9'

function get(path: string, cookie?: string) {
  const headers = new Headers({ 'accept-language': ENGLISH })
  if (cookie) headers.set('cookie', cookie)
  return proxy(new NextRequest(`${SITE}${path}`, { headers }))
}

function location(response: Response) {
  const value = response.headers.get('location')
  return value
    ? new URL(value, SITE).pathname + new URL(value, SITE).search
    : null
}

function frameCookie(response: Response) {
  return response.headers
    .getSetCookie()
    .find((c) => c.startsWith('rv_locale_frame='))
}

/** The language next-intl serves for a plain URL: a rewrite to /<locale>/... or a redirect. */
function servedLocale(response: Response) {
  const rewrite = response.headers.get('x-middleware-rewrite')
  if (rewrite) return new URL(rewrite).pathname.split('/')[1]
  return location(response)?.split('/')[1] || 'az'
}

describe('proxy language (#144)', () => {
  it('without any choice an English browser still gets English at the plain URL', () => {
    expect(location(get('/'))).toBe('/en')
  })

  it('/az keeps Azerbaijani and remembers it for a frame too', () => {
    const response = get('/az')
    expect(location(response)).toBe('/')
    expect(response.headers.getSetCookie().join('\n')).toContain('rv_locale=az')
    const frame = frameCookie(response)
    expect(frame).toContain('rv_locale_frame=az')
    expect(frame).toMatch(/SameSite=none/i)
    expect(frame).toMatch(/Secure/)
    expect(frame).toMatch(/Partitioned/)
  })

  it('?lang=az goes to the Azerbaijani page and drops the parameter', () => {
    const response = get('/search?lang=az&q=berber')
    expect(location(response)).toBe('/az/search?q=berber')
    expect(frameCookie(response)).toContain('rv_locale_frame=az')
  })

  it('?lang=en and ?lang=ru go to their prefix; an unknown value is ignored', () => {
    expect(location(get('/?lang=en'))).toBe('/en')
    expect(location(get('/ru/search?lang=en'))).toBe('/en/search')
    expect(location(get('/?lang=de'))).toBe('/en?lang=de')
  })

  it('in a frame (no main cookie) a plain URL follows the frame choice, not the browser', () => {
    expect(servedLocale(get('/', 'rv_locale_frame=az'))).toBe('az')
    expect(servedLocale(get('/search', 'rv_locale_frame=az'))).toBe('az')
    expect(location(get('/', 'rv_locale_frame=ru'))).toBe('/ru')
  })

  it('the main cookie still wins over the frame copy', () => {
    expect(location(get('/', 'rv_locale=en; rv_locale_frame=az'))).toBe('/en')
  })

  it('the session guard still runs first', () => {
    expect(location(get('/panel', 'rv_locale_frame=az'))).toBe(
      '/login?next=%2Fpanel',
    )
  })
})
