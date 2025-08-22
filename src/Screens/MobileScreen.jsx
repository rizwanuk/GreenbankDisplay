// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";
import { getJummahTime } from "../hooks/usePrayerHelpers";

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

const GRID = "grid font-mono grid-cols-[1fr,10ch,10ch] gap-2";

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

  let h, m;
  const m24 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    h = Number(m24[1]);
    m = Number(m24[2]);
  } else {
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

function buildUpcoming({ now, today, tomorrow, todayRef, tomorrowRef, max = 6 }) {
  const isToday = (d) => d.toDateString() === todayRef.toDateString();
  const isTomorrow = (d) => d.toDateString() === tomorrowRef.toDateString();

  const futureToday = (today || []).filter((p) => p.start > now);
  const combined = [...futureToday, ...(tomorrow || [])];

  let limited = combined.slice(0, max);

  const fajrToday = (today || []).find((p) => p.key === "fajr");
  const fajrTomorrow = (tomorrow || []).find((p) => p.key === "fajr" && isTomorrow(p.start));

  if (
    fajrToday &&
    fajrTomorrow &&
    now >= fajrToday.start &&
    !limited.some((p) => p.key === "fajr" && isTomorrow(p.start))
  ) {
    limited.push(fajrTomorrow);
    limited.sort((a, b) => a.start - b.start);
    if (limited.length > max) limited = limited.slice(0, max);
  }

  return { list: limited, isToday, isTomorrow };
}

/* --- Jum‘ah override --- */
function applyJummahOverrideToList(list, settingsMap, labels) {
  const jummahLabel = labels?.jummah || "Jum‘ah";

  return (list || []).map((p) => {
    if (p?.key === "dhuhr" && p.start && p.start.getDay() === 5) {
      const override = { ...p, name: jummahLabel };

      const jummahMoment = getJummahTime(settingsMap, moment(p.start));
      if (jummahMoment?.isValid?.()) {
        override.jamaah = jummahMoment.toDate();
      }
      return override;
    }
    return p;
  });
}

/* ============================= Component ============================= */
export default function MobileScreen() {
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

  const todayRow = useMemo(() => findRowForDate(timetable, refToday), [timetable, refToday]);
  const yRow = useMemo(() => findRowForDate(timetable, refYesterday), [timetable, refYesterday]);
  const tRow = useMemo(() => findRowForDate(timetable, refTomorrow), [timetable, refTomorrow]);

  const labelMap = useMemo(
    () => ({
      fajr: labels?.fajr || "Fajr",
      sunrise: labels?.sunrise || labels?.shouruq || "Shouruq",
      dhuhr: labels?.dhuhr || labels?.zuhr || "Dhuhr",
      asr: labels?.asr || "Asr",
      maghrib: labels?.maghrib || "Maghrib",
      isha: labels?.isha || "Isha",
      jummah: labels?.jummah || "Jum‘ah",
    }),
    [labels]
  );

  const today = useMemo(() => buildTimeline(todayRow, refToday, labelMap), [todayRow, refToday, labelMap]);
  const tomorrow = useMemo(() => buildTimeline(tRow, refTomorrow, labelMap), [tRow, refTomorrow, labelMap]);

  const { list: rawUpcoming, isToday, isTomorrow } = useMemo(
    () => buildUpcoming({ now, today, tomorrow, todayRef: refToday, tomorrowRef: refTomorrow, max: 6 }),
    [now, today, tomorrow, refToday, refTomorrow]
  );

  const upcoming = useMemo(
    () => applyJummahOverrideToList(rawUpcoming, settingsMap, labels),
    [rawUpcoming, settingsMap, labels]
  );

  const is24Hour =
    (settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "")
      .toString()
      .toUpperCase() === "TRUE";

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);
  const nowStr = fmt(now, !is24Hour);

  const upcomingToday = upcoming.filter((p) => isToday(p.start));
  const upcomingTomorrow = upcoming.filter((p) => isTomorrow(p.start));

  return (
    <div className="min-h-screen bg-[#060a12] text-white font-poppins md:flex md:items-center md:justify-center md:p-6">
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:bg-[#0b0f1a] md:shadow-2xl md:overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-[#0b0f1a]">
          <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
          <div className="text-xs opacity-75">Mobile view</div>
        </div>

        <main className="px-4 py-4 space-y-3">
          <Pill left={todayLong} right={nowStr} />

          <MobileCurrentCard
            labels={labels}
            arabicLabels={arabic}
            is24Hour={is24Hour}
            todayRow={todayRow}
            yesterdayRow={yRow}
            settingsMap={settingsMap}
          />

          <MobileNextCard
            todayRow={todayRow}
            tomorrowRow={tRow}
            labels={labels}
            arabicLabels={arabic}
            settingsMap={settingsMap}
          />

          <section className="mt-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05]">
              <UpcomingHeaderRow />

              <div className="divide-y divide-white/10">
                {upcomingToday.length > 0 &&
                  upcomingToday.map((p, i) => (
                    <UpcomingRow
                      key={`t-${p.key}-${i}`}
                      name={p.name}
                      start={fmt(p.start, !is24Hour)}
                      jamaah={p.jamaah ? fmt(p.jamaah, !is24Hour) : null}
                    />
                  ))}

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
