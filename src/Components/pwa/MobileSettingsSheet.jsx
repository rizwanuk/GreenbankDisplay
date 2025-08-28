// src/Components/pwa/MobileSettingsSheet.jsx
import React, { useEffect, useMemo, useState } from "react";
import PushControls from "./PushControls";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import { checkForUpdates as swCheckForUpdates, applySWUpdate } from "../../pwa/registerMobileSW";
import { enablePush } from "../../pwa/pushApi";

/** Accessible, full-row clickable checkbox with a visible tick */
function CheckRow({ id, label, checked, onChange, hint }) {
  return (
    <div className="py-2">
      <label
        htmlFor={id}
        className="flex items-center gap-3 cursor-pointer select-none"
        role="checkbox"
        aria-checked={checked}
      >
        {/* Real checkbox for a11y, visually hidden */}
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* Custom visual box with tick */}
        <span
          className={[
            "inline-flex h-5 w-5 items-center justify-center rounded-md border transition",
            checked
              ? "bg-white text-[#0b0f1a] border-white"
              : "bg-transparent text-transparent border-white/40",
          ].join(" ")}
          aria-hidden="true"
        >
          {/* Tick icon */}
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path d="M7.6 13.2L4.4 10l-1.1 1.1 4.3 4.3L17 6.9 15.9 5.8z" />
          </svg>
        </span>
        <span className="text-sm">{label}</span>
      </label>
      {hint ? <p className="text-xs text-white/50 pl-8 mt-1">{hint}</p> : null}
    </div>
  );
}

const DEFAULT_CATEGORIES = [
  { key: "adhanReminders", label: "Adhān reminders" },
  { key: "jummahAnnouncements", label: "Jum‘ah announcements" },
  { key: "events", label: "Event updates" },
  { key: "notices", label: "General notices" },
];

function readThemeNamesFromSettings(rows) {
  const names = (rows || [])
    .filter((r) => r?.Group && r.Group.startsWith("theme."))
    .map((r) => r.Group.split(".")[1])
    .filter(Boolean);
  return Array.from(new Set(names));
}

// 👉 adjust to your backend route if needed
const PREFS_ENDPOINT = "/api/push/prefs";

