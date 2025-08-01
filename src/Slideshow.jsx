// Slideshow.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import SlideshowScreen from "./Screens/SlideshowScreen.jsx";
import useSettings from "./hooks/useSettings";
import usePrayerTimes from "./hooks/usePrayerTimes";

function SlideshowApp() {
  const settings = useSettings();
  const timetable = usePrayerTimes();

  return (
    <SlideshowScreen
      settings={settings}
      timetable={timetable}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SlideshowApp />
  </React.StrictMode>
);
