import React from 'react';
import moment from 'moment-hijri';
import 'moment/locale/en-gb';

moment.locale('en-gb');

export default function EmbedPrayerTable({ timetable, settings }) {
  if (!timetable || !settings || !settings.prayers) {
    return <div className="text-white p-4">Loading or invalid settings...</div>;
  }

  const today = moment();
  const todayTimetable = timetable.find(
    (t) =>
      parseInt(t.Day) === today.date() &&
      parseInt(t.Month) === today.month() + 1
  );

  if (!todayTimetable) {
    return <div className="text-white p-4">Today's prayer times not found.</div>;
  }

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const formatTime = (time) =>
    time && time.includes(':') ? moment(time, 'HH:mm').format('h:mm') : '--';

  const hijriOffset = parseInt(settings.islamicCalendar?.offset || 0);
  const hijriDate = moment().add(hijriOffset, 'days').format('iD iMMMM iYYYY');

  return (
    <div className="w-full max-w-5xl mx-auto bg-white/10 rounded-xl shadow p-4 text-white backdrop-blur">
      {/* Date row */}
      <div className="flex justify-between text-sm md:text-base font-medium mb-4">
        <div>{today.format('dddd, D MMMM YYYY')}</div>
        <div>{hijriDate} AH</div>
      </div>

      {/* Horizontal table */}
      <table className="w-full text-center text-sm md:text-base">
        <thead>
          <tr className="border-b border-white/20">
            <th className="py-2 text-left"></th>
            {prayers.map((key) => (
              <th key={key} className="px-2 py-2 font-semibold">
                {settings.prayers[key]?.en || capitalize(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">Begins</td>
            {prayers.map((key) => (
              <td key={key + '-adhan'} className="py-2">
                {formatTime(todayTimetable[`${capitalize(key)} Adhan`])}
              </td>
            ))}
          </tr>
          <tr className="border-t border-white/10">
            <td className="text-left py-2 font-medium">Jama‘ah</td>
            {prayers.map((key) => (
              <td key={key + '-jamaah'} className="py-2">
                {formatTime(todayTimetable[`${capitalize(key)} Iqamah`])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
