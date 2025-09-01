// src/theme/mobileTheme.js
// Parse theme rows from the Google Sheet into a structured object.

const PREFIX = "themeMobile."; // only mobile themes

/** From flat rows to { [themeName]: { [section]: { [key]: value } } } */
export function buildMobileThemeMap(settingsRows = []) {
  const map = {};
  for (const r of settingsRows) {
    // Expecting rows like:
    // Group=themeMobile.Theme_4.currentPrayer, Key=bgColor, Value=bg-gray-800
    const group = (r?.Group || "").trim();
    if (!group.startsWith(PREFIX)) continue;

    const value = (r?.Value ?? "").toString().trim();
    const key = (r?.Key || "").trim(); // e.g. bgColor
    if (!key) continue;

    // groupParts = ["themeMobile", "Theme_4", "currentPrayer"]
    const groupParts = group.split(".");
    const themeName = groupParts[1] || "Default";
    const section = groupParts[2] || "root";

    map[themeName] ||= {};
    map[themeName][section] ||= {};
    map[themeName][section][key] = value; // e.g. map.Theme_4.currentPrayer.bgColor = "bg-gray-800"
  }
  return map;
}

/** Returns alphabetically sorted list of theme names */
export function getMobileThemeNames(settingsRows = []) {
  return Object.keys(buildMobileThemeMap(settingsRows)).sort();
}

/** Get a specific theme object; returns {} if missing */
export function getMobileTheme(settingsRows = [], themeName) {
  const map = buildMobileThemeMap(settingsRows);
  return map[themeName] || {};
}

/** Safe getter, e.g. getThemeValue(theme, "header", "bgColor", "bg-gray-900") */
export function getThemeValue(themeObj, section, key, fallback = "") {
  return themeObj?.[section]?.[key] ?? fallback;
}
