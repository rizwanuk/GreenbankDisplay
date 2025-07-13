import React from "react";
import UpcomingPrayerRowsSlideshowWrapper from "./UpcomingPrayerRowsSlideshowWrapper";

export default function SlideshowUpcomingPrayerRows({
  timetable,
  now,
  todayRow,
  yesterdayRow,
  tomorrowRow,
  settingsMap,
  labels,
  is24Hour,
  theme,
}) {
  return (
    <div
      className={`w-full p-2 rounded-xl shadow ${theme.bgColor || ""} ${theme.textColor || ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div className="w-full h-full">
        <UpcomingPrayerRowsSlideshowWrapper
          timetable={timetable}
          now={now}
          todayRow={todayRow}
          yesterdayRow={yesterdayRow}
          tomorrowRow={tomorrowRow}
          settingsMap={settingsMap}
          labels={labels}
          is24Hour={is24Hour}
        />
      </div>
    </div>
  );
}
