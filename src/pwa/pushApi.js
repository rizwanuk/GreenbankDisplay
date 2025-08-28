// src/pwa/pushApi.js
// Client helpers for push notifications (mobile) + schedule posting

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
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
 * - iOS requires PWA (installed to Home Screen) + iOS 16.4+
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
      return { ok: false, reason: "no_pushmanager", detail: "Push not supported in this mode" };
    }
    if (isIOS() && !isStandalone()) {
      return {
        ok: false,
        reason: "ios_pwa_required",
        detail: "On iPhone/iPad, add to Home Screen and open the app from there.",
      };
    }

    let perm = Notification.permission;
    if (perm !== "granted") {
      perm = await Notification.requestPermission();
      if (perm !== "granted") {
        return { ok: false, permission: perm, reason: "denied", detail: "Permission was not granted" };
      }
    }

    const reg = await navigator.serviceWorker.ready;

    // Reuse existing sub if present
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const publicKey = await getVapidPublicKey();
      const appServerKey = urlB64ToUint8Array(publicKey);
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      } catch (e) {
        try {
          const existing = await reg.pushManager.getSubscription();
          if (existing) await existing.unsubscribe();
        } catch {}
        return { ok: false, permission: perm, reason: "subscribe_failed", detail: e?.message || String(e) };
      }
    }

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

/** Keep for compatibility: (re)post current subscription if present */
export async function postSubscription() {
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

/** Needed by MobileScreen.jsx: post today's schedule entries */
export async function postSchedule(entries, dateKey) {
  try {
    const resp = await postJSON("/api/push/schedule", {
      entries: Array.isArray(entries) ? entries : [],
      dateKey: dateKey || undefined,
    });
    return !!resp.ok;
  } catch {
    return false;
  }
}
