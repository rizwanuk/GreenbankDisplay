import React from "react";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useSettings from "./hooks/useSettings";
import { parseSettings } from "./utils/parseSettings";
import moment from "moment-hijri";
import "moment/locale/en-gb";

moment.locale("en-gb");

export default function EmbedScreen() {
  const timetable = usePrayerTimes();
  const rawSettings = useSettings();

  if (!timetable || !rawSettings) {
    return <div className="text-white p-4">Loading...</div>;
  }

  const settings = parseSettings(rawSettings);
  const today = moment();
  const hijriOffset = parseInt(settings?.islamicCalendar?.offset || 0);
  const hijriDate = moment().add(hijriOffset, "days").format("iD iMMMM iYYYY");

  const lastUpdated = settings?.meta?.lastUpdated
    ? moment.utc(settings.meta.lastUpdated).local().format("D MMM YYYY, h:mm A")
    : "";

  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const todayTimetable = timetable.find(
    (t) => parseInt(t.Day) === today.date() && parseInt(t.Month) === today.month() + 1
  );

  if (!todayTimetable) {
    return <div className="text-white p-4">Today's prayer times not found.</div>;
  }

  const now = moment();
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const formatTime = (timeStr) =>
    timeStr && timeStr.includes(":") ? moment(timeStr, "HH:mm").format("h:mm") : "--";

  const zawalStart = moment(todayTimetable["Zawal Start"], "HH:mm");
  const zawalEnd = moment(todayTimetable["Zawal End"], "HH:mm");
  const sunriseStart = moment(todayTimetable["Shouruq"], "HH:mm").subtract(5, "minutes");
  const sunriseEnd = moment(todayTimetable["Shouruq"], "HH:mm").add(10, "minutes");

  const isMakroohNow = now.isBetween(zawalStart, zawalEnd) || now.isBetween(sunriseStart, sunriseEnd);
  const isFriday = today.day() === 5;
  const jummahTime = settings.jummah?.time || "13:30";

  const getPrayerStart = (key) => moment(todayTimetable[`${capitalize(key)} Adhan`], "HH:mm");
  const getNextPrayerStart = (idx) => {
    const nextKey = prayers[idx + 1];
    return nextKey
      ? moment(todayTimetable[`${capitalize(nextKey)} Adhan`], "HH:mm")
      : moment("23:59", "HH:mm");
  };

  const activePrayerKey = prayers.find((key, idx) => {
    const start = getPrayerStart(key);
    const end = getNextPrayerStart(idx);
    return now.isSameOrAfter(start) && now.isBefore(end);
  });

  return (
    <div className="min-h-screen bg-black p-4 text-white font-sans flex flex-col items-center gap-6">
      <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow p-2 backdrop-blur">
        <table className="w-full table-fixed text-center text-xl md:text-2xl">
          <thead>
            <tr className="text-base md:text-lg">
              <th className="text-left py-1" colSpan={6}>
                <div className="flex justify-between">
                  <span>{today.format("dddd, D MMMM YYYY")}</span>
                  <span>{hijriDate} AH</span>
                </div>
              </th>
            </tr>
            <tr className="text-xs text-right text-white/60">
              <th className="text-right" colSpan={6}>
                {lastUpdated && <span>Last updated: {lastUpdated}</span>}
              </th>
            </tr>
            <tr className="border-t border-white/20">
              <th className="text-left py-1 w-1/6"></th>
              {prayers.map((key, idx) => {
                const label =
                  key === "dhuhr" && isFriday
                    ? settings.prayers?.jummah?.en || "Jummah"
                    : settings.prayers?.[key]?.en || capitalize(key);

                const isActive =
                  !isMakroohNow &&
                  key === activePrayerKey &&
                  now.isSameOrAfter(getPrayerStart(key)) &&
                  now.isBefore(getNextPrayerStart(idx));

                return (
                  <th
                    key={key}
                    className={`w-1/6 px-1 py-1 font-semibold ${
                      isActive ? "bg-white/20 rounded" : ""
                    }`}
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10">
              <td className="text-left py-1 font-medium">Begins</td>
              {prayers.map((key) => (
                <td key={key + "-adhan"} className="py-1">
                  {formatTime(todayTimetable[`${capitalize(key)} Adhan`])}
                </td>
              ))}
            </tr>
            <tr className="border-t border-white/10">
              <td className="text-left py-1 font-medium">Jama‘ah</td>
              {prayers.map((key) => (
                <td key={key + "-iqamah"} className="py-1">
                  {formatTime(todayTimetable[`${capitalize(key)} Iqamah`])}
                </td>
              ))}
            </tr>
            <tr className="border-t border-white/10 text-sm md:text-base">
              <td className="text-left py-1 font-medium">Info</td>
              {prayers.map((key, idx) => {
                const isActivePrayer = key === activePrayerKey;
                const isFajr = key === "fajr";
                const isZuhr = key === "dhuhr";

                let content = "";

                if (isActivePrayer && isMakroohNow) {
                  content = <span className="text-red-400 italic whitespace-nowrap">Avoid praying now</span>;
                } else if (isFajr) {
                  content = (
                    <span className="text-gray-300 whitespace-nowrap block text-sm">
                      Shouruq: {formatTime(todayTimetable["Shouruq"])}
                    </span>
                  );
                } else if (isZuhr && !isFriday) {
                  content = (
                    <span className="text-gray-300 whitespace-nowrap block text-sm">
                      Jummah: {formatTime(jummahTime)}
                    </span>
                  );
                }

                return (
                  <td key={key + "-info"} className="py-1">
                    {content}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
