cd "C:/Users/Rizwan/OneDrive/Documents/Masjid/Timetable screen/GreenbankDisplay"

# ensure folders exist
mkdir -p "public/mobile"

# create the service worker
cat > "public/mobile/sw.js" << 'JS'
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
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Strategy:
 * - HTML/doc requests → network-first (fallback to cache if offline)
 * - Static assets (css/js/img/fonts) → cache-first (update cache in background)
 * - API/timetable calls → network-first with offline fallback
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // only handle requests within our scope (/mobile or same-origin)
  if (self.registration.scope && !url.pathname.startsWith("/mobile/") && url.origin !== location.origin) {
    return;
  }

  const isDoc = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  const isStatic = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)$/.test(url.pathname);
  const isAPI = url.pathname.startsWith("/api/") || url.pathname.includes("/timetable");

  if (isDoc || isAPI) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  // default: try cache, then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Optional: handle push (we'll wire the backend later)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Prayer Reminder";
  const body  = data.body  || "";
  const url   = data.url   || "/mobile/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: data.tag,
      icon: "/mobile/icons/icon-192.png",
      badge: "/mobile/icons/icon-192.png",
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/mobile/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => c.url.includes("/mobile/"));
      return client ? client.focus() : clients.openWindow(url);
    })
  );
});

// support skip waiting if you decide to trigger it from the page
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
JS
