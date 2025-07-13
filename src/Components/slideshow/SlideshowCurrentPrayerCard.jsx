import React from "react";
import SlideshowCurrentPrayerCardInner from "./SlideshowCurrentPrayerCardInner";

export default function SlideshowCurrentPrayerCard({
  now,
  todayRow,
  yesterdayRow,
  settingsMap,
  theme,
}) {
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

  return (
    <div className={`w-full p-2 rounded-xl shadow ${theme.bgColor || ""}`}>
      <SlideshowCurrentPrayerCardInner
        now={now}
        todayRow={todayRow}
        yesterdayRow={yesterdayRow}
        settingsMap={settingsMap}
        theme={theme}
        labels={labels}
        arabicLabels={arabicLabels}
      />
    </div>
  );
}
