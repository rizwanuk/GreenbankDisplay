// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";
import useMobileTimeline from "../hooks/useMobileTimeline";

import MobileCurrentCard from "../Components/MobileCurrentCard";
import MobileNextCard from "../Components/MobileNextCard";
import MobileUpcomingList from "../Components/MobileUpcomingList";

import useInstallPrompt from "../hooks/useInstallPrompt";
import KebabMenu from "../Components/pwa/KebabMenu";
import PushControls from "../Components/pwa/PushControls";

/* --------------------------- UI atoms --------------------------- */
const Pill = ({ left, right, className = "" }) => (
  <div
    className={[
      "flex items-center justify-between",
      "rounded-xl border border-white/15 bg-white/10",
      "px-3 py-2 text-[15px] leading-none",
      className,
    ].join(" ")}
  >
    <span className="font-semibold truncate">{left}</span>
    <span className="opacity-90 ml-3">{right}</span>
  </div>
);

/* --------------------------- helpers ---------------------------- */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
const fmt = (d, hour12 = false) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12,
        timeZone: tz,
      }).format(d)
    : "—";

const pad2 = (n) => String(n).padStart(2, "0");

const flattenSettings = (rows) => {
  const map = {};
  (rows || []).forEach((r) => {
    const g = (r?.Group || "").trim();
    const k = (r?.Key || "").trim();
    const v = r?.Value != null ? String(r.Value).trim() : "";
    if (!k || v === "") return;
    map[k] = v;
    if (g) map[`${g}.${k}`] = v;
  });
  return map;
};

function findRowForDate(rows, date = new Date()) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const d = date.getDate(),
    m = date.getMonth() + 1,
    y = date.getFullYear();
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  const dmySlash = `${pad2(d)}/${pad2(m)}/${y}`;
  const dmyDash = `${pad2(d)}-${pad2(m)}-${y}`;

  for (const r of rows) {
    const dayVal = r.Day ?? r.day ?? r["Day "];
    const monthVal = r.Month ?? r.month;
    if (dayVal && monthVal) {
      if (parseInt(dayVal, 10) === d && parseInt(monthVal, 10) === m) return r;
    }
    if (r.Date || r.date) {
      const v = String(r.Date || r.date).trim();
      if (v === iso || v === dmySlash || v === dmyDash) return r;
    }
  }
  return null;
}

/* ---------- label + key normalization helpers ---------- */
function toLowerMap(obj) {
  const out = {};
  if (!obj) return out;
  for (const [k, v] of Object.entries(obj)) out[String(k).toLowerCase()] = v;
  return out;
}

function withLabelAliases(map) {
  const out = { ...map };
  const aliasPairs = [
    ["dhuhr", "zuhr"],
    ["isha", "ishaa"],
    ["maghrib", "magrib"],
    ["sunrise", "shouruq"],
    ["sunrise", "shuruq"],
    ["sunrise", "shurooq"],
    ["sunrise", "shourouq"],
    ["jummah", "jumuah"],
    ["jummah", "jumma"],
  ];
  for (const [canonical, alias] of aliasPairs) {
    if (out[alias] && !out[canonical]) out[canonical] = out[alias];
    if (out[canonical] && !out[alias]) out[alias] = out[canonical];
  }
  return out;
}

