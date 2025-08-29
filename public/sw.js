/**
 * Greenbank Mobile PWA Service Worker
 * Scope: /mobile/
 */
const CACHE = "gbm-mobile-v2"; // bump this to force a fresh cache

// App shell / static assets to seed cache (add more if needed)
const PRECACHE = [
  "/mobile/",
  "/mobile/index.html",
  "/mobile/manifest.webmanifest",
  "/mobile/icons/icon-192.png",
  "/mobile/icons/icon-512.png",
];

// Enable Navigation Preload (faster first paint if supported)
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    } catch {}
  })());
});

// Install: pre-cache app shell & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

// Activate: purge old caches and take control of clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/**
 * Strategy:
 * - HTML/doc GET → network-first (no-store) with offline fallback
 * - Static assets GET (css/js/img/fonts) → cache-first (update cache in background)
 * - API (any method) → network-only (never cache /api/**)
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle our own origin / scope
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
  const isAPI = url.pathname.startsWith("/api/");

  // Never cache API calls; always hit network
  if (isAPI) {
    event.respondWith(fetch(req));
    return;
  }

  // Never cache non-GET in general
  if (!isGET) {
    event.respondWith(fetch(req));
    return;
  }

  // Docs (HTML): network-first with cache bypass, fallback to cache
  if (isDoc) {
    event.respondWith(
      (async () => {
        try {
          const netReq = new Request(req, { cache: "no-store" });
          const res = await fetch(netReq);
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // Static assets (GET): cache-first with background update
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
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
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
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
  // Optional: clear caches from the page if ever needed
  if (msg && msg.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
