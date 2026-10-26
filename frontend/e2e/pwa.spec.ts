import { expect, test } from '@playwright/test'

// The site is installable (#54): manifest, service worker and offline page.
test('serves the manifest, the service worker and the offline page', async ({
  page,
  request,
}) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  const json = await manifest.json()
  expect(json.name).toBe('Randevum')
  expect(json.display).toBe('standalone')
  expect(
    json.icons.some((i: { purpose?: string }) => i.purpose === 'maskable'),
  ).toBe(true)

  const sw = await request.get('/sw.js')
  expect(sw.ok()).toBe(true)
  expect(sw.headers()['content-type']).toContain('javascript')
  expect(sw.headers()['cache-control']).toContain('no-cache')

  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/,
  )
  // One theme-color per colour scheme (#93).
  await expect(
    page.locator('meta[name="theme-color"][media*="light"]'),
  ).toHaveAttribute('content', '#072968')

  await page.goto('/offline')
  await expect(
    page.getByRole('heading', { name: 'İnternet bağlantısı yoxdur' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Yenidən yoxla' }),
  ).toBeVisible()
})

test('the service worker shows the offline page when the network is gone', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)

  await context.setOffline(true)
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'İnternet bağlantısı yoxdur' }),
  ).toBeVisible()
  await context.setOffline(false)
})