function normalizeKey(raw) {
  let k = String(raw || "").toLowerCase().normalize("NFKD");
  k = k.replace(/[’'‘]/g, "").replace(/\s+/g, "");
  if (k === "ishaa") k = "isha";
  if (k === "magrib") k = "maghrib";
  if (k === "shouruq" || k === "shuruq" || k === "shurooq" || k === "shourouq" || k === "ishraq")
    k = "sunrise";
  // don't force zuhr→dhuhr; our alias map now supports both
  if (k.startsWith("jum")) k = "jummah"; // jummah/jumuah/jumma → jummah
  return k;
}

function computeLookupKey(p) {
  let k = p?.lookupKey || p?.key || p?.name || "";
  k = normalizeKey(k);

  // Friday override for display-only resolution
  let isFriday = false;
  const s = p?.start;
  if (s) {
    if (typeof s.getDay === "function") {
      isFriday = s.getDay() === 5;
    } else if (moment.isMoment(s)) {
      isFriday = s.day() === 5;
    }
  }
  if (isFriday && k === "dhuhr") k = "jummah";

  return k;
}

/* ============================= Component ============================= */
export default function MobileScreen() {
  const [hb, setHb] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHb((h) => h + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const timetable = usePrayerTimes();
  const settingsRows = useSettings();

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);
  const labelsRaw = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabicRaw = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  // Lower-cased, alias-augmented maps so lookups are resilient
  const labels = useMemo(() => withLabelAliases(toLowerMap(labelsRaw)), [labelsRaw]);
  const arabic = useMemo(() => withLabelAliases(toLowerMap(arabicRaw)), [arabicRaw]);

  const now = useMemo(() => new Date(), [hb]);
  const refToday = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const refTomorrow = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() + 1);
    return d;
  }, [refToday]);
  const refYesterday = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() - 1);
    return d;
  }, [refToday]);

  const todayRow = useMemo(() => findRowForDate(timetable, refToday), [timetable, refToday]);
  const yRow = useMemo(() => findRowForDate(timetable, refYesterday), [timetable, refYesterday]);
  const tRow = useMemo(() => findRowForDate(timetable, refTomorrow), [timetable, refTomorrow]);

  const is24Hour =
    (settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "")
      .toString()
      .toUpperCase() === "TRUE";

  // Build upcoming (Fajr/Shouruq + Jum‘ah handled by the hook)
  const { upcoming } = useMobileTimeline({
    now: useMemo(() => moment(now), [now]),
    todayRow,
    tomorrowRow: tRow,
    yesterdayRow: yRow,
    settingsMap,
    numberToShow: 6,
  });

  // Add a robust lookupKey to each item for label resolution
  const upcomingWithKeys = useMemo(
    () =>
      (upcoming || []).map((p) => ({
        ...p,
        lookupKey: computeLookupKey(p),
      })),
    [upcoming]
  );

  // Optional: quick debug (open /mobile?debug=labels)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("debug=labels")) {
      // eslint-disable-next-line no-console
      console.log("[labels]", labels);
      // eslint-disable-next-line no-console
      console.log("[arabic]", arabic);
      // eslint-disable-next-line no-console
      console.table(
        upcomingWithKeys.map((u) => ({
          key: u.key,
          lookupKey: u.lookupKey,
          name: u.name,
          start: u.start?.toString?.(),
        }))
      );
    }
  }, [labels, arabic, upcomingWithKeys]);

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);
  const nowStr = fmt(now, !is24Hour);

  // Install/menu state
  const { canInstallMenu, install, installed, isIOS, isIOSSafari } = useInstallPrompt();

  const scrollToNotifications = () => {
    document.getElementById("notif-toggle")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const doInstall = async () => {
    if (isIOS && !isIOSSafari) {
      alert("Open this page in Safari, then tap Share → Add to Home Screen.");
      return;
    }
    await install();
  };
  const copyLinkFallback = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied. Open it in Safari to install.");
    } catch {
      alert("Copy failed. Long-press the URL bar to copy.");
    }
  };

  return (
    <div
      className="min-h-screen bg-[#060a12] text-white font-poppins md:flex md:items-center md:justify-center md:p-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:bg-[#0b0f1a] md:shadow-2xl md:overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b0f1a]">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
            <div className="text-xs opacity-75">Mobile view</div>
          </div>

          <KebabMenu
            canInstallMenu={canInstallMenu}
            installed={installed}
            isIOS={isIOS}
            isIOSSafari={isIOSSafari}
            onInstall={doInstall}
            onNotifications={scrollToNotifications}
            onCopyLink={copyLinkFallback}
          />
        </div>

        <main className="px-4 py-4 space-y-3">
          <Pill left={todayLong} right={nowStr} />

          <PushControls />

          <MobileCurrentCard
            labels={labels}
            arabicLabels={arabic}
            is24Hour={is24Hour}
            todayRow={todayRow}
            yesterdayRow={yRow}
            settingsMap={settingsMap}
          />

          <MobileNextCard
            todayRow={todayRow}
            tomorrowRow={tRow}
            labels={labels}
            arabicLabels={arabic}
            settingsMap={settingsMap}
          />

          <MobileUpcomingList
            upcoming={upcomingWithKeys}
            is24Hour={is24Hour}
            todayRef={refToday}
            tomorrowRef={refTomorrow}
            labels={labels}
            arabicLabels={arabic}
          />
        </main>
      </div>
    </div>
  );
}
