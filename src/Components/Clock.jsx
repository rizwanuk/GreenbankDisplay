import React, { useEffect, useState } from "react";
import moment from "moment";

export default function Clock({ settings = {}, theme = {} }) {
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(interval);
  }, []);

  const is24Hour = settings.clock24Hours === "TRUE";
  const hour = now.format(is24Hour ? "HH" : "h");
  const rest = now.format("mm:ss");
  const timeDisplay = `${hour}:${rest}`;

  const ampm = !is24Hour
    ? settings.ampmLowercase === "TRUE"
      ? now.format("A").toLowerCase()
      : now.format("A")
    : "";

  const fontFamily = theme.fontEng || "font-mono";
  const fontSize = theme.fontSize || "text-[180px]";
  const amPmSize = theme.amPmSize || "text-4xl";

  return (
    <div
      className={`
        ${theme.bgColor || "bg-white/10"}
        ${theme.textColor || "text-white"}
        rounded-2xl shadow-md px-4 py-4
        backdrop-blur-md border border-white/10
        text-center w-full
      `}
    >
      <div className="flex justify-center items-baseline whitespace-nowrap overflow-hidden w-full">
        <span
          className={`${fontFamily} ${fontSize} font-bold leading-none tracking-tight`}
        >
          {timeDisplay}
        </span>
        {!is24Hour && (
          <span
            className={`${amPmSize} ml-2 font-bold opacity-80`}
            style={{ lineHeight: 1 }}
          >
            {ampm}
          </span>
        )}
      </div>
    </div>
  );
}
