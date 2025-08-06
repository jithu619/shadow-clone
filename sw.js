self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('voice-pwa-cache').then(cache => {
      return cache.addAll([
        '/voice-pwa/index.html',
        '/voice-pwa/icon.png',
        'https://cdn.tailwindcss.com',
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.4/dist/transformers.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});