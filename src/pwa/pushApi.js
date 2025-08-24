// src/pwa/pushApi.js

// Optional: configure a custom API base (defaults to /api)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "/api";

/** Small helper for JSON POSTs */
async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
  }
  return res.json().catch(() => ({}));
}

/** Get any controlling service worker registration */
async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    // Fall back to any active registration
    const all = await navigator.serviceWorker.getRegistrations().catch(() => []);
    return all.find((r) => r.active) || null;
  }
}

/** Read the current push subscription (if any) */
async function getSubscription() {
  const reg = await getRegistration();
  const sub = await reg?.pushManager?.getSubscription?.();
  return sub || null;
}

/**
 * Send (or refresh) the user's push subscription to the server.
 * If you already have the subscription object, you can pass it in;
 * otherwise this will read it from the SW.
 */
export async function postSubscription(subscription) {
  const sub = subscription || (await getSubscription());
  if (!sub) return false;

  // Include a tiny bit of context that can help your server
  const ctx = {
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
  };

  await postJSON("/push/subscribe", { ...sub.toJSON(), ctx });
  return true;
}

/** Remove a subscription server-side (not used by MobileScreen, here for completeness) */
export async function postUnsubscribe(subscription) {
  const sub = subscription || (await getSubscription());
  if (!sub) return false;
  await postJSON("/push/unsubscribe", { endpoint: sub.endpoint });
  return true;
}

/**
 * Post today's prayer schedule so your server can queue background notifications.
 * `entries` should be an array like:
 *   [{ prayer: "fajr", startAt: <ms>, jamaahAt: <ms|null>, url: "/mobile/" }, ...]
 * `stamp` is a day key like "2025-08-24" so we don't re-send twice.
 */
export async function postSchedule(entries, stamp) {
  if (!Array.isArray(entries) || entries.length === 0) return false;

  const payload = {
    stamp,               // e.g. 2025-08-24
    entries,             // start/jamaah timestamps (ms since epoch)
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };

  await postJSON("/push/schedule", payload);
  return true;
}

/**
 * Optional: persist user notification preferences on the server.
 * Example `prefs`:
 *   { startEnabled: true, jamaahEnabled: true, minutesBeforeJamaah: 10, categories: ["adhan","events"] }
 */
export async function postPreferences(prefs) {
  await postJSON("/push/preferences", prefs || {});
  return true;
}
