const CACHE = '9bpm-v3';
const FILES = [
  '/9bpm/',
  '/9bpm/index.html',
  '/9bpm/entrada.html',
  '/9bpm/saida.html',
  '/9bpm/comando.html',
  '/9bpm/manifest.json',
  '/9bpm/icon-192.png',
  '/9bpm/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
