const CACHE_NAME = 'warga-p2s-v3';
const STATIC_ASSETS = [
  '/manifest.json',
];

// Don't cache HTML pages - always fetch from network
const HTML_ROUTES = ['/', '/login', '/register', '/dashboard', '/iuran', '/tagihan', '/lapor', '/laporan-warga', '/lampiran', '/profil'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api/')) return;
  
  // For HTML pages, use network-first (don't serve stale cache)
  const isHtmlRoute = HTML_ROUTES.includes(url.pathname);
  if (isHtmlRoute) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      
      return cached || fetchPromise;
    })
  );
});
