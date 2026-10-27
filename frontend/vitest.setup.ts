import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { createTranslator } from 'next-intl'
import { afterEach, vi } from 'vitest'
import az from './messages/az.json'

afterEach(() => cleanup())

// Components render outside a mounted App Router in unit tests; tests that
// care about navigation override these mocks.
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(window.location.search),
  notFound: () => {
    throw new Error('notFound')
  },
}))

// Locale-aware navigation (#94) behaves like plain Next navigation in tests.
vi.mock('@/i18n/navigation', async () => {
  const NextLink = (await import('next/link')).default
  return {
    Link: NextLink,
    useRouter: () => router,
    usePathname: () => '/',
    redirect: vi.fn(),
    getPathname: ({ href }: { href: string }) => href,
  }
})

// Texts come from the Azerbaijani messages, without a provider (#94).
const translator = (namespace?: string) =>
  createTranslator({
    locale: 'az',
    messages: az,
    namespace: namespace as never,
  })
vi.mock('next-intl', async () => {
  const actual = await vi.importActual<typeof import('next-intl')>('next-intl')
  return {
    ...actual,
    useTranslations: (namespace?: string) => translator(namespace),
    useLocale: () => 'az',
    useFormatter: () => actual.createFormatter({ locale: 'az' }),
  }
})
vi.mock('next-intl/server', () => ({
  getTranslations: async (arg?: string | { namespace?: string }) =>
    translator(typeof arg === 'string' ? arg : arg?.namespace),
  getLocale: async () => 'az',
  setRequestLocale: () => {},
}))

// No real network in unit tests: unmocked calls answer "signed out".
if (!vi.isMockFunction(globalThis.fetch)) {
  globalThis.fetch = vi.fn(async () => Response.json({ user: null }))
}
