import React, { memo, useMemo } from "react";
import moment from "moment-hijri";
import { buildPrayerTimeline } from "../helpers/getCurrentPrayer";
import { getJummahTime, getArabicLabel, getLabel } from "../hooks/usePrayerHelpers";
import useNow from "../hooks/useNow";
import formatWithSmallAmPm from "../helpers/formatWithSmallAmPm";

// ✅ Only accept a valid Tailwind font class from the Sheet; otherwise fall back
function resolveArabicFont(theme) {
  const raw = theme?.fontAra;
  return raw && /^font-/.test(raw) ? raw : 'font-arabic';
}

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

  const is24 = typeof is24Hour === "boolean" ? is24Hour : settingsMap["clock24Hours"] === "TRUE";

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

  const arabicFont = resolveArabicFont(theme);

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

          {/* Arabic column — Sheet-driven font; only valid Tailwind class or fallback */}
          <div
            className={`${arabicFont} opacity-90 sm:text-center`}
            lang="ar"
            dir="rtl"
          >
            {getArabicLabel(p.lookupKey || p.name, arabicLabels)}
          </div>

          <div className="text-center">{formatWithSmallAmPm(p.start, is24)}</div>
          <div className="text-right">{p.jamaah ? formatWithSmallAmPm(p.jamaah, is24) : ""}</div>
        </div>
      ))}
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
