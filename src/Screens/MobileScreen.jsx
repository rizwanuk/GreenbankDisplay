// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";

// Mobile-only compact cards
import MobileCurrentCard from "../Components/MobileCurrentCard";
import MobileNextCard from "../Components/MobileNextCard";

/* --------------------------- UI atoms --------------------------- */
const Pill = ({ left, right, className = "" }) => (
  <div
    className={[
      "flex items-center justify-between",
      "rounded-xl border border-white/15 bg-white/10",
      "px-3 py-2 text-[15px] leading-none",
      className,
    ].join(" ")}
  >
    <span className="font-semibold truncate">{left}</span>
    <span className="opacity-90 ml-3">{right}</span>
  </div>
);

/* --- Upcoming UI helpers (refined + aligned) --- */
/** Shared grid so headers + rows align perfectly:
 *  - 1st col: flexible (name)
 *  - 2nd col: fixed 10ch for time.
 *  - 3rd col: fixed 10ch for time.
 */
const GRID = "grid font-mono grid-cols-[1fr,10ch,10ch] gap-2";

// Centered chip with soft gradient rules either side
const DayDivider = ({ children }) => (
  <div className="flex items-center gap-3 px-3 my-1.5">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    <span className="px-2 py-[3px] text-[11px] rounded-full bg-white/10 border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      {children}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

const UpcomingHeaderRow = () => (
  <div className={`${GRID} text-[11px] uppercase px-3 py-1.5`}>
    <div className="font-sans tracking-wide opacity-70">Salah</div>
    <div className="justify-self-center tabular-nums tracking-normal opacity-70">Start</div>
    <div className="justify-self-end tabular-nums tracking-normal opacity-70">Jam’ah</div>
  </div>
);

// Increased font sizes, keep row height via tight line-height + single line
const UpcomingRow = ({ name, start, jamaah }) => (
  <div className={`${GRID} items-center px-3 py-2 odd:bg-white/[0.03]`}>
    <div className="font-sans font-semibold truncate text-[17px] leading-none">{name}</div>
    <div className="justify-self-center tabular-nums text-[17px] leading-none whitespace-nowrap">
      {start}
    </div>
    <div className="justify-self-end tabular-nums text-[17px] leading-none whitespace-nowrap">
      {jamaah ?? "—"}
    </div>
  </div>
);

/* --------------------------- helpers ---------------------------- */
const ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const SUNRISE_ALIASES = ["sunrise", "shouruq", "shuruq", "shurooq", "shourouq"];
const DHUHR_ALIASES = ["dhuhr", "zuhr"];

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
const fmt = (d, hour12 = false) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12,
        timeZone: tz,
      }).format(d)
    : "—";

const pad2 = (n) => String(n).padStart(2, "0");

const flattenSettings = (rows) => {
  const map = {};
  (rows || []).forEach((r) => {
    const g = (r?.Group || "").trim();
    const k = (r?.Key || "").trim();
    const v = r?.Value != null ? String(r.Value).trim() : "";
    if (!k || v === "") return;
    map[k] = v;
    if (g) map[`${g}.${k}`] = v;
  });
  return map;
};

function findRowForDate(rows, date = new Date()) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const d = date.getDate(),
    m = date.getMonth() + 1,
    y = date.getFullYear();
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  const dmySlash = `${pad2(d)}/${pad2(m)}/${y}`;
  const dmyDash = `${pad2(d)}-${pad2(m)}-${y}`;

  for (const r of rows) {
    const dayVal = r.Day ?? r.day ?? r["Day "];
    const monthVal = r.Month ?? r.month;
    if (dayVal && monthVal) {
      if (parseInt(dayVal, 10) === d && parseInt(monthVal, 10) === m) return r;
    }
    if (r.Date || r.date) {
      const v = String(r.Date || r.date).trim();
      if (v === iso || v === dmySlash || v === dmyDash) return r;
    }
  }
  return null;
}

function parseTimeToDay(cell, refDate) {
  if (!cell) return null;
  let str = String(cell).trim();
  if (!str) return null;

  // Handle 24h "HH:MM"
  let h, m;
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    h = Number(m24[1]);
    m = Number(m24[2]);
  } else {
    // Handle 12h “h:mm am/pm”
    str = str.toLowerCase().replace(/\s+/g, "");
    const mm = str.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (mm) {
      h = Number(mm[1]);
      m = Number(mm[2]);
      const ampm = mm[3];
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    }
  }
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), h, m, 0, 0);
}

