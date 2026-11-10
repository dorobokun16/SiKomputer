/**
 * SiKomputer - Service Worker & Offline Cache Strategy
 * Memungkinkan aplikasi di-install permanen sebagai PWA dan dijalankan 100% offline di HP / Desktop
 * serta mendukung pembaruan versi otomatis melalui mekanisme SKIP_WAITING saat online.
 */

const CACHE_NAME = 'sikomputer-offline-v2'
const BASE_PATH = '/'
const u = (p) => (p === '/' ? BASE_PATH : `${BASE_PATH}${p.replace(/^\//, '')}`)

const PRECACHE_ASSETS = [
  u('/'),
  u('/index.html'),
  u('/logo.png'),
  u('/favicon.ico'),
  u('/favicon.png'),
  u('/favicon.svg'),
  u('/pwa-192.png'),
  u('/pwa-512.png'),
  u('/pwa-maskable-512.png'),
  u('/manifest.webmanifest'),
  u('/manifest.json'),
  /* __VITE_PRECACHE_ASSETS__ */
]

// 1. Install Event: Pra-cache seluruh aset inti & bundle halaman agar 100% siap offline seketika
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Cache satu per satu agar jika ada aset opsional tidak membatalkan pra-cache lainnya
        return Promise.allSettled(
          PRECACHE_ASSETS.map((assetUrl) =>
            cache.add(new Request(assetUrl, { cache: 'reload' }))
          )
        )
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Precache notice:', err))
  )
})

// Pesan kontrol dari aplikasi (misalnya saat user klik "Terapkan Pembaruan")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// 2. Activate Event: Bersihkan cache versi lama & klaim client segera
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Menghapus cache usang:', name)
              return caches.delete(name)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Tangani request same-origin untuk aset aplikasi; biarkan version.json, API eksternal & launcher bypass cache
self.addEventListener('fetch', (event) => {
  const req = event.request

  // Hanya proses permintaan GET
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Abaikan skema non-http, permintaan lintas-origin (GitHub API, API Tester), endpoint launcher, version.json, dan folder /downloads/
  if (!url.protocol.startsWith('http')) return
  if (url.origin !== self.location.origin) return
  if (url.pathname.includes('/downloads/')) return
  if (url.pathname.includes('/__launcher/')) return
  if (url.pathname.endsWith('/version.json') || url.pathname === u('/version.json')) return

  // A. Permintaan Navigasi Halaman SPA
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return response
        })
        .catch(async () => {
          const cachedIndex = await caches.match(u('/index.html'))
          if (cachedIndex) return cachedIndex
          const cachedReq = await caches.match(req)
          if (cachedReq) return cachedReq
          return new Response('SiKomputer Offline: Aplikasi siap dibuka.', {
            headers: { 'Content-Type': 'text/html' },
          })
        })
    )
    return
  }

  // B. Permintaan Aset Statis Same-Origin (JS, MJS Worker, CSS, Font WOFF2, PNG, ICO, SVG)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse))
            }
          })
          .catch(() => {
            // Offline - gunakan cache yang sudah ada
          })
        return cachedResponse
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return networkResponse
        })
        .catch(() => {
          if (req.destination === 'image') {
            return caches.match(u('/logo.png'))
          }
          return new Response('', { status: 503, statusText: 'Offline' })
        })
    })
  )
})

// 4. Interaksi Notifikasi (Buka aplikasi saat notifikasi di-klik di HP/Desktop)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(u('/'))
      }
    })
  )
})
