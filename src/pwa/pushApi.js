// src/pwa/pushApi.js
// Client helpers for push notifications (mobile)

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isStandalone() {
  // iOS Safari + PWA
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // legacy iOS
    window.navigator.standalone === true
  );
}

function urlB64ToUint8Array(base64String) {
  // Properly pad & convert URL-safe base64
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getVapidPublicKey() {
  const r = await fetch("/api/push/vapid", { credentials: "include" });
  if (!r.ok) throw new Error(`vapid http ${r.status}`);
  const j = await r.json().catch(() => ({}));
  if (!j?.publicKey) throw new Error("missing vapid public key");
  return j.publicKey;
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, json, text };
}

/**
 * Enable push:
 * - iOS requires PWA (installed to home screen) + iOS 16.4+
 * - Permission prompt → subscribe with VAPID → POST to server
 * Returns: { ok, permission, reason?, detail? }
 */
export async function enablePush() {
  try {
    if (typeof window === "undefined") {
      return { ok: false, reason: "server", detail: "Run in browser" };
    }
    if (!("serviceWorker" in navigator)) {
      return { ok: false, reason: "no_sw", detail: "Service Worker not supported" };
    }
    if (!("PushManager" in window)) {
      // This is common on iOS when not installed as PWA
      return { ok: false, reason: "no_pushmanager", detail: "Push not supported in this mode" };
    }

    // iOS: must be installed to Home Screen
    if (isIOS() && !isStandalone()) {
      return {
        ok: false,
        reason: "ios_pwa_required",
        detail: "On iPhone/iPad, please add to Home Screen and open the app from there.",
      };
    }

    // Ask for permission (must be called from a user gesture)
    let perm = Notification.permission;
    if (perm !== "granted") {
      perm = await Notification.requestPermission();
      if (perm !== "granted") {
        return { ok: false, permission: perm, reason: "denied", detail: "Permission was not granted" };
      }
    }

    const reg = await navigator.serviceWorker.ready;

    // If there is already a subscription, reuse & (re)post it
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      // Subscribe new
      const publicKey = await getVapidPublicKey();
      const appServerKey = urlB64ToUint8Array(publicKey);
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      } catch (e) {
        // Some browsers keep a broken sub; try to recover by cleaning any existing one
        try {
          const existing = await reg.pushManager.getSubscription();
          if (existing) await existing.unsubscribe();
        } catch {}
        return {
          ok: false,
          permission: perm,
          reason: "subscribe_failed",
          detail: e?.message || String(e),
        };
      }
    }

    // Post to server
    const resp = await postJSON("/api/push/subscribe", { subscription: sub.toJSON() });
    if (!resp.ok) {
      return {
        ok: false,
        permission: perm,
        reason: "subscribe_post_failed",
        detail: `HTTP ${resp.status} ${resp.text || ""}`.trim(),
      };
    }

    return { ok: true, permission: perm };
  } catch (e) {
    return { ok: false, reason: "unexpected", detail: e?.message || String(e) };
  }
}

/** Optional: disable push (unsubscribe) */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e?.message || String(e) };
  }
}

// You already have postSchedule() elsewhere; leaving it as-is.
export async function postSubscription() {
  // kept for backwards-compat if other code calls it, but enablePush now posts directly.
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    const resp = await postJSON("/api/push/subscribe", { subscription: sub.toJSON() });
    return !!resp.ok;
  } catch {
    return false;
  }
}