// pull adhan/jama‘ah regardless of naming; includes Shouruq aliases
function extractRowTimes(row, refDate, labelMap) {
  if (!row) return {};
  const keys = Object.keys(row || {});
  const pickKey = (names) => {
    const lower = names.map((s) => s.toLowerCase());
    return keys.find((k) => lower.includes(k.toLowerCase()));
  };
  const findKey = (re) => keys.find((k) => re.test(k));

  const out = {};
  ORDER.forEach((p) => {
    // resolve adhan/start column
    let adhanKey;
    if (p === "sunrise") {
      adhanKey = pickKey(SUNRISE_ALIASES);
    } else if (p === "dhuhr") {
      adhanKey = pickKey(DHUHR_ALIASES) || findKey(new RegExp(`^\\s*${p}\\s*`, "i"));
    } else {
      adhanKey =
        findKey(new RegExp(`^\\s*${p}\\s*(adhan|start|begin|beg|time)?\\s*$`, "i")) ||
        findKey(new RegExp(`^\\s*${p}\\s*$`, "i")) ||
        findKey(new RegExp(`${p}.*(adhan|start|begin|beg|time)`, "i"));
    }

    // resolve jama‘ah/iqamah column
    const jamaahKey =
      p === "sunrise" ? null : findKey(new RegExp(`${p}.*(jama|jamaah|jamaat|jamah|iqama|iqamah|congregation|j)$`, "i"));

    const adhan = adhanKey ? row[adhanKey] : null;
    const jamaah = jamaahKey ? row[jamaahKey] : null;

    const startDate = parseTimeToDay(adhan, refDate);
    const jamaahDate = parseTimeToDay(jamaah, refDate);

    if (startDate) {
      out[p] = {
        key: p,
        name: labelMap?.[p] || (p === "sunrise" ? "Shouruq" : p[0].toUpperCase() + p.slice(1)),
        start: startDate,
        jamaah: jamaahDate || null,
      };
    }
  });
  return out;
}

function buildTimeline(row, refDate, labelMap) {
  const map = extractRowTimes(row, refDate, labelMap) || {};
  return ORDER.map((k) => map[k]).filter(Boolean);
}

/** Build ≤max upcoming items. Guarantees Fajr (tomorrow) is present;
 * if there’s room, Sunrise (tomorrow) is included immediately after. */
function buildUpcoming({ now, today, tomorrow, todayRef, tomorrowRef, max = 6 }) {
  const isToday = (d) => d.toDateString() === todayRef.toDateString();
  const isTomorrow = (d) => d.toDateString() === tomorrowRef.toDateString();

  const futureToday = (today || []).filter((p) => p.start > now);
  const combined = [...futureToday, ...(tomorrow || [])]; // already chronological

  let limited = combined.slice(0, max);

  // Ensure Fajr (tomorrow) is present
  const idxFajrT = combined.findIndex((p) => p.key === "fajr" && isTomorrow(p.start));
  const hasFajrT = limited.some((p) => p.key === "fajr" && isTomorrow(p.start));
  if (idxFajrT !== -1 && !hasFajrT) {
    if (limited.length < max) {
      limited = combined.slice(0, Math.min(max, Math.max(idxFajrT + 1, limited.length + 1)));
    } else {
      // replace the last entry if needed then re-sort
      limited[limited.length - 1] = combined[idxFajrT];
    }
    limited.sort((a, b) => a.start - b.start);
  }

  // If Fajr (tomorrow) is there and Sunrise (tomorrow) is close behind, try to include Sunrise
  const idxSunT = combined.findIndex((p) => p.key === "sunrise" && isTomorrow(p.start));
  const hasSunT = limited.some((p) => p.key === "sunrise" && isTomorrow(p.start));
  if (idxFajrT !== -1 && idxSunT !== -1 && limited.some((p) => p.key === "fajr" && isTomorrow(p.start)) && !hasSunT) {
    if (limited.length < max) {
      limited = combined.slice(0, Math.min(max, idxSunT + 1));
    } else {
      limited[limited.length - 1] = combined[idxSunT];
      limited.sort((a, b) => a.start - b.start);
    }
  }

  return { list: limited, isToday, isTomorrow };
}

