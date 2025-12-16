const CACHE_NAME = 'phone-tracker-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/device.html',
    '/track.html',
    '/style.css',
    '/share.js',
    '/track.js',
    '/manifest.json',
    '/icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});
