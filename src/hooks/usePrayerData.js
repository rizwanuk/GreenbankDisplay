// usePrayerData.js
import { useMemo } from "react";
import moment from "moment";
import {
  buildSettingsMap,
  getLabels,
  findTodayRow,
  prepareTimetableWithDates,
} from "../utils/helpers";

// Updated theme extractor inside this file
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
  const settingsMap = useMemo(() => {
    if (!settings || settings.length === 0) return null;
    return buildSettingsMap(settings);
  }, [settings]);

  const timetableWithDates = useMemo(() => {
    if (!timetable || timetable.length === 0) return [];
    const processed = prepareTimetableWithDates(timetable);
    console.log("🛠 usePrayerData timetable sample:", processed[0]);
    console.log("🔎 Dates in timetable:", processed.map((r) => r.Date));
    console.log("📆 Looking for date:", moment().format("YYYY-MM-DD"));
    return processed;
  }, [timetable]);

  const todayRow = useMemo(() => {
    return findTodayRow(timetableWithDates);
  }, [timetableWithDates]);

  const yesterdayRow = useMemo(() => {
    const date = moment().subtract(1, "day").format("YYYY-MM-DD");
    return timetableWithDates.find((row) => row.Date === date);
  }, [timetableWithDates]);

  const tomorrowRow = useMemo(() => {
    const date = moment().add(1, "day").format("YYYY-MM-DD");
    return timetableWithDates.find((row) => row.Date === date);
  }, [timetableWithDates]);

  const isFriday = moment().format("dddd") === "Friday";

  const theme = useMemo(() => {
    return settingsMap ? getFullTheme(settingsMap) : {};
  }, [settingsMap]);

  const labels = useMemo(() => {
    return settingsMap ? getLabels(settingsMap, "english") : {};
  }, [settingsMap]);

  const arabicLabels = useMemo(() => {
    return settingsMap ? getLabels(settingsMap, "arabic") : {};
  }, [settingsMap]);

  const mosque = useMemo(() => {
    if (!settingsMap) return {};
    return {
      name: settingsMap["mosque.name"] || "",
      address: settingsMap["mosque.address"] || "",
      webpage: settingsMap["mosque.webpage"] || "",
      logoUrl: settingsMap["mosque.logoUrl"] || "",
    };
  }, [settingsMap]);

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
  };
}
