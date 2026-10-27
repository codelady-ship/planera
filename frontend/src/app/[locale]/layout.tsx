import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import '../globals.css'
import { InstallBanner } from '@/features/pwa/install-banner'
import { ServiceWorkerRegistration } from '@/features/pwa/service-worker'
import { THEME_INIT_SCRIPT } from '@/features/theme/theme'
import { routing } from '@/i18n/routing'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext', 'cyrillic'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/** One static tree per language (#94). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    title: { default: t('title'), template: '%s | Planera' },
    applicationName: 'Planera',
    description: t('description'),
    appleWebApp: { capable: true, title: 'Planera', statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#072968' },
    { media: '(prefers-color-scheme: dark)', color: '#050f26' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      // The theme script may add .dark before hydration (#93).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {children}
          {/* usePathname() inside: streamed so the shell still prerenders. */}
          <Suspense>
            <InstallBanner />
          </Suspense>
          <ServiceWorkerRegistration />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
