const CACHE_VERSION = 'plateiq-shell-v7';
const OFFLINE_URL = '/offline.html';
const LAUNCH_URL = '/launch';
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/plateiq-mark-light.svg',
  '/icons/plateiq-mark-dark.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-light-192.png',
  '/icon-light-512.png',
  '/icon-dark-192.png',
  '/icon-dark-512.png',
  '/maskable-icon-192.png',
  '/maskable-icon-512.png',
  '/maskable-icon-light-192.png',
  '/maskable-icon-light-512.png',
  '/maskable-icon-dark-192.png',
  '/maskable-icon-dark-512.png',
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
  '/upgrade',
  LAUNCH_URL,
];

const PUBLIC_DOCUMENTS = new Set(['/', '/continue', '/gym', '/legal', '/upgrade', LAUNCH_URL]);
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);
const API_PATH_PREFIXES = [
  '/api/',
  '/auth/',
];
const AUTHENTICATED_ROUTE_PREFIXES = [
  '/analytics',
  '/dashboard',
  '/programs',
  '/settings',
  '/workouts',
];

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

  if (API_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  if (request.mode === 'navigate') {
    if (isAuthenticatedNavigation(url)) {
      event.respondWith(handleAuthenticatedNavigation(request, url));
      return;
    }

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

function isAuthenticatedNavigation(url) {
  return AUTHENTICATED_ROUTE_PREFIXES.some((prefix) => (
    prefix.endsWith('/')
      ? url.pathname.startsWith(prefix)
      : url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  ));
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

async function handleAuthenticatedNavigation(request, url) {
  try {
    return await fetch(request);
  } catch {
    const launchUrl = new URL(LAUNCH_URL, self.location.origin);
    launchUrl.searchParams.set('next', `${url.pathname}${url.search}`);
    return Response.redirect(launchUrl.toString(), 302);
  }
}

async function precacheShell(cache) {
  await cache.addAll(PRECACHE_URLS);
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
