const CACHE_NAME = 'measurepro-cache-v2';
const ASSETS = [
  './',
  'index.html',
  'clients.html',
  'backup.html',
  'settings.html',
  'styles.css',
  'index.js',
  'clients.js',
  'backup.js',
  'settings.js',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');
  const isCSS = accept.includes('text/css') || req.url.endsWith('.css');
  const isJS = accept.includes('application/javascript') || req.url.endsWith('.js');

  if (isHTML) {
    // Network-first for HTML so updated pages/styles show immediately
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match(req).then(c => c || caches.match('index.html')))
    );
  } else if (isCSS || isJS) {
    // Network-first for CSS/JS so visual changes show without hard refresh
    event.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match(req))
    );
  } else {
    // Cache-first for other assets with background refresh
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(()=>{});
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
