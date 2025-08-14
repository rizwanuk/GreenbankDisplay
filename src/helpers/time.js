// src/helpers/time.js
import moment from "moment";

/**
 * Parse a time string from the timetable row into a moment object.
 * Returns null if the value is missing or invalid.
 */
export const getTime = (row, key) => {
  if (!row || !row[key]) return null;
  return moment(row[key], "HH:mm");
};
