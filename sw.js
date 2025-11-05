const CACHE_NAME = 'gdr-cam-v39';
const urlsToCache = [
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

// Install a service worker
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to open cache during install:', error);
        throw error;
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available, otherwise fetch from network
        if (response) {
          return response;
        }
        // If not in cache, try to fetch from network
        return fetch(event.request).catch(error => {
          console.error('Network request failed:', event.request.url, error);
          // Return the root page for navigation requests to ensure PWA works offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
    )
  );
});

// Update a service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service worker activated and old caches cleaned');
    })
  );
});