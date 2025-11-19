const CACHE_NAME = 'gdr-cam-v68.6.5';
const STATIC_CACHE_NAME = 'gdr-cam-static-v68.6.5';
const RUNTIME_CACHE_NAME = 'gdr-cam-runtime-v68.6.5';

const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './exif.js',
  './piexif.js',
  './frentes.json',
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

  // Handle navigation requests (HTML pages) with a network-falling-back-to-cache strategy.
  // This is ideal for "lie-fi" scenarios where the network is slow.
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        // Network request successful, update the cache and return the response.
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network request failed (offline, timeout, etc.), serve from cache.
        console.log('Network fetch for navigation failed, serving from cache.');
        // Try to match the specific navigation request first.
        // If it's not in cache, fall back to the main index.html page.
        return caches.match(event.request)
          .then(cachedResponse => cachedResponse || caches.match('./index.html'));
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