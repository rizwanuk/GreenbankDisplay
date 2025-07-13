// Slideshow.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import moment from "moment";
import SlideshowScreen from "./Screens/SlideshowScreen.jsx";
import useSettings from "./hooks/useSettings";
import usePrayerTimes from "./hooks/usePrayerTimes";

function SlideshowApp() {
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
  const themeInfoCard = extractTheme(`theme.${currentTheme}.infoCard`);

  const is24Hour = toggles.clock24Hours === "TRUE";

  const settingsMap = settings.reduce((acc, row) => {
    acc[`${row.Group}.${row.Key}`] = row.Value;
    acc[row.Key] = row.Value;
    return acc;
  }, {});

  return (
    <SlideshowScreen
      settings={settings}
      timetable={timetable}
      mosque={mosque}
      toggles={toggles}
      settingsMap={settingsMap}
      themeHeader={themeHeader}
      themeClock={themeClock}
      themeDateCard={themeDateCard}
      themeCurrentPrayer={themeCurrentPrayer}
      themeUpcomingPrayer={themeUpcomingPrayer}
      themeNextPrayer={themeNextPrayer}
      themeInfoCard={themeInfoCard}
      is24Hour={is24Hour}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SlideshowApp />
  </React.StrictMode>
);