export default function MobileSettingsSheet({
  open,
  onClose,
  settingsRows,
  currentThemeName,
  onChangeTheme, // (name) => void
  categoryKey = "mobile.notif.categories",
  // About (from MobileScreen)
  about = { version: "", timezone: "", lastUpdated: "" },
}) {
  const allThemeNames = useMemo(() => readThemeNamesFromSettings(settingsRows), [settingsRows]);

  // Install app (PWA) — optional card
  const { canInstallMenu, install, installed, isIOS, isIOSSafari } = useInstallPrompt();

  // ---- Push status (permission + subscription present) ----
  const [perm, setPerm] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [hasSub, setHasSub] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [enableMsg, setEnableMsg] = useState("");

  async function refreshPushState() {
    try {
      setPerm(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
      if (!("serviceWorker" in navigator)) {
        setHasSub(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setHasSub(!!sub);
    } catch {
      setHasSub(false);
    }
  }
  useEffect(() => {
    refreshPushState();
    const onVis = () => refreshPushState();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEnableNotifications = async () => {
    setEnabling(true);
    setEnableMsg("");
    try {
      const res = await enablePush();
      if (res?.ok) {
        setEnableMsg("Notifications enabled ✅");
      } else if (res?.permission !== "granted") {
        setEnableMsg("Permission was not granted.");
      } else {
        setEnableMsg("Could not register for push.");
      }
    } catch (e) {
      setEnableMsg(`Could not enable: ${e?.message || e}`);
    } finally {
      setEnabling(false);
      refreshPushState();
    }
  };

  // Categories persistence
  const [cats, setCats] = useState(() => {
    try {
      const raw = localStorage.getItem(categoryKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && Array.isArray(parsed) ? parsed : DEFAULT_CATEGORIES.map((c) => c.key);
    } catch {
      return DEFAULT_CATEGORIES.map((c) => c.key);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(categoryKey, JSON.stringify(cats));
    } catch {}
  }, [cats, categoryKey]);

  const toggleCat = (key, enabled) => {
    setCats((prev) => {
      const set = new Set(prev);
      if (enabled) set.add(key);
      else set.delete(key);
      return Array.from(set);
    });
  };

  // Start/Jama'ah notification preferences
  const [startEnabled, setStartEnabled] = useState(() => {
    try {
      return localStorage.getItem("mobile.notif.start.enabled") === "true";
    } catch {
      return false;
    }
  });
  const [jamaahEnabled, setJamaahEnabled] = useState(() => {
    try {
      return localStorage.getItem("mobile.notif.jamaah.enabled") === "true";
    } catch {
      return false;
    }
  });
  const [minutesBefore, setMinutesBefore] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem("mobile.notif.jamaah.minutesBefore") || "10", 10);
      return Number.isFinite(v) ? Math.max(0, Math.min(120, v)) : 10;
    } catch {
      return 10;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mobile.notif.start.enabled", startEnabled ? "true" : "false");
    } catch {}
  }, [startEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem("mobile.notif.jamaah.enabled", jamaahEnabled ? "true" : "false");
    } catch {}
  }, [jamaahEnabled]);
  useEffect(() => {
    try {
      localStorage.setItem("mobile.notif.jamaah.minutesBefore", String(minutesBefore));
    } catch {}
  }, [minutesBefore]);

  // 🔔 Test notification (local via SW)
  const sendTestNotification = async () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          alert("Please allow notifications first.");
          return;
        }
      }
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("Greenbank Masjid", {
        body: "This is a test notification.",
        icon: "/mobile/icons/icon-192.png",
        badge: "/mobile/icons/icon-192.png",
      });
    } catch {
      alert("Could not show a test notification. Check permissions and SW registration.");
    }
  };

  // 🌐 Auto-sync preferences to backend whenever they change (if a push subscription exists)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!mounted || !sub) return;

        const payload = {
          endpoint: sub.endpoint,
          keys: sub.toJSON()?.keys || null,
          prefs: {
            startEnabled,
            jamaahEnabled,
            minutesBefore,
            categories: cats,
          },
          clientId:
            localStorage.getItem("mobile.clientId") ||
            (() => {
              const id = Math.random().toString(36).slice(2);
              try {
                localStorage.setItem("mobile.clientId", id);
              } catch {}
              return id;
            })(),
        };

        await fetch(PREFS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
      } catch {
        // ignore on client
      }
    })();
    return () => {
      mounted = false;
    };
  }, [startEnabled, jamaahEnabled, minutesBefore, cats]);

  // -------- Update / Version controls --------
  const [updState, setUpdState] = useState("idle"); // idle | checking | available | none | applying | error
  const [updMsg, setUpdMsg] = useState("");
  const [waitingReg, setWaitingReg] = useState(null);

  // Unified "Check for updates":
  // 1) Try the helper (auto-applies if an update is available)
  // 2) If not updated, fall back to a manual check that can show "Update now"
  const onCheckForUpdates = async () => {
    setUpdState("checking");
    setUpdMsg("Checking for updates…");
    try {
      // Attempt helper (will auto-apply & reload if a waiting worker exists)
      const res = await swCheckForUpdates();
      if (res?.updated) {
        setUpdState("applying");
        setUpdMsg("Applying update…");
        return; // page will reload via applySWUpdate inside the helper
      }

      // Fallback manual detection (e.g., Safari nuances)
      let reg = await navigator.serviceWorker.getRegistration("/mobile/");
      if (!reg) reg = await navigator.serviceWorker.ready;
      if (!reg) {
        setUpdState("error");
        setUpdMsg("Service worker not registered.");
        return;
      }

      await reg.update().catch(() => {});

      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingReg(reg);
        setUpdState("available");
        setUpdMsg("Update available.");
        return;
      }

      const installing = reg.installing;
      if (installing) {
        await new Promise((resolve) => {
          const onState = () => {
            if (installing.state === "installed") {
              installing.removeEventListener("statechange", onState);
              resolve();
            }
          };
          installing.addEventListener("statechange", onState);
        });
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingReg(reg);
          setUpdState("available");
          setUpdMsg("Update available.");
          return;
        }
      }

      setUpdState("none");
      setUpdMsg("You’re on the latest version.");
    } catch (e) {
      setUpdState("error");
      setUpdMsg(e?.message || "Update check failed.");
    }
  };

  const applyUpdate = async () => {
    // If we don't have a stored waiting reg, try to grab one
    let reg = waitingReg;
    if (!reg) {
      reg =
        (await navigator.serviceWorker.getRegistration("/mobile/")) ||
        (await navigator.serviceWorker.ready);
      if (reg?.waiting) setWaitingReg(reg);
      else {
        setUpdState("none");
        setUpdMsg("No update to apply.");
        return;
      }
    }
    try {
      setUpdState("applying");
      setUpdMsg("Applying update…");
      await applySWUpdate(reg);
      // reload will occur on controllerchange inside applySWUpdate
    } catch (e) {
      setUpdState("error");
      setUpdMsg(e?.message || "Failed to apply update.");
    }
  };

  if (!open) return null;

  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close settings" />
      {/* Sheet (mobile-optimised width, sticky header, scrollable content) */}
      <div className="absolute inset-x-0 bottom-0 text-white border-t border-white/10 shadow-2xl bg-transparent">
        <div className="mx-auto w-full max-w-[420px] rounded-t-2xl bg-[#0b0f1a]">
          {/* Header (sticky) */}
          <div className="sticky top-0 z-10 bg-[#0b0f1a] border-b border-white/10">
            <div className="px-4 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
              <div className="flex items-center justify-between pb-2">
                <button
                  aria-label="Back"
                  onClick={onClose}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  ← Back
                </button>
                <h2 className="text-lg font-semibold">Settings</h2>
                <button
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="px-4 pb-4 max-h-[80vh] overflow-y-auto">
            {/* Install app (optional) */}
            {canInstallMenu && !installed && (
              <section className="mt-3">
                <h3 className="text-sm font-semibold text-white/90">Install app</h3>
                <p className="text-xs text-white/60 mt-1">
                  Install to your home screen for faster access and notification support.
                </p>
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                  <span className="text-sm">Add to Home Screen</span>
                  <button
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                    onClick={install}
                  >
                    Install
                  </button>
                </div>
                {isIOS && !isIOSSafari && (
                  <p className="text-[11px] text-white/50 mt-1">
                    Open in <b>Safari</b>, then Share → <b>Add to Home Screen</b>.
                  </p>
                )}
              </section>
            )}

            {/* Notifications */}
            <section className="mt-3">
              <h3 className="text-sm font-semibold text-white/90">Notifications</h3>
              <p className="text-xs text-white/60 mt-1">
                Turn on push notifications and choose what you’d like to receive.
              </p>

              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                {/* Enable button / status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-white/70">
                    Status:&nbsp;
                    <span className="font-medium">
                      {!pushSupported
                        ? "Not supported"
                        : perm === "granted"
                        ? hasSub
                          ? "Enabled"
                          : "Granted (no subscription)"
                        : perm === "denied"
                        ? "Denied"
                        : "Not enabled"}
                    </span>
                  </div>

                  {pushSupported && perm !== "granted" && (
                    <button
                      type="button"
                      onClick={onEnableNotifications}
                      disabled={enabling}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-sm"
                    >
                      {enabling ? "Enabling…" : "Enable notifications"}
                    </button>
                  )}

                  {pushSupported && perm === "granted" && !hasSub && (
                    <button
                      type="button"
                      onClick={onEnableNotifications}
                      disabled={enabling}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-sm"
                    >
                      {enabling ? "Registering…" : "Register device"}
                    </button>
                  )}
                </div>
                {enableMsg && <p className="text-[11px] text-white/60 mt-1">{enableMsg}</p>}

                {/* Existing push controls (sound, vibration etc) */}
                <div className="mt-3">
                  <PushControls debug={false} />
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={sendTestNotification}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                  >
                    Send test notification
                  </button>
                </div>
              </div>

              {/* Start & Jama'ah options */}
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <CheckRow
                  id="notif-start"
                  label="Start time notifications"
                  checked={startEnabled}
                  onChange={setStartEnabled}
                  hint="Receive a notification at the start time of each prayer."
                />
                <CheckRow
                  id="notif-jamaah"
                  label="Jama‘ah time notifications"
                  checked={jamaahEnabled}
                  onChange={setJamaahEnabled}
                  hint="Receive a notification before the congregational (Jama‘ah) time."
                />

                {/* Minutes before Jama'ah */}
                <div className="mt-2 pl-8">
                  <label htmlFor="notif-jamaah-mins" className="text-sm block mb-1">
                    Minutes before Jama‘ah
                  </label>
                  <input
                    id="notif-jamaah-mins"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={120}
                    step={1}
                    value={minutesBefore}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "0", 10);
                      if (Number.isFinite(v)) {
                        const clamped = Math.max(0, Math.min(120, v));
                        setMinutesBefore(clamped);
                      }
                    }}
                    className="w-24 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                {DEFAULT_CATEGORIES.map((c) => (
                  <CheckRow
                    key={c.key}
                    id={`cat-${c.key}`}
                    label={c.label}
                    checked={cats.includes(c.key)}
                    onChange={(v) => toggleCat(c.key, v)}
                  />
                ))}
                <p className="text-xs text-white/50 mt-1">Your selections are saved on this device.</p>
              </div>
            </section>

            {/* Theme */}
            <section className="mt-4">
              <h3 className="text-sm font-semibold text-white/90">Theme</h3>
              <p className="text-xs text-white/60 mt-1">
                Choose a theme for this screen. This uses the same theme set as your main display.
              </p>
              <div className="mt-2">
                <select
                  value={currentThemeName || ""}
                  onChange={(e) => onChangeTheme(e.target.value)}
                  className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {allThemeNames.length === 0 ? (
                    <option value="">Default</option>
                  ) : (
                    allThemeNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-white/50 mt-1">Saved to this device and applied immediately.</p>
              </div>
            </section>

            {/* Updates & About */}
            <section className="mt-4 mb-2">
              <h3 className="text-sm font-semibold text-white/90">App version & updates</h3>

              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="opacity-80">App version</span>
                  <span className="font-medium">{about.version || "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="opacity-80">Timezone</span>
                  <span className="font-medium">{about.timezone || "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="opacity-80">Last updated</span>
                  <span className="font-medium">{about.lastUpdated || "—"}</span>
                </div>

                {/* Update controls */}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
                    onClick={onCheckForUpdates}
                    disabled={updState === "checking" || updState === "applying"}
                  >
                    {updState === "checking" ? "Checking…" : "Check for updates"}
                  </button>

                  {updState === "available" && (
                    <button
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-sm"
                      onClick={applyUpdate}
                      disabled={updState === "applying"}
                    >
                      {updState === "applying" ? "Updating…" : "Update now"}
                    </button>
                  )}
                </div>

                {updMsg && <p className="text-xs text-white/60 mt-2">{updMsg}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
