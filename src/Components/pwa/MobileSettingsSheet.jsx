// src/Components/pwa/MobileSettingsSheet.jsx
import React, { useMemo, useState } from "react";
import useInstallPrompt from "../../hooks/useInstallPrompt";
import { checkForUpdates as swCheckForUpdates, applySWUpdate } from "../../pwa/registerMobileSW";

function getMobileThemeNames(rows) {
  if (!Array.isArray(rows)) return [];
  const set = new Set();
  for (const r of rows) {
    const g = (r?.Group || "").trim();
    if (!g.startsWith("themeMobile.")) continue;
    const parts = g.split(".");
    if (parts[1]) set.add(parts[1].trim());
  }
  return Array.from(set).sort();
}

export default function MobileSettingsSheet({
  open, onClose, settingsRows, settings,
  currentThemeName, onChangeTheme, about = { version: "", timezone: "", lastUpdated: "" },
}) {
  if (!open) return null;
  const rows = Array.isArray(settingsRows) ? settingsRows : (settingsRows?.rows || []);
  const themeNames = useMemo(() => getMobileThemeNames(rows), [rows]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const changeTheme = (name) => {
    try { localStorage.setItem("selectedTheme", name || ""); } catch {}
    if (onChangeTheme) onChangeTheme(name);
  };

  const onCheckUpdate = async () => {
    try { setBusy(true); setStatus(""); await swCheckForUpdates(); setStatus("Checked for updates."); }
    catch (e) { setStatus(`Update check failed${e?.message ? `: ${e.message}` : ""}`); }
    finally { setBusy(false); }
  };

  const onApplyUpdate = async () => {
    try { setBusy(true); setStatus(""); await applySWUpdate(); setStatus("Applied update."); }
    catch (e) { setStatus(`Apply update failed${e?.message ? `: ${e.message}` : ""}`); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60">
      <div className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl border border-white/10 bg-[#0b0f1a] text-white shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 hover:bg-white/15">✕</button>
        </div>

        <div className="px-4 py-4 grid gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <div className="font-medium mb-2">Theme</div>
            <div className="flex flex-wrap gap-2">
              {themeNames.length === 0 && <div className="text-white/70 text-sm">No mobile themes found in Settings sheet.</div>}
              {themeNames.map((name) => (
                <button key={name} onClick={() => changeTheme(name)} disabled={busy}
                  className={["px-3 py-1.5 rounded-lg border transition",
                    currentThemeName === name ? "bg-white text-[#0b0f1a] border-white" : "bg-white/10 border-white/15 hover:bg-white/15",
                    busy ? "opacity-60 cursor-not-allowed" : ""].join(" ")}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <div className="font-medium mb-2">App</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onCheckUpdate} disabled={busy} className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-60">Check for update</button>
              <button onClick={onApplyUpdate} disabled={busy} className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-60">Apply update</button>
              <InstallButton busy={busy} />
            </div>
            {status && <div className="mt-2 text-sm opacity-80">{status}</div>}
          </div>

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

function InstallButton({ busy }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button onClick={() => promptInstall()} disabled={busy} className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 disabled:opacity-60">
      Install app
    </button>
  );
}
