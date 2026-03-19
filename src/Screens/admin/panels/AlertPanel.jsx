// src/Screens/admin/panels/AlertPanel.jsx
import React, { useState } from "react";

const TOKEN_KEY = "gbm_admin_id_token";

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

const ALERT_STYLES = [
  { label: "🔴 Urgent (red)",    value: "urgent",  bg: "bg-red-700",     text: "text-white", border: "border-red-400/40",     hex: "#dc2626" },
  { label: "🟡 Warning (amber)", value: "warning", bg: "bg-amber-600",   text: "text-white", border: "border-amber-400/40",   hex: "#d97706" },
  { label: "🔵 Info (blue)",     value: "info",    bg: "bg-blue-700",    text: "text-white", border: "border-blue-400/40",    hex: "#2563eb" },
  { label: "🟢 Notice (green)",  value: "notice",  bg: "bg-emerald-700", text: "text-white", border: "border-emerald-400/40", hex: "#059669" },
];

const DURATION_OPTIONS = [
  { label: "30 sec", value: 30 },
  { label: "1 min",  value: 60 },
  { label: "2 min",  value: 120 },
  { label: "5 min",  value: 300 },
  { label: "Custom", value: "custom" },
];


export default function AlertPanel({ groups, setValue, reload }) {
  const alert = getGroup(groups, "alert");
  const [saving, setSaving]       = useState(false);
  const [savedMsg, setSavedMsg]   = useState("");
  const [err, setErr]             = useState("");
  const [customSecs, setCustomSecs] = useState(10);
  const [selectedDuration, setSelectedDuration] = useState(60);

  const enabled   = String(alert?.enabled   || "false").toLowerCase() === "true";
  const message   = alert?.message   || "";
  const style     = alert?.style     || "urgent";
  const scrolling = String(alert?.scrolling || "false").toLowerCase() === "true";
  const expiresAt = alert?.expiresAt || "";

  const currentStyle = ALERT_STYLES.find((s) => s.value === style) || ALERT_STYLES[0];

  const remaining = (() => {
    if (!expiresAt || !enabled) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  })();


  async function saveAlert(overrides = {}) {
    setSaving(true); setErr(""); setSavedMsg("");
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const durationSecs = selectedDuration === "custom" ? Number(customSecs) : Number(selectedDuration);
      const expiresAtVal = overrides.enabled === false
        ? ""
        : new Date(Date.now() + durationSecs * 1000).toISOString();
      const updates = [
        { Group: "alert", Key: "enabled",   Value: String(overrides.enabled   ?? enabled) },
        { Group: "alert", Key: "message",   Value: overrides.message  ?? message },
        { Group: "alert", Key: "style",     Value: overrides.style    ?? style },
        { Group: "alert", Key: "scrolling", Value: String(overrides.scrolling ?? scrolling) },
        { Group: "alert", Key: "duration",  Value: String(durationSecs) },
        { Group: "alert", Key: "expiresAt", Value: overrides.enabled === false ? "" : expiresAtVal },
      ];
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 2000);
      if (typeof reload === "function") await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearAlert() {
    setValue("alert", "enabled", "false");
    setValue("alert", "message", "");
    await saveAlert({ enabled: false, message: "" });
  }

  return (
    <div className="space-y-4">
      {savedMsg && <div className="text-xs rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-200">✅ {savedMsg}</div>}
      {err      && <div className="text-xs rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">❌ {err}</div>}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="text-sm font-semibold">Preview</div>
        {enabled && message ? (
          <div className="relative overflow-hidden rounded-xl">
            <div className={`px-4 py-3 border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
              {scrolling ? (
                <div className="overflow-hidden whitespace-nowrap">
                  <span className="inline-block animate-marquee text-lg font-semibold">
                    {message} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {message}
                  </span>
                </div>
              ) : (
                <div className="text-lg font-semibold text-center">{message}</div>
              )}
            </div>
            {remaining !== null && (
              <div className="h-1 w-full bg-black/20">
                <div className="h-1 bg-white/60 transition-all" style={{ width: "60%" }} />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm opacity-40 text-center">
            No active alert — enable and enter a message below
          </div>
        )}
        {remaining !== null && remaining > 0 && (
          <div className="text-xs opacity-50 text-center">
            Expires in {remaining >= 60 ? `${Math.floor(remaining / 60)}m ${remaining % 60}s` : `${remaining}s`}
          </div>
        )}
        {remaining === 0 && enabled && (
          <div className="text-xs text-amber-300 text-center">⏱ Alert has expired — it will hide on next screen refresh</div>
        )}
      </div>



      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="text-sm font-semibold">Alert settings</div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Show alert on display</div>
            <div className="text-xs opacity-50 mt-0.5">Replaces the current prayer card on all screens</div>
          </div>
          <button type="button"
            onClick={() => setValue("alert", "enabled", enabled ? "false" : "true")}
            className={`relative inline-flex h-9 w-16 items-center rounded-full border transition ${
              enabled ? "bg-emerald-600/70 border-emerald-300/30" : "bg-white/5 border-white/15"
            }`}>
            <span className={`inline-block h-7 w-7 transform rounded-full bg-white transition ${enabled ? "translate-x-8" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium opacity-70">Alert message</div>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
            value={message}
            onChange={(e) => setValue("alert", "message", e.target.value)}
            placeholder="e.g. Car with number plate AB12 CDE is blocking the entrance — please move it immediately"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium opacity-70">Style</div>
          <div className="flex flex-wrap gap-2">
            {ALERT_STYLES.map((s) => (
              <button key={s.value} onClick={() => setValue("alert", "style", s.value)}
                className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                  style === s.value
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-medium opacity-70">Auto-hide after</div>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button key={d.value} onClick={() => setSelectedDuration(d.value)}
                className={`px-3 py-2 rounded-xl border text-sm transition-colors ${
                  selectedDuration === d.value
                    ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}>
                {d.label}
              </button>
            ))}
          </div>
          {selectedDuration === "custom" && (
            <div className="flex items-center gap-2 mt-2">
              <input type="number" min={5} max={3600} value={customSecs}
                onChange={(e) => setCustomSecs(Number(e.target.value))}
                className="w-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" />
              <span className="text-xs opacity-50">seconds</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Scrolling ticker</div>
            <div className="text-xs opacity-50 mt-0.5">Message scrolls across the screen instead of being static</div>
          </div>
          <button type="button"
            onClick={() => setValue("alert", "scrolling", scrolling ? "false" : "true")}
            className={`relative inline-flex h-9 w-16 items-center rounded-full border transition ${
              scrolling ? "bg-emerald-600/70 border-emerald-300/30" : "bg-white/5 border-white/15"
            }`}>
            <span className={`inline-block h-7 w-7 transform rounded-full bg-white transition ${scrolling ? "translate-x-8" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button onClick={clearAlert} disabled={saving || (!enabled && !message)}
            className="flex-1 text-sm rounded-xl border border-red-400/30 bg-red-500/10 text-red-300 px-4 py-2 hover:bg-red-500/20 disabled:opacity-40 font-medium">
            {saving ? "Clearing…" : "🗑 Clear & hide alert"}
          </button>
          <button onClick={() => saveAlert()} disabled={saving}
            className="flex-1 text-sm rounded-xl border border-emerald-400/25 bg-emerald-600/20 text-emerald-200 px-4 py-2 hover:bg-emerald-600/30 disabled:opacity-50 font-medium">
            {saving ? "Saving…" : "✅ Save & publish"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="text-sm font-semibold">How it works</div>
        <div className="text-xs opacity-60 space-y-1.5">
          <p>● When active, the alert <b>replaces</b> the current prayer card entirely — full size, big bold text.</p>
          <p>● A thin progress bar drains across the bottom — alert hides automatically when the timer expires.</p>
          <p>● Changes are pushed live to all screens within 60 seconds via SSE.</p>
          <p>● Use <b>Clear &amp; hide alert</b> to instantly remove it from all screens.</p>
          <p>● Typical uses: car blocking entrance, urgent announcements, event changes.</p>
        </div>
      </div>
    </div>
  );
}
