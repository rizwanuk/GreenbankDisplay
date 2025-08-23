// public/sw.js — same content as /mobile/sw.js so root scope can control /mobile too

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function readData(event) {
  if (!event.data) return {};
  try { return event.data.json(); }
  catch (_) {
    try { return { body: await event.data.text() }; }
    catch { return {}; }
  }
}
const looksBad = (s = "") =>
  /expected (pattern|return)|error|exception|invalid|failed|stack/i.test(s);

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const data = await readData(event);
    const isStr = (v) => typeof v === "string" && v.trim().length > 0;

    let title = isStr(data.title) ? data.title.trim() : "Greenbank Masjid";
    let body  = isStr(data.body)  ? data.body.trim()  : "Prayer reminder";
    let url   = isStr(data.url)   ? data.url.trim()   : "/mobile/";

    if (looksBad(title)) title = "Greenbank Masjid";
    if (looksBad(body))  body  = "Prayer reminder";

    await self.registration.showNotification(title, {
      body,
      icon: "/mobile/icons/icon-192.png",
      badge: "/mobile/icons/icon-192.png",
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification?.data && event.notification.data.url) || "/mobile/";
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = list.find((c) => c.url.includes("/mobile/"));
    if (existing) {
      await existing.focus();
      try { existing.navigate && existing.navigate(url); } catch {}
      return;
    }
    await clients.openWindow(url);
  })());
});
