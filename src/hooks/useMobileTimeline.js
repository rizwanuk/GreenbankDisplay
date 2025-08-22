// src/hooks/useMobileTimeline.js
import { useMemo } from "react";
import moment from "moment";
import { buildPrayerTimeline } from "../helpers/getCurrentPrayer";
import { getJummahTime } from "./usePrayerHelpers";
import applyFajrShouruqRule from "../helpers/applyFajrShouruqRule";

/**
 * Centralises logic for mobile prayer timeline
 * - Builds full timeline (yesterday, today, tomorrow)
 * - Applies Jummah override (Friday Dhuhr → Jummah)
 * - Applies Fajr/Shouruq rule
 *
 * Returns:
 *   { current, next, upcoming, fullTimeline }
 */
export default function useMobileTimeline({
  now,
  todayRow,
  tomorrowRow,
  yesterdayRow,
  settingsMap,
  numberToShow = 6,
}) {
  return useMemo(() => {
    if (!todayRow || !tomorrowRow || !yesterdayRow) {
      return { current: null, next: null, upcoming: [], fullTimeline: [] };
    }

    // 1) Build full timeline
    const fullTimeline =
      buildPrayerTimeline({
        today: todayRow,
        tomorrow: tomorrowRow,
        yesterday: yesterdayRow,
        settingsMap,
      }) || [];

    // 2) Start with upcoming (excluding Ishraq)
    let upcoming = fullTimeline
      .filter((p) => now.isBefore(p.start) && p.name !== "Ishraq")
      .map((p) => {
        let name = p.name;
        let jamaah = p.jamaah;
        let lookupKey = p.name?.toLowerCase();

        // Friday override: Dhuhr/Zuhr → Jummah
        const isFridayForPrayer = p.start.format("dddd") === "Friday";
        if (isFridayForPrayer && (lookupKey === "dhuhr" || lookupKey === "zuhr")) {
          name = "Jummah";
          lookupKey = "jummah";
          const jummahMoment = getJummahTime(settingsMap, p.start);
          if (jummahMoment?.isValid?.()) jamaah = jummahMoment;
        }

        return { ...p, name, jamaah, lookupKey };
      })
      .sort((a, b) => a.start.valueOf() - b.start.valueOf())
      .slice(0, numberToShow);

    // 3) Apply shared Fajr/Shouruq behaviour
    upcoming = applyFajrShouruqRule({
      now,
      upcoming,
      fullTimeline,
      max: numberToShow,
    });

    // 4) Derive "next" and "current"
    const next = upcoming.length > 0 ? upcoming[0] : null;

    const current = fullTimeline
      .filter((p, i, arr) => {
        const nextPrayer = arr[i + 1];
        return (
          now.isSameOrAfter(p.start) &&
          (!nextPrayer || now.isBefore(nextPrayer.start))
        );
      })
      .map((p) => {
        let name = p.name;
        let lookupKey = p.name?.toLowerCase();

        // Apply Jummah label override for current too
        if (
          p.start.format("dddd") === "Friday" &&
          (lookupKey === "dhuhr" || lookupKey === "zuhr")
        ) {
          name = "Jummah";
          lookupKey = "jummah";
        }

        return { ...p, name, lookupKey };
      })[0] || null;

    return { current, next, upcoming, fullTimeline };
  }, [now, todayRow, tomorrowRow, yesterdayRow, settingsMap, numberToShow]);
}
