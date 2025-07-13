import React from "react";
import moment from "moment";

/**
 * Formats a moment object into time with optional small AM/PM.
 *
 * @param {moment.Moment} time - The time to format.
 * @param {boolean} is24Hour - If true, use 24-hour format.
 * @returns {JSX.Element|string} - JSX with small AM/PM or plain string.
 */
export default function formatWithSmallAmPm(time, is24Hour) {
  if (!moment.isMoment(time) || !time.isValid()) return "";

  if (is24Hour) {
    return time.format("HH:mm");
  }

  const [hourMin, ampm] = time.format("h:mm A").split(" ");
  return (
    <>
      {hourMin}
      <sup className="text-base md:text-lg ml-1">{ampm.toLowerCase()}</sup>
    </>
  );
}
