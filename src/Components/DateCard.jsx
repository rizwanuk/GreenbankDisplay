import React from "react";
import moment from "moment-hijri";

export default function DateCard({ theme = {}, islamicMonths = [], islamicOffset = 0 }) {
  const now = moment();
  const hijriMoment = moment().add(islamicOffset, "days");

  const englishDate = now.format("dddd D MMMM YYYY");

  const hijriDay = hijriMoment.iDate();
  const hijriMonthIndex = hijriMoment.iMonth();
  const hijriYear = hijriMoment.iYear();
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
      <p className={`
        ${theme.fontEng || "font-rubik"} font-semibold
        ${theme.englishDateSize || "text-4xl"}
      `}>
        {englishDate}
      </p>
      <p className={`
        ${theme.fontAra || "font-cairo"}
        ${theme.islamicDateSize || "text-3xl"}
        opacity-90 mt-1
      `}>
        {hijriDate}
      </p>
    </div>
  );
}
