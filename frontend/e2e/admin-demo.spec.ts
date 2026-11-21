import { expect, test, type Page } from '@playwright/test'

// Read-only demo admin for the owner's portfolio: one-click login, the
// "Demo mode" strip, writes refused by the API, framing only by the
// portfolio, and the panel inside the portfolio's cross-site iframe.

// The stub portfolio below is a "public" https page framing the local site;
// Chromium's Local Network Access check would block that in CI only.
test.use({
  launchOptions: {
    args: [
      '--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults',
    ],
  },
})

const PORTFOLIO = 'https://antiqa-portfolio.vercel.app'
const DEMO_STRIP = 'Demo rejimi: dəyişikliklər saxlanmır'
const SCREENS = 'test-results/screens'

async function signInAsDemo(page: Page) {
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/login\?next=%2Fpanel/)
  await page.getByRole('button', { name: 'Demo admin kimi bax' }).click()
  await expect(page.getByText(DEMO_STRIP)).toBeVisible()
}

test('the demo admin reads the panel but cannot change anything', async ({
  page,
}) => {
  await signInAsDemo(page)
  const response = await page.request.patch('/api/backend/me', {
    data: { fullName: 'Changed by a visitor' },
  })
  expect(response.status()).toBe(403)
  expect((await response.json()).detail).toContain('Demo rejimi')

  const me = await page.request.get('/api/backend/me')
  expect((await me.json()).fullName).toBe('Demo Admin')

  const cookies = await page.context().cookies()
  const refresh = cookies.find((c) => c.name === 'rv_demo_rt')
  expect(refresh?.sameSite).toBe('None')
  expect(refresh?.secure).toBe(true)
  // The demo never touches the cookie names of real accounts.
  expect(cookies.some((c) => c.name === 'rv_rt' || c.name === 'rv_at')).toBe(
    false,
  )
})

// A real admin who tries the demo button and then logs out must not stay
// signed in behind it: the demo login ends the real session (cookies and
// refresh token), and logout clears and revokes whatever is left.
test('real login, demo login, logout: nobody stays signed in', async ({
  page,
  request,
}) => {
  const api = process.env.E2E_API_URL ?? 'http://localhost:8080'
  const sessionCookies = async () =>
    (await page.context().cookies()).filter((c) =>
      ['rv_at', 'rv_rt', 'rv_demo_at', 'rv_demo_rt'].includes(c.name),
    )
  const signedInAs = () =>
    page.evaluate(async () => {
      const response = await fetch('/api/auth/session', { cache: 'no-store' })
      return ((await response.json()).user?.email as string) ?? null
    })

  await page.goto('/login')
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@planera.az',
        password: 'Planera123',
      }),
    })
    return response.status
  })
  expect(status).toBe(200)
  expect(await signedInAs()).toBe('admin@planera.az')
  const real = await sessionCookies()
  expect(real.map((c) => c.name).sort()).toEqual(['rv_at', 'rv_rt'])
  // A real session never gets the relaxed cookie.
  for (const cookie of real) expect(cookie.sameSite).toBe('Lax')
  const realRefresh = real.find((c) => c.name === 'rv_rt')!.value

  await page.goto('/login')
  await page.getByRole('button', { name: 'Demo admin kimi bax' }).click()
  await expect(page.getByText(DEMO_STRIP)).toBeVisible()
  expect(await signedInAs()).toBe('demo@planera.az')
  const demo = await sessionCookies()
  expect(demo.map((c) => c.name).sort()).toEqual(['rv_demo_at', 'rv_demo_rt'])
  for (const cookie of demo) expect(cookie.sameSite).toBe('None')

  const loggedOut = await page.evaluate(async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    return response.status
  })
  expect(loggedOut).toBe(204)
  expect(await sessionCookies()).toEqual([])
  expect(await signedInAs()).toBeNull()
  await page.goto('/panel')
  await expect(page).toHaveURL(/\/login\?next=%2Fpanel/)

  // The real refresh token is dead in the API, not only forgotten by the
  // browser. (The demo one is not replayed here: the API answers a replayed
  // token by ending every session of that account, other tests' included.)
  const refreshed = await request.post(`${api}/api/auth/refresh`, {
    data: { refreshToken: realRefresh },
  })
  expect(refreshed.status()).toBe(401)
})

test('only the site and the portfolio may frame the pages', async ({
  request,
}) => {
  const login = await request.get('/login')
  const csp = login.headers()['content-security-policy']
  expect(csp).toBe(
    "frame-ancestors 'self' https://antiqa-portfolio.vercel.app https://antiqacode.vercel.app",
  )
  expect(login.headers()['x-frame-options']).toBeUndefined()
})

test('the demo admin works inside the portfolio iframe', async ({
  page,
  baseURL,
}) => {
  // The portfolio is a stub page with the same iframe attributes it uses.
  await page.route(`${PORTFOLIO}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body style="margin:0"><iframe id="admin"
        src="${baseURL}/panel" style="width:100%;height:100vh;border:0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerpolicy="no-referrer"></iframe></body>`,
    }),
  )
  await page.setViewportSize({ width: 820, height: 900 })
  await page.goto(`${PORTFOLIO}/`)
  const frame = page.frameLocator('#admin')
  await frame.getByRole('button', { name: 'Demo admin kimi bax' }).click()
  await expect(frame.getByText(DEMO_STRIP)).toBeVisible()
  await expect(
    frame.getByRole('heading', { name: 'Ümumi baxış' }),
  ).toBeVisible()
  await page.screenshot({ path: `${SCREENS}/iframe-820.png` })
})

// One sign-in for all widths: logins are rate limited per e-mail.
test('the demo panel fits 390, 768 and 1440px without horizontal scroll', async ({
  page,
}) => {
  await signInAsDemo(page)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of ['/panel', '/panel/appointments']) {
      await page.goto(path)
      await expect(page.getByText(DEMO_STRIP)).toBeVisible()
      await page.waitForTimeout(1000)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0)
      const name = path === '/panel' ? 'panel' : 'appointments'
      await page.screenshot({
        path: `${SCREENS}/${name}-${width}.png`,
        fullPage: true,
      })
    }
    if (width === 390) {
      await page.getByRole('button', { name: 'Menyunu aç və ya bağla' }).click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENS}/drawer-390.png` })
      await page.keyboard.press('Escape')
    }
  }
})
