// src/Embed2Screen.jsx
import React, { useEffect, useMemo, useRef } from "react";
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

// ✅ Localhost settings URL helper (localhost -> OpenSheet, prod -> /api/settings)
import { getSettingsUrl } from "./utils/getSettingsUrl";

moment.locale("en-gb");

/* ---------------- helpers ---------------- */

function extractLastUpdatedFromSettingsRows(rows) {
  if (!rows) return "";

  // Shape: [{Group, Key, Value}]
  if (Array.isArray(rows) && rows.length && !Array.isArray(rows[0])) {
    for (const r of rows) {
      const g = String(r?.Group || "").trim();
      const k = String(r?.Key || "").trim();
      const v = String(r?.Value ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
    return "";
  }

  // Shape: [["Group","Key","Value"], ["meta","lastUpdated","..."]]
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    for (const r of rows.slice(1)) {
      const g = String(r?.[0] || "").trim();
      const k = String(r?.[1] || "").trim();
      const v = String(r?.[2] ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
  }

  return "";
}

export default function Embed2Screen() {
  const timetable = usePrayerTimes(); // array
  const rawSettings = useSettings(); // array
  const rawNow = useNow(1000);

  // ✅ This is the key: measure ONLY this wrapper, not the whole document
  const contentRef = useRef(null);

  // Keep the periodic full reload
  useEffect(() => {
    const fullReload = setInterval(() => window.location.reload(), 30 * 60 * 1000);
    return () => clearInterval(fullReload);
  }, []);

  // ✅ Auto-reload when Google Sheet settings change (meta.lastUpdated)
  // Poll a PUBLIC endpoint so it works even if useSettings() isn't refetching.
  const prevLastUpdated = useRef("");
  const hardReloadRef = useRef(Date.now());

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        // ✅ IMPORTANT: this must be a PUBLIC endpoint (no admin token)
const r = await fetch(getSettingsUrl(), { cache: "no-store" });
const j = await r.json();

// ✅ OpenSheet returns an array; Vercel /api/settings returns { rows: [...] }
const rows = Array.isArray(j)
  ? j
  : (j.rows || j.values || j.settings || []);

const next = extractLastUpdatedFromSettingsRows(rows);


        if (!prevLastUpdated.current) {
          prevLastUpdated.current = next || "";
          return;
        }

        if (next && prevLastUpdated.current !== next) {
          // eslint-disable-next-line no-console
          console.log("🔄 Detected change in Google Sheet. Reloading page...");
          window.location.reload();
          return;
        }

        // safety net (in addition to your existing 30-min interval)
        if (Date.now() - hardReloadRef.current > 30 * 60 * 1000) {
          hardReloadRef.current = Date.now();
          window.location.reload();
        }
      } catch {
        // ignore transient failures
      }
    };

    poll();
    const id = setInterval(() => {
      if (!stopped) poll();
    }, 60 * 1000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // ✅ Auto-resize in an iframe (WordPress) based on content wrapper height
  useEffect(() => {
    const postHeight = () => {
      const el = contentRef.current;
      if (!el) return;

      // getBoundingClientRect() avoids the 100vh/min-h-screen inflation
      const rect = el.getBoundingClientRect();
      const height = Math.ceil(rect.height) + 2; // tiny buffer

      window.parent?.postMessage({ type: "GBM_EMBED2_HEIGHT", height }, "*");
    };

    // Post immediately and after layout settles
    postHeight();
    const t1 = setTimeout(postHeight, 80);
    const t2 = setTimeout(postHeight, 250);

    // Observe changes (fonts, responsive shifts, etc.)
    const ro = new ResizeObserver(() => postHeight());
    if (contentRef.current) ro.observe(contentRef.current);

    window.addEventListener("resize", postHeight);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, []);

  const settings = useMemo(
    () => (rawSettings?.length ? parseSettings(rawSettings) : null),
    [rawSettings]
  );

  // Same robust fake time override used in EmbedScreen
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
        ["YYYY-MM-DD HH:mm", "YYYY-MM-DD H:mm", "YYYY-MM-DD HH.mm", "YYYY-MM-DD H.mm"],
        true
      );
      if (m.isValid()) return m;
      // eslint-disable-next-line no-console
      console.warn("[Embed2Screen] Invalid toggles.fakeTime:", rawTime, "→", normalized);
    }
    return rawNow;
  }, [rawNow, settings]);

  const L = useMemo(() => getEnglishLabels(settings), [settings]);
  const A = useMemo(() => getArabicLabels(settings), [settings]);

  const prayers = useMemo(
    () => PRAYERS.filter((p) => /Iqamah$/i.test(p.iqamahKey)).map((p) => p.key),
    []
  );

  if (!timetable?.length || !rawSettings?.length || !settings) {
    return <div className="text-black p-4">Loading...</div>;
  }

  const today = now.clone();
  const tomorrow = now.clone().add(1, "day");

  const { hijriDateString } = useHijriDate(settings);

  const getHijriDateStringFor = (baseDate) => {
    const offset = parseInt(settings?.islamicCalendar?.offset || 0, 10);
    const normalizeTo30 =
      String(settings?.islamicCalendar?.normalizeTo30DayMonths ?? "FALSE").toUpperCase() ===
      "TRUE";

    let m = moment(baseDate.format("YYYY-MM-DD"), "YYYY-MM-DD").add(offset, "days");

    const isDayOne = m.format("iD") === "1";
    let forcedDay = null;

    if (normalizeTo30 && isDayOne) {
      m = m.clone().subtract(1, "day");
      forcedDay = "30";
    }

    const hijriDay = forcedDay ?? m.format("iD");
    const hijriMonthIndex = parseInt(m.format("iM"), 10);
    const hijriYear = m.format("iYYYY");

    const hijriMonthKey = [
      "muharram",
      "safar",
      "rabiAwal",
      "rabiThani",
      "jumadaAwal",
      "jumadaThani",
      "rajab",
      "shaban",
      "ramadan",
      "shawwal",
      "dhulQadah",
      "dhulHijjah",
    ][hijriMonthIndex - 1];

    const customMonthName = settings?.labels?.[hijriMonthKey] || m.format("iMMMM");
    return `${hijriDay} ${customMonthName} ${hijriYear}`;
  };

  const hijriTomorrow = getHijriDateStringFor(tomorrow);

  const { label: makroohLabel } = useMakroohTimes(settings, now);

  const todayRow = timetable.find(
    (t) => parseInt(t.Day) === today.date() && parseInt(t.Month) === today.month() + 1
  );

  const yesterday = today.clone().subtract(1, "day");
  const yesterdayRow = timetable.find(
    (t) => parseInt(t.Day) === yesterday.date() && parseInt(t.Month) === yesterday.month() + 1
  );

  const tomorrowRow = timetable.find(
    (t) => parseInt(t.Day) === tomorrow.date() && parseInt(t.Month) === tomorrow.month() + 1
  );

  if (!todayRow) return <div className="text-black p-4">Today's prayer times not found.</div>;
  if (!tomorrowRow) return <div className="text-black p-4">Tomorrow's prayer times not found.</div>;

  const current = getCurrentPrayerState({
    now,
    todayRow,
    yesterdayRow,
    settings,
    labels: L,
    arabicLabels: A,
  });

  let displayLabel = current?.label || "";
  let displayArabic = current?.arabic || "";

  if (current && current.key && current.start) {
    const currentItem = {
      lookupKey: (current.key || "").toLowerCase(),
      name: current.key,
      start: current.start,
      jamaah: current.jamaah,
    };
    const fixed = applyJummahOverride(currentItem, settings);
    const lk = (fixed.lookupKey || current.key || "").toLowerCase();
    displayLabel = L?.[lk] ?? displayLabel;
    displayArabic = A?.[lk] ?? displayArabic;
  }

  let messageStyle = "";
  let prayerMessage = "";
  let structured = null;

  if (current.isMakrooh) {
    prayerMessage = "⚠ Makrooh time — please avoid praying";
    messageStyle = "bg-red-600 text-white";
  } else if (current.inJamaah) {
    structured = {
      label: displayLabel,
      ar: (displayArabic || "").trim(),
      suffix: "— Jama‘ah in progress",
    };
    messageStyle = "bg-green-600 text-white";
  } else if (current.key === "nafl") {
    const naflAr = (current.arabic || displayArabic || A?.nafl || "").trim();
    const fallback = `${displayLabel || "Nafl"}${naflAr ? ` ${naflAr}` : ""} prayers can be offered`;
    prayerMessage = current.label || fallback;
    messageStyle = "bg-cyan-600 text-white";
  } else if (current.key !== "none" && displayLabel) {
    structured = {
      label: displayLabel,
      ar: (displayArabic || "").trim(),
      suffix: "— Current",
    };
    messageStyle = "bg-cyan-600 text-white";
  }

  const lastUpdatedRaw = settings?.meta?.lastUpdated;
  const lastUpdated = lastUpdatedRaw
    ? moment.utc(lastUpdatedRaw).local().format("D MMM YYYY, h:mm A")
    : "";

  const formatTime = (timeStr) =>
    timeStr && String(timeStr).includes(":") ? moment(timeStr, "HH:mm").format("h:mm") : "--";

  const isMakroohNow = current.isMakrooh;

  const getPrayerStart = (row, date, key) => {
    const timeStr = row[`${capitalize(key)} Adhan`];
    return moment(`${date.format("YYYY-MM-DD")} ${timeStr}`, "YYYY-MM-DD HH:mm");
  };

  const getPrayerEnd = (row, date, key, idx) => {
    if (key === "fajr") {
      const shouruqStr = row["Shouruq"];
      return moment(`${date.format("YYYY-MM-DD")} ${shouruqStr}`, "YYYY-MM-DD HH:mm");
    }
    const nextKey = prayers[idx + 1];
    if (nextKey) {
      const nextStr = row[`${capitalize(nextKey)} Adhan`];
      return moment(`${date.format("YYYY-MM-DD")} ${nextStr}`, "YYYY-MM-DD HH:mm");
    }
    return moment(date).endOf("day");
  };

  const activePrayerKeyToday = prayers.find((key, idx) => {
    const start = getPrayerStart(todayRow, today, key);
    const end = getPrayerEnd(todayRow, today, key, idx);
    return !isMakroohNow && now.isSameOrAfter(start) && now.isBefore(end);
  });

  const isFridayToday = today.format("dddd") === "Friday";
  const isFridayTomorrow = tomorrow.format("dddd") === "Friday";

  const jummahMomentToday = getJummahTime(settings, today);
  const jummahMomentTomorrow = getJummahTime(settings, tomorrow);

  // Mobile-friendly sizing classes
  const thPad = "px-0.5 sm:px-1";
  const thEn = "text-[0.7rem] sm:text-sm md:text-base leading-tight";
  const thAr = "text-[0.6rem] sm:text-xs md:text-sm font-normal leading-tight";
  const rowLabel = "text-[0.7rem] sm:text-sm md:text-base whitespace-nowrap";
  const cellText = "text-[0.7rem] sm:text-sm md:text-base whitespace-nowrap";

  return (
    <div className="bg-white text-black font-sans flex flex-col items-center">
      {/* ✅ ref wrapper is what we measure */}
      <div ref={contentRef} className="w-full max-w-xl px-2 pt-2 pb-0 space-y-2">
        {/* ======================= TODAY ======================= */}
        <div className="px-1 text-xs sm:text-sm font-semibold tracking-wide text-black/70 uppercase">
          Today’s times
        </div>

        <div className="bg-gray-100 text-black rounded-xl shadow p-2">
          <table className="w-full table-fixed text-center">
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
                    key === "dhuhr" && isFridayToday
                      ? L.jummah || "Jum‘ah"
                      : L[key] || capitalize(key);
                  const arLabel =
                    key === "dhuhr" && isFridayToday ? A.jummah || "" : A[key] || "";
                  const isActive = !isMakroohNow && key === activePrayerKeyToday;

                  return (
                    <th
                      key={key}
                      className={`w-1/6 ${thPad} py-1 font-semibold leading-tight ${
                        isActive ? "bg-green-200 text-black font-bold rounded" : ""
                      }`}
                    >
                      <div className={thEn}>{enLabel}</div>
                      <div className={thAr}>{arLabel}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-black/10">
                <td className={`text-left py-1 font-medium ${rowLabel}`}>Begins</td>
                {prayers.map((key) => {
                  const isActive = !isMakroohNow && key === activePrayerKeyToday;
                  return (
                    <td
                      key={key + "-adhan"}
                      className={`py-1 ${cellText} ${
                        isActive ? "bg-green-200 text-black font-semibold rounded" : ""
                      }`}
                    >
                      {formatTime(todayRow[`${capitalize(key)} Adhan`])}
                    </td>
                  );
                })}
              </tr>

              <tr className="border-t border-black/10">
                <td className={`text-left py-1 font-medium ${rowLabel}`}>Jama‘ah</td>
                {prayers.map((key) => {
                  const isActive = !isMakroohNow && key === activePrayerKeyToday;
                  const jamaahTime =
                    key === "dhuhr" && isFridayToday
                      ? formatTime(jummahMomentToday?.format("HH:mm"))
                      : formatTime(todayRow[`${capitalize(key)} Iqamah`]);

                  return (
                    <td
                      key={key + "-iqamah"}
                      className={`py-1 ${cellText} ${
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

          <div className="pt-1 text-xs sm:text-sm text-black/90 px-2">
            {current.isMakrooh ? (
              <div className="bg-red-600 text-white font-semibold text-center rounded p-1">
                Avoid praying now ({makroohLabel})
              </div>
            ) : (
              <div className="flex justify-center flex-wrap gap-2 whitespace-nowrap text-center">
                <span>Shouruq (Sunrise): {formatTime(todayRow["Shouruq"])}</span>
                <span>Jum‘ah: {formatTime(jummahMomentToday?.format("HH:mm"))}</span>
              </div>
            )}
          </div>
        </div>

        {/* ======================= TOMORROW ======================= */}
        <div className="px-1 text-xs sm:text-sm font-semibold tracking-wide text-black/70 uppercase">
          Tomorrow’s times
        </div>

        <div className="bg-gray-100 text-black rounded-xl shadow p-2 pb-1">
          <table className="w-full table-fixed text-center">
            <thead>
              <tr className="text-xs sm:text-sm">
                <th className="text-left py-1" colSpan={6}>
                  <div className="flex justify-between flex-wrap gap-1">
                    <span className="truncate font-poppins">
                      {tomorrow.format("dddd, D MMMM YYYY")}
                    </span>
                    <span className="truncate font-poppins">{hijriTomorrow} AH</span>
                  </div>
                </th>
              </tr>

              <tr className="border-t border-black/20">
                <th className="text-left py-1 w-1/6"></th>
                {prayers.map((key) => {
                  const enLabel =
                    key === "dhuhr" && isFridayTomorrow
                      ? L.jummah || "Jum‘ah"
                      : L[key] || capitalize(key);
                  const arLabel =
                    key === "dhuhr" && isFridayTomorrow ? A.jummah || "" : A[key] || "";

                  return (
                    <th key={key} className={`w-1/6 ${thPad} py-1 font-semibold leading-tight`}>
                      <div className={thEn}>{enLabel}</div>
                      <div className={thAr}>{arLabel}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              <tr className="border-t border-black/10">
                <td className={`text-left py-1 font-medium ${rowLabel}`}>Begins</td>
                {prayers.map((key) => (
                  <td key={key + "-adhan-tom"} className={`py-1 ${cellText}`}>
                    {formatTime(tomorrowRow[`${capitalize(key)} Adhan`])}
                  </td>
                ))}
              </tr>

              <tr className="border-t border-black/10">
                <td className={`text-left py-1 font-medium ${rowLabel}`}>Jama‘ah</td>
                {prayers.map((key) => {
                  const jamaahTime =
                    key === "dhuhr" && isFridayTomorrow
                      ? formatTime(jummahMomentTomorrow?.format("HH:mm"))
                      : formatTime(tomorrowRow[`${capitalize(key)} Iqamah`]);

                  return (
                    <td key={key + "-iqamah-tom"} className={`py-1 ${cellText}`}>
                      {jamaahTime}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          <div className="mt-1 text-xs sm:text-sm text-black/90 px-2">
            <div className="flex justify-center flex-wrap gap-2 whitespace-nowrap text-center">
              <span>Shouruq (Sunrise): {formatTime(tomorrowRow["Shouruq"])}</span>
              <span>Jum‘ah: {formatTime(jummahMomentTomorrow?.format("HH:mm"))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
