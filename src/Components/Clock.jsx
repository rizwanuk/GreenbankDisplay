import React, { useEffect, useState } from "react";
import moment from "moment-hijri";

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

  const monospaceStyle = {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  };

  return (
    <div
      className={`
        ${theme.bgColor || "bg-white/10"}
        ${theme.textColor || "text-white"}
        rounded-2xl shadow-md px-4 py-4
        backdrop-blur-md border border-white/10
        text-center w-full
        flex justify-center
      `}
    >
      {/* Clock block (time + AM/PM) */}
      <div className="inline-flex flex-col items-center">
        {/* Time */}
        <span
          className={`${fontFamily} ${fontSize} font-bold leading-none tracking-tight text-right`}
          style={{ ...monospaceStyle, width: is24Hour ? "8ch" : "7ch" }}
        >
          {timeDisplay}
        </span>

        {/* AM/PM — tucked under seconds */}
        {!is24Hour && (
          <span
            className={`${amPmSize} font-bold opacity-80 -mt-3`}
            style={{
              lineHeight: 1,
              transform: "translateX(2.5ch)", // nudges it under the seconds
            }}
          >
            {ampm}
          </span>
        )}
      </div>
    </div>
  );
}
