// /src/utils/parseSettings.js
//
// Builds a nested settings object from rows like:
// { Group: "islamicCalendar", Key: "normalizeTo30DayMonths", Value: "TRUE" }
//
// Exports BOTH a named and default function:
//   import { parseSettings } from "@/utils/parseSettings";
//   import parseSettings from "@/utils/parseSettings";

function coerceValue(raw) {
  if (raw === undefined || raw === null) return raw;

  const s = typeof raw === "string" ? raw.trim() : raw;

  if (typeof s !== "string") return s;

  const lower = s.toLowerCase();

  // Booleans
  if (lower === "true") return true;
  if (lower === "false") return false;

  // Null/undefined sentinels (optional)
  if (lower === "null") return null;
  if (lower === "undefined") return undefined;

  // Numbers
  if (s !== "" && !isNaN(s)) {
    const num = Number(s);
    if (!Number.isNaN(num)) return num;
  }

  // JSON-looking strings
  const first = s.charAt(0);
  if (first === "{" || first === "[") {
    try {
      return JSON.parse(s);
    } catch {
      // fall through
    }
  }

  return s;
}

/**
 * Parse settings rows from Google Sheets into a nested object.
 * @param {Array<Object>} rows - Array with columns: Group, Key, Value
 * @returns {Object} settings - settings[Group][Key] = coerced Value
 */
export function parseSettings(rows = []) {
  const settings = {};

  for (const row of rows) {
    const group = row?.Group?.trim?.();
    const key = row?.Key?.trim?.();
    if (!group || !key) continue;

    const value = coerceValue(row?.Value);

    if (!Object.prototype.hasOwnProperty.call(settings, group)) {
      settings[group] = {};
    }
    settings[group][key] = value;
  }

  return settings;
}

export default parseSettings;
