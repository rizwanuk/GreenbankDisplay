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
    throw new Error("Push notifications are not supported on this browser.");
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

export default function PushControls() {
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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
      alert("Test notification sent. If you don’t see it, check OS/browser notification settings.");
    } catch (e) {
      alert(e?.message || "Failed to send test notification.");
    } finally {
      setSending(false);
    }
  };

  const supported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!supported) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px]">
        This browser doesn’t support web push on this platform.
      </div>
    );
  }

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
