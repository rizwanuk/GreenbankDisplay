// src/Components/MobileCurrentCard.jsx
import React, { useEffect, useState } from "react";
import moment from "moment";
import { getCurrentPrayerState } from "../utils/getCurrentPrayerState";
import applyJummahOverride from "../helpers/applyJummahOverride";

export default function MobileCurrentCard({
  theme = {},               // ✅ THEME: bgColor, textColor, border/borderColor, nameSize, nameSizeArabic, timeRowSize, jamaahColor, makroohColor
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

  // Helpers to build themed shells
  const borderClass = theme.border || theme.borderColor || "border-white/10";
  const textClass = theme.textColor || "text-white";
  const baseBg = theme.bgColor || "bg-white/10";

  const ThemedEmpty = ({ children }) => (
    <div className={`rounded-2xl ${baseBg} ${textClass} border ${borderClass} px-3 py-3 text-center`}>
      {children}
    </div>
  );

  if (!todayRow || !settingsMap) {
    return <ThemedEmpty>Loading…</ThemedEmpty>;
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
    return <ThemedEmpty>Prayer times unavailable</ThemedEmpty>;
  }

  // Apply Jummah override for times/normalisation
  const normalized = {
    lookupKey: (current.key || "").toLowerCase(),
    name: current.key,
    start: current.start,
    jamaah: current.jamaah,
  };
  const fixed = applyJummahOverride(normalized, settingsMap);

  // Label + Arabic with Friday Jum‘ah override
  let labelKey = (fixed.lookupKey || current.key || "").toLowerCase();
  let label = current.label || labels[labelKey] || current.key || "";

  const isFriday = effectiveNow.isoWeekday() === 5; // 1=Mon … 5=Fri
  if (labelKey === "dhuhr" && isFriday) {
    labelKey = "jummah";
    label = labels.jummah || "Jum‘ah";
  }

  // Avoid duplicate Arabic if already part of the English label
  const containsArabic = /[\u0600-\u06FF]/.test(label);
  const arabic =
    containsArabic
      ? null
      : (current.arabic ??
          arabicLabels[labelKey] ??
          (labelKey === "jummah" ? arabicLabels.dhuhr : null) ??
          null);

  const isMakrooh = Boolean(current.isMakrooh);
  const inJamaah = Boolean(current.inJamaah);

  const start = current.start;
  const jamaah = fixed.jamaah || current.jamaah;

  const hasStart = moment.isMoment(start) && start.isValid();
  const hasJamaah = moment.isMoment(jamaah) && jamaah.isValid();
  const hasAnyTimes = hasStart || hasJamaah;

  const fmt = (m) => (is24Hour ? m.format("HH:mm") : m.format("h:mm a"));

  // Accent bar colour (green default, red when makrooh)
  const accentColor = isMakrooh ? "bg-red-600" : "bg-green-600";

  // Choose card background by state (prefer theme overrides, then base)
  const stateBg = inJamaah
    ? (theme.jamaahColor || baseBg)
    : (isMakrooh ? (theme.makroohColor || baseBg) : baseBg);

  const CardShell = ({ children }) => (
    <div className={`flex rounded-2xl border ${borderClass} ${stateBg} ${textClass}`}>
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
      <span
        className={[
          "font-semibold whitespace-nowrap",
          theme.nameSize || "text-[clamp(1.1rem,5vw,1.6rem)]",
        ].join(" ")}
      >
        {label}
      </span>
      {arabic ? (
        <span
          className={[
            "font-arabic whitespace-nowrap",
            theme.nameSizeArabic || "text-[clamp(1rem,4.5vw,1.25rem)]",
          ].join(" ")}
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
      <div
        className={[
          "font-semibold leading-snug break-words text-center",
          theme.nameSize || "text-[clamp(1rem,4.5vw,1.5rem)]",
        ].join(" ")}
      >
        {label}
      </div>
      {arabic ? (
        <div
          className={[
            "font-arabic leading-snug",
            theme.nameSizeArabic || "text-[clamp(1rem,4vw,1.25rem)]",
          ].join(" ")}
          lang="ar"
          dir="rtl"
        >
          {arabic}
        </div>
      ) : null}
    </div>
  );

  if (inJamaah) {
    return (
      <CardShell>
        {hasAnyTimes ? CompactHeader : MessageHeader}
        <div className={["font-semibold", theme.timeRowSize || "text-lg"].join(" ")}>
          Jama‘ah in progress
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      {hasAnyTimes ? CompactHeader : MessageHeader}

      {/* Only show times when at least one valid time exists */}
      {hasAnyTimes && (
        <div
          className={[
            "opacity-90",
            theme.timeRowSize || "text-[13px] sm:text-sm",
          ].join(" ")}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
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
