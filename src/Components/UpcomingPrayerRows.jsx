import React from "react";
import moment from "moment";
import { buildPrayerTimeline } from "../helpers/getCurrentPrayer";
import {
  getJummahTime,
  getArabicLabel,
  getLabel,
} from "../hooks/usePrayerHelpers";

// Helper to format time with small AM/PM
const formatWithSmallAmPm = (time, is24Hour) => {
  if (!moment.isMoment(time) || !time.isValid()) return "--:--";
  if (is24Hour) return time.format("HH:mm");

  const [main, ampm] = time.format("h:mm A").split(" ");
  return (
    <>
      {main}
      <sup className="text-lg md:text-2xl lg:text-3xl ml-1">{ampm.toLowerCase()}</sup>
    </>
  );
};

export default function UpcomingPrayerRows({
  now,
  todayRow,
  tomorrowRow,
  yesterdayRow,
  settings = [],
  labels = {},
  arabicLabels = {},
  settingsMap = {},
  numberToShow = 6,
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

  const is24 = settingsMap["clock24Hours"] === "TRUE";

  const upcoming = fullTimeline
    .filter((p) => now.isBefore(p.start) && p.name !== "Ishraq")
    .map((p) => {
      let name = p.name;
      let jamaah = p.jamaah;
      let lookupKey = p.name?.toLowerCase();

      const isSameDayAsToday = p.start.isSame(now, "day");
      const isFriday = now.format("dddd") === "Friday";

      if (isFriday && isSameDayAsToday && lookupKey === "dhuhr") {
        name = "Jummah";
        lookupKey = "jummah"; // Use correct key for Jummah
        const jummahMoment = getJummahTime(settingsMap, now);
        if (jummahMoment?.isValid()) jamaah = jummahMoment;
      }

      return {
        ...p,
        name,
        jamaah,
        lookupKey,
      };
    })
    .slice(0, numberToShow);

  return (
    <div
      className={`
        mt-6
        max-h-full overflow-hidden
        ${theme.bgColor || "bg-white/5"}
        ${theme.textColor || "text-white"}
        ${theme.fontEng || "font-rubik"}
        rounded-2xl
        backdrop-blur-md
        border border-white/10
        shadow-md
        px-4
        py-6
        space-y-6
      `}
    >
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 font-semibold text-white/80 px-4 pb-2 ${
          theme.headerSize || "text-xl sm:text-2xl md:text-3xl"
        }`}
      >
        <div>Prayer</div>
        <div className="sm:text-center">Arabic</div>
        <div className="text-center">Start</div>
        <div className="text-right">Jama'ah</div>
      </div>

      {upcoming.map((p, i) => (
        <div
          key={i}
          className={`grid grid-cols-2 sm:grid-cols-4 items-center gap-4 px-4 py-4 border-t border-white/10 ${
            theme.rowSize || "text-[clamp(1.5rem,2.5vw,3rem)]"
          } leading-tight`}
        >
          <div className="truncate font-bold whitespace-nowrap overflow-visible text-ellipsis">
            {getLabel(p.lookupKey || p.name, labels)}
          </div>
          <div className={`${theme.fontAra || "font-cairo"} opacity-90 sm:text-center`}>
            {getArabicLabel(p.lookupKey || p.name, arabicLabels)}
          </div>
          <div className="text-center">{formatWithSmallAmPm(p.start, is24)}</div>
          <div className="text-right">
            {p.jamaah ? formatWithSmallAmPm(p.jamaah, is24) : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
