import moment from 'moment';
import { getJummahTime } from '../hooks/usePrayerHelpers';

export function getCurrentPrayerMessage({ now, todayRow, yesterdayRow, settings }) {
  if (!todayRow || !settings) return { message: '', style: '' };

  const getTime = (row, key) =>
    row?.[key] ? moment(row[key], 'HH:mm').set({ year: now.year(), month: now.month(), date: now.date() }) : null;

  const labels = settings?.labels || {};
  const arabic = settings?.['labels.arabic'] || settings?.labels?.arabic || {};
  const timings = settings?.timings || {};

  const duration = parseInt(timings.jamaahHighlightDuration || '5', 10);
  const isFriday = now.format('dddd') === 'Friday';
  const jummahTime = getJummahTime(settings, now);

  const prayers = [
    {
      key: 'fajr',
      start: getTime(todayRow, 'Fajr Adhan'),
      jamaah: getTime(todayRow, 'Fajr Iqamah'),
    },
    {
      key: 'dhuhr',
      start: getTime(todayRow, 'Dhuhr Adhan'),
      jamaah: isFriday && jummahTime ? jummahTime : getTime(todayRow, 'Dhuhr Iqamah'),
    },
    {
      key: 'asr',
      start: getTime(todayRow, 'Asr Adhan'),
      jamaah: getTime(todayRow, 'Asr Iqamah'),
    },
    {
      key: 'maghrib',
      start: getTime(todayRow, 'Maghrib Adhan'),
      jamaah: getTime(todayRow, 'Maghrib Iqamah'),
    },
    {
      key: 'isha',
      start: getTime(todayRow, 'Isha Adhan') || getTime(yesterdayRow, 'Isha Adhan'),
      jamaah: getTime(todayRow, 'Isha Iqamah') || getTime(yesterdayRow, 'Isha Iqamah'),
    },
  ];

  // Makrooh and Ishraq times
  const sunrise = getTime(todayRow, 'Shouruq');
  const makroohBeforeSunrise = sunrise?.clone().subtract(parseInt(timings.makroohBeforeSunrise || '1'), 'minutes');
  const makroohAfterSunrise = sunrise?.clone().add(parseInt(timings.makroohAfterSunrise || '10'), 'minutes');
  const ishraqDuration = parseInt(timings.showIshraq || '30', 10);
  const ishraqEnd = makroohAfterSunrise?.clone().add(ishraqDuration, 'minutes');
  const dhuhrStart = prayers[1]?.start;
  const makroohBeforeZuhr = dhuhrStart?.clone().subtract(parseInt(timings.makroohBeforeZuhr || '10'), 'minutes');
  const maghribStart = prayers[3]?.start;
  const makroohBeforeMaghrib = maghribStart?.clone().subtract(parseInt(timings.makroohBeforeMaghrib || '10'), 'minutes');

  const inMakrooh =
    (now.isBetween(makroohBeforeSunrise, sunrise)) ||
    (now.isBetween(sunrise, makroohAfterSunrise)) ||
    (now.isBetween(makroohBeforeZuhr, dhuhrStart)) ||
    (now.isBetween(makroohBeforeMaghrib, maghribStart));

  if (inMakrooh) {
    return {
      message: '⚠ Makrooh: Prayers should not be prayed.',
      style: 'bg-red-600 text-white',
    };
  }

  // ✅ Show Ishraq after sunrise + makrooh
  if (now.isBetween(makroohAfterSunrise, ishraqEnd)) {
    const label = labels.ishraq || 'Ishraq';
    const ar = arabic.ishraq || '';
    return {
      message: `${label} — ${labels.current || 'Current'}`,
      ar,
      style: 'bg-white/70 text-black font-bold',
    };
  }

  // ✅ Loop through each prayer to determine current
  for (let i = 0; i < prayers.length; i++) {
    const { key, start, jamaah } = prayers[i];
    if (!start || !jamaah) continue;

    const jamaahEnd = jamaah.clone().add(duration, 'minutes');

    // Determine nextStart
    let nextStart;
    if (key === 'fajr') {
      nextStart = sunrise; // Fajr ends at sunrise
    } else if (key === 'isha') {
      nextStart = prayers[0]?.start?.clone().add(1, 'day'); // Isha ends at Fajr next day
    } else {
      nextStart = prayers[i + 1]?.start;
    }

    if (!nextStart) continue;

    const label = key === 'dhuhr' && isFriday ? labels.jummah || 'Jum‘ah' : labels[key] || key;
    const ar = key === 'dhuhr' && isFriday ? arabic.jummah || '' : arabic[key] || '';

    // Jama‘ah in progress
    if (now.isSameOrAfter(jamaah) && now.isBefore(jamaahEnd)) {
      return {
        message: `${label} Jama‘ah in progress`,
        ar,
        style: 'bg-yellow-300 text-black',
      };
    }

    // Prayer is current from start → next start
    if (now.isSameOrAfter(start) && now.isBefore(nextStart)) {
      return {
        message: `${label} — ${labels.current || 'Current'}`,
        ar,
        style: 'bg-white/70 text-black font-bold',
      };
    }
  }

  // 🟢 Fallback if no prayer matched
  return {
    message: `${labels.nafl || 'Nafl'} ${labels.prayers || 'prayers'} can be offered`,
    style: 'bg-green-100 text-black',
  };
}
