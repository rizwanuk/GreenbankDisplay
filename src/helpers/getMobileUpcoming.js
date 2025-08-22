// src/helpers/getMobileUpcoming.js
import moment from "moment";

const SUNRISE_ALIASES = ["sunrise", "shouruq", "shuruq", "shurooq", "shourouq"];
const DHUHR_ALIASES = ["dhuhr", "zuhr"];

// tolerant string/number → moment on base day
function toMomentOn(anyTime, baseMoment) {
  if (!anyTime) return null;
  if (anyTime instanceof Date && !isNaN(anyTime)) {
    return moment(baseMoment).set({
      hour: anyTime.getHours(),
      minute: anyTime.getMinutes(),
      second: 0,
      millisecond: 0,
    });
  }
  let h = NaN, m = NaN;
  if (typeof anyTime === "number") {
    if (anyTime < 48 * 60) { h = Math.floor(anyTime / 60); m = anyTime % 60; }
    else { h = Math.floor(anyTime / 100); m = anyTime % 100; }
  } else if (typeof anyTime === "string") {
    const s = anyTime.trim().toLowerCase();
    let mm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
          || /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(s)
          || /^(\d{2})(\d{2})$/.exec(s);
    if (mm) {
      h = Number(mm[1]); m = Number(mm[2]);
      const ampm = mm[3];
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    }
  }
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return moment(baseMoment).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

function pickKey(row, aliases) {
  const keys = Object.keys(row || {});
  const lower = aliases.map((s) => s.toLowerCase());
  return keys.find((k) => lower.includes(String(k).toLowerCase()));
}

function buildDayItems(row, base, labels, ar, settingsMap) {
  if (!row) return [];
  const isFriday = base.isoWeekday() === 5;
  const out = [];

  const add = (name) => {
    const lk = name.toLowerCase();
    const adhanStr =
      row[`${name} Adhan`] ??
      row[name] ??
      (lk === "dhuhr" && (row["Zuhr"] || row["zuhr"])) ??
      null;
    const iqamahStr = row[`${name} Iqamah`] ?? row[`${name} Jama'ah`] ?? null;
    if (!adhanStr) return;

    const start = toMomentOn(adhanStr, base);
    const jamaah = iqamahStr ? toMomentOn(iqamahStr, base) : null;

    let key = lk;
    let label = labels?.[lk] ?? name;
    let arabic = ar?.[lk] ?? "";

    // Friday label override for Dhuhr → Jum‘ah (times unchanged)
    if (lk === "dhuhr" && isFriday) {
      key = "jummah";
      label = labels?.jummah || "Jum‘ah";
      arabic = ar?.jummah || ar?.dhuhr || arabic;
    }

    if (start?.isValid()) {
      out.push({ key, lookupKey: lk, label, arabic, start, jamaah });
    }
  };

  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(add);

  // Sunrise entry (Shouruq)
  const sunriseKey = pickKey(row, SUNRISE_ALIASES);
  if (sunriseKey) {
    const s = toMomentOn(row[sunriseKey], base);
    if (s?.isValid()) {
      out.push({
        key: "shouruq",
        lookupKey: "shouruq",
        label: labels?.shouruq || "Shouruq",
        arabic: ar?.shouruq || "",
        start: s,
        jamaah: null,
      });
    }
  }

  return out;
}

/**
 * Returns an array of upcoming items (sorted by start) with the following rules:
 *  - From Fajr start until Shouruq start: hide today's Shouruq and include tomorrow's Fajr.
 *  - At and after today's Shouruq start: allow tomorrow's Shouruq to appear as normal.
 */
export function getMobileUpcoming({
  now,
  todayRow,
  tomorrowRow,
  labels = {},
  arabicLabels = {},
  settingsMap = {},
}) {
  const todayBase = now.clone().startOf("day");
  const tomorrowBase = todayBase.clone().add(1, "day");

  const todayItems = buildDayItems(todayRow, todayBase, labels, arabicLabels, settingsMap);
  const tomorrowItems = buildDayItems(tomorrowRow, tomorrowBase, labels, arabicLabels, settingsMap);

  const fajrToday = todayItems.find(i => i.lookupKey === "fajr")?.start || null;
  const shouruqToday = todayItems.find(i => i.lookupKey === "shouruq")?.start || null;
  const fajrTomorrow = tomorrowItems.find(i => i.lookupKey === "fajr") || null;
  const shouruqTomorrow = tomorrowItems.find(i => i.lookupKey === "shouruq") || null;

  // Start with future items only
  let upcoming = [...todayItems, ...tomorrowItems].filter(i => now.isBefore(i.start));

  // RULE 1: Between Fajr start and Shouruq start → hide today's Shouruq, ensure tomorrow's Fajr is present
  if (fajrToday && shouruqToday && now.isSameOrAfter(fajrToday) && now.isBefore(shouruqToday)) {
    upcoming = upcoming.filter(i => i.lookupKey !== "shouruq" || i.start.isSameOrAfter(shouruqToday));
    if (fajrTomorrow) {
      const hasTomorrowFajr = upcoming.some(i => i.lookupKey === "fajr" && i.start.isSame(fajrTomorrow.start));
      if (!hasTomorrowFajr) upcoming.push(fajrTomorrow);
    }
  }

  // RULE 2: At/after today's Shouruq start → allow tomorrow's Shouruq as usual
  // (No extra code needed, it’s already in upcoming via tomorrowItems once we’re before its start)

  // Sort by start and return
  return upcoming.sort((a, b) => a.start.diff(b.start));
}
