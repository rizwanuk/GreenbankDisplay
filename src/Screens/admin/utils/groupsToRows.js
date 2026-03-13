// src/Screens/admin/utils/groupsToRows.js
export function groupsToRows(groups) {
  const rows = [];
  if (!groups || typeof groups !== "object") return rows;
  const groupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  for (const g of groupNames) {
    const obj = groups[g];
    if (!obj || typeof obj !== "object") continue;
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    for (const k of keys) {
      rows.push({ Group: g, Key: k, Value: obj[k] });
    }
  }
  return rows;
}
export default groupsToRows;
