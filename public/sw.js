const CACHE_NAME = 'picnic-finder-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/css/views.css',
  '/css/dashboard.css',
  '/css/modal.css',
  '/js/main.js',
  '/js/state.js',
  '/js/components/map.js',
  '/js/components/navigation.js',
  '/js/components/participants.js',
  '/js/components/picnic-tab.js',
  '/js/components/potluck.js',
  '/js/components/modal.js',
  '/js/utils/amenities.js',
  '/js/utils/conditions.js',
  '/js/api/search.js',
  '/js/api/overpass.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});