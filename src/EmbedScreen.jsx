import React, { useState, useEffect } from "react";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useSettings from "./hooks/useSettings";
import { parseSettings } from "./utils/parseSettings";
import {
  useHijriDate,
  getTime,
  getJummahTime,
  useMakroohTimes,
} from "./hooks/usePrayerHelpers";
import { getCurrentPrayerMessage } from "./utils/getCurrentPrayerMessage";
import moment from "moment-hijri";
import "moment/locale/en-gb";

moment.locale("en-gb");

export default function EmbedScreen() {
  const timetable = usePrayerTimes();
  const rawSettings = useSettings();
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") setNow(moment());
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const fullReload = setInterval(() => window.location.reload(), 30 * 60 * 1000);
    return () => clearInterval(fullReload);
  }, []);

  if (!timetable || !rawSettings) return <div className="text-black p-4">Loading...</div>;

  const settings = parseSettings(rawSettings);
  const timings = settings?.timings || {};
  const today = moment();

  const { hijriDateString } = useHijriDate(settings);
  const { isMakroohNow, label: makroohLabel } = useMakroohTimes(settings, now);

  const todayRow = timetable.find(
    (t) => parseInt(t.Day) === now.date() && parseInt(t.Month) === now.month() + 1
  );
  const yesterday = now.clone().subtract(1, "day");
  const yesterdayRow = timetable.find(
    (t) => parseInt(t.Day) === yesterday.date() && parseInt(t.Month) === yesterday.month() + 1
  );

  const { message: prayerMessage, style: messageStyle, ar } = getCurrentPrayerMessage({
    now,
    todayRow,
    yesterdayRow,
    settings,
  });

  const lastUpdatedRaw = settings?.meta?.lastupdated;
  const lastUpdated = lastUpdatedRaw
    ? moment.utc(lastUpdatedRaw).local().format("D MMM YYYY, h:mm A")
    : "";

  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const todayTimetable = todayRow;

  if (!todayTimetable) return <div className="text-black p-4">Today's prayer times not found.</div>;

  const isFriday = today.format("dddd") === "Friday";
  const jummahMoment = getJummahTime(settings, now);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
  const formatTime = (timeStr) =>
    timeStr && timeStr.includes(":") ? moment(timeStr, "HH:mm").format("h:mm") : "--";

  const getPrayerStart = (key) => {
    const timeStr = todayTimetable[`${capitalize(key)} Adhan`];
    return moment(`${today.format("YYYY-MM-DD")} ${timeStr}`, "YYYY-MM-DD HH:mm");
  };

  const getPrayerEnd = (key, idx) => {
    if (key === "fajr") {
      const shouruqStr = todayTimetable["Shouruq"];
      return moment(`${today.format("YYYY-MM-DD")} ${shouruqStr}`, "YYYY-MM-DD HH:mm");
    }

  const nextKey = prayers[idx + 1];
    if (nextKey) {
      const nextStr = todayTimetable[`${capitalize(nextKey)} Adhan`];
      return moment(`${today.format("YYYY-MM-DD")} ${nextStr}`, "YYYY-MM-DD HH:mm");
    }
    return moment(today).endOf("day");
  };

  const activePrayerKey = prayers.find((key, idx) => {
    const start = getPrayerStart(key);
    const end = getPrayerEnd(key, idx);
    return now.isSameOrAfter(start) && now.isBefore(end);
  });

  return (
    <div className="bg-white text-black font-sans flex flex-col items-center">
      <div className="w-full max-w-xl bg-gray-100 text-black rounded-xl shadow p-2">
        <table className="w-full table-fixed text-center text-sm sm:text-base">
          <thead>
            <tr className="text-xs sm:text-sm">
              <th className="text-left py-1" colSpan={6}>
                <div className="flex justify-between flex-wrap gap-1">
                  <span className="truncate font-poppins">
                    {today.format("dddd, D MMMM YYYY")}
                  </span>
                  <span className="truncate font-poppins">{hijriDateString} AH</span>
                </div>
              </th>
            </tr>
            <tr className="text-[0.6rem] text-right text-black/60">
              <th className="text-right py-1" colSpan={6}>
                {lastUpdated && <span>Last updated: {lastUpdated}</span>}
              </th>
            </tr>
            <tr className="border-t border-black/20">
              <th className="text-left py-1 w-1/6"></th>
              {prayers.map((key) => {
                const enLabel =
                  key === "dhuhr" && isFriday
                    ? settings.labels?.jummah || "Jum‘ah"
                    : settings.labels?.[key] || capitalize(key);

                const arLabel =
                  key === "dhuhr" && isFriday
                    ? settings.arabic?.jummah || ""
                    : settings.arabic?.[key] || "";

                const isActive = !isMakroohNow && key === activePrayerKey;
                return (
                  <th
                    key={key}
                    className={`w-1/6 px-1 py-1 font-semibold leading-tight ${
                      isActive ? "bg-green-200 text-black font-bold rounded" : ""
                    }`}
                  >
                    <div className="text-sm sm:text-base">{enLabel}</div>
                    <div className="text-[0.7rem] sm:text-sm font-normal">{arLabel}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-black/10">
              <td className="text-left py-1 font-medium text-sm sm:text-base">Begins</td>
              {prayers.map((key) => {
                const isActive = !isMakroohNow && key === activePrayerKey;
                return (
                  <td
                    key={key + "-adhan"}
                    className={`py-1 text-sm sm:text-base ${
                      isActive ? "bg-green-200 text-black font-semibold rounded" : ""
                    }`}
                  >
                    {formatTime(todayTimetable[`${capitalize(key)} Adhan`])}
                  </td>
                );
              })}
            </tr>
            <tr className="border-t border-black/10">
              <td className="text-left py-1 font-medium text-sm sm:text-base">Jama‘ah</td>
              {prayers.map((key) => {
                const isActive = !isMakroohNow && key === activePrayerKey;
                const jamaahTime =
                  key === "dhuhr" && isFriday
                    ? formatTime(jummahMoment?.format("HH:mm"))
                    : formatTime(todayTimetable[`${capitalize(key)} Iqamah`]);
                return (
                  <td
                    key={key + "-iqamah"}
                    className={`py-1 text-sm sm:text-base ${
                      isActive ? "bg-green-200 text-black font-semibold rounded" : ""
                    }`}
                  >
                    {jamaahTime}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {/* Current prayer message row */}
        {prayerMessage && (
          <div className={`mt-1 font-semibold text-center rounded p-1 ${messageStyle}`}>
            <div>{prayerMessage}</div>
            {ar && <div className="text-base sm:text-lg md:text-xl font-normal mt-0.5">{ar}</div>}
          </div>
        )}

        {/* Info row */}
        <div className="pt-1 text-xs sm:text-sm text-black/90 px-2">
          {!prayerMessage && isMakroohNow ? (
            <div className="bg-red-600 text-white font-semibold text-center rounded p-1">
              Avoid praying now ({makroohLabel})
            </div>
          ) : (
            <div className="flex justify-center flex-wrap gap-2 whitespace-nowrap text-center">
              <span>Shouruq (Sunrise): {formatTime(todayTimetable["Shouruq"])}</span>
              <span>Jum‘ah: {formatTime(jummahMoment?.format("HH:mm"))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
