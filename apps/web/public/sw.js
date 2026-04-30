const CACHE_VERSION = 'plateiq-shell-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-192.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-light.png',
  '/apple-touch-icon-dark.png',
  '/favicon.ico',
  '/favicon-light-32x32.png',
  '/favicon-light-16x16.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/',
  '/continue',
  '/gym',
  '/legal',
];

const PUBLIC_DOCUMENTS = new Set(['/', '/continue', '/gym', '/legal']);
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);
const NEXT_STATIC_ASSET_PATTERN = /(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => precacheShell(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function handleNavigation(request, url) {
  const publicDocumentPath = getPublicDocumentPath(url.pathname);

  if (publicDocumentPath) {
    return networkFirst(request, true, publicDocumentPath);
  }

  try {
    return await fetch(request);
  } catch {
    return caches.match(OFFLINE_URL);
  }
}

function getPublicDocumentPath(pathname) {
  if (PUBLIC_DOCUMENTS.has(pathname)) {
    return pathname;
  }

  if (pathname !== '/' && pathname.endsWith('/')) {
    const normalizedPathname = pathname.slice(0, -1);

    if (PUBLIC_DOCUMENTS.has(normalizedPathname)) {
      return normalizedPathname;
    }
  }

  return null;
}

async function precacheShell(cache) {
  await cache.addAll(PRECACHE_URLS);

  try {
    const response = await fetch('/gym', { credentials: 'same-origin' });

    if (!response.ok) {
      return;
    }

    await cache.put('/gym', response.clone());
    const html = await response.text();
    const assetUrls = Array.from(html.matchAll(NEXT_STATIC_ASSET_PATTERN))
      .map((match) => match[1])
      .filter((assetUrl) => typeof assetUrl === 'string')
      .map((assetUrl) => new URL(assetUrl, self.location.origin))
      .filter((assetUrl) => assetUrl.origin === self.location.origin)
      .map((assetUrl) => assetUrl.pathname + assetUrl.search);

    if (assetUrls.length > 0) {
      await cache.addAll(Array.from(new Set(assetUrls)));
    }
  } catch {
    // The generic offline page still covers install-time cache misses.
  }
}

async function networkFirst(request, shouldCache, fallbackPath) {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);

    if (shouldCache && response.ok) {
      void cache.put(request, response.clone());

      if (fallbackPath) {
        void cache.put(fallbackPath, response.clone());
      }
    }

    return response;
  } catch {
    const cachedResponse = await cache.match(request);
    const fallbackResponse = fallbackPath ? await cache.match(fallbackPath) : null;

    return cachedResponse || fallbackResponse || caches.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => undefined);

  return cachedResponse || networkResponsePromise || Response.error();
}
