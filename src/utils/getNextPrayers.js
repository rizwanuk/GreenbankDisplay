// src/utils/getNextPrayers.js
import moment from "moment";

const isTime = (m) => !!m && moment.isMoment(m) && m.isValid();
const parseOn = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const s = String(timeStr).trim();
  if (!s) return null;
  const m = moment(`${dateStr} ${s}`, "YYYY-MM-DD HH:mm", true);
  return m.isValid() ? m : null;
};

// Column names in your timetable
const COLS = {
  fajr:     { adhan: "Fajr Adhan",     iqamah: "Fajr Iqamah" },
  dhuhr:    { adhan: "Dhuhr Adhan",    iqamah: "Dhuhr Iqamah" },
  asr:      { adhan: "Asr Adhan",      iqamah: "Asr Iqamah" },
  maghrib:  { adhan: "Maghrib Adhan",  iqamah: "Maghrib Iqamah" },
  isha:     { adhan: "Isha Adhan",     iqamah: "Isha Iqamah" },
};

const ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/**
 * Returns { next, upcoming }
 * - next: the first Fard prayer after `now`
 * - upcoming: the one after next
 * Each item has: { key, label, arabic, start, jamaah, isNextDay }
 *
 * Pass `tomorrowRow` if you want rollover to tomorrow's Fajr after Isha.
 */
export function getNextPrayers({
  now,
  todayRow,
  tomorrowRow = null,
  labels = {},
  arabicLabels = {},
}) {
  if (!now || !todayRow) return { next: null, upcoming: null };

  const todayStr = now.format("YYYY-MM-DD");
  const tomorrowStr = now.clone().add(1, "day").format("YYYY-MM-DD");

  // Build today's list
  const todayList = ORDER.map((key) => {
    const cols = COLS[key];
    const start = parseOn(todayStr, todayRow?.[cols.adhan]);
    const jamaah = parseOn(todayStr, todayRow?.[cols.iqamah]);
    return isTime(start)
      ? { key, label: labels[key], arabic: arabicLabels[key], start, jamaah, isNextDay: false }
      : null;
  }).filter(Boolean);

  // Build tomorrow Fajr (optional)
  const tmrFajr = tomorrowRow
    ? (() => {
        const start = parseOn(tomorrowStr, tomorrowRow?.[COLS.fajr.adhan]);
        const jamaah = parseOn(tomorrowStr, tomorrowRow?.[COLS.fajr.iqamah]);
        return isTime(start)
          ? { key: "fajr", label: labels.fajr, arabic: arabicLabels.fajr, start, jamaah, isNextDay: true }
          : null;
      })()
    : null;

  // All upcoming from NOW
  const upcomingList = [
    ...todayList.filter((it) => now.isBefore(it.start)),
    ...(tmrFajr ? [tmrFajr] : []),
  ].sort((a, b) => a.start.valueOf() - b.start.valueOf());

  return {
    next: upcomingList[0] || null,
    upcoming: upcomingList[1] || null,
  };
}
