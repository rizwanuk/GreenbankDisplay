import React, { memo, useMemo } from "react";
import moment from "moment-hijri";
import { buildPrayerTimeline } from "../helpers/getCurrentPrayer";
import { getJummahTime, getArabicLabel, getLabel } from "../hooks/usePrayerHelpers";
import useNow from "../hooks/useNow";
import formatWithSmallAmPm from "../helpers/formatWithSmallAmPm";
import { toFontVars } from "../utils/fontMap";

function UpcomingPrayerRows({
  now: nowProp,
  todayRow,
  tomorrowRow,
  yesterdayRow,
  settings = [],
  labels = {},
  arabicLabels = {},
  settingsMap = {},
  numberToShow = 6,
  theme = {},
  is24Hour,
}) {
  const tickNow = useNow(1000);

  const effectiveNow = useMemo(() => {
    if (nowProp) return nowProp;
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
      console.warn("[UpcomingPrayerRows] Invalid toggles.fakeTime:", rawTime, "(normalized:", normalized, ")");
    }
    return tickNow;
  }, [nowProp, tickNow, settingsMap]);

  if (!todayRow || !tomorrowRow || !yesterdayRow) return null;

  const fullTimeline =
    buildPrayerTimeline({
      today: todayRow,
      tomorrow: tomorrowRow,
      yesterday: yesterdayRow,
      settingsMap,
    }) || [];

  const is24 =
    typeof is24Hour === "boolean" ? is24Hour : settingsMap["clock24Hours"] === "TRUE";

  const upcoming = fullTimeline
    .filter((p) => effectiveNow.isBefore(p.start) && p.name !== "Ishraq")
    .map((p) => {
      let name = p.name;
      let jamaah = p.jamaah;
      let lookupKey = p.name?.toLowerCase();

      const isFridayForPrayer = p.start.format("dddd") === "Friday";
      if (isFridayForPrayer && lookupKey === "dhuhr") {
        name = "Jummah";
        lookupKey = "jummah";
        const jummahMoment = getJummahTime(settingsMap, p.start);
        if (jummahMoment?.isValid()) jamaah = jummahMoment;
      }

      return { ...p, name, jamaah, lookupKey };
    })
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())
    .slice(0, numberToShow);

  return (
    <div
      style={toFontVars(theme)}
      className={`
        mt-6
        max-h-full overflow-hidden
        ${theme.bgColor || "bg-white/5"}
        ${theme.textColor || "text-white"}
        rounded-2xl
        backdrop-blur-md
        border border-white/10
        shadow-md
        px-4
        py-6
        space-y-6
      `}
    >
      {/* Header row */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 font-eng font-semibold text-white/80 px-4 pb-2 ${
          theme.headerSize || "text-xl sm:text-2xl md:text-3xl"
        }`}
      >
        <div>Prayer</div>
        <div className="sm:text-center">Arabic</div>
        <div className="text-center">Start</div>
        <div className="text-right">Jama'ah</div>
      </div>

      {upcoming.map((p, i) => {
        const endOfToday = effectiveNow.clone().endOf("day");
        const isTomorrow = p.start.isAfter(endOfToday);
        const wasPrevToday = i > 0 ? !upcoming[i - 1].start.isAfter(endOfToday) : false;
        const isFirstTomorrow = isTomorrow && (i === 0 || wasPrevToday);

        return (
          <div key={i} className="relative">
            {/* Big Tomorrow tab above the first tomorrow prayer (no layout shift) */}
            {isFirstTomorrow && (
              <div className="absolute -top-6 left-4 z-10">
                <div
                  className="
                    px-3 py-1
                    rounded-lg
                    bg-sky-600
                    text-white
                    text-lg sm:text-xl md:text-2xl
                    font-bold
                    tracking-wider
                    shadow-lg
                  "
                >
                  Tomorrow
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-2 sm:grid-cols-4 items-center gap-2.5 px-4 py-[0.3125rem] border-t border-white/10 ${
                theme.rowSize || "text-[clamp(1.5rem,2.5vw,3rem)]"
              } leading-[1.125]`}
            >
              {/* English prayer name — +1 relative step */}
              <div className="truncate font-eng font-bold whitespace-nowrap overflow-visible text-ellipsis text-[1.1em]">
                {getLabel(p.lookupKey || p.name, labels)}
              </div>

              {/* Arabic */}
              <div
                className="font-arabic opacity-90 sm:text-center whitespace-nowrap"
                lang="ar"
                dir="rtl"
              >
                {getArabicLabel(p.lookupKey || p.name, arabicLabels)}
              </div>

              {/* Start time — +2 relative steps (no wrap) */}
              <div className="text-center font-eng text-[1.2em] whitespace-nowrap">
                {formatWithSmallAmPm(p.start, is24)}
              </div>

              {/* Jama'ah time — +2 relative steps + bold (no wrap) */}
              <div className="text-right font-eng font-extrabold text-[1.3em] whitespace-nowrap">
                {p.jamaah ? formatWithSmallAmPm(p.jamaah, is24) : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.is24Hour === n.is24Hour &&
  p.numberToShow === n.numberToShow &&
  p.labels === n.labels &&
  p.arabicLabels === n.arabicLabels &&
  p.settingsMap === n.settingsMap &&
  p.todayRow === n.todayRow &&
  p.tomorrowRow === n.tomorrowRow &&
  p.yesterdayRow === n.yesterdayRow;

export default memo(UpcomingPrayerRows, areEqual);
