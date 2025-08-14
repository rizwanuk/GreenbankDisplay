// src/hooks/usePrayerHelpers.js
import moment from 'moment-hijri';
import { getTime as parseTime } from '../helpers/time';

// 1) Hijri date with offset and custom month label
export function useHijriDate(settings) {
  const offset = parseInt(settings?.islamicCalendar?.offset || 0, 10);
  const hijriMoment = moment().add(offset, 'days');

  const hijriDay = hijriMoment.format('iD');
  const hijriMonthIndex = parseInt(hijriMoment.format('iM'), 10); // 1–12
  const hijriYear = hijriMoment.format('iYYYY');

  const hijriMonthKey = [
    'muharram', 'safar', 'rabiAwal', 'rabiThani',
    'jumadaAwal', 'jumadaThani', 'rajab', 'shaban',
    'ramadan', 'shawwal', 'dhulQadah', 'dhulHijjah',
  ][hijriMonthIndex - 1];

  const customMonthName =
    settings?.labels?.[hijriMonthKey] || hijriMoment.format('iMMMM');

  const hijriDateString = `${hijriDay} ${customMonthName} ${hijriYear}`;

  return { hijriDateString, hijriMoment };
}

// 2) Makrooh checker
export function useMakroohTimes(settings, now) {
  const zawalStart = moment(settings?.timings?.zawalStart, 'HH:mm');
  const zawalEnd = moment(settings?.timings?.zawalEnd, 'HH:mm');
  const sunriseStart = moment(settings?.timings?.sunriseMakroohStart, 'HH:mm');
  const sunriseEnd = moment(settings?.timings?.sunriseMakroohEnd, 'HH:mm');

  const isMakroohNow =
    now.isBetween(zawalStart, zawalEnd) || now.isBetween(sunriseStart, sunriseEnd);

  return {
    isMakroohNow,
    label: settings?.labels?.makrooh || 'Avoid prayer during this time',
    sunrise: { start: sunriseStart, end: sunriseEnd },
    zawal: { start: zawalStart, end: zawalEnd },
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   3) Jum‘ah time — robust + supports both FLAT and NESTED settings
   Accepts:
   - Nested:   settings.timings.jummahTimes.{January/august}
               settings.jummahTimes.{January/august}
               settings.timings.{jummah|jummahTime}
               settings.{jummah|jummahTime}
   - Flat map: "jummahTimes.January", "jummahTimes.august",
               "timings.jummahTimes.January", etc.
   Returns a moment set to TODAY at that time, or null.
──────────────────────────────────────────────────────────────────────────── */
export function getJummahTime(settings, now) {
  const monthName = now.format('MMMM');        // e.g. "August"
  const monthLower = monthName.toLowerCase();  // e.g. "august"

  // Helper: normalize any sheet value to a plain string or null
  const toStr = (val) => {
    if (typeof val === 'string') return val.trim();
    if (val && typeof val === 'object') {
      const candidate = val.Value ?? val.value ?? null;
      if (typeof candidate === 'string') return candidate.trim();
    }
    return null;
  };

  // 3a) Try FLAT settings map keys first (since some callers pass settingsMap)
  const flatCandidates = [
    `timings.jummahTimes.${monthName}`,
    `timings.jummahTimes.${monthLower}`,
    `jummahTimes.${monthName}`,
    `jummahTimes.${monthLower}`,
  ];

  let timeStr = null;
  for (const key of flatCandidates) {
    const v = toStr(settings?.[key]);
    if (v) { timeStr = v; break; }
  }

  // 3b) Try NESTED tables (timings.jummahTimes / jummahTimes objects)
  if (!timeStr) {
    const t = settings?.timings || {};
    const tables = [t.jummahTimes, settings?.jummahTimes, t.JummahTimes, settings?.JummahTimes]
      .filter((x) => x && typeof x === 'object');

    for (const tbl of tables) {
      if (toStr(tbl[monthName])) { timeStr = toStr(tbl[monthName]); break; }
      const hit = Object.keys(tbl).find((k) => k.toLowerCase() === monthLower);
      if (hit && toStr(tbl[hit])) { timeStr = toStr(tbl[hit]); break; }
    }
  }

  // 3c) Fallback fixed single-time fields
  if (!timeStr) {
    const t = settings?.timings || {};
    const fixed = [
      toStr(settings?.jummah),
      toStr(settings?.jummahTime),
      toStr(settings?.Jummah),
      toStr(t.jummah),
      toStr(t.jummahTime),
      toStr(t.Jummah),
    ].find(Boolean);
    if (fixed) timeStr = fixed;
  }

  if (!timeStr) {
    // Nothing found — safe null (do NOT call moment with bad inputs)
    return null;
  }

  // 3d) Parse without confusing the strict/locale parameters
  // Recognise a few simple shapes and always keep `format` a string/array.
  const d = { year: now.year(), month: now.month(), date: now.date() };
  const s = String(timeStr).trim();

  // If a full date is provided, parse as date+time
  if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(\s*[AP]M)?$/i.test(s)) {
    const m = moment(s, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD H:mm', 'YYYY-MM-DD h:mm A', 'YYYY-MM-DD hh:mm A'], true);
    return m.isValid() ? m : null;
  }

  // If contains AM/PM
  if (/[AP]M$/i.test(s) || /\s[AP]M/i.test(s)) {
    const m = moment(s, ['h:mm A', 'hh:mm A'], true).set(d);
    return m.isValid() ? m : null;
  }

  // Default: 24h
  const m = moment(s, ['HH:mm', 'H:mm'], true).set(d);
  return m.isValid() ? m : null;
}

// 4) Get today's timetable row
export function getTodayTimetable(timetable, now) {
  return timetable.find(
    (t) => Number(t.Day) === now.date() && Number(t.Month) === now.month() + 1
  );
}

// 5) Time resolver (keeps signature). Maps "sunrise" → "Shouruq".
export function getTime({ prayerKey, type, timetable, settings, now }) {
  const isFriday = now.format('dddd') === 'Friday';

  const timetableKey = (() => {
    if (isFriday && prayerKey === 'dhuhr') return "Jum'ah";
    if (prayerKey === 'sunrise') return 'Shouruq';
    return capitalize(prayerKey);
  })();

  const todayRow = getTodayTimetable(timetable, now);
  if (!todayRow) return null;

  if (prayerKey === 'dhuhr' && type.toLowerCase() === 'iqamah' && isFriday) {
    return getJummahTime(settings, now);
  }

  const fullKey = `${timetableKey} ${type}`;
  const rawKey = Object.keys(todayRow).find((k) => k.toLowerCase() === fullKey.toLowerCase());
  if (!rawKey) return null;

  const base = parseTime(todayRow, rawKey); // returns moment('HH:mm') or null
  if (!base || !base.isValid()) return null;

  return base.set({ year: now.year(), month: now.month(), date: now.date() });
}

// 6) Arabic label resolver
export function getArabicLabel(key, arabicLabels) {
  return arabicLabels?.[key?.toLowerCase()] || '';
}

// 7) English label resolver
export function getLabel(key, labels) {
  return labels?.[key?.toLowerCase()] || capitalize(key || '');
}

// 8) Capitalizer
export function capitalize(str = '') {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// 9) Makrooh time getter
export function getMakroohTimes(settings) {
  const now = moment();
  const dateStr = now.format('YYYY-MM-DD');

  const zawalStart = moment(`${dateStr} ${settings?.timings?.zawalStart || '11:50'}`, 'YYYY-MM-DD HH:mm');
  const zawalEnd = moment(`${dateStr} ${settings?.timings?.zawalEnd || '12:10'}`, 'YYYY-MM-DD HH:mm');

  const sunriseStart = moment(`${dateStr} ${settings?.timings?.sunriseMakroohStart || '05:00'}`, 'YYYY-MM-DD HH:mm');
  const sunriseEnd = moment(`${dateStr} ${settings?.timings?.sunriseMakroohEnd || '05:10'}`, 'YYYY-MM-DD HH:mm');

  return {
    zawal: { start: zawalStart, end: zawalEnd },
    sunrise: { start: sunriseStart, end: sunriseEnd },
  };
}
