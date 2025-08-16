// src/Screens/SlideshowScreen.jsx

// Ensure Tailwind CSS is bundled for this route
import "../index.css";

import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";

// ✅ NOTE: all of these come from src/Components/…
import Header from "../Components/Header";
import SlideshowClock from "../Components/slideshow/SlideshowClock";
import SlideshowDateCard from "../Components/slideshow/SlideshowDateCard";
import SlideshowCurrentPrayerCard from "../Components/slideshow/SlideshowCurrentPrayerCard";
import SlideshowUpcomingPrayerRows from "../Components/slideshow/SlideshowUpcomingPrayerRows";
import SlideshowPanel from "../Components/SlideshowPanel";

import useSettings from "../hooks/useSettings";
import usePrayerTimes from "../hooks/usePrayerTimes";

/* ---------------- helpers ---------------- */

function buildSettingsMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    const g = (row?.Group || "").trim();
    const k = (row?.Key || "").trim();
    const v = row?.Value != null ? String(row.Value).trim() : "";
    if (!k || v === "") return;
    map[k] = v; // plain
    if (g) map[`${g}.${k}`] = v; // namespaced
  });
  return map;
}

function readGroup(map, prefix) {
  const out = {};
  const pfx = prefix.endsWith(".") ? prefix : prefix + ".";
  for (const [k, v] of Object.entries(map || {})) {
    if (k.startsWith(pfx)) out[k.slice(pfx.length)] = v;
  }
  return out;
}

// "Poppins" -> "font-poppins", "Amiri" -> "font-arabic"
function normaliseFontToken(v) {
  if (!v) return v;
  const s = String(v).trim().toLowerCase();
  if (s.startsWith("font-")) return s;
  const map = {
    rubik: "font-rubik",
    inter: "font-inter",
    cairo: "font-cairo",
    lalezar: "font-lalezar",
    poppins: "font-poppins",
    amiri: "font-arabic",
    arabic: "font-arabic",
  };
  return map[s] || s;
}
function withNormalisedFonts(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  if (out.fontEng) out.fontEng = normaliseFontToken(out.fontEng);
  if (out.fontAra) out.fontAra = normaliseFontToken(out.fontAra);
  return out;
}

/* ---------------- component ---------------- */

