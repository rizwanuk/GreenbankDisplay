import React from "react";
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
    logoUrl:
      "https://greenbankbristol.org/wp-content/uploads/2025/05/GBM-transp-Invert.png",
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
  const currentTheme = toggles.theme || "Theme_1";

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

  return (
    <div className="w-screen h-screen flex flex-col bg-black text-white relative">
      {/* Header */}
      <div className="shrink-0">
        <Header mosque={mosque} theme={themeHeader} />
      </div>

      {/* Main content area */}
      <div className="flex flex-grow overflow-hidden p-4 gap-4">
        {/* Left column */}
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

        {/* Right column */}
        <div className="w-[70%] overflow-hidden">
          <SlideshowPanel
            settings={settings}
            now={now}
            settingsMap={settingsMap}
            theme={themeSlideshow}
          />
        </div>
      </div>

      {/* 🔄 Cache info (bottom-left) */}
      <div className="absolute bottom-2 left-4 text-xs text-white bg-black/60 px-3 py-1 rounded flex items-center gap-2">
        <span className="text-green-400">●</span>
        <span>Last updated: {now.format("HH:mm:ss")}</span>
      </div>
    </div>
  );
}
