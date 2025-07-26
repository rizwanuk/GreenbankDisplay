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

  // Makrooh times
  const sunrise = getTime(todayRow, 'Shouruq');
  const makroohBeforeSunrise = sunrise?.clone().subtract(parseInt(timings.makroohBeforeSunrise || '1'), 'minutes');
  const makroohAfterSunrise = sunrise?.clone().add(parseInt(timings.makroohAfterSunrise || '10'), 'minutes');
  const dhuhrStart = getTime(todayRow, 'Dhuhr Adhan');
  const makroohBeforeZuhr = dhuhrStart?.clone().subtract(parseInt(timings.makroohBeforeZuhr || '10'), 'minutes');
  const maghribStart = getTime(todayRow, 'Maghrib Adhan');
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

  for (let i = 0; i < prayers.length; i++) {
    const { key, start, jamaah } = prayers[i];
    if (!start || !jamaah) continue;

    const jamaahEnd = jamaah.clone().add(duration, 'minutes');
    const nextStart = prayers[i + 1]?.start || moment(start).add(1, 'day');

    const label = key === 'dhuhr' && isFriday ? labels.jummah || 'Jum‘ah' : labels[key] || key;
    const ar = key === 'dhuhr' && isFriday ? arabic.jummah || '' : arabic[key] || '';

    if (now.isBetween(jamaah, jamaahEnd)) {
      return {
        message: `${label}${ar ? ` ${ar}` : ''} Jama‘ah in progress`,
        style: 'bg-yellow-300 text-black',
      };
    }

    if (now.isBetween(jamaahEnd, nextStart)) {
      return {
        message: `${label}${ar ? ` ${ar}` : ''} — ${labels.current || 'Current'}`,
        style: 'bg-white/70 text-black font-bold',
      };
    }

    if (now.isBetween(start, jamaah)) {
      return {
        message: `${labels.nafl || 'Nafl'} ${labels.prayers || 'prayers'} can be offered`,
        style: 'bg-green-100 text-black',
      };
    }
  }

  return {
    message: `${labels.nafl || 'Nafl'} ${labels.prayers || 'prayers'} can be offered`,
    style: 'bg-green-100 text-black',
  };
}
