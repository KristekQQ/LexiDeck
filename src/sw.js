const CACHE_NAME = 'CACHE_V1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/src/styles.css',
        '/src/main.js'
      ]).catch(() => {})
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  )
  self.clients.claim()
})

function isStatic(req) {
  const dest = req.destination
  return ['document', 'script', 'style', 'image', 'font', 'manifest'].includes(dest)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Cache-first for static assets
  if (isStatic(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(request, copy))
          return res
        }).catch(() => cached)
      })
    )
    return
  }

  // Stale-while-revalidate for Excel files
  if (new URL(request.url).pathname.endsWith('.xlsx')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request).then((res) => {
          if (res && res.ok) cache.put(request, res.clone())
          return res
        }).catch(() => null)
        return cached || network
      })
    )
    return
  }

  // Default: network
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
