// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TokenResponse } from '@/lib/api/types'

type Options = {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: string
  partitioned?: boolean
  path?: string
  maxAge?: number
}

/** The browser's cookie jar as the route handlers see and change it. */
class Jar {
  cookies = new Map<string, { value: string; options: Options }>()
  written: { name: string; value: string; options: Options }[] = []

  get(name: string) {
    const cookie = this.cookies.get(name)
    return cookie ? { name, value: cookie.value } : undefined
  }
  has(name: string) {
    return this.cookies.has(name)
  }
  set(name: string, value: string, options: Options = {}) {
    this.written.push({ name, value, options })
    if (options.maxAge === 0) this.cookies.delete(name)
    else this.cookies.set(name, { value, options })
  }
  delete(name: string) {
    this.set(name, '', { maxAge: 0 })
  }
  names() {
    return [...this.cookies.keys()].sort()
  }
}

/** A stand-in for the API: logins, rotating refresh tokens, revocation, /api/me. */
class Api {
  private n = 0
  live = new Map<string, { email: string; demo: boolean }>()
  access = new Map<string, { email: string; demo: boolean }>()
  revoked: string[] = []

  issue(email: string, demo: boolean): TokenResponse {
    this.n += 1
    const refreshToken = `refresh-${this.n}`
    const accessToken = `access-${this.n}`
    this.live.set(refreshToken, { email, demo })
    this.access.set(accessToken, { email, demo })
    return {
      accessToken,
      expiresIn: 900,
      refreshToken,
      user: { id: demo ? 3 : 1, email, fullName: email, role: 'ADMIN', demo },
    } as unknown as TokenResponse
  }

  fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const path = new URL(String(input)).pathname
    const body = init.body ? JSON.parse(String(init.body)) : {}
    if (path === '/api/auth/logout') {
      this.revoked.push(body.refreshToken)
      this.live.delete(body.refreshToken)
      return new Response(null, { status: 204 })
    }
    if (path === '/api/auth/refresh') {
      const owner = this.live.get(body.refreshToken)
      if (!owner) return Response.json({ status: 401 }, { status: 401 })
      this.live.delete(body.refreshToken)
      return Response.json(this.issue(owner.email, owner.demo))
    }
    if (path === '/api/me') {
      const bearer = new Headers(init.headers).get('Authorization')
      const owner = bearer && this.access.get(bearer.replace('Bearer ', ''))
      if (!owner) return Response.json({ status: 401 }, { status: 401 })
      return Response.json({ email: owner.email, demo: owner.demo })
    }
    throw new Error(`unexpected call to ${path}`)
  }
}

let jar: Jar
let api: Api

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => jar,
  headers: async () => new Headers(),
}))
vi.mock('@/lib/i18n/request-locale', () => ({
  requestLocale: async () => 'az',
}))

type Store = Parameters<typeof import('./session').storeTokens>[0]
const store = () => jar as unknown as Store

async function session() {
  return import('./session')
}

/** Who /api/auth/session would answer with: the e-mail or null. */
async function whoAmI(): Promise<string | null> {
  const { fetchAsUser, hasSession } = await session()
  if (!hasSession(store())) return null
  const response = await fetchAsUser('/api/me')
  return response.ok ? (await response.json()).email : null
}

async function login(email: string, demo: boolean) {
  const { storeTokens } = await session()
  const tokens = api.issue(email, demo)
  await storeTokens(store(), tokens)
  return tokens
}

const REAL = 'admin@planera.az'
const DEMO = 'demo@planera.az'

beforeEach(() => {
  jar = new Jar()
  api = new Api()
  vi.stubEnv('API_URL', 'http://api.test')
  vi.stubGlobal('fetch', vi.fn(api.fetch))
})

