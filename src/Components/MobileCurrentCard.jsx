// src/Components/MobileCurrentCard.jsx
import React, { useEffect, useState } from "react";
import moment from "moment";
import { getCurrentPrayerState } from "../utils/getCurrentPrayerState";
import applyJummahOverride from "../helpers/applyJummahOverride";

export default function MobileCurrentCard({
  theme = {},
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

  const borderClass = theme.border || theme.borderColor || "border-white/10";
  const textClass = theme.textColor || "text-white";
  const baseBg = theme.bgColor || "bg-white/10";

  const ThemedEmpty = ({ children }) => (
    <div
      className={`rounded-2xl ${baseBg} ${textClass} border ${borderClass} px-3 py-3 text-center`}
    >
      {children}
    </div>
  );

  if (!todayRow || !settingsMap) {
    return <ThemedEmpty>Loading…</ThemedEmpty>;
  }

  // Fake-time support
  const fakeEnabled =
    String(settingsMap["toggles.fakeTimeEnabled"] ?? "false").toLowerCase() ===
    "true";
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

  // Prayer state (DO NOT CHANGE existing logic)
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

  const isFriday = effectiveNow.isoWeekday() === 5;
  if (labelKey === "dhuhr" && isFriday) {
    labelKey = "jummah";
    label = labels.jummah || "Jum‘ah";
  }

  // Avoid duplicate Arabic if already in label
  const containsArabic = /[\u0600-\u06FF]/.test(label);
  const arabic =
    containsArabic
      ? null
      : current.arabic ??
        arabicLabels[labelKey] ??
        (labelKey === "jummah" ? arabicLabels.dhuhr : null) ??
        null;

  const isMakrooh = Boolean(current.isMakrooh);

  const start = current.start;
  const jamaah = fixed.jamaah || current.jamaah;

  const hasStart = moment.isMoment(start) && start.isValid();
  const hasJamaah = moment.isMoment(jamaah) && jamaah.isValid();

  // ✅ Dim logic (as previously agreed)
  const hasStarted = hasStart && effectiveNow.isSameOrAfter(start);
  const jamaahPassed = hasJamaah && effectiveNow.isSameOrAfter(jamaah);

  // ✅ Restore "Jama‘ah in progress" behaviour (5 mins default / uses sheet setting if present)
  const jamaahHoldMinsRaw = settingsMap["timings.jamaahHighlightDuration"] ?? 5;
  const jamaahHoldMins = Math.max(0, Number(jamaahHoldMinsRaw) || 5);

  const inJamaahWindow =
    hasJamaah &&
    effectiveNow.isSameOrAfter(jamaah) &&
    effectiveNow.isBefore(moment(jamaah).add(jamaahHoldMins, "minutes"));

  // Respect existing current.inJamaah if your helper already sets it
  const inJamaah = Boolean(current.inJamaah) || inJamaahWindow;

  // Time formatting with smaller am/pm (12h only)
  const renderTime = (m) => {
    if (!m || !moment.isMoment(m) || !m.isValid()) return null;

    if (is24Hour) {
      return <span className="tabular-nums">{m.format("HH:mm")}</span>;
    }

    const s = m.format("h:mm a");
    const [t, ap] = s.split(" ");

    return (
      <span className="inline-flex items-baseline whitespace-nowrap">
        <span className="tabular-nums">{t}</span>
        <span>{"\u00A0"}</span>
        <span className="text-[0.85em] opacity-85">{ap}</span>
      </span>
    );
  };

  const accentColor = isMakrooh ? "bg-red-600" : "bg-green-600";

  // ✅ Background by state (restoring jamaah background)
  const stateBg = inJamaah
    ? theme.jamaahColor || baseBg
    : isMakrooh
      ? theme.makroohColor || baseBg
      : baseBg;

  // ✅ Wrap control (slideshow sets theme.messageWrap=true)
  const wrapHeader = Boolean(theme?.messageWrap);

  const CardShell = ({ children }) => (
    <div className={`flex rounded-2xl border ${borderClass} ${stateBg} ${textClass}`}>
      <div className={`w-8 sm:w-10 ${accentColor} rounded-l-2xl flex items-center justify-center`}>
        <span className="uppercase tracking-wider text-[10px] sm:text-xs text-white/90 -rotate-90 select-none">
          Now
        </span>
      </div>
      <div className="flex-1 px-3 py-3 text-center">{children}</div>
    </div>
  );

  const Header = (
    <div
      className={[
        "flex items-center justify-center gap-2 mb-2 w-full",
        wrapHeader || isMakrooh ? "flex-wrap" : "",
      ].join(" ")}
    >
      <span
        className={[
          "font-semibold",
          wrapHeader || isMakrooh
            ? "whitespace-normal break-words text-center"
            : "whitespace-nowrap",
          theme.nameSize || "text-[clamp(1.1rem,5vw,1.6rem)]",
        ].join(" ")}
      >
        {label}
      </span>

      {arabic && (
        <span
          className={[
            "font-arabic",
            wrapHeader
              ? "whitespace-normal break-words text-center"
              : "whitespace-nowrap",
            theme.nameSizeArabic || "text-[clamp(1rem,4.5vw,1.25rem)]",
          ].join(" ")}
          lang="ar"
          dir="rtl"
        >
          {arabic}
        </span>
      )}
    </div>
  );

  return (
    <CardShell>
      {Header}

      {/* ✅ Restored: show Jama‘ah in progress during window */}
      {inJamaah ? (
        <div className={["font-semibold", theme.timeRowSize || "text-lg"].join(" ")}>
          Jama‘ah in progress
        </div>
      ) : (
        (hasStart || hasJamaah) && (
          <div className="w-full flex justify-center">
            <div
              className={[
                "opacity-95 inline-flex items-center justify-center gap-2 sm:gap-3 whitespace-nowrap flex-nowrap",
                theme.timeRowSize || "text-[clamp(12px,3.3vw,14px)]",
              ].join(" ")}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {hasStart && (
                <span
                  className={[
                    "inline-flex items-baseline whitespace-nowrap transition-opacity duration-300",
                    hasStarted ? "opacity-40" : "opacity-100",
                  ].join(" ")}
                >
                  <span>Begins:</span>
                  <span>{"\u00A0"}</span>
                  {renderTime(start)}
                </span>
              )}

              {hasStart && hasJamaah && <span className="opacity-70">|</span>}

              {hasJamaah && (
                <span
                  className={[
                    "inline-flex items-baseline whitespace-nowrap transition-opacity duration-300",
                    jamaahPassed ? "opacity-40" : "opacity-100",
                  ].join(" ")}
                >
                  <span>Jama‘ah:</span>
                  <span>{"\u00A0"}</span>
                  {renderTime(jamaah)}
                </span>
              )}
            </div>
          </div>
        )
      )}
    </CardShell>
  );
}