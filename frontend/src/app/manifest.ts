import type { MetadataRoute } from 'next'

// Web app manifest (#54): served at /manifest.webmanifest and linked from
// every page by Next.js. Colors come from docs/DESIGN.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Randevum',
    short_name: 'Randevum',
    description:
      'Vaxtını seç, rahatlığını yaşa. Bərbər, həkim, müəllim və digər xidmətlərə onlayn randevu.',
    lang: 'az',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f7fb',
    theme_color: '#072968',
    categories: ['business', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Xidmət axtar',
        url: '/search',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Randevularım',
        url: '/account',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
