self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('voice-pwa-cache').then(cache => {
      const urls = [
        '/shadow-clone/',
        '/shadow-clone/index.html',
        '/shadow-clone/styles.css',
        '/shadow-clone/icon.png',
        '/shadow-clone/alert.mp3'
      ];
      return Promise.all(
        urls.map(url =>
          fetch(url)
            .then(response => {
              if (!response.ok) throw new Error(`Failed to fetch ${url}`);
              return cache.put(url, response);
            })
            .catch(err => console.warn(`Cache error for ${url}:`, err))
        )
      ).catch(err => console.error('Cache addAll error:', err));
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(err => {
        console.error('Fetch error:', err);
        return new Response('Offline', { status: 503 });
      });
    })
  );
});