'use client';

import React, { useMemo, memo } from 'react';
import moment from 'moment-hijri';
import formatWithSmallAmPm from '../helpers/formatWithSmallAmPm';
import { getJummahTime } from '../hooks/usePrayerHelpers';
import { getTime as parseTime } from '../helpers/time';
import { getEnglishLabels, getArabicLabels } from '../utils/labels';
import useNow from '../hooks/useNow';

function CurrentPrayerCard({
  theme = {},
  labels,
  arabicLabels,
  is24Hour,
  todayRow,
  yesterdayRow,
  settingsMap,
}) {
  const now = useNow(1000); // shared 1s tick

  const derivedLabels = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const derivedArabic = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);
  const L = labels ?? derivedLabels;
  const A = arabicLabels ?? derivedArabic;

  if (!todayRow || !settingsMap) return null;

  const getTime = (row, key) => parseTime(row, key);

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

  const ishraqStart = sunrise?.clone().add(parseInt(settingsMap['timings.ishraqAfterSunrise'] || '10', 10), 'minutes');
  const ishraqEnd = ishraqStart?.clone().add(parseInt(settingsMap['timings.ishraqDuration'] || '30', 10), 'minutes');

  const makroohBeforeDhuhr = dhuhrStart?.clone().subtract(parseInt(settingsMap['timings.makroohBeforeZuhr'] || '5', 10), 'minutes');
  const makroohBeforeMaghrib = maghribStart?.clone().subtract(parseInt(settingsMap['timings.makroohBeforeMaghrib'] || '10', 10), 'minutes');

  const eshaFromYesterday = getTime(yesterdayRow, 'Isha Adhan');
  const eshaJamaahFromYesterday = getTime(yesterdayRow, 'Isha Iqamah');

  const jamaahDuration = parseInt(settingsMap['timings.jamaahHighlightDuration'] || '5', 10);
  const isFriday = now.format('dddd') === 'Friday';

  const jummahTime = getJummahTime(settingsMap, now);

  let key = null;
  let label = null;
  let arabic = null;
  let start = null;
  let jamaah = null;

  if (now.isBefore(fajrStart)) {
    key = 'isha';
    label = L?.[key];
    arabic = A?.[key];
    start = eshaFromYesterday;
    jamaah = eshaJamaahFromYesterday;
  } else if (now.isBefore(fajrJamaah)) {
    key = 'fajr';
    label = L?.[key];
    arabic = A?.[key];
    start = fajrStart;
    jamaah = fajrJamaah;
  } else if (now.isSameOrAfter(fajrJamaah) && now.isBefore(fajrJamaah.clone().add(jamaahDuration, 'minutes'))) {
    return <JamaahBanner label={L?.fajr} arabic={A?.fajr} theme={theme} />;
  } else if (now.isBefore(sunrise)) {
    key = 'fajr';
    label = L?.[key];
    arabic = A?.[key];
    start = fajrStart;
    jamaah = fajrJamaah;
  } else if (now.isSameOrAfter(sunrise) && now.isBefore(ishraqStart)) {
    key = 'makrooh';
    label = `Makrooh ${A?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;
  } else if (now.isBefore(ishraqEnd)) {
    key = 'ishraq';
    label = `Ishraq ${A?.ishraq || 'اشراق'}`;
    arabic = null;
  } else if (now.isBefore(makroohBeforeDhuhr)) {
    key = 'nafl';
    label = `Nafl ${A?.nafl || 'نافلة'} prayers can be offered`;
    arabic = null;
  } else if (now.isSameOrAfter(makroohBeforeDhuhr) && now.isBefore(dhuhrStart)) {
    key = 'makrooh';
    label = `Makrooh ${A?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;
  } else if (now.isBefore(dhuhrJamaah)) {
    key = 'dhuhr';
    label = isFriday ? L?.jummah || 'Jummah' : L?.[key];
    arabic = isFriday ? A?.jummah : A?.[key];
    start = dhuhrStart;
    jamaah = isFriday && jummahTime ? jummahTime : dhuhrJamaah;
  } else if (now.isSameOrAfter(dhuhrJamaah) && now.isBefore(dhuhrJamaah.clone().add(jamaahDuration, 'minutes'))) {
    return (
      <JamaahBanner
        label={isFriday ? L?.jummah : L?.dhuhr}
        arabic={isFriday ? A?.jummah : A?.dhuhr}
        theme={theme}
      />
    );
  } else if (now.isBefore(asrStart)) {
    key = 'dhuhr';
    label = isFriday ? L?.jummah || 'Jummah' : L?.[key];
    arabic = isFriday ? A?.jummah : A?.[key];
    start = dhuhrStart;
    jamaah = isFriday && jummahTime ? jummahTime : dhuhrJamaah;
  } else if (now.isBefore(asrJamaah)) {
    key = 'asr';
    label = L?.[key];
    arabic = A?.[key];
    start = asrStart;
    jamaah = asrJamaah;
  } else if (now.isSameOrAfter(asrJamaah) && now.isBefore(asrJamaah.clone().add(jamaahDuration, 'minutes'))) {
    return <JamaahBanner label={L?.asr} arabic={A?.asr} theme={theme} />;
  } else if (now.isSameOrAfter(makroohBeforeMaghrib) && now.isBefore(maghribStart)) {
    key = 'makrooh';
    label = `Makrooh ${A?.makrooh || 'مكروه'} time — please avoid praying`;
    arabic = null;
  } else if (now.isBefore(maghribStart)) {
    key = 'asr';
    label = L?.[key];
    arabic = A?.[key];
    start = asrStart;
    jamaah = asrJamaah;
  } else if (now.isSameOrAfter(maghribJamaah) && now.isBefore(maghribJamaah.clone().add(jamaahDuration, 'minutes'))) {
    return <JamaahBanner label={L?.maghrib} arabic={A?.maghrib} theme={theme} />;
  } else if (now.isBefore(ishaStart)) {
    key = 'maghrib';
    label = L?.[key];
    arabic = A?.[key];
    start = maghribStart;
    jamaah = maghribJamaah;
  } else if (now.isSameOrAfter(ishaJamaah) && now.isBefore(ishaJamaah.clone().add(jamaahDuration, 'minutes'))) {
    return <JamaahBanner label={L?.isha} arabic={A?.isha} theme={theme} />;
  } else {
    key = 'isha';
    label = L?.[key];
    arabic = A?.[key];
    start = ishaStart;
    jamaah = ishaJamaah;
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
        {start && jamaah && (
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

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.is24Hour === n.is24Hour &&
  p.labels === n.labels &&
  p.arabicLabels === n.arabicLabels &&
  p.settingsMap === n.settingsMap &&
  p.todayRow === n.todayRow &&
  p.yesterdayRow === n.yesterdayRow;

export default memo(CurrentPrayerCard, areEqual);
