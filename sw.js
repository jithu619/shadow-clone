self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('voice-pwa-cache').then(cache => {
      return cache.addAll([
        '/shadow-clone/',
        '/shadow-clone/index.html',
        '/shadow-clone/styles.css',
        '/shadow-clone/icon.png',
        '/shadow-clone/alert.mp3',
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js',
        'https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english/resolve/main/model.onnx'
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