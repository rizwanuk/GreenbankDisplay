// src/Components/pwa/MobileSettingsSheet.jsx
import React, { useMemo } from "react";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import { checkForUpdates as swCheckForUpdates, applySWUpdate } from "../../pwa/registerMobileSW";

/** Small helper to read theme names from Settings sheet rows */
function readThemeNamesFromSettings(rows) {
  if (!Array.isArray(rows)) return [];
  const names = new Set();
  for (const r of rows) {
    const g = (r?.Group || "").trim().toLowerCase();
    const k = (r?.Key || "").trim().toLowerCase();
    if (g === "themes" && k) names.add(r.Key.trim());
  }
  return Array.from(names);
}

export default function MobileSettingsSheet({
  open,
  onClose,
  settingsRows,
  currentThemeName,
  onChangeTheme, // (name) => void
  // kept for API compatibility but unused in this stripped version:
  about = { version: "", timezone: "", lastUpdated: "" },
  jamaahTimes = [],
}) {
  const allThemeNames = useMemo(() => readThemeNamesFromSettings(settingsRows), [settingsRows]);

  // PWA install prompt
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60">
      {/* Sheet */}
      <div className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl border border-white/10 bg-[#0b0f1a] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 hover:bg-white/15"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 grid gap-4">
          {/* Theme picker */}
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <div className="font-medium mb-2">Theme</div>
            <div className="flex flex-wrap gap-2">
              {allThemeNames.length === 0 && (
                <div className="text-white/70 text-sm">No themes found in Settings sheet.</div>
              )}
              {allThemeNames.map((name) => (
                <button
                  key={name}
                  onClick={() => onChangeTheme?.(name)}
                  className={[
                    "px-3 py-1.5 rounded-lg border transition",
                    currentThemeName === name
                      ? "bg-white text-[#0b0f1a] border-white"
                      : "bg-white/10 border-white/15 hover:bg-white/15",
                  ].join(" ")}
                >
                  {name}
                </button>
              ))}
              {currentThemeName && !allThemeNames.includes(currentThemeName) && (
                <span className="text-xs text-white/60">Active: {currentThemeName}</span>
              )}
            </div>
          </div>

          {/* PWA card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <div className="font-medium mb-2">App</div>
            <div className="flex gap-2">
              <button
                onClick={() => swCheckForUpdates()}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15"
              >
                Check for update
              </button>
              <button
                onClick={() => applySWUpdate()}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15"
              >
                Apply update
              </button>
              {canInstall && (
                <button
                  onClick={() => promptInstall()}
                  className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15"
                >
                  Install app
                </button>
              )}
            </div>
          </div>

          {/* About */}
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 text-sm">
            <div className="font-medium mb-1">About</div>
            <div>Version: {about?.version || "—"}</div>
            <div>Timezone: {about?.timezone || "—"}</div>
            <div>Last updated: {about?.lastUpdated || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
