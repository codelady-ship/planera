// Phone-size screenshots for the app stores (#67). Runs against a local
// production build (`npm run build && API_URL=... npx next start` in
// frontend/) so the account pages can be opened with the demo customer.
//
//   cd frontend && node scripts/store-screenshots.mjs [baseUrl]
//
// Output: docs/store/screenshots/<locale>/NN-name.png at Pixel 7 width
// (412x820 CSS px, 2.625x = 1082x2152), which both stores accept as phone screenshots.
import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const base = process.argv[2] ?? 'http://localhost:3000'
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)
const out = path.join(root, 'docs', 'store', 'screenshots')
const DEMO = { email: 'musteri@planera.az', password: 'Planera123' }

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'provider', path: '/providers/elvin-barber' },
  { name: 'booking', path: '/book/elvin-barber?service=1' },
  { name: 'agenda', path: '/account?tab=agenda', signedIn: true },
  { name: 'new-note', path: '/account?tab=agenda&new=1', signedIn: true },
  { name: 'notifications', path: '/account?tab=notifications', signedIn: true },
]

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? 'chrome',
})
for (const locale of ['az', 'en', 'ru']) {
  const prefix = locale === 'az' ? '' : `/${locale}`
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    // Play rejects a height over twice the width; Pixel 7 is 412x915, so trim the height.
    viewport: { width: 412, height: 820 },
    locale: locale === 'az' ? 'az-AZ' : locale,
    colorScheme: 'light',
  })
  const page = await context.newPage()
  // Sign in once per language; the session cookie lives in the context.
  await page.goto(`${base}${prefix}/login`, { waitUntil: 'networkidle' })
  // The form only works once React has hydrated.
  await page.waitForTimeout(1500)
  await page.getByLabel(/E-poçt|Email|Эл\. почта/).fill(DEMO.email)
  await page.getByLabel(/^Şifrə$|^Password$|^Пароль$/).fill(DEMO.password)
  await page.getByRole('button', { name: /Daxil ol|Sign in|Войти/ }).click()
  await page.waitForURL((u) => !u.pathname.includes('/login'))

  await mkdir(path.join(out, locale), { recursive: true })
  let n = 1
  for (const shot of PAGES) {
    await page.goto(`${base}${prefix}${shot.path}`, {
      waitUntil: 'networkidle',
    })
    // Let fonts and the agenda load settle.
    await page.waitForTimeout(800)
    const file = path.join(
      out,
      locale,
      `${String(n++).padStart(2, '0')}-${shot.name}.png`,
    )
    await page.screenshot({ path: file, fullPage: false })
    console.log(path.relative(root, file))
  }
  await context.close()
}
await browser.close()
