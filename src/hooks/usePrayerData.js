import { useMemo } from "react";
import moment from "moment";
import {
  buildSettingsMap,
  findTodayRow,
  prepareTimetableWithDates,
} from "../utils/helpers";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";

// Extract the active theme group from settingsMap
function getFullTheme(settingsMap) {
  const currentTheme = settingsMap["toggles.theme"] || "Theme_1";

  const extractThemeGroup = (groupPrefix) => {
    const themeGroup = {};
    Object.entries(settingsMap).forEach(([key, value]) => {
      if (key.startsWith(`theme.${currentTheme}.${groupPrefix}.`)) {
        const subKey = key.split(`${groupPrefix}.`)[1];
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

export default function usePrayerData(settings, timetable) {
  // Flatten settings to a map once
  const settingsMap = useMemo(() => {
    if (!settings || settings.length === 0) return null;
    return buildSettingsMap(settings);
  }, [settings]);

  // Add YYYY-MM-DD to each timetable row once
  const timetableWithDates = useMemo(() => {
    if (!timetable || timetable.length === 0) return [];
    return prepareTimetableWithDates(timetable);
  }, [timetable]);

  // Locate key rows relative to "today"
  const todayRow = useMemo(() => findTodayRow(timetableWithDates), [timetableWithDates]);

  const yesterdayRow = useMemo(() => {
    const date = moment().subtract(1, "day").format("YYYY-MM-DD");
    return timetableWithDates.find((row) => row.Date === date);
  }, [timetableWithDates]);

  const tomorrowRow = useMemo(() => {
    const date = moment().add(1, "day").format("YYYY-MM-DD");
    return timetableWithDates.find((row) => row.Date === date);
  }, [timetableWithDates]);

  const isFriday = moment().format("dddd") === "Friday";

  // Theme + labels derived once from settingsMap
  const theme = useMemo(() => (settingsMap ? getFullTheme(settingsMap) : {}), [settingsMap]);

  const labels = useMemo(() => (settingsMap ? getEnglishLabels(settingsMap) : {}), [settingsMap]);
  const arabicLabels = useMemo(() => (settingsMap ? getArabicLabels(settingsMap) : {}), [settingsMap]);

  const mosque = useMemo(() => {
    if (!settingsMap) return {};
    return {
      name: settingsMap["mosque.name"] || "",
      address: settingsMap["mosque.address"] || "",
      webpage: settingsMap["mosque.webpage"] || "",
      logoUrl: settingsMap["mosque.logoUrl"] || "",
    };
  }, [settingsMap]);

  // Sheet lastUpdated time (UTC) and age in minutes
  const lastUpdated = useMemo(() => {
    const raw = settingsMap?.["meta.lastUpdated"];
    return raw ? moment.utc(raw) : null;
  }, [settingsMap]);

  const lastUpdatedAgeMinutes = useMemo(() => {
    if (!lastUpdated) return null;
    return moment().diff(lastUpdated, "minutes");
  }, [lastUpdated]);

  const needsRefresh = useMemo(() => {
    if (lastUpdatedAgeMinutes == null) return false;
    return lastUpdatedAgeMinutes > 30; // threshold unchanged
  }, [lastUpdatedAgeMinutes]);

  return {
    settingsMap,
    todayRow,
    yesterdayRow,
    tomorrowRow,
    isFriday,
    theme,
    labels,
    arabicLabels,
    mosque,
    lastUpdated,
    lastUpdatedAgeMinutes,
    needsRefresh,
  };
}
