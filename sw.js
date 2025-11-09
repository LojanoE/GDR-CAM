const CACHE_NAME = 'gdr-cam-v68.1';
const STATIC_CACHE_NAME = 'gdr-cam-static-v68.1';
const RUNTIME_CACHE_NAME = 'gdr-cam-runtime-v68.1';

const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './exif.js',
  './piexif.js',
  './manifest.json',
  './img/LOGO GDR.jpeg',
  './img/icon-512x512.png',
  './img/ECUACORRIENTE.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Static assets cached');
        // Add critical assets to the static cache
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache static assets during install:', error);
        // Don't throw error to allow service worker installation to continue
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - handle different types of requests with appropriate strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = self.location.origin === requestUrl.origin;
  const isNavigation = event.request.mode === 'navigate';

  // Handle navigation requests (HTML pages) with network-first strategy with fallback
  if (isNavigation) {
    event.respondWith(
      // Strategy: Cache First, then Network. This ensures instant loading.
      caches.match(event.request).then(cachedResponse => {
        // Try to fetch a new version from the network in the background.
        const networkFetch = fetch(event.request).then(networkResponse => {
          // If the fetch is successful, update the cache.
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          // If there was a cached response, we don't need to return the network one here,
          // as the page is already loading. The update will be applied on next load.
          return networkResponse;
        }).catch(error => {
          console.log('Network fetch for navigation failed, serving from cache.', error);
        });

        // Return the cached response immediately if it exists, otherwise wait for the network.
        // If both fail, it will result in an error, but the cache should almost always have index.html.
        return cachedResponse || networkFetch || caches.match('./index.html');
      })
    );
  } 
  // Handle API requests or cross-origin requests with network-first strategy
  else if (!isSameOrigin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  } 
  // Handle static assets with cache-first strategy for same-origin requests
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(event.request).then(networkResponse => {
          // Only cache successful responses with valid content
          if (networkResponse.status === 200 && 
              networkResponse.type !== 'opaque' && 
              networkResponse.type !== 'opaqueredirect') {
            // Clone the response before caching to allow the original to be used
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
          console.error('Network request failed:', event.request.url, error);
          // Return error response if no fallback available
          return new Response('', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
  }
});