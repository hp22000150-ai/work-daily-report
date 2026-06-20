const CACHE = 'workdaily-v1';
const FILES = [
  '/',
  '/index.html',
  '/mobile.html',
  '/report.html',
  '/flatpickr.min.css',
  '/flatpickr.min.js',
  '/icon.svg',
  '/manifest.json',
  '/manifest-pc.json',
  '/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
