/* Boileau — Service Worker (Web Push) */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('push', (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || 'Boileau', {
      body: d.body || '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: d.tag || 'boileau-notif',
      data: { url: d.url || '/' },
      vibrate: [150, 50, 150],
      actions: d.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.startsWith(self.location.origin));
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
