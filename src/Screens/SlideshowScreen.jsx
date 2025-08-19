// src/Screens/SlideshowScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";

import Header from "../Components/Header";
import SlideshowClock from "../Components/slideshow/SlideshowClock";
import SlideshowDateCard from "../Components/slideshow/SlideshowDateCard";
import SlideshowCurrentPrayerCard from "../Components/slideshow/SlideshowCurrentPrayerCard";
import SlideshowUpcomingPrayerRows from "../Components/slideshow/SlideshowUpcomingPrayerRows";
import SlideshowPanel from "../Components/SlideshowPanel";

import useLocalDisplayMode from "../hooks/useLocalDisplayMode";
import FloatingMenu from "../Components/FloatingMenu";

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
    map[k] = v;
    if (g) map[`${g}.${k}`] = v;
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

  // Theme selection
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

  // Slideshow theme groups
  const themeHeader = withNormalisedFonts(readGroup(settingsMap, `${base}.header`));
  const themeClock = withNormalisedFonts(readGroup(settingsMap, `${base}.slideshowClock`));
  const themeDateCard = withNormalisedFonts(readGroup(settingsMap, `${base}.slideshowDateCard`));
  const themeCurrentPrayer = withNormalisedFonts(readGroup(settingsMap, `${base}.slideshowCurrentPrayer`));
  const themeUpcomingPrayer = withNormalisedFonts(readGroup(settingsMap, `${base}.slideshowUpcomingPrayer`));
  const themeSlideshow = withNormalisedFonts(readGroup(settingsMap, `${base}.slideshow`));

  // Labels
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

  /* ---------- Display Mode (local, per device) ---------- */
  const [displayMode, setDisplayMode] = useLocalDisplayMode("1080p");

  // Apply display mode class to <html> so font-size scaling works
  useEffect(() => {
    const root = document.documentElement;
    const prior = Array.from(root.classList).filter((c) => c.startsWith("mode-"));
    prior.forEach((c) => root.classList.remove(c));
    root.classList.add(`mode-${displayMode}`);
    return () => {
      root.classList.remove(`mode-${displayMode}`);
    };
  }, [displayMode]);

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-auto">
      {/* NOTE: mode-* is applied to <html> via useEffect above; no transform/zoom used */}
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

      {/* Floating controls — weather controls disabled for slideshow */}
      <FloatingMenu
        themeName={activeTheme}
        setThemeName={(t) => {
          setSelectedTheme(t);
          try { localStorage.setItem("selectedTheme", t); } catch {}
        }}
        themeOptions={allThemes}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
        showWeatherControls={false}
      />
    </div>
  );
}
