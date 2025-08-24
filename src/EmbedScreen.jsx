import React, { useEffect, useMemo, useState, useRef } from "react";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useSettings from "./hooks/useSettings";
import { parseSettings } from "./utils/parseSettings";
import {
  useHijriDate,
  getJummahTime,
  useMakroohTimes,
  capitalize,
} from "./hooks/usePrayerHelpers";
import { getEnglishLabels, getArabicLabels } from "./utils/labels";
import { PRAYERS } from "./constants/prayers";
import moment from "moment-hijri";
import "moment/locale/en-gb";
import useNow from "./hooks/useNow";
import { getCurrentPrayerState } from "./utils/getCurrentPrayerState";
import applyJummahOverride from "./helpers/applyJummahOverride";

moment.locale("en-gb");

export default function EmbedScreen() {
  const timetable = usePrayerTimes();
  const rawSettings = useSettings();
  const rawNow = useNow(1000); // ⏱️ shared tick

  // Keep the periodic full reload
  useEffect(() => {
    const fullReload = setInterval(() => window.location.reload(), 30 * 60 * 1000);
    return () => clearInterval(fullReload);
  }, []);

  const settings = useMemo(
    () => (rawSettings ? parseSettings(rawSettings) : null),
    [rawSettings]
  );

  // 🔓 Robust fake time override
  const now = useMemo(() => {
    const rawEnabled = settings?.["toggles.fakeTimeEnabled"];
    const enabled =
      (typeof rawEnabled === "string"
        ? rawEnabled.trim().toLowerCase()
        : String(!!rawEnabled)) === "true";
    const rawTime = (settings?.["toggles.fakeTime"] ?? "").toString().trim();
    if (enabled && rawTime) {
      const normalized = rawTime.replace(/[：﹕︓]/g, ":").replace(/[．。]/g, ".");
      const fmtDate = rawNow.format("YYYY-MM-DD");
      const m = moment(
        `${fmtDate} ${normalized}`,
        [
          "YYYY-MM-DD HH:mm",
          "YYYY-MM-DD H:mm",
          "YYYY-MM-DD HH.mm",
          "YYYY-MM-DD H.mm",
        ],
        true
      );
      if (m.isValid()) return m;

      // eslint-disable-next-line no-console
      console.warn(
        "[EmbedScreen] Invalid toggles.fakeTime value:",
        rawTime,
        "(after normalize:",
        normalized,
        ")"
      );
    }
    return rawNow;
  }, [rawNow, settings]);

  const L = useMemo(() => getEnglishLabels(settings), [settings]);
  const A = useMemo(() => getArabicLabels(settings), [settings]);

  // Only prayers that have Iqamah (excludes Shouruq)
  const prayers = useMemo(
    () => PRAYERS.filter((p) => /Iqamah$/i.test(p.iqamahKey)).map((p) => p.key),
    []
  );

  if (!timetable || !rawSettings) return <div className="text-black p-4">Loading...</div>;

  const today = now.clone();

  // ✅ Hijri date string now uses the centralised logic (offset + 30-day normalization)
  const { hijriDateString } = useHijriDate(settings);

  const { label: makroohLabel } = useMakroohTimes(settings, now);

  const todayRow = timetable.find(
    (t) => parseInt(t.Day) === now.date() && parseInt(t.Month) === now.month() + 1
  );
  const yesterday = now.clone().subtract(1, "day");
  const yesterdayRow = timetable.find(
    (t) => parseInt(t.Day) === yesterday.date() && parseInt(t.Month) === yesterday.month() + 1
  );

  // 🔒 Single source of truth — same logic as CurrentPrayerCard
  const current = getCurrentPrayerState({
    now,
    todayRow,
    yesterdayRow,
    settings,
    labels: L,
    arabicLabels: A,
  });

  // ✅ Apply Jum'ah override for the current prayer (based on its own date)
  let displayLabel = current?.label || "";
  let displayArabic = current?.arabic || "";
  let displayJamaah = current?.jamaah || null;

  if (current && current.key && current.start) {
    const currentItem = {
      lookupKey: (current.key || "").toLowerCase(),
      name: current.key,
      start: current.start,
      jamaah: current.jamaah,
    };
    const fixed = applyJummahOverride(currentItem, settings);
    const lk = (fixed.lookupKey || current.key || "").toLowerCase();
    // For normal prayers, prefer sheet labels; for special states current.label/ar may already be a sentence
    displayLabel = L?.[lk] ?? displayLabel;
    displayArabic = A?.[lk] ?? displayArabic;
    displayJamaah = fixed.jamaah || displayJamaah;
  }

  // Build message + style (Arabic appears directly after English label)
  let messageStyle = "";
  let prayerMessage = ""; // used for Makrooh/Nafl
  let structured = null;  // { label, ar, suffix }

  if (current.isMakrooh) {
    prayerMessage = "⚠ Makrooh time — please avoid praying";
    messageStyle = "bg-red-600 text-white";
  } else if (current.inJamaah) {
    structured = {
      label: displayLabel,
      ar: displayArabic || "",
      suffix: "— Jama‘ah in progress",
    };
    messageStyle = "bg-green-600 text-white";
  } else if (current.key === "nafl") {
    // ✅ Prefer dynamic state message (which may already include Arabic)
    // Fallback to "Nafl {Arabic} prayers can be offered"
    const naflAr = (current.arabic || displayArabic || A?.nafl || "").trim();
    const fallback = `${displayLabel || "Nafl"}${naflAr ? ` ${naflAr}` : ""} prayers can be offered`;
    prayerMessage = current.label || fallback;
    messageStyle = "bg-cyan-600 text-white";
  } else if (current.key !== "none" && displayLabel) {
    structured = {
      label: displayLabel,
      ar: displayArabic || "",
      suffix: "— Current",
    };
    messageStyle = "bg-cyan-600 text-white";
  }

  // ✅ Fix lastUpdated: parseSettings now preserves case → meta.lastUpdated
  const lastUpdatedRaw = settings?.meta?.lastUpdated;
  const lastUpdated = lastUpdatedRaw
    ? moment.utc(lastUpdatedRaw).local().format("D MMM YYYY, h:mm A")
    : "";

  const todayTimetable = todayRow;
  if (!todayTimetable) return <div className="text-black p-4">Today's prayer times not found.</div>;

  const isFriday = today.format("dddd") === "Friday";
  const jummahMoment = getJummahTime(settings, today); // ← use today's date, not 'now'

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

  // Table highlight respects makrooh
  const isMakroohNow = current.isMakrooh;
  const activePrayerKey = prayers.find((key, idx) => {
    const start = getPrayerStart(key);
    const end = getPrayerEnd(key, idx);
    return !isMakroohNow && now.isSameOrAfter(start) && now.isBefore(end);
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
                    ? L.jummah || "Jum‘ah"
                    : L[key] || capitalize(key);

                const arLabel =
                  key === "dhuhr" && isFriday
                    ? A.jummah || ""
                    : A[key] || "";

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

        {/* Current prayer message row (Arabic directly after English label) */}
        {(structured || prayerMessage) && (
          <div className={`mt-1 font-semibold text-center rounded p-1 ${messageStyle}`}>
            <div className="inline-flex items-baseline justify-center gap-2 whitespace-nowrap">
              {structured ? (
                <>
                  <span>{structured.label}</span>
                  {structured.ar && (
                    <span className="text-base sm:text-lg md:text-xl font-normal">
                      {structured.ar}
                    </span>
                  )}
                  <span>{structured.suffix}</span>
                </>
              ) : (
                <span>{prayerMessage}</span>
              )}
            </div>
          </div>
        )}

        {/* Info row */}
        <div className="pt-1 text-xs sm:text-sm text-black/90 px-2">
          {!prayerMessage && current.isMakrooh ? (
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
