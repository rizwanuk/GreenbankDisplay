// src/Screens/admin/utils/rowsToGroups.js

/**
 * Converts Google Sheet rows into a grouped object.
 * Expected rows shape:
 * [
 *   ["Group","Key","Value"],
 *   ["labels","fajr","Fajr"],
 *   ["labels.arabic","fajr","فجر"],
 *   ...
 * ]
 *
 * Output shape:
 * {
 *   labels: { fajr: "Fajr", ... },
 *   "labels.arabic": { fajr: "فجر", ... },
 *   toggles: { fakeTimeEnabled: "FALSE", ... },
 *   ...
 * }
 */
export function rowsToGroups(rows) {
  const groups = {};

  if (!Array.isArray(rows) || rows.length === 0) return groups;

  // If first row is header, skip it
  const startIndex =
    Array.isArray(rows[0]) &&
    String(rows[0][0] || "").toLowerCase() === "group" &&
    String(rows[0][1] || "").toLowerCase() === "key"
      ? 1
      : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;

    const group = String(r[0] ?? "").trim();
    const key = String(r[1] ?? "").trim();
    const value = r[2];

    if (!group || !key) continue;

    if (!groups[group]) groups[group] = {};
    groups[group][key] = value;
  }

  return groups;
}

export default rowsToGroups;
