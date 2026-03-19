// src/Screens/MobileAdminScreen.jsx
import React, { useEffect, useState, useCallback } from "react";
import { PublicClientApplication } from "@azure/msal-browser";

const TOKEN_KEY = "gbm_admin_id_token";

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: window.location.origin + "/mobile-admin",
  },
  cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false },
};

let _msalInstance = null;
async function getMsal() {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
    await _msalInstance.initialize();
  }
  return _msalInstance;
}

const ALERT_STYLES = [
  { label: "🔴 Urgent",  value: "urgent",  hex: "#dc2626" },
  { label: "🟡 Warning", value: "warning", hex: "#d97706" },
  { label: "🔵 Info",    value: "info",    hex: "#2563eb" },
  { label: "🟢 Notice",  value: "notice",  hex: "#059669" },
];

const DURATION_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "1m",  value: 60 },
  { label: "2m",  value: 120 },
  { label: "5m",  value: 300 },
];

const PRAYERS = ["Fajr", "Shouruq", "Zuhr", "Asr", "Maghrib", "Esha"];
const TABS = [
  { id: "alert",   label: "Alert",   icon: "🚨" },
  { id: "prayers", label: "Prayers", icon: "🕌" },
  { id: "jummah",  label: "Jumu'ah", icon: "📅" },
  { id: "theme",   label: "Theme",   icon: "🎨" },
];

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiGet(path) {
  const r = await fetch(path, { headers: authHeaders() });
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(path, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  return r.json();
}

function rowsToMap(rows) {
  const m = {};
  for (const r of rows) m[`${r.Group}.${r.Key}`] = r.Value;
  return m;
}

function SignIn({ onSignedIn }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getMsal().then(msal => msal.handleRedirectPromise()).then(result => {
      if (result?.idToken) { localStorage.setItem(TOKEN_KEY, result.idToken); onSignedIn(); }
    }).catch(e => setErr(e?.message || String(e)));
  }, [onSignedIn]);

  const signIn = async () => {
    setLoading(true); setErr("");
    try { const msal = await getMsal(); await msal.loginRedirect({ scopes: ["openid", "profile", "email"] }); }
    catch (e) { setErr(e?.message || String(e)); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl">🕌</div>
        <div className="text-2xl font-bold">Greenbank Admin</div>
        <div className="text-sm opacity-60 text-center">Sign in to manage display settings</div>
      </div>
      <button onClick={signIn} disabled={loading}
        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-semibold hover:bg-white/20 disabled:opacity-50 w-full max-w-xs justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 21 21">
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
          <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
        {loading ? "Redirecting…" : "Sign in with Microsoft"}
      </button>
      {err && <div className="text-red-300 text-sm text-center">{err}</div>}
    </div>
  );
}

