import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AccountView } from '@/features/account/account-view'
import { AlarmReader } from '@/features/diary/alarm-reader'
import { SiteFooter } from '@/features/home/site-footer'
import { SiteHeader } from '@/features/home/site-header'

export const metadata: Metadata = {
  title: 'Kabinetim',
  robots: { index: false },
}

/** Signed-in only: proxy.ts redirects visitors without a session to /login. */
export default function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <AccountView />
        <Suspense>
          <AlarmReader />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  )
}
