import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { InstallBanner } from '@/features/pwa/install-banner'
import { ServiceWorkerRegistration } from '@/features/pwa/service-worker'
import { THEME_INIT_SCRIPT } from '@/features/theme/theme'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Randevum - Vaxtını seç, rahatlığını yaşa',
    template: '%s | Randevum',
  },
  applicationName: 'Randevum',
  description:
    'Bərbər, həkim, müəllim və digər xidmətlər üçün boş saatı seçin və randevunu bir neçə kliklə götürün.',
  appleWebApp: {
    capable: true,
    title: 'Randevum',
    statusBarStyle: 'default',
  },
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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="az"
      // The theme script may add .dark before hydration (#93).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        {/* usePathname() inside: streamed so the shell still prerenders. */}
        <Suspense>
          <InstallBanner />
        </Suspense>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
