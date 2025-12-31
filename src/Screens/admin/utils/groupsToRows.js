// src/Screens/admin/utils/groupsToRows.js

/**
 * Converts grouped settings back into Google Sheet rows.
 *
 * Input shape:
 * {
 *   labels: { fajr: "Fajr" },
 *   "labels.arabic": { fajr: "فجر" },
 *   toggles: { fakeTimeEnabled: "FALSE" },
 *   ...
 * }
 *
 * Output rows shape:
 * [
 *   ["Group","Key","Value"],
 *   ["labels","fajr","Fajr"],
 *   ["labels.arabic","fajr","فجر"],
 *   ...
 * ]
 */
export function groupsToRows(groups) {
  const rows = [["Group", "Key", "Value"]];

  if (!groups || typeof groups !== "object") return rows;

  // Stable ordering: group name asc, then key asc
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  for (const g of groupNames) {
    const obj = groups[g];
    if (!obj || typeof obj !== "object") continue;

    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    for (const k of keys) {
      rows.push([g, k, obj[k]]);
    }
  }

  return rows;
}

export default groupsToRows;
