import React from "react";
import moment from "moment-hijri";

export default function SlideshowDateCard({ now, theme = {}, settingsMap }) {
  const offset = parseInt(settingsMap["islamicCalendar.offset"] || "0", 10);
  const hijriMoment = moment(now).add(offset, "days");

  const hijriMonthKeys = [
    "muharram", "safar", "rabiAwal", "rabiThani",
    "jumadaAwal", "jumadaThani", "rajab", "shaban",
    "ramadan", "shawwal", "dhulQadah", "dhulHijjah"
  ];

  const hijriMonthIndex = hijriMoment.iMonth();
  const englishMonth = settingsMap[`labels.${hijriMonthKeys[hijriMonthIndex]}`] || "Unknown";

  const hijriDay = hijriMoment.iDate();
  const hijriYear = hijriMoment.iYear();

  const englishDate = moment(now).format("dddd D MMMM YYYY");
  const hijriDate = `${hijriDay} ${englishMonth} ${hijriYear} AH`;

  return (
    <div className={`w-full p-4 rounded-xl shadow backdrop-blur ${theme.bgColor || "bg-white/10"} ${theme.textColor || "text-white"}`}>
      <p className={`text-center font-semibold ${theme.fontSize || "text-xl"}`}>
        {englishDate}
      </p>
      <p className={`text-center mt-1 ${theme.fontSize || "text-lg"}`}>
        {hijriDate}
      </p>
    </div>
  );
}
