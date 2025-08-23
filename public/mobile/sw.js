// public/mobile/sw.js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "Greenbank Masjid";
  const options = {
    body: data.body || "Prayer reminder",
    icon: "/mobile/icons/icon-192.png",
    badge: "/mobile/icons/icon-192.png",
    data: { url: data.url || "/mobile/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/mobile/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => c.url.includes("/mobile/"));
      if (client) {
        client.focus();
        try { client.navigate && client.navigate(url); } catch(_) {}
        return;
      }
      return clients.openWindow(url);
    })
  );
});
