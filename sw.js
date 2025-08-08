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
          fetch(url, { mode: 'no-cors' })
            .then(response => {
              if (!response.ok) {
                console.warn(`Cache warning: Failed to fetch ${url}`);
                return null;
              }
              return cache.put(url, response);
            })
            .catch(err => {
              console.warn(`Cache error for ${url}:`, err);
              return null;
            })
        ).filter(Boolean)
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

self.addEventListener('push', event => {
  const data = event.data.json();
  const { text, id } = data;
  event.waitUntil(
    self.registration.showNotification('Reminder', {
      body: text,
      icon: '/shadow-clone/icon.png'
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'play-alert', id }));
      });
    }).catch(err => console.error('Notification error:', err))
  );
});

self.addEventListener('message', event => {
  if (event.data.type === 'play-alert') {
    // Handled in index.html
  }
});