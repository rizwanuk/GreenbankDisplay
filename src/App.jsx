import React from "react";
import moment from "moment";
import Header from "./Components/Header";
import Clock from "./Components/Clock";
import DateCard from "./Components/DateCard";
import CurrentPrayerCard from "./Components/CurrentPrayerCard";
import UpcomingPrayerRows from "./Components/UpcomingPrayerRows";
import NextPrayerCard from "./Components/NextPrayerCard";
import InfoCard from "./Components/InfoCard"; // ✅ Added
import useSettings from "./hooks/useSettings";
import usePrayerTimes from "./hooks/usePrayerTimes";

function App() {
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
  const themeClock = extractTheme(`theme.${currentTheme}.clock`);
  const themeDateCard = extractTheme(`theme.${currentTheme}.dateCard`);
  const themeCurrentPrayer = extractTheme(`theme.${currentTheme}.currentPrayer`);
  const themeUpcomingPrayer = extractTheme(`theme.${currentTheme}.upcomingPrayer`);
  const themeNextPrayer = extractTheme(`theme.${currentTheme}.nextPrayer`);
  const themeInfoCard = extractTheme(`theme.${currentTheme}.infoCard`); // ✅ Added

  const is24Hour = toggles.clock24Hours === "TRUE";

  const islamicOffset = parseInt(
    settings.find((s) => s.Group === "islamicCalendar" && s.Key === "offset")?.Value || 0,
    10
  );

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

  const hijriMonthKeys = [
    "muharram", "safar", "rabiAwal", "rabiThani", "jumadaAwal", "jumadaThani",
    "rajab", "shaban", "ramadan", "shawwal", "dhulQadah", "dhulHijjah"
  ];
  const islamicMonths = hijriMonthKeys.map(
    (key) => labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1)
  );

  const today = moment();
  const tomorrow = moment().add(1, "day");
  const yesterday = moment().subtract(1, "day");

  const getRow = (m) =>
    timetable.find(
      (r) => parseInt(r.Day, 10) === m.date() && parseInt(r.Month, 10) === m.month() + 1
    );

  const todayRow = getRow(today);
  const tomorrowRow = getRow(tomorrow);
  const yesterdayRow = getRow(yesterday);

  const settingsMap = settings.reduce((acc, row) => {
    acc[`${row.Group}.${row.Key}`] = row.Value;
    acc[row.Key] = row.Value;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header mosque={mosque} theme={themeHeader} />

      {/* Main Content: stacked on mobile, horizontal on md+ */}
      <div className="flex flex-col md:flex-row px-4 sm:px-6 md:px-12 lg:px-16 pt-6 gap-6 items-start">
        {/* Left Column */}
        <div className="w-full md:w-1/3 max-w-full md:max-w-[33vw] flex flex-col gap-6">
          <Clock settings={toggles} theme={themeClock} />
          <DateCard
            theme={themeDateCard}
            islamicMonths={islamicMonths}
            islamicOffset={islamicOffset}
          />
          <NextPrayerCard
            now={moment()}
            todayRow={todayRow}
            tomorrowRow={tomorrowRow}
            isFriday={today.day() === 5}
            labels={labelMap}
            arabicLabels={arabicLabelMap}
            settingsMap={settingsMap}
            theme={themeNextPrayer}
          />
          <InfoCard
            settings={settings}
            settingsMap={settingsMap}
            now={moment()}
            theme={themeInfoCard}
          />
        </div>

        {/* Right Column */}
        <div className="w-full md:w-2/3 flex flex-col gap-6">
          <CurrentPrayerCard
            now={moment()}
            theme={themeCurrentPrayer}
            todayRow={todayRow}
            yesterdayRow={yesterdayRow}
            settingsMap={settingsMap}
            labels={labelMap}
            arabicLabels={arabicLabelMap}
            is24Hour={is24Hour}
          />

          <UpcomingPrayerRows
            now={moment()}
            todayRow={todayRow}
            tomorrowRow={tomorrowRow}
            yesterdayRow={yesterdayRow}
            settings={settings}
            labels={labelMap}
            arabicLabels={arabicLabelMap}
            settingsMap={settingsMap}
            numberToShow={parseInt(toggles.numberUpcomingPrayers || "6", 10)}
            theme={themeUpcomingPrayer}
            is24Hour={is24Hour}
          />
        </div>
      </div>

      {/* 🔄 Cache info (bottom-left) */}
      <div className="absolute bottom-2 left-4 text-xs text-white bg-black/60 px-3 py-1 rounded">
        ● Last updated at {today.format("HH:mm:ss")}
      </div>
    </div>
  );
}

export default App;
