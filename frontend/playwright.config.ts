import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run in CI against the built site and a real API
// (.github/workflows/ci.yml, job e2e). Locally: start both, then
// `npm run e2e`.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'az-AZ',
    timezoneId: 'Asia/Baku',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      // PW_CHANNEL=chrome reuses an installed Chrome instead of a download.
      use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL },
    },
  ],
})
