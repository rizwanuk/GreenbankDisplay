'use client';

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import formatWithSmallAmPm from '../helpers/formatWithSmallAmPm';
import { getCurrentPrayerState } from '../utils/getCurrentPrayerState';

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

  // Friendly loading placeholder instead of returning null
  if (!todayRow || !settingsMap) {
    return (
      <div className={`rounded-xl px-4 py-6 text-center ${theme?.bgColor || 'bg-white/5'} ${theme?.textColor || 'text-white'}`}>
        Times are loading…
      </div>
    );
  }

  // 🔓 Fake time override from settings (no hooks here to avoid order issues)
  const fakeEnabled = String(settingsMap['toggles.fakeTimeEnabled'] ?? 'false').toLowerCase() === 'true';
  const fakeTimeStr = settingsMap['toggles.fakeTime']; // e.g. "01:25"
  let effectiveNow = now;
  if (fakeEnabled && fakeTimeStr) {
    const frozen = moment(`${now.format('YYYY-MM-DD')} ${fakeTimeStr}`, 'YYYY-MM-DD HH:mm', true);
    if (frozen.isValid()) {
      effectiveNow = frozen; // freeze at fake time (today's date)
    }
  }

  // 🔒 Single source of truth (same logic used by Embed)
  const current = getCurrentPrayerState({
    now: effectiveNow,
    todayRow,
    yesterdayRow,
    settings: settingsMap,
    labels,
    arabicLabels,
  });

  // If helper can't determine a state, show a neutral message
  if (!current || current.key === 'none') {
    return (
      <div className={`rounded-xl px-4 py-6 text-center ${theme?.bgColor || 'bg-white/5'} ${theme?.textColor || 'text-white'}`}>
        Prayer times unavailable
      </div>
    );
  }

  if (current.inJamaah) {
    return <JamaahBanner label={current.label} arabic={current.arabic} theme={theme} />;
  }

  const bgClass =
    current.isMakrooh
      ? theme?.makroohColor || 'bg-red-700/80'
      : theme?.bgColor || 'bg-white/5';

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
              {current.label}
            </span>
            {current.arabic && (
              <span className={`${theme?.nameSizeArabic || 'text-5xl sm:text-6xl md:text-7xl'} ${theme?.fontAra || 'font-arabic'}`}>
                {current.arabic}
              </span>
            )}
            {theme?.name !== 'slideshow' && !current.isMakrooh && (
              <span className={`ml-2 px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${theme?.badges?.current || 'bg-white/10 text-white'}`}>
                Current
              </span>
            )}
          </div>
        </div>

        {/* Show "Begins" and "Jama'ah" (no 'Until') when not Makrooh */}
        {!current.isMakrooh && current.start && current.jamaah && (
          <div className={`${theme?.timeRowSize || 'text-4xl md:text-6xl'} text-white/80 ${theme?.fontEng || 'font-rubik'}`}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
              <div>Begins: {formatWithSmallAmPm(current.start, is24Hour)}</div>
              <div>| Jama’ah: {formatWithSmallAmPm(current.jamaah, is24Hour)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
