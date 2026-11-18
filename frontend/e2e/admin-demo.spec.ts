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
  const refresh = cookies.find((c) => c.name === 'rv_rt')
  expect(refresh?.sameSite).toBe('None')
  expect(refresh?.secure).toBe(true)
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
