import React, { useEffect, useMemo, useState, useRef } from "react";
import moment from "moment-hijri";
moment.locale("en-gb");

import Header from "./Components/Header";
import Clock from "./Components/Clock";
import DateCard from "./Components/DateCard";
import CurrentPrayerCard from "./Components/CurrentPrayerCard";
import UpcomingPrayerRows from "./Components/UpcomingPrayerRows";
import NextPrayerCard from "./Components/NextPrayerCard";
import InfoCard from "./Components/InfoCard";
import useSettings from "./hooks/useSettings";
import usePrayerTimes from "./hooks/usePrayerTimes";
import AppErrorBoundary from "./Components/AppErrorBoundary";

import { buildSettingsMap, getTheme } from "./utils/helpers";
import { getEnglishLabels, getArabicLabels } from "./utils/labels";

// ✅ Localhost settings URL helper (localhost -> OpenSheet, prod -> /api/settings)

// Weather
import WeatherCardUnified from "./Components/WeatherCardUnified";

// Display mode + floating menu
import useLocalDisplayMode from "./hooks/useLocalDisplayMode";
import FloatingMenu from "./Components/FloatingMenu";

// Device ID (6-digit code)
import useDeviceId from "./hooks/useDeviceId";

// Remote device config (JSONP-capable hook)
import useRemoteDeviceConfig from "./hooks/useRemoteDeviceConfig";

/* ---------------- helpers ---------------- */

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

function App() {
  // 🔒 Always call hooks in the same order, unconditionally
  const settings = useSettings();
  const timetable = usePrayerTimes();

  const [lastUpdated, setLastUpdated] = useState(null);
  const prevLastUpdated = useRef(null);

  const [selectedTheme, setSelectedTheme] = useState(() =>
    localStorage.getItem("selectedTheme")
  );

  const [showWeather, setShowWeather] = useState(() => {
    const v = localStorage.getItem("ui.showWeather");
    return v === null ? true : v === "true";
  });
  const [weatherMode, setWeatherMode] = useState(() => {
    return localStorage.getItem("ui.weatherMode") || "3h";
  });
  useEffect(() => localStorage.setItem("ui.showWeather", String(showWeather)), [showWeather]);
  useEffect(() => localStorage.setItem("ui.weatherMode", weatherMode), [weatherMode]);

  const [displayMode, setDisplayMode, isAutoMode, resetToAuto] = useLocalDisplayMode("1080p");

  // Ticker for alert progress bar — updates every second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Apply display mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    const prior = Array.from(root.classList).filter((c) => c.startsWith("mode-"));
    prior.forEach((c) => root.classList.remove(c));
    root.classList.add(`mode-${displayMode}`);
    return () => {
      root.classList.remove(`mode-${displayMode}`);
    };
  }, [displayMode]);

  // Clear legacy local weather creds/coords
  useEffect(() => {
    try {
      localStorage.removeItem("ui.weatherLat");
      localStorage.removeItem("ui.weatherLon");
      localStorage.removeItem("ui.weatherPostcode");
      localStorage.removeItem("ui.metofficeApiKey");
    } catch {}
  }, []);

   // Build settings map
  const settingsMap = useMemo(
    () => (Array.isArray(settings) && settings.length ? buildSettingsMap(settings) : {}),
    [settings]
  );

  // Mosque details (from Settings sheet, with safe fallbacks)
