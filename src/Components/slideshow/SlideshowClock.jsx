import React from "react";
import SlideshowClockInner from "./SlideshowClockInner";

export default function SlideshowClock({ now, theme, settingsMap }) {
  return (
    <div className={`w-full p-2 rounded-xl shadow ${theme.bgColor || ""}`}>
      <SlideshowClockInner now={now} theme={theme} settingsMap={settingsMap} />
    </div>
  );
}
