// src/Components/pwa/PushControls.jsx
import React, { useEffect, useState } from "react";

// eslint-disable-next-line no-undef
const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC_KEY || "").trim();

const urlFlag =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "pwa";
// eslint-disable-next-line no-undef
const isDev = typeof import.meta !== "undefined" && !!import.meta.env?.DEV;

/* ---------------- helpers ---------------- */
function b64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
async function getAnyRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const regMobile = await navigator.serviceWorker.getRegistration("/mobile/").catch(() => null);
  if (regMobile?.active) return regMobile;
  const all = await navigator.serviceWorker.getRegistrations().catch(() => []);
  return all.find((r) => r.active) || regMobile || null;
}
async function ensureSW(swLog = []) {
  const log = (m) => swLog.push(m);
  if (!("serviceWorker" in navigator)) throw new Error("Service workers not supported here.");
  let reg = await getAnyRegistration();
  if (reg && navigator.serviceWorker.controller) return reg;

  const waitForController = (ms = 8000) =>
    new Promise((resolve) => {
      if (navigator.serviceWorker.controller) return resolve(true);
      const t = setTimeout(() => resolve(false), ms);
      const onCtrl = () => { clearTimeout(t); navigator.serviceWorker.removeEventListener("controllerchange", onCtrl); resolve(true); };
      navigator.serviceWorker.addEventListener("controllerchange", onCtrl, { once: true });
    });

  try {
    log("Registering /mobile/sw.js …");
    reg = await navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" });
    try { await navigator.serviceWorker.ready; } catch {}
    await waitForController(4000);
  } catch (e) {
    log("Register /mobile/ failed: " + (e?.message || e));
  }
  if (navigator.serviceWorker.controller) return (await getAnyRegistration()) || reg;

  try {
    log("Registering /sw.js at root …");
    reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    try { await navigator.serviceWorker.ready; } catch {}
    await waitForController(6000);
  } catch (e) {
    log("Register root failed: " + (e?.message || e));
  }
  return (await getAnyRegistration()) || reg || null;
}

/* keep rest of app in sync */
const setLocalEnabled = (v) => { try { localStorage.setItem("gb:push:enabled", v ? "1" : "0"); } catch {} };
const broadcast = () => { try { window.dispatchEvent(new CustomEvent("gb:push:changed")); } catch {} };

