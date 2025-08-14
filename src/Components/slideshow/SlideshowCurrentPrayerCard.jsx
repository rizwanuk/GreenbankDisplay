import React from "react";
import SlideshowCurrentPrayerCardInner from "./SlideshowCurrentPrayerCardInner";

export default function SlideshowCurrentPrayerCard({
  now,
  todayRow,
  yesterdayRow,
  settingsMap,
  theme,
}) {
  return (
    <div className={`w-full p-2 rounded-xl shadow ${theme?.bgColor || ""}`}>
      <SlideshowCurrentPrayerCardInner
        now={now}
        todayRow={todayRow}
        yesterdayRow={yesterdayRow}
        settingsMap={settingsMap}
        theme={theme}
      />
    </div>
  );
}
