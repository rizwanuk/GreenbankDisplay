/**
 * Greenbank Mobile PWA Service Worker
 * Scope: /mobile/
 * (push removed; supports manual update via SKIP_WAITING)
 */

const CACHE = "gbm-mobile-v4"; // bump to force fresh cache

// App shell / static assets to seed cache (add more if needed)
const PRECACHE = [
  "/mobile/",
  "/mobile/index.html",
  "/mobile/manifest.webmanifest",
  "/mobile/icons/icon-192.png",
  "/mobile/icons/icon-512.png",
];

/* ---------------- Install: pre-cache app shell & activate immediately ---------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

/* ---------------- Activate: enable nav preload, purge old caches, take control -------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
      } catch {}
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/* ---------------- Fetch strategy ----------------
 * - HTML/doc GET → network-first (no-store) with offline fallback
 * - Static assets GET (css/js/img/fonts) → cache-first (update cache in background)
 * - API (any method) → network-only (never cache /api/**)
 * - Non-GET → network-only
 -------------------------------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin and within our scope
  const inScope =
    (self.registration.scope && url.href.startsWith(self.registration.scope)) ||
    url.origin === location.origin;
  if (!inScope) return;

  const method = req.method || "GET";
  const isGET = method === "GET";
  const isDoc = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  const isStatic = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)$/.test(url.pathname);
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

  // Docs (HTML): network-first with cache bypass, fallback to cache/offline
  if (isDoc) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(new Request(req, { cache: "no-store" }));
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        } catch {
          const cached = await caches.match(req);
          return (
            cached ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })()
    );
    return;
  }

  // Static assets: cache-first with background update
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
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});

/* ---------------- Messages from page ----------------
 * - SKIP_WAITING: immediately activate the new SW (used by "Apply update")
 * - CLEAR_CACHES: optional manual cache clear from page
 ----------------------------------------------------- */
self.addEventListener("message", (event) => {
  const msg = event?.data;
  if (msg === "SKIP_WAITING" || (msg && msg.type === "SKIP_WAITING")) {
    self.skipWaiting();
  }
  if (msg && msg.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});
