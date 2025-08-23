// src/Components/pwa/PushControls.jsx
import React, { useEffect, useState } from "react";

// IMPORTANT: Use the exact Vite form so it gets inlined at build time.
// eslint-disable-next-line no-undef
const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();

// Debug (remove later if you like)
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.debug("[push] client VAPID prefix:", VAPID_PUBLIC.slice(0, 16));
}

function b64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Wait for SW ready, but don't hang forever (iOS edge cases)
async function swReadyWithTimeout(ms = 8000) {
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker not ready (timeout)")), ms)),
  ]);
}

// Try to get any active registration (prefer /mobile/, else any/root)
async function getAnyRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const regMobile = await navigator.serviceWorker.getRegistration("/mobile/").catch(() => null);
  if (regMobile?.active) return regMobile;
  const all = await navigator.serviceWorker.getRegistrations().catch(() => []);
  return all.find((r) => r.active) || regMobile || null;
}

// Ensure there's a controlling SW; register /mobile/ first, then root fallback
async function ensureSW(swLog = []) {
  const log = (m) => swLog.push(m);
  if (!("serviceWorker" in navigator)) throw new Error("Service workers not supported here.");
  let reg = await getAnyRegistration();
  if (reg && navigator.serviceWorker.controller) {
    log("Already controlled by SW.");
    return reg;
  }

  const waitForController = (ms = 8000) =>
    new Promise((resolve) => {
      if (navigator.serviceWorker.controller) return resolve(true);
      const t = setTimeout(() => resolve(false), ms);
      const onCtrl = () => {
        clearTimeout(t);
        navigator.serviceWorker.removeEventListener("controllerchange", onCtrl);
        resolve(true);
      };
      navigator.serviceWorker.addEventListener("controllerchange", onCtrl, { once: true });
    });

  // 1) Try /mobile/
  try {
    log("Registering /mobile/sw.js …");
    reg = await navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" });
    try { await navigator.serviceWorker.ready; } catch {}
    const gotCtrl = await waitForController(4000);
    log(gotCtrl ? "Controller obtained via /mobile/." : "Still no controller after /mobile/.");
  } catch (e) {
    log("Register /mobile/ failed: " + (e?.message || e));
  }

  if (navigator.serviceWorker.controller) {
    return (await getAnyRegistration()) || reg;
  }

  // 2) Fallback: root
  try {
    log("Registering /sw.js at root …");
    reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    try { await navigator.serviceWorker.ready; } catch {}
    const gotCtrl = await waitForController(6000);
    log(gotCtrl ? "Controller obtained via root." : "Still no controller after root.");
  } catch (e) {
    log("Register root failed: " + (e?.message || e));
  }

  return (await getAnyRegistration()) || reg || null;
}

