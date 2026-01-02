const CACHE_NAME = 'patriotic-tetris-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/svg/eagle.svg',
  './assets/svg/soviet.svg',
  './assets/fonts/orbitron-500.ttf',
  './assets/fonts/orbitron-700.ttf',
  './assets/js/game.js',
  './assets/js/board.js',
  './assets/js/pieces.js',
  './assets/js/pieceMovement.js',
  './assets/js/animation.js',
  './assets/js/controls.js',
  './assets/js/boardRenderer.js',
  './assets/js/soundFactory.js',
  './assets/js/ui.js',
  './assets/js/touchControls.js',
  './assets/js/audio.js',
  './assets/js/audioContext.js',
  './assets/js/audioLifecycle.js',
  './assets/js/theme.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
        fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
    )
  );
});
