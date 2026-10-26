// Randevum service worker (#54).
// - Pages: network first, the cached copy or /offline when the network fails.
// - Build assets, brand images and icons: cache first (their URLs are hashed
//   or change rarely).
// - API calls are never cached: appointments must always be fresh.
// - Push events show a notification (#55 sends them).
const VERSION = 'randevum-v1'
const OFFLINE_URL = '/offline'
const PRECACHE = [
  OFFLINE_URL,
  '/brand/randevum-wordmark.png',
  '/brand/randevum-mark.png',
  '/icons/icon-192.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname.startsWith('/icons/')
  )
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached || cache.match(OFFLINE_URL)
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Randevum'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/account' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin,
  )
  // The page reads the sentence aloud (#62).
  if (event.notification.body)
    target.searchParams.set('say', event.notification.body)
  const url = target.href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((w) => w.url === url && 'focus' in w)
        if (open) return open.focus()
        const any = windows.find((w) => 'navigate' in w)
        if (any) return any.navigate(url).then((w) => w && w.focus())
        return self.clients.openWindow(url)
      }),
  )
})
