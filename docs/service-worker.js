// Service Worker for Training App
// Handles offline caching and background sync

const CACHE_NAME = 'training-app-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './background.html',
  './css/training.css',
  './scripts/oauth.js',
  './scripts/exercise.js',
  './scripts/exercise-append.js',
  './scripts/mentor.js',
  './scripts/training.js',
  './FullBodyMale.json',
  './FullBodyFemale.json',
  './FullBodyPers.json',
  './Calisthenic.json',
  './images/banner_free.png',
  './images/banner_prime.png',
  './images/start.png',
  './images/done.png',
  './images/pause.png',
  './images/finish.png',
  './images/NJKlogo.ico',
  './images/icon/NJKlogo.png',
  './sound/start.wav',
  './sound/breaktime.wav',
  './sound/ringGo.wav',
  './sound/finish.wav',
  'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
  'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css',
  'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js',
  'https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js'
];

// Install event: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache assets individually to avoid one failure blocking all
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE go to network directly)
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(networkFirst(request));

  /*
  // API calls: network-first, fall back to cache if available
  if (url.pathname.startsWith('/api/') || url.hostname.includes('pika-proxy')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first strategy
  event.respondWith(cacheFirst(request));
  */
});

// Cache-first strategy: serve from cache, fall back to network and update cache
async function cacheFirst(request) {
  // Open the versioned cache by name to avoid stale matches from old cache versions
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Cache-first fetch failed:', request.url);
    // Return a simple offline message for HTML requests
    if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Offline</h2><p>Please check your connection.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    return new Response('', { status: 503 });
  }
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful API responses for offline fallback
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network-first fell back to cache for:', request.url);
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(
      JSON.stringify({ success: false, error: 'OFFLINE', message: 'You are offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Background sync: process queued requests when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workout-progress') {
    event.waitUntil(processSyncQueue());
  }
});

// Process the sync queue stored by the main thread via postMessage
async function processSyncQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SW_PROCESS_SYNC_QUEUE' });
  });
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
