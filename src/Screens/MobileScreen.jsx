// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import momentHijri from "moment-hijri";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";
import useMobileTimeline from "../hooks/useMobileTimeline";

import MobileCurrentCard from "../Components/MobileCurrentCard";
import MobileNextCard from "../Components/MobileNextCard";
import MobileUpcomingList from "../Components/MobileUpcomingList";

import usePushStatus from "../hooks/usePushStatus";
import MobileSettingsSheet from "../Components/pwa/MobileSettingsSheet";

import { registerMobileSW, applySWUpdate } from "../pwa/registerMobileSW";

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

/* ============================= Component ============================= */
export default function MobileScreen() {
  const [hb, setHb] = useState(0);

  // Settings sheet controls
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

  // Debug flag (kept for ?debug=pwa)
  const initialDebug =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "pwa";
  const [showDebug] = useState(!!initialDebug);

  // Live push status (kept if you want to surface state later)
  usePushStatus();

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
  const labelsRaw = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabicRaw = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  const labels = useMemo(() => withLabelAliases(toLowerMap(labelsRaw)), [labelsRaw]);
  const arabic = useMemo(() => withLabelAliases(toLowerMap(arabicRaw)), [arabicRaw]);

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

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);
  const nowStr = fmt(now, !is24Hour);

  const showSWBanner =
    typeof window !== "undefined" &&
    (window.location.search.includes("debug=sw") ||
      (swInfo.ready && swInfo.scope && !swInfo.scope.includes("/mobile/")));

  /* -------- Islamic date (offset + 30-day normalization + Sheet labels) -------- */
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

  // About info (version from env, timezone, last updated from sheet)
  const metaRow = Array.isArray(settingsRows)
    ? settingsRows.find((r) => r?.Group === "meta" && r?.Key === "lastUpdated")
    : null;
  const about = {
    version: import.meta?.env?.VITE_APP_VERSION || "",
    timezone: tz,
    lastUpdated: metaRow ? moment(metaRow.Value).format("DD MMM YYYY, HH:mm:ss") : "",
  };

  // ---------- Settings open/close helpers with history state ----------
  const requestOpenSettings = () => {
    setShowSettings(true);
  };

  const requestCloseSettings = () => {
    try {
      // If we opened a modal history entry, use back() to keep nav consistent
      if (window.history.state && window.history.state.modal === "settings") {
        window.history.back();
      } else {
        setShowSettings(false);
      }
    } catch {
      setShowSettings(false);
    }
  };

  useEffect(() => {
    if (!showSettings) return;
    const state = { modal: "settings" };
    const url = new URL(window.location.href);
    url.searchParams.set("panel", "settings");
    window.history.pushState(state, "", url.toString());

    const onPop = () => setShowSettings(false);
    const onKey = (e) => {
      if (e.key === "Escape") requestCloseSettings();
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      // Clean URL param
      const u = new URL(window.location.href);
      u.searchParams.delete("panel");
      window.history.replaceState({}, "", u.toString());
    };
  }, [showSettings]);

  return (
    <div
      className="min-h-screen bg-[#060a12] text-white font-poppins md:flex md:items-center md:justify-center md:p-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:bg-[#0b0f1a] md:shadow-2xl md:overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0f1a]">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
            <div className="text-xs opacity-75">Mobile view</div>
          </div>

          {/* Single settings button */}
          <button
            aria-label="Settings"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
            onClick={requestOpenSettings}
          >
            ⚙️
          </button>
        </div>

        <main className="px-4 py-4 space-y-3">
          {/* Dates pill */}
          <div
            className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] shadow-sm
                       px-4 py-3 leading-snug"
          >
            <div className="w-full text-center text-[14px] font-semibold">
              {todayLong} · <span className="text-white/80">{hijriDateString}</span>
            </div>
            <div
              className="w-full text-center text-[15px] font-semibold mt-1"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {nowStr}
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

          <MobileUpcomingList
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
        currentThemeName={themeOverride}
        onChangeTheme={(name) => {
          try {
            localStorage.setItem("selectedTheme", name || "");
          } catch {}
          setThemeOverride(name || "");
        }}
        about={about}
      />
    </div>
  );
}