describe('session cookies', () => {
  it('a real account gets SameSite=Lax cookies and never the relaxed ones', async () => {
    await login(REAL, false)
    expect(jar.names()).toEqual(['rv_at', 'rv_rt'])
    for (const cookie of jar.cookies.values()) {
      expect(cookie.options.sameSite).toBe('lax')
      expect(cookie.options.partitioned).toBeUndefined()
      expect(cookie.options.httpOnly).toBe(true)
    }
    // Rotating the refresh token keeps it that way.
    jar.cookies.delete('rv_at')
    expect(await whoAmI()).toBe(REAL)
    expect(jar.names()).toEqual(['rv_at', 'rv_rt'])
    expect(
      jar.written.filter((c) => c.value !== '' && c.options.sameSite !== 'lax'),
    ).toEqual([])
  })

  it('the demo account gets its own partitioned cookies', async () => {
    await login(DEMO, true)
    expect(jar.names()).toEqual(['rv_demo_at', 'rv_demo_rt'])
    for (const cookie of jar.cookies.values()) {
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        partitioned: true,
      })
    }
    expect(await whoAmI()).toBe(DEMO)
  })

  it('real login, then demo login, then logout: nobody is signed in and both tokens are revoked', async () => {
    const real = await login(REAL, false)
    expect(await whoAmI()).toBe(REAL)

    const demo = await login(DEMO, true)
    // The demo login ended the real session: its cookies are gone and its
    // refresh token is revoked in the API, it cannot come back later.
    expect(jar.names()).toEqual(['rv_demo_at', 'rv_demo_rt'])
    expect(api.revoked).toEqual([real.refreshToken])
    expect(await whoAmI()).toBe(DEMO)

    const { endSession } = await session()
    await endSession(store())
    expect(jar.names()).toEqual([])
    expect(api.revoked).toEqual([real.refreshToken, demo.refreshToken])
    expect(api.live.size).toBe(0)
    expect(await whoAmI()).toBeNull()
  })

  it('demo login, then real login, then logout: the same', async () => {
    const demo = await login(DEMO, true)
    await login(REAL, false)
    expect(jar.names()).toEqual(['rv_at', 'rv_rt'])
    expect(api.revoked).toEqual([demo.refreshToken])
    expect(await whoAmI()).toBe(REAL)

    const { endSession } = await session()
    await endSession(store())
    expect(jar.names()).toEqual([])
    expect(api.live.size).toBe(0)
    expect(await whoAmI()).toBeNull()
  })

  it('logout clears and revokes both kinds even when both are in the jar', async () => {
    // A jar no login can produce any more; logout must still leave nothing.
    const real = api.issue(REAL, false)
    const demo = api.issue(DEMO, true)
    jar.cookies.set('rv_at', { value: real.accessToken, options: {} })
    jar.cookies.set('rv_rt', { value: real.refreshToken, options: {} })
    jar.cookies.set('rv_demo_at', { value: demo.accessToken, options: {} })
    jar.cookies.set('rv_demo_rt', { value: demo.refreshToken, options: {} })
    // The real session answers, never the demo one in its place.
    expect(await whoAmI()).toBe(REAL)

    const { endSession } = await session()
    await endSession(store())
    expect(jar.names()).toEqual([])
    expect(api.revoked.sort()).toEqual(
      [real.refreshToken, demo.refreshToken].sort(),
    )
    // Each kind is removed with its own attributes (a partitioned cookie
    // only goes away with a partitioned one).
    const removed = jar.written.filter((c) => c.options.maxAge === 0)
    expect(removed.map((c) => c.name).sort()).toEqual([
      'rv_at',
      'rv_demo_at',
      'rv_demo_rt',
      'rv_rt',
    ])
    for (const cookie of removed) {
      const demoKind = cookie.name.startsWith('rv_demo_')
      expect(cookie.options.partitioned).toBe(demoKind ? true : undefined)
      expect(cookie.options.sameSite).toBe(demoKind ? 'none' : 'lax')
    }
  })

  it('logout removes the cookies even when the API cannot be reached', async () => {
    await login(REAL, false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline')
      }),
    )
    const { endSession } = await session()
    await endSession(store())
    expect(jar.names()).toEqual([])
  })

  it('a dead real session does not leave its cookies behind', async () => {
    const real = await login(REAL, false)
    api.live.delete(real.refreshToken)
    api.access.clear()
    expect(await whoAmI()).toBeNull()
    expect(jar.names()).toEqual([])
  })
})
