import moment from 'moment';
import { getJummahTime, capitalize } from '../hooks/usePrayerHelpers';

export function getCurrentPrayerMessage({ now, todayRow, yesterdayRow, settings }) {
  if (!todayRow || !settings) return { message: '', style: '' };

  const getTime = (row, key) =>
    row?.[key] ? moment(row[key], 'HH:mm').set({ year: now.year(), month: now.month(), date: now.date() }) : null;

  const labels = settings?.labels || {};
  const arabicLabels = settings?.arabicLabels || {};
  const duration = parseInt(settings?.timings?.jamaahHighlightDuration || '5', 10);

  const fajrStart = getTime(todayRow, 'Fajr Adhan');
  const fajrJamaah = getTime(todayRow, 'Fajr Iqamah');
  const sunrise = getTime(todayRow, 'Shouruq');
  const dhuhrStart = getTime(todayRow, 'Dhuhr Adhan');
  const dhuhrJamaah = getTime(todayRow, 'Dhuhr Iqamah');
  const asrStart = getTime(todayRow, 'Asr Adhan');
  const asrJamaah = getTime(todayRow, 'Asr Iqamah');
  const maghribStart = getTime(todayRow, 'Maghrib Adhan');
  const maghribJamaah = getTime(todayRow, 'Maghrib Iqamah');
  const ishaStart = getTime(todayRow, 'Isha Adhan');
  const ishaJamaah = getTime(todayRow, 'Isha Iqamah');

  const eshaFromYesterday = getTime(yesterdayRow, 'Isha Adhan');
  const eshaJamaahFromYesterday = getTime(yesterdayRow, 'Isha Iqamah');

  const isFriday = now.format('dddd') === 'Friday';
  const jummahTime = getJummahTime(settings, now);

  const ishraqAfter = parseInt(settings?.timings?.ishraqAfterSunrise || '10', 10);
  const ishraqDuration = parseInt(settings?.timings?.ishraqDuration || '30', 10);
  const ishraqStart = sunrise?.clone().add(ishraqAfter, 'minutes');
  const ishraqEnd = ishraqStart?.clone().add(ishraqDuration, 'minutes');

  const makroohBeforeDhuhr = dhuhrStart?.clone().subtract(parseInt(settings?.timings?.makroohBeforeZuhr || '5'), 'minutes');
  const makroohBeforeMaghrib = maghribStart?.clone().subtract(parseInt(settings?.timings?.makroohBeforeMaghrib || '10'), 'minutes');

  // === Checks in order ===
  if (now.isBefore(fajrStart)) {
    return {
      message: `${labels?.isha || 'Isha'} ${labels?.prayers || 'prayers'} time`,
      style: 'bg-white/10 text-white',
    };
  }

  if (now.isBefore(fajrJamaah)) {
    return {
      message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
      style: 'bg-green-100 text-black',
    };
  }

  if (now.isSameOrAfter(fajrJamaah) && now.isBefore(fajrJamaah.clone().add(duration, 'minutes'))) {
    return {
      message: `${labels?.fajr || 'Fajr'} Jama‘ah in progress`,
      style: 'bg-yellow-300 text-black',
    };
  }

  if (now.isBefore(sunrise)) {
    return {
      message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
      style: 'bg-green-100 text-black',
    };
  }

  if (now.isSameOrAfter(sunrise) && now.isBefore(ishraqStart)) {
    return {
      message: labels?.makrooh || 'Avoid prayer during this time',
      style: 'bg-red-600 text-white',
    };
  }

  if (now.isBefore(ishraqEnd)) {
    return {
      message: `${labels?.ishraq || 'Ishraq'} ${labels?.prayers || 'prayers'} time`,
      style: 'bg-white/10 text-white',
    };
  }

  if (now.isBefore(makroohBeforeDhuhr)) {
    return {
      message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
      style: 'bg-green-100 text-black',
    };
  }

  if (now.isSameOrAfter(makroohBeforeDhuhr) && now.isBefore(dhuhrStart)) {
    return {
      message: labels?.makrooh || 'Avoid prayer during this time',
      style: 'bg-red-600 text-white',
    };
  }

  const dhuhrLabel = isFriday ? labels?.jummah || 'Jum‘ah' : labels?.dhuhr || 'Dhuhr';
  const dhuhrIqamah = isFriday && jummahTime ? jummahTime : dhuhrJamaah;

  if (now.isBefore(dhuhrIqamah)) {
    return {
      message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
      style: 'bg-green-100 text-black',
    };
  }

  if (now.isSameOrAfter(dhuhrIqamah) && now.isBefore(dhuhrIqamah.clone().add(duration, 'minutes'))) {
    return {
      message: `${dhuhrLabel} Jama‘ah in progress`,
      style: 'bg-yellow-300 text-black',
    };
  }

  if (now.isBefore(asrStart)) {
    return {
      message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
      style: 'bg-green-100 text-black',
    };
  }

  if (now.isSameOrAfter(asrJamaah) && now.isBefore(asrJamaah.clone().add(duration, 'minutes'))) {
    return {
      message: `${labels?.asr || 'Asr'} Jama‘ah in progress`,
      style: 'bg-yellow-300 text-black',
    };
  }

  if (now.isSameOrAfter(makroohBeforeMaghrib) && now.isBefore(maghribStart)) {
    return {
      message: labels?.makrooh || 'Avoid prayer during this time',
      style: 'bg-red-600 text-white',
    };
  }

  if (now.isSameOrAfter(maghribJamaah) && now.isBefore(maghribJamaah.clone().add(duration, 'minutes'))) {
    return {
      message: `${labels?.maghrib || 'Maghrib'} Jama‘ah in progress`,
      style: 'bg-yellow-300 text-black',
    };
  }

  if (now.isSameOrAfter(ishaJamaah) && now.isBefore(ishaJamaah.clone().add(duration, 'minutes'))) {
    return {
      message: `${labels?.isha || 'Isha'} Jama‘ah in progress`,
      style: 'bg-yellow-300 text-black',
    };
  }

  return {
    message: `${labels?.nafl || 'Nafl'} ${labels?.prayers || 'prayers'} can be offered`,
    style: 'bg-green-100 text-black',
  };
}
