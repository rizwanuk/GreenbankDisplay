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

// ✅ Weather
import WeatherCardUnified from "./Components/WeatherCardUnified";

function App() {
  const settings = useSettings();
  const timetable = usePrayerTimes();
  const [lastUpdated, setLastUpdated] = useState(null);
  const prevLastUpdated = useRef(null);

  // --- UI state ---
  const [zoom, setZoom] = useState(() => {
    const stored = localStorage.getItem("zoomLevel");
    return stored ? parseFloat(stored) : 1;
  });
  const [zoomBoxVisible, setZoomBoxVisible] = useState(false);
  const zoomTimeoutRef = useRef(null);
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem("selectedTheme"));

  // 🌤️ Weather UI state
  const [showWeather, setShowWeather] = useState(() => {
    const v = localStorage.getItem("ui.showWeather");
    return v === null ? true : v === "true";
  });
  const [weatherMode, setWeatherMode] = useState(() => {
    return localStorage.getItem("ui.weatherMode") || "3h";
  });

  useEffect(() => localStorage.setItem("zoomLevel", zoom), [zoom]);
  useEffect(() => localStorage.setItem("ui.showWeather", String(showWeather)), [showWeather]);
  useEffect(() => localStorage.setItem("ui.weatherMode", weatherMode), [weatherMode]);

  const showZoomBox = () => {
    setZoomBoxVisible(true);
    clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => setZoomBoxVisible(false), 10000);
  };
  useEffect(() => () => clearTimeout(zoomTimeoutRef.current), []);

  // 🔒 Clear legacy local weather creds/coords
  useEffect(() => {
    try {
      localStorage.removeItem("ui.weatherLat");
      localStorage.removeItem("ui.weatherLon");
      localStorage.removeItem("ui.weatherPostcode");
      localStorage.removeItem("ui.metofficeApiKey");
    } catch {}
  }, []);

  // --- Static mosque details ---
  const mosque = {
    name: "Greenbank Masjid",
    address: "Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE",
    webpage: "greenbankbristol.org",
    logoUrl: "https://greenbankbristol.org/wp-content/uploads/2025/05/GBM-transp-Invert.png",
  };

  // Build settingsMap once
  const settingsMap = useMemo(
    () => (Array.isArray(settings) && settings.length ? buildSettingsMap(settings) : {}),
    [settings]
  );

  // Theme selection
  const defaultTheme = settingsMap["toggles.theme"] || "Theme_1";
  const activeTheme = selectedTheme || defaultTheme;
  const mapWithThemeOverride = useMemo(
    () => ({ ...settingsMap, "toggles.theme": activeTheme }),
    [settingsMap, activeTheme]
  );
  const themeAll = useMemo(() => getTheme(mapWithThemeOverride), [mapWithThemeOverride]);

  // Shorthand
  const themeHeader = themeAll.header || {};
  const themeClock = themeAll.clock || {};
  const themeDateCard = themeAll.dateCard || {};
  const themeCurrentPrayer = themeAll.currentPrayer || {};
  const themeUpcomingPrayer = themeAll.upcomingPrayer || {};
  const themeNextPrayer = themeAll.nextPrayer || {};
  const themeInfoCard = themeAll.infoCard || {};
  const themeWeather = themeAll.weatherCard || {}; // ✅ added

  // Toggles
  const is24Hour = settingsMap["toggles.clock24Hours"] === "TRUE";
  const islamicOffset = parseInt(settingsMap["islamicCalendar.offset"] || 0, 10);

  // Labels
  const L = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const A = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  // Hijri months
  const hijriMonthKeys = [
    "muharram","safar","rabiAwal","rabiThani","jumadaAwal","jumadaThani",
    "rajab","shaban","ramadan","shawwal","dhulQadah","dhulHijjah"
  ];
  const islamicMonths = hijriMonthKeys.map((key) => L[key] || key.charAt(0).toUpperCase() + key.slice(1));

  // Timetable accessors
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

  // 🔁 Google Sheet auto-refresh
  useEffect(() => {
    if (!Array.isArray(settings)) return;

    const checkLastUpdated = () => {
      const metaRow = settings.find((row) => row?.Group === "meta" && row?.Key === "lastUpdated");
      if (!metaRow) return;
      const newTimestamp = metaRow.Value;
      if (prevLastUpdated.current && prevLastUpdated.current !== newTimestamp) {
        console.log("🔄 Detected change in Google Sheet. Reloading page...");
        window.location.reload();
      }
      prevLastUpdated.current = newTimestamp;
      setLastUpdated(newTimestamp);
    };

    const interval = setInterval(checkLastUpdated, 60000);
    checkLastUpdated();
    return () => clearInterval(interval);
  }, [settings]);

  // Theme list for selector
  const allThemes = useMemo(() => {
    const rows = Array.isArray(settings) ? settings : [];
    const names = rows
      .filter((row) => row && typeof row.Group === "string" && row.Group.startsWith("theme."))
      .map((row) => row.Group.split(".")[1])
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [settings]);

  const numberUpcoming = parseInt(settingsMap["toggles.numberUpcomingPrayers"] || "6", 10);

  return (
    <AppErrorBoundary>
      <div className="relative bg-black text-white min-h-screen overflow-auto">
        <div style={{ zoom: zoom, width: "100%", height: "100%" }}>
          <div className="flex flex-col">
            <Header mosque={mosque} theme={themeHeader} />

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

                {/* 🌤️ Weather card — now uses themeWeather from Google Sheet */}
                {showWeather && (
                  <WeatherCardUnified
                    settings={settingsMap}
                    theme={themeWeather}
                    mode={weatherMode}
                  />
                )}

                <InfoCard
                  settings={settings}
                  settingsMap={settingsMap}
                  theme={themeInfoCard}
                />
              </div>

              <div className="w-full md:w-2/3 flex flex-col h-full overflow-hidden min-h-0">
                <div className="shrink-0 mb-6">
                  <CurrentPrayerCard
                    theme={themeCurrentPrayer}
                    todayRow={todayRow}
                    yesterdayRow={yesterdayRow}
                    settingsMap={settingsMap}
                    labels={L}
                    arabicLabels={A}
                    is24Hour={is24Hour}
                  />
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

            <div className="absolute bottom-2 left-4 text-xs text-white bg-black/60 px-3 py-1 rounded">
              ● Last updated at {lastUpdated ? moment(lastUpdated).format("HH:mm:ss") : "—"}
            </div>
          </div>
        </div>

        {/* ⚙️ Floating Controls */}
        <div className="absolute bottom-2 left-2 z-50">
          <button
            onClick={showZoomBox}
            className="bg-black/70 text-white p-2 rounded-full hover:bg-white hover:text-black transition"
            title="Settings"
          >
            ⚙️
          </button>

          {zoomBoxVisible && (
            <div className="mt-2 bg-black/80 text-white p-3 rounded shadow-lg w-64 flex flex-col gap-3">
              {/* Zoom */}
              <div className="flex flex-col items-center">
                <div className="text-xs mb-2">Zoom: {Math.round(zoom * 100)}%</div>
                <div className="flex gap-2 mb-1">
                  <button
                    onClick={() => setZoom((z) => Math.min(z + 0.05, 1.5))}
                    className="px-2 py-1 bg-white text-black rounded hover:bg-gray-200 text-sm"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.max(z - 0.05, 0.5))}
                    className="px-2 py-1 bg-white text-black rounded hover:bg-gray-200 text-sm"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div>
                <div className="text-xs mb-1">Theme</div>
                <select
                  value={activeTheme}
                  onChange={(e) => {
                    const newTheme = e.target.value;
                    setSelectedTheme(newTheme);
                    localStorage.setItem("selectedTheme", newTheme);
                  }}
                  className="bg-white text-black px-2 py-1 rounded text-sm w-full"
                >
                  {Array.isArray(allThemes) &&
                    allThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme}
                      </option>
                    ))}
                </select>
              </div>

              {/* Weather */}
              <div className="border-t border-white/10 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs">Show weather card</label>
                  <input
                    type="checkbox"
                    checked={showWeather}
                    onChange={(e) => setShowWeather(e.target.checked)}
                  />
                </div>

                <div className="mt-2">
                  <div className="text-xs mb-1">Weather mode</div>
                  <select
                    value={showWeather ? weatherMode : "off"}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "off") {
                        setShowWeather(false);
                      } else {
                        setShowWeather(true);
                        setWeatherMode(v);
                      }
                    }}
                    className="bg-white text-black px-2 py-1 rounded text-sm w-full"
                  >
                    <option value="now">Hourly (now)</option>
                    <option value="3h">Next 3 periods</option>
                    <option value="today">Today</option>
                    <option value="24h">Next 24 hours</option>
                    <option value="off">Hidden</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppErrorBoundary>
  );
}

export default App;
