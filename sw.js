const CACHE_NAME = 'gdr-cam-v40'; // Incremented version
const STATIC_ASSETS = [
  '/',
  'index.html',
  'app.js',
  'style.css',
  'exif.js',
  'piexif.js',
  'img/LOGO GDR.jpeg',
  'img/icon-512x512.png',
  'img/ECUACORRIENTE.png',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

// Install service worker and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('Failed to open cache during install:', error);
        throw error;
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service worker activated and old caches cleaned');
      return self.clients.claim(); // Take control of all clients immediately
    })
  );
});

// Fetch event with Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  // For navigation requests, use Network Falling Back to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the network is available, cache the new response and return it
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // If the network fails, return the cached version
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other requests (static assets), use Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });

        // Return cached response immediately, while the network request runs in the background
        return cachedResponse || fetchPromise;
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        // Provide a fallback for images if they fail
        if (event.request.destination === 'image') {
          return caches.match('img/icon-512x512.png'); // A placeholder image
        }
      })
  );
});