/* ============================= Component ============================= */
export default function MobileScreen() {
  // Heartbeat to refresh UI regularly (every 30s)
  const [hb, setHb] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHb((h) => h + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const timetable = usePrayerTimes();
  const settingsRows = useSettings();

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);
  const labels = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabic = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  // reference midnights so we stamp times on the correct day
  const now = useMemo(() => new Date(), [hb]);
  const refToday = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const refTomorrow = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() + 1);
    return d;
  }, [refToday]);
  const refYesterday = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() - 1);
    return d;
  }, [refToday]);

  // timetable rows
  const todayRow = useMemo(() => findRowForDate(timetable, refToday), [timetable, refToday]);
  const yRow = useMemo(() => findRowForDate(timetable, refYesterday), [timetable, refYesterday]);
  const tRow = useMemo(() => findRowForDate(timetable, refTomorrow), [timetable, refTomorrow]);

  // labels consistent with main screen
  const labelMap = useMemo(
    () => ({
      fajr: labels?.fajr || "Fajr",
      sunrise: labels?.sunrise || labels?.shouruq || "Shouruq",
      dhuhr: labels?.dhuhr || labels?.zuhr || "Dhuhr",
      asr: labels?.asr || "Asr",
      maghrib: labels?.maghrib || "Maghrib",
      isha: labels?.isha || "Isha",
    }),
    [labels]
  );

  // timelines for upcoming
  const today = useMemo(() => buildTimeline(todayRow, refToday, labelMap), [todayRow, refToday, labelMap]);
  const tomorrow = useMemo(() => buildTimeline(tRow, refTomorrow, labelMap), [tRow, refTomorrow, labelMap]);

  // Upcoming (≤6), includes Sunrise after Fajr when rolling into tomorrow
  const { list: upcoming, isToday, isTomorrow } = useMemo(
    () => buildUpcoming({ now, today, tomorrow, todayRef: refToday, tomorrowRef: refTomorrow, max: 6 }),
    [now, today, tomorrow, refToday, refTomorrow]
  );

  // clock format
  const is24Hour =
    (settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "")
      .toString()
      .toUpperCase() === "TRUE";

  // header strings
  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);
  const nowStr = fmt(now, !is24Hour);

  // split upcoming
  const upcomingToday = upcoming.filter((p) => isToday(p.start));
  const upcomingTomorrow = upcoming.filter((p) => isTomorrow(p.start));

  return (
    // desktop phone-frame; mobile is full width
    <div className="min-h-screen bg-[#060a12] text-white font-poppins md:flex md:items-center md:justify-center md:p-6">
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:bg-[#0b0f1a] md:shadow-2xl md:overflow-hidden">
        {/* Non-sticky header */}
        <div className="px-4 py-3 border-b border-white/10 bg-[#0b0f1a]">
          <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
          <div className="text-xs opacity-75">Mobile view</div>
        </div>

        <main className="px-4 py-4 space-y-3">
          {/* Date */}
          <Pill left={todayLong} right={nowStr} />

          {/* Current (compact, mobile-only) */}
          <MobileCurrentCard
            labels={labels}
            arabicLabels={arabic}
            is24Hour={is24Hour}
            todayRow={todayRow}
            yesterdayRow={yRow}
            settingsMap={settingsMap}
          />

          {/* Next (compact, mobile-only) */}
          <MobileNextCard
            todayRow={todayRow}
            tomorrowRow={tRow}
            labels={labels}
            arabicLabels={arabic}
            settingsMap={settingsMap}
          />

          {/* Upcoming (no section title/meta, no Today chip, keep Tomorrow chip) */}
          <section className="mt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05]">
              {/* Keep column headers */}
              <UpcomingHeaderRow />

              {/* Body */}
              <div className="divide-y divide-white/10">
                {/* Today → rows only (no chip) */}
                {upcomingToday.length > 0 &&
                  upcomingToday.map((p, i) => (
                    <UpcomingRow
                      key={`t-${p.key}-${i}`}
                      name={p.name}
                      start={fmt(p.start, !is24Hour)}
                      jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
                    />
                  ))}

                {/* Tomorrow → keep chip */}
                {upcomingTomorrow.length > 0 && (
                  <>
                    <DayDivider>Tomorrow</DayDivider>
                    {upcomingTomorrow.map((p, i) => (
                      <UpcomingRow
                        key={`tm-${p.key}-${i}`}
                        name={p.name}
                        start={fmt(p.start, !is24Hour)}
                        jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
                      />
                    ))}
                  </>
                )}

                {/* Empty state */}
                {!upcomingToday.length && !upcomingTomorrow.length && (
                  <div className="px-3 py-4 text-sm opacity-70">No upcoming times.</div>
                )}
              </div>

              <div className="h-2" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