const mosque = useMemo(() => {
  return {
    name: settingsMap["mosque.name"] || "Greenbank Masjid",
    address:
      settingsMap["mosque.address"] ||
      "Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE",
    webpage: settingsMap["mosque.webpage"] || "greenbankbristol.org",
    logoUrl:
      settingsMap["mosque.logoUrl"] ||
      "https://greenbankbristol.org/wp-content/uploads/2025/05/GBM-transp-Invert.png",
  };
}, [settingsMap]);


  // Theme selection
  const defaultTheme = settingsMap["toggles.theme"] || "Theme_1";
  const activeTheme = selectedTheme || defaultTheme;
  const mapWithThemeOverride = useMemo(
    () => ({ ...settingsMap, "toggles.theme": activeTheme }),
    [settingsMap, activeTheme]
  );
  const themeAll = useMemo(() => getTheme(mapWithThemeOverride), [mapWithThemeOverride]);

  const themeHeader = themeAll.header || {};
  const themeClock = themeAll.clock || {};
  const themeDateCard = themeAll.dateCard || {};
  const themeCurrentPrayer = themeAll.currentPrayer || {};
  const themeUpcomingPrayer = themeAll.upcomingPrayer || {};
  const themeNextPrayer = themeAll.nextPrayer || {};
  const themeInfoCard = themeAll.infoCard || {};
  const themeWeather = themeAll.weatherCard || {};

  // Toggles / labels
  const is24Hour = settingsMap["toggles.clock24Hours"] === "TRUE";
  const islamicOffset = parseInt(settingsMap["islamicCalendar.offset"] || 0, 10);
  const normalizeTo30DayMonths =
    String(settingsMap["islamicCalendar.normalizeTo30DayMonths"] || "FALSE").toUpperCase() ===
    "TRUE";

  const L = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const A = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  // Hijri months (prefer settings spellings, fall back to nice defaults)
  const hijriMonthKeys = [
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
  const islamicMonths = hijriMonthKeys.map((key, idx) => {
    const fromSheet = settingsMap[`labels.${key}`];
    if (typeof fromSheet === "string" && fromSheet.trim()) return fromSheet.trim();
    return DEFAULT_I_MONTHS[idx];
  });

  // Timetable helpers
  const getRow = (m) =>
    Array.isArray(timetable)
      ? timetable.find(
          (r) => parseInt(r?.Day, 10) === m.date() && parseInt(r?.Month, 10) === m.month() + 1
        )
      : undefined;

  const today = moment();
  const tomorrow = moment().add(1, "day");
  const yesterday = moment().subtract(1, "day");

  const todayRow = getRow(today);
  const tomorrowRow = getRow(tomorrow);
  const yesterdayRow = getRow(yesterday);

  // ✅ Auto-refresh when Settings sheet changes (meta.lastUpdated)
  // This polls a PUBLIC endpoint so it works even if useSettings() doesn't refetch.
  const hardReloadRef = useRef(Date.now());

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        // ✅ IMPORTANT: this must be a PUBLIC endpoint (no admin token)
const r = await fetch("/api/settings", { cache: "no-store" });
const j = await r.json();

// ✅ OpenSheet returns an array; Vercel /api/settings returns { rows: [...] }
const rows = Array.isArray(j)
  ? j
  : (j.rows || j.values || j.settings || []);

const next = extractLastUpdatedFromSettingsRows(rows);


        // seed
        if (!prevLastUpdated.current) {
          prevLastUpdated.current = next || null;
          if (next) setLastUpdated(next);
          return;
        }

        // changed => reload
        if (next && prevLastUpdated.current !== next) {
          console.log("🔄 Detected change in settings. Reloading page...");
          window.location.reload();
          return;
        }

        // safety net: full reload every 30 mins
        if (Date.now() - hardReloadRef.current > 30 * 60 * 1000) {
          hardReloadRef.current = Date.now();
          window.location.reload();
        }

        // keep footer timestamp fresh (optional)
        if (next) setLastUpdated(next);
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

  // Theme options for selector
  const allThemes = useMemo(() => {
    const rows = Array.isArray(settings) ? settings : [];
    const names = rows
      .filter((row) => row && typeof row.Group === "string" && row.Group.startsWith("theme."))
      .map((row) => row.Group.split(".")[1])
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [settings]);

  const numberUpcoming = parseInt(settingsMap["toggles.numberUpcomingPrayers"] || "6", 10);

  const handleSetTheme = (name) => {
    setSelectedTheme(name);
    try {
      localStorage.setItem("selectedTheme", name);
    } catch {}
  };

  // Device code
  const { code: deviceCode } = useDeviceId();

  // 🔗 Remote device config — ALWAYS call this hook (no conditionals)
  const DEVICE_API = import.meta.env.VITE_DEVICE_API || "";
  const { cfg: remoteCfg, error: remoteErr } = useRemoteDeviceConfig(deviceCode, DEVICE_API, 15000);

  // Apply remote overrides whenever they change
  useEffect(() => {
    if (!remoteCfg) return;

    const enabled = String(remoteCfg.enabled ?? "TRUE").toUpperCase() !== "FALSE";
    if (!enabled) return;

    if (remoteCfg.displayMode) setDisplayMode(remoteCfg.displayMode);

    if (remoteCfg.themeOverride) {
      setSelectedTheme(remoteCfg.themeOverride);
      try {
        localStorage.setItem("selectedTheme", remoteCfg.themeOverride);
      } catch {}
    }

    if (typeof remoteCfg.showWeather !== "undefined") {
      const sw =
        String(remoteCfg.showWeather).toUpperCase() === "TRUE" || remoteCfg.showWeather === true;
      setShowWeather(sw);
    }

    if (remoteCfg.weatherMode) setWeatherMode(remoteCfg.weatherMode);
  }, [remoteCfg, setDisplayMode, setSelectedTheme, setShowWeather, setWeatherMode]);

  return (
    <AppErrorBoundary>
      <div className="relative bg-black text-white min-h-screen overflow-auto">
        <div className="flex flex-col">
          {/* Header with centered device code glass card */}
          <div className="relative">
            <Header mosque={mosque} theme={themeHeader} />
            {deviceCode ? (
              <div className="pointer-events-none select-text absolute left-1/2 -translate-x-1/2 top-2 text-base md:text-lg">
                <span className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-black/30 backdrop-blur-md px-3 py-1.5 shadow ring-1 ring-white/20">
                  <span className="uppercase tracking-wide text-white/70 text-[10px]">Device</span>
                  <span className="font-semibold">ID: {deviceCode}</span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex-1 flex flex-col md:flex-row px-4 sm:px-6 md:px-12 lg:px-16 pt-6 gap-6 items-start overflow-hidden">
            <div className="w-full md:w-1/3 max-w-full md:max-w-[33vw] flex flex-col gap-6">
              <Clock
                settings={{
                  clock24Hours: settingsMap["toggles.clock24Hours"],
                  ampmLowercase: settingsMap["toggles.ampmLowercase"],
                }}
                theme={themeClock}
              />

              <DateCard
                theme={themeDateCard}
                islamicMonths={islamicMonths}
                islamicOffset={islamicOffset}
                normalizeTo30DayMonths={normalizeTo30DayMonths}
              />

              <NextPrayerCard
                todayRow={todayRow}
                tomorrowRow={tomorrowRow}
                isFriday={today.day() === 5}
                labels={L}
                arabicLabels={A}
                settingsMap={settingsMap}
                theme={themeNextPrayer}
              />

              {showWeather && (
                <WeatherCardUnified settings={settingsMap} theme={themeWeather} mode={weatherMode} />
              )}

              <InfoCard settings={settings} settingsMap={settingsMap} theme={themeInfoCard} />
            </div>

            <div className="w-full md:w-2/3 flex flex-col h-full overflow-hidden min-h-0">
              <div className="shrink-0 mb-6">
                {(() => {
                  const alertEnabled = settingsMap["alert.enabled"] === "true";
                  const alertMsg     = settingsMap["alert.message"] || "";
                  const expiresAt    = settingsMap["alert.expiresAt"] || "";
                  const isExpired    = expiresAt ? new Date(expiresAt).getTime() < now : false;
                  const alertActive  = alertEnabled && alertMsg && !isExpired;

                  // Compute progress bar width
                  const duration   = Number(settingsMap["alert.duration"] || 60);
                  const expiresMs  = expiresAt ? new Date(expiresAt).getTime() : now + duration * 1000;
                  const totalMs    = duration * 1000;
                  const remainMs   = Math.max(0, expiresMs - now);
                  const progress   = totalMs > 0 ? (remainMs / totalMs) * 100 : 100;

                  const alertStyle = settingsMap["alert.style"] || "urgent";
                  const scrolling  = settingsMap["alert.scrolling"] === "true";
                  const styleBg    = {
                    urgent:  "#dc2626",
                    warning: "#d97706",
                    info:    "#2563eb",
                    notice:  "#059669",
                  }[alertStyle] || "#dc2626";

                  return (
                    <div className="rounded-xl overflow-hidden h-[11rem] sm:h-[11.5rem] md:h-[12rem] flex flex-col"
                      style={{ backgroundColor: styleBg }}>
                      <div className="flex-1 flex items-center justify-center">
                        {scrolling ? (
                          <div className="w-full overflow-hidden px-6">
                            <div className="overflow-hidden whitespace-nowrap">
                              <span className="text-white font-extrabold text-4xl md:text-5xl"
                                style={{ display: "inline-block", animation: "marquee 18s linear infinite" }}>
                                {alertMsg} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {alertMsg}
                              </span>
                              <style>{`@keyframes marquee { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }`}</style>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full px-8 flex items-center justify-center h-full">
                            <p className="text-white font-extrabold text-center leading-tight break-words w-full"
                              style={{ fontSize: "clamp(1.5rem, 4vw, 3.5rem)", wordBreak: "break-word", hyphens: "auto" }}>
                              {alertMsg}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: "4px", backgroundColor: "rgba(0,0,0,0.25)" }}>
                        <div style={{ height: "4px", width: `${progress}%`, backgroundColor: "rgba(255,255,255,0.6)", transition: "width 1s linear" }} />
                      </div>
                    </div>
                  );
                })()}
                {!(() => {
                  const alertEnabled = settingsMap["alert.enabled"] === "true";
                  const alertMsg     = settingsMap["alert.message"] || "";
                  const expiresAt    = settingsMap["alert.expiresAt"] || "";
                  const isExpired    = expiresAt ? new Date(expiresAt).getTime() < now : false;
                  return alertEnabled && alertMsg && !isExpired;
                })() && (
                  <CurrentPrayerCard
                    theme={themeCurrentPrayer}
                    todayRow={todayRow}
                    yesterdayRow={yesterdayRow}
                    settingsMap={settingsMap}
                    labels={L}
                    arabicLabels={A}
                    is24Hour={is24Hour}
                  />
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <UpcomingPrayerRows
                  todayRow={todayRow}
                  tomorrowRow={tomorrowRow}
                  yesterdayRow={yesterdayRow}
                  settings={settings}
                  labels={L}
                  arabicLabels={A}
                  settingsMap={settingsMap}
                  numberToShow={numberUpcoming}
                  theme={themeUpcomingPrayer}
                  is24Hour={is24Hour}
                />
              </div>
            </div>
          </div>

          <div className={`absolute bottom-2 left-4 text-xs px-3 py-1 rounded ${settings?.refreshStatus?.isFromCache ? "text-amber-300 bg-black/70 border border-amber-400/30" : "text-white bg-black/60"}`}>
            {settings?.refreshStatus?.isFromCache ? "⚠ Cached" : "● Live"} | {settings?.refreshStatus?.isFromCache ? `Showing cached data from ${settings?.refreshStatus?.cacheTimestamp ? moment(settings.refreshStatus.cacheTimestamp).format("DD MMM, HH:mm") : "unknown"}` : `Last updated ${lastUpdated ? moment(lastUpdated).format("DD MMM YYYY, HH:mm:ss") : "—"}`}

            {remoteErr ? (
              <span className="ml-2 text-red-400">• Remote: {String(remoteErr)}</span>
            ) : null}
          </div>
        </div>

        {/* Floating controls (Theme + Display Mode + Weather) */}
        <FloatingMenu
          themeName={activeTheme}
          setThemeName={handleSetTheme}
          themeOptions={allThemes}
          displayMode={displayMode}
          isAutoMode={isAutoMode}
          resetToAuto={resetToAuto}
          setDisplayMode={setDisplayMode}
          showWeather={showWeather}
          setShowWeather={setShowWeather}
          weatherMode={weatherMode}
          setWeatherMode={setWeatherMode}
        />
      </div>
    </AppErrorBoundary>
  );
}

export default App;