/* ---------- Small, reusable, closable banner ---------- */
function InfoBanner({ id, children, tone = "neutral" }) {
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
  const [savedNote, setSavedNote] = useState("");

  // Diagnostics
  const [diag, setDiag] = useState(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [swLog, setSwLog] = useState([]);

  // Platform detection
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    (typeof navigator !== "undefined" && (navigator.standalone === true || navigator.standalone === 1));

  // Declare once and reuse
  const hasNotification = typeof window !== "undefined" && "Notification" in window;
  const hasSW = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const hasPush = typeof window !== "undefined" && "PushManager" in window;

  const broadcast = () => {
    try { window.dispatchEvent(new CustomEvent("gb:push:changed")); } catch {}
  };

  const refreshState = async () => {
    try {
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "default");
      const reg = (await getAnyRegistration()) || (await ensureSW([]).catch(() => null));
      const sub = await reg?.pushManager?.getSubscription?.();
      setEnabled(!!sub);
    } catch {
      setEnabled(false);
    } finally {
      broadcast();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-subscribe once permission is granted
  useEffect(() => {
    (async () => {
      try {
        if (!VAPID_PUBLIC || perm !== "granted") return;
        const reg = (await getAnyRegistration()) || (await ensureSW([]));
        const existing = await reg.pushManager.getSubscription();
        if (!existing) {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64UrlToUint8Array(VAPID_PUBLIC),
          });
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub),
          });
          setEnabled(true);
          setSavedNote("Notifications enabled ✓");
        }
      } catch (e) {
        setError(`Auto-subscribe failed: ${e?.name || "Error"} — ${e?.message || ""}`.trim());
      } finally {
        broadcast();
      }
    })();
  }, [perm]);

  const onCheckboxChange = async (e) => {
    setError("");

    // Guard: iOS must be installed to Home Screen to proceed
    if (isIOS && !isStandalone) {
      setError("Install to Home Screen first (Safari → Share → Add to Home Screen).");
      e.target.checked = false;
      return;
    }
    if (!VAPID_PUBLIC) {
      setError("Missing VAPID public key (VITE_VAPID_PUBLIC_KEY).");
      e.target.checked = false;
      return;
    }
    if (perm === "denied") {
      setError("Notifications are blocked. Open iOS Settings → Notifications → [Your Web App] and allow notifications.");
      e.target.checked = false;
      return;
    }

    setLoading(true);
    try {
      if (e.target.checked) {
        await subscribeToPush();
        setSavedNote("Notifications enabled ✓");
      } else {
        await unsubscribeFromPush();
        setSavedNote("Notifications disabled ✓");
      }
      await refreshState();
      setTimeout(() => setSavedNote(""), 2000);
    } catch (err) {
      setError(`${err?.name || "Error"} — ${err?.message || "Failed to change notifications."}`);
      await refreshState();
      e.target.checked = enabled; // sync UI back to actual state
    } finally {
      setLoading(false);
    }
  };

  // explicit button to request permission when it's "default"
  const requestPermissionAndSubscribe = async () => {
    try {
      setError("");
      const status = await Notification.requestPermission();
      setPerm(status);
      if (status === "granted") {
        await subscribeToPush();
        await refreshState();
        setSavedNote("Notifications enabled ✓");
        setTimeout(() => setSavedNote(""), 2000);
      } else if (status === "denied") {
        setError("Notifications are blocked. Open iOS Settings → Notifications → [Your Web App] and allow notifications.");
      }
    } catch (e) {
      setError(`${e?.name || "Error"} — ${e?.message || ""}`.trim());
    }
  };

  const sendTest = async () => {
    try {
      setSending(true);
      const reg = (await getAnyRegistration()) || (await ensureSW([]));
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        alert("Enable notifications first.");
        return;
      }
      const res = await fetch("/api/push/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Greenbank Masjid",
          body: "Test notification ✓",
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

  const fixSubscription = async () => {
    setError("");
    setLoading(true);
    const logs = [];
    setSwLog([]);
    try {
      // Ensure an active/controlling SW first (logs explain what's happening)
      const reg = await ensureSW(logs);
      setSwLog(logs.slice());
      if (!reg || !navigator.serviceWorker.controller) {
        throw new Error("Service worker still not controlling this page.");
      }
      await subscribeToPush();
      await refreshState();
      setSavedNote("Notifications enabled ✓");
      setTimeout(() => setSavedNote(""), 2000);
    } catch (e) {
      setSwLog((l) => [...l, "Fix failed: " + (e?.message || e)]);
      setError(`${e?.name || "Error"} — ${e?.message || ""}`.trim());
      await refreshState();
    } finally {
      setLoading(false);
    }
  };

  const runDiag = async () => {
    setDiagRunning(true);
    const logs = [];
    setSwLog([]);
    try {
      let scope = "(no scope)";
      try {
        const reg = (await getAnyRegistration()) || (await ensureSW(logs));
        scope = reg?.scope || "(no scope)";
      } catch (e) {
        logs.push("Diag ensureSW error: " + (e?.message || e));
      }
      setDiag({
        scope,
        hasNotification,
        hasSW,
        hasPush,
        vapidPrefix: VAPID_PUBLIC.slice(0, 16) || "(empty)",
        perm: typeof Notification !== "undefined" ? Notification.permission : "unknown",
      });
    } finally {
      setSwLog((l) => (l.length ? l : logs));
      setDiagRunning(false);
    }
  };

  /* ----- Render guidance (iOS-first) ----- */

  if (!VAPID_PUBLIC) {
    return (
      <InfoBanner id="missing-vapid" tone="error">
        <div className="font-semibold text-[14px] mb-1">Missing VAPID public key</div>
        <div className="opacity-90">
          Set <code>VITE_VAPID_PUBLIC_KEY</code> in your build environment and redeploy. The client can’t subscribe without it.
        </div>
      </InfoBanner>
    );
  }

  if (isIOS && !isStandalone) {
    return (
      <InfoBanner id="ios-install-hint" tone="warn">
        <div className="font-semibold text-[14px] mb-1">Notifications on iPhone/iPad</div>
        <div className="opacity-90">
          Install the app from <b>Safari</b> to enable notifications:
          <br />— Open this page in Safari → <b>Share</b> → <b>Add to Home Screen</b> → open from the new icon.
        </div>
      </InfoBanner>
    );
  }

  if (!(hasNotification && hasSW)) {
    return (
      <InfoBanner id="no-sw-or-notification">
        This browser can’t use service workers or notifications in this context.
      </InfoBanner>
    );
  }

  if (!hasPush) {
    return (
      <InfoBanner id="no-push-api" tone="warn">
        This app is installed, but the Push API isn’t available here. Ensure you’re on recent iOS and opened the app from the Home Screen.
      </InfoBanner>
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

  const showFixRow = perm === "granted" && !enabled;

  return (
    <div className="mt-2 space-y-2" id="notif-toggle">
      {/* If permission is default, give a big actionable button */}
      {perm === "default" && (
        <button
          onClick={requestPermissionAndSubscribe}
          className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[15px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
        >
          Enable notifications
        </button>
      )}

      {/* If denied, explain how to unblock */}
      {perm === "denied" && (
        <InfoBanner id="ios-unblock" tone="error">
          <div className="font-semibold text-[14px] mb-1">Notifications are blocked</div>
          <div className="opacity-90">
            iPhone → <b>Settings</b> → <b>Notifications</b> → <b>[Your Web App]</b> → <b>Allow Notifications</b> ON.
            If you don’t see it listed, delete the Home-Screen app, clear Safari Website Data, then Add to Home Screen again.
          </div>
        </InfoBanner>
      )}

      {/* Toggle (useful once subscribed, or to turn off) */}
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

      {showFixRow && (
        <div className="flex gap-2">
          <button
            onClick={fixSubscription}
            className="flex-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[14px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
            disabled={loading}
          >
            Fix subscription
          </button>
          <button
            onClick={runDiag}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[14px]"
            disabled={diagRunning}
          >
            {diagRunning ? "Diagnosing…" : "Diagnose"}
          </button>
        </div>
      )}

      {/* SW helpers appear when not controlled */}
      {(!diag || (diag && diag.scope === "(no scope)")) && (
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setError("");
              const logs = [];
              setSwLog([]);
              try {
                const reg = await ensureSW(logs);
                setSwLog(logs.slice());
                if (reg && navigator.serviceWorker.controller) {
                  setSavedNote("Service worker installed ✓");
                  setTimeout(() => setSavedNote(""), 2000);
                } else {
                  setError("SW still not controlling. Try Reset SW and reopen from Home Screen.");
                }
              } catch (e) {
                setSwLog((l) => [...l, "Install failed: " + (e?.message || e)]);
                setError(`${e?.name || "Error"} — ${e?.message || ""}`.trim());
              }
            }}
            className="flex-1 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[14px] font-semibold text-sky-300 hover:bg-sky-400/15"
          >
            Install service worker now
          </button>

          <button
            onClick={async () => {
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) await r.unregister();
                if (window.caches) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
                localStorage.removeItem("gb:sw:forced-reload");
                alert("Service worker(s) unregistered. Close the app, reopen from Home Screen, then tap Fix subscription.");
              } catch (e) {
                alert("Reset failed: " + (e?.message || e));
              }
            }}
            className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[14px] font-semibold text-red-300 hover:bg-red-400/15"
          >
            Reset SW
          </button>
        </div>
      )}

      {diag && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] leading-5">
          <div><b>SW scope:</b> {diag.scope}</div>
          <div><b>Push API:</b> {String(diag.hasPush)}</div>
          <div><b>Notifications API:</b> {String(diag.hasNotification)}</div>
          <div><b>Service Worker:</b> {String(diag.hasSW)}</div>
          <div><b>Permission:</b> {diag.perm}</div>
          <div><b>VAPID prefix:</b> {diag.vapidPrefix}</div>
          {swLog.length > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="font-semibold mb-1">SW log</div>
              <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                {swLog.map((l, i) => (<li key={i}>{l}</li>))}
              </ul>
            </div>
          )}
        </div>
      )}

      {savedNote && <div className="text-xs text-emerald-300">{savedNote}</div>}

      <button
        onClick={sendTest}
        disabled={sending || !enabled}
        className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[15px] font-semibold text-emerald-300 hover:bg-emerald-400/15 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? "Sending…" : enabled ? "Send test notification" : "Enable notifications to test"}
      </button>

      {!!error && <div className="text-sm text-red-300">{error}</div>}
    </div>
  );
}
