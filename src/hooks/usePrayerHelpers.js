import moment from 'moment-hijri';

// 1. Hijri date with offset
export function useHijriDate(settings) {
  const offset = parseInt(settings?.islamicCalendar?.offset || 0, 10);
  const hijriMoment = moment().add(offset, 'days');
  return {
    hijriDateString: hijriMoment.format('iD iMMMM iYYYY'),
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

// 3. Jummah time logic
export function getJummahTime(settings, now) {
  const month = now.month(); // Jan = 0
  const seasonal =
    month >= 1 && month <= 9
      ? settings?.timings?.jummahTimes?.['February-October']
      : settings?.timings?.jummahTimes?.['November-January'];
  return seasonal
    ? moment(seasonal, 'HH:mm').set({ year: now.year(), month: now.month(), date: now.date() })
    : null;
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
