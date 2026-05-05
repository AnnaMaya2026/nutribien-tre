/* NutriMéno service worker — local notifications for routine reminders
   + lightweight offline support (network-first for navigations, cache
   fallback for static assets). */

const CACHE = "nutrimeno-v1";
const PRECACHE_URLS = ["/", "/manifest.json", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigations, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

const timers = new Map();

function scheduleOne({ id, title, body, delayMs }) {
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }
  const handle = setTimeout(() => {
    self.registration.showNotification(title || "NutriMéno 💊", {
      body: body || "C'est l'heure de votre routine",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: id,
      requireInteraction: false,
    });
    timers.delete(id);
  }, Math.max(0, delayMs));
  timers.set(id, handle);
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "schedule") {
    scheduleOne(data.payload);
  } else if (data.type === "clear-all") {
    for (const h of timers.values()) clearTimeout(h);
    timers.clear();
  } else if (data.type === "show-now") {
    self.registration.showNotification(data.title || "NutriMéno 💊", {
      body: data.body || "Notification de test",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.tag || `test-${Date.now()}`,
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients[0]) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
