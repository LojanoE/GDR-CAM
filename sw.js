// GDR-CAM Service Worker
const CACHE_NAME = 'gdr-cam-v9';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar solicitudes de red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la caché si encontramos una coincidencia
        if (response) {
          return response;
        }

        // Clona la solicitud para usarla en fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Verifica que recibimos una respuesta válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona la respuesta para cachearla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});