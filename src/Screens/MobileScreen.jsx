// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import momentHijri from "moment-hijri";
import { APP_VERSION } from "../version";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";
import useMobileTimeline from "../hooks/useMobileTimeline";

import MobileCurrentCard from "../Components/MobileCurrentCard";
import MobileNextCard from "../Components/MobileNextCard";
import MobileUpcomingList from "../Components/MobileUpcomingList";
import MobileSettingsSheet from "../Components/pwa/MobileSettingsSheet";import { registerMobileSW, applySWUpdate } from "../pwa/registerMobileSW";
// ⬅️ removed postSchedule (legacy)
import { getMobileTheme } from "../utils/helpers";

/* --------------------------- helpers ---------------------------- */
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
    map[k] = v; // NOTE: groupless key (legacy; can collide)
    if (g) map[`${g}.${k}`] = v; // group-qualified key
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

function toLowerMap(obj) {
  const out = {};
  if (!obj) return out;
  for (const [k, v] of Object.entries(obj)) out[String(k).toLowerCase()] = v;
  return out;
}
function withLabelAliases(map) {
  const out = { ...map };
  const aliasPairs = [
    ["dhuhr", "zuhr"],
    ["isha", "ishaa"],
    ["maghrib", "magrib"],
    ["sunrise", "shouruq"],
    ["sunrise", "shuruq"],
    ["sunrise", "shurooq"],
    ["sunrise", "shourouq"],
    ["jummah", "jumuah"],
    ["jummah", "jumma"],
  ];
  for (const [canonical, alias] of aliasPairs) {
    if (out[alias] && !out[canonical]) out[canonical] = out[alias];
    if (out[canonical] && !out[alias]) out[alias] = out[canonical];
  }
  return out;
}
function normalizeKey(raw) {
  let k = String(raw || "").toLowerCase().normalize("NFKD");
  k = k.replace(/[’'‘]/g, "").replace(/\s+/g, "");
  if (k === "ishaa") k = "isha";
  if (k === "magrib") k = "maghrib";
  if (k === "shouruq" || k === "shuruq" || k === "shurooq" || k === "shourouq" || k === "ishraq")
    k = "sunrise";
  if (k.startsWith("jum")) k = "jummah";
  return k;
}
function computeLookupKey(p) {
  let k = p?.lookupKey || p?.key || p?.name || "";
  k = normalizeKey(k);
  let isFriday = false;
  const s = p?.start;
  if (s) {
    if (typeof s.getDay === "function") {
      isFriday = s.getDay() === 5;
    } else if (moment.isMoment(s)) {
      isFriday = s.day() === 5;
    }
  }
  if (isFriday && k === "dhuhr") k = "jummah";
  return k;
}

// ---- time helpers for parsing rows ----
function parseTimeHM(str, baseDate) {
  if (!str) return null;
  const v = String(str).trim();
  let m = /^(\d{1,2}):(\d{2})$/i.exec(v);
  let hour, minute;
  if (m) {
    hour = parseInt(m[1], 10);
    minute = parseInt(m[2], 10);
  } else {
    const m2 =
      /^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)$/i.exec(v) ||
      /^(\d{1,2}):(\d{2})([ap])$/i.exec(v);
    if (!m2) return null;
    hour = parseInt(m2[1], 10);
    minute = parseInt(m2[2], 10);
    const ap = m2[3].toLowerCase();
    if (ap.startsWith("p") && hour < 12) hour += 12;
    if (ap.startsWith("a") && hour === 12) hour = 0;
  }
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}
const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
function looksLikeJamaahKey(canonPrayer, k) {
  const s = normalizeKey(k);
  if (!s.includes(canonPrayer)) return false;
  return /jama|iqam|congreg/.test(s);
}
function buildScheduleEntries(todayRow, dateRef) {
  if (!todayRow) return [];
  const entries = Object.entries(todayRow);
  const startMap = {};
  const jamaahMap = {};
  for (const [key, val] of entries) {
    const canon = normalizeKey(key);
    if (PRAYERS.includes(canon)) startMap[canon] = val;
    for (const p of PRAYERS) if (looksLikeJamaahKey(p, key)) jamaahMap[p] = val;
  }
  const list = [];
  for (const p of PRAYERS) {
    const startAt = parseTimeHM(startMap[p], dateRef);
    if (!Number.isFinite(startAt)) continue;
    const jamaahAt = parseTimeHM(jamaahMap[p], dateRef);
    list.push({ prayer: p, startAt, jamaahAt, url: "/mobile/" });
  }
  return list;
}
function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ============================= Component ============================= */
export default function MobileScreen() {
  const [hb, setHb] = useState(0);

  // Settings panel + theme override
  const [showSettings, setShowSettings] = useState(false);
  const [themeOverride, setThemeOverride] = useState(() => {
    try {
      return localStorage.getItem("selectedTheme") || "";
    } catch {
      return "";
    }
  });

  // SW status
  const [swInfo, setSwInfo] = useState({ ready: false, scope: "" });


  // Heartbeat tick
  useEffect(() => {
    const id = setInterval(() => setHb((h) => h + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Canonicalize /mobile → /mobile/
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p === "/mobile" || p === "/mobile/index.html") {
        window.location.replace("/mobile/");
      }
    }
  }, []);

  // Register SW, hook update prompt, and capture scope
  useEffect(() => {
    (async () => {
      try {
        await registerMobileSW((reg) => {
          const ok = window.confirm("A new version is available. Update now?");
          if (ok) applySWUpdate(reg);
        });
        const reg = await navigator.serviceWorker.ready;
        setSwInfo({ ready: true, scope: reg?.scope || "" });
      } catch {
        setSwInfo({ ready: false, scope: "(failed)" });
      }
    })();
  }, []);

  const timetable = usePrayerTimes();
  const settingsRows = useSettings();

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);

  // ===== Theme selection (mobile-aware) =====
  const defaultTheme =
    settingsMap["mobile.theme"] || settingsMap["toggles.theme"] || "Theme_1";
  const activeTheme = themeOverride || defaultTheme;

  const mapWithThemeOverride = useMemo(
    () => ({ ...settingsMap, "toggles.theme": activeTheme }),
    [settingsMap, activeTheme]
  );

  // Use helper that respects themeMobile.* overrides
  const themeAll = useMemo(() => getMobileTheme(mapWithThemeOverride), [mapWithThemeOverride]);

  const themeHeader = themeAll.header || {};
  const themeDateCard = themeAll.dateCard || {};
  const themeCurrentPrayer = themeAll.currentPrayer || {};
  const themeNextPrayer = themeAll.nextPrayer || {};
  const themeUpcomingPrayer = themeAll.upcomingPrayer || {};

  // ===== Labels =====
  const labelsRaw = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabicRaw = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  const labels = useMemo(() => withLabelAliases(toLowerMap(labelsRaw)), [labelsRaw]);
  const arabic = useMemo(() => withLabelAliases(toLowerMap(arabicRaw)), [arabicRaw]);

  // ===== Time refs =====
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

  // 24h/12h toggle (used by Upcoming list)
  const is24Hour =
    (settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "")
      .toString()
      .toUpperCase() === "TRUE";

  const { upcoming } = useMobileTimeline({
    now: useMemo(() => moment(now), [now]),
    todayRow,
    tomorrowRow: tRow,
    yesterdayRow: yRow,
    settingsMap,
    numberToShow: 6,
  });

  const upcomingWithKeys = useMemo(
    () =>
      (upcoming || []).map((p) => ({
        ...p,
        lookupKey: computeLookupKey(p),
      })),
    [upcoming]
  );

  // English date (line 1)
  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);

  // Show SW banner if relevant
  const showSWBanner =
    typeof window !== "undefined" &&
    (window.location.search.includes("debug=sw") ||
      (swInfo.ready && swInfo.scope && !swInfo.scope.includes("/mobile/")));

  /* -------- Islamic date (line 2) -------- */
  const normalizeTo30 =
    String(settingsMap["islamicCalendar.normalizeTo30DayMonths"] || "FALSE").toUpperCase() ===
    "TRUE";
  const islamicOffset = Number(settingsMap["islamicCalendar.offset"] || 0);

  let h = momentHijri(now).add(islamicOffset, "days");
  const isDayOne = h.format("iD") === "1";
  let forcedDay = null;
  if (normalizeTo30 && isDayOne) {
    h = h.clone().subtract(1, "day"); // use previous month for month/year
    forcedDay = "30"; // force day 30
  }
  const iDay = forcedDay ?? h.format("iD");
  const iMonthIndex0 = parseInt(h.format("iM"), 10) - 1; // 0..11
  const iYear = h.format("iYYYY");

  const MONTH_KEYS = [
    "muharram",
    "safar",
    "rabiAwal",
    "rabiThani",
    "jumadaAwal",
    "jumadaThani",
    "rajab",
    "shaban",
    "ramadan",
    "shawwal",
    "dhulQadah",
    "dhulHijjah",
  ];
  const DEFAULT_I_MONTHS = [
    "Muharram",
    "Safar",
    "Rabīʿ al-ʾAwwal",
    "Rabīʿ al-Ākhir",
    "Jumādā al-Ūlā",
    "Jumādā al-Ākhirah",
    "Rajab",
    "Shaʿbān",
    "Ramaḍān",
    "Shawwāl",
    "Dhū al-Qaʿdah",
    "Dhū al-Ḥijjah",
  ];
  const monthFromSheet = settingsMap[`labels.${MONTH_KEYS[iMonthIndex0]}`];
  const iMonth =
    typeof monthFromSheet === "string" && monthFromSheet.trim()
      ? monthFromSheet.trim()
      : DEFAULT_I_MONTHS[iMonthIndex0];
  const hijriDateString = `${iDay} ${iMonth} ${iYear} AH`;

  // About info (version from generated file, env or git)
  const metaRow = Array.isArray(settingsRows)
    ? settingsRows.find((r) => r?.Group === "meta" && r?.Key === "lastUpdated")
    : null;

  const about = {
    version:
      APP_VERSION ||
      import.meta?.env?.VITE_APP_VERSION ||
      import.meta?.env?.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
      "dev",
    timezone: tz,
    lastUpdated: metaRow ? moment(metaRow.Value).format("DD MMM YYYY, HH:mm:ss") : "",
  };

  // ---------- Settings open/close helpers ----------
  const requestOpenSettings = () => setShowSettings(true);
  const requestCloseSettings = () => {
    try {
      if (window.history.state && window.history.state.modal === "settings") {
        window.history.back();
      } else {
        setShowSettings(false);
      }
    } catch {
      setShowSettings(false);
    }
  };

  // ✅ Build today's Jama'ah times (LOCAL) for the settings sheet to schedule
  const todayJamaahTimes = useMemo(() => {
    if (!todayRow) return [];
    const entries = buildScheduleEntries(todayRow, refToday);
    return entries
      .map((e) => {
        const ts = Number.isFinite(e.jamaahAt) ? e.jamaahAt : e.startAt;
        if (!Number.isFinite(ts)) return null;
        const d = new Date(ts);
        const name = (e.prayer || "").charAt(0).toUpperCase() + (e.prayer || "").slice(1);
        return { name, hour: d.getHours(), minute: d.getMinutes() };
      })
      .filter(Boolean);
  }, [todayRow, refToday]);

  return (
    <div
      className="min-h-screen bg-black text-white font-poppins md:flex md:items-center md:justify-center md:p-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:shadow-2xl md:overflow-hidden">
        {/* Header */}
        <div
          className={[
            "flex items-center justify-between px-4 py-3 border-b",
            themeHeader.bgColor || "bg-[#0b0f1a]",
            themeHeader.textColor || "text-white",
            themeHeader.border || themeHeader.borderColor || "border-white/10",
          ].join(" ")}
        >
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
            <div className="text-xs opacity-75">Mobile view</div>
          </div>

          {/* Single settings button */}
          <button
            aria-label="Settings"
            className={[
              "px-3 py-1.5 rounded-lg border",
              themeHeader.cardBgColor || "bg-white/10",
              themeHeader.cardHoverBgColor || "hover:bg-white/15",
              themeHeader.cardBorderColor || "border-white/10",
            ].join(" ")}
            onClick={requestOpenSettings}
          >
            ⚙️
          </button>
        </div>

        <main className="px-4 py-4 space-y-3">
          {/* Dates pill */}
          <div
            className={[
              "flex flex-col rounded-2xl border shadow-sm px-4 py-3 leading-snug",
              themeDateCard.bgColor || "bg-white/[0.06]",
              themeDateCard.textColor || "text-white",
              themeDateCard.border || themeDateCard.borderColor || "border-white/10",
            ].join(" ")}
          >
            <div
              className={`w-full text-center font-semibold ${
                themeDateCard.englishDateSize || "text-[18px]"
              }`}
            >
              {todayLong}
            </div>
            <div
              className={`w-full text-center mt-1 opacity-90 ${
                themeDateCard.hijriDateSize || "text-[16px]"
              }`}
            >
              {hijriDateString}
            </div>
          </div>

          {showSWBanner && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200 px-3 py-2 text-[12px]">
              <b>Service Worker:</b> {swInfo.ready ? "ready" : "not ready"} — <b>scope</b>:{" "}
              <code>{swInfo.scope || "(none)"} </code>
            </div>
          )}

          {/* Cards */}
          <MobileCurrentCard
            theme={themeCurrentPrayer}
            labels={labels}
            arabicLabels={arabic}
            is24Hour={is24Hour}
            todayRow={todayRow}
            yesterdayRow={yRow}
            settingsMap={settingsMap}
          />

          <MobileNextCard
            theme={themeNextPrayer}
            todayRow={todayRow}
            tomorrowRow={tRow}
            labels={labels}
            arabicLabels={arabic}
            settingsMap={settingsMap}
          />

          <MobileUpcomingList
            theme={themeUpcomingPrayer}
            upcoming={upcomingWithKeys}
            is24Hour={is24Hour}
            todayRef={refToday}
            tomorrowRef={refTomorrow}
            labels={labels}
            arabicLabels={arabic}
          />
        </main>
      </div>

      {/* Mobile-optimised, scrollable Settings sheet */}
      <MobileSettingsSheet
        open={showSettings}
        onClose={requestCloseSettings}
        settingsRows={settingsRows}
        currentThemeName={activeTheme}
        onChangeTheme={(name) => {
          try {
            localStorage.setItem("selectedTheme", name || "");
          } catch {}
          setThemeOverride(name || "");
        }}
        about={about}
        jamaahTimes={todayJamaahTimes} // ✅ pass today's times for scheduling
      />
    </div>
  );
}