function AlertTab({ settings, onSave }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(settings["alert.message"] || "");
  const [style, setStyle] = useState(settings["alert.style"] || "urgent");
  const [duration, setDuration] = useState(60);
  const [savedMsg, setSavedMsg] = useState("");
  const [err, setErr] = useState("");

  const enabled = settings["alert.enabled"] === "true";
  const expiresAt = settings["alert.expiresAt"] || "";
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const isActive = enabled && settings["alert.message"] && !isExpired;

  async function publish() {
    setSaving(true); setErr(""); setSavedMsg("");
    try {
      const expiresAtVal = new Date(Date.now() + duration * 1000).toISOString();
      const j = await apiPost("/api/admin/settings", { updates: [
        { Group: "alert", Key: "enabled",   Value: "true" },
        { Group: "alert", Key: "message",   Value: msg },
        { Group: "alert", Key: "style",     Value: style },
        { Group: "alert", Key: "scrolling", Value: "false" },
        { Group: "alert", Key: "duration",  Value: String(duration) },
        { Group: "alert", Key: "expiresAt", Value: expiresAtVal },
      ]});
      if (!j?.ok) throw new Error(j?.error || "Failed");
      setSavedMsg("✅ Alert published"); setTimeout(() => setSavedMsg(""), 3000);
      onSave();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  }

  async function clear() {
    setSaving(true); setErr("");
    try {
      const j = await apiPost("/api/admin/settings", { updates: [
        { Group: "alert", Key: "enabled",   Value: "false" },
        { Group: "alert", Key: "message",   Value: "" },
        { Group: "alert", Key: "expiresAt", Value: "" },
      ]});
      if (!j?.ok) throw new Error(j?.error || "Failed");
      setSavedMsg("✅ Alert cleared"); setTimeout(() => setSavedMsg(""), 3000);
      onSave();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {savedMsg && <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3 text-emerald-200 text-sm">{savedMsg}</div>}
      {err && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-red-200 text-sm">❌ {err}</div>}
      <div className={`rounded-2xl border px-4 py-3 ${isActive ? "border-amber-400/30 bg-amber-500/10" : "border-white/10 bg-white/5"}`}>
        <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">Current status</div>
        <div className={`text-sm font-medium ${isActive ? "text-amber-300" : "text-white/40"}`}>
          {isActive ? `🔴 Active: "${settings["alert.message"]}"` : "No active alert"}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">Message</div>
        <textarea className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:border-white/30"
          value={msg} onChange={e => setMsg(e.target.value)}
          placeholder="e.g. Car blocking entrance — please move immediately" />
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">Style</div>
        <div className="grid grid-cols-2 gap-2">
          {ALERT_STYLES.map(s => (
            <button key={s.value} onClick={() => setStyle(s.value)}
              className={`py-3 rounded-2xl border text-sm font-medium transition-colors ${style === s.value ? "border-white/40 bg-white/20" : "border-white/10 bg-white/5"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">Auto-hide after</div>
        <div className="grid grid-cols-4 gap-2">
          {DURATION_OPTIONS.map(d => (
            <button key={d.value} onClick={() => setDuration(d.value)}
              className={`py-3 rounded-2xl border text-sm font-medium transition-colors ${duration === d.value ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-white/5"}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={clear} disabled={saving || !isActive}
          className="py-4 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300 font-semibold disabled:opacity-40">
          🗑 Clear
        </button>
        <button onClick={publish} disabled={saving || !msg}
          className="py-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 font-semibold disabled:opacity-40">
          {saving ? "Saving…" : "📢 Publish"}
        </button>
      </div>
    </div>
  );
}

// Column indices matching the API
const COL = {
  fajr_adhan: 3, fajr_iqamah: 4, shouruq: 5,
  dhuhr_adhan: 6, dhuhr_iqamah: 7,
  asr_adhan: 8, asr_iqamah: 9,
  maghrib_adhan: 10, maghrib_iqamah: 11,
  isha_adhan: 12, isha_iqamah: 13,
};

const PRAYER_FIELDS = [
  { label: "Fajr",    adhan: "fajr_adhan",    iqamah: "fajr_iqamah" },
  { label: "Shouruq", adhan: "shouruq",        iqamah: null },
  { label: "Zuhr",    adhan: "dhuhr_adhan",    iqamah: "dhuhr_iqamah" },
  { label: "Asr",     adhan: "asr_adhan",      iqamah: "asr_iqamah" },
  { label: "Maghrib", adhan: "maghrib_adhan",  iqamah: "maghrib_iqamah" },
  { label: "Esha",    adhan: "isha_adhan",     iqamah: "isha_iqamah" },
];

function rowToObj(row) {
  if (!row) return {};
  return {
    fajr_adhan: row[2], fajr_iqamah: row[3], shouruq: row[4],
    dhuhr_adhan: row[5], dhuhr_iqamah: row[6],
    asr_adhan: row[7], asr_iqamah: row[8],
    maghrib_adhan: row[9], maghrib_iqamah: row[10],
    isha_adhan: row[11], isha_iqamah: row[12],
  };
}

function PrayerTimesTab() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState({});  // key: "rowIndex_col" -> value
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [err, setErr] = useState("");

  const now = new Date();
  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomDay = tomorrowDate.getDate();
  const tomMonth = tomorrowDate.getMonth() + 1;

  useEffect(() => {
    apiGet("/api/admin/prayertimes").then(j => {
      setAllRows(j.rows || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Find row indices for today and tomorrow (rows are 0-indexed, API row r = rowIndex+2)
  const todayIdx = allRows.findIndex(r => Number(r[0]) === todayDay && Number(r[1]) === todayMonth);
  const tomIdx   = allRows.findIndex(r => Number(r[0]) === tomDay   && Number(r[1]) === tomMonth);

  function getVal(rowIdx, field) {
    const key = `${rowIdx}_${field}`;
    if (edits[key] !== undefined) return edits[key];
    return rowToObj(allRows[rowIdx])[field] || "";
  }

  function setVal(rowIdx, field, val) {
    setEdits(e => ({ ...e, [`${rowIdx}_${field}`]: val }));
  }

  async function save() {
    setSaving(true); setErr(""); setSavedMsg("");
    try {
      const patches = Object.entries(edits).map(([key, value]) => {
        const [rowIdx, field] = key.split("_").reduce((acc, p, i, arr) => {
          if (i === 0) return [Number(p), ""];
          return [acc[0], acc[1] ? acc[1] + "_" + p : p];
        }, [0, ""]);
        return { r: rowIdx + 2, c: COL[field], value };
      });
      const j = await apiPost("/api/admin/prayertimes", { patches });
      if (!j?.ok) throw new Error(j?.error || "Failed");
      setSavedMsg("✅ Saved"); setTimeout(() => setSavedMsg(""), 3000);
      // Refresh rows
      const fresh = await apiGet("/api/admin/prayertimes");
      setAllRows(fresh.rows || []);
      setEdits({});
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  }

  if (loading) return <div className="text-center opacity-50 py-12">Loading…</div>;

  function DaySection({ label, rowIdx }) {
    if (rowIdx < 0) return null;
    return (
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-widest opacity-40 pt-2">{label}</div>
        {PRAYER_FIELDS.map(p => (
          <div key={p.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
            <div className="text-sm font-bold">{p.label}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs opacity-50">Start</div>
                <input type="time" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                  value={getVal(rowIdx, p.adhan)}
                  onChange={e => setVal(rowIdx, p.adhan, e.target.value)} />
              </div>
              {p.iqamah && (
                <div className="space-y-1">
                  <div className="text-xs opacity-50">Jama'ah</div>
                  <input type="time" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    value={getVal(rowIdx, p.iqamah)}
                    onChange={e => setVal(rowIdx, p.iqamah, e.target.value)} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {savedMsg && <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3 text-emerald-200 text-sm">{savedMsg}</div>}
      {err && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-red-200 text-sm">❌ {err}</div>}
      <DaySection label="Today" rowIdx={todayIdx} />
      <DaySection label="Tomorrow" rowIdx={tomIdx} />
      {Object.keys(edits).length > 0 && (
        <button onClick={save} disabled={saving}
          className="w-full py-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 font-semibold mt-4">
          {saving ? "Saving…" : "✅ Save prayer times"}
        </button>
      )}
    </div>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function JummahTab({ settings, onSave }) {
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [err, setErr] = useState("");

  const currentMonth = MONTHS[new Date().getMonth()];
  const nextMonthIdx = (new Date().getMonth() + 1) % 12;
  const nextMonth = MONTHS[nextMonthIdx];

  const [currentTime, setCurrentTime] = useState(settings[`jummahTimes.${currentMonth}`] || "");
  const [nextTime, setNextTime] = useState(settings[`jummahTimes.${nextMonth}`] || "");

  async function save() {
    setSaving(true); setErr(""); setSavedMsg("");
    try {
      const j = await apiPost("/api/admin/settings", { updates: [
        { Group: "jummahTimes", Key: currentMonth, Value: currentTime },
        { Group: "jummahTimes", Key: nextMonth,    Value: nextTime },
      ]});
      if (!j?.ok) throw new Error(j?.error || "Failed");
      setSavedMsg("✅ Saved"); setTimeout(() => setSavedMsg(""), 3000);
      onSave();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {savedMsg && <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3 text-emerald-200 text-sm">{savedMsg}</div>}
      {err && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-red-200 text-sm">❌ {err}</div>}
      <div className="text-xs opacity-50">Jumu'ah times are set per month. Edit the full schedule from the desktop admin.</div>
      {[[currentMonth, currentTime, setCurrentTime], [nextMonth, nextTime, setNextTime]].map(([month, val, setter]) => (
        <div key={month} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
          <div className="text-sm font-bold">{month}</div>
          <input type="time" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
            value={val} onChange={e => setter(e.target.value)} />
        </div>
      ))}
      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 font-semibold">
        {saving ? "Saving…" : "✅ Save Jumu'ah times"}
      </button>
    </div>
  );
}

function ThemeTab({ settings, onSave }) {
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [err, setErr] = useState("");
  const [theme, setTheme] = useState(settings["toggles.theme"] || "Theme_1");
  const THEMES = ["Theme_1", "Theme_2", "Theme_3", "Theme_4"];

  async function save() {
    setSaving(true); setErr(""); setSavedMsg("");
    try {
      const j = await apiPost("/api/admin/settings", { updates: [
        { Group: "toggles", Key: "theme", Value: theme },
      ]});
      if (!j?.ok) throw new Error(j?.error || "Failed");
      setSavedMsg("✅ Theme updated"); setTimeout(() => setSavedMsg(""), 3000);
      onSave();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {savedMsg && <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3 text-emerald-200 text-sm">{savedMsg}</div>}
      {err && <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-red-200 text-sm">❌ {err}</div>}
      <div className="text-xs opacity-50">Select the active display theme</div>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map(t => (
          <button key={t} onClick={() => setTheme(t)}
            className={`py-4 rounded-2xl border text-sm font-semibold transition-colors ${theme === t ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200" : "border-white/10 bg-white/5"}`}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-200 font-semibold">
        {saving ? "Saving…" : "✅ Apply theme"}
      </button>
    </div>
  );
}

export default function MobileAdminScreen() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState("alert");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const j = await apiGet("/api/settings");
      setSettings(rowsToMap(j.rows || []));
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) loadSettings(); }, [authed, loadSettings]);

  if (!authed) return <SignIn onSignedIn={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="bg-gray-900 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-base">Greenbank Admin</div>
          <div className="text-xs opacity-50">Mobile panel</div>
        </div>
        <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setAuthed(false); }}
          className="text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 opacity-60">
          Sign out
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? <div className="text-center opacity-50 py-12">Loading…</div> : (
          <>
            {tab === "alert"   && <AlertTab settings={settings} onSave={loadSettings} />}
            {tab === "prayers" && <PrayerTimesTab />}
            {tab === "jummah"  && <JummahTab settings={settings} onSave={loadSettings} />}
            {tab === "theme"   && <ThemeTab settings={settings} onSave={loadSettings} />}
          </>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-white/10 flex">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors ${tab === t.id ? "text-emerald-300 border-t-2 border-emerald-400" : "text-white/40"}`}>
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