/* small banner */
function InfoBanner({ id, children, tone = "neutral" }) {
  const storageKey = `gb:notif:banner:${id}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(storageKey) === "1") setHidden(true); } catch {} }, [storageKey]);
  if (hidden) return null;
  const toneClasses =
    tone === "warn" ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
    : tone === "error" ? "border-red-400/30 bg-red-400/10 text-red-200"
    : "border-white/15 bg-white/10 text-white/90";
  return (
    <div className={`relative rounded-xl px-3 py-2 text-[13px] ${toneClasses}`}>
      <button
        aria-label="Dismiss"
        onClick={() => { try { localStorage.setItem(storageKey, "1"); } catch {} ; setHidden(true); }}
        className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-white/70 hover:bg-white/10"
      >
        ×
      </button>
      {children}
    </div>
  );
}

/* ================= component ================= */
export default function PushControls({ debug = false }) {
  const DEBUG = !!debug || (isDev && urlFlag);

  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  // Debug state
  const [diag, setDiag] = useState(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [swLog, setSwLog] = useState([]);

  // platform bits
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    (typeof navigator !== "undefined" && (navigator.standalone === true || navigator.standalone === 1));

  /* state refresh */
  const refreshState = async () => {
    try {
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "default");
      const reg = (await getAnyRegistration()) || (await ensureSW([]).catch(() => null));
      const sub = await reg?.pushManager?.getSubscription?.();
      const on = !!sub;
      setEnabled(on);
      setLocalEnabled(on);
    } catch {
      setEnabled(false);
      setLocalEnabled(false);
    } finally {
      broadcast();
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => { if (mounted) await refreshState(); })();
    const onVis = () => refreshState();
    document.addEventListener("visibilitychange", onVis);
    return () => { mounted = false; document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-subscribe once permission granted
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
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub),
          });
        }
      } catch {}
      finally {
        await refreshState();
      }
    })();
  }, [perm]); // eslint-disable-line react-hooks/exhaustive-deps

  /* actions */
  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window))
      throw new Error("Push notifications are not supported in this context.");
    if (!VAPID_PUBLIC) throw new Error("Missing VAPID public key (VITE_VAPID_PUBLIC_KEY).");
    if (isIOS && !isStandalone) throw new Error("Install to Home Screen first (Safari → Share → Add to Home Screen).");

    let p = typeof Notification !== "undefined" ? Notification.permission : "default";
    if (p !== "granted") p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("Notifications permission was not granted.");

    const reg = (await getAnyRegistration()) || (await ensureSW());
    if (!reg) throw new Error("Service worker not controlling this page.");

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64UrlToUint8Array(VAPID_PUBLIC),
      }));

    await fetch("/api/push/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub),
    });

    await refreshState();
    return sub;
  };

  const unsubscribeFromPush = async () => {
    const reg = (await getAnyRegistration()) || (await ensureSW().catch(() => null));
    const sub = await reg?.pushManager?.getSubscription?.();
    if (!sub) { await refreshState(); return; }
    try {
      await fetch("/api/push/unsubscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } finally {
      await sub.unsubscribe();
      await refreshState();
    }
  };

  const onCheckboxChange = async (e) => {
    setError("");
    if (perm === "denied") {
      e.target.checked = false;
      return setError("Notifications are blocked in iOS Settings → Notifications → [Your Web App].");
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
      setTimeout(() => setSavedNote(""), 2000);
    } catch (err) {
      setError(err?.message || "Failed to change notifications.");
      await refreshState();
      e.target.checked = enabled;
    } finally {
      setLoading(false);
    }
  };

  const requestPermissionAndSubscribe = async () => {
    try {
      setError("");
      const status = await Notification.requestPermission();
      setPerm(status);
      if (status === "granted") {
        await subscribeToPush();
        setSavedNote("Notifications enabled ✓");
        setTimeout(() => setSavedNote(""), 2000);
      }
    } catch (e) {
      setError(e?.message || "Unable to enable notifications.");
    }
  };

  /* ---------- RENDER RULE: hide when enabled (unless debug) ---------- */
  if (!VAPID_PUBLIC) {
    return (
      <InfoBanner id="missing-vapid" tone="error">
        <div className="font-semibold text-[14px] mb-1">Missing VAPID public key</div>
        <div className="opacity-90">Set <code>VITE_VAPID_PUBLIC_KEY</code> and redeploy.</div>
      </InfoBanner>
    );
  }

  // If notifications fully enabled, hide the card from the main screen.
  if (enabled && perm === "granted" && !DEBUG) {
    return null;
  }

  const statusText =
    perm === "denied"
      ? "Blocked in settings"
      : enabled
      ? "Enabled"
      : perm === "granted"
      ? "Allowed, but not subscribed"
      : "Permission not granted";

  const showFixRow = perm === "granted" && !enabled;

  return (
    <div className="mt-2 space-y-2" id="notif-toggle">
      {perm === "default" && (
        <button
          onClick={requestPermissionAndSubscribe}
          className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[15px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
        >
          Enable notifications
        </button>
      )}

      {/* Toggle only visible when not fully enabled or when debugging */}
      {(perm !== "granted" || !enabled || DEBUG) && (
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
      )}

      {showFixRow && (
        <button
          onClick={async () => {
            setError(""); setSwLog([]);
            try { await ensureSW([]); await subscribeToPush(); await refreshState(); setSavedNote("Notifications enabled ✓"); setTimeout(() => setSavedNote(""), 2000); }
            catch (e) { setError(e?.message || String(e)); await refreshState(); }
          }}
          className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[14px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
          disabled={loading}
        >
          Fix subscription
        </button>
      )}

      {savedNote && <div className="text-xs text-emerald-300">{savedNote}</div>}
      {!!error && <div className="text-sm text-red-300">{error}</div>}

      {/* ===== Debug-only tools (still available via menu toggle) ===== */}
      {DEBUG && (
        <div className="space-y-2 mt-3">
          <button
            onClick={async () => {
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
                  hasPush: "PushManager" in window,
                  hasNotification: "Notification" in window,
                  hasSW: "serviceWorker" in navigator,
                  perm: typeof Notification !== "undefined" ? Notification.permission : "unknown",
                  vapidPrefix: VAPID_PUBLIC.slice(0, 16) || "(empty)",
                });
              } finally {
                setSwLog((l) => (l.length ? l : logs));
                setDiagRunning(false);
              }
            }}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[14px]"
            disabled={diagRunning}
          >
            {diagRunning ? "Diagnosing…" : "Diagnose"}
          </button>

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
        </div>
      )}
    </div>
  );
}
