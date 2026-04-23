// Minimal service worker for Personal Budget PWA.
// - No caching strategies (the app is tiny and Next.js already handles its own)
// - Registered to enable iOS 16.4+ Declarative Web Push in standalone mode
// - Handles notification clicks to focus the existing PWA window

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/recurring");
    }),
  );
});
