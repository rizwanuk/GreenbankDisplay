import React from "react";
import UpcomingPrayerRowsSlideshowWrapper from "./UpcomingPrayerRowsSlideshowWrapper";

export default function SlideshowUpcomingPrayerRowsInner({
  timetable,
  now,
  todayRow,
  yesterdayRow,
  tomorrowRow,
  settingsMap,
  labels,
  is24Hour,
}) {
  return (
    <div
      className="w-full text-center break-words whitespace-normal leading-snug"
      style={{
        fontSize: "clamp(0.6rem, 1.3vw, 1rem)",
        lineHeight: 1.3,
        wordBreak: "break-word",
      }}
    >
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
  );
}
