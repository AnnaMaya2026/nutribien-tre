/* NutriMéno service worker — used to deliver scheduled local notifications
   for routine reminders. Notifications are scheduled by the page (which
   sends a "schedule" message) and rebroadcast at the requested time. */

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
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
