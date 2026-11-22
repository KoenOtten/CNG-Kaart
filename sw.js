// CNG Kaart - service worker: app werkt ook zonder internet (behalve kaarttegels en verversen)
const CACHE = 'cngkaart-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js'
];

self.addEventListener('install', e => {
  // Elk bestand los, zodat één mislukte download de installatie niet blokkeert
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // OpenStreetMap-verzoeken (POST) nooit cachen
  const url = new URL(req.url);
  const isShell = url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com';
  if (!isShell) return; // kaarttegels en zoeken gaan gewoon via internet

  // Eigen bestanden: eerst internet (nieuwste versie), anders uit de cache
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Bibliotheken: eerst uit de cache
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
