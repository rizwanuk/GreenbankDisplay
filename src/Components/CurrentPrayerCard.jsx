'use client';

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import formatWithSmallAmPm from '../helpers/formatWithSmallAmPm';
import { getJummahTime } from '../hooks/usePrayerHelpers';

// ---------- Small helpers ----------
const isTime = (m) => !!m && moment.isMoment(m) && m.isValid();
const safeInt = (v, def = 0) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
};
const parseOn = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const m = moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', true);
  return m.isValid() ? m : null;
};
// -----------------------------------

export default function CurrentPrayerCard({
  theme = {},
  labels = {},
  arabicLabels = {},
  is24Hour,
  todayRow,
  yesterdayRow,
  settingsMap,
}) {
  const [now, setNow] = useState(moment());
  const DEBUG = false; // flip to true if you ever need to debug on-screen decisions

  useEffect(() => {
    const timer = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!todayRow || !settingsMap) return null;

  // ---- Dates to bind times to
  const todayStr = now.format('YYYY-MM-DD');
  const yestStr  = now.clone().subtract(1, 'day').format('YYYY-MM-DD');

  // ---- Helpers pinned to date (never parse plain "HH:mm" without a date)
  const getToday = (key) => parseOn(todayStr, todayRow?.[key]);
  const getYest  = (key) => parseOn(yestStr,  yesterdayRow?.[key]);

  // ---- Timetable (all dated)
  const fajrStart      = getToday('Fajr Adhan');
  const fajrJamaah     = getToday('Fajr Iqamah');
  const sunrise        = getToday('Shouruq');
  const dhuhrStart     = getToday('Dhuhr Adhan');
  const dhuhrJamaah    = getToday('Dhuhr Iqamah');
  const asrStart       = getToday('Asr Adhan');
  const asrJamaah      = getToday('Asr Iqamah');
  const maghribStart   = getToday('Maghrib Adhan');
  const maghribJamaah  = getToday('Maghrib Iqamah');
  const ishaStart      = getToday('Isha Adhan');
  const ishaJamaah     = getToday('Isha Iqamah');

  const eshaFromYesterday       = getYest('Isha Adhan');
  const eshaJamaahFromYesterday = getYest('Isha Iqamah');

  // ---- Settings (keys per your Google Sheet)
  const jamaahDurationMin       = safeInt(settingsMap['timings.jamaahHighlightDuration'], 5);
  const makroohAfterSunriseMin  = safeInt(settingsMap['timings.makroohAfterSunrise'], 10);
  const showIshraqMin           = safeInt(settingsMap['timings.showIshraq'], 30);
  const makroohBeforeZuhrMin    = safeInt(settingsMap['timings.makroohBeforeZuhr'], 10);
  const makroohBeforeMaghribMin = safeInt(settingsMap['timings.makroohBeforeMaghrib'], 10);

  // Optional feature: cut Isha at midnight (kept OFF by default to avoid surprises)
  const midnightCutoff = !!settingsMap?.['toggles.midnightCutoff']; // set to true in Sheet to enable

  // ---- Derived windows with ordering guards
  const ishraqStart = (isTime(sunrise))
    ? sunrise.clone().add(makroohAfterSunriseMin, 'minutes')
    : null;

  const ishraqEnd = (isTime(ishraqStart) && showIshraqMin > 0)
    ? ishraqStart.clone().add(showIshraqMin, 'minutes')
    : null;

  const makroohBeforeDhuhr = (isTime(dhuhrStart) && makroohBeforeZuhrMin > 0)
    ? dhuhrStart.clone().subtract(makroohBeforeZuhrMin, 'minutes')
    : null;

  const makroohBeforeMaghrib = (isTime(maghribStart) && makroohBeforeMaghribMin > 0)
    ? maghribStart.clone().subtract(makroohBeforeMaghribMin, 'minutes')
    : null;

  // Midnight cut-off support (optional)
  const endOfDay = now.clone().endOf('day'); // 23:59:59
  const isFriday = now.format('dddd') === 'Friday';
  const jummahTime = getJummahTime(settingsMap, now); // should already be dated

  // ---- Selection logic (kept same flow; just added guards)
  let key = null;
  let label = null;
  let arabic = null;
  let start = null;
  let jamaah = null;

  if (isTime(fajrStart) && now.isBefore(fajrStart)) {
    // After midnight until Fajr starts → Isha from yesterday
    // If midnightCutoff is ON, show nothing between 00:00–Fajr (no current prayer)
    if (midnightCutoff && now.isSameOrAfter(now.clone().startOf('day'))) {
      key = 'nafl'; // neutral state; no banner/time row
      label = `Nafl ${arabicLabels?.nafl || 'نافلة'} prayers can be offered`;
      arabic = null;
      start = null;
      jamaah = null;
    } else {
      key = 'isha';
      label = labels?.[key];
      arabic = arabicLabels?.[key];
      start = eshaFromYesterday;
      jamaah = eshaJamaahFromYesterday;
    }

  } else if (isTime(fajrJamaah) && now.isBefore(fajrJamaah)) {
    key = 'fajr';
    label = labels?.[key];
    arabic = arabicLabels?.[key];
    start = fajrStart;
    jamaah = fajrJamaah;

  } else if (isTime(fajrJamaah) && now.isSameOrAfter(fajrJamaah) && now.isBefore(fajrJamaah.clone().add(jamaahDurationMin, 'minutes'))) {
    return <JamaahBanner label={labels?.fajr} arabic={arabicLabels?.fajr} theme={theme} />;

  } else if (isTime(sunrise) && now.isBefore(sunrise)) {
    key = 'fajr';
    label = labels?.[key];
    arabic = arabicLabels?.[key];
    start = fajrStart;
    jamaah = fajrJamaah;

  } else if (isTime(sunrise) && isTime(ishraqStart) && makroohAfterSunriseMin > 0 && ishraqStart.isAfter(sunrise) && now.isSameOrAfter(sunrise) && now.isBefore(ishraqStart)) {
    key = 'makrooh';
    label = `Makrooh ${arabicLabels?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;

  } else if (isTime(ishraqStart) && isTime(ishraqEnd) && ishraqEnd.isAfter(ishraqStart) && now.isSameOrAfter(ishraqStart) && now.isBefore(ishraqEnd)) {
    key = 'ishraq';
    label = `Ishraq ${arabicLabels?.ishraq || 'اشراق'}`;
    arabic = null;

  } else if (isTime(makroohBeforeDhuhr) && now.isBefore(makroohBeforeDhuhr)) {
    key = 'nafl';
    label = `Nafl ${arabicLabels?.nafl || 'نافلة'} prayers can be offered`;
    arabic = null;

  } else if (isTime(makroohBeforeDhuhr) && isTime(dhuhrStart) && dhuhrStart.isAfter(makroohBeforeDhuhr) && now.isSameOrAfter(makroohBeforeDhuhr) && now.isBefore(dhuhrStart)) {
    key = 'makrooh';
    label = `Makrooh ${arabicLabels?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;

  } else if (isTime(dhuhrJamaah) && now.isBefore(dhuhrJamaah)) {
    key = 'dhuhr';
    label = isFriday ? (labels?.jummah || 'Jum‘ah') : labels?.[key];
    arabic = isFriday ? arabicLabels?.jummah : arabicLabels?.[key];
    start = dhuhrStart;
    jamaah = (isFriday && isTime(jummahTime)) ? jummahTime : dhuhrJamaah;

  } else if (isTime(dhuhrJamaah) && now.isSameOrAfter(dhuhrJamaah) && now.isBefore(dhuhrJamaah.clone().add(jamaahDurationMin, 'minutes'))) {
    return (
      <JamaahBanner
        label={isFriday ? (labels?.jummah || 'Jum‘ah') : labels?.dhuhr}
        arabic={isFriday ? arabicLabels?.jummah : arabicLabels?.dhuhr}
        theme={theme}
      />
    );

  } else if (isTime(asrStart) && now.isBefore(asrStart)) {
    key = 'dhuhr';
    label = isFriday ? (labels?.jummah || 'Jum‘ah') : labels?.[key];
    arabic = isFriday ? arabicLabels?.jummah : arabicLabels?.[key];
    start = dhuhrStart;
    jamaah = (isFriday && isTime(jummahTime)) ? jummahTime : dhuhrJamaah;

  } else if (isTime(asrJamaah) && now.isBefore(asrJamaah)) {
    key = 'asr';
    label = labels?.[key];
    arabic = arabicLabels?.[key];
    start = asrStart;
    jamaah = asrJamaah;

  } else if (isTime(asrJamaah) && now.isSameOrAfter(asrJamaah) && now.isBefore(asrJamaah.clone().add(jamaahDurationMin, 'minutes'))) {
    return <JamaahBanner label={labels?.asr} arabic={arabicLabels?.asr} theme={theme} />;

  } else if (isTime(makroohBeforeMaghrib) && isTime(maghribStart) && maghribStart.isAfter(makroohBeforeMaghrib) && now.isSameOrAfter(makroohBeforeMaghrib) && now.isBefore(maghribStart)) {
    key = 'makrooh';
    label = `Makrooh ${arabicLabels?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;

  } else if (isTime(maghribStart) && now.isBefore(maghribStart)) {
    key = 'asr';
    label = labels?.[key];
    arabic = arabicLabels?.[key];
    start = asrStart;
    jamaah = asrJamaah;

  } else if (isTime(maghribJamaah) && now.isSameOrAfter(maghribJamaah) && now.isBefore(maghribJamaah.clone().add(jamaahDurationMin, 'minutes'))) {
    return <JamaahBanner label={labels?.maghrib} arabic={arabicLabels?.maghrib} theme={theme} />;

  } else if (isTime(ishaStart) && now.isBefore(ishaStart)) {
    key = 'maghrib';
    label = labels?.[key];
    arabic = arabicLabels?.[key];
    start = maghribStart;
    jamaah = maghribJamaah;

  } else if (isTime(ishaJamaah) && now.isSameOrAfter(ishaJamaah) && now.isBefore(ishaJamaah.clone().add(jamaahDurationMin, 'minutes'))) {
    return <JamaahBanner label={labels?.isha} arabic={arabicLabels?.isha} theme={theme} />;

  } else {
    // Isha current (optionally clamp at midnight if enabled)
    const afterMidnight = now.isSameOrAfter(now.clone().startOf('day'));
    if (midnightCutoff && afterMidnight && isTime(fajrStart) && now.isBefore(fajrStart)) {
      key = 'nafl';
      label = `Nafl ${arabicLabels?.nafl || 'نافلة'} prayers can be offered`;
      arabic = null;
      start = null;
      jamaah = null;
    } else {
      key = 'isha';
      label = labels?.[key];
      arabic = arabicLabels?.[key];
      start = ishaStart;
      jamaah = ishaJamaah;
    }
  }

  if (DEBUG) {
    // Minimal, helpful snapshot
    // eslint-disable-next-line no-console
    console.table([
      {k:'now', v: now.format('YYYY-MM-DD HH:mm')},
      {k:'sunrise', v: sunrise?.format('YYYY-MM-DD HH:mm')},
      {k:'ishraqStart', v: ishraqStart?.format('YYYY-MM-DD HH:mm')},
      {k:'ishraqEnd', v: ishraqEnd?.format('YYYY-MM-DD HH:mm')},
      {k:'makBeforeZuhr', v: makroohBeforeDhuhr?.format('YYYY-MM-DD HH:mm')},
      {k:'makBeforeMaghrib', v: makroohBeforeMaghrib?.format('YYYY-MM-DD HH:mm')},
      {k:'fajrStart', v: fajrStart?.format('YYYY-MM-DD HH:mm')},
      {k:'dhuhrStart', v: dhuhrStart?.format('YYYY-MM-DD HH:mm')},
      {k:'asrStart', v: asrStart?.format('YYYY-MM-DD HH:mm')},
      {k:'maghribStart', v: maghribStart?.format('YYYY-MM-DD HH:mm')},
      {k:'ishaStart', v: ishaStart?.format('YYYY-MM-DD HH:mm')},
      {k:'state', v: key},
      {k:'label', v: label},
    ]);
  }

  const bgClass =
    key === 'makrooh'
      ? theme?.makroohColor || 'bg-red-700/80'
      : theme?.bgColor || 'bg-white/5';

  return (
    <div className={`rounded-xl px-4 py-4 mb-4 text-center ${bgClass} h-[11rem] sm:h-[11.5rem] md:h-[12rem] flex items-center justify-center`}>
      <div className={`flex flex-col items-center justify-center w-full ${theme?.textColor || 'text-white'} gap-4`}>
        <div className="flex flex-col items-center justify-center w-full gap-2">
          {theme?.name === 'slideshow' && key !== 'makrooh' && (
            <span className={`px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${theme?.badges?.current || 'bg-white/10 text-white'}`}>
              Current
            </span>
          )}
          <div className="flex items-center gap-4 flex-wrap justify-center text-center break-words whitespace-normal">
            <span className={`${
              key === 'makrooh'
                ? 'text-3xl sm:text-4xl md:text-5xl'
                : theme?.nameSize || 'text-6xl sm:text-7xl md:text-8xl'
            } ${theme?.fontEng || 'font-rubik'} font-semibold`}>
              {label}
            </span>
            {arabic && (
              <span className={`${theme?.nameSizeArabic || 'text-5xl sm:text-6xl md:text-7xl'} ${theme?.fontAra || 'font-arabic'}`}>
                {arabic}
              </span>
            )}
            {theme?.name !== 'slideshow' && key !== 'makrooh' && (
              <span className={`ml-2 px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${theme?.badges?.current || 'bg-white/10 text-white'}`}>
                Current
              </span>
            )}
          </div>
        </div>

        {key !== 'makrooh' && isTime(start) && isTime(jamaah) && (
          <div className={`${theme?.timeRowSize || 'text-4xl md:text-6xl'} text-white/80 ${theme?.fontEng || 'font-rubik'}`}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
              <div>Begins: {formatWithSmallAmPm(start, is24Hour)}</div>
              <div>| Jama’ah: {formatWithSmallAmPm(jamaah, is24Hour)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JamaahBanner({ label, arabic, theme = {} }) {
  return (
    <div className={`rounded-xl px-6 py-6 text-center shadow ${theme?.jamaahColor || 'bg-green-700'} ${theme?.textColor || 'text-white'}`}>
      <div className="flex items-center gap-4 justify-center mb-2">
        <span className={`${theme?.nameSize || 'text-6xl sm:text-7xl md:text-8xl'} ${theme?.fontEng || 'font-rubik'} font-semibold`}>
          {label}
        </span>
        {arabic && (
          <span className={`${theme?.nameSizeArabic || 'text-5xl sm:text-6xl md:text-7xl'} ${theme?.fontAra || 'font-arabic'}`}>
            {arabic}
          </span>
        )}
      </div>
      <div className={`${theme?.jamaahTextSize || 'text-5xl'} ${theme?.fontEng || 'font-rubik'} font-semibold`}>
        Jama‘ah in progress
      </div>
    </div>
  );
}
