// src/Components/MobileCurrentCard.jsx
import React, { useEffect, useState } from "react";
import moment from "moment";
import { getCurrentPrayerState } from "../utils/getCurrentPrayerState";
import applyJummahOverride from "../helpers/applyJummahOverride";

export default function MobileCurrentCard({
  todayRow,
  yesterdayRow,
  settingsMap,
  labels = {},
  arabicLabels = {},
  is24Hour = false,
}) {
  const [now, setNow] = useState(moment());
  useEffect(() => {
    const t = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!todayRow || !settingsMap) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/10 text-white px-3 py-3 text-center">
        Loading…
      </div>
    );
  }

  // Fake-time support
  const fakeEnabled =
    String(settingsMap["toggles.fakeTimeEnabled"] ?? "false").toLowerCase() === "true";
  const fakeTimeStr = settingsMap["toggles.fakeTime"];
  let effectiveNow = now;
  if (fakeEnabled && fakeTimeStr) {
    const frozen = moment(
      `${now.format("YYYY-MM-DD")} ${fakeTimeStr}`,
      "YYYY-MM-DD HH:mm",
      true
    );
    if (frozen.isValid()) effectiveNow = frozen;
  }

  // Prayer state
  const current = getCurrentPrayerState({
    now: effectiveNow,
    todayRow,
    yesterdayRow,
    settings: settingsMap,
    labels,
    arabicLabels,
  });

  if (!current || current.key === "none") {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/10 text-white px-3 py-3 text-center">
        Prayer times unavailable
      </div>
    );
  }

  // Apply Jummah override
  const normalized = {
    lookupKey: (current.key || "").toLowerCase(),
    name: current.key,
    start: current.start,
    jamaah: current.jamaah,
  };
  const fixed = applyJummahOverride(normalized, settingsMap);

  const labelKey = (fixed.lookupKey || current.key || "").toLowerCase();
  const label = current.label || labels[labelKey] || current.key || "";

  // Suppress duplicate Arabic
  const containsArabic = /[\u0600-\u06FF]/.test(label);
  const arabic = containsArabic ? null : (current.arabic ?? arabicLabels[labelKey] ?? null);

  const isMakrooh = Boolean(current.isMakrooh);
  const inJamaah = Boolean(current.inJamaah);
  const start = current.start;
  const jamaah = fixed.jamaah || current.jamaah;

  const hasStart = moment.isMoment(start) && start.isValid();
  const hasJamaah = moment.isMoment(jamaah) && jamaah.isValid();
  const hasAnyTimes = hasStart || hasJamaah;

  const fmt = (m) => (is24Hour ? m.format("HH:mm") : m.format("h:mm a"));

  // Jama‘ah in progress card
  if (inJamaah) {
    return (
      <div className="rounded-2xl border border-white/10 bg-green-700 text-white px-3 py-3 text-center">
        <div className="inline-block text-[10px] px-2 py-[2px] rounded-full bg-white/10 border border-white/20 mb-2">
          Current
        </div>
        <div className="flex items-center justify-center gap-2 mb-1 w-full">
          <div className="font-semibold whitespace-nowrap w-full text-[clamp(1rem,4vw,1.5rem)]">
            {label}
          </div>
          {arabic ? (
            <div className="text-xl font-arabic" lang="ar" dir="rtl">
              {arabic}
            </div>
          ) : null}
        </div>
        <div className="text-lg font-semibold">Jama‘ah in progress</div>
      </div>
    );
  }

  // Default current card
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 text-white px-3 py-3 text-center",
        isMakrooh ? "bg-red-700/80" : "bg-white/10",
      ].join(" ")}
    >
      <div className="inline-block text-[10px] px-2 py-[2px] rounded-full bg-white/10 border border-white/20 mb-2">
        Current
      </div>

      <div className="flex items-center justify-center gap-2 mb-1 w-full">
        <div className="font-semibold whitespace-nowrap w-full text-[clamp(1rem,4vw,1.5rem)]">
          {label}
        </div>
        {arabic ? (
          <div className="text-xl font-arabic" lang="ar" dir="rtl">
            {arabic}
          </div>
        ) : null}
      </div>

      {/* Only show times when at least one valid time exists */}
      {hasAnyTimes && (
        <div className="text-[13px] sm:text-sm opacity-90">
          {hasStart && (
            <span>
              Begins: <span className="tabular-nums">{fmt(start)}</span>
            </span>
          )}
          {hasStart && hasJamaah && <span className="mx-2">|</span>}
          {hasJamaah && (
            <span>
              Jama‘ah: <span className="tabular-nums">{fmt(jamaah)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
