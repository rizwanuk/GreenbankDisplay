// src/Screens/admin/panels/JummahTimesPanel.jsx
import React, { useMemo } from "react";

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function TimeField({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
        />
      </div>
      <div className="mt-2 text-xs opacity-70">
        Jama’ah time used for Jummah on Fridays (month-based).
      </div>
    </label>
  );
}

export default function JummahTimesPanel({ groups, setValue }) {
  const jummahTimes = getGroup(groups, "jummahTimes");

  const values = useMemo(() => {
    const v = {};
    for (const m of MONTHS) v[m] = jummahTimes?.[m] ?? "";
    return v;
  }, [jummahTimes]);

  function setMonth(month, next) {
    // Store exactly the "HH:mm" string in the sheet
    setValue("jummahTimes", month, next || "");
  }

  // Optional: quick preset buttons for your common pattern
  function applyPreset(type) {
    if (type === "seasonal") {
      // Feb–Oct 13:30, otherwise 13:15
      MONTHS.forEach((m) => {
        const isFebToOct =
          [
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
          ].includes(m);
        setMonth(m, isFebToOct ? "13:30" : "13:15");
      });
    }
    if (type === "all1330") {
      MONTHS.forEach((m) => setMonth(m, "13:30"));
    }
    if (type === "all1315") {
      MONTHS.forEach((m) => setMonth(m, "13:15"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="text-sm md:text-base font-semibold">
          Jummah Jama’ah time by month
        </div>
        <div className="mt-1 text-xs md:text-sm opacity-75 leading-relaxed">
          These times are used across the app when the day is Friday. Update once
          and the display logic will follow automatically.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset("seasonal")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
            title="Feb–Oct 13:30, Nov–Jan 13:15"
          >
            Apply seasonal preset
          </button>
          <button
            type="button"
            onClick={() => applyPreset("all1330")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            Set all to 13:30
          </button>
          <button
            type="button"
            onClick={() => applyPreset("all1315")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
          >
            Set all to 13:15
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MONTHS.map((m) => (
          <TimeField
            key={m}
            label={m}
            value={values[m]}
            onChange={(v) => setMonth(m, v)}
          />
        ))}
      </div>
    </div>
  );
}
