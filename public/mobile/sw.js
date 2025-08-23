// public/mobile/sw.js

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    // 1) Parse payload safely (JSON first, fallback to text)
    let data = {};
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        try {
          const txt = await event.data.text();
          data = { body: txt };
        } catch {
          data = {};
        }
      }
    }

    // 2) Sanitize + defaults
    const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

    let title = isNonEmptyString(data.title) ? data.title.trim() : "Greenbank Masjid";
    let body  = isNonEmptyString(data.body)  ? data.body.trim()  : "Prayer reminder";
    let url   = isNonEmptyString(data.url)   ? data.url.trim()   : "/mobile/";

    // If the body looks like an error message, swap to a friendly default
    const errorHints = [
      "The string did not match the expected pattern",
      "Error",
      "Exception",
      "Invalid",
      "Failed",
      "NotAllowed",
      "stack"
    ];
    if (errorHints.some((h) => body.includes(h))) {
      body = "Test notification ✓";
    }

    const options = {
      body,
      icon: "/mobile/icons/icon-192.png",
      badge: "/mobile/icons/icon-192.png",
      data: { url },
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || "/mobile/";

  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = all.find((c) => c.url.includes("/mobile/"));
    if (existing) {
      await existing.focus();
      try { existing.navigate && existing.navigate(url); } catch {}
      return;
    }
    await clients.openWindow(url);
  })());
});
