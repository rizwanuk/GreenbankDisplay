import React, { useEffect, useRef, useState } from "react";
import moment from "moment";
import Header from "../Components/Header";
import SlideshowClock from "../Components/slideshow/SlideshowClock";
import SlideshowDateCard from "../Components/slideshow/SlideshowDateCard";
import SlideshowCurrentPrayerCard from "../Components/slideshow/SlideshowCurrentPrayerCard";
import SlideshowUpcomingPrayerRows from "../Components/slideshow/SlideshowUpcomingPrayerRows";
import SlideshowPanel from "../Components/SlideshowPanel";
import useSettings from "../hooks/useSettings";
import usePrayerTimes from "../hooks/usePrayerTimes";

export default function SlideshowScreen() {
  const now = moment();
  const settings = useSettings();
  const timetable = usePrayerTimes();

  const mosque = {
    name: "Greenbank Masjid",
    address: "Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE",
    webpage: "greenbankbristol.org",
    logoUrl: "https://greenbankbristol.org/wp-content/uploads/2025/05/GBM-transp-Invert.png",
  };

  const extractTheme = (group) =>
    settings
      .filter((row) => row.Group === group)
      .reduce((acc, row) => {
        acc[row.Key] = row.Value;
        return acc;
      }, {});

  const toggles = settings.reduce((acc, row) => {
    if (row.Group === "toggles") acc[row.Key] = row.Value;
    return acc;
  }, {});

  const [localTheme, setLocalTheme] = useState(() => localStorage.getItem("themeOverride") || null);
  const defaultTheme = toggles.theme || "Theme_1";
  const currentTheme = localTheme || defaultTheme;

  const allThemes = [...new Set(settings.filter(r => r.Group.startsWith("theme.")).map(r => r.Group.split(".")[1]))];

  const handleThemeChange = (e) => {
    const selected = e.target.value;
    setLocalTheme(selected);
    localStorage.setItem("themeOverride", selected);
  };

  const themeHeader = extractTheme(`theme.${currentTheme}.header`);
  const themeClock = extractTheme(`theme.${currentTheme}.slideshowClock`);
  const themeDateCard = extractTheme(`theme.${currentTheme}.slideshowDateCard`);
  const themeCurrentPrayer = extractTheme(`theme.${currentTheme}.slideshowCurrentPrayer`);
  const themeUpcomingPrayer = extractTheme(`theme.${currentTheme}.slideshowUpcomingPrayer`);
  const themeSlideshow = extractTheme(`theme.${currentTheme}.slideshow`);

  const settingsMap = settings.reduce((acc, row) => {
    acc[`${row.Group}.${row.Key}`] = row.Value;
    acc[row.Key] = row.Value;
    return acc;
  }, {});

  const labelMap = settings
    .filter((row) => row.Group === "labels")
    .reduce((acc, row) => {
      acc[row.Key] = row.Value;
      return acc;
    }, {});
  const arabicLabelMap = settings
    .filter((row) => row.Group === "labels.arabic")
    .reduce((acc, row) => {
      acc[row.Key] = row.Value;
      return acc;
    }, {});

  const today = moment();
  const yesterday = moment().subtract(1, "day");
  const tomorrow = moment().add(1, "day");

  const getRow = (m) =>
    timetable.find(
      (r) =>
        parseInt(r.Day, 10) === m.date() &&
        parseInt(r.Month, 10) === m.month() + 1
    );

  const todayRow = getRow(today);
  const yesterdayRow = getRow(yesterday);
  const tomorrowRow = getRow(tomorrow);

  const is24Hour = toggles.clock24Hours === "TRUE";

  const [_, forceUpdate] = useState(0);
  const lastUpdatedRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentUpdated = settingsMap["meta.lastUpdated"];
      if (!lastUpdatedRef.current) {
        lastUpdatedRef.current = currentUpdated;
      } else if (lastUpdatedRef.current !== currentUpdated) {
        console.log("🔄 Google Sheet has changed, reloading page.");
        window.location.reload();
      } else {
        console.log("✅ No change in Google Sheet data.");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [settingsMap]);

  const [zoom, setZoom] = useState(() => {
    const stored = localStorage.getItem("zoomLevel");
    return stored ? parseFloat(stored) : 1;
  });
  const [zoomBoxVisible, setZoomBoxVisible] = useState(false);
  const zoomTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("zoomLevel", zoom);
  }, [zoom]);

  const showZoomBox = () => {
    setZoomBoxVisible(true);
    clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => {
      setZoomBoxVisible(false);
    }, 10000);
  };

  useEffect(() => {
    return () => clearTimeout(zoomTimeoutRef.current);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-auto">
      <div
        style={{ zoom: zoom, width: "100%", height: "100%" }}
      >
        <div className="w-screen h-screen flex flex-col">
          <div className="shrink-0">
            <Header mosque={mosque} theme={themeHeader} />
          </div>
          <div className="flex flex-grow overflow-hidden p-4 gap-4">
            <div className="w-[30%] flex flex-col items-stretch gap-4 overflow-hidden min-h-0">
              <SlideshowClock now={now} theme={themeClock} settingsMap={settingsMap} />
              <SlideshowDateCard now={now} theme={themeDateCard} settingsMap={settingsMap} />
              <SlideshowCurrentPrayerCard
                now={now}
                theme={themeCurrentPrayer}
                todayRow={todayRow}
                yesterdayRow={yesterdayRow}
                settingsMap={settingsMap}
                labels={labelMap}
                arabicLabels={arabicLabelMap}
                is24Hour={is24Hour}
              />
              <SlideshowUpcomingPrayerRows
                now={now}
                timetable={timetable}
                todayRow={todayRow}
                yesterdayRow={yesterdayRow}
                tomorrowRow={tomorrowRow}
                settingsMap={settingsMap}
                theme={themeUpcomingPrayer}
                labels={labelMap}
                arabicLabels={arabicLabelMap}
                is24Hour={is24Hour}
              />
            </div>
            <div className="w-[70%] overflow-hidden">
              <SlideshowPanel
                settings={settings}
                now={now}
                settingsMap={settingsMap}
                theme={themeSlideshow}
              />
            </div>
          </div>
          <div className="absolute bottom-2 left-4 text-xs text-white bg-black/60 px-3 py-1 rounded flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span>Last updated: {now.format("HH:mm:ss")}</span>
          </div>
        </div>
      </div>

      {/* Combined Zoom and Theme Settings Box */}
      <div className="absolute bottom-2 left-2 z-50">
        <button
          onClick={showZoomBox}
          className="bg-black/70 text-white p-2 rounded-full hover:bg-white hover:text-black transition"
          title="Settings"
        >
          ⚙️
        </button>
        {zoomBoxVisible && (
          <div className="mt-2 bg-black/80 text-white p-3 rounded shadow-lg w-56 flex flex-col gap-3 text-sm">
            <div>
              <label className="block mb-1">Zoom: {Math.round(zoom * 100)}%</label>
              <div className="flex gap-2">
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
            <div>
              <label className="block mb-1">Theme:</label>
              <select
                value={currentTheme}
                onChange={handleThemeChange}
                className="bg-black text-white border border-white p-1 w-full"
              >
                {allThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
