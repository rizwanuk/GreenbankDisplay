import moment from 'moment-hijri';

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

// 3. Jummah time logic (per-month logic, lowercase key fix)
export function getJummahTime(settings, now) {
  const monthName = now.format('MMMM').toLowerCase(); // ✅ lowercase to match settings
  const jummahTimes = settings?.timings?.jummahTimes || {};
  const timeStr = jummahTimes[monthName];

  if (!timeStr) {
    console.warn(`⚠️ Jummah time not found for ${monthName}`);
    return null;
  }

  const jummahMoment = moment(`${now.format("YYYY-MM-DD")} ${timeStr}`, "YYYY-MM-DD HH:mm");
  if (!jummahMoment.isValid()) {
    console.warn('⚠️ Invalid Jummah time format:', timeStr);
    return null;
  }

  return jummahMoment;
}

// 4. Get today's timetable row
export function getTodayTimetable(timetable, now) {
  return timetable.find(
    (t) =>
      parseInt(t.Day) === now.date() &&
      parseInt(t.Month) === now.month() + 1
  );
}

// 5. Time resolver
export function getTime({ prayerKey, type, timetable, settings, now }) {
  const isFriday = now.format('dddd') === 'Friday';
  const timetableKey = isFriday && prayerKey === 'dhuhr' ? "Jum'ah" : capitalize(prayerKey);
  const todayRow = getTodayTimetable(timetable, now);

  if (!todayRow) return null;

  if (prayerKey === 'dhuhr' && type.toLowerCase() === 'iqamah' && isFriday) {
    return getJummahTime(settings, now);
  }

  const fullKey = `${timetableKey} ${type}`;
  const raw = Object.keys(todayRow).find(k => k.toLowerCase() === fullKey.toLowerCase());
  return raw
    ? moment(todayRow[raw], 'HH:mm').set({
        year: now.year(),
        month: now.month(),
        date: now.date(),
      })
    : null;
}

// 6. Arabic label resolver
export function getArabicLabel(key, arabicLabels) {
  return arabicLabels?.[key?.toLowerCase()] || '';
}

// 7. English label resolver
export function getLabel(key, labels) {
  return labels?.[key?.toLowerCase()] || capitalize(key);
}

// 8. Capitalizer (exported)
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
