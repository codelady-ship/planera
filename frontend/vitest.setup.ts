import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

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
}))

// No real network in unit tests: unmocked calls answer "signed out".
if (!vi.isMockFunction(globalThis.fetch)) {
  globalThis.fetch = vi.fn(async () => Response.json({ user: null }))
}
