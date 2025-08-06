self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('voice-pwa-cache').then(cache => {
      return cache.addAll([
        '/voice-pwa/index.html',
        '/voice-pwa/styles.css',
        '/voice-pwa/icon.png',
        '/voice-pwa/alert.mp3'
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

self.addEventListener('push', event => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/voice-pwa/icon.png'
  });
});