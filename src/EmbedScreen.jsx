import React, { useState, useEffect } from "react";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useSettings from "./hooks/useSettings";
import { parseSettings } from "./utils/parseSettings";
import moment from "moment-hijri";
import "moment/locale/en-gb";

moment.locale("en-gb");

export default function EmbedScreen() {
  const timetable = usePrayerTimes();
  const rawSettings = useSettings();
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000); // update every 1s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setNow(moment()); // reset time when returning to tab
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const fullReload = setInterval(() => {
      window.location.reload();
    }, 30 * 60 * 1000); // reload every 30 minutes
    return () => clearInterval(fullReload);
  }, []);

  if (!timetable || !rawSettings) {
    return <div className="text-black p-4">Loading...</div>;
  }

  const settings = parseSettings(rawSettings);
  const timings = settings?.timings || {};

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

  if (timetable && !todayTimetable) {
    return <div className="text-black p-4">Today's prayer times not found.</div>;
  }

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const formatTime = (timeStr) =>
    timeStr && timeStr.includes(":") ? moment(timeStr, "HH:mm").format("h:mm") : "--";

  // Sunrise Makrooh
  const sunrise = moment(`${today.format("YYYY-MM-DD")} ${todayTimetable["Shouruq"]}`, "YYYY-MM-DD HH:mm");
  const sunriseStart = sunrise.clone().subtract(timings.makroohBeforeSunrise || 0, "minutes");
  const sunriseEnd = sunrise.clone().add(timings.makroohAfterSunrise || 0, "minutes");

  // Zawal (before Dhuhr)
  const zuhrAdhan = todayTimetable["Dhuhr Adhan"];
  const zawalStart =
    zuhrAdhan && timings.makroohBeforeZuhr !== undefined
      ? moment(`${today.format("YYYY-MM-DD")} ${zuhrAdhan}`, "YYYY-MM-DD HH:mm").subtract(timings.makroohBeforeZuhr, "minutes")
      : null;
  const zawalEnd = zuhrAdhan
    ? moment(`${today.format("YYYY-MM-DD")} ${zuhrAdhan}`, "YYYY-MM-DD HH:mm")
    : null;

  // Before Maghrib
  const maghrib = moment(`${today.format("YYYY-MM-DD")} ${todayTimetable["Maghrib Adhan"]}`, "YYYY-MM-DD HH:mm");
  const maghribMakroohStart = maghrib.clone().subtract(timings.makroohBeforeMaghrib || 0, "minutes");
  const maghribMakroohEnd = maghrib;

  const isMakroohNow =
    (zawalStart && zawalEnd && now.isBetween(zawalStart, zawalEnd)) ||
    now.isBetween(sunriseStart, sunriseEnd) ||
    now.isBetween(maghribMakroohStart, maghribMakroohEnd);

  let makroohLabel = "";
  if (zawalStart && zawalEnd && now.isBetween(zawalStart, zawalEnd)) makroohLabel = "Zawal (before Dhuhr)";
  else if (now.isBetween(sunriseStart, sunriseEnd)) makroohLabel = "Sunrise";
  else if (now.isBetween(maghribMakroohStart, maghribMakroohEnd)) makroohLabel = "Before Maghrib";

  const isFriday = today.day() === 5;
  const jummahTime = settings.jummah?.time || "13:30";

  const getPrayerStart = (key) => {
    const timeStr = todayTimetable[`${capitalize(key)} Adhan`];
    return moment(`${today.format("YYYY-MM-DD")} ${timeStr}`, "YYYY-MM-DD HH:mm");
  };

  const getPrayerEnd = (key, idx) => {
    if (key === "fajr") {
      return sunrise;
    }
    const nextKey = prayers[idx + 1];
    if (nextKey) {
      const nextStr = todayTimetable[`${capitalize(nextKey)} Adhan`];
      return moment(`${today.format("YYYY-MM-DD")} ${nextStr}`, "YYYY-MM-DD HH:mm");
    } else {
      return moment(today).endOf("day");
    }
  };

  let activePrayerKey = null;
  if (now.isSame(today, "day")) {
    activePrayerKey = prayers.find((key, idx) => {
      const start = getPrayerStart(key);
      const end = getPrayerEnd(key, idx);
      return now.isSameOrAfter(start) && now.isBefore(end);
    });
  }

  return (
    <div className="bg-white text-black font-sans flex flex-col items-center">
      <div className="w-full max-w-xl bg-gray-100 text-black rounded-xl shadow p-2">
        <table className="w-full table-fixed text-center text-[0.8rem] sm:text-sm md:text-base lg:text-lg xl:text-xl">
          <thead>
            <tr className="text-xs sm:text-sm">
              <th className="text-left py-1" colSpan={6}>
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="truncate">{today.format("dddd, D MMMM YYYY")}</span>
                  <span className="truncate">{hijriDate} AH</span>
                </div>
              </th>
            </tr>
            <tr className="text-[0.6rem] text-right text-black/60">
              <th className="text-right" colSpan={6}>
                {lastUpdated && <span>Last updated: {lastUpdated}</span>}
              </th>
            </tr>
            <tr className="border-t border-black/20">
              <th className="text-left py-1 w-1/6"></th>
              {prayers.map((key) => {
                const label =
                  key === "dhuhr" && isFriday
                    ? settings.prayers?.jummah?.en || "Jummah"
                    : settings.prayers?.[key]?.en || capitalize(key);
                const isActive = !isMakroohNow && key === activePrayerKey;
                return (
                  <th
                    key={key}
                    className={`w-1/6 px-1 py-1 font-semibold whitespace-nowrap ${
                      isActive ? "bg-green-200 text-black font-bold rounded" : ""
                    }`}
                  >
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-black/10">
              <td className="text-left py-1 font-medium whitespace-nowrap">Begins</td>
              {prayers.map((key) => {
                const isActive = !isMakroohNow && key === activePrayerKey;
                return (
                  <td
                    key={key + "-adhan"}
                    className={`py-1 ${isActive ? "bg-green-200 text-black font-semibold rounded" : ""}`}
                  >
                    {formatTime(todayTimetable[`${capitalize(key)} Adhan`])}
                  </td>
                );
              })}
            </tr>
            <tr className="border-t border-black/10">
              <td className="text-left py-1 font-medium whitespace-nowrap">Jama‘ah</td>
              {prayers.map((key) => {
                const isActive = !isMakroohNow && key === activePrayerKey;
                return (
                  <td
                    key={key + "-iqamah"}
                    className={`py-1 ${isActive ? "bg-green-200 text-black font-semibold rounded" : ""}`}
                  >
                    {formatTime(todayTimetable[`${capitalize(key)} Iqamah`])}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="pt-2 text-sm sm:text-base text-black/90 text-left px-2">
          {isMakroohNow ? (
            <div className="bg-red-600 text-white font-semibold text-center rounded p-2">
              Avoid praying now ({makroohLabel})
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 whitespace-nowrap">
              <span>Shouruq: {formatTime(todayTimetable["Shouruq"])}</span>
              <span>Jummah: {formatTime(jummahTime)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
