'use client';

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import formatWithSmallAmPm from '../helpers/formatWithSmallAmPm';
import { getCurrentPrayerState } from '../utils/getCurrentPrayerState';
import applyJummahOverride from '../helpers/applyJummahOverride';

// ✅ Only accept a valid Tailwind font class from the Sheet; otherwise fall back
function resolveArabicFont(theme) {
  const raw = theme?.fontAra;
  return raw && /^font-/.test(raw) ? raw : 'font-arabic';
}

function JamaahBanner({ label, arabic, theme = {} }) {
  const arabicFont = resolveArabicFont(theme);
  return (
    <div className={`rounded-xl px-6 py-6 text-center shadow ${theme?.jamaahColor || 'bg-green-700'} ${theme?.textColor || 'text-white'}`}>
      <div className="flex items-center gap-4 justify-center mb-2">
        <span className={`${theme?.nameSize || 'text-6xl sm:text-7xl md:text-8xl'} ${theme?.fontEng || 'font-rubik'} font-semibold`}>
          {label}
        </span>
        {arabic && (
          <span
            className={`${theme?.nameSizeArabic || 'text-5xl sm:text-6xl md:text-7xl'} ${arabicFont}`}
            lang="ar"
            dir="rtl"
          >
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

export default function CurrentPrayerCard({
  theme = {},
  labels = {},
  arabicLabels = {},
  is24Hour,
  todayRow,
  yesterdayRow,
  settingsMap, // parsed settings object
}) {
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const t = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!todayRow || !settingsMap) {
    return (
      <div className={`rounded-xl px-4 py-6 text-center ${theme?.bgColor || 'bg-white/5'} ${theme?.textColor || 'text-white'}`}>
        Times are loading…
      </div>
    );
  }

  const fakeEnabled = String(settingsMap['toggles.fakeTimeEnabled'] ?? 'false').toLowerCase() === 'true';
  const fakeTimeStr = settingsMap['toggles.fakeTime']; // e.g. "01:25"
  let effectiveNow = now;
  if (fakeEnabled && fakeTimeStr) {
    const frozen = moment(`${now.format('YYYY-MM-DD')} ${fakeTimeStr}`, 'YYYY-MM-DD HH:mm', true);
    if (frozen.isValid()) {
      effectiveNow = frozen;
    }
  }

  const current = getCurrentPrayerState({
    now: effectiveNow,
    todayRow,
    yesterdayRow,
    settings: settingsMap,
    labels,
    arabicLabels,
  });

  if (!current || current.key === 'none') {
    return (
      <div className={`rounded-xl px-4 py-6 text-center ${theme?.bgColor || 'bg-white/5'} ${theme?.textColor || 'text-white'}`}>
        Prayer times unavailable
      </div>
    );
  }

  const currentItem = {
    lookupKey: (current.key || '').toLowerCase(),
    name: current.key,
    start: current.start,
    jamaah: current.jamaah,
  };

  const fixed = applyJummahOverride(currentItem, settingsMap);
  const displayKey = (fixed.lookupKey || current.key || '').toLowerCase();

  const displayLabel = current.label || labels?.[displayKey];
  const displayArabic = current.arabic ?? arabicLabels?.[displayKey];

  const displayStart = current.start;
  const displayJamaah = fixed.jamaah || current.jamaah;

  if (current.inJamaah) {
    return <JamaahBanner label={displayLabel} arabic={displayArabic} theme={theme} />;
  }

  const bgClass =
    current.isMakrooh
      ? theme?.makroohColor || 'bg-red-700/80'
      : theme?.bgColor || 'bg-white/5';

  const arabicFont = resolveArabicFont(theme);

  return (
    <div className={`rounded-xl px-4 py-4 mb-4 text-center ${bgClass} h-[11rem] sm:h-[11.5rem] md:h-[12rem] flex items-center justify-center`}>
      <div className={`flex flex-col items-center justify-center w-full ${theme?.textColor || 'text-white'} gap-4`}>
        <div className="flex flex-col items-center justify-center w-full gap-2">
          {theme?.name === 'slideshow' && !current.isMakrooh && (
            <span className={`px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${theme?.badges?.current || 'bg-white/10 text-white'}`}>
              Current
            </span>
          )}
          <div className="flex items-center gap-4 flex-wrap justify-center text-center break-words whitespace-normal">
            <span
              className={`${
                current.isMakrooh
                  ? 'text-3xl sm:text-4xl md:text-5xl'
                  : theme?.nameSize || 'text-6xl sm:text-7xl md:text-8xl'
              } ${theme?.fontEng || 'font-rubik'} font-semibold`}
            >
              {displayLabel}
            </span>

            {displayArabic && !(displayLabel || '').includes(displayArabic) && (
              <span
                className={`${theme?.nameSizeArabic || 'text-5xl sm:text-6xl md:text-7xl'} ${arabicFont}`}
                lang="ar"
                dir="rtl"
              >
                {displayArabic}
              </span>
            )}

            {theme?.name !== 'slideshow' && !current.isMakrooh && (
              <span className={`ml-2 px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${theme?.badges?.current || 'bg-white/10 text-white'}`}>
                Current
              </span>
            )}
          </div>
        </div>

        {!current.isMakrooh && displayStart && (displayJamaah || displayStart) && (
          <div className={`${theme?.timeRowSize || 'text-4xl md:text-6xl'} text-white/80 ${theme?.fontEng || 'font-rubik'}`}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
              <div>Begins: {formatWithSmallAmPm(displayStart, is24Hour)}</div>
              {displayJamaah && <div>| Jama’ah: {formatWithSmallAmPm(displayJamaah, is24Hour)}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
