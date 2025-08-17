// src/Screens/MobileScreen.jsx
import "../index.css";
import React, { useMemo } from "react";
import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";

// Mobile-only compact cards (no changes to shared desktop cards)
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
 *  - Put the grid in monospace so `ch` is stable.
 *  - 1st col: flexible (name) → switch back to sans for readability.
 *  - 2nd col: fixed 10ch for time.
 *  - 3rd col: fixed 10ch for time.
 */
const GRID = "grid font-mono grid-cols-[1fr,10ch,10ch] gap-2";

const CardHeader = ({ title, meta }) => (
  <div className="flex items-baseline justify-between px-3 pt-3 pb-1">
    <div className="text-xs uppercase tracking-wide opacity-80">{title}</div>
    {meta ? <div className="text-[11px] opacity-60">{meta}</div> : null}
  </div>
);

const DayDivider = ({ children }) => (
  <div className="relative px-3 my-1.5">
    <div className="border-t border-white/10" />
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
      <span className="px-2 py-[3px] text-[11px] rounded-full bg-white/10 border border-white/15">
        {children}
      </span>
    </div>
  </div>
);

const UpcomingHeaderRow = () => (
  <div className={`${GRID} text-[11px] uppercase px-3 py-1.5`}>
    {/* Name header stays sans + slight tracking */}
    <div className="font-sans tracking-wide opacity-70">Salah</div>
    {/* Time headers: keep tracking normal so centering matches numbers */}
    <div className="justify-self-center tabular-nums tracking-normal opacity-70">Start</div>
    <div className="justify-self-end tabular-nums tracking-normal opacity-70">Jam’ah</div>
  </div>
);

const UpcomingRow = ({ name, start, jamaah }) => (
  <div className={`${GRID} items-center px-3 py-2 odd:bg-white/[0.03]`}>
    <div className="font-sans font-semibold truncate">{name}</div>
    <div className="justify-self-center tabular-nums text-[15px]">{start}</div>
    <div className="justify-self-end tabular-nums text-[15px]">{jamaah ?? "—"}</div>
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
    const dayVal = r.Day ?? r.day ?? r.DAY;
    const monVal = r.Month ?? r.month ?? r.MONTH;
    if (dayVal != null && monVal != null) {
      const dayNum = Number(String(dayVal).replace(/\D/g, ""));
      const monNum = Number(String(monVal).replace(/\D/g, ""));
      if (dayNum === d && monNum === m) return r;
    }
    for (const k of Object.keys(r || {})) {
      if (/^date$/i.test(k) || /iso/i.test(k)) {
        const raw = String(r[k]).trim();
        if (raw.startsWith(iso) || raw === dmySlash || raw === dmyDash) return r;
        const parsed = new Date(raw);
        if (
          !isNaN(parsed) &&
          parsed.getFullYear() === y &&
          parsed.getMonth() + 1 === m &&
          parsed.getDate() === d
        ) {
          return r;
        }
      }
    }
  }
  return null;
}

// tolerant time parser: "13:22", "1:22 pm", "1322", 802 (mins), Date
function parseTimeToDay(anyTime, refDate = new Date()) {
  if (anyTime == null) return null;
  if (anyTime instanceof Date && !isNaN(anyTime)) return anyTime;

  let h = NaN,
    m = NaN;
  if (typeof anyTime === "number") {
    if (anyTime < 48 * 60) {
      h = Math.floor(anyTime / 60);
      m = anyTime % 60;
    } else {
      h = Math.floor(anyTime / 100);
      m = anyTime % 100;
    }
  } else if (typeof anyTime === "string") {
    const s = anyTime.trim().toLowerCase();
    let mm =
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s) ||
      /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(s) ||
      /^(\d{2})(\d{2})$/.exec(s);
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

// Ensure Sunrise follows Fajr when the list crosses to tomorrow (cap 6)
function buildUpcoming({ now, today, tomorrow, todayRef, tomorrowRef, max = 6 }) {
  const isToday = (d) => d.toDateString() === todayRef.toDateString();
  const isTomorrow = (d) => d.toDateString() === tomorrowRef.toDateString();

  const futureToday = today.filter((p) => p.start > now);
  const combined = [...futureToday, ...tomorrow]; // chronological

  let limited = combined.slice(0, max);

  const idxFajrT = combined.findIndex((p) => p.key === "fajr" && isTomorrow(p.start));
  const idxSunT = combined.findIndex((p) => p.key === "sunrise" && isTomorrow(p.start));
  const hasFajrT = limited.some((p) => p.key === "fajr" && isTomorrow(p.start));
  const hasSunT = limited.some((p) => p.key === "sunrise" && isTomorrow(p.start));

  if (idxFajrT !== -1 && idxSunT !== -1 && hasFajrT && !hasSunT) {
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
  const timetable = usePrayerTimes();
  const settingsRows = useSettings();

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);
  const labels = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabic = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  // reference midnights so we stamp times on the correct day
  const now = new Date();
  const refToday = new Date(now);
  refToday.setHours(0, 0, 0, 0);
  const refTomorrow = new Date(refToday);
  refTomorrow.setDate(refToday.getDate() + 1);
  const refYesterday = new Date(refToday);
  refYesterday.setDate(refToday.getDate() - 1);

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
        <header className="sticky top-0 z-10 bg-[#0b0f1a]/90 backdrop-blur px-4 py-3 border-b border-white/10">
          <div className="text-lg font-semibold truncate">Greenbank Display</div>
          <div className="text-xs opacity-75">Mobile view</div>
        </header>

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

          {/* Upcoming (refined heading and column alignment) */}
          <section className="mt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05]">
              <CardHeader
                title="Upcoming"
                meta={(() => {
                  const total = (upcomingToday?.length || 0) + (upcomingTomorrow?.length || 0);
                  if (!total) return null;
                  const first = upcomingToday[0] || upcomingTomorrow[0];
                  const last =
                    (upcomingTomorrow.length
                      ? upcomingTomorrow[upcomingTomorrow.length - 1]
                      : upcomingToday[upcomingToday.length - 1]) || first;
                  return `${total} items • ${fmt(first?.start, !is24Hour)} → ${fmt(last?.start, !is24Hour)}`;
                })()}
              />

              <UpcomingHeaderRow />

              {/* Body */}
              <div className="divide-y divide-white/10">
                {/* Today */}
                {upcomingToday.length > 0 && (
                  <>
                    <DayDivider>Today</DayDivider>
                    {upcomingToday.map((p, i) => (
                      <UpcomingRow
                        key={`t-${p.key}-${i}`}
                        name={p.name}
                        start={fmt(p.start, !is24Hour)}
                        jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
                      />
                    ))}
                  </>
                )}

                {/* Tomorrow */}
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

              {/* subtle bottom padding to match header spacing */}
              <div className="h-2" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
