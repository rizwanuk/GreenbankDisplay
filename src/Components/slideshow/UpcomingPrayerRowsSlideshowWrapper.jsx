import React from "react";
import moment from "moment";
import formatWithSmallAmPm from "../../helpers/formatWithSmallAmPm";
import { buildPrayerTimeline } from "../../helpers/getCurrentPrayer";
import { getJummahTime } from "../../hooks/usePrayerHelpers";
import applyFajrShouruqRule from "../../helpers/applyFajrShouruqRule";

export default function UpcomingPrayerRowsSlideshowWrapper({
  now,
  todayRow,
  yesterdayRow,
  tomorrowRow,
  settingsMap,
  labels,
  arabicLabels = {},
  theme = {},
  is24Hour,
}) {
  if (!todayRow || !tomorrowRow || !yesterdayRow) return null;

  const fullTimeline =
    buildPrayerTimeline({
      today: todayRow,
      tomorrow: tomorrowRow,
      yesterday: yesterdayRow,
      settingsMap,
    }) || [];

  let upcoming = fullTimeline
    .filter((p) => now.isBefore(p.start) && p.name !== "Ishraq")
    .map((p) => {
      let name = p.name;
      let jamaah = p.jamaah;
      let lookupKey = p.name?.toLowerCase();

      const isFridayForPrayer = p.start.format("dddd") === "Friday";
      if (isFridayForPrayer && (lookupKey === "dhuhr" || lookupKey === "zuhr")) {
        name = "Jummah";
        lookupKey = "jummah";
        const jummahMoment = getJummahTime(settingsMap, p.start);
        if (jummahMoment?.isValid?.()) jamaah = jummahMoment;
      }

      return { ...p, name, jamaah, lookupKey };
    })
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
    .slice(0, 6);

  upcoming = applyFajrShouruqRule({
    now,
    upcoming,
    fullTimeline,
    max: 6,
  });

  const is24 =
    typeof is24Hour === "boolean"
      ? is24Hour
      : String(settingsMap["toggles.clock24h"] ?? "true").toLowerCase() === "true";

  const getLabel = (key) => labels[key.toLowerCase()] || key;

  const formatTime = (t) =>
    moment.isMoment(t)
      ? is24
        ? t.format("HH:mm")
        : formatWithSmallAmPm(t, is24)
      : "—";

  const headerClass = theme.headerSize || "text-xl sm:text-2xl md:text-3xl";
  const rowClass = theme.rowSize || "text-3xl sm:text-5xl md:text-6xl";
  const engFont = theme.fontEng || "font-rubik";
  const textColor = theme.textColor || "text-green-300";

  const todayStart = now.clone().startOf("day");

  return (
    <div className={`w-full rounded-2xl bg-gray-800 shadow-xl px-4 py-4 backdrop-blur ${textColor} ${engFont}`}>
      
      {/* Header */}
      <div className={`grid grid-cols-3 font-semibold text-white/80 px-2 pb-2 ${headerClass}`}>
        <div>Prayer</div>
        <div className="text-center">Start</div>
        <div className="text-right">Jama‘ah</div>
      </div>

      {upcoming.map((p, idx) => {
        const prev = idx > 0 ? upcoming[idx - 1] : null;

        const prevIsToday =
          prev?.start && moment.isMoment(prev.start) && prev.start.isSame(todayStart, "day");

        const currIsToday =
          p?.start && moment.isMoment(p.start) && p.start.isSame(todayStart, "day");

        const showDivider = prev && prevIsToday && !currIsToday;

        return (
          <React.Fragment key={`${p.name}-${p.start?.format("YYYY-MM-DD-HH:mm") || idx}`}>
            
            {/* 🔹 Tomorrow Row with subtle tint */}
            {showDivider && (
              <div className="border-t border-white/20 border-b border-white/20 py-4 text-center bg-green-500/5 backdrop-blur-sm">
                <div className="text-green-300 font-bold tracking-widest text-2xl sm:text-3xl">
                  TOMORROW
                </div>
              </div>
            )}

            {/* Prayer Row */}
            <div className={`grid grid-cols-3 items-center border-t border-white/10 px-2 py-3 ${rowClass}`}>
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