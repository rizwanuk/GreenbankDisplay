/**
 * Greenbank Mobile PWA Service Worker
 * Scope: /mobile/
 */
const CACHE = "gbm-mobile-v1";

// App shell / static assets to seed cache (add more if needed)
const PRECACHE = [
  "/mobile/",
  "/mobile/manifest.webmanifest",
  "/mobile/icons/icon-192.png",
  "/mobile/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Strategy:
 * - HTML/doc GET → network-first (fallback to cache if offline)
 * - Static assets GET (css/js/img/fonts) → cache-first (update cache in background)
 * - API:
 *    - GET → network-first with offline fallback (if cached)
 *    - non-GET (POST/PUT/DELETE/…) → network-only (never cache)
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle requests within SW scope (browser already limits this, but safe check)
  const inScope =
    (self.registration.scope && url.href.startsWith(self.registration.scope)) ||
    url.origin === location.origin;
  if (!inScope) return;

  const method = req.method || "GET";
  const isGET = method === "GET";

  const isDoc =
    req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  const isStatic = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)$/.test(
    url.pathname
  );
  const isAPI =
    url.pathname.startsWith("/api/") || url.pathname.includes("/timetable");

  // Never cache non-GET (e.g., POST to /api/push/subscribe or /api/push/schedule)
  if (!isGET) {
    event.respondWith(fetch(req));
    return;
  }

  // Docs & API (GET): network-first, cache copy for offline
  if (isDoc || (isAPI && isGET)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Static assets (GET): cache-first with background update
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return {};
    }
  })();
  const title = data.title || "Prayer Reminder";
  const body = data.body || "";
  const url = data.url || "/mobile/";
  const tag = data.tag || undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/mobile/icons/icon-192.png",
      badge: "/mobile/icons/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/mobile/";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = all.find((c) => c.url.includes("/mobile/"));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })()
  );
});

// Support skip-waiting triggered from the page
self.addEventListener("message", (event) => {
  const msg = event?.data;
  if (msg === "SKIP_WAITING" || (msg && msg.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
});
