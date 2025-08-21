import React from "react";
import moment from "moment";
import formatWithSmallAmPm from "../../helpers/formatWithSmallAmPm";
import { buildPrayerTimeline } from "../../helpers/getCurrentPrayer";

export default function UpcomingPrayerRowsSlideshowWrapper({
  now,
  todayRow,
  yesterdayRow,
  tomorrowRow,
  settingsMap,
  labels,
  arabicLabels = {},
  theme = {},
}) {
  if (!todayRow || !tomorrowRow || !yesterdayRow) return null;

  const fullTimeline =
    buildPrayerTimeline({
      today: todayRow,
      tomorrow: tomorrowRow,
      yesterday: yesterdayRow,
      settingsMap,
    }) || [];

  const isFriday = now.format("dddd") === "Friday";

  let upcoming = fullTimeline
    .filter((p) => now.isBefore(p.start) && p.name !== "Ishraq")
    .map((p) => {
      let name = p.name;
      let jamaah = p.jamaah;
      let lookupKey = p.name?.toLowerCase();

      if (isFriday && p.name.toLowerCase() === "dhuhr") {
        name = "Jummah";
        lookupKey = "zuhr";
        const jummahTimeStr = settingsMap["timings.jummahTime"];
        const jummahMoment = moment(jummahTimeStr, "HH:mm");
        if (jummahMoment.isValid()) jamaah = jummahMoment;
      }

      return {
        ...p,
        name,
        jamaah,
        lookupKey,
      };
    })
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
    .slice(0, 6);

  // --- Force-inject tomorrow's Fajr once today's Fajr has started ---
  const fajrToday = fullTimeline.find(
    (p) => p.key === "fajr" && p.start.isSame(now, "day")
  );
  const fajrTomorrow = fullTimeline.find(
    (p) => p.key === "fajr" && p.start.isAfter(now.clone().endOf("day"))
  );

  if (
    fajrToday &&
    fajrTomorrow &&
    now.isSameOrAfter(fajrToday.start) &&
    !upcoming.some((p) => p.key === "fajr" && p.start.isSame(fajrTomorrow.start, "minute"))
  ) {
    upcoming.push(fajrTomorrow);
    upcoming.sort((a, b) => a.start.valueOf() - b.start.valueOf());
    if (upcoming.length > 6) upcoming = upcoming.slice(0, 6);
  }

  const is24 = settingsMap["clock24Hours"] === "TRUE";
  const getLabel = (key) => labels[key.toLowerCase()] || key;
  const formatTime = (t) =>
    moment.isMoment(t)
      ? is24
        ? t.format("HH:mm")
        : formatWithSmallAmPm(t, is24)
      : "--:--";

  const headerClass = theme.headerSize || "text-xl sm:text-2xl md:text-3xl";
  const rowClass = theme.rowSize || "text-3xl sm:text-5xl md:text-6xl";
  const engFont = theme.fontEng || "font-rubik";
  const textColor = theme.textColor || "text-green-300";

  const todayDateStr = now.clone().startOf("day").format("YYYY-MM-DD");

  return (
    <div
      className={`w-full rounded-2xl bg-gray-800 shadow-xl px-4 py-4 backdrop-blur ${textColor} ${engFont}`}
    >
      <div className={`grid grid-cols-3 font-semibold text-white/80 px-2 pb-2 ${headerClass}`}>
        <div>Prayer</div>
        <div className="text-center">Start</div>
        <div className="text-right">Jama‘ah</div>
      </div>

      {upcoming.map((p, idx) => {
        const prev = idx > 0 ? upcoming[idx - 1] : null;
        const showDivider =
          prev && prev.date === todayDateStr && p.date !== todayDateStr;

        return (
          <React.Fragment key={`${p.name}-${p.date}-${idx}`}>
            {showDivider && (
              <div className="text-center text-white/60 font-semibold pt-4 pb-1 text-lg sm:text-xl col-span-3">
                ── Tomorrow ──
              </div>
            )}
            <div
              className={`grid grid-cols-3 items-center border-t border-white/10 px-2 py-3 ${rowClass}`}
            >
              <div className="font-bold text-[clamp(2rem,3.5vw,2.5rem)] whitespace-nowrap overflow-hidden text-ellipsis max-w-[7rem] sm:max-w-none">
                {getLabel(p.name)}
              </div>
              <div className="text-center">{formatTime(p.start)}</div>
              <div className="text-right">{formatTime(p.jamaah)}</div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
