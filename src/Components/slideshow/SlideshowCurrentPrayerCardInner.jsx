import React from "react";
import MobileCurrentCard from "../MobileCurrentCard"; // <- adjust path if needed

export default function SlideshowCurrentPrayerCardInner({
  now,
  todayRow,
  yesterdayRow,
  settingsMap,
  theme = {},
}) {
  // Friendly guard to avoid empty gaps while data loads
  if (!todayRow || !settingsMap) {
    return (
      <div className="w-full p-4 text-center rounded-xl bg-white/10 text-white">
        Times are loading…
      </div>
    );
  }

  const labels = Object.fromEntries(
    Object.entries(settingsMap)
      .filter(([key]) => key.startsWith("labels."))
      .map(([key, value]) => [key.split(".")[1], value])
  );

  const arabicLabels = Object.fromEntries(
    Object.entries(settingsMap)
      .filter(([key]) => key.startsWith("labels.arabic."))
      .map(([key, value]) => [key.split(".")[2], value])
  );

  const is24Hour = settingsMap["clock.is24Hour"] === "true";

  const fontSizeClass = "text-[clamp(1rem,2vw,2rem)]";

  // 🔽 Theme overrides for slideshow sizing
  const slideshowTheme = {
    name: "slideshow",
    ...theme,
    nameSize: "text-4xl sm:text-5xl md:text-6xl",
    nameSizeArabic: "text-3xl sm:text-4xl md:text-5xl",
    timeRowSize: "text-3xl sm:text-4xl",
    fontEng: "font-rubik",
    fontAra: "font-arabic",
    textColor: "text-white",

    // ✅ FIX: allow message banner to wrap instead of truncate
    messageWrap: true,

    // Optional: limit to 2 clean lines (remove if you want unlimited lines)
    messageMaxLines: 2,
  };

  return (
    <div className={`w-full text-center ${fontSizeClass}`}>
      <MobileCurrentCard
        // no need to pass `now` — the card ticks internally
        todayRow={todayRow}
        yesterdayRow={yesterdayRow}
        settingsMap={settingsMap}
        labels={labels}
        arabicLabels={arabicLabels}
        is24Hour={is24Hour}
        theme={slideshowTheme}
      />
    </div>
  );
}