const CACHE_NAME = 'libreta-nivelacion-v3';
const CORE_ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const OPTIONAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      for(const url of OPTIONAL_ASSETS){
        try{ await cache.add(url); }catch(e){ /* opcional, no bloquea la instalación */ }
      }
    })
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
  const req = event.request;

  // El documento HTML: siempre intenta la red primero para no quedarse
  // atascado sirviendo una versión vieja desde la caché.
  if(req.mode === 'navigate' || req.destination === 'document'){
    event.respondWith(
      fetch(req).then((resp) => {
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resp.clone()));
        return resp;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Archivos estáticos (íconos, manifest, librería): caché primero, red de respaldo.
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((resp) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resp.clone());
          return resp;
        });
      }).catch(() => cached);
    })
  );
});
