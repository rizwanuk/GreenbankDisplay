import React, { memo } from "react";
import momentHijri from "moment-hijri";
import useNow from "../hooks/useNow";

function DateCard({ theme = {}, islamicMonths = [], islamicOffset = 0 }) {
  // Tick once per minute so the date flips at midnight without relying on parent renders
  const tick = useNow(60_000);

  // Convert the tick (which is a normal moment) into a hijri-enabled moment instance
  const now = momentHijri(tick.valueOf());

  // Gregorian date
  const englishDate = now.format("dddd D MMMM YYYY");

  // Hijri date
  const hijriMoment = now.clone().add(islamicOffset, "days");
  const hijriDay = hijriMoment.format("iD");
  const hijriMonthIndex = parseInt(hijriMoment.format("iM"), 10) - 1; // 0–11
  const hijriYear = hijriMoment.format("iYYYY");
  const hijriMonth = islamicMonths[hijriMonthIndex] || "Unknown";
  const hijriDate = `${hijriDay} ${hijriMonth} ${hijriYear} AH`;

  return (
    <div
      className={`
        w-full
        ${theme.bgColor || "bg-white/10"}
        ${theme.textColor || "text-white"}
        rounded-xl
        px-4
        py-6
        text-center
        overflow-hidden
        backdrop-blur-md
        border border-white/10
        shadow-md
      `}
    >
      <p
        className={`
          ${theme.fontEng || "font-rubik"} font-semibold
          ${theme.englishDateSize || "text-4xl"}
        `}
      >
        {englishDate}
      </p>
      <p
        className={`
          ${theme.fontAra || "font-cairo"}
          ${theme.islamicDateSize || "text-3xl"}
          opacity-90 mt-1
        `}
      >
        {hijriDate}
      </p>
    </div>
  );
}

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.islamicMonths === n.islamicMonths &&
  p.islamicOffset === n.islamicOffset;

export default memo(DateCard, areEqual);
