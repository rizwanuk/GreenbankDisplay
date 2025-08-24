// src/utils/helpers.js
import moment from "moment";

// Build a key-value map from settings
// - stores both plain keys (Key) and namespaced keys (Group.Key)
export function buildSettingsMap(settings) {
  const map = {};
  (settings || []).forEach((row) => {
    const group = (row?.Group || "").trim();
    const key = (row?.Key || "").trim();
    const value =
      row?.Value !== undefined && row?.Value !== null ? String(row.Value).trim() : "";

    if (!key || value === "") return;

    // legacy/plain access (e.g., "clock24Hours")
    map[key] = value;

    // namespaced access (e.g., "theme.Theme_1.header.bgColor")
    if (group) {
      map[`${group}.${key}`] = value;
    }
  });
  return map;
}

// helper to collect all keys beneath a prefix, returning { subKey: value }
function readGroup(map, prefix) {
  const out = {};
  const pfx = prefix.endsWith(".") ? prefix : prefix + ".";
  for (const [k, v] of Object.entries(map || {})) {
    if (k.startsWith(pfx)) {
      const subKey = k.slice(pfx.length);
      out[subKey] = v;
    }
  }
  return out;
}

// Normalise font tokens like "Poppins" → "font-poppins"
function normaliseFontToken(v) {
  if (!v) return v;
  const s = String(v).trim();
  if (s.startsWith("font-")) return s;
  const map = {
    rubik: "font-rubik",
    inter: "font-inter",
    cairo: "font-cairo",
    lalezar: "font-lalezar",
    poppins: "font-poppins",
    amiri: "font-arabic", // Amiri -> tailwind fontFamily.arabic
  };
  return map[s.toLowerCase()] || s;
}

// Extract full theme object grouped by section
export function getTheme(settingsMap) {
  if (!settingsMap) return {};
  const themeName = settingsMap["toggles.theme"] || "Theme_1";
  const base = `theme.${themeName}`;

  const header         = readGroup(settingsMap, `${base}.header`);
  const clock          = readGroup(settingsMap, `${base}.clock`);
  const dateCard       = readGroup(settingsMap, `${base}.dateCard`);
  const currentPrayer  = readGroup(settingsMap, `${base}.currentPrayer`);
  const upcomingPrayer = readGroup(settingsMap, `${base}.upcomingPrayer`);
  const nextPrayer     = readGroup(settingsMap, `${base}.nextPrayer`);
  const infoCard       = readGroup(settingsMap, `${base}.infoCard`);
  const weatherCard    = readGroup(settingsMap, `${base}.weatherCard`);
  const slideshow      = readGroup(settingsMap, `${base}.slideshow`);

  // Normalise fonts where present
  [
    header,
    clock,
    dateCard,
    currentPrayer,
    upcomingPrayer,
    nextPrayer,
    infoCard,
    weatherCard,
    slideshow,
  ].forEach((obj) => {
    if (obj && obj.fontEng) obj.fontEng = normaliseFontToken(obj.fontEng);
    if (obj && obj.fontAra) obj.fontAra = normaliseFontToken(obj.fontAra);
  });

  return {
    header,
    clock,
    dateCard,
    currentPrayer,
    upcomingPrayer,
    nextPrayer,
    infoCard,
    weatherCard,
    slideshow,
  };
}

// ----- NEW: Mobile-aware theme loader (themeMobile.* overrides theme.*) -----
export function getMobileTheme(settingsMap) {
  if (!settingsMap) return {};
  const themeName = settingsMap["toggles.theme"] || "Theme_1";
  const basePrefix = `theme.${themeName}`;
  const mobilePrefix = `themeMobile.${themeName}`;

  const readMerged = (section) => {
    const base = readGroup(settingsMap, `${basePrefix}.${section}`);
    const mobile = readGroup(settingsMap, `${mobilePrefix}.${section}`);
    return { ...base, ...mobile }; // mobile wins
  };

  const header         = readMerged("header");
  const clock          = readMerged("clock");
  const dateCard       = readMerged("dateCard");
  const currentPrayer  = readMerged("currentPrayer");
  const upcomingPrayer = readMerged("upcomingPrayer");
  const nextPrayer     = readMerged("nextPrayer");
  const infoCard       = readMerged("infoCard");
  const weatherCard    = readMerged("weatherCard");
  const slideshow      = readMerged("slideshow");

  // Normalise fonts where present
  [
    header,
    clock,
    dateCard,
    currentPrayer,
    upcomingPrayer,
    nextPrayer,
    infoCard,
    weatherCard,
    slideshow,
  ].forEach((obj) => {
    if (obj && obj.fontEng) obj.fontEng = normaliseFontToken(obj.fontEng);
    if (obj && obj.fontAra) obj.fontAra = normaliseFontToken(obj.fontAra);
  });

  return {
    header,
    clock,
    dateCard,
    currentPrayer,
    upcomingPrayer,
    nextPrayer,
    infoCard,
    weatherCard,
    slideshow,
  };
}

// Get English or Arabic labels (matches your sheet: labels.* / labels.arabic.*)
export function getLabels(settingsMap, language) {
  const prefix = language === "arabic" ? "labels.arabic." : "labels.";
  const labels = {};
  for (const [k, v] of Object.entries(settingsMap || {})) {
    if (k.startsWith(prefix)) {
      labels[k.replace(prefix, "")] = v;
    }
  }
  return labels;
}

// Find today's row from timetable
export function findTodayRow(timetable) {
  const today = moment().format("YYYY-MM-DD");
  return (timetable || []).find((row) => row.Date === today);
}

// Preprocess timetable to inject a proper Date field
export function prepareTimetableWithDates(timetable) {
  const currentYear = moment().year();
  return (timetable || []).map((row) => {
    const day = row?.Day?.toString().padStart(2, "0");
    const month = row?.Month?.toString().padStart(2, "0");
    if (day && month) {
      const date = moment(`${currentYear}-${month}-${day}`, "YYYY-MM-DD", true);
      return { ...row, Date: date.isValid() ? date.format("YYYY-MM-DD") : undefined };
    }
    return row;
  });
}
