import moment from 'moment-hijri';
import { getTime as parseTime } from '../helpers/time'; // centralised "HH:mm" parser

// 1. Hijri date with offset and custom month label
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

  return {
    hijriDateString,
    hijriMoment,
  };
}

// 2. Makrooh checker
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

// 3. Jummah time logic — supports:
// settings.timings.jummahTimes.{January/august}, settings.jummahTimes.{January/august},
// and fixed strings settings.timings.jummah / settings.jummah / settings.jummahTime
export function getJummahTime(settings, now) {
  const t = settings?.timings || {};
  const monthName = now.format('MMMM');        // e.g. "August"
  const monthLower = monthName.toLowerCase();  // e.g. "august"

  // Gather possible tables where the month-based times may live
  const tables = [
    t.jummahTimes,                 // settings.timings.jummahTimes
    settings?.jummahTimes,         // settings.jummahTimes (root-level group)
    t.JummahTimes,                 // tolerate different casing
    settings?.JummahTimes,
  ].filter(Boolean);

  // Find the month's time string (case-insensitive key matching)
  let timeStr = null;
  for (const tbl of tables) {
    if (typeof tbl !== 'object') continue;

    if (tbl[monthName]) { timeStr = tbl[monthName]; break; }
    const hit = Object.keys(tbl).find(k => k.toLowerCase() === monthLower);
    if (hit) { timeStr = tbl[hit]; break; }
  }

  // Fixed value fallbacks (a single time for all months)
  if (!timeStr) {
    const fixedCandidates = [
      t.jummah, t.jummahTime, t.Jummah,
      settings?.jummah, settings?.jummahTime, settings?.Jummah,
    ].filter(v => typeof v === 'string' && v.length);
    timeStr = fixedCandidates[0] || null;
  }

  if (!timeStr) {
    console.warn(`⚠️ Jummah time not found for ${monthName}`);
    return null;
  }

  // Parse common formats (your sheet uses "13:30")
  const dateStr = now.format('YYYY-MM-DD');
  const formats = [
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD H:mm',
    'YYYY-MM-DD h:mm A',
    'YYYY-MM-DD hh:mm A',
  ];

  for (const f of formats) {
    const m = moment(`${dateStr} ${timeStr}`, f, true);
    if (m.isValid()) return m;
  }

  console.warn('⚠️ Invalid Jummah time format:', timeStr);
  return null;
}

// 4. Get today's timetable row
export function getTodayTimetable(timetable, now) {
  return timetable.find(
    (t) =>
      Number(t.Day) === now.date() &&
      Number(t.Month) === now.month() + 1
  );
}

// 5. Time resolver
// NOTE: Keeps the same exported name/signature to avoid breaking imports.
// Uses centralised parseTime() and maps internal "sunrise" -> sheet "Shouruq".
export function getTime({ prayerKey, type, timetable, settings, now }) {
  const isFriday = now.format('dddd') === 'Friday';

  // Map internal keys to sheet labels where needed
  const timetableKey = (() => {
    if (isFriday && prayerKey === 'dhuhr') return "Jum'ah";
    if (prayerKey === 'sunrise') return 'Shouruq'; // 🔁 internal "sunrise" uses sheet column "Shouruq"
    return capitalize(prayerKey);
  })();

  const todayRow = getTodayTimetable(timetable, now);
  if (!todayRow) return null;

  if (prayerKey === 'dhuhr' && type.toLowerCase() === 'iqamah' && isFriday) {
    return getJummahTime(settings, now);
  }

  const fullKey = `${timetableKey} ${type}`;
  const raw = Object.keys(todayRow).find((k) => k.toLowerCase() === fullKey.toLowerCase());
  if (!raw) return null;

  // Parse time using shared helper, then set today's date parts
  const base = parseTime(todayRow, raw); // moment('HH:mm')
  if (!base || !base.isValid()) return null;

  return base.set({
    year: now.year(),
    month: now.month(),
    date: now.date(),
  });
}

// 6. Arabic label resolver
export function getArabicLabel(key, arabicLabels) {
  return arabicLabels?.[key?.toLowerCase()] || '';
}

// 7. English label resolver
export function getLabel(key, labels) {
  return labels?.[key?.toLowerCase()] || capitalize(key || '');
}

// 8. Capitalizer (exported)
export function capitalize(str = '') {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// 9. Exported Makrooh time getter (NEW)
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
