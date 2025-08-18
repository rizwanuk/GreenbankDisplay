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

  // Apply Jummah override for prayer rows
  const normalized = {
    lookupKey: (current.key || "").toLowerCase(),
    name: current.key,
    start: current.start,
    jamaah: current.jamaah,
  };
  const fixed = applyJummahOverride(normalized, settingsMap);

  const labelKey = (fixed.lookupKey || current.key || "").toLowerCase();
  const label = current.label || labels[labelKey] || current.key || "";

  // Avoid duplicate Arabic if already in the label
  const containsArabic = /[\u0600-\u06FF]/.test(label);
  const arabic = containsArabic ? null : (current.arabic ?? arabicLabels[labelKey] ?? null);

  const isMakrooh = Boolean(current.isMakrooh);
  const inJamaah = Boolean(current.inJamaah);
  const start = current.start;
  const jamaah = fixed.jamaah || current.jamaah;

  const hasStart = moment.isMoment(start) && start.isValid();
  const hasJamaah = moment.isMoment(jamaah) && jamaah.isValid();
  const hasAnyTimes = hasStart || hasJamaah; // “prayer” state if true

  const fmt = (m) => (is24Hour ? m.format("HH:mm") : m.format("h:mm a"));

  // Accent bar colour (green default, red when makrooh)
  const accentColor = isMakrooh ? "bg-red-600" : "bg-green-600";

  const CardShell = ({ children, bg }) => (
    <div className={`flex rounded-2xl border border-white/10 ${bg} text-white`}>
      {/* Left accent with vertical "Now" */}
      <div className={`w-8 sm:w-10 ${accentColor} rounded-l-2xl flex items-center justify-center`}>
        <span
          className="uppercase tracking-wider text-[10px] sm:text-xs text-white/90 -rotate-90 select-none"
          aria-hidden="true"
        >
          Now
        </span>
      </div>
      <div className="flex-1 px-3 py-3 text-center">{children}</div>
    </div>
  );

  // Header for PRAYER states: compact single line (Eng + Arabic)
  const CompactHeader = (
    <div className="flex items-center justify-center gap-2 mb-2 w-full">
      <span className="font-semibold text-[clamp(1.1rem,5vw,1.6rem)] whitespace-nowrap">
        {label}
      </span>
      {arabic ? (
        <span
          className="font-arabic text-[clamp(1rem,4.5vw,1.25rem)] whitespace-nowrap"
          lang="ar"
          dir="rtl"
        >
          {arabic}
        </span>
      ) : null}
    </div>
  );

  // Header for MESSAGE states (Makrooh/Nafl): may wrap to 2 lines
  const MessageHeader = (
    <div className="flex flex-col items-center justify-center gap-1 mb-1 w-full">
      <div className="font-semibold text-[clamp(1rem,4.5vw,1.5rem)] leading-snug break-words text-center">
        {label}
      </div>
      {arabic ? (
        <div className="text-[clamp(1rem,4vw,1.25rem)] font-arabic leading-snug" lang="ar" dir="rtl">
          {arabic}
        </div>
      ) : null}
    </div>
  );

  if (inJamaah) {
    return (
      <CardShell bg="bg-green-700">
        {hasAnyTimes ? CompactHeader : MessageHeader}
        <div className="text-lg font-semibold">Jama‘ah in progress</div>
      </CardShell>
    );
  }

  return (
    <CardShell bg={isMakrooh ? "bg-red-700/80" : "bg-white/10"}>
      {hasAnyTimes ? CompactHeader : MessageHeader}

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
    </CardShell>
  );
}
