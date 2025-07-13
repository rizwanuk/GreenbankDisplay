import moment from "moment";

// Build a key-value map from settings
export function buildSettingsMap(settings) {
  const map = {};
  settings.forEach((row) => {
    if (row.Key && row.Value) {
      map[row.Key.trim()] = row.Value.trim();
    }
  });
  return map;
}

// Extract full theme object grouped by section
export function getTheme(settingsMap) {
  if (!settingsMap) return {};

  const currentTheme = settingsMap["toggles.theme"] || "Theme_1";

  const extractThemeGroup = (groupPrefix) => {
    const themeGroup = {};
    Object.entries(settingsMap).forEach(([key, value]) => {
      const prefix = `theme.${currentTheme}.${groupPrefix}.`;
      if (key.startsWith(prefix)) {
        const subKey = key.slice(prefix.length);
        themeGroup[subKey] = value;
      }
    });
    return themeGroup;
  };

  return {
    header: extractThemeGroup("header"),
    clock: extractThemeGroup("clock"),
    dateCard: extractThemeGroup("dateCard"),
    currentPrayer: extractThemeGroup("currentPrayer"),
    upcomingPrayer: extractThemeGroup("upcomingPrayer"),
    nextPrayer: extractThemeGroup("nextPrayer"),
    infoCard: extractThemeGroup("infoCard"),
    slideshow: extractThemeGroup("slideshow"),
  };
}

// Get English or Arabic labels
export function getLabels(settingsMap, language) {
  const prefix = language === "arabic" ? "label.arabic." : "label.";
  const labels = {};
  Object.entries(settingsMap).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      labels[key.replace(prefix, "")] = value;
    }
  });
  return labels;
}

// Find today's row from timetable
export function findTodayRow(timetable) {
  const today = moment().format("YYYY-MM-DD");
  return timetable.find((row) => row.Date === today);
}

// Preprocess timetable to inject a proper Date field
export function prepareTimetableWithDates(timetable) {
  const currentYear = moment().year();

  return timetable.map((row) => {
    const day = row.Day?.padStart(2, "0");
    const month = row.Month?.padStart(2, "0");

    if (day && month) {
      const date = moment(`${currentYear}-${month}-${day}`, "YYYY-MM-DD", true);
      return {
        ...row,
        Date: date.isValid() ? date.format("YYYY-MM-DD") : undefined,
      };
    }

    return row;
  });
}
