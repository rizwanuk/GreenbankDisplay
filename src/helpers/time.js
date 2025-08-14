// src/helpers/time.js
import moment from 'moment-hijri';

// Normalises a timetable row time cell (key can be "Fajr Adhan" or any exact column name)
export function getTime(row, key) {
  if (!row || !key) return null;
  const raw = row[key];
  if (!raw || typeof raw !== 'string' || !raw.includes(':')) return null;
  const m = moment(raw, 'HH:mm', true);
  return m.isValid() ? m : null;
}
