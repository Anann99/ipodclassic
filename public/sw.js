// Offline play. Built assets have hashed names, so they are cached forever; everything else
// is fetched fresh and falls back to the cache when offline.
const CACHE = 'classic'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname === '/ws') {
    return
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      if (url.pathname.startsWith('/assets/')) {
        const hit = await cache.match(event.request)
        if (hit) return hit
      }
      try {
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      } catch {
        const hit = await cache.match(event.request, { ignoreSearch: true })
        return hit ?? (await cache.match('/')) ?? Response.error()
      }
    })(),
  )
})
