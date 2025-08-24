import React, { memo } from "react";
import momentHijri from "moment-hijri";
import useNow from "../hooks/useNow";
import { toFontVars } from "../utils/fontMap";

function DateCard({
  theme = {},
  islamicMonths = [],
  islamicOffset = 0,
  /**
   * When true, assume 30-day months by showing the 30th day at the start of a new month:
   * - If raw Hijri day is 1 → show "30" of the previous month (even if the lib thinks prev had only 29)
   * - Otherwise show the raw Hijri date (2, 3, 4…)
   */
  normalizeTo30DayMonths = false,
}) {
  // Tick once per minute so the date flips at midnight without relying on parent renders
  const tick = useNow(60_000);

  // Convert the tick (which is a normal moment) into a hijri-enabled moment instance
  const now = momentHijri(tick.valueOf());

  // Gregorian date
  const englishDate = now.format("dddd D MMMM YYYY");

  // Base hijri moment (respect any global offset you already use)
  const rawHijri = now.clone().add(islamicOffset, "days");

  // Detect start of new Hijri month in the library's calendar
  const isDayOne = rawHijri.format("iD") === "1";

  // If normalizing and it's the library's day 1,
  // we *force* display of the previous month but with day "30".
  // This avoids falling back to 29 if the lib thinks the previous month had only 29.
  let displayMoment;
  let forcedDay = null;

  if (normalizeTo30DayMonths && isDayOne) {
    displayMoment = rawHijri.clone().subtract(1, "day"); // previous month
    forcedDay = "30"; // force the 30th regardless of lib month length
  } else {
    displayMoment = rawHijri;
  }

  // Hijri date parts (from the possibly corrected display moment)
  const hijriDay = forcedDay ?? displayMoment.format("iD");
  const hijriMonthIndex = parseInt(displayMoment.format("iM"), 10) - 1; // 0–11
  const hijriYear = displayMoment.format("iYYYY");
  const hijriMonth = islamicMonths[hijriMonthIndex] || "Unknown";

  return (
    <div
      style={toFontVars(theme)}
      className={`
        w-full
        ${theme.bgColor || "bg-white/10"}
        ${theme.textColor || "text-white"}
        rounded-xl
        px-4
        py-6
        text-center
        overflow-hidden
        backdrop-blur-md
        border border-white/10
        shadow-md
      `}
    >
      <p
        className={`
          font-eng font-semibold
          ${theme.englishDateSize || "text-4xl"}
        `}
      >
        {englishDate}
      </p>

      {/* Keep overall direction LTR to preserve order: 30 Ṣafar 1447 AH */}
      <p
        className={`
          font-arabic
          ${theme.islamicDateSize || "text-3xl"}
          opacity-90 mt-1
        `}
        dir="ltr"
      >
        <span className="font-arabic">{hijriDay}</span>{" "}
        <span className="font-arabic" lang="ar">{hijriMonth}</span>{" "}
        <span className="font-arabic">{hijriYear}</span>{" "}
        <span className="font-eng">AH</span>
      </p>
    </div>
  );
}

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.islamicMonths === n.islamicMonths &&
  p.islamicOffset === n.islamicOffset &&
  p.normalizeTo30DayMonths === n.normalizeTo30DayMonths;

export default memo(DateCard, areEqual);
