// src/Screens/admin/panels/PrayerRulesPanel.jsx
import React, { useMemo } from "react";

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

function Field({
  label,
  hint,
  value,
  onChange,
  suffix = "min",
  min = 0,
  max = 180,
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm md:text-base font-semibold">{label}</div>
          {hint ? (
            <div className="mt-1 text-xs md:text-sm opacity-70">{hint}</div>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
          />
          <span className="text-xs opacity-70 w-10">{suffix}</span>
        </div>
      </div>
    </label>
  );
}

export default function PrayerRulesPanel({ groups, setValue }) {
  const timings = getGroup(groups, "timings");

  const rules = useMemo(() => {
    const n = (k, fallback = 0) => {
      const raw = timings?.[k];
      const v = raw === "" || raw == null ? NaN : Number(raw);
      return Number.isFinite(v) ? v : fallback;
    };

    return {
      makroohBeforeSunrise: n("makroohBeforeSunrise", 1),
      makroohAfterSunrise: n("makroohAfterSunrise", 10),
      makroohBeforeZuhr: n("makroohBeforeZuhr", 10),
      makroohBeforeAsr: n("makroohBeforeAsr", 0),
      makroohBeforeMaghrib: n("makroohBeforeMaghrib", 10),
      makroohBeforeIsha: n("makroohBeforeIsha", 0),
      showIshraq: n("showIshraq", 30),
      jamaahHighlightDuration: n("jamaahHighlightDuration", 5),
    };
  }, [timings]);

  function setNum(key, next) {
    // keep sheet values clean: store as string digits, fallback to "0"
    const num = Number(next);
    const safe = Number.isFinite(num) ? String(Math.max(0, Math.floor(num))) : "0";
    setValue("timings", key, safe);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="text-sm md:text-base font-semibold">How these rules work</div>
        <div className="mt-1 text-xs md:text-sm opacity-75 leading-relaxed">
          These values control the makrooh warning windows and special prayer timing
          (e.g. Ishraq), and how long the “Jama’ah in progress” highlight lasts.
          All values are in minutes.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Field
          label="Makrooh before Sunrise"
          hint="Warning starts this many minutes before Shouruq."
          value={rules.makroohBeforeSunrise}
          onChange={(v) => setNum("makroohBeforeSunrise", v)}
          min={0}
          max={60}
        />

        <Field
          label="Makrooh after Sunrise"
          hint="Warning continues for this many minutes after Shouruq."
          value={rules.makroohAfterSunrise}
          onChange={(v) => setNum("makroohAfterSunrise", v)}
          min={0}
          max={60}
        />

        <Field
          label="Makrooh before Zuhr (Zawal)"
          hint="Warning starts this many minutes before Zuhr begins."
          value={rules.makroohBeforeZuhr}
          onChange={(v) => setNum("makroohBeforeZuhr", v)}
          min={0}
          max={60}
        />

        <Field
          label="Makrooh before Asr"
          hint="Optional window before Asr begins (often 0)."
          value={rules.makroohBeforeAsr}
          onChange={(v) => setNum("makroohBeforeAsr", v)}
          min={0}
          max={60}
        />

        <Field
          label="Makrooh before Maghrib"
          hint="Warning starts this many minutes before Maghrib begins."
          value={rules.makroohBeforeMaghrib}
          onChange={(v) => setNum("makroohBeforeMaghrib", v)}
          min={0}
          max={60}
        />

        <Field
          label="Makrooh before Isha"
          hint="Optional window before Isha begins (often 0)."
          value={rules.makroohBeforeIsha}
          onChange={(v) => setNum("makroohBeforeIsha", v)}
          min={0}
          max={60}
        />

        <Field
          label="Show Ishraq window"
          hint="Duration Ishraq is shown for after it starts."
          value={rules.showIshraq}
          onChange={(v) => setNum("showIshraq", v)}
          min={0}
          max={120}
        />

        <Field
          label="Jama’ah highlight duration"
          hint="How long to keep the “Jama’ah in progress” state after Jama’ah starts."
          value={rules.jamaahHighlightDuration}
          onChange={(v) => setNum("jamaahHighlightDuration", v)}
          min={0}
          max={30}
          suffix="min"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-4">
        <div className="text-xs md:text-sm opacity-75">
          Tip: set values to <span className="font-semibold">0</span> to disable a window.
        </div>
      </div>
    </div>
  );
}
