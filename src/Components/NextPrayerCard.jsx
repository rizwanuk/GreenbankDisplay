import React, { memo, useEffect, useMemo, useState } from "react";
import moment from "moment-hijri";
import useNow from "../hooks/useNow";

function NextPrayerCard({
  todayRow,
  tomorrowRow,
  isFriday,
  labels,
  arabicLabels,
  settingsMap,
  theme,
}) {
  const now = useNow(1000); // shared ticking clock
  const [countdown, setCountdown] = useState("");
  const [nextLabel, setNextLabel] = useState("");
  const [nextArabic, setNextArabic] = useState("");
  const [inProgress, setInProgress] = useState(false);

  const highlightMinutes = parseInt(settingsMap["timings.jamaahHighlightDuration"] || "5", 10);
  const ishraqOffset     = parseInt(settingsMap["timings.ishraqAfterSunrise"] || "10", 10);
  const ishraqDuration   = parseInt(settingsMap["timings.ishraqDuration"] || "30", 10);
  const jummahTimeStr    = settingsMap[`timings.jummah.${now.month() + 1}`];

  const is24 = settingsMap["clock24Hours"] === "TRUE";

  const toMomentToday = (timeStr, base) =>
    timeStr
      ? moment(timeStr, "HH:mm").set({
          year: base.year(),
          month: base.month(),
          date: base.date(),
        })
      : null;

  const list = useMemo(() => {
    if (!todayRow || !tomorrowRow) return [];

    const today = now.clone();
    const tomorrow = now.clone().add(1, "day");

    const build = (label, row, baseDate, override) => {
      const startStr  = row[`${label} Adhan`] || row[label];
      const jamaahStr = override?.jamaah ?? row[`${label} Iqamah`];

      if (!startStr) return null;

      const start  = toMomentToday(startStr, baseDate);
      const jamaah = jamaahStr ? toMomentToday(jamaahStr, baseDate) : null;

      const key = label.toLowerCase();
      return {
        key,
        label: override?.label ?? labels[key],
        arabic: override?.arabic ?? arabicLabels[key],
        start,
        jamaah,
      };
    };

    const items = [];

    const fajrToday = build("Fajr", todayRow, today);
    if (fajrToday) items.push(fajrToday);

    if (isFriday) {
      const jummahOverride = {
        label: labels.jummah || "Jum‘ah",
        arabic: arabicLabels.jummah || "",
        jamaah: jummahTimeStr || null,
      };
      const j = build("Dhuhr", todayRow, today, jummahOverride);
      if (j && j.jamaah == null && jummahTimeStr) {
        j.jamaah = toMomentToday(jummahTimeStr, today);
      }
      if (j) items.push(j);
    } else {
      const dhuhr = build("Dhuhr", todayRow, today);
      if (dhuhr) items.push(dhuhr);
    }

    ["Asr", "Maghrib", "Isha"].forEach((name) => {
      const x = build(name, todayRow, today);
      if (x) items.push(x);
    });

    const fajrTomorrow = build("Fajr", tomorrowRow, tomorrow);
    if (fajrTomorrow) items.push(fajrTomorrow);

    const sunriseRaw = todayRow["Shouruq"];
    if (sunriseRaw) {
      const sunrise = toMomentToday(sunriseRaw, today);
      const ishraqStart = sunrise.clone().add(ishraqOffset, "minutes");
      const ishraqEnd = ishraqStart.clone().add(ishraqDuration, "minutes");
      items.push({
        key: "ishraq",
        label: labels.ishraq || "Ishraq",
        arabic: arabicLabels.ishraq || "",
        start: ishraqStart,
        jamaah: ishraqStart,
        end: ishraqEnd,
      });
    }

    return items.filter((p) => p.start && p.start.isValid());
  }, [
    todayRow,
    tomorrowRow,
    now,
    isFriday,
    labels,
    arabicLabels,
    ishraqOffset,
    ishraqDuration,
    jummahTimeStr,
  ]);

  useEffect(() => {
    if (!list.length) {
      setNextLabel("");
      setNextArabic("");
      setCountdown("No upcoming prayer");
      setInProgress(false);
      return;
    }

    const upcoming = [...list]
      .filter((p) => now.isSameOrBefore(p.start))
      .sort((a, b) => a.start.diff(b.start))[0];

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
    const highlightEnd = highlightStart
      ? highlightStart.clone().add(highlightMinutes, "minutes")
      : null;
    const duringJamaah =
      highlightStart && highlightEnd && now.isSameOrAfter(highlightStart) && now.isBefore(highlightEnd);

    setInProgress(Boolean(duringJamaah));

    const target = now.isBefore(upcoming.start) ? upcoming.start : (upcoming.jamaah || upcoming.start);
    const prefix = now.isBefore(upcoming.start) ? "Begins in" : (upcoming.jamaah ? "Jama‘ah in" : "Begins in");

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
  const nameClass = `${theme?.nameSize || "text-6xl sm:text-7xl md:text-8xl"} ${
    theme?.fontEng || "font-rubik"
  } font-semibold flex-shrink-0`;
  const nameArClass = `${theme?.nameSizeArabic || "text-5xl sm:text-6xl md:text-7xl"} ${
    theme?.fontAra || "font-arabic"
  } flex-shrink-0`;

  return (
    <div className={`w-full px-4 py-6 text-center rounded-xl ${cardBg}`}>
      <div className="flex items-center gap-4 flex-wrap justify-center mb-4">
        {nextLabel && <span className={nameClass}>{nextLabel}</span>}
        {nextArabic && <span className={nameArClass}>{nextArabic}</span>}
        <span
          className={`ml-2 px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${
            theme?.badgeColor || "bg-white/10 text-white"
          } max-w-full sm:max-w-none`}
        >
          Next
        </span>
      </div>

      <div
        className={`${theme?.countdownSize || "text-3xl md:text-5xl"} ${
          theme?.textColor || "text-white/80"
        } ${theme?.fontEng || "font-rubik"}`}
      >
        {countdown}
      </div>
    </div>
  );
}

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.isFriday === n.isFriday &&
  p.labels === n.labels &&
  p.arabicLabels === n.arabicLabels &&
  p.settingsMap === n.settingsMap &&
  p.todayRow === n.todayRow &&
  p.tomorrowRow === n.tomorrowRow;

export default memo(NextPrayerCard, areEqual);
