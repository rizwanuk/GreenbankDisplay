import React, { useState, useEffect } from 'react';
import moment from 'moment-hijri';
import 'moment/locale/en-gb';
import {
  useHijriDate,
  useMakroohTimes,
  getTodayTimetable,
  getTime,
} from '../helpers/usePrayerHelpers';

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

  const today = now.clone();
  const isFriday = today.format('dddd') === 'Friday';

  const todayTimetable = getTodayTimetable(timetable, now);
  if (!todayTimetable) {
    return <div className="text-white p-4">Today's prayer times not found.</div>;
  }

  const prayers = [
    { key: 'fajr', timetableKey: 'Fajr' },
    { key: 'dhuhr', timetableKey: isFriday ? "Jum'ah" : 'Dhuhr' },
    { key: 'asr', timetableKey: 'Asar' },
    { key: 'maghrib', timetableKey: 'Maghrib' },
    { key: 'isha', timetableKey: 'Esha' },
  ];

  const formatTime = (time) =>
    time && time.isValid() ? time.format('h:mm') : '--';

  const { hijriDateString } = useHijriDate(settings);
  const { isMakroohNow, label: makroohMessage } = useMakroohTimes(settings, now);

  const getPrayerHighlightClass = (key) => {
    const adhan = getTime({ prayerKey: key, type: 'Adhan', timetable, settings, now });
    const iqamah = getTime({ prayerKey: key, type: 'Iqamah', timetable, settings, now });
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
        <div>{hijriDateString} AH</div>
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
                {formatTime(getTime({ prayerKey: p.key, type: 'Adhan', timetable, settings, now }))}
              </td>
            ))}
          </tr>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">Jama‘ah</td>
            {prayers.map((p, i) => (
              <td key={p.key + '-jamaah'} className={`py-2 ${columnClasses[i]}`}>
                {formatTime(getTime({ prayerKey: p.key, type: 'Iqamah', timetable, settings, now }))}
              </td>
            ))}
          </tr>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">
              {isMakroohNow
                ? 'Warning'
                : settings.labels?.sunrise || 'Shouruq'}
            </td>
            <td colSpan={prayers.length} className={`py-2 ${isMakroohNow ? 'text-red-300' : ''}`}>
              {isMakroohNow ? (
                makroohMessage
              ) : (
                <>
                  Shouruq: {formatTime(moment(settings.timings?.shouruq, 'HH:mm'))}
                  {!isFriday && (() => {
                    const seasonalJummahTime =
                      now.month() >= 1 && now.month() <= 9
                        ? settings.jummahTimes?.['February-October']
                        : settings.jummahTimes?.['November-January'];

                    return seasonalJummahTime ? (
                      <>
                        {', Jum‘ah: '}
                        {formatTime(
                          moment(seasonalJummahTime, 'HH:mm').set({
                            year: now.year(),
                            month: now.month(),
                            date: now.date(),
                          })
                        )}
                      </>
                    ) : null;
                  })()}
                </>
              )}
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
