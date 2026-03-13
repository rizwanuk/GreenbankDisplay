// src/Screens/admin/panels/DevicesPanel.jsx
import React, { useEffect, useState } from "react";

const DISPLAY_MODES = ["", "main", "slideshow", "messages", "embed"];

function getToken() {
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.includes("idtoken") || k.includes("id_token")) {
        const raw = sessionStorage.getItem(k);
        try { return JSON.parse(raw)?.secret || raw; } catch { return raw; }
      }
    }
  } catch {}
  return null;
}

export default function DevicesPanel() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // device_code being edited
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");

  async function fetchDevices() {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/device-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) setDevices(data.devices);
      else setError(data.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDevices(); }, []);

  async function save(device) {
    setSaving(true);
    try {
      const token = getToken();
      await fetch("/api/admin/device-config", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(device),
      });
      await fetchDevices();
      setEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDevice(device_code) {
    if (!confirm(`Delete device ${device_code}?`)) return;
    const token = getToken();
    await fetch("/api/admin/device-config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device_code }),
    });
    await fetchDevices();
  }

  function startEdit(d) {
    setEditing(d.device_code);
    setForm({
      device_code: d.device_code,
      device_name: d.device_name || "",
      display_mode: d.display_mode || "",
      theme_override: d.theme_override || "",
      enabled: d.enabled === 1 || d.enabled === true,
      notes: d.notes || "",
    });
  }

  function formatDate(dt) {
    if (!dt) return "Never";
    return new Date(dt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm md:text-base font-semibold">Remote Devices</div>
            <div className="text-xs opacity-70 mt-1">
              Manage display screens by their 6-digit device code.
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            + Add Device
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.04] p-3 space-y-2">
            <div className="text-xs font-semibold opacity-70">Add device by code</div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit code"
                value={newCode}
                onChange={e => setNewCode(e.target.value.replace(/\D/g, ""))}
                className="w-36 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
              />
              <button
                onClick={() => { save({ device_code: newCode, enabled: true }); setShowAdd(false); setNewCode(""); }}
                disabled={newCode.length !== 6}
                className="rounded-xl border border-white/15 bg-emerald-600/50 px-3 py-2 text-xs hover:bg-emerald-600/70 disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewCode(""); }}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <div className="text-xs opacity-60 py-4 text-center">Loading...</div>}
        {error && <div className="text-xs text-red-400 py-2">{error}</div>}

        {!loading && devices.length === 0 && (
          <div className="text-xs opacity-50 py-4 text-center">No devices registered yet.</div>
        )}

        <div className="space-y-2">
          {devices.map(d => (
            <div key={d.device_code} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              {editing === d.device_code ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs opacity-60 mb-1">Device Name</div>
                      <input value={form.device_name} onChange={e => setForm({...form, device_name: e.target.value})}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-white/25" />
                    </div>
                    <div>
                      <div className="text-xs opacity-60 mb-1">Display Mode</div>
                      <select value={form.display_mode} onChange={e => setForm({...form, display_mode: e.target.value})}
                        className="w-full rounded-xl border border-white/15 bg-zinc-800 px-2 py-1.5 text-sm outline-none">
                        {DISPLAY_MODES.map(m => <option key={m} value={m}>{m || "(default)"}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs opacity-60 mb-1">Theme Override</div>
                      <input value={form.theme_override} onChange={e => setForm({...form, theme_override: e.target.value})}
                        className="w-full rounded-xl border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-white/25" />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} id={`en-${d.device_code}`} />
                      <label htmlFor={`en-${d.device_code}`} className="text-sm">Enabled</label>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-60 mb-1">Notes</div>
                    <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                      className="w-full rounded-xl border border-white/15 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-white/25" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => save(form)} disabled={saving}
                      className="rounded-xl border border-white/15 bg-emerald-600/50 px-3 py-1.5 text-xs hover:bg-emerald-600/70 disabled:opacity-40">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{d.device_code}</span>
                      {d.device_name && <span className="text-sm opacity-80">{d.device_name}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${d.enabled ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 opacity-50"}`}>
                        {d.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs opacity-60">
                      {d.display_mode && <span>Mode: {d.display_mode}</span>}
                      {d.theme_override && <span>Theme: {d.theme_override}</span>}
                      <span>Last seen: {formatDate(d.last_seen)}</span>
                    </div>
                    {d.notes && <div className="mt-1 text-xs opacity-50">{d.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(d)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
                      Edit
                    </button>
                    <button onClick={() => deleteDevice(d.device_code)}
                      className="rounded-lg border border-red-400/20 bg-red-400/5 px-2 py-1 text-xs hover:bg-red-400/15 text-red-300">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
