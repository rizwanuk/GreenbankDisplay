import React, { useEffect, useMemo, useState } from "react";
import PushControls from "./PushControls";
import useInstallPrompt from "../../hooks/useInstallPrompt";

/** Small checkbox row */
function CheckRow({ id, label, checked, onChange, hint }) {
  return (
    <div className="py-2">
      <label htmlFor={id} className="flex items-center gap-3">
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 accent-white/90"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm">{label}</span>
      </label>
      {hint ? <p className="text-xs text-white/50 pl-7 mt-1">{hint}</p> : null}
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

export default function MobileSettingsSheet({
  open,
  onClose, // <- parent handles history/back semantics
  settingsRows,
  currentThemeName,
  onChangeTheme, // (name) => void
  categoryKey = "mobile.notif.categories",

  // About
  about = { version: "", timezone: "", lastUpdated: "" },
}) {
  const allThemeNames = useMemo(() => readThemeNamesFromSettings(settingsRows), [settingsRows]);

  // Install app (PWA) — optional card
  const { canInstallMenu, install, installed, isIOS, isIOSSafari } = useInstallPrompt();

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close settings"
      />
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

            {/* Notifications main toggle */}
            <section className="mt-3">
              <h3 className="text-sm font-semibold text-white/90">Notifications</h3>
              <p className="text-xs text-white/60 mt-1">
                Turn on push notifications and choose what you’d like to receive.
              </p>

              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <PushControls debug={false} />
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
                <div className="mt-2 pl-7">
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
                <p className="text-xs text-white/50 mt-1">
                  Your selections are saved on this device.
                </p>
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
                <p className="text-xs text-white/50 mt-1">
                  Saved to this device and applied immediately.
                </p>
              </div>
            </section>

            {/* About */}
            <section className="mt-4 mb-2">
              <h3 className="text-sm font-semibold text-white/90">About</h3>
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
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
