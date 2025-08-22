// src/Components/pwa/PushControls.jsx
import React, { useEffect, useState } from "react";

const VAPID_PUBLIC = (import.meta?.env?.VITE_VAPID_PUBLIC_KEY || "").trim();

function b64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this context.");
  }
  if (!VAPID_PUBLIC) throw new Error("Missing VAPID public key.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications permission was denied.");

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64UrlToUint8Array(VAPID_PUBLIC),
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  return sub;
}

async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } finally {
    await sub.unsubscribe();
  }
}

/* ---------- Small, reusable, closable banner ---------- */
function InfoBanner({ id, children, tone = "neutral" }) {
  // id is used as localStorage key to remember dismissal
  const storageKey = `gb:notif:banner:${id}`;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === "1") setHidden(true);
    } catch {}
  }, [storageKey]);

  const close = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setHidden(true);
  };

  if (hidden) return null;

  const toneClasses =
    tone === "warn"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : tone === "error"
      ? "border-red-400/30 bg-red-400/10 text-red-200"
      : "border-white/15 bg-white/10 text-white/90";

  return (
    <div className={`relative rounded-xl px-3 py-2 text-[13px] ${toneClasses}`}>
      <button
        aria-label="Dismiss"
        onClick={close}
        className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-white/70 hover:bg-white/10"
      >
        ×
      </button>
      {children}
    </div>
  );
}

export default function PushControls() {
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Platform detection for friendlier guidance
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  // Standalone if: display-mode: standalone OR legacy iOS A2HS flag
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    (typeof navigator !== "undefined" && (navigator.standalone === true || navigator.standalone === 1));
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/i.test(ua);

  const hasNotification = typeof window !== "undefined" && "Notification" in window;
  const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;

  const refreshState = async () => {
    try {
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "default");
      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager?.getSubscription?.();
      setEnabled(!!sub);
    } catch {
      setEnabled(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await refreshState();
    })();
    const onVis = () => refreshState();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onCheckboxChange = async (e) => {
    setError("");
    if (perm === "denied") {
      alert("Notifications are blocked in your browser settings for this site. Please allow them first.");
      return;
    }
    setLoading(true);
    try {
      if (e.target.checked) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
      await refreshState();
    } catch (err) {
      setError(err?.message || "Failed to change notifications.");
      await refreshState();
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    try {
      setSending(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        alert("Enable notifications first.");
        return;
      }
      const res = await fetch("/api/push/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Adhān now",
          body: "Test message from your device",
          url: "/mobile/",
          sub,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Send failed");
      alert("Test notification sent. If you don’t see it, check your OS/browser notification settings.");
    } catch (e) {
      alert(e?.message || "Failed to send test notification.");
    } finally {
      setSending(false);
    }
  };

  /* ----- Render guidance for unsupported states (with close) ----- */

  // 0) Missing SW/Notification APIs entirely
  if (!(hasNotification && hasSW)) {
    return (
      <InfoBanner id="no-sw-or-notification">
        This browser can’t use service workers or notifications in this context.
      </InfoBanner>
    );
  }

  // 1) iOS must be installed-from-Safari; show hint if not standalone
  if (isIOS && !isStandalone) {
    return (
      <InfoBanner id="ios-install-hint" tone="warn">
        <div className="font-semibold text-[14px] mb-1">Notifications on iPhone/iPad</div>
        <div className="opacity-90">
          Install the app from <b>Safari</b> to enable notifications:
          <br />— Open this page in Safari → <b>Share</b> → <b>Add to Home Screen</b> → open from the new icon.
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied. Open it in Safari and install to Home Screen.");
              } catch {
                alert("Copy failed. Long-press the URL to copy.");
              }
            }}
            className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-sky-300 hover:bg-sky-400/15"
          >
            Copy link for Safari
          </button>
        </div>
      </InfoBanner>
    );
  }

  // 2) Standalone but Push API missing (very old iOS or unusual contexts)
  if (!hasPush) {
    return (
      <InfoBanner id="no-push-api" tone="warn">
        This app is installed, but the Push API isn’t available here. Please ensure you’re on the latest iOS and opened
        the app from the Home Screen.
      </InfoBanner>
    );
  }

  // --- Normal supported UI ---
  const statusText =
    perm === "denied"
      ? "Blocked in browser settings"
      : enabled
      ? "Enabled"
      : perm === "granted"
      ? "Allowed, but not subscribed"
      : "Permission not granted";

  return (
    <div className="mt-2 space-y-2" id="notif-toggle">
      {/* Optional debug line in dev only */}
      {import.meta.env.DEV && (
        <div className="text-xs text-white/50">
          Debug: iOS={String(isIOS)} standalone={String(isStandalone)} push={String(hasPush)} perm={perm}
        </div>
      )}

      <label className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2">
        <input
          type="checkbox"
          className="h-5 w-5 accent-emerald-400"
          checked={enabled}
          onChange={onCheckboxChange}
          disabled={loading || perm === "denied"}
          aria-checked={enabled}
          aria-label="Enable notifications"
        />
        <div className="flex-1">
          <div className="text-[15px] font-semibold">Notifications</div>
          <div className="text-xs opacity-75">{statusText}</div>
        </div>
        {loading && <span className="text-xs opacity-75">…</span>}
      </label>

      {enabled && (
        <button
          onClick={sendTest}
          disabled={sending}
          className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[15px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
        >
          {sending ? "Sending…" : "Send test notification"}
        </button>
      )}

      {!!error && <div className="text-sm text-red-300">{error}</div>}
    </div>
  );
}
