// src/Screens/admin/panels/TestModePanel.jsx
import React, { useMemo } from "react";

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-9 w-16 items-center rounded-full border transition",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        checked
          ? "bg-emerald-600/70 border-emerald-300/30"
          : "bg-white/5 border-white/15",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span
        className={[
          "inline-block h-7 w-7 transform rounded-full bg-white transition",
          checked ? "translate-x-8" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function parseBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

export default function TestModePanel({ groups, setValue }) {
  const toggles = getGroup(groups, "toggles");

  const enabled = useMemo(
    () => parseBool(toggles?.fakeTimeEnabled),
    [toggles?.fakeTimeEnabled]
  );

  const fakeTime = useMemo(() => {
    const t = String(toggles?.fakeTime ?? "").trim();
    // expect "HH:mm" — if not present, default to 04:00
    return /^\d{2}:\d{2}$/.test(t) ? t : "04:00";
  }, [toggles?.fakeTime]);

  function setEnabled(next) {
    setValue("toggles", "fakeTimeEnabled", next ? "TRUE" : "FALSE");
  }

  function setTime(next) {
    setValue("toggles", "fakeTime", next || "04:00");
  }

  const presets = [
    { label: "00:30", hint: "After midnight" },
    { label: "04:10", hint: "Fajr window" },
    { label: "06:00", hint: "After sunrise" },
    { label: "12:30", hint: "Pre-Zuhr" },
    { label: "13:30", hint: "Zuhr / Jummah" },
    { label: "16:30", hint: "Asr" },
    { label: "18:30", hint: "Maghrib" },
    { label: "20:30", hint: "Isha" },
    { label: "22:30", hint: "Late night" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm md:text-base font-semibold">Test Mode</div>
            <div className="mt-1 text-xs md:text-sm opacity-75 leading-relaxed">
              Enable fake time to test prayer transitions, highlights, makrooh,
              and layout states without waiting in real time.
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <Switch checked={enabled} onChange={setEnabled} />
            <div className="text-xs opacity-70">
              {enabled ? "Enabled" : "Disabled"}
            </div>
          </div>
        </div>
      </div>

      <div
        className={[
          "rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4",
          !enabled ? "opacity-60" : "",
        ].join(" ")}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Fake time</div>
            <div className="text-xs opacity-70 mt-1">
              Stored in settings as <span className="font-mono">HH:mm</span>.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={fakeTime}
              disabled={!enabled}
              onChange={(e) => setTime(e.target.value)}
              className="w-40 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setTime("04:00")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 disabled:opacity-60"
              title="Reset to 04:00"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-70 mb-2">Quick presets</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={!enabled}
                onClick={() => setTime(p.label)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 disabled:opacity-60"
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-xs opacity-70">{p.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
        <div className="text-xs md:text-sm opacity-75 leading-relaxed">
          Note: fake time affects only the client display logic. It does not
          change timetable data in the sheet.
        </div>
      </div>
    </div>
  );
}
