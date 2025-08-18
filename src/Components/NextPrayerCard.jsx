import React, { memo, useEffect, useMemo, useState } from "react";
import moment from "moment-hijri";
import useNow from "../hooks/useNow";
import applyJummahOverride from "../helpers/applyJummahOverride";
import { toFontVars } from "../utils/fontMap";

function NextPrayerCard({
  todayRow,
  tomorrowRow,
  labels,
  arabicLabels,
  settingsMap,
  theme,
}) {
  const tickNow = useNow(1000);
  const [countdown, setCountdown] = useState("");
  const [nextLabel, setNextLabel] = useState("");
  const [nextArabic, setNextArabic] = useState("");
  const [inProgress, setInProgress] = useState(false);

  const now = useMemo(() => {
    const rawEnabled = settingsMap?.["toggles.fakeTimeEnabled"];
    const enabled =
      (typeof rawEnabled === "string"
        ? rawEnabled.trim().toLowerCase()
        : String(!!rawEnabled)) === "true";
    const rawTime = (settingsMap?.["toggles.fakeTime"] ?? "").toString().trim();
    if (enabled && rawTime) {
      const normalized = rawTime.replace(/[：﹕︓]/g, ":").replace(/[．。]/g, ".");
      const fmtDate = tickNow.format("YYYY-MM-DD");
      const m = moment(
        `${fmtDate} ${normalized}`,
        ["YYYY-MM-DD HH:mm", "YYYY-MM-DD H:mm", "YYYY-MM-DD HH.mm", "YYYY-MM-DD H.mm"],
        true
      );
      if (m.isValid()) return m;
      console.warn("[NextPrayerCard] Invalid toggles.fakeTime:", rawTime, "(normalized:", normalized, ")");
    }
    return tickNow;
  }, [tickNow, settingsMap]);

  const highlightMinutes = parseInt(settingsMap["timings.jamaahHighlightDuration"] || "5", 10);
  const ishraqOffset = parseInt(settingsMap["timings.ishraqAfterSunrise"] || "10", 10);
  const ishraqDuration = parseInt(settingsMap["timings.ishraqDuration"] || "30", 10);

  const toMomentOn = (timeStr, base) =>
    timeStr
      ? moment(timeStr, "HH:mm").set({ year: base.year(), month: base.month(), date: base.date() })
      : null;

  const list = useMemo(() => {
    if (!todayRow || !tomorrowRow) return [];

    const today = now.clone();
    const tomorrow = now.clone().add(1, "day");

    const build = (label, row, baseDate) => {
      const startStr = row[`${label} Adhan`] || row[label];
      const jamaahStr = row[`${label} Iqamah`];
      if (!startStr) return null;

      const start = toMomentOn(startStr, baseDate);
      const jamaah = jamaahStr ? toMomentOn(jamaahStr, baseDate) : null;
      const key = label.toLowerCase();

      return {
        key,
        name: label,
        lookupKey: key,
        start,
        jamaah,
      };
    };

    const items = [];
    ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((name) => {
      const x = build(name, todayRow, today);
      if (x) items.push(x);
    });

    const fajrTomorrow = build("Fajr", tomorrowRow, tomorrow);
    if (fajrTomorrow) items.push(fajrTomorrow);

    const sunriseRaw = todayRow["Shouruq"];
    if (sunriseRaw) {
      const sunrise = toMomentOn(sunriseRaw, today);
      if (sunrise?.isValid()) {
        const ishraqStart = sunrise.clone().add(ishraqOffset, "minutes");
        const ishraqEnd = ishraqStart.clone().add(ishraqDuration, "minutes");
        items.push({
          key: "ishraq",
          name: "Ishraq",
          lookupKey: "ishraq",
          start: ishraqStart,
          jamaah: ishraqStart,
          end: ishraqEnd,
        });
      }
    }

    const withJummah = items
      .filter((p) => p.start && p.start.isValid())
      .map((p) => applyJummahOverride(p, settingsMap))
      .map((p) => {
        const lk = (p.lookupKey || p.key || "").toLowerCase();
        return {
          ...p,
          label: labels?.[lk] ?? labels?.[p.key] ?? p.name,
          arabic: arabicLabels?.[lk] ?? arabicLabels?.[p.key] ?? "",
        };
      });

    return withJummah;
  }, [todayRow, tomorrowRow, now, labels, arabicLabels, ishraqOffset, ishraqDuration, settingsMap]);

  useEffect(() => {
    if (!list.length) {
      setNextLabel("");
      setNextArabic("");
      setCountdown("No upcoming prayer");
      setInProgress(false);
      return;
    }

    const upcoming = [...list].filter((p) => now.isBefore(p.start)).sort((a, b) => a.start.diff(b.start))[0];

    if (!upcoming) {
      setNextLabel("");
      setNextArabic("");
      setCountdown("No upcoming prayer");
      setInProgress(false);
      return;
    }

    setNextLabel(upcoming.label || "");
    setNextArabic(upcoming.arabic || "");

    const highlightStart = upcoming.jamaah;
    const highlightEnd = highlightStart ? highlightStart.clone().add(highlightMinutes, "minutes") : null;
    const duringJamaah = highlightStart && highlightEnd && now.isSameOrAfter(highlightStart) && now.isBefore(highlightEnd);
    setInProgress(Boolean(duringJamaah));

    const target = now.isBefore(upcoming.start) ? upcoming.start : upcoming.jamaah || upcoming.start;
    const prefix = now.isBefore(upcoming.start) ? "Begins in" : upcoming.jamaah ? "Jama‘ah in" : "Begins in";

    const diff = moment.duration(target.diff(now));
    const seconds = Math.max(0, Math.floor(diff.asSeconds()));

    let display = "";
    if (seconds < 120) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const minPart = mins > 0 ? `${mins}m ` : "";
      const secPart = `${secs}s`;
      display = `${prefix} ${minPart}${secPart}`;
    } else {
      const totalMinutes = Math.ceil(diff.asMinutes());
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0 && mins > 0) display = `${prefix} ${hours}h ${mins}m`;
      else if (hours > 0) display = `${prefix} ${hours} hour${hours !== 1 ? "s" : ""}`;
      else display = `${prefix} ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
    }

    setCountdown(display);
  }, [list, now, highlightMinutes]);

  const cardBg = inProgress ? theme?.jamaahColor || "bg-green-700" : theme?.bgColor || "bg-white/5";
  const nameClass = `${theme?.nameSize || "text-6xl sm:text-7xl md:text-8xl"} font-eng font-semibold flex-shrink-0`;
  const nameArClass = `${theme?.nameSizeArabic || "text-5xl sm:text-6xl md:text-7xl"} font-arabic flex-shrink-0`;

  // Accent colour: use theme if provided, otherwise a green that matches NOW
  const accentColor = theme?.accentColor || "bg-green-700";

  return (
    <div style={toFontVars(theme)} className={`rounded-xl overflow-hidden mb-4 ${cardBg} flex items-stretch`}>
      {/* Left accent with vertical NEXT */}
      <div className={`w-14 sm:w-16 md:w-20 ${accentColor} flex items-center justify-center`}>
        <span
          className="uppercase tracking-widest font-extrabold text-xl sm:text-2xl md:text-3xl text-white -rotate-90 select-none"
          aria-hidden="true"
        >
          NEXT
        </span>
      </div>

      {/* Main content with comfy padding */}
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 py-6 text-center">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {nextLabel && <span className={nameClass}>{nextLabel}</span>}
          {nextArabic && (
            <span className={nameArClass} lang="ar" dir="rtl">
              {nextArabic}
            </span>
          )}
        </div>

        <div className={`${theme?.countdownSize || "text-3xl md:text-5xl"} ${theme?.textColor || "text-white/80"} font-eng`}>
          {countdown}
        </div>
      </div>
    </div>
  );
}

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.labels === n.labels &&
  p.arabicLabels === n.arabicLabels &&
  p.settingsMap === n.settingsMap &&
  p.todayRow === n.todayRow &&
  p.tomorrowRow === n.tomorrowRow;

export default memo(NextPrayerCard, areEqual);
