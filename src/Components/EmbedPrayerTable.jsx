import React, { useState, useEffect } from 'react';
import moment from 'moment-hijri';
import 'moment/locale/en-gb';

moment.locale('en-gb');

export default function EmbedPrayerTable({ timetable, settings }) {
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(moment());
    }, 30000); // update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!timetable || !settings || !settings.prayers) {
    return <div className="text-white p-4">Loading or invalid settings...</div>;
  }

  const today = now.clone(); // Use same instance to avoid inconsistencies
  const isFriday = today.format('dddd') === 'Friday';

  console.log('📅 Today is:', today.format('dddd, D MMMM YYYY'));
  console.log('🕒 now:', now.format('HH:mm:ss'));
  console.log('📦 Jummah settings:', settings.timings?.jummahTimes);

  const todayTimetable = timetable.find(
    (t) =>
      parseInt(t.Day) === today.date() &&
      parseInt(t.Month) === today.month() + 1
  );

  if (!todayTimetable) {
    return <div className="text-white p-4">Today's prayer times not found.</div>;
  }

  const prayers = [
    { key: 'fajr', timetableKey: 'Fajr' },
    {
      key: 'dhuhr',
      timetableKey: isFriday ? "Jum'ah" : 'Dhuhr',
    },
    { key: 'asr', timetableKey: 'Asar' },
    { key: 'maghrib', timetableKey: 'Maghrib' },
    { key: 'isha', timetableKey: 'Esha' },
  ];

  const formatTime = (time) =>
    time && time.isValid() ? time.format('h:mm') : '--';

  const hijriOffset = parseInt(settings.islamicCalendar?.offset || 0);
  const hijriDate = moment().add(hijriOffset, 'days').format('iD iMMMM iYYYY');

  const zawalStart = moment(settings.timings?.zawalStart, 'HH:mm');
  const zawalEnd = moment(settings.timings?.zawalEnd, 'HH:mm');
  const sunriseStart = moment(settings.timings?.sunriseMakroohStart, 'HH:mm');
  const sunriseEnd = moment(settings.timings?.sunriseMakroohEnd, 'HH:mm');

  const isInMakrooh =
    now.isBetween(zawalStart, zawalEnd) ||
    now.isBetween(sunriseStart, sunriseEnd);

  const makroohMessage = isInMakrooh
    ? settings.labels?.makrooh || 'Avoid prayer during this time'
    : null;

  const getTime = (_prayerKey, type) => {
    const prayerKey = _prayerKey.toLowerCase();
    const mapping = prayers.find((p) => p.key === prayerKey);
    if (!mapping) return null;

    // 🕌 Jummah Jama‘ah override (ONLY on Friday)
    if (
      prayerKey === 'dhuhr' &&
      type.toLowerCase() === 'iqamah' &&
      isFriday
    ) {
      const month = now.month(); // 0 = Jan, 1 = Feb, ..., 11 = Dec
      const seasonalTime =
        month >= 1 && month <= 9
          ? settings.timings?.jummahTimes?.['February-October']
          : settings.timings?.jummahTimes?.['November-January'];

      console.log('✅ Jummah override triggered');
      console.log('➡ Current month index:', month);
      console.log('➡ Seasonal Jummah time:', seasonalTime);

      return seasonalTime
        ? moment(seasonalTime, 'HH:mm').set({
            year: now.year(),
            month: now.month(),
            date: now.date(),
          })
        : null;
    }

    const fullKey = `${mapping.timetableKey} ${type}`;
    const matchedKey = Object.keys(todayTimetable).find(
      (k) => k.toLowerCase() === fullKey.toLowerCase()
    );
    const raw = matchedKey ? todayTimetable[matchedKey] : null;

    console.log(`🕓 Fallback time for ${fullKey}:`, raw);

    return raw
      ? moment(raw, 'HH:mm').set({
          year: now.year(),
          month: now.month(),
          date: now.date(),
        })
      : null;
  };

  const getPrayerHighlightClass = (key) => {
    const adhan = getTime(key, 'Adhan');
    const iqamah = getTime(key, 'Iqamah');
    const duration = parseInt(settings.timings?.highlightDurationMins || '10', 10);
    const endDark = iqamah?.clone().add(duration, 'minutes');

    if (!adhan || !iqamah || !endDark) return '';

    if (now.isSameOrAfter(adhan) && now.isBefore(iqamah)) {
      return 'bg-green-500/20';
    }

    if (now.isSameOrAfter(iqamah) && now.isBefore(endDark)) {
      return 'bg-green-700/20';
    }

    return '';
  };

  const columnClasses = prayers.map((p) => getPrayerHighlightClass(p.key));

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/10 rounded-xl shadow p-4 text-white backdrop-blur">
      <div className="flex justify-between text-sm md:text-base font-medium mb-4">
        <div>{today.format('dddd, D MMMM YYYY')}</div>
        <div>{hijriDate} AH</div>
      </div>

      <table className="w-full text-center text-xs sm:text-sm md:text-base">
        <thead>
          <tr className="border-b border-white/20">
            <th className="py-2 text-left"></th>
            {prayers.map((p, i) => (
              <th
                key={p.key}
                className={`px-2 py-2 font-semibold ${columnClasses[i]}`}
              >
                {p.key === 'dhuhr' && isFriday
                  ? settings.labels?.jummah || 'Jummah'
                  : settings.prayers[p.key]?.en || capitalize(p.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">Begins</td>
            {prayers.map((p, i) => (
              <td key={p.key + '-adhan'} className={`py-2 ${columnClasses[i]}`}>
                {formatTime(getTime(p.key, 'Adhan'))}
              </td>
            ))}
          </tr>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">Jama‘ah</td>
            {prayers.map((p, i) => (
              <td key={p.key + '-jamaah'} className={`py-2 ${columnClasses[i]}`}>
                {formatTime(getTime(p.key, 'Iqamah'))}
              </td>
            ))}
          </tr>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">
              {makroohMessage
                ? 'Warning'
                : isFriday
                ? settings.labels?.jummah || 'Jummah'
                : settings.labels?.shouruq || 'Shouruq'}
            </td>
            <td colSpan={prayers.length} className={`py-2 ${makroohMessage ? 'text-red-300' : ''}`}>
              {makroohMessage
                ? makroohMessage
                : isFriday
                ? formatTime(
                    moment(
                      now.month() >= 1 && now.month() <= 9
                        ? settings.timings?.jummahTimes?.['February-October']
                        : settings.timings?.jummahTimes?.['November-January'],
                      'HH:mm'
                    )
                  )
                : formatTime(moment(settings.timings?.shouruq, 'HH:mm'))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
