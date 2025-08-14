import moment from 'moment-hijri';
import { getJummahTime } from '../hooks/usePrayerHelpers';
import { getEnglishLabels, getArabicLabels } from './labels';
import { getTime as parseTime } from '../helpers/time';

export function getCurrentPrayerMessage({ now, todayRow, yesterdayRow, settings }) {
  if (!todayRow || !settings) return { message: '', style: '' };

  // Shared "HH:mm" parser + set to today's date
  const getTime = (row, key) => {
    const base = parseTime(row, key);
    return base
      ? base.set({ year: now.year(), month: now.month(), date: now.date() })
      : null;
  };

  // Centralised labels (works with grouped or flat settings)
  const labels = getEnglishLabels(settings) || {};
  const arabic = getArabicLabels(settings) || {};
  const timings = settings?.timings || {};

  const duration = parseInt(timings.jamaahHighlightDuration || '5', 10);
  const isFriday = now.format('dddd') === 'Friday';
  const jummahTime = getJummahTime(settings, now);

  const prayers = [
    { key: 'fajr',    start: getTime(todayRow, 'Fajr Adhan'),    jamaah: getTime(todayRow, 'Fajr Iqamah') },
    { key: 'dhuhr',   start: getTime(todayRow, 'Dhuhr Adhan'),   jamaah: isFriday && jummahTime ? jummahTime : getTime(todayRow, 'Dhuhr Iqamah') },
    { key: 'asr',     start: getTime(todayRow, 'Asr Adhan'),     jamaah: getTime(todayRow, 'Asr Iqamah') },
    { key: 'maghrib', start: getTime(todayRow, 'Maghrib Adhan'), jamaah: getTime(todayRow, 'Maghrib Iqamah') },
    { key: 'isha',    start: getTime(todayRow, 'Isha Adhan') || getTime(yesterdayRow, 'Isha Adhan'),
                       jamaah: getTime(todayRow, 'Isha Iqamah') || getTime(yesterdayRow, 'Isha Iqamah') },
  ];

  const sunrise = getTime(todayRow, 'Shouruq');
  const makroohBeforeSunrise = sunrise?.clone().subtract(parseInt(timings.makroohBeforeSunrise || '1', 10), 'minutes');
  const makroohAfterSunrise  = sunrise?.clone().add(parseInt(timings.makroohAfterSunrise  || '10', 10), 'minutes');
  const ishraqDuration = parseInt(timings.showIshraq || '30', 10);
  const ishraqEnd = makroohAfterSunrise?.clone().add(ishraqDuration, 'minutes');

  const dhuhrStart = prayers[1]?.start;
  const makroohBeforeZuhr = dhuhrStart?.clone().subtract(parseInt(timings.makroohBeforeZuhr || '10', 10), 'minutes');

  const maghribStart = prayers[3]?.start;
  const makroohBeforeMaghrib = maghribStart?.clone().subtract(parseInt(timings.makroohBeforeMaghrib || '10', 10), 'minutes');

  const inMakrooh =
    now.isBetween(makroohBeforeSunrise, sunrise) ||
    now.isBetween(sunrise, makroohAfterSunrise) ||
    now.isBetween(makroohBeforeZuhr, dhuhrStart) ||
    now.isBetween(makroohBeforeMaghrib, maghribStart);

  if (inMakrooh) {
    return {
      message: '⚠ Makrooh: Prayers should not be offered at this time',
      style: 'bg-red-600 text-white',
    };
  }

  if (now.isBetween(makroohAfterSunrise, ishraqEnd)) {
    const label = labels.ishraq || 'Ishraq';
    const ar = arabic.ishraq || '';
    return {
      message: `Current: ${label}`,
      ar,
      style: 'bg-zinc-200 text-black font-semibold',
    };
  }

  const fajrStart = prayers[0].start;
  let yesterdayIshaJamaah = null;
  if (yesterdayRow?.['Isha Iqamah']) {
    yesterdayIshaJamaah = moment(yesterdayRow['Isha Iqamah'], 'HH:mm').set({
      year: now.year(),
      month: now.month(),
      date: now.clone().subtract(1, 'day').date(),
    });
  }
  if (yesterdayIshaJamaah?.isValid() && fajrStart?.isValid()) {
    if (now.isSameOrAfter(yesterdayIshaJamaah) && now.isBefore(fajrStart)) {
      const label = labels.isha || 'Esha';
      const ar = arabic.isha || '';
      return {
        message: `Current: ${label}`,
        ar,
        style: 'bg-zinc-200 text-black font-semibold',
      };
    }
  }

  for (let i = 0; i < prayers.length; i++) {
    const { key, start, jamaah } = prayers[i];
    if (!start || !jamaah) continue;

    const jamaahEnd = jamaah.clone().add(duration, 'minutes');
    let nextStart =
      key === 'fajr'
        ? sunrise
        : key === 'isha'
        ? prayers[0]?.start?.clone().add(1, 'day')
        : prayers[i + 1]?.start;

    if (!nextStart) continue;

    const label = key === 'dhuhr' && isFriday ? labels.jummah || 'Jum‘ah' : labels[key] || key;
    const ar = key === 'dhuhr' && isFriday ? arabic.jummah || '' : arabic[key] || '';

    if (now.isSameOrAfter(jamaah) && now.isBefore(jamaahEnd)) {
      return {
        message: `${label} Jama‘ah in progress`,
        ar,
        style: 'bg-amber-400 text-black font-semibold',
      };
    }

    if (now.isSameOrAfter(start) && now.isBefore(nextStart)) {
      return {
        message: `Current: ${label}`,
        ar,
        style: 'bg-zinc-200 text-black font-semibold',
      };
    }
  }

  const naflLabel = labels.nafl || 'Nafl';
  const naflAr = arabic.nafl || '';
  return {
    message: `No active prayer time — ${naflLabel} can be offered`,
    ar: naflAr,
    style: 'bg-cyan-100 text-black',
  };
}
