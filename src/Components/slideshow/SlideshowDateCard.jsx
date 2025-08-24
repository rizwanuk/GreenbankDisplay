import React, { memo } from "react";
import moment from "moment-hijri";

// Coercers for settingsMap values
function toBool(v, def = false) {
  if (v === true || v === false) return v;
  if (v == null) return def;
  return String(v).trim().toLowerCase() === "true";
}
function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Keys used to pull custom month labels from settingsMap
const MONTH_KEYS = [
  "muharram","safar","rabiAwal","rabiThani","jumadaAwal","jumadaThani",
  "rajab","shaban","ramadan","shawwal","dhulQadah","dhulHijjah"
];

// Safe English month names (fallback if no custom label)
const DEFAULT_I_MONTHS = [
  "Muharram","Safar","Rabi Awal","Rabi Thani","Jumada Awal","Jumada Thani",
  "Rajab","Shaban","Ramadan","Shawwal","Dhul Qadah","Dhul Hijjah"
];

function SlideshowDateCard({ now, theme = {}, settingsMap = {} }) {
  // Gregorian
  const englishDate = moment(now).format("dddd D MMMM YYYY");

  // Settings
  const islamicOffset = toNum(settingsMap["islamicCalendar.offset"], 0);
  const normalizeTo30DayMonths = toBool(
    settingsMap["islamicCalendar.normalizeTo30DayMonths"],
    false
  );

  // Hijri base (offset applied)
  let h = moment(now).add(islamicOffset, "days");

  // If library says day 1 and normalization is on, show "30" of previous month
  const isDayOne = h.format("iD") === "1";
  let forcedDay = null;
  if (normalizeTo30DayMonths && isDayOne) {
    h = h.clone().subtract(1, "day"); // previous month for month/year
    forcedDay = "30";                  // force 30 regardless of lib's month length
  }

  const iDay = forcedDay ?? h.format("iD");
  const iMonthIndex0 = parseInt(h.format("iM"), 10) - 1; // 0..11
  const iYear = h.format("iYYYY");

  // Prefer custom month label from settingsMap; otherwise use safe fallback array (no iMMMM)
  const customMonth = settingsMap[`labels.${MONTH_KEYS[iMonthIndex0]}`];
  const iMonth = customMonth || DEFAULT_I_MONTHS[iMonthIndex0] || "—";

  return (
    <div
      className={`w-full p-4 rounded-xl shadow backdrop-blur ${
        theme.bgColor || "bg-white/10"
      } ${theme.textColor || "text-white"}`}
    >
      <p className={`text-center font-semibold ${theme.fontSize || "text-xl"}`}>
        {englishDate}
      </p>
      <p className={`text-center mt-1 ${theme.fontSize || "text-lg"}`}>
        {iDay} {iMonth} {iYear} AH
      </p>
    </div>
  );
}

export default memo(SlideshowDateCard);
