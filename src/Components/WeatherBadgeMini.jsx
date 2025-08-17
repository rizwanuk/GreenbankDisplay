import React from "react";
import WeatherCardUnified from "./WeatherCardUnified";

export default function WeatherBadgeMini({ settings = {}, theme = {}, granularity = "3-hourly", className = "" }) {
  // Map whatever your dropdown emits to the card's expected modes
  const mode =
    granularity === "hourly" ? "now" :
    granularity === "3-hourly" ? "3h" :
    granularity === "today" ? "today" :
    granularity === "24h" ? "24h" :
    "3h";

  return (
    <WeatherCardUnified
      settings={settings}
      theme={theme}
      mode={mode}
      className={className}
    />
  );
}
