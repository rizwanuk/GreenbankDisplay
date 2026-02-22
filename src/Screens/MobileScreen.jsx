// src/Screens/MobileScreen.jsx
import "../index.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import MobileSettingsSheet from "../Components/pwa/MobileSettingsSheet";
import { registerMobileSW, applySWUpdate, checkForUpdates } from "../pwa/registerMobileSW";

// ✅ Sticky top actions
import MobileTopActions from "../Components/MobileTopActions";

// ✅ Localhost settings URL helper (localhost -> OpenSheet, prod -> /api/settings)
import { getSettingsUrl } from "../utils/getSettingsUrl";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
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

function extractLastUpdatedFromSettingsRows(rows) {
  if (!rows) return "";

  // Shape: [{Group, Key, Value}]
  if (Array.isArray(rows) && rows.length && !Array.isArray(rows[0])) {
    for (const r of rows) {
      const g = String(r?.Group || "").trim();
      const k = String(r?.Key || "").trim();
      const v = String(r?.Value ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
    return "";
  }

  // Shape: [["Group","Key","Value"], ["meta","lastUpdated","..."]]
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    for (const r of rows.slice(1)) {
      const g = String(r?.[0] || "").trim();
      const k = String(r?.[1] || "").trim();
      const v = String(r?.[2] ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
  }

  return "";
}

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

function buildMobileThemeMap(settingsRows = []) {
  const map = {};
  for (const r of settingsRows || []) {
    const group = (r?.Group || "").trim();
    if (!group.startsWith("themeMobile.")) continue;
    const key = (r?.Key || "").trim();
    const val = r?.Value != null ? String(r.Value).trim() : "";
    if (!key) continue;
    const parts = group.split("."); // ["themeMobile","Theme_4","currentPrayer"]
    const themeName = parts[1] || "Theme_1";
    const section = parts[2] || "root";
    map[themeName] ||= {};
    map[themeName][section] ||= {};
    map[themeName][section][key] = val;
  }
  return map;
}

export default function MobileScreen() {
  const [hb, setHb] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [themeOverride, setThemeOverride] = useState(() => {
    try {
      return localStorage.getItem("selectedTheme") || "";
    } catch {
      return "";
    }
  });
  const [swInfo, setSwInfo] = useState({ ready: false, scope: "" });

  useEffect(() => {
    const id = setInterval(() => setHb((h) => h + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p === "/mobile" || p === "/mobile/index.html") window.location.replace("/mobile/");
    }
  }, []);

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
  const settingsHook = useSettings();
  const settingsRows = Array.isArray(settingsHook) ? settingsHook : settingsHook?.rows || [];
  const settingsObj =
    settingsHook && !Array.isArray(settingsHook)
      ? settingsHook.settings || settingsHook.parsed || null
      : null;

  // ✅ Auto-reload when Google Sheet settings change (public endpoint)
  const lastUpdatedRef = useRef("");
  const lastHardReloadRef = useRef(Date.now());

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        // ✅ IMPORTANT: this must be a PUBLIC endpoint (no admin token)
        const r = await fetch(getSettingsUrl(), { cache: "no-store" });
        const j = await r.json();

        // ✅ OpenSheet returns an array; Vercel /api/settings returns { rows: [...] }
        const rows = Array.isArray(j) ? j : j.rows || j.values || j.settings || [];

        const next = extractLastUpdatedFromSettingsRows(rows);

        if (!lastUpdatedRef.current) {
          lastUpdatedRef.current = next || "";
          return;
        }

        if (next && next !== lastUpdatedRef.current) {
          window.location.reload();
          return;
        }

        // safety net: reload every 30 mins
        if (Date.now() - lastHardReloadRef.current > 30 * 60 * 1000) {
          lastHardReloadRef.current = Date.now();
          window.location.reload();
        }
      } catch {
        // ignore transient failures
      }
    };

    poll();
    const id = setInterval(() => {
      if (!stopped) poll();
    }, 60 * 1000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);
  const themeMap = useMemo(() => buildMobileThemeMap(settingsRows), [settingsRows]);

  const defaultThemeName =
    settingsMap["mobile.theme"] ||
    settingsMap["toggles.themeMobile"] ||
    settingsMap["toggles.theme"] ||
    "Theme_1";

  const activeThemeName = themeOverride || defaultThemeName;

  const themeAll = themeMap[activeThemeName] || {};
  const themeHeader = themeAll.header || {};
  const themeDateCard = themeAll.dateCard || {};
  const themeCurrentPrayer = themeAll.currentPrayer || {};
  const themeNextPrayer = themeAll.nextPrayer || {};
  const themeUpcomingPrayer = themeAll.upcomingPrayer || {};

  const toLowerMap = (obj) => {
    const out = {};
    if (!obj) return out;
    for (const [k, v] of Object.entries(obj)) out[String(k).toLowerCase()] = v;
    return out;
  };

  const withLabelAliases = (map) => {
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
  };

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
    String(settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "").toUpperCase() ===
    "TRUE";

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
        lookupKey: (p?.lookupKey || p?.key || p?.name || "").toLowerCase(),
      })),
    [upcoming]
  );

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);

  const normalizeTo30 =
    String(settingsMap["islamicCalendar.normalizeTo30DayMonths"] || "FALSE").toUpperCase() ===
    "TRUE";
  const islamicOffset = Number(settingsMap["islamicCalendar.offset"] || 0);
  let h = momentHijri(now).add(islamicOffset, "days");
  const isDayOne = h.format("iD") === "1";
  let forcedDay = null;
  if (normalizeTo30 && isDayOne) {
    h = h.clone().subtract(1, "day");
    forcedDay = "30";
  }
  const iDay = forcedDay ?? h.format("iD");
  const iMonthIndex0 = parseInt(h.format("iM"), 10) - 1;
  const iYear = h.format("iYYYY");
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
  const monthFromSheet = settingsMap[`labels.${MONTH_KEYS[iMonthIndex0]}`];
  const iMonth =
    typeof monthFromSheet === "string" && monthFromSheet.trim()
      ? monthFromSheet.trim()
      : DEFAULT_I_MONTHS[iMonthIndex0];
  const hijriDateString = `${iDay} ${iMonth} ${iYear} AH`;

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

  const requestOpenSettings = () => setShowSettings(true);
  const requestCloseSettings = () => {
    try {
      if (window.history.state && window.history.state.modal === "settings") window.history.back();
      else setShowSettings(false);
    } catch {
      setShowSettings(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-black text-white font-poppins md:flex md:items-center md:justify-center md:p-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:shadow-2xl md:overflow-hidden">
        {/* ✅ Sticky header + action bar together */}
        <div className="sticky top-0 z-40">
          <div
            className={[
              "flex items-center justify-between px-4 py-3 border-b",
              themeHeader.bgColor || "bg-[#0b0f1a]",
              themeHeader.textColor || "text-white",
              themeHeader.border || themeHeader.borderColor || "border-white/10",
            ].join(" ")}
          >
            {/* ✅ UPDATED: Icon + shorter title */}
            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                    <path d="M12 3l7 6v11H5V9l7-6Z" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M9 20v-6a3 3 0 0 1 6 0v6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </span>

                <div className="min-w-0">
                  <div className="text-[15px] font-semibold truncate leading-tight">
                    Greenbank Masjid
                  </div>
                  <div className="text-[11px] opacity-80 leading-tight">
                    Prayer Times • Mobile
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ Settings icon */}
            <button
              aria-label="Settings"
              className={[
                "h-10 w-10 rounded-xl border inline-flex items-center justify-center",
                themeHeader.cardBgColor || "bg-white/10",
                themeHeader.cardHoverBgColor || "hover:bg-white/15",
                themeHeader.cardBorderColor || "border-white/10",
              ].join(" ")}
              onClick={requestOpenSettings}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M19.4 13a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3h-6l-.4 3a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.5L4.6 11a7.9 7.9 0 0 0 .1 2L2.7 14.5l2 3.5 2.4-1a7.6 7.6 0 0 0 1.7 1L9 21h6l.4-3a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  opacity="0.9"
                />
              </svg>
            </button>
          </div>

          {/* ✅ Top action bar (More removed) */}
          <MobileTopActions slideshowUrl="/messages" zIndex={80} show={{ more: false }} />
        </div>

        <main className="px-4 py-4 space-y-3">
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

      <MobileSettingsSheet
        open={showSettings}
        onClose={requestCloseSettings}
        settingsRows={settingsRows}
        settings={settingsObj || { toggles: { themeMobile: defaultThemeName } }}
        currentThemeName={activeThemeName}
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