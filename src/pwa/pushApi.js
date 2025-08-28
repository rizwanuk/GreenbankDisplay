// src/pwa/pushApi.js

// --- tiny helpers -----------------------------------------------------------
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || res.statusText || "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// --- endpoints ---------------------------------------------------------------
export async function getVapidPublicKey() {
  const { publicKey } = await jsonFetch("/api/push/vapid");
  if (!publicKey) throw new Error("No VAPID public key");
  return publicKey;
}

// Called by your MobileScreen effect once per day (already wired)
export async function postSchedule(entries, dateKey) {
  try {
    await jsonFetch("/api/push/schedule", {
      method: "POST",
      body: { entries, dateKey },
    });
    return true;
  } catch (e) {
    console.warn("postSchedule failed:", e?.message || e);
    return false;
  }
}

// Called after we obtain/refresh a PushSubscription
export async function postSubscription(subscription) {
  try {
    await jsonFetch("/api/push/subscribe", {
      method: "POST",
      body: { subscription },
    });
    return true;
  } catch (e) {
    console.warn("postSubscription failed:", e?.message || e);
    return false;
  }
}

// Ensure we have a PushSubscription in the browser for the current SW reg
export async function ensurePushSubscription(reg) {
  // 1) permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, permission, subscription: null };
  }

  // 2) existing or create
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const publicKey = await getVapidPublicKey();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // 3) post to server
  const ok = await postSubscription(sub);
  return { ok, permission: "granted", subscription: sub };
}

// Convenience: ask SW, ensure sub, post to server
export async function enablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push not supported on this device/browser.");
  }
  const reg = await navigator.serviceWorker.ready;
  return ensurePushSubscription(reg);
}