export default function SlideshowScreen() {
  const settings = useSettings();
  const timetable = usePrayerTimes();

  // Static mosque details
  const mosque = {
    name: "Greenbank Masjid",
    address: "Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE",
    webpage: "greenbankbristol.org",
    logoUrl:
      "https://greenbankbristol.org/wp-content/uploads/2025/05/GBM-transp-Invert.png",
  };

  const settingsMap = useMemo(() => buildSettingsMap(settings), [settings]);

  // Theme selection (shared with main app via localStorage)
  const defaultTheme = settingsMap["toggles.theme"] || "Theme_1";
  const [selectedTheme, setSelectedTheme] = useState(
    () => localStorage.getItem("selectedTheme") || null
  );
  const activeTheme = selectedTheme || defaultTheme;

  // All theme names for selector
  const allThemes = useMemo(() => {
    const rows = Array.isArray(settings) ? settings : [];
    const names = rows
      .filter((r) => r?.Group && r.Group.startsWith("theme."))
      .map((r) => r.Group.split(".")[1])
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [settings]);

  const base = `theme.${activeTheme}`;

  // Slideshow theme groups (with font normalisation)
  const themeHeader = withNormalisedFonts(readGroup(settingsMap, `${base}.header`));
  const themeClock = withNormalisedFonts(
    readGroup(settingsMap, `${base}.slideshowClock`)
  );
  const themeDateCard = withNormalisedFonts(
    readGroup(settingsMap, `${base}.slideshowDateCard`)
  );
  const themeCurrentPrayer = withNormalisedFonts(
    readGroup(settingsMap, `${base}.slideshowCurrentPrayer`)
  );
  const themeUpcomingPrayer = withNormalisedFonts(
    readGroup(settingsMap, `${base}.slideshowUpcomingPrayer`)
  );
  const themeSlideshow = withNormalisedFonts(
    readGroup(settingsMap, `${base}.slideshow`)
  );

  // Labels (EN + AR)
  const labels = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(settingsMap)) {
      if (k.startsWith("labels.")) out[k.replace("labels.", "")] = v;
    }
    return out;
  }, [settingsMap]);

  const arabicLabels = useMemo(() => {
    const out = {};
    for (const [k, v] of Object.entries(settingsMap)) {
      if (k.startsWith("labels.arabic."))
        out[k.replace("labels.arabic.", "")] = v;
    }
    return out;
  }, [settingsMap]);

  // Timetable helpers
  const getRow = (m) =>
    Array.isArray(timetable)
      ? timetable.find(
          (r) =>
            parseInt(r?.Day, 10) === m.date() &&
            parseInt(r?.Month, 10) === m.month() + 1
        )
      : undefined;

  const now = moment();
  const today = moment();
  const yesterday = moment().subtract(1, "day");
  const tomorrow = moment().add(1, "day");

  const todayRow = getRow(today);
  const yesterdayRow = getRow(yesterday);
  const tomorrowRow = getRow(tomorrow);

  const is24Hour = settingsMap["toggles.clock24Hours"] === "TRUE";

  // Auto-reload when Google Sheet changes
  const lastUpdatedRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => {
      const current = settingsMap["meta.lastUpdated"];
      if (!lastUpdatedRef.current) lastUpdatedRef.current = current;
      else if (current && current !== lastUpdatedRef.current) {
        window.location.reload();
      }
    }, 60000);
    return () => clearInterval(id);
  }, [settingsMap]);

  // Zoom controls (same behaviour as main app)
  const [zoom, setZoom] = useState(() => {
    const stored = localStorage.getItem("zoomLevel");
    return stored ? parseFloat(stored) : 1;
  });
  const [zoomBoxVisible, setZoomBoxVisible] = useState(false);
  const zoomTimeoutRef = useRef(null);
  useEffect(() => localStorage.setItem("zoomLevel", zoom), [zoom]);
  const showZoomBox = () => {
    setZoomBoxVisible(true);
    clearTimeout(zoomTimeoutRef.current);
    zoomTimeoutRef.current = setTimeout(() => setZoomBoxVisible(false), 10000);
  };
  useEffect(() => () => clearTimeout(zoomTimeoutRef.current), []);

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-auto">
      <div style={{ zoom, width: "100%", height: "100%" }}>
        <div className="w-screen h-screen flex flex-col">
          {/* Header */}
          <div className="shrink-0">
            <Header mosque={mosque} theme={themeHeader} />
          </div>

          {/* Main content */}
          <div className="flex flex-grow overflow-hidden p-4 gap-4">
            {/* Left column */}
            <div className="w-full lg:w-[30%] flex flex-col items-stretch gap-4 overflow-hidden min-h-0">
              <SlideshowClock now={now} theme={themeClock} settingsMap={settingsMap} />
              <SlideshowDateCard now={now} theme={themeDateCard} settingsMap={settingsMap} />
              <SlideshowCurrentPrayerCard
                now={now}
                theme={themeCurrentPrayer}
                todayRow={todayRow}
                yesterdayRow={yesterdayRow}
                settingsMap={settingsMap}
                labels={labels}
                arabicLabels={arabicLabels}
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
                labels={labels}
                arabicLabels={arabicLabels}
                is24Hour={is24Hour}
              />
            </div>

            {/* Right column */}
            <div className="hidden lg:block w-[70%] overflow-hidden">
              <SlideshowPanel
                settings={settings}
                now={now}
                settingsMap={settingsMap}
                theme={themeSlideshow}
              />
            </div>
          </div>

          {/* Footer tick */}
          <div className="absolute bottom-2 left-4 text-xs text-white bg-black/60 px-3 py-1 rounded flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span>Last updated: {now.format("HH:mm:ss")}</span>
          </div>
        </div>
      </div>

      {/* Floating controls */}
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
                value={activeTheme}
                onChange={(e) => {
                  const t = e.target.value;
                  setSelectedTheme(t);
                  localStorage.setItem("selectedTheme", t);
                }}
                className="bg-black text-white border border-white p-1 w-full"
              >
                {allThemes.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
