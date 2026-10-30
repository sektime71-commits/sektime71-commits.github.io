// Street Racer 3D — offline cache: engine files cache-first (versioned URLs), game files network-first
const C = 'sr3d-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    e.respondWith(caches.open(C).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => { const cl = res.clone(); caches.open(C).then(c => c.put(req, cl)); return res; }).catch(() => caches.match(req)));
  }
});
