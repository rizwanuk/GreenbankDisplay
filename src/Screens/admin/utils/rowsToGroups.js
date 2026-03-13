// src/Screens/admin/utils/rowsToGroups.js
export function rowsToGroups(rows) {
  const groups = {};
  if (!Array.isArray(rows) || rows.length === 0) return groups;

  for (const r of rows) {
    let group, key, value;

    if (Array.isArray(r)) {
      // Legacy array format: ["Group", "Key", "Value"]
      if (String(r[0] ?? "").toLowerCase() === "group") continue; // skip header
      group = String(r[0] ?? "").trim();
      key   = String(r[1] ?? "").trim();
      value = r[2];
    } else if (r && typeof r === "object") {
      // Object format: { Group, Key, Value }
      group = String(r.Group ?? "").trim();
      key   = String(r.Key   ?? "").trim();
      value = r.Value;
    } else {
      continue;
    }

    if (!group || !key) continue;
    if (!groups[group]) groups[group] = {};
    groups[group][key] = value;
  }

  return groups;
}
export default rowsToGroups;
